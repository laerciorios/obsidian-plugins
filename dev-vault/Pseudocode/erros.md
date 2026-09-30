# Blocos com erro

Cada bloco abaixo tem um erro de propósito. O plugin mostra a mensagem com a linha do problema e o código-fonte, com a linha marcada, e o resto da nota continua normal.

## Falta o \EndIf

```pseudo
\begin{algorithm}
\caption{Sem fim}
\begin{algorithmic}
\If{$x > 0$}
    \State $y \gets 1$
\EndFor
\end{algorithmic}
\end{algorithm}
```

## Comando desconhecido

```pseudo
\begin{algorithm}
\begin{algorithmic}
\State $x \gets 1$
\Stat $y \gets 2$
\end{algorithmic}
\end{algorithm}
```

## Fórmula sem fechamento

```pseudo
\begin{algorithmic}
\State $x \gets 1
\end{algorithmic}
```

## Ambiente desconhecido

```pseudo
\begin{algorithm}
\begin{itemize}
\end{itemize}
\end{algorithm}
```

## algorithm2e sem a chave de fechamento

```pseudo
\begin{algorithm}
\While{$x > 0$}{
  $x \leftarrow x - 1$\;
\end{algorithm}
```

## algorithm2e com comando ainda não suportado

```pseudo
\SetKwIF{Se}{SenaoSe}{Senao}{se}{então}{senão se}{senão}{fim}
\Se{$x$}{$y$\;}
```

## Bloco vazio

```pseudo
```

Este parágrafo depois dos erros continua aparecendo normalmente.
