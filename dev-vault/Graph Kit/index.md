---
title: "Graph Kit: casos de teste"
---
# Graph Kit: casos de teste

Notas fictícias para os rótulos do graph. Os projetos se chamam todos `index.md`, como no vault real, e têm `title`.

| Nota | Frontmatter | Rótulo esperado (padrão `title`) |
|---|---|---|
| [[Graph Kit/Projetos/Estufa Lunar/index]] | `title: Estufa Lunar` | Estufa Lunar |
| [[Graph Kit/Projetos/Horta Vertical/index]] | `title: Horta Vertical` | Horta Vertical |
| [[Graph Kit/Projetos/Viveiro Flutuante/index]] | `title` longo | o título inteiro (quebra em linhas) |
| [[Graph Kit/Projetos/Sem Título/index]] | `title: ""` | index |
| [[Graph Kit/Pessoas/iara-sol]] | só `aliases` | iara-sol (Iara Sol com `title, aliases`) |
| [[Graph Kit/Pessoas/teo-brisa]] | nenhum dos dois | teo-brisa |
| [[Graph Kit/Reuniões/2026-10-20-abertura-da-estufa]] | `title` em link | Abertura da Estufa |
| [[Graph Kit/Notas/caderno-de-ideias]] | `title`, tag `#ideia/solta` | Caderno de ideias |

Os cards em `Graph Kit/Cards/` têm `parent`, `projects` e `blocked_by`, a reunião tem `attendees` e `projects`, e o Caderno tem `reference`. Também há um anexo (`canvas-shapes-horta.png`, no Viveiro) e um link não resolvido (`Projeto Fantasma`, na Horta).

## Preparação

- [ ] Na raiz do repo, `pnpm --filter graph-kit dev`. Confira **Graph Kit** ativo em Plugins da comunidade e o plugin nativo Visualização em gráfico ligado.
- [ ] Abra o graph global e busque `path:"Graph Kit"` para ver só estas notas. Abra o local graph da Estufa Lunar.

## Rótulos

- [ ] Os nós mostram os rótulos da tabela, no graph global e no local.
- [ ] Em Configurações → Graph Kit → Rótulos, propriedades `title, aliases`: a Iara vira "Iara Sol" na hora.
- [ ] Tamanho máximo 20: o Viveiro termina com "…". Volte para 0.
- [ ] Ligue "Mostrar anexos" e "Tags" no graph: o anexo, o "Projeto Fantasma" e as tags continuam com o nome de sempre.
- [ ] A busca e os filtros do graph não mudam: `file:index` mostra os mesmos nós com o Graph Kit ligado e desligado.

## Regras

- [ ] Notas: "Só as notas que casam uma regra". Nova regra "nome do arquivo `index`", efeito "Das propriedades" vazio: só os projetos ficam com título; Caderno e Reunião voltam ao nome do arquivo.
- [ ] Desligue a regra pelo toggle da lista: todos voltam ao nome do arquivo, e a regra continua lá.
- [ ] Regra "na pasta `Graph Kit/Pessoas`", efeito `aliases`, acima da outra: a Iara mostra "Iara Sol".
- [ ] Regra com "Não" (`status` = `paused`, não) e "Manter o nome do arquivo": a Horta Vertical, pausada, continua com título; as outras voltam ao nome.
- [ ] Arraste as regras para trocar a ordem: a primeira que casar vence.
- [ ] Restaure os padrões da seção: as opções voltam, as regras ficam.

## Ao vivo

- [ ] Mude o `title` da Estufa Lunar: o nó muda na hora, sem reabrir o graph.
- [ ] Renomeie `teo-brisa` para `teo-brisa-2`, mova o Caderno de pasta, apague e restaure uma nota: o graph acompanha.
- [ ] Abra um graph novo (outra aba): já abre com os rótulos.

## Ligar e desligar

- [ ] Desligue "No local graph": só o local volta aos nomes. Religue.
- [ ] Comando "Ligar/desligar rótulos": volta ao nativo e religa, na hora.
- [ ] Comando "Desligar tudo": o graph volta ao nativo; "Religar o Graph Kit" volta como estava.
- [ ] Desative o plugin em Plugins da comunidade: o graph aberto volta ao nativo sem reabrir a aba.

## Tipos de link

- [ ] Em Configurações → Graph Kit → Tipos de link, ligue e clique em "Detectar propriedades com links": entram `attendees`, `blocked_by`, `parent`, `projects` e `reference`, cada um com uma cor.
- [ ] Deixe `projects` tracejado e `blocked_by` pontilhado: as arestas dos cards e da reunião mudam na hora, nos dois graphs.
- [ ] A legenda aparece no canto: clique em `attendees` no graph global; as arestas da reunião para as pessoas somem só nele, e o local graph continua igual.
- [ ] Arraste `parent` para baixo de `projects`: a aresta do card Montar as bancadas para a Estufa (que tem os dois) passa a usar a cor de `projects`.
- [ ] Adicione `reference: "[[Graph Kit/Projetos/Horta Vertical/index]]"` em `teo-brisa`: a aresta para a Horta vira a de `reference` na hora. Apague a propriedade.
- [ ] Desligue a funcionalidade: cores, tracejados e legenda somem sem reabrir o graph.

