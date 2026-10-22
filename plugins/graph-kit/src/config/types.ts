import type { LabelsConfig } from '../features/labels/config';

/** The two native graph views. */
export type GraphKind = 'global' | 'local';

export interface GraphToggles {
	// Quoted: a data.json key, not the global object (obsidianmd/no-global-this).
	'global': boolean;
	local: boolean;
}

/** What every feature has: its own switch and one switch per graph. */
export interface FeatureConfigBase {
	enabled: boolean;
	graphs: GraphToggles;
}

/** Stable ids: keys in data.json and in command ids. */
export type FeatureId = 'labels';

export interface FeatureConfigs {
	labels: LabelsConfig;
}

export const CONFIG_VERSION = 1;

/** data.json, and the exported/imported JSON. */
export interface GraphKitConfig {
	version: number;
	/** "Turn everything off" switch; keeps each feature's own state. */
	enabled: boolean;
	features: FeatureConfigs;
}
