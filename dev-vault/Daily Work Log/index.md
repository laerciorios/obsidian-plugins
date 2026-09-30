# Daily Work Log: casos de teste

Dados fictícios usados pelo plugin. As marcações gravam nas dailies de verdade: para voltar ao estado inicial, `git checkout -- dev-vault && git clean -fd dev-vault` na raiz do repo (apaga também a daily de hoje criada pelo comando).

| Caminho | Para quê |
|---|---|
| [[Projects/Garden App/index\|Garden App]] | Ativo, com `slug`; o índice tem um resumo sem `project` |
| [[Projects/Cozinha Solar/index\|Cozinha Solar]] | Ativo, sem `slug` nem `company` (alias = nome) |
| [[Work/Pomar Coletivo/Projects/Mapa de Árvores/index\|Mapa de Árvores]] | Ativo, com `company`, acento e pasta aninhada |
| [[Projects/Recipe Book/index\|Recipe Book]] e [[Work/Horta Digital/Projects/Irrigação Inteligente/index\|Irrigação Inteligente]] | Pausados: só aparecem quando já estão na nota ou numa ata do dia |
| `_Templates/project.md` | `type: project` com `status` vazio, em pasta ignorada |
| [[Daily Notes/2026-09-14]] | Dois projetos no formato gravado pelo plugin |
| [[Daily Notes/2026-09-15]] | Lista inline |
| [[Daily Notes/2026-09-16]] | `[[garden-app]]` sem destino (conta como Garden App), Recipe Book pausado, link sem destino e texto solto |
| [[Daily Notes/2026-09-17]] | Sem projetos, com botões e três atas no dia |
| [[Daily Notes/2026-09-18]] | `projects` com um valor só, sem lista |
| `Work/Pomar Coletivo/_Meetings/2026-09-17-*` | Ata com `date` (Mapa de Árvores, Recipe Book) e ata com a data só no nome (Garden App pelo `slug`) |
| `Work/Horta Digital/_Meetings/` | Ata do dia 17 sem `projects` e ata do dia 10 com Irrigação Inteligente |
| [[Daily Work Log/resumo\|resumo]] | Resumos de semana, mês, um projeto, a semana atual e opções inválidas |

Se o `Hierarchy Lab` e o `Archive Lab` foram gerados (`pnpm --filter bases-board fixtures`), os projetos ativos deles também aparecem. Para esconder, acrescente as duas pastas em **Pastas ignoradas**.

## Preparação

- [ ] Na raiz do repo, `pnpm --filter daily-work-log dev`. Confira **Daily Work Log** ativo em Plugins da comunidade.
- [ ] Não existe a daily de hoje em `Daily Notes/`.

## Registrar projetos de hoje

- [ ] Clique no ícone de calendário da ribbon: a daily de hoje é criada pelo template (com `date` preenchida e o bloco de botões) e abre; a janela "Projetos de <hoje>" lista Cozinha Solar, Garden App e Mapa de Árvores (com `pomar-coletivo` em cinza), sem os pausados nem o template.
- [ ] Marque Garden App e Mapa de Árvores: `projects` fica `[[Projects/Garden App/index|garden-app]]` e `[[Work/Pomar Coletivo/Projects/Mapa de Árvores/index|mapa-de-arvores]]`; marque Cozinha Solar: `[[Projects/Cozinha Solar/index|Cozinha Solar]]`. O rodapé conta os registrados.
- [ ] Desmarque Mapa de Árvores: só ele sai. Rode o comando de novo: a daily não é duplicada e os marcados continuam marcados.
- [ ] Digite `arv` na busca: só Mapa de Árvores; Enter alterna ele. Digite `xyz`: "Nenhum projeto com "xyz"".
- [ ] Desligue **Abrir a daily note**, abra outra nota e rode o comando: a janela abre sem trocar de nota e mostra **Abrir a daily note**.

## Outros itens da lista

- [ ] Abra a [[Daily Notes/2026-09-16]] e rode **Inserir botões de projeto** se quiser, ou use o bloco que já está lá: Garden App e Recipe Book (pausado, com o status no tooltip) aparecem pressionados.
- [ ] Clique em Garden App: `[[garden-app]]` sai; `[[Projeto Inexistente]]` e `texto solto` ficam, na mesma ordem. Clique de novo: entra `[[Projects/Garden App/index|garden-app]]` no fim.
- [ ] Na [[Daily Notes/2026-09-18]], marque Cozinha Solar pela janela ou por um bloco: `projects` vira lista com os dois.

## Sugestões das atas

- [ ] Na [[Daily Notes/2026-09-17]], os botões Mapa de Árvores, Recipe Book e Garden App aparecem tracejados (sugeridos), com as atas no tooltip; Irrigação Inteligente (ata do dia 10) não aparece.
- [ ] Para testar a janela, mude a `date` da `Mutirão de plantio` para hoje: a janela mostra "Nas atas de hoje" com Mapa de Árvores e Recipe Book, "na ata Mutirão de plantio" (link que abre a ata numa aba nova) e **Marcar sugeridos (2)**. O botão grava só os dois e some.
- [ ] Desligue **Sugerir pelas atas**: a seção some da janela e os botões deixam de ser tracejados.

## Botões na nota

- [ ] No modo leitura e no live preview, clicar num botão grava e o botão muda de estado sem recarregar a nota; o cursor não entra no bloco e o tooltip não fica preso na tela.
- [ ] Abra a daily de hoje em live preview: o cursor cai na linha em branco depois do frontmatter e os botões aparecem (sem a linha em branco, o bloco apareceria como código).
- [ ] Num `index.md` de projeto ou numa ata, um bloco ` ```work-log ``` ` edita os `projects` daquela nota.
- [ ] Feche a nota e recarregue o plugin: nada fica escutando (sem erros no console ao editar outras notas).

## Resumo

- [ ] Em [[Daily Work Log/resumo|resumo]], a semana de 14/09 (segunda a domingo) mostra Garden App — 4 dias (seg 14, ter 15, qua 16, sex 18), Mapa de Árvores — 1 dia (seg 14) e Recipe Book — 1 dia (qua 16), e "Registros em 4 dias".
- [ ] O mês de setembro mostra as mesmas contagens com os dias em `D MMM` (mais as dailies de setembro criadas nos testes, como a de hoje). O bloco do Mapa de Árvores mostra só "1 dia" e o dia 14.
- [ ] As setas mudam de semana ou de mês e o título acompanha; o botão de voltar leva ao período inicial. A semana atual começa com "Esta semana".
- [ ] Mude **Primeiro dia da semana** para domingo: a semana de 14/09 vira 13 a 19/09.
- [ ] O bloco de opções inválidas mostra os quatro erros (período, data, opção desconhecida e projeto não encontrado).
- [ ] No [[Projects/Garden App/index|índice do Garden App]], o resumo mostra só Garden App — 4 dias.
- [ ] Com o resumo da semana atual aberto numa aba e a daily de hoje em outra, marque um projeto: o resumo atualiza sozinho.
