import type { App } from 'obsidian';
import { frontmatterOf, textOf } from '../catalog/catalog-note';
import { slugify } from '../catalog/slug';
import { ALBUM_SOURCES, BOOK_SOURCES, MIN_QUERY_LENGTH } from '../constants';
import { providersFor } from '../providers';
import type { CatalogContext, CatalogNoteInfo, CatalogSettings, MediaKind, Provider, ProviderId, SearchResult } from '../types';
import { noteOf } from './steps';
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
	const note = noteOf(options);
	const kind = note ? note.kind : context.settings.lastKind;
	return {
		kind,
		providerId: defaultProvider(context, kind, options)?.id ?? null,
		// Cover and tracks modes search the note as soon as the modal opens.
		query: note ? coverQuery(context.app, note) : '',
		phase: 'idle',
		searched: null,
		results: [],
		selected: -1,
		error: null,
	};
}

/**
 * What cover and tracks modes search: the note title; albums add the artist, since
 * albums of different artists often share a title. A self-titled album
 * searches its title once.
 */
export function coverQuery(app: App, note: CatalogNoteInfo): string {
	if (note.kind !== 'album') return note.title;
	const artist = textOf(frontmatterOf(app, note.file)?.author);
	return artist && slugify(artist) !== slugify(note.title) ? `${note.title} ${artist}` : note.title;
}

/** Source a kind starts on: books and albums remember the one picked last (settings); others have one. */
export function preferredSource(settings: CatalogSettings, kind: MediaKind): ProviderId | null {
	if (kind === 'book') return settings.bookSource;
	if (kind === 'album') return settings.albumSource;
	return null;
}

/** Remembers the source picked for books or albums. False when nothing changed (another kind, the same source). */
export function rememberSource(settings: CatalogSettings, kind: MediaKind, id: ProviderId): boolean {
	if (kind === 'book') {
		const source = BOOK_SOURCES.find((candidate) => candidate === id);
		if (!source || source === settings.bookSource) return false;
		settings.bookSource = source;
		return true;
	}
	if (kind === 'album') {
		const source = ALBUM_SOURCES.find((candidate) => candidate === id);
		if (!source || source === settings.albumSource) return false;
		settings.albumSource = source;
		return true;
	}
	return false;
}

/** Sources the search offers for a kind. Tracks mode: only the ones that list tracks. */
export function sourcesFor(context: CatalogContext, kind: MediaKind, options?: CatalogModalOptions): Provider[] {
	const providers = providersFor(context.providers, kind);
	return options?.mode === 'tracks' ? providers.filter((provider) => typeof provider.tracks === 'function') : providers;
}

export function defaultProvider(context: CatalogContext, kind: MediaKind, options?: CatalogModalOptions): Provider | undefined {
	const providers = sourcesFor(context, kind, options);
	const preferred = preferredSource(context.settings, kind);
	return providers.find((provider) => provider.id === preferred) ?? providers[0];
}

/** How one query is searched and which result is highlighted first. */
export interface SearchPlan {
	/** Text sent to the provider. */
	text: string;
	/** Year to highlight: the note's (cover and tracks modes) or the one typed at the end of the query. */
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
	const note = noteOf(options);
	if (note) {
		// A series note holds the season's year; the results carry the show's first year.
		const year = note.kind === 'series' && (note.season ?? 1) > 1 ? null : note.year;
		return { text: query, year, fullTitle: null, coversFirst: options.mode === 'cover' };
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
