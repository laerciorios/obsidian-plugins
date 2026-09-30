/**
 * Blocks of a note and where their block ids ("^c-4f2a") go, following
 * Obsidian's rules: a paragraph or list item carries the id at the end of its
 * last line; a heading, table, code or math block, quote or callout carries it
 * on a line of its own right after the block, with a blank line before and
 * after. (An id at the end of a heading also works, but becomes part of the
 * heading text in the outline and in links; ids already there are reused.)
 *
 * Works on plain lines of text, so it sees the editor's unsaved content (the
 * metadata cache only knows the saved file).
 */

export type BlockKind = 'paragraph' | 'list' | 'heading' | 'structured';

/** A block as a range of lines, both ends included. */
export interface Block {
	kind: BlockKind;
	from: number;
	to: number;
}

export type AnchorPlan =
	| { type: 'existing'; id: string; block: Block }
	/** Insert `before + "^" + id + after` at the end of `line`. */
	| { type: 'insert'; block: Block; line: number; before: string; after: string }
	| { type: 'refused'; reason: 'frontmatter' | 'empty' };

type LineKind = 'blank' | 'frontmatter' | 'fenced' | 'heading' | 'list' | 'quote' | 'table' | 'rule' | 'anchor' | 'text';

export interface Classified {
	lines: readonly string[];
	kinds: LineKind[];
	/** For lines of fenced blocks (code, math, comments): the block's first and last line. */
	fences: Map<number, { from: number; to: number }>;
}

/** An id at the end of a line: "text ^c-4f2a". No lookbehind: iOS < 16.4 lacks it. */
const TRAILING_ID = /(^|\s)\^([A-Za-z0-9-]+)\s*$/;
/** A line holding only an id, the form used after structured blocks. */
const ID_LINE = /^\s*\^([A-Za-z0-9-]+)\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])(?:\s|$)/;
const HEADING = /^\s{0,3}#{1,6}(?:\s|$)/;
const QUOTE = /^\s{0,3}>/;
const TABLE = /^\s*\|/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;

function frontmatterEnd(lines: readonly string[]): number {
	if (lines[0]?.trimEnd() !== '---') return 0;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]?.trimEnd();
		if (line === '---' || line === '...') return i + 1;
	}
	return 0;
}

/** Where a fenced block opened at `from` closes (inclusive); the last line when never closed. */
function fenceClose(lines: readonly string[], from: number): number {
	const line = lines[from] ?? '';
	const trimmed = line.trim();
	const code = FENCE.exec(line)?.[1];
	for (let i = from + 1; i < lines.length; i++) {
		const current = lines[i] ?? '';
		if (code) {
			const marker = FENCE.exec(current)?.[1];
			if (marker && marker[0] === code[0] && marker.length >= code.length && current.trim() === marker) return i;
		} else if (trimmed.startsWith('$$')) {
			if (current.trimEnd().endsWith('$$')) return i;
		} else if (current.includes('%%')) {
			return i;
		}
	}
	return lines.length - 1;
}

/** Opens a multi-line fenced block: code, math ($$) or an Obsidian comment (%%). */
function opensFence(line: string): boolean {
	if (FENCE.test(line)) return true;
	const trimmed = line.trim();
	if (trimmed.startsWith('$$')) return trimmed.length < 4 || !trimmed.endsWith('$$');
	if (trimmed.startsWith('%%')) return !trimmed.slice(2).includes('%%');
	return false;
}

function isSingleLineMath(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.length >= 4 && trimmed.startsWith('$$') && trimmed.endsWith('$$');
}

export function classify(lines: readonly string[]): Classified {
	const kinds: LineKind[] = [];
	const fences = new Map<number, { from: number; to: number }>();
	const body = frontmatterEnd(lines);
	for (let i = 0; i < body; i++) kinds.push('frontmatter');
	for (let i = body; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (!line.trim()) kinds.push('blank');
		else if (opensFence(line)) {
			const to = fenceClose(lines, i);
			for (let j = i; j <= to; j++) {
				kinds.push('fenced');
				fences.set(j, { from: i, to });
			}
			i = to;
		} else if (isSingleLineMath(line)) {
			kinds.push('fenced');
			fences.set(i, { from: i, to: i });
		} else if (ID_LINE.test(line)) kinds.push('anchor');
		else if (HEADING.test(line)) kinds.push('heading');
		else if (QUOTE.test(line)) kinds.push('quote');
		else if (TABLE.test(line)) kinds.push('table');
		else if (RULE.test(line)) kinds.push('rule');
		else if (LIST_ITEM.test(line)) kinds.push('list');
		else kinds.push('text');
	}
	return { lines, kinds, fences };
}

function extend(kinds: readonly LineKind[], line: number, kind: LineKind): { from: number; to: number } {
	let from = line;
	let to = line;
	while (from > 0 && kinds[from - 1] === kind) from--;
	while (to + 1 < kinds.length && kinds[to + 1] === kind) to++;
	return { from, to };
}

