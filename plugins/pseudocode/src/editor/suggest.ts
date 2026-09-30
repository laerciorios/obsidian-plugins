import { EditorSuggest } from 'obsidian';
import type { Editor, EditorPosition, EditorSuggestContext, EditorSuggestTriggerInfo, Plugin, TFile } from 'obsidian';
import { blockAt } from './blocks';
import { snippetsFor } from './snippets';
import type { Snippet } from './snippets';

const CURSOR = '$|';
const MAX_SUGGESTIONS = 30;

/** Whether the text before the cursor is inside `$...$` (then `\` starts a math command). */
function inMath(text: string): boolean {
	const dollars = text.replace(/\\\$/g, '').match(/\$/g)?.length ?? 0;
	return dollars % 2 === 1;
}

/** Commands of the block's dialect while typing `\` inside a `pseudo` block. */
export class PseudocodeSuggest extends EditorSuggest<Snippet> {
	private snippets: Snippet[] = [];

	constructor(plugin: Plugin) {
		super(plugin.app);
		this.limit = MAX_SUGGESTIONS;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
		const before = editor.getLine(cursor.line).slice(0, cursor.ch);
		const match = /\\([A-Za-z]*\*?)$/.exec(before);
		if (!match || inMath(before)) return null;
		const found = blockAt(editor, cursor.line);
		if (!found) return null;
		this.snippets = snippetsFor(found.source);
		return { start: { line: cursor.line, ch: cursor.ch - match[0].length }, end: cursor, query: match[1] ?? '' };
	}

	getSuggestions(context: EditorSuggestContext): Snippet[] {
		const query = `\\${context.query}`.toLowerCase();
		return this.snippets.filter((item) => item.label.toLowerCase().startsWith(query));
	}

	renderSuggestion(item: Snippet, el: HTMLElement): void {
		el.createDiv({ cls: 'psc-suggestion', text: item.label });
	}

	selectSuggestion(item: Snippet): void {
		const context = this.context;
		if (!context) return;
		const { editor, start, end } = context;
		const indent = /^\s*/.exec(editor.getLine(start.line))?.[0] ?? '';
		const text = item.insert.replace(/\n/g, `\n${indent}`);
		const at = text.indexOf(CURSOR);
		const inserted = text.replace(CURSOR, '');
		editor.replaceRange(inserted, start, end);
		// Cursor at the marker, or at the end of the first line.
		const offset = at >= 0 ? at : (inserted.split('\n')[0] ?? '').length;
		const lines = inserted.slice(0, offset).split('\n');
		const line = start.line + lines.length - 1;
		const ch = lines.length === 1 ? start.ch + offset : (lines[lines.length - 1] ?? '').length;
		editor.setCursor({ line, ch });
		this.close();
	}
}
