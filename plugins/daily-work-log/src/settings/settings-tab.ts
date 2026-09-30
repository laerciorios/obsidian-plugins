import type { DailyNotesSettings } from '@obsidian-plugins/core-plugins';
import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, Setting, SettingDefinition, SettingDefinitionItem } from 'obsidian';
import { t } from '../i18n';
import type { DailyWorkLogSettings } from '../types';
import { isName, parseFolders, splitList } from './settings';

export interface SettingsHost extends Plugin {
	settings: DailyWorkLogSettings;
	/** A setting changed: save it and redraw what depends on it. */
	settingsChanged(): void;
	/** The Daily notes settings, read again from disk. */
	readDailySettings(): Promise<DailyNotesSettings>;
}

const key = {
	property: 'property',
	openDaily: 'openDaily',
	activeStatuses: 'activeStatuses',
	aliasKey: 'aliasKey',
	ignoreFolders: 'ignoreFolders',
	suggestions: 'suggestions',
	meetingsFolder: 'meetingsFolder',
	weekStart: 'weekStart',
} as const;

function nameError(value: string): string | void {
	if (!isName(value)) return t('validation.name');
}

function dailySourceText(daily: DailyNotesSettings): string {
	return t('settings.dailySource.desc', {
		folder: daily.folder || '/',
		format: daily.format,
		template: daily.template || t('settings.dailySource.noTemplate'),
	});
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class DailyWorkLogSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'calendar-check';
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.plugin.settings;
		return [
			{
				type: 'group',
				heading: t('settings.daily.heading'),
				items: [
					this.dailySourceRow(),
					{
						name: t('settings.property.name'),
						desc: t('settings.property.desc'),
						control: { type: 'text', key: key.property, placeholder: 'projects', validate: nameError },
					},
					{
						name: t('settings.openDaily.name'),
						desc: t('settings.openDaily.desc'),
						control: { type: 'toggle', key: key.openDaily },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.projects.heading'),
				items: [
					{
						name: t('settings.activeStatuses.name'),
						desc: t('settings.activeStatuses.desc'),
						control: { type: 'text', key: key.activeStatuses, placeholder: 'active' },
					},
					{
						name: t('settings.aliasKey.name'),
						desc: t('settings.aliasKey.desc'),
						control: { type: 'text', key: key.aliasKey, placeholder: 'slug' },
					},
					{
						name: t('settings.ignoreFolders.name'),
						desc: t('settings.ignoreFolders.desc'),
						control: { type: 'textarea', key: key.ignoreFolders, placeholder: '_Templates', rows: 3 },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.suggestions.heading'),
				items: [
					{
						name: t('settings.suggestions.name'),
						desc: t('settings.suggestions.desc'),
						control: { type: 'toggle', key: key.suggestions },
					},
					{
						name: t('settings.meetingsFolder.name'),
						desc: t('settings.meetingsFolder.desc'),
						visible: () => settings.suggestions,
						control: { type: 'text', key: key.meetingsFolder, placeholder: '_Meetings', validate: nameError },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.summary.heading'),
				items: [
					{
						name: t('settings.weekStart.name'),
						desc: t('settings.weekStart.desc'),
						control: {
							type: 'dropdown',
							key: key.weekStart,
							options: { monday: t('settings.weekStart.monday'), sunday: t('settings.weekStart.sunday') },
						},
					},
				],
			},
		];
	}

	/** Where the daily notes live, read when the row is shown (the definitions are built once). */
	private dailySourceRow(): SettingDefinition {
		return {
			name: t('settings.dailySource.name'),
			searchable: false,
			render: (setting: Setting) => {
				let shown = true;
				void this.plugin.readDailySettings().then((daily) => {
					if (shown) setting.setDesc(dailySourceText(daily));
				});
				return () => {
					shown = false;
				};
			},
		};
	}

	getControlValue(controlKey: string): unknown {
		const settings = this.plugin.settings;
		switch (controlKey) {
			case key.property:
				return settings.property;
			case key.openDaily:
				return settings.openDaily;
			case key.activeStatuses:
				return settings.activeStatuses.join(', ');
			case key.aliasKey:
				return settings.aliasKey;
			case key.ignoreFolders:
				return settings.ignoreFolders.join('\n');
			case key.suggestions:
				return settings.suggestions;
			case key.meetingsFolder:
				return settings.meetingsFolder;
			case key.weekStart:
				return settings.weekStart;
			default:
				return undefined;
		}
	}

	/** Invalid values are ignored (the control shows the validation message). */
	setControlValue(controlKey: string, value: unknown): void {
		const settings = this.plugin.settings;
		const text = typeof value === 'string' ? value : '';
		switch (controlKey) {
			case key.property:
				if (!isName(text)) return;
				settings.property = text.trim();
				break;
			case key.openDaily:
				settings.openDaily = value === true;
				break;
			case key.activeStatuses:
				settings.activeStatuses = splitList(text);
				break;
			case key.aliasKey:
				settings.aliasKey = text.trim();
				break;
			case key.ignoreFolders:
				settings.ignoreFolders = parseFolders(text);
				break;
			case key.suggestions:
				settings.suggestions = value === true;
				break;
			case key.meetingsFolder:
				if (!isName(text)) return;
				settings.meetingsFolder = text.trim();
				break;
			case key.weekStart:
				settings.weekStart = value === 'sunday' ? 'sunday' : 'monday';
				break;
			default:
				return;
		}
		this.plugin.settingsChanged();
		// The meetings folder is only visible while suggestions are on.
		this.refreshDomState();
	}
}
