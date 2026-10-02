import { getAllTags, getLinkpath } from 'obsidian';
import type { App } from 'obsidian';
import type { DailyNotes } from '../daily/daily-notes';
import type { DailyCalendarSettings } from '../types';
import { collectMarks, noteTitle } from './marks';
import type { DayMarks, NoteFacts, NoteItem } from './marks';

/** Facts of every Markdown note, from the file list and the metadata cache: no note is read. */
function* noteFacts(app: App): Generator<NoteFacts> {
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		yield {
			path: file.path,
			basename: file.basename,
			frontmatter: cache?.frontmatter,
			tags: cache ? (getAllTags(cache) ?? []) : [],
			links: cache?.frontmatterLinks ?? [],
		};
	}
}

function resolver(app: App): (link: string, sourcePath: string) => NoteItem | null {
	return (link, sourcePath) => {
		const file = app.metadataCache.getFirstLinkpathDest(getLinkpath(link), sourcePath);
		if (!file) return null;
		return { path: file.path, title: noteTitle(file.path, file.basename, app.metadataCache.getFileCache(file)?.frontmatter) };
	};
}

/** Marks of the given days (the grid on screen). */
export function collectDays(
	app: App,
	keys: ReadonlySet<string>,
	daily: DailyNotes,
	settings: DailyCalendarSettings,
): Map<string, DayMarks> {
	return collectMarks(noteFacts(app), keys, {
		sources: settings.sources,
		dailyKey: (path) => daily.keyOf(path),
		resolve: resolver(app),
		projectsProperty: settings.projectsProperty,
		meetingsFolder: settings.meetingsFolder,
		cardTag: settings.cardTag,
		cardProperty: settings.cardProperty,
		catalogFolder: settings.catalogFolder,
		catalogProperty: settings.catalogProperty,
	});
}
