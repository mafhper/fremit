---
id: ADR-008
title: Runeicons vendorizada como dados (ícones Apache-2.0) + workspace switch em Stickers
status: rascunho
date: 2026-10-18
decide: dono
evidence: "runeicons/LICENSE (dual Parte 1/Parte 2); runeicons/lib/icons/manifest.generated.ts (220/216/127/215/135); src/lib/stickers.ts:23-34; src/components/editor/canvas/panels/StickersPanel.tsx:64-88; src/components/editor/canvas/panels/registry.ts:87-89,121-129; src/store/useStore.ts:435-436,471-493"
mirror: "nenhum — ao aprovar, espelhar em dados runeicons/* + manifesto local + aba Ícones no StickersPanel (lazy) + chaves icons.* nos 3 locales + NOTICE de atribuição"
---

# ADR-008 (rascunho) — Runeicons como dados + workspace switch em Stickers

> Proposta. Não aprovada, não implementada. Investigação não decide arquitetura.

## Contexto

O dono quer a Runeicons inteira dentro de Stickers (vasta, classificada, dualtone), com
switch de workspace (grid + propriedades cor/gradiente) ao abrir o painel. O catálogo da
Runeicons a lista com 529 stars e 5 estilos, e o clone (@ `2f2a86a`) traz 919 arquivos de arte
nos 5 estilos, com o manifesto canônico
`{ id, name, category, tags, availability }` (`manifest.generated.ts`) e dualtone real de
dois slots. A licença é dual: ícones
(`public/*`, `lib/icons`, `packages/`) sob Apache-2.0 pura; Site Software
(`app/(workspace)/icons`, `app/(workspace)/editor`, componentes, animações) sob
Apache-2.0 + Attribution + Commons Clause (sem venda).

## Proposta

1. Vendorizar **só a Parte 1** (allowlist: `public/{normal,duotone,fill,pixelated,glass-icons}/**`
   + `lib/icons/manifest*`): SVGs como arquivos estáticos sob demanda por `id` + manifesto
   local; metadados no chunk lazy dos Stickers, zero SVG de ícone no chunk `/editor`
   (teto de 130 kB gzip).
2. Switch `[Stickers | Ícones]` no topo do painel (estado local, nunca no documento);
   aba Ícones = busca + categoria + estilo + grid + inspector (cor primária/secundária,
   gradiente); código próprio, **nada de `app/(workspace)/*`**.
3. Inserção congela o SVG final como `image` data-URL (schema v1 intacto, export nas
   4 rotas no dia 1); recolor pós-inserção = re-inserir. Tipo `icon` paramétrico fica
   desenhado mas adiado (só sob pedido explícito do dono).
4. Crédito voluntário (NOTICE + link runeicons.com no Sobre), mesmo a Parte 1 não exigindo;
   registro escrito de que nada da Parte 2 entrou em `src/`.

## Consequências se aprovada

- Busca/classificação instantâneas sobre manifesto local; previews com fetch + cache;
  grid virtualizado/paginado (900+ nós inline é o risco de perf).
- Aba Stickers atual (10 próprios) inalterada; inserção com cor verificada por pixel no
  export + vetor no SVG.

## Registro de execução (2026-10-18) — troca 1:1 dos ícones do UI (sem conteúdo)

> Fato executado sob o allowlist da Parte 1 deste rascunho; a proposta do workspace
> switch (aba Ícones) continua pendente e não foi tocada.

- **Ids confirmados (sem chute):** 22 ícones do estilo `normal` — 18 do UI do
  editor + 4 de chrome (menu/globe/moon/sun) —, conferidos no
  `manifest.generated.ts` (clone == upstream `main` `2f2a86a`, 2026-10-11) **e** no
  runeicons.com ao vivo (sonda de navegador, 2026-10-18): `arrows-chevron-down`,
  `arrows-chevron-up`, `code-copy`, `code-link-2`, `documents-clipboard`,
  `identity-lock`, `identity-lock-open`, `indicators-check`, `indicators-plus`,
  `indicators-x`, `layouts-layers-2`, `layouts-menu`, `nature-cloud-upload`,
  `nature-moon`, `nature-sun`, `other-globe`, `playback-image`,
  `playback-images`, `senses-eye`, `senses-eye-off`, `tools-sparkles`, `tools-trash-2`.
