import type { App, SettingDefinitionItem, TFile } from 'obsidian';
import { BACKLOG_TAG, CATALOG_STATUSES, CATALOG_TAG, DEFAULT_BACKLOG_FOLDER, HLTB_MEASURES, DEFAULT_FOLDER, DEFAULT_TEMPLATE_NAME, IMPRESSIONS_HEADING } from '../constants';
import { t } from '../i18n';
import type { AlbumSource, BookSource, CatalogSettings } from '../types';
import { countriesByName } from '../ui/countries';
import type { ControlKey } from './bindings';
import { secretRow } from './secrets';

/** Brand names, shown as they are in every language. */
const BOOK_SOURCE_NAMES: Record<BookSource, string> = {
	'open-library': 'Open Library',
	'google-books': 'Google Books',
};
const ALBUM_SOURCE_NAMES: Record<AlbumSource, string> = {
	musicbrainz: 'MusicBrainz',
	itunes: 'iTunes',
};

/** What the definitions need from the settings tab. */
export interface DefinitionContext {
	app: App;
	settings: CatalogSettings;
	/** A secret id changed (render rows write it themselves). */
	secretChanged(): void;
}

/** Labels are translated; the values stay the English data values written to notes. */
function statusOptions(): Record<string, string> {
	return Object.fromEntries(CATALOG_STATUSES.map((status) => [status, t(`status.${status}`)]));
}

/** The HowLongToBeat measures, then "Off". Labels translated; values are data. */
function measureOptions(): Record<string, string> {
	return Object.fromEntries(HLTB_MEASURES.map((measure) => [measure, t(`hltb.measure.${measure}`)]));
}

/** "None" first, then the countries by name in the UI language ("Brasil (BR)"); the value is the ISO code. */
function countryOptions(): Record<string, string> {
	return Object.fromEntries([['', t('settings.aliasCountry.none')], ...countriesByName()]);
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem<ControlKey>[] {
	const secret = { app: context.app, settings: () => context.settings, changed: () => context.secretChanged() };
	return [
		{
			type: 'group',
			heading: t('settings.notes.heading'),
			items: [
				{
					name: t('settings.folder.name'),
					desc: t('settings.folder.desc'),
					control: { type: 'folder', key: 'folder', placeholder: DEFAULT_FOLDER },
				},
				{
					name: t('settings.backlogFolder.name'),
					desc: t('settings.backlogFolder.desc'),
					control: { type: 'folder', key: 'backlogFolder', placeholder: DEFAULT_BACKLOG_FOLDER },
				},
				{
					name: t('settings.catalogTags.name'),
					desc: t('settings.catalogTags.desc'),
					control: { type: 'text', key: 'catalogTags', placeholder: CATALOG_TAG },
				},
				{
					name: t('settings.backlogTags.name'),
					desc: t('settings.backlogTags.desc'),
					control: { type: 'text', key: 'backlogTags', placeholder: BACKLOG_TAG },
				},
				{
					name: t('settings.templateFile.name'),
					desc: t('settings.templateFile.desc'),
					control: {
						type: 'file',
						key: 'templateFile',
						placeholder: DEFAULT_TEMPLATE_NAME,
						filter: (file: TFile) => file.extension === 'md',
					},
				},
				{
					name: t('settings.addSourceLink.name'),
					desc: t('settings.addSourceLink.desc'),
					control: { type: 'toggle', key: 'addSourceLink' },
				},
				{
					name: t('settings.defaultStatus.name'),
					desc: t('settings.defaultStatus.desc'),
					control: { type: 'dropdown', key: 'defaultStatus', options: statusOptions() },
				},
				{
					name: t('settings.aliasCountry.name'),
					desc: t('settings.aliasCountry.desc'),
					control: { type: 'dropdown', key: 'aliasCountry', options: countryOptions() },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.covers.heading'),
			items: [
				{
					name: t('settings.downloadCovers.name'),
					desc: t('settings.downloadCovers.desc'),
					control: { type: 'toggle', key: 'downloadCovers' },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.sources.heading'),
			items: [
				{
					name: t('settings.bookSource.name'),
					desc: t('settings.bookSource.desc'),
					control: { type: 'dropdown', key: 'bookSource', options: BOOK_SOURCE_NAMES },
				},
				{
					name: t('settings.albumSource.name'),
					desc: t('settings.albumSource.desc'),
					control: { type: 'dropdown', key: 'albumSource', options: ALBUM_SOURCE_NAMES },
				},
				{
					name: t('settings.hltbMeasure.name'),
					desc: t('settings.hltbMeasure.desc'),
					control: { type: 'dropdown', key: 'hltbMeasure', options: measureOptions() },
				},
				{
					name: t('settings.albumIncludeEps.name'),
					desc: t('settings.albumIncludeEps.desc'),
					control: { type: 'toggle', key: 'albumIncludeEps' },
				},
				{
					name: t('settings.albumIncludeSecondary.name'),
					desc: t('settings.albumIncludeSecondary.desc'),
					control: { type: 'toggle', key: 'albumIncludeSecondary' },
				},
				{
					name: t('settings.albumItunesFallback.name'),
					desc: t('settings.albumItunesFallback.desc'),
					control: { type: 'toggle', key: 'albumItunesFallback' },
				},
				{
					name: t('settings.albumTracklist.name'),
					desc: t('settings.albumTracklist.desc', { impressions: IMPRESSIONS_HEADING }),
					control: { type: 'toggle', key: 'albumTracklist' },
				},
				{
					name: t('settings.albumTracksProperty.name'),
					desc: t('settings.albumTracksProperty.desc'),
					control: { type: 'toggle', key: 'albumTracksProperty' },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.keys.heading'),
			items: [
				// Groups have no description: a row with only a description stands in.
				{
					name: '',
					searchable: false,
					render: (setting) => {
						setting.setDesc(t('settings.keys.desc'));
					},
				},
				secretRow({
					...secret,
					key: 'igdbClientId',
					name: t('settings.igdbClientId.name'),
					desc: t('settings.igdbClientId.desc'),
				}),
				secretRow({
					...secret,
					key: 'igdbClientSecret',
					name: t('settings.igdbClientSecret.name'),
					desc: t('settings.igdbClientSecret.desc'),
				}),
				secretRow({
					...secret,
					key: 'googleBooksApiKey',
					name: t('settings.googleBooksKey.name'),
					desc: t('settings.googleBooksKey.desc'),
				}),
			],
		},
	];
}
