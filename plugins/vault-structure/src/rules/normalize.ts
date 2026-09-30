import { MAX_INDEX_DEPTH } from '../constants';
import { cleanPath } from '../vault/paths';
import type { VaultRules } from '../types';
import { defaultRules } from './defaults';

/** Property names in the rules note. Data (matched in frontmatter): never translated. */
export const RULE_KEYS = {
	indexRoots: 'index_roots',
	indexDepth: 'index_depth',
	indexTemplate: 'index_template',
	scaffold: 'scaffold',
	vocabulary: 'vocabulary',
	minorWords: 'minor_words',
	aiTag: 'ai_tag',
	aiFolder: 'ai_folder',
	ignore: 'ignore',
} as const satisfies Record<keyof VaultRules, string>;

type Frontmatter = Record<string, unknown>;

function isRecord(value: unknown): value is Frontmatter {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A list property: missing → the default; cleared in the properties panel
 * (null) → empty; a single value → a list of one.
 */
function list(value: unknown, fallback: string[], clean: (item: string) => string): string[] {
	if (value === undefined) return fallback;
	const items = value === null ? [] : Array.isArray(value) ? value : [value];
	const cleaned = items
		.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
		.map((item) => clean(String(item)))
		.filter(Boolean);
	return [...new Set(cleaned)];
}

/** A text property: missing → the default; cleared (null) → empty. */
function text(value: unknown, fallback: string): string {
	if (value === undefined) return fallback;
	if (value === null) return '';
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : fallback;
}

function depth(value: unknown, fallback: number): number {
	const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	return typeof number === 'number' && Number.isInteger(number) && number >= 0 && number <= MAX_INDEX_DEPTH
		? number
		: fallback;
}

/** "#ai-generated" → "ai-generated". */
function cleanTag(value: string): string {
	return value.trim().replace(/^#+/, '');
}

/** Folder paths: no slashes at the ends, no hidden folders (not part of the vault). */
function folder(value: string): string {
	const path = cleanPath(value);
	return path.split('/').some((part) => part.startsWith('.')) ? '' : path;
}

/** Rules from the frontmatter of the rules note: any missing or invalid key gets its default. */
export function normalizeRules(frontmatter: unknown): VaultRules {
	const defaults = defaultRules();
	if (!isRecord(frontmatter)) return defaults;
	const value = (key: keyof VaultRules): unknown => frontmatter[RULE_KEYS[key]];
	return {
		indexRoots: list(value('indexRoots'), defaults.indexRoots, folder),
		indexDepth: depth(value('indexDepth'), defaults.indexDepth),
		indexTemplate: cleanPath(text(value('indexTemplate'), defaults.indexTemplate)),
		scaffold: list(value('scaffold'), defaults.scaffold, folder),
		vocabulary: list(value('vocabulary'), defaults.vocabulary, (item) => item.trim()),
		minorWords: list(value('minorWords'), defaults.minorWords, (item) => item.trim().toLowerCase()),
		aiTag: cleanTag(text(value('aiTag'), defaults.aiTag)),
		aiFolder: folder(text(value('aiFolder'), defaults.aiFolder)),
		ignore: list(value('ignore'), defaults.ignore, cleanPath),
	};
}

/** The frontmatter that stores these rules, keys in the order of the note. */
export function rulesToFrontmatter(rules: VaultRules): Frontmatter {
	const frontmatter: Frontmatter = {};
	for (const key of Object.keys(RULE_KEYS) as (keyof VaultRules)[]) {
		const current = rules[key];
		frontmatter[RULE_KEYS[key]] = Array.isArray(current) ? [...current] : current;
	}
	return frontmatter;
}
