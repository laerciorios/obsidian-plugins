# Bases Board

Visualização **Board** (kanban) para o Bases nativo do Obsidian. As colunas vêm de uma propriedade da nota (padrão `status`). Arrastar um card para outra coluna grava o novo valor no frontmatter. O plugin só desenha o resultado da query: filtros, ordenação e limite continuam sendo os da view do Bases.

Desde a 0.2.0 o plugin também **arquiva automaticamente** os cards concluídos há mais de N dias e **cria cards** pelo botão "+ Adicionar card". As duas coisas seguem **perfis de quadro** configuráveis.

A 0.3.0 mostra a **hierarquia projeto → spec → task** nos cards: progresso e tarefas da spec, chip do pai e cadeado de bloqueio na tarefa, resumo no projeto.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/bases-board-spec.md`.

Requer Obsidian **1.13.0** ou mais novo (ver [Por que 1.13](#por-que-1130)).

## Como usar

1. Num arquivo `.base`, abra o menu de views e troque o layout para **Board** (**Quadro** com o Obsidian em português), ou adicione uma view com `type: bases-board`.
2. Configure as opções da view no mesmo menu. Os valores ficam salvos no próprio `.base`.
3. Arraste os cards entre colunas. Clique abre a nota, Cmd+clique abre em nova aba, e passar o mouse mostra o preview.
4. Use **+ Adicionar card** no pé de uma coluna para criar um card já com o status dela.
5. Ajuste os perfis e o arquivamento em **Settings → Bases Board**.

## Perfis de quadro

Um perfil diz como reconhecer um card, quais propriedades usar, onde arquivar e onde criar cards novos. Existe sempre pelo menos um perfil, e o primeiro é o padrão. Na aba de configurações dá para criar, duplicar, remover e reordenar perfis. Cada perfil tem uma página própria, e um padrão inválido aparece como aviso na entrada da lista.

Uma nota pertence ao **primeiro perfil** que a reconhece, na ordem da lista. Por isso dois perfis nunca arquivam o mesmo card.

| Configuração | Padrão | O que faz |
|---|---|---|
| Nome | Padrão | Aparece nas opções da view e na prévia. |
| Id | `default` | Estável: a view guarda `profile: <id>` no `.base`. Não muda ao renomear. |
| Tag do card | `card` | Tag sem `#`. Tags aninhadas também valem. Vazio: não filtra por tag. |
| Incluir pastas | vazio | Um glob por linha. Vazio: o vault inteiro. |
| Excluir pastas | `_Templates` | Mesma regra. Templates nunca são cards. |
| Propriedade de status | `status` | Define a coluna. |
| Valor de concluído | `done` | |
| Propriedade da data de conclusão | `completed` | Lida para arquivar e gravada ao soltar em concluído. |
| Formato da data de conclusão | data | `date` grava `YYYY-MM-DD`; `datetime` grava `YYYY-MM-DDTHH:mm`. |
| Propriedade do projeto | `project` | Link para a nota do projeto. Usada pelos tokens de projeto e pelo "+ Adicionar card". |
| Arquivar este perfil | ligado | |
| Arquivar após (dias) | `30` | Arquiva quando `completed + dias < hoje`. |
| Pasta de arquivo | `{cardFolder}/Archived` | Para onde vão os arquivados. |
| Concluído sem data de conclusão | pular | `skip` lista o card na prévia; `useModified` usa a data de modificação do arquivo. |
| Propriedade de origem | vazio | Se preenchida (ex.: `archived_from`), grava a pasta original ao arquivar. |
| Pasta dos cards novos | `{projectFolder}/_Tasks` | Para cards com projeto. |
| Pasta sem projeto | vazio | Vazio: o modal pede a pasta. |
| Nome do arquivo | `{date:YYYY-MM-DD}-{slug}` | Sem `.md`. |
| Template | vazio | Nota copiada no card novo. Vazio: frontmatter mínimo. |
| Tipo | `task` | Valor gravado em `type` no card novo. |

**Globs de pasta.** Sem `/`, o glob vale para uma pasta com esse nome em qualquer nível, como `_Templates`. Com `/`, vale para um caminho a partir da raiz, como `Work/Acme/**`. `**` casa qualquer caminho, `*` qualquer parte de nome e `?` um caractere.

