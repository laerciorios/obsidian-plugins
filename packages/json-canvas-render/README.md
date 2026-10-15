# @obsidian-plugins/json-canvas-render

Desenha um arquivo [JSON Canvas](https://jsoncanvas.org) — com as extensões do Canvas Shapes (formas nos cards, estilo e espessura nas setas) — como SVG. Não usa nada do Obsidian e não tem dependências em runtime: serve ao plugin [Canvas Shapes](../../plugins/canvas-shapes) (formas no Canvas, exportação SVG/PNG e web) e a um site no futuro.

- **Formato**: [FORMAT.md](FORMAT.md) (em inglês, para outros sistemas) e os JSON Schemas em [`schema/`](schema/). O JSON Canvas não publica um schema oficial, então [`json-canvas-1.0.schema.json`](schema/json-canvas-1.0.schema.json) transcreve a spec 1.0; os testes validam os arquivos com os dois schemas (`ajv`, só em desenvolvimento).
- **Extensões** (`extensions.ts`): leitura com padrões (`nodeShape`, `edgeStyle`) e escrita que não grava padrões e preserva chaves desconhecidas (`withShape`, `withLineStyle`, `withLineWidth`, `withFormatVersion`, `withExtension`).
- **Geometria** (`geometry.ts`): caminhos das formas, área do conteúdo dentro de cada forma, curvas e pontas das setas iguais às do Canvas do Obsidian, tracejado/pontilhado. O plugin usa as mesmas funções para desenhar no Canvas.
- **Render** (`render.ts`): `renderCanvas(data, options)` devolve `{ svg, width, height, viewBox }`. Opções: tema (`light`/`dark`, cores do tema padrão do Obsidian), fundo transparente ou sólido, margem, só alguns ids (seleção), medidor de texto, resolução de arquivos (imagens, notas, outros) e prefixo de ids.
- **Texto**: Markdown básico em `<text>` do SVG, com quebra de linha calculada (sem `foreignObject`, para o SVG abrir em qualquer programa e virar PNG). Num navegador, `contextMeasurer(canvas.getContext('2d'))` mede o texto exatamente; fora dele, `approximateMeasurer` estima.

## O que o Markdown cobre

Títulos (`#` e sublinhados), parágrafos com quebra de linha simples (como o Obsidian), **negrito**, *itálico*, ~~riscado~~, ==realce==, `código`, blocos de código, listas (aninhadas e numeradas), tarefas, citações, callouts (só o título em negrito), linhas horizontais, linhas de tabela (células separadas por `│`), links, wikilinks (pelo apelido ou nome da nota), URLs e tags. Embeds (`![[...]]`) aparecem pelo nome do arquivo; HTML é descartado; comentários `%%` somem. Texto que não cabe no card é cortado, como no Canvas.

## Uso

```ts
import { contextMeasurer, renderCanvas } from '@obsidian-plugins/json-canvas-render';

const { svg } = renderCanvas(JSON.parse(text), {
	theme: 'dark',
	background: 'solid',
	measure: contextMeasurer(document.createElement('canvas').getContext('2d')!),
	resolveFile: (path) => (path.endsWith('.png') ? { kind: 'image', href: `assets/${path}` } : undefined),
});
```

## Testes

```bash
pnpm --filter @obsidian-plugins/json-canvas-render test
```
