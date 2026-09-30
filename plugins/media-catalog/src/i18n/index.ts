import { createI18n } from '@obsidian-plugins/i18n';
import { en } from './en';
import { ptBR } from './pt-br';

const CATALOG = { en, 'pt-BR': ptBR };

/** Translate UI text. Follows the Obsidian app language; falls back to English. */
export const { t, locale } = createI18n(CATALOG);

export type MessageKey = keyof typeof en;

/**
 * One message in every language, for note text written in the app language
 * and read back whatever the language is now (the "Tracks" heading).
 */
export function inEveryLocale(key: MessageKey): string[] {
	return Object.values(CATALOG).map((messages) => messages[key]);
}
