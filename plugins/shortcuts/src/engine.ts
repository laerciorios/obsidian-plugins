import type { App, Plugin } from 'obsidian';
import { MAX_SUGGESTIONS } from './constants';
import { DailyNotesFormat } from './data/daily-format';
import { dateSuggestions } from './data/dates';
import { NoteIndex } from './data/note-index';
import type { SourcePreview } from './data/note-index';
import { rankSuggestions } from './data/search';
import type { NotesSourceConfig, ShortcutsSettings, Suggestion } from './types';

/** Everything the editor suggest and the settings tab need, behind one object. */
export class ShortcutEngine {
	private readonly index: NoteIndex;
	private readonly daily: DailyNotesFormat;

	constructor(
		app: App,
		private readonly settings: () => ShortcutsSettings,
	) {
		this.index = new NoteIndex(app, () => settings().sources);
		this.daily = new DailyNotesFormat(app);
	}

	register(plugin: Plugin): void {
		this.index.register(plugin);
		plugin.app.workspace.onLayoutReady(() => void this.daily.refresh());
	}

	trigger(): string {
		return this.settings().trigger;
	}

	/** The format used by date shortcuts: the one in the settings, or the Daily notes one. */
	dateFormat(): string {
		return this.settings().dates.format.trim() || this.daily.get();
	}

	dailyNotesFormat(): string {
		return this.daily.get();
	}

	invalidate(): void {
		this.index.invalidate();
	}

	preview(source: NotesSourceConfig, limit: number): SourcePreview {
		return this.index.preview(source, limit);
	}

	search(query: string): Suggestion[] {
		const { dates } = this.settings();
		const items = dates.enabled ? dateSuggestions(dates, this.dateFormat()) : [];
		items.push(...this.index.suggestions());
		return rankSuggestions(items, query, MAX_SUGGESTIONS);
	}
}
