/** Text measurement: exact in a browser (canvas 2D), approximate anywhere else. */

export interface FontSpec {
	size: number;
	bold: boolean;
	italic: boolean;
	mono: boolean;
}

/** Width in px of `text` drawn with `font`. */
export type TextMeasurer = (text: string, font: FontSpec) => number;

export const SANS_FAMILY =
	'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** CSS `font` shorthand of a font spec. */
export function cssFont(font: FontSpec, sans = SANS_FAMILY, mono = MONO_FAMILY): string {
	return `${font.italic ? 'italic ' : ''}${font.bold ? 700 : 400} ${font.size}px ${font.mono ? mono : sans}`;
}

/** Character width in em of a typical sans-serif font (Helvetica/Arial-like). */
function charWidth(char: string): number {
	const code = char.codePointAt(0) ?? 0;
	if (code >= 0x2e80) return 1;
	if (code > 0x7f) return 0.55;
	if (char === ' ') return 0.28;
	if ('ijl|!.,:;\'`'.includes(char)) return 0.26;
	if ('frt()[]{}"/\\-I'.includes(char)) return 0.36;
	if ('mwMW'.includes(char)) return 0.86;
	if (char >= 'A' && char <= 'Z') return 0.68;
	if (char >= '0' && char <= '9') return 0.56;
	if (char >= 'a' && char <= 'z') return 0.53;
	return 0.5;
}

/** Measurer without a browser: a per-character estimate, good enough for tests and servers. */
export const approximateMeasurer: TextMeasurer = (text, font) => {
	if (font.mono) return [...text].length * 0.6 * font.size;
	let width = 0;
	for (const char of text) width += charWidth(char);
	return width * font.size * (font.bold ? 1.07 : 1);
};

interface MeasuringContext {
	font: string;
	measureText(text: string): { width: number };
}

/**
 * Exact measurer backed by a canvas 2D context (`document.createElement('canvas').getContext('2d')`).
 * Widths are cached per font and text.
 */
export function contextMeasurer(context: MeasuringContext, sans = SANS_FAMILY, mono = MONO_FAMILY): TextMeasurer {
	const cache = new Map<string, number>();
	return (text, font) => {
		const css = cssFont(font, sans, mono);
		const key = `${css}\u0000${text}`;
		let width = cache.get(key);
		if (width === undefined) {
			if (context.font !== css) context.font = css;
			width = context.measureText(text).width;
			if (cache.size > 20000) cache.clear();
			cache.set(key, width);
		}
		return width;
	};
}
