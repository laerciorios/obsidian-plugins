import { firstMatch } from '../../rules/evaluate';
import type { NoteFacts } from '../../rules/types';
import type { SizeConfig, SizeScale } from './config';

export interface Range {
	min: number;
	max: number;
}

/** A number from a property value: numbers, numeric text ("4", "4.5", "4,5"), or a list's first one. */
export function numericValue(value: unknown): number | null {
	const items = Array.isArray(value) ? value : [value];
	for (const item of items) {
		if (typeof item === 'number' && Number.isFinite(item)) return item;
		if (typeof item === 'string' && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(item)) return Number(item.trim().replace(',', '.'));
	}
	return null;
}

/** Lowest and highest of some values; null when there are none. */
export function autoDomain(values: Iterable<number>): Range | null {
	let min = Infinity;
	let max = -Infinity;
	for (const value of values) {
		min = Math.min(min, value);
		max = Math.max(max, value);
	}
	return min === Infinity ? null : { min, max };
}

/**
 * Map a value from its domain to a size range. Values outside the domain are clamped; a
 * domain of one value gives the middle of the range. `sqrt` and `log` grow fast at first,
 * so small differences at the low end still show.
 */
export function scaleSize(value: number, domain: Range, range: Range, scale: SizeScale): number {
	const span = domain.max - domain.min;
	let t = span === 0 ? 0.5 : Math.min(1, Math.max(0, (value - domain.min) / span));
	if (scale === 'sqrt') t = Math.sqrt(t);
	else if (scale === 'log') t = Math.log1p(t * 9) / Math.log(10);
	return range.min + t * (range.max - range.min);
}

/** Which property sizes a note: a matching rule first, then the default; null keeps the native size. */
export function sizeProperty(config: SizeConfig, facts: NoteFacts): string | null {
	const rule = firstMatch(config.rules, facts);
	if (rule) return 'native' in rule.effect ? null : rule.effect.property;
	return config.property;
}
