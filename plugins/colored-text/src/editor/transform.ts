import { CLOSING, findHighlights, findLegacySpans, opening } from '../syntax';
import type { Wrapper } from '../syntax';

/**
 * Line transforms behind the commands, as pure functions of the line text.
 * Offsets are relative to the line; a range with from === to is the cursor.
 */

/** Decides which {tokens} are color markers; unknown tokens are kept as text. */
export type IsMarker = (token: string) => boolean;

/** A line after an edit, and the range to select in it. */
export interface LineEdit {
	text: string;
	selFrom: number;
	selTo: number;
}

/** Highlights (plain or colored) and legacy spans, by position. */
function wrappers(line: string, isMarker: IsMarker): Wrapper[] {
	const list: Wrapper[] = [];
	for (const highlight of findHighlights(line)) {
		const known = highlight.token !== null && isMarker(highlight.token);
		list.push({
			from: highlight.from,
			to: highlight.to,
			openTo: known ? highlight.tokenTo : highlight.innerFrom,
			closeFrom: highlight.innerTo,
		});
	}
	for (const span of findLegacySpans(line)) {
		list.push({ from: span.from, to: span.to, openTo: span.innerFrom, closeFrom: span.innerTo });
	}
	return list.sort((a, b) => a.from - b.from);
}

function touches(wrapper: Wrapper, from: number, to: number): boolean {
	if (from === to) return wrapper.from <= from && from <= wrapper.to;
	return wrapper.from < to && wrapper.to > from;
}

interface Expanded {
	from: number;
	to: number;
	inside: Wrapper[];
}

/** Grow the range until it cuts no wrapper in half: coloring half a highlight is not possible. */
function expand(list: Wrapper[], from: number, to: number): Expanded {
	let changed = true;
	while (changed) {
		changed = false;
		for (const wrapper of list) {
			if (touches(wrapper, from, to) && (wrapper.from < from || wrapper.to > to)) {
				from = Math.min(from, wrapper.from);
				to = Math.max(to, wrapper.to);
				changed = true;
			}
		}
	}
	const inside = from === to ? [] : list.filter((wrapper) => wrapper.from >= from && wrapper.to <= to);
	return { from, to, inside };
}

/** The text of [from, to] without the delimiters of the wrappers inside it. */
function strip(line: string, from: number, to: number, inside: Wrapper[]): string {
	const cuts = inside
		.flatMap((wrapper): Array<[number, number]> => [
			[wrapper.from, wrapper.openTo],
			[wrapper.closeFrom, wrapper.to],
		])
		.sort((a, b) => a[0] - b[0]);
	let text = '';
	let pos = from;
	for (const [start, end] of cuts) {
		if (start > pos) text += line.slice(pos, start);
		pos = Math.max(pos, end);
	}
	return text + line.slice(pos, to);
}

/**
 * Color [from, to] with a marker token. Highlights and legacy spans the range
 * touches are merged into the new highlight (so a cursor or selection inside
 * a colored highlight recolors it), and surrounding spaces stay outside,
 * where Obsidian still recognizes the closing "==". Null when there is
 * nothing to color: the cursor outside any highlight, or only spaces.
 */
export function colorRange(line: string, from: number, to: number, token: string, isMarker: IsMarker): LineEdit | null {
	const range = expand(wrappers(line, isMarker), from, to);
	if (range.from === range.to) return null;
	const plain = strip(line, range.from, range.to, range.inside);
	const core = plain.trim();
	if (!core && range.inside.length === 0) return null;
	const lead = plain.slice(0, plain.length - plain.trimStart().length);
	const trail = core ? plain.slice(plain.trimEnd().length) : '';
	const open = opening(token);
	const text = line.slice(0, range.from) + lead + open + core + CLOSING + trail + line.slice(range.to);
	const selFrom = range.from + lead.length + open.length;
	return { text, selFrom, selTo: selFrom + core.length };
}

/** Unwrap every highlight and legacy span [from, to] touches. Null when there is none. */
export function uncolorRange(line: string, from: number, to: number, isMarker: IsMarker): LineEdit | null {
	const range = expand(wrappers(line, isMarker), from, to);
	if (range.inside.length === 0) return null;
	const plain = strip(line, range.from, range.to, range.inside);
	return {
		text: line.slice(0, range.from) + plain + line.slice(range.to),
		selFrom: range.from,
		selTo: range.from + plain.length,
	};
}

/** Markdown that opens a line and stays outside the highlight: quotes, list items, tasks, headings. */
const LINE_PREFIX = /^(?:\s*>)*\s*(?:(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?|#{1,6}\s+)?/;
const TABLE_DIVIDER = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*(?::?-+:?\s*)?$/;

function isTableRow(line: string): boolean {
	return line.trimStart().startsWith('|');
}

/** Positions of the cell separators of a table row ("\|" is an escaped pipe). */
function pipes(line: string): number[] {
	const found: number[] = [];
	for (let i = 0; i < line.length; i++) {
		if (line[i] === '\\') i++;
		else if (line[i] === '|') found.push(i);
	}
	return found;
}

/**
 * Pieces of [from, to] that can hold a highlight: after the line prefix and,
 * in a table row, one piece per cell, because a highlight cannot cross "|".
 */
export function segments(line: string, from: number, to: number): Array<[number, number]> {
	if (TABLE_DIVIDER.test(line)) return [];
	const start = Math.max(from, LINE_PREFIX.exec(line)?.[0].length ?? 0);
	if (to <= start) return [];
	if (!isTableRow(line)) return [[start, to]];
	const bounds = [...pipes(line), line.length];
	const pieces: Array<[number, number]> = [];
	let cellStart = 0;
	for (const bound of bounds) {
		const a = Math.max(start, cellStart);
		const b = Math.min(to, bound);
		if (b > a) pieces.push([a, b]);
		cellStart = bound + 1;
	}
	return pieces;
}

/** Color the selected part of one line, piece by piece. */
export function colorLine(line: string, from: number, to: number, token: string, isMarker: IsMarker): LineEdit | null {
	let text = line;
	let shift = 0;
	let selFrom = -1;
	let selTo = -1;
	for (const [a, b] of segments(line, from, to)) {
		const edit = colorRange(text, a + shift, b + shift, token, isMarker);
		if (!edit) continue;
		shift += edit.text.length - text.length;
		text = edit.text;
		if (selFrom < 0) selFrom = edit.selFrom;
		selTo = edit.selTo;
	}
	return selFrom < 0 ? null : { text, selFrom, selTo };
}
