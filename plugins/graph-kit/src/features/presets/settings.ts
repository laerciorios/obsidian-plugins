import type { SettingDefinitionItem, SettingDefinitionRender } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { toggleOption } from '../../settings/options';
import { defaultPresets } from './config';
import type { Preset, PresetFeatureId, PresetsConfig } from './config';
import type { PresetsFeature } from './feature';
import { PresetNameModal } from './modals';
import { presetFeaturesOn } from './snapshot';

export function presetSummary(preset: Preset, ids: readonly PresetFeatureId[]): string {
	const on = presetFeaturesOn(preset, ids).map((id) => t(`feature.${id}.name`));
	const parts = [t('presets.summary.features', { features: on.length > 0 ? on.join(', ') : t('import.summary.none') })];
	if (preset.native) parts.push(t('presets.summary.native'));
	return parts.join(' · ');
}

/** Opens the "save preset" dialog (also used by the command). */
export function openSavePreset(host: Pick<SectionHost, 'app' | 'config'>, presets: PresetsFeature): void {
	const config = host.config.features.presets;
	new PresetNameModal(host.app, {
		title: t('presets.modal.titleNew'),
		name: '',
		includeNative: config.includeNative,
		taken: config.items.map((item) => item.name),
		save: (name, includeNative) => presets.save(name, includeNative),
	}).open();
}

export function presetsSettings(host: SectionHost, presets: PresetsFeature, ids: readonly PresetFeatureId[]): SettingDefinitionItem[] {
	const config = (): PresetsConfig => host.config.features.presets;
	const defaults = defaultPresets();

	const row = (preset: Preset): SettingDefinitionRender => ({
		name: preset.name,
		desc: presetSummary(preset, ids),
		render: (setting) => {
			if (config().current === preset.id) setting.nameEl.createSpan({ cls: 'gk-current', text: t('presets.current') });
			setting
				.addExtraButton((button) => button.setIcon('play').setTooltip(t('presets.apply')).onClick(() => presets.apply(preset)))
				.addExtraButton((button) =>
					button
						.setIcon('pencil')
						.setTooltip(t('presets.rename'))
						.onClick(() =>
							new PresetNameModal(host.app, {
								title: t('presets.modal.titleRename'),
								name: preset.name,
								taken: [],
								save: (name) => {
									preset.name = name;
									host.changed(true);
								},
							}).open(),
						),
				);
		},
	});

	return featureSection(host, {
		id: 'presets',
		options: [
			toggleOption(host, {
				name: t('settings.presets.selector.name'),
				desc: t('settings.presets.selector.desc'),
				get: () => config().showSelector,
				set: (value) => (config().showSelector = value),
				defaultValue: defaults.showSelector,
			}),
			toggleOption(host, {
				name: t('settings.presets.native.name'),
				desc: t('settings.presets.native.desc'),
				get: () => config().includeNative,
				set: (value) => (config().includeNative = value),
				defaultValue: defaults.includeNative,
			}),
		],
		after: (on) => [
			{
				type: 'list',
				heading: t('settings.presets.items'),
				visible: on,
				emptyState: t('settings.presets.empty'),
				onReorder: (from, to) => {
					const items = config().items;
					const [moved] = items.splice(from, 1);
					if (moved) items.splice(to, 0, moved);
					host.changed(true);
				},
				onDelete: (index) => {
					const [removed] = config().items.splice(index, 1);
					if (removed && config().current === removed.id) config().current = null;
					host.changed(true);
				},
				addItem: { name: t('presets.save'), action: () => openSavePreset(host, presets) },
				items: config().items.map(row),
			},
		],
	});
}
