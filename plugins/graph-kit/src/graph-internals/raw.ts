/**
 * Low-level reading of graph internals (no public API), shared by the other files of this
 * folder. Nothing outside `src/graph-internals/` imports this.
 */

export type Fn = (this: unknown, ...args: unknown[]) => unknown;
export type Bag = Record<string, unknown>;

/** Opaque handle to a graph renderer; only this folder looks inside. */
export type GraphRenderer = object & { readonly __graphRenderer: unique symbol };

export function bag(value: unknown): Bag | null {
	return typeof value === 'object' && value !== null ? (value as Bag) : null;
}

export function isRenderer(value: unknown): value is GraphRenderer {
	const renderer = bag(value);
	return !!renderer && Array.isArray(renderer.nodes) && Array.isArray(renderer.links) && typeof renderer.changed === 'function' && typeof renderer.setData === 'function';
}

export function rawOf(renderer: GraphRenderer): Bag {
	return renderer;
}

function listOf(renderer: GraphRenderer, key: 'nodes' | 'links'): Bag[] {
	const list = rawOf(renderer)[key];
	return Array.isArray(list) ? (list as unknown[]).map(bag).filter((item): item is Bag => item !== null) : [];
}

export function rawNodes(renderer: GraphRenderer): Bag[] {
	return listOf(renderer, 'nodes');
}

export function rawLinks(renderer: GraphRenderer): Bag[] {
	return listOf(renderer, 'links');
}

export function num(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function call(target: Bag, name: string, ...args: unknown[]): unknown {
	const method = target[name];
	return typeof method === 'function' ? (method as Fn).apply(target, args) : undefined;
}

/** Ask the renderer for frames (its loop stops after 60 idle ones). */
export function requestFrame(renderer: GraphRenderer): void {
	call(rawOf(renderer), 'changed');
}

/**
 * Wrap a method, keeping the original. Undo restores it when the wrapper is still in place;
 * when someone else wrapped it afterwards, the wrapper becomes a pass-through instead, so
 * their chain keeps working.
 */
export function patchMethod(target: Bag, name: string, wrap: (original: Fn) => Fn): () => void {
	const original = target[name] as Fn;
	const own = Object.prototype.hasOwnProperty.call(target, name);
	const wrapped = wrap(original);
	let active = true;
	const patched: Fn = function (this: unknown, ...args: unknown[]) {
		return active ? wrapped.apply(this, args) : original.apply(this, args);
	};
	target[name] = patched;
	return () => {
		active = false;
		if (target[name] !== patched) return;
		if (own) target[name] = original;
		else delete target[name];
	};
}
