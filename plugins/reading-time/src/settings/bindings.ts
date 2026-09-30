import type { CodeMode, FormatId, PropertyMode, ReadingTimeSettings } from '../types';
import { isValidSpeed, parseFolders, parseLanguages } from './settings';

/** Control keys of the declarative settings tab, mapped onto the nested settings object. */
export const key = {
	wordsPerMinute: 'wordsPerMinute',
	format: 'format',
	suffix: 'suffix',
	template: 'template',
	hideEmpty: 'hideEmpty',
	selection: 'selection',
	codeMode: 'code.mode',
	codeSpeed: 'code.wordsPerMinute',
	skipLanguages: 'code.skipLanguages',
	propertyMode: 'property.mode',
	propertyName: 'property.name',
	excludeFolders: 'property.excludeFolders',
} as const;

export function readSetting(settings: ReadingTimeSettings, controlKey: string): unknown {
	switch (controlKey) {
		case key.wordsPerMinute:
			return settings.wordsPerMinute;
		case key.format:
			return settings.format;
		case key.suffix:
			return settings.suffix;
		case key.template:
			return settings.template;
		case key.hideEmpty:
			return settings.hideEmpty;
		case key.selection:
			return settings.selection;
		case key.codeMode:
			return settings.code.mode;
		case key.codeSpeed:
			return settings.code.wordsPerMinute;
		case key.skipLanguages:
			return settings.code.skipLanguages.join(', ');
		case key.propertyMode:
			return settings.property.mode;
		case key.propertyName:
			return settings.property.name;
		case key.excludeFolders:
			return settings.property.excludeFolders.join('\n');
		default:
			return undefined;
	}
}

/** Apply a control value. Invalid values are ignored (the control shows the validation message). */
export function writeSetting(settings: ReadingTimeSettings, controlKey: string, value: unknown): void {
	const text = typeof value === 'string' ? value : '';
	switch (controlKey) {
		case key.wordsPerMinute:
			if (isValidSpeed(value)) settings.wordsPerMinute = value;
			break;
		case key.format:
			settings.format = value as FormatId;
			break;
		case key.suffix:
			settings.suffix = text;
			break;
		case key.template:
			settings.template = text;
			break;
		case key.hideEmpty:
			settings.hideEmpty = value === true;
			break;
		case key.selection:
			settings.selection = value === true;
			break;
		case key.codeMode:
			settings.code.mode = value as CodeMode;
			break;
		case key.codeSpeed:
			if (isValidSpeed(value)) settings.code.wordsPerMinute = value;
			break;
		case key.skipLanguages:
			settings.code.skipLanguages = parseLanguages(text);
			break;
		case key.propertyMode:
			settings.property.mode = value as PropertyMode;
			break;
		case key.propertyName:
			if (text.trim()) settings.property.name = text.trim();
			break;
		case key.excludeFolders:
			settings.property.excludeFolders = parseFolders(text);
			break;
	}
}
