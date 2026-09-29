# Media Catalog: casos de teste

O plugin busca filmes, séries, livros e jogos na internet e cria notas em `1 - Knowledge/Entertainment/DB/`. As notas da tabela **Dados** são fictícias; as buscas dos testes usam obras reais só como termo de busca.

> [!warning] Apague as notas criadas nos testes antes de commitar
> Os testes criam notas e capas com títulos reais (`the-matrix.md`, `Attachments/the-matrix-cover.jpg`…). Elas **não** vão para o git: antes do commit, apague tudo em `DB/`, `Attachments/` e `_References/Books/` que não esteja na tabela abaixo (`git status dev-vault` mostra o que sobrou).

## Dados

| Onde | O que tem |
|---|---|
| `DB/` (filmes) | [[girassois-em-marte\|Girassóis em Marte]] (done, nota 8, capa local), [[samambaia-o-retorno\|Samambaia: O Retorno]] (backlog, título com `:`) |
| `DB/` (série) | [[horta-selvagem-s01\|Horta Selvagem T1]] (done) e [[horta-selvagem-s02\|T2]] (in-progress): uma nota por temporada |
| `DB/` (jogos) | [[semente-eterna\|Semente Eterna]] (done, 42 horas), [[jardineiro-espacial\|Jardineiro Espacial]] (dropped) |
| `DB/` (livros) | [[refatorando-canteiros\|Refatorando Canteiros]] (técnico, com `reference`), [[o-livro-das-mudas\|O Livro das Mudas]] (backlog) |
| `Attachments/` | `girassois-em-marte-cover.png`, capa local (retângulo verde 200×300) |
| `Software Development/_References/Books/` | [[1 - Knowledge/Software Development/_References/Books/refatorando-canteiros\|referência]] do livro técnico |
| `Game Dev/_References/Books/` | só um `index.md`: segunda área para o campo **Área** |
| `_Templates/media.md` | template do catálogo (pasta de templates: `_Templates`) |
| [[entertainment.base]] | views **Todos** (tabela) e **Galeria** (cards com a capa) |

## Preparação

- [ ] Na raiz do repo, `pnpm --filter media-catalog dev`. Confira **Media Catalog** ativo em Plugins da comunidade.
- [ ] Em Configurações → Media Catalog: **Pasta do catálogo** `1 - Knowledge/Entertainment/DB`, **Template** vazio, **Link para a fonte** ligado, **Status padrão** "Em andamento", **Fonte de livros** Open Library.
- [ ] A paleta de comandos mostra **Adicionar ao catálogo**. **Trocar capa** e **Terminei** só aparecem com uma nota do catálogo aberta (abra [[semente-eterna]] e depois este índice para comparar).

## Filmes (IMDb)

- [ ] **Adicionar ao catálogo** abre o modal no tipo **Filme**, com o foco na busca: digite logo ao abrir, sem clicar, e o texto entra na busca (o **Tipo** não muda).
- [ ] Espaços não refazem a busca: com os resultados de `matrix` na tela, destaque o terceiro com ↓ e digite um espaço no fim (e depois no começo). Nada pisca, e resultados e destaque ficam como estavam.
- [ ] Ano no fim da busca: `dune 1984` e `dune (1984)` buscam `dune` e destacam o filme de 1984 (o último da lista), sem escolher. `dune (1999)` destaca o primeiro. `wonder woman 1984` destaca "Wonder Woman 1984" (título com o número). `blade runner 2049` busca o texto inteiro.
- [ ] Uma letra só não busca nada. `matrix` lista resultados com capa, ano, elenco e o selo IMDb. Nenhum é escolhido sozinho, nem quando sobra um resultado.
- [ ] Só filmes aparecem: nada de séries, pessoas ou franquias. ↑/↓ movem a seleção e Enter escolhe.
- [ ] Acentos e pontuação funcionam: `amélie`, `cidade de deus` (vem como "City of God"), `face/off`, `8½`.
- [ ] O formulário vem preenchido: título, ano, status "Em andamento" e **Início** com hoje. Com "Concluído" aparecem **Fim** (hoje) e **Nota**.
- [ ] Com "Abandonado" aparece só **Nota** (sem **Fim**). Com nota 4, a nota criada tem `status: dropped`, `rating: 4` e `finished` vazio. Volte a "Em andamento": **Nota** some e não é gravada.
- [ ] **Início** preenchido pelo formulário: mude para "Na fila" e o campo fica vazio; volte a "Em andamento" e ele volta com hoje. Digite outra data em **Início** e mude para "Na fila": a data digitada fica e é gravada.
- [ ] **Criar nota** cria `DB/the-matrix.md`. No modo fonte, a ordem é `kind, title, year, status, rating, started, finished, platform, cover, tags`, com `title: "The Matrix"`, `cover:` com a URL sem aspas (termina em `_V1_SX500.jpg`) e `tags: [entertainment]`.
- [ ] O corpo é o do template (`## Impressões`) seguido de `- IMDb: https://www.imdb.com/title/tt0133093/`.
- [ ] Título com `:`: `mission impossible` grava `title: "Mission: Impossible"` no arquivo `mission-impossible.md`.
- [ ] Nas ferramentas de desenvolvedor (aba Network), as miniaturas carregam sem 403.

