import type { ColorComponent, Setting, SettingDefinitionRender, TextComponent } from 'obsidian';
import { CLS, COLOR_VAR, HEX_PLACEHOLDER } from '../constants';
import { t } from '../i18n';
import { CLOSING, normalizeHex, opening } from '../syntax';
import type { PaletteColor } from '../types';
import { hexError, nameError } from './settings';

export interface ColorRowContext {
	colors(): readonly PaletteColor[];
	/** A field of a color changed (not the list itself): save and redraw, keeping the focus. */
	colorEdited(): void;
}

/**
 * One palette color per row, edited in place: the name shown in its own color,
 * name, hex code, color picker and style. Invalid input is not saved; the
 * row description shows why until it is fixed.
 */
export function colorRow(context: ColorRowContext, color: PaletteColor): SettingDefinitionRender {
	return {
		// Getters, so settings search finds the current name and hex after an edit.
		get name() {
			return color.name;
		},
		get aliases() {
			return [color.color];
		},
		render: (setting) => renderRow(setting, context, color),
	};
}

function renderRow(setting: Setting, context: ColorRowContext, color: PaletteColor): void {
	setting.settingEl.addClass(CLS.colorRow);
	setting.nameEl.empty();
	const preview = setting.nameEl.createSpan();
	const errors = new Map<'name' | 'hex', string>();
	let hexText: TextComponent | null = null;
	let picker: ColorComponent | null = null;

	const refresh = () => {
		preview.setText(color.name);
		preview.className = `${CLS.preview} ${CLS.style(color.style)}`;
		preview.setCssProps({ [COLOR_VAR]: color.color });
		const error = errors.get('name') ?? errors.get('hex');
		setting.descEl.empty();
		setting.descEl.toggleClass(CLS.error, error !== undefined);
		if (error !== undefined) setting.descEl.setText(error);
		else setting.descEl.createEl('code', { text: opening(color.name) + t('settings.color.sample') + CLOSING });
	};

	const setHex = (hex: string) => {
		errors.delete('hex');
		color.color = hex;
		context.colorEdited();
		refresh();
	};

	setting.addText((text) => {
		text.setPlaceholder(t('settings.color.name')).setValue(color.name);
		text.inputEl.addClass(CLS.nameInput);
		text.inputEl.setAttr('aria-label', t('settings.color.name'));
		text.onChange((value) => {
			const error = nameError(value, context.colors(), color.id);
			if (error) {
				errors.set('name', error);
			} else {
				errors.delete('name');
				color.name = value.trim();
				context.colorEdited();
			}
			refresh();
		});
	});

	setting.addText((text) => {
		hexText = text;
		text.setPlaceholder(HEX_PLACEHOLDER).setValue(color.color);
		text.inputEl.addClass(CLS.hexInput);
		text.inputEl.setAttr('aria-label', t('settings.color.hex'));
		text.onChange((value) => {
			const hex = normalizeHex(value);
			if (!hex) {
				errors.set('hex', hexError(value) ?? '');
				refresh();
				return;
			}
			picker?.setValue(hex);
			setHex(hex);
		});
	});

	setting.addColorPicker((component) => {
		picker = component;
		component.setValue(color.color).onChange((value) => {
			const hex = normalizeHex(value);
			if (!hex) return;
			hexText?.setValue(hex);
			setHex(hex);
		});
	});

	setting.addDropdown((dropdown) => {
		dropdown
			.addOptions({ text: t('settings.style.text'), background: t('settings.style.background') })
			.setValue(color.style)
			.onChange((value) => {
				color.style = value === 'background' ? 'background' : 'text';
				context.colorEdited();
				refresh();
			});
		dropdown.selectEl.setAttr('aria-label', t('settings.color.style'));
	});

	refresh();
}
