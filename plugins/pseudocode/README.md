# Pseudocode

Renderiza pseudocódigo no estilo LaTeX dentro de blocos ` ```pseudo `: legenda numerada, linhas numeradas, palavras-chave em negrito e matemática pelo MathJax do próprio Obsidian. Aceita duas sintaxes no mesmo bloco: a do plugin **Pseudocode** da comunidade (pseudocode.js, parecida com `algorithmicx`) e a do pacote **algorithm2e**, para colar direto o que foi escrito no Overleaf. Exporta qualquer bloco para LaTeX `algorithm2e`.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/pseudocode-spec.md` (decisões no card `_Tasks/2026-09-30-pseudocode.md`).

## Trocar o plugin da comunidade

O id é `pseudocode`, diferente do `pseudocode-in-obs` da comunidade, então os dois podem ficar instalados, mas **não ativos juntos**: ambos registram o bloco `pseudo`.

1. Em Configurações → Plugins da comunidade, desative **Pseudocode** (Yaotian Liu).
2. Na raiz do repo: `pnpm --filter pseudocode build` e `pnpm link-plugin pseudocode ~/Documents/Obsidian/laerciorios`.
3. Ative **Pseudocode** (Laercio Rios). As notas não mudam; só a renderização.

O teste de regressão (abaixo) renderizou os 41 blocos atuais do vault com os dois plugins: a estrutura é a mesma em todos. Diferenças que aparecem:

| Plugin da comunidade | Este plugin |
|---|---|
| Legenda "Algorithm Swap", sem número | "Algorithm 1 Swap": algoritmos numerados na ordem da nota (opção **Numerar algoritmos**) |
| Linhas sem número | Linhas numeradas (opção **Numerar linhas**), como pede a convenção da disciplina |
| Fundo branco e texto preto fixos | Cores do tema, claro ou escuro |
| Erro mostra só a mensagem | Mensagem traduzida com a linha e o código-fonte do bloco, com a linha marcada |
| `` ``x'' `` vira ‘‘x'' | “x”, como no LaTeX |
| `\State \Return x` vira uma linha vazia e "return x" | Uma linha só, como no `algorithmicx` |
| Botão exporta para `algpseudocodex` | Botão e comando exportam para `algorithm2e` |

## Sintaxe algorithmic (a do plugin da comunidade)

Um bloco com `\begin{algorithmic}` usa esta sintaxe. Comandos sem diferenciar maiúsculas (`\STATE` = `\State`).

| Comando | Resultado |
|---|---|
| `\begin{algorithm}` + `\caption{Nome}` + `\label{alg:x}` | Réguas e legenda "Algorithm N Nome"; `[H]` e outras posições são aceitas |
| `\begin{algorithmic}[1]` / `[0]` | Numera (ou não) as linhas deste bloco, por cima da configuração; `[n]` numera de n em n |
| `\Require`, `\Ensure`, `\Input`, `\Output` | Linhas sem número, com recuo pendurado |
| `\State`, `\Statex` | Instrução; `\Statex` fica sem número |
| `\Return`, `\Print`, `\Break`, `\Continue` | Palavra-chave + texto (com ou sem `\State` antes) |
| `\If{c}` … `\ElsIf{c}` … `\Else` … `\EndIf` | `\ElseIf` e `\Elif` também valem |
| `\For{c}`, `\ForAll{c}`, `\ForEach{c}` … `\EndFor` | |
| `\While{c}` … `\EndWhile`, `\Loop` … `\EndLoop`, `\Repeat` … `\Until{c}` | |
| `\Procedure{Nome}{args}` … `\EndProcedure`, `\Function` … `\EndFunction` | Nome em versalete |
| `\Call{Nome}{args}` | "Nome(args)" em versalete |
| `\Comment{texto}` | À direita da linha corrente, depois do delimitador |
| `\AND`, `\OR`, `\NOT`, `\TRUE`, `\FALSE`, `\TO`, `\DOWNTO` | Palavras-chave no meio do texto |
| `\textbf`, `\textit`, `\texttt`, `\textsc`, `\emph`..., `{\small ...}`, `{\bfseries ...}` | Fontes e tamanhos |
| `$...$`, `$$...$$`, `\(...\)`, `\[...\]` | Matemática (MathJax) |
| `\{`, `\}`, `\$`, `\%`, `\_`, `\\`, `~` | Escapes, quebra de linha e espaço |

## Sintaxe algorithm2e

Um bloco **sem** `\begin{algorithmic}` é lido como `algorithm2e`, com ou sem `\begin{algorithm}` em volta.