## Séries (TVmaze, temporadas)

- [ ] Tipo **Série**, `breaking bad`: resultados com canal e anos ("AMC · 2008–2019"). Escolher abre **Escolha a temporada** com 5 temporadas, pôster, episódios e ano de cada uma.
- [ ] **Voltar** devolve a busca com o texto e os resultados de antes.
- [ ] Na grade de temporadas, ↑↓←→ movem o destaque sem clicar antes.
- [ ] Temporada 2 → `DB/breaking-bad-s02.md` com `season: 2`, `episodes: 13`, `year: 2009` e o pôster da temporada.
- [ ] Na confirmação da temporada 2, abaixo dos dados aparecem **Pôster da temporada** (pressionado) e **Pôster da série**. Clique em **Pôster da série**: a capa grande muda, e a nota criada grava o pôster da série. Com Tab até os botões, Enter e espaço também escolhem.
- [ ] `doctor who` (o de 2005): a temporada 13 vem com 6 episódios, contados porque o TVmaze não informa o total.
- [ ] `doctor who` (o de 2023): as temporadas sem pôster usam o pôster da série, e a confirmação não mostra os botões de pôster.
- [ ] `the office`: as versões de NBC e BBC Two aparecem separadas pelo canal.

## Livros (Open Library, Google Books com chave)

- [ ] Tipo **Livro** mostra o campo **Fonte** com Open Library selecionada. Feche e abra o modal: digitar logo ao abrir vai para a busca, não para **Tipo** nem **Fonte**.
- [ ] Troque a **Fonte** para Google Books, feche e abra o modal: a fonte continua Google Books, e **Configurações → Fonte de livros** também mostra Google Books. Volte para Open Library.
- [ ] `dune`: o primeiro resultado é de Frank Herbert com ano 1965 (primeira publicação). O formulário traz **Autor** e **Páginas**.
- [ ] `1984` acha "Nineteen Eighty-Four" (George Orwell, 1949). `arquitetura limpa` acha a edição brasileira de Robert C. Martin.
- [ ] Um resultado sem capa mostra o ícone de imagem ausente, e o formulário avisa que a nota é criada sem capa.
- [ ] Fonte **Google Books** sem chave: mensagem pedindo a chave nas configurações, sem erro no console.
- [ ] Com a chave (Google Cloud → Books API, guardada em Configurações → Chaves): `arquitetura limpa` traz edições com páginas e capa. A URL da capa começa com `https://`, não tem `edge=curl` e termina em `fife=w500`.
- [ ] No formulário de um resultado do Google Books, a descrição de **Ano** diz que é o ano da edição. No Open Library, que é o da primeira publicação.
- [ ] Chave errada: mensagem dizendo que o Google Books recusou a chave.

## Jogos (IGDB com credenciais Twitch)

- [ ] Tipo **Jogo** sem credenciais: mensagem pedindo a chave nas configurações.
- [ ] Crie um app em dev.twitch.tv e guarde client id e client secret como dois segredos. Selecione-os em **Client id do IGDB** e **Client secret do IGDB**.
- [ ] `hollow knight`: resultados com capa, ano e estúdio. O formulário mostra **Horas**, e **Onde** sugere as plataformas do jogo.
- [ ] Várias buscas seguidas funcionam sem erro. O token fica só em memória: não aparece em `data.json` nem nos segredos (as chamadas do `requestUrl` não aparecem na aba Network).
- [ ] Client secret errado: mensagem de chave recusada. Corrija e busque de novo sem recarregar o plugin.

## Duplicatas e colisão de nome

- [ ] Com `the-matrix.md` já criada, busque `matrix` e escolha The Matrix de novo: o formulário mostra "Já está no catálogo: the-matrix", com **Abrir nota**, e **Criar nota** fica desativado.
- [ ] Série: `breaking bad` temporada 2 de novo é duplicata; a temporada 3 não é.
- [ ] Mesmo título, outro ano: em **Filme**, crie `dune` de 2021 e depois o de 1984. O segundo não é duplicata e vira `dune-1984.md`.
- [ ] Livro não olha o ano: crie `dune` em **Livro** (Open Library, 1965). Busque de novo e, no formulário, mude **Ano** para 2017 (o ano de uma edição no Google Books): continua "Já está no catálogo". Em **Filme**, mudar o ano tira o aviso.

## Trocar capa

