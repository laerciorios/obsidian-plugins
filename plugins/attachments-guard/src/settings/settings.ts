import { normalizePath } from 'obsidian';
import {
	DEFAULT_AI_FOLDER,
	DEFAULT_AI_TAG,
	DEFAULT_COVER_PROPERTY,
	DEFAULT_FOLDER,
	DEFAULT_GENERIC_NAMES,
	DEFAULT_MAX_SIZE_MB,
	DEFAULT_PATTERN,
	MAX_SIZE_MB,
} from '../constants';
import { t } from '../i18n';
import { unknownVariables } from '../naming/pattern';
import type { AttachmentsGuardSettings } from '../types';

/** Every default is data (folder names, keys, file names), so nothing is translated here. */
export function defaultSettings(): AttachmentsGuardSettings {
	return {
		version: 1,
		organize: true,
		folder: DEFAULT_FOLDER,
		pattern: DEFAULT_PATTERN,
		genericNames: [...DEFAULT_GENERIC_NAMES],
		ignoredFolders: [],
		coverProperty: DEFAULT_COVER_PROPERTY,
		aiTag: DEFAULT_AI_TAG,
		aiFolder: DEFAULT_AI_FOLDER,
		maxSizeMb: DEFAULT_MAX_SIZE_MB,
	};
}

/** "/Attachments/" → "Attachments"; "" when nothing usable is left (the vault root is not a folder here). */
export function parseFolder(value: string): string {
	const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
	return trimmed ? normalizePath(trimmed) : '';
}

/** One folder per line. */
export function parseFolders(value: string): string[] {
	return [...new Set(value.split('\n').map(parseFolder).filter(Boolean))];
}

/** One name per line, as typed. */
export function parseLines(value: string): string[] {
	return [...new Set(value.split('\n').map((line) => line.trim()).filter(Boolean))];
}

export function parseTag(value: string): string {
	return value.trim().replace(/^#+/, '');
}

export function folderError(value: string, required: boolean): string | void {
	const folder = parseFolder(value);
	if (!folder) return required ? t('validation.folder.empty') : undefined;
	if (folder.split('/').some((part) => part.startsWith('.'))) return t('validation.folder.hidden');
}

export function patternError(value: string): string | void {
	const pattern = value.trim();
	if (!pattern) return t('validation.pattern.empty');
	if (pattern.includes('/')) return t('validation.pattern.slash');
	const unknown = unknownVariables(pattern);
	if (unknown.length > 0) return t('validation.pattern.unknown', { names: unknown.map((name) => `{${name}}`).join(', ') });
}

export function isValidSize(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_SIZE_MB;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] | null {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;
}

function text(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): AttachmentsGuardSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const folder = text(raw.folder, defaults.folder);
	const pattern = text(raw.pattern, defaults.pattern);
	const aiFolder = text(raw.aiFolder, defaults.aiFolder);
	return {
		version: 1,
		organize: typeof raw.organize === 'boolean' ? raw.organize : defaults.organize,
		folder: folderError(folder, true) ? defaults.folder : parseFolder(folder),
		pattern: patternError(pattern) ? defaults.pattern : pattern.trim(),
		genericNames: parseLines((strings(raw.genericNames) ?? defaults.genericNames).join('\n')),
		ignoredFolders: parseFolders((strings(raw.ignoredFolders) ?? []).join('\n')),
		coverProperty: text(raw.coverProperty, defaults.coverProperty).trim(),
		aiTag: parseTag(text(raw.aiTag, defaults.aiTag)),
		aiFolder: folderError(aiFolder, false) ? defaults.aiFolder : parseFolder(aiFolder),
		maxSizeMb: isValidSize(raw.maxSizeMb) ? raw.maxSizeMb : defaults.maxSizeMb,
	};
}
