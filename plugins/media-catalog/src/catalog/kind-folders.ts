import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import { KIND_FOLDERS } from '../constants';
import type { Destination, MediaKind } from '../types';
import { isInFolder } from './backlog';
import { frontmatterOf, textOf } from './catalog-note';
import { folderAt, folderPath, joinPath } from './paths';
import { bareTitle } from './series-title';
import { slugify } from './slug';

/**
 * Kind folders: inside the catalog and backlog folders, every note lives in
 * the folder of its kind (`Movies/`, `Games/`, `Books/`, `Albums/`), and a
 * series season in the folder of its series (`Series/<name>/`).
 */

/** Characters Obsidian rejects in file and folder names; runs of `*` are handled apart. */
const REJECTED = /["\\/<>:|?]/g;

/**
 * Folder name of a series: its name without the characters Obsidian rejects
 * in names. `:` and `?` disappear, a run of `*` becomes "-", spaces collapse.
 * "Pokémon: Origins" → "Pokémon Origins", "What If…?" → "What If…". A name
 * with nothing left falls back to its slug.
 */
export function seriesFolderName(name: string): string {
	const clean = name.replace(/\*+/g, '-').replace(REJECTED, '').replace(/\s+/g, ' ').trim();
	return clean || slugify(name);
}

/** `<root>/<Kind>`, or `<root>/Series/<series>` for a series. */
export function kindFolder(root: string, kind: MediaKind, series: string | null = null): string {
	const folder = joinPath(root, KIND_FOLDERS[kind]);
	return kind === 'series' && series ? joinPath(folder, series) : folder;
}

/** Name of the series folder of a path (`<root>/Series/<name>/<file>` → name), else null. */
export function seriesFolderOf(path: string, root: string): string | null {
	const prefix = `${kindFolder(root, 'series')}/`;
	if (!path.startsWith(prefix)) return null;
	const parts = path.slice(prefix.length).split('/');
	return parts.length === 2 ? (parts[0] ?? null) : null;
}

/**
 * Folder name used by a season of this series already filed directly in
 * `<root>/Series/<name>/` (same series name, by slug), in the first root
 * that has one; null when none has. Reads the metadata cache only.
 */
export function existingSeriesFolder(app: App, roots: readonly string[], title: string): string | null {
	const wanted = slugify(bareTitle('series', title));
	for (const root of roots) {
		const series = folderAt(app, kindFolder(root, 'series'));
		if (!series) continue;
		for (const folder of series.children) {
			if (!(folder instanceof TFolder)) continue;
			for (const file of folder.children) {
				if (!(file instanceof TFile) || file.extension !== 'md') continue;
				const frontmatter = frontmatterOf(app, file);
				const name = textOf(frontmatter?.title);
				if (frontmatter?.kind === 'series' && name && slugify(bareTitle('series', name)) === wanted) return folder.name;
			}
		}
	}
	return null;
}

export interface FolderSettings {
	folder: string;
	backlogFolder: string;
}

function rootOf(settings: FolderSettings, destination: Destination): string {
	return destination === 'backlog' ? settings.backlogFolder : settings.folder;
}

/**
 * Folder a note of this kind goes to in the catalog or the backlog. A series
 * uses the folder of a season already filed (in the destination first, then
 * in the other folder), else its name made safe for a folder.
 */
export function destinationFolder(
	app: App,
	settings: FolderSettings,
	destination: Destination,
	kind: MediaKind,
	title: string,
): string {
	const root = rootOf(settings, destination);
	if (kind !== 'series') return kindFolder(root, kind);
	const other = rootOf(settings, destination === 'backlog' ? 'catalog' : 'backlog');
	const series = existingSeriesFolder(app, [root, other], title) ?? seriesFolderName(bareTitle('series', title));
	return kindFolder(root, kind, series);
}

/**
 * Whether a path is in the catalog or the backlog folder: the deeper of the
 * two when one is inside the other; null when in neither.
 */
export function destinationOf(path: string, settings: FolderSettings): Destination | null {
	const inCatalog = isInFolder(path, settings.folder);
	const inBacklog = isInFolder(path, settings.backlogFolder);
	if (inCatalog && inBacklog) {
		return folderPath(settings.backlogFolder).length >= folderPath(settings.folder).length ? 'backlog' : 'catalog';
	}
	return inBacklog ? 'backlog' : inCatalog ? 'catalog' : null;
}

/**
 * Folder a catalog or backlog note should move to, or null when it is
 * outside both folders or already in its kind folder. A season anywhere
 * directly in `<root>/Series/<name>/` is in place: its folder is not second-guessed.
 */
export function misplacedTarget(app: App, settings: FolderSettings, path: string, kind: MediaKind, title: string): string | null {
	const destination = destinationOf(path, settings);
	if (!destination) return null;
	const root = rootOf(settings, destination);
	const parent = path.slice(0, Math.max(path.lastIndexOf('/'), 0));
	if (kind === 'series' ? seriesFolderOf(path, root) !== null : parent === kindFolder(root, kind)) return null;
	return destinationFolder(app, settings, destination, kind, title);
}
