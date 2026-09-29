import { parseFrontMatterAliases } from 'obsidian';
import type { App, CachedMetadata, TFile } from 'obsidian';
import { FALLBACK_ICON } from '../constants';
import type { NotesSourceConfig, Suggestion } from '../types';
import { buildLink, displayName, frontmatterString } from './links';
import { searchField, toStrings, unique } from './text';

function searchValues(frontmatter: CachedMetadata['frontmatter'], key: string): string[] {
	if (key === 'aliases' || key === 'alias') return parseFrontMatterAliases(frontmatter) ?? [];
	return toStrings(frontmatter?.[key]);
}

export function noteTitle(file: TFile, cache: CachedMetadata | null, source: NotesSourceConfig): string {
	return frontmatterString(cache?.frontmatter, source.label) ?? displayName(file);
}

export function noteSuggestion(
	app: App,
	file: TFile,
	cache: CachedMetadata | null,
	source: NotesSourceConfig,
	order: number,
): Suggestion {
	const frontmatter = cache?.frontmatter;
	const title = noteTitle(file, cache, source);
	const extra = source.searchIn.flatMap((key) => searchValues(frontmatter, key));
	const folder = file.parent && !file.parent.isRoot() ? file.parent.path : '';

	return {
		sourceName: source.name,
		order,
		icon: source.icon.trim() || FALLBACK_ICON,
		title,
		note: folder,
		haystack: unique([title, displayName(file), ...extra]).map(searchField),
		insert: buildLink(app, file, frontmatter, source, title),
	};
}
