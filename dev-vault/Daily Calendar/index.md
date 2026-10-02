# Daily Calendar: casos de teste

Dados fictícios usados pelo plugin. Clicar num dia sem daily cria a nota em `Daily Notes/`: para voltar ao estado inicial, `git checkout -- dev-vault && git clean -fd dev-vault` na raiz do repo.

Os marcadores são testados em **agosto de 2026**, para não mexer nas contagens de setembro do [[Daily Work Log/index|Daily Work Log]]:

| Dia | O que tem | Marcadores |
|---|---|---|
| 02 (dom) | [[girassois-em-marte\|Girassóis em Marte]] com `finished` | catálogo |
| 03 | [[Daily Notes/2026-08-03]] com Garden App e Cozinha Solar; [[Daily Calendar/Cards/Archived/2026-07-20-comprar-sementes\|card arquivado]] concluído | daily, **2**, card |
| 05 | [[Daily Notes/2026-08-05]] com um projeto, um link sem destino e texto solto; duas atas em `Work/Horta Digital/_Meetings/` | daily, **3**, reunião |
| 07 | dois cards concluídos em `Daily Calendar/Cards/` | card |
| 08 (sáb) | [[Daily Notes/2026-08-08]] sem `projects` | daily |
| 11 | [[os-samambaias\|Os Samambaias]] com `finished`; um "card" sem a tag `card` (não conta) | catálogo |
| 12 | [[Daily Notes/2026-08-12]] com `projects: []`; card em andamento (não conta) | daily |
| 13 | nota com a tag `card/extra` (não conta) | — |
| 14 | ata do Pomar Coletivo num dia sem daily | reunião |
| 15 (sáb) | card com `completed: 2026-08-15T18:30` | card |
| 19 | [[Daily Notes/2026-08-19]], lista inline com Recipe Book | daily, **1** |
| 20 | nota `2026-08-20-…` fora de `_Meetings` (não conta) | — |
| 21 | ata `20260821-sem-hifens` (não conta) | — |
| 26 | [[Daily Notes/2026-08-26]], `projects` com um valor só | daily, **1** |

Se o `Archive Lab` foi gerado (`pnpm --filter bases-board fixtures`), os cards dele com a tag `card` também aparecem (29 e 31/08).

## Preparação

- [ ] Na raiz do repo, `pnpm --filter daily-calendar dev`. Confira **Daily Calendar** ativo em Plugins da comunidade.
- [ ] Não existe a daily de hoje em `Daily Notes/`.

## View do mês

- [ ] Rode **Daily Calendar: Abrir calendário** (ou o ícone de calendário com dias da ribbon): a view abre no painel direito, no mês atual. Rodar de novo não abre uma segunda view.
- [ ] A grade tem 6 semanas; os dias do mês anterior e do próximo aparecem apagados.
- [ ] **‹** e **›** trocam de mês (inclusive de dezembro para janeiro); **Hoje** volta para o mês atual.
- [ ] Hoje aparece num círculo na cor de destaque.
- [ ] Abra [[Daily Notes/2026-09-16]] e volte para setembro: o dia 16 tem contorno. Abra esta nota: o contorno some.
- [ ] Sábados e domingos têm fundo diferente, também no cabeçalho. Em Configurações → Daily Calendar, desligue **Destacar fins de semana**: o fundo some na hora.
- [ ] Mude **Início da semana** para domingo: o cabeçalho começa em Dom e os dias se reorganizam na hora.
- [ ] Com o Obsidian em português, mês ("Setembro de 2026") e dias (Seg, Ter...) em português; em inglês, "September 2026" e Mon, Tue...
- [ ] A linha **Daily notes** das configurações mostra `Daily Notes`, `YYYY-MM-DD` e `_Templates/daily-note`.

## Abrir e criar a daily

