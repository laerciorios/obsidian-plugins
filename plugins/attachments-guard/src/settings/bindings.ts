import type { AttachmentsGuardSettings } from '../types';
import { folderError, isValidSize, parseFolder, parseFolders, parseLines, parseTag, patternError } from './settings';

/** Control keys of the declarative settings tab. */
export const key = {
	organize: 'organize',
	folder: 'folder',
	pattern: 'pattern',
	genericNames: 'genericNames',
	maxSizeMb: 'maxSizeMb',
	coverProperty: 'coverProperty',
	aiTag: 'aiTag',
	aiFolder: 'aiFolder',
	ignoredFolders: 'ignoredFolders',
} as const;

export function readSetting(settings: AttachmentsGuardSettings, controlKey: string): unknown {
	switch (controlKey) {
		case key.organize:
			return settings.organize;
		case key.folder:
			return settings.folder;
		case key.pattern:
			return settings.pattern;
		case key.genericNames:
			return settings.genericNames.join('\n');
		case key.maxSizeMb:
			return settings.maxSizeMb;
		case key.coverProperty:
			return settings.coverProperty;
		case key.aiTag:
			return settings.aiTag;
		case key.aiFolder:
			return settings.aiFolder;
		case key.ignoredFolders:
			return settings.ignoredFolders.join('\n');
		default:
			return undefined;
	}
}

/** Apply a control value. Invalid values are ignored (the control shows the validation message). */
export function writeSetting(settings: AttachmentsGuardSettings, controlKey: string, value: unknown): void {
	const text = typeof value === 'string' ? value : '';
	switch (controlKey) {
		case key.organize:
			settings.organize = value === true;
			break;
		case key.folder:
			if (!folderError(text, true)) settings.folder = parseFolder(text);
			break;
		case key.pattern:
			if (!patternError(text)) settings.pattern = text.trim();
			break;
		case key.genericNames:
			settings.genericNames = parseLines(text);
			break;
		case key.maxSizeMb:
			if (isValidSize(value)) settings.maxSizeMb = value;
			break;
		case key.coverProperty:
			settings.coverProperty = text.trim();
			break;
		case key.aiTag:
			settings.aiTag = parseTag(text);
			break;
		case key.aiFolder:
			if (!folderError(text, false)) settings.aiFolder = parseFolder(text);
			break;
		case key.ignoredFolders:
			settings.ignoredFolders = parseFolders(text);
			break;
	}
}
