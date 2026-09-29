import { splitList } from '../data/text';
import type { DateKeywords, NotesSourceConfig, ShortcutsSettings } from '../types';

/**
 * Control keys of the declarative settings tab, mapped onto the nested
 * settings object: "trigger", "dates.<field>" and "source.<id>.<field>".
 */
export const key = {
	trigger: 'trigger',
	dates: (field: 'enabled' | 'format' | keyof DateKeywords) => `dates.${field}`,
	source: (id: string, field: SourceField) => `source.${id}.${field}`,
};

export type SourceField =
	| 'enabled'
	| 'name'
	| 'icon'
	| 'folder'
	| 'property'
	| 'value'
	| 'tag'
	| 'exclude'
	| 'label'
	| 'searchIn'
	| 'linkTarget'
	| 'linkAlias';

const DAYS = new Set<string>(['today', 'yesterday', 'tomorrow']);

export interface ParsedSourceKey {
	source: NotesSourceConfig;
	field: SourceField;
}

export function parseSourceKey(settings: ShortcutsSettings, controlKey: string): ParsedSourceKey | null {
	if (!controlKey.startsWith('source.')) return null;
	const rest = controlKey.slice('source.'.length);
	const dot = rest.lastIndexOf('.');
	if (dot < 0) return null;
	const source = settings.sources.find((candidate) => candidate.id === rest.slice(0, dot));
	return source ? { source, field: rest.slice(dot + 1) as SourceField } : null;
}

function readSource(source: NotesSourceConfig, field: SourceField): unknown {
	switch (field) {
		case 'folder':
		case 'property':
		case 'value':
		case 'tag':
			return source.match[field];
		case 'exclude':
			return source.exclude.join('\n');
		case 'searchIn':
			return source.searchIn.join(', ');
		default:
			return source[field];
	}
}

function writeSource(source: NotesSourceConfig, field: SourceField, value: unknown): void {
	const str = typeof value === 'string' ? value : '';
	switch (field) {
		case 'enabled':
			source.enabled = value === true;
			return;
		case 'folder':
		case 'property':
		case 'value':
		case 'tag':
			source.match[field] = str.trim();
			return;
		case 'exclude':
		case 'searchIn':
			source[field] = splitList(str);
			return;
		case 'linkTarget':
			source.linkTarget = str === 'path' ? 'path' : 'basename';
			return;
		case 'name':
			source.name = str.trim();
			return;
		default:
			source[field] = str.trim();
	}
}

export function readSetting(settings: ShortcutsSettings, controlKey: string): unknown {
	if (controlKey === key.trigger) return settings.trigger;
	if (controlKey.startsWith('dates.')) {
		const field = controlKey.slice('dates.'.length);
		if (field === 'enabled') return settings.dates.enabled;
		if (field === 'format') return settings.dates.format;
		if (DAYS.has(field)) return settings.dates.keywords[field as keyof DateKeywords].join(', ');
		return undefined;
	}
	const parsed = parseSourceKey(settings, controlKey);
	return parsed ? readSource(parsed.source, parsed.field) : undefined;
}

export function writeSetting(settings: ShortcutsSettings, controlKey: string, value: unknown): void {
	const str = typeof value === 'string' ? value : '';
	if (controlKey === key.trigger) {
		settings.trigger = str;
		return;
	}
	if (controlKey.startsWith('dates.')) {
		const field = controlKey.slice('dates.'.length);
		if (field === 'enabled') settings.dates.enabled = value === true;
		else if (field === 'format') settings.dates.format = str.trim();
		else if (DAYS.has(field)) settings.dates.keywords[field as keyof DateKeywords] = splitList(str);
		return;
	}
	const parsed = parseSourceKey(settings, controlKey);
	if (parsed) writeSource(parsed.source, parsed.field, value);
}