/** A list item: its line plus the text lines that continue it. */
function listItem(kinds: readonly LineKind[], from: number): Block {
	let to = from;
	while (to + 1 < kinds.length && kinds[to + 1] === 'text') to++;
	return { kind: 'list', from, to };
}

/** The block containing `line`; null for blank lines and the frontmatter. */
export function blockAt(doc: Classified, line: number): Block | null {
	const { kinds } = doc;
	const kind = kinds[line];
	switch (kind) {
		case 'blank':
		case 'frontmatter':
		case undefined:
			return null;
		case 'fenced': {
			const fence = doc.fences.get(line);
			return fence ? { kind: 'structured', ...fence } : null;
		}
		case 'table':
		case 'quote':
			return { kind: 'structured', ...extend(kinds, line, kind) };
		case 'rule':
			return { kind: 'structured', from: line, to: line };
		case 'heading':
			return { kind: 'heading', from: line, to: line };
		case 'anchor': {
			// A lone id belongs to the block before it.
			let previous = line - 1;
			while (previous >= 0 && kinds[previous] === 'blank') previous--;
			return previous >= 0 && kinds[previous] !== 'anchor' ? blockAt(doc, previous) : null;
		}
		case 'list':
			return listItem(kinds, line);
		case 'text': {
			let from = line;
			while (from > 0 && kinds[from - 1] === 'text') from--;
			if (from > 0 && kinds[from - 1] === 'list') return listItem(kinds, from - 1);
			let to = line;
			while (to + 1 < kinds.length && kinds[to + 1] === 'text') to++;
			return { kind: 'paragraph', from, to };
		}
	}
	return null;
}

function ownLine(kind: BlockKind): boolean {
	return kind === 'structured' || kind === 'heading';
}

/** The id a block already carries, if any. */
export function existingId(doc: Classified, block: Block): string | null {
	const { lines, kinds } = doc;
	const trailing = block.kind === 'structured' ? null : TRAILING_ID.exec(lines[block.to] ?? '')?.[2];
	if (trailing || !ownLine(block.kind)) return trailing ?? null;
	let next = block.to + 1;
	if (kinds[next] === 'blank') next++;
	return kinds[next] === 'anchor' ? ID_LINE.exec(lines[next] ?? '')?.[1] ?? null : null;
}

/**
 * Where the anchor of a comment goes: the block where the selection starts
 * (skipping blank lines at its start). Reuses the block's id when it has one.
 */
export function planAnchor(lines: readonly string[], fromLine: number, toLine: number): AnchorPlan {
	const doc = classify(lines);
	let line = fromLine;
	while (line < toLine && doc.kinds[line] === 'blank') line++;
	if (doc.kinds[line] === 'frontmatter') return { type: 'refused', reason: 'frontmatter' };
	const block = blockAt(doc, line);
	if (!block) return { type: 'refused', reason: 'empty' };
	const id = existingId(doc, block);
	if (id) return { type: 'existing', id, block };
	if (!ownLine(block.kind)) return { type: 'insert', block, line: block.to, before: ' ', after: '' };
	const next = doc.kinds[block.to + 1];
	return { type: 'insert', block, line: block.to, before: '\n\n', after: next && next !== 'blank' ? '\n' : '' };
}

/** Where an id sits in the note: its line and its offsets inside that line. */
export interface IdPosition {
	line: number;
	/** Offset of the caret. */
	from: number;
	/** Offset after the id. */
	to: number;
	/** On a line of its own (after a structured block). */
	alone: boolean;
}

/** Every block id of the note, keyed in lower case (Obsidian matches ids case-insensitively). */
export function idsIn(doc: Classified): Map<string, IdPosition> {
	const ids = new Map<string, IdPosition>();
	doc.lines.forEach((line, index) => {
		const kind = doc.kinds[index];
		if (kind === 'frontmatter' || kind === 'fenced' || kind === 'blank') return;
		const alone = kind === 'anchor';
		const match = alone ? ID_LINE.exec(line) : TRAILING_ID.exec(line);
		const id = alone ? match?.[1] : match?.[2];
		if (!match || !id) return;
		const from = line.indexOf(`^${id}`, alone ? 0 : match.index);
		const key = id.toLowerCase();
		if (!ids.has(key)) ids.set(key, { line: index, from, to: from + id.length + 1, alone });
	});
	return ids;
}

/** The block an id belongs to. */
export function blockOfId(doc: Classified, position: IdPosition): Block | null {
	return blockAt(doc, position.line);
}

/** Selected text as a quote: without block ids, lone id lines and surrounding blank space. */
export function cleanQuote(text: string): string {
	return text
		.split('\n')
		.filter((line) => !ID_LINE.test(line))
		.map((line) => line.replace(TRAILING_ID, '$1').trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