- **Vendoring:** um módulo TSX por ícone em `src/components/icons/rune/` (geometria
  1:1; só a cor de traço vira `currentColor`), moldura compartilhada em
  `src/components/icons/RuneIcon.tsx` (aria-hidden por padrão, `label` opcional).
  Sem barrel e sem `runeicons-react` com `name: string` — cada consumidor importa
  o módulo que usa, e o chunk só vê o que importa (cada geometria aparece 1× nos
  chunks).
- **Sem contraparte 1:1 no estilo normal (mantidos lucide/AppIcons):** Type, Shapes,
  PaintBucket, Templates, Sticker, Palette, Files, zoom (ZoomIn/ZoomOut), Maximize,
  Circle, Square — o `normal` tem 223 ids e não inclui ícones de tipo, forma,
  pincel, template, sticker, paleta, files, zoom nem maximize. O rail fica misto
  por fato, não por descuido. GitHub segue próprio: `public/brand-logos/github.svg`
  existe, mas brand-logos é **Parte 3** (fora do allowlist).
- **Correção de contagem:** o "~913 ícones canônicos" do rascunho não bate com o
  vendor: são **919 arquivos** (@ `2f2a86a`), soma por estilo 221 normal + 218 duotone
  + 129 fill + 215 pixelated + 136 glass = 919; a base canônica de **ids** do estilo
  normal é **223** (dois ícones de bateria não têm arquivo `normal`, por isso o filtro
  de estilo é de disponibilidade) — o que importa para a busca da futura aba Ícones.
- **Licença:** Parte 1 citada no `NOTICE` (ids + commit) + cópia do Apache-2.0 em
  `LICENSES/Apache-2.0.txt` (exigência §4(a) ao redistribuir). Nada da Parte 2/3
  entrou em `src/`.

## Registro de execução (2026-10-18) — aba Ícones: conteúdo total da Parte 1

> Fato executado sob o allowlist da Parte 1 (artwork + manifesto). A aba Ícones
> do `StickersPanel` lazy entrou.

- **Vendoring:** `scripts/vendor-runeicons.mjs` copia 919 SVGs
  (`public/runeicons/{normal,duotone,fill,pixelated,glass-icons}/**`, 1:1, commit
  `2f2a86a`) e gera `src/lib/runeicons/manifest.ts` (359 entradas, 16 categorias;
  por estilo: normal 221, duotone 218, fill 129, pixelated 215, glass 136). O
  script recusa qualquer SVG com conteúdo executável e não lê nenhum caminho da
  Parte 2/3.
- **Painel:** switch `[Stickers | Ícones]` no topo (`stickers-workspace-switch`,
  `role=tablist`); busca + categoria + estilo sobre o manifesto local; grid
  paginado (48/página); previews por `fetch` sob demanda com cache em módulo;
  inspetor de PROPERTIES (Solid/Gradient, primária/secundária; glass sem slots)
  e inserção que congela o SVG final como data-URL `image` (schema v1 intacto;
  recolor pós-inserção = re-inserir, dito no painel).
- **Chunk:** `EditorPage` = **110,94 kB gzip** (≤130; baseline 110,97); o
  manifesto (~8,4 kB gzip) vive no chunk lazy `StickersPanel` (13,44 kB gzip);
  varredura dos `dist/assets/*.js` sem geometria de ícone — "zero SVG de ícone
  no chunk" verificado, não prometido.
