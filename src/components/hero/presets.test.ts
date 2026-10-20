/**
 * presets.test.ts
 * Garante que os climas da home são cópias dos presets e que o clima chrome tem cena própria.
 */
import { describe, expect, it } from 'vitest';
import { liquidMoods, liquidPresets } from './presets';

describe('liquidMoods', () => {
  it('copia os presets da home em vez de compartilhar a referência', () => {
    expect(liquidMoods.morning).toEqual(liquidPresets.home.light);
    expect(liquidMoods.night).toEqual(liquidPresets.home.dark);
    expect(liquidMoods.morning).not.toBe(liquidPresets.home.light);
    expect(liquidMoods.night).not.toBe(liquidPresets.home.dark);
  });

  it('define o clima chrome com a cena liquid-chrome', () => {
    expect(liquidMoods.chrome.scene).toBe('liquid-chrome');
    expect(liquidMoods.chrome.chrome).toBeGreaterThan(liquidMoods.morning.chrome);
  });
});
