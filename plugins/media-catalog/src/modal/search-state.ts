import { slugify } from '../catalog/slug';
import { MIN_QUERY_LENGTH } from '../constants';
import { providersFor } from '../providers';
import type { CatalogContext, MediaKind, Provider, ProviderId, SearchResult } from '../types';
import type { CatalogModalOptions } from './steps';

/** Kept by the modal, so going back shows the same query, results and selection. */
export interface SearchState {
	kind: MediaKind;
	providerId: ProviderId | null;
	query: string;
	phase: 'idle' | 'loading' | 'done' | 'error';
	/** What the results on screen (or in flight) answer. */
	searched: { kind: MediaKind; providerId: ProviderId; query: string } | null;
	results: SearchResult[];
	selected: number;
	error: unknown;
}

export function createSearchState(context: CatalogContext, options: CatalogModalOptions): SearchState {
	const kind = options.mode === 'cover' ? options.note.kind : context.settings.lastKind;
	return {
		kind,
		providerId: defaultProvider(context, kind)?.id ?? null,
		// Cover mode searches the note title as soon as the modal opens.
		query: options.mode === 'cover' ? options.note.title : '',
		phase: 'idle',
		searched: null,
		results: [],
		selected: -1,
		error: null,
	};
}

export function defaultProvider(context: CatalogContext, kind: MediaKind): Provider | undefined {
	const providers = providersFor(context.providers, kind);
	if (kind === 'book') return providers.find((provider) => provider.id === context.settings.bookSource) ?? providers[0];
	return providers[0];
}

/** How one query is searched and which result is highlighted first. */
export interface SearchPlan {
	/** Text sent to the provider. */
	text: string;
	/** Year to highlight: the note's (cover mode) or the one typed at the end of the query. */
	year: number | null;
	/** Year typed: the whole query, in case it is a title that ends in a number ("Fern Road 1984"). */
	fullTitle: string | null;
	/** Cover mode: results without a cover go last. */
	coversFirst: boolean;
}

/** Years read as a hint. Later numbers stay part of the title ("Moss City 2099"). */
const FIRST_YEAR = 1870;
const YEARS_AHEAD = 2;

/** `fern road 2021` or `fern road (2021)` → { text: 'fern road', year: 2021 }; null without a year at the end. */
export function yearHint(query: string): { text: string; year: number } | null {
	const match = /^(.+?)\s*\((\d{4})\)$/.exec(query) ?? /^(.+?)\s+(\d{4})$/.exec(query);
	if (!match) return null;
	const text = (match[1] ?? '').trim();
	const year = Number(match[2]);
	const latest = new Date().getFullYear() + YEARS_AHEAD;
	if (text.length < MIN_QUERY_LENGTH || year < FIRST_YEAR || year > latest) return null;
	return { text, year };
}

/** `query` is trimmed. */
export function searchPlan(options: CatalogModalOptions, query: string): SearchPlan {
	if (options.mode === 'cover') {
		const { note } = options;
		// A series note holds the season's year; the results carry the show's first year.
		const year = note.kind === 'series' && (note.season ?? 1) > 1 ? null : note.year;
		return { text: query, year, fullTitle: null, coversFirst: true };
	}
	const hint = yearHint(query);
	if (!hint) return { text: query, year: null, fullTitle: null, coversFirst: false };
	return { text: hint.text, year: hint.year, fullTitle: query, coversFirst: false };
}

/** Results in display order: in cover mode, the ones without a cover go last (order kept otherwise). */
export function orderResults(results: SearchResult[], plan: SearchPlan): SearchResult[] {
	if (!plan.coversFirst) return results;
	const withCover = results.filter((result) => result.coverUrl !== undefined);
	return withCover.length === results.length
		? results
		: [...withCover, ...results.filter((result) => result.coverUrl === undefined)];
}

/**
 * Result highlighted first (never picked): the one titled like the whole
 * query, else the first of the wanted year, else the first. -1 when empty.
 */
export function highlightIndex(results: readonly SearchResult[], plan: SearchPlan): number {
	if (results.length === 0) return -1;
	const full = plan.fullTitle === null ? null : slugify(plan.fullTitle);
	const titled = full === null ? -1 : results.findIndex((result) => slugify(result.title) === full);
	if (titled >= 0) return titled;
	const dated = plan.year === null ? -1 : results.findIndex((result) => result.year === plan.year);
	return Math.max(dated, 0);
}
