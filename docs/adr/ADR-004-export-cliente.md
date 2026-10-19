---
id: ADR-004
title: Export no cliente a partir do JSON (PNG/JPG/SVG na Fatia 1)
status: rascunho
date: 2026-10-17
decide: dono
evidence: "export do Doory: exporter.ts (84 linhas não-brancas; 93 cruas em editor) + registry.ts (98 não-brancas; 110 cruas em editor), medidos em 2026-10-17; DownloadButton.tsx:15-36 do Fremit (html-to-image hoje)"
mirror: "nenhum — ao aprovar, espelhar em src/lib/export/* + remoção de html-to-image do caminho de export"
---

# ADR-004 (rascunho) — Export no cliente a partir do JSON

> Proposta. Não aprovada, não implementada.

## Contexto

O export atual do Fremit é screenshot de DOM (`toPng`/`toJpeg` do nó `#fremit-preview`,
`src/components/editor/DownloadButton.tsx:15-36`), restrito a PNG/JPG
(`DownloadButton.tsx:61-69`). O Doory separa orquestração (`exporter.ts`, 84 linhas não-brancas;
cruas 93 em editor / 92 POSIX) de registro de formatos (`registry.ts`, 98 não-brancas; cruas 110
em editor / 109 POSIX) e renderiza sempre do documento JSON, nunca do canvas vivo. As contagens
acima são de linhas cruas do editor, medidas em 2026-10-17 sem modificar o clone.

## Proposta

1. **Arquitetura:** orquestrador + registro de formatos; cada formato recebe o documento JSON e
   devolve arquivo — nunca lê o canvas vivo nem o DOM.
2. **Formatos da Fatia 1:** PNG/JPG primeiro (paridade com o atual), SVG em seguida. PDF (`jspdf`),
   GIF/MP4/WebM ficam para as fatias 3/5.
3. **Transição:** `html-to-image` coexiste até o export novo passar no critério de aceitação da
   fatia; depois sai do caminho de export (dependência só sai do `package.json` com Dependency
   Guard verde).
4. **i18n:** strings novas nos três locales (`src/i18n/messages.ts:160-166`).

## Consequências se aprovada

- Contrato de formato versionado (schema do JSON é a API do exportador).
- O critério de aceitação da fatia: 9 artefatos (3 formatos × 3 tamanhos).
