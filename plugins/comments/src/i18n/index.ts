import { createI18n } from '@obsidian-plugins/i18n';
import { en } from './en';
import { ptBR } from './pt-br';

export type MessageKey = keyof typeof en;

/** Translate UI text. Follows the Obsidian app language; falls back to English. */
export const { t, locale } = createI18n({ en, 'pt-BR': ptBR });

type PluralBase<K> = K extends `${infer Base}.one` ? Base : never;

/** "1 comment" / "3 comments": keys `<base>.one` and `<base>.other`. */
export function plural(base: PluralBase<MessageKey>, count: number): string {
	return t(`${base}.${count === 1 ? 'one' : 'other'}` as MessageKey, { count });
}
