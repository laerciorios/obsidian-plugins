import { Component, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { FeatureId, GraphKind, GraphKitConfig } from './config/types';
import type { FeatureHook, GraphFeature } from './features/feature';
import { featureConfig } from './features/registry';
import { checkCapability, installHook, openGraphs, patchTarget } from './graph-internals';
import type { GraphHooks, GraphRenderer, HookName, NodeRef, OpenGraph } from './graph-internals';
import type { NoteFactsCache } from './note-facts';

export type FeatureStatus = { state: 'unchecked' } | { state: 'ok' } | { state: 'unavailable'; reason: string };

export interface HostOptions {
	app: App;
	features: readonly GraphFeature[];
	config: () => GraphKitConfig;
	facts: NoteFactsCache;
	/** A feature's status changed (for the settings tab). */
	statusChanged: () => void;
}

const ALL_HOOKS: readonly HookName[] = ['setData', 'label', 'nodeInit', 'nodeRender', 'nodeClear', 'nodeSize', 'linkInit', 'linkRender'];

/**
 * Tracks the open graphs, keeps exactly the patches the active features need (none when all
 * are off), dispatches hooks per graph kind and redraws on note and config changes.
 */
export class GraphHost extends Component {
	private readonly app: App;
	private readonly kinds = new WeakMap<GraphRenderer, GraphKind>();
	private graphs: OpenGraph[] = [];
	private readonly active = new Set<GraphFeature>();
	/** Active features per hook, in `order`. */
	private byHook = new Map<FeatureHook, GraphFeature[]>();
	private readonly status = new Map<FeatureId, FeatureStatus>();
	/** Undo functions per patched class and hook. */
	private readonly patches = new Map<object, Map<HookName, () => void>>();
	private events: Component | null = null;
	private pending: Set<string> | 'all' | null = null;
	private frame: number | null = null;
	private stopped = false;
	private readonly hooks: GraphHooks;

	constructor(private readonly options: HostOptions) {
		super();
		this.app = options.app;
		this.hooks = {
			setData: (renderer) => this.onData(renderer),
			label: (node) => this.label(node),
			nodeInit: (node) => this.each('nodeInit', node.renderer, (feature, kind) => feature.nodeInit?.(node, kind)),
			nodeRender: (node) => this.each('nodeRender', node.renderer, (feature, kind) => feature.nodeRender?.(node, kind)),
			nodeClear: (node) => this.clear(node),
			nodeSize: (node, native) => this.size(node, native),
			linkInit: (link) => this.each('linkInit', link.renderer, (feature, kind) => feature.linkInit?.(link, kind)),
			linkRender: (link) => this.each('linkRender', link.renderer, (feature, kind) => feature.linkRender?.(link, kind)),
		};
	}

	onload(): void {
		this.registerEvent(this.app.workspace.on('layout-change', () => this.scan()));
		this.app.workspace.onLayoutReady(() => this.sync());
	}

	onunload(): void {
		this.stopped = true;
		if (this.frame !== null) window.cancelAnimationFrame(this.frame);
		const wasActive = [...this.active];
		this.active.clear();
		this.byHook.clear();
		this.removePatches(ALL_HOOKS);
		for (const graph of openGraphs(this.app)) for (const feature of wasActive) this.redraw(feature, graph, null);
	}

	featureStatus(id: FeatureId): FeatureStatus {
		return this.status.get(id) ?? { state: 'unchecked' };
	}

	/** Apply the config: start and stop features, update patches, redraw every open graph. */
	sync(): void {
		if (this.stopped) return;
		this.graphs = this.findGraphs();
		this.checkFeatures();
		const config = this.options.config();
		const wanted = this.options.features.filter((feature) => this.wants(feature, config));
		const turnedOff = [...this.active].filter((feature) => !wanted.includes(feature));
		for (const feature of turnedOff) {
			this.active.delete(feature);
			this.removeChild(feature);
		}
		for (const feature of wanted) {
			if (this.active.has(feature)) continue;
			this.active.add(feature);
			this.addChild(feature);
		}
		this.indexHooks();
		this.toggleEvents(this.active.size > 0);
		this.updatePatches();

		this.options.facts.invalidate(null);
		for (const feature of this.options.features) feature.invalidate(null);
		for (const graph of this.graphs) {
			for (const feature of [...turnedOff, ...this.active]) this.redraw(feature, graph, null);
		}
	}

	private wants(feature: GraphFeature, config: GraphKitConfig): boolean {
		const own = featureConfig(config, feature.id);
		return config.enabled && own.enabled && (own.graphs.global || own.graphs.local) && this.featureStatus(feature.id).state !== 'unavailable';
	}

	private indexHooks(): void {
		const byHook = new Map<FeatureHook, GraphFeature[]>();
		const ordered = [...this.active].sort((a, b) => a.order - b.order);
		for (const feature of ordered) for (const hook of feature.hooks) byHook.set(hook, [...(byHook.get(hook) ?? []), feature]);
		this.byHook = byHook;
	}

	private findGraphs(): OpenGraph[] {
		const graphs = openGraphs(this.app);
		for (const graph of graphs) this.kinds.set(graph.renderer, graph.kind);
		return graphs;
	}

	/** Graphs opened or closed: patch and draw the new ones. */
	private scan(): void {
		if (this.stopped) return;
		const known = new Set(this.graphs.map((graph) => graph.renderer));
		this.graphs = this.findGraphs();
		if (this.checkFeatures()) return this.sync();
		if (this.active.size === 0) return;
		this.updatePatches();
		for (const graph of this.graphs) {
			if (known.has(graph.renderer)) continue;
			for (const feature of this.active) this.redraw(feature, graph, null);
		}
	}

	/** The engine gave a renderer new data: the first time, this is when its classes show up. */
	private onData(renderer: GraphRenderer): void {
		if (this.stopped) return;
		if (!this.kinds.has(renderer)) this.graphs = this.findGraphs();
		if (this.checkFeatures()) return this.sync();
		this.updatePatches();
	}

	/**
	 * Check the internals each feature needs on the open graphs. A capability counts as checked
	 * once some graph confirms it. True when a feature turned unavailable.
	 */
	private checkFeatures(): boolean {
		let lost = false;
		let changed = false;
		for (const feature of this.options.features) {
			if (this.featureStatus(feature.id).state !== 'unchecked' || this.graphs.length === 0) continue;
			const checks = feature.requires.map((capability) => this.graphs.map((graph) => checkCapability(capability, graph)));
			const missing = checks.flat().find((check) => check.status === 'missing');
			if (missing?.status === 'missing') {
				this.markUnavailable(feature, missing.reason);
				lost = changed = true;
			} else if (checks.every((perGraph) => perGraph.some((check) => check.status === 'ok'))) {
				this.status.set(feature.id, { state: 'ok' });
				changed = true;
			}
		}
		if (changed) this.options.statusChanged();
		return lost;
	}

	private markUnavailable(feature: GraphFeature, reason: string, cause = 'graph internals changed'): void {
		this.status.set(feature.id, { state: 'unavailable', reason });
		console.warn(`Graph Kit: "${feature.id}" turned off, ${cause} (${reason}).`);
	}

	/** A hook threw: turn that feature off for this session and keep the graph native. */
	private fail(feature: GraphFeature, error: unknown): void {
		if (this.featureStatus(feature.id).state === 'unavailable') return;
		this.markUnavailable(feature, error instanceof Error ? error.message : String(error), 'it failed');
		this.options.statusChanged();
		// Not from inside the render loop.
		window.setTimeout(() => this.sync(), 0);
	}

	private updatePatches(): void {
		if (this.active.size === 0) return this.removePatches(ALL_HOOKS);
		const needed = new Set<HookName>(['setData', ...this.byHook.keys()]);
		for (const { renderer } of this.graphs) {
			for (const hook of needed) {
				const target = patchTarget(renderer, hook);
				if (target) this.ensurePatch(target, hook);
			}
		}
		this.removePatches(ALL_HOOKS.filter((hook) => !needed.has(hook)));
	}

	private ensurePatch(target: Record<string, unknown>, hook: HookName): void {
		const byHook = this.patches.get(target) ?? new Map<HookName, () => void>();
		if (byHook.has(hook)) return;
		const undo = installHook(target, hook, this.hooks[hook]);
		if (!undo) return;
		byHook.set(hook, undo);
		this.patches.set(target, byHook);
	}

	private removePatches(hooks: readonly HookName[]): void {
		for (const byHook of this.patches.values()) {
			for (const hook of hooks) {
				byHook.get(hook)?.();
				byHook.delete(hook);
			}
		}
	}

	private kindOf(renderer: GraphRenderer | null): GraphKind | null {
		if (!renderer) return null;
		if (!this.kinds.has(renderer)) this.graphs = this.findGraphs();
		return this.kinds.get(renderer) ?? null;
	}

	/** Run a hook on the active features enabled for the renderer's graph. */
	private each(hook: FeatureHook, renderer: GraphRenderer | null, run: (feature: GraphFeature, kind: GraphKind) => void): void {
		const features = this.byHook.get(hook);
		if (!features) return;
		const kind = this.kindOf(renderer);
		if (!kind) return;
		const config = this.options.config();
		for (const feature of features) {
			if (!featureConfig(config, feature.id).graphs[kind]) continue;
			try {
				run(feature, kind);
			} catch (error) {
				this.fail(feature, error);
			}
		}
	}

	/** First non-null answer among the enabled features. */
	private first<T>(hook: FeatureHook, renderer: GraphRenderer | null, ask: (feature: GraphFeature, kind: GraphKind) => T | null | undefined): T | null {
		let answer: T | null = null;
		this.each(hook, renderer, (feature, kind) => {
			if (answer === null) answer = ask(feature, kind) ?? null;
		});
		return answer;
	}

	private label(node: NodeRef): string | null {
		if (!node.isNote) return null;
		return this.first('label', node.renderer, (feature, kind) => feature.label?.(node.id, kind));
	}

	private size(node: NodeRef, native: number): number {
		return this.first('nodeSize', node.renderer, (feature, kind) => feature.nodeSize?.(node, kind)) ?? native;
	}

	/** Cleanup runs on every graph, whatever the per-graph switches say. */
	private clear(node: NodeRef): void {
		for (const feature of this.byHook.get('nodeClear') ?? []) {
			try {
				feature.nodeClear?.(node);
			} catch (error) {
				this.fail(feature, error);
			}
		}
	}

	private redraw(feature: GraphFeature, graph: OpenGraph, paths: ReadonlySet<string> | null): void {
		try {
			feature.redraw(graph, paths);
		} catch (error) {
			this.fail(feature, error);
		}
	}

	/** Note events, registered only while some feature is active. */
	private toggleEvents(on: boolean): void {
		if (on && !this.events) {
			const events = new Component();
			const { vault, metadataCache, workspace } = this.app;
			events.registerEvent(metadataCache.on('changed', (file) => this.notesChanged(new Set([file.path]))));
			events.registerEvent(vault.on('rename', (file, oldPath) => this.notesChanged(file instanceof TFile ? new Set([file.path, oldPath]) : null)));
			events.registerEvent(vault.on('delete', (file) => this.notesChanged(file instanceof TFile ? new Set([file.path]) : null)));
			// Theme colors (color presets, icon color) follow the theme.
			events.registerEvent(workspace.on('css-change', () => this.notesChanged(null)));
			this.events = this.addChild(events);
		} else if (!on && this.events) {
			this.removeChild(this.events);
			this.events = null;
			this.pending = null;
		}
	}

	/** Drop cached results now; redraw on the next frame, once for a burst of changes (a folder rename). */
	private notesChanged(paths: ReadonlySet<string> | null): void {
		this.options.facts.invalidate(paths);
		for (const feature of this.active) feature.invalidate(paths);
		if (!paths || this.pending === 'all') this.pending = 'all';
		else this.pending = new Set([...(this.pending ?? []), ...paths]);
		if (this.frame === null) this.frame = window.requestAnimationFrame(() => this.flush());
	}

	private flush(): void {
		this.frame = null;
		const pending = this.pending;
		this.pending = null;
		if (!pending || this.stopped) return;
		const paths = pending === 'all' ? null : pending;
		for (const graph of this.graphs) for (const feature of this.active) this.redraw(feature, graph, paths);
	}
}
