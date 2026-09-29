import { MAX_RESULTS } from '../constants';
import type { Provider, SearchResult } from '../types';
import { MissingCredentialsError } from './errors';
import { isRecord, num, records, str, strings, yearOf } from './guards';
import { getJson } from './http';
import { cleanQuery, credentialRefused, finalize, imageUrl, joinNames, uniqueNames } from './results';

/**
 * Books from Google Books: editions (Brazilian ones included), page count and
 * cover. Needs an API key: keyless calls get "429, quota 0".
 */

const NAME = 'Google Books';
/** Width of the cover written to the note (the API thumbnail is 128 px wide). */
const COVER_WIDTH = 'w500';

/** "intitle:a intitle:b": every word must be in the title ("intitle:" applies to one term only). Punctuation is dropped. */
export function titleTerms(query: string): string {
	return query
		.split(/[^\p{L}\p{N}'-]+/u)
		.filter((word) => word.length > 0)
		.map((word) => `intitle:${word}`)
		.join(' ');
}

export function volumesUrl(terms: string, key: string): string {
	return (
		`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(terms)}` +
		`&maxResults=${MAX_RESULTS}&printType=books&key=${encodeURIComponent(key)}`
	);
}

/**
 * The API gives "http://books.google.com/books/content?id=…&zoom=1&edge=curl…":
 * force https, drop the page-curl effect, keep zoom=1 (other zooms may be
 * missing for a volume). `width` asks the image server for a bigger copy.
 */
export function cleanCover(raw: string | undefined, width?: string): string | undefined {
	if (raw === undefined) return undefined;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return undefined;
	}
	url.protocol = 'https:';
	url.searchParams.delete('edge');
	url.searchParams.set('zoom', '1');
	if (width !== undefined) url.searchParams.set('fife', width);
	return imageUrl(url.toString());
}

function pickIsbn(identifiers: unknown): string | undefined {
	const list = records(identifiers);
	const find = (type: string) => str(list.find((item) => item.type === type)?.identifier);
	return find('ISBN_13') ?? find('ISBN_10');
}

export function parseGoogleBooks(json: unknown): SearchResult[] {
	if (!isRecord(json)) return [];
	const results: SearchResult[] = [];
	for (const item of records(json.items)) {
		const id = str(item.id);
		const info = isRecord(item.volumeInfo) ? item.volumeInfo : null;
		const title = info ? str(info.title) : undefined;
		if (!id || !info || !title) continue;
		const authors = uniqueNames(strings(info.authors));
		const pages = num(info.pageCount);
		const links = isRecord(info.imageLinks) ? info.imageLinks : {};
		const thumbnail = str(links.thumbnail) ?? str(links.smallThumbnail);
		// The note keeps the edition title; the subtitle only goes to the result line.
		const meta = [str(info.subtitle), joinNames(authors)].filter((part) => part !== undefined);
		results.push({
			provider: 'google-books',
			externalId: id,
			kind: 'book',
			title,
			year: yearOf(info.publishedDate),
			subtitle: meta.length > 0 ? meta.join(' · ') : undefined,
			coverUrl: cleanCover(thumbnail, COVER_WIDTH),
			thumbUrl: cleanCover(thumbnail),
			sourceUrl: `https://books.google.com/books?id=${encodeURIComponent(id)}`,
			details: {
				authors,
				pages: pages !== undefined && pages > 0 ? pages : undefined,
				isbn: pickIsbn(info.industryIdentifiers),
			},
		});
	}
	return finalize(results);
}

export function createGoogleBooks(apiKey: () => string | null): Provider {
	return {
		id: 'google-books',
		name: NAME,
		kinds: ['book'],
		async search(query: string): Promise<SearchResult[]> {
			const terms = titleTerms(cleanQuery(query) ?? '');
			if (terms === '') return [];
			const key = apiKey()?.trim();
			if (!key) throw new MissingCredentialsError(NAME);
			try {
				return parseGoogleBooks(await getJson(volumesUrl(terms, key)));
			} catch (error) {
				throw credentialRefused(error);
			}
		},
	};
}
