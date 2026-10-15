import { THEMES, isLight, mix, paint, resolveColor } from './colors';
import type { Theme, ThemeName } from './colors';
import { edgeStyle, nodeShape } from './extensions';
import type { Shape } from './extensions';
import {
	arrowPolygon,
	centersContent,
	contentBox,
	dashPattern,
	edgeGeometry,
	facingSide,
	pointsRect,
	roundedRectPath,
	shapePaths,
	unionRect,
} from './geometry';
import { layoutMarkdown } from './layout';
import type { PlacedLine, TextLayout } from './layout';
import { extractSubpath, stripFrontmatter } from './markdown';
import { MONO_FAMILY, SANS_FAMILY, approximateMeasurer } from './measure';
import type { FontSpec, TextMeasurer } from './measure';
import { normalizeCanvas } from './normalize';
import type { NormalEdge, NormalNode } from './normalize';
import { el, escapeXml } from './svg';
import type { Attributes } from './svg';
import type { Rect } from './types';

/** What a file node or group background points to, resolved by the caller. */
export type FileResource =
	| { kind: 'image'; href: string; width?: number; height?: number }
	| { kind: 'markdown'; text: string }
	| { kind: 'other'; href?: string };

export interface RenderOptions {
	theme?: ThemeName | Theme;
	/** `solid` paints the theme background behind the canvas (default: transparent). */
	background?: 'transparent' | 'solid';
	/** Space around the drawing, in px (default 32). */
	padding?: number;
	/** Draw only these nodes and edges (plus the edges between drawn nodes). */
	only?: Iterable<string>;
	measure?: TextMeasurer;
	fontFamily?: string;
	monoFontFamily?: string;
	/** Files of file nodes and group backgrounds; missing files are drawn as their path. */
	resolveFile?: (path: string) => FileResource | undefined;
	/** Prefix of element ids (clip paths), for several SVGs in one HTML page. */
	idPrefix?: string;
	/** Accessible title of the drawing. */
	title?: string;
}

export interface RenderResult {
	svg: string;
	width: number;
	height: number;
	/** The canvas area drawn, in canvas coordinates. */
	viewBox: Rect;
}

const BASE_FONT = 16;
const LABEL_FONT = 14;
const GROUP_LABEL_FONT = 24;
const EDGE_LABEL_FONT = 20;
const EDGE_LABEL_MAX_WIDTH = 340;

interface Context {
	theme: Theme;
	measure: TextMeasurer;
	sans: string;
	mono: string;
	prefix: string;
	clips: string[];
	resolveFile: (path: string) => FileResource | undefined;
}

function clipId(context: Context, path: string, transform?: string): string {
	const id = `${context.prefix}clip${context.clips.length + 1}`;
	context.clips.push(el('clipPath', { id }, el('path', { d: path, transform })));
	return id;
}

const rectPath = (rect: Rect): string =>
	`M${rect.x} ${rect.y}H${rect.x + rect.width}V${rect.y + rect.height}H${rect.x}Z`;

const SAFE_SCHEMES = /^(https?|mailto|tel|obsidian):/i;

/** Where a link may point in the SVG: safe schemes and relative paths (`assets/...`); never scripts. */
export function linkHref(link: string): string | undefined {
	const target = link.trim();
	if (!target) return undefined;
	if (SAFE_SCHEMES.test(target)) return target;
	if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) return undefined;
	return target;
}

/** Text that does not fit in `width` ends with an ellipsis. */
function truncate(text: string, font: FontSpec, width: number, measure: TextMeasurer): string {
	if (measure(text, font) <= width) return text;
	let cut = text;
	while (cut.length > 1 && measure(`${cut}…`, font) > width) cut = cut.slice(0, -1);
	return `${cut}…`;
}

function fontAttributes(font: FontSpec, context: Context): Attributes {
	return {
		'font-size': font.size,
		'font-weight': font.bold ? 700 : undefined,
		'font-style': font.italic ? 'italic' : undefined,
		'font-family': font.mono ? context.mono : undefined,
	};
}

