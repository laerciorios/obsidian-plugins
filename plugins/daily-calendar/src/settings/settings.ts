import { normalizePath } from 'obsidian';
import { SOURCES } from '../types';
import type { DailyCalendarSettings, WeekStart } from '../types';

/** Defaults are vault conventions (folders, tags, property keys), so data: nothing is translated here. */
export function defaultSettings(): DailyCalendarSettings {
	return {
		version: 1,
		weekStart: 'monday',
		highlightWeekends: true,
		confirmCreate: true,
		sources: { daily: true, projects: true, meetings: true, cards: true, catalog: true },
		projectsProperty: 'projects',
		meetingsFolder: '_Meetings',
		cardTag: 'card',
		cardProperty: 'completed',
		catalogFolder: '1 - Knowledge/Entertainment/DB',
		catalogProperty: 'finished',
	};
}

/** A property key: anything but empty. */
export function isProperty(value: string): boolean {
	return value.trim().length > 0;
}

/** A folder name (one segment): not empty, no "/". */
export function isFolderName(value: string): boolean {
	const text = value.trim();
	return text.length > 0 && !text.includes('/');
}

/** "#card" → "card"; "" when it cannot be a tag (empty or with spaces). */
export function cleanTag(value: string): string {
	const tag = value.trim().replace(/^#+/, '');
	return /\s/.test(tag) ? '' : tag;
}

/** "/1 - Knowledge/DB/" → "1 - Knowledge/DB"; the vault root is "". */
export function cleanFolder(value: string): string {
	const path = normalizePath(value.trim());
	return path === '/' ? '' : path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flag(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function valid(value: unknown, check: (text: string) => boolean, fallback: string): string {
	return typeof value === 'string' && check(value) ? value.trim() : fallback;
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): DailyCalendarSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const weekStart: WeekStart = raw.weekStart === 'sunday' ? 'sunday' : 'monday';
	const savedSources = isRecord(raw.sources) ? raw.sources : {};
	const sources = { ...defaults.sources };
	for (const source of SOURCES) sources[source] = flag(savedSources[source], defaults.sources[source]);
	const tag = typeof raw.cardTag === 'string' ? cleanTag(raw.cardTag) : '';
	const folder = typeof raw.catalogFolder === 'string' ? cleanFolder(raw.catalogFolder) : '';
	return {
		version: 1,
		weekStart,
		highlightWeekends: flag(raw.highlightWeekends, defaults.highlightWeekends),
		confirmCreate: flag(raw.confirmCreate, defaults.confirmCreate),
		sources,
		projectsProperty: valid(raw.projectsProperty, isProperty, defaults.projectsProperty),
		meetingsFolder: valid(raw.meetingsFolder, isFolderName, defaults.meetingsFolder),
		cardTag: tag || defaults.cardTag,
		cardProperty: valid(raw.cardProperty, isProperty, defaults.cardProperty),
		catalogFolder: folder || defaults.catalogFolder,
		catalogProperty: valid(raw.catalogProperty, isProperty, defaults.catalogProperty),
	};
}
