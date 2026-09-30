# Comments: casos de teste

Notas de teste nesta pasta. Todo o texto é fictício. As conversas ficam em `Attachments/Comments/`.

| Nota | Para quê |
|---|---|
| [[Comments/playground\|playground]] | Comentar do zero: parágrafo, lista, tabela, código, citação, callout, matemática e título |
| [[Comments/ata-kickoff\|ata-kickoff]] | Conversas prontas em `Attachments/Comments/ata-kickoff.md`: uma aberta com resposta da IA, uma resolvida e uma órfã |
| [[Comments/Alpha/index\|Alpha]] e [[Comments/Beta/index\|Beta]] | Duas notas `index.md`: cada uma ganha o próprio arquivo de comentários |

## Preparação

- [ ] Na raiz do repo, `pnpm --filter comments dev`. Confira **Comments** ativo em Plugins da comunidade.

## Comentar

Na `playground`, no Live Preview:

- [ ] Selecione "a umidade de cada canteiro" e use **Comentar seleção**: a caixa mostra a citação. Escreva e envie com `⌘+Enter`.
- [ ] O parágrafo ganha ` ^c-xxxx` no fim da segunda linha, que aparece como um ícone de comentário; o trecho fica destacado.
- [ ] `Attachments/Comments/playground.md` foi criado, com `note:`, a seção `## [[Comments/playground#^c-xxxx|c-xxxx]]`, `status: open`, a citação e `### eu · <data>`.
- [ ] O painel abriu na barra lateral direita com a conversa; a barra de status mostra `1 comentário`.
- [ ] Clique com o botão direito em outra seleção: o menu tem **Comentar**.
- [ ] Comente um item da lista (a âncora vai no fim de "Com separador ponto e vírgula."), a tabela, o bloco de código, a citação, o callout, a matemática e o título: nesses últimos, `^c-xxxx` fica numa linha própria depois do bloco, com linhas em branco em volta.
- [ ] Selecione outro trecho do primeiro parágrafo e comente: a caixa avisa "Este bloco já tem uma conversa" e a mensagem entra na mesma conversa, com a citação nova.
- [ ] Sem seleção, com o cursor num parágrafo: a caixa diz que o comentário vale para o bloco inteiro.
- [ ] Logo depois de comentar, `⌘+Z`: a âncora some e a conversa aparece como **Trecho apagado**. `⌘+⇧+Z` traz de volta.
- [ ] No modo fonte, com o cursor no frontmatter: aviso "Não dá para comentar nas propriedades da nota".
- [ ] Abra o arquivo de comentários e tente comentar nele: aviso "Este é um arquivo de comentários".

## Painel

Na `ata-kickoff`:

- [ ] O painel mostra `2 abertos · 1 resolvido`: a conversa dos quinze minutos (com a resposta da IA com o selo **IA** e negrito renderizado) e a órfã no fim, com **Trecho apagado**.
- [ ] Clique na citação: o trecho fica selecionado no editor. No modo de leitura (`⌘+E`), o bloco pisca e nenhum `^c-` aparece no texto.
- [ ] **Responder**, escreva e `⌘+Enter`: a mensagem entra no fim da seção, com `### eu · <data>`.
- [ ] **Resolver**: a conversa some, a contagem vira `1 aberto · 2 resolvidos`, a barra de status diminui e o arquivo mostra `status: resolved`.
- [ ] Desligue **Só abertos**: as resolvidas aparecem esmaecidas, com **Reabrir**. Recarregue o Obsidian: a opção continua desligada.
- [ ] No arquivo `Attachments/Comments/ata-kickoff.md`, acrescente à mão uma mensagem `### ia · 2026-09-30 10:00` com um texto: o painel mostra a resposta sem recarregar.
- [ ] Na nota, apague o parágrafo dos quinze minutos: a conversa vira **Trecho apagado** meio segundo depois.
- [ ] Clique no ícone de uma âncora no editor: o painel destaca a conversa dela.
- [ ] Renomeie a `ata-kickoff`: o `note:` e os links do arquivo de comentários mudam e o painel continua mostrando as conversas.

## Notas com o mesmo nome

- [ ] Comente a Alpha e depois a Beta: surgem `Attachments/Comments/index.md` e `Attachments/Comments/beta-index.md`, cada um com o `note:` da sua nota.

## Configurações

- [ ] Desligue **Destacar trechos comentados**: destaques e ícones somem sem recarregar. Religue.
- [ ] Desligue **Contador na barra de status**: o contador some.
- [ ] Mude **Pasta dos comentários** para outra pasta: o painel fica vazio (os arquivos antigos não são movidos). Volte para `Attachments/Comments`: as conversas voltam.
- [ ] Mude **Seu nome nos comentários** e responda: a mensagem sai com o nome novo.
