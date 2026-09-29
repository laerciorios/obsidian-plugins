# Quadro de teste

As colunas do board vêm da propriedade `status` de cada card em `Boards/DB/`:

`todo` → `doing` → `review` → `done`

Um valor fora dessa lista vai para a coluna **Outros** na view `Board (plugin)`. Na view `Board (cards)`, a fórmula `coluna` joga esse mesmo card em "1 · To Do".

Filtros da view do plugin:

- Cards `done` só aparecem se `completed` for de até 14 dias atrás.
- Notas de projeto só aparecem com `status: active`. Por isso [[Projects/Garden App/index|Garden App]] aparece e [[Projects/Recipe Book/index|Recipe Book]] (`paused`) não aparece.

A data de referência do cenário é 2026-09-29.

## Casos de teste

| # | Card | O que testa |
|---|------|-------------|
| 1 | [[2026-09-03-plant-catalog-setup]] | `title` vazio, então o board mostra o nome do arquivo. todo, me, sem prazo |
| 2 | [[2026-09-05-auto-tag-recipes]] | todo, executor AI, prazo futuro (2026-10-10) |
| 3 | [[2026-09-08-fix-watering-reminder]] | todo, prazo vencido (2026-09-20) |
| 4 | [[2026-09-10-spec-offline-sync]] | spec em doing com dois filhos (casos 5 e 6) |
| 5 | [[2026-09-12-offline-storage-layer]] | filho da spec, doing, executor AI |
| 6 | [[2026-09-14-sync-conflict-ui]] | filho da spec, doing, me |
| 7 | [[2026-09-15-recipe-import-form]] | review com prazo vencido (2026-09-25) |
| 8 | [[2026-09-18-ingredient-parser-tests]] | review, executor AI |
| 9 | [[2026-09-20-onboarding-screen]] | done recente (2026-09-27), continua visível |
| 10 | [[2026-09-01-recipe-list-pagination]] | done antigo (2026-09-10), escondido pelo filtro de 14 dias |
| 11 | [[2026-09-22-shopping-list-export]] | status desconhecido (`blocked`), vai para Outros |

## Board

![[kanban.base]]
