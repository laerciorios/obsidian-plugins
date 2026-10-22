import type { SettingDefinitionItem } from 'obsidian';
import { t } from '../i18n';
import type { FolderStyleSettings } from '../types';
import { folderRow } from './folder-row';
import type { FolderRowContext } from './folder-row';
import { OPACITY_RANGE, SYMBOL_SIZE_RANGE } from './settings';

/** Control keys handled by getControlValue/setControlValue. */
export const key = {
	opacity: 'opacity',
	tintChildren: 'tintChildren',
	symbolSize: 'symbolSize',
} as const;

/** What the definitions need from the settings tab. */
export interface DefinitionContext extends FolderRowContext {
	settings: FolderStyleSettings;
	removeFolder(path: string): void;
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	const paths = Object.keys(context.settings.folders).sort((a, b) => a.localeCompare(b));
	return [
		{
			type: 'group',
			heading: t('settings.appearance.heading'),
			items: [
				{
					name: t('settings.opacity.name'),
					desc: t('settings.opacity.desc'),
					control: { type: 'slider', key: key.opacity, ...OPACITY_RANGE, step: 0.01 },
				},
				{
					name: t('settings.tintChildren.name'),
					desc: t('settings.tintChildren.desc'),
					control: { type: 'toggle', key: key.tintChildren },
				},
				{
					name: t('settings.symbolSize.name'),
					desc: t('settings.symbolSize.desc'),
					control: { type: 'slider', key: key.symbolSize, ...SYMBOL_SIZE_RANGE, step: 0.05 },
				},
			],
		},
		{
			type: 'list',
			heading: t('settings.folders.heading'),
			emptyState: t('settings.folders.empty'),
			onDelete: (index) => {
				const path = paths[index];
				if (path !== undefined) context.removeFolder(path);
			},
			items: paths.map((path) => folderRow(context, path)),
		},
	];
}
