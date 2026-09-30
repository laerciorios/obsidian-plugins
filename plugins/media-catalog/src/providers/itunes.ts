import { appLanguage } from '@obsidian-plugins/i18n';
import type { Edition, Provider, SearchResult, Track } from '../types';
import { baseTitle, foldName, sameArtist, titleMatch } from './albums';
import type { AlbumOptions } from './albums';
import { HttpError } from './errors';
import { isRecord, num, records, str, yearOf } from './guards';
import { getJson } from './http';
import { PromiseCache } from './memo';
import { RequestLimiter } from './rate-limit';
import { cleanQuery, finalize, imageUrl } from './results';
import { itunesEdition, parseItunesTracks } from './tracklists';

/**
 * Albums from the iTunes Search API (no key). Also the cover fallback for
 * MusicBrainz albums the Cover Art Archive has no front cover for.
 *
 * Apple documents about 20 calls per minute: one limiter is shared by both
 * uses. The store is the region of the Obsidian language when it has one
 * ("pt-BR" → BR, whose catalog has more Brazilian albums, e.g. "Clube da
 * Esquina 2"); otherwise Apple's default (US). `lang` only knows en_us and
 * ja_jp, so it is not sent.
 *
 * Tracklists come from a lookup of the collection with its songs, in the same
 * store as the search (a BR-only album has no songs in the US store). The
 * lookup takes no lane: a newer search or lookup never drops it.
 */

const SEARCH_URL = 'https://itunes.apple.com/search';
const LOOKUP_URL = 'https://itunes.apple.com/lookup';
/** Without it a lookup stops at 50 tracks (a super deluxe edition has 107); 200 is the API's maximum. */
const LOOKUP_LIMIT = 200;
const LOOKUP_CACHE = { max: 20, ttlMs: 10 * 60_000 };
/** iTunes collection ids are numbers. */
const COLLECTION_ID = /^\d+$/;
/** More than MAX_RESULTS: singles, repeated editions and (maybe) EPs are dropped. */
const PAGE_SIZE = 25;
const ITUNES_LIMIT = { max: 20, windowMs: 60_000 };
const COVER_SIZE = '600x600bb';
const THUMB_SIZE = '200x200bb';
/** ".../100x100bb.jpg": the image server renders any size asked for in the last segment. */
const ARTWORK_SIZE = /\/\d+x\d+bb\.(?:jpe?g|png)$/i;
/** iTunes names EPs and singles "<title> - EP" and "<title> - Single". */
const TYPE_SUFFIX = /\s*-\s+(EP|Single)$/;

export interface ItunesClient {
	/** Raw JSON of an album search. A request waiting for its turn is replaced by a newer one of the same lane. */
	searchAlbums(term: string, lane: 'search' | 'artwork'): Promise<unknown>;
	/** Raw JSON of a collection lookup with its songs (and music videos), in the store of the searches. */
	lookupSongs(collectionId: string): Promise<unknown>;
}

/** Store country: the region of a language tag ("pt-BR" → "BR"), undefined without one. */
export function storeCountry(language: string = appLanguage()): string | undefined {
	return /^[a-z]{2,3}[-_]([a-z]{2})$/i.exec(language)?.[1]?.toUpperCase();
}

export function itunesSearchUrl(term: string, country?: string): string {
	const params = new URLSearchParams({ term, media: 'music', entity: 'album', limit: String(PAGE_SIZE) });
	if (country) params.set('country', country);
	return `${SEARCH_URL}?${params.toString()}`;
}

/** Lookup of a collection and its tracks. */
export function itunesLookupUrl(collectionId: string, country?: string): string {
	const params = new URLSearchParams({ id: collectionId, entity: 'song', limit: String(LOOKUP_LIMIT) });
	if (country) params.set('country', country);
	return `${LOOKUP_URL}?${params.toString()}`;
}

/** Apple answers 403 (sometimes 429) when the limit is exceeded: no key is involved, so it is a rate limit. */
function rateLimited(error: unknown): unknown {
	return error instanceof HttpError && (error.status === 403 || error.status === 429) ? new HttpError(error.host, 429) : error;
}

export function createItunesClient(country: () => string | undefined = () => storeCountry()): ItunesClient {
	const limiter = new RequestLimiter(ITUNES_LIMIT);
	// The editions and the tracks of a collection share one lookup.
	const lookups = new PromiseCache<unknown>(LOOKUP_CACHE);
	return {
		async searchAlbums(term, lane) {
			try {
				return await limiter.schedule(() => getJson(itunesSearchUrl(term, country())), lane);
			} catch (error) {
				throw rateLimited(error);
			}
		},
		lookupSongs(collectionId) {
			const url = itunesLookupUrl(collectionId, country());
			return lookups.get(url, async () => {
				try {
					return await limiter.schedule(() => getJson(url));
				} catch (error) {
					throw rateLimited(error);
				}
			});
		},
	};
}

interface ItunesAlbum {
	id: number;
	title: string;
	type: 'album' | 'ep' | 'single';
	artist: string;
	year: number | undefined;
	trackCount: number | undefined;
	artwork: string | undefined;
	pageUrl: string | undefined;
}

