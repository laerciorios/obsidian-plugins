import { PluginSettingTab } from 'obsidian';
import type { Plugin, SettingDefinitionItem } from 'obsidian';
import type { PluginHost } from './host';
import { t } from './i18n';
import { cleanFolder } from './settings';

/** Declarative settings (Obsidian 1.13+). */
export class CanvasShapesSettingTab extends PluginSettingTab {
	constructor(
		plugin: Plugin,
		private readonly host: PluginHost,
	) {
		super(plugin.app, plugin);
		this.icon = 'shapes';
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.host.settings;
		return [
			{
				type: 'group',
				heading: t('settings.panel.heading'),
				items: [
					{ name: t('settings.panel.name'), desc: t('settings.panel.desc'), control: { type: 'toggle', key: 'panel' } },
					{
						name: t('settings.panelShortcuts.name'),
						desc: t('settings.panelShortcuts.desc'),
						visible: () => settings.panel,
						control: { type: 'toggle', key: 'panelShortcuts' },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.export.heading'),
				items: [
					{
						name: t('settings.exportFolder.name'),
						desc: t('settings.exportFolder.desc'),
						control: { type: 'folder', key: 'exportFolder', placeholder: t('settings.exportFolder.placeholder') },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.web.heading'),
				items: [
					{
						name: t('settings.webTheme.name'),
						desc: t('settings.webTheme.desc'),
						control: {
							type: 'dropdown',
							key: 'webTheme',
							options: { system: t('settings.webTheme.system'), light: t('export.theme.light'), dark: t('export.theme.dark') },
						},
					},
					{
						name: t('settings.webNotes.name'),
						desc: t('settings.webNotes.desc'),
						control: { type: 'dropdown', key: 'webNotes', options: { text: t('settings.webNotes.text'), link: t('settings.webNotes.link') } },
					},
					{
						name: t('settings.webLinkTemplate.name'),
						desc: t('settings.webLinkTemplate.desc'),
						visible: () => settings.webNotes === 'link',
						control: {
							type: 'text',
							key: 'webLinkTemplate',
							placeholder: 'https://example.com/{name}',
							validate: (value: string) => (value.trim() ? undefined : t('settings.webLinkTemplate.empty')),
						},
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		const settings = this.host.settings;
		switch (key) {
			case 'exportFolder':
				return settings.exportFolder;
			case 'webTheme':
				return settings.webTheme;
			case 'webNotes':
				return settings.webNotes;
			case 'webLinkTemplate':
				return settings.webLinkTemplate;
			case 'panel':
				return settings.panel;
			case 'panelShortcuts':
				return settings.panelShortcuts;
			default:
				return undefined;
		}
	}

	setControlValue(key: string, value: unknown): void {
		const settings = this.host.settings;
		const text = typeof value === 'string' ? value : '';
		if (key === 'exportFolder') settings.exportFolder = cleanFolder(text);
		else if (key === 'webTheme') settings.webTheme = text === 'light' || text === 'dark' ? text : 'system';
		else if (key === 'webNotes') settings.webNotes = text === 'link' ? 'link' : 'text';
		else if (key === 'webLinkTemplate' && text.trim()) settings.webLinkTemplate = text.trim();
		else if (key === 'panel') settings.panel = value === true;
		else if (key === 'panelShortcuts') settings.panelShortcuts = value === true;
		else return;
		void this.host.saveSettings();
		this.host.shapes.refreshUi();
		this.refreshDomState();
	}
}
