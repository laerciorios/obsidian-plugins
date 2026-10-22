import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';
import type { Rule } from '../../rules/types';

/** Rule effect: another property list (empty = the default list), or keep the file name. */
export type LabelEffect = { properties: string[] } | { native: true };

export type LabelScope = 'all' | 'matching';
export const LABEL_SCOPES: readonly LabelScope[] = ['all', 'matching'];

export interface LabelsConfig extends FeatureConfigBase {
	/** Priority order: the first with a non-empty value wins. */
	properties: string[];
	scope: LabelScope;
	/** 0 = no limit. */
	maxLength: number;
	rules: Rule<LabelEffect>[];
}

export const MAX_LENGTH_RANGE = { min: 0, max: 500 };

/** Labels are the only feature on after install. */
export function defaultLabels(): LabelsConfig {
	return { enabled: true, graphs: { global: true, local: true }, properties: ['title'], scope: 'all', maxLength: 0, rules: [] };
}

export function readLabelEffect(value: unknown): LabelEffect | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const raw = value as Raw;
	if (raw.native === true) return { native: true };
	if (!Array.isArray(raw.properties)) return null;
	const properties: string[] = [];
	for (const item of raw.properties) {
		if (typeof item === 'string' && item.trim() !== '' && !properties.includes(item.trim())) properties.push(item.trim());
	}
	return { properties };
}

export function readLabels(raw: Raw | null, reader: Reader, path: string): LabelsConfig {
	const config = defaultLabels();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'properties', 'scope', 'maxLength', 'rules'], path);
	return {
		enabled: reader.bool(raw, 'enabled', config.enabled, path),
		graphs: reader.graphs(raw, config.graphs, path),
		properties: reader.stringList(raw, 'properties', config.properties, path),
		scope: reader.oneOf(raw, 'scope', LABEL_SCOPES, config.scope, path),
		maxLength: reader.integer(raw, 'maxLength', config.maxLength, MAX_LENGTH_RANGE, path),
		rules: reader.rules(raw, 'rules', readLabelEffect, path),
	};
}
