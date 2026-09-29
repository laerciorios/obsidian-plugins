---
title: "Camada de armazenamento local"
type: task
status: doing
project: "[[Projects/Garden App/index|garden-app]]"
parent: "[[2026-09-10-spec-offline-sync]]"
executor: ai
created: 2026-09-12
due:
completed:
tags: [card]
---
## Contexto

Parte da spec de sincronização offline. Hoje tudo é lido direto da API.

## O que fazer

Salvar plantas e registros de rega em IndexedDB e manter uma fila de alterações pendentes.

## Critérios de aceite

- [ ] App abre sem rede com os dados da última sessão
- [ ] Alterações feitas offline entram na fila

## Bloqueado por

- Nada
