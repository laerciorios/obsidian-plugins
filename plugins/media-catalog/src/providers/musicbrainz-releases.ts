import type { Edition, Track } from '../types';
import { isMbid } from './albums';
import { orderReleases } from './editions';
import { HttpError } from './errors';
import { arr, isRecord, num } from './guards';
import { PromiseCache } from './memo';
import { parseMusicBrainzTracks } from './tracklists';

/**
 * Editions and tracklists of MusicBrainz albums, asked for after the pick:
 * the release group's releases are listed (./editions orders them), then the
 * chosen release is looked up with its recordings. With the default edition
 * that is two requests, 1.1 s apart; answers are kept for a while (./memo),
 * so the editions and the tracklist of one album share the release list.
 * The requests go through the provider's limiter (./musicbrainz), with its
 * User-Agent and its 503 retry.
 */

export const MUSICBRAINZ_HOST = 'musicbrainz.org';
export const MUSICBRAINZ_WS = `https://${MUSICBRAINZ_HOST}/ws/2`;
/** The largest page MusicBrainz serves. */
const RELEASE_PAGE_SIZE = 100;
/**
 * Release pages read per album at most. The browse answer is ordered by
 * release id, not by date, so the pages are a sample: an album with more than
 * 300 official releases (rare) is judged on 300 of them.
 */
const MAX_RELEASE_PAGES = 3;
const CACHE = { max: 20, ttlMs: 10 * 60_000 };

/** One page of a release group's releases with their media (format, track count). */
export function releasesUrl(groupId: string, offset = 0, officialOnly = true): string {
	const status = officialOnly ? '&status=official' : '';
	const page = offset > 0 ? `&offset=${offset}` : '';
	return `${MUSICBRAINZ_WS}/release?release-group=${encodeURIComponent(groupId)}${status}&inc=media&fmt=json&limit=${RELEASE_PAGE_SIZE}${page}`;
}

/** A release with its media and tracks. */
export function releaseUrl(releaseId: string): string {
	return `${MUSICBRAINZ_WS}/release/${encodeURIComponent(releaseId)}?inc=recordings&fmt=json`;
}

export interface MusicBrainzReleases {
	/** Official releases of the group in the edition order (every release when none is official). */
	editions(groupId: string): Promise<Edition[]>;
	/** Tracks of a release, sorted by disc and position. */
	tracks(releaseId: string): Promise<Track[]>;
}

/** `fetchJson`: a GET through the MusicBrainz limiter. */
export function createMusicBrainzReleases(fetchJson: (url: string) => Promise<unknown>): MusicBrainzReleases {
	const editionCache = new PromiseCache<Edition[]>(CACHE);
	const trackCache = new PromiseCache<Track[]>(CACHE);

	/** A release or release group that is gone (merged, deleted) answers 404: read as nothing. */
	async function lookup(url: string): Promise<unknown> {
		try {
			return await fetchJson(url);
		} catch (error) {
			if (error instanceof HttpError && error.status === 404) return null;
			throw error;
		}
	}

	async function listReleases(groupId: string, officialOnly: boolean): Promise<unknown[]> {
		const releases: unknown[] = [];
		for (let page = 0; page < MAX_RELEASE_PAGES; page++) {
			const json = await lookup(releasesUrl(groupId, releases.length, officialOnly));
			const items = isRecord(json) ? arr(json.releases) : [];
			releases.push(...items);
			const total = isRecord(json) ? (num(json['release-count']) ?? 0) : 0;
			if (items.length === 0 || releases.length >= total) break;
		}
		return releases;
	}

	return {
		async editions(groupId) {
			if (!isMbid(groupId)) return [];
			const editions = await editionCache.get(groupId, async () => {
				const official = orderReleases(await listReleases(groupId, true));
				return official.length > 0 ? official : orderReleases(await listReleases(groupId, false));
			});
			return [...editions];
		},
		async tracks(releaseId) {
			if (!isMbid(releaseId)) return [];
			const tracks = await trackCache.get(releaseId, async () => parseMusicBrainzTracks(await lookup(releaseUrl(releaseId))));
			return [...tracks];
		},
	};
}