- [ ] Em setembro de 2026, os dias 1, 14, 15, 16, 17 e 18 têm um ponto (as dailies de `Daily Notes/`).
- [ ] Clique no 16: a daily abre na aba atual. Abra outra nota na mesma aba e clique no 16 de novo: abre sem criar outra aba; com o 16 já aberto em outra aba, o clique vai para ela.
- [ ] Cmd/Ctrl+clique (ou botão do meio) no 17: abre em nova aba.
- [ ] Clique no 20 (sem daily): a janela "Criar a daily note?" mostra o dia e o caminho, com **Criar** focado. **Cancelar** ou Esc não criam nada.
- [ ] De novo no 20, Enter (ou **Criar**): `Daily Notes/2026-09-20.md` é criada pelo template (`date: 2026-09-20`, bloco `work-log`), abre, e o ponto e o contorno aparecem no 20 sem recarregar.
- [ ] Em Configurações → Daily Calendar, desligue **Confirmar antes de criar**: clicar no 21 cria direto. Ligue de novo.
- [ ] Crie uma pasta `Daily Notes/2026-09-22.md` e clique no 22: aviso "… é uma pasta, não uma daily note", nada é criado. Apague a pasta.
- [ ] Apague a daily do 21: o ponto some. Renomeie a do 20 para `2026-09-23`: o ponto (e o contorno, se ela está aberta) passa para o 23.
- [ ] Desligue **Daily note** em Marcadores: os pontos somem; ligue de novo.
- [ ] Mude o template das Daily notes nativas para uma nota que não existe e clique num dia vazio: a nota é criada vazia, com aviso. Volte o template para `_Templates/daily-note`.

## Marcadores das fontes

- [ ] Em agosto de 2026, os marcadores batem com a tabela acima: ponto na cor de destaque (daily), número no canto (projetos), ponto azul (reunião), verde (card) e laranja (catálogo). A legenda embaixo mostra as cinco fontes.
- [ ] O 1º de setembro (apagado, no fim da grade) mostra o ponto da daily de setembro.
- [ ] Em Configurações → Daily Calendar, desligue **Marcar reuniões**: os pontos azuis e a legenda "Reuniões" somem, e o campo **Pasta das atas** some. Ligue de novo. Faça o mesmo com projetos, cards e catálogo.
- [ ] Digite `a/b` em **Pasta das atas**: aparece "Digite um nome de pasta sem "/"" e nada muda. Volte para `_Meetings`.
- [ ] Mude **Tag dos cards** para `lab-card` (com o Archive Lab gerado): aparecem os cards do `Archive Lab/Central`; os de `Daily Calendar/Cards` somem. Volte para `card`.
- [ ] Em [[Daily Calendar/Cards/2026-08-03-regar-as-mudas]], mude `completed` para `2026-08-20`: o ponto verde aparece no 20 sem recarregar (e o 7 continua com o outro card). Volte para `2026-08-07`.
- [ ] Em [[mare-de-musgo]], ponha `finished: 2026-08-20`: ponto laranja no 20. Volte `finished` para vazio (o Media Catalog espera vazio).
- [ ] Na [[Daily Notes/2026-08-19]], acrescente um projeto: o número passa para 2. Tire de novo.
- [ ] Crie `Work/Horta Digital/_Meetings/2026-08-27-teste.md`: ponto azul no 27. Renomeie para `2026-08-28-teste`: o ponto passa para o 28. Apague a nota.
- [ ] Com o tema claro e com o escuro, os pontos e os números ficam legíveis.

## Lista do dia

- [ ] Em agosto de 2026, pare o mouse no 5: depois de um instante aparece "Quarta-feira, 5 de agosto de 2026" com **Daily note** (2026-08-05), **3 Projetos** (Mapa de Árvores como link; Projeto Fantasma e horta comunitária em cinza) e **Reuniões 2** (2026-08-05-daily e Revisão de canteiros).
- [ ] Passe o mouse do dia para a lista: ela fica. Saia dela: some. Passe direto do 5 para o 14 com a lista aberta: troca para o 14 na hora.
- [ ] O 6 (vazio) não abre lista.
- [ ] Clique em **Revisão de canteiros** na lista: a ata abre e a lista fecha. Com Cmd/Ctrl, abre em nova aba.
- [ ] Com a lista aberta: Esc fecha; clicar no editor fecha; **‹**/**›** fecham.
- [ ] O 31 mostra a lista abaixo do dia, dentro da janela; com o painel estreito, a lista passa por cima do editor sem sair da tela.
- [ ] No celular (ou no desktop com `app.emulateMobile(true)` no console e a emulação de toque do DevTools): toque longo no 5 abre a lista sem abrir a daily; toque longo no 6 não abre nada nem pergunta para criar; tocar fora fecha; toque curto no 5 abre a daily.
- [ ] Feche a view com a lista aberta: a lista não fica presa na tela.
- [ ] Tema claro e escuro: lista legível, links na cor de link.
