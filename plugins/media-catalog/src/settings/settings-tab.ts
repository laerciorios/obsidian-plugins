import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import { SETTINGS_ICON } from '../constants';
import type { CatalogSettings } from '../types';
import { readSetting, writeSetting } from './bindings';
import { settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';

export interface SettingsHost extends Plugin {
	settings: CatalogSettings;
	settingsChanged(): void;
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class MediaCatalogSettingTab extends PluginSettingTab implements DefinitionContext {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = SETTINGS_ICON;
	}

	get settings(): CatalogSettings {
		return this.plugin.settings;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return settingDefinitions(this);
	}

	getControlValue(key: string): unknown {
		return readSetting(this.plugin.settings, key);
	}

	setControlValue(key: string, value: unknown): void {
		if (!writeSetting(this.plugin.settings, key, value)) return;
		this.plugin.settingsChanged();
		this.refreshDomState();
	}

	secretChanged(): void {
		this.plugin.settingsChanged();
	}
}
