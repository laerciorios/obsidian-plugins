import { Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { toggleOption } from '../../settings/options';
import type { EffectEditor } from '../../ui/rule-modal';
import { OPACITY_RANGE, clampOpacity, defaultOpacity } from './config';
import type { OpacityConfig, OpacityEffect } from './config';

export function opacityEffectSummary(effect: OpacityEffect): string {
	return t('effect.opacity.value', { percent: Math.round(effect.opacity * 100) });
}

export const opacityEffectEditor: EffectEditor<OpacityEffect> = {
	render(_app, parent, effect, changed) {
		new Setting(parent)
			.setName(t('modal.opacity.name'))
			.setDesc(t('modal.opacity.desc'))
			.addSlider((slider) =>
				slider
					.setLimits(OPACITY_RANGE.min, OPACITY_RANGE.max, 0.05)
					.setValue(effect.opacity)
					.onChange((value) => changed({ opacity: clampOpacity(value) })),
			);
	},
};

export function opacitySettings(host: SectionHost): SettingDefinitionItem[] {
	const config = (): OpacityConfig => host.config.features.opacity;
	return featureSection<OpacityEffect>(host, {
		id: 'opacity',
		options: [
			toggleOption(host, {
				name: t('settings.opacity.fadeLinks.name'),
				desc: t('settings.opacity.fadeLinks.desc'),
				get: () => config().fadeLinks,
				set: (value) => (config().fadeLinks = value),
				defaultValue: defaultOpacity().fadeLinks,
			}),
		],
		rules: {
			heading: t('settings.opacity.rules'),
			get: () => config().rules,
			newEffect: () => ({ opacity: 0.3 }),
			summary: opacityEffectSummary,
			editor: opacityEffectEditor,
		},
	});
}
