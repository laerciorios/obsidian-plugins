import { normalizePath } from 'obsidian';
import type { App, TFolder } from 'obsidian';

/** A folder setting as a vault path; "" and "/" are the vault root (returned as "/"). */
export function folderPath(folder: string): string {
	const trimmed = folder.trim();
	return trimmed ? normalizePath(trimmed) : '/';
}

/** `<folder>/<name>`, without a leading "/" for the vault root. */
export function joinPath(folder: string, name: string): string {
	const base = folderPath(folder);
	return normalizePath(base === '/' ? name : `${base}/${name}`);
}

/** Parent folder of a vault path ("/" for files at the root). */
export function parentPath(path: string): string {
	const slash = path.lastIndexOf('/');
	return slash > 0 ? path.slice(0, slash) : '/';
}

/** Folder at a vault path, the root included. */
export function folderAt(app: App, folder: string): TFolder | null {
	const path = folderPath(folder);
	return path === '/' ? app.vault.getRoot() : app.vault.getFolderByPath(path);
}

/** Link path of a note (vault path without ".md"), as written inside `[[…]]`. */
export function linkPath(notePath: string): string {
	return notePath.replace(/\.md$/i, '');
}
