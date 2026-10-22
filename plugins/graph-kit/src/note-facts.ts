import { getAllTags } from 'obsidian';
import type { App } from 'obsidian';
import { normalizeTag } from './rules/evaluate';
import type { NoteFacts } from './rules/types';

/** What rules see of each note, from the metadata cache only, cached per path until invalidated. */
export class NoteFactsCache {
	private readonly cache = new Map<string, NoteFacts | null>();

	constructor(private readonly app: App) {}

	/** Null for anything that is not a Markdown note in the vault. */
	get(path: string): NoteFacts | null {
		const cached = this.cache.get(path);
		if (cached !== undefined) return cached;
		const facts = this.read(path);
		this.cache.set(path, facts);
		return facts;
	}

	/** Null clears everything. */
	invalidate(paths: ReadonlySet<string> | null): void {
		if (!paths) this.cache.clear();
		else for (const path of paths) this.cache.delete(path);
	}

	private read(path: string): NoteFacts | null {
		const file = this.app.vault.getFileByPath(path);
		if (!file || file.extension !== 'md') return null;
		const meta = this.app.metadataCache.getFileCache(file);
		const parent = file.parent?.path ?? '';
		const frontmatter: unknown = meta?.frontmatter;
		return {
			path,
			basename: file.basename,
			folder: parent === '/' ? '' : parent,
			tags: [...new Set((meta ? (getAllTags(meta) ?? []) : []).map(normalizeTag))],
			frontmatter: typeof frontmatter === 'object' && frontmatter !== null ? (frontmatter as Record<string, unknown>) : {},
		};
	}
}
