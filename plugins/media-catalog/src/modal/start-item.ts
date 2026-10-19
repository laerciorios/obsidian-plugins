import { Notice } from 'obsidian';
import type { TFile } from 'obsidian';
import { albumSourceOf, applyStart, setAfter, startBody } from '../catalog/backlog';
import { readCatalogNote } from '../catalog/catalog-note';
import { todayIso } from '../catalog/dates';
import { ensureFolder } from '../catalog/note-writer';
import { joinPath } from '../catalog/paths';
import { renderTracklist, replaceTracklistSection } from '../catalog/tracklist';
import { ALBUM_TRACKS_KEY, BACKLOG_TAG, CATALOG_TAG } from '../constants';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import { tagList } from '../settings/settings';
import type { CatalogContext, CatalogNoteInfo, Track } from '../types';
import { CatalogModal } from './catalog-modal';

/**
 * Tracks of a started album, from the source line of the note (the album
 * the note was created from). Null when the note has no such line or the
 * source fails or lists none.
 */
async function sourceTracks(context: CatalogContext, note: CatalogNoteInfo): Promise<Track[] | null> {
	const ref = albumSourceOf(await context.app.vault.cachedRead(note.file));
	const provider = ref && context.providers.find((candidate) => candidate.id === ref.provider);
	if (!ref || !provider?.tracks) return null;
	try {
		const result = { provider: ref.provider, externalId: ref.externalId, kind: note.kind, title: note.title };
		const tracks = await provider.tracks(result);
		return tracks.length > 0 ? tracks : null;
	} catch (error) {
		if (!(error instanceof CatalogError)) console.error('Media Catalog: could not load the tracks', error);
		return null;
	}
}

/**
 * Albums get their `## Faixas` when they start, as new catalog notes do
 * (setting on). Without the tracks from the source line, "Update album
 * tracks" opens so the user picks the album.
 */
async function addTracks(context: CatalogContext, note: CatalogNoteInfo): Promise<void> {
	const { app, settings } = context;
	const tracks = await sourceTracks(context, note);
	if (!tracks) {
		new Notice(t('notice.startPickAlbum', { name: note.title }));
		new CatalogModal(context, { mode: 'tracks', note }).open();
		return;
	}
	const section = renderTracklist(tracks, t);
	await app.vault.process(note.file, (content) => replaceTracklistSection(content, section));
	if (settings.albumTracksProperty) {
		await app.fileManager.processFrontMatter(note.file, (frontmatter: Record<string, unknown>) => {
			setAfter(frontmatter, ALBUM_TRACKS_KEY, tracks.length, 'year');
		});
	}
}

/**
 * "Start backlog item": the note moves to the catalog folder with
 * fileManager.renameFile (links are updated), keeping its name; then
 * `status: in-progress`, `started` = today, no `priority` or
 * `recommended_by` (`added` stays), the backlog tags become the catalog
 * tags, and `## Por que quero` becomes
 * `## Impressões`. Albums then get their tracklist. A note with the same
 * name in the catalog folder stops it before anything changes. Resolves
 * true once the note is moved and updated.
 */
export async function startBacklogItem(context: CatalogContext, file: TFile): Promise<boolean> {
	const { app, settings } = context;
	const note = readCatalogNote(app, file);
	if (!note) return false;
	try {
		const folder = await ensureFolder(app, settings.folder);
		const target = joinPath(folder, file.name);
		if (app.vault.getAbstractFileByPath(target)) {
			new Notice(t('notice.startNameTaken', { path: target }));
			return false;
		}
		await app.fileManager.renameFile(file, target);
		await app.vault.process(file, startBody);
		const today = todayIso();
		const tags = { backlog: tagList(settings.backlogTags, BACKLOG_TAG), catalog: tagList(settings.catalogTags, CATALOG_TAG) };
		await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			applyStart(frontmatter, today, tags);
		});
	} catch (error) {
		// Expected failures (the folder setting points to a file) come with their own notice.
		if (!(error instanceof CatalogError)) {
			console.error('Media Catalog: could not start the backlog item', error);
			new Notice(t('notice.startFailed', { name: note.title }));
		}
		return false;
	}
	new Notice(t('notice.started', { name: note.title }));

	if (note.kind === 'album' && settings.albumTracklist) {
		try {
			await addTracks(context, note);
		} catch (error) {
			console.error('Media Catalog: could not add the tracks', error);
			new Notice(t('notice.tracksFailed', { name: note.title }));
		}
	}
	return true;
}
