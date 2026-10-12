import { moment } from 'obsidian';

export const ISO_DATE = 'YYYY-MM-DD';

/** Today in the local time zone, as the catalog writes dates ("2026-09-29"). */
export function todayIso(): string {
	return moment().format(ISO_DATE);
}

export function isIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && moment(value, ISO_DATE, true).isValid();
}

/**
 * The day of a frontmatter date: `2026-09-30`, or with a time
 * (`2026-09-30T18:30`, `2026-09-30 18:30`). Anything else (empty, text,
 * numbers, lists, impossible days) is null.
 */
export function dayOf(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const day = /^(\d{4}-\d{2}-\d{2})(?=$|[T ])/.exec(value.trim())?.[1];
	return day && isIsoDate(day) ? day : null;
}
