import { TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';
import type { MediaKind } from '../types';
import { frontmatterOf, numberOf, textOf } from './catalog-note';
import { folderAt } from './paths';
import { bareTitle } from './series-title';
import { hasSlug, seasonSuffix, slugify } from './slug';

export interface DuplicateQuery {
	kind: MediaKind;
	/** Series: the series name; a season at the end ("(S02)") is ignored. */
	title: string;
	season: number | null;
	/**
	 * Optional. When both this and the note have a year and they differ, the
	 * note is not a duplicate ("Fern Road" 1984 and "Fern Road" 2021 are two films).
	 * Ignored for books: Open Library gives the first publication year and
	 * Google Books the edition year, so one book can come with two years.
	 * Albums keep it: a self-titled band can release two albums with one title.
	 */
	year?: number | null;
	/**
	 * Compared for albums only: the artist, by slug. When both this and the
	 * note have one and they differ, the note is not a duplicate (two bands,
	 * one album title). An empty artist on either side does not decide.
	 * Movies and books carry their directors or authors here too, but title
	 * and year already tell their notes apart: they never decide.
	 */
	author?: string | null;
}

/**
 * Base name (no extension) a new note for this item gets before collisions:
 * `<slug>` or `<slug>-sNN`. Series slug the series name, never the season of
 * the title: "Horta Selvagem (S02)" and "Horta Selvagem" both give `horta-selvagem-s02`.
 */
export function baseName(kind: MediaKind, title: string, season: number | null): string {
	const slug = slugify(bareTitle(kind, title));
	return kind === 'series' && season !== null ? `${slug}${seasonSuffix(season)}` : slug;
}

function sameArtist(noteAuthor: unknown, wanted: string | null | undefined): boolean {
	const note = textOf(noteAuthor);
	const query = wanted?.trim() ?? '';
	if (!note || !hasSlug(note) || !hasSlug(query)) return true;
	return slugify(note) === slugify(query);
}

function sameEntry(frontmatter: Record<string, unknown>, query: DuplicateQuery, checkTitle: boolean): boolean {
	if (frontmatter.kind !== query.kind) return false;
	if (query.kind === 'series' && numberOf(frontmatter.season) !== query.season) return false;
	if (query.kind === 'album' && !sameArtist(frontmatter.author, query.author)) return false;
	if (query.kind !== 'book') {
		const year = numberOf(frontmatter.year);
		const wanted = query.year ?? null;
		if (wanted !== null && year !== null && year !== wanted) return false;
	}
	if (!checkTitle) return true;
	// Series notes keep the season in the title ("Horta Selvagem (S02)"); the season was compared above.
	const title = textOf(frontmatter.title);
	return title !== null && slugify(bareTitle(query.kind, title)) === slugify(bareTitle(query.kind, query.title));
}

/**
 * Existing catalog note with the same kind + normalized title (+ season, +
 * artist for albums), searched only inside `folder`, kind folders and any
 * other subfolder included. The note with the name a new note would take
 * counts too when kind (+ season, + artist) match, even if its title was
 * edited, and wins over a title match. Reads the metadata cache only, never the files.
 */
export function findDuplicate(app: App, folder: string, query: DuplicateQuery): TFile | null {
	const root = folderAt(app, folder);
	if (!root) return null;

	const name = baseName(query.kind, query.title, query.season).toLowerCase();
	let byTitle: TFile | null = null;
	const pending: TFolder[] = [root];
	for (let current = pending.pop(); current; current = pending.pop()) {
		for (const child of current.children) {
			if (child instanceof TFolder) {
				pending.push(child);
			} else if (child instanceof TFile && child.extension === 'md') {
				const frontmatter = frontmatterOf(app, child);
				if (!frontmatter) continue;
				if (child.basename.toLowerCase() === name && sameEntry(frontmatter, query, false)) return child;
				if (!byTitle && sameEntry(frontmatter, query, true)) byTitle = child;
			}
		}
	}
	return byTitle;
}

/** findDuplicate in the catalog folder, then in the backlog folder: an item lives in one of them. */
export function findInCatalogOrBacklog(
	app: App,
	settings: { folder: string; backlogFolder: string },
	query: DuplicateQuery,
): TFile | null {
	return findDuplicate(app, settings.folder, query) ?? findDuplicate(app, settings.backlogFolder, query);
}
