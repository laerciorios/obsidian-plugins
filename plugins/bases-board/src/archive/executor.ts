import type { App, TFile } from 'obsidian';
import { fmText, hasProfileTag } from '../profiles/matcher';
import type { BoardProfile } from '../settings/model';
import { availablePath, ensureFolder, waitForIndex } from '../vault/files';
import type { ArchivePlan, ProfileError, SkippedCard } from './planner';

export interface MovedCard {
	from: string;
	to: string;
	profile: BoardProfile;
	/** False when the metadata cache did not see the file again in time. */
	indexed: boolean;
}

export type FailReason = 'changed' | 'notDone' | 'error';

export interface FailedMove {
	path: string;
	reason: FailReason;
	/** Technical detail (console only). */
	detail?: string;
}

export interface ArchiveReport {
	moved: MovedCard[];
	skipped: SkippedCard[];
	errors: ProfileError[];
	failed: FailedMove[];
}

/** Value stored in the origin property for the vault root. */
export const ROOT_FOLDER = '/';

/** Tag still visible in the metadata cache: the board and Bases see the card. */
export function indexedAsCard(profile: BoardProfile): (app: App, file: TFile) => boolean {
	return (app, file) => !profile.cardTag || hasProfileTag(app.metadataCache.getFileCache(file), profile.cardTag);
}

/**
 * Carry out a plan. Moves only with fileManager.renameFile (links are
 * rewritten per the user's settings), creates missing folders, never
 * overwrites (name conflicts get "-1", "-2"…) and never deletes.
 */
export async function executePlan(app: App, plan: ArchivePlan, shouldStop: () => boolean = () => false): Promise<ArchiveReport> {
	const report: ArchiveReport = { moved: [], skipped: [...plan.skipped], errors: [...plan.errors], failed: [] };

	for (const move of plan.moves) {
		// Plugin unloaded (disabled, hot reload): stop between files.
		if (shouldStop()) break;
		const { file, profile } = move;
		if (file.path !== move.fromPath || app.vault.getFileByPath(move.fromPath) !== file) {
			report.failed.push({ path: move.fromPath, reason: 'changed' });
			continue;
		}
		// The user may have reopened the card since the plan (preview left open, sync…).
		const status = fmText(app.metadataCache.getFileCache(file)?.frontmatter ?? {}, profile.statusProperty);
		if (status !== profile.doneValue) {
			report.failed.push({ path: move.fromPath, reason: 'notDone' });
			continue;
		}
		try {
			const folder = await ensureFolder(app, move.toFolder);
			await app.fileManager.renameFile(file, availablePath(app, folder, file.basename, file.extension));
		} catch (error) {
			console.error('Bases Board: archive move failed', move.fromPath, error);
			report.failed.push({ path: move.fromPath, reason: 'error', detail: String(error) });
			continue;
		}
		// Frontmatter only after the move succeeded: a failed move leaves the note untouched.
		const origin = profile.archive.recordOriginProperty;
		if (origin) {
			try {
				await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					fm[origin] = move.fromFolder === '' ? ROOT_FOLDER : move.fromFolder;
				});
			} catch (error) {
				console.error('Bases Board: could not record the origin folder', file.path, error);
			}
		}
		const indexed = await waitForIndex(app, file, indexedAsCard(profile));
		report.moved.push({ from: move.fromPath, to: file.path, profile, indexed });
	}
	return report;
}
