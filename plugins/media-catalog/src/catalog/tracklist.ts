import { HISTORY_HEADING, IMPRESSIONS_HEADING } from '../constants';
import { inEveryLocale } from '../i18n';
import type { MessageKey } from '../i18n';
import type { Track } from '../types';
import { eolOf, fold, frontmatterEnd, headingKey, headingsOf, spaced, splitLines } from './markdown';

/**
 * The `## Faixas` section of album notes: text of the section, and where it
 * goes in a note. Pure functions over strings; the note is only written by
 * the callers (vault.create for new notes, vault.process for updates).
 */

/** The `t` of ../i18n, or any function with its shape (tests pass one per language). */
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/** `m:ss`, or `h:mm:ss` from one hour on, rounded to the nearest second. 237000 → "3:57". */
export function formatDuration(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = String(total % 60).padStart(2, '0');
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** Length in ms, or null when the source does not know it (missing, zero or not a number). */
export function lengthOf(track: Track): number | null {
	const ms = track.lengthMs;
	return ms !== undefined && Number.isFinite(ms) && ms > 0 ? ms : null;
}

export interface TracklistSummary {
	count: number;
	discs: number;
	/** Sum of the known lengths; null when no track has one. */
	totalMs: number | null;
}

export function tracklistSummary(tracks: readonly Track[]): TracklistSummary {
	let total = 0;
	let known = false;
	for (const track of tracks) {
		const ms = lengthOf(track);
		if (ms === null) continue;
		total += ms;
		known = true;
	}
	return { count: tracks.length, discs: groupByDisc(tracks).length, totalMs: known ? total : null };
}

/** Tracks per disc, discs and tracks in order (disc, then position). */
export function groupByDisc(tracks: readonly Track[]): { disc: number; tracks: Track[] }[] {
	const sorted = [...tracks].sort((a, b) => a.disc - b.disc || a.position - b.position);
	const discs: { disc: number; tracks: Track[] }[] = [];
	for (const track of sorted) {
		const last = discs[discs.length - 1];
		if (last && last.disc === track.disc) last.tracks.push(track);
		else discs.push({ disc: track.disc, tracks: [track] });
	}
	return discs;
}

/**
 * The title as the source gives it, on one line. A `#` that would start a tag
 * (`#Beautiful`) is escaped, so a track title never adds a tag to the vault;
 * `#1` is not a tag and stays as it is.
 */
export function trackTitle(title: string): string {
	return title
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/(^|\s)#([\p{L}\p{N}_/-]+)/gu, (match, space: string, word: string) =>
			/^\p{N}+$/u.test(word) ? match : `${space}\\#${word}`,
		);
}

/** `15 Step — 3:57`, or the title alone when the length is unknown (no number). */
export function trackText(track: Track): string {
	const ms = lengthOf(track);
	const title = trackTitle(track.title);
	return ms === null ? title : `${title} — ${formatDuration(ms)}`;
}

/**
 * The section, without a final newline: `## <Tracks>`, a blank line and the
 * numbered list. Several discs (distinct `disc` values): one `### <Disc n>`
 * block each, n counting the discs in order (the source's numbers can skip
 * or start above 1 once video discs are left out), and the numbering of the
 * tracks restarting on every disc. The headings are note text in the app language.
 */
export function renderTracklist(tracks: readonly Track[], t: Translate): string {
	const discs = groupByDisc(tracks);
	const lines = [`## ${t('note.tracks.heading')}`];
	discs.forEach(({ tracks: list }, index) => {
		lines.push('');
		if (discs.length > 1) lines.push(`### ${t('note.tracks.disc', { n: index + 1 })}`, '');
		for (const track of list) lines.push(`${track.position}. ${trackText(track)}`);
	});
	return lines.join('\n');
}

// ---- where the section goes -------------------------------------------------

/** The tracklist goes before the history, which stays right before `## Impressões`. */
const ANCHOR_KEYS: ReadonlySet<string> = new Set([headingKey(HISTORY_HEADING), headingKey(IMPRESSIONS_HEADING)]);

/** Tracklist headings in every language: a note keeps the heading it was created with. */
function tracklistKeys(): ReadonlySet<string> {
	return new Set(inEveryLocale('note.tracks.heading').map(fold));
}

type Fallback = 'start' | 'end';

function placeSection(content: string, section: string, from: number, fallback: Fallback): string {
	const eol = eolOf(content);
	let head = content.slice(0, from);
	if (head && !head.endsWith('\n')) head += eol;
	const lines = splitLines(content.slice(from));
	const block = section.trimEnd().split(/\r?\n/).join(eol);
	const headings = headingsOf(lines);
	const keys = tracklistKeys();
	const text = (start: number, end?: number): string => lines.slice(start, end).join('');

	const current = headings.find((heading) => heading.level === 2 && keys.has(heading.key));
	if (current) {
		// The section runs to the next heading of level 1 or 2 (or the end); `### Disc n` is inside it.
		const next = headings.find((heading) => heading.index > current.index && heading.level <= 2);
		const before = text(0, current.index);
		return next ? head + before + block + eol + eol + text(next.index) : head + before + block + eol;
	}
	const anchor = headings.find((heading) => heading.level === 2 && ANCHOR_KEYS.has(heading.key));
	if (anchor) {
		return head + spaced(text(0, anchor.index), eol) + block + eol + eol + text(anchor.index);
	}
	const body = text(0);
	if (fallback === 'start') {
		const rest = body.replace(/^(?:[ \t]*\r?\n)+/, '');
		return head + block + eol + (rest ? eol + rest : '');
	}
	return head + spaced(body, eol) + block + eol;
}

/**
 * "Update album tracks": the whole file (as vault.process hands it) with the
 * tracklist section replaced, from its heading (`## Faixas` or `## Tracks`,
 * whatever the language now) to the next heading of level 1 or 2. Without
 * one, the section goes right before `## Histórico` or `## Impressões`
 * (whichever comes first); without either, at the end. The frontmatter and every other line stay byte for byte; the section
 * is followed by exactly one blank line.
 */
export function replaceTracklistSection(content: string, section: string): string {
	return placeSection(content, section, frontmatterEnd(content), 'end');
}

/**
 * New notes: the template body (no frontmatter) with the section in it. A
 * tracklist heading in the template is replaced; otherwise the section goes
 * before `## Impressões`, or first when the template has none.
 */
export function insertTracklist(body: string, section: string): string {
	return placeSection(body, section, 0, 'start');
}
