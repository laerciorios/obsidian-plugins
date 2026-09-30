import type { App, TFile } from 'obsidian';
import type { ProjectIndex } from '../projects/project-index';
import type { DailyWorkLogSettings, Project } from '../types';
import { applyChanges, loggedPaths } from './entries';
import type { Change } from './entries';

/**
 * Reads and writes the project list of a note. Writes go through
 * `processFrontMatter` only, one at a time per note, so fast clicks never
 * overwrite each other.
 */
export class LogWriter {
	private readonly queues = new Map<string, Promise<void>>();

	constructor(
		private readonly app: App,
		private readonly projects: ProjectIndex,
		private readonly settings: () => DailyWorkLogSettings,
	) {}

	/** Paths of the projects the note lists, from the metadata cache. */
	logged(file: TFile): Set<string> {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
		return loggedPaths(frontmatter?.[this.settings().property], this.projects.matcher(file.path));
	}

	set(file: TFile, project: Project, on: boolean): Promise<void> {
		return this.apply(file, [{ path: project.path, link: project.link, on }]);
	}

	/** Mark several projects in one write. */
	add(file: TFile, projects: readonly Project[]): Promise<void> {
		return this.apply(
			file,
			projects.map((project) => ({ path: project.path, link: project.link, on: true })),
		);
	}

	private apply(file: TFile, changes: Change[]): Promise<void> {
		const previous = this.queues.get(file.path) ?? Promise.resolve();
		const next = previous
			.catch(() => undefined)
			.then(() =>
				this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
					const key = this.settings().property;
					const list = applyChanges(frontmatter[key], changes, this.projects.matcher(file.path));
					if (list) frontmatter[key] = list;
				}),
			);
		this.queues.set(file.path, next);
		const forget = () => {
			if (this.queues.get(file.path) === next) this.queues.delete(file.path);
		};
		void next.then(forget, forget);
		return next;
	}
}
