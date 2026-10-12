import { HISTORY_HEADING, HISTORY_TEXT, IMPRESSIONS_HEADING } from '../constants';
import { isIsoDate } from './dates';
import { eolOf, frontmatterEnd, headingKey, headingsOf, spaced, splitLines } from './markdown';

/**
 * The `## Histórico` section of notes with more than one run: one line per
 * run, newest first. Pure functions over strings; the note is only written
 * by the caller (vault.process). Lines already in a note are never rewritten.
 */

/** One run of a catalog note. Empty values are left out of its line. */
export interface Run {
	/** YYYY-MM-DD or null. */
	started: string | null;
	finished: string | null;
	platform: string;
	hours: number | null;
	rating: number | null;
}

/** A history line read back. */
export interface HistoryEntry {
	/** One date means the run started and finished that day. */
	started: string | null;
	finished: string | null;
	hours: number | null;
	rating: number | null;
	/** Fields that are neither the dates, the hours nor the rating (platform, edition, links, "Antes: …"), in order. */
	fields: string[];
}

const { separator, range, open, hours: HOURS, rating: RATING } = HISTORY_TEXT;
/** Text of a run without dates, platform, hours or rating: never an empty line. */
const UNDATED = 'data não registrada';

/** `42.7` → `42,7 h`: decimal comma, as the vault writes hours. */
export function formatHours(hours: number): string {
	return `${String(hours).replace('.', ',')} ${HOURS}`;
}

/**
 * Dates of a run: `start → end`, one date when both are the same day or only
 * the end is known, `start → ?` while the end is unknown; null without dates.
 */
export function runDates(run: Pick<Run, 'started' | 'finished'>): string | null {
	const { started, finished } = run;
	if (finished && (!started || started === finished)) return finished;
	if (started) return `${started}${range}${finished ?? open}`;
	return null;
}

function fieldsOf(run: Run): string[] {
	const platform = run.platform.replace(/\s+/g, ' ').trim();
	const fields = [
		runDates(run),
		platform || null,
		run.hours === null ? null : formatHours(run.hours),
		run.rating === null ? null : `${RATING} ${run.rating}`,
	];
	return fields.filter((field): field is string => field !== null);
}

/** `- 2024-11-03 → 2024-11-23 · Nintendo Switch · 42,7 h · nota 10`, empty fields left out. */
export function historyLine(run: Run): string {
	const fields = fieldsOf(run);
	return `- ${fields.length > 0 ? fields.join(separator) : UNDATED}`;
}

/** Top-level list item: `- text` (also `*` and `+`), the text without the marker. */
const LIST_ITEM = /^ {0,3}[-*+][ \t]+(.*?)[ \t]*\r?\n?$/;
const FIELD_SPLIT = /[ \t]+·[ \t]+/;
const DATES = /^(\d{4}-\d{2}-\d{2})(?:[ \t]*(?:→|->)[ \t]*(\d{4}-\d{2}-\d{2}|\?))?$/;
const HOURS_FIELD = new RegExp(`^(\\d+(?:[.,]\\d+)?)[ \\t]*${HOURS}$`);
const RATING_FIELD = new RegExp(`^${RATING}[ \\t]+(\\d+)$`, 'i');

function validDay(text: string | undefined): string | null {
	return text && isIsoDate(text) ? text : null;
}

/**
 * A line of the section read back, or null when it is not a list item. The
 * first field holds the dates when it is `date` or `date → date` (`?` for an
 * unknown end); hours (`42,7 h`) and rating (`nota 10`) are read anywhere.
 */
export function parseHistoryLine(line: string): HistoryEntry | null {
	const item = LIST_ITEM.exec(line)?.[1];
	if (item === undefined) return null;
	const entry: HistoryEntry = { started: null, finished: null, hours: null, rating: null, fields: [] };
	item
		.split(FIELD_SPLIT)
		.map((field) => field.trim())
		.filter((field) => field.length > 0)
		.forEach((field, index) => {
			const dates = index === 0 ? DATES.exec(field) : null;
			const start = validDay(dates?.[1]);
			const hours = HOURS_FIELD.exec(field)?.[1];
			const rating = RATING_FIELD.exec(field)?.[1];
			if (start) {
				entry.started = start;
				entry.finished = dates?.[2] === undefined ? start : validDay(dates[2]);
			} else if (hours !== undefined && entry.hours === null) {
				entry.hours = Number(hours.replace(',', '.'));
			} else if (rating !== undefined && entry.rating === null) {
				entry.rating = Number(rating);
			} else {
				entry.fields.push(field);
			}
		});
	return entry;
}

