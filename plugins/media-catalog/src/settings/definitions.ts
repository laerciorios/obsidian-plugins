import type { App, SettingDefinitionItem, TFile } from 'obsidian';
import { DEFAULT_FOLDER, DEFAULT_TEMPLATE_NAME, STATUSES } from '../constants';
import { t } from '../i18n';
import type { AlbumSource, BookSource, CatalogSettings, Status } from '../types';
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
	return Object.fromEntries(STATUSES.map((status: Status) => [status, t(`status.${status}`)]));
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
