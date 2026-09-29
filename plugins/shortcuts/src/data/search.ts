import { prepareFuzzySearch } from 'obsidian';
import type { SearchField, Suggestion } from '../types';
import { normalizeText, splitWords } from './text';

interface Match {
	/** 3: text starts with the query. 2: query words are word prefixes, in order. 1: fuzzy. */
	tier: number;
	score: number;
}

type Fuzzy = ReturnType<typeof prepareFuzzySearch>;

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

function wordsInOrder(queryWords: string[], words: string[]): boolean {
	let index = 0;
	for (const queryWord of queryWords) {
		while (index < words.length && !words[index]?.startsWith(queryWord)) index++;
		if (index >= words.length) return false;
		index++;
	}
	return true;
}

function matchField(field: SearchField, query: string, queryWords: string[], fuzzy: Fuzzy | null): Match | null {
	if (field.text.startsWith(query)) return { tier: 3, score: -field.text.length };
	if (queryWords.length > 0 && wordsInOrder(queryWords, field.words)) return { tier: 2, score: -field.text.length };
	const result = fuzzy?.(field.text);
	return result ? { tier: 1, score: result.score } : null;
}

function better(a: Match, b: Match | null): boolean {
	return !b || a.tier > b.tier || (a.tier === b.tier && a.score > b.score);
}

function compareDefault(a: Suggestion, b: Suggestion): number {
	return a.order - b.order || collator.compare(a.title, b.title);
}

/**
 * Rank suggestions for a query. Fuzzy matching only applies to one-word
 * queries: with several words ("@dalia e depois") each word must start a word
 * of the title, so ordinary prose closes the popover instead of keeping it open.
 */
export function rankSuggestions(items: readonly Suggestion[], rawQuery: string, limit: number): Suggestion[] {
	const query = normalizeText(rawQuery);
	if (!query) return [...items].sort(compareDefault).slice(0, limit);

	const queryWords = splitWords(query);
	const fuzzy = queryWords.length <= 1 ? prepareFuzzySearch(query) : null;
	const ranked: { item: Suggestion; match: Match }[] = [];

	for (const item of items) {
		let best: Match | null = null;
		for (const field of item.haystack) {
			const match = matchField(field, query, queryWords, fuzzy);
			if (match && better(match, best)) best = match;
		}
		if (best) ranked.push({ item, match: best });
	}

	ranked.sort((a, b) => b.match.tier - a.match.tier || b.match.score - a.match.score || compareDefault(a.item, b.item));
	return ranked.slice(0, limit).map((entry) => entry.item);
}
