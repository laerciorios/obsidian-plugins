import { Component } from 'obsidian';
import type { FeatureId, GraphKind } from '../config/types';
import type { Capability, HookName, LinkRef, NodeRef, OpenGraph } from '../graph-internals';

/** Hooks a feature can implement (setData belongs to the host). */
export type FeatureHook = Exclude<HookName, 'setData'>;

/**
 * One feature of the plugin. While it is active it is a child Component of the host, so
 * whatever it registers goes away when it is turned off (its `onunload` also removes what it
 * drew). The host only patches a graph method while some active feature lists the hook, and
 * only calls a feature's hooks on the graphs (global, local) it is enabled for.
 */
export abstract class GraphFeature extends Component {
	abstract readonly id: FeatureId;
	/** Internals it needs; when one is missing the feature is unavailable. */
	abstract readonly requires: readonly Capability[];
	/** Hooks it implements. */
	abstract readonly hooks: readonly FeatureHook[];
	/** Order among features in per-frame hooks: lower runs first (opacity before decorations). */
	readonly order: number = 10;

	/** Label of a note node, or null for the native one. */
	label?(path: string, kind: GraphKind): string | null;
	/** A node's graphics were just created. */
	nodeInit?(node: NodeRef, kind: GraphKind): void;
	/** Every frame, after the native update of a node. */
	nodeRender?(node: NodeRef, kind: GraphKind): void;
	/** A node's graphics are about to be destroyed (called on every graph). */
	nodeClear?(node: NodeRef): void;
	/** Base size of a node (before the graph's size multiplier), or null for the native one. */
	nodeSize?(node: NodeRef, kind: GraphKind): number | null;
	/** A link's graphics were just created. */
	linkInit?(link: LinkRef, kind: GraphKind): void;
	/** Every frame, after the native update of a link. */
	linkRender?(link: LinkRef, kind: GraphKind): void;

	/** Notes changed (null = everything, e.g. the config): drop cached results. */
	abstract invalidate(paths: ReadonlySet<string> | null): void;

	/**
	 * Redraw what this feature changes on a graph (all nodes, or those with the given paths).
	 * Also called right after the feature is turned off, with its patches gone, to restore the native look.
	 */
	abstract redraw(graph: OpenGraph, paths: ReadonlySet<string> | null): void;
}
