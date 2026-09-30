import { normalizePath } from 'obsidian';
import type { DailyWorkLogSettings, WeekStart } from '../types';

/** Defaults are vault conventions (property keys, folder names), so data: nothing is translated here. */
export function defaultSettings(): DailyWorkLogSettings {
	return {
		version: 1,
		property: 'projects',
		activeStatuses: ['active'],
		aliasKey: 'slug',
		ignoreFolders: ['_Templates'],
		openDaily: true,
		suggestions: true,
		meetingsFolder: '_Meetings',
		weekStart: 'monday',
	};
}

/** "a, b\nc" → ["a", "b", "c"], without duplicates. */
export function splitList(value: string): string[] {
	const items = value
		.split(/[,\n]/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
	return [...new Set(items)];
}

export function cleanFolder(folder: string): string {
	const path = normalizePath(folder.trim());
	return path === '/' ? '' : path;
}

export function parseFolders(value: string): string[] {
	return [...new Set(splitList(value).map(cleanFolder).filter((folder) => folder.length > 0))];
}

/** A property key or folder name: not empty, no "/" (a folder name is one segment). */
export function isName(value: string): boolean {
	const text = value.trim();
	return text.length > 0 && !text.includes('/');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return fallback;
	return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): DailyWorkLogSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const text = (value: unknown, fallback: string): string =>
		typeof value === 'string' && isName(value) ? value.trim() : fallback;
	const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
	const weekStart: WeekStart = raw.weekStart === 'sunday' ? 'sunday' : 'monday';
	return {
		version: 1,
		property: text(raw.property, defaults.property),
		activeStatuses: stringList(raw.activeStatuses, defaults.activeStatuses),
		// An empty alias key is valid: links then use the project name.
		aliasKey: typeof raw.aliasKey === 'string' ? raw.aliasKey.trim() : defaults.aliasKey,
		ignoreFolders: stringList(raw.ignoreFolders, defaults.ignoreFolders).map(cleanFolder),
		openDaily: flag(raw.openDaily, defaults.openDaily),
		suggestions: flag(raw.suggestions, defaults.suggestions),
		meetingsFolder: text(raw.meetingsFolder, defaults.meetingsFolder),
		weekStart,
	};
}
