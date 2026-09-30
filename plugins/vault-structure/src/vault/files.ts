import type { App, TAbstractFile, TFolder } from 'obsidian';
import { INDEX_NAME, README_BASENAME } from '../constants';
import { nameOf, parentPath } from './paths';

/** Create the folder (and its parents) when missing. */
export async function ensureFolder(app: App, folder: string): Promise<void> {
	if (!folder || app.vault.getFolderByPath(folder)) return;
	try {
		await app.vault.createFolder(folder);
	} catch (error) {
		// Created in the meantime: fine.
		if (!app.vault.getFolderByPath(folder)) throw error;
	}
}

/** Case-insensitive, because the file systems of macOS and Windows are. */
export function hasChild(folder: TFolder, name: string, except?: TAbstractFile): boolean {
	const wanted = name.toLowerCase();
	return folder.children.some((child) => child !== except && child.name.toLowerCase() === wanted);
}

/** Whether something other than `except` already uses this path. */
export function isTaken(app: App, path: string, except?: TAbstractFile): boolean {
	const parent = parentPath(path);
	const folder = parent ? app.vault.getFolderByPath(parent) : app.vault.getRoot();
	return folder !== null && hasChild(folder, nameOf(path), except);
}

export function hasIndex(folder: TFolder): boolean {
	return hasChild(folder, INDEX_NAME);
}

export function hasReadme(folder: TFolder): boolean {
	return folder.children.some((child) => child.name.toLowerCase() === `${README_BASENAME}.md`);
}

/**
 * Rename or move with `fileManager.renameFile`, which rewrites every link.
 * A change of case only ("Glossary.md" → "glossary.md") is not a collision:
 * Obsidian renames it in place (checked on 1.13.7, macOS).
 */
export async function renamePath(app: App, file: TAbstractFile, to: string): Promise<void> {
	if (file.path === to) return;
	if (isTaken(app, to, file)) throw new Error(`${to} already exists`);
	await ensureFolder(app, parentPath(to));
	await app.fileManager.renameFile(file, to);
}

export function logError(error: unknown): void {
	console.error('Vault Structure:', error);
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
