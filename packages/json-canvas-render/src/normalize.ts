import type { BackgroundStyle, EdgeEnd, NodeSide } from './types';

/**
 * A canvas file as the renderer reads it: entries that break the spec (missing id, non-numeric
 * position, unknown type) are skipped instead of failing the whole drawing.
 */

interface NodeCommon {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
	/** The node as read, with its extension keys. */
	raw: Record<string, unknown>;
}

export type NormalNode =
	| (NodeCommon & { type: 'text'; text: string })
	| (NodeCommon & { type: 'file'; file: string; subpath?: string })
	| (NodeCommon & { type: 'link'; url: string })
	| (NodeCommon & { type: 'group'; label?: string; background?: string; backgroundStyle?: BackgroundStyle });

export interface NormalEdge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide?: NodeSide;
	toSide?: NodeSide;
	fromEnd: EdgeEnd;
	toEnd: EdgeEnd;
	color?: string;
	label?: string;
	raw: Record<string, unknown>;
}

export interface NormalCanvas {
	nodes: NormalNode[];
	edges: NormalEdge[];
}

const SIDES = new Set(['top', 'right', 'bottom', 'left']);
const BACKGROUND_STYLES = new Set(['cover', 'ratio', 'repeat']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function readNode(raw: unknown): NormalNode | null {
	if (!isRecord(raw)) return null;
	const { id, x, y, width, height } = raw;
	if (typeof id !== 'string' || !finite(x) || !finite(y) || !finite(width) || !finite(height)) return null;
	const common: NodeCommon = { id, x, y, width: Math.max(0, width), height: Math.max(0, height), raw };
	const color = text(raw.color);
	if (color) common.color = color;
	switch (raw.type) {
		case 'text':
			return { ...common, type: 'text', text: text(raw.text) ?? '' };
		case 'file': {
			const node: NormalNode = { ...common, type: 'file', file: text(raw.file) ?? '' };
			const subpath = text(raw.subpath);
			if (subpath) node.subpath = subpath;
			return node;
		}
		case 'link':
			return { ...common, type: 'link', url: text(raw.url) ?? '' };
		case 'group': {
			const node: NormalNode & { type: 'group' } = { ...common, type: 'group' };
			const label = text(raw.label);
			const background = text(raw.background);
			if (label) node.label = label;
			if (background) node.background = background;
			if (typeof raw.backgroundStyle === 'string' && BACKGROUND_STYLES.has(raw.backgroundStyle)) {
				node.backgroundStyle = raw.backgroundStyle as BackgroundStyle;
			}
			return node;
		}
		default:
			return null;
	}
}

function readEdge(raw: unknown): NormalEdge | null {
	if (!isRecord(raw)) return null;
	const { id, fromNode, toNode } = raw;
	if (typeof id !== 'string' || typeof fromNode !== 'string' || typeof toNode !== 'string') return null;
	const edge: NormalEdge = {
		id,
		fromNode,
		toNode,
		fromEnd: raw.fromEnd === 'arrow' ? 'arrow' : 'none',
		toEnd: raw.toEnd === 'none' ? 'none' : 'arrow',
		raw,
	};
	if (typeof raw.fromSide === 'string' && SIDES.has(raw.fromSide)) edge.fromSide = raw.fromSide as NodeSide;
	if (typeof raw.toSide === 'string' && SIDES.has(raw.toSide)) edge.toSide = raw.toSide as NodeSide;
	const color = text(raw.color);
	const label = text(raw.label);
	if (color) edge.color = color;
	if (label) edge.label = label;
	return edge;
}

export function normalizeCanvas(input: unknown): NormalCanvas {
	const data = isRecord(input) ? input : {};
	const nodes = Array.isArray(data.nodes) ? data.nodes.map(readNode).filter((node): node is NormalNode => node !== null) : [];
	const edges = Array.isArray(data.edges) ? data.edges.map(readEdge).filter((edge): edge is NormalEdge => edge !== null) : [];
	return { nodes, edges };
}