- Instruções terminam com `\;` e mostram o `;`, como no PDF (exceto com `\DontPrintSemicolon`). Os corpos vão entre chaves.
- Condicionais: `\If{c}{...}`, `\eIf{c}{...}{...}`, `\uIf` + `\uElseIf`/`\ElseIf` + `\Else`, e as de uma linha `\lIf`, `\leIf`, `\lElse`, `\lElseIf`.
- Laços: `\For`, `\ForEach`, `\ForAll`, `\While`, `\Repeat{cond}{...}`, e `\lFor`, `\lForEach`, `\lForAll`, `\lWhile`, `\lRepeat`.
- `\Switch{c}{...}` com `\Case`, `\uCase`, `\lCase`, `\Other`; `\Begin{...}`; `\BlankLine`; `\nonl` (linha sem número).
- `\Return`, `\KwRet`, `\KwTo`; entradas `\KwIn`, `\KwOut`, `\KwData`, `\KwResult`.
- Comentários: `\tcp{...}` e `\tcc{...}` em linha própria; `\tcp*{...}` e `\tcc*{...}` à direita da instrução.
- Definições: `\SetKwInOut`, `\SetKwInput`, `\SetKw`, `\SetKwData`, `\SetKwFunction`, `\SetKwProg`, `\SetKwBlock`, `\SetKwFor`, `\SetKwRepeat`.
- Estilo do bloco, por cima das configurações: `\SetAlgoLined` (linhas verticais e "end"), `\SetAlgoVlined` (linhas sem "end"), `\SetAlgoNoLine`, `\SetAlgoNoEnd`, `\SetAlgoLongEnd` ("end if"), `\LinesNumbered`, `\LinesNotNumbered`. Os outros `\Set...` de aparência são ignorados.
- Ainda não suportados (geram erro): `\SetKwIF`, `\SetKwSwitch`, `\Indp`/`\Indm`, `\nl`/`\lnl`.

Aqui a legenda fica "Algorithm 1: Nome" e o fim de bloco é "end", como o algorithm2e imprime.

## Numeração e referências

Só algoritmos com `\caption` recebem número, na ordem em que aparecem na nota, nas duas sintaxes. Incluir ou tirar um bloco renumera os outros.

Para citar um algoritmo, dê um `\label{alg:x}` a ele e escreva no texto, como código inline:

- `` `\ref{alg:x}` `` → o número ("3");
- `` `\autoref{alg:x}` `` → "Algorithm 3" (ou "Algoritmo 3" com o pseudocódigo em português).

A referência vira um link para o bloco, no modo de leitura e no live preview (com o cursor dentro dela aparece o código). Rótulo que não existe na nota aparece como `??`, em vermelho.

## Exportar para LaTeX

O botão **Copiar como LaTeX** (canto inferior direito do bloco, ao passar o mouse) e o comando **Copiar o bloco de pseudocódigo como LaTeX** copiam o bloco em `algorithm2e`. `\Require`/`\Input` viram `\Input` e `\Ensure`/`\Output` viram `\Output`, declarados com `\SetKwInOut{Input}{input}`, como no template da disciplina. Blocos já em algorithm2e mantêm as definições `\SetKw...` e as diretivas de estilo.

Com **Documento completo**, a cópia é um documento compilável, com `\usepackage[...]{algorithm2e}` e as opções tiradas das configurações (`linesnumbered`, `lined`/`vlined`/`noline`, `noend`, e `portuguese` com o pseudocódigo em português).

## Comandos

| Comando | O que faz |
|---|---|
| Inserir bloco de pseudocódigo | Esqueleto do template (legenda, `\Require`, `\Ensure`, `\State`), com o cursor na legenda |
| Inserir bloco de pseudocódigo (algorithm2e) | O mesmo esqueleto em algorithm2e |
| Copiar o bloco de pseudocódigo como LaTeX | Exporta o bloco sob o cursor |

Dentro de um bloco `pseudo`, digitar `\` e letras sugere os comandos da sintaxe do bloco (e os que ele define com `\SetKw...`). Os que abrem um bloco já inserem o fechamento: `\EndFor` na linha de baixo, ou as chaves no algorithm2e. Dentro de `$...$` e fora de blocos `pseudo`, nada é sugerido.

## Configurações

| Opção | Padrão | O que faz |
|---|---|---|
| Numerar algoritmos | ligado | "Algorithm 1", "Algorithm 2"... na ordem da nota. Desligado, a legenda fica como no plugin da comunidade. |
| Numerar linhas | ligado | Um bloco muda com `[0]`/`[1]` ou `\LinesNumbered`. |
| Depois do número da linha | `:` | |
| Recuo | 1,2 em | De 0,5 a 4. |
| Linhas de escopo | desligado | Linhas verticais ao longo dos corpos. |
| Fim de bloco | ligado | "end if", "end for"... |
| Delimitador de comentário | `//` | Por exemplo `▷`. |
| Idioma do pseudocódigo | English | Português: "se ... então", "para ... faça", "retorne", "Requer:", "Algoritmo 1". Não segue o idioma do app: é conteúdo do algoritmo. O que está escrito no bloco nunca muda. |
| Documento completo | desligado | Exportação com preâmbulo. |

## Teste de regressão

```bash
pnpm --filter pseudocode regression ~/Documents/Obsidian/laerciorios
```

Só lê as notas: renderiza cada bloco `pseudo` com este plugin e com o pseudocode.js (devDependency, a mesma biblioteca do plugin da comunidade) e compara linha a linha. Sem caminho, usa o `dev-vault`. As diferenças intencionais da tabela acima são normalizadas; `--verbose` lista cada bloco.

## Desenvolvimento

```bash
pnpm --filter pseudocode dev
```

Casos de teste em `dev-vault/Pseudocode/`. O parser (`src/syntax/`), o layout das linhas (`src/render/lines.ts`) e a exportação (`src/export/latex.ts`) não dependem do Obsidian. Todo texto da interface passa por `t()` de `src/i18n/`; as palavras-chave dos algoritmos ficam em `src/render/keywords.ts`.
