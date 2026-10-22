import { Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import type { EffectEditor } from '../../ui/rule-modal';
import type { ShapeEffect, ShapesConfig } from './config';
import { SHAPES } from './geometry';

export function shapeEffectSummary(effect: ShapeEffect): string {
	return t('effect.shapes.shape', { shape: t(`shape.${effect.shape}`).toLowerCase() });
}

export const shapeEffectEditor: EffectEditor<ShapeEffect> = {
	render(_app, parent, effect, changed) {
		new Setting(parent).setName(t('modal.shapes.shape')).addDropdown((dropdown) => {
			for (const shape of SHAPES) dropdown.addOption(shape, t(`shape.${shape}`));
			dropdown.setValue(effect.shape).onChange((value) => {
				const shape = SHAPES.find((option) => option === value);
				if (shape) changed({ shape });
			});
		});
	},
};

export function shapesSettings(host: SectionHost): SettingDefinitionItem[] {
	const config = (): ShapesConfig => host.config.features.shapes;
	return featureSection<ShapeEffect>(host, {
		id: 'shapes',
		options: [],
		rules: {
			heading: t('settings.shapes.rules'),
			get: () => config().rules,
			newEffect: () => ({ shape: 'square' }),
			summary: shapeEffectSummary,
			editor: shapeEffectEditor,
		},
	});
}
