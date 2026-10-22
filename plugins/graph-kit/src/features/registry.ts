import type { App } from 'obsidian';
import type { FeatureConfigs, FeatureId, GraphKind, GraphKitConfig } from '../config/types';
import type { NoteFactsCache } from '../note-facts';
import type { GraphFeature } from './feature';
import { defaultLabels } from './labels/config';
import { LabelsFeature } from './labels/feature';
import { defaultLinkTypes } from './link-types/config';
import { LinkTypesFeature } from './link-types/feature';

/** Features in roadmap order: settings sections and commands follow it. */
export const FEATURE_IDS: readonly FeatureId[] = ['labels', 'link-types'];

const DEFAULTS: { [K in FeatureId]: () => FeatureConfigs[K] } = {
	labels: defaultLabels,
	'link-types': defaultLinkTypes,
};

/** What features may need from the plugin. */
export interface FeatureContext {
	app: App;
	facts: NoteFactsCache;
	config: () => GraphKitConfig;
	/** Apply and save a config change made by a feature (e.g. the legend). */
	changed: () => void;
}

export function createFeatures(context: FeatureContext): GraphFeature[] {
	const { app, facts, config, changed } = context;
	const toggleHidden = (kind: GraphKind, typeId: string) => {
		const hidden = config().features['link-types'].hidden;
		hidden[kind] = hidden[kind].includes(typeId) ? hidden[kind].filter((id) => id !== typeId) : [...hidden[kind], typeId];
		changed();
	};
	return [new LabelsFeature(facts, () => config().features.labels), new LinkTypesFeature(app, () => config().features['link-types'], toggleHidden)];
}

export function defaultFeatureConfig<K extends FeatureId>(id: K): FeatureConfigs[K] {
	return DEFAULTS[id]();
}

export function featureConfig<K extends FeatureId>(config: GraphKitConfig, id: K): FeatureConfigs[K] {
	return config.features[id];
}
