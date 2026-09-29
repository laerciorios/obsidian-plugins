export const SAVE_DEBOUNCE_MS = 400;
/** Palette edits reconfigure every open editor, so they wait for the typing to stop. */
export const REFRESH_DEBOUNCE_MS = 400;

export const MAX_NAME_LENGTH = 30;
/** Format hint of the hex field: the same in every language. */
export const HEX_PLACEHOLDER = '#rrggbb';
/** Characters a color name cannot contain: they would break the marker, a highlight or a table. */
export const FORBIDDEN_NAME_CHARS = ['{', '}', '=', '|', '\\'];

/** Colors reachable with the number keys in the picker: 1–9, then 0. */
export const NUMBER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export const CLS = {
	color: 'ct-color',
	style: (style: string) => `ct-${style}`,
	marker: 'ct-marker',
	preview: 'ct-preview',
	swatch: 'ct-swatch',
	suggestion: 'ct-suggestion',
	number: 'ct-number',
	hex: 'ct-hex',
	colorRow: 'ct-color-row',
	error: 'ct-error',
	hexInput: 'ct-hex-input',
	nameInput: 'ct-name-input',
} as const;

/** CSS custom property that carries the palette color to the stylesheet. */
export const COLOR_VAR = '--ct-color';
