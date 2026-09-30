import type { App, CachedMetadata, FrontMatterCache, Plugin, TFile } from 'obsidian';
import {
	ALIASES_KEY,
	COMPANY_KEY,
	INDEX_BASENAME,
	PROJECT_TYPE,
	PROJECT_TYPE_KEY,
	STATUS_KEY,
	TITLE_KEY,
} from '../constants';
import type { ItemProject } from '../log/entries';
import type { DailyWorkLogSettings, Project } from '../types';
import { itemTarget, linkBasename, nameKey, projectLink } from './links';

function strings(value: unknown): string[] {
	if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
	if (typeof value === 'number') return [String(value)];
	if (Array.isArray(value)) return value.flatMap((item) => strings(item));
	return [];
}

function first(frontmatter: FrontMatterCache | undefined, key: string): string {
	return key ? (strings(frontmatter?.[key])[0] ?? '') : '';
}

export function isProject(cache: CachedMetadata | null): boolean {
	return strings(cache?.frontmatter?.[PROJECT_TYPE_KEY]).some((type) => type.toLowerCase() === PROJECT_TYPE);
}

function inFolders(path: string, folders: readonly string[]): boolean {
	return folders.some((folder) => path === folder || path.startsWith(`${folder}/`));
}

/** A project note, read from its frontmatter. */
export function readProject(file: TFile, frontmatter: FrontMatterCache | undefined, settings: DailyWorkLogSettings): Project {
	const folder = file.parent && !file.parent.isRoot() ? file.parent : null;
	const isIndex = file.basename.toLowerCase() === INDEX_BASENAME && folder !== null;
	const name = first(frontmatter, TITLE_KEY) || (isIndex && folder ? folder.name : file.basename);
	const alias = first(frontmatter, settings.aliasKey) || name;
	const status = first(frontmatter, STATUS_KEY);
	const statuses = settings.activeStatuses.map(nameKey);
	const holder = isIndex ? folder?.parent : folder;
	const keys = new Set([name, alias, ...strings(frontmatter?.[ALIASES_KEY]), isIndex && folder ? folder.name : file.basename]);
	return {
		file,
		path: file.path,
		name,
		link: projectLink(file.path, alias),
		status,
		active: statuses.length === 0 || statuses.includes(nameKey(status)),
		context: first(frontmatter, COMPANY_KEY) || (holder && !holder.isRoot() ? holder.path : ''),
		keys: [...keys].map(nameKey).filter((key) => key.length > 0),
	};
}

export function compareProjects(a: Project, b: Project): number {
	return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.path.localeCompare(b.path);
}

/**
 * Every project note of the vault, rebuilt lazily after a project note (or a
 * note that was one) changes, or after any rename or deletion.
 */
export class ProjectIndex {
	private projects = new Map<string, Project>();
	private byKey = new Map<string, Project>();
	private dirty = true;

	constructor(
		private readonly app: App,
		private readonly settings: () => DailyWorkLogSettings,
	) {}

	register(plugin: Plugin): void {
		const { metadataCache, vault } = this.app;
		plugin.registerEvent(
			metadataCache.on('changed', (file, _data, cache) => {
				if (isProject(cache) || this.projects.has(file.path)) this.invalidate();
			}),
		);
		plugin.registerEvent(metadataCache.on('deleted', () => this.invalidate()));
		plugin.registerEvent(vault.on('rename', () => this.invalidate()));
		// The first index may run before the cache is complete.
		plugin.registerEvent(metadataCache.on('resolved', () => this.invalidate()));
	}

	invalidate(): void {
		this.dirty = true;
	}

	/** Every project, sorted by name. */
	all(): Project[] {
		this.ensure();
		return [...this.projects.values()];
	}

	get(path: string): Project | undefined {
		this.ensure();
		return this.projects.get(path);
	}

	/**
	 * The project a frontmatter item stands for: a link that resolves to a
	 * project note, or an unresolved link or plain text equal to one of its names.
	 */
	projectOf(item: unknown, sourcePath: string): Project | undefined {
		const target = itemTarget(item);
		if (!target) return undefined;
		this.ensure();
		if (target.kind === 'text') return this.byKey.get(nameKey(target.text));
		const file = this.app.metadataCache.getFirstLinkpathDest(target.linkpath, sourcePath);
		if (file) return this.projects.get(file.path);
		return this.byKey.get(nameKey(linkBasename(target.linkpath))) ?? this.byKey.get(nameKey(target.linkpath));
	}

	/** `projectOf` as the path-returning function the pure list helpers take. */
	matcher(sourcePath: string): ItemProject {
		return (item) => this.projectOf(item, sourcePath)?.path ?? null;
	}

	private ensure(): void {
		if (!this.dirty) return;
		const settings = this.settings();
		const projects: Project[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (inFolders(file.path, settings.ignoreFolders)) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			if (isProject(cache)) projects.push(readProject(file, cache?.frontmatter, settings));
		}
		projects.sort(compareProjects);
		this.projects = new Map(projects.map((project) => [project.path, project]));
		this.byKey = new Map();
		for (const project of projects) {
			for (const key of project.keys) if (!this.byKey.has(key)) this.byKey.set(key, project);
		}
		this.dirty = false;
	}
}
