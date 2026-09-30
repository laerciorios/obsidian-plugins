# Vault de desenvolvimento

Este é o vault de desenvolvimento do monorepo `obsidian-plugins`. Ele existe para testar os plugins localmente sem encostar nas notas de verdade.

> [!warning] Nunca coloque dados reais aqui
> Tudo neste vault é fictício, inclusive nomes de pessoas, empresas e projetos. Se um plugin tiver bug e corromper arquivos, o estrago fica restrito a este vault.

## Onde fica cada coisa

- Cards: `Boards/DB/`
- Board: `Boards/kanban.base` (view `bases-board` do plugin Bases Board). Os casos de teste estão descritos em [[Boards/index|Quadro de teste]].
- Projetos fictícios: `Projects/Garden App/`, `Projects/Recipe Book/`, `Projects/Cozinha Solar/`, `Work/Horta Digital/Projects/Irrigação Inteligente/` e `Work/Pomar Coletivo/Projects/Mapa de Árvores/`
- Pessoas e atas fictícias: `Work/Horta Digital/` e `Work/Pomar Coletivo/` (empresas inventadas)
- Casos de teste do Shortcuts: [[Shortcuts/index|Shortcuts]], com a nota [[Shortcuts/playground|playground]] para digitar
- Casos de teste do Colored Text: [[Colored Text/index|Colored Text]], com a nota [[Colored Text/playground|playground]] para colorir
- Casos de teste do Reading Time: [[Reading Time/index|Reading Time]], com notas de contagem conhecida, um canvas e o `leitura.base`
- Casos de teste do Comments: [[Comments/index|Comments]], com a nota [[Comments/playground|playground]] para comentar e uma ata com conversas prontas
- Casos de teste do Pseudocode: [[Pseudocode/index|Pseudocode]], com blocos nas sintaxes algorithmic e algorithm2e, erros e referências entre algoritmos
- Casos de teste do Daily Work Log: [[Daily Work Log/index|Daily Work Log]], com dailies fictícias de 14 a 18/09/2026, atas do dia 17 e [[Daily Work Log/resumo|resumos]]
- Casos de teste do Vault Structure: [[Vault Structure/index|Vault Structure]], com a área fictícia `1 - Knowledge/Gardening/` cheia de nomes fora das regras
- Catálogo fictício de filmes, séries, jogos e livros: `1 - Knowledge/Entertainment/DB/`. Casos de teste do [[1 - Knowledge/Entertainment/index|Media Catalog]]
- Templates: `_Templates/` (card, pessoa, projeto, daily e media)
- `.obsidian/plugins/` é gerada pelos scripts de build e fica fora do git.

## Como testar

1. No Obsidian, abra esta pasta (`dev-vault/`) como vault ("Abrir pasta como cofre").
2. Em Configurações → Plugins da comunidade, ative os plugins da comunidade.
3. Na raiz do repo, rode `pnpm --filter <id> dev` (por exemplo `bases-board`, `shortcuts` ou `colored-text`).
4. Confira se o plugin e o **Hot Reload** estão ativos na lista de plugins.
5. Siga os casos de teste do plugin. Com o Hot Reload ativo, o plugin recarrega a cada build. Para o Bases Board, abra `Boards/kanban.base` ou use o embed abaixo.

## Board

![[kanban.base]]
