# Daily Calendar

Calendário do mês no painel lateral para navegar pelas daily notes e ver o que aconteceu em cada dia: daily, projetos, reuniões, cards concluídos e itens do catálogo terminados.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/daily-calendar-spec.md`.

## Abrir

Comando **Abrir calendário** ou o ícone de calendário com dias na ribbon: abre a view no painel direito (ou mostra a que já está aberta). O plugin não abre a view sozinho; depois de aberta, o Obsidian a mantém no layout.

## O mês

- Grade sempre com 6 semanas, para a altura não pular entre os meses. Os dias do mês anterior e do próximo aparecem apagados.
- **‹** e **›** trocam de mês; **Hoje** volta para o mês atual.
- Nomes de mês e de dia no idioma do Obsidian.
- Destaques: hoje (círculo na cor de destaque), o dia da daily aberta na aba ativa (contorno) e os fins de semana (fundo, desligável). O calendário não muda de mês sozinho quando a nota ativa é de outro mês. Na virada do dia, o destaque de hoje muda sozinho.

## Clique no dia

- Abre a daily note do dia: na aba que já a mostra, senão na aba atual. Cmd/Ctrl+clique ou botão do meio abrem em nova aba (Cmd/Ctrl+Alt: ao lado, como nos links do Obsidian).
- Se a daily não existe, uma janela pergunta antes de criar (desligável em **Confirmar antes de criar**). A nota é criada como no plugin nativo: pasta, formato e template das daily notes nativas, pastas que faltam criadas, variáveis `{{title}}`, `{{date}}` (no formato da daily e com a data do dia clicado, não a de hoje), `{{time}}`, `{{date:FORMATO}}` e `{{time:FORMATO}}`.
- Nunca sobrescreve: uma pasta com o nome da daily só mostra um aviso. Se o template configurado não existe, a nota sai vazia, com aviso.
- É a única escrita do plugin: nenhuma nota existente é alterada.

## Marcadores

Cada fonte é ligável nas configurações e tem uma entrada na legenda embaixo do calendário.

| Fonte | Marcador | Regra |
|---|---|---|
| **Daily note** | ponto na cor de destaque | O arquivo bate com a pasta e o formato das daily notes nativas (parse estrito). |
| **Projetos** | número no canto do dia | Itens da propriedade `projects` da daily (lista, lista inline ou um valor só). O mesmo projeto repetido conta uma vez. |
| **Reuniões** | ponto azul | Nota numa pasta chamada `_Meetings` (em qualquer nível) cujo nome começa com `YYYY-MM-DD` seguido de fim ou de algo que não é dígito (`2026-09-17-mutirao`, `2026-09-17-daily`). Vale o nome, não a propriedade `date`. |
| **Cards concluídos** | ponto verde | Nota com a tag `card` (no frontmatter ou no texto; com ou sem `#`, sem diferenciar maiúsculas; `card/extra` não conta) e data em `completed`. Cards em `Archived/` contam. |
| **Catálogo** | ponto laranja | Nota dentro de `1 - Knowledge/Entertainment/DB` (subpastas incluídas) com data em `finished`. |

Datas valem como `2026-09-30` ou com hora (`2026-09-30T18:30`, `2026-09-30 18:30`): conta o dia. Datas impossíveis (`2026-02-30`), texto e listas são ignorados. Pasta, tag e propriedades são configuráveis e são dados: não mudam com o idioma.

Os dias dos meses vizinhos (apagados) também mostram os marcadores. O resumo de cada dia (data, daily, contagens) vai em texto para leitor de tela.

O calendário se atualiza sozinho: criar, apagar, renomear ou editar notas refaz as marcações dos 42 dias na tela (com debounce de 300 ms; se nada mudou, a grade não é redesenhada). Nada é lido do conteúdo das notas, só do cache de metadados e dos nomes. As configurações das daily notes nativas são relidas a cada recálculo.

## Lista do dia

Passar o mouse num dia (por 350 ms) abre a lista do que há nele: a data por extenso e uma seção por fonte, com os itens.

