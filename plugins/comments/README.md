# Comments

Comentários em trechos de uma nota, no estilo do Google Docs: você seleciona um trecho, comenta, responde e resolve, e o texto da nota continua limpo. As conversas ficam num arquivo markdown legível por nota, que dá para ler e editar sem o plugin. Uma IA também consegue ler e responder nele.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/comments-spec.md`.

## Como usar

1. Selecione um trecho no editor e use **Comentar seleção** (paleta de comandos ou botão direito → **Comentar**). Sem seleção, o comentário vale para o bloco inteiro onde está o cursor.
2. Escreva o comentário e clique em **Comentar** (ou `⌘+Enter` / `Ctrl+Enter`).
3. O painel **Comentários** abre na barra lateral direita com a conversa nova. Ele mostra as conversas da nota ativa na ordem em que aparecem no texto.

No painel:

- Clicar na citação leva ao trecho: no modo de edição, ele fica selecionado; no modo de leitura, o bloco pisca.
- **Responder** abre uma caixa de texto (`⌘+Enter` envia, `Esc` cancela). **Resolver** tira a conversa do painel, mas ela continua no arquivo; **Reabrir** traz de volta.
- **Só abertos** (ligado por padrão) esconde as resolvidas. Desligado, elas aparecem esmaecidas.
- O ícone de arquivo abre o arquivo de comentários da nota numa aba nova.
- Uma conversa cujo bloco foi apagado da nota aparece no fim, com o selo **Trecho apagado**.

No editor, os trechos com conversa aberta ficam destacados. No Live Preview, a âncora `^c-xxxx` vira um ícone de comentário, e clicar nele abre a conversa no painel. Com o cursor na linha, a âncora volta a aparecer como texto, para poder ser editada.

A barra de status mostra quantas conversas abertas a nota ativa tem (`3 comentários`); clicar abre o painel.

## Onde fica cada coisa

### A âncora na nota

Cada conversa se prende a um bloco da nota por um block id do Obsidian, `^c-xxxx`, que não aparece no modo de leitura e sobrevive a edições no bloco. A âncora vai no bloco onde a seleção começa:

| Bloco | Onde entra a âncora |
|---|---|
| Parágrafo | No fim da última linha: `… do responsável. ^c-a20o` |
| Item de lista | No fim do item (depois das linhas que o continuam) |
| Título, tabela, bloco de código, matemática, citação e callout | Numa linha própria logo depois do bloco, com uma linha em branco antes e outra depois |
| Frontmatter | Não aceita comentário |

Se o bloco já tem um `^id` (de um link de bloco que você criou antes), ele é reaproveitado. Em títulos, a âncora fica na linha de baixo porque um `^id` no fim do título entra no texto dele no outline e nos links.

Cada bloco tem **uma conversa**. Comentar de novo o mesmo bloco acrescenta uma mensagem à conversa (com a citação do trecho novo, quando é outro) e reabre a conversa se ela estava resolvida.

A âncora entra pelo editor, então `⌘+Z` a desfaz. A conversa continua no arquivo e passa a aparecer como **Trecho apagado**.

### O arquivo de comentários

Um arquivo por nota em `Attachments/Comments/` (a pasta é configurável), com o nome da nota em minúsculas e com hífens. Se duas notas têm o mesmo nome (vários `index.md`), a segunda ganha o nome da pasta-mãe (`beta-index.md`) ou um número.

```markdown
---
note: "[[Work/Acme/ata-kickoff|ata-kickoff]]"
---
## [[Work/Acme/ata-kickoff#^c-4f2a|c-4f2a]]
status: open

> Precisamos fechar o orçamento até sexta.

### eu · 2026-09-29 14:30
Quem aprova o orçamento?

