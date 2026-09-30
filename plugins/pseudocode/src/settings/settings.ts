import { KEYWORD_LANGUAGES, KEYWORDS } from '../render/keywords';
import type { KeywordLanguage } from '../render/keywords';
import type { BaseStyle } from '../render/lines';
import type { ExportOptions } from '../export/latex';

export interface PseudocodeSettings {
	version: 1;
	/** "Algorithm 1", "Algorithm 2"... in the order of the note. */
	numberAlgorithms: boolean;
	/** Number the lines (the course convention); a block can override it. */
	lineNumbers: boolean;
	/** Text after each line number. */
	punctuation: string;
	/** Width of an indentation level, in em. */
	indent: number;
	scopeLines: boolean;
	/** "end if", "end for"... */
	showEnd: boolean;
	commentDelimiter: string;
	/** Language of the keywords and of the caption: content, not interface. */
	keywords: KeywordLanguage;
	/** Copy a compilable document instead of only the algorithm environment. */
	exportDocument: boolean;
}

export const MIN_INDENT = 0.5;
export const MAX_INDENT = 4;

/** Nothing here is translated: the delimiter and punctuation are the user's text, as in the community plugin. */
export function defaultSettings(): PseudocodeSettings {
	return {
		version: 1,
		numberAlgorithms: true,
		lineNumbers: true,
		punctuation: ':',
		indent: 1.2,
		scopeLines: false,
		showEnd: true,
		commentDelimiter: '//',
		keywords: 'en',
		exportDocument: false,
	};
}

export function isValidIndent(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= MIN_INDENT && value <= MAX_INDENT;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): PseudocodeSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
	const text = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);
	return {
		version: 1,
		numberAlgorithms: bool(raw.numberAlgorithms, defaults.numberAlgorithms),
		lineNumbers: bool(raw.lineNumbers, defaults.lineNumbers),
		punctuation: text(raw.punctuation, defaults.punctuation),
		indent: isValidIndent(raw.indent) ? raw.indent : defaults.indent,
		scopeLines: bool(raw.scopeLines, defaults.scopeLines),
		showEnd: bool(raw.showEnd, defaults.showEnd),
		commentDelimiter: text(raw.commentDelimiter, defaults.commentDelimiter),
		keywords: KEYWORD_LANGUAGES.includes(raw.keywords as KeywordLanguage) ? (raw.keywords as KeywordLanguage) : defaults.keywords,
		exportDocument: bool(raw.exportDocument, defaults.exportDocument),
	};
}

export function baseStyle(settings: PseudocodeSettings): BaseStyle {
	return {
		lineNumbers: settings.lineNumbers,
		scopeLines: settings.scopeLines,
		showEnd: settings.showEnd,
		commentDelimiter: settings.commentDelimiter,
		keywords: KEYWORDS[settings.keywords],
	};
}

export function exportOptions(settings: PseudocodeSettings): ExportOptions {
	return {
		document: settings.exportDocument,
		lineNumbers: settings.lineNumbers,
		scopeLines: settings.scopeLines,
		showEnd: settings.showEnd,
		portuguese: settings.keywords === 'pt-BR',
	};
}
