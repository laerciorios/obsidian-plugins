import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import { locale, t } from '../i18n';
import type { KeywordLanguage } from '../render/keywords';
import { MAX_INDENT, MIN_INDENT, isValidIndent } from './settings';
import type { PseudocodeSettings } from './settings';

export interface SettingsHost extends Plugin {
	settings: PseudocodeSettings;
	/** A setting changed: save and redraw the blocks. */
	settingsChanged(): void;
}

type Key = Exclude<keyof PseudocodeSettings, 'version'>;

const KEYS: readonly Key[] = [
	'numberAlgorithms',
	'lineNumbers',
	'punctuation',
	'indent',
	'scopeLines',
	'showEnd',
	'commentDelimiter',
	'keywords',
	'exportDocument',
];

function indentError(value: number): string | void {
	const number = new Intl.NumberFormat(locale());
	if (!isValidIndent(value)) return t('validation.indent', { min: number.format(MIN_INDENT), max: number.format(MAX_INDENT) });
}

/** Declarative settings (Obsidian 1.13+): rendering and search come from the app. */
export class PseudocodeSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SettingsHost,
	) {
		super(app, plugin);
		this.icon = 'square-function';
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.plugin.settings;
		return [
			{
				type: 'group',
				heading: t('settings.appearance.heading'),
				items: [
					{
						name: t('settings.numberAlgorithms.name'),
						desc: t('settings.numberAlgorithms.desc'),
						control: { type: 'toggle', key: 'numberAlgorithms' },
					},
					{
						name: t('settings.lineNumbers.name'),
						desc: t('settings.lineNumbers.desc'),
						control: { type: 'toggle', key: 'lineNumbers' },
					},
					{
						name: t('settings.punctuation.name'),
						desc: t('settings.punctuation.desc'),
						visible: () => settings.lineNumbers,
						control: { type: 'text', key: 'punctuation', placeholder: ':' },
					},
					{
						name: t('settings.indent.name'),
						desc: t('settings.indent.desc'),
						control: { type: 'number', key: 'indent', min: MIN_INDENT, max: MAX_INDENT, step: 0.1, validate: indentError },
					},
					{
						name: t('settings.scopeLines.name'),
						desc: t('settings.scopeLines.desc'),
						control: { type: 'toggle', key: 'scopeLines' },
					},
					{
						name: t('settings.showEnd.name'),
						desc: t('settings.showEnd.desc'),
						control: { type: 'toggle', key: 'showEnd' },
					},
					{
						name: t('settings.comment.name'),
						desc: t('settings.comment.desc'),
						control: { type: 'text', key: 'commentDelimiter', placeholder: '//' },
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.language.heading'),
				items: [
					{
						name: t('settings.keywords.name'),
						desc: t('settings.keywords.desc'),
						control: {
							type: 'dropdown',
							key: 'keywords',
							options: { en: t('settings.keywords.en'), 'pt-BR': t('settings.keywords.ptBR') },
						},
					},
				],
			},
			{
				type: 'group',
				heading: t('settings.export.heading'),
				items: [
					{
						name: t('settings.exportDocument.name'),
						desc: t('settings.exportDocument.desc'),
						control: { type: 'toggle', key: 'exportDocument' },
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		return KEYS.includes(key as Key) ? this.plugin.settings[key as Key] : undefined;
	}

	setControlValue(key: string, value: unknown): void {
		const settings = this.plugin.settings;
		switch (key as Key) {
			case 'numberAlgorithms':
			case 'lineNumbers':
			case 'scopeLines':
			case 'showEnd':
			case 'exportDocument':
				settings[key as 'lineNumbers'] = value === true;
				break;
			case 'punctuation':
			case 'commentDelimiter':
				settings[key as 'punctuation'] = typeof value === 'string' ? value : '';
				break;
			case 'indent':
				if (!isValidIndent(value)) return;
				settings.indent = value;
				break;
			case 'keywords':
				settings.keywords = value as KeywordLanguage;
				break;
			default:
				return;
		}
		this.plugin.settingsChanged();
		// The punctuation row is only visible with line numbers.
		this.refreshDomState();
	}
}
