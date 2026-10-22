import { Plugin } from 'obsidian';
import { folderCss } from './css/folder-css';
import { lucideSvg } from './icons';
import { defaultSettings, loadedSettings } from './settings';
import { FolderStyleSheet } from './style-sheet';
import type { FolderStyleSettings } from './types';

export default class FolderStylePlugin extends Plugin {
	settings: FolderStyleSettings = defaultSettings();
	/** Folders whose Lucide icon is missing, for the settings tab to flag. */
	missingIcons = new Set<string>();
	private readonly sheet = new FolderStyleSheet();

	async onload(): Promise<void> {
		this.settings = loadedSettings(await this.loadData());
		this.register(() => this.sheet.remove());
		this.refresh();

		this.sheet.attach(document);
		// The explorer can live in a popout window: already open ones, and those opened later.
		this.app.workspace.onLayoutReady(() => this.app.workspace.iterateAllLeaves((leaf) => this.sheet.attach(leaf.view.containerEl.doc)));
		this.registerEvent(this.app.workspace.on('window-open', (_win, window) => this.sheet.attach(window.document)));
		this.registerEvent(this.app.workspace.on('window-close', (_win, window) => this.sheet.detach(window.document)));
	}

	/** Regenerate the whole stylesheet from the settings. */
	refresh(): void {
		const { css, missingIcons } = folderCss(this.settings, lucideSvg);
		this.missingIcons = new Set(missingIcons);
		this.sheet.update(css);
	}
}
