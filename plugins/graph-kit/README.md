# Graph Kit

Personaliza o graph nativo do Obsidian (graph global e local graph) com funcionalidades independentes, cada uma com toggle próprio, toggle por graph e regras por nota: **rótulos** (o nó mostra o valor de uma propriedade, como o `title` das notas `index.md`, no lugar do nome do arquivo) **tipos de link** (cor e estilo das arestas pela propriedade de onde o link vem) e **imagens nos nós** (a capa de uma propriedade como `cover`).

## Como funciona

O graph não tem API pública. Todo acesso aos internals fica em [`src/graph-internals/`](src/graph-internals), conferido no Obsidian 1.14.4:

- As views `graph` e `localgraph` usam as mesmas classes de renderer, nó e aresta (PIXI 7). O plugin envolve métodos do protótipo (um wrapper por método, guardando o original) e descobre qual graph é qual pelas folhas abertas.
- O texto do nó vem de `node.getDisplayText()`, chamado uma vez ao desenhar o nó. Para mudanças ao vivo, o plugin atualiza o texto dos nós já desenhados.
- Cada funcionalidade declara os campos internos de que precisa. Se algum sumir numa versão nova do Obsidian, só ela se desliga, com um aviso no console e uma nota nas configurações; o graph nativo fica intacto. Um erro dentro de uma funcionalidade tem o mesmo efeito.
- Nenhum patch existe enquanto todas as funcionalidades estão desligadas. Desligar uma funcionalidade, "Desligar tudo" ou desativar o plugin restaura o graph nativo na hora, sem reabrir a aba.
- Os dados vêm só do `metadataCache` (nunca lendo arquivos), com cache por caminho invalidado por mudança de frontmatter, renomear, mover e apagar.

## Rótulos

- Lista de propriedades em ordem de prioridade (padrão `title`): a primeira com valor vence. Uma lista (`aliases`) usa o primeiro item; `[[nota|Alias]]` vira "Alias".
- Notas: todas, ou só as que casam uma regra. Sem valor, fica o nome do arquivo.
- Tamanho máximo opcional, com reticências.
- Busca e filtros do graph, anexos, links não resolvidos e tags não mudam.

## Tipos de link

Desligado ao instalar.

- Cada tipo diz de onde vêm os links: uma propriedade do frontmatter (`projects`, `attendees`, `parent`, `blocked_by`, `reference`…) ou o corpo da nota. Tem cor (a do graph, uma cor do tema ou hex), linha contínua, tracejada ou pontilhada e pode ser escondido.
- Os tipos ficam em ordem de prioridade: um link que vem de mais de uma origem usa o primeiro tipo da lista. Num link mútuo (A liga B e B liga A), o graph desenha uma linha só; uma propriedade de qualquer um dos lados vence o corpo.
- "Detectar propriedades com links" cria um tipo para cada propriedade que tem links em alguma nota.
- Legenda opcional num canto do graph: clicar num tipo esconde ou mostra aqueles links só naquele graph (global ou local).
- Esconder só apaga o desenho; o layout continua considerando o link.

## Imagens nos nós

Desligado ao instalar.

- Imagem dentro do nó a partir de propriedades em ordem de prioridade (padrão `cover`): `[[capa.jpg]]`, `![[capa.jpg]]`, um caminho do vault, uma imagem em Markdown ou uma URL. Regras podem trocar as propriedades, fixar uma imagem ou tirar a imagem.
- **Sem rede por padrão**: URLs só carregam com "Imagens da internet" ligado (via `requestUrl`).
- A imagem é recortada no centro, reduzida para um quadrado (padrão 128 px) e guardada em cache por arquivo e data de modificação; arquivos acima do limite (padrão 2 MB) são ignorados. Só os nós que o graph já desenhou (perto da tela) carregam imagem.
- A cor do nó continua visível como um anel em volta da imagem.

## Regras

Condição → efeito, em ordem; a primeira regra ligada que casar vence. Condições combináveis com "todas" ou "qualquer", cada uma com "não":

| Condição | Casa quando |
|---|---|
| Pasta | a nota está na pasta (com ou sem subpastas) |
| Tag | a nota tem a tag (com ou sem tags aninhadas) |
| Nome do arquivo | o nome sem extensão é igual (`*` como curinga) |
| Propriedade existe | a propriedade tem valor |
| Propriedade igual a | o valor é igual (listas: qualquer item; links: destino ou alias) |

Nos rótulos, o efeito é outra lista de propriedades ou "manter o nome do arquivo".

## Comandos

`Ligar/desligar rótulos`, `Ligar/desligar tipos de link`, `Ligar/desligar imagens nos nós`, `Desligar tudo`, `Religar o Graph Kit`, `Exportar configuração` e `Importar configuração`.

## Configuração

Tudo fica no `data.json`, que também é o formato de exportação (copiar ou salvar no vault) e de importação (colar ou carregar um `.json` do vault, com resumo antes de aplicar):

```json
{
  "version": 1,
  "enabled": true,
  "features": {
    "labels": {
      "enabled": true,
      "graphs": { "global": true, "local": true },
      "properties": ["title", "aliases"],
      "scope": "all",
      "maxLength": 0,
      "rules": [
        {
          "id": "k3f9a2",
          "name": "Projetos",
          "enabled": true,
          "match": "all",
          "conditions": [{ "type": "filename", "value": "index", "not": false }],
          "effect": { "properties": [] }
        }
      ]
    }
  }
}
```

Valores inválidos voltam ao padrão um a um; chaves desconhecidas são ignoradas e listadas na importação.

## Próximas fases

Presets, forma e opacidade, ícones e tamanho por propriedade. Cada uma entra como um módulo em `src/features/<nome>/`, desligada por padrão. Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/graph-kit-spec.md`.

## Desenvolvimento

```bash
pnpm --filter graph-kit dev
pnpm --filter graph-kit test
```

Casos de teste em `dev-vault/Graph Kit/index.md`. O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/graph-kit/` (e para os vaults ligados com `pnpm link-plugin`).

## Idiomas

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`.
