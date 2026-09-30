# Attachments Guard: casos de teste

Notas e imagens fictícias nesta pasta e em `Attachments/`. Os comandos movem arquivos de verdade: para voltar ao estado inicial, `git checkout -- dev-vault && git clean -fd dev-vault` na raiz do repo.

| Arquivo | Para quê |
|---|---|
| [[Attachments Guard/relatorio-trimestral\|relatorio-trimestral]] | Colar e arrastar imagens |
| [[Attachments Guard/pesquisa-gerada\|pesquisa-gerada]] | Nota com a tag `ai-generated` |
| [[Attachments Guard/livro-ficticio\|livro-ficticio]] | Capa a renomear |
| [[Attachments Guard/livro-a\|livro-a]] e [[Attachments Guard/livro-b\|livro-b]] | Mesma capa em duas notas |
| [[Attachments Guard/filme-com-url\|filme-com-url]] | Capa por URL |
| [[Attachments Guard/html\|html]] | Imagem só num `<img>` |
| [[Attachments Guard/mural.canvas\|mural]] | Imagem só num canvas; colar no canvas |
| `Soltos/` | Quatro anexos fora de `Attachments/`, usados por [[Attachments Guard/Soltos/portal-alfa\|portal-alfa]] e [[Attachments Guard/Soltos/Portal Beta/index\|Portal Beta]] |

## Preparação

- [ ] Na raiz do repo, `pnpm --filter attachments-guard dev`. Confira **Attachments Guard** ativo em Plugins da comunidade.
- [ ] Para o teste de canvas, ative o plugin nativo **Tela** (Canvas), desligado neste vault.

## Anexos novos

- [ ] Copie uma imagem (captura de tela) e cole na `relatorio-trimestral`: aparece `![[relatorio-trimestral-1.png]]` e o arquivo está em `Attachments/`. Cole de novo: `-2`.
- [ ] Arraste do Finder uma imagem com nome descritivo (de fora do vault): o nome fica. Arraste uma chamada `IMG_1234.jpg`: vira `relatorio-trimestral-3.jpg`.
- [ ] Cole na `pesquisa-gerada`: o arquivo vai para `Attachments/AI Generated/pesquisa-gerada-1.png`.
- [ ] Abra o `mural` e cole uma imagem: `Attachments/mural-1.png`, e o cartão mostra a imagem.
- [ ] Arraste do Finder uma imagem para a pasta `Attachments Guard` no explorador: 2 segundos depois ela vai para `Attachments/` e um aviso diz para onde (nome genérico → a data, `2026-…-1.png`).
- [ ] Desligue **Organizar automaticamente** e cole: vale o Obsidian (`Attachments/Pasted image ….png`). Ligue de novo.
- [ ] Em **Aviso de tamanho**, ponha `0.01` e cole uma imagem: aviso "… tem … (limite: 10 KB)". Volte para 10.
- [ ] Em **Nome para arquivos genéricos**, digite `{nota}-{n}`: "Variável desconhecida: {nota}." e o padrão não é salvo. Digite `{date}-{name}`: o **Exemplo** muda. Volte para `{note}-{n}`.

## Capas

- [ ] Na `livro-ficticio`, preencha `cover` com `[[capa-provisoria.png]]`: o arquivo vira `livro-ficticio-cover.png`, e a propriedade e o embed do corpo passam a apontar para ele.
- [ ] Renomeie a `livro-ficticio` para `o-farol-de-vidro`: a capa vira `o-farol-de-vidro-cover.png`.
- [ ] Edite a `livro-a` (mude o título): `capa-compartilhada.png` não muda, porque a `livro-b` também a usa.
- [ ] Edite a `filme-com-url`: nada acontece.

## Recolher anexos soltos

- [ ] Rode **Recolher anexos soltos**: a janela lista os quatro arquivos de `Soltos/` com o destino (`diagrama-de-rede.png` mantém o nome; os dois `logo.png` e o `IMG_4521.png` viram `portal-alfa-1`, `portal-beta-1` e `portal-beta-2`). Cancele: nada muda.
- [ ] Rode de novo e confirme: a `portal-alfa` e a `Portal Beta` mostram as imagens, com links para os nomes novos (inclusive o link markdown `![Foto da equipe](…)`). As pastas `assets/` ficam, vazias.
- [ ] Rode de novo: "Nenhum anexo solto: está tudo em Attachments."

## Anexos órfãos

- [ ] Rode **Listar anexos órfãos**: aparece `orfao-sem-link.png` (e o que os testes acima deixaram sem link), com miniatura, pasta e tamanho. Não aparecem `usado-no-canvas.png` (só no `mural`) nem `usado-em-html.png` (só no `<img>` da `html`).
- [ ] Desmarque um e confirme: os marcados vão para `.trash/Attachments/` (veja no Finder), o desmarcado continua em `Attachments/`.
- [ ] Rode de novo até não sobrar nenhum: "Nenhum anexo órfão."

## Idioma

- [ ] Com o Obsidian em inglês (**Settings → General → Language**, reiniciar), comandos, configurações, avisos e janelas aparecem em inglês.
