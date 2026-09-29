# Media Catalog

Cadastra filmes, séries (uma nota por temporada), jogos e livros no catálogo de entretenimento. O plugin busca título, ano e capa numa fonte online, você confere os dados num formulário e a nota é criada na pasta do catálogo, com o corpo do template `media`. Também troca a capa de notas que já existem e marca uma obra como terminada.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/media-catalog-spec.md`.

## Como usar

| Comando | Quando aparece | O que faz |
|---|---|---|
| **Adicionar ao catálogo** | sempre | Busca uma obra e cria uma nota nova. |
| **Trocar capa** | com uma nota do catálogo aberta | Busca a mesma obra e troca só a propriedade `cover`. |
| **Terminei** | com uma nota do catálogo aberta | Pede uma nota de 1 a 10 e grava `status: done`, `finished` com a data de hoje e `rating`. |

Uma nota é do catálogo quando o frontmatter tem `kind` igual a `movie`, `series`, `game` ou `book`, em qualquer pasta.

### Adicionar ao catálogo

1. **Tipo**: Filme, Série, Jogo ou Livro. O modal abre no último tipo usado, com o foco na busca. Para livros aparece também **Fonte** (Open Library ou Google Books); a fonte escolhida fica salva para a próxima vez.
2. **Busca**: com 2 caracteres ou mais, a busca roda sozinha depois de uma pausa na digitação. Enter busca na hora. Espaços a mais no começo ou no fim não refazem a busca. Um ano no fim (`samambaia 2031` ou `samambaia (2031)`) não vai para a fonte: a busca é por `samambaia`, e o primeiro resultado de 2031 vem destacado. Um resultado com o título inteiro (um título que termina num número, como `Samambaia 2031`) tem preferência.
3. **Resultado**: cada card mostra capa, título, ano, uma linha de detalhe (elenco, canal e anos, autores ou estúdio) e a fonte. O primeiro (ou o do ano pedido) vem destacado, mas **nada é escolhido sozinho**, nem quando a busca devolve um resultado só: escolha com Enter ou com um clique.
4. **Temporada** (só séries): grade com pôster, número de episódios e ano de cada temporada.
5. **Confirmar**: o formulário vem preenchido com o resultado, e a capa aparece grande ao lado do título. Quando a temporada tem pôster próprio, diferente do da série, dois botões abaixo dos dados escolhem entre **Pôster da temporada** (o padrão) e **Pôster da série**; a capa grande e a nota seguem a escolha. **Criar nota** cria e abre a nota. **Voltar** retorna ao passo anterior sem perder a busca.

O formulário tem **Título**, **Ano**, **Status**, **Início**, **Fim**, **Nota**, **Onde** e **Capa**, mais os campos do tipo: **Temporada** (só leitura) e **Episódios** em séries, **Horas** em jogos (**Onde** sugere as plataformas do jogo), **Autor**, **Páginas** e **Livro técnico** em livros. **Início** vem com a data de hoje, exceto com o status **Na fila**; se a data foi preenchida pelo formulário e você muda para **Na fila**, o campo volta a ficar vazio (uma data digitada por você fica). **Nota** aparece com **Concluído** ou **Abandonado**, e **Fim** só com **Concluído**, já com a data de hoje. Em resultados do Google Books, a descrição de **Ano** lembra que o ano é o da edição. Os campos são validados ao sair deles e ao salvar: ano com 4 dígitos, datas `AAAA-MM-DD`, nota inteira de 1 a 10, episódios, páginas e horas com zero ou mais.

Em **Capa**, **Manter o link** grava a URL da imagem, e **Baixar para os anexos** salva uma cópia no vault. Sem capa na fonte, o formulário avisa e a nota sai sem capa.

### Duplicatas

Na confirmação, o plugin procura na pasta do catálogo (subpastas incluídas) uma nota do mesmo `kind`, com o mesmo título (ignorando acentos, maiúsculas e pontuação) e, em séries, a mesma `season`. Se as duas notas têm ano e os anos são diferentes, não é duplicata: dois filmes com o mesmo título e anos diferentes são duas notas. Em livros o ano não conta, porque o Open Library traz o ano da primeira publicação e o Google Books o da edição: o mesmo livro com outro ano é duplicata. Quando acha, o formulário mostra "Já está no catálogo: <nota>" com **Abrir nota**, e **Criar nota** fica desativado. A busca se repete enquanto você edita título e ano, e de novo ao salvar.

### Trocar capa

O modal abre com o tipo da nota travado e o `title` da nota já buscado. Os resultados sem capa vão para o fim da lista, e o primeiro com o `year` da nota vem destacado (em séries, só na temporada 1: nas outras, o ano da nota é o da temporada). Em séries, a temporada da nota vem destacada.

O último passo mostra lado a lado a capa **Atual** da nota e a **Nova**, o campo **Capa** (link ou download) e **Atualizar capa**. A atual pode ser uma URL `https://` de qualquer site, um link `[[arquivo]]` ou o nome de uma imagem do vault; sem capa, aparece o ícone de imagem ausente. Em séries, a escolha entre o pôster da temporada e o da série aparece como na criação. Com **Manter o link** e a mesma URL que a nota já tem, **Atualizar capa** fica desativado e o modal avisa que a nota já usa essa capa. Só `cover` muda na nota.

