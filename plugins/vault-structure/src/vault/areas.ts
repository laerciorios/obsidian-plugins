import { TFolder } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { INDEX_NAME } from '../constants';
import type { VaultRules } from '../types';
import { ensureFolder } from './files';
import { indexContent } from './index-note';
import { isIgnored, isVocabulary, joinPath, levelBelowRoot } from './paths';

/** A folder that can receive a new level: level 0 is an index root (the new folder is an area). */
export interface ParentOption {
	path: string;
	level: number;
}

/** Deepest level that still receives a new area or topic (always at least the roots). */
function maxParentLevel(rules: VaultRules): number {
	return Math.max(rules.indexDepth, 1) - 1;
}

/** The level of `path` when a new area or topic may go inside it, else null. */
export function parentLevel(path: string, rules: VaultRules): number | null {
	if (isIgnored(path, rules.ignore)) return null;
	const level = levelBelowRoot(path, rules);
	return level !== null && level <= maxParentLevel(rules) ? level : null;
}

/** Roots (even missing ones: creating an area creates them) and their areas and topics that can receive a new level, in tree order. */
export function parentOptions(app: App, rules: VaultRules): ParentOption[] {
	const options = new Map<string, ParentOption>();
	const add = (path: string, level: number) => {
		const known = options.get(path);
		if (!known || level < known.level) options.set(path, { path, level });
	};
	const walk = (folder: TFolder, level: number) => {
		if (level >= maxParentLevel(rules)) return;
		const children = folder.children
			.filter((child): child is TFolder => child instanceof TFolder)
			.filter((child) => !isVocabulary(child.name, rules.vocabulary) && !isIgnored(child.path, rules.ignore))
			.sort((a, b) => a.name.localeCompare(b.name));
		for (const child of children) {
			add(child.path, level + 1);
			walk(child, level + 1);
		}
	};
	for (const root of rules.indexRoots) {
		if (isIgnored(root, rules.ignore)) continue;
		add(root, 0);
		const folder = app.vault.getFolderByPath(root);
		if (folder) walk(folder, 0);
	}
	return [...options.values()];
}

/** The deepest option that contains `path` (the active note or folder), else the first one. */
export function defaultParent(options: ParentOption[], path: string | null): string {
	let best: ParentOption | undefined;
	for (const option of options) {
		const contains = path !== null && (path === option.path || path.startsWith(`${option.path}/`));
		if (contains && (!best || option.path.length > best.path.length)) best = option;
	}
	return (best ?? options[0])?.path ?? '';
}

/** Create `<parent>/<name>/` with the scaffold and `index.md`; returns the index. */
export async function createArea(app: App, rules: VaultRules, parent: string, name: string): Promise<TFile> {
	const folder = joinPath(parent, name);
	await ensureFolder(app, folder);
	for (const subfolder of rules.scaffold) await ensureFolder(app, joinPath(folder, subfolder));
	return app.vault.create(joinPath(folder, INDEX_NAME), await indexContent(app, rules, name));
}
