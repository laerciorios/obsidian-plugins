export type LinkTarget = 'path' | 'basename';

/** Every non-empty field must match (AND). All empty: every note in the vault. */
export interface NotesMatch {
	/** Folder name at any depth ("_People") or, with a "/", a path prefix from the vault root. */
	folder: string;
	/** Frontmatter key the note must have. */
	property: string;
	/** Accepted values for `property`, comma-separated. Empty: any non-empty value. */
	value: string;
	/** Tag the note must have. Nested tags count ("meeting" matches "meeting/weekly"). */
	tag: string;
}

export interface NotesSourceConfig {
	id: string;
	kind: 'notes';
	enabled: boolean;
	name: string;
	/** Lucide icon id shown next to each suggestion. */
	icon: string;
	match: NotesMatch;
	/** Folders to skip, same syntax as `match.folder`. */
	exclude: string[];
	/** Frontmatter key used as the suggestion title. Empty or missing: the file name. */
	label: string;
	/** Frontmatter keys searched besides the title and the file name. */
	searchIn: string[];
	linkTarget: LinkTarget;
	/** Frontmatter key used as the link alias (falls back to the title). Empty: no alias. */
	linkAlias: string;
}

/** Only note sources for now. Static links and actions (v1) become new kinds. */
export type SourceConfig = NotesSourceConfig;

export interface DateKeywords {
	today: string[];
	yesterday: string[];
	tomorrow: string[];
}

export interface DatesConfig {
	enabled: boolean;
	keywords: DateKeywords;
	/** moment.js format. Empty: the format of the Daily notes core plugin. */
	format: string;
}

export interface ShortcutsSettings {
	version: 1;
	trigger: string;
	dates: DatesConfig;
	sources: SourceConfig[];
}

/** A normalized string the query is matched against, with its words precomputed. */
export interface SearchField {
	text: string;
	words: string[];
}

/** One row of the suggestion popover. */
export interface Suggestion {
	sourceName: string;
	/** Position of the source in the settings (dates come first), used to break ties. */
	order: number;
	icon: string;
	title: string;
	/** Secondary line: the date for dates, the folder for notes. */
	note: string;
	/** Title first, then the other searchable strings. */
	haystack: SearchField[];
	/** Text that replaces the trigger and the query. */
	insert: string;
}
