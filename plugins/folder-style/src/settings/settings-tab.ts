import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { FolderStyle, FolderStyleSettings, FolderStyles } from '../types';
import { key, settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';

export interface SettingsHost extends Plugin {
	settings: FolderStyleSettings;
	missingIcons: ReadonlySet<string>;
	/** Settings changed: regenerate the stylesheet and save. */
	settingsChanged(): void;
	/** The folder styles were replaced: regenerate, save and redraw this tab. */
	foldersChanged(folders: FolderStyles): void;
}

/** Declarative settings (Obsidian 1.13+): global options and the list of customized folders. */
export class FolderStyleSettingTab extends PluginSettingTab implements DefinitionContext {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'folder-heart';
	}

	get settings(): FolderStyleSettings {
		return this.plugin.settings;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return settingDefinitions(this);
	}

	getControlValue(controlKey: string): unknown {
		switch (controlKey) {
			case key.opacity:
				return this.plugin.settings.opacity;
			case key.tintChildren:
				return this.plugin.settings.tintChildren;
			case key.symbolSize:
				return this.plugin.settings.symbolSize;
			default:
				return undefined;
		}
	}

	setControlValue(controlKey: string, value: unknown): void {
		const settings = this.plugin.settings;
		if (controlKey === key.opacity && typeof value === 'number') settings.opacity = value;
		else if (controlKey === key.symbolSize && typeof value === 'number') settings.symbolSize = value;
		else if (controlKey === key.tintChildren && typeof value === 'boolean') settings.tintChildren = value;
		else return;
		this.plugin.settingsChanged();
	}

	style(path: string): FolderStyle | undefined {
		return this.plugin.settings.folders[path];
	}

	hasMissingIcon(path: string): boolean {
		return this.plugin.missingIcons.has(path);
	}

	folderExists(path: string): boolean {
		return this.app.vault.getFolderByPath(path) !== null;
	}

	opacity(): number {
		return this.plugin.settings.opacity;
	}

	removeFolder(path: string): void {
		const { [path]: _removed, ...folders } = this.plugin.settings.folders;
		this.plugin.foldersChanged(folders);
	}
}
