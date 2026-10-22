import { Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { dropdownOption, integerOption, listOption, parseList } from '../../settings/options';
import type { EffectEditor } from '../../ui/rule-modal';
import { defaultLabels, MAX_LENGTH_RANGE } from './config';
import type { LabelEffect, LabelScope, LabelsConfig } from './config';

export function labelEffectSummary(effect: LabelEffect): string {
	if ('native' in effect) return t('effect.labels.native');
	if (effect.properties.length === 0) return t('effect.labels.default');
	return t('effect.labels.properties', { properties: effect.properties.join(', ') });
}

export const labelEffectEditor: EffectEditor<LabelEffect> = {
	render(_app, parent, effect, changed) {
		let properties = 'native' in effect ? [] : [...effect.properties];
		let native = 'native' in effect;
		const emit = () => changed(native ? { native: true } : { properties });

		const mode = new Setting(parent).setName(t('modal.labels.mode.name'));
		const list = new Setting(parent)
			.setName(t('modal.labels.properties.name'))
			.setDesc(t('modal.labels.properties.desc'))
			.addText((text) => {
				text.setValue(properties.join(', ')).onChange((value) => {
					properties = parseList(value);
					emit();
				});
			});
		mode.addDropdown((dropdown) =>
			dropdown
				.addOptions({ properties: t('modal.labels.mode.properties'), native: t('modal.labels.mode.native') })
				.setValue(native ? 'native' : 'properties')
				.onChange((value) => {
					native = value === 'native';
					list.settingEl.toggle(!native);
					emit();
				}),
		);
		list.settingEl.toggle(!native);
	},
};

export function labelsSettings(host: SectionHost): SettingDefinitionItem[] {
	const config = (): LabelsConfig => host.config.features.labels;
	const defaults = defaultLabels();
	return featureSection<LabelEffect>(host, {
		id: 'labels',
		options: [
			listOption(host, {
				name: t('settings.labels.properties.name'),
				desc: t('settings.labels.properties.desc'),
				placeholder: 'title, aliases',
				get: () => config().properties,
				set: (value) => (config().properties = value),
				defaultValue: defaults.properties,
			}),
			dropdownOption<LabelScope>(host, {
				name: t('settings.labels.scope.name'),
				desc: t('settings.labels.scope.desc'),
				options: { all: t('settings.labels.scope.all'), matching: t('settings.labels.scope.matching') },
				get: () => config().scope,
				set: (value) => (config().scope = value),
				defaultValue: defaults.scope,
			}),
			integerOption(host, {
				name: t('settings.labels.maxLength.name'),
				desc: t('settings.labels.maxLength.desc'),
				...MAX_LENGTH_RANGE,
				get: () => config().maxLength,
				set: (value) => (config().maxLength = value),
				defaultValue: defaults.maxLength,
			}),
		],
		rules: {
			heading: t('settings.labels.rules'),
			get: () => config().rules,
			newEffect: () => ({ properties: [] }),
			summary: labelEffectSummary,
			editor: labelEffectEditor,
		},
	});
}
