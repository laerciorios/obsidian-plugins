import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import { DEFAULT_RULES_PATH } from '../constants';
import { t } from '../i18n';
import type { VaultStructureSettings } from '../types';
import { cleanPath } from '../vault/paths';
import { rulesPathError } from './settings';

export interface SettingsHost extends Plugin {
	settings: VaultStructureSettings;
	/** The rules path changed: save it and forget the cached rules. */
	settingsChanged(): void;
	openRules(): void;
	checkStructure(): void;
	newArea(): void;
}

const RULES_PATH = 'rulesPath';

/**
 * Declarative settings (Obsidian 1.13+). The rules themselves live in the
 * rules note, so here there is only its path and the actions.
 */
export class VaultStructureSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'folder-tree';
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: t('settings.rules.heading'),
				items: [
					{
						name: t('settings.rulesPath.name'),
						desc: t('settings.rulesPath.desc'),
						control: {
							type: 'text',
							key: RULES_PATH,
							placeholder: DEFAULT_RULES_PATH,
							validate: rulesPathError,
						},
					},
					{
						name: t('settings.openRules.name'),
						desc: t('settings.openRules.desc'),
						action: () => this.plugin.openRules(),
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.tools.heading'),
				items: [
					{
						name: t('settings.check.name'),
						desc: t('settings.check.desc'),
						action: () => this.plugin.checkStructure(),
					},
					{
						name: t('settings.newArea.name'),
						desc: t('settings.newArea.desc'),
						action: () => this.plugin.newArea(),
					},
				],
			},
		];
	}

	getControlValue(controlKey: string): unknown {
		return controlKey === RULES_PATH ? this.plugin.settings.rulesPath : undefined;
	}

	/** Invalid values are ignored (the control shows the validation message). */
	setControlValue(controlKey: string, value: unknown): void {
		if (controlKey !== RULES_PATH || typeof value !== 'string' || rulesPathError(value)) return;
		this.plugin.settings.rulesPath = cleanPath(value);
		this.plugin.settingsChanged();
	}
}
