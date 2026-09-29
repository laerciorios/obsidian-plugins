# Bases Board

Visualização **Board** (kanban) para o Bases nativo do Obsidian. As colunas vêm de uma propriedade da nota (padrão `status`). Arrastar um card para outra coluna grava o novo valor no frontmatter. O plugin só desenha o resultado da query: filtros, ordenação e limite continuam sendo os da view do Bases.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/bases-board-spec.md`.

## Como usar

1. Num arquivo `.base`, abra o menu de views e troque o layout para **Board** (**Quadro** com o Obsidian em português), ou adicione uma view com `type: bases-board`.
2. Configure as opções da view no mesmo menu. Os valores ficam salvos no próprio `.base`.
3. Arraste os cards entre colunas. Clique abre a nota, Cmd+clique abre em nova aba, e passar o mouse mostra o preview.

## Opções da view

| Opção | Padrão | O que faz |
|---|---|---|
| Propriedade da coluna | `status` | Propriedade da nota que define a coluna. Fórmulas não aparecem, porque não podem ser gravadas. |
| Colunas (valor\|rótulo) | `todo`, `doing`, `review`, `done` | Ordem e rótulo das colunas. O rótulo é opcional. Sem configuração, os rótulos seguem o idioma: *To do, Doing, To review, Done* ou *A fazer, Fazendo, Em revisão, Concluído*. |
| Rótulo para outros valores | `Other` / `Outros` | Coluna para valores fora da lista. Ela não aceita drop. |
| Esconder a coluna de outros quando vazia | ligado | |
| Valor de concluído | `done` | Coluna que grava a data de conclusão. |
| Gravar data de conclusão | ligado | Soltar em `done` grava a data de hoje (`YYYY-MM-DD`). Sair de `done` limpa o campo. |
| Propriedade da data de conclusão | `completed` | |
| Título, Tipo, Projeto, Executor, Prazo | `title`, `type`, `project`, `executor`, `due` | Propriedades mostradas no card. Sem título, o card usa o nome do arquivo. |
| Valor do executor que indica IA | `ai` | Mostra o chip **AI**. |

## O card

- **Borda e badge por tipo**: `task` laranja, `spec` roxo, `project` azul.
- **Chip de projeto**: mostra o alias do link (`[[.../index|slug]]` vira `slug`). Clicar abre o projeto.
- **Prazo**: fica vermelho quando está vencido, exceto na coluna de concluído.
- **Notas `type: project`**: aparecem, mas não podem ser arrastadas.

## Idiomas

A interface segue o idioma do Obsidian: inglês e português do Brasil, com inglês para qualquer outro. Os textos ficam em `src/i18n/en.ts` (fonte) e `src/i18n/pt-br.ts`. Os valores gravados nas notas (`todo`, `done`…) nunca são traduzidos. Rótulos escritos nas opções da view ficam como você escreveu.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Registra a view (`registerBasesView`) e a fonte de hover. |
| `src/i18n/` | Catálogos de texto da interface (inglês e português). |
| `src/view/board-view.ts` | `BoardView extends BasesView`: render, drop otimista, clique e hover. |
| `src/view/options.ts` | Declara as opções e lê a config com defaults. Nunca chama `config.set`. |
| `src/data/columns.ts` | Parse das colunas e agrupamento das entradas. |
| `src/data/values.ts` | Leitura de valores do Bases: texto, datas e links. |
| `src/data/frontmatter.ts` | O único módulo que escreve em notas, via `processFrontMatter`. |
| `src/dnd/drag-controller.ts` | Drag and drop HTML5 nativo, com listeners delegados na raiz. |

O Bases só reexecuta a query depois que o cache de metadados atualiza. Por isso o drop move o card na hora e guarda um "movimento pendente" por até 4 segundos, até a query confirmar o novo valor.

## Desenvolvimento

```bash
pnpm --filter bases-board dev
```

Teste no `dev-vault/` do repositório: o arquivo `Boards/kanban.base` tem a view **Board (plugin)**, e `Boards/index.md` lista o que cada card de teste cobre.

## Limitações do MVP

- Não reordena cards dentro da coluna (previsto para a v1).
- Não tem "+ Adicionar card" nem progresso de spec (v1).
- Não suporta arrastar por toque no mobile (v2).
- Ignora o `groupBy` do Bases. Swimlanes estão previstas para a v2.
