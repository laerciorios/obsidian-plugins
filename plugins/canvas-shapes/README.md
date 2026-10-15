# Canvas Shapes

Formas (retângulo, quadrado, círculo, losango, cilindro) e estilo/espessura de seta no **Canvas nativo** do Obsidian, para diagramas de arquitetura e fluxos, com exportação para SVG/PNG e para web. O arquivo continua **JSON Canvas 1.0**: sem o plugin, ele abre normalmente (formas como retângulos, setas comuns) e nada se perde.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/canvas-shapes-spec.md`.

## Formato

As extensões ficam num objeto `canvasShapes` — na raiz (`{ "version": 1 }`), nos cards (`{ "shape": "cylinder" }`) e nas setas (`{ "line": "dashed", "width": 4 }`). Nenhum tipo novo de card. Valores padrão (`rectangle`, `solid`, espessura 2) não são gravados. Documento do formato e JSON Schemas em [packages/json-canvas-render](../../packages/json-canvas-render/FORMAT.md).

O Obsidian guarda os campos que não conhece: mover, redimensionar ou recolorir um card sem o plugin mantém o `canvasShapes` dele.

## Formas

| Forma | No Canvas |
|---|---|
| Retângulo | o card nativo (padrão) |
| Quadrado | card nativo, 1:1: vira quadrado ao aplicar (lado = a maior dimensão) e mantém a proporção ao redimensionar |
| Círculo | contorno circular, também 1:1 |
| Losango | contorno de losango (decisões de fluxograma) |
| Cilindro | banco de dados: elipse em cima, base curva |

Círculo, losango e cilindro desenham o contorno atrás do card (o fundo e a borda nativos ficam transparentes) e põem o conteúdo no retângulo que cabe dentro da forma, centralizado. Cores do Obsidian valem como sempre. Grupos continuam retângulos. Desfazer/refazer funcionam (o Canvas agrupa as mudanças com um pequeno atraso, como nas edições nativas).

## Setas

Estilo **contínua**, **tracejada** ou **pontilhada** e espessura **fina** (1 px), **normal** (2 px, a do Obsidian), **grossa** (4 px) ou **extra grossa** (8 px). Tracejado, pontilhado e ponta crescem com a espessura e acompanham o zoom como a linha nativa.

## Como aplicar

- **Barra flutuante** no canto superior esquerdo do Canvas, ao selecionar cards e/ou setas: formas, estilo da linha e espessura, com o valor atual destacado (nenhum quando a seleção está misturada). No celular os botões ficam maiores e a barra rola para o lado.
- **Menu de contexto** do card, da seta e da seleção: submenus **Forma**, **Estilo da linha** e **Espessura da linha**, com o valor atual marcado.
- **Comandos** (para atalhos): "Forma: retângulo/quadrado/círculo/losango/cilindro", "Linha: contínua/tracejada/pontilhada", "Espessura da linha: fina/normal/grossa/extra grossa". Valem para a seleção do Canvas ativo.

Uma aplicação na seleção inteira é um passo só no desfazer.

## Exportar como SVG ou PNG

Comando **Exportar como SVG ou PNG**, ou o item no menu do arquivo `.canvas` (explorador ou "mais opções" da aba). Na janela: formato, canvas inteiro ou seleção (um grupo selecionado leva o que está dentro), tema claro ou escuro, fundo transparente ou sólido e escala do PNG (1×, 2×, 3×). As últimas escolhas ficam lembradas.

- Imagens vão embutidas no SVG; notas aparecem com o texto (Markdown básico, abaixo); links viram links.
- O PNG é feito pelo próprio Obsidian; se a escala passar do limite do navegador (16 384 px de lado), a imagem sai na maior escala possível, com aviso.
- No desktop, a janela de salvar do sistema abre na pasta do canvas (salvar ali põe a imagem no vault). No celular, o arquivo vai para a **Pasta de exportação no mobile** (vazia: ao lado do canvas).

## Exportar para web

Comando **Exportar para web** (ou o item no menu do arquivo). No desktop, escolha uma pasta: o plugin cria `<nome do canvas>/` dentro dela com:

```
index.html     visualizador que abre offline (file://), sem servidor
canvas.json    o canvas em JSON Canvas 1.0 + extensões, portável
assets/        os anexos usados, com nomes seguros para URL
```

- O visualizador tem arrastar para mover, rolagem, Ctrl/⌘ + rolagem e pinça para zoom, botões −, ajustar e +, teclas `+ - 0` e troca de tema claro/escuro (a escolha de quem visita fica salva no navegador).
- No `canvas.json`, anexos de cards e fundos de grupo apontam para `assets/`; notas viram cards de texto com o **conteúdo** da nota (sem frontmatter, respeitando `#seção` e `#^bloco`) ou com um **link** para ela, conforme a configuração **Notas linkadas**. O link segue o **Link da nota** (`{vault}`, `{path}`, `{name}`; padrão `obsidian://open?vault={vault}&file={path}`). Embeds, wikilinks e links relativos dentro de textos são reescritos do mesmo jeito; nada aponta para fora da pasta.
- O desenho vem do pacote [`@obsidian-plugins/json-canvas-render`](../../packages/json-canvas-render), que também serve para um site redesenhar o `canvas.json`.
- No celular, a pasta é criada no vault, na pasta de exportação. Evite deixá-la lá se o Attachments Guard estiver recolhendo anexos soltos.

## O que o Markdown da exportação cobre

Títulos, parágrafos com quebra de linha simples, negrito, itálico, riscado, realce, código (inline e bloco), listas (aninhadas, numeradas e tarefas), citações, callouts (só o título), linhas horizontais, linhas de tabela, links, wikilinks e tags. Embeds aparecem pelo nome do arquivo (imagens vão em cards de arquivo); HTML é descartado; texto que não cabe no card é cortado, como no Canvas. Não é o renderizador do Obsidian: plugins de Markdown, Mermaid e LaTeX não aparecem.

## Configurações

| Configuração | Padrão |
|---|---|
| Pasta de exportação no mobile | vazio (ao lado do canvas) |
| Tema inicial (web) | seguir o sistema |
| Notas linkadas (web) | mostrar o texto |
| Link da nota (web) | `obsidian://open?vault={vault}&file={path}` |

## Compatibilidade e segurança

O Canvas não tem API pública de edição. Todo acesso aos internos fica em `src/canvas/` e passa por detecção de recursos a cada Canvas aberto (testado no Obsidian 1.14): o plugin só se pendura na própria instância do Canvas (nunca no protótipo), grava pelo fluxo de salvar do Canvas (`setData` + `requestSave`, que também cria o passo de desfazer) e confere se o valor voltou antes de salvar. Se algo não bater — um Obsidian novo que mudou o Canvas —, a barra, os menus e os comandos de edição se desligam naquele Canvas, aparece um aviso e o arquivo não é tocado. A exportação continua funcionando, porque lê o JSON e não a tela. O arquivo `.canvas` nunca é reescrito por fora.

## Desenvolvimento

```bash
pnpm --filter canvas-shapes dev
pnpm --filter canvas-shapes test
```

O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/canvas-shapes/`. Casos de teste em `dev-vault/Canvas Shapes/index.md`. Os testes cobrem a detecção e os ganchos (com um Canvas falso que imita o do Obsidian 1.14), a gravação com conferência e desfazer, a validação dos arquivos gravados e dos canvas do `dev-vault` contra os JSON Schemas, e a transformação da exportação web.

## Idiomas

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`. Os valores gravados no arquivo (`circle`, `dashed`) são dados e nunca são traduzidos.
