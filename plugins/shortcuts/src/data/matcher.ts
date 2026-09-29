import { getAllTags } from 'obsidian';
import type { CachedMetadata, TFile } from 'obsidian';
import type { NotesSourceConfig } from '../types';
import { splitList, toStrings } from './text';

/**
 * Folder spec without "/": a folder with that name at any depth ("_People").
 * With "/": a path prefix from the vault root ("Work/Acme"). Case-insensitive.
 */
export function matchesFolder(path: string, spec: string): boolean {
	const clean = spec.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
	if (!clean) return true;
	const lower = path.toLowerCase();
	if (clean.includes('/')) return lower.startsWith(`${clean}/`);
	const slash = lower.lastIndexOf('/');
	if (slash < 0) return false;
	return lower.slice(0, slash).split('/').includes(clean);
}

export function isExcluded(path: string, exclude: string[]): boolean {
	return exclude.some((spec) => spec.trim().length > 0 && matchesFolder(path, spec));
}

function matchesProperty(frontmatter: Record<string, unknown> | undefined, key: string, expected: string): boolean {
	const values = toStrings(frontmatter?.[key]);
	const wanted = splitList(expected).map((value) => value.toLowerCase());
	if (wanted.length === 0) return values.length > 0;
	return values.some((value) => wanted.includes(value.toLowerCase()));
}

function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#/, '').toLowerCase();
}

function matchesTag(cache: CachedMetadata | null, tag: string): boolean {
	if (!cache) return false;
	const wanted = normalizeTag(tag);
	return (getAllTags(cache) ?? []).some((raw) => {
		const current = normalizeTag(raw);
		return current === wanted || current.startsWith(`${wanted}/`);
	});
}

export function hasCriteria(source: NotesSourceConfig): boolean {
	const { folder, property, tag } = source.match;
	return [folder, property, tag].some((value) => value.trim().length > 0);
}

export function matchesSource(file: TFile, cache: CachedMetadata | null, source: NotesSourceConfig): boolean {
	if (isExcluded(file.path, source.exclude)) return false;
	const { folder, property, value, tag } = source.match;
	if (folder.trim() && !matchesFolder(file.path, folder)) return false;
	if (property.trim() && !matchesProperty(cache?.frontmatter, property.trim(), value)) return false;
	if (tag.trim() && !matchesTag(cache, tag)) return false;
	return true;
}
