import { Plugin, debounce } from 'obsidian';
import { SAVE_DEBOUNCE_MS } from './constants';
import { folderCss } from './css/folder-css';
import { registerFolderEvents } from './folder-events';
import { usedSvgPaths } from './folders';
import { lucideSvg } from './icons';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { FolderStyleSettingTab } from './settings/settings-tab';
import { FolderStyleSheet } from './style-sheet';
import { VaultSvgs } from './svg-files';
import type { FolderStyle, FolderStyleSettings, FolderStyles, SvgProblem } from './types';
import { registerFolderMenu } from './ui/folder-menu';

export default class FolderStylePlugin extends Plugin {
	settings: FolderStyleSettings = defaultSettings();
	/** Folders whose Lucide icon is missing, for the settings tab to flag. */
	missingIcons = new Set<string>();
	/** Folders whose vault SVG cannot be drawn, and why, for the settings tab to flag. */
	svgProblems: Record<string, SvgProblem> = {};
	readonly svgs = new VaultSvgs(this.app.vault);
	/** SVGs are read only once the vault has listed its files (until then `getFileByPath` may miss them). */
	private canReadSvgs = false;
	private readonly sheet = new FolderStyleSheet();
	private settingTab: FolderStyleSettingTab | null = null;
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.register(() => this.sheet.remove());
		this.refresh();
		this.app.workspace.onLayoutReady(() => {
			this.canReadSvgs = true;
			this.refresh();
		});

		this.sheet.attach(document);
		// The explorer can live in a popout window: already open ones, and those opened later.
		this.app.workspace.onLayoutReady(() => this.app.workspace.iterateAllLeaves((leaf) => this.sheet.attach(leaf.view.containerEl.doc)));
		this.registerEvent(this.app.workspace.on('window-open', (_win, window) => this.sheet.attach(window.document)));
		this.registerEvent(this.app.workspace.on('window-close', (_win, window) => this.sheet.detach(window.document)));

		registerFolderEvents(this);
		registerFolderMenu(this);
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

	/** Customize one folder; null removes its customization. */
	setFolderStyle(path: string, style: FolderStyle | null): void {
		const { [path]: _previous, ...others } = this.settings.folders;
		this.foldersChanged(style ? { ...others, [path]: style } : others);
	}

	refreshSettingTab(): void {
		this.settingTab?.update();
	}

	forgetSvg(path: string): void {
		this.svgs.forget(path);
	}

	/**
	 * Regenerate the whole stylesheet from the settings. SVGs not read yet are left out, then
	 * read, and the stylesheet (and the warnings of the settings tab) generated again.
	 */
	refresh(): void {
		this.render();
		if (!this.canReadSvgs) return;
		const paths = [...usedSvgPaths(this.settings.folders)];
		if (paths.every((path) => this.svgs.lookup(path))) return;
		void this.svgs.load(paths).then(() => {
			this.render();
			this.refreshSettingTab();
		});
	}

	private render(): void {
		const { css, missingIcons, svgProblems } = folderCss(this.settings, { iconSvg: lucideSvg, vaultSvg: this.svgs.lookup });
		this.missingIcons = new Set(missingIcons);
		this.svgProblems = svgProblems;
		this.sheet.update(css);
	}
}
