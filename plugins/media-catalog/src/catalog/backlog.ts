import { BACKLOG_ONLY_KEYS, BACKLOG_TAG, IMPRESSIONS_HEADING, WHY_HEADING } from '../constants';
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

/** `tags` without the backlog tag: a list stays a list, a single value stays a value. */
function withoutBacklogTag(tags: unknown): unknown {
	if (Array.isArray(tags)) return tags.filter((tag) => tag !== BACKLOG_TAG && tag !== `#${BACKLOG_TAG}`);
	return tags === BACKLOG_TAG ? [] : tags;
}

/**
 * The properties of a started item, in place (processFrontMatter writes the
 * keys in object order): `status: in-progress`, `started` right after
 * `status` (or where the note already has it), no `priority` or
 * `recommended_by`, no backlog tag. `added` and everything else stay as they are.
 */
export function applyStart(frontmatter: Record<string, unknown>, today: string): void {
	for (const key of BACKLOG_ONLY_KEYS) Reflect.deleteProperty(frontmatter, key);
	if ('tags' in frontmatter) frontmatter.tags = withoutBacklogTag(frontmatter.tags);
	frontmatter.status = IN_PROGRESS;
	setAfter(frontmatter, 'started', today, 'status');
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
