export type WeekStart = 'monday' | 'sunday';

/** Marker sources, in the order they are drawn and listed. */
export const SOURCES = ['daily', 'projects', 'meetings', 'cards', 'catalog'] as const;
export type SourceId = (typeof SOURCES)[number];

/**
 * Folder names, tags and property keys are vault conventions: data, never
 * translated. The defaults are the ones of the vault this plugin was made for.
 */
export interface DailyCalendarSettings {
	version: 1;
	/** First column of the grid. */
	weekStart: WeekStart;
	/** Shade Saturdays and Sundays. */
	highlightWeekends: boolean;
	/** Ask before creating a missing daily note. */
	confirmCreate: boolean;
	/** Which markers are shown. */
	sources: Record<SourceId, boolean>;
	/** List property of the daily note with the projects of the day. */
	projectsProperty: string;
	/** Name of the folders that hold meeting notes, at any depth. */
	meetingsFolder: string;
	/** Tag of a board card, without "#". */
	cardTag: string;
	/** Card property with the day it was completed. */
	cardProperty: string;
	/** Folder of the catalog (subfolders included). */
	catalogFolder: string;
	/** Catalog property with the day the item was finished. */
	catalogProperty: string;
}
