---
title: "Spec: sincronização offline"
type: spec
status: doing
project: "[[Projects/Garden App/index|garden-app]]"
parent: ""
executor: me
created: 2026-09-10
due:
completed:
tags: [card]
---
## Contexto

No quintal o sinal é fraco. O app precisa funcionar sem internet e sincronizar quando a conexão voltar.

## O que fazer

Definir o modelo de dados local, a fila de alterações pendentes e a regra para resolver conflitos. Os cards filhos (campo `parent`) aparecem nos backlinks desta nota.

## Critérios de aceite

- [ ] Modelo de dados local documentado
- [ ] Regra de conflito definida (última escrita vence ou escolha manual)
- [ ] Cards filhos criados e ligados a esta spec

## Bloqueado por

- Nada
