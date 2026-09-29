import type { SearchField } from '../types';

/** Lowercase, accents removed, trimmed: "Tomás Hortelã" → "tomas hortela". */
export function normalizeText(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Words of an already normalized string, split on anything that is not a letter or digit. */
export function splitWords(text: string): string[] {
	return text.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0);
}

export function searchField(text: string): SearchField {
	const normalized = normalizeText(text);
	return { text: normalized, words: splitWords(normalized) };
}

/** "a, b\nc" → ["a", "b", "c"]. */
export function splitList(value: string): string[] {
	return value
		.split(/[,\n]/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/** Frontmatter value as strings: scalars become one item, lists are flattened. */
export function toStrings(value: unknown): string[] {
	if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
	if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
	if (Array.isArray(value)) return value.flatMap((item) => toStrings(item));
	return [];
}

export function unique(values: string[]): string[] {
	return [...new Set(values)];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