### ia · 2026-09-29 14:35
Pela ata, a Joana.
```

- O vínculo com a nota é a propriedade `note`, não o nome do arquivo. Ao renomear ou mover a nota, o Obsidian atualiza esse link (com **Atualizar links internos automaticamente** ligado, o padrão) e as conversas continuam ligadas a ela. O arquivo de comentários mantém o nome antigo.
- Cada `##` é uma conversa. O título é um link para o bloco, então o arquivo funciona sem o plugin (clicar leva ao trecho) e a nota ganha o arquivo nos links inversos.
- `status: open` ou `status: resolved`.
- A citação (`>`) é o trecho selecionado quando a conversa começou.
- Cada `###` é uma mensagem: `autor · AAAA-MM-DD HH:mm`, seguido do texto em markdown. Uma mensagem pode começar com uma citação própria (`>`), quando comenta outro trecho do mesmo bloco.
- Linhas do texto que começariam um título (`# …`) são gravadas como `\# …`, para não quebrar a estrutura. O markdown mostra o `#` normalmente.

As palavras do formato (`note`, `status`, `open`, `resolved`) são as mesmas em todos os idiomas.

O plugin só muda o trecho que precisa (a seção da conversa, a linha de status), então o que você escreve à mão no arquivo continua lá. A leitura é tolerante: aceita `## c-4f2a` sem link, `### ia` sem data e autor em negrito.

### Para a IA

Para responder um comentário, basta acrescentar uma mensagem no fim da seção da conversa:

```markdown
### ia · 2026-09-29 14:35
A resposta, em markdown.
```

O painel atualiza sozinho quando o arquivo muda. Autores `ia` ou `ai` aparecem com o selo **IA**. Para abrir uma conversa nova, a IA põe `^c-xxxx` no bloco da nota (seguindo a tabela acima) e acrescenta uma seção `## [[<caminho da nota>#^c-xxxx|c-xxxx]]` com `status: open`.

## Comandos

| Comando | O que faz |
|---|---|
| Comentar seleção | Abre a caixa de comentário para a seleção (ou para o bloco do cursor). |
| Abrir comentários | Abre o painel na barra lateral direita. Também no ícone da faixa lateral. |
| Abrir o arquivo de comentários desta nota | Abre o arquivo markdown das conversas da nota ativa. |

## Configurações

| Opção | Padrão | O que faz |
|---|---|---|
| Pasta dos comentários | `Attachments/Comments` | Onde ficam os arquivos. Mudar a pasta não move os arquivos existentes: o plugin passa a ler só a pasta nova. |
| Seu nome nos comentários | `eu` | Autor gravado nos seus comentários e respostas. Criado no idioma do Obsidian no primeiro uso e salvo, como dado. |
| Destacar trechos comentados | ligado | Destaque no editor e o ícone no lugar da âncora no Live Preview. |
| Contador na barra de status | ligado | `N comentários` abertos na nota ativa. |

## Limitações

- No Live Preview, callouts, tabelas e blocos de matemática aparecem renderizados, então o destaque não aparece dentro deles; só o ícone da âncora.
- Uma conversa por bloco.
- Não dá para comentar no modo de leitura, só no editor.
- O painel não apaga conversas. Para tirar uma de vez, edite o arquivo de comentários.
- No celular não há barra de status; use o painel.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**), com inglês e português (Brasil). Outros idiomas usam inglês. O formato do arquivo de comentários não muda com o idioma.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações e registra a view, o armazenamento, o editor, os comandos e a aba. |
| `src/model/format.ts` | Lê e grava o arquivo de comentários, com edições pontuais por seção. Sem depender do `obsidian`. |
| `src/anchor/blocks.ts` | Acha o bloco da seleção e onde entra o `^id`. |
| `src/anchor/locate.ts` | Acha cada âncora e a citação no texto da nota (destaque, navegação, órfãs). |
| `src/store/store.ts` | Índice nota → arquivo de comentários pelo `note:`; relê o arquivo quando ele muda. |
| `src/actions.ts` | Comentar, responder, resolver e ir para o trecho. |
| `src/ui/` | Painel, card da conversa, caixa de comentário, barra de status e menu do editor. |
| `src/editor/decorations.ts` | Extensão do CodeMirror: destaque e ícone da âncora. |
| `src/settings/` | Configurações declarativas (Obsidian 1.13+). |

Testado no `dev-vault` pelo checklist `Comments/index.md`.
