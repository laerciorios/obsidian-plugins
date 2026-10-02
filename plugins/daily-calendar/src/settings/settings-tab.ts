import type { DailyNotesSettings } from '@obsidian-plugins/core-plugins';
import { PluginSettingTab } from 'obsidian';
import type { App, Setting, SettingDefinition, SettingDefinitionItem } from 'obsidian';
import { ICON } from '../constants';
import type { CalendarHost } from '../host';
import { t } from '../i18n';
import type { DailyCalendarSettings, SourceId } from '../types';
import { cleanFolder, cleanTag, isFolderName, isProperty } from './settings';

/** Text settings: how a typed value is checked and stored. Invalid values are not saved. */
type TextKey = 'projectsProperty' | 'meetingsFolder' | 'cardTag' | 'cardProperty' | 'catalogFolder' | 'catalogProperty';

const TEXT: Record<TextKey, { clean: (value: string) => string; error: Parameters<typeof t>[0] }> = {
	projectsProperty: { clean: (value) => (isProperty(value) ? value.trim() : ''), error: 'validation.property' },
	meetingsFolder: { clean: (value) => (isFolderName(value) ? value.trim() : ''), error: 'validation.folderName' },
	cardTag: { clean: cleanTag, error: 'validation.tag' },
	cardProperty: { clean: (value) => (isProperty(value) ? value.trim() : ''), error: 'validation.property' },
	catalogFolder: { clean: cleanFolder, error: 'validation.folder' },
	catalogProperty: { clean: (value) => (isProperty(value) ? value.trim() : ''), error: 'validation.property' },
};

const SOURCE_KEY = 'sources.';

function isTextKey(key: string): key is TextKey {
	return key in TEXT;
}

function dailySourceText(daily: DailyNotesSettings): string {
	return t('settings.dailySource.desc', {
		folder: daily.folder || '/',
		format: daily.format,
		template: daily.template || t('settings.dailySource.noTemplate'),
	});
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class DailyCalendarSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: CalendarHost,
	) {
		super(app, plugin);
		this.icon = ICON;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.plugin.settings;
		const on = (source: SourceId) => () => settings.sources[source];
		const toggle = (source: SourceId): SettingDefinition => ({
			name: t(`settings.source.${source}.name`),
			desc: t(`settings.source.${source}.desc`),
			control: { type: 'toggle', key: `${SOURCE_KEY}${source}` },
		});
		const text = (key: TextKey, source: SourceId, placeholder: string): SettingDefinition => ({
			name: t(`settings.${key}.name`),
			desc: t(`settings.${key}.desc`),
			visible: on(source),
			control: {
				type: 'text',
				key,
				placeholder,
				validate: (value: string) => (TEXT[key].clean(value) ? undefined : t(TEXT[key].error)),
			},
		});
		return [
			{
				type: 'group',
				heading: t('settings.calendar.heading'),
				items: [
					this.dailySourceRow(),
					{
						name: t('settings.weekStart.name'),
						desc: t('settings.weekStart.desc'),
						control: {
							type: 'dropdown',
							key: 'weekStart',
							options: { monday: t('settings.weekStart.monday'), sunday: t('settings.weekStart.sunday') },
						},
					},
					{
						name: t('settings.highlightWeekends.name'),
						desc: t('settings.highlightWeekends.desc'),
						control: { type: 'toggle', key: 'highlightWeekends' },
					},
					{
						name: t('settings.confirmCreate.name'),
						desc: t('settings.confirmCreate.desc'),
						control: { type: 'toggle', key: 'confirmCreate' },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.daily.heading'),
				items: [toggle('daily'), toggle('projects'), text('projectsProperty', 'projects', 'projects')],
			},
			{
				type: 'group',
				heading: t('settings.meetings.heading'),
				items: [toggle('meetings'), text('meetingsFolder', 'meetings', '_Meetings')],
			},
			{
				type: 'group',
				heading: t('settings.cards.heading'),
				items: [toggle('cards'), text('cardTag', 'cards', 'card'), text('cardProperty', 'cards', 'completed')],
			},
			{
				type: 'group',
				heading: t('settings.catalog.heading'),
				items: [
					toggle('catalog'),
					{
						name: t('settings.catalogFolder.name'),
						desc: t('settings.catalogFolder.desc'),
						visible: on('catalog'),
						control: { type: 'folder', key: 'catalogFolder', placeholder: '1 - Knowledge/Entertainment/DB' },
					},
					text('catalogProperty', 'catalog', 'finished'),
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
				void this.plugin.daily.refresh().then(() => {
					if (shown) setting.setDesc(dailySourceText(this.plugin.daily.current()));
				});
				return () => {
					shown = false;
				};
			},
		};
	}

	getControlValue(controlKey: string): unknown {
		const settings = this.plugin.settings;
		if (controlKey.startsWith(SOURCE_KEY)) return settings.sources[controlKey.slice(SOURCE_KEY.length) as SourceId];
		if (isTextKey(controlKey)) return settings[controlKey];
		switch (controlKey) {
			case 'weekStart':
				return settings.weekStart;
			case 'highlightWeekends':
				return settings.highlightWeekends;
			case 'confirmCreate':
				return settings.confirmCreate;
			default:
				return undefined;
		}
	}

	/** Invalid values are ignored (the control shows the validation message). */
	setControlValue(controlKey: string, value: unknown): void {
		const settings: DailyCalendarSettings = this.plugin.settings;
		if (controlKey.startsWith(SOURCE_KEY)) {
			const source = controlKey.slice(SOURCE_KEY.length);
			if (!(source in settings.sources)) return;
			settings.sources[source as SourceId] = value === true;
		} else if (isTextKey(controlKey)) {
			const clean = TEXT[controlKey].clean(typeof value === 'string' ? value : '');
			if (!clean) return;
			settings[controlKey] = clean;
		} else if (controlKey === 'weekStart') {
			settings.weekStart = value === 'sunday' ? 'sunday' : 'monday';
		} else if (controlKey === 'highlightWeekends') {
			settings.highlightWeekends = value === true;
		} else if (controlKey === 'confirmCreate') {
			settings.confirmCreate = value === true;
		} else {
			return;
		}
		this.plugin.settingsChanged();
		// The fields of a source are only visible while it is on.
		this.refreshDomState();
	}
}
