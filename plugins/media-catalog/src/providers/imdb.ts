import type { Provider, SearchResult } from '../types';
import { isRecord, num, records, str } from './guards';
import { getJson } from './http';
import { cleanQuery, finalize, imageUrl } from './results';

/**
 * Movies from IMDb's public suggestion endpoint (the one behind imdb.com's
 * search box; no key). It answers at most 8 items, mixing titles, people and
 * franchises.
 */

const SUGGESTION_URL = 'https://v3.sg.media-imdb.com/suggestion';

/** `qid` values kept for the movie kind (others: tvSeries, tvMiniSeries, video, tvShort, videoGame…). */
const MOVIE_TYPES: ReadonlySet<string> = new Set(['movie', 'tvMovie', 'short']);
/** Title ids ("tt0133093"); people ("nm…") and franchises ("in…") are dropped. */
const TITLE_ID = /^tt\d+$/;

/** Size suffixes of Amazon image URLs: SX500 is what the catalog notes use. */
const COVER_SUFFIX = '._V1_SX500.jpg';
const THUMB_SUFFIX = '._V1_UX120_.jpg';
const SIZE_SUFFIX = /\._V1_[^/]*\.(?:jpe?g|png)$/i;

/**
 * The directory is historically the first letter of the query; the server
 * ignores it today, but a non-ASCII directory answers 404, so accents are
 * folded and anything else falls back to "x" (what imdb.com uses).
 * The query itself only needs encodeURIComponent (spaces, accents, "/", "?"…).
 */
export function suggestionUrl(query: string): string {
	const folded = query.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	const directory = /[a-z0-9]/.exec(folded)?.[0] ?? 'x';
	return `${SUGGESTION_URL}/${directory}/${encodeURIComponent(query)}.json`;
}

function sized(url: string | undefined, suffix: string): string | undefined {
	if (url === undefined || !SIZE_SUFFIX.test(url)) return imageUrl(url);
	return imageUrl(url.replace(SIZE_SUFFIX, suffix));
}

export function parseImdb(json: unknown): SearchResult[] {
	if (!isRecord(json)) return [];
	const results: SearchResult[] = [];
	for (const item of records(json.d)) {
		const id = str(item.id);
		const title = str(item.l);
		const type = str(item.qid);
		if (!id || !TITLE_ID.test(id) || !title || !type || !MOVIE_TYPES.has(type)) continue;
		const image = isRecord(item.i) ? str(item.i.imageUrl) : undefined;
		results.push({
			provider: 'imdb',
			externalId: id,
			kind: 'movie',
			title,
			year: num(item.y),
			subtitle: str(item.s),
			coverUrl: sized(image, COVER_SUFFIX),
			thumbUrl: sized(image, THUMB_SUFFIX),
			sourceUrl: `https://www.imdb.com/title/${id}/`,
		});
	}
	return finalize(results);
}

export function createImdb(): Provider {
	return {
		id: 'imdb',
		name: 'IMDb',
		kinds: ['movie'],
		async search(query: string): Promise<SearchResult[]> {
			const cleaned = cleanQuery(query);
			if (cleaned === null) return [];
			return parseImdb(await getJson(suggestionUrl(cleaned)));
		},
	};
}
