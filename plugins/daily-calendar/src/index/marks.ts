import type { FrontMatterCache } from 'obsidian';
import type { SourceId } from '../types';
import { dayOfName, dayOfValue, hasTag, inFolder, inFolderNamed, projectItems } from './values';
import type { FrontmatterLink, ProjectItem } from './values';

/**
 * The marks of the days on screen, built from facts about the notes (path,
 * name, frontmatter, tags). Pure: the caller reads the vault and the metadata cache.
 */

/** A note listed under a day. */
export interface NoteItem {
	path: string;
	title: string;
}

/** What a day has, per source. */
export interface DayMarks {
	daily: NoteItem | null;
	/** Items of the daily note's projects property. */
	projects: ProjectItem[];
	meetings: NoteItem[];
	cards: NoteItem[];
	catalog: NoteItem[];
}

/** What the index knows about a note. */
export interface NoteFacts {
	path: string;
	basename: string;
	frontmatter: FrontMatterCache | undefined;
	/** Tags with "#", from the frontmatter and the text (`getAllTags`). */
	tags: readonly string[];
	links: readonly FrontmatterLink[];
}

export interface MarkRules {
	sources: Record<SourceId, boolean>;
	/** Day (`YYYY-MM-DD`) of a daily note, or null when the path is not one. */
	dailyKey: (path: string) => string | null;
	/** The note a link of `sourcePath` points to, or null. */
	resolve: (link: string, sourcePath: string) => NoteItem | null;
	projectsProperty: string;
	meetingsFolder: string;
	cardTag: string;
	cardProperty: string;
	catalogFolder: string;
	catalogProperty: string;
}

export function emptyMarks(): DayMarks {
	return { daily: null, projects: [], meetings: [], cards: [], catalog: [] };
}

/** Whether a day has anything to show. */
export function hasMarks(marks: DayMarks): boolean {
	return (
		marks.daily !== null ||
		marks.projects.length > 0 ||
		marks.meetings.length > 0 ||
		marks.cards.length > 0 ||
		marks.catalog.length > 0
	);
}

/** `title`, else the folder of an `index.md`, else the file name. */
export function noteTitle(path: string, basename: string, frontmatter: FrontMatterCache | undefined): string {
	const title: unknown = frontmatter?.title;
	if (typeof title === 'string' && title.trim()) return title.trim();
	if (basename === 'index') {
		const parts = path.split('/');
		const folder = parts[parts.length - 2];
		if (folder) return folder;
	}
	return basename;
}

const byTitle = (a: NoteItem, b: NoteItem): number => a.title.localeCompare(b.title) || a.path.localeCompare(b.path);

/** Marks of the days in `keys`; days without anything are left out. */
export function collectMarks(
	notes: Iterable<NoteFacts>,
	keys: ReadonlySet<string>,
	rules: MarkRules,
): Map<string, DayMarks> {
	const { sources } = rules;
	const marks = new Map<string, DayMarks>();
	const day = (key: string | null): DayMarks | null => {
		if (!key || !keys.has(key)) return null;
		let entry = marks.get(key);
		if (!entry) {
			entry = emptyMarks();
			marks.set(key, entry);
		}
		return entry;
	};
	for (const note of notes) {
		const item = (): NoteItem => ({ path: note.path, title: noteTitle(note.path, note.basename, note.frontmatter) });
		if (sources.daily || sources.projects) {
			const entry = day(rules.dailyKey(note.path));
			if (entry && sources.daily) entry.daily = item();
			if (entry && sources.projects) {
				entry.projects = projectItems(
					note.frontmatter?.[rules.projectsProperty],
					rules.projectsProperty,
					note.links,
					(link) => rules.resolve(link, note.path),
				);
			}
		}
		if (sources.meetings && inFolderNamed(note.path, rules.meetingsFolder)) {
			day(dayOfName(note.basename))?.meetings.push(item());
		}
		if (sources.cards && hasTag(note.tags, rules.cardTag)) {
			day(dayOfValue(note.frontmatter?.[rules.cardProperty]))?.cards.push(item());
		}
		if (sources.catalog && inFolder(note.path, rules.catalogFolder)) {
			day(dayOfValue(note.frontmatter?.[rules.catalogProperty]))?.catalog.push(item());
		}
	}
	for (const [key, entry] of marks) {
		entry.meetings.sort(byTitle);
		entry.cards.sort(byTitle);
		entry.catalog.sort(byTitle);
		// A daily note with an empty list and nothing else leaves no mark.
		if (!hasMarks(entry)) marks.delete(key);
	}
	return marks;
}

/** Same text = same marks: the view skips the redraw. */
export function marksSignature(marks: ReadonlyMap<string, DayMarks>): string {
	return JSON.stringify([...marks].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
