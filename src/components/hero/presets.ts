/**
 * presets.ts
 * Paletas e parâmetros WebGL por tema e cena.
 */

export type LiquidScene = 'liquid-chrome' | 'morning-sky' | 'cosmic-night';

export interface LiquidPreset {
  scene: LiquidScene;
  speed: number;
  warp: number;
  ripple: number;
  chrome: number;
  contrast: number;
  grain: number;
  pointer: number;   // 0–1, intensidade da interação com o mouse
  clouds: number;    // 0–1, opacidade da camada de nuvens
  stars: number;     // 0–1, intensidade do campo de estrelas
  bloom: number;     // 0–1, brilho/glow atmosférico
  centerX: number;   // 0–1, centro X do foco
  centerY: number;   // 0–1, centro Y do foco
  centerSize: number; // zoom ao redor do centro
  colorA: string;     // camada inferior (base)
  colorB: string;     // reflexo / cor secundária vibrante
  colorC: string;     // acento / highlight
}

export const liquidPresets = {
  home: {
    light: {
      scene: 'morning-sky',
      speed: 0.22,
      warp: 0.45,
      ripple: 0.52,
      chrome: 0.12,
      contrast: 0.35,
      grain: 0.01,
      pointer: 0.80,
      clouds: 0.65,
      stars: 0,
      bloom: 0.12,
      centerX: 0.50,
      centerY: 0.50,
      centerSize: 1.10,
      colorA: '#72b7f0',
      colorB: '#fffdf7',
      colorC: '#d9efff',
    },
    dark: {
      scene: 'cosmic-night',
      speed: 0.26,
      warp: 0.55,
      ripple: 0.48,
      chrome: 0.38,
      contrast: 0.72,
      grain: 0.02,
      pointer: 0.80,
      clouds: 0.10,
      stars: 0,
      bloom: 0.45,
      centerX: 0.50,
      centerY: 0.50,
      centerSize: 1.05,
      colorA: '#020617',
      colorB: '#8b5cf6',
      colorC: '#22d3ee',
    },
  },
  about: {
    light: {
      scene: 'morning-sky',
      speed: 0.12,
      warp: 0.38,
      ripple: 0.52,
      chrome: 0.06,
      contrast: 0.20,
      grain: 0.00,
      pointer: 0,
      clouds: 0.78,
      stars: 0,
      bloom: 0.08,
      centerX: 0.52,
      centerY: 0.28,
      centerSize: 1.65,
      colorA: '#72b7f0',
      colorB: '#fffdf7',
      colorC: '#d9efff',
    },
    dark: {
      scene: 'cosmic-night',
      speed: 0.16,
      warp: 0.50,
      ripple: 0.42,
      chrome: 0.32,
      contrast: 0.78,
      grain: 0.025,
      pointer: 0,
      clouds: 0.05,
      stars: 0,
      bloom: 0.72,
      centerX: 0.58,
      centerY: 0.42,
      centerSize: 1.20,
      colorA: '#020617',
      colorB: '#8b5cf6',
      colorC: '#22d3ee',
    },
  },
} as const satisfies Record<string, Record<string, LiquidPreset>>;