- Clicar num item abre a nota (Cmd/Ctrl+clique ou botão do meio: nova aba) e fecha a lista. Projetos que não são notas (link sem destino, texto solto) aparecem em cinza, sem clique.
- Um projeto que é nota aparece pelo `title` dela, senão pelo nome da pasta de um `index.md`, senão pelo nome do arquivo. O mesmo vale para atas, cards e itens do catálogo.
- A lista some ao sair do dia e dela, com Esc, ao clicar fora, ao trocar de mês e quando o calendário se redesenha. Dia sem nada não abre lista.
- No celular (ou em tela de toque), **toque longo** (meio segundo) abre a mesma lista; o toque longo nunca abre nem cria a daily. Tocar fora fecha. O toque curto abre a daily, como o clique.
- Fica abaixo do dia, ou acima quando não cabe, sempre dentro da janela (também numa janela destacada).

## Configurações

| Configuração | Padrão |
|---|---|
| Início da semana | segunda-feira (ou domingo) |
| Destacar fins de semana | ligado |
| Confirmar antes de criar | ligado |
| Marcar as daily notes / Contar projetos / Marcar reuniões / Marcar cards concluídos / Marcar itens do catálogo terminados | todos ligados |
| Propriedade dos projetos | `projects` |
| Pasta das atas | `_Meetings` (nome de pasta, sem `/`) |
| Tag dos cards e propriedade de conclusão | `card`, `completed` |
| Pasta do catálogo e propriedade de término | `1 - Knowledge/Entertainment/DB`, `finished` |

Os campos de uma fonte só aparecem com ela ligada. Valores inválidos (pasta das atas com `/`, tag com espaço, propriedade vazia) mostram o erro no campo e não são gravados.

A linha **Daily notes** mostra pasta, formato e template das daily notes, lidos das configurações do plugin nativo (`.obsidian/daily-notes.json`, mesmo com o nativo desligado).

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações e registra view, comando, ribbon e aba. |
| `src/calendar/grid.ts` | Funções puras: grade de 6 semanas, ordem dos dias da semana. |
| `src/daily/daily-notes.ts` | Configurações das daily notes (pelo `@obsidian-plugins/core-plugins`) e o dia de uma daily pelo caminho. |
| `src/daily/open.ts` | Clique no dia: abrir a daily ou criar pelo template (`createDailyNote` do pacote). |
| `src/index/marks.ts` | Funções puras: marcações de cada dia a partir de fatos das notas (caminho, nome, frontmatter, tags, links do frontmatter). |
| `src/index/values.ts` | Funções puras: data de uma propriedade, dia no começo de um nome, pastas, tags, itens de `projects`. |
| `src/index/month-index.ts` | Lê a lista de notas e o cache de metadados para as funções puras. |
| `src/view/calendar-view.ts` | A view: cabeçalho, grade, destaques, eventos do vault. |
| `src/view/day-cell.ts` | Marcadores de um dia, o resumo para leitor de tela e a legenda. |
| `src/view/day-popover.ts` | A lista do dia: conteúdo, posição, quando some. |
| `src/view/grid-events.ts` | Clique, hover e toque longo nos dias (delegados à grade). |
| `src/view/confirm-modal.ts` | Janela "Criar a daily note?". |
| `src/settings/` | Padrões, normalização e a aba de configurações. |

## Desenvolvimento

```bash
pnpm --filter daily-calendar dev
```

O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/daily-calendar/` (e para os vaults ligados com `pnpm link-plugin`). Casos de teste em `dev-vault/Daily Calendar/index.md`.

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`. Nomes de mês e de dia vêm do `moment`, no idioma do Obsidian.

## Fora de escopo (por enquanto)

Registrados na spec como "Depois": números da semana e nota semanal (`YYYY-[W]WW`) pelo template, visão de ano com mapa de calor, menu de contexto do dia (abrir as reuniões do dia, criar card com prazo no dia). Também fora: Periodic Notes, ler o conteúdo das notas (palavras, tarefas), arrastar notas para um dia.

## Status

Em desenvolvimento (0.1.0). `minAppVersion` 1.13.0 (configurações declarativas).
