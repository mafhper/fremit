# Decisões arquiteturais (ADRs)

Registro das decisões de arquitetura do Fremit. Cada arquivo descreve o contexto, a decisão, as
alternativas descartadas e o que uma sessão futura precisa saber para não reabrir o que já foi
decidido.

O ADR registra o **porquê**. O contrato executável de cada decisão vive no código ou na
configuração indicada em *Onde isso é verificável* — o documento não substitui o contrato.

| ADR | Título | Status | Data |
|---|---|---|---|
| [ADR-001](ADR-001-release-core.md) | Primeira versão `0.1.0` e adoção do release-core (arquétipo A, web) | aceita | 2026-09-30 |
| [ADR-002](ADR-002-engine-canvas.md) | Engine do canvas dedicado da Fatia 1 | rascunho | 2026-10-17 |
| [ADR-003](ADR-003-licenca-credito-AAL.md) | Crédito AAL proeminente na web (Fatia 1) e no futuro Tauri | rascunho | 2026-10-17 |
| [ADR-004](ADR-004-export-cliente.md) | Export no cliente a partir do JSON (PNG/JPG/SVG na Fatia 1) | rascunho | 2026-10-17 |
| [ADR-005](ADR-005-templates-proprios.md) | Templates próprios com semente em Documento JSON (inclui template GitHub) | rascunho | 2026-10-17 |
| [ADR-006](ADR-006-animate-sem-audio.md) | Animação por presets sem áudio (schema + preview; export fica na Fatia 3) | rascunho | 2026-10-17 |
| [ADR-007](ADR-007-webp-default.md) | WebP como formato default de export do `/editor` (estático); SVG para vetores | rascunho | 2026-10-18 |
| [ADR-008](ADR-008-runeicons.md) | Runeicons vendorizada como dados (ícones Apache-2.0) + workspace switch em Stickers | rascunho | 2026-10-18 |

**Status:** `aceita` = decisão vigente; `rascunho` = proposta registrada, ainda não aprovada nem
implementada.
