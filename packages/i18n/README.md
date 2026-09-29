# @obsidian-plugins/i18n

Tradução da interface dos plugins. Segue o idioma configurado no Obsidian (**Settings → General → Language**) e cai para inglês quando não há tradução.

## Uso num plugin

```ts
// src/i18n/en.ts — fonte da verdade
import type { Messages } from '@obsidian-plugins/i18n';
export const en = {
	'notice.saved': 'Saved {name}.',
} satisfies Messages;

// src/i18n/pt-br.ts — o TypeScript exige todas as chaves do inglês
import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';
export const ptBR: Translation<typeof en> = {
	'notice.saved': '{name} salvo.',
};

// src/i18n/index.ts
import { createI18n } from '@obsidian-plugins/i18n';
import { en } from './en';
import { ptBR } from './pt-br';
export const { t, locale } = createI18n({ en, 'pt-BR': ptBR });

// em qualquer módulo
new Notice(t('notice.saved', { name: file.basename }));
```

## Regras

- Chaves planas, agrupadas por prefixo (`view.`, `option.`, `notice.`).
- Parâmetros entre chaves: `{name}`. Parâmetro ausente fica como está no texto.
- O idioma é resolvido na primeira tradução e não muda até recarregar o plugin (o Obsidian também exige reiniciar para trocar de idioma).
- Resolução: código exato (`pt-BR`), depois o idioma base (`pt` usa `pt-BR`), depois `en`.
- Um idioma novo é um arquivo novo em `src/i18n/` + uma entrada no `createI18n`.
