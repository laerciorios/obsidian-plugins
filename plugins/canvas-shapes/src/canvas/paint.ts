import {
	DEFAULT_LINE_STYLE,
	DEFAULT_LINE_WIDTH,
	SHAPES,
	arrowScale,
	centersContent,
	contentInsets,
	dashPattern,
	shapePaths,
} from '@obsidian-plugins/json-canvas-render';
import type { EdgeStyle, Shape } from '@obsidian-plugins/json-canvas-render';
import type { CanvasEdgeLike, CanvasNodeLike } from './internals';

/**
 * Draws the extensions on the Canvas's own elements, without touching the card content: shapes
 * other than rectangles get an SVG outline behind the (now transparent) card, with the content
 * moved into the shape; styled edges get CSS custom properties read by styles.css. The geometry
 * comes from the render package, so the canvas and the exports match.
 */

const SHAPED = 'cs-shaped';
const CENTERED = 'cs-centered';
const LINE = 'cs-line';
const INSETS = ['--cs-inset-top', '--cs-inset-right', '--cs-inset-bottom', '--cs-inset-left'] as const;

interface Painted {
	shape: Shape;
	width: number;
	height: number;
	svg: SVGSVGElement;
}

const px = (value: number): string => `${value}px`;

export class Painter {
	private readonly nodes = new WeakMap<HTMLElement, Painted>();

	/** Draw a node's shape (or remove the drawing for rectangles and squares). */
	paintNode(node: CanvasNodeLike, shape: Shape, width: number, height: number): void {
		const el = node.nodeEl;
		const painted = this.nodes.get(el);
		if (shape === 'rectangle' || shape === 'square') {
			if (painted) this.clearNode(el);
			return;
		}
		if (painted && painted.shape === shape && painted.width === width && painted.height === height && painted.svg.isConnected) return;

		const svg = painted?.svg.isConnected ? painted.svg : this.createOutline(el);
		const paths = shapePaths(shape, width, height);
		svg.setAttribute('viewBox', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
		svg.empty();
		svg.createSvg('path', { cls: 'cs-shape-outline', attr: { d: paths.outline } });
		for (const detail of paths.details) svg.createSvg('path', { cls: 'cs-shape-detail', attr: { d: detail } });

		for (const name of SHAPES) el.toggleClass(`cs-shape-${name}`, name === shape);
		el.addClass(SHAPED);
		el.toggleClass(CENTERED, centersContent(shape));
		const insets = contentInsets(shape, width, height);
		el.setCssProps(Object.fromEntries(INSETS.map((name, index) => [name, `${insets[index] ?? 0}%`])));
		this.nodes.set(el, { shape, width, height, svg });
	}

	private createOutline(el: HTMLElement): SVGSVGElement {
		const svg = createSvg('svg', { cls: 'cs-shape', attr: { preserveAspectRatio: 'none', 'aria-hidden': 'true' } });
		el.prepend(svg);
		return svg;
	}

	clearNode(el: HTMLElement): void {
		const painted = this.nodes.get(el);
		painted?.svg.remove();
		this.nodes.delete(el);
		el.removeClasses([SHAPED, CENTERED, ...SHAPES.map((name) => `cs-shape-${name}`)]);
		el.setCssProps(Object.fromEntries(INSETS.map((name) => [name, ''])));
	}

	/** Style an edge's line and arrowheads (or remove the styling for the defaults). */
	paintEdge(edge: CanvasEdgeLike, style: EdgeStyle): void {
		if (style.line === DEFAULT_LINE_STYLE && style.width === DEFAULT_LINE_WIDTH) {
			this.clearEdge(edge);
			return;
		}
		const dash = dashPattern(style.line, style.width);
		const zoomed = (value: number): string => `calc(${px(value)} * var(--zoom-multiplier))`;
		edge.lineGroupEl.addClass(LINE);
		edge.lineGroupEl.setCssProps({
			'--cs-line-width': px(style.width),
			'--cs-dash': dash ? `${zoomed(dash[0])} ${zoomed(dash[1])}` : 'none',
			'--cs-cap': style.line === 'dotted' ? 'round' : 'butt',
		});
		edge.lineEndGroupEl.addClass(LINE);
		edge.lineEndGroupEl.setCssProps({ '--cs-arrow-scale': String(arrowScale(style.width)) });
	}

	clearEdge(edge: CanvasEdgeLike): void {
		edge.lineGroupEl.removeClass(LINE);
		edge.lineGroupEl.setCssProps({ '--cs-line-width': '', '--cs-dash': '', '--cs-cap': '' });
		edge.lineEndGroupEl.removeClass(LINE);
		edge.lineEndGroupEl.setCssProps({ '--cs-arrow-scale': '' });
	}
}
