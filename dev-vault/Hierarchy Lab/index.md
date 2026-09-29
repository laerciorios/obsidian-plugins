---
title: "Laboratório de hierarquia"
tags: [test-checklist]
---
# Laboratório de hierarquia

Casos de teste manuais da hierarquia nos cards do Bases Board (projeto → spec → tarefa): barra de progresso e lista de filhos na spec, chip "↑ spec" e cadeado de bloqueio na tarefa, resumo no card de projeto. Tudo aqui é fictício: os projetos [[Hierarchy Lab/Projects/Horta Vertical/index|Horta Vertical]] e [[Hierarchy Lab/Projects/Estufa Modular/index|Estufa Modular]] e os cinco projetos da pasta `Stress/` são inventados.

> [!warning] As notas de teste são geradas
> As pastas `Projects/` e `Stress/` desta pasta são criadas por um script, com datas relativas ao dia de hoje, e ficam fora do git. Só esta nota e `hierarchy.base` são versionadas. Não conserte cards gerados à mão: gere as fixtures de novo.

## Como preparar

1. Na raiz do repo, gere as fixtures: `pnpm --filter bases-board fixtures:hierarchy`. O script apaga e recria `Projects/` e `Stress/` (desfaz renomeações, movimentos e edições da rodada anterior) e grava o perfil `hierarchy` ("Hierarquia") em `dev-vault/.obsidian/plugins/bases-board/data.json`, sem mexer nos outros perfis.
2. Rode `pnpm --filter bases-board dev` e abra `dev-vault/` no Obsidian.
3. Antes de cada rodada de testes, gere as fixtures de novo. Com o Obsidian aberto no dev-vault, o plugin relê as configurações sozinho quando o `data.json` muda; se isso não acontecer, feche e abra o vault.

O script do laboratório de arquivamento (`pnpm --filter bases-board fixtures`) reescreve o `data.json`, mas mantém o perfil `hierarchy`. Dá para rodar os dois em qualquer ordem.

### Perfil gerado

| Campo | Valor |
|---|---|
| Id e nome | `hierarchy`, Hierarquia |
| Cards | tag `card` em `Hierarchy Lab`, exceto `_Templates` |
| Propriedades | `status` (concluído = `done`), `completed` (data), `project`, `parent`, `order`, `blocked_by`, `type` (spec = `spec`) |
| Hierarquia | ligada; contar arquivados (`countArchived`) ligado; recolher acima de 5 linhas (`collapseAbove`); resumo nos projetos ligado |
| Arquivamento | desligado. A pasta de arquivo `{cardFolder}/Archived` serve só para reconhecer os cards arquivados |
| Novo card | `{projectFolder}/_Tasks`, nome `{date:YYYY-MM-DD}-{slug}`, modelo `_Templates/card.md` |

Todo card concluído tem `completed` entre 1 e 10 dias atrás (exceto o que já está em `Archived/`), então nenhum perfil de arquivamento mexe nesta pasta.

## Cenário principal

Arquivos em `Hierarchy Lab/Projects/`, na ordem em que o script os cria. Os nomes não têm data, para esta tabela ficar estável. Nos links, "completo" é `[[Hierarchy Lab/Projects/…/arquivo|Título]]` e "curto" é `[[arquivo]]`.

