import { DEFAULT_RULES_PATH } from '../constants';
import { t } from '../i18n';
import type { VaultStructureSettings } from '../types';
import { cleanPath } from '../vault/paths';

/** The default is a vault path (data), so nothing is translated here. */
export function defaultSettings(): VaultStructureSettings {
	return { version: 1, rulesPath: DEFAULT_RULES_PATH };
}

export function rulesPathError(value: string): string | void {
	const path = cleanPath(value);
	if (!path.toLowerCase().endsWith('.md') || path.length <= 3) return t('validation.rulesPath');
	if (path.split('/').some((part) => part.startsWith('.'))) return t('validation.hidden');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accept anything `loadData()` returns: missing or invalid fields get defaults. */
export function normalizeSettings(raw: unknown): VaultStructureSettings {
	const defaults = defaultSettings();
	if (!isRecord(raw)) return defaults;
	const rulesPath = typeof raw.rulesPath === 'string' ? raw.rulesPath : defaults.rulesPath;
	return { version: 1, rulesPath: rulesPathError(rulesPath) ? defaults.rulesPath : cleanPath(rulesPath) };
}
