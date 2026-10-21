import { BACKLOG_ONLY_KEYS, BACKLOG_TAG, CATALOG_TAG, IMPRESSIONS_HEADING, WHY_HEADING } from '../constants';
import type { ProviderId } from '../types';
import { isMbid } from '../providers/albums';
import { eolOf, frontmatterEnd, headingKey, headingsOf, spaced, splitLines } from './markdown';
import { folderPath } from './paths';

/**
 * Backlog notes (things not started yet) and "Start backlog item", which
 * turns one into a catalog note. Pure functions over frontmatter objects and
 * strings; the callers move and write the note.
 */

const IN_PROGRESS = 'in-progress';

/** True when `path` is inside `folder` (subfolders included). Every path is inside the vault root. */
export function isInFolder(path: string, folder: string): boolean {
	const base = folderPath(folder);
	return base === '/' || path.startsWith(`${base}/`);
}

/** Tags swapped when an item starts (the tag settings, see tagList). */
export interface StartTags {
	backlog: readonly string[];
	catalog: readonly string[];
}

const DEFAULT_START_TAGS: StartTags = { backlog: [BACKLOG_TAG], catalog: [CATALOG_TAG] };

/** A tag as compared: no leading "#", case ignored (Obsidian tags ignore case). */
function tagKey(tag: unknown): string | null {
	return typeof tag === 'string' ? tag.trim().replace(/^#+/, '').toLowerCase() : null;
}

/**
 * `tags` with the backlog tags swapped for the catalog tags, which go where
 * the first backlog tag was; the other tags keep their place, and a catalog
 * tag already there is never repeated (`[entertainment, backlog]` →
 * `[entertainment]`). A list stays a list; a single value stays a single
 * value when one tag replaces it. Without a backlog tag, nothing changes.
 */
export function swapTags(tags: unknown, swap: StartTags): unknown {
	const backlog = new Set(swap.backlog.map(tagKey));
	if (!Array.isArray(tags)) {
		if (!backlog.has(tagKey(tags))) return tags;
		return swap.catalog.length === 1 ? swap.catalog[0] : [...swap.catalog];
	}
	const list: unknown[] = tags;
	const at = list.findIndex((tag) => backlog.has(tagKey(tag)));
	if (at === -1) return tags;
	const present = new Set(list.filter((tag) => !backlog.has(tagKey(tag))).map(tagKey));
	const added = swap.catalog.filter((tag) => !present.has(tagKey(tag)));
	return list.flatMap((tag, index) => {
		if (index === at) return added;
		return backlog.has(tagKey(tag)) ? [] : [tag];
	});
}

/**
 * The properties of a started item, in place (processFrontMatter writes the
 * keys in object order): `status: in-progress`, then empty `rating`,
 * `started` = today and empty `finished`, in that order right after `status`
 * (keys the note already has stay where they are), no `priority` or
 * `recommended_by`, and the backlog tags swapped for the catalog tags in
 * their place (see swapTags). `added` and everything else stay as they are.
 */
export function applyStart(frontmatter: Record<string, unknown>, today: string, tags: StartTags = DEFAULT_START_TAGS): void {
	for (const key of BACKLOG_ONLY_KEYS) Reflect.deleteProperty(frontmatter, key);
	if ('tags' in frontmatter) frontmatter.tags = swapTags(frontmatter.tags, tags);
	frontmatter.status = IN_PROGRESS;
	// The keys of a run, in the order of catalog notes (`status, rating, started, finished`):
	// `rating` and `finished` empty, to fill in later; values the note already has stay.
	if (!hasKey(frontmatter, 'rating')) setAfter(frontmatter, 'rating', null, 'status');
	setAfter(frontmatter, 'started', today, 'rating');
	if (!hasKey(frontmatter, 'finished')) setAfter(frontmatter, 'finished', null, 'started');
}

function hasKey(frontmatter: Record<string, unknown>, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(frontmatter, key);
}

/**
 * `key` set in place when the note has it, else added right after `after`
 * (at the end without it), the other keys keeping their order.
 */
export function setAfter(frontmatter: Record<string, unknown>, key: string, value: unknown, after: string): void {
	if (Object.prototype.hasOwnProperty.call(frontmatter, key)) {
		frontmatter[key] = value;
		return;
	}
	const entries: [string, unknown][] = Object.entries(frontmatter);
	for (const [name] of entries) Reflect.deleteProperty(frontmatter, name);
	const found = entries.findIndex(([name]) => name === after);
	entries.splice(found === -1 ? entries.length : found + 1, 0, [key, value]);
	for (const [name, entry] of entries) frontmatter[name] = entry;
}

/**
 * The whole file (as vault.process hands it) with `## Por que quero` renamed
 * to `## Impressões`, its text kept. A note that already has `## Impressões`
 * keeps both headings as they are; one with neither gets `## Impressões` at
 * the end. The frontmatter and every other line stay byte for byte.
 */
export function startBody(content: string): string {
	const from = frontmatterEnd(content);
	const head = content.slice(0, from);
	const lines = splitLines(content.slice(from));
	const headings = headingsOf(lines).filter((heading) => heading.level === 2);
	const eol = eolOf(content);
	if (headings.some((heading) => heading.key === headingKey(IMPRESSIONS_HEADING))) return content;
	const why = headings.find((heading) => heading.key === headingKey(WHY_HEADING));
	if (!why) return head + spaced(lines.join(''), eol) + IMPRESSIONS_HEADING + eol;
	const line = lines[why.index] ?? '';
	lines[why.index] = IMPRESSIONS_HEADING + (/\r?\n$/.exec(line)?.[0] ?? '');
	return head + lines.join('');
}

/** An album as its source knows it, read back from the source line of the note. */
export interface AlbumSourceRef {
	provider: ProviderId;
	externalId: string;
}

const MUSICBRAINZ_GROUP = /https:\/\/musicbrainz\.org\/release-group\/([0-9a-f-]{36})/;
/** iTunes album pages end in the collection id: `…/album/<name>/1097861387` (older ones `…/id1097861387`). */
const ITUNES_ALBUM = /https:\/\/(?:music|itunes)\.apple\.com\/\S*\/album\/\S*?\/?(?:id)?(\d+)(?=[\s?#)>]|$)/;

/**
 * The album source of a note, from its `- MusicBrainz: <url>` or
 * `- iTunes: <url>` line (written when the note was created), or null.
 */
export function albumSourceOf(content: string): AlbumSourceRef | null {
	const body = content.slice(frontmatterEnd(content));
	const group = MUSICBRAINZ_GROUP.exec(body)?.[1];
	if (group && isMbid(group)) return { provider: 'musicbrainz', externalId: group };
	const collection = ITUNES_ALBUM.exec(body)?.[1];
	return collection ? { provider: 'itunes', externalId: collection } : null;
}