| Arquivo | `type` | `status` | `order` | `project` | `parent` | `blocked_by` |
|---|---|---|---|---|---|---|
| `Horta Vertical/index.md` | project | active | | | | |
| `Horta Vertical/_Tasks/spec-irrigacao-automatica.md` | spec | doing | vazio | Horta Vertical | vazio | vazio |
| `Horta Vertical/_Tasks/instalar-as-valvulas-solenoides.md` | task | todo | 4 | Horta Vertical | spec A, completo | Passar a tubulação principal, **curto** |
| `Horta Vertical/_Tasks/passar-a-tubulacao-principal.md` | task | doing | 2 | Horta Vertical | spec A, completo | vazio |
| `Horta Vertical/_Tasks/documentar-o-esquema-hidraulico.md` | task | review | vazio | Horta Vertical | spec A, **curto** | vazio |
| `Horta Vertical/_Tasks/testar-a-pressao-da-bomba.md` | task | done (há 4 dias) | 3 | Horta Vertical | spec A, completo | vazio |
| `Horta Vertical/_Tasks/programar-o-controlador-de-rega.md` | task | todo | 5 | Horta Vertical | spec A, completo | Testar a pressão da bomba, completo |
| `Horta Vertical/_Tasks/Archived/escolher-o-modelo-de-bomba.md` | task | done (há 200 dias) | 1 | Horta Vertical | spec A, completo | vazio |
| `Horta Vertical/_Tasks/spec-painel-de-sensores.md` | spec | todo | vazio | Horta Vertical | vazio | vazio |
| `Horta Vertical/_Tasks/soldar-os-sensores-de-umidade.md` | task | todo | 2 | Horta Vertical | spec B, completo | vazio |
| `Horta Vertical/_Tasks/calibrar-o-sensor-de-luminosidade.md` | task | done (há 2 dias) | 1 | **vazio** (herda da spec B) | spec B, completo | vazio |
| `Horta Vertical/_Tasks/pintar-a-estrutura-metalica.md` | task | doing | vazio | Horta Vertical | vazio | vazio |
| `Horta Vertical/_Tasks/comprar-o-substrato-de-fibra-de-coco.md` | task | todo | vazio | Horta Vertical | vazio | `[[nota-que-nao-existe]]` (**não existe**) |
| `Estufa Modular/index.md` | project | active | | | | |
| `Estufa Modular/_Tasks/spec-cobertura-retratil.md` | spec | todo | vazio | Estufa Modular | vazio | vazio |
| `Estufa Modular/_Tasks/cortar-os-perfis-de-aluminio.md` | task | todo | 1 | Estufa Modular | spec Estufa, completo | vazio |
| `Estufa Modular/_Tasks/costurar-a-lona-da-cobertura.md` | task | todo | 2 | Estufa Modular | spec Estufa, completo | vazio |

Spec A = "Spec: irrigação automática"; spec B = "Spec: painel de sensores"; spec Estufa = "Spec: cobertura retrátil".

Os filhos ativos da spec A são criados com `order` 4, 2, vazio, 3 e 5, e os títulos em ordem alfabética também não batem com `order`: se a lista sair na ordem de criação ou do alfabeto, está errada. "Documentar o esquema hidráulico" não tem `order` de propósito, para provar que filhos sem `order` vão para o fim.

## Resultado esperado

"Ligado" e "desligado" se referem a "Contar arquivados" (`countArchived`) no perfil Hierarquia. O padrão é ligado. A barra conta só os filhos diretos: concluído = `status: done`.

| Card | Contar arquivados ligado | Contar arquivados desligado |
|---|---|---|
| Spec: irrigação automática | barra **2/6**; lista **recolhida** (6 linhas > 5) | barra **1/5**; lista **aberta** (5 linhas) |
| Spec: painel de sensores | barra **1/2**; lista aberta | igual |
| Spec: cobertura retrátil | barra **0/2**; lista aberta | igual |
| Projeto Horta Vertical | "**2 specs · 10 tarefas**"; barra de tarefas **3/10**; lista: Spec: irrigação automática (doing, 2/6), Spec: painel de sensores (todo, 1/2) | "**2 specs · 9 tarefas**"; barra **2/9**; lista: spec A com 1/5, spec B com 1/2 |
| Projeto Estufa Modular | "**1 spec · 2 tarefas**"; barra **0/2**; lista: Spec: cobertura retrátil (todo, 0/2) | igual |

As tarefas da Horta Vertical são os 6 filhos da spec A (5 ativos e 1 arquivado), os 2 da spec B (um deles herda o projeto), "Pintar a estrutura metálica" e "Comprar o substrato de fibra de coco". Concluídas: "Testar a pressão da bomba", "Calibrar o sensor de luminosidade" e a arquivada "Escolher o modelo de bomba". As specs não contam como tarefa. O número de tarefas do resumo segue a mesma regra da barra: com "contar arquivados" desligado, a arquivada sai das duas.

### Ordem das linhas na lista da spec A