function textLines(lines: PlacedLine[], offsetX: number, offsetY: number, color: string, context: Context): string {
	const { theme } = context;
	return lines
		.map((line) => {
			// Runs that follow each other flow on their own, so a viewer with other fonts keeps the
			// words together; only the start of the line and jumps (after a list marker) are placed.
			let expected = Number.NaN;
			const spans = line.runs.map((run) => {
				const style = run.style;
				const decoration = [style.link && !style.internal ? 'underline' : '', style.strike ? 'line-through' : '']
					.filter(Boolean)
					.join(' ');
				const fill = style.link || style.tag ? theme.accent : style.muted ? theme.muted : undefined;
				const x = Math.abs(run.x - expected) < 0.5 ? undefined : run.x + offsetX;
				expected = run.x + run.width;
				const span = el(
					'tspan',
					{ x, ...fontAttributes(run.font, context), fill, 'text-decoration': decoration || undefined },
					escapeXml(run.text),
				);
				const href = style.link && !style.internal ? linkHref(style.link) : undefined;
				return href ? el('a', { href, target: '_blank' }, span) : span;
			});
			return el('text', { y: line.baseline + offsetY, fill: color }, spans);
		})
		.join('');
}

function decorations(layout: TextLayout, offsetX: number, offsetY: number, context: Context): string {
	const { theme } = context;
	return layout.decorations
		.map((item) => {
			const x = item.x + offsetX;
			const y = item.y + offsetY;
			switch (item.kind) {
				case 'quote':
					return el('rect', { x, y, width: item.width, height: item.height, fill: theme.accent });
				case 'rule':
					return el('rect', { x, y, width: item.width, height: item.height, fill: mix(theme.stroke, theme.background, 0.6) });
				case 'highlight':
					return el('rect', { x, y: y + 2, width: item.width, height: item.height - 4, fill: mix(theme.highlight, theme.background, 0.3) });
				case 'code':
				case 'code-block':
					return el('rect', { x, y, width: item.width, height: item.height, rx: 4, fill: theme.code });
			}
		})
		.join('');
}

/** Markdown inside a box: Obsidian's padding for rectangles, centered for the other shapes. */
function markdownBlock(text: string, box: Rect, centered: boolean, clip: string, context: Context): string {
	const padX = centered ? 8 : 16;
	const width = Math.max(1, box.width - padX * 2);
	const layout = layoutMarkdown(text, {
		width,
		measure: context.measure,
		fontSize: BASE_FONT,
		align: centered ? 'center' : 'left',
		maxHeight: box.height,
	});
	let top: number;
	if (centered) top = Math.max(8, (box.height - layout.height) / 2);
	else top = layout.height + 32 <= box.height ? 16 : Math.max(0, Math.min(16, box.height * 0.1 - 3));
	const x = box.x + padX;
	const y = box.y + top;
	return el('g', { 'clip-path': `url(#${clip})` }, [
		decorations(layout, x, y, context),
		textLines(layout.lines, x, y, context.theme.text, context),
	]);
}

/** A file name above a node, like Obsidian's card label. */
function nodeLabel(text: string, width: number, context: Context): string {
	const font: FontSpec = { size: LABEL_FONT, bold: false, italic: false, mono: false };
	return el('text', { x: 0, y: -6, 'font-size': LABEL_FONT, fill: context.theme.faint }, escapeXml(truncate(text, font, width, context.measure)));
}

function imageElement(href: string, box: Rect, fit: 'meet' | 'slice', clip?: string): string {
	return el('image', {
		x: box.x,
		y: box.y,
		width: box.width,
		height: box.height,
		href,
		'xlink:href': href,
		preserveAspectRatio: `xMidYMid ${fit}`,
		'clip-path': clip ? `url(#${clip})` : undefined,
	});
}

