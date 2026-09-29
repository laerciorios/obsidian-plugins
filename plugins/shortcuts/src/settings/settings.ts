import { DEFAULT_TRIGGER, FALLBACK_ICON, MAX_TRIGGER_LENGTH } from '../constants';
import { isRecord, toStrings } from '../data/text';
import type { DateKeywords, DatesConfig, LinkTarget, NotesMatch, NotesSourceConfig, ShortcutsSettings } from '../types';

/**
 * Starting point written on first use. Only conventions (folder names and
 * frontmatter keys), never note names: everything here is editable in the
 * settings tab.
 */
export function defaultSettings(): ShortcutsSettings {
	return {
		version: 1,
		trigger: DEFAULT_TRIGGER,
		dates: {
			enabled: true,
			keywords: { today: ['today', 'hoje'], yesterday: ['yesterday', 'ontem'], tomorrow: ['tomorrow', 'amanha'] },
			format: '',
		},
		sources: [
			{
				id: 'people',
				kind: 'notes',
				enabled: true,
				name: 'Pessoas',
				icon: 'user',
				match: { folder: '_People', property: '', value: '', tag: '' },
				exclude: ['_Templates'],
				label: 'name',
				searchIn: ['aliases'],
				linkTarget: 'basename',
				linkAlias: 'name',
			},
			{
				id: 'projects',
				kind: 'notes',
				enabled: true,
				name: 'Projetos',
				icon: 'briefcase',
				match: { folder: '', property: 'type', value: 'project', tag: '' },
				exclude: ['_Templates'],
				label: 'title',
				searchIn: ['aliases', 'slug'],
				linkTarget: 'path',
				linkAlias: 'slug',
			},
		],
	};
}

export function newSourceId(taken: Iterable<string>): string {
	const used = new Set(taken);
	let id = `source-${Date.now().toString(36)}`;
	for (let n = 2; used.has(id); n++) id = `source-${Date.now().toString(36)}-${n}`;
	return id;
}

/** A new source with no criteria (it matches every note until configured). */
export function createNotesSource(id: string): NotesSourceConfig {
	return {
		id,
		kind: 'notes',
		enabled: true,
		name: 'Nova fonte',
		icon: FALLBACK_ICON,
		match: { folder: '', property: '', value: '', tag: '' },
		exclude: [],
		label: '',
		searchIn: ['aliases'],
		linkTarget: 'basename',
		linkAlias: '',
	};
}

export function triggerError(value: string): string | null {
	if (!value) return 'Informe pelo menos um caractere.';
	if (/\s/.test(value)) return 'O gatilho não pode ter espaços.';
	if (value.length > MAX_TRIGGER_LENGTH) return `Use no máximo ${MAX_TRIGGER_LENGTH} caracteres.`;
	return null;
}

function text(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function list(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) ? toStrings(value) : [...fallback];
}

function normalizeDates(raw: unknown, fallback: DatesConfig): DatesConfig {
	const data = isRecord(raw) ? raw : {};
	const keywords = isRecord(data.keywords) ? data.keywords : {};
	const normalized: DateKeywords = {
		today: list(keywords.today, fallback.keywords.today),
		yesterday: list(keywords.yesterday, fallback.keywords.yesterday),
		tomorrow: list(keywords.tomorrow, fallback.keywords.tomorrow),
	};
	return {
		enabled: flag(data.enabled, fallback.enabled),
		keywords: normalized,
		format: text(data.format, fallback.format),
	};
}

function normalizeSource(raw: unknown): NotesSourceConfig | null {
	if (!isRecord(raw) || raw.kind !== 'notes') return null;
	const base = createNotesSource(text(raw.id, ''));
	const match = isRecord(raw.match) ? raw.match : {};
	const linkTarget: LinkTarget = raw.linkTarget === 'path' ? 'path' : 'basename';
	const normalizedMatch: NotesMatch = {
		folder: text(match.folder, ''),
		property: text(match.property, ''),
		value: text(match.value, ''),
		tag: text(match.tag, ''),
	};
	return {
		...base,
		enabled: flag(raw.enabled, base.enabled),
		name: text(raw.name, base.name),
		icon: text(raw.icon, base.icon),
		match: normalizedMatch,
		exclude: list(raw.exclude, base.exclude),
		label: text(raw.label, base.label),
		searchIn: list(raw.searchIn, base.searchIn),
		linkTarget,
		linkAlias: text(raw.linkAlias, base.linkAlias),
	};
}

/** Accept anything `loadData()` returns: missing fields get defaults, unknown source kinds are dropped. */
export function normalizeSettings(raw: unknown): ShortcutsSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;

	const trigger = typeof raw.trigger === 'string' && !triggerError(raw.trigger) ? raw.trigger : defaults.trigger;
	const sources = Array.isArray(raw.sources)
		? raw.sources.map(normalizeSource).filter((source): source is NotesSourceConfig => source !== null)
		: defaults.sources;

	const seen = new Set<string>();
	for (const source of sources) {
		if (!source.id || seen.has(source.id)) source.id = newSourceId(seen);
		seen.add(source.id);
	}

	return { version: 1, trigger, dates: normalizeDates(raw.dates, defaults.dates), sources };
}
