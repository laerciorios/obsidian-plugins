import { MAX_RESULTS, MIN_QUERY_LENGTH } from '../constants';
import type { SearchResult } from '../types';
import { HttpError } from './errors';
import { isImageUrl } from './http';

/** Helpers shared by the provider modules. */

/** Query trimmed with inner whitespace collapsed; null when it is too short to search. */
export function cleanQuery(query: string): string | null {
	const cleaned = query.trim().replace(/\s+/g, ' ');
	return cleaned.length >= MIN_QUERY_LENGTH ? cleaned : null;
}

/** The URL when the UI may show or download it (https on an image host), undefined otherwise. */
export function imageUrl(url: string | undefined): string | undefined {
	return url !== undefined && isImageUrl(url) ? url : undefined;
}

/** Drops repeated items (same externalId, first wins) and caps the list at MAX_RESULTS. */
export function finalize(results: SearchResult[]): SearchResult[] {
	const seen = new Set<string>();
	const kept: SearchResult[] = [];
	for (const result of results) {
		if (seen.has(result.externalId)) continue;
		seen.add(result.externalId);
		kept.push(result);
		if (kept.length >= MAX_RESULTS) break;
	}
	return kept;
}

/**
 * Google and Twitch answer 400 (not 401/403) to an invalid key or client id.
 * The requests are built by the plugin, so a 400 means the credential was
 * refused: report it as 403 so the UI points to the settings.
 */
export function credentialRefused(error: unknown): unknown {
	return error instanceof HttpError && error.status === 400 ? new HttpError(error.host, 403) : error;
}

/** Names without repeats, ignoring case ("Louis L'Amour", "Louis L'amour" → the first). */
export function uniqueNames(names: readonly string[]): string[] {
	const seen = new Set<string>();
	return names.filter((name) => {
		const key = name.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** "a, b" from a list, or undefined when it is empty. */
export function joinNames(names: readonly string[]): string | undefined {
	return names.length > 0 ? names.join(', ') : undefined;
}
