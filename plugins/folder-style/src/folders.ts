import type { FolderStyles } from './types';

/** The path is the folder itself or something under it. */
export function isInside(path: string, folder: string): boolean {
	return path === folder || path.startsWith(`${folder}/`);
}

/**
 * Styles after a folder is renamed or moved from `oldPath` to `newPath`: the folder and every
 * subfolder take the new prefix. Entries already under `newPath` (left by a folder deleted
 * outside Obsidian) give way to the moved ones. Null when no key changes.
 */
export function foldersAfterRename(folders: FolderStyles, oldPath: string, newPath: string): FolderStyles | null {
	if (!Object.keys(folders).some((path) => isInside(path, oldPath))) return null;
	const next: FolderStyles = {};
	for (const [path, style] of Object.entries(folders)) {
		if (!isInside(path, oldPath) && !isInside(path, newPath)) next[path] = style;
	}
	for (const [path, style] of Object.entries(folders)) {
		if (isInside(path, oldPath)) next[newPath + path.slice(oldPath.length)] = style;
	}
	return next;
}

/** Styles after a folder is deleted: the folder and every subfolder go. Null when none had a style. */
export function foldersAfterDelete(folders: FolderStyles, deletedPath: string): FolderStyles | null {
	const next = Object.fromEntries(Object.entries(folders).filter(([path]) => !isInside(path, deletedPath)));
	return Object.keys(next).length === Object.keys(folders).length ? null : next;
}
