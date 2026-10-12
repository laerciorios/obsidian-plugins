import type { MediaKind } from '../types';
import { numberOf, textOf } from './catalog-note';
import { noteTitle } from './series-title';

/**
 * `aliases` of catalog notes: the title first (series with the season,
 * "Horta Selvagem (S02)"), then the title released in the alias country when
 * it differs: `["Fern Road", "Estrada das Samambaias"]`.
 */

/** Key aliases are compared by: case and whitespace do not count ("Fern Road" = "fern  road" = "FernRoad"). */
export function aliasKey(alias: string): string {
	return alias.normalize('NFC').toLowerCase().replace(/\s+/g, '');
}

export function sameAlias(a: string, b: string): boolean {
	return aliasKey(a) === aliasKey(b);
}

/**
 * Second alias of a note: the localized title, with the season of the note
 * for series ("Horta Brava" + 2 → "Horta Brava (S02)"). Null when there is
 * none or it matches `title` (the note title, as written) once case and
 * whitespace are ignored.
 */
export function localizedAlias(kind: MediaKind, localized: string | null, season: number | null, title: string): string | null {
	const trimmed = localized?.trim() ?? '';
	if (!trimmed) return null;
	const alias = noteTitle(kind, trimmed, season);
	return alias && !sameAlias(alias, title) ? alias : null;
}

/** `aliases` of a new note: its title, then the localized title when it differs. */
export function noteAliases(kind: MediaKind, title: string, season: number | null, localized: string | null): string[] {
	const first = noteTitle(kind, title, season);
	const second = localizedAlias(kind, localized, season, first);
	return second ? [first, second] : [first];
}

/**
 * `aliases` after "Update aliases": `fresh` (title, localized title) first,
 * then every alias the note had, in its order. Only repeats are dropped
 * (compared like sameAlias, the first one stays), so aliases added by hand,
 * and the ones of an earlier country, are kept.
 */
export function mergeAliases(fresh: readonly string[], current: readonly string[]): string[] {
	const seen = new Set<string>();
	const merged: string[] = [];
	for (const alias of [...fresh, ...current]) {
		const trimmed = alias.trim();
		const key = aliasKey(trimmed);
		if (!trimmed || seen.has(key)) continue;
		seen.add(key);
		merged.push(trimmed);
	}
	return merged;
}

/**
 * What "Update aliases" writes into a note: its `title` first, then the
 * alternative title when it differs (series: with the note's `season`), then
 * every alias the note had (see mergeAliases).
 */
export function nextAliases(frontmatter: Record<string, unknown>, kind: MediaKind, localized: string | null): string[] {
	const title = textOf(frontmatter.title) ?? '';
	const season = kind === 'series' ? numberOf(frontmatter.season) : null;
	const second = localizedAlias(kind, localized, season, title);
	const fresh = [title, second].filter((alias): alias is string => !!alias);
	return mergeAliases(fresh, aliasesOf(frontmatter.aliases));
}

/** False when `aliases` already is exactly this list of texts (a single text or another order counts as a change). */
export function aliasesChanged(current: unknown, next: readonly string[]): boolean {
	return !(Array.isArray(current) && current.length === next.length && current.every((alias, index) => alias === next[index]));
}

/** `aliases` as a note holds it: a list (numbers read as text, anything else dropped) or a single text. */
export function aliasesOf(value: unknown): string[] {
	const items: unknown[] = Array.isArray(value) ? value : [value];
	return items
		.map((item) => (typeof item === 'number' && Number.isFinite(item) ? String(item) : item))
		.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
		.map((item) => item.trim());
}

/**
 * Sets `aliases` in a frontmatter object (inside processFrontMatter, which
 * writes the keys in object order): in place when the note has the key, else
 * right after `title` (first without a title), the other keys keeping their order.
 */
export function placeAliases(frontmatter: Record<string, unknown>, aliases: string[]): void {
	if (Object.prototype.hasOwnProperty.call(frontmatter, 'aliases')) {
		frontmatter.aliases = aliases;
		return;
	}
	const entries: [string, unknown][] = Object.entries(frontmatter);
	for (const [key] of entries) Reflect.deleteProperty(frontmatter, key);
	const at = entries.findIndex(([key]) => key === 'title') + 1;
	entries.splice(at, 0, ['aliases', aliases]);
	for (const [key, value] of entries) frontmatter[key] = value;
}
