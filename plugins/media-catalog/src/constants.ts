/**
 * Values written to notes (kinds, statuses, frontmatter keys, reference-note
 * text) are data, not UI: they are never translated.
 */

export const KINDS = ['movie', 'series', 'game', 'book', 'album'] as const;
export const STATUSES = ['backlog', 'in-progress', 'done', 'dropped'] as const;
export const PROVIDER_IDS = ['imdb', 'tvmaze', 'google-books', 'open-library', 'igdb', 'musicbrainz', 'itunes'] as const;
export const BOOK_SOURCES = ['open-library', 'google-books'] as const;
export const ALBUM_SOURCES = ['musicbrainz', 'itunes'] as const;

/** Frontmatter keys per kind, in the order the catalog notes use. Keys not listed are never written. */
export const FRONTMATTER_KEYS = {
	movie: ['kind', 'title', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'cover', 'tags'],
	series: ['kind', 'title', 'season', 'episodes', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'cover', 'tags'],
	game: ['kind', 'title', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'hours', 'cover', 'tags'],
	book: ['kind', 'title', 'author', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'pages', 'reference', 'cover', 'tags'],
	album: ['kind', 'title', 'author', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'cover', 'tags'],
} as const;

export const CATALOG_TAG = 'entertainment';

/** Folder conventions (never note names). Editable in the settings tab. */
export const DEFAULT_FOLDER = '1 - Knowledge/Entertainment/DB';
export const DEFAULT_TEMPLATE_NAME = 'media.md';
export const REFERENCE_BOOKS_PATH = '_References/Books';

/** Reference note for technical books (note content, kept as in the vault). */
export const REFERENCE_ALIAS = 'referência';
export const READING_ALIAS = 'leitura';
export const REFERENCE_TAGS = ['reference', 'book'] as const;
export const REFERENCE_READING_LABEL = 'Leitura';
export const REFERENCE_SECTIONS = ['## Resumo', '## Notas pessoais'] as const;

export const COVER_SUFFIX = '-cover';

/** Albums: optional frontmatter key with the number of tracks, written right after `year` when enabled. */
export const ALBUM_TRACKS_KEY = 'tracks';
/** Albums: the tracklist section goes right before this heading of the template body (note content, as in the vault). */
export const IMPRESSIONS_HEADING = '## Impressões';

/** Hosts the plugin may call. Anything else is refused by providers/http.ts. */
export const API_HOSTS = [
	'v3.sg.media-imdb.com',
	'api.tvmaze.com',
	'www.googleapis.com',
	'openlibrary.org',
	'covers.openlibrary.org',
	'id.twitch.tv',
	'api.igdb.com',
	'musicbrainz.org',
	'itunes.apple.com',
] as const;

/** Hosts covers are shown from and downloaded from. */
export const IMAGE_HOSTS = [
	'm.media-amazon.com',
	'static.tvmaze.com',
	'books.google.com',
	'books.googleusercontent.com',
	'images.igdb.com',
	'covers.openlibrary.org',
	'coverartarchive.org',
	'archive.org',
	'is1-ssl.mzstatic.com',
	'is2-ssl.mzstatic.com',
	'is3-ssl.mzstatic.com',
	'is4-ssl.mzstatic.com',
	'is5-ssl.mzstatic.com',
] as const;

/**
 * Image hosts matched by suffix: the Cover Art Archive redirects
 * (coverartarchive.org → archive.org → a storage node such as
 * ia800123.us.archive.org or dn720706.ca.archive.org) and the node name varies.
 */
export const IMAGE_HOST_SUFFIXES = ['.archive.org'] as const;

/** MusicBrainz allows about one request per second per client. */
export const MUSICBRAINZ_INTERVAL_MS = 1100;

export const SEARCH_DEBOUNCE_MS = 300;
export const SAVE_DEBOUNCE_MS = 400;
export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 10;
/** Renew the IGDB token this long before Twitch says it expires. */
export const TOKEN_MARGIN_MS = 60_000;

export const RATING_MIN = 1;
export const RATING_MAX = 10;

export const COMMAND_IDS = {
	add: 'add',
	changeCover: 'change-cover',
	markFinished: 'mark-finished',
	updateTracks: 'update-tracks',
} as const;

export const SETTINGS_ICON = 'clapperboard';

/** CSS classes, all prefixed with `mc-` (see styles.css). */
export const CLS = {
	modal: 'mc-modal',
	toolbar: 'mc-toolbar',
	search: 'mc-search',
	results: 'mc-results',
	result: 'mc-result',
	selected: 'is-selected',
	cover: 'mc-cover',
	coverImg: 'mc-cover-img',
	coverEmpty: 'mc-cover-empty',
	resultBody: 'mc-result-body',
	resultTitle: 'mc-result-title',
	resultMeta: 'mc-result-meta',
	resultSource: 'mc-result-source',
	state: 'mc-state',
	stateError: 'mc-state-error',
	spinner: 'mc-spinner',
	form: 'mc-form',
	preview: 'mc-preview',
	previewCover: 'mc-preview-cover',
	previewCovers: 'mc-preview-covers',
	figure: 'mc-figure',
	caption: 'mc-caption',
	posters: 'mc-posters',
	poster: 'mc-poster',
	duplicate: 'mc-duplicate',
	actions: 'mc-actions',
	hint: 'mc-hint',
	rating: 'mc-rating',
	ratingButtons: 'mc-rating-buttons',
	tracklist: 'mc-tracklist',
	tracklistDisc: 'mc-tracklist-disc',
	tracklistTime: 'mc-tracklist-time',
} as const;
