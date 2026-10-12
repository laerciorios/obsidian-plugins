import type { App, TFile } from 'obsidian';
import type { MediaKind, Status } from '../types';
import { aliasesChanged, nextAliases, placeAliases } from './aliases';
import { frontmatterOf } from './catalog-note';
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

/**
 * `aliases` becomes the title, the alternative title (when it differs) and
 * every alias the note had (nextAliases); a note without the key gets it
 * right after `title`. False when nothing would change: the file is not written.
 */
export async function updateAliases(app: App, file: TFile, kind: MediaKind, localized: string | null): Promise<boolean> {
	const cached = frontmatterOf(app, file) ?? {};
	if (!aliasesChanged(cached.aliases, nextAliases(cached, kind, localized))) return false;
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		placeAliases(frontmatter, nextAliases(frontmatter, kind, localized));
	});
	return true;
}