- **Testes:** 33 unitários novos (`src/lib/runeicons/*.test.ts`); smoke
  "canvas editor inserts a duotone runeicon with custom colors" (busca → dois
  slots → inserção → pixels vermelho/azul no canvas → fetches same-origin) e
  scan axe do workspace de ícones.
- **Licença:** `NOTICE` ganhou o registro do conteúdo total (Parte 1, commit
  `2f2a86a`, contagens por estilo; Parte 2/3 seguem "NOT REDISTRIBUTED"); cópia
  do Apache-2.0 em `LICENSES/Apache-2.0.txt` inalterada.

## Registro de execução (2026-10-18) — correções da revisão do conteúdo (aba Ícones)

> Achados menores da revisão do conteúdo dos ícones.

- **`useRuneiconSvg` por URL, não por objeto:** o efeito depende da URL do asset
  (estilo + folder + file); recriar o objeto de entrada com o mesmo pedido não
  refaz o efeito (teste conta as chamadas do loader).
- **`aria-controls` sem pendência:** as duas abas do switch apontam para o único
  tabpanel `stickers-tabpanel`; os workspaces continuam lazy (só o ativo monta —
  um painel por aba montaria os 48 previews à toa). Teste de DOM cobre os dois
  estados, o relabel do painel e as setas.
- **Seleção segue visibilidade:** limpa quando o ícone sai dos resultados
  (query/categoria/estilo); trocar de estilo **mantém** a seleção enquanto o ícone
  ainda existe naquele estilo (antes: limpava em toda troca de estilo). O erro de
  inserção limpa ao filtrar e ao selecionar; inserir sem página ativa fica
  desabilitado (antes: no-op silencioso).
- **`replacePaint` aceita as variações documentadas:** aspas simples/duplas,
  espaços no `=`, valor em qualquer caixa e o mesmo paint em `style` inline; o
  script de vendor recusa `<style>`/`class` (paint que o rewrite não enxerga) e
  `src/lib/runeicons/vendoredSet.test.ts` varre os 919 arquivos em CI — 783
  coloráveis sem sobra de slot, 136 glass intactos (mutação da busca → vermelho).
- **Decisões registradas (info), sem mudança de comportamento:** `GRADIENT_ID` fixo
  (`runeicon-gradient`) — cada arquivo congelado é um data-URL autônomo (documento
  próprio), então o id não colide entre ícones inseridos, e o preview mostra um por
  vez; **Home/End fora** do teclado das abas (dois tabs, setas bastam; APG-opcional);
  **cores persistem** na troca de estilo (o hex escolhido continua enquanto se
  comparam estilos; a resolução cai para a cor de desenho quando o campo está vazio).

## Registro de execução (2026-10-18) — atalho do rail: Ícones primeiro, Stickers segundo

> Pedido do dono na sprint do sidebar (ícones mais importante que stickers): rename do
> atalho, abas reordenadas.

- **Rename do rail:** o painel `stickers` virou `icons` — id no registry, label
  `sidebar.icons` nos 3 locales (Icons / Ícones / Iconos) e ícone Runeicons
  **`layouts-layout-grid`** (23º vendored do `normal`, mesmo commit `2f2a86a`;
  `NOTICE` atualizado para 23 / 19 de UI + 4 de chrome).
- **Abas:** `[Ícones | Stickers]` — `IconWorkspace` é a primeira aba e o default (o
  atalho abre direto nela); o pack próprio de stickers foi para a segunda. O rótulo
  da aba Stickers vive agora em `stickers.tab` (`sidebar.*` é o vocabulário do rail,
  chaveado pelo id do painel).
- **Testids:** `icons-workspace-switch` / `icons-tab-*` / `icons-tabpanel` /
  `sidebar-panel-icons`; unit, smoke e a11y atualizados no mesmo passo — sem alias
  legado pendurado.
- **Chunk:** `EditorPage` = **111,98 kB gzip** (≤130; a medição anterior era 111,91);
  o chunk do painel (`StickersPanel`) ficou em 13,60 kB gzip.
