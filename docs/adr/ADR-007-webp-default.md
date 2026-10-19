---
id: ADR-007
title: WebP como formato default de export do /editor (estático); SVG para vetores
status: rascunho
date: 2026-10-18
decide: dono
evidence: "src/lib/export/formats.ts:14,25-29; src/lib/export/registry.ts:19-31; src/lib/export/renderPage.ts:34,128-136,149-158; src/components/editor/canvas/ExportPanel.tsx:30,64-110; src/components/editor/DownloadButton.tsx:2,27-36; tests/export.spec.ts:88-140,207-213,414-432"
mirror: "nenhum — ao aprovar, espelhar em formats.ts + registry.ts + renderPage.ts (WEBP_QUALITY) + ExportPanel default/qualidade + chaves canvas.exportQuality nos 3 locales + matriz do smoke"
---

# ADR-007 (rascunho) — WebP default (estático); SVG para vetores

> Proposta. Não aprovada, não implementada. Investigação não decide arquitetura.

## Contexto

O export do `/editor` conhece PNG/JPG/SVG (`formats.ts:14,25-29`) com default PNG
(`ExportPanel.tsx:30`) e raster via `canvas.toBlob` (`renderPage.ts:128-132`). O dono pediu
WebP como default (compressão + qualidade) e SVG para logos/vetores/ícones, com PNG/JPG só
como opção. O `/mockup` tem export próprio via `html-to-image` (`DownloadButton.tsx:2,27-36`).

## Proposta

1. `ExportFormatId += 'webp'` (`raster:true`); painel abre em `webp`; ordem WebP, PNG, JPG, SVG.
2. Vetores entram e saem como SVG (rota `renderPageSvg`, `renderPage.ts:149-158`); PNG/JPG
   viram opção, nunca default.
3. `WEBP_QUALITY` ao lado de `JPEG_QUALITY` (`renderPage.ts:34`) + controle no painel.
4. `/mockup` congelado nesta fatia (unificação dos exports é trabalho separado).
5. Sniff de suporte `image/webp` com fallback para PNG + `exportError` existente; sem troca
   silenciosa de formato.
6. **WebP animado fora**: `toBlob('image/webp')` de canvas 2D é estático; animado vai para
   a fatia de animação, com MP4/GIF.

## Consequências se aprovada

- Matriz do smoke estendida (9 → 12 artefatos ou teste WebP próprio); `formats.test.ts:20-29`
  e `exporter.test.ts:31-39` atualizados; pixels literais do PNG (`export.spec.ts:207-213`)
  bit-identical como prova de não-regressão.
- Primeira tarefa da fatia: provar `toBlob('image/webp')` no Chromium do CI antes do default.
