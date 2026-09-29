import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { ColoredTextSettings, PaletteColor } from '../types';
import { key, settingDefinitions } from './definitions';
import type { DefinitionContext } from './definitions';
import { newColor } from './settings';

export interface SettingsHost extends Plugin {
	settings: ColoredTextSettings;
	/** A setting outside the palette changed: save. */
	settingsChanged(): void;
	/** The palette changed: save, then redraw notes and rebuild the per-color commands. */
	paletteChanged(): void;
}

/** Declarative settings (Obsidian 1.13+): the color list gets add, reorder and delete from the app. */
export class ColoredTextSettingTab extends PluginSettingTab implements DefinitionContext {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'palette';
	}

	get settings(): ColoredTextSettings {
		return this.plugin.settings;
	}

	colors(): readonly PaletteColor[] {
		return this.plugin.settings.colors;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return settingDefinitions(this);
	}

	getControlValue(controlKey: string): unknown {
		return controlKey === key.editorMenu ? this.plugin.settings.editorMenu : undefined;
	}

	setControlValue(controlKey: string, value: unknown): void {
		if (controlKey !== key.editorMenu) return;
		this.plugin.settings.editorMenu = value === true;
		this.plugin.settingsChanged();
	}

	addColor(): void {
		const colors = this.plugin.settings.colors;
		colors.push(newColor(colors));
		this.structureChanged();
	}

	moveColor(from: number, to: number): void {
		const colors = this.plugin.settings.colors;
		const [moved] = colors.splice(from, 1);
		if (moved) colors.splice(to, 0, moved);
		this.structureChanged();
	}

	removeColor(index: number): void {
		this.plugin.settings.colors.splice(index, 1);
		this.structureChanged();
	}

	colorEdited(): void {
		this.plugin.paletteChanged();
	}

	private structureChanged(): void {
		this.plugin.paletteChanged();
		this.update();
	}
}
