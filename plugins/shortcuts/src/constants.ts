export const DEFAULT_TRIGGER = '@';
export const MAX_TRIGGER_LENGTH = 3;

/** Longer queries close the popover, so plain prose after a stray trigger stays cheap. */
export const MAX_QUERY_LENGTH = 40;
export const MAX_SUGGESTIONS = 10;

/** Letters (with accents), digits, spaces, "-" and "_". Anything else closes the popover. */
export const QUERY_PATTERN = /^[\p{L}\p{M}\p{N} _-]*$/u;

/** Characters allowed right before the trigger, so "name@mail.com" does not open it. */
export const BOUNDARY_PATTERN = /[\s([{"'“‘«*]/u;

/** How long the Daily notes format read from disk is trusted before re-reading it. */
export const DAILY_FORMAT_TTL_MS = 10_000;

export const SAVE_DEBOUNCE_MS = 400;
export const PREVIEW_DEBOUNCE_MS = 300;
export const PREVIEW_EXAMPLES = 3;

export const DATES_ORDER = -1;
export const DATES_ICON = 'calendar';
export const FALLBACK_ICON = 'file-text';

export const CLS = {
	suggestion: 'sc-suggestion',
	flair: 'sc-flair',
} as const;
