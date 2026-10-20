---
id: ADR-009
title: Export na web por download do navegador; app desktop (Tauri) adiado
status: aceita
date: 2026-10-19
decide: dono
evidence: "src/lib/saveBlob.ts e src/lib/export/download.ts (os dois caminhos de salvamento); tests/home-export.spec.ts mede o PNG baixado com WebGL ativo e bloqueado"
mirror: "o contrato executável são os dois módulos de download + tests/home-export.spec.ts; este ADR registra o porquê do adiamento"
---

# ADR-009 — Export na web por download do navegador; desktop adiado

> Decisão vigente. Este repositório não tem `src-tauri` nem depende de pacotes Tauri.

## Contexto

O export termina hoje em dois módulos que fazem a mesma coisa por caminhos separados:

| Origem | Módulo | Uso |
|---|---|---|
| Home, imagem emoldurada | `src/lib/saveBlob.ts` | PNG composto pelo shader + `computeExportLayout` |
| `/editor`, painel de export | `src/lib/export/download.ts` | PNG/JPG/SVG/WebP renderizados do Documento JSON |

Os dois criam um object URL e clicam num `<a download>`. Na web isso é o caminho correto e
verificável: o arquivo sai com o nome sugerido e os bytes podem ser medidos.

Numa webview de app desktop o atributo `download` não é um caminho confiável de salvamento — não há
diálogo do sistema nem garantia de destino. O caminho correto é `plugin-dialog` (escolher o
arquivo) + `plugin-fs` (gravar os bytes). Esse shell ainda não existe no repositório; o ADR-003 já
trata o Tauri como fatia futura.

## Decisão

1. **Web é a entrega, e ela fecha sem o desktop.** A aceitação do export é o arquivo baixado pelo
   navegador: dimensões batem com o formato escolhido e os pixels amostrados batem com o layout e
   com a imagem emoldurada. Com WebGL indisponível, o fundo do PNG é a cor chapada do tema, e o
   download continua funcionando.
2. **Desktop fica pendente, sem bloquear a web.** Não entra `src-tauri`, nem `plugin-dialog`, nem
   `plugin-fs` agora. Nenhum teste web deve depender de um shell desktop para passar.
3. **Os dois módulos são os pontos de troca.** Quando o app desktop entrar, `saveBlob` e
   `downloadArtifact` são os lugares onde a escolha por ambiente acontece. A assinatura útil é a
   mesma dos dois: um Blob (ou artefato) e um nome de arquivo. O caminho desktop deve ser coberto
   pelos dois, ou `downloadArtifact` passa a delegar a `saveBlob` para existir um único caminho.
   Essa consolidação não foi feita aqui de propósito: refactor e aceitação não devem viajar no
   mesmo commit.

## Critério pendente do desktop

Quando o shell existir, a verificação é na build desktop (não no CI web):

- escolher salvar abre o diálogo nativo;
- confirmar grava os bytes exatos do Blob no caminho escolhido;
- cancelar não grava arquivo, não navega e não dispara erro;
- o nome sugerido é o do artefato (`fremit-hero.png`, `fremit-poster.png`, ...).

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Confiar no atributo `download` dentro da webview | Não abre diálogo nem garante destino; falha silenciosa no desktop. |
| Implementar `src-tauri` nesta fatia | O shell não existe; adicionaria dependências e um alvo de build sem entrega web correspondente. |
| Consolidar os dois módulos agora | Mistura refactor com a aceitação e amplia a superfície do commit sem mudar comportamento. |
| Exportar só no desktop | A web é a entrega atual; o caminho desktop é conveniência futura, não pré-requisito. |

## Onde isso é verificável

| O quê | Onde |
|---|---|
| Contrato web (home) | `src/lib/saveBlob.ts` |
| Contrato web (editor) | `src/lib/export/download.ts` |
| Medida do PNG baixado (formato, dimensões, pixels) | `tests/home-export.spec.ts` |
| Ausência de shell desktop | `src-tauri/` não existe; `package.json` sem `@tauri-apps/*` |

## O que a próxima sessão precisa saber

1. **A web está fechada; não bloqueie a entrega por causa do desktop.**
2. **Não use o atributo `download` como prova de desktop.** Ele é o contrato da web, e só dela.
3. **Se consolidar os dois módulos, faça um commit próprio** e cubra as duas chamadas: home e
   painel do editor.
4. **A cor de fallback do PNG é decisão da Home** (`#cfe5fb` no tema claro, `#0b1020` no escuro),
   não do módulo de salvamento — o save recebe o Blob já composto.
