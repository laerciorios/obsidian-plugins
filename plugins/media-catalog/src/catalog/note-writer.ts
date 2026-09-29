import { Notice, TFolder } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import type { CatalogDraft, CatalogSettings } from '../types';
import { downloadCover } from './cover-download';
import { baseName, findDuplicate } from './duplicates';
import { catalogFrontmatter } from './frontmatter';
import { folderPath, joinPath } from './paths';
import { ensureReferenceNote, referenceLink } from './reference-note';
import { seasonSuffix, slugify } from './slug';
import { noteBody } from './template';

export type CreateResult = { status: 'created'; file: TFile } | { status: 'duplicate'; file: TFile };

/** The catalog folder, created when missing. A file in its place is a setting error. */
async function ensureFolder(app: App, folder: string): Promise<string> {
	const path = folderPath(folder);
	if (path === '/') return path;
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFolder) return path;
	if (existing) {
		new Notice(t('notice.folderIsFile', { path }));
		throw new CatalogError(`${path} is a file`);
	}
	await app.vault.createFolder(path);
	return path;
}

/**
 * Note name candidates, in order: `<slug>`, then `<slug>-<year>`, then a
 * counter; series keep `-sNN` at the end (`<slug>-<year>-s01`, `<slug>-2-s01`).
 */
function* nameCandidates(draft: CatalogDraft): Generator<string> {
	const slug = slugify(draft.title);
	const suffix = draft.kind === 'series' && draft.season !== null ? seasonSuffix(draft.season) : '';
	yield baseName(draft.kind, draft.title, draft.season);
	const stem = draft.year !== null ? `${slug}-${draft.year}` : slug;
	if (draft.year !== null) yield `${stem}${suffix}`;
	for (let n = 2; ; n++) yield `${stem}-${n}${suffix}`;
}

/** First free `<folder>/<name>.md`. Existing files there are not duplicates (checked before). */
function freeName(app: App, folder: string, draft: CatalogDraft): string {
	for (const name of nameCandidates(draft)) {
		if (!app.vault.getAbstractFileByPath(joinPath(folder, `${name}.md`))) return name;
	}
	throw new CatalogError('no free note name');
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
 * Resolves slug/path (collision → "-<year>"), re-checks duplicates, downloads the cover when
 * draft.cover.download (failure → Notice + keeps URL), writes the note with a single
 * vault.create (creating the folder when missing), then creates the reference note when
 * draft.referenceArea (failure → Notice + `reference: ""`). Does NOT open the note.
 * Throws on unexpected failure.
 */
export async function createCatalogNote(app: App, settings: CatalogSettings, draft: CatalogDraft): Promise<CreateResult> {
	const folder = await ensureFolder(app, settings.folder);
	const duplicate = findDuplicate(app, folder, {
		kind: draft.kind,
		title: draft.title,
		season: draft.season,
		year: draft.year,
	});
	if (duplicate) return { status: 'duplicate', file: duplicate };

	const name = freeName(app, folder, draft);
	const path = joinPath(folder, `${name}.md`);
	// The cover value goes into the file, so the download comes first. If vault.create
	// fails afterwards, the image stays in the attachments (files are never deleted).
	const cover = await resolveCover(app, draft, name, path);
	const area = draft.kind === 'book' ? draft.referenceArea : null;
	// The link is known before the reference note exists, so it is written with the note.
	const reference = area ? referenceLink(area, name) : '';
	const body = await noteBody(app, settings, draft, name);
	const file = await app.vault.create(path, catalogFrontmatter(draft, { cover, reference }) + body);
	if (area) await createReference(app, draft, area, name, file);
	return { status: 'created', file };
}
