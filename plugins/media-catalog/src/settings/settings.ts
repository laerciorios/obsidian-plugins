import { normalizePath } from 'obsidian';
import { ALBUM_SOURCES, ALIAS_COUNTRY_CODES, BOOK_SOURCES, CATALOG_STATUSES, DEFAULT_BACKLOG_FOLDER, DEFAULT_FOLDER, KINDS } from '../constants';
import type { AliasCountry } from '../constants';
import { isRecord } from '../providers/guards';
import type { CatalogSettings } from '../types';

/**
 * Starting point written on first use. Only conventions (a folder name),
 * never note names; every field is editable in the settings tab except
 * `lastKind`, which the modal keeps. Secret fields hold secret ids.
 */
export function defaultSettings(): CatalogSettings {
	return {
		version: 1,
		folder: DEFAULT_FOLDER,
		backlogFolder: DEFAULT_BACKLOG_FOLDER,
		templateFile: '',
		addSourceLink: true,
		defaultStatus: 'in-progress',
		downloadCovers: false,
		bookSource: 'open-library',
		albumSource: 'musicbrainz',
		albumIncludeEps: true,
		albumIncludeSecondary: false,
		albumItunesFallback: true,
		albumTracklist: true,
		albumTracksProperty: false,
		aliasCountry: '',
		lastKind: 'movie',
		igdbClientId: '',
		igdbClientSecret: '',
		googleBooksApiKey: '',
	};
}

export function text(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value.trim() : fallback;
}

export function flag(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

export function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
	return options.find((option) => option === value) ?? fallback;
}

/** Country of the alternative title: one of ALIAS_COUNTRIES, or "" (none). Lowercase codes are accepted. */
export function aliasCountry(value: unknown, fallback: AliasCountry | ''): AliasCountry | '' {
	if (value === '') return '';
	const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
	return ALIAS_COUNTRY_CODES.find((country) => country === code) ?? fallback;
}

/** A vault path setting: trimmed and normalized; "" stays "" (the template: "use the default"). */
export function vaultPath(value: unknown, fallback: string): string {
	const path = text(value, fallback);
	return path ? normalizePath(path) : '';
}

/**
 * The catalog folder: like vaultPath, but empty means DEFAULT_FOLDER (what the
 * placeholder of the settings field shows), never the vault root. "/" is the root.
 */
export function catalogFolder(value: unknown, fallback: string): string {
	return vaultPath(value, fallback) || DEFAULT_FOLDER;
}

/** The backlog folder: like catalogFolder, empty means DEFAULT_BACKLOG_FOLDER. */
export function backlogFolder(value: unknown, fallback: string): string {
	return vaultPath(value, fallback) || DEFAULT_BACKLOG_FOLDER;
}

/** Accept anything `loadData()` returns: invalid or missing fields get their defaults. */
export function normalizeSettings(raw: unknown): CatalogSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	return {
		version: 1,
		folder: catalogFolder(raw.folder, defaults.folder),
		backlogFolder: backlogFolder(raw.backlogFolder, defaults.backlogFolder),
		templateFile: vaultPath(raw.templateFile, defaults.templateFile),
		addSourceLink: flag(raw.addSourceLink, defaults.addSourceLink),
		// Before the backlog folder, "backlog" was a status of the form: it becomes the default again.
		defaultStatus: oneOf(raw.defaultStatus, CATALOG_STATUSES, defaults.defaultStatus),
		downloadCovers: flag(raw.downloadCovers, defaults.downloadCovers),
		bookSource: oneOf(raw.bookSource, BOOK_SOURCES, defaults.bookSource),
		albumSource: oneOf(raw.albumSource, ALBUM_SOURCES, defaults.albumSource),
		albumIncludeEps: flag(raw.albumIncludeEps, defaults.albumIncludeEps),
		albumIncludeSecondary: flag(raw.albumIncludeSecondary, defaults.albumIncludeSecondary),
		albumItunesFallback: flag(raw.albumItunesFallback, defaults.albumItunesFallback),
		albumTracklist: flag(raw.albumTracklist, defaults.albumTracklist),
		albumTracksProperty: flag(raw.albumTracksProperty, defaults.albumTracksProperty),
		aliasCountry: aliasCountry(raw.aliasCountry, defaults.aliasCountry),
		lastKind: oneOf(raw.lastKind, KINDS, defaults.lastKind),
		igdbClientId: text(raw.igdbClientId, defaults.igdbClientId),
		igdbClientSecret: text(raw.igdbClientSecret, defaults.igdbClientSecret),
		googleBooksApiKey: text(raw.googleBooksApiKey, defaults.googleBooksApiKey),
	};
}
