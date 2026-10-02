import {
	DAILY_NOTES_DEFAULTS,
	createDailyNote,
	dailyNoteDate,
	dailyNotePath,
	readDailyNotesSettings,
} from '@obsidian-plugins/core-plugins';
import type { DailyNotesSettings } from '@obsidian-plugins/core-plugins';
import { MarkdownView, Notice, TFile, moment } from 'obsidian';
import type { App } from 'obsidian';
import { DAILY_SETTINGS_TTL_MS } from '../constants';
import { t } from '../i18n';

function sameSettings(a: DailyNotesSettings, b: DailyNotesSettings): boolean {
	return a.folder === b.folder && a.format === b.format && a.template === b.template;
}

/**
 * The daily notes, as the core Daily notes plugin sees them. Its settings are
 * cached: `current()` never waits on disk, and a refresh that finds new values
 * calls `onChange` so the blocks redraw.
 */
export class DailyNotes {
	private settings: DailyNotesSettings = { ...DAILY_NOTES_DEFAULTS };
	private readAt = 0;
	private pending: Promise<DailyNotesSettings> | null = null;

	constructor(
		private readonly app: App,
		private readonly onChange: () => void,
	) {}

	current(): DailyNotesSettings {
		if (Date.now() - this.readAt > DAILY_SETTINGS_TTL_MS) void this.refresh();
		return this.settings;
	}

	refresh(): Promise<DailyNotesSettings> {
		this.pending ??= readDailyNotesSettings(this.app)
			.then((settings) => {
				this.readAt = Date.now();
				const changed = !sameSettings(settings, this.settings);
				this.settings = settings;
				if (changed) this.onChange();
				return settings;
			})
			.finally(() => {
				this.pending = null;
			});
		return this.pending;
	}

	/** The day of a daily note, or null when the file is not one. */
	dateOf(path: string): moment.Moment | null {
		return dailyNoteDate(this.current(), path);
	}

	/** Path of the daily note of a day, with the settings as they are now. */
	pathOf(date: moment.Moment): string {
		return dailyNotePath(this.current(), date);
	}

	/** Today's daily note, created from the template when it does not exist yet. */
	async today(): Promise<TFile> {
		const settings = await this.refresh();
		const date = moment();
		const path = dailyNotePath(settings, date);
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) return existing;
		if (existing) throw new Error(t('notice.dailyIsFolder', { path }));
		const { file, templateMissing } = await createDailyNote(this.app, settings, date);
		if (templateMissing) new Notice(t('notice.templateMissing', { path: settings.template }));
		return file;
	}

	/** Show the note: the tab that already has it, else the active tab (like the core command). */
	async open(file: TFile): Promise<void> {
		const { workspace } = this.app;
		const leaf = workspace
			.getLeavesOfType('markdown')
			.find((candidate) => candidate.view instanceof MarkdownView && candidate.view.file?.path === file.path);
		if (leaf) {
			await workspace.revealLeaf(leaf);
			workspace.setActiveLeaf(leaf, { focus: true });
			return;
		}
		await workspace.getLeaf(false).openFile(file);
	}
}
