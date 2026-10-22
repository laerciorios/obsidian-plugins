import type { GraphKitConfig } from '../../config/types';
import type { NativeOptions, Preset, PresetFeatureId, PresetFeatures } from './config';

/** A copy of every feature's config except presets (what a preset stores). */
export function snapshot(config: GraphKitConfig, ids: readonly PresetFeatureId[]): PresetFeatures {
	const features: PresetFeatures = {};
	for (const id of ids) (features as Record<string, unknown>)[id] = structuredClone(config.features[id]);
	return features;
}

/** Replace the features a preset holds (others stay as they are) and mark it current. */
export function applyPreset(config: GraphKitConfig, preset: Preset): void {
	for (const [id, feature] of Object.entries(preset.features)) {
		if (feature) (config.features as unknown as Record<string, unknown>)[id] = structuredClone(feature);
	}
	config.features.presets.current = preset.id;
}

/** Save under a name: a preset with the same name (ignoring case) is replaced in place. */
export function upsertPreset(items: Preset[], name: string, features: PresetFeatures, native: NativeOptions | null, newId: () => string): Preset {
	const existing = items.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
	const preset: Preset = { id: existing?.id ?? newId(), name: name.trim(), features, native };
	if (existing) items[items.indexOf(existing)] = preset;
	else items.push(preset);
	return preset;
}

/** Features switched on in a preset, in the given order. */
export function presetFeaturesOn(preset: Preset, ids: readonly PresetFeatureId[]): PresetFeatureId[] {
	return ids.filter((id) => preset.features[id]?.enabled === true);
}
