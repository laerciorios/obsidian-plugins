import { moment } from 'obsidian';

export const ISO_DATE = 'YYYY-MM-DD';

/** Today in the local time zone, as the catalog writes dates ("2026-09-29"). */
export function todayIso(): string {
	return moment().format(ISO_DATE);
}

export function isIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && moment(value, ISO_DATE, true).isValid();
}