function centeredNote(text: string, box: Rect, color: string, href: string | undefined, context: Context): string {
	const font: FontSpec = { size: BASE_FONT, bold: false, italic: false, mono: false };
	const shown = truncate(text, font, Math.max(1, box.width - 16), context.measure);
	const label = el(
		'text',
		{ x: box.x + box.width / 2, y: box.y + box.height / 2 + BASE_FONT * 0.35, 'text-anchor': 'middle', fill: color, 'text-decoration': href ? 'underline' : undefined },
		escapeXml(shown),
	);
	return href ? el('a', { href, target: '_blank' }, label) : label;
}

function fileBaseName(path: string): string {
	return path.split('/').pop() ?? path;
}

function renderNode(node: NormalNode, context: Context): string {
	const { theme } = context;
	const shape: Shape = nodeShape(node.raw);
	const colors = paint(node.color, theme);
	const paths = shapePaths(shape, node.width, node.height);
	const box = contentBox(shape, node.width, node.height);
	const centered = centersContent(shape);
	const outlineClip = clipId(context, paths.outline);
	const contentClip = shape === 'rectangle' || shape === 'square' ? outlineClip : clipId(context, rectPath(box));
	const parts: string[] = [el('path', { d: paths.outline, fill: colors.fill, stroke: colors.stroke, 'stroke-width': colors.strokeWidth })];

	if (node.type === 'text') {
		parts.push(markdownBlock(node.text, box, centered, contentClip, context));
	} else if (node.type === 'link') {
		parts.push(nodeLabel(node.url, node.width, context));
		parts.push(centeredNote(node.url, box, theme.accent, linkHref(node.url), context));
	} else if (node.type === 'file') {
		const resource = context.resolveFile(node.file);
		if (resource?.kind === 'image') {
			parts.push(imageElement(resource.href, box, 'meet', contentClip));
		} else if (resource?.kind === 'markdown') {
			parts.push(nodeLabel(fileBaseName(node.file).replace(/\.md$/i, ''), node.width, context));
			const text = extractSubpath(stripFrontmatter(resource.text), node.subpath);
			parts.push(markdownBlock(text, box, centered, contentClip, context));
		} else {
			parts.push(nodeLabel(fileBaseName(node.file), node.width, context));
			const href = resource?.kind === 'other' && resource.href ? linkHref(resource.href) : undefined;
			parts.push(centeredNote(fileBaseName(node.file), box, resource ? theme.muted : theme.faint, href, context));
		}
	}

	for (const detail of paths.details) {
		parts.push(el('path', { d: detail, fill: 'none', stroke: colors.stroke, 'stroke-width': colors.strokeWidth }));
	}
	return el('g', { transform: `translate(${node.x} ${node.y})`, 'data-id': node.id }, parts);
}

function groupLabelBox(node: NormalNode & { type: 'group' }, context: Context): { text: string; width: number } | null {
	if (!node.label) return null;
	const font: FontSpec = { size: GROUP_LABEL_FONT, bold: false, italic: false, mono: false };
	const text = truncate(node.label, font, Math.max(1, node.width - 16), context.measure);
	return { text, width: context.measure(text, font) + 16 };
}

