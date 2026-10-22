import { defaultLabels, readLabels } from '../features/labels/config';
import { Reader, newRuleId } from './reader';
import { CONFIG_VERSION } from './types';
import type { GraphKitConfig } from './types';

export function defaultConfig(): GraphKitConfig {
	return { version: CONFIG_VERSION, enabled: true, features: { labels: defaultLabels() } };
}

export interface Normalized {
	config: GraphKitConfig;
	/** Paths of values that were wrong or unknown and were replaced or dropped. */
	warnings: string[];
}

/**
 * data.json as saved (or an imported JSON) → a valid config. Nothing saved yet gives the
 * defaults. A newer `version` is read as far as this version understands it.
 */
export function normalizeConfig(saved: unknown, newId: () => string = newRuleId): Normalized {
	const reader = new Reader(newId);
	const config = defaultConfig();
	const raw = saved === null || saved === undefined ? null : reader.record(saved, '');
	if (!raw) return { config, warnings: reader.warnings };

	reader.unknownKeys(raw, ['version', 'enabled', 'features'], '');
	if (raw.version !== undefined && raw.version !== CONFIG_VERSION) reader.warn('version');
	config.enabled = reader.bool(raw, 'enabled', config.enabled, '');

	const features = reader.record(raw.features, 'features');
	if (features) {
		reader.unknownKeys(features, Object.keys(config.features), 'features');
		config.features.labels = readLabels(reader.record(features.labels, 'features.labels'), reader, 'features.labels');
	}
	return { config, warnings: reader.warnings };
}
