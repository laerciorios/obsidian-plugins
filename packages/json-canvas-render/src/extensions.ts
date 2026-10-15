/**
 * The Canvas Shapes extensions of JSON Canvas (format version 1, see FORMAT.md): a `canvasShapes`
 * object at the root, on nodes and on edges. Values are data, never translated. Readers fall back
 * to the defaults on missing or unknown values; writers drop defaults and keep keys they do not
 * know, so a newer format survives an older plugin.
 */

export const EXTENSION_KEY = 'canvasShapes';
export const FORMAT_VERSION = 1;

export const SHAPES = ['rectangle', 'square', 'circle', 'diamond', 'cylinder'] as const;
export type Shape = (typeof SHAPES)[number];
export const DEFAULT_SHAPE: Shape = 'rectangle';

export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];
export const DEFAULT_LINE_STYLE: LineStyle = 'solid';

/** Edge width in px. Obsidian draws edges 2px wide. */
export const DEFAULT_LINE_WIDTH = 2;
/** The widths offered by the plugin; files may hold any positive number. */
export const LINE_WIDTHS = [1, 2, 4, 8] as const;
/** Renderers clamp widths to this range. */
export const MIN_LINE_WIDTH = 0.5;
export const MAX_LINE_WIDTH = 32;

export type Extension = Record<string, unknown>;

export interface EdgeStyle {
	line: LineStyle;
	width: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `canvasShapes` object of a canvas, node or edge, if it is an object. */
export function extensionOf(item: unknown): Extension | undefined {
	if (!isRecord(item)) return undefined;
	const extension = item[EXTENSION_KEY];
	return isRecord(extension) ? extension : undefined;
}

export function isShape(value: unknown): value is Shape {
	return typeof value === 'string' && (SHAPES as readonly string[]).includes(value);
}

export function isLineStyle(value: unknown): value is LineStyle {
	return typeof value === 'string' && (LINE_STYLES as readonly string[]).includes(value);
}

export function isLineWidth(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Whether a node of this type can have a shape: groups are always rectangles. */
export function canHaveShape(node: unknown): boolean {
	return isRecord(node) && node.type !== 'group';
}

/** The shape of a node: `rectangle` when missing, unknown, or on a group. */
export function nodeShape(node: unknown): Shape {
	if (!canHaveShape(node)) return DEFAULT_SHAPE;
	const shape = extensionOf(node)?.shape;
	return isShape(shape) ? shape : DEFAULT_SHAPE;
}

/** Line style and width of an edge, with defaults; the width is clamped for drawing. */
export function edgeStyle(edge: unknown): EdgeStyle {
	const extension = extensionOf(edge);
	const line = isLineStyle(extension?.line) ? extension.line : DEFAULT_LINE_STYLE;
	const width = isLineWidth(extension?.width)
		? Math.min(MAX_LINE_WIDTH, Math.max(MIN_LINE_WIDTH, extension.width))
		: DEFAULT_LINE_WIDTH;
	return { line, width };
}

/** The extensions version of a canvas file (1 when extensions exist without a root marker). */
export function formatVersion(data: unknown): number | undefined {
	const version = extensionOf(data)?.version;
	return typeof version === 'number' && Number.isInteger(version) && version > 0 ? version : undefined;
}

/** Shapes that keep a 1:1 aspect ratio. */
export function keepsAspectRatio(shape: Shape): boolean {
	return shape === 'square' || shape === 'circle';
}

/** Undefined when nothing is left, so the caller removes the key. */
function compact(extension: Extension): Extension | undefined {
	return Object.keys(extension).length > 0 ? extension : undefined;
}

/** A node's `canvasShapes` after setting its shape: the default removes the key. */
export function withShape(extension: unknown, shape: Shape): Extension | undefined {
	const next: Extension = { ...(isRecord(extension) ? extension : {}) };
	if (shape === DEFAULT_SHAPE) delete next.shape;
	else next.shape = shape;
	return compact(next);
}

/** An edge's `canvasShapes` after setting its line style: the default removes the key. */
export function withLineStyle(extension: unknown, line: LineStyle): Extension | undefined {
	const next: Extension = { ...(isRecord(extension) ? extension : {}) };
	if (line === DEFAULT_LINE_STYLE) delete next.line;
	else next.line = line;
	return compact(next);
}

/** An edge's `canvasShapes` after setting its width: the default removes the key. */
export function withLineWidth(extension: unknown, width: number): Extension | undefined {
	const next: Extension = { ...(isRecord(extension) ? extension : {}) };
	if (width === DEFAULT_LINE_WIDTH || !isLineWidth(width)) delete next.width;
	else next.width = width;
	return compact(next);
}

/** The root `canvasShapes` once a file uses extensions: keeps other keys, sets the version. */
export function withFormatVersion(extension: unknown): Extension {
	return { ...(isRecord(extension) ? extension : {}), version: FORMAT_VERSION };
}

/**
 * A copy of an object (node, edge or canvas) with `canvasShapes` set to `extension`, or without
 * the key when `extension` is undefined. Every other key is kept as is.
 */
export function withExtension<T extends Record<string, unknown>>(item: T, extension: Extension | undefined): T {
	const next: Record<string, unknown> = { ...item };
	if (extension) next[EXTENSION_KEY] = extension;
	else delete next[EXTENSION_KEY];
	return next as T;
}
