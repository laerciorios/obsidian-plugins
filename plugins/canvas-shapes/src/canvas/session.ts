import { edgeStyle, keepsAspectRatio, nodeShape } from '@obsidian-plugins/json-canvas-render';
import { CanvasAdapterError, CanvasEditor } from './editor';
import { afterMethod, isCanvasEdge, isCanvasNode } from './internals';
import type { CanvasLike, CanvasNodeLike } from './internals';
import { Painter } from './paint';

/** Interface attached to a session (the toolbar): refreshed on every change, removed with it. */
export interface SessionUi {
	update(): void;
	destroy(): void;
}

export interface SessionEvents {
	/** The canvas stopped behaving as expected; the session is already disposed. */
	failed(session: CanvasSession, error: unknown): void;
}

/**
 * The plugin attached to one open canvas: keeps the drawing in sync with the data (hooks on the
 * canvas instance, a ResizeObserver for shaped cards), locks the aspect ratio of squares and
 * circles, and applies edits. Any error turns the session off and removes everything it drew.
 */
export class CanvasSession {
	readonly editor: CanvasEditor;
	private readonly painter = new Painter();
	private readonly restores: (() => void)[] = [];
	private readonly observer: ResizeObserver;
	private readonly observed = new Map<Element, CanvasNodeLike>();
	private readonly locked = new Set<CanvasNodeLike>();
	private readonly uis: SessionUi[] = [];
	private pending = { data: false, selection: false };
	private frame = 0;
	private active = true;

	constructor(
		readonly view: object,
		readonly canvas: CanvasLike,
		private readonly events: SessionEvents,
	) {
		this.editor = new CanvasEditor(canvas);
		// The canvas may live in a popout window: observe with that window's ResizeObserver.
		const Observer = (canvas.wrapperEl.win as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver ?? ResizeObserver;
		this.observer = new Observer((entries) => this.guard(() => this.resized(entries)));
		try {
			this.hook('importData', 'data');
			this.hook('updateSelection', 'selection');
			this.syncAll();
		} catch (error) {
			this.fail(error);
		}
	}

	get isActive(): boolean {
		return this.active;
	}

	/** Attach an interface; it is updated on every change and destroyed with the session. */
	attach(ui: SessionUi): void {
		if (this.active) this.uis.push(ui);
		else ui.destroy();
	}

	private changed(): void {
		for (const ui of this.uis) ui.update();
	}

	private hook(method: string, kind: keyof CanvasSession['pending']): void {
		this.restores.push(
			afterMethod(
				this.canvas,
				method,
				() => {
					if (this.active) this.schedule(kind);
				},
				(error) => this.fail(error),
			),
		);
	}

	/** Coalesce changes into one update per animation frame. */
	private schedule(kind: keyof CanvasSession['pending']): void {
		this.pending[kind] = true;
		if (this.frame) return;
		this.frame = this.canvas.wrapperEl.win.requestAnimationFrame(() => {
			this.frame = 0;
			const { data, selection } = this.pending;
			this.pending = { data: false, selection: false };
			this.guard(() => {
				if (data) this.syncAll();
				else if (selection) this.relockSelection();
				this.changed();
			});
		});
	}

	private guard(run: () => void): void {
		if (!this.active) return;
		try {
			run();
		} catch (error) {
			this.fail(error);
		}
	}

	/** Redraw every node and edge from its data. */
	syncAll(): void {
		for (const [element, node] of this.observed) {
			if (this.canvas.nodes.get(node.id) !== node) {
				this.observer.unobserve(element);
				this.observed.delete(element);
				this.locked.delete(node);
			}
		}
		for (const node of this.canvas.nodes.values()) this.syncNode(node);
		for (const edge of this.canvas.edges.values()) {
			if (!isCanvasEdge(edge)) throw new CanvasAdapterError('edge-shape');
			this.painter.paintEdge(edge, edgeStyle(edge.getData()));
		}
	}

	private syncNode(node: CanvasNodeLike): void {
		if (!isCanvasNode(node)) throw new CanvasAdapterError('node-shape');
		const data = node.getData();
		const shape = nodeShape(data);
		const width = typeof data.width === 'number' ? data.width : 0;
		const height = typeof data.height === 'number' ? data.height : 0;
		this.painter.paintNode(node, shape, width, height);
		this.lock(node, keepsAspectRatio(shape));
		if (shape === 'rectangle' || shape === 'square') {
			if (this.observed.delete(node.nodeEl)) this.observer.unobserve(node.nodeEl);
		} else if (!this.observed.has(node.nodeEl)) {
			this.observed.set(node.nodeEl, node);
			this.observer.observe(node.nodeEl);
		}
	}

	/** Squares and circles resize 1:1; the ratio is only reset on nodes the plugin locked. */
	private lock(node: CanvasNodeLike, keep: boolean): void {
		if (keep) {
			node.aspectRatio = 1;
			this.locked.add(node);
		} else if (this.locked.delete(node)) {
			node.aspectRatio = 0;
		}
	}

	/** Obsidian resets the ratio of image cards when they load: lock again before a resize. */
	private relockSelection(): void {
		for (const item of this.canvas.selection) {
			if (isCanvasNode(item) && keepsAspectRatio(nodeShape(item.getData()))) this.lock(item, true);
		}
	}

	private resized(entries: ResizeObserverEntry[]): void {
		for (const entry of entries) {
			const node = this.observed.get(entry.target);
			if (node) this.syncNode(node);
		}
	}

	/** Run an edit; redraw and notify on success, turn off on failure. Returns the items changed. */
	edit(change: (editor: CanvasEditor) => number): number {
		if (!this.active) return 0;
		try {
			const count = change(this.editor);
			if (count > 0) this.syncAll();
			this.changed();
			return count;
		} catch (error) {
			this.fail(error);
			return 0;
		}
	}

	private fail(error: unknown): void {
		if (!this.active) return;
		this.dispose();
		this.events.failed(this, error);
	}

	/** Undo everything the session did to the canvas (hooks, drawings, locks). */
	dispose(): void {
		if (!this.active) return;
		this.active = false;
		if (this.frame) this.canvas.wrapperEl.win.cancelAnimationFrame(this.frame);
		this.observer.disconnect();
		for (const ui of this.uis.splice(0)) {
			try {
				ui.destroy();
			} catch {
				// Already gone with the canvas.
			}
		}
		for (const restore of this.restores.reverse()) {
			try {
				restore();
			} catch {
				// The canvas may already be gone.
			}
		}
		for (const node of this.locked) node.aspectRatio = 0;
		this.locked.clear();
		this.observed.clear();
		try {
			for (const node of this.canvas.nodes.values()) if (isCanvasNode(node)) this.painter.clearNode(node.nodeEl);
			for (const edge of this.canvas.edges.values()) if (isCanvasEdge(edge)) this.painter.clearEdge(edge);
		} catch {
			// Nothing else to clean.
		}
	}
}
