import { LOCALIZED_KINDS, LOCALIZED_TITLE_TIMEOUT_MS } from '../constants';
import type { AliasCountry } from '../constants';
import type { MediaKind, Provider, SearchResult } from '../types';
import { CatalogError } from './errors';
import { PromiseCache } from './memo';
import { settleWithin } from './settle';

const LOCALIZED_KIND_SET: ReadonlySet<string> = new Set<string>(LOCALIZED_KINDS);
/** Answers by `<provider>:<id>:<country>`: going back and forth in the modal asks once. Failures are retried. */
const answers = new PromiseCache<string | null>({ max: 50, ttlMs: 10 * 60_000 });

/** Movies, series and games: their sources know titles by country. Books and albums keep the title only. */
export function hasLocalizedTitles(kind: MediaKind): boolean {
	return LOCALIZED_KIND_SET.has(kind);
}

/** True when an alternative title can be looked up: a country set, and a kind and source that know titles by country. */
export function canLocalize(provider: Provider, kind: MediaKind, country: AliasCountry | ''): boolean {
	return country !== '' && hasLocalizedTitles(kind) && typeof provider.localizedTitle === 'function';
}

/**
 * Title of `result` in `country`, or null: no country set, a source without
 * titles by country, nothing found, an error, or no answer within
 * `timeoutMs`. Never rejects and shows nothing: the note is written with the
 * title alone. Unexpected errors go to the console.
 */
export async function findLocalizedTitle(
	provider: Provider,
	result: SearchResult,
	country: AliasCountry | '',
	timeoutMs = LOCALIZED_TITLE_TIMEOUT_MS,
): Promise<string | null> {
	if (country === '' || !hasLocalizedTitles(result.kind) || !provider.localizedTitle) return null;
	const localizedTitle = provider.localizedTitle.bind(provider);
	const lookup = answers.get(`${provider.id}:${result.externalId}:${country}`, () => localizedTitle(result, country));
	const logged = lookup.catch((error: unknown) => {
		if (!(error instanceof CatalogError)) console.error('Media Catalog: could not look up the alternative title', error);
		throw error;
	});
	return settleWithin(logged, timeoutMs);
}
