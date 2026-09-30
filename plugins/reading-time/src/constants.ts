export const SAVE_DEBOUNCE_MS = 400;
/** Recount after typing stops: counting a long note on every keystroke is wasted work. */
export const EDIT_DEBOUNCE_MS = 500;
/** Selections change while dragging; wait until they settle. */
export const SELECTION_DEBOUNCE_MS = 150;

export const MIN_WPM = 20;
export const MAX_WPM = 2000;

/** Bulk update: yield to the UI every this many notes. */
export const BULK_BATCH = 25;

export const DEFAULT_PROPERTY = 'reading_time';
export const DEFAULT_SKIP_LANGUAGES = ['mermaid', 'base', 'query', 'dataview', 'dataviewjs'];

export const CLS = {
	status: 'rt-status',
	preview: 'rt-preview',
} as const;
