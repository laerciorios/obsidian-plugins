import { isRecord } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase, FeatureConfigs } from '../../config/types';

/** Features a preset can hold: every one but presets itself. */
export type PresetFeatureId = Exclude<keyof FeatureConfigs, 'presets'>;
export type PresetFeatures = Partial<Pick<FeatureConfigs, PresetFeatureId>>;

/** Native graph options a preset may carry: search, filters and color groups (not display or forces). */
export const NATIVE_KEYS = ['search', 'showTags', 'showAttachments', 'hideUnresolved', 'showOrphans', 'colorGroups'] as const;
export type NativeOptions = Partial<Record<(typeof NATIVE_KEYS)[number], unknown>>;

export interface Preset {
	id: string;
	name: string;
	features: PresetFeatures;
	/** Filters and groups of the global graph, when saved with them. */
	native: NativeOptions | null;
}

export interface PresetsConfig extends FeatureConfigBase {
	items: Preset[];
	/** Default of "include the graph's filters and groups" when saving. */
	includeNative: boolean;
	/** A preset picker over the graph. */
	showSelector: boolean;
	/** Last applied preset, shown by the picker. */
	current: string | null;
}

export function defaultPresets(): PresetsConfig {
	return { enabled: false, graphs: { global: true, local: true }, items: [], includeNative: false, showSelector: true, current: null };
}

/** Keeps only the native keys a preset may change, with values of the right shape. */
export function pickNative(options: Record<string, unknown>): NativeOptions {
	const native: NativeOptions = {};
	if (typeof options.search === 'string') native.search = options.search;
	for (const key of ['showTags', 'showAttachments', 'hideUnresolved', 'showOrphans'] as const) if (typeof options[key] === 'boolean') native[key] = options[key];
	if (Array.isArray(options.colorGroups)) {
		native.colorGroups = options.colorGroups.filter((group) => isRecord(group) && typeof group.query === 'string' && isRecord(group.color));
	}
	return native;
}

/** Reads one feature's config inside a preset (the normalizer's own readers). */
export type FeatureReader = (id: PresetFeatureId, raw: Raw | null, path: string) => PresetFeatures[PresetFeatureId];

export function readPresets(raw: Raw | null, reader: Reader, path: string, readFeature: FeatureReader, featureIds: readonly PresetFeatureId[]): PresetsConfig {
	const config = defaultPresets();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'items', 'includeNative', 'showSelector', 'current'], path);
	config.enabled = reader.bool(raw, 'enabled', config.enabled, path);
	config.graphs = reader.graphs(raw, config.graphs, path);
	config.includeNative = reader.bool(raw, 'includeNative', config.includeNative, path);
	config.showSelector = reader.bool(raw, 'showSelector', config.showSelector, path);
	if (Array.isArray(raw.items)) {
		const ids = new Set<string>();
		raw.items.forEach((item, index) => {
			const at = `${path}.items[${index}]`;
			if (!isRecord(item) || typeof item.id !== 'string' || item.id === '' || ids.has(item.id) || typeof item.name !== 'string' || item.name.trim() === '') {
				reader.warn(at);
				return;
			}
			ids.add(item.id);
			const features: PresetFeatures = {};
			const saved = reader.record(item.features, `${at}.features`);
			if (saved) {
				reader.unknownKeys(saved, featureIds, `${at}.features`);
				for (const id of featureIds) {
					if (!isRecord(saved[id])) continue;
					(features as Record<string, unknown>)[id] = readFeature(id, saved[id], `${at}.features.${id}`);
				}
			}
			const native = isRecord(item.native) ? pickNative(item.native) : null;
			config.items.push({ id: item.id, name: item.name.trim(), features, native });
		});
	} else if (raw.items !== undefined) {
		reader.warn(`${path}.items`);
	}
	if (typeof raw.current === 'string' && config.items.some((item) => item.id === raw.current)) config.current = raw.current;
	return config;
}
