import type { App, View } from 'obsidian';
import type { GraphKind } from '../config/types';
import type { Pixi } from '../pixi';
import { bag, call, isRenderer } from './raw';
import type { Bag, Fn, GraphRenderer } from './raw';

const VIEW_TYPES: Record<GraphKind, string> = { global: 'graph', local: 'localgraph' };

/** An open graph view: `graph` has `view.dataEngine`, `localgraph` has `view.engine` (same class). */
export interface OpenGraph {
	kind: GraphKind;
	renderer: GraphRenderer;
	/** The view's content element (the canvas lives inside it). */
	contentEl: HTMLElement;
	engine: object | null;
}

/** Graph views open in any window, with their renderer. */
export function openGraphs(app: App): OpenGraph[] {
	const graphs: OpenGraph[] = [];
	for (const kind of Object.keys(VIEW_TYPES) as GraphKind[]) {
		for (const leaf of app.workspace.getLeavesOfType(VIEW_TYPES[kind])) {
			const graph = graphOf(leaf.view, kind);
			if (graph) graphs.push(graph);
		}
	}
	return graphs;
}

function graphOf(view: View, kind: GraphKind): OpenGraph | null {
	const raw = view as unknown as Bag;
	if (!isRenderer(raw.renderer)) return null;
	const engine = bag(raw.dataEngine) ?? bag(raw.engine);
	const contentEl = raw.contentEl instanceof HTMLElement ? raw.contentEl : view.containerEl;
	return { kind, renderer: raw.renderer, contentEl, engine };
}

/** Whether the Graph core plugin is on; null when that cannot be read. */
export function isGraphPluginEnabled(app: App): boolean | null {
	const internalPlugins = bag((app as unknown as Bag).internalPlugins);
	const getPluginById = internalPlugins?.getPluginById;
	if (typeof getPluginById !== 'function') return null;
	const plugin = bag((getPluginById as Fn).call(internalPlugins, 'graph'));
	return typeof plugin?.enabled === 'boolean' ? plugin.enabled : null;
}

/** Filters, groups, display and forces of a graph view (as in its "..." panel). */
export function engineOptions(graph: OpenGraph): Record<string, unknown> | null {
	const engine = bag(graph.engine);
	return engine ? bag(call(engine, 'getOptions')) : null;
}

/** Apply some options to a graph view; it re-renders and saves them like a change in its panel. */
export function setEngineOptions(graph: OpenGraph, options: Record<string, unknown>): boolean {
	const engine = bag(graph.engine);
	if (!engine || typeof engine.setOptions !== 'function') return false;
	call(engine, 'setOptions', options);
	call(engine, 'onOptionsChange');
	return true;
}

/** PIXI as bundled for the graph view, or null when something the features use is missing. */
export function pixi(): Pixi | null {
	const lib = bag((window as unknown as Bag).PIXI);
	if (!lib) return null;
	for (const name of ['Graphics', 'Container', 'Sprite', 'TilingSprite', 'Text']) if (typeof lib[name] !== 'function') return null;
	// Texture is a class: a function with static members.
	const texture: unknown = lib.Texture;
	if (typeof texture !== 'function' || typeof (texture as unknown as Bag).from !== 'function' || !bag(lib.WRAP_MODES)) return null;
	return lib as unknown as Pixi;
}