function renderGroup(node: NormalNode & { type: 'group' }, context: Context): string {
	const { theme } = context;
	const colors = paint(node.color, theme);
	const outline = roundedRectPath(node.width, node.height);
	const parts: string[] = [];
	const background = node.background ? context.resolveFile(node.background) : undefined;
	if (background?.kind === 'image') {
		const clip = clipId(context, outline);
		const box = { x: 0, y: 0, width: node.width, height: node.height };
		if (node.backgroundStyle === 'repeat') {
			const id = `${context.prefix}pattern${context.clips.length + 1}`;
			const width = background.width ?? 256;
			const height = background.height ?? 256;
			context.clips.push(
				el('pattern', { id, patternUnits: 'userSpaceOnUse', width, height, x: node.x, y: node.y }, imageElement(background.href, { x: 0, y: 0, width, height }, 'meet')),
			);
			parts.push(el('path', { d: outline, fill: `url(#${id})`, 'clip-path': `url(#${clip})` }));
		} else {
			parts.push(imageElement(background.href, box, node.backgroundStyle === 'ratio' ? 'meet' : 'slice', clip));
		}
	}
	parts.push(el('path', { d: outline, fill: colors.tint, 'fill-opacity': background ? 0.6 : undefined, stroke: colors.stroke, 'stroke-width': colors.strokeWidth }));
	const label = groupLabelBox(node, context);
	if (label) {
		const fill = colors.themed ? colors.color : mix(theme.stroke, theme.background, 0.1);
		const color = colors.themed ? (isLight(colors.color) ? theme.onLight : theme.onDark) : theme.muted;
		const height = GROUP_LABEL_FONT + 8;
		parts.push(
			el('g', { transform: `translate(0 ${-4 - height})` }, [
				el('rect', { width: label.width, height, rx: 4, fill }),
				el('text', { x: 8, y: 4 + GROUP_LABEL_FONT * 0.82, 'font-size': GROUP_LABEL_FONT, fill: color }, escapeXml(label.text)),
			]),
		);
	}
	return el('g', { transform: `translate(${node.x} ${node.y})`, 'data-id': node.id }, parts);
}

interface PlacedEdge {
	edge: NormalEdge;
	svg: string;
	label: string;
	bounds: Rect[];
}

function placeEdge(edge: NormalEdge, nodes: Map<string, NormalNode>, context: Context): PlacedEdge | null {
	const from = nodes.get(edge.fromNode);
	const to = nodes.get(edge.toNode);
	if (!from || !to) return null;
	const { theme } = context;
	const fromSide = edge.fromSide ?? facingSide(from, to);
	const toSide = edge.toSide ?? facingSide(to, from);
	const geometry = edgeGeometry(from, fromSide, edge.fromEnd, to, toSide, edge.toEnd);
	const { line, width } = edgeStyle(edge.raw);
	const color = resolveColor(edge.color, theme) ?? theme.stroke;
	const dash = dashPattern(line, width);
	const parts = [
		el('path', {
			d: geometry.path,
			fill: 'none',
			stroke: color,
			'stroke-width': width,
			'stroke-dasharray': dash ? dash.join(' ') : undefined,
			'stroke-linecap': line === 'dotted' ? 'round' : undefined,
		}),
		...geometry.arrows.map((tip) =>
			el('polygon', {
				points: arrowPolygon(tip, width)
					.map((point) => `${point.x},${point.y}`)
					.join(' '),
				fill: color,
				stroke: color,
				'stroke-width': 1,
				'stroke-linejoin': 'round',
			}),
		),
	];
	const bounds: Rect[] = [];
	const extent = pointsRect(geometry.extent);
	if (extent) bounds.push({ x: extent.x - width, y: extent.y - width, width: extent.width + width * 2, height: extent.height + width * 2 });
	for (const tip of geometry.arrows) {
		const rect = pointsRect(arrowPolygon(tip, width));
		if (rect) bounds.push(rect);
	}

	let label = '';
	if (edge.label) {
		const layout = layoutMarkdown(edge.label, { width: EDGE_LABEL_MAX_WIDTH, measure: context.measure, fontSize: EDGE_LABEL_FONT, align: 'center' });
		const textWidth = Math.min(EDGE_LABEL_MAX_WIDTH, layout.width || 1);
		const box = {
			x: geometry.label.x - textWidth / 2 - 6,
			y: geometry.label.y - layout.height / 2 - 6,
			width: textWidth + 12,
			height: layout.height + 12,
		};
		// The layout centers lines in the full label width: shift them to the box.
		const offsetX = box.x + 6 - (EDGE_LABEL_MAX_WIDTH - textWidth) / 2;
		label = el('g', { 'data-id': edge.id }, [
			el('rect', { ...box, rx: 4, fill: theme.background }),
			textLines(layout.lines, offsetX, box.y + 6, theme.text, context),
		]);
		bounds.push(box);
	}
	return { edge, svg: el('g', { 'data-id': edge.id }, parts), label, bounds };
}

