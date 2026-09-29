import { MAX_RESULTS } from '../constants';
import type { Provider, SearchResult } from '../types';
import { isRecord, num, records, str, strings } from './guards';
import { getJson } from './http';
import { cleanQuery, finalize, imageUrl, joinNames, uniqueNames } from './results';

/**
 * Books from Open Library (no key). One result per work: the year is the
 * first publication, the cover comes from `cover_i`.
 *
 * `q=` rather than `title=`: it also matches alternative titles of the
 * editions ("1984" finds "Nineteen Eighty-Four", "o pequeno príncipe" finds
 * "Le petit prince"), at the cost of some author/subject matches further down.
 * `lang` changes nothing in the results, so it is not sent.
 */

const FIELDS = 'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median';
const WORK_KEY = /^\/works\/OL\d+W$/;

export function searchUrl(query: string): string {
	return `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${FIELDS}&limit=${MAX_RESULTS}`;
}

/** Covers answer with a redirect to archive.org; <img> and requestUrl follow it. */
function coverUrl(coverId: number | undefined, size: 'L' | 'M'): string | undefined {
	if (coverId === undefined || !Number.isInteger(coverId) || coverId <= 0) return undefined;
	return imageUrl(`https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`);
}

/** The list mixes all editions: prefer an ISBN-13. */
function pickIsbn(isbns: string[]): string | undefined {
	return isbns.find((isbn) => /^97[89]\d{10}$/.test(isbn)) ?? isbns[0];
}

export function parseOpenLibrary(json: unknown): SearchResult[] {
	if (!isRecord(json)) return [];
	const results: SearchResult[] = [];
	for (const doc of records(json.docs)) {
		const key = str(doc.key);
		const title = str(doc.title);
		if (!key || !WORK_KEY.test(key) || !title) continue;
		const authors = uniqueNames(strings(doc.author_name));
		const pages = num(doc.number_of_pages_median);
		const coverId = num(doc.cover_i);
		results.push({
			provider: 'open-library',
			externalId: key,
			kind: 'book',
			title,
			year: num(doc.first_publish_year),
			subtitle: joinNames(authors),
			coverUrl: coverUrl(coverId, 'L'),
			thumbUrl: coverUrl(coverId, 'M'),
			sourceUrl: `https://openlibrary.org${key}`,
			details: {
				authors,
				pages: pages !== undefined && pages > 0 ? Math.round(pages) : undefined,
				isbn: pickIsbn(strings(doc.isbn)),
			},
		});
	}
	return finalize(results);
}

export function createOpenLibrary(): Provider {
	return {
		id: 'open-library',
		name: 'Open Library',
		kinds: ['book'],
		async search(query: string): Promise<SearchResult[]> {
			const cleaned = cleanQuery(query);
			if (cleaned === null) return [];
			return parseOpenLibrary(await getJson(searchUrl(cleaned)));
		},
	};
}
