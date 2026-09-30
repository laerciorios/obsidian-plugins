# Vault Structure

Aplica as regras de estrutura do vault (as do `CLAUDE.md`): cria áreas e tópicos já com o esqueleto certo e lista, com correção de um clique, o que foge do padrão. Diferente do plugin do Mario Souto, não gera tags a partir do caminho.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/vault-structure-spec.md`.

## Comandos

| Comando | O que faz |
|---|---|
| **Nova área ou tópico** | Pergunta o nome e onde criar. Cria a pasta com `index.md` e as subpastas de `scaffold` (por padrão `_Discovery/AI Generated/` e `_References/{Books,Links,Videos,Repos}/`) e abre o índice. Também no menu de contexto das pastas: "Nova área aqui" na raiz, "Novo tópico aqui" nas áreas. |
| **Verificar estrutura do vault** | Janela com o que foge das regras, agrupado por regra, com a correção de cada item. Nada muda até você clicar. |
| **Abrir arquivo de regras** | Abre a nota de regras; se ela não existe, cria com as regras padrão e a explicação de cada uma. |

Em **Dentro de**, a janela de nova área oferece as raízes (`index_roots`) e as pastas onde o novo nível ainda é área ou tópico, sem as pastas de vocabulário. O padrão é a mais funda que contém a nota ativa. Nome com caracteres proibidos (`\ / : * ? " < > | # ^ [ ]`), começando com ponto ou já existente é recusado; nome fora do Title Case só gera um aviso com a sugestão, porque nomes próprios podem ficar como estão.

## Regras verificadas

| Regra | Exemplo | Correção |
|---|---|---|
| `README.md` em vez de `index.md` | `Seeds/README.md` | Renomear para `index.md` (se a pasta já tem `index.md`, sem correção: junte à mão) |
| Área ou tópico sem `index.md` | `1 - Knowledge/Gardening/Composting/` | Criar o `index.md` pelo template |
| Nota com `ai-generated` fora de `_Discovery/AI Generated/` | `Gardening/pesquisa-de-solo.md` | Mover para `Gardening/_Discovery/AI Generated/` |
| Nota fora do kebab-case | `Notas Soltas.md` | Renomear para `notas-soltas.md` |
| Pasta fora do Title Case | `indoor plants/` | **Renomear…** com a sugestão editável (`Indoor Plants`) |

Detalhes:

- **Área e tópico**: subpastas de uma raiz de `index_roots` até `index_depth` níveis (1 = áreas, 2 = áreas e tópicos). Pastas de vocabulário (as que começam com `_` e as de `vocabulary`, como `DB/`) e o que há dentro delas não contam. Uma pasta com `README.md` aparece só no grupo do README.
- **Kebab-case** vale para notas (`.md`, `.canvas`, `.base`): minúsculas, sem acento, palavras separadas por hífen. Anexos são do Attachments Guard. Se o nome sugerido já existe, ganha `-2`.
- **Title Case com espaços**: cada palavra começa com maiúscula ou número (`Data Structures & Algorithms`, `1 - Knowledge`, `3D Printing`); as palavras de `minor_words` podem ficar em minúscula fora da primeira posição (`PGCC006 - Análise e Projeto de Algoritmos`); domínios ficam como estão (`laerciorios.com`); o `_` inicial do vocabulário não conta, mas `_` no meio é erro (`Pest_Control`).
- **Conteúdo gerado por IA**: tag no frontmatter ou no texto (também `ai-generated/subtag`). O destino é `<área>/_Discovery/AI Generated/`, onde `<área>` é o caminho até a primeira pasta de vocabulário: `Gardening/_References/Links/x.md` vai para `Gardening/_Discovery/AI Generated/x.md`. Na raiz do vault, sem correção automática.

Renomear e mover sempre por `fileManager.renameFile`, que atualiza os links. Cada linha mostra o destino antes do clique; **Corrigir todos** (por grupo, menos pastas) lista todas as mudanças e pede confirmação. **Ignorar** acrescenta o caminho a `ignore` na nota de regras. Depois de cada mudança, a janela verifica de novo.

## Nota de regras

As regras ficam nas propriedades de uma nota do vault (configuração **Arquivo de regras**, padrão `vault-rules.md` na raiz), para evoluírem junto com o `CLAUDE.md`. Numa nota, e não num `.json`, porque o Obsidian não edita JSON, as listas aparecem no painel de propriedades e o Attachments Guard não a trata como anexo. Sem a nota, valem os padrões.

| Propriedade | Padrão | O que é |
|---|---|---|
| `index_roots` | `1 - Knowledge` | Pastas cujas subpastas são áreas e tópicos |
| `index_depth` | `2` | Níveis abaixo de cada raiz que precisam de `index.md` (0 desliga) |
| `index_template` | vazio | Nota usada como template do `index.md`; vazio usa o embutido |
| `scaffold` | `_Discovery/AI Generated`, `_References/{Books,Links,Videos,Repos}` | Subpastas de cada área ou tópico novo |
| `vocabulary` | `DB`, `Archived` | Pastas que nunca são área nem tópico (além das que começam com `_`) |
| `minor_words` | conectivos em inglês e português | Palavras que podem ficar em minúscula no Title Case |
| `ai_tag`, `ai_folder` | `ai-generated`, `_Discovery/AI Generated` | Tag de conteúdo gerado e a pasta dele dentro da área; vazio desliga |
| `ignore` | `Inbox`, `CLAUDE.md` | Pastas e notas que a verificação não olha |

As regras são lidas a cada comando. Propriedade ausente ou inválida (`index_depth: abc`) volta ao padrão; lista esvaziada no painel fica vazia. Os valores são dados e nunca são traduzidos; só o texto explicativo da nota sai no idioma do Obsidian, uma vez, quando ela é criada.

O template do índice aceita as variáveis do Templates nativo: `{{title}}` (nome da pasta), `{{date}}`, `{{time}}`, `{{date:DD/MM/YYYY}}`. O embutido segue os índices do vault:

```markdown
---
title: "{{title}}"
type: index
tags:
  - index
created: {{date}}
updated: {{date}}
---
# {{title}}
```

## Fora de escopo

Verificar se áreas têm o esqueleto completo, notas em `AI Generated/` sem a tag, template por pasta (o índice de uma pasta de `Projects/` sai como o de área), atualizar o `index.md` da pasta-mãe com a área nova.

## Desenvolvimento

```bash
pnpm --filter vault-structure dev
```

O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/vault-structure/` (e para os vaults ligados com `pnpm link-plugin`). Casos de teste em `dev-vault/Vault Structure/index.md`.

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`.

## Status

Em desenvolvimento (0.1.0). `minAppVersion` 1.13.0 (configurações declarativas).
