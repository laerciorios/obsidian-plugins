# Reading Time

Tempo estimado de leitura da nota aberta na barra de status, como `4m 12s de leitura`. Com texto selecionado no editor, mostra o tempo da seleção. Opcionalmente grava o tempo em minutos numa propriedade do frontmatter, para filtrar e ordenar em Bases.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/reading-time-spec.md`.

## O que conta

O tempo sai das palavras que o leitor vê, divididas pela velocidade de leitura.

| Conteúdo | Tratamento |
|---|---|
| Frontmatter | não conta |
| Blocos de código (```` ``` ```` e `~~~`, inclusive `pseudo`) e de matemática (`$$`) | conforme a opção **Blocos de código e de matemática**: ignorar (padrão), contar como texto ou contar com velocidade própria |
| Blocos `mermaid`, `base`, `query`, `dataview` e `dataviewjs` | nunca contam (lista editável em **Sempre ignorar**) |
| Comentários `%% %%` e `<!-- -->` | não contam |
| Notas e imagens incorporadas (`![[…]]`, `![](…)`) | não contam |
| Links `[[nota\|apelido]]` e `[texto](url)` | contam pelo texto visível |
| URLs soltas, tags HTML, `[!tipo]` de callout, caixas de tarefa, notas de rodapé e `^ids` | não contam |
| Marcadores (`#`, `-`, `>`, `\|`, `==`, `**`) | não contam |

Palavra é uma sequência de letras ou números. Hífen, apóstrofo e sublinhado no meio não separam (`guarda-chuva`, `snake_case`), e ponto ou vírgula entre dígitos também não (`1.714`). Em chinês e japonês, cada ideograma conta como uma palavra.

Por isso os números ficam menores que os do Reading Time da comunidade, que conta o markdown cru, e também não batem exatamente com a contagem de palavras do Obsidian.

## Barra de status

- Atualiza ao trocar de nota, ao alternar leitura e edição, meio segundo depois de parar de digitar e quando o sync altera a nota aberta.
- Passando o mouse, a dica mostra as palavras e a velocidade, e as palavras de código contadas ou ignoradas.
- Some em canvas, PDF, Bases e abas vazias. Com o foco numa barra lateral (explorador, busca), continua mostrando a última nota.
- **No celular não há barra de status.** Lá, use o comando **Mostrar tempo de leitura**.

## Comandos

| Comando | O que faz |
|---|---|
| Mostrar tempo de leitura | Aviso com o tempo e os detalhes da nota e, se houver, da seleção. |
| Atualizar a propriedade de tempo de leitura desta nota | Grava a propriedade na nota ativa, mesmo com a gravação desligada e fora das pastas ignoradas. |
| Atualizar a propriedade de tempo de leitura em todas as notas | Verifica as notas, diz quantas vão mudar e só grava depois da confirmação. |

## Configurações

| Opção | Padrão | O que faz |
|---|---|---|
| Velocidade de leitura | 200 | Palavras por minuto. |
| Formato | Simples | Minutos (`10 min`), Compacto (`10m`), Simples (`10m 4s`), Por extenso (`10 minutos 4 segundos`), Relógio (`10:04`) ou Modelo personalizado. |
| Texto depois do tempo | `de leitura` | Vazio mostra só o tempo. Não vale para o modelo personalizado. |
| Modelo | `{simple} de leitura · {words} palavras` | Só no formato personalizado. Variáveis na tabela abaixo. |
| Prévia | — | O resultado para a nota ativa e para uma nota de 1.000 palavras. |
| Ocultar em notas vazias | desligado | Sem palavras para ler, a barra fica vazia. |
| Blocos de código e de matemática | Ignorar | Ignorar, contar como texto ou contar com velocidade própria. |
| Velocidade de leitura de código | 100 | Palavras por minuto no código, no modo "velocidade própria". |
| Sempre ignorar | `mermaid, base, query, dataview, dataviewjs` | Linguagens que nunca contam, mesmo contando o código. |
| Mostrar o tempo da seleção | ligado | Com texto selecionado no editor, a barra mostra `Seleção: …`. |
| Gravar nas notas | Desligado | Veja a próxima seção. |
| Nome da propriedade | `reading_time` | Renomear não altera as notas que têm o nome antigo. |
| Pastas ignoradas | — | Uma por linha. Notas nelas nunca são gravadas automaticamente nem pela atualização em massa. |
| Atualizar todas as notas agora | — | O mesmo que o comando. |

