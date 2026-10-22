import { Component } from 'obsidian';
import type { FeatureId, GraphKind } from '../config/types';
import type { Capability, GraphRenderer } from '../graph-internals';

export type Hook = 'label';

/**
 * One feature of the plugin. While it is active it is a child Component of the host, so
 * whatever it registers goes away when it is turned off. Hooks are optional: the host only
 * patches a graph method while some active feature implements the matching hook.
 */
export abstract class GraphFeature extends Component {
	abstract readonly id: FeatureId;
	/** Internals it needs; when one is missing the feature is unavailable. */
	abstract readonly requires: readonly Capability[];

	/** Hooks it implements; the host patches a graph method only while an active feature lists its hook. */
	abstract readonly hooks: readonly Hook[];

	/** Hook 'label': label of a note node, or null for the native one. Only called for enabled graphs. */
	label?(path: string, kind: GraphKind): string | null;

	/** Notes changed (null = everything, e.g. the config): drop cached results. */
	abstract invalidate(paths: ReadonlySet<string> | null): void;

	/**
	 * Redraw what this feature changes on a graph (all nodes, or those with the given paths).
	 * Also called right after the feature is turned off, with its patches gone, to restore the native look.
	 */
	abstract redraw(renderer: GraphRenderer, paths: ReadonlySet<string> | null): void;
}
