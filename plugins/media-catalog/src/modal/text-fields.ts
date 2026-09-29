import type { Setting, TextComponent } from 'obsidian';
import { textRow } from '../ui/form';
import type { TextRowSpec } from '../ui/form';
import type { Check, ConfirmValues, TextKey } from './confirm-values';

export interface TextField {
	setting: Setting;
	control: TextComponent;
	check: Check | null;
}

/**
 * The text rows of the confirm form, bound to `values`. Messages appear on
 * blur and on submit, and disappear as soon as the value is fixed. Hidden
 * fields always pass.
 */
export class TextFields {
	private readonly fields = new Map<TextKey, TextField>();
	private readonly invalid = new Set<TextKey>();

	constructor(
		private readonly values: ConfirmValues,
		private readonly isShown: (key: TextKey) => boolean,
	) {}

	/** @param onInput Called when the user edits the value (not when code fills it). */
	add(
		el: HTMLElement,
		key: TextKey,
		spec: Omit<TextRowSpec, 'value' | 'onChange'>,
		check: Check | null,
		onInput?: () => void,
	): TextField {
		const { setting, control } = textRow(el, {
			...spec,
			value: this.values[key],
			onChange: (value) => {
				this.values[key] = value;
				if (this.invalid.has(key)) this.check(key);
				onInput?.();
			},
		});
		// "change" fires on blur for text and when a full date is picked.
		control.inputEl.addEventListener('change', () => this.check(key));
		const field = { setting, control, check };
		this.fields.set(key, field);
		return field;
	}

	focus(key: TextKey): void {
		this.fields.get(key)?.control.inputEl.focus();
	}

	/** Shows or clears the message of one field. */
	check(key: TextKey): boolean {
		const field = this.fields.get(key);
		if (!field?.check) return true;
		// A number input reads "" while its text cannot be parsed; "?" fails every numeric check.
		const value = field.control.inputEl.validity.badInput ? '?' : this.values[key].trim();
		const message = this.isShown(key) ? field.check(value) : null;
		field.setting.setErrorMessage(message);
		if (message) this.invalid.add(key);
		else this.invalid.delete(key);
		return message === null;
	}

	/** Checks every field and focuses the first invalid one. */
	validate(): boolean {
		let first: TextField | null = null;
		for (const [key, field] of this.fields) {
			if (!this.check(key) && !first) first = field;
		}
		first?.control.inputEl.focus();
		return first === null;
	}

	/** A value set by the form itself (a default date, a cleared field). */
	fill(key: TextKey, value: string): void {
		this.values[key] = value;
		this.fields.get(key)?.control.setValue(value);
		if (this.invalid.has(key)) this.check(key);
	}
}
