import type { CompletedFormat } from '../settings/model';

const DAY_MS = 86_400_000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** A calendar day from a frontmatter value ("2026-09-20", "2026-09-20T14:30", Date). */
export function parseDay(value: unknown): Date | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : startOfDay(value);
	if (typeof value !== 'string') return null;
	const match = ISO_DAY.exec(value.trim());
	if (!match) return null;
	const [, y, m, d] = match;
	const date = new Date(Number(y), Number(m) - 1, Number(d));
	return Number.isNaN(date.getTime()) || date.getDate() !== Number(d) ? null : date;
}

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from `from` to `to` (DST-safe). */
export function daysBetween(from: Date, to: Date): number {
	const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
	const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
	return Math.round((b - a) / DAY_MS);
}

/** "completed + afterDays < today". */
export function isOlderThan(completed: Date, afterDays: number, today: Date): boolean {
	return daysBetween(completed, today) > afterDays;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Completion stamp in the profile's format (local time). */
export function formatCompleted(date: Date, format: CompletedFormat): string {
	const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	return format === 'datetime' ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}
