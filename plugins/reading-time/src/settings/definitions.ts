import type { Setting, SettingDefinition, SettingDefinitionItem } from 'obsidian';
import { CLS, MAX_WPM, MIN_WPM } from '../constants';
import { estimate } from '../estimate';
import { displayText, formatNumber } from '../format';
import { FORMATTERS } from '../format/duration';
import { VARIABLES, unknownVariables } from '../format/template';
import { t } from '../i18n';
import type { Reading } from '../tracker';
import type { ReadingTimeSettings } from '../types';
import { key } from './bindings';
import { isValidSpeed } from './settings';

/** What the definitions need from the settings tab. */
export interface DefinitionContext {
	settings: ReadingTimeSettings;
	/** Refreshers of the preview row, called after each edit. */
	previews: Set<() => void>;
	read(): Reading | null;
	updateAll(): void;
}

/** Examples in the format list: 10 minutes 4 seconds, as in the community plugin. */
const EXAMPLE_SECONDS = 604;
const SAMPLE_WORDS = 1000;

function speedError(value: number): string | void {
	if (!isValidSpeed(value)) return t('validation.speed', { min: MIN_WPM, max: MAX_WPM });
}

function templateError(value: string): string | void {
	const unknown = unknownVariables(value);
	if (unknown.length > 0) return t('validation.template', { names: unknown.map((name) => `{${name}}`).join(', ') });
}

function formatOptions(): Record<string, string> {
	return {
		// Whole minutes round up, so the example uses exactly ten.
		minutes: t('settings.format.minutes', { example: FORMATTERS.minutes(600) }),
		compact: t('settings.format.compact', { example: FORMATTERS.compact(EXAMPLE_SECONDS) }),
		simple: t('settings.format.simple', { example: FORMATTERS.simple(EXAMPLE_SECONDS) }),
		verbose: t('settings.format.verbose', { example: FORMATTERS.verbose(EXAMPLE_SECONDS) }),
		clock: t('settings.format.clock', { example: FORMATTERS.clock(EXAMPLE_SECONDS) }),
		custom: t('settings.format.custom'),
	};
}

function previewFragment(context: DefinitionContext): DocumentFragment {
	const { settings } = context;
	const reading = context.read();
	const sample = estimate({ prose: SAMPLE_WORDS, code: 0 }, settings);
	return createFragment((fragment) => {
		if (reading) {
			fragment.createDiv({ cls: CLS.preview, text: t('settings.preview.note', { text: displayText(reading.note, settings) }) });
		}
		fragment.createDiv({
			cls: CLS.preview,
			text: t('settings.preview.sample', { words: formatNumber(SAMPLE_WORDS), text: displayText(sample, settings) }),
		});
	});
}

function previewRow(context: DefinitionContext): SettingDefinition {
	return {
		name: t('settings.preview.name'),
		searchable: false,
		render: (setting: Setting) => {
			const refresh = () => {
				setting.setDesc(previewFragment(context));
			};
			refresh();
			context.previews.add(refresh);
			return () => {
				context.previews.delete(refresh);
			};
		},
	};
}

export function settingDefinitions(context: DefinitionContext): SettingDefinitionItem[] {
	const { settings } = context;
	const variables = VARIABLES.map((name) => `{${name}}`).join(' ');
	return [
		{
			type: 'group',
			heading: t('settings.reading.heading'),
			items: [
				{
					name: t('settings.speed.name'),
					desc: t('settings.speed.desc'),
					control: { type: 'number', key: key.wordsPerMinute, min: MIN_WPM, max: MAX_WPM, step: 1, validate: speedError },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.display.heading'),
			items: [
				{
					name: t('settings.format.name'),
					desc: t('settings.format.desc'),
					control: { type: 'dropdown', key: key.format, options: formatOptions() },
				},
				{
					name: t('settings.suffix.name'),
					desc: t('settings.suffix.desc'),
					visible: () => settings.format !== 'custom',
					control: { type: 'text', key: key.suffix, placeholder: t('defaults.suffix') },
				},
				{
					name: t('settings.template.name'),
					desc: t('settings.template.desc', { list: variables }),
					visible: () => settings.format === 'custom',
					control: {
						type: 'text',
						key: key.template,
						placeholder: t('defaults.template'),
						validate: templateError,
					},
				},
				previewRow(context),
				{
					name: t('settings.hideEmpty.name'),
					desc: t('settings.hideEmpty.desc'),
					control: { type: 'toggle', key: key.hideEmpty },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.code.heading'),
			items: [
				{
					name: t('settings.codeMode.name'),
					desc: t('settings.codeMode.desc'),
					control: {
						type: 'dropdown',
						key: key.codeMode,
						options: {
							ignore: t('settings.codeMode.ignore'),
							text: t('settings.codeMode.text'),
							speed: t('settings.codeMode.speed'),
						},
					},
				},
				{
					name: t('settings.codeSpeed.name'),
					desc: t('settings.codeSpeed.desc'),
					visible: () => settings.code.mode === 'speed',
					control: { type: 'number', key: key.codeSpeed, min: MIN_WPM, max: MAX_WPM, step: 1, validate: speedError },
				},
				{
					name: t('settings.skip.name'),
					desc: t('settings.skip.desc'),
					visible: () => settings.code.mode !== 'ignore',
					control: { type: 'text', key: key.skipLanguages, placeholder: 'mermaid, dataview' },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.selection.heading'),
			items: [
				{
					name: t('settings.selection.name'),
					desc: t('settings.selection.desc'),
					control: { type: 'toggle', key: key.selection },
				},
			],
		},
		{
			type: 'group',
			heading: t('settings.property.heading'),
			items: [
				{
					name: t('settings.propertyMode.name'),
					desc: t('settings.propertyMode.desc'),
					control: {
						type: 'dropdown',
						key: key.propertyMode,
						options: {
							off: t('settings.propertyMode.off'),
							existing: t('settings.propertyMode.existing'),
							all: t('settings.propertyMode.all'),
						},
					},
				},
				{
					name: t('settings.propertyName.name'),
					desc: t('settings.propertyName.desc'),
					control: {
						type: 'text',
						key: key.propertyName,
						placeholder: 'reading_time',
						validate: (value) => (value.trim() ? undefined : t('validation.propertyName')),
					},
				},
				{
					name: t('settings.exclude.name'),
					desc: t('settings.exclude.desc'),
					control: { type: 'textarea', key: key.excludeFolders, placeholder: '_Templates', rows: 3 },
				},
				{
					name: t('settings.updateAll.name'),
					desc: t('settings.updateAll.desc'),
					action: () => context.updateAll(),
				},
			],
		},
	];
}
