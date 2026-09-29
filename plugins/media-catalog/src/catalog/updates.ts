import type { App, TFile } from 'obsidian';
import type { Status } from '../types';
import { todayIso } from './dates';

const DONE: Status = 'done';

/**
 * Changes to existing catalog notes. One processFrontMatter call each, which
 * keeps the rest of the note and of the YAML as it is.
 */

/** `cover` becomes a URL, `[[<name>-cover.jpg]]` or "". */
export async function setCover(app: App, file: TFile, cover: string): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter.cover = cover;
	});
}

/** status: done, finished: today; rating set when not null, left untouched when null. */
export async function markFinished(app: App, file: TFile, rating: number | null): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter.status = DONE;
		frontmatter.finished = todayIso();
		if (rating !== null) frontmatter.rating = rating;
	});
}
