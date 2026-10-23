import { TFile, TFolder } from 'obsidian';
import type { Plugin, TAbstractFile } from 'obsidian';
import { foldersAfterDelete, foldersAfterRename, foldersAfterSvgRename, usedSvgPaths } from './folders';
import type { FolderStyles } from './types';

export interface FolderEventsHost extends Plugin {
	settings: { folders: FolderStyles };
	/** The folder styles were replaced: regenerate, save and redraw the settings tab. */
	foldersChanged(folders: FolderStyles): void;
	/** Redraw the settings tab (a folder it warns about may exist again). */
	refreshSettingTab(): void;
	/** Drop what was read from this path: the file changed, moved or went. */
	forgetSvg(path: string): void;
	/** Regenerate the stylesheet, reading the SVGs not read yet. */
	refresh(): void;
}

/**
 * Renaming or moving a folder in Obsidian carries its style (and its subfolders') to the new
 * path; deleting it drops them. Obsidian also fires these events for each child, which then
 * finds nothing left to move. SVG files are followed too: editing a used one redraws it,
 * renaming or moving one points its folders to the new path, deleting one leaves the path
 * (flagged as missing in the settings tab).
 */
export function registerFolderEvents(plugin: FolderEventsHost): void {
	const usesSvg = (path: string) => usedSvgPaths(plugin.settings.folders).has(path);
	/** Any SVG may be in the cache (the picker reads them for its previews): forget it on every change. */
	const svgTouched = (file: TAbstractFile, path = file.path): boolean => {
		if (!(file instanceof TFile)) return false;
		if (file.extension === 'svg' || usesSvg(path)) plugin.forgetSvg(path);
		return usesSvg(path);
	};
	plugin.registerEvent(
		plugin.app.vault.on('rename', (file, oldPath) => {
			if (file instanceof TFile) {
				svgTouched(file, oldPath);
				const landedOnUsed = svgTouched(file);
				const folders = foldersAfterSvgRename(plugin.settings.folders, oldPath, file.path);
				if (folders) plugin.foldersChanged(folders);
				// A file moved onto a path a folder points to (e.g. a logo put back).
				else if (landedOnUsed) plugin.refresh();
				return;
			}
			if (!(file instanceof TFolder)) return;
			const folders = foldersAfterRename(plugin.settings.folders, oldPath, file.path);
			if (folders) plugin.foldersChanged(folders);
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on('delete', (file) => {
			if (svgTouched(file)) plugin.refresh();
			if (!(file instanceof TFolder)) return;
			const folders = foldersAfterDelete(plugin.settings.folders, file.path);
			if (folders) plugin.foldersChanged(folders);
		}),
	);
	plugin.registerEvent(
		plugin.app.vault.on('modify', (file) => {
			if (svgTouched(file)) plugin.refresh();
		}),
	);
	// After layout ready: the vault fires `create` for every file and folder while it loads.
	plugin.app.workspace.onLayoutReady(() =>
		plugin.registerEvent(
			plugin.app.vault.on('create', (file) => {
				if (file instanceof TFolder && file.path in plugin.settings.folders) plugin.refreshSettingTab();
				else if (svgTouched(file)) plugin.refresh();
			}),
		),
	);
}
