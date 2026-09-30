/**
 * Narrowing helpers for API JSON (`requestUrl().json` is `any`; it is treated
 * as `unknown` everywhere). Missing or malformed fields become undefined or [].
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Trimmed non-empty string, or undefined. */
export function str(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/** Finite number, or undefined. Numeric strings are not accepted. */
export function num(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Integer >= 1 (a position, a count), or undefined. */
export function positiveInt(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : undefined;
}

export function arr(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function records(value: unknown): Record<string, unknown>[] {
	return arr(value).filter(isRecord);
}

export function strings(value: unknown): string[] {
	return arr(value)
		.map(str)
		.filter((item): item is string => item !== undefined);
}

/** Four-digit year from 1999, "1999", "1999-03-31" or "March 1999". */
export function yearOf(value: unknown): number | undefined {
	if (typeof value === 'number') return Number.isInteger(value) && value > 999 && value < 10000 ? value : undefined;
	const match = typeof value === 'string' ? /\b(\d{4})\b/.exec(value) : null;
	return match?.[1] ? Number(match[1]) : undefined;
}
