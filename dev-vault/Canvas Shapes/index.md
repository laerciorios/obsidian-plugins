# Canvas Shapes: casos de teste

Canvas de teste: [[Canvas Shapes/formas.canvas|formas]] (todas as formas e estilos), [[Canvas Shapes/rascunho.canvas|rascunho]] (sem extensões, para aplicar do zero) e [[Canvas Shapes/exportacao.canvas|exportacao]] (imagem, nota, seção de nota, link, grupo com fundo). Todo o conteúdo é fictício.

## Preparação

- [ ] Canvas ligado em Plugins principais; na raiz do repo, `pnpm --filter canvas-shapes dev` e **Canvas Shapes** ativo em Plugins da comunidade.

## Formas

- [ ] Em `formas`: círculo (Sensores), quadrado laranja (Fila), losango amarelo (Umidade baixa?), cilindro ciano (Postgres) com o texto centralizado; API e Ligar irrigação continuam retângulos.
- [ ] Em `rascunho`, selecione "Pedido válido?": a barra aparece no canto superior esquerdo com o retângulo destacado. Clique no losango: o card vira losango e a barra destaca o losango.
- [ ] "Cliente" → círculo pela barra: vira 120×120. Arraste a alça do canto: continua círculo.
- [ ] "Estoque" → **Forma: cilindro** pela paleta de comandos.
- [ ] Clique direito em "Validar pedido" → **Forma** → Quadrado: vira 200×200.
- [ ] Selecione dois cards com formas diferentes: nenhuma forma destacada na barra; aplique uma e as duas mudam. Ctrl/Cmd+Z desfaz as duas de uma vez (espere um segundo antes de desfazer).
- [ ] Selecione só o grupo "Viveiro": a barra some e os comandos de forma não aparecem.
- [ ] Feche e reabra o canvas, e reinicie o Obsidian: as formas continuam.

## Setas

- [ ] Em `formas`: MQTT contínua, publica tracejada, avalia pontilhada vermelha grossa, grava extra grossa com pontas maiores, sim tracejada fina.
- [ ] Em `rascunho`, selecione a seta "consulta": a barra mostra estilo e espessura. Tracejada + grossa: a linha muda e acompanha o zoom.
- [ ] Clique direito numa seta → **Estilo da linha** → Pontilhada e **Espessura da linha** → Fina.
- [ ] Card + seta selecionados: a barra mostra forma, estilo e espessura, com um divisor.

## Sem o plugin

- [ ] Desligue o Canvas Shapes: `formas` abre só com retângulos e setas comuns. Mova um card e mude a cor de uma seta; religue o plugin: as formas e estilos continuam (o `canvasShapes` ficou no arquivo).

## Exportação

- [ ] Em `exportacao`, **Exportar como SVG ou PNG** → PNG 2× claro: foto, nota com Markdown, círculo com a seção "Regras", losango com o link da nota, cilindro, fundo do grupo em mosaico, setas com estilo.
- [ ] Selecione o cilindro e o losango → SVG, só a seleção, escuro, transparente: só os dois cards e a seta entre eles.
- [ ] **Exportar para web** → abra `exportacao/index.html` no navegador sem servidor: arrastar, Ctrl/⌘ + rolagem, botões −, ajustar, +, tema; as imagens aparecem.
- [ ] Em Configurações → Canvas Shapes, **Notas linkadas** → Link para a nota, **Link da nota** `https://example.com/{name}`: exporte de novo; as notas viram links.
