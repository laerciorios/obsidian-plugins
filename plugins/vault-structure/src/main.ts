import { Plugin, debounce } from 'obsidian';
import { Actions } from './actions';
import { registerCommands, registerFolderMenu } from './commands';
import { SAVE_DEBOUNCE_MS } from './constants';
import { RulesFile } from './rules/rules-file';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { VaultStructureSettingTab } from './settings/settings-tab';
import type { VaultStructureSettings } from './types';

export default class VaultStructurePlugin extends Plugin {
	settings: VaultStructureSettings = defaultSettings();
	readonly rules = new RulesFile(this);
	readonly actions = new Actions(this);
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.rules.register();
		registerCommands(this);
		registerFolderMenu(this);
		this.addSettingTab(new VaultStructureSettingTab(this.app, this));
	}

	onunload(): void {
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.rules.pathChanged();
		this.saveSoon();
	}

	openRules(): void {
		void this.actions.openRules();
	}

	checkStructure(): void {
		this.actions.check();
	}

	newArea(): void {
		void this.actions.newArea();
	}
}
