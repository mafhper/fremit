---
id: ADR-003
title: Crédito AAL proeminente na web (Fatia 1) e no futuro Tauri
status: rascunho
date: 2026-10-17
decide: dono
evidence: "LICENSE do Doory (13 linhas não-brancas; 24 linhas cruas em editor / 23 POSIX, medido em 2026-10-17); NOTICE:5-7 do clone (texto literal do crédito)"
mirror: "nenhum — ao aprovar, espelhar em NOTICE-equivalente versionado + componente de crédito visível"
---

# ADR-003 (rascunho) — Crédito AAL proeminente na web (Fatia 1) e no futuro Tauri

> Proposta. Não aprovada. Fatos de licença, sem parecer jurídico.

## Contexto

A licença do Doory (Attribution Assurance License, `LICENSE` com 13 linhas não-brancas —
cruas 24 em editor / 23 POSIX — no clone, medido em 2026-10-17; convenções de contagem do projeto)
condiciona a redistribuição de código, integral ou parcial, com ou sem modificação,
à exibição proeminente do texto em forma verificável (`LICENSE:11` do clone) e, na forma
binária, à atribuição com nome, papel e URL a cada start (`LICENSE:13-15` do clone: nome
"Siam", papel "Creator and maintainer of Doory", URL do repositório). O `NOTICE:5-7` do clone
fixa o texto literal e onde ele vai na web: mantido junto ao produto e exibido proeminentemente
a cada start — para web app, nas páginas.

## Proposta

1. **Gatilho:** qualquer trecho de código Doory que entrar em `fremit/src/` ativa esta obrigação
   desde a Fatia 1. Reescrita limpa da ideia não a ativa — mas a linha entre inspiração e
   derivação é jurídica, não técnica.
2. **Web (Fatia 1):** crédito literal nas páginas — posição proposta: rodapé do editor/sobre,
   em `en-US`, `pt-BR` e `es` (nome, papel e URL nunca traduzidos; o rótulo ao redor, sim).
   Entrada correspondente em `NOTICE`-equivalente do Fremit.
3. **Tauri (fatia 4):** splash ou banner a cada start com os três itens (nome/papel/URL).
4. **Furos herdados registrados, sem julgar:** `LICENSE` exige "GPG-signed text" em forma
   verificável mas não contém bloco de assinatura (13 linhas não-brancas, sem `PGP SIGNATURE` — medido);
   o crédito literal não foi localizado em `frontend/src`/`index.html` do clone.
   Decisão do dono sobre a forma "verificável".

## Consequências se aprovada

- Primeiro trecho copiado já entra com crédito visível + entrada de proveniência (qual arquivo
  Doory, qual commit `cc28508`, o que foi adaptado).
- Sem código Doory na Fatia 1: registra-se por escrito que nada foi copiado, e o crédito sai
  do caminho crítico da fatia.
