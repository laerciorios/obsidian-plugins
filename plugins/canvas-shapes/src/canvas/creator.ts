import { DEFAULT_SHAPE } from '@obsidian-plugins/json-canvas-render';
import type { Rect, Shape } from '@obsidian-plugins/json-canvas-render';
import { connection, newId } from '../tools/tools';
import type { NodeBox } from '../tools/tools';
import { CanvasAdapterError } from './editor';
import { isCanvasNode } from './internals';
import type { CanvasCreationLike, CanvasNodeLike } from './internals';
import type { CanvasSession } from './session';

/**
 * Creates elements for the panel with the Canvas's own methods, so a new card behaves exactly
 * like one made by Obsidian (selected, text cards open for typing, one undo step). Shapes and
 * connections are then written by the session's editor, with its checks.
 */
export class Creator {
	constructor(
		private readonly session: CanvasSession,
		readonly canvas: CanvasCreationLike,
	) {}

	private node(created: unknown): CanvasNodeLike {
		if (!isCanvasNode(created) || this.canvas.nodes.get(created.id) !== created) throw new CanvasAdapterError('create-check');
		return created;
	}

	private where(box: Rect): { pos: { x: number; y: number }; size: { width: number; height: number } } {
		return { pos: { x: box.x, y: box.y }, size: { width: box.width, height: box.height } };
	}

	/** A text card with a shape, open for typing. Saved once, with its shape. */
	text(box: Rect, shape: Shape, focus = true): CanvasNodeLike {
		const node = this.node(this.canvas.createTextNode({ ...this.where(box), text: '', save: false, focus }));
		if (shape === DEFAULT_SHAPE) this.canvas.requestSave();
		else this.session.edit((editor) => editor.setShape([node], shape));
		return node;
	}

	/** A note or media card for a vault file (Obsidian fits images to their ratio). */
	file(box: Rect, file: unknown): CanvasNodeLike {
		return this.node(this.canvas.createFileNode({ ...this.where(box), file, save: true, focus: true }));
	}

	link(box: Rect, url: string): CanvasNodeLike {
		return this.node(this.canvas.createLinkNode({ ...this.where(box), url, save: true, focus: true }));
	}

	/** A group, with its label open for renaming. */
	group(box: Rect): CanvasNodeLike {
		return this.node(this.canvas.createGroupNode({ ...this.where(box), save: true, focus: true }));
	}

	/** Connect two cards (an arrow, or a plain line). */
	connect(from: NodeBox, to: NodeBox, arrow: boolean): void {
		this.session.edit((editor) => editor.addEdge(connection(this.freshId(), from, to, arrow)));
	}

	/** Connect a card to a new card at `box`, open for typing: one undo step for both. */
	connectToNew(from: NodeBox, box: Rect, arrow: boolean): CanvasNodeLike {
		const node = this.node(this.canvas.createTextNode({ ...this.where(box), text: '', save: false, focus: true }));
		this.session.edit((editor) => editor.addEdge(connection(this.freshId(), from, { id: node.id, ...box }, arrow)));
		return node;
	}

	private freshId(): string {
		let id = newId();
		while (this.canvas.nodes.has(id) || this.canvas.edges.has(id)) id = newId();
		return id;
	}
}
