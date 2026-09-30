import { MUSICBRAINZ_INTERVAL_MS } from '../constants';
import type { Edition, Provider, SearchResult, Track } from '../types';
import { isMbid } from './albums';
import type { AlbumOptions } from './albums';
import { CAA_HOST, caaUrl, resolveCover } from './cover-art';
import { HttpError, SupersededError } from './errors';
import { isRecord, num, records, str, strings, yearOf } from './guards';
import { getJson, setHostHeaders } from './http';
import type { ItunesClient } from './itunes';
import { createMusicBrainzReleases, MUSICBRAINZ_HOST as HOST, MUSICBRAINZ_WS } from './musicbrainz-releases';
import { RequestLimiter } from './rate-limit';
import { cleanQuery, finalize } from './results';

/**
 * Albums from MusicBrainz (no key): one result per release group, so the year
 * is the original release (`first-release-date`), not a reissue. Covers come
 * from the Cover Art Archive (./cover-art). MusicBrainz requires a
 * User-Agent that names the application and a contact, and allows about one
 * request per second: every call goes through one limiter, where a newer
 * search replaces a search still waiting. It answers 503 when that limit (or
 * its global one) is hit: retried once, then reported as a rate limit (429).
 *
 * Editions and tracklists (./musicbrainz-releases) share the limiter but take
 * no lane: neither a new search nor another tracklist request drops them (an
 * answer the UI no longer wants is ignored there).
 */

const NAME = 'MusicBrainz';
const API = `${MUSICBRAINZ_WS}/release-group`;
/** More than MAX_RESULTS: the client-side filters and ordering pick from a larger page. */
const PAGE_SIZE = 25;
const BUSY_RETRIES = 1;

/** Secondary types shown only with `includeSecondary`: other takes of material released elsewhere. */
const OPTIONAL_SECONDARY = ['Compilation', 'Live', 'Remix', 'DJ-mix', 'Demo'];
/** Never albums to listen to. Soundtrack, Mixtape/Street, Spokenword and Field recording are always kept. */
const EXCLUDED_SECONDARY = ['Audiobook', 'Audio drama', 'Interview'];
/** Words beyond this do not get "title + artist" split clauses (the query grows with each word). */
const MAX_SPLIT_WORDS = 6;
/** Release counts that raise the score: the album everyone means has many editions, a tribute has one. */
const POPULAR_RELEASES = [2, 5, 10, 25];
/**
 * Weight of the number of releases in the final order (score + weight ×
 * log2(1 + releases)). The server boosts above bring popular albums into the
 * page; this lifts them over weak matches inside it ("radiohead": the band's
 * albums over a one-release EP titled like the band).
 */
const POPULARITY_WEIGHT = 8;

const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g;

function term(word: string): string {
	return word.replace(LUCENE_SPECIAL, '\\$&');
}

function phrase(text: string): string {
	return `"${text.replace(/["\\]/g, '\\$&')}"`;
}

/** `compilation OR "dj-mix" OR …`: one-word values bare, the others quoted. */
function typeList(types: readonly string[]): string {
	return types
		.map((type) => type.toLowerCase())
		.map((type) => (/^[a-z]+$/.test(type) ? type : phrase(type)))
		.join(' OR ');
}

function excludedTypes(options: AlbumOptions): string[] {
	return options.includeSecondary ? EXCLUDED_SECONDARY : [...OPTIONAL_SECONDARY, ...EXCLUDED_SECONDARY];
}

/**
 * Lucene query for release groups. The input may be a title, an artist or
 * both ("ok computer", "radiohead", "ok computer radiohead"): every word must
 * be in the title or in the artist credit; the whole input as a phrase in
 * either field ranks first, then a split of it into title and artist (either
 * order), then the albums with more releases. Types are filtered here and
 * again in parseMusicBrainz. Null when no word has a letter or digit.
 */
export function releaseGroupQuery(query: string, options: AlbumOptions): string | null {
	const words = query
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => /[\p{L}\p{N}]/u.test(word));
	if (words.length === 0) return null;
	const text = words.join(' ');
	const clauses = [
		`+(${words.map((word) => `+(releasegroup:${term(word)} OR artist:${term(word)})`).join(' ')})`,
		`releasegroup:${phrase(text)}^4`,
		`artist:${phrase(text)}^4`,
	];
	if (words.length <= MAX_SPLIT_WORDS) {
		for (let cut = 1; cut < words.length; cut++) {
			const head = phrase(words.slice(0, cut).join(' '));
			const tail = phrase(words.slice(cut).join(' '));
			clauses.push(`(releasegroup:${head} AND artist:${tail})`, `(artist:${head} AND releasegroup:${tail})`);
		}
	}
	for (const count of POPULAR_RELEASES) clauses.push(`releases:[${count} TO *]^4`);
	clauses.push(`+primarytype:(${typeList(options.includeEps ? ['Album', 'EP'] : ['Album'])})`);
	clauses.push(`-secondarytype:(${typeList(excludedTypes(options))})`);
	return clauses.join(' ');
}

