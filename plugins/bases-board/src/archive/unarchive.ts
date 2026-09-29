import type { App, TFile } from 'obsidian';
import { isOlderThan, parseDay } from '../data/dates';
import { folderOf, parsePattern, resolvePattern } from '../patterns/pattern';
import { archiveMatcherOf, archivingProfile, fmText, frontmatterOf, projectOf } from '../profiles/matcher';
import type { BoardProfile, BoardSettings } from '../settings/model';
import { availablePath, ensureFolder, waitForIndex } from '../vault/files';
import { ROOT_FOLDER, indexedAsCard } from './executor';

/**
 * The profile whose archive folder holds this note. Include folders are not
 * checked: a central archive usually lives outside them.
 */
export function archivedProfileOf(app: App, file: TFile, settings: BoardSettings): BoardProfile | null {
	if (file.extension !== 'md') return null;
	return archivingProfile(file, app.metadataCache.getFileCache(file), settings.profiles);
}

/**
 * Where an archived card goes back to: the recorded origin; else the folder
 * {cardFolder} stood for in the archive pattern ("X/Archived" → "X"); else the
 * new card folder of its project; else the parent of the archive folder.
 */
export function unarchiveTarget(app: App, file: TFile, profile: BoardProfile): string {
	const folder = folderOf(file.path);
	const originKey = profile.archive.recordOriginProperty;
	const origin = originKey ? fmText(frontmatterOf(app, file), originKey) : '';
	if (origin) return origin === ROOT_FOLDER ? '' : origin;

	const captured = archiveMatcherOf(profile)?.cardFolderOf(folder);
	if (captured !== null && captured !== undefined) return captured;

	const parsed = parsePattern(profile.newCard.folderPattern, 'newCardFolder');
	if (parsed.ok) {
		const resolved = resolvePattern(parsed.pattern, {
			project: projectOf(app, file, profile),
			title: fmText(frontmatterOf(app, file), 'title') || file.basename,
			now: new Date(),
		});
		if (resolved.ok) return resolved.value;
	}
	return folderOf(folder);
}

export interface UnarchiveResult {
	path: string;
	/** Still done and old enough: the next archive run will move it back. */
	willReturn: boolean;
}

/** Move an archived card back (status untouched). */
export async function unarchiveCard(app: App, file: TFile, profile: BoardProfile): Promise<UnarchiveResult> {
	const folder = await ensureFolder(app, unarchiveTarget(app, file, profile));
	await app.fileManager.renameFile(file, availablePath(app, folder, file.basename, file.extension, file));
	// Frontmatter only after the move succeeded.
	const originKey = profile.archive.recordOriginProperty;
	if (originKey && originKey in frontmatterOf(app, file)) {
		await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			delete fm[originKey];
		});
	}
	await waitForIndex(app, file, indexedAsCard(profile));
	const fm = frontmatterOf(app, file);
	const completed = parseDay(profile.completedProperty ? fm[profile.completedProperty] : undefined);
	const willReturn =
		profile.archive.enabled &&
		fmText(fm, profile.statusProperty) === profile.doneValue &&
		(completed === null ? profile.archive.missingCompleted === 'useModified' : isOlderThan(completed, profile.archive.afterDays, new Date()));
	return { path: file.path, willReturn };
}
