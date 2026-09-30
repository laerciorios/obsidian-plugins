# Sintaxe algorithmic

Blocos na sintaxe do plugin Pseudocode da comunidade (pseudocode.js). Os algoritmos são exemplos clássicos, sem relação com notas reais.

## Com legenda, entrada e saída

```pseudo
\begin{algorithm}
\caption{InsertionSort}
\begin{algorithmic}
\Require Uma lista $A$ com $n$ elementos
\Ensure A lista $A$ em ordem crescente
\For{$j \gets 2$ \TO $n$}
    \State $chave \gets A[j]$
    \State $i \gets j - 1$
    \While{$i > 0$ \AND $A[i] > chave$}
        \State $A[i + 1] \gets A[i]$
        \State $i \gets i - 1$
    \EndWhile
    \State $A[i + 1] \gets chave$
\EndFor
\end{algorithmic}
\end{algorithm}
```

## Entrada e saída com Input/Output, retorno sem State

```pseudo
\begin{algorithm}
\caption{Euclides($a, b$)}
\begin{algorithmic}
\Input Dois inteiros $a \ge 0$ e $b \ge 0$
\Output O máximo divisor comum de $a$ e $b$, uma frase longa o bastante para quebrar a linha e mostrar o recuo pendurado das linhas de entrada e saída
\While{$b \neq 0$}
    \State $r \gets a \bmod b$
    \State $a \gets b$
    \State $b \gets r$
\EndWhile
\Return $a$
\end{algorithmic}
\end{algorithm}
```

## Procedimento, chamada e comentários

```pseudo
\begin{algorithm}
\caption{Fibonacci}
\begin{algorithmic}
\Procedure{Fib}{$n$}
    \If{$n \le 1$} \Comment{caso base}
        \State \Return $n$
    \Else
        \State $a \gets$ \Call{Fib}{$n - 1$}
        \State $b \gets$ \Call{Fib}{$n - 2$} \Comment{segunda chamada}
        \Return $a + b$
    \EndIf
\EndProcedure
\end{algorithmic}
\end{algorithm}
```

## Repeat, senão-se e comandos em maiúsculas

```pseudo
\begin{algorithm}
\caption{BubbleSort}
\begin{algorithmic}
\REQUIRE $A[1..n]$
\REPEAT
    \STATE $trocou \gets$ \FALSE
    \FOR{$i \gets 1$ \TO $n - 1$}
        \IF{$A[i] > A[i + 1]$}
            \STATE trocar $A[i]$ e $A[i + 1]$
            \STATE $trocou \gets$ \TRUE
        \ELSIF{$A[i] = A[i + 1]$}
            \STATE \textit{nada a fazer}
        \ELSE
            \CONTINUE
        \ENDIF
    \ENDFOR
\UNTIL{\NOT $trocou$}
\end{algorithmic}
\end{algorithm}
```

## Catálogo de construtos

```pseudo
\begin{algorithm}[H]
\caption{Catálogo de construtos}
\begin{algorithmic}[1]
\Function{Busca}{$L, x$}
    \ForAll{$e \in L$}
        \If{$e = x$}
            \Return \TRUE
        \EndIf
    \EndFor
    \Return \FALSE
\EndFunction
\Loop
    \State ler $c$
    \If{$c = 0$}
        \Break
    \EndIf
    \Print $c$
\EndLoop
\ForEach{$v \in V$}
    \State visitar $v$
\EndFor
\Statex linha sem número
\State \textbf{negrito}, \textit{itálico}, \texttt{mono}, \textsc{Versalete}, {\small pequeno} e {\Large grande}
\State escapes: 50\% de \$10, \{chaves\}, a\_b, \textbackslash{} e ``aspas''
\State primeira linha \\ segunda linha na mesma instrução
\end{algorithmic}
\end{algorithm}
```

## Sem ambiente algorithm (sem réguas nem legenda)

```pseudo
\begin{algorithmic}[0]
\State $x \gets 1$
\State $y \gets x + 1$ \Comment{sem numeração neste bloco}
\end{algorithmic}
```

## Sem legenda (não conta na numeração)

```pseudo
\begin{algorithm}
\begin{algorithmic}
\State $total \gets 0$
\ForAll{$p \in P$}
    \State $total \gets total + p.preço$
\EndFor
\end{algorithmic}
\end{algorithm}
```
