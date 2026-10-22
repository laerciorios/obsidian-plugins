import { Component, TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { FeatureId, GraphKind, GraphKitConfig } from './config/types';
import type { GraphFeature } from './features/feature';
import { featureConfig } from './features/registry';
import { checkCapability, nodeClassOf, openGraphs, patchNodeLabels, patchSetData } from './graph-internals';
import type { GraphRenderer, OpenGraph } from './graph-internals';
import type { NoteFactsCache } from './note-facts';

export type FeatureStatus = { state: 'unchecked' } | { state: 'ok' } | { state: 'unavailable'; reason: string };

type PatchKind = 'setData' | 'label';

export interface HostOptions {
	app: App;
	features: readonly GraphFeature[];
	config: () => GraphKitConfig;
	facts: NoteFactsCache;
	/** A feature's status changed (for the settings tab). */
	statusChanged: () => void;
}

/**
 * Tracks the open graphs, keeps exactly the patches the active features need (none when all
 * are off), dispatches hooks per graph kind and redraws on note and config changes.
 */
export class GraphHost extends Component {
	private readonly app: App;
	private readonly kinds = new WeakMap<GraphRenderer, GraphKind>();
	private graphs: OpenGraph[] = [];
	private readonly active = new Set<GraphFeature>();
	private readonly status = new Map<FeatureId, FeatureStatus>();
	/** Undo functions per patched class and method. */
	private readonly patches = new Map<object, Map<PatchKind, () => void>>();
	private events: Component | null = null;
	private pending: Set<string> | 'all' | null = null;
	private frame: number | null = null;
	private stopped = false;

	constructor(private readonly options: HostOptions) {
		super();
		this.app = options.app;
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
		this.removeAllPatches();
		for (const graph of openGraphs(this.app)) for (const feature of wasActive) this.redraw(feature, graph.renderer, null);
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
		this.toggleEvents(this.active.size > 0);
		this.updatePatches();

		this.options.facts.invalidate(null);
		for (const feature of this.options.features) feature.invalidate(null);
		for (const graph of this.graphs) {
			for (const feature of [...turnedOff, ...this.active]) this.redraw(feature, graph.renderer, null);
		}
	}

	private wants(feature: GraphFeature, config: GraphKitConfig): boolean {
		const own = featureConfig(config, feature.id);
		return config.enabled && own.enabled && (own.graphs.global || own.graphs.local) && this.featureStatus(feature.id).state !== 'unavailable';
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
			for (const feature of this.active) this.redraw(feature, graph.renderer, null);
		}
	}

	/** The engine gave a renderer new data: the first time, this is when its node class shows up. */
	private onData(renderer: GraphRenderer): void {
		if (this.stopped) return;
		if (!this.kinds.has(renderer)) this.graphs = this.findGraphs();
		if (this.checkFeatures()) return this.sync();
		this.updatePatches();
	}

	/** Check the internals each feature needs on the open graphs. True when a feature turned unavailable. */
	private checkFeatures(): boolean {
		let lost = false;
		let changed = false;
		for (const feature of this.options.features) {
			if (this.featureStatus(feature.id).state !== 'unchecked') continue;
			for (const graph of this.graphs) {
				const reasons = feature.requires.map((capability) => checkCapability(capability, graph.renderer));
				const missing = reasons.find((check) => check.status === 'missing');
				if (missing?.status === 'missing') {
					this.markUnavailable(feature, missing.reason);
					lost = true;
				} else if (reasons.every((check) => check.status === 'ok')) {
					this.status.set(feature.id, { state: 'ok' });
				} else {
					continue;
				}
				changed = true;
				break;
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
		if (this.active.size === 0) return this.removeAllPatches();
		const wantsLabels = [...this.active].some((feature) => feature.hooks.includes('label'));
		for (const { renderer } of this.graphs) {
			this.ensurePatch(Object.getPrototypeOf(renderer) as object, 'setData', () => patchSetData(renderer, (r) => this.onData(r)));
			const nodeClass = nodeClassOf(renderer);
			if (wantsLabels && nodeClass) this.ensurePatch(nodeClass, 'label', () => patchNodeLabels(renderer, (r, path) => this.label(r, path)));
		}
		if (!wantsLabels) this.removePatches('label');
	}

	private ensurePatch(target: object, kind: PatchKind, apply: () => (() => void) | null): void {
		const byKind = this.patches.get(target) ?? new Map<PatchKind, () => void>();
		if (byKind.has(kind)) return;
		const undo = apply();
		if (!undo) return;
		byKind.set(kind, undo);
		this.patches.set(target, byKind);
	}

	private removePatches(kind: PatchKind): void {
		for (const byKind of this.patches.values()) {
			byKind.get(kind)?.();
			byKind.delete(kind);
		}
	}

	private removeAllPatches(): void {
		for (const byKind of this.patches.values()) for (const undo of byKind.values()) undo();
		this.patches.clear();
	}

	private kindOf(renderer: GraphRenderer): GraphKind | null {
		if (!this.kinds.has(renderer)) this.graphs = this.findGraphs();
		return this.kinds.get(renderer) ?? null;
	}

	private label(renderer: GraphRenderer, path: string): string | null {
		const kind = this.kindOf(renderer);
		if (!kind) return null;
		const config = this.options.config();
		for (const feature of this.active) {
			if (!feature.hooks.includes('label') || !featureConfig(config, feature.id).graphs[kind]) continue;
			try {
				const label = feature.label?.(path, kind) ?? null;
				if (label !== null) return label;
			} catch (error) {
				this.fail(feature, error);
			}
		}
		return null;
	}

	private redraw(feature: GraphFeature, renderer: GraphRenderer, paths: ReadonlySet<string> | null): void {
		try {
			feature.redraw(renderer, paths);
		} catch (error) {
			this.fail(feature, error);
		}
	}

	/** Note events, registered only while some feature is active. */
	private toggleEvents(on: boolean): void {
		if (on && !this.events) {
			const events = new Component();
			const { vault, metadataCache } = this.app;
			events.registerEvent(metadataCache.on('changed', (file) => this.notesChanged(new Set([file.path]))));
			events.registerEvent(vault.on('rename', (file, oldPath) => this.notesChanged(file instanceof TFile ? new Set([file.path, oldPath]) : null)));
			events.registerEvent(vault.on('delete', (file) => this.notesChanged(file instanceof TFile ? new Set([file.path]) : null)));
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
		for (const graph of this.graphs) for (const feature of this.active) this.redraw(feature, graph.renderer, paths);
	}
}
