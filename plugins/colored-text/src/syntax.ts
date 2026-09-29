/**
 * The note syntax, as pure string functions (no Obsidian API): a colored
 * highlight is Obsidian's own ==highlight== whose content starts with a
 * marker, =={red}text== or =={#e03131}text==. Plain highlights and the
 * <span style="color:…"> written by the community Colored Text plugin are
 * parsed too, so commands can recolor or remove them.
 *
 * Everything works on one line: Obsidian highlights never span paragraphs,
 * and the commands write one highlight per line.
 */

/** A ==highlight== on a line. Offsets are relative to the line start. */
export interface Highlight {
	/** Start of the opening "==". */
	from: number;
	/** End of the closing "==". */
	to: number;
	/** Text between the braces right after the opening "==", or null without braces. */
	token: string | null;
	/** Start of the text after the opening "==" (the "{" when there is a token). */
	innerFrom: number;
	/** End of "{token}" (equal to innerFrom without a token). */
	tokenTo: number;
	/** Start of the closing "==". */
	innerTo: number;
}

/** A legacy <span style="color:…">text</span> on a line. */
export interface LegacySpan {
	from: number;
	to: number;
	innerFrom: number;
	innerTo: number;
}

/** Anything the commands can unwrap: its delimiters are removed, its content stays. */
export interface Wrapper {
	from: number;
	to: number;
	/** End of the opening delimiter (including a known marker). */
	openTo: number;
	/** Start of the closing delimiter. */
	closeFrom: number;
}

const MAX_TOKEN = 40;

/**
 * "==" not touching another "=", not followed by a space, optionally a
 * {token}, the shortest content without "==", and a closing "==" not preceded
 * by a space. Obsidian applies the same flanking rules, and the editor
 * double-checks every match against its syntax tree.
 */
const HIGHLIGHT = new RegExp(
	String.raw`(?<!=)==(?![=\s])(?:\{([^{}\n]{1,${MAX_TOKEN}})\})?((?:(?!==)[^\n])*?)(?<!\s)==(?!=)`,
	'g',
);

const LEGACY_SPAN = /<span\s+style\s*=\s*(["'])\s*color\s*:[^"'<>]*\1\s*>((?:(?!<\/?span\b)[^\n])*?)<\/span>/gi;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A marker at the very start of a reading-view <mark>: "{red}text". */
export const LEADING_TOKEN = new RegExp(String.raw`^\{([^{}\n]{1,${MAX_TOKEN}})\}`);

export function findHighlights(line: string): Highlight[] {
	const found: Highlight[] = [];
	for (const match of line.matchAll(HIGHLIGHT)) {
		const from = match.index;
		const to = from + match[0].length;
		const token = match[1] ?? null;
		const innerFrom = from + 2;
		const tokenTo = token === null ? innerFrom : innerFrom + token.length + 2;
		found.push({ from, to, token, innerFrom, tokenTo, innerTo: to - 2 });
	}
	return found;
}

export function findLegacySpans(line: string): LegacySpan[] {
	const found: LegacySpan[] = [];
	for (const match of line.matchAll(LEGACY_SPAN)) {
		const from = match.index;
		const to = from + match[0].length;
		const inner = match[2] ?? '';
		const innerTo = to - '</span>'.length;
		found.push({ from, to, innerFrom: innerTo - inner.length, innerTo });
	}
	return found;
}

export function isHex(value: string): boolean {
	return HEX.test(value.trim());
}

/** "#E33" → "#ee3333", "e03131" → "#e03131"; null when it is not a hex color. */
export function normalizeHex(value: string): string | null {
	const raw = value.trim().toLowerCase();
	const hex = raw.startsWith('#') ? raw : `#${raw}`;
	if (!HEX.test(hex)) return null;
	if (hex.length === 4) return `#${[...hex.slice(1)].map((digit) => digit + digit).join('')}`;
	return hex;
}

/** The text written to open a colored highlight: =={token}. */
export function opening(token: string): string {
	return `=={${token}}`;
}

export const CLOSING = '==';
