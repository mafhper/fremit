---
id: ADR-002
title: Engine do canvas dedicado da Fatia 1
status: rascunho
date: 2026-10-17
decide: dono
evidence: "código do Doory (engine de canvas); package.json do Doory fixa fabric ^7.2.0 (medido em 2026-10-17); NOTICE:15-16 do clone (Fabric.js MIT)"
mirror: "nenhum — proposta ainda sem reflexo versionado; ao aprovar, espelhar em package.json + documento de arquitetura"
---

# ADR-002 (rascunho) — Engine do canvas dedicado da Fatia 1

> Proposta. Não aprovada, não implementada. Investigação não decide arquitetura.

## Contexto

O Fremit não tem canvas próprio: `/editor` delega a `MainLayout` (`src/pages/EditorPage.tsx:1-5`,
`src/app/router.tsx:22-25`). O Doory prova que Fabric 7.2 sustenta o modelo
(`engine/api/insert.ts`, `engine/objects/` com 20 arquivos), mas o Fremit hoje não declara
`fabric` (`package.json:17-39`) e o Doory o fixa em `^7.2.0` (medido em 2026-10-17).

## Opções

| Opção | Pró | Contra |
|---|---|---|
| A. Fabric 7.2 | Prova pronta em `engine/`; MIT segundo `NOTICE:15-16` do clone | Bundle pesado em site estático (`/fremit/`, GH Pages); qualquer código copiado ativa a obrigação AAL (ADR-003) |
| B. Reescrita fina / alternativa | Sem AAL se for reescrita limpa da ideia (conceito, não código); bundle sob controle | Sem referência viva; custo de implementação maior; a linha "inspirado vs. derivado" é jurídica, não técnica |

## Proposta

Contrato único qualquer que seja a engine — Documento JSON → Render → Export do JSON, nunca do
canvas vivo (regra do Doory em `export/registry.ts:12-30`). Desempate por medição: spike com 1 página
de 10 objetos comparando bundle final + pico de memória; assinar só com números.

## Consequências se aprovada

- `package.json` ganha a engine + tipos; a documentação de arquitetura do repositório passa a listar
  a decisão.
- Se opção A com cópia de código: ADR-003 aplica-se automaticamente desde o primeiro trecho.
