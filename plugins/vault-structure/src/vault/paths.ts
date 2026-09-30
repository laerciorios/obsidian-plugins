import { normalizePath } from 'obsidian';

/** "/1 - Knowledge/" → "1 - Knowledge"; "" for the vault root. */
export function cleanPath(value: string): string {
	const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
	return trimmed ? normalizePath(trimmed) : '';
}

/** `<folder>/<name>`, with the vault root as "". */
export function joinPath(folder: string, name: string): string {
	return normalizePath(folder ? `${folder}/${name}` : name);
}

/** Parent folder of a vault path ("" at the root). */
export function parentPath(path: string): string {
	return path.slice(0, Math.max(path.lastIndexOf('/'), 0));
}

/** Last segment of a path. */
export function nameOf(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

/** The path itself or anything inside it. */
export function isInside(path: string, folder: string): boolean {
	return path === folder || path.startsWith(`${folder}/`);
}

export function isIgnored(path: string, ignore: readonly string[]): boolean {
	return ignore.some((entry) => isInside(path, entry));
}

/** Folders of the fixed vocabulary (`_Discovery`, `DB`…) are never areas or topics. */
export function isVocabulary(name: string, vocabulary: readonly string[]): boolean {
	return name.startsWith('_') || vocabulary.includes(name);
}

/** "a/_Discovery/AI Generated/b" is inside "_Discovery/AI Generated", at any depth. */
export function containsFolder(folderPath: string, folder: string): boolean {
	return folder !== '' && `/${folderPath}/`.includes(`/${folder}/`);
}

/**
 * The area a path belongs to: its folders up to the first vocabulary folder.
 * "1 - Knowledge/Game Dev/_References/Links" → "1 - Knowledge/Game Dev".
 */
export function ownerFolder(folderPath: string, vocabulary: readonly string[]): string {
	if (!folderPath) return '';
	const parts: string[] = [];
	for (const part of folderPath.split('/')) {
		if (isVocabulary(part, vocabulary)) break;
		parts.push(part);
	}
	return parts.join('/');
}

/**
 * Levels below the closest index root (1 = area, 2 = topic), or null when the
 * folder is not under a root or passes through a vocabulary folder.
 */
export function levelBelowRoot(path: string, rules: { indexRoots: readonly string[]; vocabulary: readonly string[] }): number | null {
	let best: number | null = null;
	for (const root of rules.indexRoots) {
		if (!isInside(path, root)) continue;
		const rest = path === root ? [] : path.slice(root.length + 1).split('/');
		if (rest.some((part) => isVocabulary(part, rules.vocabulary))) continue;
		if (best === null || rest.length < best) best = rest.length;
	}
	return best;
}
