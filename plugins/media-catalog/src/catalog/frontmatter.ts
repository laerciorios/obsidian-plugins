import { ALBUM_TRACKS_KEY, BACKLOG_FRONTMATTER_KEYS, BACKLOG_STATUS, BACKLOG_TAG, CATALOG_TAG, FRONTMATTER_KEYS } from '../constants';
import type { CatalogDraft, MediaKind } from '../types';
import { noteAliases } from './aliases';
import { isIsoDate } from './dates';
import { noteTitle } from './series-title';
import { isPlainSafe, renderFrontmatterBlock, yaml } from './yaml';
import type { YamlEntry, YamlValue } from './yaml';

type FrontmatterKey = (typeof FRONTMATTER_KEYS)[MediaKind][number] | (typeof BACKLOG_FRONTMATTER_KEYS)[MediaKind][number];

/** Values the note writer resolves before writing (they depend on downloads and other notes). */
export interface ResolvedValues {
	/** URL, `[[<name>-cover.jpg]]`, or "" for no cover. */
	cover: string;
	/** `[[<area>/_References/Books/<slug>|referência]]`, or "" (books only). */
	reference: string;
	/**
	 * Albums: number of tracks, written as `tracks` right after `year`. Set
	 * only when the setting asks for it and the tracklist is known.
	 */
	tracks?: number;
	/** Backlog notes: the day the item entered the backlog (YYYY-MM-DD). */
	added?: string;
	/** `tags` (the settings of the destination). Default: [CATALOG_TAG], or [BACKLOG_TAG] for the backlog. */
	tags?: readonly string[];
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
 * Frontmatter entries of a new note, in the order of FRONTMATTER_KEYS[kind]
 * (catalog) or BACKLOG_FRONTMATTER_KEYS[kind] (backlog: `status: backlog`,
 * `priority` and `recommended_by` (empty when not given), `added`, only the
 * backlog tags and none of the fields of a run). Keys the kind does not use are never written;
 * series titles end in the season (see noteTitle); `aliases` holds the title
 * and, when it differs, the title of the alias country (see noteAliases);
 * albums may add `tracks` after `year` (see ResolvedValues.tracks).
 */
export function catalogEntries(draft: CatalogDraft, resolved: ResolvedValues): YamlEntry[] {
	const backlog = draft.destination === 'backlog';
	const values: Record<FrontmatterKey, YamlValue> = {
		kind: yaml.plain(draft.kind),
		title: yaml.quoted(noteTitle(draft.kind, draft.title, draft.season)),
		aliases: yaml.quotedList(noteAliases(draft.kind, draft.title, draft.season, draft.localizedTitle)),
		author: yaml.quoted(draft.author.trim()),
		season: yaml.number(draft.season),
		episodes: yaml.number(draft.episodes),
		year: yaml.number(draft.year),
		status: yaml.plain(backlog ? BACKLOG_STATUS : draft.status),
		rating: yaml.number(draft.rating),
		started: date(draft.started),
		finished: date(draft.finished),
		platform: yaml.quoted(draft.platform.trim()),
		estimated_hours: yaml.number(draft.estimatedHours),
		hours: yaml.number(draft.hours),
		pages: yaml.number(draft.pages),
		reference: yaml.quoted(resolved.reference),
		cover: coverValue(resolved.cover),
		priority: draft.priority ? yaml.plain(draft.priority) : yaml.null(),
		added: date(resolved.added ?? null),
		recommended_by: draft.recommendedBy.trim() ? yaml.quoted(draft.recommendedBy.trim()) : yaml.null(),
		tags: yaml.list(resolved.tags ?? [backlog ? BACKLOG_TAG : CATALOG_TAG]),
	};
	const keys: readonly FrontmatterKey[] = (backlog ? BACKLOG_FRONTMATTER_KEYS : FRONTMATTER_KEYS)[draft.kind];
	const entries = keys.map((key): YamlEntry => [key, values[key]]);
	const tracks = draft.kind === 'album' && !backlog ? resolved.tracks : undefined;
	if (tracks === undefined || !Number.isInteger(tracks) || tracks <= 0) return entries;
	const at = keys.indexOf('year') + 1;
	return [...entries.slice(0, at), [ALBUM_TRACKS_KEY, yaml.number(tracks)], ...entries.slice(at)];
}

/** `tracks` of a new album note: the number of tracks when the setting is on and they are known. */
export function tracksProperty(draft: CatalogDraft, enabled: boolean): number | undefined {
	const count = draft.kind === 'album' ? (draft.tracks?.length ?? 0) : 0;
	return enabled && count > 0 ? count : undefined;
}

/** The `---` block of a new catalog note. */
export function catalogFrontmatter(draft: CatalogDraft, resolved: ResolvedValues): string {
	return renderFrontmatterBlock(catalogEntries(draft, resolved));
}
