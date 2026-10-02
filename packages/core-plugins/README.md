# @obsidian-plugins/core-plugins

O que os plugins precisam para se comportar como os plugins nativos do Obsidian, sem API interna:

- **Daily notes**: lê `<pasta de config>/daily-notes.json` (pasta, formato, template), com os mesmos padrões do nativo quando o arquivo ou um campo falta. Dá o caminho da daily de um dia e o dia de um caminho (parse estrito do formato, que pode ter pastas: `YYYY/MM/YYYY-MM-DD`). Cria a daily de um dia como o nativo (`createDailyNote`): pastas que faltam, template com as variáveis preenchidas, nunca sobrescreve; avisa quando o template configurado não existe (a nota sai vazia) para o plugin mostrar o aviso traduzido.
- **Templates**: preenche `{{title}}`, `{{date}}`, `{{time}}`, `{{date:FORMATO}}` e `{{time:FORMATO}}` (formatos do moment).

Usado pelo Shortcuts (formato da daily), Vault Structure (template do `index.md`) e Daily Work Log (criar e reconhecer dailies).

## Uso

```ts
import { createDailyNote, dailyNotePath, fillTemplate, getDailyNote, readDailyNotesSettings } from '@obsidian-plugins/core-plugins';

const daily = await readDailyNotesSettings(app);
const path = dailyNotePath(daily, moment()); // "Daily Notes/2026-09-30.md"
const content = fillTemplate(template, { title: '2026-09-30', date: moment(), dateFormat: daily.format });
const file = getDailyNote(app, daily, moment()) ?? (await createDailyNote(app, daily, moment())).file;
```

Sem texto de interface: nada aqui passa por tradução.
