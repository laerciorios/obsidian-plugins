import { Notice, TFolder } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { BACKLOG_TAG, CATALOG_TAG } from '../constants';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import { tagList } from '../settings/settings';
import type { CatalogDraft, CatalogSettings, MediaKind } from '../types';
import { frontmatterOf } from './catalog-note';
import { downloadCover } from './cover-download';
import { todayIso } from './dates';
import { findInCatalogOrBacklog } from './duplicates';
import { catalogFrontmatter, tracksProperty } from './frontmatter';
import { destinationFolder } from './kind-folders';
import { folderPath, joinPath } from './paths';
import { ensureReferenceNote, referenceLink } from './reference-note';
import { bareTitle } from './series-title';
import { hasSlug, seasonSuffix, slugify } from './slug';
import { noteBody } from './template';

export type CreateResult = { status: 'created'; file: TFile } | { status: 'duplicate'; file: TFile };

/**
 * A folder, created when missing with every missing folder above it (the
 * catalog folder, a kind folder, a series folder). A file in its place is a
 * setting error.
 */
export async function ensureFolder(app: App, folder: string): Promise<string> {
	const path = folderPath(folder);
	if (path === '/') return path;
	let current = '';
	for (const part of path.split('/')) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (existing instanceof TFolder) continue;
		if (existing) {
			new Notice(t('notice.folderIsFile', { path: current }));
			throw new CatalogError(`${current} is a file`);
		}
		await app.vault.createFolder(current);
	}
	return path;
}

/** Who already has a note name, in the whole vault: nobody, a note of the same kind, or any other note. */
export type NameOwner = 'free' | 'same-kind' | 'other';

/**
 * Name of a new note, unique in the whole vault (Obsidian resolves links by
 * file name, not by folder). It starts as `<slug>` (series `<slug>-sNN`).
 * A name a note of another kind (or any other note) has gets the kind, once:
 * `<slug>-movie`. A name a note of the same kind has gets the year
 * (`<slug>-<year>`), then a counter (`<slug>-<year>-2`). Albums try the
 * artist before the year: `<slug>-<artist>`, then `<slug>-<artist>-<year>`;
 * a self-titled album (artist slug = title slug) skips the artist. Series
 * keep `-sNN` at the end (`<slug>-<year>-s01`, `<slug>-series-s01`). Movies
 * and books never put their directors or authors in the name.
 */
export function noteName(draft: CatalogDraft, ownerOf: (name: string) => NameOwner): string {
	const slug = slugify(bareTitle(draft.kind, draft.title));
	const suffix = draft.kind === 'series' && draft.season !== null ? seasonSuffix(draft.season) : '';
	// What a name taken by the same kind gets, in order.
	const steps: string[] = [];
	if (draft.kind === 'album' && hasSlug(draft.author)) {
		const artist = slugify(draft.author);
		if (artist !== slug) steps.push(artist);
	}
	if (draft.year !== null) steps.push(String(draft.year));

	let stem = slug;
	let kindAdded = false;
	let counter = 1;
	for (;;) {
		const name = `${stem}${counter > 1 ? `-${counter}` : ''}${suffix}`;
		const owner = ownerOf(name);
		if (owner === 'free') return name;
		if (owner === 'other' && !kindAdded && counter === 1) {
			stem = `${stem}-${draft.kind}`;
			kindAdded = true;
			continue;
		}
		const step = counter === 1 ? steps.shift() : undefined;
		if (step === undefined) counter++;
		else stem = `${stem}-${step}`;
	}
}

/**
 * NameOwner of every note name in the vault (names compared without case,
 * as links resolve them). Reads the file list and the metadata cache only.
 */
export function nameOwners(app: App, kind: MediaKind): (name: string) => NameOwner {
	const byName = new Map<string, TFile[]>();
	for (const file of app.vault.getMarkdownFiles()) {
		const key = file.basename.toLowerCase();
		byName.set(key, [...(byName.get(key) ?? []), file]);
	}
	return (name) => {
		const files = byName.get(name.toLowerCase());
		if (!files) return 'free';
		return files.some((file) => frontmatterOf(app, file)?.kind === kind) ? 'same-kind' : 'other';
	};
}

async function resolveCover(app: App, draft: CatalogDraft, name: string, path: string): Promise<string> {
	const url = draft.cover.url?.trim() ?? '';
	if (!url || !draft.cover.download) return url;
	try {
		return await downloadCover(app, url, name, path);
	} catch (error) {
		if (!(error instanceof CatalogError)) console.error('Media Catalog: cover download failed', error);
		new Notice(t('notice.downloadFailed'));
		return url;
	}
}

/**
 * Technical book: the reference note comes after the catalog note, so a failed
 * create leaves no orphan behind. When it cannot be created, the catalog note's
 * `reference` goes back to "" and a notice says so.
 */
async function createReference(app: App, draft: CatalogDraft, area: string, name: string, file: TFile): Promise<void> {
	try {
		await ensureReferenceNote(app, draft, area, name, file.path);
		return;
	} catch (error) {
		console.error('Media Catalog: reference note failed', error);
	}
	try {
		await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter.reference = '';
		});
	} catch (error) {
		console.error('Media Catalog: could not clear the reference link', error);
	}
	new Notice(t('notice.referenceFailed'));
}

/**
 * Re-checks duplicates in the catalog and backlog folders, resolves the
 * note name (unique in the vault, see noteName) and its kind folder in the
 * catalog or backlog folder (draft.destination, see destinationFolder), downloads the cover when
 * draft.cover.download (failure → Notice + keeps URL), writes the note (albums: with the tracklist) with a single
 * vault.create (creating the folders when missing), then creates the reference note when
 * draft.referenceArea (failure → Notice + `reference: ""`). Does NOT open the note.
 * Throws on unexpected failure.
 */
export async function createCatalogNote(app: App, settings: CatalogSettings, draft: CatalogDraft): Promise<CreateResult> {
	const backlog = draft.destination === 'backlog';
	// Both folders: an item already in the backlog is not filed again in the catalog, and the other way round.
	const duplicate = findInCatalogOrBacklog(app, settings, {
		kind: draft.kind,
		title: draft.title,
		season: draft.season,
		year: draft.year,
		author: draft.author,
	});
	if (duplicate) return { status: 'duplicate', file: duplicate };

	const name = noteName(draft, nameOwners(app, draft.kind));
	const folder = await ensureFolder(app, destinationFolder(app, settings, draft.destination, draft.kind, draft.title));
	const path = joinPath(folder, `${name}.md`);
	// The cover value goes into the file, so the download comes first. If vault.create
	// fails afterwards, the image stays in the attachments (files are never deleted).
	const cover = await resolveCover(app, draft, name, path);
	const area = draft.kind === 'book' && !backlog ? draft.referenceArea : null;
	// The link is known before the reference note exists, so it is written with the note.
	const reference = area ? referenceLink(area, name) : '';
	const body = await noteBody(app, settings, draft, name);
	const tracks = tracksProperty(draft, settings.albumTracksProperty);
	const added = backlog ? todayIso() : undefined;
	const tags = backlog ? tagList(settings.backlogTags, BACKLOG_TAG) : tagList(settings.catalogTags, CATALOG_TAG);
	const file = await app.vault.create(path, catalogFrontmatter(draft, { cover, reference, tracks, added, tags }) + body);
	if (area) await createReference(app, draft, area, name, file);
	return { status: 'created', file };
}
