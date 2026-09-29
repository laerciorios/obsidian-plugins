import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../i18n';
import { CLOSING, opening } from '../syntax';
import type { ColoredTextSettings } from '../types';
import { colorRow } from './color-row';
import type { ColorRowContext } from './color-row';

/** Control keys handled by getControlValue/setControlValue. */
export const key = {
	editorMenu: 'editorMenu',
} as const;

/** What the definitions need from the settings tab. */
export interface DefinitionContext extends ColorRowContext {
	settings: ColoredTextSettings;
	addColor(): void;
	moveColor(from: number, to: number): void;
	removeColor(index: number): void;
}

function example(token: string): string {
	return opening(token) + t('settings.color.sample') + CLOSING;
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	const first = context.settings.colors[0]?.name ?? t('defaults.red');
	return [
		{
			name: t('settings.usage.name'),
			desc: t('settings.usage.desc', { example: example(first), hex: example('#e03131') }),
		},
		{
			type: 'list',
			heading: t('settings.colors.heading'),
			emptyState: t('settings.colors.empty'),
			addItem: { name: t('settings.colors.add'), action: () => context.addColor() },
			onReorder: (from, to) => context.moveColor(from, to),
			onDelete: (index) => context.removeColor(index),
			items: context.settings.colors.map((color) => colorRow(context, color)),
		},
		{
			type: 'group',
			heading: t('settings.editor.heading'),
			items: [
				{
					name: t('settings.editorMenu.name'),
					desc: t('settings.editorMenu.desc'),
					control: { type: 'toggle', key: key.editorMenu },
				},
				{
					name: t('settings.hotkeys.name'),
					desc: t('settings.hotkeys.desc'),
				},
			],
		},
	];
}
