import { Plugin, debounce } from 'obsidian';
import { registerCommands } from './commands';
import { CollectLoose } from './commands/collect';
import { ListOrphans } from './commands/orphans';
import { SAVE_DEBOUNCE_MS } from './constants';
import { CoverWatcher } from './guard/cover-watcher';
import { CreateWatcher } from './guard/create-watcher';
import { guardNewAttachments } from './guard/new-attachments';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { AttachmentsGuardSettingTab } from './settings/settings-tab';
import type { AttachmentsGuardSettings } from './types';
import { Planner } from './vault/planner';
import { Rules } from './vault/rules';

export default class AttachmentsGuardPlugin extends Plugin {
	settings: AttachmentsGuardSettings = defaultSettings();
	readonly rules = new Rules(this);
	readonly planner = new Planner(this);
	readonly creations = new CreateWatcher(this);
	readonly covers = new CoverWatcher(this);
	readonly collect = new CollectLoose(this);
	readonly orphans = new ListOrphans(this);
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		guardNewAttachments(this);
		this.creations.register();
		this.covers.register();
		registerCommands(this);
		this.addSettingTab(new AttachmentsGuardSettingTab(this.app, this));
	}

	onunload(): void {
		this.creations.cancel();
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.saveSoon();
	}

	collectLoose(): void {
		void this.collect.run();
	}

	listOrphans(): void {
		void this.orphans.run();
	}
}
