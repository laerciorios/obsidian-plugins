import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { Reading } from '../tracker';
import type { ReadingTimeSettings } from '../types';
import { readSetting, writeSetting } from './bindings';
import { settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';

export interface SettingsHost extends Plugin {
	settings: ReadingTimeSettings;
	/** A setting changed: save and refresh the status bar. */
	settingsChanged(): void;
	readActive(): Reading | null;
	updateAll(): void;
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class ReadingTimeSettingTab extends PluginSettingTab implements DefinitionContext {
	readonly previews = new Set<() => void>();

	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'timer';
	}

	get settings(): ReadingTimeSettings {
		return this.plugin.settings;
	}

	read(): Reading | null {
		return this.plugin.readActive();
	}

	updateAll(): void {
		this.plugin.updateAll();
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
		// Some rows are only visible for a given format or code mode.
		this.refreshDomState();
		for (const refresh of this.previews) refresh();
	}
}
