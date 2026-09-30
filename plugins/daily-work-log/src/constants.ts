export const SAVE_DEBOUNCE_MS = 400;
/** Blocks redraw at most this often while the vault changes. */
export const REFRESH_DEBOUNCE_MS = 200;
/** How long the Daily notes settings read from disk are trusted before re-reading them. */
export const DAILY_SETTINGS_TTL_MS = 10_000;

export const BUTTONS_BLOCK = 'work-log';
export const SUMMARY_BLOCK = 'work-log-summary';
export const HOVER_SOURCE = 'daily-work-log';

/** Frontmatter of a project note. Conventions of the vault, so data: never translated. */
export const PROJECT_TYPE_KEY = 'type';
export const PROJECT_TYPE = 'project';
export const STATUS_KEY = 'status';
export const TITLE_KEY = 'title';
export const COMPANY_KEY = 'company';
export const ALIASES_KEY = 'aliases';
/** Meeting notes: the day they happened. */
export const DATE_KEY = 'date';
/** The folder note of a project folder. */
export const INDEX_BASENAME = 'index';

/** Day of a note file name or of a `date` property. */
export const DAY_FORMAT = 'YYYY-MM-DD';

export const CLS = {
	modal: 'dwl-modal',
	search: 'dwl-search',
	list: 'dwl-list',
	row: 'dwl-row',
	rowName: 'dwl-row-name',
	rowMeta: 'dwl-row-meta',
	badge: 'dwl-badge',
	suggested: 'dwl-suggested',
	suggestions: 'dwl-suggestions',
	suggestionsHead: 'dwl-suggestions-head',
	muted: 'dwl-muted',
	empty: 'dwl-empty',
	footer: 'dwl-footer',
	buttons: 'dwl-buttons',
	chip: 'dwl-chip',
	summary: 'dwl-summary',
	summaryHead: 'dwl-summary-head',
	summaryTitle: 'dwl-summary-title',
	summaryList: 'dwl-summary-list',
	summaryDays: 'dwl-summary-days',
	day: 'dwl-day',
	error: 'dwl-error',
} as const;
