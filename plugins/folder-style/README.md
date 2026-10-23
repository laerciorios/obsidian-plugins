# Folder Style

Símbolo (emoji, caractere, ícone Lucide embutido no Obsidian ou arquivo SVG do vault, como o logo de um projeto) antes do nome da pasta e cor com transparência na linha e na subárvore, só no explorador de arquivos, **sem renomear a pasta**.

## Como funciona

Nada é inserido no DOM do explorador. O plugin gera CSS a partir do `data.json` e o aplica numa stylesheet construída (`document.adoptedStyleSheets`), com seletores pelo `data-path` de cada pasta. O explorador recria as linhas ao expandir, recolher e rolar, e o seletor continua casando.

- Símbolo em texto: `::before` do nome da pasta, na cor da pasta.
- Ícone Lucide: o SVG de `getIcon()` vira uma máscara (`mask-image`) pintada com a cor da pasta ou do tema. Sem rede.
- Arquivo SVG do vault: lido com `vault.cachedRead` e embutido no CSS como `data:image/svg+xml`, na mesma caixa de `1em` do ícone. Por padrão fica com as cores do arquivo (`background-image`); com "Usar a cor da pasta" (`tint`) vira máscara, como o Lucide, o que serve para logos de uma cor. Arquivo inexistente, vazio ou acima de 100 KB: a pasta fica sem símbolo e a aba de configurações avisa. Editar o arquivo atualiza o explorador; renomear ou mover pelo Obsidian atualiza o caminho em todas as pastas que o usam; apagar deixa o caminho e mostra o aviso (restaurar o arquivo traz o logo de volta). O plugin só lê os SVGs: nunca escreve nem move arquivos do vault.
- Cor: presets das variáveis do tema (`--color-red-rgb`…) ou hex; linha com a opacidade base (12 %), hover +6 pontos, pasta ativa ou selecionada +12, subárvore com metade.
- Desligar o plugin remove a stylesheet e todo o visual.
- Renomear ou mover uma pasta pelo Obsidian leva o estilo junto, também das subpastas; apagar remove a entrada.
- Aba de configurações: intensidade da cor, colorir o conteúdo da pasta, tamanho do símbolo e a lista das pastas personalizadas (remover, aviso de ícone inexistente, de arquivo SVG ausente, vazio ou grande, ou de pasta que não existe mais).
- `data.json` alterado fora do Obsidian (sincronização) é recarregado em vez de sobrescrito.
- "Personalizar pasta…" no menu de contexto da pasta (desktop e mobile) e "Editar" na aba de configurações abrem um modal: símbolo (nenhum, texto, ícone Lucide com busca ou arquivo SVG escolhido numa busca entre os `.svg` do vault de até 100 KB, com prévia e "Usar a cor da pasta"), cor (8 presets do tema, hex ou nenhuma), prévia ao vivo com o mesmo CSS do explorador, Salvar, Cancelar e "Remover personalização".

## Dados

```json
{
  "version": 1,
  "opacity": 0.12,
  "tintChildren": true,
  "symbolSize": 1,
  "folders": {
    "Estudos": { "symbol": { "kind": "lucide", "value": "book-open" }, "color": { "kind": "preset", "value": "blue" } },
    "Trabalho": { "symbol": { "kind": "text", "value": "💼" }, "color": { "kind": "hex", "value": "#d97706" } },
    "Trabalho/Horta Viva": { "symbol": { "kind": "svg", "value": "Attachments/horta-viva-logo.svg" } },
    "Trabalho/Sementeira": { "symbol": { "kind": "svg", "value": "Attachments/sementeira-logo.svg", "tint": true }, "color": { "kind": "preset", "value": "cyan" } }
  }
}
```

`symbol` e `color` são opcionais e independentes. No símbolo `svg`, `value` é o caminho completo do arquivo no vault e `tint` (opcional, só gravado quando ligado) pinta o arquivo com a cor da pasta. `version` continua 1: a 0.2.0 só acrescentou o tipo `svg`.

## Limitações

- Temas que já desenham algo no `::before` do nome da pasta podem brigar com o símbolo.
- As classes do explorador (`nav-folder-title`, `nav-folder-title-content`, `nav-folder-children`) não são API documentada; conferidas no Obsidian 1.14.4.
- SVG do vault: só arquivos `.svg` de até 100 KB (o arquivo inteiro vai para a stylesheet). PNG, JPG e arquivos de fora do vault não são aceitos. O SVG é desenhado como imagem, então fontes externas, scripts e links dentro dele não funcionam; um arquivo sem `xmlns` recebe o namespace na hora de desenhar. Com "Usar a cor da pasta", tudo o que o arquivo desenha vira uma cor só (um logo colorido vira silhueta).

## Desenvolvimento

```bash
pnpm --filter folder-style dev
pnpm --filter folder-style test
```

O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/folder-style/` (e para os vaults ligados com `pnpm link-plugin`).

## Idiomas

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`.

## Status

0.2.0: símbolo de arquivo SVG do vault. 0.1.0: MVP completo. Verificado no Obsidian 1.14.4 (desktop, mobile emulado, temas claro e escuro). Casos de teste em `dev-vault/Folder Style/index.md`. Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/folder-style-spec.md`.
