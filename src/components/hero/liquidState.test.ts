/**
 * liquidState.test.ts
 * Cobre conversão de preset, interpolação, fator de suavização e detecção de estado assentado.
 */
import { describe, expect, it } from 'vitest';
import { isSettled, lerpShaderState, smoothingFactor, toShaderState } from './liquidState';
import { liquidMoods } from './presets';

const morning = toShaderState(liquidMoods.morning);
const night = toShaderState(liquidMoods.night);

describe('toShaderState', () => {
  it('copia os escalares do preset e converte as cores hex para 0–1', () => {
    expect(morning.scalars.warp).toBe(liquidMoods.morning.warp);
    expect(night.colors.a[0]).toBeCloseTo(0x02 / 255);
    expect(night.colors.a[1]).toBeCloseTo(0x06 / 255);
    expect(night.colors.a[2]).toBeCloseTo(0x17 / 255);
  });
});

describe('lerpShaderState', () => {
  it('k = 0 mantém o estado atual e k = 1 chega ao alvo', () => {
    expect(lerpShaderState(morning, night, 0)).toEqual(morning);
    expect(lerpShaderState(morning, night, 1)).toEqual(night);
  });

  it('k = 0.5 produz o ponto médio de escalares e cores', () => {
    const mid = lerpShaderState(morning, night, 0.5);
    expect(mid.scalars.bloom).toBeCloseTo((morning.scalars.bloom + night.scalars.bloom) / 2);
    expect(mid.colors.b[0]).toBeCloseTo((morning.colors.b[0] + night.colors.b[0]) / 2);
  });

  it('limita k ao intervalo 0–1 e não altera os estados de entrada', () => {
    const snapshot = structuredClone(morning);
    expect(lerpShaderState(morning, night, 7)).toEqual(night);
    expect(lerpShaderState(morning, night, -3)).toEqual(snapshot);
    expect(morning).toEqual(snapshot);
  });
});

describe('smoothingFactor', () => {
  it('é 0 sem tempo decorrido ou com valores inválidos', () => {
    expect(smoothingFactor(0)).toBe(0);
    expect(smoothingFactor(-1)).toBe(0);
    expect(smoothingFactor(Number.NaN)).toBe(0);
  });

  it('cresce com dt e permanece entre 0 e 1', () => {
    const short = smoothingFactor(0.016);
    const long = smoothingFactor(0.1);
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(1);
  });
});

describe('isSettled', () => {
  it('reconhece estados iguais e rejeita estados distintos', () => {
    expect(isSettled(morning, structuredClone(morning))).toBe(true);
    expect(isSettled(morning, night)).toBe(false);
  });

  it('converge após interpolações sucessivas', () => {
    let state = morning;
    for (let i = 0; i < 400; i += 1) state = lerpShaderState(state, night, smoothingFactor(0.016));
    expect(isSettled(state, night)).toBe(true);
  });
});