/**
 * Whether a line stands for this run: the same dates (a run with dates) or
 * the same text (a run without them). Rating, platform and the rest of the
 * line may differ: they were the opinion and details of that time.
 */
export function sameRun(entry: HistoryEntry, run: Run): boolean {
	const dates = runDates(run);
	if (dates !== null) return runDates(entry) === dates;
	if (entry.started !== null || entry.finished !== null) return false;
	const text = parseHistoryLine(historyLine(run));
	return text !== null && JSON.stringify(text) === JSON.stringify(entry);
}

// ---- the section --------------------------------------------------------------

const HISTORY_KEY = headingKey(HISTORY_HEADING);
const IMPRESSIONS_KEY = headingKey(IMPRESSIONS_HEADING);

interface Body {
	/** Frontmatter block, ending in a line break when there is one. */
	head: string;
	lines: string[];
	eol: string;
	/** Line range of `## Histórico` without its heading; null without the section. */
	section: { heading: number; end: number } | null;
	impressions: number | null;
}

function readBody(content: string): Body {
	const from = frontmatterEnd(content);
	const eol = eolOf(content);
	let head = content.slice(0, from);
	if (head && !head.endsWith('\n')) head += eol;
	const lines = splitLines(content.slice(from));
	const headings = headingsOf(lines);
	const heading = headings.find((candidate) => candidate.level === 2 && candidate.key === HISTORY_KEY);
	const next = heading && headings.find((candidate) => candidate.index > heading.index && candidate.level <= 2);
	const impressions = headings.find((candidate) => candidate.level === 2 && candidate.key === IMPRESSIONS_KEY);
	return {
		head,
		lines,
		eol,
		section: heading ? { heading: heading.index, end: next?.index ?? lines.length } : null,
		impressions: impressions?.index ?? null,
	};
}

function listsRun(body: Body, run: Run): boolean {
	const { section, lines } = body;
	if (!section) return false;
	return lines.slice(section.heading + 1, section.end).some((line) => {
		const entry = parseHistoryLine(line);
		return entry !== null && sameRun(entry, run);
	});
}

/** Whether `## Histórico` of the note (the whole file) already has a line for this run. */
export function historyHasRun(content: string, run: Run): boolean {
	return listsRun(readBody(content), run);
}

/**
 * The whole file (as vault.process hands it) with the line of `run` first in
 * `## Histórico`. Nothing changes when the section already has a line for
 * this run (see sameRun). Without the section, it is created right before
 * `## Impressões`, or at the end of a note without that heading. The
 * frontmatter and every other line stay byte for byte.
 */
export function addToHistory(content: string, run: Run): string {
	const body = readBody(content);
	const { head, lines, eol, section, impressions } = body;
	const line = historyLine(run);
	const text = (start: number, end?: number): string => lines.slice(start, end).join('');

	if (section) {
		if (listsRun(body, run)) return content;
		const items = lines.slice(section.heading + 1, section.end);
		const first = items.findIndex((item) => LIST_ITEM.test(item));
		const at = section.heading + 1 + (first < 0 ? 0 : first);
		let before = text(0, at);
		if (!before.endsWith('\n')) before += eol;
		// A section without items: a blank line keeps what comes right below (a paragraph would join the item).
		const after = text(at);
		const gap = first < 0 && after !== '' && !/^[ \t]*\r?\n/.test(after) ? eol : '';
		return head + before + line + eol + gap + after;
	}

	const block = `${HISTORY_HEADING}${eol}${line}${eol}`;
	if (impressions !== null) return head + spaced(text(0, impressions), eol) + block + eol + text(impressions);
	return head + spaced(text(0), eol) + block;
}
