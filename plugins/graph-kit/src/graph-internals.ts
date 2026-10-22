/**
 * The ONLY module that knows the graph view's internals (no public API). Investigated on
 * Obsidian 1.14.4 (PIXI 7.2.4); see the spec in the vault. Every field and method is checked
 * before use; a missing one turns off only the features that need it.
 *
 * - Views `graph` and `localgraph` both have `view.renderer`, and both renderers share the
 *   same renderer, node and link classes, so a patch on a prototype reaches both graphs.
 * - Prototypes are only reachable from instances (`renderer.nodes[0]`).
 * - `node.getDisplayText()` is called once, in `initGraphics()`, to create the PIXI text.
 *   `renderer.setData()` reuses existing nodes, so a changed frontmatter needs `text.text` set.
 * - `renderer.changed()` asks for frames; the render loop stops after 60 idle frames.
 */
import type { App, View } from 'obsidian';
import type { GraphKind } from './config/types';

/** Opaque handle to a graph renderer; only this module looks inside. */
export type GraphRenderer = object & { readonly __graphRenderer: unique symbol };

/** Internals a feature may need. */
export type Capability = 'nodeText';

export type CapabilityCheck = { status: 'ok' } | { status: 'pending' } | { status: 'missing'; reason: string };

type Fn = (this: unknown, ...args: unknown[]) => unknown;
type Bag = Record<string, unknown>;

const VIEW_TYPES: Record<GraphKind, string> = { global: 'graph', local: 'localgraph' };

/** Node types that are notes: "" and "focused" (the center of the local graph, or the active file). */
const NOTE_NODE_TYPES = ['', 'focused'];

function bag(value: unknown): Bag | null {
	return typeof value === 'object' && value !== null ? (value as Bag) : null;
}

function isRenderer(value: unknown): value is GraphRenderer {
	const renderer = bag(value);
	return !!renderer && Array.isArray(renderer.nodes) && Array.isArray(renderer.links) && typeof renderer.changed === 'function' && typeof renderer.setData === 'function';
}

function nodesOf(renderer: GraphRenderer): Bag[] {
	const nodes = (renderer as unknown as Bag).nodes;
	return Array.isArray(nodes) ? (nodes as unknown[]).map(bag).filter((node): node is Bag => node !== null) : [];
}

export interface OpenGraph {
	kind: GraphKind;
	renderer: GraphRenderer;
}

/** Graph views open in any window, with their renderer. */
export function openGraphs(app: App): OpenGraph[] {
	const graphs: OpenGraph[] = [];
	for (const kind of Object.keys(VIEW_TYPES) as GraphKind[]) {
		for (const leaf of app.workspace.getLeavesOfType(VIEW_TYPES[kind])) {
			const renderer = rendererOf(leaf.view);
			if (renderer) graphs.push({ kind, renderer });
		}
	}
	return graphs;
}

export function rendererOf(view: View): GraphRenderer | null {
	const renderer = (view as unknown as Bag).renderer;
	return isRenderer(renderer) ? renderer : null;
}

/** Whether the Graph core plugin is on; null when that cannot be read. */
export function isGraphPluginEnabled(app: App): boolean | null {
	const internalPlugins = bag((app as unknown as Bag).internalPlugins);
	const getPluginById = internalPlugins?.getPluginById;
	if (typeof getPluginById !== 'function') return null;
	const plugin = bag((getPluginById as Fn).call(internalPlugins, 'graph'));
	return typeof plugin?.enabled === 'boolean' ? plugin.enabled : null;
}

/** Check a capability on a live renderer; "pending" until it has a node to look at. */
export function checkCapability(capability: Capability, renderer: GraphRenderer): CapabilityCheck {
	const node = nodesOf(renderer)[0];
	if (!node) return { status: 'pending' };
	switch (capability) {
		case 'nodeText': {
			if (typeof node.id !== 'string' || typeof node.type !== 'string') return missing('node.id/node.type');
			if (!('text' in node)) return missing('node.text');
			const text = bag(node.text);
			if (text && typeof text.text !== 'string') return missing('node.text.text');
			for (const method of ['getDisplayText', 'initGraphics', 'clearGraphics']) {
				if (typeof node[method] !== 'function') return missing(`node.${method}()`);
			}
			return { status: 'ok' };
		}
	}
}

function missing(reason: string): CapabilityCheck {
	return { status: 'missing', reason };
}

/**
 * Wrap a method, keeping the original. Undo restores it when the wrapper is still in place;
 * when someone else wrapped it afterwards, the wrapper becomes a pass-through instead, so
 * their chain keeps working.
 */
function patchMethod(target: Bag, name: string, wrap: (original: Fn) => Fn): () => void {
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

/** Called after the engine hands new data to a renderer (nodes created, removed or recolored). */
export type DataHook = (renderer: GraphRenderer) => void;

/** Patch `setData` on the renderer class; null when the renderer has no prototype method to patch. */
export function patchSetData(renderer: GraphRenderer, hook: DataHook): (() => void) | null {
	const proto = bag(Object.getPrototypeOf(renderer));
	if (!proto || typeof proto.setData !== 'function') return null;
	return patchMethod(proto, 'setData', (original) =>
		function (this: unknown, ...args: unknown[]) {
			const result = original.apply(this, args);
			if (isRenderer(this)) hook(this);
			return result;
		},
	);
}

/** Label of a note node: a text, or null for the native one (the file name). */
export type LabelHook = (renderer: GraphRenderer, path: string) => string | null;

/** Patch `getDisplayText` on the node class; null until the renderer has a node. Needs 'nodeText'. */
export function patchNodeLabels(renderer: GraphRenderer, hook: LabelHook): (() => void) | null {
	const node = nodesOf(renderer)[0];
	const proto = bag(node ? Object.getPrototypeOf(node) : null);
	if (!proto || typeof proto.getDisplayText !== 'function') return null;
	return patchMethod(proto, 'getDisplayText', (original) =>
		function (this: unknown) {
			const native = original.call(this);
			const self = bag(this);
			if (!self || typeof self.id !== 'string' || !NOTE_NODE_TYPES.includes(self.type as string) || !isRenderer(self.renderer)) return native;
			return hook(self.renderer, self.id) ?? native;
		},
	);
}

/** Same node class for both renderers? Lets the host patch each class once. */
export function nodeClassOf(renderer: GraphRenderer): object | null {
	const node = nodesOf(renderer)[0];
	return node ? (Object.getPrototypeOf(node) as object) : null;
}

/**
 * Re-read the text of nodes already drawn (all, or those with the given paths) through the
 * current `getDisplayText`, patched or not, and ask for a frame.
 */
export function refreshNodeLabels(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
	let changed = false;
	for (const node of nodesOf(renderer)) {
		if (paths && !paths.has(node.id as string)) continue;
		const text = bag(node.text);
		if (!text || typeof node.getDisplayText !== 'function') continue;
		const next = (node.getDisplayText as Fn).call(node);
		if (typeof next === 'string' && text.text !== next) {
			text.text = next;
			changed = true;
		}
	}
	if (changed) requestFrame(renderer);
}

export function requestFrame(renderer: GraphRenderer): void {
	((renderer as unknown as Bag).changed as Fn).call(renderer);
}
