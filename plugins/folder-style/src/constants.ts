/** Theme colors offered as presets; each has a `--color-<name>-rgb` variable. */
export const PRESET_COLORS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'] as const;

/** Added to the base opacity so hover and selection stay visible over the tint. */
export const HOVER_OPACITY_STEP = 0.06;
export const ACTIVE_OPACITY_STEP = 0.12;

/** Space between the symbol and the folder name. */
export const SYMBOL_GAP = '0.3em';

export const SAVE_DEBOUNCE_MS = 400;

/** Classes of the settings tab (styles.css). */
export const CLS = {
	preview: 'fs-preview',
	previewColored: 'fs-preview-colored',
	previewSymbol: 'fs-preview-symbol',
	warning: 'fs-warning',
} as const;

/** The folder color's `rgb()` channels and the row opacity on a settings preview (styles.css). */
export const PREVIEW_COLOR_VAR = '--fs-color-rgb';
export const PREVIEW_ALPHA_VAR = '--fs-color-alpha';
