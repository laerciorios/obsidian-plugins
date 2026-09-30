import { moment } from 'obsidian';
import { DAY_FORMAT } from '../constants';
import type { WeekStart } from '../types';

export type Period = 'week' | 'month';

export interface SummaryOptions {
	period: Period;
	/** Day inside the first period shown; null = today. */
	date: moment.Moment | null;
	/** Link or name of the only project to show; null = every project (or the host project note). */
	project: string | null;
}

export type OptionError =
	| { code: 'key'; key: string }
	| { code: 'period'; value: string }
	| { code: 'date'; value: string }
	| { code: 'line'; line: string };

const KEYS = ['period', 'date', 'project'] as const;

/**
 * Options of a summary block, one `key: value` per line. Empty lines and lines
 * starting with "#" are skipped. Keys and values are data (English), never translated.
 */
export function parseOptions(source: string): { options: SummaryOptions; errors: OptionError[] } {
	const options: SummaryOptions = { period: 'week', date: null, project: null };
	const errors: OptionError[] = [];
	for (const raw of source.split('\n')) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const colon = line.indexOf(':');
		if (colon <= 0) {
			errors.push({ code: 'line', line });
			continue;
		}
		const key = line.slice(0, colon).trim().toLowerCase();
		const value = line.slice(colon + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
		if (!(KEYS as readonly string[]).includes(key)) {
			errors.push({ code: 'key', key });
			continue;
		}
		if (key === 'period') {
			const period = value.toLowerCase();
			if (period === 'week' || period === 'month') options.period = period;
			else errors.push({ code: 'period', value });
		} else if (key === 'date') {
			const date = moment(value, DAY_FORMAT, true);
			if (date.isValid()) options.date = date;
			else errors.push({ code: 'date', value });
		} else if (value) {
			options.project = value;
		}
	}
	return { options, errors };
}

export interface Range {
	start: moment.Moment;
	end: moment.Moment;
}

/** The period that contains `anchor`, moved by `offset` periods. */
export function periodRange(anchor: moment.Moment, period: Period, offset: number, weekStart: WeekStart): Range {
	if (period === 'month') {
		const start = anchor.clone().startOf('month').add(offset, 'months');
		return { start, end: start.clone().endOf('month') };
	}
	const first = weekStart === 'sunday' ? 0 : 1;
	const back = (anchor.day() - first + 7) % 7;
	const start = anchor.clone().startOf('day').subtract(back, 'days').add(offset, 'weeks');
	return { start, end: start.clone().add(6, 'days').endOf('day') };
}

export function inRange(date: moment.Moment, range: Range): boolean {
	return !date.isBefore(range.start) && !date.isAfter(range.end);
}

export interface DayEntry<P> {
	date: moment.Moment;
	/** The daily note of the day. */
	path: string;
	projects: P[];
}

export interface SummaryRow<P> {
	project: P;
	days: DayEntry<P>[];
}

/**
 * Days per project inside the range, most worked first (then by `compare`),
 * each project's days in date order. `days` counts the daily notes with at
 * least one project.
 */
export function summarize<P>(
	entries: readonly DayEntry<P>[],
	range: Range,
	compare: (a: P, b: P) => number,
): { rows: SummaryRow<P>[]; days: number } {
	const inside = entries.filter((entry) => inRange(entry.date, range)).sort((a, b) => a.date.valueOf() - b.date.valueOf());
	const rows = new Map<P, SummaryRow<P>>();
	let days = 0;
	for (const entry of inside) {
		if (entry.projects.length > 0) days += 1;
		for (const project of new Set(entry.projects)) {
			const row = rows.get(project) ?? { project, days: [] };
			row.days.push(entry);
			rows.set(project, row);
		}
	}
	const sorted = [...rows.values()].sort((a, b) => b.days.length - a.days.length || compare(a.project, b.project));
	return { rows: sorted, days };
}
