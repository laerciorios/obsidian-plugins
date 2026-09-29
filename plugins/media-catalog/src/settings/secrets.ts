import { SecretComponent } from 'obsidian';
import type { App, Setting, SettingDefinitionRender } from 'obsidian';
import type { CatalogSettings } from '../types';

/**
 * API keys live in Obsidian's secret storage (Settings › Keychain). The
 * plugin only stores the id of the secret the user linked: SecretComponent's
 * value is that id ("Link" opens the secret picker, the × clears it), and the
 * key itself is read with getSecret() at the moment a request needs it.
 */

export type SecretKey = 'igdbClientId' | 'igdbClientSecret' | 'googleBooksApiKey';

/** Value of a secret by id from app.secretStorage; null when id is empty or not found. */
export function readSecret(app: App, id: string): string | null {
	const trimmed = id.trim();
	if (!trimmed) return null;
	const value = app.secretStorage.getSecret(trimmed)?.trim();
	return value ? value : null;
}

/** Twitch app credentials for IGDB, or null until both secrets are linked and set. */
export function igdbCredentials(app: App, settings: CatalogSettings): { clientId: string; clientSecret: string } | null {
	const clientId = readSecret(app, settings.igdbClientId);
	const clientSecret = readSecret(app, settings.igdbClientSecret);
	return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function googleBooksKey(app: App, settings: CatalogSettings): string | null {
	return readSecret(app, settings.googleBooksApiKey);
}

export interface SecretRowOptions {
	app: App;
	key: SecretKey;
	name: string;
	desc: string;
	/** Read at render time, so the row always shows the current id. */
	settings: () => CatalogSettings;
	changed: () => void;
}

/** Settings row with Obsidian's secret picker. Stores the chosen secret id in `settings[key]`. */
export function secretRow(options: SecretRowOptions): SettingDefinitionRender {
	const { app, key, name, desc } = options;
	return {
		name,
		desc,
		render: (setting: Setting) => {
			new SecretComponent(app, setting.controlEl)
				.setValue(options.settings()[key])
				// The × button reports null, not "".
				.onChange((id: string | null) => {
					options.settings()[key] = typeof id === 'string' ? id.trim() : '';
					options.changed();
				});
		},
	};
}
