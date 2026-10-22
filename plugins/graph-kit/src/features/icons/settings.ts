import { Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { textOption, toggleOption } from '../../settings/options';
import type { EffectEditor } from '../../ui/rule-modal';
import { suggestProperties } from '../../ui/suggest';
import { defaultIcons } from './config';
import type { IconEffect, IconsConfig } from './config';
import type { FolderStyleState } from './feature';

export function iconEffectSummary(effect: IconEffect): string {
	if ('none' in effect) return t('effect.icons.none');
	if ('property' in effect) return t('effect.icons.property', { property: effect.property });
	return t(effect.icon.kind === 'lucide' ? 'effect.icons.lucide' : 'effect.icons.text', { icon: effect.icon.value });
}

type Mode = 'text' | 'lucide' | 'property' | 'none';

export const iconEffectEditor: EffectEditor<IconEffect> = {
	render(app, parent, effect, changed) {
		let mode: Mode = 'none' in effect ? 'none' : 'property' in effect ? 'property' : effect.icon.kind;
		let value = 'icon' in effect ? effect.icon.value : '';
		let property = 'property' in effect ? effect.property : '';
		const emit = () => {
			if (mode === 'none') changed({ none: true });
			else if (mode === 'property') changed({ property: property.trim() || defaultIcons().property });
			else changed({ icon: { kind: mode, value: value.trim() || '•' } });
		};
		const modeSetting = new Setting(parent).setName(t('modal.icons.mode.name'));
		const valueSetting = new Setting(parent)
			.setName(t('modal.icons.value.name'))
			.setDesc(t('modal.icons.value.desc'))
			.addText((text) =>
				text.setValue(value).onChange((next) => {
					value = next;
					emit();
				}),
			);
		const propertySetting = new Setting(parent).setName(t('modal.icons.property.name')).addText((text) => {
			text.setValue(property).onChange((next) => {
				property = next;
				emit();
			});
			suggestProperties(app, text.inputEl);
		});
		const show = () => {
			valueSetting.settingEl.toggle(mode === 'text' || mode === 'lucide');
			propertySetting.settingEl.toggle(mode === 'property');
		};
		modeSetting.addDropdown((dropdown) =>
			dropdown
				.addOptions({ text: t('modal.icons.mode.text'), lucide: t('modal.icons.mode.lucide'), property: t('modal.icons.mode.property'), none: t('modal.icons.mode.none') })
				.setValue(mode)
				.onChange((next) => {
					mode = next === 'lucide' || next === 'property' || next === 'none' ? next : 'text';
					show();
					emit();
				}),
		);
		show();
	},
};

export function iconsSettings(host: SectionHost, folderStyleState: () => FolderStyleState): SettingDefinitionItem[] {
	const config = (): IconsConfig => host.config.features.icons;
	const defaults = defaultIcons();
	const state = folderStyleState();
	return featureSection<IconEffect>(host, {
		id: 'icons',
		options: [
			textOption(host, {
				name: t('settings.icons.property.name'),
				desc: t('settings.icons.property.desc'),
				placeholder: defaults.property,
				get: () => config().property,
				set: (value) => (config().property = value),
				defaultValue: defaults.property,
			}),
			toggleOption(host, {
				name: t('settings.icons.folderStyle.name'),
				desc: state === 'missing' ? t('settings.icons.folderStyle.missing') : state === 'unknown' ? t('settings.icons.folderStyle.unknown') : t('settings.icons.folderStyle.desc'),
				get: () => config().useFolderStyle,
				set: (value) => (config().useFolderStyle = value),
				defaultValue: defaults.useFolderStyle,
			}),
		],
		rules: {
			heading: t('settings.icons.rules'),
			get: () => config().rules,
			newEffect: () => ({ icon: { kind: 'text', value: '★' } }),
			summary: iconEffectSummary,
			editor: iconEffectEditor,
		},
	});
}
