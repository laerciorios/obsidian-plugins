# Pseudocode: casos de teste

Notas de teste nesta pasta, com algoritmos clássicos e texto fictício. As configurações padrão numeram linhas e algoritmos, mostram "end if/end for" e usam `//` nos comentários.

| Nota | O que tem |
|---|---|
| [[Pseudocode/algorithmic\|algorithmic]] | Sintaxe do plugin da comunidade: legenda, entrada e saída, procedimento, comentários, maiúsculas, catálogo de construtos, bloco sem `algorithm` e bloco sem legenda |
| [[Pseudocode/algorithm2e\|algorithm2e]] | LaTeX do pacote `algorithm2e` colado no bloco: estilo do template, função com `\SetKwProg`, cadeia de condicionais, switch, begin e bloco sem ambiente |
| [[Pseudocode/erros\|erros]] | Um erro de propósito em cada bloco e um bloco vazio |
| [[Pseudocode/referencias\|referencias]] | `\label`, `\ref` e `\autoref` entre três algoritmos |

Teste de regressão fora do app: `pnpm --filter pseudocode regression` (este vault) ou `pnpm --filter pseudocode regression <vault>`.

## Preparação

- [ ] Na raiz do repo, `pnpm --filter pseudocode dev`. Confira **Pseudocode** ativo em Plugins da comunidade (o plugin Pseudocode da comunidade não pode estar ativo junto: os dois usam o bloco `pseudo`).

## Sintaxe algorithmic

- [ ] Em [[Pseudocode/algorithmic|algorithmic]], os blocos com legenda mostram "Algorithm 1" a "Algorithm 5", com réguas acima, abaixo e sob a legenda. O bloco sem legenda não tem número nem legenda.
- [ ] As linhas são numeradas; `Require:`/`Input:` ficam sem número, e a frase longa do Euclides quebra com recuo pendurado.
- [ ] No Fibonacci, "caso base" fica à direita da linha do `if`, e `\State \Return $n$` é uma linha só ("return n").
- [ ] O BubbleSort (tudo em maiúsculas) renderiza como os outros, com `else if`, `continue` e `until not trocou`.
- [ ] No catálogo, `[1]` numera as linhas e `\Statex` fica sem número; negrito, itálico, mono, versalete, tamanhos, escapes e aspas “aspas” aparecem certos.
- [ ] O bloco com `[0]` não tem números, mesmo com a numeração ligada.
- [ ] Clicar num bloco no live preview abre o código dele.

## Sintaxe algorithm2e

- [ ] Em [[Pseudocode/algorithm2e|algorithm2e]], a legenda é "Algorithm 1: Troca", com `;` no fim das instruções, `input:`/`output:` sem número e linhas verticais (`\SetAlgoLined`) com "end" no fim dos blocos.
- [ ] Na Potência rápida, o cabeçalho é "Function Pot(b, e):" com o nome em versalete, `\lIf` fica numa linha só e "metade do expoente" fica à direita.
- [ ] O Classifica (`\SetAlgoVlined`) tem linhas verticais sem "end"; o switch mostra "case zero do" e "otherwise do".
- [ ] O último bloco, sem ambiente e com `\DontPrintSemicolon`, não tem réguas nem `;`, e a linha com `\nonl` fica sem número.

## Erros

- [ ] Em [[Pseudocode/erros|erros]], cada bloco mostra "Erro no pseudocódigo", a mensagem com a linha ("esperava \EndIf, encontrou \EndFor", "comando desconhecido \Stat"...) e o código com a linha do erro marcada.
- [ ] O bloco vazio mostra "Bloco de pseudocódigo vazio." e o parágrafo final aparece normalmente.

## Configurações

Em Configurações → Pseudocode, com [[Pseudocode/algorithmic|algorithmic]] aberta ao lado:

- [ ] "Numerar algoritmos" desligado: as legendas mostram "Algorithm InsertionSort".
- [ ] "Numerar linhas" desligado: os números somem (exceto no catálogo, que tem `[1]`); "Depois do número da linha" some das opções.
- [ ] Recuo 3: os blocos se afastam; um valor fora de 0,5–4 mostra o erro e não é salvo.
- [ ] "Linhas de escopo" e "Fim de bloco" mudam os blocos na hora.
- [ ] Delimitador de comentário `▷`: os comentários passam a `▷ caso base`.
- [ ] "Idioma do pseudocódigo" em Português: "se ... então", "para ... faça", "enquanto", "retorne", "Requer:", "Algoritmo 1"; o texto escrito no bloco não muda.
- [ ] Tema escuro: réguas, números e comentários continuam legíveis.

## Referências

- [ ] Em [[Pseudocode/referencias|referencias]], no modo de leitura e no live preview, as referências mostram "Algorithm 1", "2" e "Algorithm 3"; a inexistente mostra `??` em vermelho, com dica.
- [ ] Clicar numa referência leva ao bloco; no live preview, com o cursor dentro do código, aparece `\ref{...}`.
- [ ] Inclua um bloco com legenda antes do primeiro: as legendas e as referências passam a 2, 3 e 4.

## Exportação e editor

- [ ] Passe o mouse num bloco: o botão "Copiar como LaTeX" aparece no canto inferior direito; clicar copia o ambiente `algorithm` em algorithm2e e mostra o aviso.
- [ ] Com o cursor num bloco, **Copiar o bloco de pseudocódigo como LaTeX** faz o mesmo; fora de um bloco, avisa. Num bloco com erro, avisa que precisa corrigir.
- [ ] Com "Documento completo" ligado, o texto copiado começa com `\documentclass` e o `\usepackage[...]{algorithm2e}`.
- [ ] **Inserir bloco de pseudocódigo** e **Inserir bloco de pseudocódigo (algorithm2e)** inserem o esqueleto com o cursor em `\caption{}`.
- [ ] Num bloco algorithmic, digite `\Fo`: aparecem `\For{}` e `\ForAll{}`; escolher `\For{}` insere `\EndFor` embaixo. Num bloco algorithm2e, `\If` sugere `\If{}{}`, e `\Input` aparece quando o bloco tem `\SetKwInOut{Input}`. Fora de blocos `pseudo` e dentro de `$...$`, nada é sugerido.
