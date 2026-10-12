import type { App, TFile } from 'obsidian';
import type { MediaKind } from '../types';
import { aliasesChanged, nextAliases, placeAliases } from './aliases';
import { frontmatterOf } from './catalog-note';
import { todayIso } from './dates';
import { addToHistory } from './history';
import { applyFinished, applyNewRun, currentRun } from './runs';
import type { NewRunChoice } from './runs';

/**
 * Changes to existing catalog notes. One processFrontMatter call each, which
 * keeps the rest of the note and of the YAML as it is; "New run" also adds
 * one line to the body with vault.process.
 */

/** `cover` becomes a URL, `[[<name>-cover.jpg]]` or "". */
export async function setCover(app: App, file: TFile, cover: string): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		frontmatter.cover = cover;
	});
}

/**
 * status: done, finished: today; rating set when not null, left untouched
 * when null. Today also joins `finished_dates` when the note has it (see applyFinished).
 */
export async function markFinished(app: App, file: TFile, rating: number | null): Promise<void> {
	const today = todayIso();
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		applyFinished(frontmatter, today, rating);
	});
}

/**
 * "New run": the current run goes first in `## Histórico` (one line added,
 * none when the section already lists it), then the properties start the
 * new run (see applyNewRun). The body goes first: if the second write fails,
 * running the command again does not repeat the line.
 */
export async function startNewRun(app: App, file: TFile, choice: NewRunChoice): Promise<void> {
	const run = currentRun(frontmatterOf(app, file) ?? {});
	await app.vault.process(file, (content) => addToHistory(content, run));
	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		applyNewRun(frontmatter, choice);
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
