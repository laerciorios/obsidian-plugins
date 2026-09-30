# Vault Structure: casos de teste

Notas e pastas fictícias em `1 - Knowledge/Gardening/`, `1 - Knowledge/Game Dev/ideia-de-jogo.md` e `Inbox/`. As correções renomeiam e movem arquivos de verdade: para voltar ao estado inicial, `git checkout -- dev-vault && git clean -fd dev-vault` na raiz do repo.

| Caminho | Para quê |
|---|---|
| `Gardening/Composting/Notas Soltas.md` | Nota fora do kebab-case, linkada pelo [[1 - Knowledge/Gardening/index\|índice de Gardening]]; `Composting/` sem `index.md` |
| `Gardening/Glossary.md` | Renomear só a caixa (`glossary.md`), com link wiki e link markdown |
| `Gardening/Seeds/README.md` | README numa pasta sem `index.md` |
| `Gardening/Tools/README.md` | README numa pasta que já tem `index.md` |
| `Gardening/pesquisa-de-solo.md` | Tag `ai-generated` no frontmatter, fora do lugar |
| `Gardening/_References/Links/resumo-de-video.md` | Tag `#ai-generated` no texto, dentro de uma pasta de vocabulário |
| `Gardening/_Discovery/AI Generated/plano-gerado.md` | Gerada por IA no lugar certo (não aparece) |
| `Game Dev/ideia-de-jogo.md` | Gerada por IA numa área sem `_Discovery/AI Generated/` |
| `Gardening/indoor plants/` | Pasta fora do Title Case (só a caixa) e sem `index.md` |
| `Gardening/Pest_Control/` | Pasta com `_` no nome |
| `Gardening/DB/` | Pasta de vocabulário (não é tópico) |
| `Inbox/Rascunho Rápido.md` | Fora do kebab-case, mas em `Inbox` (ignorado por padrão) |
| [[Vault Structure/index-template\|index-template]] | Template de índice com `{{title}}`, `{{date:DD/MM/YYYY}}` e `{{time}}` |

## Preparação

- [ ] Na raiz do repo, `pnpm --filter vault-structure dev`. Confira **Vault Structure** ativo em Plugins da comunidade.
- [ ] Não existe `vault-rules.md` na raiz deste vault (os primeiros testes usam as regras padrão).

## Nova área ou tópico

- [ ] Abra a `Notas Soltas` e rode **Nova área ou tópico**: "Dentro de" vem em `1 - Knowledge/Gardening (novo tópico)`; a lista tem `1 - Knowledge (nova área)` e as áreas, sem `_References` nem `DB`.
- [ ] Digite `a/b:c` ("Tire estes caracteres: / :"), `Composting` e `composting` ("já existe nesta pasta"), `.x` ("não pode começar com ponto"): o botão **Criar** fica desativado.
- [ ] Digite `bird watching`: aviso de Title Case com a sugestão `Bird Watching` e o botão **Usar sugestão**, mas **Criar** continua ativo.
- [ ] Escolha `1 - Knowledge`, digite `Astronomy` e tecle Enter: aviso "Área criada", abre `Astronomy/index.md` (`title`, `type: index`, `tags: [index]`, `created`, `updated`) e existem `_Discovery/AI Generated/` e `_References/{Books,Links,Videos,Repos}/`.
- [ ] Botão direito em `1 - Knowledge`: "Nova área aqui". Em `1 - Knowledge/Software Development`: "Novo tópico aqui" (a janela abre com ela escolhida). Em `_References`, `Gardening/Composting` ou `Boards`: nada.

## Verificar estrutura

- [ ] Rode **Verificar estrutura do vault**: "16 itens fora das regras", "Regras: as padrão".
  - README (2): `Seeds/README.md → index.md` e `Tools/README.md` sem correção ("já tem um index.md").
  - Sem index.md (4): `Game Dev`, `Gardening/Composting`, `Gardening/indoor plants`, `Software Development` (não aparecem `Gardening/Seeds`, que tem README, nem `Gardening/DB`).
  - `#ai-generated` fora do lugar (4): `ideia-de-jogo`, `resumo-de-video` e `pesquisa-de-solo` com o destino em `_Discovery/AI Generated/` da área, e `Attachments Guard/pesquisa-gerada.md` (caso de teste do outro plugin).
  - Kebab-case (2): `Notas Soltas.md → notas-soltas.md`, `Glossary.md → glossary.md`.
  - Title Case (4): `indoor plants` (sugestão `Indoor Plants`), `Pest_Control` (`Pest Control`) e as duas pastas `assets` do Attachments Guard.
- [ ] Não aparecem `Inbox/Rascunho Rápido.md` nem `plano-gerado.md`, e nada mudou no vault.

## Corrigir

- [ ] **Renomear** em `Notas Soltas.md` e em `Glossary.md`: o índice de Gardening passa a apontar para `notas-soltas` e `glossary` (inclusive o link markdown).
- [ ] **Renomear** em `Seeds/README.md`: vira `index.md`, e `Seeds` não aparece em nenhum grupo.
- [ ] **Criar index.md** em `Gardening/Composting`: índice com `title: "Composting"`.
- [ ] **Mover** a `pesquisa-de-solo` e a `ideia-de-jogo`: vão para `_Discovery/AI Generated/` da área (a de Game Dev é criada), e o link do índice de Gardening continua funcionando.
- [ ] **Renomear…** em `indoor plants`: a sugestão vem selecionada; `Composting` é recusado; `Indoor Plants` renomeia.
- [ ] **Corrigir todos** em "Áreas e tópicos sem index.md": a lista mostra `pasta → pasta/index.md`; **Cancelar** não muda nada; confirmar cria os índices e avisa "N itens corrigidos".

## Arquivo de regras

- [ ] Rode **Abrir arquivo de regras**: cria e abre `vault-rules.md` com as propriedades padrão e a explicação de cada uma; o relatório passa a dizer "Regras: vault-rules.md."
- [ ] **Ignorar** numa das pastas `assets`: o caminho entra em `ignore` na nota e a linha some.
- [ ] Crie `1 - Knowledge/Astronomy/Planets/`: aparece em "sem index.md". Mude `index_depth` para `1`: some. Ponha `Work` em `index_roots`: aparecem `Work/Horta Digital`, `Work/Horta Digital/Projects` e `Work/Pomar Coletivo`. Tire `Work` de novo.
- [ ] Ponha `index_depth: abc`: volta a valer 2, sem erro.
- [ ] Em `index_template`, ponha `Vault Structure/index-template.md`: **Criar index.md** em `Planets` e uma área nova usam o template (`created: 30/09/2026`, linha "Índice criado pelo template de teste às …"). Com um caminho que não existe, aviso "Template de índice … não encontrado" e o embutido.
- [ ] Em **Configurações → Vault Structure**, digite `regras` no **Arquivo de regras**: "terminando em .md" e nada é salvo; `.config/regras.md`: "Pastas ocultas…". Volte para `vault-rules.md`.

## Idioma

- [ ] Com o Obsidian em inglês (**Settings → General → Language**, reiniciar), comandos, menus, janelas, avisos e configurações aparecem em inglês.