### Tokens dos padrões

| Token | Valor | Onde pode ser usado |
|---|---|---|
| `{cardFolder}` | pasta atual do card | só na pasta de arquivo |
| `{projectFolder}` | pasta da nota linkada em `project` | pastas |
| `{projectSlug}` | propriedade `slug` do projeto, ou o nome em kebab-case | todos |
| `{projectName}` | nome da pasta do projeto (para `index.md`) ou da nota | todos |
| `{date:FORMAT}` | data de hoje no formato do moment, como `{date:YYYY-MM-DD}` | todos |
| `{year}`, `{month}` | ano com 4 dígitos e mês com 2 | todos |
| `{title}` | título do card | todos |
| `{slug}` | título em kebab-case, sem acentos | todos |

Um token desconhecido, fora do lugar ou sem formato, como `{date}`, é erro de validação na aba de configurações. A pasta de arquivo precisa ter **pelo menos um nome fixo**, como `Archived` em `{cardFolder}/Archived`. Só com tokens, como `{cardFolder}/{year}`, pastas comuns como `Diário/2026` pareceriam arquivos. Um token que não pode ser resolvido para um card, como `{projectSlug}` num card sem projeto, faz o card ser **pulado**. Ele aparece na prévia com o motivo e nunca vai para um caminho quebrado. `..` não é aceito, e o nome do arquivo não pode ter `/`.

## Arquivamento

Um card é arquivado quando todas estas condições valem:

- pertence ao perfil, pela tag e pelas pastas;
- tem `status` igual ao valor de concluído;
- `completed + dias < hoje`;
- ainda não está numa pasta que corresponde ao padrão de arquivo do perfil.

Com o padrão `{cardFolder}/Archived`, qualquer pasta terminada em `/Archived` conta como arquivo.

- **Movimento**: sempre com `fileManager.renameFile`, que reescreve os links conforme a opção do Obsidian **Files & links → Automatically update internal links**.
- **Pastas**: as que faltam são criadas.
- **Conflito de nome**: o card ganha `-1`, `-2`… Nada é apagado nem sobrescrito.
- **Uma execução por vez**: execuções automáticas esperam o índice de metadados ficar pronto.
- **Depois de mover**: o plugin confere se o arquivo voltou ao índice com a tag. Se não voltar em 3 segundos, o resumo avisa.
- **Limite**: no máximo `maxPerRun` arquivos por execução, somando todos os perfis. O resto fica para a próxima.
- **Perfil com padrão de arquivo inválido**: não move nada e aparece como erro na prévia e no resumo.
- **Perfil sem tag e sem pastas incluídas**: nunca arquiva. Sem critério, qualquer nota com `status: done` do vault entraria, como notas de filmes ou livros.
- **Maiúsculas e minúsculas**: conflito de nome ignora maiúsculas, porque o disco do macOS também ignora. `Foo.md` e `foo.md` contam como o mesmo arquivo.
- **Card reaberto**: o status é conferido de novo logo antes de mover. Um card reaberto depois da prévia fica onde está.
- **Arquivo de qualquer perfil**: um card numa pasta de arquivo de qualquer perfil nunca é movido de novo, nem por outro perfil.
- **Destino conferido**: se o destino calculado não fosse reconhecido como pasta de arquivo pelo próprio perfil, o card é pulado. Assim nenhum padrão faz um card andar a cada execução.
- **Raiz do vault**: com `{cardFolder}/Archived`, um card na raiz vai para `Archived/`, que também é reconhecida como arquivo.
- **Pasta com outra grafia**: se `archived` já existe onde o padrão diz `Archived`, a pasta existente é reusada.
- **Frontmatter depois do movimento**: a propriedade de origem só é gravada depois que o arquivo foi movido. Um movimento que falha deixa a nota intacta.
- **Configurações ilegíveis**: se o `data.json` não puder ser lido, por exemplo por uma edição à mão com erro ou um arquivo sincronizado pela metade, o plugin não o sobrescreve. O arquivamento fica pausado e um aviso explica. Mudar qualquer configuração recria o arquivo com os padrões.
- **Abertura**: a execução ao abrir espera o Obsidian terminar de indexar, para julgar notas alteradas fora do app pelo status atual.
- **Vários dispositivos**: as configurações ficam no `data.json`, então todo dispositivo que sincroniza o vault também arquiva. Deixe o arquivamento automático ligado em um só.

