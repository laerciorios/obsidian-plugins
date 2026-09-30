import type { App, TFile } from 'obsidian';
import type { ALBUM_SOURCES, BOOK_SOURCES, KINDS, PROVIDER_IDS, STATUSES } from './constants';

export type MediaKind = (typeof KINDS)[number];
export type Status = (typeof STATUSES)[number];
export type ProviderId = (typeof PROVIDER_IDS)[number];
export type BookSource = (typeof BOOK_SOURCES)[number];
export type AlbumSource = (typeof ALBUM_SOURCES)[number];

/** One item of a provider's search results. Everything except the ids and title is optional. */
export interface SearchResult {
	provider: ProviderId;
	/** The provider's own id (IMDb "tt…", TVmaze show id, Open Library work key…). */
	externalId: string;
	kind: MediaKind;
	title: string;
	year?: number;
	/** Second line of the result: cast, network, authors or platforms. */
	subtitle?: string;
	/** Full-size cover, written to the note. */
	coverUrl?: string;
	/** Small cover for the result list. Falls back to coverUrl. */
	thumbUrl?: string;
	/** Public page of the item, used for the "- <Source>: <url>" line and the reference note. */
	sourceUrl?: string;
	details?: {
		authors?: string[];
		pages?: number;
		isbn?: string;
		platforms?: string[];
		/** Albums: primary type, shown as a label in the result list. */
		albumType?: 'album' | 'ep';
		/** Albums: number of tracks, when the source gives it. */
		trackCount?: number;
	};
}

/** One season of a series (TVmaze). */
export interface SeasonInfo {
	id: string;
	number: number;
	/** Total episodes of the season; null when the provider does not know. */
	episodes: number | null;
	year?: number;
	coverUrl?: string;
	thumbUrl?: string;
}

export interface Provider {
	id: ProviderId;
	/** Brand name shown in the UI and in the source line. Not translated. */
	name: string;
	kinds: readonly MediaKind[];
	search(query: string, kind: MediaKind): Promise<SearchResult[]>;
	/**
	 * Optional. Runs once the user picks a result, before the confirm (or
	 * cover) step, to fill what the search could not: e.g. whether the Cover
	 * Art Archive has a front cover, else an iTunes fallback. Must resolve
	 * (a missing cover is not an error); returns the result, possibly updated.
	 */
	resolve?(result: SearchResult): Promise<SearchResult>;
}

export interface SeasonProvider extends Provider {
	seasons(result: SearchResult): Promise<SeasonInfo[]>;
}

/** What the confirm step hands to the note writer. */
export interface CatalogDraft {
	kind: MediaKind;
	title: string;
	year: number | null;
	status: Status;
	rating: number | null;
	/** YYYY-MM-DD or null. */
	started: string | null;
	finished: string | null;
	platform: string;
	/** series */
	season: number | null;
	episodes: number | null;
	/** game */
	hours: number | null;
	/** book */
	author: string;
	pages: number | null;
	/** Technical book: area folder (vault path) that holds `_References/Books`. Null: no reference note. */
	referenceArea: string | null;
	cover: { url: string | null; download: boolean };
	source: { provider: ProviderId; name: string; url: string | null };
}

export interface CatalogSettings {
	version: 1;
	folder: string;
	/** Vault path of the template file. Empty: `<core Templates folder>/media.md`. */
	templateFile: string;
	addSourceLink: boolean;
	defaultStatus: Status;
	downloadCovers: boolean;
	bookSource: BookSource;
	/** Source selected first when searching albums. */
	albumSource: AlbumSource;
	/** Albums: include EPs besides albums. */
	albumIncludeEps: boolean;
	/** Albums: include compilations and live albums (MusicBrainz secondary types). */
	albumIncludeSecondary: boolean;
	/** Albums from MusicBrainz without a Cover Art Archive front cover: look for one on iTunes. */
	albumItunesFallback: boolean;
	/** Kind picked in the last search, so the modal reopens on it. */
	lastKind: MediaKind;
	/** Ids of secrets in Obsidian's secret storage (never the secret values). */
	igdbClientId: string;
	igdbClientSecret: string;
	googleBooksApiKey: string;
}

/** Catalog note read back from its frontmatter. */
export interface CatalogNoteInfo {
	file: TFile;
	kind: MediaKind;
	title: string;
	season: number | null;
	year: number | null;
	/** `cover` as written: a URL, `[[<file>]]`, a file name, or null when empty. */
	cover: string | null;
}

/** What modals and commands need from the plugin. Implemented by MediaCatalogPlugin. */
export interface CatalogContext {
	app: App;
	settings: CatalogSettings;
	providers: Provider[];
	settingsChanged(): void;
}
