import { Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { dropdownOption, integerOption, numberOption, textOption } from '../../settings/options';
import type { EffectEditor } from '../../ui/rule-modal';
import { suggestProperties } from '../../ui/suggest';
import { SIZE_RANGE, SIZE_SCALES, defaultSize } from './config';
import type { SizeConfig, SizeEffect, SizeScale } from './config';

export function sizeEffectSummary(effect: SizeEffect): string {
	return 'native' in effect ? t('effect.size.native') : t('effect.size.property', { property: effect.property });
}

export const sizeEffectEditor: EffectEditor<SizeEffect> = {
	render(app, parent, effect, changed) {
		let native = 'native' in effect;
		let property = 'property' in effect ? effect.property : '';
		const emit = () => changed(native ? { native: true } : { property: property.trim() || defaultSize().property });
		const mode = new Setting(parent).setName(t('modal.size.mode.name'));
		const propertySetting = new Setting(parent).setName(t('modal.icons.property.name')).addText((text) => {
			text.setValue(property).onChange((value) => {
				property = value;
				emit();
			});
			suggestProperties(app, text.inputEl);
		});
		mode.addDropdown((dropdown) =>
			dropdown
				.addOptions({ property: t('modal.size.mode.property'), native: t('modal.size.mode.native') })
				.setValue(native ? 'native' : 'property')
				.onChange((value) => {
					native = value === 'native';
					propertySetting.settingEl.toggle(!native);
					emit();
				}),
		);
		propertySetting.settingEl.toggle(!native);
	},
};

export function sizeSettings(host: SectionHost): SettingDefinitionItem[] {
	const config = (): SizeConfig => host.config.features.size;
	const defaults = defaultSize();
	const scales = Object.fromEntries(SIZE_SCALES.map((scale) => [scale, t(`settings.size.scale.${scale}`)])) as Record<SizeScale, string>;
	const fixed = () => config().domain.kind === 'fixed';
	const bound = (key: 'min' | 'max') => {
		const domain = config().domain;
		return domain.kind === 'fixed' ? domain[key] : key === 'min' ? 0 : 5;
	};
	const setBound = (key: 'min' | 'max', value: number) => {
		const domain = config().domain;
		if (domain.kind !== 'fixed') return;
		domain[key] = value;
		if (domain.min >= domain.max) domain[key === 'min' ? 'max' : 'min'] = key === 'min' ? value + 1 : value - 1;
	};
	return featureSection<SizeEffect>(host, {
		id: 'size',
		options: [
			textOption(host, {
				name: t('settings.size.property.name'),
				desc: t('settings.size.property.desc'),
				placeholder: defaults.property,
				get: () => config().property,
				set: (value) => (config().property = value),
				defaultValue: defaults.property,
			}),
			integerOption(host, {
				name: t('settings.size.min.name'),
				desc: t('settings.size.min.desc'),
				...SIZE_RANGE,
				get: () => config().min,
				set: (value) => (config().min = Math.min(value, config().max)),
				defaultValue: defaults.min,
			}),
			integerOption(host, {
				name: t('settings.size.max.name'),
				...SIZE_RANGE,
				get: () => config().max,
				set: (value) => (config().max = Math.max(value, config().min)),
				defaultValue: defaults.max,
			}),
			dropdownOption<SizeScale>(host, {
				name: t('settings.size.scale.name'),
				desc: t('settings.size.scale.desc'),
				options: scales,
				get: () => config().scale,
				set: (value) => (config().scale = value),
				defaultValue: defaults.scale,
			}),
			dropdownOption<'auto' | 'fixed'>(host, {
				name: t('settings.size.domain.name'),
				desc: t('settings.size.domain.desc'),
				options: { auto: t('settings.size.domain.auto'), fixed: t('settings.size.domain.fixed') },
				get: () => config().domain.kind,
				set: (value) => (config().domain = value === 'fixed' ? { kind: 'fixed', min: 0, max: 5 } : { kind: 'auto' }),
				defaultValue: 'auto',
			}),
			{ ...numberOption(host, { name: t('settings.size.domainMin.name'), get: () => bound('min'), set: (value) => setBound('min', value), defaultValue: 0 }), visible: fixed },
			{ ...numberOption(host, { name: t('settings.size.domainMax.name'), get: () => bound('max'), set: (value) => setBound('max', value), defaultValue: 5 }), visible: fixed },
		],
		rules: {
			heading: t('settings.size.rules'),
			get: () => config().rules,
			newEffect: () => ({ property: defaults.property }),
			summary: sizeEffectSummary,
			editor: sizeEffectEditor,
		},
	});
}
