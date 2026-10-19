---
id: ADR-006
title: Animação por presets sem áudio (schema + preview; export fica na Fatia 3)
status: rascunho
date: 2026-10-17
decide: dono
evidence: "presets do Doory: builtinInOut.ts:183-207 + builtinTransitions.ts:80-87+; padrão useReducedMotion do hero do Fremit"
mirror: "nenhum — ao aprovar, espelhar em schema v2 (animation/transition) + src/lib/animate/* + chaves animate.* nos 3 locales"
---

# ADR-006 (rascunho) — Animação por presets sem áudio (schema + preview)

> Proposta. Não aprovada, não implementada. Investigação não decide arquitetura.

## Contexto

O Doory registra 27 enter/exit + 12 emphasis + 16 transitions via `reg({id,label,defaults,effect})`,
mas o player é DOM/canvas 2D e o Fremit quer CSS/Fabric primeiro, shaders depois (Fatia 3).
O dono pediu Element/Page (Fade/Rise/Pop/Slide/Words/Typewriter/Wipe/Focus) +
transições (None/Fade/Dip/Dissolve/Blur/Slide/Push/Cover/Uncover/Zoom/Wipe/Circle/Flip/Spin/Blinds)
e excluiu Audio.

## Proposta

1. Reescrever só o **modelo de registro** (`{id,label,defaults}` por preset); player próprio de
   preview no canvas. `Words` = stagger por palavra (granularidade própria); `Dip` = especificar na
   execução ou cortar com registro.
2. Schema v2: `animation?: { preset, durationMs, easing, direction }` por objeto + `transition?`
   por página; build sem o chunk animate ignora os campos sem erro.
3. Preview respeita `prefers-reduced-motion` (estende `useReducedMotion` do hero); export MP4/GIF
   continua na Fatia 3 do roadmap. Nenhum campo de áudio no schema.

## Consequências se aprovada

- Painel Animate em chunk lazy; presets pré-visualizam sem exportar.
- Sem código Doory copiado por esta via (sem AAL por animação); sem `.ogg`/audio no bundle.
