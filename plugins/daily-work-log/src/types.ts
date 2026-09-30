import type { TFile } from 'obsidian';

export type WeekStart = 'monday' | 'sunday';

export interface DailyWorkLogSettings {
	version: 1;
	/** List property of the daily note (and of meeting notes) with the project links. Data, never translated. */
	property: string;
	/** `status` values of an active project; empty = every project. */
	activeStatuses: string[];
	/** Project property used as the link alias (`slug`); empty or missing = the project name. */
	aliasKey: string;
	/** Folders whose project notes are never listed (`_Templates`). */
	ignoreFolders: string[];
	/** Open today's daily note before showing the window. */
	openDaily: boolean;
	/** Suggest the projects of the day's meeting notes. */
	suggestions: boolean;
	/** Name of the folders that hold meeting notes, at any depth (`_Meetings`). */
	meetingsFolder: string;
	/** First day of the week in the summary. */
	weekStart: WeekStart;
}

/** A note with `type: project`. */
export interface Project {
	file: TFile;
	path: string;
	/** `title`, else the folder name of an `index.md`, else the file name. */
	name: string;
	/** Link written to notes: `[[<path without .md>|<alias>]]`. */
	link: string;
	/** Raw `status`, "" when missing. */
	status: string;
	active: boolean;
	/** `company`, else the folder that holds the project folder. */
	context: string;
	/** Lowercase names an unresolved link or plain text may use: name, alias, `aliases`, folder or file name. */
	keys: string[];
}

/** Meeting notes that mention a project, for one day. */
export type Suggestions = Map<string, TFile[]>;