### Terminei

Um clique num botão de 1 a 10 (ou uma tecla de 0 a 9) grava e fecha. O foco começa no grupo de botões, não no 1: Enter e espaço não dão nota sem querer. **Terminar sem nota** grava `status` e `finished` e deixa `rating` como estava. **Cancelar** e Esc não gravam nada.

### Teclado

| Tecla | Onde | O que faz |
|---|---|---|
| ↑↓ | busca | Move o destaque entre os resultados. |
| ↑↓←→ | temporadas | Move o destaque na grade. |
| Enter | busca | Busca na hora se o texto mudou; senão escolhe o resultado destacado. |
| Enter | temporadas | Escolhe a temporada destacada. |
| Mod+Enter (⌘↵ no macOS, Ctrl↵ no resto) | confirmação | **Criar nota** ou **Atualizar capa**. |
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

Cada busca traz no máximo 10 resultados. A fonte de livros que abre selecionada vem de **Fonte de livros**, nas configurações, e trocar a fonte no modal também muda essa opção.

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

A nota fica na **Pasta do catálogo**, criada se não existir.

### Frontmatter

Cada tipo grava só as suas chaves, nesta ordem:

| `kind` | Chaves |
|---|---|
| `movie` | `kind, title, year, status, rating, started, finished, platform, cover, tags` |
| `series` | `kind, title, season, episodes, year, status, rating, started, finished, platform, cover, tags` |
| `game` | `kind, title, year, status, rating, started, finished, platform, hours, cover, tags` |
| `book` | `kind, title, author, year, status, rating, started, finished, platform, pages, reference, cover, tags` |

| Valor | Formato |
|---|---|
| `kind`, `status` | Sem aspas, sempre em inglês: `movie`, `series`, `game`, `book`; `backlog`, `in-progress`, `done`, `dropped`. |
| `title`, `author`, `platform`, `reference` | Sempre entre aspas duplas, `""` quando vazios. Vários autores ficam separados por vírgula. |
| `year`, `season`, `episodes`, `rating`, `hours`, `pages` | Número. Vazio vira `rating:` sem valor. |
| `started`, `finished` | `AAAA-MM-DD` sem aspas, ou vazio. |
| `cover` | URL `https://` sem aspas, `"[[<nota>-cover.<ext>]]"` quando baixada, `""` sem capa. |
| `tags` | `[entertainment]` |

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

### Corpo

O corpo vem do **Template** das configurações ou, com o campo vazio, de `media.md` na pasta do plugin Templates do Obsidian (no dev-vault, `_Templates/media.md`). Só o texto depois do frontmatter do template é usado: as propriedades são sempre as da tabela acima. As variáveis do plugin Templates são expandidas: `{{title}}` vira o nome do arquivo da nota (`horta-selvagem-s02`), e `{{date}}`, `{{time}}`, `{{date:FMT}}` e `{{time:FMT}}` usam os formatos configurados nele. Template inexistente: corpo vazio.

