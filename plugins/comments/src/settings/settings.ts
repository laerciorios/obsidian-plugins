import { normalizePath } from 'obsidian';
import { DEFAULT_FOLDER } from '../constants';
import { t } from '../i18n';
import type { CommentsSettings } from '../types';

/** Written on first use. The author is translated here, once: it is data in the comments files. */
export function defaultSettings(): CommentsSettings {
	return {
		version: 1,
		folder: DEFAULT_FOLDER,
		author: t('defaults.author'),
		highlight: true,
		statusBar: true,
		onlyOpen: true,
	};
}

/** "/Attachments/Comments/" → "Attachments/Comments"; empty when nothing usable is left. */
export function cleanFolder(value: string): string {
	const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
	return trimmed ? normalizePath(trimmed) : '';
}

export function cleanAuthor(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `loadData()` returned settings written by this plugin. */
export function isOwnData(raw: unknown): boolean {
	return isRecord(raw) && raw.version === 1;
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): CommentsSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const folder = typeof raw.folder === 'string' ? cleanFolder(raw.folder) : '';
	const author = typeof raw.author === 'string' ? cleanAuthor(raw.author) : '';
	const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
	return {
		version: 1,
		folder: folder || defaults.folder,
		author: author || defaults.author,
		highlight: flag(raw.highlight, defaults.highlight),
		statusBar: flag(raw.statusBar, defaults.statusBar),
		onlyOpen: flag(raw.onlyOpen, defaults.onlyOpen),
	};
}
