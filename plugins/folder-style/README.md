# Folder Style

Símbolo (emoji, caractere ou ícone Lucide embutido no Obsidian) antes do nome da pasta e cor com transparência na linha e na subárvore, só no explorador de arquivos, **sem renomear a pasta**.

## Como funciona

Nada é inserido no DOM do explorador. O plugin gera CSS a partir do `data.json` e o aplica numa stylesheet construída (`document.adoptedStyleSheets`), com seletores pelo `data-path` de cada pasta. O explorador recria as linhas ao expandir, recolher e rolar, e o seletor continua casando.

- Símbolo em texto: `::before` do nome da pasta, na cor da pasta.
- Ícone Lucide: o SVG de `getIcon()` vira uma máscara (`mask-image`) pintada com a cor da pasta ou do tema. Sem rede.
- Cor: presets das variáveis do tema (`--color-red-rgb`…) ou hex; linha com a opacidade base (12 %), hover +6 pontos, pasta ativa ou selecionada +12, subárvore com metade.
- Desligar o plugin remove a stylesheet e todo o visual.
- Renomear ou mover uma pasta pelo Obsidian leva o estilo junto, também das subpastas; apagar remove a entrada.
- Aba de configurações: intensidade da cor, colorir o conteúdo da pasta, tamanho do símbolo e a lista das pastas personalizadas (remover, aviso de ícone inexistente ou de pasta que não existe mais).
- `data.json` alterado fora do Obsidian (sincronização) é recarregado em vez de sobrescrito.
- "Personalizar pasta…" no menu de contexto da pasta (desktop e mobile) e "Editar" na aba de configurações abrem um modal: símbolo (nenhum, texto ou ícone Lucide com busca), cor (8 presets do tema, hex ou nenhuma), prévia ao vivo com o mesmo CSS do explorador, Salvar, Cancelar e "Remover personalização".

## Dados

```json
{
  "version": 1,
  "opacity": 0.12,
  "tintChildren": true,
  "symbolSize": 1,
  "folders": {
    "Estudos": { "symbol": { "kind": "lucide", "value": "book-open" }, "color": { "kind": "preset", "value": "blue" } },
    "Trabalho": { "symbol": { "kind": "text", "value": "💼" }, "color": { "kind": "hex", "value": "#d97706" } }
  }
}
```

## Limitações

- Temas que já desenham algo no `::before` do nome da pasta podem brigar com o símbolo.
- As classes do explorador (`nav-folder-title`, `nav-folder-title-content`, `nav-folder-children`) não são API documentada; conferidas no Obsidian 1.14.4.

## Desenvolvimento

```bash
pnpm --filter folder-style dev
pnpm --filter folder-style test
```

O build vai para `dist/` e é copiado para `dev-vault/.obsidian/plugins/folder-style/` (e para os vaults ligados com `pnpm link-plugin`).

## Idiomas

Todo texto da interface passa por `t()` de `src/i18n/`: inglês em `en.ts` (fonte) e português em `pt-br.ts`.

## Status

Em desenvolvimento: CSS, dados, eventos de pasta, aba de configurações e modal prontos; falta a verificação final e o release 0.1.0. Spec no vault: `1 - Knowledge/Projects/Obsidian Plugins/_Discovery/AI Generated/folder-style-spec.md`.
