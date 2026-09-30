import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { AttachmentsGuardSettings } from '../types';
import { readSetting, writeSetting } from './bindings';
import { settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';

export interface SettingsHost extends Plugin {
	settings: AttachmentsGuardSettings;
	/** A setting changed: save it. */
	settingsChanged(): void;
	collectLoose(): void;
	listOrphans(): void;
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class AttachmentsGuardSettingTab extends PluginSettingTab implements DefinitionContext {
	readonly previews = new Set<() => void>();

	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'paperclip';
	}

	get settings(): AttachmentsGuardSettings {
		return this.plugin.settings;
	}

	collect(): void {
		this.plugin.collectLoose();
	}

	listOrphans(): void {
		this.plugin.listOrphans();
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
		for (const refresh of this.previews) refresh();
	}
}
