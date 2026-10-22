import { isRecord } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';
import type { Rule } from '../../rules/types';

export type SizeScale = 'linear' | 'sqrt' | 'log';
export const SIZE_SCALES: readonly SizeScale[] = ['linear', 'sqrt', 'log'];

/** Values mapped to the size range: the vault's own min and max, or fixed bounds. */
export type SizeDomain = { kind: 'auto' } | { kind: 'fixed'; min: number; max: number };

/** Rule effect: size by another numeric property, or the native size (by number of links). */
export type SizeEffect = { property: string } | { native: true };

export interface SizeConfig extends FeatureConfigBase {
	/** Numeric property for notes no rule matched. */
	property: string;
	/** Node size for the lowest and highest values, in the graph's units (native nodes are 8 to 30). */
	min: number;
	max: number;
	scale: SizeScale;
	domain: SizeDomain;
	rules: Rule<SizeEffect>[];
}

export const SIZE_RANGE = { min: 1, max: 100 };

export function defaultSize(): SizeConfig {
	return { enabled: false, graphs: { global: true, local: true }, property: 'rating', min: 8, max: 30, scale: 'linear', domain: { kind: 'auto' }, rules: [] };
}

export function readSizeEffect(value: unknown): SizeEffect | null {
	if (!isRecord(value)) return null;
	if (value.native === true) return { native: true };
	return typeof value.property === 'string' && value.property.trim() !== '' ? { property: value.property.trim() } : null;
}

function readDomain(value: unknown): SizeDomain | null {
	if (!isRecord(value)) return null;
	if (value.kind === 'auto') return { kind: 'auto' };
	const { min, max } = value;
	if (value.kind === 'fixed' && typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max) && min < max) return { kind: 'fixed', min, max };
	return null;
}

export function readSize(raw: Raw | null, reader: Reader, path: string): SizeConfig {
	const config = defaultSize();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'property', 'min', 'max', 'scale', 'domain', 'rules'], path);
	const property = typeof raw.property === 'string' && raw.property.trim() !== '' ? raw.property.trim() : config.property;
	if (raw.property !== undefined && property !== raw.property) reader.warn(`${path}.property`);
	let min = reader.integer(raw, 'min', config.min, SIZE_RANGE, path);
	let max = reader.integer(raw, 'max', config.max, SIZE_RANGE, path);
	if (min > max) [min, max] = [max, min];
	const domain = raw.domain === undefined ? config.domain : readDomain(raw.domain);
	if (!domain) reader.warn(`${path}.domain`);
	return {
		enabled: reader.bool(raw, 'enabled', config.enabled, path),
		graphs: reader.graphs(raw, config.graphs, path),
		property,
		min,
		max,
		scale: reader.oneOf(raw, 'scale', SIZE_SCALES, config.scale, path),
		domain: domain ?? config.domain,
		rules: reader.rules(raw, 'rules', readSizeEffect, path),
	};
}
