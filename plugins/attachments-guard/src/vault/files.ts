import { normalizePath } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { TRASH_FOLDER } from '../constants';

/** `<folder>/<name>`. */
export function joinPath(folder: string, name: string): string {
	return normalizePath(folder ? `${folder}/${name}` : name);
}

/** Parent folder of a vault path ("" at the root). */
export function parentPath(path: string): string {
	return path.slice(0, Math.max(path.lastIndexOf('/'), 0));
}

/** Create the folder (and its parents) when missing. */
export async function ensureFolder(app: App, folder: string): Promise<void> {
	if (!folder || app.vault.getFolderByPath(folder)) return;
	try {
		await app.vault.createFolder(folder);
	} catch (error) {
		// Created in the meantime (two files moved at once): fine.
		if (!app.vault.getFolderByPath(folder)) throw error;
	}
}

/** Move with `fileManager.renameFile`, which rewrites every link to the file. */
export async function moveFile(app: App, file: TFile, path: string): Promise<void> {
	await ensureFolder(app, parentPath(path));
	await app.fileManager.renameFile(file, path);
}

/**
 * Move to `.trash/<original path>`, never deleting. Obsidian's own local trash
 * drops the folder (`.trash/<name>`); the vault rule keeps it, so the file can
 * go back where it was. Falls back to the user's trash setting if the move fails.
 */
export async function moveToTrash(app: App, file: TFile): Promise<void> {
	const adapter = app.vault.adapter;
	const folder = joinPath(TRASH_FOLDER, parentPath(file.path));
	let target = joinPath(folder, file.name);
	for (let index = 2; await adapter.exists(target); index++) {
		target = joinPath(folder, `${file.basename} ${index}.${file.extension}`);
	}
	try {
		let current = '';
		for (const part of folder.split('/')) {
			current = current ? `${current}/${part}` : part;
			if (!(await adapter.exists(current))) await adapter.mkdir(current);
		}
		await adapter.rename(file.path, target);
	} catch (error) {
		console.error('Attachments Guard: could not move to .trash/, using the trash setting', error);
		await app.fileManager.trashFile(file);
	}
}

export function logError(error: unknown): void {
	console.error('Attachments Guard:', error);
}
