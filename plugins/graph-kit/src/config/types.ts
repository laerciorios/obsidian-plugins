import type { LabelsConfig } from '../features/labels/config';
import type { IconsConfig } from '../features/icons/config';
import type { ImagesConfig } from '../features/images/config';
import type { LinkTypesConfig } from '../features/link-types/config';
import type { OpacityConfig } from '../features/opacity/config';
import type { PresetsConfig } from '../features/presets/config';
import type { ShapesConfig } from '../features/shapes/config';

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
export type FeatureId = keyof FeatureConfigs;

export interface FeatureConfigs {
	labels: LabelsConfig;
	'link-types': LinkTypesConfig;
	images: ImagesConfig;
	presets: PresetsConfig;
	shapes: ShapesConfig;
	opacity: OpacityConfig;
	icons: IconsConfig;
}

export const CONFIG_VERSION = 1;

/** data.json, and the exported/imported JSON. */
export interface GraphKitConfig {
	version: number;
	/** "Turn everything off" switch; keeps each feature's own state. */
	enabled: boolean;
	features: FeatureConfigs;
}
