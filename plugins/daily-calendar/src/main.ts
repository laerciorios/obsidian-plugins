import { Plugin, debounce } from 'obsidian';
import { ICON, SAVE_DEBOUNCE_MS, VIEW_TYPE } from './constants';
import { DailyNotes } from './daily/daily-notes';
import type { CalendarHost } from './host';
import { t } from './i18n';
import { defaultSettings, normalizeSettings } from './settings/settings';
import { DailyCalendarSettingTab } from './settings/settings-tab';
import type { DailyCalendarSettings } from './types';
import { CalendarView } from './view/calendar-view';

export default class DailyCalendarPlugin extends Plugin implements CalendarHost {
	settings: DailyCalendarSettings = defaultSettings();
	readonly daily = new DailyNotes(this.app);
	private readonly saveSoon = debounce(() => void this.saveData(this.settings), SAVE_DEBOUNCE_MS, true);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.registerView(VIEW_TYPE, (leaf) => new CalendarView(leaf, this));
		// Command ids are stable API (hotkeys are saved by id): never rename them.
		this.addCommand({ id: 'open-calendar', name: t('command.open'), icon: ICON, callback: () => void this.openCalendar() });
		this.addRibbonIcon(ICON, t('command.open'), () => void this.openCalendar());
		this.addSettingTab(new DailyCalendarSettingTab(this.app, this));
	}

	onunload(): void {
		this.saveSoon.run();
	}

	settingsChanged(): void {
		this.saveSoon();
		for (const view of this.views()) view.refresh();
	}

	/** Open (or reveal) the calendar in the right sidebar, without taking the focus. */
	async openCalendar(): Promise<void> {
		const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE, 'right', { active: false, reveal: true });
		await leaf.loadIfDeferred();
	}

	private views(): CalendarView[] {
		return this.app.workspace
			.getLeavesOfType(VIEW_TYPE)
			.map((leaf) => leaf.view)
			.filter((view): view is CalendarView => view instanceof CalendarView);
	}
}
