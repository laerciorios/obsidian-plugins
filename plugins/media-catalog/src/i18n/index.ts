import { createI18n } from '@obsidian-plugins/i18n';
import { en } from './en';
import { ptBR } from './pt-br';

/** Translate UI text. Follows the Obsidian app language; falls back to English. */
export const { t, locale } = createI18n({ en, 'pt-BR': ptBR });

export type MessageKey = keyof typeof en;
