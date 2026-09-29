# Vault de desenvolvimento

Este é o vault de desenvolvimento do monorepo `obsidian-plugins`. Ele existe para testar os plugins localmente sem encostar nas notas de verdade.

> [!warning] Nunca coloque dados reais aqui
> Tudo neste vault é fictício, inclusive nomes de pessoas, empresas e projetos. Se um plugin tiver bug e corromper arquivos, o estrago fica restrito a este vault.

## Onde fica cada coisa

- Cards: `Boards/DB/`
- Board: `Boards/kanban.base` (view `bases-board` do plugin Bases Board). Os casos de teste estão descritos em [[Boards/index|Quadro de teste]].
- Projetos fictícios: `Projects/Garden App/`, `Projects/Recipe Book/` e `Work/Horta Digital/Projects/Irrigação Inteligente/`
- Pessoas e atas fictícias: `Work/Horta Digital/` e `Work/Pomar Coletivo/` (empresas inventadas)
- Casos de teste do Shortcuts: [[Shortcuts/index|Shortcuts]], com a nota [[Shortcuts/playground|playground]] para digitar
- Catálogo fictício de filmes, séries, jogos e livros: `1 - Knowledge/Entertainment/DB/`. Casos de teste do [[1 - Knowledge/Entertainment/index|Media Catalog]]
- Templates: `_Templates/` (card, pessoa, projeto, daily e media)
- `.obsidian/plugins/` é gerada pelos scripts de build e fica fora do git.

## Como testar

1. No Obsidian, abra esta pasta (`dev-vault/`) como vault ("Abrir pasta como cofre").
2. Em Configurações → Plugins da comunidade, ative os plugins da comunidade.
3. Na raiz do repo, rode `pnpm --filter <id> dev` (por exemplo `bases-board` ou `shortcuts`).
4. Confira se o plugin e o **Hot Reload** estão ativos na lista de plugins.
5. Siga os casos de teste do plugin. Com o Hot Reload ativo, o plugin recarrega a cada build. Para o Bases Board, abra `Boards/kanban.base` ou use o embed abaixo.

## Board

![[kanban.base]]
