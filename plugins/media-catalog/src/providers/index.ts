import type { MediaKind, Provider, ProviderId, SeasonProvider } from '../types';
import type { AlbumOptions } from './albums';
import { createGoogleBooks } from './google-books';
import { createIgdb } from './igdb';
import { createImdb } from './imdb';
import { createItunes, createItunesClient } from './itunes';
import { createMusicBrainz } from './musicbrainz';
import { createOpenLibrary } from './open-library';
import { createTvmaze } from './tvmaze';

export type { AlbumOptions } from './albums';

export interface ProviderDeps {
	/** Read at call time; null when not configured. */
	igdbCredentials: () => { clientId: string; clientSecret: string } | null;
	googleBooksKey: () => string | null;
	/** `MediaCatalog/<manifest.version> ( <manifest.authorUrl> )` — sent to MusicBrainz (required) and the Cover Art Archive. */
	userAgent: string;
	/** Read at call time from the settings. */
	albumOptions: () => AlbumOptions;
}

/** Display order of the sources: Open Library first for books, MusicBrainz for albums (no key needed). */
const ORDER: readonly ProviderId[] = ['imdb', 'tvmaze', 'open-library', 'google-books', 'igdb', 'musicbrainz', 'itunes'];

/** User-Agent MusicBrainz asks for: application/version plus a contact URL. */
export function userAgentFor(manifest: { version: string; authorUrl?: string }): string {
	const contact = manifest.authorUrl?.trim();
	return contact ? `MediaCatalog/${manifest.version} ( ${contact} )` : `MediaCatalog/${manifest.version}`;
}

export function createProviders(deps: ProviderDeps): Provider[] {
	// One iTunes client (and rate limit) for the iTunes source and the MusicBrainz cover fallback.
	const itunes = createItunesClient();
	return [
		createImdb(),
		createTvmaze(),
		createOpenLibrary(),
		createGoogleBooks(deps.googleBooksKey),
		createIgdb(deps.igdbCredentials),
		createMusicBrainz({ userAgent: deps.userAgent, albumOptions: deps.albumOptions, itunes }),
		createItunes(itunes, deps.albumOptions),
	];
}

/** Providers for a kind, in display order. book → [open-library, google-books]; album → [musicbrainz, itunes]. */
export function providersFor(providers: readonly Provider[], kind: MediaKind): Provider[] {
	return providers
		.filter((provider) => provider.kinds.includes(kind))
		.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
}

export function hasSeasons(provider: Provider): provider is SeasonProvider {
	return 'seasons' in provider && typeof provider.seasons === 'function';
}
