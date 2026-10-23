# Folder Style: casos de teste

As pastas aqui dentro são fictícias e existem só para receber símbolo e cor no explorador. Nomes com aspas, acentos e espaços, a pasta `Notas` em três níveis diferentes (`Notas`, `Área "Citações"/Notas` e `Estudos/Livros/Notas`) e subpastas em três níveis (`Estudos/Livros/2026`). Em `Clientes/`, duas empresas fictícias recebem logos SVG de `Attachments/`: `horta-viva-logo.svg` (colorido) e `sementeira-logo.svg` (de uma cor, sem `xmlns` de propósito).

## Preparação

- [ ] Na raiz do repo, `pnpm --filter folder-style dev`. Confira **Folder Style** ativo em Plugins da comunidade.
- [ ] Clique direito em cada pasta abaixo, "Personalizar pasta…", e configure:

| Pasta | Símbolo | Cor |
|---|---|---|
| `Folder Style/Estudos` | ícone `book-open` | azul |
| `Folder Style/Estudos/Livros` | texto `📚` | nenhuma |
| `Folder Style/Estudos/Livros/2026` | texto `§` | verde |
| `Folder Style/Área "Citações"` | texto `❝` | roxo |
| `Folder Style/Notas` | texto `B` | hex `#d97706` |
| `Folder Style/Projetos de horta` | ícone `sprout` | verde |
| `Folder Style/Ícones/Sem ícone` | ícone `circle` | rosa |
| `Folder Style/Clientes/Horta Viva` | arquivo SVG `Attachments/horta-viva-logo.svg` | nenhuma |
| `Folder Style/Clientes/Sementeira` | arquivo SVG `Attachments/sementeira-logo.svg`, "Usar a cor da pasta" ligado | ciano |

## Explorador

- [ ] Emoji, caractere e ícone aparecem antes do nome, depois da seta, e o ícone segue a cor da pasta.
- [ ] Só a pasta `Folder Style/Notas` fica laranja; `Área "Citações"/Notas` e `Estudos/Livros/Notas` não têm estilo próprio, só o tom leve da pasta-mãe.
- [ ] A linha da pasta colorida fica translúcida; o hover fica um pouco mais forte, e a pasta selecionada (Cmd+clique) mais ainda.
- [ ] O conteúdo de uma pasta colorida fica com a mesma cor, mais leve.
- [ ] Recolha, expanda e role o explorador: nada some.
- [ ] Troque entre tema claro e escuro (Configurações → Aparência): as cores acompanham o tema.
- [ ] O nome, a ordem das pastas e os links continuam os mesmos: nada foi renomeado.
- [ ] Arraste uma nota sobre uma pasta colorida: o destaque de destino do Obsidian aparece.
- [ ] Renomeie uma pasta pelo explorador: o símbolo some só enquanto o nome está sendo editado.

## Renomear, mover e apagar

- [ ] Renomeie `Estudos` para `Estudos 2`: `Estudos 2`, `Livros` e `2026` continuam com símbolo e cor. Renomeie de volta.
- [ ] Mova `Área "Citações"` para dentro de `Projetos de horta`: o estilo vai junto. Mova de volta.
- [ ] Crie uma pasta `Temporária`, personalize, apague: ela some da lista em Configurações → Folder Style.

## Modal

- [ ] No modal, "Ícone" e busca "book": a grade mostra os ícones com "book" no nome, com prévia.
- [ ] A prévia no topo do modal mostra símbolo e cor antes de salvar, com a intensidade das configurações.
- [ ] Hex inválido (`#12`): aparece o erro e "Salvar" fica desabilitado. Apagar o hex volta para "sem cor".
- [ ] "Remover personalização" limpa a pasta.
- [ ] Feche o Obsidian, edite `.obsidian/plugins/folder-style/data.json` e troque o ícone de `Folder Style/Ícones/Sem ícone` por `nao-existe`. Ao abrir de novo, a pasta fica só com a cor, e a aba de configurações e o modal avisam.

## Arquivo SVG

- [ ] No modal, "Arquivo SVG" → "Escolher arquivo" e busca "horta": a lista mostra `horta-viva-logo.svg` com prévia e o caminho; escolher mostra a prévia no modal e na linha de prévia do topo.
- [ ] `Clientes/Horta Viva` mostra o logo nas cores originais antes do nome, do tamanho do ícone; `Clientes/Sementeira` mostra o logo em ciano (cor da pasta). Desligar "Usar a cor da pasta" volta para as cores do arquivo (o cinza escuro).
- [ ] "Usar a cor da pasta" numa pasta sem cor: o logo fica na cor do texto do tema, nos temas claro e escuro.
- [ ] Trocar o símbolo para "Ícone" e de volta para "Arquivo SVG" no mesmo modal mantém o arquivo escolhido.
- [ ] Edite `Attachments/sementeira-logo.svg` fora do Obsidian (troque o `fill`): o explorador atualiza sozinho.
- [ ] Renomeie `Attachments/horta-viva-logo.svg` para `horta-viva.svg` pelo Obsidian: o logo continua na pasta e o `data.json` aponta para o nome novo. Renomeie de volta.
- [ ] Apague `sementeira-logo.svg` (vai para a lixeira): a pasta fica só com a cor, as demais continuam, e Configurações → Folder Style avisa que o arquivo não está no vault. Restaure o arquivo: o logo volta.
- [ ] Um SVG com mais de 100 KB não aparece na busca do modal; apontado à mão no `data.json`, a pasta fica sem símbolo e a aba avisa que o arquivo é grande demais.
- [ ] Configurações → Folder Style: as duas pastas mostram "SVG: <nome do arquivo>" com a prévia (a da Sementeira com "na cor da pasta").
- [ ] Graph Kit com "Símbolos do Folder Style" ligado: as notas de `Clientes/` mostram o logo no nó (o da Sementeira na cor do ícone, como os ícones Lucide), e nada quebra.

## Configurações

- [ ] Configurações → Folder Style lista as pastas personalizadas em ordem, com prévia e resumo.
- [ ] "Intensidade da cor", "Colorir o conteúdo da pasta" e "Tamanho do símbolo" mudam o explorador na hora.
- [ ] "Editar" abre o modal; o X remove a pasta da lista e do explorador.

## Mobile e desligar

- [ ] No mobile (ou em `app.emulateMobile(true)` no console), toque longo numa pasta: "Personalizar pasta…" aparece e o visual é o mesmo.
- [ ] Desative o plugin: todo o visual some. Reative: volta.
- [ ] Nenhuma requisição de rede (aba Network do DevTools) e nenhum arquivo escrito no vault além do `data.json` do plugin.
