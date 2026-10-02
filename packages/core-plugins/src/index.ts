export {
	DAILY_NOTES_DEFAULTS,
	createDailyNote,
	dailyNoteDate,
	dailyNotePath,
	dailyTemplatePath,
	ensureFolder,
	getDailyNote,
	parseDailyNotesSettings,
	readDailyNotesSettings,
	readDailyTemplate,
} from './daily-notes';
export type { CreatedDailyNote, DailyNotesSettings } from './daily-notes';
export { fillTemplate } from './templates';
export type { TemplateValues } from './templates';
