# Media Catalog

Cadastra filmes, séries (uma nota por temporada), jogos, livros e álbuns de música no catálogo de entretenimento. O plugin busca título, ano e capa numa fonte online, você confere os dados num formulário e a nota é criada na pasta do catálogo, com o corpo do template `media`. Também troca a capa de notas que já existem, marca uma obra como terminada e põe a lista de faixas nos álbuns.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/media-catalog-spec.md`.

## Como usar

| Comando | Quando aparece | O que faz |
|---|---|---|
| **Adicionar ao catálogo** | sempre | Busca uma obra e cria uma nota nova. |
| **Trocar capa** | com uma nota do catálogo aberta | Busca a mesma obra e troca só a propriedade `cover`. |
| **Terminei** | com uma nota do catálogo aberta | Pede uma nota de 1 a 10 e grava `status: done`, `finished` com a data de hoje e `rating`. |
| **Atualizar faixas do álbum** | com uma nota de álbum aberta (`kind: album`) | Busca o mesmo álbum, você confirma a edição e só a seção `## Faixas` da nota é trocada (ou criada). |

Uma nota é do catálogo quando o frontmatter tem `kind` igual a `movie`, `series`, `game`, `book` ou `album`, em qualquer pasta.

### Adicionar ao catálogo

1. **Tipo**: Filme, Série, Jogo, Livro ou Álbum. O modal abre no último tipo usado, com o foco na busca. Para livros e álbuns aparece também **Fonte** (Open Library ou Google Books; MusicBrainz ou iTunes); a fonte escolhida fica salva para a próxima vez, separada por tipo.
2. **Busca**: com 2 caracteres ou mais, a busca roda sozinha depois de uma pausa na digitação. Enter busca na hora. Espaços a mais no começo ou no fim não refazem a busca. Um ano no fim (`samambaia 2031` ou `samambaia (2031)`) não vai para a fonte: a busca é por `samambaia`, e o primeiro resultado de 2031 vem destacado. Um resultado com o título inteiro (um título que termina num número, como `Samambaia 2031`) tem preferência. Em álbuns, a busca aceita título, artista ou os dois (`maré de musgo`, `lia broto`, `maré de musgo lia broto`).
3. **Resultado**: cada card mostra capa, título, ano, uma linha de detalhe (elenco, canal e anos, autores, estúdio ou artista) e a fonte. Em álbuns, a capa é quadrada e uma linha a mais diz o tipo (**Álbum** ou **EP**) e o número de faixas, quando a fonte informa. O primeiro (ou o do ano pedido) vem destacado, mas **nada é escolhido sozinho**, nem quando a busca devolve um resultado só: escolha com Enter ou com um clique.
4. **Capa e faixas** (só álbuns): ao escolher, o modal mostra o álbum com um indicador de carregamento. No MusicBrainz, "Procurando capa e faixas…": confere se o Cover Art Archive tem a capa e, ao mesmo tempo, busca a lista de faixas (ver [Faixas e edições](#faixas-e-edições)). Sem capa lá e com **Capas do iTunes** ligado, procura o mesmo álbum (artista e título) no iTunes e usa a capa dele; sem nenhuma, a nota sai sem capa. No iTunes, a capa já veio na busca, e o modal mostra "Procurando as faixas…". Com **Incluir lista de faixas em álbuns** desligado, as faixas não são buscadas: no MusicBrainz aparece só "Procurando a capa…", e no iTunes o modal vai direto ao formulário. **Voltar** nesse momento volta para a busca, e Esc fecha: as respostas que chegarem depois são descartadas. Escolher o mesmo resultado de novo, depois de **Voltar**, não repete as consultas (uma lista de faixas que falhou é buscada de novo).
5. **Temporada** (só séries): grade com pôster, número de episódios e ano de cada temporada.
6. **Confirmar**: o formulário vem preenchido com o resultado, e a capa aparece grande ao lado do título. Quando a temporada tem pôster próprio, diferente do da série, dois botões abaixo dos dados escolhem entre **Pôster da temporada** (o padrão) e **Pôster da série**; a capa grande e a nota seguem a escolha. Em álbuns, a linha do tipo mostra o número de faixas e a duração total da lista que vai para a nota (`Álbum · 10 faixas · 42:39`; com mais de um disco, `Álbum · 23 faixas · 2 discos · 1:31:05`; sem nenhuma duração conhecida, só o número). Quando a lista não veio (a fonte não respondeu ou não tem faixas), o formulário avisa "Lista de faixas indisponível: a nota será criada sem ela." **Criar nota** cria e abre a nota; num álbum sem lista de faixas, um aviso lembra que a nota saiu sem ela. **Voltar** retorna ao passo anterior sem perder a busca.

O formulário tem **Título**, **Ano**, **Status**, **Início**, **Fim**, **Nota**, **Onde** e **Capa**, mais os campos do tipo: **Temporada** (só leitura) e **Episódios** em séries, **Horas** em jogos (**Onde** sugere as plataformas do jogo), **Autor**, **Páginas** e **Livro técnico** em livros, **Artista** em álbuns (artista ou banda, como na fonte; vários artistas ficam separados por vírgula). Em álbuns, as descrições dizem que **Título** é o título como foi lançado, **Ano** o do lançamento original (não o de uma reedição), **Início** a primeira audição, **Fim** a audição completa e **Onde** Spotify, YouTube Music, vinil… **Início** vem com a data de hoje, exceto com o status **Na fila**; se a data foi preenchida pelo formulário e você muda para **Na fila**, o campo volta a ficar vazio (uma data digitada por você fica). **Nota** aparece com **Concluído** ou **Abandonado**, e **Fim** só com **Concluído**, já com a data de hoje. Em resultados do Google Books, a descrição de **Ano** lembra que o ano é o da edição. Os campos são validados ao sair deles e ao salvar: ano com 4 dígitos, datas `AAAA-MM-DD`, nota inteira de 1 a 10, episódios, páginas e horas com zero ou mais.

Em **Capa**, **Manter o link** grava a URL da imagem, e **Baixar para os anexos** salva uma cópia no vault. Sem capa na fonte, o formulário avisa e a nota sai sem capa.

### Duplicatas

Na confirmação, o plugin procura na pasta do catálogo (subpastas incluídas) uma nota do mesmo `kind`, com o mesmo título (ignorando acentos, maiúsculas e pontuação) e, em séries, a mesma `season`. Se as duas notas têm ano e os anos são diferentes, não é duplicata: dois filmes com o mesmo título e anos diferentes são duas notas. Em livros o ano não conta, porque o Open Library traz o ano da primeira publicação e o Google Books o da edição: o mesmo livro com outro ano é duplicata.

Em álbuns, conta também o artista (`author`, comparado como o título): o mesmo título de outro artista não é duplicata. O ano vale como nos filmes, porque uma banda pode lançar vários álbuns com o próprio nome: "Os Samambaias" de 1994 e "Os Samambaias" de 2001 são duas notas, e o de 1994 de novo é duplicata. Quando um dos dois lados não tem artista, o artista não decide. A nota que já ocupa o nome da nova (`<slug>.md`) segue a mesma regra.

Quando acha, o formulário mostra "Já está no catálogo: <nota>" com **Abrir nota**, e **Criar nota** fica desativado. A busca se repete enquanto você edita título, ano e, em álbuns, artista, e de novo ao salvar.

### Trocar capa

O modal abre com o tipo da nota travado e o `title` da nota já buscado. Em álbuns, a busca é `title` seguido de `author` (`Maré de Musgo Lia Broto`), porque muitos álbuns têm o mesmo título; num álbum homônimo, o nome vai uma vez só. Álbuns do MusicBrainz passam pela consulta da capa antes do último passo, como na criação. Os resultados sem capa vão para o fim da lista, e o primeiro com o `year` da nota vem destacado (em séries, só na temporada 1: nas outras, o ano da nota é o da temporada). Em séries, a temporada da nota vem destacada.

O último passo mostra lado a lado a capa **Atual** da nota e a **Nova**, o campo **Capa** (link ou download) e **Atualizar capa**. A atual pode ser uma URL `https://` de qualquer site, um link `[[arquivo]]` ou o nome de uma imagem do vault; sem capa, aparece o ícone de imagem ausente. Em séries, a escolha entre o pôster da temporada e o da série aparece como na criação. Com **Manter o link** e a mesma URL que a nota já tem, **Atualizar capa** fica desativado e o modal avisa que a nota já usa essa capa. Só `cover` muda na nota.

### Atualizar faixas do álbum

Para um álbum criado antes da lista de faixas, com a lista errada ou de outra edição. O modal abre com o tipo **Álbum** travado e já buscando `title` seguido de `author`, como no **Trocar capa**; o resultado com o `year` da nota vem destacado. A lista de fontes mostra só as que têm faixas (MusicBrainz e iTunes).

Ao escolher o álbum, o último passo mostra:

- **Edição**: no MusicBrainz, um menu com todas as edições oficiais do álbum, cada uma com data, país, formato, discos, número de faixas e a observação do MusicBrainz (`1997-05-21 · JP · CD · 12 faixas`, `1997 · XE · CD · 2 discos · 15 faixas`). A primeira, já selecionada, é a edição representativa (a mesma que a criação usa). Trocar de edição carrega as faixas dela; voltar a uma edição já vista não repete a consulta. No iTunes, a edição é o próprio álbum da loja, mostrada como texto.
- A lista de faixas como vai para a nota (discos separados, duração à direita), com o número de faixas e a duração total acima.
- **Atualizar faixas** (ou Mod+Enter), desativado enquanto a lista carrega ou quando a edição não tem faixas.

**Atualizar faixas** muda só a seção de faixas, com `vault.process`:

- Se a nota tem `## Faixas` (ou `## Tracks`, de uma nota criada com o Obsidian em inglês), a seção é substituída do título até o próximo título de nível 1 ou 2 (`#` ou `##`), ou até o fim da nota. Os `### Disco N` ficam dentro da seção.
- Sem essa seção, ela é criada logo antes de `## Impressões`, com uma linha em branco antes e depois.
- Sem `## Impressões`, a seção vai para o fim da nota.

O frontmatter (inclusive `tracks`), `## Impressões` e todo o resto da nota ficam como estavam, byte a byte. Títulos dentro de blocos de código não contam. Um aviso confirma a troca; se a gravação falha, um aviso diz que as faixas não foram atualizadas e o modal continua aberto.

### Terminei

Um clique num botão de 1 a 10 (ou uma tecla de 0 a 9) grava e fecha. O foco começa no grupo de botões, não no 1: Enter e espaço não dão nota sem querer. **Terminar sem nota** grava `status` e `finished` e deixa `rating` como estava. **Cancelar** e Esc não gravam nada.

### Teclado

| Tecla | Onde | O que faz |
|---|---|---|
| ↑↓ | busca | Move o destaque entre os resultados. |
| ↑↓←→ | temporadas | Move o destaque na grade. |
| Enter | busca | Busca na hora se o texto mudou; senão escolhe o resultado destacado. |
| Enter | temporadas | Escolhe a temporada destacada. |
| Mod+Enter (⌘↵ no macOS, Ctrl↵ no resto) | confirmação | **Criar nota**, **Atualizar capa** ou **Atualizar faixas**. |
| Tab, depois Enter ou espaço | confirmação (séries) | Escolhe **Pôster da temporada** ou **Pôster da série**. |
| 1–9, 0 | Terminei | Nota de 1 a 9; 0 vale 10. |
| Esc | qualquer passo | Fecha sem gravar. |

## Fontes

| Tipo | Fonte | Chave | O que traz |
|---|---|---|---|
| Filme | IMDb (sugestões da busca do site) | não | Título, ano, elenco e capa. Só filmes, telefilmes e curtas; séries, pessoas e franquias ficam de fora. |
| Série | TVmaze | não | Série com canal e anos; por temporada, episódios, ano de estreia e pôster (sem pôster, usa o da série). |
| Livro | Open Library | não | Uma obra por resultado: autores, ano da primeira publicação, páginas (mediana das edições) e capa. |
| Livro | Google Books | sim | Edições, inclusive brasileiras: autores, ano da edição, páginas e capa. |
| Jogo | IGDB | sim (app da Twitch) | Ano de lançamento, estúdio, plataformas e capa. |
| Álbum | MusicBrainz | não | Um resultado por álbum (o grupo de lançamentos, não cada edição): artista, ano do lançamento original e tipo. A capa vem do Cover Art Archive. Faixas com duração, da edição representativa ou da escolhida. |
| Álbum | iTunes | não | Artista, ano, número de faixas e capa 600×600. Faixas com duração, do álbum da loja. Também é a fonte da capa quando o Cover Art Archive não tem a do álbum. |

Cada busca traz no máximo 10 resultados. A fonte de livros que abre selecionada vem de **Fonte de livros**, nas configurações, e a de álbuns de **Fonte de álbuns**; trocar a fonte no modal também muda a opção do tipo.

### Álbuns

- **MusicBrainz** não pede chave, mas exige que cada cliente se identifique: o plugin manda o `User-Agent` `MediaCatalog/<versão> ( https://laerciorios.com )`, também para o Cover Art Archive. O limite é de uma requisição por segundo: o plugin espaça as buscas, e uma busca que ficou velha enquanto esperava (você continuou digitando) não chega a ser enviada. Uma resposta de limite (503) é repetida uma vez; se continuar, aparece como "está limitando as requisições".
- A busca aceita título, artista ou os dois: cada palavra precisa estar no título ou no artista, e vêm primeiro o texto inteiro como título ou como artista, depois a divisão em título + artista, depois os álbuns com mais edições.
- Só álbuns, e EPs com **Incluir EPs** ligado (o padrão). Singles nunca aparecem. Coletâneas, álbuns ao vivo, remixes, DJ mixes e demos ficam de fora, a menos que **Incluir coletâneas e álbuns ao vivo** esteja ligado. Trilhas sonoras, mixtapes, spoken word e gravações de campo aparecem sempre; audiolivros, radionovelas e entrevistas, nunca.
- O ano é o do primeiro lançamento do álbum, não o de uma reedição ou remasterização.
- **Cover Art Archive**: a capa de um resultado do MusicBrainz é `https://coverartarchive.org/release-group/<id>/front-500` (a miniatura, `front-250`). Nem todo álbum tem capa lá; por isso a consulta depois da escolha (passo 4 acima): um pedido ao Cover Art Archive (meio segundo quando não há capa, alguns segundos enquanto o Obsidian segue os redirecionamentos) e, sem capa, uma busca no iTunes. Cada um desiste depois de 10 segundos: sem resposta do Cover Art Archive, o resultado segue como veio da busca.
- **iTunes** não pede chave. O título vem sem o " - EP" ou " - Single" que o iTunes acrescenta, versões limpa e explícita do mesmo álbum aparecem uma vez, e o link da fonte vem sem os parâmetros de rastreamento. A loja consultada é a do país do idioma do Obsidian (português do Brasil: loja brasileira, que tem mais álbuns brasileiros); num idioma sem país, a loja padrão da Apple (EUA). A Apple documenta um limite de cerca de 20 chamadas por minuto: o plugin espaça as chamadas (a busca e a capa de reserva dividem o limite), e uma recusa (403 ou 429) aparece como limite de requisições. O ano pode ser o de uma reedição: confira no formulário.
- A capa de reserva do iTunes precisa do mesmo artista e do mesmo título (notas de edição como "(Deluxe Edition)" não contam), com o ano mais próximo. Num álbum homônimo, um ano com mais de um de diferença é recusado, porque a banda tem outros álbuns com o mesmo nome.

### Faixas e edições

As faixas são buscadas só depois da escolha do álbum, nunca na lista de resultados.

- **MusicBrainz**: um resultado é o álbum, e o álbum tem várias edições (lançamentos): a original, reedições, edições de luxo, de outros países. A lista de faixas vem de uma edição só, a **representativa**, escolhida nesta ordem: edições oficiais; com lista de faixas cadastrada; o ano mais antigo (sem data, por último); primeiro disco em CD ou digital (antes de vinil, fita…); a edição comum antes de uma especial (título ou observação com "deluxe", "bonus", "expanded", "anniversary", "remaster", "edition", "box" ou "collector's", ou um disco a mais, com mais faixas que a edição comum: dois LPs com as mesmas faixas do CD não contam); a data mais cedo dentro do ano (uma data completa ganha de uma parcial); país `XW` (mundial), EUA ou Reino Unido; e, se ainda empatar, a de menos faixas (mais faixas nesse ponto quase sempre são faixas bônus, como a faixa extra de uma edição japonesa). A data completa só decide dentro do ano do lançamento: assim o álbum original continua ganhando (um LP de 1969 antes de um CD de 1987), mas um vinil promocional lançado semanas antes não passa na frente do CD do mesmo ano. O **Atualizar faixas do álbum** lista as edições nessa mesma ordem. Discos de vídeo (DVD, Blu-ray) não entram na lista. São duas consultas ao MusicBrainz (a lista de edições e as faixas da escolhida), no mesmo limite de uma por segundo das buscas; uma busca nova não cancela a lista de faixas que está esperando a vez. O disco de cada faixa é a posição do disco na edição.
- **iTunes**: a lista vem do próprio álbum da loja (uma consulta, na loja do mesmo país da busca), só com as músicas: vídeos do álbum ficam de fora.
- Os títulos das faixas vêm como a fonte escreve, sem tradução. A duração é arredondada para o segundo mais próximo. Uma faixa sem duração na fonte aparece só com o título.
- Se a fonte não responde ou não tem faixas para o álbum, a nota é criada mesmo assim, sem a seção, e um aviso diz que a lista ficou indisponível. Depois, **Atualizar faixas do álbum** pode completá-la.

### Chaves de API

- **Google Books**: no console do Google Cloud, ative a Books API num projeto e crie uma chave de API. A chave é gratuita, e sem ela a API recusa todas as chamadas.
- **IGDB**: registre um app em [dev.twitch.tv](https://dev.twitch.tv/console/apps). O plugin usa o fluxo *client credentials*, então a URL de redirecionamento não importa (`http://localhost` serve). Guarde o client id e um client secret do app.

As chaves ficam no chaveiro do Obsidian (**Settings → Keychain**, **Chaveiro** em português), não no `data.json`. Crie um segredo para cada valor e ligue-o na linha correspondente de **Chaves de API**, nas configurações do plugin. O plugin guarda só o id do segredo e lê o valor na hora da requisição, então uma chave nova vale sem recarregar o plugin. O chaveiro é por dispositivo e não sincroniza: em outro dispositivo, crie os segredos com os mesmos ids.

Sem chave, a busca avisa que a fonte precisa de uma chave de API. Chave recusada e limite de requisições também têm mensagem própria, com **Tentar de novo**. A mensagem de chave recusada (respostas 401 e 403) só aparece para as fontes com chave, Google Books e IGDB; nas outras, o erro mostra o código da resposta.

## A nota criada

### Nome do arquivo

- Slug do título: minúsculas, sem acentos, cada sequência de caracteres que não são letras nem dígitos vira `-`, sem `-` nas pontas. "Samambaia: O Retorno" vira `samambaia-o-retorno`; um título sem letras nem dígitos vira `untitled`.
- Séries ganham a temporada com dois dígitos: `horta-selvagem-s02`.
- Se o nome já existe (e não é duplicata, como outro ano), entra o ano: `samambaia-o-retorno-2031`. Séries mantêm `-sNN` no fim: `horta-selvagem-2031-s01`.
- Se ainda assim existe, ou não há ano, entra um contador: `samambaia-o-retorno-2031-2`.
- Álbuns tentam o artista antes do ano: `mare-de-musgo`, depois `mare-de-musgo-lia-broto`, depois `mare-de-musgo-lia-broto-2019`, depois o contador (`mare-de-musgo-lia-broto-2019-2`). Num álbum homônimo (o slug do artista é igual ao do título), o artista é pulado: `os-samambaias`, depois `os-samambaias-2001`. Sem artista, é como nos outros tipos.

A nota fica na **Pasta do catálogo**, criada se não existir.

### Frontmatter

Cada tipo grava só as suas chaves, nesta ordem (álbuns podem ter também `tracks`, ver abaixo):

| `kind` | Chaves |
|---|---|
| `movie` | `kind, title, year, status, rating, started, finished, platform, cover, tags` |
| `series` | `kind, title, season, episodes, year, status, rating, started, finished, platform, cover, tags` |
| `game` | `kind, title, year, status, rating, started, finished, platform, hours, cover, tags` |
| `book` | `kind, title, author, year, status, rating, started, finished, platform, pages, reference, cover, tags` |
| `album` | `kind, title, author, year, status, rating, started, finished, platform, cover, tags` |

| Valor | Formato |
|---|---|
| `kind`, `status` | Sem aspas, sempre em inglês: `movie`, `series`, `game`, `book`, `album`; `backlog`, `in-progress`, `done`, `dropped`. |
| `title`, `author`, `platform`, `reference` | Sempre entre aspas duplas, `""` quando vazios. Vários autores ficam separados por vírgula. Em álbuns, `author` é o artista ou a banda. |
| `year`, `season`, `episodes`, `rating`, `hours`, `pages` | Número. Vazio vira `rating:` sem valor. |
| `started`, `finished` | `AAAA-MM-DD` sem aspas, ou vazio. |
| `cover` | URL `https://` sem aspas, `"[[<nota>-cover.<ext>]]"` quando baixada, `""` sem capa. |
| `tags` | `[entertainment]` |
| `tracks` | Só álbuns, só com **Propriedade com o número de faixas** ligada e a lista de faixas conhecida: o número de faixas (todos os discos), logo depois de `year`. |

Exemplo, com a série fictícia do dev-vault:

```yaml
---
kind: series
title: "Horta Selvagem"
season: 2
episodes: 10
year: 2025
status: in-progress
rating:
started: 2026-09-20
finished:
platform: "streaming"
cover: https://static.tvmaze.com/uploads/images/original_untouched/<id>.jpg
tags: [entertainment]
---
## Impressões

- TVmaze: https://www.tvmaze.com/shows/<id>
```

Um álbum, com a banda fictícia do dev-vault:

```yaml
---
kind: album
title: "Os Samambaias"
author: "Os Samambaias"
year: 1994
status: done
rating: 8
started: 2026-08-10
finished: 2026-08-11
platform: "vinil"
cover: https://coverartarchive.org/release-group/<id>/front-500
tags: [entertainment]
---
## Impressões

- MusicBrainz: https://musicbrainz.org/release-group/<id>
```

Com **Propriedade com o número de faixas** ligada, o mesmo álbum ganha `tracks: 12` entre `year: 1994` e `status: done`.

Álbuns não têm nota de referência nem campos de livro, série ou jogo.

### Corpo

O corpo vem do **Template** das configurações ou, com o campo vazio, de `media.md` na pasta do plugin Templates do Obsidian (no dev-vault, `_Templates/media.md`). Só o texto depois do frontmatter do template é usado: as propriedades são sempre as da tabela acima. As variáveis do plugin Templates são expandidas: `{{title}}` vira o nome do arquivo da nota (`horta-selvagem-s02`), e `{{date}}`, `{{time}}`, `{{date:FMT}}` e `{{time:FMT}}` usam os formatos configurados nele. Template inexistente: corpo vazio.

Em álbuns com lista de faixas, a seção `## Faixas` entra no corpo logo antes de `## Impressões` (ver [Lista de faixas](#lista-de-faixas)). Um template sem `## Impressões` recebe a seção no começo do corpo; um template que já tem `## Faixas` tem essa seção substituída pela lista.

Com **Link para a fonte** ligado, o corpo termina, depois de uma linha em branco, com a página da obra na fonte (sempre por último, depois da lista de faixas): `- IMDb: …`, `- TVmaze: …`, `- Open Library: …`, `- Google Books: …`, `- IGDB: …`, `- MusicBrainz: …` ou `- iTunes: …`. Um álbum do MusicBrainz com a capa do iTunes continua com a linha do MusicBrainz.

### Lista de faixas

Com **Incluir lista de faixas em álbuns** ligado (o padrão), a nota de um álbum ganha a lista de faixas antes de `## Impressões`. Cada faixa é um item numerado pela posição, com a duração em `m:ss` (ou `h:mm:ss`) depois de um travessão com espaços; sem duração, só o título. Uma linha em branco separa a seção das vizinhas.

```markdown
## Faixas

1. Broto de Samambaia — 3:12
2. Orvalho na Janela — 4:05
3. Musgo Azul

## Impressões
```

Com mais de um disco, cada disco ganha um `### Disco N`, e a numeração recomeça em cada um. `N` conta os discos em ordem, a partir de 1, mesmo quando a fonte pula um número (um DVD da edição que ficou de fora):

```markdown
## Faixas

### Disco 1

1. Estufa — 3:40
2. Raiz Funda — 5:02

### Disco 2

1. Estufa (demo) — 3:31

## Impressões
```

"Faixas" e "Disco" são texto da nota, escritos no idioma do Obsidian na hora da criação: em inglês, `## Tracks` e `### Disc N`. **Atualizar faixas do álbum** reconhece os dois. Um `#` no começo de uma palavra do título (`#Samambaia`) ganha uma barra invertida (`\#Samambaia`) para não virar tag do vault; `#1` fica como está.

### Capa baixada

**Baixar para os anexos** salva a imagem onde o Obsidian põe anexos novos (**Settings → Files and links**; no dev-vault, `Attachments/`), com o nome `<nota>-cover.<ext>`. A extensão vem do tipo da imagem (`jpg`, `png`, `webp` ou `gif`). Se o arquivo já existe, o Obsidian acrescenta um número, sem sobrescrever. A nota recebe `cover: "[[girassois-em-marte-cover.png]]"`. Se o download falha, um aviso aparece e a nota fica com a URL.

### Nota de referência (livro técnico)

Com **Livro técnico** ligado, o campo **Área** lista as pastas do vault que têm `_References/Books` (no dev-vault, `1 - Knowledge/Game Dev` e `1 - Knowledge/Software Development`). Sem nenhuma, o campo fica desativado com uma explicação. O plugin cria `<área>/_References/Books/<nota>.md`:

```markdown
---
title: "Refatorando Canteiros"
author: "Íris Capim"
year: 2020
done: false
source_url: "https://openlibrary.org/works/<id>"
tags: [reference, book]
---
[Refatorando Canteiros](https://openlibrary.org/works/<id>) — Íris Capim

Leitura: [[1 - Knowledge/Entertainment/DB/refatorando-canteiros|leitura]]

## Resumo


## Notas pessoais
```

A nota do catálogo recebe `reference: "[[1 - Knowledge/Software Development/_References/Books/refatorando-canteiros|referência]]"`. Os dois links usam o caminho completo, com os aliases `|referência` e `|leitura`. Sem URL da fonte, o título sai sem link; sem autor, sem o `— autor`. A nota do catálogo é criada primeiro, já com o link, e a nota de referência depois. Se a nota de referência já existe, ela é ligada como está. Se não puder ser criada, um aviso aparece e o `reference` da nota do catálogo volta a `""`. Se a nota do catálogo não puder ser criada, a nota de referência também não é.

## Configurações

| Opção | Padrão | O que faz |
|---|---|---|
| Pasta do catálogo | `1 - Knowledge/Entertainment/DB` | Onde as notas novas são criadas e onde as duplicatas são procuradas. Vazio volta ao padrão. |
| Template | vazio | Nota cujo corpo entra em cada nota nova. Vazio: `media.md` na pasta de templates do Obsidian. |
| Link para a fonte | ligado | Adiciona a linha `- <Fonte>: <link>` no fim da nota. |
| Status padrão | Em andamento | Status que o formulário sugere. |
| Baixar capas por padrão | desligado | Deixa **Baixar para os anexos** selecionado no formulário e no **Trocar capa**. |
| Fonte de livros | Open Library | Fonte selecionada primeiro na busca de livros. Trocar a fonte no modal também muda esta opção. |
| Fonte de álbuns | MusicBrainz | Fonte selecionada primeiro na busca de álbuns. Trocar a fonte no modal também muda esta opção. |
| Incluir EPs | ligado | A busca de álbuns também lista EPs. |
| Incluir coletâneas e álbuns ao vivo | desligado | O MusicBrainz também lista coletâneas, álbuns ao vivo, remixes, DJ mixes e demos. |
| Capas do iTunes | ligado | Álbum do MusicBrainz sem capa no Cover Art Archive: procura a capa no iTunes. Desligado, a nota sai sem capa. |
| Incluir lista de faixas em álbuns | ligado | A nota nova de um álbum ganha a seção `## Faixas`. Desligado, as faixas não são buscadas e a nota sai sem a seção. **Atualizar faixas do álbum** funciona com a opção ligada ou desligada. |
| Propriedade com o número de faixas | desligado | Grava `tracks: <número de faixas>` depois de `year` nas notas novas de álbuns, quando a lista é conhecida. **Atualizar faixas do álbum** não mexe nessa propriedade. |
| Client id do IGDB | vazio | Segredo com o client id do app da Twitch. |
| Client secret do IGDB | vazio | Segredo com o client secret do mesmo app. |
| Chave do Google Books | vazio | Segredo com a chave da Books API. |

O plugin também guarda no `data.json` o último tipo buscado (`lastKind`), para reabrir o modal nele.

## Rede e privacidade

É o único plugin do monorepo que acessa a rede. Toda requisição passa por `src/providers/http.ts`, com o `requestUrl` do Obsidian, e só é aceita com `https://` e para um host da lista fixa em `src/constants.ts`. Qualquer outro endereço é recusado com o erro "Requisição para <host> bloqueada".

| Uso | Hosts |
|---|---|
| APIs | `v3.sg.media-imdb.com`, `api.tvmaze.com`, `www.googleapis.com`, `openlibrary.org`, `covers.openlibrary.org`, `id.twitch.tv`, `api.igdb.com`, `musicbrainz.org`, `itunes.apple.com` |
| Imagens (mostrar e baixar capas) | `m.media-amazon.com`, `static.tvmaze.com`, `books.google.com`, `books.googleusercontent.com`, `images.igdb.com`, `covers.openlibrary.org`, `coverartarchive.org`, `archive.org` e qualquer host terminado em `.archive.org`, `is1-ssl.mzstatic.com` a `is5-ssl.mzstatic.com` |

- A rede só é usada quando um comando roda: busca, lista de temporadas, consulta da capa e da lista de faixas de um álbum escolhido, edições e faixas no **Atualizar faixas do álbum**, capas mostradas no modal e download de capa. Carregar o plugin não faz nenhuma requisição.
- O modal só mostra imagens `https://` dos hosts de imagem, sem enviar referrer. A exceção é a capa **Atual** do **Trocar capa**: ela é mostrada de onde a nota aponta (qualquer `https://`), só para exibir. Downloads continuam limitados aos hosts de imagem.
- A lista vale para cada endereço que o plugin pede. Os redirecionamentos, o Obsidian segue sozinho: o `requestUrl` roda no processo principal com `redirect: "follow"`, e um plugin não vê nem interrompe os saltos. O `<img>` também segue. Por isso os saltos não passam pela lista um a um. As cadeias conhecidas terminam em hosts da lista: as capas do Open Library redirecionam para `archive.org`, e as do Cover Art Archive para `archive.org` e depois para um servidor de armazenamento com nome variável (`ia800123.us.archive.org`, `dn720706.ca.archive.org`), aceito pelo sufixo `.archive.org`, que vale só para imagens. O plugin nunca pede uma URL tirada de um redirecionamento.
- Cada fonte recebe o texto da busca. Na consulta da capa de um álbum do MusicBrainz, o Cover Art Archive recebe o id do álbum e, sem capa lá, o iTunes recebe artista e título. Para as faixas, o MusicBrainz recebe o id do álbum e o da edição, e o iTunes o id do álbum na loja. O iTunes recebe também o país da loja, tirado do idioma do Obsidian. O MusicBrainz e o Cover Art Archive recebem o `User-Agent` com a versão do plugin e `https://laerciorios.com`. A chave do Google Books vai para `www.googleapis.com`; o client id e o client secret da Twitch vão para `id.twitch.tv`, que devolve o token usado em `api.igdb.com`.
- O token do IGDB fica só em memória: é renovado antes de expirar ou depois de um 401, e nunca é gravado.
- Sem telemetria.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**). Há inglês e português (Brasil). Outros idiomas usam inglês. Em inglês, os comandos são **Add to catalog**, **Change cover**, **Mark as finished** e **Update album tracks**.

Os valores gravados nas notas são dados e não são traduzidos: `kind` (o formulário mostra "Álbum" e grava `album`), `status` (o formulário mostra "Em andamento" e grava `in-progress`), `tags`, `tracks` e o texto da nota de referência (`Leitura:`, **Resumo**, **Notas pessoais** e os aliases `referência` e `leitura`). Nomes das fontes (IMDb, TVmaze, Open Library, Google Books, IGDB, MusicBrainz, iTunes, Cover Art Archive) e os títulos das faixas também ficam como estão. A exceção são os títulos da lista de faixas: `## Faixas` e `### Disco N` são escritos no idioma do Obsidian quando a nota é criada ou atualizada (`## Tracks` e `### Disc N` em inglês).

Um idioma novo é um arquivo novo em `src/i18n/`, com todas as chaves de `src/i18n/en.ts`, mais uma entrada em `src/i18n/index.ts`.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações, cria as fontes e registra os quatro comandos e a aba de configurações. |
| `src/constants.ts` | Tipos, status, ordem das chaves por tipo, pasta padrão, hosts permitidos e textos da nota de referência. |
| `src/providers/http.ts` | O único módulo que acessa a rede: `requestUrl`, só `https://`, só hosts da lista. |
| `src/providers/imdb.ts`, `tvmaze.ts`, `open-library.ts`, `google-books.ts`, `igdb.ts`, `musicbrainz.ts`, `itunes.ts` | Uma fonte por arquivo: monta a requisição e converte a resposta em resultados. O MusicBrainz também completa o resultado escolhido (`resolve`: capa no Cover Art Archive ou no iTunes). |
| `src/providers/guards.ts`, `results.ts`, `errors.ts` | Leitura defensiva do JSON, helpers comuns, erros e suas mensagens. |
| `src/modal/catalog-modal.ts` | Modal único com os passos busca → capa e faixas (álbuns) → temporada → confirmação, e busca → faixas no **Atualizar faixas do álbum**. Guarda o estado que sobrevive ao **Voltar**, inclusive os resultados já completados, as listas de faixas e as edições. |
| `src/modal/resolve-step.ts` | "Procurando capa e faixas…" entre a escolha e o formulário (capa e faixas ao mesmo tempo); descarta as respostas se você sair do passo ou fechar o modal. |
| `src/modal/tracks-step.ts` | Último passo do **Atualizar faixas do álbum**: edição, lista de faixas e a troca da seção com `vault.process`. |
| `src/modal/search-step.ts`, `search-state.ts`, `season-step.ts` | Busca com debounce, descartando respostas antigas; ano no fim da busca, ordem e destaque dos resultados; grade de temporadas. |
| `src/modal/confirm-step.ts`, `confirm-fields.ts`, `confirm-values.ts`, `text-fields.ts` | Formulário por tipo, validação, banner de duplicata e criação da nota. |
| `src/modal/chosen-preview.ts` | Capa grande e a escolha entre pôster da temporada e da série. |
| `src/modal/cover-step.ts`, `rating-modal.ts` | Último passo do **Trocar capa** (capa atual e nova); pergunta da nota do **Terminei**. |
| `src/catalog/note-writer.ts` | Cria a nota: pasta, nome livre, capa, nota de referência, corpo e um único `vault.create`. |
| `src/catalog/slug.ts`, `duplicates.ts` | Nome do arquivo; busca de duplicatas no cache de metadados, sem ler arquivos (álbuns comparam também o artista). |
| `src/catalog/frontmatter.ts`, `yaml.ts` | Chaves na ordem do tipo e YAML no estilo do catálogo. |
| `src/catalog/template.ts` | Corpo do template, variáveis, lista de faixas e linha da fonte. |
| `src/catalog/tracklist.ts` | Funções puras da lista de faixas: duração, resumo, texto da seção e onde ela entra na nota (`replaceTracklistSection`). |
| `src/catalog/cover-download.ts`, `reference-note.ts` | Download da capa para os anexos; nota de referência do livro técnico. |
| `src/catalog/updates.ts`, `catalog-note.ts` | **Trocar capa** e **Terminei** via `processFrontMatter`; leitura de uma nota do catálogo. |
| `src/ui/` | Peças do modal: card de resultado, capa com placeholder, capa atual da nota, botões de pôster, lista com teclado, estados de carregando, vazio e erro, linhas de formulário, lista de faixas e rótulo das edições. |
| `src/settings/` | Configurações declarativas do Obsidian 1.13, normalização do `data.json` e linhas de segredo com `SecretComponent`. |
| `src/i18n/` | Catálogos de texto da interface (inglês e português). |

Notas novas são criadas uma vez, com `vault.create`, e capas com `vault.createBinary`. Notas existentes só mudam por `processFrontMatter` (frontmatter) e, no **Atualizar faixas do álbum**, por `vault.process` (só a seção de faixas).

## Desenvolvimento

```bash
pnpm --filter media-catalog dev
```

Teste no `dev-vault/` do repositório: `1 - Knowledge/Entertainment/index.md` lista os casos de teste, e `DB/` tem duas notas fictícias por tipo (três álbuns: um homônimo com dois discos em `## Faixas`, um EP com `## Faixas` e `tracks`, e um sem `## Faixas`, para o **Atualizar faixas do álbum** criar a seção), com uma capa local em `Attachments/` e um livro técnico com nota de referência. A view `entertainment.base` mostra o catálogo em tabela e galeria, e os álbuns numa tabela própria.

As buscas dos testes usam obras reais, então as notas e capas criadas neles não podem ser commitadas. Antes do commit, apague o que sobrou em `DB/`, `Attachments/` e `_References/Books/` (`git status dev-vault` mostra).

Requer Obsidian 1.13.0 ou superior, por causa das configurações declarativas.

## Limitações

- Séries só por temporada: toda série passa pelo passo da temporada, e uma série sem temporadas no TVmaze não pode ser cadastrada.
- **Episódios** vem com o total da temporada. Para uma temporada em andamento, ajuste à mão.
- No Google Books, o ano é o da edição, não o da primeira publicação. Confira no formulário (a descrição do campo avisa).
- No **Adicionar ao catálogo**, um número de quatro dígitos no fim da busca, de 1870 até dois anos à frente, é lido como ano e não vai para a fonte. Um título que termina num número desses só aparece se a busca sem o número o trouxer (e então vem destacado).
- O IGDB não filtra o tipo de jogo: DLCs, expansões e edições aparecem junto.
- MusicBrainz: uma requisição por segundo. Numa sequência rápida de buscas, a resposta pode demorar um pouco mais.
- No iTunes, o ano pode ser o de uma reedição ou remasterização. **Incluir coletâneas e álbuns ao vivo** vale só para o MusicBrainz.
- A capa do iTunes para um álbum do MusicBrainz sem capa é achada por artista e título. Se o iTunes não tem o álbum, ou tem com outro nome, a nota sai sem capa; se tem mais de uma edição, a capa pode ser de outra edição.
- Os redirecionamentos não passam pela lista de hosts um a um (ver **Rede e privacidade**).
- Álbuns não guardam o tipo (álbum ou EP) na nota. O número de faixas só vai para a nota com **Propriedade com o número de faixas** ligada, na criação; **Atualizar faixas do álbum** não atualiza `tracks`.
- A lista de faixas de uma nota nova é a da edição representativa do MusicBrainz, que pode não ser a que você ouviu. Troque a edição com **Atualizar faixas do álbum**.
- **Atualizar faixas do álbum** substitui tudo entre `## Faixas` e o próximo título de nível 1 ou 2: um comentário seu escrito dentro da seção, sem título próprio, é substituído junto. Num template sem `## Impressões`, a seção vem no começo do corpo; se o texto seguinte do template não começar com um título `#` ou `##`, ele fica dentro da seção e seria trocado numa atualização.
- A seção é reescrita no idioma atual do Obsidian: uma nota com `## Tracks` passa a ter `## Faixas` quando atualizada em português.
- **Terminei**, **Trocar capa** e a limpeza do `reference` quando a nota de referência falha usam `processFrontMatter`, que reescreve o YAML no estilo do Obsidian: aspas e valores vazios podem mudar de formato. O Bases lê os dois.
- Só os tipos `movie`, `series`, `game`, `book` e `album`. Notas com outro `kind` não ativam **Trocar capa** nem **Terminei**; **Atualizar faixas do álbum** só aparece com `kind: album`.
- Sem ícone na ribbon: os comandos ficam na paleta (ou em atalhos definidos por você).