### Configurações globais

| Configuração | Padrão | O que faz |
|---|---|---|
| Arquivar automaticamente | ligado | Liga ou desliga as execuções automáticas de todos os perfis. Os comandos continuam funcionando. |
| Rodar ao abrir | ligado | Uma verificação depois que o vault abre. |
| Atraso ao abrir | `30` s | Espera o índice estabilizar. Máximo de 3600 s. |
| Verificar a cada | `24` h | `0`: só ao abrir e pelo comando. Máximo de 576 h (24 dias). |
| Máximo por execução | `50` | Proteção contra movimentos em massa. |
| Confirmar a primeira execução | ligado | Na primeira vez que um perfil moveria cards, abre a prévia e espera **Arquivar**. Enquanto você não confirmar, a prévia volta a cada execução automática que tiver algo para mover. Só contam como confirmados os perfis que moveram cards sem erro. Mudar os critérios de um perfil, como tag, pastas, status, dias ou padrão, pede confirmação de novo. Reordenar os perfis pede de novo para todos. |
| Mostrar resumo | ligado | Aviso depois das execuções automáticas que moveram cards ou acharam erros. |

### Comandos

| Id | Nome | O que faz |
|---|---|---|
| `archive-now` | Arquivar cards concluídos agora | Todos os perfis ou um, escolhido numa lista. Perfis ainda não confirmados passam pela prévia. |
| `archive-preview` | Pré-visualizar arquivamento | Lista o que seria movido e o que seria pulado, com o motivo, sem mover nada. O botão **Arquivar** executa. |
| `unarchive-card` | Desarquivar card | Só aparece com um card arquivado aberto. Não altera `status`. |

**Desarquivar** devolve o card para o primeiro destino disponível, nesta ordem:

1. A pasta gravada na propriedade de origem. Depois de desarquivar, a propriedade é removida.
2. A pasta que `{cardFolder}` representava no padrão de arquivo. Com `{cardFolder}/Archived`, é a pasta pai de `Archived`.
3. A pasta de cards novos do projeto do card.
4. A pasta pai da pasta de arquivo.

Se o card continua concluído e antigo o bastante, o aviso lembra que a próxima execução vai arquivá-lo de novo. Mude o status para mantê-lo no quadro.

## "+ Adicionar card"

O botão fica no pé de cada coluna, exceto em "Outros". Ele abre um modal com três campos:

- **Título**.
- **Projeto**: aparece quando o perfil tem propriedade de projeto. A lista traz as notas já usadas como projeto nos cards do perfil e as notas com `type: project`. Se todos os cards do quadro são do mesmo projeto, ele já vem escolhido.
- **Pasta**: aparece quando não há projeto e o perfil não tem pasta sem projeto.

O modal mostra o caminho final antes de criar. A nota nova recebe:

- o conteúdo do template, com `{{title}}`, `{{date}}`, `{{date:FORMAT}}` e `{{time}}` preenchidos;
- título, tipo, status da coluna, link do projeto no formato `[[<caminho>/index|<slug>]]` e a tag do perfil;
- `created` com a data de hoje, quando não há template;
- `completed`, quando a coluna é a de concluído.

Depois de criada, a nota abre numa aba nova.

O plugin cria o arquivo ele mesmo, em vez de usar `createFileForView` do Bases. Essa API escolhe a pasta pela regra de notas novas do Obsidian, e o perfil precisa decidir a pasta e o nome pelos padrões.

## Opções da view

As opções preenchidas na view **têm prioridade** sobre o perfil, e o perfil tem prioridade sobre o padrão do plugin. Um `.base` que já define `columnProperty`, `doneValue` e as demais opções continua funcionando igual.

