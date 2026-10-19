---
id: ADR-005
title: Templates próprios com semente em Documento JSON (inclui template GitHub)
status: rascunho
date: 2026-10-17
decide: dono
evidence: "TemplatesPanel/TemplatesBrowser e conteúdo em backend/data/templates no Doory; src/lib/document.ts:112-202; src/app/lazyPages (padrão React.lazy)"
mirror: "nenhum — ao aprovar, espelhar em src/lib/templates/* + chaves templates.* nos 3 locales"
---

# ADR-005 (rascunho) — Templates próprios com semente em Documento JSON

> Proposta. Não aprovada, não implementada. Investigação não decide arquitetura.

## Contexto

O Doory tem `TemplatesPanel.tsx` + `TemplatesBrowser.tsx` e conteúdo semeado em
`backend/data/templates`. O Fremit precisa de starters próprios (a Fatia 2 prevê 10 starters
Fremit, não Doory) e o dono pediu um template para projetos GitHub.

## Proposta

1. Template = `{ id, nome, formato, thumbnail, build(): FremitDocument }` — a semente é construída
   com os factories de `src/lib/document.ts:112-202`, nunca JSON de terceiro.
2. Template GitHub = semente poster/banner com slots + preenchimento runtime via `fetch` a
   `api.github.com` no cliente, com fallback offline para placeholders (nunca quebra sem rede;
   mesmo endpoint que `vite.config.ts:59-96` usa em build, mas aqui em runtime e opcional).
3. Painel em chunk lazy (`React.lazy`, padrão de `src/app/lazyPages.ts`); thumbnails renderizadas
   do próprio documento.

## Consequências se aprovada

- Nenhum conteúdo Doory entra em `src/` por esta via (sem AAL por templates).
- 10 starters + 1 GitHub com round-trip `serialize→parse` como teste de aceitação.
