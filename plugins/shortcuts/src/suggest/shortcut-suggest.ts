import { EditorSuggest, setIcon } from 'obsidian';
import type { App, Editor, EditorPosition, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import { CLS, MAX_SUGGESTIONS } from '../constants';
import type { ShortcutEngine } from '../engine';
import { t } from '../i18n';
import type { Suggestion } from '../types';
import { findTrigger } from './trigger';

export class ShortcutSuggest extends EditorSuggest<Suggestion> {
	constructor(
		app: App,
		private readonly engine: ShortcutEngine,
	) {
		super(app);
		this.limit = MAX_SUGGESTIONS;
		this.setInstructions([
			{ command: '↑↓', purpose: t('suggest.navigate') },
			{ command: '↵', purpose: t('suggest.insertLink') },
			{ command: 'esc', purpose: t('suggest.close') },
		]);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		if (!file) return null;
		const trigger = this.engine.trigger();
		const before = editor.getLine(cursor.line).slice(0, cursor.ch);
		if (!trigger || !before.includes(trigger)) return null;

		const match = findTrigger(before, trigger);
		if (!match || this.inFrontmatter(file, cursor.line)) return null;
		return { start: { line: cursor.line, ch: match.start }, end: cursor, query: match.query };
	}

	getSuggestions(context: EditorSuggestContext): Suggestion[] {
		return this.engine.search(context.query);
	}

	renderSuggestion(item: Suggestion, el: HTMLElement): void {
		el.addClass('mod-complex', CLS.suggestion);
		const content = el.createDiv({ cls: 'suggestion-content' });
		content.createDiv({ cls: 'suggestion-title', text: item.title });
		if (item.note) content.createDiv({ cls: 'suggestion-note', text: item.note });

		const aux = el.createDiv({ cls: 'suggestion-aux' });
		const flair = aux.createSpan({ cls: ['suggestion-flair', CLS.flair], attr: { 'aria-label': item.sourceName } });
		setIcon(flair, item.icon);
	}

	selectSuggestion(item: Suggestion): void {
		const context = this.context;
		if (!context) return;
		context.editor.replaceRange(item.insert, context.start, context.end);
		context.editor.setCursor({ line: context.start.line, ch: context.start.ch + item.insert.length });
		this.close();
	}

	/** Links typed in raw YAML would need quotes, so the frontmatter is left alone. */
	private inFrontmatter(file: TFile, line: number): boolean {
		const position = this.app.metadataCache.getFileCache(file)?.frontmatterPosition;
		return position !== undefined && line <= position.end.line;
	}
}