| Opção | Padrão | O que faz |
|---|---|---|
| Perfil do quadro | primeiro perfil | Perfil usado pela view. Se o perfil for removido, a view usa o primeiro e mostra um aviso. |
| Ocultar arquivados | ligado | Esconde os cards que estão em pastas de arquivo do perfil. O `.base` não precisa de filtro por caminho. |
| Propriedade da coluna | do perfil | Propriedade da nota que define a coluna. Fórmulas não aparecem, porque não podem ser gravadas. |
| Colunas (valor\|rótulo) | `todo`, `doing`, `review`, `done` | Ordem e rótulo das colunas. Sem configuração, os rótulos seguem o idioma: *To do, Doing, To review, Done* ou *A fazer, Fazendo, Em revisão, Concluído*. |
| Rótulo para outros valores | `Other` / `Outros` | Coluna para valores fora da lista. Ela não aceita drop nem tem "+ Adicionar card". |
| Esconder a coluna de outros quando vazia | ligado | |
| Valor de concluído | do perfil | Coluna que grava a data de conclusão. |
| Gravar data de conclusão | ligado | Soltar em concluído grava a data no formato do perfil. Sair de concluído limpa o campo. |
| Propriedade da data de conclusão | do perfil | |
| Título, Tipo, Projeto, Executor, Prazo | `title`, `type`, do perfil, `executor`, `due` | Propriedades mostradas no card. Sem título, o card usa o nome do arquivo. |
| Valor do executor que indica IA | `ai` | Mostra o chip **AI**. |
| Mostrar listas de filhos e chip do pai | do perfil | Lista de tarefas nas specs, lista de specs nos projetos e o chip "↑ spec". |
| Mostrar progresso | do perfil | Barras de progresso e o resumo "N specs · M tarefas". |
| Mostrar indicador de bloqueio | do perfil | Cadeado nas tarefas bloqueadas. |

As três opções de hierarquia usam "Mostrar hierarquia nos cards" do perfil quando não estão preenchidas na view.

## O card

- **Borda e badge por tipo**: `task` laranja, `spec` roxo, `project` azul.
- **Chip de projeto**: mostra o alias do link (`[[.../index|slug]]` vira `slug`). Clicar abre o projeto.
- **Prazo**: fica vermelho quando está vencido, exceto na coluna de concluído.
- **Notas `type: project`**: aparecem, mas não podem ser arrastadas.

## Hierarquia projeto → spec → task

O plugin lê as relações que já estão nas notas e as mostra nos cards. É só leitura: nada é gravado.

| Propriedade | Padrão | O que é |
|---|---|---|
| Pai | `parent` | Link da tarefa para a spec. |
| Ordem | `order` | Número que ordena as tarefas da spec. |
| Bloqueio | `blocked_by` | Lista de links para os cards que bloqueiam este. |
| Tipo | `type` | Separa specs de tarefas no resumo do projeto. |
| Projeto | `project` | Link para a nota do projeto (a mesma do perfil). |

- **Card de spec**: barra `concluídas/total` das tarefas filhas diretas, pelo valor de concluído do perfil, e a lista das tarefas. A lista segue `order`; tarefas sem ordem vêm por último, pelo título. Cada linha mostra o status como está na nota. Clicar na linha abre a tarefa, e Cmd com o mouse em cima mostra a prévia. A lista começa recolhida quando tem mais itens que o limite do perfil; clicar no cabeçalho abre ou fecha, e o quadro lembra a escolha enquanto está aberto.
- **Card de tarefa**: chip "↑ <spec>" que abre a spec. Cadeado, com a lista no tooltip, enquanto algum card de `blocked_by` não está concluído. O cadeado só sinaliza: o card continua arrastável. Links que não existem são ignorados. Uma nota fora do perfil só bloqueia se tiver status.
- **Card de projeto**: "N specs · M tarefas", barra das tarefas concluídas e a lista das specs com status e progresso de cada uma. Specs são os cards com o tipo de spec ou com filhos; o resto são tarefas. Uma tarefa sem `project` herda o projeto da spec.

**De onde vêm os dados.** O índice usa **todos os cards do perfil no vault**, não só os que a view mostra, e inclui os arquivados. Assim o progresso de uma spec não cai quando uma tarefa concluída vai para o arquivo. Com "Contar arquivados" desligado, os arquivados saem da contagem e das listas. O índice fica em memória, lê só o cache de metadados do Obsidian e se atualiza sozinho, com um pequeno atraso, quando um card muda, é renomeado, movido ou apagado. Quando a view define outra propriedade de coluna, título, tipo ou projeto, o índice lê essas propriedades.

### Configurações do perfil

