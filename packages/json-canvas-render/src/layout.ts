import { BREAK, parseMarkdown } from './markdown';
import type { Block, InlineStyle, Run } from './markdown';
import type { FontSpec, TextMeasurer } from './measure';

/**
 * Lays Markdown blocks out in lines of positioned runs, for `<text>` elements: SVG has no line
 * wrapping, so every line and run gets explicit coordinates from the measurer.
 */

export interface PlacedRun {
	x: number;
	text: string;
	width: number;
	font: FontSpec;
	style: InlineStyle;
}

export interface PlacedLine {
	/** Baseline, from the top of the layout. */
	baseline: number;
	top: number;
	height: number;
	runs: PlacedRun[];
}

export type DecorationKind = 'quote' | 'code-block' | 'rule' | 'highlight' | 'code';

export interface Decoration {
	kind: DecorationKind;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface TextLayout {
	lines: PlacedLine[];
	decorations: Decoration[];
	/** Height of the whole text. */
	height: number;
	/** Width of the widest line, from its first run to its end. */
	width: number;
}

export interface LayoutOptions {
	width: number;
	measure: TextMeasurer;
	/** Base font size in px (Obsidian: 16). */
	fontSize?: number;
	align?: 'left' | 'center';
	/** Stop laying out below this height (the rest would be clipped anyway). */
	maxHeight?: number;
}

const HEADING_SIZE = [1.618, 1.462, 1.318, 1.188, 1.076, 1];
const HEADING_LINE = [1.2, 1.2, 1.3, 1.4, 1.5, 1.5];
const LINE_HEIGHT = 1.5;
const INDENT = 24;
const QUOTE_INDENT = 20;
const CODE_PADDING = 8;

interface Token {
	text: string;
	style: InlineStyle;
	font: FontSpec;
	width: number;
	space: boolean;
}

function fontFor(style: InlineStyle, size: number, bold: boolean): FontSpec {
	return { size: style.code ? size * 0.875 : size, bold: bold || !!style.bold, italic: !!style.italic, mono: !!style.code };
}

/** Words, single spaces and breaks of the runs, measured. */
function tokenize(runs: Run[], size: number, bold: boolean, measure: TextMeasurer): (Token | typeof BREAK)[] {
	const tokens: (Token | typeof BREAK)[] = [];
	for (const run of runs) {
		if (run.text === BREAK) {
			tokens.push(BREAK);
			continue;
		}
		const font = fontFor(run.style, size, bold);
		for (const piece of run.text.split(/(\n|[ \t]+)/)) {
			if (piece === '') continue;
			if (piece === '\n') tokens.push(BREAK);
			else if (/^[ \t]+$/.test(piece)) tokens.push({ text: ' ', style: run.style, font, width: measure(' ', font), space: true });
			else tokens.push({ text: piece, style: run.style, font, width: measure(piece, font), space: false });
		}
	}
	return tokens;
}

/** Split a word wider than the line into pieces that fit. */
function splitWord(token: Token, width: number, measure: TextMeasurer): Token[] {
	const pieces: Token[] = [];
	let current = '';
	for (const char of token.text) {
		const next = current + char;
		if (current && measure(next, token.font) > width) {
			pieces.push({ ...token, text: current, width: measure(current, token.font) });
			current = char;
		} else {
			current = next;
		}
	}
	if (current) pieces.push({ ...token, text: current, width: measure(current, token.font) });
	return pieces;
}

const sameRunStyle = (a: Token, b: Token): boolean =>
	a.font.size === b.font.size &&
	a.font.bold === b.font.bold &&
	a.font.italic === b.font.italic &&
	a.font.mono === b.font.mono &&
	JSON.stringify(a.style) === JSON.stringify(b.style);

/** Lines of tokens that fit in `width` (greedy, like the browser). */
function wrap(tokens: (Token | typeof BREAK)[], width: number, measure: TextMeasurer): Token[][] {
	const lines: Token[][] = [];
	let line: Token[] = [];
	let lineWidth = 0;
	const push = (): void => {
		while (line.length > 0 && line[line.length - 1]?.space) line.pop();
		lines.push(line);
		line = [];
		lineWidth = 0;
	};
	const place = (token: Token): void => {
		line.push(token);
		lineWidth += token.width;
	};
	// Pieces of text with no space between them (`**bold**.`) form one word: no break inside.
	let word: Token[] = [];
	const flushWord = (): void => {
		if (word.length === 0) return;
		const wordWidth = word.reduce((sum, token) => sum + token.width, 0);
		if (line.length > 0 && lineWidth + wordWidth > width) push();
		for (const token of word) {
			const pieces = token.width > width ? splitWord(token, width, measure) : [token];
			for (const piece of pieces) {
				if (line.length > 0 && lineWidth + piece.width > width) push();
				place(piece);
			}
		}
		word = [];
	};
	for (const token of tokens) {
		if (token === BREAK) {
			flushWord();
			push();
		} else if (token.space) {
			flushWord();
			if (line.length > 0 && !line[line.length - 1]?.space) place(token);
		} else {
			word.push(token);
		}
	}
	flushWord();
	if (line.length > 0 || lines.length === 0) push();
	return lines;
}

interface BlockFrame {
	size: number;
	lineHeight: number;
	bold: boolean;
	/** Left edge of the text. */
	left: number;
}

function frameOf(block: Block, base: number): BlockFrame {
	const quoteIndent = (block.quote ?? 0) * QUOTE_INDENT;
	if (block.kind === 'heading') {
		const index = Math.min(5, Math.max(0, (block.level ?? 1) - 1));
		return { size: base * (HEADING_SIZE[index] ?? 1), lineHeight: HEADING_LINE[index] ?? LINE_HEIGHT, bold: true, left: quoteIndent };
	}
	if (block.kind === 'item') {
		return { size: base, lineHeight: LINE_HEIGHT, bold: false, left: quoteIndent + ((block.depth ?? 0) + 1) * INDENT };
	}
	return { size: base, lineHeight: LINE_HEIGHT, bold: false, left: quoteIndent };
}

function gapBetween(previous: Block | undefined, current: Block, base: number): number {
	if (!previous) return 0;
	if (previous.kind === 'item' && current.kind === 'item') return base * 0.25;
	if (previous.kind === 'table' && current.kind === 'table') return 0;
	if (previous.kind === 'heading') return base * 0.5;
	return base;
}

/** Place the runs of a line at `left`, merging tokens that share a style. */
function placeLine(tokens: Token[], left: number, top: number, lineHeight: number, base: number): PlacedLine {
	const runs: PlacedRun[] = [];
	let x = left;
	let previous: Token | null = null;
	for (const token of tokens) {
		const last = runs[runs.length - 1];
		if (last && previous && sameRunStyle(previous, token)) {
			last.text += token.text;
			last.width += token.width;
		} else {
			runs.push({ x, text: token.text, width: token.width, font: token.font, style: token.style });
		}
		previous = token;
		x += token.width;
	}
	const size = Math.max(base, ...tokens.map((token) => token.font.size));
	const height = size * lineHeight;
	return { top, height, baseline: top + (height - size) / 2 + size * 0.8, runs };
}

function lineWidth(line: PlacedLine, left: number): number {
	const last = line.runs[line.runs.length - 1];
	return last ? last.x + last.width - left : 0;
}

/** Lay Markdown text out in a box `width` px wide. */
export function layoutMarkdown(text: string, options: LayoutOptions): TextLayout {
	return layoutBlocks(parseMarkdown(text), options);
}

export function layoutBlocks(blocks: Block[], options: LayoutOptions): TextLayout {
	const base = options.fontSize ?? 16;
	const measure = options.measure;
	const width = Math.max(1, options.width);
	const center = options.align === 'center';
	const limit = options.maxHeight ?? Infinity;
	const lines: PlacedLine[] = [];
	const decorations: Decoration[] = [];
	let y = 0;
	let widest = 0;
	let previous: Block | undefined;

	for (const block of blocks) {
		if (y > limit) break;
		y += gapBetween(previous, block, base);
		previous = block;
		const frame = frameOf(block, base);
		const blockTop = y;
		const available = Math.max(1, width - frame.left);

		if (block.kind === 'rule') {
			decorations.push({ kind: 'rule', x: frame.left, y: y + base * 0.75 - 1, width: available, height: 2 });
			y += base * 1.5;
		} else if (block.kind === 'code') {
			const font: FontSpec = { size: base * 0.875, bold: false, italic: false, mono: true };
			const runs: Run[] = [];
			(block.lines ?? []).forEach((line, index) => {
				if (index > 0) runs.push({ text: BREAK, style: {} });
				runs.push({ text: line.replace(/\t/g, '    ') || ' ', style: { code: true } });
			});
			y += CODE_PADDING;
			const tokens = tokenize(runs, base, false, measure).map((token) =>
				token === BREAK ? token : { ...token, font, width: measure(token.text, font) },
			);
			for (const tokensOfLine of wrap(tokens, available - CODE_PADDING * 2, measure)) {
				const line = placeLine(tokensOfLine, frame.left + CODE_PADDING, y, LINE_HEIGHT, font.size);
				lines.push(line);
				y += line.height;
				if (y > limit) break;
			}
			y += CODE_PADDING;
			decorations.push({ kind: 'code-block', x: frame.left, y: blockTop, width: available, height: y - blockTop });
		} else {
			const tokens = tokenize(block.runs, frame.size, frame.bold, measure);
			const wrapped = wrap(tokens, available, measure);
			wrapped.forEach((tokensOfLine, index) => {
				if (y > limit) return;
				const line = placeLine(tokensOfLine, frame.left, y, frame.lineHeight, frame.size);
				if (index === 0 && block.kind === 'item' && block.marker) {
					const markerFont: FontSpec = { size: frame.size, bold: false, italic: false, mono: false };
					const markerWidth = measure(block.marker, markerFont);
					const markerX = /\d/.test(block.marker) ? frame.left - markerWidth - 6 : frame.left - INDENT / 2 - markerWidth / 2;
					line.runs.unshift({ x: markerX, text: block.marker, width: markerWidth, font: markerFont, style: { muted: true } });
				}
				lines.push(line);
				y += line.height;
			});
		}

		if ((block.quote ?? 0) > 0) {
			for (let level = 0; level < (block.quote ?? 0); level++) {
				decorations.push({ kind: 'quote', x: level * QUOTE_INDENT, y: blockTop, width: 2, height: y - blockTop });
			}
		}
	}

	if (center) {
		for (const line of lines) {
			if (line.runs.length === 0) continue;
			const left = Math.min(...line.runs.map((run) => run.x));
			const shift = (width - lineWidth(line, left)) / 2 - left;
			for (const run of line.runs) run.x += shift;
		}
	}

	for (const line of lines) {
		const inlineCode = !line.runs.every((run) => run.font.mono);
		for (const run of line.runs) {
			if (run.style.highlight) decorations.push({ kind: 'highlight', x: run.x, y: line.top, width: run.width, height: line.height });
			else if (run.style.code && run.font.mono && inlineCode)
				decorations.push({ kind: 'code', x: run.x - 2, y: line.top + 2, width: run.width + 4, height: line.height - 4 });
		}
	}

	for (const line of lines) {
		if (line.runs.length === 0) continue;
		widest = Math.max(widest, lineWidth(line, Math.min(...line.runs.map((run) => run.x))));
	}
	return { lines, decorations, height: y, width: widest };
}
