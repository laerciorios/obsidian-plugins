import { Notice } from 'obsidian';
import { misplacedTarget } from '../catalog/kind-folders';
import { ensureFolder } from '../catalog/note-writer';
import { joinPath } from '../catalog/paths';
import { t } from '../i18n';
import { CatalogError } from '../providers/errors';
import type { CatalogContext, CatalogNoteInfo } from '../types';

/** Folder "Move to the kind folder" would move the note to, or null when the command does not apply. */
export function kindFolderTarget(context: CatalogContext, note: CatalogNoteInfo): string | null {
	return misplacedTarget(context.app, context.settings, note.file.path, note.kind, note.title);
}

/**
 * "Move to the kind folder": a catalog or backlog note outside its kind
 * folder moves there with fileManager.renameFile (links are updated),
 * keeping its name; the folder is created when missing. A note with the
 * same name there stops it before anything changes. Resolves true once moved.
 */
export async function moveToKindFolder(context: CatalogContext, note: CatalogNoteInfo): Promise<boolean> {
	const { app } = context;
	const target = kindFolderTarget(context, note);
	if (!target) return false;
	try {
		const folder = await ensureFolder(app, target);
		const path = joinPath(folder, note.file.name);
		if (app.vault.getAbstractFileByPath(path)) {
			new Notice(t('notice.moveNameTaken', { path }));
			return false;
		}
		await app.fileManager.renameFile(note.file, path);
	} catch (error) {
		// Expected failures (a file where a folder should be) come with their own notice.
		if (!(error instanceof CatalogError)) {
			console.error('Media Catalog: could not move the note', error);
			new Notice(t('notice.moveFailed', { name: note.title }));
		}
		return false;
	}
	new Notice(t('notice.moved', { name: note.title, path: target }));
	return true;
}
