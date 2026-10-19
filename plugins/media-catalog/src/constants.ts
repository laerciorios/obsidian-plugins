/**
 * Values written to notes (kinds, statuses, frontmatter keys, reference-note
 * text) are data, not UI: they are never translated.
 */

export const KINDS = ['movie', 'series', 'game', 'book', 'album'] as const;
export const STATUSES = ['backlog', 'in-progress', 'done', 'dropped'] as const;
/** Statuses of notes in the catalog folder: `backlog` lives in the backlog folder only. */
export const CATALOG_STATUSES = ['in-progress', 'done', 'dropped'] as const;
/** Where "Add to catalog" files a new note. */
export const DESTINATIONS = ['catalog', 'backlog'] as const;
/** `priority` of backlog notes (optional). */
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export const DEFAULT_PRIORITY = 'medium';
/**
 * HowLongToBeat time written as `estimated_hours` in backlog games (data
 * values of the setting). "off": nothing is looked up.
 */
export const HLTB_MEASURES = ['main', 'main-extra', 'completionist', 'off'] as const;
export const DEFAULT_HLTB_MEASURE = 'main-extra';
/** Backlog games: hours to beat from HowLongToBeat, right after `platform`. */
export const ESTIMATED_HOURS_KEY = 'estimated_hours';
/** HowLongToBeat search tokens are renewed after this (and on a 403, as the site does). */
export const HLTB_TOKEN_TTL_MS = 10 * 60_000;
export const PROVIDER_IDS = ['imdb', 'tvmaze', 'google-books', 'open-library', 'igdb', 'musicbrainz', 'itunes'] as const;
export const BOOK_SOURCES = ['open-library', 'google-books'] as const;
export const ALBUM_SOURCES = ['musicbrainz', 'itunes'] as const;

/** Frontmatter keys per kind, in the order the catalog notes use. Keys not listed are never written. */
export const FRONTMATTER_KEYS = {
	movie: ['kind', 'title', 'aliases', 'author', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'cover', 'tags'],
	series: ['kind', 'title', 'aliases', 'season', 'episodes', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'cover', 'tags'],
	game: ['kind', 'title', 'aliases', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'hours', 'cover', 'tags'],
	book: ['kind', 'title', 'aliases', 'author', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'pages', 'reference', 'cover', 'tags'],
	album: ['kind', 'title', 'aliases', 'author', 'year', 'status', 'rating', 'started', 'finished', 'platform', 'cover', 'tags'],
} as const;

/**
 * Backlog notes (things not started yet), in the order of the backlog
 * template. Keys not listed are never written: no dates of a run, rating or
 * hours; albums get their tracklist when they start.
 */
export const BACKLOG_FRONTMATTER_KEYS = {
	movie: ['kind', 'title', 'aliases', 'author', 'year', 'status', 'platform', 'priority', 'added', 'recommended_by', 'cover', 'tags'],
	series: ['kind', 'title', 'aliases', 'year', 'season', 'status', 'platform', 'priority', 'added', 'recommended_by', 'cover', 'tags'],
	game: ['kind', 'title', 'aliases', 'year', 'status', 'platform', 'estimated_hours', 'priority', 'added', 'recommended_by', 'cover', 'tags'],
	book: ['kind', 'title', 'aliases', 'author', 'year', 'status', 'platform', 'priority', 'added', 'recommended_by', 'cover', 'tags'],
	album: ['kind', 'title', 'aliases', 'author', 'year', 'status', 'platform', 'priority', 'added', 'recommended_by', 'cover', 'tags'],
} as const;

export const CATALOG_TAG = 'entertainment';
export const BACKLOG_TAG = 'backlog';
export const BACKLOG_STATUS = 'backlog';
/** Backlog keys dropped when an item starts (`added` stays). */
export const BACKLOG_ONLY_KEYS = ['priority', 'recommended_by'] as const;

