# obsidian-plugins

Plugins pessoais para o [Obsidian](https://obsidian.md), escritos por mim em vez de instalar código de terceiros. Um monorepo com pnpm workspaces: cada plugin vive em `plugins/<id>/` no formato do template oficial, e a raiz concentra build, lint, scripts e um vault de testes.

Planejamento e specs ficam no vault, em `1 - Knowledge/Projects/Obsidian Plugins/`.

## Plugins

| Plugin | Id | Status | O que faz |
|---|---|---|---|
| [Bases Board](plugins/bases-board) | `bases-board` | em desenvolvimento | Visualização kanban para o Bases: colunas por `status`, cards arrastáveis que gravam o status na nota. |
| [Shortcuts](plugins/shortcuts) | `shortcuts` | em desenvolvimento | Atalhos com `@` no editor: datas e notas de fontes configuráveis viram links. |
| [Media Catalog](plugins/media-catalog) | `media-catalog` | em desenvolvimento | Busca filmes, séries, jogos e livros na internet e cria notas do catálogo com dados e capa. |
<!-- plugins:end -->

## Estrutura

```
plugins/<id>/        um plugin por pasta (src/, manifest.json, styles.css, versions.json)
packages/i18n/       tradução da interface, usada por todos os plugins
scripts/             build compartilhado (esbuild) e utilitários do repo
templates/plugin/    esqueleto usado por `pnpm new-plugin`
dev-vault/           vault de testes versionado, com dados fictícios
```

## Idiomas

Todos os plugins são multi-idioma. A interface segue o idioma do Obsidian (**Settings → General → Language**): inglês e português do Brasil estão disponíveis, e qualquer outro idioma cai para inglês. Os textos de cada plugin ficam em `plugins/<id>/src/i18n/`; o inglês é a fonte, e o typecheck falha se uma tradução esquecer alguma chave. Veja [packages/i18n](packages/i18n).

## Pré-requisitos

- Node 22+ e pnpm 11 (`corepack enable` ou `brew install pnpm`)
- Obsidian 1.13+ (o Bases Board precisa de 1.10.2, pela API de views do Bases; o Shortcuts usa as configurações declarativas do 1.13; o Media Catalog precisa de 1.13.0, também pelas configurações declarativas)

## Começando

```bash
pnpm install
pnpm setup:dev-vault --download   # habilita os plugins no dev-vault e baixa o Hot Reload
pnpm --filter bases-board dev     # build em watch
```

No Obsidian: **Open another vault → Open folder as vault → `dev-vault/`**, confie no autor e ative os community plugins. O Hot Reload recarrega o plugin a cada build.

O build de cada plugin vai para `plugins/<id>/dist/` e é **copiado** para `dev-vault/.obsidian/plugins/<id>/` e para todo vault ligado com `pnpm link-plugin`.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm --filter <id> dev` | Build em watch de um plugin |
| `pnpm build` | Build de produção de todos os plugins |
| `pnpm check` | Typecheck + lint |
| `pnpm new-plugin <id> "Nome" ["descrição"]` | Cria um plugin novo a partir do template |
| `pnpm link-plugin <id> <vault>` | Passa a copiar o build para outro vault (`--remove` desfaz, `--list` lista) |
| `pnpm bump <id> <x.y.z>` | Atualiza versão em `package.json`, `manifest.json` e `versions.json` |
| `pnpm setup:dev-vault` | Garante os plugins habilitados no dev-vault |

## Criando um plugin novo

1. `pnpm new-plugin meu-plugin "Meu Plugin" "O que ele faz"` e depois `pnpm install`.
2. `pnpm setup:dev-vault` para habilitá-lo no dev-vault.
3. `pnpm --filter meu-plugin dev` e teste no `dev-vault/`.
4. Quando estiver estável: `pnpm link-plugin meu-plugin ~/Documents/Obsidian/laerciorios` e habilite em **Settings → Community plugins**.
5. No vault: spec em `Obsidian Plugins/_Discovery/AI Generated/<id>-spec.md` e uma linha na tabela de `Obsidian Plugins/index.md`.

## Instalando no vault real

```bash
pnpm --filter bases-board build
pnpm link-plugin bases-board ~/Documents/Obsidian/laerciorios
```

Depois disso, todo build (dev ou produção) também atualiza o vault real. Para parar: `pnpm link-plugin bases-board ~/Documents/Obsidian/laerciorios --remove`. O Hot Reload **não** deve ser instalado no vault real.
