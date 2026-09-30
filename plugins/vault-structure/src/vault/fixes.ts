import type { App } from 'obsidian';
import type { Finding, VaultRules } from '../types';
import { hasIndex, isTaken, renamePath } from './files';
import { indexContent } from './index-note';
import { joinPath, parentPath } from './paths';

/** Findings fixed with one click (folders need a name typed by the user). */
export function isOneClick(finding: Finding): boolean {
	return finding.fix !== null && finding.fix.kind !== 'rename-folder';
}

/** Where a one-click fix leads: the new path of the note, or the index created. */
export function fixTarget(finding: Finding): string | null {
	const fix = finding.fix;
	return fix && fix.kind !== 'rename-folder' ? fix.to : null;
}

/**
 * Apply a one-click fix. Returns false when the finding no longer holds (the
 * file is gone or was fixed meanwhile); throws when the target is now taken.
 */
export async function applyFix(app: App, rules: VaultRules, finding: Finding): Promise<boolean> {
	const fix = finding.fix;
	if (!fix) return false;
	switch (fix.kind) {
		case 'move': {
			const file = app.vault.getFileByPath(finding.path);
			if (!file) return false;
			await renamePath(app, file, fix.to);
			return true;
		}
		case 'create-index': {
			const folder = app.vault.getFolderByPath(finding.path);
			if (!folder || hasIndex(folder)) return false;
			if (isTaken(app, fix.to)) throw new Error(`${fix.to} already exists`);
			await app.vault.create(fix.to, await indexContent(app, rules, folder.name));
			return true;
		}
		case 'rename-folder':
			return false;
	}
}

/** Rename a folder to the name the user confirmed. */
export async function renameFolder(app: App, path: string, name: string): Promise<boolean> {
	const folder = app.vault.getFolderByPath(path);
	if (!folder) return false;
	await renamePath(app, folder, joinPath(parentPath(path), name.trim()));
	return true;
}
