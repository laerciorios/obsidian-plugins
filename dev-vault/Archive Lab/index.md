---
title: "Laboratório de arquivamento"
tags: [test-checklist]
---
# Laboratório de arquivamento

Casos de teste manuais do arquivamento automático e dos perfis de board do Bases Board. Tudo aqui é fictício: os projetos [[Archive Lab/Projects/Estufa Solar/index|Estufa Solar]] e [[Archive Lab/Projects/Viveiro Móvel/index|Viveiro Móvel]] são inventados.

> [!warning] As notas de teste são geradas
> As pastas `Projects/`, `Central/`, `Broken/` e `Boards/` desta pasta são criadas por um script, com datas relativas ao dia de hoje, e ficam fora do git. Só esta nota e `lab.base` são versionadas. Não conserte cards gerados à mão: gere as fixtures de novo.

## Como preparar

1. Na raiz do repo, gere as fixtures: `pnpm --filter bases-board fixtures`. O script apaga e recria as pastas geradas (desfaz os arquivos movidos na rodada anterior) e reescreve as configurações do plugin em `dev-vault/.obsidian/plugins/bases-board/data.json`, com três perfis e nenhum confirmado.
2. Rode `pnpm --filter bases-board dev` e abra `dev-vault/` no Obsidian.
3. Antes de cada rodada de testes, gere as fixtures de novo. Com o Obsidian aberto no dev-vault, o plugin relê as configurações sozinho; se isso não acontecer, feche e abra o vault.

### Configuração gerada

| Perfil | Id | Tag | Pasta dos cards | Arquivar em | Sem `completed` |
|---|---|---|---|---|---|
| Padrão | `default` | `card` | `Archive Lab/Projects` | `{cardFolder}/Archived` | pular |
| Central | `central` | `lab-card` | `Archive Lab/Central` | `Archive Lab/Boards/Archived/{projectSlug}`, gravando `archived_from` | usar a data de modificação |
| Quebrado | `broken` | `broken-card` | `Archive Lab/Broken` | `{cardFolder}/{nope}` (token inexistente) | pular |

Os três perfis arquivam depois de 30 dias (`afterDays`). O Padrão grava `completed` só com a data e cria cards a partir de `_Templates/card.md`; o Central grava data e hora (`YYYY-MM-DDTHH:mm`). Configuração global: roda ao abrir o vault depois de 5 s, sem intervalo, no máximo 50 cards por execução, pede confirmação na primeira execução de cada perfil e mostra aviso.

## Fixtures

O nome de cada card é `<created>-<slug>.md`. As datas mudam a cada geração, por isso a tabela mostra a idade de `completed`. O resultado esperado vale para `afterDays` = 30. As pastas são relativas a `Archive Lab/`.

