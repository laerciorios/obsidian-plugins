import { Plugin, debounce } from 'obsidian';
import { SAVE_DEBOUNCE_MS } from './constants';
import { ShortcutEngine } from './engine';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { ShortcutsSettingTab } from './settings/settings-tab';
import { ShortcutSuggest } from './suggest/shortcut-suggest';
import type { ShortcutsSettings } from './types';

export default class ShortcutsPlugin extends Plugin {
	settings: ShortcutsSettings = defaultSettings();
	readonly engine = new ShortcutEngine(this.app, () => this.settings);
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.engine.register(this);
		this.registerEditorSuggest(new ShortcutSuggest(this.app, this.engine));
		this.addSettingTab(new ShortcutsSettingTab(this.app, this));
	}

	onunload(): void {
		this.saveSoon.run();
	}

	/** Called by the settings tab after every edit: rebuild the index lazily, save debounced. */
	settingsChanged(): void {
		this.engine.invalidate();
		this.saveSoon();
	}
}