Variáveis do modelo personalizado:

| Variável | Exemplo |
|---|---|
| `{minutes}` | `11` (minutos inteiros, arredondados para cima) |
| `{compact}` | `10m` |
| `{simple}` | `10m 4s` |
| `{verbose}` | `10 minutos 4 segundos` |
| `{clock}` | `10:04` |
| `{words}` | `2.013` (palavras contadas, inclusive as de código quando contam) |
| `{wpm}` | `200` |

Com uma variável desconhecida, o campo mostra o erro e o modelo não é salvo.

O texto depois do tempo e o modelo são criados no idioma do Obsidian no primeiro uso e ficam salvos: trocar o idioma depois não os traduz.

## Propriedade no frontmatter

Com **Gravar nas notas** ligado, o plugin grava o tempo em minutos inteiros, arredondados para cima, como número: `reading_time: 5`. Em Bases dá para filtrar (`reading_time > 10`) e ordenar.

| Modo | Quais notas |
|---|---|
| Desligado | Nenhuma, só pelos comandos. |
| Só notas que já têm a propriedade | As que já têm `reading_time` no frontmatter, mesmo vazio. Serve para escolher nota a nota. |
| Todas as notas | Todas fora das pastas ignoradas. |

Quando grava:

- A nota aberta é gravada **quando você sai dela** (outra nota, outra aba ou fechar), nunca enquanto digita. Assim o frontmatter não pula no meio da edição.
- Notas alteradas sem estar abertas (sync, outros plugins) são gravadas assim que o Obsidian relê a nota.
- Só grava quando o valor muda. O frontmatter não conta como palavra, então gravar a propriedade não muda o valor.
- Notas que nunca mudam e nunca são abertas ficam sem a propriedade até rodar **… em todas as notas**.
- Desenhos do Excalidraw (`excalidraw-plugin` no frontmatter) são pulados.
- Ao gravar, o Obsidian reescreve o frontmatter no formato dele: `tags: [a, b]`, por exemplo, vira uma lista com um item por linha. Os valores não mudam.

Para o Bases tratar a propriedade como número, defina o tipo dela como **Número** uma vez, no painel de propriedades de qualquer nota.

Se o vault sincroniza entre aparelhos, use a mesma versão do plugin em todos: versões com regras de contagem diferentes gravariam valores diferentes, e cada aparelho reescreveria o valor do outro.

## Substituindo o plugin da comunidade

O Reading Time da comunidade tem outro id (`obsidian-reading-time`), então os dois podem ficar instalados, mas mostrariam dois tempos na barra.

1. Desative o Reading Time da comunidade no vault.
2. Rode `pnpm link-plugin reading-time <vault>` e ative este plugin.
3. Depois de conferir, desinstale o da comunidade.

As configurações dele não são importadas: 200 palavras por minuto e o formato simples já são os padrões daqui, e o `read` vira `de leitura`.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**), com inglês e português (Brasil). Outros idiomas usam inglês. Os nomes das variáveis do modelo e da propriedade são os mesmos em todos os idiomas.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações e registra a barra, a gravação da propriedade, os comandos e a aba. |
| `src/count/segments.ts` | Divide a nota em texto, código e o que nunca conta, com as posições no texto original (para medir a seleção). |
| `src/count/prose.ts` | Reduz o markdown ao texto visível: links, embeds, URLs, HTML, callouts. |
| `src/count/words.ts` | Conta palavras. |
| `src/estimate.ts` | Palavras e velocidades → segundos. |
| `src/format/` | Os cinco formatos e o modelo personalizado. |
| `src/tracker.ts` | Acompanha a nota ativa e a seleção e atualiza a barra. |
| `src/editor/selection.ts` | Extensão do CodeMirror que avisa quando a seleção muda. |
| `src/property/` | Gravação da propriedade e a atualização em massa. |
| `src/settings/` | Configurações declarativas (Obsidian 1.13+). |

Testado no `dev-vault` pelo checklist `Reading Time/index.md`.
