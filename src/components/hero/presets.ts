/**
 * presets.ts
 * Paletas e parâmetros WebGL por tema (claro / escuro).
 *
 * Tema claro: base branca, reflexo azul suave, acento azul vivo.
 * Tema escuro: base preta, profundidade azul-marinho, ciano elétrico.
 *
 * Valores calibrados para produzir variação visual perceptível:
 *  - contrast ≥ 0.65 (abaixo disso o efeito fica imperceptível)
 *  - speed    ≥ 0.35 (abaixo disso o movimento é muito lento para notar)
 *  - chrome   ≥ 0.60 para o tema escuro (necessário com base preta)
 */

export interface LiquidPreset {
  speed: number;
  warp: number;
  ripple: number;
  chrome: number;
  contrast: number;
  grain: number;
  colorA: string; // camada inferior (base)
  colorB: string; // reflexo principal
  colorC: string; // acento / highlight
}

export const liquidPresets = {
  light: {
    speed:    0.35,
    warp:     0.62,
    ripple:   0.38,
    chrome:   0.55,
    contrast: 0.68,
    grain:    0.04,
    colorA: '#ffffff', // base branca
    colorB: '#dbeafe', // azul-100 — reflexo suave
    colorC: '#3b82f6', // azul-500 — acento vivo
  },
  dark: {
    speed:    0.42,
    warp:     0.74,
    ripple:   0.48,
    chrome:   0.78,
    contrast: 0.72,
    grain:    0.06,
    colorA: '#000000', // base preta
    colorB: '#1e3a5f', // azul-marinho profundo
    colorC: '#38bdf8', // sky-400 — ciano elétrico
  },
} as const satisfies Record<string, LiquidPreset>;
