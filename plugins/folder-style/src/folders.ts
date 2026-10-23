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

/** Vault SVG files used as symbols, by path. */
export function usedSvgPaths(folders: FolderStyles): Set<string> {
	const paths = new Set<string>();
	for (const style of Object.values(folders)) if (style.symbol?.kind === 'svg') paths.add(style.symbol.value);
	return paths;
}

/**
 * Styles after an SVG file is renamed or moved: every folder that used it points to the new
 * path (and keeps `tint`). Null when no folder used it.
 */
export function foldersAfterSvgRename(folders: FolderStyles, oldPath: string, newPath: string): FolderStyles | null {
	let changed = false;
	const next: FolderStyles = {};
	for (const [path, style] of Object.entries(folders)) {
		if (style.symbol?.kind === 'svg' && style.symbol.value === oldPath) {
			next[path] = { ...style, symbol: { ...style.symbol, value: newPath } };
			changed = true;
		} else next[path] = style;
	}
	return changed ? next : null;
}
