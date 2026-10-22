import { isRecord } from './reader';
import { normalizeConfig } from './normalize';
import type { FeatureId, GraphKitConfig } from './types';

/** The JSON written by "Export": the whole config, tab-indented like data.json. */
export function exportConfig(config: GraphKitConfig): string {
	return `${JSON.stringify(config, null, '\t')}\n`;
}

export interface ImportSummary {
	enabled: boolean;
	/** Features switched on, in config order. */
	featuresOn: FeatureId[];
	rules: number;
}

export type ImportResult =
	| { ok: true; config: GraphKitConfig; warnings: string[]; summary: ImportSummary }
	| { ok: false; error: 'empty' | 'syntax' | 'notConfig' };

/** Pasted or loaded text → a config to apply, or why not. Nothing is applied here. */
export function parseImport(text: string, newId?: () => string): ImportResult {
	if (text.trim() === '') return { ok: false, error: 'empty' };
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return { ok: false, error: 'syntax' };
	}
	// Any object would normalize to the defaults: require something that looks like this config.
	if (!isRecord(value) || !('features' in value || 'version' in value)) return { ok: false, error: 'notConfig' };
	const { config, warnings } = normalizeConfig(value, newId);
	return { ok: true, config, warnings, summary: summarize(config) };
}

export function summarize(config: GraphKitConfig): ImportSummary {
	const entries = Object.entries(config.features) as [FeatureId, GraphKitConfig['features'][FeatureId]][];
	return {
		enabled: config.enabled,
		featuresOn: entries.filter(([, feature]) => feature.enabled).map(([id]) => id),
		rules: entries.reduce((count, [, feature]) => count + ('rules' in feature ? feature.rules.length : 0), 0),
	};
}
