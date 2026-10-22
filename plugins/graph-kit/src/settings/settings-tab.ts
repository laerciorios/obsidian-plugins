import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import { defaultConfig } from '../config/normalize';
import type { FeatureId, GraphKitConfig } from '../config/types';
import { imagesSettings } from '../features/images/settings';
import { labelsSettings } from '../features/labels/settings';
import { linkTypesSettings } from '../features/link-types/settings';
import { PRESET_FEATURE_IDS } from '../config/normalize';
import type { PresetsFeature } from '../features/presets/feature';
import { presetsSettings } from '../features/presets/settings';
import type { FeatureStatus } from '../graph-host';
import { t } from '../i18n';
import type { SectionHost } from './feature-section';
import { toggleOption } from './options';

export interface SettingsHost extends Plugin {
	config: GraphKitConfig;
	featureStatus(id: FeatureId): FeatureStatus;
	graphPluginEnabled(): boolean | null;
	/** Apply and save the config. */
	configChanged(): void;
	openExport(): void;
	openImport(): void;
	presets(): PresetsFeature | null;
}

/** Declarative settings (1.13): General, then one section per feature in roadmap order. */
export class GraphKitSettingTab extends PluginSettingTab implements SectionHost {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'git-fork';
	}

	get config(): GraphKitConfig {
		return this.plugin.config;
	}

	featureStatus(id: FeatureId): FeatureStatus {
		return this.plugin.featureStatus(id);
	}

	changed(rerender: boolean): void {
		this.plugin.configChanged();
		if (rerender) this.update();
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [this.general(), ...labelsSettings(this), ...linkTypesSettings(this), ...imagesSettings(this), ...this.presetSection()];
	}

	private presetSection(): SettingDefinitionItem[] {
		const presets = this.plugin.presets();
		return presets ? presetsSettings(this, presets, PRESET_FEATURE_IDS) : [];
	}

	private general(): SettingDefinitionItem {
		return {
			type: 'group',
			heading: t('settings.general.heading'),
			items: [
				toggleOption(this, {
					name: t('settings.enabled.name'),
					desc: t('settings.enabled.desc'),
					get: () => this.config.enabled,
					set: (value) => (this.config.enabled = value),
					defaultValue: defaultConfig().enabled,
				}),
				{
					name: t('settings.graphOff.name'),
					desc: t('settings.graphOff.desc'),
					visible: () => this.plugin.graphPluginEnabled() === false,
				},
				{ name: t('settings.export.name'), desc: t('settings.export.desc'), action: () => this.plugin.openExport() },
				{ name: t('settings.import.name'), desc: t('settings.import.desc'), action: () => this.plugin.openImport() },
			],
		};
	}
}
