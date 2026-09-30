import type { SearchResult } from '../types';
import { imageStatus } from './http';
import { findArtwork } from './itunes';
import type { ItunesClient } from './itunes';
import { imageUrl } from './results';

/**
 * Covers of MusicBrainz release groups from the Cover Art Archive. The URLs
 * are stable: coverartarchive.org answers with a redirect to archive.org and
 * then to a storage node (*.archive.org), or 404 when there is no front cover.
 * Search results carry these URLs unchecked; `resolveCover` checks the one the
 * user picked and, without a cover, looks for the album on iTunes.
 */

export const CAA_HOST = 'coverartarchive.org';
/** Past this, the check is dropped and the result kept as it is (the redirects can be slow). */
const PROBE_TIMEOUT_MS = 10_000;
const ARTWORK_TIMEOUT_MS = 10_000;

/** Front cover of a release group; 250, 500 and 1200 px exist. */
export function caaUrl(mbid: string, size: 250 | 500 | 1200): string | undefined {
	return imageUrl(`https://${CAA_HOST}/release-group/${encodeURIComponent(mbid)}/front-${size}`);
}

/** Resolves to null when `promise` rejects or takes longer than `ms`. */
function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return new Promise((resolve) => {
		const timer = window.setTimeout(() => resolve(null), ms);
		promise.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			() => {
				window.clearTimeout(timer);
				resolve(null);
			},
		);
	});
}

/**
 * The picked result with a cover that exists: the Cover Art Archive's when it
 * has one; else the iTunes artwork of the same album (when `fallback` is on
 * and one matches); else no cover. Never rejects: when the archive does not
 * answer (network error, timeout, a status other than 404), the result is
 * returned unchanged. Takes one request to the archive (~0.5 s for a 404, a
 * few seconds while Obsidian follows the redirects) plus, without a cover,
 * one iTunes search.
 */
export async function resolveCover(result: SearchResult, itunes: ItunesClient, fallback: boolean): Promise<SearchResult> {
	const probe = caaUrl(result.externalId, 250);
	if (result.provider !== 'musicbrainz' || probe === undefined) return result;
	const status = await settleWithin(imageStatus(probe), PROBE_TIMEOUT_MS);
	if (status !== 404) return result;

	const withoutCover: SearchResult = { ...result, coverUrl: undefined, thumbUrl: undefined };
	const artist = result.details?.authors?.[0] ?? result.subtitle;
	if (!fallback || !artist) return withoutCover;
	const lookup = itunes
		.searchAlbums(`${artist} ${result.title}`, 'artwork')
		.then((json) => findArtwork(json, { title: result.title, artist, year: result.year }));
	const artwork = await settleWithin(lookup, ARTWORK_TIMEOUT_MS);
	return artwork ? { ...result, ...artwork } : withoutCover;
}
