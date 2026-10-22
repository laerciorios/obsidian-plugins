import { defaultImages, readImages } from '../features/images/config';
import { defaultLabels, readLabels } from '../features/labels/config';
import { defaultLinkTypes, readLinkTypes } from '../features/link-types/config';
import { defaultOpacity, readOpacity } from '../features/opacity/config';
import { defaultPresets, readPresets } from '../features/presets/config';
import { defaultShapes, readShapes } from '../features/shapes/config';
import type { FeatureReader, PresetFeatureId } from '../features/presets/config';
import { Reader, newRuleId } from './reader';
import { CONFIG_VERSION } from './types';
import type { GraphKitConfig } from './types';

export function defaultConfig(): GraphKitConfig {
	return { version: CONFIG_VERSION, enabled: true, features: { labels: defaultLabels(), 'link-types': defaultLinkTypes(), images: defaultImages(), presets: defaultPresets(), shapes: defaultShapes(), opacity: defaultOpacity() } };
}

/** Features with their own reader, in roadmap order; presets store copies of them. */
export const PRESET_FEATURE_IDS: readonly PresetFeatureId[] = ['labels', 'link-types', 'images', 'shapes', 'opacity'];

function readFeature(reader: Reader): FeatureReader {
	return (id, raw, path) => {
		switch (id) {
			case 'labels':
				return readLabels(raw, reader, path);
			case 'link-types':
				return readLinkTypes(raw, reader, path);
			case 'images':
				return readImages(raw, reader, path);
			case 'shapes':
				return readShapes(raw, reader, path);
			case 'opacity':
				return readOpacity(raw, reader, path);
		}
	};
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
		for (const id of PRESET_FEATURE_IDS) {
			(config.features as unknown as Record<string, unknown>)[id] = readFeature(reader)(id, reader.record(features[id], `features.${id}`), `features.${id}`);
		}
		config.features.presets = readPresets(reader.record(features.presets, 'features.presets'), reader, 'features.presets', readFeature(reader), PRESET_FEATURE_IDS);
	}
	return { config, warnings: reader.warnings };
}
