import { DropdownComponent, Setting, TextComponent, ToggleComponent } from 'obsidian';

/** Small wrappers over `new Setting()` that hand back the row and its control. */

export interface Row<C> {
	setting: Setting;
	control: C;
}

export interface RowLabel {
	name: string;
	desc?: string;
}

export interface TextRowSpec extends RowLabel {
	value: string;
	type?: 'text' | 'number' | 'date';
	placeholder?: string;
	min?: number;
	max?: number;
	/** Number inputs: '1' by default, 'any' for decimals. */
	step?: string;
	onChange: (value: string) => void;
}

export interface DropdownRowSpec extends RowLabel {
	/** [value, label] pairs, in display order. */
	options: ReadonlyArray<readonly [string, string]>;
	value: string;
	onChange: (value: string) => void;
}

export interface ToggleRowSpec extends RowLabel {
	value: boolean;
	onChange: (value: boolean) => void;
}

function labelled(parent: HTMLElement, label: RowLabel): Setting {
	const setting = new Setting(parent).setName(label.name);
	if (label.desc) setting.setDesc(label.desc);
	return setting;
}

/** A row without a control, or with a read-only value. */
export function infoRow(parent: HTMLElement, label: RowLabel, value?: string): Setting {
	const setting = labelled(parent, label);
	if (value !== undefined) setting.controlEl.createSpan({ text: value });
	return setting;
}

export function textRow(parent: HTMLElement, spec: TextRowSpec): Row<TextComponent> {
	const setting = labelled(parent, spec);
	const control = new TextComponent(setting.controlEl);
	const input = control.inputEl;
	if (spec.type) input.type = spec.type;
	if (spec.min !== undefined) input.min = String(spec.min);
	if (spec.max !== undefined) input.max = String(spec.max);
	if (spec.type === 'number') input.step = spec.step ?? '1';
	if (spec.placeholder) control.setPlaceholder(spec.placeholder);
	control.setValue(spec.value).onChange(spec.onChange);
	return { setting, control };
}

export function dropdownRow(parent: HTMLElement, spec: DropdownRowSpec): Row<DropdownComponent> {
	const setting = labelled(parent, spec);
	const control = new DropdownComponent(setting.controlEl);
	for (const [value, label] of spec.options) control.addOption(value, label);
	control.setValue(spec.value).onChange(spec.onChange);
	return { setting, control };
}

export function toggleRow(parent: HTMLElement, spec: ToggleRowSpec): Row<ToggleComponent> {
	const setting = labelled(parent, spec);
	const control = new ToggleComponent(setting.controlEl);
	control.setValue(spec.value).onChange(spec.onChange);
	return { setting, control };
}