1. `done` Escolher o modelo de bomba (esmaecida, arquivada; só com "contar arquivados" ligado)
2. `doing` Passar a tubulação principal
3. `done` Testar a pressão da bomba
4. `todo` Instalar as válvulas solenoides
5. `todo` Programar o controlador de rega
6. `review` Documentar o esquema hidráulico (sem `order`, por último)

Spec B: 1. `done` Calibrar o sensor de luminosidade, 2. `todo` Soldar os sensores de umidade. Spec Estufa: 1. `todo` Cortar os perfis de alumínio, 2. `todo` Costurar a lona da cobertura.

### Chip ↑ e cadeado

| Card | Chip | Cadeado |
|---|---|---|
| Instalar as válvulas solenoides | ↑ Spec: irrigação automática | **sim**: "Bloqueado por: Passar a tubulação principal" |
| Passar a tubulação principal | ↑ Spec: irrigação automática | não |
| Documentar o esquema hidráulico | ↑ Spec: irrigação automática (parent com link curto) | não |
| Testar a pressão da bomba | ↑ Spec: irrigação automática | não |
| Programar o controlador de rega | ↑ Spec: irrigação automática | não (o bloqueio já está done) |
| Soldar os sensores de umidade | ↑ Spec: painel de sensores | não |
| Calibrar o sensor de luminosidade | ↑ Spec: painel de sensores | não |
| Cortar os perfis de alumínio | ↑ Spec: cobertura retrátil | não |
| Costurar a lona da cobertura | ↑ Spec: cobertura retrátil | não |
| Pintar a estrutura metálica | sem chip (sem parent) | não |
| Comprar o substrato de fibra de coco | sem chip (sem parent) | não (o link aponta para uma nota que não existe e é ignorado) |
| As três specs | sem chip | não |

"Escolher o modelo de bomba" também tem parent, mas está arquivado: o board esconde os arquivados ("Ocultar arquivados" é o padrão da view), então o card não aparece. Ele só aparece como linha da spec A e na tabela "Todos".

### Colunas do board "Hierarquia"

A fazer 8, Fazendo 3, Em revisão 1, Concluído 2, Projetos 2. O card arquivado não aparece.

### Stress

Cinco projetos (`Stress/<Projeto>/index.md`) com 4 specs cada e 25 tarefas por spec: 20 specs e 500 tarefas, 520 cards. Os arquivos se chamam `<slug-do-projeto>-spec-<n>.md` e `<slug-do-projeto>-spec-<n>-tarefa-<nn>.md`. Status sorteados, `order` de 1 a 25 embaralhados em cada spec e cerca de 10% das tarefas bloqueadas por outra tarefa da mesma spec. A semente é fixa, então toda geração cria as mesmas notas. O script imprime as contagens no fim. Com a semente atual:

- specs: todo 5, doing 4, review 7, done 4;
- tarefas: todo 122, doing 133, review 125, done 120;
- 48 tarefas com `blocked_by`, 35 delas com cadeado (bloqueio ainda não concluído);
- colunas do board "Stress (520 cards)": A fazer 127, Fazendo 137, Em revisão 132, Concluído 124, Projetos 5.

## Checklist

### Barras, listas e resumos

- [ ] Abra o board "Hierarquia".
  - Esperado: barras, linhas das listas e resumos dos projetos iguais à tabela de resultado esperado (coluna "ligado"); a lista da spec A começa recolhida e as outras abertas.
  - Esperado: as linhas da spec A seguem a ordem da seção "Ordem das linhas", cada uma com o status cru como etiqueta (`todo`, `doing`, `review`, `done`) e o título.
  - Esperado: as colunas têm as contagens da seção "Colunas do board".
- [ ] Clique numa linha da lista da spec A.
  - Esperado: abre a nota daquela tarefa.
- [ ] Passe o mouse numa linha segurando Cmd (Ctrl no Windows e no Linux).
  - Esperado: aparece a pré-visualização da nota.
- [ ] Abra e feche a lista da spec A e as listas de specs nos cards de projeto.
  - Esperado: a lista abre e fecha sem mexer no resto do board.
- [ ] Opcional: adicione na view "Hierarquia" o filtro `type == "spec"` e depois remova.
  - Esperado: com o filtro, as barras e listas das specs continuam iguais, porque o índice usa todos os cards do perfil, não só os da view.

