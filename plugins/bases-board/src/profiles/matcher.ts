import { getAllTags } from 'obsidian';
import type { App, CachedMetadata, TFile } from 'obsidian';
import { archiveMatcher, folderOf, parsePattern, slugify } from '../patterns/pattern';
import type { ArchiveMatcher, ProjectInfo } from '../patterns/pattern';
import type { BoardProfile } from '../settings/model';

// ---- folder globs ----------------------------------------------------------

const globCache = new Map<string, RegExp>();

/** `**` any path, `*` any name part, `?` one character. */
export function globToRegex(glob: string): RegExp {
	const cached = globCache.get(glob);
	if (cached) return cached;
	let source = '';
	for (let i = 0; i < glob.length; i++) {
		const char = glob[i] ?? '';
		if (char === '*' && glob[i + 1] === '*') {
			source += '.*';
			i++;
		} else if (char === '*') {
			source += '[^/]*';
		} else if (char === '?') {
			source += '[^/]';
		} else {
			source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
		}
	}
	const regex = new RegExp(`^${source}$`, 'i');
	globCache.set(glob, regex);
	return regex;
}

/**
 * Whether a folder is inside a folder matched by the glob. Without "/", the
 * glob matches a folder name at any depth (`_Templates`); with "/", a path
 * from the vault root (`Work/Acme/**`).
 */
export function folderMatches(folderPath: string, glob: string): boolean {
	const g = glob.trim().replace(/^\/+|\/+$/g, '');
	if (g === '') return false;
	const segments = folderPath.split('/').filter(Boolean);
	if (!g.includes('/')) {
		const regex = globToRegex(g);
		return segments.some((segment) => regex.test(segment));
	}
	const regex = globToRegex(g);
	const base = g.endsWith('/**') ? globToRegex(g.slice(0, -3)) : null;
	for (let i = 1; i <= segments.length; i++) {
		const prefix = segments.slice(0, i).join('/');
		if (regex.test(prefix) || base?.test(prefix)) return true;
	}
	return false;
}

// ---- card recognition ------------------------------------------------------

/** Whether the note has the tag (nested tags like "card/x" match "card"). */
export function hasProfileTag(cache: CachedMetadata | null, tag: string): boolean {
	if (!cache) return false;
	const want = tag.replace(/^#/, '').toLowerCase();
	return (getAllTags(cache) ?? []).some((raw) => {
		const found = raw.replace(/^#/, '').toLowerCase();
		return found === want || found.startsWith(`${want}/`);
	});
}

/** Folders + tag of the profile. Needs the metadata cache (null → not a card). */
export function isProfileCard(file: TFile, cache: CachedMetadata | null, profile: BoardProfile): boolean {
	if (file.extension !== 'md') return false;
	const folder = folderOf(file.path);
	if (profile.excludeFolders.some((glob) => folderMatches(folder, glob))) return false;
	if (profile.includeFolders.length > 0 && !profile.includeFolders.some((glob) => folderMatches(folder, glob))) return false;
	if (profile.cardTag && !hasProfileTag(cache, profile.cardTag)) return false;
	return true;
}

/** Recognizer of the profile's archive folders, or null when the pattern is invalid. */
export function archiveMatcherOf(profile: BoardProfile): ArchiveMatcher | null {
	const parsed = parsePattern(profile.archive.folderPattern, 'archiveFolder');
	return parsed.ok ? archiveMatcher(parsed.pattern) : null;
}

/**
 * The profile whose archive folder holds this note (tag checked, include
 * folders not: a central archive usually lives outside them), or null.
 */
export function archivingProfile(file: TFile, cache: CachedMetadata | null, profiles: readonly BoardProfile[]): BoardProfile | null {
	const folder = folderOf(file.path);
	for (const profile of profiles) {
		if (!archiveMatcherOf(profile)?.test(folder)) continue;
		if (profile.cardTag && !hasProfileTag(cache, profile.cardTag)) continue;
		return profile;
	}
	return null;
}

// ---- frontmatter helpers ---------------------------------------------------

export function frontmatterOf(app: App, file: TFile): Record<string, unknown> {
	return app.metadataCache.getFileCache(file)?.frontmatter ?? {};
}

/** A frontmatter value as trimmed text (first item of a list). */
export function fmText(frontmatter: Record<string, unknown>, key: string): string {
	if (!key) return '';
	const raw = frontmatter[key];
	const value: unknown = Array.isArray(raw) ? raw[0] : raw;
	return scalarText(value);
}

/** Text of a scalar frontmatter value; objects and empty values give ''. */
export function scalarText(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	return '';
}

/** Card title: `title` property, or the file name. */
export function cardTitle(app: App, file: TFile): string {
	return fmText(frontmatterOf(app, file), 'title') || file.basename;
}

// ---- projects --------------------------------------------------------------

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/;

/** Project details of a project note. */
export function projectInfo(app: App, projectFile: TFile): ProjectInfo {
	const folder = folderOf(projectFile.path);
	const folderName = folder.split('/').pop() ?? '';
	const name = projectFile.basename === 'index' && folderName ? folderName : projectFile.basename;
	const slug = fmText(frontmatterOf(app, projectFile), 'slug') || slugify(name);
	return { path: projectFile.path, folder, slug, name };
}

/** The project note linked in the card's project property, if it resolves. */
export function projectOf(app: App, file: TFile, profile: BoardProfile): ProjectInfo | null {
	const text = fmText(frontmatterOf(app, file), profile.projectProperty);
	if (!text) return null;
	const linkpath = (WIKILINK.exec(text)?.[1] ?? text).trim();
	const dest = app.metadataCache.getFirstLinkpathDest(linkpath, file.path);
	return dest ? projectInfo(app, dest) : null;
}

/** Wikilink to a project, as the vault writes it: full path + slug alias. */
export function projectLink(project: ProjectInfo): string {
	return `[[${project.path.replace(/\.md$/i, '')}|${project.slug}]]`;
}
