import type { CanvasEdgeLike, CanvasLike, CanvasNodeLike, Data } from '../src/canvas/internals';

/**
 * A stand-in for Obsidian's Canvas with the behavior the plugin relies on (Obsidian 1.14): nodes
 * and edges keep unknown keys in `unknownData` and spread them in `getData()`; the canvas spreads
 * its root `data`; `requestSave` snapshots `data`.
 */

export class FakeNode implements CanvasNodeLike {
	nodeEl = {} as HTMLElement;
	unknownData: Data = {};
	aspectRatio = 0;
	x = 0;
	y = 0;
	width = 100;
	height = 100;
	color = '';

	constructor(
		readonly id: string,
		data: Data,
		/** Simulates an Obsidian that drops unknown keys. */
		private readonly forgetful = false,
	) {
		this.setData({ id, ...data });
	}

	getData(): Data {
		const data: Data = { ...this.unknownData, id: this.id, x: this.x, y: this.y, width: this.width, height: this.height };
		if (this.color) data.color = this.color;
		return data;
	}

	setData(data: Data): void {
		const { x, y, width, height, color, ...rest } = data;
		if (typeof x === 'number') this.x = Math.round(x);
		if (typeof y === 'number') this.y = Math.round(y);
		if (typeof width === 'number') this.width = Math.round(width);
		if (typeof height === 'number') this.height = Math.round(height);
		this.color = typeof color === 'string' ? color : '';
		this.unknownData = this.forgetful ? { id: rest.id, type: rest.type, text: rest.text } : rest;
	}
}

export class FakeEdge implements CanvasEdgeLike {
	lineGroupEl = {} as SVGElement;
	lineEndGroupEl = {} as SVGElement;
	unknownData: Data = {};

	constructor(
		readonly id: string,
		data: Data,
	) {
		this.setData({ id, ...data });
	}

	getData(): Data {
		return { ...this.unknownData, id: this.id };
	}

	setData(data: Data): void {
		this.unknownData = { ...data };
	}
}

export class FakeCanvas implements CanvasLike {
	nodes = new Map<string, FakeNode>();
	edges = new Map<string, FakeEdge>();
	selection = new Set<FakeNode | FakeEdge>();
	data: Data = {};
	readonly = false;
	wrapperEl = {} as HTMLElement;
	saves = 0;

	add(...items: (FakeNode | FakeEdge)[]): this {
		for (const item of items) {
			if (item instanceof FakeNode) this.nodes.set(item.id, item);
			else this.edges.set(item.id, item);
		}
		return this;
	}

	select(...ids: string[]): this {
		this.selection = new Set(ids.map((id) => this.nodes.get(id) ?? this.edges.get(id)).filter((item) => item !== undefined));
		return this;
	}

	getData(): Data {
		return { ...this.data, nodes: [...this.nodes.values()].map((node) => node.getData()), edges: [...this.edges.values()].map((edge) => edge.getData()) };
	}

	requestSave(): void {
		this.data = this.getData();
		this.saves++;
	}

	/** Like Obsidian: edges whose two nodes exist are created (sides are kept as given). */
	importData(data: Data): unknown {
		const edges = Array.isArray(data.edges) ? (data.edges as Data[]) : [];
		for (const edge of edges) {
			const { id, fromNode, toNode } = edge;
			if (typeof id !== 'string' || typeof fromNode !== 'string' || typeof toNode !== 'string') continue;
			if (this.nodes.has(fromNode) && this.nodes.has(toNode)) this.edges.set(id, new FakeEdge(id, edge));
		}
		return new Set();
	}

	updateSelection(change: () => void): void {
		change();
	}
}
