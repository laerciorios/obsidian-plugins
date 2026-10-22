import type { Setting, SettingDefinitionRender } from 'obsidian';
import { t } from '../i18n';

/** What option rows need from the settings tab. */
export interface OptionHost {
	/** Apply and save. `rerender` redraws the tab (not while typing, so the field keeps focus). */
	changed(rerender: boolean): void;
}

interface OptionSpec<V> {
	name: string;
	desc?: string;
	get: () => V;
	set: (value: V) => void;
	defaultValue: V;
	visible?: () => boolean;
}

/**
 * A setting row with its control and a "restore default" button. Declarative controls have no
 * per-row extra buttons, so options are rendered rows (they still take part in the search).
 */
function option<V>(host: OptionHost, spec: OptionSpec<V>, addControl: (setting: Setting) => void): SettingDefinitionRender {
	return {
		name: spec.name,
		desc: spec.desc,
		visible: spec.visible,
		render: (setting) => {
			addControl(setting);
			setting.addExtraButton((button) =>
				button
					.setIcon('rotate-ccw')
					.setTooltip(t('settings.reset'))
					.setDisabled(same(spec.get(), spec.defaultValue))
					.onClick(() => {
						spec.set(clone(spec.defaultValue));
						host.changed(true);
					}),
			);
		},
	};
}

export function toggleOption(host: OptionHost, spec: OptionSpec<boolean>): SettingDefinitionRender {
	return option(host, spec, (setting) => {
		setting.addToggle((toggle) =>
			toggle.setValue(spec.get()).onChange((value) => {
				spec.set(value);
				host.changed(true);
			}),
		);
	});
}

export function dropdownOption<V extends string>(host: OptionHost, spec: OptionSpec<V> & { options: Record<V, string> }): SettingDefinitionRender {
	return option(host, spec, (setting) => {
		setting.addDropdown((dropdown) =>
			dropdown
				.addOptions(spec.options)
				.setValue(spec.get())
				.onChange((value) => {
					const found = (Object.keys(spec.options) as V[]).find((key) => key === value);
					if (found === undefined) return;
					spec.set(found);
					host.changed(true);
				}),
		);
	});
}

export function integerOption(host: OptionHost, spec: OptionSpec<number> & { min: number; max: number }): SettingDefinitionRender {
	return option(host, spec, (setting) => {
		setting.addText((text) => {
			text.inputEl.type = 'number';
			text.inputEl.min = String(spec.min);
			text.inputEl.max = String(spec.max);
			text.setValue(String(spec.get())).onChange((value) => {
				const number = Number(value);
				if (value.trim() === '' || !Number.isInteger(number)) return;
				spec.set(Math.min(spec.max, Math.max(spec.min, number)));
				host.changed(false);
			});
		});
	});
}

/** One short text (a property name, say); empty falls back to the default. */
export function textOption(host: OptionHost, spec: OptionSpec<string> & { placeholder?: string }): SettingDefinitionRender {
	return option(host, spec, (setting) => {
		setting.addText((text) => {
			if (spec.placeholder) text.setPlaceholder(spec.placeholder);
			text.setValue(spec.get()).onChange((value) => {
				spec.set(value.trim() || spec.defaultValue);
				host.changed(false);
			});
		});
	});
}

/** A list of names typed comma-separated, in order. */
export function listOption(host: OptionHost, spec: OptionSpec<string[]> & { placeholder?: string }): SettingDefinitionRender {
	return option(host, spec, (setting) => {
		setting.addText((text) => {
			if (spec.placeholder) text.setPlaceholder(spec.placeholder);
			text.setValue(spec.get().join(', ')).onChange((value) => {
				spec.set(parseList(value));
				host.changed(false);
			});
		});
	});
}

export function parseList(value: string): string[] {
	const items: string[] = [];
	for (const item of value.split(',')) {
		const name = item.trim();
		if (name !== '' && !items.includes(name)) items.push(name);
	}
	return items;
}

function same<V>(a: V, b: V): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

function clone<V>(value: V): V {
	return Array.isArray(value) ? ([...value] as V) : value;
}
