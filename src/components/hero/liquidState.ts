/**
 * liquidState.ts
 * Estado numérico do shader e interpolação entre presets: permite trocar tema/clima
 * com transição suave, sem recriar o programa WebGL nem reiniciar o tempo.
 */

import type { LiquidPreset } from './presets';
import { hexToRgb } from './webgl';

export type Rgb = readonly [number, number, number];

export const LIQUID_SCALAR_KEYS = [
  'speed',
  'warp',
  'ripple',
  'chrome',
  'contrast',
  'grain',
  'pointer',
  'clouds',
  'stars',
  'bloom',
  'centerX',
  'centerY',
  'centerSize',
] as const;

export type LiquidScalarKey = (typeof LIQUID_SCALAR_KEYS)[number];

export interface LiquidShaderState {
  scalars: Record<LiquidScalarKey, number>;
  colors: { a: Rgb; b: Rgb; c: Rgb };
}

export function toShaderState(preset: LiquidPreset): LiquidShaderState {
  const scalars = {} as Record<LiquidScalarKey, number>;
  for (const key of LIQUID_SCALAR_KEYS) scalars[key] = preset[key];

  return {
    scalars,
    colors: {
      a: hexToRgb(preset.colorA),
      b: hexToRgb(preset.colorB),
      c: hexToRgb(preset.colorC),
    },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Forma `from*(1-k) + to*k`: exata nas pontas (k = 0 ou 1), sem erro de arredondamento.
function mix(from: number, to: number, k: number): number {
  return from * (1 - k) + to * k;
}

function mixRgb(from: Rgb, to: Rgb, k: number): Rgb {
  return [mix(from[0], to[0], k), mix(from[1], to[1], k), mix(from[2], to[2], k)];
}

/**
 * Fator de suavização independente da taxa de quadros: 0 quando dt <= 0 e tende a 1
 * conforme dt cresce. `base` menor significa transição mais rápida.
 */
export function smoothingFactor(deltaSeconds: number, base = 0.002): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return clamp01(1 - Math.pow(base, deltaSeconds));
}

export function lerpShaderState(
  current: LiquidShaderState,
  target: LiquidShaderState,
  k: number,
): LiquidShaderState {
  const t = clamp01(k);
  const scalars = {} as Record<LiquidScalarKey, number>;
  for (const key of LIQUID_SCALAR_KEYS) scalars[key] = mix(current.scalars[key], target.scalars[key], t);

  return {
    scalars,
    colors: {
      a: mixRgb(current.colors.a, target.colors.a, t),
      b: mixRgb(current.colors.b, target.colors.b, t),
      c: mixRgb(current.colors.c, target.colors.c, t),
    },
  };
}

/** Verdadeiro quando a diferença é imperceptível; permite "encaixar" no alvo e parar de interpolar. */
export function isSettled(a: LiquidShaderState, b: LiquidShaderState, epsilon = 0.002): boolean {
  for (const key of LIQUID_SCALAR_KEYS) {
    if (Math.abs(a.scalars[key] - b.scalars[key]) > epsilon) return false;
  }
  for (const channel of ['a', 'b', 'c'] as const) {
    for (let i = 0; i < 3; i += 1) {
      if (Math.abs(a.colors[channel][i] - b.colors[channel][i]) > epsilon) return false;
    }
  }
  return true;
}
