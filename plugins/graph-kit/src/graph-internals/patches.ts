import { LinkRef, NodeRef } from './refs';
import { bag, isRenderer, patchMethod, rawLinks, rawNodes } from './raw';
import type { Bag, Fn, GraphRenderer } from './raw';

/** Hooks the host can attach to the graph classes. Each one is a single wrapper per class. */
export interface GraphHooks {
	/** After the engine hands new data to a renderer (nodes created, removed or recolored). */
	setData: (renderer: GraphRenderer) => void;
	/** Text of a note node, or null for the native one (the file name). */
	label: (node: NodeRef) => string | null;
	/** After a node's circle and text were created. */
	nodeInit: (node: NodeRef) => void;
	/** After the native per-frame update of a node. */
	nodeRender: (node: NodeRef) => void;
	/** Before a node's graphics are destroyed. */
	nodeClear: (node: NodeRef) => void;
	/** Size of a node, given the native one. */
	nodeSize: (node: NodeRef, native: number) => number;
	/** After a link's line and arrow were created. */
	linkInit: (link: LinkRef) => void;
	/** After the native per-frame update of a link. */
	linkRender: (link: LinkRef) => void;
}

export type HookName = keyof GraphHooks;

/** The class a hook patches, from a live renderer; null until it has a node (or link). */
export function patchTarget(renderer: GraphRenderer, hook: HookName): Bag | null {
	if (hook === 'setData') return bag(Object.getPrototypeOf(renderer));
	const sample = hook === 'linkInit' || hook === 'linkRender' ? rawLinks(renderer)[0] : rawNodes(renderer)[0];
	return sample ? bag(Object.getPrototypeOf(sample)) : null;
}

const METHOD: Record<HookName, string> = {
	setData: 'setData',
	label: 'getDisplayText',
	nodeInit: 'initGraphics',
	nodeRender: 'render',
	nodeClear: 'clearGraphics',
	nodeSize: 'getSize',
	linkInit: 'initGraphics',
	linkRender: 'render',
};

/** Install one hook on its class; returns the undo, or null when the method is not there. */
export function installHook<H extends HookName>(target: Bag, hook: H, run: GraphHooks[H]): (() => void) | null {
	const name = METHOD[hook];
	if (typeof target[name] !== 'function') return null;
	return patchMethod(target, name, (original) => wrapper(hook, original, run as unknown as Fn));
}

function wrapper(hook: HookName, original: Fn, run: Fn): Fn {
	switch (hook) {
		case 'setData':
			return function (this: unknown, ...args: unknown[]) {
				const result = original.apply(this, args);
				if (isRenderer(this)) run(this);
				return result;
			};
		case 'label':
			return function (this: unknown) {
				const native = original.call(this);
				const self = bag(this);
				return self ? ((run(NodeRef.of(self))) ?? native) : native;
			};
		case 'nodeInit':
			// initGraphics returns true only when it actually created the graphics.
			return function (this: unknown, ...args: unknown[]) {
				const created = original.apply(this, args);
				const self = bag(this);
				if (created === true && self) run(NodeRef.of(self));
				return created;
			};
		case 'nodeRender':
			return function (this: unknown, ...args: unknown[]) {
				const result = original.apply(this, args);
				const self = bag(this);
				if (self?.rendered === true) run(NodeRef.of(self));
				return result;
			};
		case 'nodeClear':
			return function (this: unknown, ...args: unknown[]) {
				const self = bag(this);
				if (self?.rendered === true) run(NodeRef.of(self));
				return original.apply(this, args);
			};
		case 'nodeSize':
			return function (this: unknown, ...args: unknown[]) {
				const native = original.apply(this, args);
				const self = bag(this);
				return self && typeof native === 'number' ? run(NodeRef.of(self), native) : native;
			};
		case 'linkInit':
			// Link initGraphics returns nothing: compare `rendered` before and after.
			return function (this: unknown, ...args: unknown[]) {
				const self = bag(this);
				const before = self?.rendered === true;
				const result = original.apply(this, args);
				if (self && !before && self.rendered === true) run(LinkRef.of(self));
				return result;
			};
		case 'linkRender':
			return function (this: unknown, ...args: unknown[]) {
				const result = original.apply(this, args);
				const self = bag(this);
				if (self?.rendered === true) run(LinkRef.of(self));
				return result;
			};
	}
}
