import type { Editor, EditorChange, EditorPosition } from 'obsidian';
import { CLOSING, opening } from '../syntax';
import { colorLine, colorRange, uncolorRange } from './transform';
import type { IsMarker, LineEdit } from './transform';

/**
 * Commands on the editor: they read the lines around the selection, run the
 * pure line transforms and apply every change in one transaction, so a single
 * undo reverts it. Lines never gain or lose line breaks, which keeps line
 * numbers stable while the edits are collected.
 */

const FENCE = /^\s*(`{3,}|~{3,})/;
const FRONTMATTER_END = /^(?:---|\.\.\.)\s*$/;

/** Frontmatter and fenced code lines in [fromLine, toLine]: coloring them has no visible effect. */
function codeLines(editor: Editor, fromLine: number, toLine: number): Set<number> {
	const skip = new Set<number>();
	const mark = (line: number) => {
		if (line >= fromLine && line <= toLine) skip.add(line);
	};
	let line = 0;
	if (editor.getLine(0).trimEnd() === '---') {
		mark(0);
		for (line = 1; line <= editor.lastLine(); line++) {
			mark(line);
			if (FRONTMATTER_END.test(editor.getLine(line))) break;
		}
		line++;
	}
	let fence: string | null = null;
	for (; line <= toLine; line++) {
		const text = editor.getLine(line);
		const match = FENCE.exec(text)?.[1];
		if (fence === null) {
			if (match) {
				fence = match;
				mark(line);
			}
			continue;
		}
		mark(line);
		if (match && match[0] === fence[0] && match.length >= fence.length && text.trim() === match) fence = null;
	}
	return skip;
}

/** The smallest change turning `before` into `after` on one line. */
function lineChange(line: number, before: string, after: string): EditorChange {
	let start = 0;
	while (start < before.length && start < after.length && before[start] === after[start]) start++;
	let end = 0;
	while (
		end < before.length - start &&
		end < after.length - start &&
		before[before.length - 1 - end] === after[after.length - 1 - end]
	) {
		end++;
	}
	return {
		from: { line, ch: start },
		to: { line, ch: before.length - end },
		text: after.slice(start, after.length - end),
	};
}

interface Batch {
	changes: EditorChange[];
	from: EditorPosition | null;
	to: EditorPosition | null;
}

function add(batch: Batch, line: number, before: string, edit: LineEdit): void {
	batch.changes.push(lineChange(line, before, edit.text));
	batch.from ??= { line, ch: edit.selFrom };
	batch.to = { line, ch: edit.selTo };
}

function commit(editor: Editor, batch: Batch): boolean {
	if (batch.changes.length === 0 || !batch.from || !batch.to) return false;
	editor.transaction({ changes: batch.changes, selection: { from: batch.from, to: batch.to } });
	return true;
}

function emptyBatch(): Batch {
	return { changes: [], from: null, to: null };
}

function colorAtCursor(editor: Editor, pos: EditorPosition, token: string, isMarker: IsMarker): boolean {
	if (codeLines(editor, pos.line, pos.line).has(pos.line)) return false;
	const text = editor.getLine(pos.line);
	const batch = emptyBatch();
	// Inside a highlight or legacy span: recolor it.
	const inside = colorRange(text, pos.ch, pos.ch, token, isMarker);
	if (inside) {
		add(batch, pos.line, text, inside);
		return commit(editor, batch);
	}
	// On a word: color the word.
	const word = editor.wordAt(pos);
	if (word && word.from.line === pos.line && word.to.ch > word.from.ch) {
		const edit = colorRange(text, word.from.ch, word.to.ch, token, isMarker);
		if (edit) {
			add(batch, pos.line, text, edit);
			return commit(editor, batch);
		}
	}
	// Nothing to wrap: open an empty colored highlight and leave the cursor inside it.
	const open = opening(token);
	const cursor = { line: pos.line, ch: pos.ch + open.length };
	editor.transaction({ changes: [{ from: pos, text: open + CLOSING }], selection: { from: cursor } });
	return true;
}

/** Color the selection (or the word or highlight under the cursor). False when nothing changed. */
export function colorSelection(editor: Editor, token: string, isMarker: IsMarker): boolean {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	if (from.line === to.line && from.ch === to.ch) return colorAtCursor(editor, from, token, isMarker);

	const skip = codeLines(editor, from.line, to.line);
	const batch = emptyBatch();
	for (let line = from.line; line <= to.line; line++) {
		if (skip.has(line)) continue;
		const text = editor.getLine(line);
		const a = line === from.line ? from.ch : 0;
		const b = line === to.line ? to.ch : text.length;
		const edit = b > a ? colorLine(text, a, b, token, isMarker) : null;
		if (edit) add(batch, line, text, edit);
	}
	return commit(editor, batch);
}

/** The line ranges of the selection; a cursor is one empty range. */
function selectedRanges(editor: Editor): Array<{ line: number; text: string; from: number; to: number }> {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const ranges = [];
	for (let line = from.line; line <= to.line; line++) {
		const text = editor.getLine(line);
		ranges.push({
			line,
			text,
			from: line === from.line ? from.ch : 0,
			to: line === to.line ? to.ch : text.length,
		});
	}
	return ranges;
}

/** Remove highlights and legacy color spans from the selection (or under the cursor). */
export function uncolorSelection(editor: Editor, isMarker: IsMarker): boolean {
	const batch = emptyBatch();
	for (const range of selectedRanges(editor)) {
		const edit = uncolorRange(range.text, range.from, range.to, isMarker);
		if (edit) add(batch, range.line, range.text, edit);
	}
	return commit(editor, batch);
}

/** Whether "Remove color" would change anything; used to hide it from the context menu. */
export function hasColor(editor: Editor, isMarker: IsMarker): boolean {
	const ranges = selectedRanges(editor);
	return ranges.some((range) => uncolorRange(range.text, range.from, range.to, isMarker) !== null);
}
