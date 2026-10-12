import { FINISHED_DATES_KEY } from '../constants';
import type { Status } from '../types';
import { numberOf, textOf } from './catalog-note';
import { dayOf } from './dates';
import type { Run } from './history';

/**
 * Runs of a catalog note on the frontmatter side. `started`, `finished`,
 * `status`, `platform` and `hours` always describe the current (latest) run
 * and `rating` is the current opinion; `finished_dates` lists every known
 * completion, ascending, the current one included. Pure functions: the
 * callers run them inside processFrontMatter.
 */

const DONE: Status = 'done';
const IN_PROGRESS: Status = 'in-progress';

/** What the "New run" modal asks. */
export interface NewRunChoice {
	/** YYYY-MM-DD. */
	started: string;
	platform: string;
}

function has(frontmatter: Record<string, unknown>, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(frontmatter, key);
}

/** A new run starts only from a finished one. */
export function isDone(frontmatter: Record<string, unknown> | null): boolean {
	return frontmatter?.status === DONE;
}

/** The current run of a note, as its history line will tell it. */
export function currentRun(frontmatter: Record<string, unknown>): Run {
	return {
		started: dayOf(frontmatter.started),
		finished: dayOf(frontmatter.finished),
		platform: textOf(frontmatter.platform) ?? '',
		hours: numberOf(frontmatter.hours),
		rating: numberOf(frontmatter.rating),
	};
}

/**
 * `finished_dates` with `date` in it: the days of the list (a single value
 * counts as a list of one) without repeats, ascending. `replaced` leaves the
 * list first (a completion that moved). Entries that are not dates are kept
 * after the dates.
 */
export function addFinishedDate(value: unknown, date: string, replaced: string | null = null): unknown[] {
	const items: unknown[] = value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
	const days = new Set<string>();
	const others: unknown[] = [];
	for (const item of items) {
		const day = dayOf(item);
		if (day) {
			if (day !== replaced) days.add(day);
		} else if (item !== null && !(typeof item === 'string' && item.trim() === '')) {
			others.push(item);
		}
	}
	days.add(date);
	return [...[...days].sort(), ...others];
}

/**
 * Sets `finished_dates` in a frontmatter object (processFrontMatter writes
 * the keys in object order): in place when the note has the key, else right
 * after `finished` (at the end without it), the other keys keeping their order.
 */
function placeFinishedDates(frontmatter: Record<string, unknown>, dates: unknown[]): void {
	const entries: [string, unknown][] = Object.entries(frontmatter);
	const at = entries.findIndex(([key]) => key === 'finished');
	if (has(frontmatter, FINISHED_DATES_KEY) || at < 0) {
		frontmatter[FINISHED_DATES_KEY] = dates;
		return;
	}
	for (const [key] of entries) Reflect.deleteProperty(frontmatter, key);
	entries.splice(at + 1, 0, [FINISHED_DATES_KEY, dates]);
	for (const [key, value] of entries) frontmatter[key] = value;
}

/**
 * "Mark as finished": status done, `finished` = `date`, `rating` when not
 * null. A note with `finished_dates` (more than one run) gets `date` there
 * too; marking a done note again moves its completion, so the old date
 * leaves the list. Without `finished_dates`, nothing else changes.
 */
export function applyFinished(frontmatter: Record<string, unknown>, date: string, rating: number | null): void {
	if (has(frontmatter, FINISHED_DATES_KEY)) {
		const moved = isDone(frontmatter) ? dayOf(frontmatter.finished) : null;
		frontmatter[FINISHED_DATES_KEY] = addFinishedDate(frontmatter[FINISHED_DATES_KEY], date, moved);
	}
	frontmatter.status = DONE;
	frontmatter.finished = date;
	if (rating !== null) frontmatter.rating = rating;
}

/**
 * "New run": the finish date of the current run joins `finished_dates`
 * (created right after `finished` when missing; not without a finish date),
 * `started` becomes the new date, `finished` and `hours` are cleared,
 * `status` is in-progress and `platform` the new one. `rating` stays.
 */
export function applyNewRun(frontmatter: Record<string, unknown>, choice: NewRunChoice): void {
	const finished = dayOf(frontmatter.finished);
	if (finished) placeFinishedDates(frontmatter, addFinishedDate(frontmatter[FINISHED_DATES_KEY], finished));
	frontmatter.status = IN_PROGRESS;
	frontmatter.started = choice.started;
	frontmatter.finished = null;
	if (has(frontmatter, 'hours')) frontmatter.hours = null;
	const platform = choice.platform.trim();
	if (platform || has(frontmatter, 'platform')) frontmatter.platform = platform;
}
