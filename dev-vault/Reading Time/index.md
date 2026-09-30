# Reading Time: casos de teste

Notas de teste nesta pasta. Todo o texto é fictício. Os tempos abaixo valem para as configurações padrão: 200 palavras por minuto, formato simples, "de leitura" no final e blocos de código ignorados.

| Nota | Palavras | Código | Barra de status |
|---|---|---|---|
| [[Reading Time/contagem\|contagem]] | 38 | 9 (ignoradas) | `11s de leitura` |
| [[Reading Time/longa\|longa]] | 1.200 | 0 | `6m de leitura` |
| [[Reading Time/com-propriedade\|com-propriedade]] | 400 | 0 | `2m de leitura` |
| [[Reading Time/sem-propriedade\|sem-propriedade]] | 200 | 0 | `1m de leitura` |
| [[Reading Time/curta\|curta]] | 1 | 0 | `1s de leitura` |
| [[Reading Time/vazia\|vazia]] | 0 | 0 | `0s de leitura` |

Na `contagem`, contam só as palavras que o leitor vê: o título, o texto, o texto dos links (`a nota curta`, `site`), o título e o corpo do callout e as tarefas. Não contam o frontmatter, a imagem incorporada, os dois comentários, a URL, o `[!tip]`, as caixas das tarefas e o `^fim`. O bloco `js` tem 5 palavras e o de matemática 4; o `mermaid` nunca conta.

## Preparação

- [ ] Na raiz do repo, `pnpm --filter reading-time dev`. Confira **Reading Time** ativo em Plugins da comunidade.

## Barra de status

- [ ] Abra cada nota da tabela: a barra mostra o tempo da última coluna.
- [ ] Passe o mouse sobre o tempo da `contagem`: a dica diz "38 palavras a 200 ppm · 9 palavras de código ignoradas".
- [ ] Digite uma frase na `curta`: o tempo muda meio segundo depois de parar de digitar.
- [ ] Alterne leitura e edição (Cmd+E): o tempo continua na barra.
- [ ] Abra [[Reading Time/quadro.canvas|quadro]] e [[Reading Time/leitura.base|leitura]]: o tempo some. Volte para uma nota: ele volta.
- [ ] Clique no explorador de arquivos com uma nota aberta: o tempo da nota continua na barra.

## Formatos

Em Configurações → Reading Time → Formato, com a `longa` aberta (a prévia mostra a nota ativa e uma nota de 1.000 palavras):

- [ ] Minutos: `6 min de leitura`.
- [ ] Compacto: `6m de leitura`.
- [ ] Simples: `6m de leitura`; na `contagem`, `11s de leitura`.
- [ ] Por extenso: `6 minutos de leitura`.
- [ ] Relógio: `6:00 de leitura`.
- [ ] Texto depois do tempo vazio: só `6m`.
- [ ] Modelo personalizado: aparece o campo Modelo, com `{simple} de leitura · {words} palavras`, e a barra mostra `6m de leitura · 1.200 palavras`.
- [ ] No modelo, digite `{palavras}`: aparece "Variável desconhecida: {palavras}.", o modelo não é salvo e a barra continua com o anterior.
- [ ] Mude a velocidade para 100: a `longa` passa a `12m de leitura` sem recarregar.
- [ ] Ligue "Ocultar em notas vazias" e abra a `vazia`: a barra fica vazia.

## Blocos de código

Com a `contagem` aberta:

- [ ] "Contar como texto": `14s de leitura`, e a dica diz 47 palavras.
- [ ] "Contar com velocidade própria" (100 ppm): `17s de leitura`, e a dica diz "38 palavras a 200 ppm · 9 palavras de código a 100 ppm".
- [ ] Ainda com velocidade própria, tire `mermaid` de "Sempre ignorar": o código passa a 13 palavras.

## Seleção

- [ ] Selecione a linha "A cooperativa fictícia…": a barra mostra `Seleção: 3s de leitura` (11 palavras).
- [ ] Com Alt/Option, selecione também "Fim do diário": as duas seleções somam.
- [ ] Clique sem selecionar: volta o tempo da nota.
- [ ] Desligue "Mostrar o tempo da seleção": selecionar não muda mais a barra.
- [ ] Rode **Mostrar tempo de leitura** com texto selecionado: o aviso mostra a nota e a seleção.

## Propriedade no frontmatter

- [ ] Com "Gravar nas notas" desligado, abra e saia da `com-propriedade`: o `reading_time: 99` continua.
- [ ] "Só notas que já têm a propriedade": abra a `com-propriedade` e depois outra nota. O valor vira `2`. A `sem-propriedade` não ganha a propriedade.
- [ ] "Todas as notas": abra a `sem-propriedade` e digite uma frase. Enquanto você digita, o frontmatter não muda. Ao sair da nota, ela ganha `reading_time: 2`.
- [ ] Coloque `Reading Time` em "Pastas ignoradas": nenhuma nota desta pasta é alterada automaticamente.
- [ ] **Atualizar a propriedade de tempo de leitura desta nota** grava na nota ativa mesmo com o modo desligado.
- [ ] **… em todas as notas**: o aviso diz quantas notas vão mudar antes de gravar; Cancelar não grava nada.
- [ ] Em [[Reading Time/leitura.base|leitura]], a coluna "Tempo de leitura (min)" ordena as notas da mais longa para a mais curta.

## Descarregar

- [ ] Desative o plugin: o tempo some da barra. Reative: ele volta.
