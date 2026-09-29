import { PluginSettingTab, debounce } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import { PREVIEW_DEBOUNCE_MS } from '../constants';
import type { ShortcutEngine } from '../engine';
import type { ShortcutsSettings } from '../types';
import { readSetting, writeSetting } from './bindings';
import { settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';
import { createNotesSource, newSourceId } from './settings';

export interface SettingsHost extends Plugin {
	settings: ShortcutsSettings;
	engine: ShortcutEngine;
	settingsChanged(): void;
}

/** Declarative settings (Obsidian 1.13+): rendering, search and list affordances come from the app. */
export class ShortcutsSettingTab extends PluginSettingTab implements DefinitionContext {
	readonly previews = new Map<string, () => void>();
	private readonly refreshPreviews = debounce(
		() => {
			for (const refresh of this.previews.values()) refresh();
		},
		PREVIEW_DEBOUNCE_MS,
		true,
	);

	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'at-sign';
	}

	get settings(): ShortcutsSettings {
		return this.plugin.settings;
	}

	get engine(): ShortcutEngine {
		return this.plugin.engine;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return settingDefinitions(this);
	}

	getControlValue(controlKey: string): unknown {
		return readSetting(this.plugin.settings, controlKey);
	}

	setControlValue(controlKey: string, value: unknown): void {
		writeSetting(this.plugin.settings, controlKey, value);
		this.plugin.settingsChanged();
		// "Valor da propriedade" is only visible while a property is set.
		this.refreshDomState();
		if (controlKey.startsWith('source.')) this.refreshPreviews();
	}

	addSource(): void {
		const sources = this.plugin.settings.sources;
		sources.push(createNotesSource(newSourceId(sources.map((source) => source.id))));
		this.structureChanged();
	}

	moveSource(from: number, to: number): void {
		const sources = this.plugin.settings.sources;
		const [moved] = sources.splice(from, 1);
		if (moved) sources.splice(to, 0, moved);
		this.structureChanged();
	}

	removeSource(index: number): void {
		this.plugin.settings.sources.splice(index, 1);
		this.structureChanged();
	}

	private structureChanged(): void {
		this.plugin.settingsChanged();
		this.update();
	}
}
