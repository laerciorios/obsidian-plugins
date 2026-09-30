import { Plugin, debounce } from 'obsidian';
import { registerCommands } from './commands';
import { SAVE_DEBOUNCE_MS } from './constants';
import { BulkUpdate } from './property/bulk';
import { PropertyWriter } from './property/writer';
import { defaultSettings, isOwnData, normalizeSettings } from './settings/settings';
import { ReadingTimeSettingTab } from './settings/settings-tab';
import { ReadingTimeTracker } from './tracker';
import type { Reading } from './tracker';
import type { ReadingTimeSettings } from './types';

export default class ReadingTimePlugin extends Plugin {
	settings: ReadingTimeSettings = defaultSettings();
	readonly tracker = new ReadingTimeTracker(this);
	readonly writer = new PropertyWriter(this);
	readonly bulk = new BulkUpdate(this, this.writer);
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		const saved: unknown = await this.loadData();
		this.settings = normalizeSettings(saved);
		// First run: save right away, so the suffix and template keep the language they were created in.
		if (!isOwnData(saved)) await this.saveData(this.settings);

		this.tracker.register();
		this.writer.register();
		registerCommands(this);
		this.addSettingTab(new ReadingTimeSettingTab(this.app, this));
	}

	onunload(): void {
		this.tracker.cancel();
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.saveSoon();
		this.tracker.refresh();
	}

	readActive(): Reading | null {
		return this.tracker.read();
	}

	updateAll(): void {
		void this.bulk.run();
	}
}