Com **Link para a fonte** ligado, o corpo termina, depois de uma linha em branco, com a página da obra na fonte: `- IMDb: …`, `- TVmaze: …`, `- Open Library: …`, `- Google Books: …` ou `- IGDB: …`.

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
| Client id do IGDB | vazio | Segredo com o client id do app da Twitch. |
| Client secret do IGDB | vazio | Segredo com o client secret do mesmo app. |
| Chave do Google Books | vazio | Segredo com a chave da Books API. |

O plugin também guarda no `data.json` o último tipo buscado (`lastKind`), para reabrir o modal nele.

## Rede e privacidade

É o único plugin do monorepo que acessa a rede. Toda requisição passa por `src/providers/http.ts`, com o `requestUrl` do Obsidian, e só é aceita com `https://` e para um host da lista fixa em `src/constants.ts`. Qualquer outro endereço é recusado com o erro "Requisição para <host> bloqueada".

| Uso | Hosts |
|---|---|
| APIs | `v3.sg.media-imdb.com`, `api.tvmaze.com`, `www.googleapis.com`, `openlibrary.org`, `covers.openlibrary.org`, `id.twitch.tv`, `api.igdb.com` |
| Imagens (mostrar e baixar capas) | `m.media-amazon.com`, `static.tvmaze.com`, `books.google.com`, `books.googleusercontent.com`, `images.igdb.com`, `covers.openlibrary.org` |

- A rede só é usada quando um comando roda: busca, lista de temporadas, capas mostradas no modal e download de capa. Carregar o plugin não faz nenhuma requisição.
- O modal só mostra imagens `https://` dos hosts de imagem, sem enviar referrer. A exceção é a capa **Atual** do **Trocar capa**: ela é mostrada de onde a nota aponta (qualquer `https://`), só para exibir. Downloads continuam limitados aos hosts de imagem.
- A lista vale para o endereço pedido. As capas do Open Library respondem com um redirecionamento para `archive.org`, que o Obsidian segue (tanto na imagem quanto no download).
- Cada fonte recebe o texto da busca. A chave do Google Books vai para `www.googleapis.com`; o client id e o client secret da Twitch vão para `id.twitch.tv`, que devolve o token usado em `api.igdb.com`.
- O token do IGDB fica só em memória: é renovado antes de expirar ou depois de um 401, e nunca é gravado.
- Sem telemetria.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**). Há inglês e português (Brasil). Outros idiomas usam inglês. Em inglês, os comandos são **Add to catalog**, **Change cover** e **Mark as finished**.

Os valores gravados nas notas são dados e não são traduzidos: `kind`, `status` (o formulário mostra "Em andamento" e grava `in-progress`), `tags` e o texto da nota de referência (`Leitura:`, **Resumo**, **Notas pessoais** e os aliases `referência` e `leitura`). Nomes das fontes (IMDb, TVmaze, Open Library, Google Books, IGDB) também ficam como estão.

