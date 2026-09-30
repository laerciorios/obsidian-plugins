# Daily Work Log

Registra em poucos cliques os projetos trabalhados no dia, na propriedade `projects` da daily note. Os dias passam a aparecer nos backlinks de cada projeto sem ninguém escrever o link com caminho completo à mão.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/daily-work-log-spec.md`.

## Comandos

| Comando | O que faz |
|---|---|
| **Registrar projetos de hoje** (também no ícone de calendário da ribbon) | Abre a daily de hoje (cria pelo template se ela não existe) e mostra a janela com um checkbox por projeto ativo. Marcar grava na hora; desmarcar tira. |
| **Inserir botões de projeto** | Coloca um bloco ` ```work-log ``` ` no cursor. |
| **Inserir resumo semanal** | Coloca um bloco ` ```work-log-summary ``` ` no cursor. |

## Projetos

Um projeto é uma nota com `type: project` e um dos **Status ativos** (padrão `active`), fora das **Pastas ignoradas** (padrão `_Templates`). O nome vem de `title`, senão do nome da pasta do `index.md`, senão do nome do arquivo. Na janela, a empresa (`company`) ou a pasta que guarda o projeto aparece em cinza.

O link gravado tem sempre o caminho completo, porque há muitos `index.md`, e o `slug` como alias:

```yaml
projects:
  - "[[2 - Work/Empresa/Projects/Horta/index|horta]]"
```

Sem `slug` (ou com **Alias do link** vazio), o alias é o nome do projeto.

Um item conta como o projeto quando o link resolve para a nota dele, ou quando é um link sem destino ou texto solto igual a um dos nomes dele (`title`, `slug`, `aliases`, nome da pasta): `[[horta]]` e `horta` contam. Desmarcar tira todos os itens que contam como aquele projeto; o resto da lista (links para outras notas, texto) fica como está, na mesma ordem. Projetos já na nota que não estão ativos continuam na janela, com o status ao lado, para poder tirar.

Toda escrita passa por `processFrontMatter`, uma de cada vez por nota. Uma lista inline (`[a, b]`) é reescrita como lista em bloco quando algo muda, como faz o painel de propriedades.

## Daily note

Pasta, formato e template vêm das configurações do plugin nativo **Daily notes** (lidas de `.obsidian/daily-notes.json`, mesmo com o nativo desligado). A daily nova é criada pelo template com as variáveis do nativo: `{{title}}`, `{{date}}` (no formato da daily), `{{time}}`, `{{date:FORMATO}}` e `{{time:FORMATO}}`. Formatos com pastas (`YYYY/MM/YYYY-MM-DD`) funcionam. Com **Abrir a daily note** desligado, a janela abre sem trocar de nota.

## Sugestões das atas

Uma ata é uma nota numa pasta com o nome de **Pasta das atas** (padrão `_Meetings`, em qualquer nível). Ela é do dia da propriedade `date` ou, sem ela, da data no começo do nome do arquivo (`2026-09-17-mutirao.md`). Os projetos da propriedade `projects` das atas do dia aparecem no topo da janela, com a ata ao lado e o botão **Marcar sugeridos**. Nada é marcado sozinho.

## Botões na nota

````markdown
```work-log
```
````

Um botão por projeto ativo e por projeto já na nota; pressionado = registrado. O clique alterna os `projects` da própria nota, então o bloco funciona em qualquer nota, não só na daily. Numa daily, os projetos das atas daquele dia aparecem tracejados, com as atas no tooltip. Funciona no modo leitura e no live preview.

Para ter os botões no topo de toda daily nova, coloque o bloco no template da daily, depois do frontmatter e de uma linha em branco (o plugin não mexe no template):

````markdown
---
date: {{date:YYYY-MM-DD}}
projects: []
---

```work-log
```
````

A linha em branco importa no live preview: ao abrir a nota, o cursor vai para a primeira linha depois do frontmatter, e um bloco com o cursor dentro aparece como código em vez dos botões.

## Resumo

````markdown
```work-log-summary
period: week
date: 2026-09-16
project: [[2 - Work/Empresa/Projects/Horta/index|horta]]
```
````

| Opção | Padrão | O que é |
|---|---|---|
| `period` | `week` | `week` ou `month` |
| `date` | hoje | Um dia (`YYYY-MM-DD`) do primeiro período mostrado |
| `project` | todos | Link ou nome de um projeto. No `index.md` de um projeto, o padrão é o próprio projeto |

Mostra quantos dias (dailies distintas) cada projeto teve no período, do mais para o menos trabalhado, com os dias como links para as dailies: "Horta — 3 dias (seg 14, ter 15, qui 17)". As setas trocam de semana ou mês sem gravar nada. A semana começa na segunda (configuração **Primeiro dia da semana**). O bloco atualiza sozinho quando uma daily muda. Opções inválidas aparecem como erro no próprio bloco.

## Configurações

| Configuração | Padrão |
|---|---|
| Propriedade | `projects` (nas dailies e nas atas) |
| Abrir a daily note | ligado |
| Status ativos | `active` (vazio = todos os projetos) |
| Alias do link | `slug` |
| Pastas ignoradas | `_Templates` |
| Sugerir pelas atas | ligado |
| Pasta das atas | `_Meetings` |
| Primeiro dia da semana | segunda-feira |

Chaves e valores gravados nas notas (`projects`, `slug`, `active`) são dados: não mudam com o idioma.

## Fora de escopo

Horas por projeto, Periodic Notes e notas semanais, criar projetos ou mudar o `status`, botões injetados no cabeçalho da nota sem o bloco, view do Bases para o resumo (uma base já filtra dailies com `projects.contains(link(...))`), inferir projetos do texto da daily.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações e registra comandos, blocos e a aba. |
| `src/projects/` | Índice dos projetos (reconstruído quando um projeto muda), nomes e link canônico. |
| `src/log/entries.ts` | Funções puras da lista `projects`: quais itens contam como cada projeto, marcar e desmarcar. |
| `src/log/writer.ts` | Leitura pelo cache e escrita por `processFrontMatter`, em fila por nota. |
| `src/daily/daily-notes.ts` | Daily de hoje: caminho, criação pelo template, abrir ou ir para a aba. Usa `@obsidian-plugins/core-plugins`. |
| `src/meetings/meetings.ts` | Atas do dia e os projetos delas. |
| `src/summary/period.ts` | Opções do resumo, semanas e meses, contagem por projeto. |
| `src/blocks/` | Os blocos `work-log` e `work-log-summary`. |
| `src/ui/log-modal.ts` | A janela do comando. |
| `src/changes.ts` | Um sinal só (com debounce) para os blocos redesenharem quando o vault muda. |

## Desenvolvimento

```bash
pnpm --filter daily-work-log dev
```

O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/daily-work-log/` (e para os vaults ligados com `pnpm link-plugin`). Casos de teste em `dev-vault/Daily Work Log/index.md`.

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`.

## Status

Em desenvolvimento (0.1.0). `minAppVersion` 1.13.0 (configurações declarativas).