export function searchUrl(lucene: string): string {
	return `${API}?query=${encodeURIComponent(lucene)}&fmt=json&limit=${PAGE_SIZE}`;
}

/** "Milton Nascimento & Lô Borges": credited names with their join phrases (kept with their spaces). */
function creditOf(value: unknown): string | undefined {
	const credit = records(value)
		.map((entry) => {
			const name = str(entry.name) ?? (isRecord(entry.artist) ? str(entry.artist.name) : undefined) ?? '';
			return name + (typeof entry.joinphrase === 'string' ? entry.joinphrase : '');
		})
		.join('')
		.trim();
	return credit.length > 0 ? credit : undefined;
}

interface Group {
	result: SearchResult;
	rank: number;
	releases: number;
}

function readGroup(item: Record<string, unknown>, options: AlbumOptions): Group | null {
	const id = str(item.id);
	const title = str(item.title);
	const primary = str(item['primary-type']);
	if (!id || !isMbid(id) || !title) return null;
	const albumType = primary === 'Album' ? 'album' : primary === 'EP' && options.includeEps ? 'ep' : null;
	if (albumType === null) return null;
	const excluded = new Set(excludedTypes(options).map((type) => type.toLowerCase()));
	if (strings(item['secondary-types']).some((type) => excluded.has(type.toLowerCase()))) return null;
	const credit = creditOf(item['artist-credit']);
	const releases = Math.max(0, num(item.count) ?? 0);
	return {
		rank: (num(item.score) ?? 0) + POPULARITY_WEIGHT * Math.log2(1 + releases),
		releases,
		result: {
			provider: 'musicbrainz',
			externalId: id,
			kind: 'album',
			title,
			year: yearOf(item['first-release-date']),
			subtitle: credit,
			coverUrl: caaUrl(id, 500),
			thumbUrl: caaUrl(id, 250),
			sourceUrl: `https://${HOST}/release-group/${id}`,
			details: { authors: credit ? [credit] : [], albumType },
		},
	};
}

/** Results filtered by type (defensively: the query already filters) and ordered by score and number of releases. */
export function parseMusicBrainz(json: unknown, options: AlbumOptions): SearchResult[] {
	if (!isRecord(json)) return [];
	const groups = records(json['release-groups'])
		.map((item) => readGroup(item, options))
		.filter((group): group is Group => group !== null);
	groups.sort((a, b) => b.rank - a.rank || b.releases - a.releases);
	return finalize(groups.map((group) => group.result));
}

export interface MusicBrainzDeps {
	/** Sent to musicbrainz.org and coverartarchive.org. */
	userAgent: string;
	albumOptions: () => AlbumOptions;
	/** Cover fallback. */
	itunes: ItunesClient;
}

function isBusy(error: unknown): error is HttpError {
	return error instanceof HttpError && error.host === HOST && error.status === 503;
}

/** The release group of a MusicBrainz result, or null for any other result. */
function groupOf(result: SearchResult): string | null {
	return result.provider === 'musicbrainz' && isMbid(result.externalId) ? result.externalId : null;
}

export function createMusicBrainz(deps: MusicBrainzDeps): Provider {
	setHostHeaders([HOST, CAA_HOST], { 'User-Agent': deps.userAgent });
	const limiter = new RequestLimiter({ max: 1, windowMs: MUSICBRAINZ_INTERVAL_MS });
	let latest = 0;

	/**
	 * One request through the limiter, retried once on 503, then reported as a
	 * rate limit. Searches take the "search" lane and stop retrying once a newer
	 * search came in (`wanted`); the other requests take no lane.
	 */
	async function fetchJson(url: string, lane?: string, wanted: () => boolean = () => true): Promise<unknown> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await limiter.schedule(() => getJson(url), lane);
			} catch (error) {
				if (!isBusy(error)) throw error;
				if (!wanted()) throw new SupersededError();
				if (attempt >= BUSY_RETRIES) throw new HttpError(error.host, 429);
			}
		}
	}

	const releases = createMusicBrainzReleases((url) => fetchJson(url));

	return {
		id: 'musicbrainz',
		name: NAME,
		kinds: ['album'],
		async search(query: string): Promise<SearchResult[]> {
			const cleaned = cleanQuery(query);
			const options = deps.albumOptions();
			const lucene = cleaned === null ? null : releaseGroupQuery(cleaned, options);
			if (lucene === null) return [];
			const search = ++latest;
			const json = await fetchJson(searchUrl(lucene), 'search', () => search === latest);
			return parseMusicBrainz(json, options);
		},
		async resolve(result: SearchResult): Promise<SearchResult> {
			try {
				return await resolveCover(result, deps.itunes, deps.albumOptions().itunesFallback);
			} catch {
				return result;
			}
		},
		async editions(result: SearchResult): Promise<Edition[]> {
			const group = groupOf(result);
			return group === null ? [] : releases.editions(group);
		},
		async tracks(result: SearchResult, edition?: Edition): Promise<Track[]> {
			const group = groupOf(result);
			if (group === null) return [];
			const release = edition ?? (await releases.editions(group))[0];
			return release === undefined ? [] : releases.tracks(release.id);
		},
	};
}
