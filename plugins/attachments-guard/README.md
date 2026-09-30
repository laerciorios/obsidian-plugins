# Attachments Guard

Todo anexo do vault fica em `Attachments/`, com nome previsível, e nenhum arquivo fica solto ou órfão. Imagem colada vira `Attachments/<nota>-1.png`, arquivo arrastado para qualquer pasta vai para `Attachments/` com os links atualizados, e dois comandos recolhem o que está fora do lugar e acham o que ninguém usa.

Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/attachments-guard-spec.md`.

## O que é anexo

Todo arquivo que não é nota (`.md`), canvas (`.canvas`) ou base (`.base`). Pastas que começam com ponto (`.obsidian`, `.trash`) não fazem parte do vault. As subpastas de `Attachments/` (`AI Generated/`, `Comments/`) contam como dentro.

## Anexos novos

Com **Organizar automaticamente** ligado:

| Como o arquivo entra | O que acontece |
|---|---|
| Colado ou arrastado no editor, colado ou arrastado num canvas, gravado pelo gravador de áudio, "Salvar imagem" | Já nasce em `Attachments/` com o nome da regra. O link que o Obsidian insere aponta para o nome final. |
| Arrastado para uma pasta do explorador, copiado pelo Finder, trazido pelo sync, criado por outro plugin fora da pasta | Vai para `Attachments/` 2 segundos depois do último arquivo novo (uma pasta copiada chega aos poucos), com a regra de nome e os links atualizados. Um aviso diz para onde foi. |

A regra de nome:

- **Nome descritivo** (`diagrama-de-rede.png`, `manual-do-equipamento.pdf`) fica como está. Só perde os caracteres que quebram links (`# ^ [ ] | : * ? " < > \ /`).
- **Nome genérico** segue o padrão, `{note}-{n}` por padrão: `relatorio-trimestral-1.png`, `relatorio-trimestral-2.jpg`.
- Se o nome já existe em qualquer pasta do vault, ganha `-2`, `-3` (assim `![[nome.png]]` continua curto).

Nome genérico é o que, sem acentos, maiúsculas, números, datas, separadores, `(1)`, `copy`/`cópia` e `at`/`às`, sobra igual a um item da lista **Nomes genéricos**, ou o nome que não tem letra nenhuma:

| Nome original | Genérico? |
|---|---|
| `Pasted image 20260930101010.png` | sim (`pasted image`) |
| `Captura de Tela 2026-09-30 às 10.10.10.png` | sim (`captura de tela`) |
| `WhatsApp Image 2026-09-30 at 10.10.10.jpeg` | sim (`whatsapp image`) |
| `IMG_1234.jpg`, `image (2).png`, `logo.png` | sim |
| `20260425094013.png` | sim (só números) |
| `logo-acme.png`, `cow_minigame_(1).png` | não |

A lista vem com os nomes que o Obsidian, câmeras, celulares e capturas de tela usam, em inglês e português. É dado, não interface: não muda com o idioma do app.

Variáveis do padrão:

| Variável | Valor |
|---|---|
| `{note}` | Slug da nota ou canvas onde o arquivo entrou: `Relatório Trimestral` → `relatorio-trimestral`. Numa nota `index`, o nome da pasta (`Portal Beta/index.md` → `portal-beta`). Sem nota (arquivo arrastado para o explorador), a data. |
| `{date}` | Data de hoje, `2026-09-30`. |
| `{name}` | Slug do nome original (`pasted-image-20260930101010`). |
| `{n}` | O maior número já usado com o mesmo padrão no vault, mais 1, em qualquer extensão. Não preenche buracos: se existem `-1` e `-3`, o próximo é `-4`. |

Sem `{n}` no padrão (por exemplo `{date}-{name}`), uma colisão ganha `-2`. Com uma variável desconhecida, o campo mostra o erro e o padrão não é salvo. A linha **Exemplo** mostra o resultado para uma imagem colada.

## Capas

Quando a propriedade `cover` de uma nota aponta por link para um anexo (`cover: "[[imagem-1.png]]"`), o anexo vira `<nota>-cover.<ext>` e vai para `Attachments/`, com os links atualizados. Vale ao editar a nota e ao renomeá-la (a capa acompanha o nome novo).

Não mexe quando:

- outra nota também aponta para o mesmo arquivo (duas notas brigariam pela mesma imagem);
- a capa é uma URL ou texto sem `[[ ]]` (o Obsidian não atualizaria o valor);
- a capa já se chama `<nota>-cover` (ou `-cover-2`) e está em `Attachments/`.

As notas que não mudam não são verificadas: abrir o vault não renomeia capas antigas.

## Notas geradas por IA

Anexos de notas com a tag `ai-generated` (no frontmatter ou no texto) vão para `Attachments/AI Generated/`. Vale para colar, para arquivos soltos e para o recolhimento (pela nota que aponta para o anexo). Com a pasta vazia nas configurações, ficam em `Attachments/`.