| Pasta | Card | Status | `completed` | Esperado |
|---|---|---|---|---|
| `Projects/Estufa Solar/_Tasks` | Medir a umidade das bancadas | todo | vazio | fica |
| `Projects/Estufa Solar/_Tasks` | Instalar sensores de temperatura | doing | vazio | fica |
| `Projects/Estufa Solar/_Tasks` | Revisar o manual de montagem | review | vazio | fica |
| `Projects/Estufa Solar/_Tasks` | Trocar o filtro da bomba | done | há 10 dias | fica (recente) |
| `Projects/Estufa Solar/_Tasks` | Calibrar o timer da irrigação | done | há 29 dias | fica (ainda não passou de 30) |
| `Projects/Estufa Solar/_Tasks` | Vedar as janelas laterais | done | há 31 dias | vai para `_Tasks/Archived/` |
| `Projects/Estufa Solar/_Tasks` | Comprar os painéis fotovoltaicos | done | há 90 dias | vai para `_Tasks/Archived/` |
| `Projects/Estufa Solar/_Tasks` | Limpar as calhas de captação | done | vazio (arquivo modificado há 60 dias) | pulado: sem data de conclusão |
| `Projects/Estufa Solar/_Tasks/Archived` | Escolher o terreno da estufa | done | há 200 dias | já arquivado: não move e some com "Ocultar arquivados" |
| `Projects/Viveiro Móvel/_Tasks` | Projetar o reboque das mudas | todo | vazio | fica |
| `Projects/Viveiro Móvel/_Tasks` | Catalogar as espécies nativas | doing | vazio | fica |
| `Projects/Viveiro Móvel/_Tasks` | Soldar as prateleiras do reboque | done | há 31 dias | vai para `_Tasks/Archived/` |
| `Projects/Viveiro Móvel/_Tasks` | Definir a rota de visitas às escolas | done | há 90 dias | vai para `_Tasks/Archived/` |
| `Central` | Aprovar o orçamento da cobertura (Estufa Solar) | done | há 31 dias, com hora | vai para `Boards/Archived/estufa-solar/` |
| `Central` | Registrar a licença de circulação (Viveiro Móvel) | done | há 90 dias, com hora | vai para `Boards/Archived/viveiro-movel/` |
| `Central` | Organizar a planilha de fornecedores (sem projeto) | done | há 45 dias, com hora | pulado: `{projectSlug}` sem valor |
| `Central` | Fotografar a obra concluída (Estufa Solar) | done | vazio (arquivo modificado há 60 dias) | vai para `Boards/Archived/estufa-solar/` pela data de modificação |
| `Central` | Agendar a vistoria do reboque (Viveiro Móvel) | todo | vazio | fica |
| `Broken` | Encerrar o contrato de manutenção | done | há 90 dias | nunca move: padrão de arquivo inválido |

Outras notas geradas:

- `Projects/Estufa Solar/index.md` e `Projects/Viveiro Móvel/index.md`: notas de projeto (`slug` `estufa-solar` e `viveiro-movel`).
- [[Archive Lab/Projects/Estufa Solar/retrospectiva|retrospectiva]]: não é card. Tem um link com caminho completo para "Comprar os painéis fotovoltaicos" e um link curto (`[[<nome do arquivo>]]`) para "Vedar as janelas laterais".

> [!note] Data de modificação
> "Fotografar a obra concluída" depende da data de modificação do arquivo. Não abra esse card para editar antes do teste; se editar, gere as fixtures de novo.

## Checklist

### Primeira execução

- [ ] Abra o vault (ou recarregue o plugin) e espere uns 5 s.
  - Esperado: abre um modal de pré-visualização para os perfis ainda não confirmados (`confirmFirstRun`). Nada é movido antes da confirmação.

### Pré-visualizar arquivamento

- [ ] Rode o comando "Pré-visualizar arquivamento".
  - Esperado, perfil Padrão: lista exatamente quatro cards, os de 31 e 90 dias da Estufa Solar (Vedar as janelas laterais, Comprar os painéis fotovoltaicos) e do Viveiro Móvel (Soldar as prateleiras do reboque, Definir a rota de visitas às escolas).
  - Esperado, perfil Central: lista três cards, Aprovar o orçamento da cobertura (31 dias), Registrar a licença de circulação (90 dias) e Fotografar a obra concluída (sem `completed`, modificado há 60 dias).
  - Esperado, pulados: Limpar as calhas de captação, do Padrão (motivo: sem data de conclusão), e Organizar a planilha de fornecedores, do Central (motivo: token `{projectSlug}` sem valor).
  - Esperado, perfil Quebrado: mostra erro de padrão inválido e não move nada.
  - Esperado: não aparecem os cards de 10 e 29 dias, os cards em todo, doing e review, nem o card já arquivado (Escolher o terreno da estufa).

### Arquivar

