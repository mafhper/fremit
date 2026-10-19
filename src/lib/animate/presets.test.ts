import { describe, expect, it } from 'vitest';
import {
  ANIMATION_DIRECTIONS,
  ANIMATION_EASINGS,
  ELEMENT_ANIMATION_PRESETS,
  MAX_ANIMATION_DURATION_MS,
  MIN_ANIMATION_DURATION_MS,
  PAGE_TRANSITION_PRESETS,
} from '@/lib/document';
import {
  ELEMENT_PRESETS,
  TRANSITION_PRESETS,
  createElementAnimation,
  createPageTransition,
  findElementPreset,
  findTransitionPreset,
} from '@/lib/animate/presets';

describe('animate preset catalog', () => {
  it('covers every element preset of the schema, in order, exactly once', () => {
    expect(ELEMENT_PRESETS.map((preset) => preset.id)).toEqual([...ELEMENT_ANIMATION_PRESETS]);
  });

  it('covers every page transition of the schema, in order, exactly once', () => {
    expect(TRANSITION_PRESETS.map((preset) => preset.id)).toEqual([...PAGE_TRANSITION_PRESETS]);
  });

  it('declares valid defaults for every element preset', () => {
    for (const definition of ELEMENT_PRESETS) {
      expect(definition.defaults.preset, definition.id).toBe(definition.id);
      expect(definition.defaults.durationMs, definition.id).toBeGreaterThanOrEqual(
        MIN_ANIMATION_DURATION_MS,
      );
      expect(definition.defaults.durationMs, definition.id).toBeLessThanOrEqual(
        MAX_ANIMATION_DURATION_MS,
      );
      expect(ANIMATION_EASINGS, definition.id).toContain(definition.defaults.easing);
      expect(ANIMATION_DIRECTIONS, definition.id).toContain(definition.defaults.direction);
    }
  });

  it('declares valid defaults for every transition preset', () => {
    for (const definition of TRANSITION_PRESETS) {
      expect(definition.defaults.preset, definition.id).toBe(definition.id);
      expect(definition.defaults.durationMs, definition.id).toBeGreaterThanOrEqual(
        MIN_ANIMATION_DURATION_MS,
      );
      expect(definition.defaults.durationMs, definition.id).toBeLessThanOrEqual(
        MAX_ANIMATION_DURATION_MS,
      );
      expect(ANIMATION_EASINGS, definition.id).toContain(definition.defaults.easing);
      expect(ANIMATION_DIRECTIONS, definition.id).toContain(definition.defaults.direction);
    }
  });

  it('marks exactly the directional presets as direction-aware', () => {
    const directional = (presets: { id: string; supportsDirection: boolean }[]) =>
      presets.filter((preset) => preset.supportsDirection).map((preset) => preset.id);

    expect(directional([...ELEMENT_PRESETS])).toEqual(['rise', 'slide', 'wipe']);
    expect(directional([...TRANSITION_PRESETS])).toEqual([
      'slide',
      'push',
      'cover',
      'uncover',
      'wipe',
    ]);
  });

  it('builds a fresh animation per call instead of sharing the catalog value', () => {
    const first = createElementAnimation('pop');
    const second = createElementAnimation('pop');

    expect(first).toEqual({ preset: 'pop', durationMs: 450, easing: 'backOut', direction: 'up' });
    expect(first).not.toBe(second);

    // An in-place edit of one stored animation never leaks into the catalog.
    first.durationMs = 100;
    expect(findElementPreset('pop')?.defaults.durationMs).toBe(450);
    expect(second.durationMs).toBe(450);
  });

  it('builds a fresh transition per call instead of sharing the catalog value', () => {
    const first = createPageTransition('dip');
    const second = createPageTransition('dip');

    expect(first).toEqual({ preset: 'dip', durationMs: 600, easing: 'easeInOut', direction: 'up' });
    expect(first).not.toBe(second);

    first.preset = 'fade';
    expect(findTransitionPreset('dip')?.defaults.preset).toBe('dip');
    expect(second.preset).toBe('dip');
  });

  it('finds definitions by id and refuses unknown ids loudly', () => {
    expect(findElementPreset('fade')?.id).toBe('fade');
    expect(findTransitionPreset('blinds')?.id).toBe('blinds');

    expect(() => createElementAnimation('explode' as never)).toThrow(/unknown element preset/);
    expect(() => createPageTransition('teleport' as never)).toThrow(/unknown transition preset/);
  });
});
