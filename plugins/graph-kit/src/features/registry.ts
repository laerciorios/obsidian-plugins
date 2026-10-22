import type { FeatureConfigs, FeatureId, GraphKitConfig } from '../config/types';
import type { NoteFactsCache } from '../note-facts';
import type { GraphFeature } from './feature';
import { defaultLabels } from './labels/config';
import { LabelsFeature } from './labels/feature';

/** Features in roadmap order: settings sections and commands follow it. One line per feature. */
export const FEATURE_IDS: readonly FeatureId[] = ['labels'];

const DEFAULTS: { [K in FeatureId]: () => FeatureConfigs[K] } = {
	labels: defaultLabels,
};

export function createFeatures(facts: NoteFactsCache, config: () => GraphKitConfig): GraphFeature[] {
	return [new LabelsFeature(facts, () => config().features.labels)];
}

export function defaultFeatureConfig<K extends FeatureId>(id: K): FeatureConfigs[K] {
	return DEFAULTS[id]();
}

export function featureConfig<K extends FeatureId>(config: GraphKitConfig, id: K): FeatureConfigs[K] {
	return config.features[id];
}
