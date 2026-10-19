/**
 * Preset catalog of the animate panel: the Element entrances and the Page
 * transitions of the schema, each with its own defaults and capabilities.
 *
 * This module is data only. The schema (types and validation) lives in
 * `src/lib/document.ts`, the player lives in `frames.ts`/`playback.ts`, and
 * the labels come from i18n (`animate.presets.*` / `animate.transitions.*`),
 * so nothing here carries copy or rendering.
 *
 * The preset list is the scope read off the reference panel (an idea, not
 * code): the model of "one registry entry per preset" is re-expressed here,
 * written from scratch for Fremit.
 */

import type {
  ElementAnimationPreset,
  ObjectAnimation,
  PageTransition,
  PageTransitionPreset,
} from '@/lib/document';

export interface ElementPresetDefinition {
  id: ElementAnimationPreset;
  /** Whether the `direction` control changes the effect. */
  supportsDirection: boolean;
  defaults: ObjectAnimation;
}

export interface TransitionPresetDefinition {
  id: PageTransitionPreset;
  supportsDirection: boolean;
  defaults: PageTransition;
}

export const ELEMENT_PRESETS: readonly ElementPresetDefinition[] = [
  {
    id: 'fade',
    supportsDirection: false,
    defaults: { preset: 'fade', durationMs: 600, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'rise',
    supportsDirection: true,
    defaults: { preset: 'rise', durationMs: 600, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'pop',
    supportsDirection: false,
    defaults: { preset: 'pop', durationMs: 450, easing: 'backOut', direction: 'up' },
  },
  {
    id: 'slide',
    supportsDirection: true,
    defaults: { preset: 'slide', durationMs: 500, easing: 'easeOut', direction: 'left' },
  },
  {
    id: 'words',
    supportsDirection: false,
    defaults: { preset: 'words', durationMs: 700, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'typewriter',
    supportsDirection: false,
    defaults: { preset: 'typewriter', durationMs: 900, easing: 'linear', direction: 'up' },
  },
  {
    id: 'wipe',
    supportsDirection: true,
    defaults: { preset: 'wipe', durationMs: 600, easing: 'easeOut', direction: 'left' },
  },
  {
    id: 'focus',
    supportsDirection: false,
    defaults: { preset: 'focus', durationMs: 600, easing: 'easeOut', direction: 'up' },
  },
];

export const TRANSITION_PRESETS: readonly TransitionPresetDefinition[] = [
  {
    id: 'fade',
    supportsDirection: false,
    defaults: { preset: 'fade', durationMs: 500, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'dip',
    supportsDirection: false,
    defaults: { preset: 'dip', durationMs: 600, easing: 'easeInOut', direction: 'up' },
  },
  {
    id: 'dissolve',
    supportsDirection: false,
    defaults: { preset: 'dissolve', durationMs: 500, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'blur',
    supportsDirection: false,
    defaults: { preset: 'blur', durationMs: 500, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'slide',
    supportsDirection: true,
    defaults: { preset: 'slide', durationMs: 500, easing: 'easeOut', direction: 'left' },
  },
  {
    id: 'push',
    supportsDirection: true,
    defaults: { preset: 'push', durationMs: 550, easing: 'easeOut', direction: 'left' },
  },
  {
    id: 'cover',
    supportsDirection: true,
    defaults: { preset: 'cover', durationMs: 550, easing: 'easeOut', direction: 'left' },
  },
  {
    id: 'uncover',
    supportsDirection: true,
    defaults: { preset: 'uncover', durationMs: 550, easing: 'easeOut', direction: 'right' },
  },
  {
    id: 'zoom',
    supportsDirection: false,
    defaults: { preset: 'zoom', durationMs: 550, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'wipe',
    supportsDirection: true,
    defaults: { preset: 'wipe', durationMs: 600, easing: 'easeOut', direction: 'left' },
  },
  {
    id: 'circle',
    supportsDirection: false,
    defaults: { preset: 'circle', durationMs: 650, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'flip',
    supportsDirection: false,
    defaults: { preset: 'flip', durationMs: 650, easing: 'easeOut', direction: 'up' },
  },
  {
    id: 'spin',
    supportsDirection: false,
    defaults: { preset: 'spin', durationMs: 600, easing: 'backOut', direction: 'up' },
  },
  {
    id: 'blinds',
    supportsDirection: false,
    defaults: { preset: 'blinds', durationMs: 700, easing: 'easeOut', direction: 'up' },
  },
];

export function findElementPreset(id: ElementAnimationPreset): ElementPresetDefinition | null {
  return ELEMENT_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function findTransitionPreset(id: PageTransitionPreset): TransitionPresetDefinition | null {
  return TRANSITION_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * A fresh animation with the defaults of the preset. The copy matters: the
 * definitions are shared, and an in-place edit of one stored animation must
 * never leak into the catalog.
 */
export function createElementAnimation(preset: ElementAnimationPreset): ObjectAnimation {
  const definition = findElementPreset(preset);

  if (!definition) throw new Error(`unknown element preset: ${preset}`);

  return { ...definition.defaults };
}

/** A fresh transition with the defaults of the preset; same copy rule. */
export function createPageTransition(preset: PageTransitionPreset): PageTransition {
  const definition = findTransitionPreset(preset);

  if (!definition) throw new Error(`unknown transition preset: ${preset}`);

  return { ...definition.defaults };
}