Um idioma novo é um arquivo novo em `src/i18n/`, com todas as chaves de `src/i18n/en.ts`, mais uma entrada em `src/i18n/index.ts`.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações, cria as fontes e registra os três comandos e a aba de configurações. |
| `src/constants.ts` | Tipos, status, ordem das chaves por tipo, pasta padrão, hosts permitidos e textos da nota de referência. |
| `src/providers/http.ts` | O único módulo que acessa a rede: `requestUrl`, só `https://`, só hosts da lista. |
| `src/providers/imdb.ts`, `tvmaze.ts`, `open-library.ts`, `google-books.ts`, `igdb.ts` | Uma fonte por arquivo: monta a requisição e converte a resposta em resultados. |
| `src/providers/guards.ts`, `results.ts`, `errors.ts` | Leitura defensiva do JSON, helpers comuns, erros e suas mensagens. |
| `src/modal/catalog-modal.ts` | Modal único com os passos busca → temporada → confirmação. Guarda o estado que sobrevive ao **Voltar**. |
| `src/modal/search-step.ts`, `search-state.ts`, `season-step.ts` | Busca com debounce, descartando respostas antigas; ano no fim da busca, ordem e destaque dos resultados; grade de temporadas. |
| `src/modal/confirm-step.ts`, `confirm-fields.ts`, `confirm-values.ts`, `text-fields.ts` | Formulário por tipo, validação, banner de duplicata e criação da nota. |
| `src/modal/chosen-preview.ts` | Capa grande e a escolha entre pôster da temporada e da série. |
| `src/modal/cover-step.ts`, `rating-modal.ts` | Último passo do **Trocar capa** (capa atual e nova); pergunta da nota do **Terminei**. |
| `src/catalog/note-writer.ts` | Cria a nota: pasta, nome livre, capa, nota de referência, corpo e um único `vault.create`. |
| `src/catalog/slug.ts`, `duplicates.ts` | Nome do arquivo; busca de duplicatas no cache de metadados, sem ler arquivos. |
| `src/catalog/frontmatter.ts`, `yaml.ts` | Chaves na ordem do tipo e YAML no estilo do catálogo. |
| `src/catalog/template.ts` | Corpo do template, variáveis e linha da fonte. |
| `src/catalog/cover-download.ts`, `reference-note.ts` | Download da capa para os anexos; nota de referência do livro técnico. |
| `src/catalog/updates.ts`, `catalog-note.ts` | **Trocar capa** e **Terminei** via `processFrontMatter`; leitura de uma nota do catálogo. |
| `src/ui/` | Peças do modal: card de resultado, capa com placeholder, capa atual da nota, botões de pôster, lista com teclado, estados de carregando, vazio e erro, linhas de formulário. |
| `src/settings/` | Configurações declarativas do Obsidian 1.13, normalização do `data.json` e linhas de segredo com `SecretComponent`. |
| `src/i18n/` | Catálogos de texto da interface (inglês e português). |

Notas novas são criadas uma vez, com `vault.create`, e capas com `vault.createBinary`. Notas existentes só mudam por `processFrontMatter`.

## Desenvolvimento

```bash
pnpm --filter media-catalog dev
```

Teste no `dev-vault/` do repositório: `1 - Knowledge/Entertainment/index.md` lista os casos de teste, e `DB/` tem duas notas fictícias por tipo, com uma capa local em `Attachments/` e um livro técnico com nota de referência. A view `entertainment.base` mostra o catálogo em tabela e galeria.

As buscas dos testes usam obras reais, então as notas e capas criadas neles não podem ser commitadas. Antes do commit, apague o que sobrou em `DB/`, `Attachments/` e `_References/Books/` (`git status dev-vault` mostra).

Requer Obsidian 1.13.0 ou superior, por causa das configurações declarativas.

## Limitações

- Séries só por temporada: toda série passa pelo passo da temporada, e uma série sem temporadas no TVmaze não pode ser cadastrada.
- **Episódios** vem com o total da temporada. Para uma temporada em andamento, ajuste à mão.
- No Google Books, o ano é o da edição, não o da primeira publicação. Confira no formulário (a descrição do campo avisa).
- No **Adicionar ao catálogo**, um número de quatro dígitos no fim da busca, de 1870 até dois anos à frente, é lido como ano e não vai para a fonte. Um título que termina num número desses só aparece se a busca sem o número o trouxer (e então vem destacado).
- O IGDB não filtra o tipo de jogo: DLCs, expansões e edições aparecem junto.
- **Terminei**, **Trocar capa** e a limpeza do `reference` quando a nota de referência falha usam `processFrontMatter`, que reescreve o YAML no estilo do Obsidian: aspas e valores vazios podem mudar de formato. O Bases lê os dois.
- Só os tipos `movie`, `series`, `game` e `book`. Notas com outro `kind` não ativam **Trocar capa** nem **Terminei**.
- Sem ícone na ribbon: os comandos ficam na paleta (ou em atalhos definidos por você).
