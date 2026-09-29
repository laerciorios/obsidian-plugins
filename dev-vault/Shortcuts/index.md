# Shortcuts: casos de teste

Digite os atalhos em [[Shortcuts/playground|playground]]. Todas as pessoas, empresas e projetos deste vault são fictícios.

## Dados

| Onde | O que tem |
|---|---|
| `Work/Horta Digital/_People/` | [[Work/Horta Digital/_People/dalia-alecrim\|Dália Alecrim]], [[tomas-hortela\|Tomás Hortelã]] (alias `Tomás`), [[nina-pimenta\|Nina Pimenta]] (alias `Pimentinha`), [[beto-salsa]] (sem `name`) |
| `Work/Pomar Coletivo/_People/` | outra [[Work/Pomar Coletivo/_People/dalia-alecrim\|Dália Alecrim]], com o mesmo nome de arquivo |
| `Projects/` | [[Projects/Garden App/index\|Garden App]] (active), [[Projects/Recipe Book/index\|Recipe Book]] (paused) |
| `Work/Horta Digital/Projects/` | [[Work/Horta Digital/Projects/Irrigação Inteligente/index\|Irrigação Inteligente]] (pasta aninhada, com acento) |
| `Work/Horta Digital/_Meetings/` | duas atas com tag `meeting` e `meeting/semanal` |
| `_Templates/` | `person.md` e `project.md` (este tem `type: project` e não pode aparecer) |
| `.obsidian/daily-notes.json` | pasta `Daily Notes`, formato `YYYY-MM-DD` |

## Preparação

- [ ] Na raiz do repo, `pnpm --filter shortcuts dev`. Confira **Shortcuts** ativo em Plugins da comunidade.
- [ ] Em Configurações → Shortcuts aparecem as fontes padrão **Pessoas** e **Projetos**.

## Datas

- [ ] `@today` e `@hoje` inserem `[[AAAA-MM-DD]]` com a data de hoje.
- [ ] `@ontem`, `@yesterday`, `@amanha` e `@amanhã` inserem ontem e amanhã.
- [ ] Formato da data `DD-MM-YYYY`: `@hoje` insere `[[DD-MM-AAAA]]`. Limpe o campo depois.
- [ ] Apague as palavras de **Ontem**: `@ontem` deixa de sugerir. Restaure `yesterday, ontem`.
- [ ] Desligue **Sugerir datas**: nenhuma data aparece. Religue.

## Pessoas (fonte padrão)

- [ ] `@dalia` sugere duas Dália Alecrim, com a pasta de cada uma embaixo do nome. Uma insere `[[dalia-alecrim|Dália Alecrim]]` e a outra o caminho completo, porque o nome de arquivo se repete.
- [ ] `@pimentinha` (alias) sugere Nina Pimenta e insere `[[nina-pimenta|Nina Pimenta]]`.
- [ ] `@tomas` (sem acento) sugere Tomás Hortelã.
- [ ] `@nina p` (duas palavras) sugere Nina Pimenta.
- [ ] `@beto` insere `[[beto-salsa]]`: sem `name`, o título é o nome do arquivo e o link sai sem alias.
- [ ] Nenhuma sugestão vem de `_Templates/`.

## Projetos (fonte padrão)

- [ ] `@garden` insere `[[Projects/Garden App/index|garden-app]]`.
- [ ] `@irrigacao` insere `[[Work/Horta Digital/Projects/Irrigação Inteligente/index|irrigacao]]`.
- [ ] `@recipe` sugere Recipe Book (projetos pausados também aparecem).
- [ ] O template `_Templates/project.md` não aparece.

## Gatilho

- [ ] `dalia@horta.dev` não abre sugestões.
- [ ] `@` seguido de espaço não abre.
- [ ] Dentro de código inline (`` `@dalia` ``) não abre.
- [ ] No modo fonte, `@` dentro do frontmatter não abre.
- [ ] `falei com @dalia e depois`: ao digitar ` e` as sugestões fecham, e Enter quebra a linha normalmente.
- [ ] Esc fecha as sugestões e mantém o texto digitado.
- [ ] Gatilho `!`: `!dalia` sugere e `@dalia` não. Um gatilho com espaço mostra erro no campo. Volte para `@`.

## Fontes configuráveis

- [ ] Na fonte **Pessoas**, a linha **Notas encontradas** mostra 5 notas, com exemplos.
- [ ] Desative **Pessoas**: `@dalia` para de sugerir sem recarregar o plugin. Reative.
- [ ] Adicione uma fonte **Reuniões** com tag `meeting`, título `title` e alias `title`. `@planej` insere `[[2026-09-10-planejamento-da-horta|Planejamento da horta]]`, e `@colheita` acha a ata com `meeting/semanal`.
- [ ] Uma fonte nova, sem critérios, avisa que sugere todas as notas do vault.
- [ ] Numa fonte nova, propriedade `status` com valor `active, paused`: **Notas encontradas** mostra os três projetos. Apagando a propriedade, o campo de valor some.
- [ ] Ícone `nao-existe` mostra erro no campo. `calendar-days` funciona.
- [ ] Arraste para reordenar e apague uma fonte. Recarregue o Obsidian e confira que a configuração ficou salva.
- [ ] A busca das configurações do Obsidian acha "Alias do link" e "Gatilho".

## Índice

- [ ] Crie `Work/Horta Digital/_People/lia-manjericao.md` com `name: Lia Manjericão`: `@lia` sugere na hora.
- [ ] Renomeie a nota para `lia-m.md`: `@lia` passa a inserir `[[lia-m|Lia Manjericão]]`. Apague a nota: a sugestão some.
