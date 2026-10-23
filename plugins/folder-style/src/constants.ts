/** Theme colors offered as presets; each has a `--color-<name>-rgb` variable. */
export const PRESET_COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'] as const;

/** Added to the base opacity so hover and selection stay visible over the tint. */
export const HOVER_OPACITY_STEP = 0.06;
export const ACTIVE_OPACITY_STEP = 0.12;

/** Space between the symbol and the folder name. */
export const SYMBOL_GAP = '0.3em';

export const SAVE_DEBOUNCE_MS = 400;

/** Most icons the modal grid shows at once; the search narrows the rest. */
export const ICON_RESULTS_LIMIT = 120;

/** Largest vault SVG used as a symbol: the whole file goes into the stylesheet as a data URL. */
export const SVG_MAX_BYTES = 100 * 1024;

export const HEX_PLACEHOLDER = '#d97706';
/** Enough for a few characters or one composed emoji (a family emoji is 11 UTF-16 units). */
export const SYMBOL_TEXT_MAX_LENGTH = 16;
/** Where the color picker starts when there is no hex yet. */
export const HEX_PICKER_DEFAULT = '#808080';

/** Classes of the settings tab and the modal (styles.css). */
export const CLS = {
	preview: 'fs-preview',
	previewColored: 'fs-preview-colored',
	previewSymbol: 'fs-preview-symbol',
	warning: 'fs-warning',
	modal: 'fs-modal',
	modalPreview: 'fs-modal-preview',
	iconPicker: 'fs-icon-picker',
	iconSelected: 'fs-icon-selected',
	iconGrid: 'fs-icon-grid',
	iconHint: 'fs-icon-hint',
	colorSetting: 'fs-color-setting',
	chips: 'fs-chips',
	chip: 'fs-chip',
	swatch: 'fs-swatch',
	svg: 'fs-svg',
	svgTint: 'fs-svg-tint',
	svgPicker: 'fs-svg-picker',
	svgSuggestion: 'fs-svg-suggestion',
	svgSuggestionPath: 'fs-svg-suggestion-path',
} as const;

/** The folder color's `rgb()` channels and the row opacity on a settings preview (styles.css). */
export const PREVIEW_COLOR_VAR = '--fs-color-rgb';
export const PREVIEW_ALPHA_VAR = '--fs-color-alpha';
/** A vault SVG's `url()` on a settings or modal preview (styles.css). */
export const SVG_URL_VAR = '--fs-svg-url';
