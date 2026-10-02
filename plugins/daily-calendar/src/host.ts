import type { Plugin } from 'obsidian';
import type { DailyNotes } from './daily/daily-notes';
import type { DailyCalendarSettings } from './types';

/** What the view and the settings tab need from the plugin. */
export interface CalendarHost extends Plugin {
	settings: DailyCalendarSettings;
	daily: DailyNotes;
	/** A setting changed: save it and redraw the open calendars. */
	settingsChanged(): void;
}
