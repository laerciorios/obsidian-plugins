import { BOOK_SOURCES, STATUSES } from '../constants';
import type { CatalogSettings } from '../types';
import { catalogFolder, flag, oneOf, vaultPath } from './settings';

/**
 * Settings edited through declarative controls. The keys are the settings
 * fields themselves (the object is flat). Secret ids are written by their
 * own rows (see ./secrets), `lastKind` by the modal.
 */
export const CONTROL_KEYS = ['folder', 'templateFile', 'addSourceLink', 'defaultStatus', 'downloadCovers', 'bookSource'] as const;
export type ControlKey = (typeof CONTROL_KEYS)[number];

const CONTROL_KEY_SET: ReadonlySet<string> = new Set<string>(CONTROL_KEYS);

function isControlKey(key: string): key is ControlKey {
	return CONTROL_KEY_SET.has(key);
}

/** Per-key coercion; an invalid value keeps the current one. */
const WRITERS: { [K in ControlKey]: (settings: CatalogSettings, value: unknown) => void } = {
	folder: (settings, value) => {
		settings.folder = catalogFolder(value, settings.folder);
	},
	templateFile: (settings, value) => {
		settings.templateFile = vaultPath(value, settings.templateFile);
	},
	addSourceLink: (settings, value) => {
		settings.addSourceLink = flag(value, settings.addSourceLink);
	},
	defaultStatus: (settings, value) => {
		settings.defaultStatus = oneOf(value, STATUSES, settings.defaultStatus);
	},
	downloadCovers: (settings, value) => {
		settings.downloadCovers = flag(value, settings.downloadCovers);
	},
	bookSource: (settings, value) => {
		settings.bookSource = oneOf(value, BOOK_SOURCES, settings.bookSource);
	},
};

export function readSetting(settings: CatalogSettings, key: string): unknown {
	return isControlKey(key) ? settings[key] : undefined;
}

/** Returns false for unknown keys (nothing changed). */
export function writeSetting(settings: CatalogSettings, key: string, value: unknown): boolean {
	if (!isControlKey(key)) return false;
	WRITERS[key](settings, value);
	return true;
}
