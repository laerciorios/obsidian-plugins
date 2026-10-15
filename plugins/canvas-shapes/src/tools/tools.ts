import { facingSide, keepsAspectRatio } from '@obsidian-plugins/json-canvas-render';
import type { Point, Rect, Shape } from '@obsidian-plugins/json-canvas-render';

/**
 * The tools of the elements panel, Excalidraw style, and the pure parts of using them: which key
 * picks which tool, the box of a new element from a click or a drag, the card under the pointer
 * and the data of a new connection. No app APIs, so all of it is unit-tested.
 */

export type ToolKind = 'mode' | 'shape' | 'edge' | 'file' | 'link' | 'group';
export type ToolId = 'hand' | 'select' | Shape | 'arrow' | 'line' | 'note' | 'media' | 'web' | 'group';

export interface Size {
	width: number;
	height: number;
}

export interface ToolDef {
	id: ToolId;
	/** One-letter shortcut (Excalidraw's letters where there is an equivalent). */
	key: string;
	kind: ToolKind;
	/** Size of the element created by a click (canvas px). */
	size: Size;
}

const NONE: Size = { width: 0, height: 0 };

export const TOOLS: readonly ToolDef[] = [
	{ id: 'hand', key: 'h', kind: 'mode', size: NONE },
	{ id: 'select', key: 'v', kind: 'mode', size: NONE },
	{ id: 'rectangle', key: 'r', kind: 'shape', size: { width: 240, height: 120 } },
	{ id: 'square', key: 's', kind: 'shape', size: { width: 160, height: 160 } },
	{ id: 'diamond', key: 'd', kind: 'shape', size: { width: 200, height: 160 } },
	{ id: 'circle', key: 'o', kind: 'shape', size: { width: 160, height: 160 } },
	{ id: 'cylinder', key: 'c', kind: 'shape', size: { width: 160, height: 200 } },
	{ id: 'arrow', key: 'a', kind: 'edge', size: NONE },
	{ id: 'line', key: 'l', kind: 'edge', size: NONE },
	{ id: 'note', key: 'n', kind: 'file', size: { width: 400, height: 400 } },
	{ id: 'media', key: 'm', kind: 'file', size: { width: 400, height: 400 } },
	{ id: 'web', key: 'w', kind: 'link', size: { width: 400, height: 300 } },
	{ id: 'group', key: 'g', kind: 'group', size: { width: 480, height: 320 } },
];

/** How the panel groups the tools (a divider between groups). */
export const TOOL_GROUPS: readonly (readonly ToolId[])[] = [
	['hand', 'select'],
	['rectangle', 'square', 'diamond', 'circle', 'cylinder'],
	['arrow', 'line'],
	['note', 'media', 'web', 'group'],
];

/** Key that keeps the current tool after creating (Excalidraw's padlock). */
export const LOCK_KEY = 'q';

export function tool(id: ToolId): ToolDef {
	const found = TOOLS.find((item) => item.id === id);
	if (!found) throw new Error(`Unknown tool ${id}`);
	return found;
}

/** The tool of a key press (case-insensitive, one character), if any. */
export function toolForKey(key: string): ToolDef | undefined {
	if (key.length !== 1) return undefined;
	const lower = key.toLowerCase();
	return TOOLS.find((item) => item.key === lower);
}

/** Pointer movement (screen px) below which a gesture is a click, not a drag. */
export const DRAG_THRESHOLD = 4;
/** Smallest side of an element created by dragging (canvas px). */
export const MIN_SIDE = 20;

/**
 * Box of a new element: a click (`end` null) centers the tool's size on the point; a drag spans
 * from `start` to `end`. Square and circle stay 1:1 (the larger side), growing toward the pointer.
 */
export function placementBox(definition: ToolDef, start: Point, end: Point | null, minSide = MIN_SIDE): Rect {
	if (!end) {
		const { width, height } = definition.size;
		return { x: Math.round(start.x - width / 2), y: Math.round(start.y - height / 2), width, height };
	}
	let width = Math.max(minSide, Math.abs(end.x - start.x));
	let height = Math.max(minSide, Math.abs(end.y - start.y));
	if (definition.kind === 'shape' && keepsAspectRatio(definition.id as Shape)) {
		width = height = Math.max(width, height);
	}
	const x = end.x < start.x ? start.x - width : start.x;
	const y = end.y < start.y ? start.y - height : start.y;
	return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

export interface NodeBox extends Rect {
	id: string;
	type?: unknown;
}

const contains = (box: Rect, point: Point): boolean =>
	point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;

/**
 * The card under a point: the topmost card (last in z-order) that contains it; a group only when
 * no card does, so connecting to something inside a group picks the thing, not the group.
 */
export function nodeAt(nodes: readonly NodeBox[], point: Point): NodeBox | null {
	let group: NodeBox | null = null;
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		if (!node || !contains(node, point)) continue;
		if (node.type !== 'group') return node;
		group ??= node;
	}
	return group;
}

/** Data of a new connection between two cards, with the sides Obsidian would pick. */
export function connection(id: string, from: NodeBox, to: NodeBox, arrow: boolean): Record<string, unknown> {
	return {
		id,
		fromNode: from.id,
		fromSide: facingSide(from, to),
		toNode: to.id,
		toSide: facingSide(to, from),
		toEnd: arrow ? 'arrow' : 'none',
	};
}

/** A canvas id like Obsidian's: 16 hex characters. */
export function newId(random: () => number = Math.random): string {
	let id = '';
	for (let i = 0; i < 16; i++) id += Math.floor(random() * 16).toString(16);
	return id;
}

/** Files offered by the media tool (what the Canvas shows as images, audio, video or PDF). */
export const MEDIA_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'gif',
	'webp',
	'svg',
	'bmp',
	'avif',
	'mp3',
	'wav',
	'm4a',
	'ogg',
	'flac',
	'3gp',
	'mp4',
	'webm',
	'ogv',
	'mov',
	'mkv',
	'pdf',
]);

/** A web address from what the user typed: adds https:// when there is no scheme; null if empty. */
export function normalizeUrl(input: string): string | null {
	const text = input.trim();
	if (!text || /\s/.test(text)) return null;
	if (/^https?:\/\//i.test(text)) return text;
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return null;
	return `https://${text}`;
}
