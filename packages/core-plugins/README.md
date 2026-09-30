# @obsidian-plugins/core-plugins

O que os plugins precisam para se comportar como os plugins nativos do Obsidian, sem API interna:

- **Daily notes**: lê `<pasta de config>/daily-notes.json` (pasta, formato, template), com os mesmos padrões do nativo quando o arquivo ou um campo falta. Dá o caminho da daily de um dia e o dia de um caminho (parse estrito do formato, que pode ter pastas: `YYYY/MM/YYYY-MM-DD`).
- **Templates**: preenche `{{title}}`, `{{date}}`, `{{time}}`, `{{date:FORMATO}}` e `{{time:FORMATO}}` (formatos do moment).

Usado pelo Shortcuts (formato da daily), Vault Structure (template do `index.md`) e Daily Work Log (criar e reconhecer dailies).

## Uso

```ts
import { dailyNotePath, fillTemplate, readDailyNotesSettings } from '@obsidian-plugins/core-plugins';

const daily = await readDailyNotesSettings(app);
const path = dailyNotePath(daily, moment()); // "Daily Notes/2026-09-30.md"
const content = fillTemplate(template, { title: '2026-09-30', date: moment(), dateFormat: daily.format });
```

Sem texto de interface: nada aqui passa por tradução.
