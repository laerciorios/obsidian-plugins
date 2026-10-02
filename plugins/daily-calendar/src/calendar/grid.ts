import type { moment } from 'obsidian';
import { DAY_FORMAT } from '../constants';
import type { WeekStart } from '../types';

/** The grid always has six weeks, so its height does not jump between months. */
export const GRID_WEEKS = 6;

export interface GridDay {
	date: moment.Moment;
	/** `YYYY-MM-DD`. */
	key: string;
	/** Inside the month shown (the others belong to the weeks around it). */
	inMonth: boolean;
	weekend: boolean;
}

export interface WeekdayHeader {
	label: string;
	weekend: boolean;
}

/** Weekday index (0 = Sunday, as `moment#day`) of the first column. */
export function firstWeekday(weekStart: WeekStart): number {
	return weekStart === 'sunday' ? 0 : 1;
}

export function isWeekend(weekday: number): boolean {
	return weekday === 0 || weekday === 6;
}

/** Weekday indexes (0 = Sunday) in column order. */
export function weekdayOrder(weekStart: WeekStart): number[] {
	const first = firstWeekday(weekStart);
	return Array.from({ length: 7 }, (_, column) => (first + column) % 7);
}

/** Column headers from the locale's names, which always start on Sunday (`moment.weekdaysShort()`). */
export function weekdayHeaders(names: readonly string[], weekStart: WeekStart): WeekdayHeader[] {
	return weekdayOrder(weekStart).map((weekday) => ({ label: names[weekday] ?? '', weekend: isWeekend(weekday) }));
}

/**
 * The days shown for a month: six weeks from the first column on or before
 * the 1st. Locale-independent: `day()` and `add()` ignore the locale's week.
 */
export function monthGrid(month: moment.Moment, weekStart: WeekStart): GridDay[] {
	const first = month.clone().startOf('month');
	const back = (first.day() - firstWeekday(weekStart) + 7) % 7;
	const start = first.clone().subtract(back, 'days');
	return Array.from({ length: GRID_WEEKS * 7 }, (_, index) => {
		const date = start.clone().add(index, 'days');
		return {
			date,
			key: date.format(DAY_FORMAT),
			inMonth: date.month() === first.month(),
			weekend: isWeekend(date.day()),
		};
	});
}

/** "outubro" → "Outubro", with the locale's casing rules. */
export function capitalize(text: string, locale?: string): string {
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}
