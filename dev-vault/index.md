# Vault de desenvolvimento

Este é o vault de desenvolvimento do monorepo `obsidian-plugins`. Ele existe para testar os plugins localmente sem encostar nas notas de verdade.

> [!warning] Nunca coloque dados reais aqui
> Tudo neste vault é fictício. Se um plugin tiver bug e corromper arquivos, o estrago fica restrito a este vault.

## Onde fica cada coisa

- Cards: `Boards/DB/`
- Board: `Boards/kanban.base` (view `bases-board` do plugin Bases Board). Os casos de teste estão descritos em [[Boards/index|Quadro de teste]].
- Projetos fictícios: `Projects/Garden App/` e `Projects/Recipe Book/`
- Template de card: `_Templates/card.md`
- `.obsidian/plugins/` é gerada pelos scripts de build e fica fora do git.

## Como testar

1. No Obsidian, abra esta pasta (`dev-vault/`) como vault ("Abrir pasta como cofre").
2. Em Configurações → Plugins da comunidade, ative os plugins da comunidade.
3. Na raiz do repo, rode `pnpm --filter bases-board dev`.
4. Confira se **Bases Board** e **Hot Reload** estão ativos na lista de plugins.
5. Abra `Boards/kanban.base` ou use o embed abaixo. Com o Hot Reload ativo, o plugin recarrega a cada build.

## Board

![[kanban.base]]
