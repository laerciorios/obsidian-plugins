import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import type { MediaKind } from '../types';
import { frontmatterOf, numberOf, textOf } from './catalog-note';
import { folderAt, joinPath } from './paths';
import { seasonSuffix, slugify } from './slug';

export interface DuplicateQuery {
	kind: MediaKind;
	title: string;
	season: number | null;
	/**
	 * Optional. When both this and the note have a year and they differ, the
	 * note is not a duplicate ("Fern Road" 1984 and "Fern Road" 2021 are two films).
	 * Ignored for books: Open Library gives the first publication year and
	 * Google Books the edition year, so one book can come with two years.
	 */
	year?: number | null;
}

/** Base name (no extension) a new note for this item gets before collisions: `<slug>` or `<slug>-sNN`. */
export function baseName(kind: MediaKind, title: string, season: number | null): string {
	const slug = slugify(title);
	return kind === 'series' && season !== null ? `${slug}${seasonSuffix(season)}` : slug;
}

function sameEntry(frontmatter: Record<string, unknown>, query: DuplicateQuery, checkTitle: boolean): boolean {
	if (frontmatter.kind !== query.kind) return false;
	if (query.kind === 'series' && numberOf(frontmatter.season) !== query.season) return false;
	if (query.kind !== 'book') {
		const year = numberOf(frontmatter.year);
		const wanted = query.year ?? null;
		if (wanted !== null && year !== null && year !== wanted) return false;
	}
	if (!checkTitle) return true;
	const title = textOf(frontmatter.title);
	return title !== null && slugify(title) === slugify(query.title);
}

/**
 * Existing catalog note with the same kind + normalized title (+ season),
 * searched only inside `folder` (subfolders included). The note at the path a
 * new note would take counts too when kind (+ season) match, even if its title
 * was edited. Reads the metadata cache only, never the files.
 */
export function findDuplicate(app: App, folder: string, query: DuplicateQuery): TFile | null {
	const root = folderAt(app, folder);
	if (!root) return null;

	const target = app.vault.getFileByPath(joinPath(folder, `${baseName(query.kind, query.title, query.season)}.md`));
	if (target) {
		const frontmatter = frontmatterOf(app, target);
		if (frontmatter && sameEntry(frontmatter, query, false)) return target;
	}

	const pending: TFolder[] = [root];
	for (let current = pending.pop(); current; current = pending.pop()) {
		for (const child of current.children) {
			if (child instanceof TFolder) {
				pending.push(child);
			} else if (child instanceof TFile && child.extension === 'md') {
				const frontmatter = frontmatterOf(app, child);
				if (frontmatter && sameEntry(frontmatter, query, true)) return child;
			}
		}
	}
	return null;
}
