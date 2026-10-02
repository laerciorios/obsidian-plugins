import { DAILY_NOTES_DEFAULTS, dailyNoteDate, readDailyNotesSettings } from '@obsidian-plugins/core-plugins';
import type { DailyNotesSettings } from '@obsidian-plugins/core-plugins';
import type { App } from 'obsidian';
import { DAY_FORMAT } from '../constants';

function sameSettings(a: DailyNotesSettings, b: DailyNotesSettings): boolean {
	return a.folder === b.folder && a.format === b.format && a.template === b.template;
}

/**
 * The daily notes as the core Daily notes plugin sees them. The settings are
 * cached so `current()` never waits on disk; the view refreshes them before
 * each rebuild (the file is tiny).
 */
export class DailyNotes {
	private settings: DailyNotesSettings = { ...DAILY_NOTES_DEFAULTS };
	private pending: Promise<boolean> | null = null;

	constructor(private readonly app: App) {}

	current(): DailyNotesSettings {
		return this.settings;
	}

	/** Read the settings again; true when they changed. */
	refresh(): Promise<boolean> {
		this.pending ??= readDailyNotesSettings(this.app)
			.then((settings) => {
				const changed = !sameSettings(settings, this.settings);
				this.settings = settings;
				return changed;
			})
			.finally(() => {
				this.pending = null;
			});
		return this.pending;
	}

	/** `YYYY-MM-DD` of a daily note, or null when the path is not one. */
	keyOf(path: string): string | null {
		return dailyNoteDate(this.settings, path)?.format(DAY_FORMAT) ?? null;
	}
}
