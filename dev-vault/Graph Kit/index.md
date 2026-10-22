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

Também há um anexo (`canvas-shapes-horta.png`, no Viveiro) e um link não resolvido (`Projeto Fantasma`, na Horta).

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

## Exportar e importar

- [ ] "Exportar configuração…": copie e salve como `graph-kit-config.json`. Com o arquivo já existente, o botão vira "Sobrescrever" com um aviso.
- [ ] Mude alguma opção, "Importar configuração…", carregue o arquivo: o resumo aparece e Importar volta ao exportado.
- [ ] Cole um JSON quebrado ou `{"title": "x"}`: Importar fica desabilitado e nada muda.
