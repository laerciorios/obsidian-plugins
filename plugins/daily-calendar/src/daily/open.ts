import { createDailyNote, dailyNotePath } from '@obsidian-plugins/core-plugins';
import { Notice, TFile } from 'obsidian';
import type { App, PaneType, WorkspaceLeaf, moment } from 'obsidian';
import type { CalendarHost } from '../host';
import { t } from '../i18n';
import { confirmCreate } from '../view/confirm-modal';

/** Where to open, as `Keymap.isModEvent` says: false = the tab that already shows the note, else the current tab; true = a new tab. */
export type OpenIn = PaneType | boolean;

function leafShowing(app: App, path: string): WorkspaceLeaf | null {
	let found: WorkspaceLeaf | null = null;
	// The view state also covers tabs not loaded yet (deferred since Obsidian 1.7).
	app.workspace.iterateRootLeaves((leaf) => {
		const state = leaf.getViewState();
		if (!found && state.type === 'markdown' && state.state?.file === path) found = leaf;
	});
	return found;
}

/** Show a note: in a new tab/split/window when asked, else the tab that has it, else the current tab. */
export async function openNote(app: App, file: TFile, openIn: OpenIn): Promise<void> {
	const { workspace } = app;
	if (!openIn) {
		const leaf = leafShowing(app, file.path);
		if (leaf) {
			await workspace.revealLeaf(leaf);
			workspace.setActiveLeaf(leaf, { focus: true });
			return;
		}
	}
	await workspace.getLeaf(openIn).openFile(file);
}

/**
 * Open the daily note of a day; when it does not exist, create it from the
 * template of the core Daily notes plugin (after asking, if so configured).
 * Never overwrites: a folder in the way only shows a notice.
 */
export async function openDay(host: CalendarHost, date: moment.Moment, openIn: OpenIn): Promise<void> {
	const { app } = host;
	await host.daily.refresh();
	const daily = host.daily.current();
	const path = dailyNotePath(daily, date);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) return openNote(app, existing, openIn);
	if (existing) {
		new Notice(t('notice.dailyIsFolder', { path }));
		return;
	}
	if (host.settings.confirmCreate && !(await confirmCreate(app, date, path))) return;
	try {
		const { file, templateMissing } = await createDailyNote(app, daily, date);
		if (templateMissing) new Notice(t('notice.templateMissing', { path: daily.template }));
		await openNote(app, file, openIn);
	} catch (error) {
		console.error('Daily Calendar: could not create the daily note', error);
		new Notice(t('notice.createFailed', { path }));
	}
}
