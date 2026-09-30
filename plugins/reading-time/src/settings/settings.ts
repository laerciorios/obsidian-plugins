import { DEFAULT_PROPERTY, DEFAULT_SKIP_LANGUAGES, MAX_WPM, MIN_WPM } from '../constants';
import { PRESET_FORMATS } from '../format/duration';
import { t } from '../i18n';
import type { CodeMode, FormatId, PropertyMode, ReadingTimeSettings } from '../types';

const FORMATS: readonly FormatId[] = [...PRESET_FORMATS, 'custom'];
const CODE_MODES: readonly CodeMode[] = ['ignore', 'text', 'speed'];
const PROPERTY_MODES: readonly PropertyMode[] = ['off', 'existing', 'all'];

/**
 * Written on first use. The suffix and the template are translated here, once:
 * they are the user's text from then on, and switching the app language keeps them.
 */
export function defaultSettings(): ReadingTimeSettings {
	return {
		version: 1,
		wordsPerMinute: 200,
		format: 'simple',
		suffix: t('defaults.suffix'),
		template: t('defaults.template'),
		hideEmpty: false,
		selection: true,
		code: { mode: 'ignore', wordsPerMinute: 100, skipLanguages: [...DEFAULT_SKIP_LANGUAGES] },
		property: { mode: 'off', name: DEFAULT_PROPERTY, excludeFolders: [] },
	};
}

export function isValidSpeed(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= MIN_WPM && value <= MAX_WPM;
}

/** "Mermaid, base ,query" → ["mermaid", "base", "query"]. */
export function parseLanguages(value: string): string[] {
	const languages = value
		.split(/[,\s]+/)
		.map((language) => language.trim().toLowerCase())
		.filter(Boolean);
	return [...new Set(languages)];
}

/** One folder per line, without leading or trailing slashes. */
export function parseFolders(value: string): string[] {
	const folders = value
		.split('\n')
		.map((folder) => folder.trim().replace(/^\/+|\/+$/g, ''))
		.filter(Boolean);
	return [...new Set(folders)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
	return options.includes(value as T) ? (value as T) : fallback;
}

function strings(value: unknown): string[] | null {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;
}

/** Whether `loadData()` returned settings written by this plugin. */
export function isOwnData(raw: unknown): boolean {
	return isRecord(raw) && raw.version === 1;
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): ReadingTimeSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const code = isRecord(raw.code) ? raw.code : {};
	const property = isRecord(raw.property) ? raw.property : {};
	const name = typeof property.name === 'string' ? property.name.trim() : '';
	return {
		version: 1,
		wordsPerMinute: isValidSpeed(raw.wordsPerMinute) ? raw.wordsPerMinute : defaults.wordsPerMinute,
		format: oneOf(raw.format, FORMATS, defaults.format),
		suffix: typeof raw.suffix === 'string' ? raw.suffix : defaults.suffix,
		template: typeof raw.template === 'string' ? raw.template : defaults.template,
		hideEmpty: typeof raw.hideEmpty === 'boolean' ? raw.hideEmpty : defaults.hideEmpty,
		selection: typeof raw.selection === 'boolean' ? raw.selection : defaults.selection,
		code: {
			mode: oneOf(code.mode, CODE_MODES, defaults.code.mode),
			wordsPerMinute: isValidSpeed(code.wordsPerMinute) ? code.wordsPerMinute : defaults.code.wordsPerMinute,
			skipLanguages: parseLanguages((strings(code.skipLanguages) ?? defaults.code.skipLanguages).join(',')),
		},
		property: {
			mode: oneOf(property.mode, PROPERTY_MODES, defaults.property.mode),
			name: name || defaults.property.name,
			excludeFolders: parseFolders((strings(property.excludeFolders) ?? []).join('\n')),
		},
	};
}
