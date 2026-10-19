---
id: ADR-001
title: Primeira versão 0.1.0 e adoção do release-core (arquétipo A, web)
status: aceita
date: 2026-09-30
decide: dono
evidence: "PR #50 (merge 3be3d69) · tag v0.1.0 · https://github.com/mafhper/fremit/releases/tag/v0.1.0"
mirror: "a decisão está versionada em .github/release.config.json; este ADR registra o porquê"
---

# ADR-001 — Primeira versão 0.1.0 e adoção do release-core

> **Este ADR registra uma decisão que já está versionada.** O contrato executável é
> `.github/release.config.json` no repositório: ele sobrevive a outra máquina, a outro ano e a outra
> pessoa. O que este documento acrescenta é o **porquê** — o raciocínio que o JSON não carrega, e que
> a sessão que vier precisa para não re-decidir o que já foi decidido.

## Contexto

O Fremit estava no ar desde o primeiro `deploy.yml`, com mais de cem commits publicados e **nenhuma
tag**. O aviso recorrente de consistência de versão — *"nunca publicado: declara X e não há tag vX"* —
contava um fato verdadeiro, e o ponto dele não era o deploy: o deploy contínuo existia e funcionava.
O que faltava era a **release** — a tag, a nota e a imagem que dão nome ao que já está no ar.

Sem versão, quem consome https://mafhper.github.io/fremit/ não tem como dizer de qual versão está
vendo. Isso é a diferença entre publicar e versionar.

## Decisões

### 1. Primeira versão: `0.1.0`, não `1.0.0`

O `package.json` estava em `0.0.0`, que não é uma versão que valha publicar. Entre `0.1.0` e `1.0.0`,
a escolha é `0.1.0`: o projeto tem 14 testes para 46 arquivos de fonte e nenhuma medida de
cobertura do que o editor faz. `1.0.0` prometeria estabilidade que ainda não foi medida.

**Custo aceito de propósito:** a linha `0.1` é a linha de evolução. Entrar na `1.0` depois é um
salto de linha, não um ajuste.

### 2. Arquétipo A — web, sem artefato

O build é um site estático servido pelo GitHub Pages. O resultado do build é assunto do deploy, não
de um asset de release: o GitHub já publica o arquivo-fonte de cada tag nativamente, e uma segunda
cópia seria enfeite. A release carrega **versão, notas e uma imagem editorial**. Referência do
portfólio: `spread`, com `aurawall` como exemplo mais próximo (npm, sem artefato).

### 3. Release e deploy continuam separados

Um push em `main` continua rodando `deploy.yml` a cada merge, intocado. Uma tag `vX.Y.Z` roda o
protocolo de release. São perguntas diferentes — *"qual versão foi produzida e validada?"* contra
*"o que está publicado agora?"* — e por isso os dois gatilhos coexistem em vez de um substituir o
outro.

Consequência que vale lembrar: o `npm run build` do gate de release **não é redundante** com o
deploy. Ele valida o commit exato para onde a tag aponta, que não é necessariamente o último `main`
que fez deploy.

### 4. A imagem é hard gate, e é o que trava

`required: true` — sem arte o workflow falha. A arte inicial (1440×900, 12.658 B) é a marca do
projeto com o wordmark, e não um gradiente anônimo: `title_in_body: false` porque a imagem já
carrega o nome, e o H1 repetiria o que está a dois pixels de distância.

**A próxima linha vai exigir arte nova.** Com `granularity: "minor"`, ao entrar na `0.2` a
`release.webp` atual faz o workflow **falhar** até que entre uma arte nova. Isso é o gate
funcionando, não defeito — e é o que impede a arte de virar decoração igual em toda tag.

### 5. O `build` declara `npm run build`, e os gates são os da CI

`build.command: "npm run build"` — que **é** o wrapper de baseline
(`node scripts/run-with-baseline-env.mjs "tsc -b && vite build"`), não um comando paralelo a ele.
Declarar `vite build` genérico faria o gate compilar por um caminho que a CI não usa: o gate mediria
uma coisa diferente da que a CI mede.

Gates: `npm run lint` e `npm test` — os mesmos da CI. **`test:smoke` ficou de fora de propósito:**
precisa dos navegadores do Playwright, que o job de release não instala. Declarado, ele faria toda
release falhar por ambiente, e não por código.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| `1.0.0` como primeira versão | Promete estabilidade que não foi medida (14 testes, sem cobertura do editor). |
| Declarar o wrapper de baseline direto no `config` | É o mesmo processo que `npm run build`; declarar os dois cria duas portas para o mesmo portão. |
| Incluir `test:smoke` nos gates | Falha por falta de navegador no runner, não por defeito do código. |
| `granularity: "tag"` | Exigiria arte nova a cada patch. O custo de arte é alto e o ganho, para um app estático, é pequeno. |
| Mover o `deploy.yml` para dentro do release | O release-core não faz deploy. Forçá-lo violaria a premissa do Core ("é proibido adicionar lógica por projeto"). |

## Onde isso é verificável

| O quê | Onde |
|---|---|
| O contrato | `.github/release.config.json` (versionado) |
| O caller | `.github/workflows/release.yml` — `@v1.2.5`, `tags: ['v*']` |
| A release | https://github.com/mafhper/fremit/releases/tag/v0.1.0 |
| A execução | PR #50 (merge `3be3d69`) |
| O contrato do protocolo | `mafhper/release-core` — `docs/config-schema.md`, `docs/archetypes/web.md` |

## O que a próxima sessão tem de saber

1. **A tag não se move.** Errou a versão, corte uma tag nova.
2. **A arte se corrige sem mover a tag:** commite `release-v0.1.0-new.webp` no branch padrão e
   re-rode o workflow da tag (o `workflow_dispatch` do caller aceita a tag como entrada).
3. **Um nome de arte sem versão é inerte.** `release-new.webp` não é candidato para nenhuma tag —
   o resolvedor só testa `release-vX.Y.Z[-new]`, `release-vX.Y[-new]` e o legado `release.webp`.
4. **O nome do asset publicado hoje é `release.webp`**, genérico por ser a forma legada de arquivo
   único. Ao entrar arte versionada, a URL muda de nome. O dono decidiu tratar isso no release-core.
