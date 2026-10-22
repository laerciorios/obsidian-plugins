import { TFolder } from 'obsidian';
import type { Plugin } from 'obsidian';
import { foldersAfterDelete, foldersAfterRename } from './folders';
import type { FolderStyles } from './types';

export interface FolderEventsHost extends Plugin {
	settings: { folders: FolderStyles };
	/** The folder styles were replaced: regenerate, save and redraw the settings tab. */
	foldersChanged(folders: FolderStyles): void;
	/** Redraw the settings tab (a folder it warns about may exist again). */
	refreshSettingTab(): void;
}

/**
 * Renaming or moving a folder in Obsidian carries its style (and its subfolders') to the new
 * path; deleting it drops them. Obsidian also fires these events for each child, which then
 * finds nothing left to move.
 */
export function registerFolderEvents(plugin: FolderEventsHost): void {
	plugin.registerEvent(
		plugin.app.vault.on('rename', (file, oldPath) => {
			if (!(file instanceof TFolder)) return;
			const folders = foldersAfterRename(plugin.settings.folders, oldPath, file.path);
			if (folders) plugin.foldersChanged(folders);
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on('delete', (file) => {
			if (!(file instanceof TFolder)) return;
			const folders = foldersAfterDelete(plugin.settings.folders, file.path);
			if (folders) plugin.foldersChanged(folders);
		}),
	);
	// After layout ready: the vault fires `create` for every folder while it loads.
	plugin.app.workspace.onLayoutReady(() =>
		plugin.registerEvent(
			plugin.app.vault.on('create', (file) => {
				if (file instanceof TFolder && file.path in plugin.settings.folders) plugin.refreshSettingTab();
			}),
		),
	);
}
