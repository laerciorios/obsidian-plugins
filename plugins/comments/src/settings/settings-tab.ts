import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import { ICON } from '../constants';
import { t } from '../i18n';
import type { CommentsSettings } from '../types';
import { cleanAuthor, cleanFolder } from './settings';

export interface SettingsHost extends Plugin {
	settings: CommentsSettings;
	/** A setting changed: save and apply. */
	settingsChanged(): void;
}

/** Control keys of the declarative settings tab. */
const key = {
	folder: 'folder',
	author: 'author',
	highlight: 'highlight',
	statusBar: 'statusBar',
} as const;

function folderError(value: string): string | void {
	if (!cleanFolder(value)) return t('validation.folder');
}

function authorError(value: string): string | void {
	if (!cleanAuthor(value)) return t('validation.author');
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class CommentsSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = ICON;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: t('settings.storage.heading'),
				items: [
					{
						name: t('settings.folder.name'),
						desc: t('settings.folder.desc'),
						control: { type: 'folder', key: key.folder, validate: folderError },
					},
					{
						name: t('settings.author.name'),
						desc: t('settings.author.desc'),
						control: { type: 'text', key: key.author, validate: authorError },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.display.heading'),
				items: [
					{
						name: t('settings.highlight.name'),
						desc: t('settings.highlight.desc'),
						control: { type: 'toggle', key: key.highlight },
					},
					{
						name: t('settings.statusBar.name'),
						desc: t('settings.statusBar.desc'),
						control: { type: 'toggle', key: key.statusBar },
					},
				],
			},
		];
	}

	getControlValue(controlKey: string): unknown {
		const { settings } = this.plugin;
		switch (controlKey) {
			case key.folder:
				return settings.folder;
			case key.author:
				return settings.author;
			case key.highlight:
				return settings.highlight;
			case key.statusBar:
				return settings.statusBar;
			default:
				return undefined;
		}
	}

	/** Invalid values never get here: `validate` rejects them first. */
	setControlValue(controlKey: string, value: unknown): void {
		const { settings } = this.plugin;
		const text = typeof value === 'string' ? value : '';
		switch (controlKey) {
			case key.folder:
				if (cleanFolder(text)) settings.folder = cleanFolder(text);
				break;
			case key.author:
				if (cleanAuthor(text)) settings.author = cleanAuthor(text);
				break;
			case key.highlight:
				settings.highlight = value === true;
				break;
			case key.statusBar:
				settings.statusBar = value === true;
				break;
			default:
				return;
		}
		this.plugin.settingsChanged();
	}
}