function nodeExtent(node: NormalNode, context: Context): Rect[] {
	const rects: Rect[] = [{ x: node.x, y: node.y, width: node.width, height: node.height }];
	if (node.type === 'group') {
		const label = groupLabelBox(node, context);
		if (label) rects.push({ x: node.x, y: node.y - 4 - GROUP_LABEL_FONT - 8, width: label.width, height: GROUP_LABEL_FONT + 8 });
	} else if (node.type === 'file' || node.type === 'link') {
		rects.push({ x: node.x, y: node.y - 6 - LABEL_FONT, width: node.width, height: LABEL_FONT });
	}
	return rects;
}

/** Draw a JSON Canvas (with the Canvas Shapes extensions) as a standalone SVG document. */
export function renderCanvas(input: unknown, options: RenderOptions = {}): RenderResult {
	const theme = typeof options.theme === 'object' ? options.theme : THEMES[options.theme ?? 'light'];
	const context: Context = {
		theme,
		measure: options.measure ?? approximateMeasurer,
		sans: options.fontFamily ?? SANS_FAMILY,
		mono: options.monoFontFamily ?? MONO_FAMILY,
		prefix: options.idPrefix ?? 'jc-',
		clips: [],
		resolveFile: options.resolveFile ?? (() => undefined),
	};
	const canvas = normalizeCanvas(input);
	const only = options.only ? new Set(options.only) : null;
	const nodesById = new Map(canvas.nodes.map((node) => [node.id, node]));
	const nodes = only ? canvas.nodes.filter((node) => only.has(node.id)) : canvas.nodes;
	const drawn = new Set(nodes.map((node) => node.id));
	const edges = canvas.edges.filter((edge) => !only || only.has(edge.id) || (drawn.has(edge.fromNode) && drawn.has(edge.toNode)));

	const groups = nodes.filter((node): node is NormalNode & { type: 'group' } => node.type === 'group').map((node) => renderGroup(node, context));
	const cards = nodes.filter((node) => node.type !== 'group').map((node) => renderNode(node, context));
	const placedEdges = edges.map((edge) => placeEdge(edge, nodesById, context)).filter((edge): edge is PlacedEdge => edge !== null);

	const extent = unionRect([...nodes.flatMap((node) => nodeExtent(node, context)), ...placedEdges.flatMap((edge) => edge.bounds)]) ?? {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	};
	const padding = options.padding ?? 32;
	const viewBox: Rect = {
		x: Math.floor(extent.x - padding),
		y: Math.floor(extent.y - padding),
		width: Math.ceil(extent.width + padding * 2),
		height: Math.ceil(extent.height + padding * 2),
	};

	const body = [
		options.title ? el('title', {}, escapeXml(options.title)) : '',
		context.clips.length > 0 ? el('defs', {}, context.clips) : '',
		options.background === 'solid' ? el('rect', { ...viewBox, fill: theme.background }) : '',
		...groups,
		...placedEdges.map((edge) => edge.svg),
		...cards,
		...placedEdges.map((edge) => edge.label),
	];
	const svg = el(
		'svg',
		{
			xmlns: 'http://www.w3.org/2000/svg',
			'xmlns:xlink': 'http://www.w3.org/1999/xlink',
			width: viewBox.width,
			height: viewBox.height,
			viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
			'font-family': context.sans,
			'font-size': BASE_FONT,
		},
		body,
	);
	return { svg, width: viewBox.width, height: viewBox.height, viewBox };
}
