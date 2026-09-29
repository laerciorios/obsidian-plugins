# Colored Text: casos de teste

Teste em [[Colored Text/playground|playground]]. Todo o texto é fictício.

A sintaxe é o realce do Obsidian com um marcador de cor: `=={vermelho}texto==`, ou `=={#e03131}texto==` com qualquer hex.

## Preparação

- [ ] Na raiz do repo, `pnpm --filter colored-text dev`. Confira **Colored Text** ativo em Plugins da comunidade.
- [ ] Em Configurações → Colored Text aparecem as 10 cores, de `vermelho-escuro` a `roxo`, cada nome na própria cor. Os nomes seguem o idioma do Obsidian no primeiro uso: em inglês eles vêm como `red`, `yellow` etc., e o playground precisa ser ajustado.

## Visualização

- [ ] Em Live Preview, `=={vermelho}goes==` aparece em vermelho, sem `{vermelho}` e sem `==`.
- [ ] Com o cursor dentro, aparecem os `==`, o `{vermelho}` apagado e o texto ainda colorido.
- [ ] `=={amarelo}…==` tem fundo amarelo translúcido; as outras cores do playground coloram só o texto.
- [ ] O hex avulso `=={#e03131}…==` colore sem estar na paleta.
- [ ] `{Vermelho}`, com maiúscula, vale o mesmo que `{vermelho}`.
- [ ] Negrito, itálico e link dentro da cor ficam coloridos.
- [ ] O realce comum continua amarelo. Nome desconhecido e marcador vazio mostram o marcador. Código inline e bloco de código não colorem.
- [ ] Tarefa, item de lista, citação, callout, tabela e título aparecem coloridos.
- [ ] No modo de leitura (Cmd+E), tudo acima aparece igual, e o span antigo continua vermelho.
- [ ] No modo fonte, o marcador aparece apagado e o texto colorido.

## Comandos

- [ ] Selecione uma frase e rode **Colorir seleção com a última cor**: a frase vira `=={vermelho}…==` e continua selecionada.
- [ ] Com a frase ainda selecionada, rode **Escolher cor** e tecle `8`: a cor vira `azul`, sem realce dentro de realce.
- [ ] Cursor numa palavra, sem seleção: o comando colore só a palavra.
- [ ] Cursor numa linha vazia: o comando insere `=={vermelho}==` com o cursor dentro, e o que for digitado já sai colorido.
- [ ] Seleção com espaços nas pontas: os espaços ficam fora dos `==`.
- [ ] Selecione as três linhas da lista e colora: cada item vira `- =={cor}lista um==`, com o `- ` fora.
- [ ] Selecione a linha `| um | dois |` e colora: cada célula ganha a cor e a tabela não quebra.
- [ ] No seletor, digite `#12b886`: aparece "Usar #12b886", e Enter aplica o hex.
- [ ] No seletor, digite `ver`: ficam só as cores com "ver" no nome.
- [ ] **Remover cor** com o cursor num texto colorido deixa só o texto. Funciona também no span antigo e no realce comum.
- [ ] Cmd+Z desfaz cada comando num passo só.
- [ ] Clique direito: "Colorir com vermelho", "Escolher cor" e, sobre texto colorido, "Remover cor".
- [ ] Cada cor tem o comando "Colorir com …". Defina um atalho para um deles em Configurações → Atalhos e teste.

## Configurações

- [ ] Troque o hex de `vermelho` para `#e8590c` no campo de texto: as notas abertas mudam em menos de um segundo e o seletor de cor acompanha.
- [ ] Escolha uma cor no seletor nativo: o campo hex acompanha.
- [ ] Hex inválido, como `#12`: aparece a mensagem de erro e a cor salva não muda.
- [ ] Renomeie `verde` para `correto`: `=={verde}…==` perde a cor e mostra o marcador, e o comando vira "Colorir com correto".
- [ ] Nome vazio, repetido, começando com `#` ou com `{`: aparece o erro e nada é salvo.
- [ ] Troque o estilo de uma cor para "Cor do realce": o texto ganha fundo.
- [ ] Adicione, arraste e remova uma cor: a lista e os comandos acompanham.
- [ ] Desligue "Mostrar no menu de contexto": os itens somem do clique direito.
- [ ] Reinicie o Obsidian: as cores e a última cor usada continuam salvas.
