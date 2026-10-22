import { Plugin, debounce } from 'obsidian';
import { SAVE_DEBOUNCE_MS } from './constants';
import { folderCss } from './css/folder-css';
import { registerFolderEvents } from './folder-events';
import { lucideSvg } from './icons';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { FolderStyleSettingTab } from './settings/settings-tab';
import { FolderStyleSheet } from './style-sheet';
import type { FolderStyleSettings, FolderStyles } from './types';

export default class FolderStylePlugin extends Plugin {
	settings: FolderStyleSettings = defaultSettings();
	/** Folders whose Lucide icon is missing, for the settings tab to flag. */
	missingIcons = new Set<string>();
	private readonly sheet = new FolderStyleSheet();
	private settingTab: FolderStyleSettingTab | null = null;
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.register(() => this.sheet.remove());
		this.refresh();

		this.sheet.attach(document);
		// The explorer can live in a popout window: already open ones, and those opened later.
		this.app.workspace.onLayoutReady(() => this.app.workspace.iterateAllLeaves((leaf) => this.sheet.attach(leaf.view.containerEl.doc)));
		this.registerEvent(this.app.workspace.on('window-open', (_win, window) => this.sheet.attach(window.document)));
		this.registerEvent(this.app.workspace.on('window-close', (_win, window) => this.sheet.detach(window.document)));

		registerFolderEvents(this);
		this.settingTab = new FolderStyleSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);
	}

	onunload(): void {
		this.saveSoon.run();
	}

	/** data.json changed on disk (e.g. synced from another device): use it instead of overwriting it. */
	async onExternalSettingsChange(): Promise<void> {
		this.saveSoon.cancel();
		this.settings = normalizeSettings(await this.loadData());
		this.refresh();
		this.refreshSettingTab();
	}

	settingsChanged(): void {
		this.refresh();
		this.saveSoon();
	}

	foldersChanged(folders: FolderStyles): void {
		this.settings.folders = folders;
		this.settingsChanged();
		this.refreshSettingTab();
	}

	refreshSettingTab(): void {
		this.settingTab?.update();
	}

	/** Regenerate the whole stylesheet from the settings. */
	refresh(): void {
		const { css, missingIcons } = folderCss(this.settings, lucideSvg);
		this.missingIcons = new Set(missingIcons);
		this.sheet.update(css);
	}
}
