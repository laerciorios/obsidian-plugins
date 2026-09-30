# Sintaxe algorithm2e

Blocos escritos como no LaTeX do pacote `algorithm2e`, colados direto num bloco `pseudo`. Sem `\begin{algorithmic}`, o plugin lê o bloco como algorithm2e.

## Estilo do template (linhas de escopo e "end")

```pseudo
\begin{algorithm}
\caption{Troca}
\SetAlgoLined
\SetKwInOut{Input}{input}
\SetKwInOut{Output}{output}
\Input{Duas variáveis $x$ e $y$}
\Output{O valor de $x$ fica em $y$ e vice-versa}
  $ aux \leftarrow x $\;
  $ x \leftarrow y $\;
  $ y \leftarrow aux $\;
\end{algorithm}
```

## Laço e retorno

```pseudo
\begin{algorithm}
\caption{Produto}
\SetAlgoLined
\SetKwInOut{Input}{input}
\SetKwInOut{Output}{output}
\Input{Um conjunto de valores $V$}
\Output{O produto dos valores de $V$}
 $prod \leftarrow 1$ \;
 \For{\textbf{each} $v \in V$}{
  $prod \leftarrow prod \cdot v$ \;
 }
 \textbf{return} $prod$\;
\end{algorithm}
```

## Função, condicionais e comentários

```pseudo
\begin{algorithm}
\caption{Potência rápida}
\label{alg:potencia}
\SetKwProg{Fn}{Function}{:}{end}
\SetKwFunction{FPot}{Pot}
\SetKwData{Res}{res}
\KwIn{base $b$ e expoente $e \ge 0$}
\KwOut{$b^e$}
\Fn{\FPot{$b, e$}}{
  \lIf{$e = 0$}{\Return $1$}
  $h \leftarrow$ \FPot{$b, \lfloor e/2 \rfloor$}\tcp*{metade do expoente}
  \eIf{$e$ é par}{
    \Res $\leftarrow h \cdot h$\;
  }{
    \Res $\leftarrow b \cdot h \cdot h$\;
  }
  \tcp{fim da recursão}
  \Return \Res\;
}
\end{algorithm}
```

## Cadeia de condicionais, repeat, switch e begin

```pseudo
\begin{algorithm}
\caption{Classifica}
\SetAlgoVlined
\LinesNumbered
\uIf{$n < 0$}{
  $c \leftarrow$ negativo\;
}
\uElseIf{$n = 0$}{
  $c \leftarrow$ zero\;
}
\Else{
  $c \leftarrow$ positivo\;
}
\Repeat{$i \geq n$}{
  $i \leftarrow i + 1$\;
}
\Switch{$c$}{
  \Case{zero}{mostrar ``nulo''\;}
  \Other{mostrar $c$\;}
}
\BlankLine
\Begin{
  \ForEach{$d \in D$}{processar $d$\;}
  \While{$k > 0$}{$k \leftarrow k - 1$\;}
  \lFor{$i \leftarrow 1$ \KwTo $3$}{tocar}
}
\tcc{comentário de bloco}
\end{algorithm}
```

## Sem ponto e vírgula e sem ambiente

```pseudo
\DontPrintSemicolon
\SetAlgoNoLine
$x \leftarrow 0$\;
\While{$x < 10$}{
  $x \leftarrow x + 2$\;
}
\nonl linha sem número\;
```
