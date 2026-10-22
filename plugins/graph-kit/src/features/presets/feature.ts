import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import { newRuleId } from '../../config/reader';
import type { GraphKitConfig } from '../../config/types';
import { engineOptions, openGraphs, setEngineOptions } from '../../graph-internals';
import type { OpenGraph } from '../../graph-internals';
import { t } from '../../i18n';
import { GraphFeature } from '../feature';
import { pickNative } from './config';
import type { NativeOptions, Preset, PresetFeatureId, PresetsConfig } from './config';
import { applyPreset, snapshot, upsertPreset } from './snapshot';

export interface PresetsContext {
	app: App;
	config: () => GraphKitConfig;
	/** Apply and save the config, redrawing the settings tab. */
	changed: () => void;
	/** Feature ids a preset stores. */
	ids: readonly PresetFeatureId[];
}

/**
 * Named combinations of the other features' settings, optionally with the global graph's
 * filters and groups. Applying works by command whenever presets are on; the feature itself
 * only draws a picker over the graph. It patches nothing.
 */
export class PresetsFeature extends GraphFeature {
	readonly id = 'presets';
	readonly requires = [] as const;
	readonly hooks = [] as const;
	/** Native options waiting for a global graph to open. */
	private pendingNative: NativeOptions | null = null;
	private readonly pickers = new Map<HTMLElement, HTMLSelectElement>();
	private running = false;

	constructor(private readonly context: PresetsContext) {
		super();
	}

	private get settings(): PresetsConfig {
		return this.context.config().features.presets;
	}

	onload(): void {
		this.running = true;
	}

	onunload(): void {
		this.running = false;
		for (const picker of this.pickers.values()) picker.remove();
		this.pickers.clear();
	}

	invalidate(): void {
		// Nothing cached per note.
	}

	redraw(graph: OpenGraph): void {
		if (graph.kind === 'global' && this.pendingNative && setEngineOptions(graph, this.pendingNative)) this.pendingNative = null;
		const show = this.running && this.settings.showSelector && this.settings.graphs[graph.kind] && this.settings.items.length > 0;
		if (show) this.picker(graph);
		else {
			this.pickers.get(graph.contentEl)?.remove();
			this.pickers.delete(graph.contentEl);
		}
	}

	apply(preset: Preset): void {
		applyPreset(this.context.config(), preset);
		if (preset.native) {
			const globals = openGraphs(this.context.app).filter((graph) => graph.kind === 'global');
			const applied = globals.filter((graph) => setEngineOptions(graph, preset.native ?? {}));
			// No global graph open: apply when one opens.
			this.pendingNative = applied.length > 0 ? null : preset.native;
		}
		this.context.changed();
		new Notice(t('presets.applied', { name: preset.name }));
	}

	/** Save the current state under a name (replacing a preset with that name). */
	save(name: string, includeNative: boolean): Preset | null {
		let native: NativeOptions | null = null;
		if (includeNative) {
			const global = openGraphs(this.context.app).find((graph) => graph.kind === 'global');
			const options = global ? engineOptions(global) : null;
			if (!options) {
				new Notice(t('presets.noGraph'));
				return null;
			}
			native = pickNative(options);
		}
		const config = this.context.config();
		const preset = upsertPreset(config.features.presets.items, name, snapshot(config, this.context.ids), native, newRuleId);
		config.features.presets.current = preset.id;
		this.context.changed();
		new Notice(t('presets.saved', { name: preset.name }));
		return preset;
	}

	private picker(graph: OpenGraph): void {
		for (const [el, picker] of this.pickers) if (!el.isConnected) {
			picker.remove();
			this.pickers.delete(el);
		}
		let select = this.pickers.get(graph.contentEl);
		if (!select) {
			select = graph.contentEl.createEl('select', { cls: 'dropdown gk-preset-picker', attr: { 'aria-label': t('presets.picker') } });
			select.addEventListener('change', () => {
				const preset = this.settings.items.find((item) => item.id === select?.value);
				if (preset) this.apply(preset);
			});
			this.pickers.set(graph.contentEl, select);
		}
		select.empty();
		select.createEl('option', { text: t('presets.picker'), value: '' });
		for (const item of this.settings.items) select.createEl('option', { text: item.name, value: item.id });
		select.value = this.settings.current ?? '';
	}
}
