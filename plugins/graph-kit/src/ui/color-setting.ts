import { Setting } from 'obsidian';
import { PRESET_COLORS, parseHex } from '../colors';
import type { ColorSpec } from '../colors';
import { t } from '../i18n';

const NONE = 'none';
const HEX = 'hex';
const HEX_PLACEHOLDER = '#d97706';

/** Color picker row: none (the graph's own), a theme preset, or a hex with a color picker. */
export function colorSetting(parent: HTMLElement, name: string, color: ColorSpec | null, changed: (color: ColorSpec | null) => void): Setting {
	let hex = color?.kind === 'hex' ? color.value : '';
	const setting = new Setting(parent).setName(name);
	const hexSetting = new Setting(parent).setName(t('color.hex.name')).setDesc(t('color.hex.desc', { example: HEX_PLACEHOLDER }));
	const error = hexSetting.descEl.createDiv({ cls: 'gk-warning' });
	const emitHex = () => {
		const valid = parseHex(hex) !== null;
		error.setText(valid || hex.trim() === '' ? '' : t('color.hex.invalid'));
		changed(valid ? { kind: 'hex', value: hex.trim() } : null);
	};
	setting.addDropdown((dropdown) => {
		dropdown.addOption(NONE, t('color.none'));
		for (const preset of PRESET_COLORS) dropdown.addOption(preset, t(`color.${preset}`));
		dropdown.addOption(HEX, t('color.hexOption'));
		dropdown.setValue(color ? (color.kind === 'hex' ? HEX : color.value) : NONE).onChange((value) => {
			hexSetting.settingEl.toggle(value === HEX);
			const preset = PRESET_COLORS.find((name) => name === value);
			if (preset) changed({ kind: 'preset', value: preset });
			else if (value === HEX) emitHex();
			else changed(null);
		});
	});
	hexSetting
		.addText((text) =>
			text
				.setPlaceholder(HEX_PLACEHOLDER)
				.setValue(hex)
				.onChange((value) => {
					hex = value;
					emitHex();
				}),
		)
		.addColorPicker((picker) =>
			picker.setValue(parseHex(hex) !== null ? hex : '#808080').onChange((value) => {
				hex = value;
				emitHex();
			}),
		);
	hexSetting.settingEl.toggle(color?.kind === 'hex');
	return setting;
}