- [ ] Confirme com "Arquivar".
  - Esperado: os cards do Padrão estão em `<pasta do card>/Archived/`, ou seja, `Projects/Estufa Solar/_Tasks/Archived/` e `Projects/Viveiro Móvel/_Tasks/Archived/`.
  - Esperado: os cards do Central estão em `Archive Lab/Boards/Archived/estufa-solar/` e `Archive Lab/Boards/Archived/viveiro-movel/`, com `archived_from: Archive Lab/Central`.
  - Esperado: os dois links da [[Archive Lab/Projects/Estufa Solar/retrospectiva|retrospectiva]] apontam para os novos caminhos. O de caminho completo foi reescrito para `_Tasks/Archived/` e o curto continua abrindo o card. Nenhum link fica quebrado.
  - Esperado: o board "Padrão" esconde os arquivados do perfil Padrão; o "Padrão (com arquivados)" mostra todos; o board "Central" esconde os arquivados do Central; a tabela "Todos" continua listando os arquivados, o que prova que o metadata cache e o Bases ainda indexam esses arquivos.
  - Obs.: as views "Padrão" filtram por `#card` no `lab.base`, então mostram só os cards do perfil Padrão. A regra de ocultar usa o padrão de arquivo do perfil da view.
  - Esperado: a busca `tag:#card` ainda encontra os cards arquivados (a tag continua visível).
  - Esperado: o card do perfil Quebrado não saiu de `Broken/`.
- [ ] Rode "Arquivar cards concluídos agora" de novo.
  - Esperado: nada é movido; o card de 200 dias e os recém-arquivados ficam onde estão.

### Mudar o prazo

- [ ] Em Configurações → Bases Board, perfil Padrão, mude o prazo de arquivamento (`afterDays`) para 7 e rode "Pré-visualizar arquivamento".
  - Esperado: a pré-visualização passa a incluir Trocar o filtro da bomba (10 dias), e também Calibrar o timer da irrigação (29 dias). Volte para 30 depois.

### Desarquivar

- [ ] Abra um card arquivado do Padrão (por exemplo, Vedar as janelas laterais) e rode "Desarquivar card".
  - Esperado: o card volta para `_Tasks/`, a pasta pai de `Archived`, e o status continua `done`.
- [ ] Abra um card arquivado do Central (por exemplo, Aprovar o orçamento da cobertura) e rode "Desarquivar card".
  - Esperado: o card volta para a pasta gravada em `archived_from` (`Archive Lab/Central`) e `archived_from` é limpo.

### Limite por execução

- [ ] Gere as fixtures de novo. Em Configurações, defina o máximo por execução (`maxPerRun`) como 1 e rode "Arquivar cards concluídos agora" (confirme o modal da primeira execução, se aparecer).
  - Esperado: cada execução move exatamente um card; a próxima move mais um.

### Padrão inválido

- [ ] Em Configurações, abra o perfil Quebrado.
  - Esperado: o campo da pasta de arquivo mostra aviso ou erro de validação (`{nope}` não existe).
  - Esperado: o card de `Broken/` nunca é movido, em nenhuma execução.

### Conflito de nomes

- [ ] Gere as fixtures de novo. Antes de arquivar, crie em `Archive Lab/Projects/Estufa Solar/_Tasks/Archived/` uma nota com o mesmo nome de arquivo de Vedar as janelas laterais (`<created>-vedar-as-janelas-laterais.md`) e arquive.
  - Esperado: o card chega como `<created>-vedar-as-janelas-laterais-1.md` e a nota criada continua intacta. Nada é sobrescrito.

### Novo card

- [ ] No board "Padrão", use "+ Adicionar card" na coluna "A fazer" ("To do" com o Obsidian em inglês) e escolha o projeto Estufa Solar.
  - Esperado: a nota é criada em `Archive Lab/Projects/Estufa Solar/_Tasks/<hoje>-<slug>.md` a partir de `_Templates/card.md`, com `status: todo`, tag `card` e o link do projeto (`[[Archive Lab/Projects/Estufa Solar/index|estufa-solar]]`).
- [ ] Repita na coluna "Concluído" ("Done").
  - Esperado: `completed` é preenchido com a data de hoje.
- [ ] No board "Central", adicione um card na coluna "Concluído" com o projeto Viveiro Móvel.
  - Esperado: o arquivo se chama só `<slug>.md` e fica em `Archive Lab/Central/viveiro-movel/`; `completed` tem data e hora.

## Board

![[lab.base]]
