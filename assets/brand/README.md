# Marca Fremit — guia de uso

Identidade do Fremit: um **F-moldura sólido** — a inicial do produto construída
como barras espessas de moldura, com o bloco claro da imagem emoldurada. É o
que o produto faz — emoldurar links, capturas e imagens para exportar — sem
desenho line-art fino: todas as formas são preenchidas e densas, legíveis do
header (36px) ao favicon (16px).

## Arquivos (fonte × derivado)

| Arquivo | Papel |
|---|---|
| `logo.svg` | **SVG-mãe editável** (`viewBox 0 0 512 512`): símbolo + wordmark em paths vetoriais, sem `<text>` |
| `logo-dark.svg` | Par dark padrão, derivado da mãe com ids sufixados `-d` (visuais idênticos — a mãe já nasce dark-first). Regenere a partir da mãe; nunca edite aqui |
| `logo-light.svg` | Par light: mesma geometria da mãe; wordmark em navy `#15263F` e bloco em azul `#1E4FB4`. Regenere a partir da mãe; nunca edite aqui |
| `icon.svg` | Símbolo em **placa própria** (badge `512`, cantos `112`) — não é o logo espremido: o F-moldura é recentralizado e o wordmark sai |
| `favicon.svg` | Versão mínima para a aba (`viewBox 0 0 64 64`): mesma construção, proporções simplificadas |
| `bg-hero.webp` | Arte de fundo do projeto (fundo 1× do hero, ao lado do par 2× servido no site) |

Regra: **nunca edite um derivado** — regenere a partir da `logo.svg`. Os rasters
(PNG/ICO/WebP) são rasterizações dessa mesma família, geradas no Chromium.

## Paleta

Herdada dos tokens do projeto (Cool Blues), funciona sobre fundo escuro
primeiro (`#0d1117`, igual ao token `--background` `215 28% 7%` do tema dark);
a variante light deriva, não redesenha. O badge tem placa própria
(`#14315E` → `#0B1730`), legível sobre shader claro e escuro:

- Barras do F (3 paradas): `#1E4FB4` → `#2B7DE9` → `#54CDF8`
- Barra média (2 paradas): `#9CD4F7` → `#3DC2F7`
- Bloco da imagem: `#EDF2FA` (dark) · `#1E4FB4` (light)
- Wordmark dark-first: `#EDF2FA` · Wordmark light: `#15263F`

O halo radial é propriedade do lockup (`logo*.svg`) — badge (`icon.svg`) e
`favicon.svg` não têm halo por decisão, não por omissão.

## Uso previsto na interface

- **Header do site e do editor** (`ProductLayout`, `MainLayout`): `icon.svg` a `h-9 w-9`, ao lado do nome "Fremit" em texto HTML (o nome nunca vai assado no raster do header). O badge escuro próprio sustenta o ícone sobre o shader full-screen claro ou escuro do promo-site futuro.
- **Favicon** (`index.html`): `favicon.svg` + PNGs 16/32/192/512 + `apple-touch-icon-180.png` + `favicon.ico` (16/32/48), todos declarados como links de ícone e servidos a partir de `public/`. Validado em aba real a 16px: o F e o bloco claro continuam distinguíveis.
- **Hero**: sem texto e sem borda — texto vive no HTML do projeto, nunca queimado na imagem. Servido em `public/brand/hero.webp` + `hero@2x.webp`; ainda não é referenciado por código (aguarda o promo-site) e não entra no bundle.
- **Cartão social**: `og:image` e `twitter:image` = `brand/banner-github.png` (1280×640, PNG — decodificado por qualquer scraper de preview). Mesma arte em WebP no par derivado (`brand/banner-github.webp`; `og.webp` fica como o mesmo cartão no caminho antigo), para onde a plataforma preferir WebP.

## Onde cada arte é servida

| Superfície | Arquivos |
|---|---|
| `assets/brand/` (fonte) | set SVG (mãe + pares + ícone + favicon), `bg-hero.webp` e este guia |
| `public/` (site) | `icon.svg`, `favicon.svg`, `favicon-16/32/192/512.png`, `apple-touch-icon-180.png`, `favicon.ico`, `og.webp`, `brand/hero.webp`, `brand/hero@2x.webp`, `brand/banner-github.png`, `brand/banner-github.webp` |
| `docs/` (GitHub) | `images/brand/banner-github.png` + `.webp` — social preview do repositório (o GitHub aceita PNG/JPG/GIF: o PNG é o que se envia, o WebP fica como fonte); `images/releases/release.webp` — arte do release; `readme/promo-card.webp` — cartão para o README raiz |

**Sentido da sincronia**: `assets/brand/` é a **fonte** (editável) — edite ali e regenere os
derivados; `public/` é o que o **site serve** (chega pronto em `dist/`); `docs/` existe só para
a **superfície social do repositório** (social preview, arte de release, cartão do README).
Nada em `docs/` é servido pelo app; nada em `public/` é lido pelo GitHub.

**Tripla idêntica (intencional)**: `public/og.webp`, `docs/images/releases/release.webp` e
`docs/readme/promo-card.webp` são o **mesmo cartão** — `sha256 bde3c545…`, 10.498 B cada — um
único artefato replicado em três lugares por desenho, não duplicação acidental. Regenere os
três juntos a partir da fonte.

## Contraste (WCAG 2.1 — medido por luminância relativa)

- **Texto (AA 4.5:1)** — wordmark `#EDF2FA` sobre `#0d1117`: **16.84:1** · wordmark light `#15263F` sobre branco: **15.21:1**.
- **Não-texto (AA 3:1)** — bloco claro sobre badge: **15.84:1** · barra clara sobre badge: **9.72:1** · barra média sobre badge: **4.42:1** · barra média-clara (stop 1) sobre badge: **11.17:1** · bloco light sobre branco: **7.41:1**.
- **Isenção declarada (decorativa, não-textual)** — a borda do badge (`#14315E` sobre `#0d1117`: **1.47:1**) e a adjacência escura do gradiente (`#1E4FB4` sobre `#14315E`: **1.74:1**) são relevo de forma, sem informação nem texto embutidos. Não usar como cor de texto, como contorno informativo único, nem como único indicador de estado — todo texto sobre a marca usa os wordmarks acima (que passam AA).

## Pendente

- `src-tauri/icons`: segue o gerador do Tauri quando o app Tauri existir — fora do set.
- Embed do `promo-card.webp` no README raiz: decisão de copy em aberto.
- Tipografia do wordmark: lettering monoline geométrico próprio (capitais); se o projeto adotar uma fonte display, o wordmark é redesenhado a partir dela com justificativa registrada aqui.