### Chip ↑

- [ ] Clique em "↑ Spec: irrigação automática" no card "Instalar as válvulas solenoides".
  - Esperado: abre a spec A.
- [ ] Confira o chip de "Documentar o esquema hidráulico".
  - Esperado: mostra "↑ Spec: irrigação automática", o que prova que o parent com link curto resolve.
- [ ] Confira "Calibrar o sensor de luminosidade" no card do projeto Horta Vertical.
  - Esperado: conta como tarefa do projeto (a barra do projeto é 3/10) mesmo com `project` vazio, porque herda o projeto da spec B.

### Cadeado

- [ ] Passe o mouse no cadeado de "Instalar as válvulas solenoides".
  - Esperado: dica "Bloqueado por: Passar a tubulação principal".
- [ ] Arraste "Passar a tubulação principal" para "Concluído".
  - Esperado: o cadeado de "Instalar as válvulas solenoides" some sem recarregar o app; a barra da spec A vai para 3/6 e a do projeto para 4/10.
- [ ] Arraste "Passar a tubulação principal" de volta para "Fazendo".
  - Esperado: o cadeado volta; as barras voltam para 2/6 e 3/10.
- [ ] Arraste "Testar a pressão da bomba" para "Em revisão" e depois de volta para "Concluído".
  - Esperado: enquanto está em revisão, "Programar o controlador de rega" mostra o cadeado ("Bloqueado por: Testar a pressão da bomba"), o que prova que o bloqueio com link completo resolve; em "Concluído", o cadeado some.
- [ ] Confira "Comprar o substrato de fibra de coco".
  - Esperado: nunca mostra cadeado; o bloqueio aponta para uma nota que não existe.

### Configurações do perfil

- [ ] Em Configurações → Bases Board → Hierarquia, desligue "Contar arquivados".
  - Esperado, sem recarregar: spec A 1/5 com a lista aberta e sem a linha esmaecida; Horta Vertical "2 specs · 9 tarefas" e 2/9; spec A na lista do projeto com 1/5. Spec B e Estufa Modular não mudam. Ligue de novo e tudo volta para a coluna "ligado".
- [ ] Mude "Recolher acima de" (`collapseAbove`) para 10.
  - Esperado: a lista da spec A (6 linhas) passa a aparecer aberta. Volte para 5.

### Renomear e mover

- [ ] Renomeie `spec-irrigacao-automatica.md` (por exemplo, para `spec-rega-da-parede.md`) e mova para outra pasta (por exemplo, crie `Horta Vertical/Specs/`).
  - Esperado: o Obsidian atualiza os links (`alwaysUpdateLinks` está ligado no dev-vault), inclusive o link curto de "Documentar o esquema hidráulico" e o do card arquivado; a spec continua com 2/6 e a mesma lista; os chips "↑" continuam abrindo a spec.
- [ ] Gere as fixtures de novo e mova "Testar a pressão da bomba" à mão para `Horta Vertical/_Tasks/Archived/`.
  - Esperado, com "contar arquivados" ligado: a spec A continua 2/6 (não regride), a linha dela fica esmaecida, e o projeto continua 3/10. O card sai do board, que esconde arquivados.
  - Esperado, com "contar arquivados" desligado: spec A 0/4 e projeto 1/8.
  - Esperado: "Programar o controlador de rega" continua sem cadeado (o link foi atualizado e o bloqueio continua done).

### View sem hierarquia

- [ ] Abra a view "Hierarquia (desligada)".
  - Esperado: cards simples, sem barra de progresso, sem lista de filhos, sem chip ↑ e sem cadeado, inclusive nos cards de projeto.

### Stress

- [ ] Abra a view "Stress (520 cards)".
  - Esperado: o board abre sem travar e rola com fluidez; as colunas têm as contagens da seção "Stress"; cada spec mostra "x/25" com a lista recolhida.
- [ ] Arraste um card de uma coluna para outra e abra e feche algumas listas.
  - Esperado: resposta imediata, sem atraso perceptível; a barra da spec do card arrastado muda na hora.

## Board

![[hierarchy.base]]
