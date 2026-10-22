import type { FolderStyleSettings } from './types';

export function defaultSettings(): FolderStyleSettings {
	return { version: 1, opacity: 0.12, tintChildren: true, symbolSize: 1, folders: {} };
}

/** `data.json` over the defaults. Validation of each entry comes with the settings tab. */
export function loadedSettings(saved: unknown): FolderStyleSettings {
	if (!saved || typeof saved !== 'object') return defaultSettings();
	return { ...defaultSettings(), ...(saved as Partial<FolderStyleSettings>) };
}
