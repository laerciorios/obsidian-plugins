import { CATALOG_TAG, FRONTMATTER_KEYS } from '../constants';
import type { CatalogDraft, MediaKind } from '../types';
import { isIsoDate } from './dates';
import { isPlainSafe, renderFrontmatterBlock, yaml } from './yaml';
import type { YamlEntry, YamlValue } from './yaml';

type FrontmatterKey = (typeof FRONTMATTER_KEYS)[MediaKind][number];

/** Values the note writer resolves before writing (they depend on downloads and other notes). */
export interface ResolvedValues {
	/** URL, `[[<name>-cover.jpg]]`, or "" for no cover. */
	cover: string;
	/** `[[<area>/_References/Books/<slug>|referência]]`, or "" (books only). */
	reference: string;
}

function date(value: string | null): YamlValue {
	const trimmed = value?.trim() ?? '';
	if (!trimmed) return yaml.null();
	return isIsoDate(trimmed) ? yaml.plain(trimmed) : yaml.quoted(trimmed);
}

/** Remote covers stay unquoted like the existing notes; wikilinks and odd values are quoted. */
function coverValue(cover: string): YamlValue {
	const trimmed = cover.trim();
	return trimmed.startsWith('https://') && isPlainSafe(trimmed) ? yaml.plain(trimmed) : yaml.quoted(trimmed);
}

/**
 * Frontmatter entries of a new catalog note, in the order of
 * FRONTMATTER_KEYS[kind]. Keys the kind does not use are never written.
 */
export function catalogEntries(draft: CatalogDraft, resolved: ResolvedValues): YamlEntry[] {
	const values: Record<FrontmatterKey, YamlValue> = {
		kind: yaml.plain(draft.kind),
		title: yaml.quoted(draft.title.trim()),
		author: yaml.quoted(draft.author.trim()),
		season: yaml.number(draft.season),
		episodes: yaml.number(draft.episodes),
		year: yaml.number(draft.year),
		status: yaml.plain(draft.status),
		rating: yaml.number(draft.rating),
		started: date(draft.started),
		finished: date(draft.finished),
		platform: yaml.quoted(draft.platform.trim()),
		hours: yaml.number(draft.hours),
		pages: yaml.number(draft.pages),
		reference: yaml.quoted(resolved.reference),
		cover: coverValue(resolved.cover),
		tags: yaml.list([CATALOG_TAG]),
	};
	const keys: readonly FrontmatterKey[] = FRONTMATTER_KEYS[draft.kind];
	return keys.map((key): YamlEntry => [key, values[key]]);
}

/** The `---` block of a new catalog note. */
export function catalogFrontmatter(draft: CatalogDraft, resolved: ResolvedValues): string {
	return renderFrontmatterBlock(catalogEntries(draft, resolved));
}
