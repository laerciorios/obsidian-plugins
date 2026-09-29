# Shortcuts

Atalhos de escrita com `@` no editor. Datas e notas viram links sem digitar caminhos: `@hoje` insere `[[2026-09-29]]`, `@dalia` insere `[[dalia-alecrim|Dália Alecrim]]` e `@irrigacao` insere `[[Work/Horta Digital/Projects/Irrigação Inteligente/index|irrigacao]]`.

Quais notas viram sugestão e como o link é montado fica nas configurações do plugin, em **fontes de notas**. Nada do vault está fixo no código.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/shortcuts-spec.md`.

## Como usar

1. Digite `@` no editor, no começo de uma palavra, e continue com o nome.
2. Escolha com ↑↓ e confirme com Enter. Esc fecha e mantém o texto.

As sugestões não abrem em `nome@email.com`, com `@` seguido de espaço, dentro de código inline nem no frontmatter. Com duas ou mais palavras (`@nina p`), cada palavra precisa começar uma palavra do título. Assim uma frase comum depois do `@` fecha as sugestões e o Enter volta a quebrar a linha.

A busca ignora acentos e maiúsculas. Primeiro vêm os títulos que começam com o que foi digitado, depois os que têm uma palavra começando assim, e por último a busca aproximada.

## Configurações

### Gatilho e datas

| Opção | Padrão | O que faz |
|---|---|---|
| Gatilho | `@` | Até 3 caracteres, sem espaço. |
| Sugerir datas | ligado | Links para a daily note de hoje, ontem e amanhã. |
| Hoje, Ontem, Amanhã | `today, hoje`, `yesterday, ontem`, `tomorrow, amanha` | Palavras de cada dia. Vazio desliga aquele dia. |
| Formato da data | vazio | Formato do moment.js. Vazio usa o formato do plugin Daily notes, ou `YYYY-MM-DD` se ele não estiver configurado. |

### Fontes de notas

Cada fonte é uma lista de notas que aparece nas sugestões. A lista pode ser reordenada, e a ordem desempata sugestões com a mesma relevância. Na primeira execução o plugin cria duas fontes, que podem ser editadas ou apagadas:

| Fonte | Quais notas | Título | Busca também em | Link |
|---|---|---|---|---|
| Pessoas | pasta `_People` em qualquer nível | `name` | `aliases` | nome do arquivo, alias `name` |
| Projetos | `type: project`, fora de `_Templates` | `title` | `aliases`, `slug` | caminho completo, alias `slug` |

Campos de uma fonte:

| Campo | O que faz |
|---|---|
| Ativa | Desativada, a fonte some das sugestões e mantém a configuração. |
| Nome, Ícone | Nome da fonte e um ícone do [Lucide](https://lucide.dev) ao lado de cada sugestão. |
| Pasta | Sem barra, vale uma pasta com esse nome em qualquer nível (`_People`). Com barra, é um caminho a partir da raiz (`Work/Acme`). |
| Propriedade e valor | A nota precisa ter a propriedade. Com valor, precisa ter um dos valores listados (`project, area`). Listas no frontmatter valem se algum item bater. |
| Tag | A nota precisa ter a tag. Tags aninhadas também valem: `meeting` inclui `meeting/semanal`. |
| Excluir pastas | Uma por linha, com a mesma regra do campo pasta. |
| Notas encontradas | Quantas notas a fonte encontra agora, com exemplos. Atualiza enquanto você edita. |
| Título | Propriedade mostrada como título. Sem ela, vale o nome do arquivo. Para `index.md`, vale o nome da pasta. |
| Buscar também em | Outras propriedades pesquisadas. O título e o nome do arquivo sempre entram. |
| Destino do link | Nome do arquivo ou caminho completo. Com nome do arquivo, o link usa o caminho quando outra nota tem o mesmo nome. |
| Alias do link | Propriedade usada como alias. Se estiver vazia na nota, usa o título. Vazio no campo: link sem alias. |

Os critérios se somam: uma fonte com pasta e tag só sugere notas que estão na pasta e têm a tag. Uma fonte sem critérios sugere todas as notas do vault, e a página da fonte avisa isso.

Os links são sempre wikilinks, montados pelo plugin. Eles seguem o destino configurado na fonte, e não a opção de formato de link novo do vault.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**). Há inglês e português (Brasil). Outros idiomas usam inglês.

Os nomes das fontes padrão (Pessoas, Projetos) e de uma fonte nova são criados no idioma da interface e depois ficam salvos como qualquer nome editado: trocar o idioma não os renomeia. As palavras das datas vêm nos dois idiomas (`today, hoje`) em qualquer idioma.

Um idioma novo é um arquivo novo em `src/i18n/`, com todas as chaves de `src/i18n/en.ts`, mais uma entrada em `src/i18n/index.ts`.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações e registra o suggest e a aba de configurações. |
| `src/engine.ts` | Junta datas e fontes de notas e ordena as sugestões. |
| `src/suggest/shortcut-suggest.ts` | `EditorSuggest`: gatilho, popover e inserção do link com `replaceRange`. |
| `src/suggest/trigger.ts` | Acha o gatilho no texto antes do cursor. Roda a cada tecla, então só faz buscas simples em string. |
| `src/data/note-index.ts` | Índice das fontes ativas, montado na primeira busca e atualizado por eventos do vault. |
| `src/data/matcher.ts` | Regras de pasta, propriedade, tag e exclusão. |
| `src/data/links.ts`, `src/data/notes.ts` | Título, campos de busca e link de cada nota. |
| `src/data/search.ts` | Ranking: começo do título, começo de palavra e busca aproximada. |
| `src/data/dates.ts`, `src/data/daily-format.ts` | Datas e leitura do formato do plugin Daily notes. |
| `src/settings/` | Configurações declarativas do Obsidian 1.13: padrões, normalização do `data.json`, chaves e definições da aba. |

O plugin não escreve em notas. Ele só insere texto no editor.

O índice é montado na primeira busca depois de uma mudança nas configurações ou de uma renomeação. Edições e exclusões de uma nota atualizam só aquela nota, então digitar nunca varre o vault inteiro.

## Desenvolvimento

```bash
pnpm --filter shortcuts dev
```

Teste no `dev-vault/` do repositório: `Shortcuts/index.md` lista os casos de teste, e `Shortcuts/playground.md` é a nota para digitar. As pessoas, empresas e projetos de lá são fictícios.

Requer Obsidian 1.13.0 ou superior, por causa da API declarativa de configurações.

## Limitações do MVP

- Não cria a daily note. O link aponta para ela, e o Obsidian cria a nota ao clicar.
- Sem atalhos com link fixo (`@mestrado`) nem ações (`@card`). Ficam para a v1, como novos tipos de fonte.
- Inserir um projeto numa daily não atualiza a propriedade `projects` (v1).
- Só wikilinks. Vaults que usam links Markdown não são suportados.
