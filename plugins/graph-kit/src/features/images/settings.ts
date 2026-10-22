import { Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { integerOption, listOption, parseList, toggleOption } from '../../settings/options';
import type { EffectEditor } from '../../ui/rule-modal';
import { MAX_FILE_SIZE_RANGE, TEXTURE_SIZE_RANGE, defaultImages } from './config';
import type { ImageEffect, ImagesConfig } from './config';

export function imageEffectSummary(effect: ImageEffect): string {
	if ('none' in effect) return t('effect.images.none');
	if ('image' in effect) return t('effect.images.fixed', { image: effect.image });
	if (effect.properties.length === 0) return t('effect.images.default');
	return t('effect.images.properties', { properties: effect.properties.join(', ') });
}

type Mode = 'properties' | 'image' | 'none';

export const imageEffectEditor: EffectEditor<ImageEffect> = {
	render(_app, parent, effect, changed) {
		let mode: Mode = 'none' in effect ? 'none' : 'image' in effect ? 'image' : 'properties';
		let properties = 'properties' in effect ? [...effect.properties] : [];
		let image = 'image' in effect ? effect.image : '';
		const emit = () => changed(mode === 'none' ? { none: true } : mode === 'image' ? { image: image.trim() } : { properties });

		const modeSetting = new Setting(parent).setName(t('modal.images.mode.name'));
		const list = new Setting(parent)
			.setName(t('modal.labels.properties.name'))
			.setDesc(t('modal.labels.properties.desc'))
			.addText((text) =>
				text.setValue(properties.join(', ')).onChange((value) => {
					properties = parseList(value);
					emit();
				}),
			);
		const fixed = new Setting(parent)
			.setName(t('modal.images.image.name'))
			.setDesc(t('modal.images.image.desc'))
			.addText((text) =>
				text
					.setPlaceholder('[[cover.png]]')
					.setValue(image)
					.onChange((value) => {
						image = value;
						emit();
					}),
			);
		const show = () => {
			list.settingEl.toggle(mode === 'properties');
			fixed.settingEl.toggle(mode === 'image');
		};
		modeSetting.addDropdown((dropdown) =>
			dropdown
				.addOptions({ properties: t('modal.images.mode.properties'), image: t('modal.images.mode.image'), none: t('modal.images.mode.none') })
				.setValue(mode)
				.onChange((value) => {
					mode = value === 'image' || value === 'none' ? value : 'properties';
					show();
					emit();
				}),
		);
		show();
	},
};

export function imagesSettings(host: SectionHost): SettingDefinitionItem[] {
	const config = (): ImagesConfig => host.config.features.images;
	const defaults = defaultImages();
	return featureSection<ImageEffect>(host, {
		id: 'images',
		options: [
			listOption(host, {
				name: t('settings.images.properties.name'),
				desc: t('settings.images.properties.desc'),
				placeholder: 'cover',
				get: () => config().properties,
				set: (value) => (config().properties = value),
				defaultValue: defaults.properties,
			}),
			toggleOption(host, {
				name: t('settings.images.remote.name'),
				desc: t('settings.images.remote.desc'),
				get: () => config().allowRemote,
				set: (value) => (config().allowRemote = value),
				defaultValue: defaults.allowRemote,
			}),
			integerOption(host, {
				name: t('settings.images.maxFileSize.name'),
				desc: t('settings.images.maxFileSize.desc'),
				...MAX_FILE_SIZE_RANGE,
				get: () => config().maxFileSizeKb,
				set: (value) => (config().maxFileSizeKb = value),
				defaultValue: defaults.maxFileSizeKb,
			}),
			integerOption(host, {
				name: t('settings.images.textureSize.name'),
				desc: t('settings.images.textureSize.desc'),
				...TEXTURE_SIZE_RANGE,
				get: () => config().textureSize,
				set: (value) => (config().textureSize = value),
				defaultValue: defaults.textureSize,
			}),
		],
		rules: {
			heading: t('settings.images.rules'),
			get: () => config().rules,
			newEffect: () => ({ properties: [] }),
			summary: imageEffectSummary,
			editor: imageEffectEditor,
		},
	});
}
