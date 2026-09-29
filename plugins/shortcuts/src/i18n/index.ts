import { createI18n } from '@obsidian-plugins/i18n';
import { en } from './en';
import { ptBR } from './pt-br';

export type MessageKey = keyof typeof en;

export const { t, locale } = createI18n({ en, 'pt-BR': ptBR });
