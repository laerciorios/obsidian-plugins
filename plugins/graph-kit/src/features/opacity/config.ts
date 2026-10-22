import { isRecord } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';
import type { Rule } from '../../rules/types';

export interface OpacityEffect {
	/** 0.05 (almost gone) to 1 (as usual). */
	opacity: number;
}

export interface OpacityConfig extends FeatureConfigBase {
	/** Links touching a faded node fade as much (the most faded end wins). */
	fadeLinks: boolean;
	rules: Rule<OpacityEffect>[];
}

export const OPACITY_RANGE = { min: 0.05, max: 1 };

export function defaultOpacity(): OpacityConfig {
	return { enabled: false, graphs: { global: true, local: true }, fadeLinks: true, rules: [] };
}

export function clampOpacity(value: number): number {
	return Math.round(Math.min(OPACITY_RANGE.max, Math.max(OPACITY_RANGE.min, value)) * 100) / 100;
}

export function readOpacityEffect(value: unknown): OpacityEffect | null {
	if (!isRecord(value) || typeof value.opacity !== 'number' || !Number.isFinite(value.opacity)) return null;
	return { opacity: clampOpacity(value.opacity) };
}

export function readOpacity(raw: Raw | null, reader: Reader, path: string): OpacityConfig {
	const config = defaultOpacity();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'fadeLinks', 'rules'], path);
	return {
		enabled: reader.bool(raw, 'enabled', config.enabled, path),
		graphs: reader.graphs(raw, config.graphs, path),
		fadeLinks: reader.bool(raw, 'fadeLinks', config.fadeLinks, path),
		rules: reader.rules(raw, 'rules', readOpacityEffect, path),
	};
}