function readAlbum(item: Record<string, unknown>): ItunesAlbum | null {
	const id = num(item.collectionId);
	const name = str(item.collectionName);
	const artist = str(item.artistName);
	if (id === undefined || !Number.isInteger(id) || !name || !artist) return null;
	const suffix = TYPE_SUFFIX.exec(name);
	const title = suffix ? name.slice(0, suffix.index).trim() : name;
	if (!title) return null;
	const tracks = num(item.trackCount);
	return {
		id,
		title,
		type: suffix?.[1] === 'EP' ? 'ep' : suffix?.[1] === 'Single' ? 'single' : 'album',
		artist,
		year: yearOf(item.releaseDate),
		trackCount: tracks !== undefined && tracks > 0 ? tracks : undefined,
		artwork: str(item.artworkUrl100),
		pageUrl: str(item.collectionViewUrl),
	};
}

function artwork(url: string | undefined, size: string): string | undefined {
	if (url === undefined || !ARTWORK_SIZE.test(url)) return undefined;
	return imageUrl(url.replace(ARTWORK_SIZE, `/${size}.jpg`));
}

/** The album page without tracking parameters ("?uo=4"). */
function pageUrl(raw: string | undefined): string | undefined {
	if (raw === undefined) return undefined;
	try {
		const url = new URL(raw);
		if (url.protocol !== 'https:') return undefined;
		url.search = '';
		url.hash = '';
		return url.toString();
	} catch {
		return undefined;
	}
}

function albums(json: unknown): ItunesAlbum[] {
	return records(isRecord(json) ? json.results : undefined)
		.map(readAlbum)
		.filter((album): album is ItunesAlbum => album !== null);
}

export function parseItunes(json: unknown, includeEps: boolean): SearchResult[] {
	const results: SearchResult[] = [];
	// Clean and explicit versions of an album are two collections with the same name.
	const seen = new Set<string>();
	for (const album of albums(json)) {
		if (album.type === 'single' || (album.type === 'ep' && !includeEps)) continue;
		const key = `${foldName(album.title)}|${foldName(album.artist)}|${album.year ?? ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		results.push({
			provider: 'itunes',
			externalId: String(album.id),
			kind: 'album',
			title: album.title,
			year: album.year,
			subtitle: album.artist,
			coverUrl: artwork(album.artwork, COVER_SIZE),
			thumbUrl: artwork(album.artwork, THUMB_SIZE),
			sourceUrl: pageUrl(album.pageUrl),
			details: { authors: [album.artist], albumType: album.type, trackCount: album.trackCount },
		});
	}
	return finalize(results);
}

export interface WantedAlbum {
	title: string;
	artist: string;
	year?: number;
}

export interface Artwork {
	coverUrl: string;
	thumbUrl: string;
}

/**
 * Artwork of the iTunes album that is `wanted`: same artist and title (edition
 * notes ignored), the closest year first. A self-titled album whose year is
 * more than one off is refused: the artist has others with the same title.
 */
export function findArtwork(json: unknown, wanted: WantedAlbum): Artwork | null {
	const selfTitled = foldName(baseTitle(wanted.title)) === foldName(wanted.artist);
	let best: { artwork: Artwork; title: number; gap: number } | null = null;
	for (const album of albums(json)) {
		if (album.type === 'single' || !sameArtist(album.artist, wanted.artist)) continue;
		const title = titleMatch(album.title, wanted.title);
		const coverUrl = artwork(album.artwork, COVER_SIZE);
		const thumbUrl = artwork(album.artwork, THUMB_SIZE);
		if (title === 0 || !coverUrl || !thumbUrl) continue;
		const gap = wanted.year !== undefined && album.year !== undefined ? Math.abs(album.year - wanted.year) : Infinity;
		if (selfTitled && wanted.year !== undefined && gap > 1) continue;
		if (!best || gap < best.gap || (gap === best.gap && title > best.title)) best = { artwork: { coverUrl, thumbUrl }, title, gap };
	}
	return best?.artwork ?? null;
}

export function createItunes(client: ItunesClient, options: () => AlbumOptions): Provider {
	return {
		id: 'itunes',
		name: 'iTunes',
		kinds: ['album'],
		async search(query: string): Promise<SearchResult[]> {
			const cleaned = cleanQuery(query);
			if (cleaned === null) return [];
			return parseItunes(await client.searchAlbums(cleaned, 'search'), options().includeEps);
		},
		/** The collection itself, from the lookup its tracks come from (one request for both). */
		async editions(result: SearchResult): Promise<Edition[]> {
			if (result.provider !== 'itunes' || !COLLECTION_ID.test(result.externalId)) return [];
			return [itunesEdition(await client.lookupSongs(result.externalId), result)];
		},
		async tracks(result: SearchResult, edition?: Edition): Promise<Track[]> {
			const id = edition?.id ?? result.externalId;
			if (result.provider !== 'itunes' || !COLLECTION_ID.test(id)) return [];
			return parseItunesTracks(await client.lookupSongs(id), id);
		},
	};
}
