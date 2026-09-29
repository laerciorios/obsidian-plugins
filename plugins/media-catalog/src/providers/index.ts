import type { MediaKind, Provider, ProviderId, SeasonProvider } from '../types';
import { createGoogleBooks } from './google-books';
import { createIgdb } from './igdb';
import { createImdb } from './imdb';
import { createOpenLibrary } from './open-library';
import { createTvmaze } from './tvmaze';

export interface ProviderDeps {
	/** Read at call time; null when not configured. */
	igdbCredentials: () => { clientId: string; clientSecret: string } | null;
	googleBooksKey: () => string | null;
}

/** Display order of the sources: Open Library first for books, since it needs no key. */
const ORDER: readonly ProviderId[] = ['imdb', 'tvmaze', 'open-library', 'google-books', 'igdb'];

export function createProviders(deps: ProviderDeps): Provider[] {
	return [
		createImdb(),
		createTvmaze(),
		createOpenLibrary(),
		createGoogleBooks(deps.googleBooksKey),
		createIgdb(deps.igdbCredentials),
	];
}

/** Providers for a kind, in display order. book → [open-library, google-books]. */
export function providersFor(providers: readonly Provider[], kind: MediaKind): Provider[] {
	return providers
		.filter((provider) => provider.kinds.includes(kind))
		.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
}

export function hasSeasons(provider: Provider): provider is SeasonProvider {
	return 'seasons' in provider && typeof provider.seasons === 'function';
}
