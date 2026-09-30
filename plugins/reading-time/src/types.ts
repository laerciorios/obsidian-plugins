/** Output formats. Saved in data.json and used as template variables: never rename. */
export type FormatId = 'minutes' | 'compact' | 'simple' | 'verbose' | 'clock' | 'custom';

/** How fenced code and math blocks count: skipped, read like prose, or read at their own speed. */
export type CodeMode = 'ignore' | 'text' | 'speed';

/** When the reading time is written to the note's frontmatter. */
export type PropertyMode = 'off' | 'existing' | 'all';

export interface CodeSettings {
	mode: CodeMode;
	wordsPerMinute: number;
	/** Code block languages never counted (diagrams and queries are not read). Lowercase. */
	skipLanguages: string[];
}

export interface PropertySettings {
	mode: PropertyMode;
	/** Frontmatter key. Data, not UI: never translated. */
	name: string;
	/** Folder paths whose notes are never written, without trailing slash. */
	excludeFolders: string[];
}

export interface ReadingTimeSettings {
	version: 1;
	wordsPerMinute: number;
	format: FormatId;
	/** Text after the time in the preset formats ("read"). */
	suffix: string;
	/** Template of the custom format, with {variables}. */
	template: string;
	hideEmpty: boolean;
	selection: boolean;
	code: CodeSettings;
	property: PropertySettings;
}

/** Words found in a text, split by how they are read. */
export interface WordCounts {
	prose: number;
	code: number;
}

/** What the status bar shows: words that count and the time to read them. */
export interface Estimate {
	/** Prose words, plus code words when code is read as text. */
	words: number;
	/** Code words read at the code speed (0 unless the code mode is "speed"). */
	codeWords: number;
	/** Code words left out (only when the code mode is "ignore"). */
	ignoredCodeWords: number;
	/** Whole seconds. */
	seconds: number;
}
