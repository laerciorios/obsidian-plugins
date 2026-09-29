# Colored Text

Cores sobre o realce nativo do Obsidian. Em vez de `<span style="color:…">`, a nota guarda o realce `==texto==` com o nome de uma cor na frente: `=={vermelho}texto==`. A paleta, em hexadecimal, fica nas configurações do plugin.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/colored-text-spec.md`.

## Sintaxe

```markdown
=={vermelho}texto em vermelho==
=={#e03131}qualquer hex, sem estar na paleta==
==realce comum, continua amarelo==
```

- O nome vem da paleta e ignora maiúsculas e acentos: `{Vermelho}` e `{vermelho}` são a mesma cor.
- Um hex avulso, com 3 ou 6 dígitos, colore o texto.
- Em Live Preview o `{vermelho}` some junto com os `==`, e reaparece apagado quando o cursor entra no realce. No modo fonte ele aparece sempre, apagado.
- Nome desconhecido não colore: o realce fica amarelo e o `{nome}` fica visível, o que ajuda a achar uma cor renomeada.
- Sem o plugin, a nota continua legível: vira um realce comum com `{vermelho}` no começo.

Funciona em parágrafos, listas, tarefas, citações, callouts, tabelas e títulos, no Live Preview, no modo fonte e no modo de leitura. Não colore dentro de código nem no frontmatter.

## Comandos

| Comando | O que faz |
|---|---|
| Colorir seleção com a última cor | Aplica a última cor usada. Na primeira vez, a primeira cor da paleta. |
| Escolher cor | Abre o seletor. Com a busca vazia, as teclas `1` a `9` e `0` aplicam a cor daquela posição na hora. Digitando, filtra pelo nome. Com `#` e um hex, oferece aquele hex. |
| Colorir com … | Um comando por cor da paleta, para ter um atalho por cor. |
| Remover cor | Tira a cor e o realce, deixando o texto. Remove também o realce comum e os `<span style="color">` antigos. |

Nenhum comando vem com atalho definido. Para atribuir um, abra **Configurações → Atalhos** e filtre por `Colored Text`.

Com o botão direito no editor aparecem a última cor, o seletor e, sobre texto colorido, remover cor.

Como a cor é aplicada:

- **Com seleção**, a seleção vira `=={cor}seleção==` e continua selecionada, para trocar de cor em seguida. Espaços nas pontas ficam fora dos `==`.
- **Sem seleção**, colore a palavra sob o cursor. Numa linha vazia, insere `=={cor}==` com o cursor dentro.
- **Dentro de um realce**, colorido ou comum, troca a cor do realce inteiro. Não existe realce dentro de realce: uma seleção que corta um realce pela metade engloba o realce todo.
- **Várias linhas** viram um realce por linha. Marcadores de lista, tarefa, citação e título ficam fora. Em tabela, cada célula ganha o seu realce, e a linha divisória não muda.
- Um `<span style="color">` do plugin antigo dentro da seleção é convertido para o formato novo.

Cada comando é uma única edição: `Cmd+Z` desfaz tudo de uma vez.

## Configurações

| Opção | Padrão | O que faz |
|---|---|---|
| Cores | 10 cores | Lista editável: nome, hex, seletor de cor e estilo. Arraste para reordenar, e a ordem define os números do seletor. |
| Estilo | cor do texto | **Cor do texto** pinta as letras e tira o fundo amarelo. **Cor do realce** troca o fundo, translúcido como o realce nativo. |
| Mostrar no menu de contexto | ligado | Itens no clique direito do editor. |

A paleta padrão tem as cores padrão dos editores de texto: `vermelho-escuro` `#c00000`, `vermelho` `#ff0000`, `laranja` `#ffc000`, `amarelo` `#ffff00` como realce, `verde-claro` `#92d050`, `verde` `#00b050`, `azul-claro` `#00b0f0`, `azul` `#0070c0`, `azul-escuro` `#002060` e `roxo` `#7030a0`.

Regras dos nomes: até 30 caracteres, sem repetir, sem começar com `#` e sem `{ } = | \`. Um nome inválido não é salvo, e a linha mostra o motivo.

Trocar o hex ou o estilo muda na hora todas as notas que usam a cor. **Renomear uma cor não muda as notas**: o nome é o que fica escrito nelas, então `=={verde}…==` perde a cor quando `verde` vira `correto`.

## Substituindo o plugin da comunidade

O id é o mesmo do Colored Text da comunidade (`colored-text`). Antes de ligar este plugin a um vault:

1. Desinstale o Colored Text da comunidade no vault. O `pnpm link-plugin` se recusa a copiar por cima dele.
2. Rode `pnpm link-plugin colored-text <vault>` e ative o plugin.

Os `<span style="color:…">` que ele criou continuam vermelhos sem plugin nenhum, porque o Obsidian renderiza HTML. Este plugin não cria mais spans, mas os remove e converte pelos comandos.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**), com inglês e português (Brasil). Outros idiomas usam inglês.

Os nomes da paleta padrão são criados no idioma do Obsidian no primeiro uso (`vermelho` ou `red`) e ficam salvos. Trocar o idioma depois não renomeia as cores, porque as notas dependem desses nomes.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações, registra extensão do editor, pós-processador, comandos, menu e aba. Redesenha tudo quando a paleta muda. |
| `src/syntax.ts` | A sintaxe como funções puras: realces, marcador, spans antigos e hex. |
| `src/palette.ts` | Resolve o marcador para uma cor: nome da paleta ou hex. |
| `src/editor/decorations.ts` | Live Preview e modo fonte: uma decoração externa com a cor e o marcador escondido ou apagado. |
| `src/editor/transform.ts` | Colorir, recolorir e remover numa linha, sem API do Obsidian. |
| `src/editor/edit.ts` | Aplica as transformações à seleção numa única transação, pulando frontmatter e blocos de código. |
| `src/render/reading-view.ts` | Modo de leitura: tira o marcador do texto renderizado e põe a cor no `<mark>`. |
| `src/ui/color-modal.ts`, `src/ui/editor-menu.ts` | Seletor de cores e menu de contexto. |
| `src/settings/` | Configurações declarativas do Obsidian 1.13: padrões, validação e a linha editável de cada cor. |

O Obsidian já reconhece e desenha o realce. O plugin só confere, na árvore de sintaxe do editor, que os dois `==` são delimitadores de realce, o que exclui código e frontmatter. A cor chega ao CSS pela variável `--ct-color`. O `styles.css` redefine as variáveis que o Obsidian usa para pintar o realce (`--text-highlight-bg` e `--text-normal`), então o tema continua valendo.

O plugin não escreve em notas por conta própria. Os comandos só editam o editor aberto.

## Desenvolvimento

```bash
pnpm --filter colored-text dev
```

Teste no `dev-vault/` do repositório: `Colored Text/index.md` lista os casos de teste, e `Colored Text/playground.md` é a nota para colorir. Todo o texto de lá é fictício.

Requer Obsidian 1.13.0 ou superior, por causa da API declarativa de configurações.

## Limitações do MVP

- Uma cor vale para os dois temas. Cores escuras como `azul-escuro` ficam ilegíveis no tema escuro. Uma variante por tema fica para a v1.
- Renomear uma cor não atualiza as notas. Um comando para renomear no vault inteiro fica para a v1.
- Sem migração automática dos `<span style="color">` antigos para o formato novo. Os comandos convertem um por vez, e a migração em lote fica para a v1.
- Um realce que atravessa uma quebra de linha não é colorido no editor. Os comandos nunca criam esse caso.
- Hex avulso sempre pinta o texto. Não há sintaxe para hex como cor de fundo.