## Aviso de tamanho

Anexo novo maior que o limite (10 MB por padrão) mostra um aviso com o nome e o tamanho. Não bloqueia nem move nada. 0 desliga.

## Comandos

| Comando | O que faz |
|---|---|
| Recolher anexos soltos | Lista todo anexo fora de `Attachments/` com o destino (`de → para`) e só move depois da confirmação. Genéricos ganham o slug da primeira nota que aponta para eles; capas ganham o nome de capa. Links em notas, links markdown relativos e canvas são atualizados. Pastas que ficam vazias não são apagadas. |
| Listar anexos órfãos | Mostra, com miniatura, pasta e tamanho, os anexos para os quais nada aponta. Os marcados vão para `.trash/<caminho original>` (por exemplo `.trash/Attachments/foto.png`); nada é apagado. |

Um anexo **não** é órfão quando alguma nota ou canvas tem link para ele (corpo, embed, frontmatter) ou quando o nome dele aparece no texto de alguma nota, canvas ou base: um `<img src="…">`, um valor de frontmatter sem `[[ ]]`, um bloco de código. É de propósito conservador: um falso órfão iria para a lixeira.

A lixeira do próprio Obsidian põe tudo direto em `.trash/<nome>`; aqui a pasta de origem é mantida, como manda a regra do vault. Se já existe um arquivo com o mesmo nome lá, o novo ganha ` 2`.

## Configurações

| Opção | Padrão | O que faz |
|---|---|---|
| Organizar automaticamente | ligado | Anexos novos e capas. Desligado, vale o "Local padrão para novos anexos" do Obsidian; os comandos continuam funcionando. |
| Pasta de anexos | `Attachments` | Não pode ser a raiz nem uma pasta oculta. |
| Nome para arquivos genéricos | `{note}-{n}` | Variáveis na tabela acima. |
| Exemplo | — | O nome que uma imagem colada teria. |
| Nomes genéricos | lista padrão | Um por linha. |
| Aviso de tamanho | 10 | Em MB; 0 desliga. |
| Propriedade da capa | `cover` | Vazio desliga as capas. |
| Tag | `ai-generated` | Tag das notas geradas por IA. |
| Pasta | `Attachments/AI Generated` | Vazio mantém esses anexos em `Attachments/`. |
| Pastas ignoradas | — | Uma por linha. Anexos nelas nunca são movidos nem listados, e notas nelas usam o local de anexos do Obsidian. |
| Recolher anexos soltos, Listar anexos órfãos | — | Os mesmos comandos. |

## Limites

- Os anexos genéricos que já estão em `Attachments/` não são renomeados.
- Links em HTML (`<img src="pasta/foto.png">`) não são atualizados ao mover: o Obsidian não os conhece.
- Anexos no corpo da nota não mudam de nome quando a nota é renomeada (só a capa).
- O nome na entrada depende de um método interno do Obsidian (`vault.getAvailablePathForAttachments`). Se uma versão futura o remover, o console avisa e só a movimentação depois da criação continua funcionando.

## Idiomas

A interface segue o idioma do Obsidian (**Settings → General → Language**), com inglês e português (Brasil). Outros idiomas usam inglês. Nomes de pastas, variáveis, a lista de nomes genéricos, a propriedade e a tag são os mesmos em todos os idiomas.

## Como funciona por dentro

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Carrega as configurações e registra o gancho, os observadores, os comandos e a aba. |
| `src/naming/` | Regra de nome sem depender do Obsidian: slug da nota, nome genérico, padrão, contador, nome de capa. |
| `src/vault/rules.ts` | O que é anexo, o que está dentro, o que é ignorado. |
| `src/vault/planner.ts` | Destino de um anexo: pasta (normal ou de IA) e nome livre no vault. |
| `src/vault/references.ts` | Quem aponta para um anexo e qual é a capa de uma nota. |
| `src/vault/files.ts` | Mover com `fileManager.renameFile` e mandar para `.trash/` mantendo o caminho. |
| `src/guard/path-hook.ts` | Envolve o método interno que dá o caminho de todo anexo novo; desfeito ao desativar. |
| `src/guard/new-attachments.ts` | Responde ao gancho com a pasta e o nome da regra. |
| `src/guard/create-watcher.ts` | Arquivos que aparecem fora da pasta, e o aviso de tamanho. |
| `src/guard/cover-watcher.ts` | Nome de capa quando a nota muda ou é renomeada. |
| `src/commands/` | Recolher soltos e listar órfãos. |
| `src/ui/` | Janelas de confirmação e de órfãos. |
| `src/settings/` | Configurações declarativas (Obsidian 1.13+). |

Testado no `dev-vault` pelo checklist `Attachments Guard/index.md`.
