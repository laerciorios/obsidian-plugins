import type { App, FrontMatterCache, TFile } from 'obsidian';
import type { NotesSourceConfig } from '../types';
import { toStrings } from './text';

/** First non-empty string of a frontmatter key, or null. */
export function frontmatterString(frontmatter: FrontMatterCache | undefined, key: string): string | null {
	if (!key.trim()) return null;
	return toStrings(frontmatter?.[key.trim()])[0] ?? null;
}

/** File name, or the folder name for folder notes named "index". */
export function displayName(file: TFile): string {
	if (file.basename === 'index' && file.parent && !file.parent.isRoot()) return file.parent.name;
	return file.basename;
}

function withoutExtension(path: string): string {
	return path.endsWith('.md') ? path.slice(0, -3) : path;
}

function cleanAlias(alias: string): string {
	return alias.replace(/[[\]|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Wikilink for a note. Built by hand instead of generateMarkdownLink so the
 * target follows the source setting, not the vault's "new link format".
 * A file name that resolves to another note falls back to the full path.
 */
export function buildLink(
	app: App,
	file: TFile,
	frontmatter: FrontMatterCache | undefined,
	source: NotesSourceConfig,
	title: string,
): string {
	const path = withoutExtension(file.path);
	let target = path;
	if (source.linkTarget === 'basename') {
		target = app.metadataCache.getFirstLinkpathDest(file.basename, '') === file ? file.basename : path;
	}

	let alias = '';
	if (source.linkAlias.trim()) alias = cleanAlias(frontmatterString(frontmatter, source.linkAlias) ?? title);
	return alias && alias !== target ? `[[${target}|${alias}]]` : `[[${target}]]`;
}
