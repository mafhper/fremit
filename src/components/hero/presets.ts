/**
 * presets.ts
 * Paletas e parâmetros WebGL por tema (claro / escuro).
 *
 * Agora com suporte a pointer interaction, cloud layer e center glow
 * — efeito mesh multicolorido inspirado no imaginizim.
 *
 * Tema claro: base branca, rosa vibrante, ciano elétrico.
 * Tema escuro: base preta, fúcsia, ciano brilhante.
 *
 * Valores calibrados para máxima riqueza visual:
 *  - contrast ≥ 0.70 (vibrancy)
 *  - chrome  ≥ 0.60 (specular reflections)
 *  - warp    ≥ 0.70 (mesh deformation)
 */

export interface LiquidPreset {
  speed: number;
  warp: number;
  ripple: number;
  chrome: number;
  contrast: number;
  grain: number;
  pointer: number;   // 0–1, intensidade da interação com o mouse
  clouds: number;    // 0–1, opacidade da camada de nuvens
  centerX: number;   // 0–1, centro X do foco
  centerY: number;   // 0–1, centro Y do foco
  centerSize: number; // zoom ao redor do centro
  colorA: string;     // camada inferior (base)
  colorB: string;     // reflexo / cor secundária vibrante
  colorC: string;     // acento / highlight
}

export const liquidPresets = {
  light: {
    speed:     0.30,
    warp:      0.72,
    ripple:    0.58,
    chrome:    0.62,
    contrast:  0.76,
    grain:     0.03,
    pointer:   0.80,
    clouds:    0.25,
    centerX:   0.50,
    centerY:   0.50,
    centerSize: 1.00,
    colorA: '#ffffff',  // base branca
    colorB: '#f43f5e',  // rose-500 — rosa vibrante
    colorC: '#06b6d4',  // cyan-500 — ciano elétrico
  },
  dark: {
    speed:     0.35,
    warp:      0.82,
    ripple:    0.68,
    chrome:    0.72,
    contrast:  0.82,
    grain:     0.04,
    pointer:   0.80,
    clouds:    0.30,
    centerX:   0.50,
    centerY:   0.50,
    centerSize: 1.00,
    colorA: '#000000',  // base preta
    colorB: '#d946ef',  // fuchsia-500 — fúcsia vibrante
    colorC: '#22d3ee',  // cyan-400 — ciano brilhante
  },
} as const satisfies Record<string, LiquidPreset>;
