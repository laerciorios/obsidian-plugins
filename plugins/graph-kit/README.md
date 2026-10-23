# Graph Kit

Personaliza o graph nativo do Obsidian (graph global e local graph) com oito funcionalidades independentes, cada uma com toggle próprio, toggle por graph e, quando depende da nota, regras:

| Funcionalidade | O que faz | Ao instalar |
|---|---|---|
| Rótulos | O nó mostra uma propriedade (como o `title` das notas `index.md`) no lugar do nome do arquivo | ligado |
| Tipos de link | Cor, tracejado e visibilidade das arestas pela propriedade de onde o link vem, com legenda | desligado |
| Imagens nos nós | A capa de uma propriedade como `cover` dentro do nó | desligado |
| Presets | Combinações nomeadas das configurações (e dos filtros do graph) | desligado |
| Formas | Quadrado, losango, triângulo ou hexágono por regra | desligado |
| Opacidade | Nós (e links) apagados por regra | desligado |
| Ícones | Emoji, caractere ou ícone Lucide no nó; opcionalmente os símbolos do Folder Style | desligado |
| Tamanho | Tamanho do nó por uma propriedade numérica como `rating` | desligado |

## Como funciona

O graph não tem API pública. Todo acesso aos internals fica em [`src/graph-internals/`](src/graph-internals), conferido no Obsidian 1.14.4:

- As views `graph` e `localgraph` usam as mesmas classes de renderer, nó e aresta (PIXI 7). O plugin envolve métodos do protótipo (um wrapper por método, guardando o original) e descobre qual graph é qual pelas folhas abertas.
- O texto do nó vem de `node.getDisplayText()`, chamado uma vez ao desenhar o nó. Para mudanças ao vivo, o plugin atualiza o texto dos nós já desenhados.
- Cada funcionalidade declara os campos internos de que precisa (texto do nó, gráficos do nó e da aresta, tamanho, PIXI). Se algum sumir numa versão nova do Obsidian, só ela se desliga, com um aviso no console e uma nota nas configurações; o graph nativo fica intacto. Um erro dentro de uma funcionalidade tem o mesmo efeito.
- Nenhum patch existe enquanto todas as funcionalidades estão desligadas. Desligar uma funcionalidade, "Desligar tudo" ou desativar o plugin restaura o graph nativo na hora, sem reabrir a aba.
- Os dados vêm só do `metadataCache` (nunca lendo arquivos), com cache por caminho invalidado por mudança de frontmatter, renomear, mover e apagar.
- Formas, imagens e ícones são desenhados quando o graph cria o nó; os nós só são recriados quando a configuração daquela funcionalidade muda.
- Desempenho medido no dev-vault (731 nós, 1316 arestas) com tudo ligado: 60 fps, igual ao nativo.

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

## Presets

Desligado ao instalar.

- "Salvar o estado atual como preset…" guarda uma cópia das configurações das outras funcionalidades (rótulos, tipos de link, imagens…) com um nome, como "trabalho", "entretenimento" ou "estudo". Salvar com um nome que já existe substitui o preset.
- Opcional: incluir a busca, os filtros e os grupos de cor do graph global (não a tela nem as forças).
- Aplicar pelo comando "Aplicar preset…" ou pelo seletor no canto inferior direito do graph. Com o graph global fechado, os filtros entram quando ele abrir.

## Forma e opacidade

Duas funcionalidades independentes, desligadas ao instalar, cada uma com as suas regras.

- **Formas**: círculo, quadrado, losango, triângulo ou hexágono por regra (ex.: `type = project` quadrado, `type = meeting` losango). O clique e o anel de hover seguem a forma; no mobile, a área de toque nativa continua.
- **Opacidade**: de 5 % a 100 % por regra (ex.: `status = done` em 25 %, `status = paused` em 40 %). Apaga o nó e o rótulo; "Apagar os links também" apaga as arestas do nó (vale a ponta mais apagada). Imagens acompanham a opacidade do nó.

## Ícones

Desligado ao instalar.

- Um emoji, até três caracteres ou um ícone Lucide (os que o Obsidian já traz, como `book-open`) no meio do nó.
- De onde vem: a primeira regra que casar (ícone fixo, outra propriedade ou nenhum), senão a propriedade `icon` (configurável), senão, se ligado, o símbolo que o **Folder Style** dá à pasta da nota (ou à pasta acima mais próxima), inclusive um arquivo SVG do vault (nas cores do arquivo, ou na cor dos ícones quando a pasta usa "Usar a cor da pasta"; arquivo ausente, vazio ou acima de 100 KB fica sem ícone). Os SVGs são lidos junto com o `data.json`, ao ligar a opção ou recarregar o plugin. O Graph Kit só lê o `data.json` do Folder Style; os dois plugins não dependem um do outro.
- O ícone usa a cor de fundo do tema, para aparecer sobre o nó nos temas claro e escuro, e acompanha a opacidade do nó.

## Tamanho

Desligado ao instalar.

- Tamanho do nó por uma propriedade numérica (padrão `rating`) no lugar da quantidade de links. Aceita números e texto numérico (`4`, `4.5`, `4,5`).
- Menor e maior nó configuráveis (os nós nativos vão de 8 a 30), escala linear, raiz quadrada ou logarítmica, e os valores de referência: o menor e o maior do vault (automático) ou fixos.
- Regras podem usar outra propriedade ou manter o tamanho nativo. Notas sem valor ficam com o tamanho nativo. O "Tamanho do nó" do graph continua multiplicando.

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

`Ligar/desligar rótulos`, `Ligar/desligar tipos de link`, `Ligar/desligar imagens nos nós`, `Ligar/desligar presets`, `Ligar/desligar formas`, `Ligar/desligar opacidade`, `Ligar/desligar ícones`, `Ligar/desligar tamanho por propriedade`, `Aplicar preset…`, `Salvar o estado atual como preset…`, `Desligar tudo`, `Religar o Graph Kit`, `Exportar configuração` e `Importar configuração`.

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

## Desenvolvimento

```bash
pnpm --filter graph-kit dev
pnpm --filter graph-kit test
```

Casos de teste em `dev-vault/Graph Kit/index.md`. O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/graph-kit/` (e para os vaults ligados com `pnpm link-plugin`).

## Idiomas

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`.