- [ ] Em [[samambaia-o-retorno]], **Trocar capa** abre a busca do tipo Filme com o título preenchido e já buscando. O modal só mostra o bloco da capa e **Atualizar capa**.
- [ ] Em [[girassois-em-marte]] (capa local), o último passo mostra **Atual** com o retângulo verde ao lado da **Nova**. Em [[samambaia-o-retorno]] (`cover: ""`), **Atual** mostra o ícone de imagem ausente.
- [ ] Capa atual de outro site: troque o `cover` de [[samambaia-o-retorno]] por `https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png` (fora da lista de hosts). **Atual** mostra a imagem. Restaure `cover: ""`.
- [ ] O foco começa em **Atualizar capa**. Aplique uma capa com **Manter o link** e rode **Trocar capa** de novo com o mesmo resultado: **Atualizar capa** fica desativado, com o aviso "A nota já usa esta capa.", e o foco vai para **Capa**. **Baixar para os anexos** reativa o botão. Restaure `cover: ""`.
- [ ] Ano da nota e capas: troque temporariamente `title` e `year` de [[samambaia-o-retorno]] por `Dune` e `1984`. **Trocar capa** destaca o Dune de 1984 (o último da lista), sem escolher. Com `Cidade de Deus` (e `year: 2002`), os resultados sem capa ficam no fim da lista. Restaure `title: "Samambaia: O Retorno"` e `year: 1994`.
- [ ] Escolha qualquer resultado com capa: só `cover` muda no frontmatter. Restaure `cover: ""` depois (os dados fictícios não guardam URLs reais).
- [ ] Em [[horta-selvagem-s02]], a busca é do tipo Série e a temporada 2 vem pré-selecionada.
- [ ] Série com pôster de temporada: troque temporariamente `title` de [[horta-selvagem-s02]] por `Breaking Bad`. No último passo aparecem **Pôster da temporada** e **Pôster da série**, e **Nova** acompanha a escolha. Restaure o título e `cover: ""`.
- [ ] Uma nota com `kind: movie` fora de `DB/` também aceita o comando.

## Terminei

- [ ] Em [[horta-selvagem-s02]], **Terminei** pede a nota. Escolha 8: `status: done`, `finished` com hoje e `rating: 8`. Restaure a nota depois (`in-progress`, `rating` e `finished` vazios).
- [ ] Ao abrir **Terminei**, Enter e espaço não gravam nada: o foco fica no grupo dos botões, não no 1. Tab chega ao 1, e as teclas 0–9 continuam valendo.
- [ ] **Terminar sem nota** grava `status` e `finished`, e deixa `rating` como estava.
- [ ] Esc ou **Cancelar** não gravam nada.

## Baixar capa

- [ ] No formulário, **Capa** → **Baixar para os anexos**: a nota ganha `cover: "[[the-matrix-cover.jpg]]"` e o arquivo aparece em `Attachments/`.
- [ ] Baixar de novo uma capa com o mesmo nome: o Obsidian acrescenta um número ao arquivo, sem sobrescrever.
- [ ] Sem internet no meio do download: aviso de falha, e a nota é criada com a URL.
- [ ] A view **Galeria** abaixo mostra a capa local de [[girassois-em-marte]] e as capas baixadas.

## Livro técnico

- [ ] Livro com **Livro técnico** ligado: **Área** lista `1 - Knowledge/Game Dev` e `1 - Knowledge/Software Development`.
- [ ] Criar em Software Development gera `_References/Books/<slug>.md` igual à [[1 - Knowledge/Software Development/_References/Books/refatorando-canteiros|referência de exemplo]]: frontmatter `title, author, year, done: false, source_url, tags: [reference, book]`, título com link para a fonte, `Leitura:` e as seções **Resumo** e **Notas pessoais**.
- [ ] O `reference` da nota do catálogo e o `Leitura:` da referência abrem a outra nota no hover.

## Configurações

- [ ] **Pasta do catálogo** `Teste/Catálogo`: a próxima nota cria a pasta. Volte ao padrão e apague a pasta.
- [ ] **Pasta do catálogo** vazia (apague todo o texto): a próxima nota vai para `1 - Knowledge/Entertainment/DB`, não para a raiz do vault, e ao reabrir as configurações o campo mostra o padrão.
- [ ] **Template** apontando para uma nota que não existe: a nota sai com o corpo vazio, sem erro.
- [ ] **Link para a fonte** desligado: a nota sai sem a linha `- IMDb: …`.
- [ ] **Status padrão** "Na fila": o formulário abre com esse status e **Início** vazio.
- [ ] **Baixar capas por padrão** ligado: **Baixar para os anexos** já vem selecionado.
- [ ] Feche o Obsidian e abra de novo: as configurações e o último tipo usado continuam lá.

## Idiomas

- [ ] Obsidian em inglês (Configurações → Geral → Idioma, reinicia o app): comandos **Add to catalog**, **Change cover** e **Mark as finished**, e modal, formulário, avisos e configurações em inglês.
- [ ] Em inglês, as notas continuam com os mesmos valores (`status: done`, `kind: movie`), e a nota de referência continua com `Leitura:`, **Resumo** e **Notas pessoais**.
- [ ] De volta ao português, tudo volta a aparecer em português.

## Catálogo

![[entertainment.base]]
