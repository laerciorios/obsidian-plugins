import { Plugin, debounce } from 'obsidian';
import type { DailyNotesSettings } from '@obsidian-plugins/core-plugins';
import { ButtonsBlock } from './blocks/buttons-block';
import { SummaryBlock } from './blocks/summary-block';
import { Changes } from './changes';
import { registerCommands } from './commands';
import { BUTTONS_BLOCK, HOVER_SOURCE, SAVE_DEBOUNCE_MS, SUMMARY_BLOCK } from './constants';
import { DailyNotes } from './daily/daily-notes';
import { LogWriter } from './log/writer';
import { Meetings } from './meetings/meetings';
import { ProjectIndex } from './projects/project-index';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { DailyWorkLogSettingTab } from './settings/settings-tab';
import type { DailyWorkLogSettings } from './types';

export default class DailyWorkLogPlugin extends Plugin {
	settings: DailyWorkLogSettings = defaultSettings();
	readonly changes = new Changes();
	readonly projects = new ProjectIndex(this.app, () => this.settings);
	readonly writer = new LogWriter(this.app, this.projects, () => this.settings);
	readonly meetings = new Meetings(this.app, this.projects, () => this.settings);
	readonly daily = new DailyNotes(this.app, () => this.changes.changed());
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.projects.register(this);
		this.changes.register(this);
		registerCommands(this);
		this.registerMarkdownCodeBlockProcessor(BUTTONS_BLOCK, (_source, el, ctx) => {
			ctx.addChild(new ButtonsBlock(el, this, ctx));
		});
		this.registerMarkdownCodeBlockProcessor(SUMMARY_BLOCK, (source, el, ctx) => {
			ctx.addChild(new SummaryBlock(el, this, source, ctx));
		});
		this.registerHoverLinkSource(HOVER_SOURCE, { display: 'Daily Work Log', defaultMod: true });
		this.addSettingTab(new DailyWorkLogSettingTab(this.app, this));
		this.app.workspace.onLayoutReady(() => void this.daily.refresh());
	}

	onunload(): void {
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.projects.invalidate();
		this.changes.changed();
		this.saveSoon();
	}

	readDailySettings(): Promise<DailyNotesSettings> {
		return this.daily.refresh();
	}
}