| Configuração | Padrão | O que faz |
|---|---|---|
| Mostrar hierarquia nos cards | ligado | Liga tudo acima. As opções da view podem sobrepor. |
| Propriedade do pai, de ordem, de bloqueio, de tipo | `parent`, `order`, `blocked_by`, `type` | Onde ler as relações. |
| Valor de tipo das specs | `spec` | |
| Contar arquivados | ligado | Arquivados no progresso e nas listas. |
| Recolher listas com mais de | `5` | Listas maiores começam recolhidas. |
| Resumo nos cards de projeto | ligado | Contagem, progresso e lista de specs no projeto. |

## Idiomas

A interface segue o idioma do Obsidian: inglês e português do Brasil, com inglês para qualquer outro. Os textos ficam em `src/i18n/en.ts`, a fonte, e em `src/i18n/pt-br.ts`. Nunca são traduzidos:

- os valores gravados nas notas, como `done` e `Archived`;
- os nomes de propriedades;
- os rótulos que você escreveu nas opções.

O nome do perfil padrão é traduzido uma única vez, quando o perfil é criado.

## Por que 1.13.0

A aba de configurações usa a API declarativa do Obsidian 1.13, com `getSettingDefinitions`. A versão 0.1.0 exigia 1.10.2. A troca se justifica por quatro motivos:

- **Lista nativa**: o próprio app desenha a lista de perfis com adicionar, reordenar por arrasto e remover, e cada perfil numa página.
- **Validação inline**: os padrões são validados no próprio campo, e um perfil inválido ganha indicador de aviso na lista.
- **Consistência**: é a mesma API do plugin Shortcuts deste repositório.
- **Versão em uso**: o vault usa o Obsidian 1.13.7.

A aba clássica, com `PluginSettingTab.display()`, precisaria reimplementar tudo isso à mão.

## Como funciona por dentro

| Pasta ou arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações, registra a view, a aba de configurações, os comandos e o arquivamento. |
| `src/settings/` | Modelo com padrões e normalização do `data.json`, ligações dos controles, definições declarativas e a aba. |
| `src/patterns/pattern.ts` | Parse, validação e resolução dos padrões com tokens, e a regex que reconhece pastas de arquivo. |
| `src/profiles/matcher.ts` | Globs de pasta, tag, projeto linkado e leitura de frontmatter. |
| `src/hierarchy/` | Grafo puro de relações (`graph.ts`), o que cada card mostra (`relations.ts`) e o índice em cache que escuta o vault (`index.ts`). |
| `src/archive/` | Planejador puro, executor, serviço com agendamento, trava e confirmação, desarquivar e o modal de prévia. |
| `src/cards/` | Planejamento e criação de cards novos, o modal e as sugestões de pasta. |
| `src/vault/files.ts` | Criar pastas, achar nome livre e esperar o índice. |
| `src/view/` | `BoardView extends BasesView` e as opções da view. |
| `src/data/`, `src/render/`, `src/dnd/` | Colunas, valores, datas, render (inclusive `render/relations.ts`, da hierarquia) e drag and drop do quadro. |

Todas as escritas em notas passam por `processFrontMatter`. Todos os movimentos passam por `renameFile`. Nada é apagado.

## Desenvolvimento e testes

```bash
pnpm --filter bases-board fixtures
```

```bash
pnpm --filter bases-board dev
```

O comando `fixtures` recria, dentro de `dev-vault/Archive Lab/`, os cards de teste com datas relativas a hoje. Ele também recria o `data.json` do plugin no dev-vault, com três perfis: Padrão, Central e Quebrado. O roteiro de testes está em `dev-vault/Archive Lab/index.md`. O quadro do MVP continua em `dev-vault/Boards/`.

Para a hierarquia:

```bash
pnpm --filter bases-board fixtures:hierarchy
```

Ele recria `dev-vault/Hierarchy Lab/`, com o cenário principal e um conjunto de 520 cards para desempenho, e acrescenta o perfil "Hierarquia" ao `data.json` sem apagar os outros. O roteiro está em `dev-vault/Hierarchy Lab/index.md`.

Cada build também é copiado para os vaults ligados com `pnpm link-plugin`.

## Limitações

- Não reordena cards dentro da coluna.
- Não suporta arrastar por toque no mobile.
- Ignora o `groupBy` do Bases.
- Não tem limite de WIP nem swimlanes.
- Só arquiva pela data de conclusão.
