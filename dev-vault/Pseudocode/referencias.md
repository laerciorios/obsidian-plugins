# Referências entre algoritmos

O `` `\autoref{alg:busca-linear}` `` diz "Algorithm 1", o `` `\ref{alg:busca-binaria}` `` diz só o número, como no LaTeX.

A busca linear está no `\autoref{alg:busca-linear}`; a binária, no Algoritmo `\ref{alg:busca-binaria}`, e a interpolada no `\autoref{alg:interpolada}`. Um rótulo que não existe aparece assim: `\autoref{alg:inexistente}`.

```pseudo
\begin{algorithm}
\caption{Busca linear}
\label{alg:busca-linear}
\begin{algorithmic}
\ForAll{$e \in L$}
    \If{$e = x$}
        \Return \TRUE
    \EndIf
\EndFor
\Return \FALSE
\end{algorithmic}
\end{algorithm}
```

Um bloco sem legenda não recebe número:

```pseudo
\begin{algorithmic}
\State $x \gets$ \Call{Ler}{}
\end{algorithmic}
```

```pseudo
\begin{algorithm}
\caption{Busca binária}
\label{alg:busca-binaria}
\begin{algorithmic}
\While{$l \le h$}
    \State $m \gets \lfloor (l + h) / 2 \rfloor$
    \If{$L[m] = x$}
        \Return $m$
    \ElsIf{$L[m] < x$}
        \State $l \gets m + 1$
    \Else
        \State $h \gets m - 1$
    \EndIf
\EndWhile
\Return $-1$
\end{algorithmic}
\end{algorithm}
```

O terceiro algoritmo está em algorithm2e e também entra na numeração:

```pseudo
\begin{algorithm}
\caption{Busca por interpolação}
\label{alg:interpolada}
\While{$L[l] \le x \le L[h]$}{
  $p \leftarrow l + \frac{(x - L[l])(h - l)}{L[h] - L[l]}$\;
  \lIf{$L[p] = x$}{\Return $p$}
}
\Return $-1$\;
\end{algorithm}
```

Fim da nota: role para cima e clique nas referências para voltar a cada bloco.
