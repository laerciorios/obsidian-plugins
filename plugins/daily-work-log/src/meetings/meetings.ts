import type { App, FrontMatterCache, TFile, moment } from 'obsidian';
import { DATE_KEY, DAY_FORMAT, TITLE_KEY } from '../constants';
import { toList } from '../log/entries';
import type { ProjectIndex } from '../projects/project-index';
import type { DailyWorkLogSettings, Suggestions } from '../types';

/** Whether a path is inside a folder with this name, at any depth. */
export function inMeetingsFolder(path: string, folderName: string): boolean {
	if (!folderName) return false;
	const parts = path.split('/');
	return parts.slice(0, -1).includes(folderName);
}

/**
 * The day of a meeting is its `date` property (`2026-09-30` or `2026-09-30T10:00`);
 * without one, the date its file name starts with.
 */
export function isOnDay(basename: string, frontmatter: FrontMatterCache | undefined, day: string): boolean {
	const value: unknown = frontmatter?.[DATE_KEY];
	const date = typeof value === 'string' ? value.trim() : '';
	if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, DAY_FORMAT.length) === day;
	return basename.startsWith(day);
}

export function meetingTitle(file: TFile, frontmatter: FrontMatterCache | undefined): string {
	const title: unknown = frontmatter?.[TITLE_KEY];
	return typeof title === 'string' && title.trim() ? title.trim() : file.basename;
}

/** Meeting notes of a day, and the projects their `projects` property lists. */
export class Meetings {
	constructor(
		private readonly app: App,
		private readonly projects: ProjectIndex,
		private readonly settings: () => DailyWorkLogSettings,
	) {}

	/** Project path → the meeting notes of the day that list it. Empty when suggestions are off. */
	suggestions(date: moment.Moment): Suggestions {
		const settings = this.settings();
		const byProject: Suggestions = new Map();
		if (!settings.suggestions) return byProject;
		const day = date.format(DAY_FORMAT);
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (!inMeetingsFolder(file.path, settings.meetingsFolder)) continue;
			const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!isOnDay(file.basename, frontmatter, day)) continue;
			for (const item of toList(frontmatter?.[settings.property])) {
				const project = this.projects.projectOf(item, file.path);
				if (!project) continue;
				const meetings = byProject.get(project.path) ?? [];
				if (!meetings.includes(file)) meetings.push(file);
				byProject.set(project.path, meetings);
			}
		}
		for (const meetings of byProject.values()) meetings.sort((a, b) => a.basename.localeCompare(b.basename));
		return byProject;
	}

	title(file: TFile): string {
		return meetingTitle(file, this.app.metadataCache.getFileCache(file)?.frontmatter);
	}
}
