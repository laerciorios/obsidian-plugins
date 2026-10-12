import { Notice } from 'obsidian';
import type { TFile } from 'obsidian';
import { frontmatterOf, readCatalogNote } from '../catalog/catalog-note';
import { todayIso } from '../catalog/dates';
import { historyHasRun } from '../catalog/history';
import { currentRun, isDone } from '../catalog/runs';
import { startNewRun } from '../catalog/updates';
import { t } from '../i18n';
import type { CatalogContext } from '../types';
import { askNewRun } from './new-run-modal';

/** Values the modal starts with instead of today and the note's platform (empty ones are ignored). */
export interface NewRunPrefill {
	started?: string | null;
	platform?: string;
}

/**
 * "New run" on a catalog note, from the command or from the duplicate banner
 * of "Add to catalog". Only a done note starts a new run; any other gets a
 * notice and nothing changes. Resolves true once the new run is written.
 */
export async function newRun(context: CatalogContext, file: TFile, prefill: NewRunPrefill = {}): Promise<boolean> {
	const { app } = context;
	const note = readCatalogNote(app, file);
	if (!note) return false;
	const frontmatter = frontmatterOf(app, file);
	if (!isDone(frontmatter)) {
		new Notice(t('notice.newRunNotDone', { name: note.title }));
		return false;
	}

	const run = currentRun(frontmatter ?? {});
	const listed = historyHasRun(await app.vault.cachedRead(file), run);
	const choice = await askNewRun(app, {
		title: note.title,
		kind: note.kind,
		run,
		listed,
		defaults: {
			started: prefill.started || todayIso(),
			platform: prefill.platform?.trim() || run.platform,
		},
	});
	if (!choice) return false;

	try {
		await startNewRun(app, file, choice);
	} catch (error) {
		console.error('Media Catalog: could not start a new run', error);
		new Notice(t('notice.newRunFailed', { name: note.title }));
		return false;
	}
	new Notice(t('notice.newRun', { name: note.title }));
	return true;
}