/** Folder conventions (never note names). Editable in the settings tab. */
export const DEFAULT_FOLDER = '1 - Knowledge/Entertainment/DB';
export const DEFAULT_TEMPLATE_NAME = 'media.md';
export const DEFAULT_BACKLOG_FOLDER = '1 - Knowledge/Entertainment/Backlog/DB';
export const DEFAULT_BACKLOG_TEMPLATE_NAME = 'backlog-item.md';
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
/** Body of backlog notes; renamed to `## Impressões` when the item starts (note content, as in the vault). */
export const WHY_HEADING = '## Por que quero';

/**
 * Re-entries (replay, rewatch, reread) stay in the same note. The runs before
 * the current one are listed in this section, right before `## Impressões`,
 * newest first (note content, as in the vault).
 */
export const HISTORY_HEADING = '## Histórico';
/** Every known completion date of a note with more than one run, ascending, the current one included. */
export const FINISHED_DATES_KEY = 'finished_dates';
/**
 * Parts of a history line (note content, as in the vault):
 * `- 2024-11-03 → 2024-11-23 · Nintendo Switch · 42,7 h · nota 10`.
 */
export const HISTORY_TEXT = { separator: ' · ', range: ' → ', open: '?', hours: 'h', rating: 'nota' } as const;

/** Hosts the plugin may call. Anything else is refused by providers/http.ts. */
export const API_HOSTS = [
	'v3.sg.media-imdb.com',
	'caching.graphql.imdb.com',
	'api.tvmaze.com',
	'www.googleapis.com',
	'openlibrary.org',
	'covers.openlibrary.org',
	'id.twitch.tv',
	'api.igdb.com',
	'musicbrainz.org',
	'itunes.apple.com',
	'howlongtobeat.com',
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

/**
 * Countries offered for the alternative title (ISO 3166-1 alpha-2), with the
 * language the title is asked in. IMDb picks the title by country and writes
 * it in this language (Japan without "ja-JP" answers the romanized title).
 */
export const ALIAS_COUNTRIES = {
	AR: 'es-AR',
	AT: 'de-AT',
	AU: 'en-AU',
	BR: 'pt-BR',
	CA: 'en-CA',
	CL: 'es-CL',
	CN: 'zh-CN',
	CO: 'es-CO',
	CZ: 'cs-CZ',
	DE: 'de-DE',
	DK: 'da-DK',
	ES: 'es-ES',
	FI: 'fi-FI',
	FR: 'fr-FR',
	GB: 'en-GB',
	GR: 'el-GR',
	HU: 'hu-HU',
	IT: 'it-IT',
	JP: 'ja-JP',
	KR: 'ko-KR',
	MX: 'es-MX',
	NL: 'nl-NL',
	NO: 'nb-NO',
	PL: 'pl-PL',
	PT: 'pt-PT',
	RO: 'ro-RO',
	RU: 'ru-RU',
	SE: 'sv-SE',
	TR: 'tr-TR',
	TW: 'zh-TW',
	UA: 'uk-UA',
	US: 'en-US',
} as const;
export type AliasCountry = keyof typeof ALIAS_COUNTRIES;
export const ALIAS_COUNTRY_CODES = Object.keys(ALIAS_COUNTRIES) as AliasCountry[];
/** Kinds whose sources know titles by country. Books and albums keep the title only. */
export const LOCALIZED_KINDS = ['movie', 'series', 'game'] as const;
/** Past this, the alternative title is given up and the note is written without it. */
export const LOCALIZED_TITLE_TIMEOUT_MS = 8_000;
/** Movies: past this, the form opens with the director field empty (the lookup holds the step after the pick). */
export const DIRECTORS_TIMEOUT_MS = 5_000;

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
	updateAliases: 'update-aliases',
	newRun: 'new-run',
	startBacklogItem: 'start-backlog-item',
	updateEstimate: 'update-estimated-time',
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
	duplicateActions: 'mc-duplicate-actions',
	newRun: 'mc-new-run',
	historyLine: 'mc-history-line',
	actions: 'mc-actions',
	hint: 'mc-hint',
	rating: 'mc-rating',
	ratingButtons: 'mc-rating-buttons',
	tracklist: 'mc-tracklist',
	tracklistDisc: 'mc-tracklist-disc',
	tracklistTime: 'mc-tracklist-time',
} as const;