## Imagens nos nós

As notas em `Graph Kit/Catálogo/` têm `cover` em formatos diferentes: `[[...]]` (Girassóis), `![[...]]` (Horta Selvagem), caminho do vault (Jardim de Pedra), URL (Musgo Sonoro) e vazia (Enxada Quest).

- [ ] Ligue Imagens: Girassóis, Horta Selvagem e Jardim de Pedra ganham a capa dentro do nó, com a cor do nó como anel. Aumente o zoom ou o "Tamanho do nó" do graph para ver melhor.
- [ ] Musgo Sonoro fica sem imagem (URL, sem rede). Enxada Quest também (sem capa).
- [ ] Ponha `cover: "[[capa-provisoria.png]]"` em Enxada Quest: a imagem aparece na hora. Volte para vazio.
- [ ] Regra "kind = book" com efeito "Sem imagem": o Jardim de Pedra perde a imagem.
- [ ] Desligue: as imagens somem sem reabrir o graph; religue e elas voltam.

## Presets

- [ ] Ligue Presets. Com tipos de link ligados e imagens desligadas, busque `path:"Graph Kit"` no graph e salve o preset "Trabalho" com "Incluir os filtros e grupos do graph".
- [ ] Desligue os tipos de link, ligue as imagens, busque `path:"Graph Kit/Catálogo"` e salve "Entretenimento".
- [ ] Comando "Aplicar preset…" → Trabalho: tipos de link voltam, imagens somem e a busca do graph volta para `path:"Graph Kit"`.
- [ ] No seletor do canto inferior direito do graph, escolha Entretenimento: o contrário. O seletor mostra o preset atual.
- [ ] Salve de novo como "trabalho" (minúsculas): o aviso diz que substitui, e a lista continua com dois presets.

## Presets

- [ ] Ligue Presets. Com tipos de link ligados e imagens desligadas, busque `path:"Graph Kit"` no graph e salve o preset "Trabalho" com "Incluir os filtros e grupos do graph".
- [ ] Desligue os tipos de link, ligue as imagens, busque `path:"Graph Kit/Catálogo"` e salve "Entretenimento".
- [ ] Comando "Aplicar preset…" → Trabalho: tipos de link voltam, imagens somem e a busca do graph volta para `path:"Graph Kit"`.
- [ ] No seletor do canto inferior direito do graph, escolha Entretenimento: o contrário. O seletor mostra o preset atual.
- [ ] Salve de novo como "trabalho" (minúsculas): o aviso diz que substitui, e a lista continua com dois presets.

## Forma e opacidade

- [ ] Ligue Formas com as regras `type = project` → quadrado, `type = meeting` → losango, `type = card` → triângulo e "kind existe" → hexágono: os nós mudam nos dois graphs; pessoas e notas continuam círculos.
- [ ] Passe o mouse num projeto: o anel de destaque também é quadrado, e o clique abre a nota.
- [ ] Ligue Opacidade com `status = done` → 25 % e `status = paused` → 40 %: Montar as bancadas, Girassóis, Musgo Sonoro e a Horta Vertical ficam apagados, com o rótulo e os links.
- [ ] Desligue "Apagar os links também": só os nós ficam apagados.
- [ ] Mude o `status` da Horta Vertical para `active`: ela volta ao normal na hora.
- [ ] Desligue as duas: círculos e opacidade normal voltam sem reabrir o graph.

## Ícones

A Estufa Lunar tem `icon: sprout` (Lucide) e a Iara `icon: "🌻"`.

- [ ] Ligue Ícones: o broto aparece no nó da Estufa e o girassol no da Iara, nos dois graphs.
- [ ] Ponha `icon: users` em `teo-brisa`: o ícone aparece na hora. Apague.
- [ ] No Folder Style, dê o símbolo `🎬` à pasta `Graph Kit/Catálogo` e o ícone `check-square` a `Graph Kit/Cards`. Ligue "Símbolos do Folder Style": as notas dessas pastas ganham o símbolo.
- [ ] Regra "kind = movie" → "Sem ícone": Girassóis perde o 🎬.
- [ ] Desligue: os ícones somem sem reabrir o graph.

## Exportar e importar

- [ ] "Exportar configuração…": copie e salve como `graph-kit-config.json`. Com o arquivo já existente, o botão vira "Sobrescrever" com um aviso.
- [ ] Mude alguma opção, "Importar configuração…", carregue o arquivo: o resumo aparece e Importar volta ao exportado.
- [ ] Cole um JSON quebrado ou `{"title": "x"}`: Importar fica desabilitado e nada muda.
