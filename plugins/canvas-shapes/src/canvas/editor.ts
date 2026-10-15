import {
	EXTENSION_KEY,
	canHaveShape,
	edgeStyle,
	extensionOf,
	formatVersion,
	keepsAspectRatio,
	nodeShape,
	withExtension,
	withFormatVersion,
	withLineStyle,
	withLineWidth,
	withShape,
} from '@obsidian-plugins/json-canvas-render';
import type { EdgeStyle, LineStyle, Shape } from '@obsidian-plugins/json-canvas-render';
import { isCanvasEdge, isCanvasNode } from './internals';
import type { CanvasEdgeLike, CanvasLike, CanvasNodeLike, Data } from './internals';

/** The canvas did not behave as expected: the plugin turns itself off for this canvas. */
export class CanvasAdapterError extends Error {
	constructor(readonly reason: string) {
		super(`Canvas Shapes: ${reason}`);
	}
}

export interface Selected {
	/** Selected cards that can have a shape (not groups). */
	nodes: CanvasNodeLike[];
	edges: CanvasEdgeLike[];
}

/** Value shared by every item, or null when they differ (or there are none). */
export function common<T>(values: T[]): T | null {
	const first = values[0];
	if (first === undefined) return null;
	return values.every((value) => value === first) ? first : null;
}

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Reads and writes the Canvas Shapes extensions of one canvas, only through the canvas's own data
 * flow: `setData` on the node or edge, a read back to check Obsidian kept the value, then
 * `requestSave()` (one undo step, file saved by the Canvas itself). The file is never written
 * from outside.
 */
export class CanvasEditor {
	constructor(readonly canvas: CanvasLike) {}

	selected(): Selected {
		const nodes: CanvasNodeLike[] = [];
		const edges: CanvasEdgeLike[] = [];
		for (const item of this.canvas.selection) {
			if (isCanvasNode(item) && this.canvas.nodes.get(item.id) === item) {
				if (canHaveShape(item.getData())) nodes.push(item);
			} else if (isCanvasEdge(item) && this.canvas.edges.get(item.id) === item) {
				edges.push(item);
			}
		}
		return { nodes, edges };
	}

	shapeOf(node: CanvasNodeLike): Shape {
		return nodeShape(node.getData());
	}

	styleOf(edge: CanvasEdgeLike): EdgeStyle {
		return edgeStyle(edge.getData());
	}

	/** Set the shape of cards. Square and circle become 1:1 (side = the larger dimension). */
	setShape(nodes: CanvasNodeLike[], shape: Shape): number {
		return this.edit(nodes, (data) => {
			const next = withExtension(data, withShape(data[EXTENSION_KEY], shape));
			if (keepsAspectRatio(shape) && typeof data.width === 'number' && typeof data.height === 'number') {
				const side = Math.max(data.width, data.height);
				next.width = side;
				next.height = side;
			}
			return canHaveShape(data) ? next : null;
		});
	}

	setLineStyle(edges: CanvasEdgeLike[], line: LineStyle): number {
		return this.edit(edges, (data) => withExtension(data, withLineStyle(data[EXTENSION_KEY], line)));
	}

	setLineWidth(edges: CanvasEdgeLike[], width: number): number {
		return this.edit(edges, (data) => withExtension(data, withLineWidth(data[EXTENSION_KEY], width)));
	}

	/**
	 * Apply `change` to each item's data; items whose data does not change are left alone. Saves
	 * once (one undo step). If Obsidian does not give back what was written, every item is
	 * restored and a CanvasAdapterError is thrown before anything is saved.
	 */
	private edit<T extends CanvasNodeLike | CanvasEdgeLike>(items: T[], change: (data: Data) => Data | null): number {
		if (this.canvas.readonly) return 0;
		const done: { item: T; before: Data }[] = [];
		const rootBefore = this.canvas.data;
		try {
			for (const item of items) {
				const before = item.getData();
				const next = change(before);
				if (!next || sameJson(next, before)) continue;
				done.push({ item, before });
				item.setData(next);
				const after = item.getData();
				if (!sameJson(after[EXTENSION_KEY], next[EXTENSION_KEY])) throw new CanvasAdapterError('write-check');
			}
			if (done.length === 0) return 0;
			this.markFormat();
		} catch (error) {
			for (const { item, before } of done.reverse()) item.setData(before);
			this.canvas.data = rootBefore;
			throw error instanceof CanvasAdapterError ? error : new CanvasAdapterError('write');
		}
		this.canvas.requestSave();
		return done.length;
	}

	/** Mark the file as using format version 1 of the extensions (root `canvasShapes.version`). */
	private markFormat(): void {
		if (formatVersion(this.canvas.data) !== undefined) return;
		this.canvas.data = withExtension(this.canvas.data, withFormatVersion(extensionOf(this.canvas.data)));
		if (formatVersion(this.canvas.getData()) === undefined) throw new CanvasAdapterError('root-check');
	}
}
