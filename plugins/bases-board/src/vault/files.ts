import { TFolder, normalizePath } from 'obsidian';
import type { App, TAbstractFile, TFile } from 'obsidian';
import { t } from '../i18n';

/** Existing file or folder with the same path ignoring case (APFS/NTFS are case-insensitive). */
function findIgnoringCase(app: App, path: string): TAbstractFile | null {
	const exact = app.vault.getAbstractFileByPath(path);
	if (exact) return exact;
	const slash = path.lastIndexOf('/');
	const parent = slash < 0 ? app.vault.getRoot() : app.vault.getFolderByPath(path.slice(0, slash));
	const name = (slash < 0 ? path : path.slice(slash + 1)).toLowerCase();
	return parent?.children.find((child) => child.name.toLowerCase() === name) ?? null;
}

/**
 * Create a folder and its missing parents; returns the folder's real path. An
 * existing folder that differs only in letter case is reused as it is
 * ("archived" for "Archived"), since the disk treats them as the same.
 * Throws if a file is in the way.
 */
export async function ensureFolder(app: App, path: string): Promise<string> {
	const clean = path === '' ? '' : normalizePath(path);
	if (clean === '' || clean === '/') return '';
	let current = '';
	for (const segment of clean.split('/')) {
		const wanted = current ? `${current}/${segment}` : segment;
		const existing = findIgnoringCase(app, wanted);
		if (existing instanceof TFolder) {
			current = existing.path;
			continue;
		}
		if (existing) throw new Error(t('error.fileInTheWay', { path: existing.path }));
		await app.vault.createFolder(wanted);
		current = wanted;
	}
	return current;
}

/** First free "<folder>/<base>.<ext>", then "<base>-1", "<base>-2"… Never overwrites. */
export function availablePath(app: App, folder: string, base: string, extension = 'md', self?: TFile): string {
	const prefix = folder === '' ? '' : `${normalizePath(folder)}/`;
	const taken = (path: string): boolean => {
		const existing = findIgnoringCase(app, path);
		return existing !== null && existing !== self;
	};
	let candidate = `${prefix}${base}.${extension}`;
	for (let i = 1; taken(candidate); i++) candidate = `${prefix}${base}-${i}.${extension}`;
	return candidate;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Wait until the metadata cache has the (moved) file again and `ready` accepts
 * it. Returns false after the timeout, so the caller can report it.
 */
export async function waitForIndex(app: App, file: TFile, ready: (app: App, file: TFile) => boolean, timeoutMs = 3000): Promise<boolean> {
	for (let waited = 0; waited <= timeoutMs; waited += 100) {
		if (app.metadataCache.getFileCache(file) && ready(app, file)) return true;
		await sleep(100);
	}
	return false;
}
