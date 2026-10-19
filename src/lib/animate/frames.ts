/**
 * Pure frame math of the animate player.
 *
 * The player has two tracks, and both share one shape: a raw progress 0..1
 * becomes an eased value and then a frame of plain numbers.
 *
 * - the element track (per-object entrance) turns a preset into opacity,
 *   offsets, scale and a clip reveal — the Fabric adapter applies it to one
 *   canvas object;
 * - the transition track (page entrance) turns a preset into opacity, blur,
 *   brightness, transform and reveal numbers — the DOM adapter serializes it
 *   as CSS on the canvas surface (`transitionStyle`).
 *
 * Keeping the frames pure is what makes the player's decisions unit-testable
 * without a canvas, and keeps the adapters thin.
 *
 * Written from scratch for Fremit; no code copied from any reference player.
 */

import type {
  AnimationDirection,
  AnimationEasing,
  DocumentObject,
  ElementAnimationPreset,
  PageTransitionPreset,
} from '@/lib/document';
import { round2 } from '@/lib/math';

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Eased value of a timeline; `backOut` overshoots past 1 on purpose. */
export function easingValue(easing: AnimationEasing, progress: number): number {
  const t = clamp01(progress);

  // Both ends of a timeline are exact, whatever the curve: the floating-point
  // dust of a cubic would otherwise leave 2e-16 at the start of `backOut`.
  if (t === 0) return 0;
  if (t === 1) return 1;

  switch (easing) {
    case 'linear':
      return t;
    case 'easeOut':
      return 1 - Math.pow(1 - t, 3);
    case 'easeInOut':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'backOut': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  }
}

/** Kills the negative zero a `distance * 0` leaves behind. */
function withoutNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/** Raw timeline progress of a playback; a zero duration is already over. */
export function elementProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;

  return clamp01(elapsedMs / durationMs);
}

/**
 * Reduced motion collapses every timeline: the preview applies the final
 * state immediately instead of moving (the player reads the media query once,
 * at play time — the same preference `useReducedMotion` watches in the hero).
 */
export function playbackDuration(durationMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : durationMs;
}

/**
 * `direction` is where the effect comes from: 'left' enters from the left edge
 * (moving rightwards), 'up' enters from below (moving up).
 */
function directionDistance(
  direction: AnimationDirection,
  distance: number,
): { x: number; y: number } {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: -distance, y: 0 };
    case 'right':
      return { x: distance, y: 0 };
  }
}

export interface ElementFrame {
  /** Multiplied with the object's stored opacity (0..1). */
  opacity: number;
  /** Offsets from the stored position, in page pixels. */
  offsetX: number;
  offsetY: number;
  /** Multiplied with the stored scale (1 is the resting state). */
  scale: number;
  /** Clip reveal fraction 0..1, or `null` for a continuous (unclipped) frame. */
  reveal: number | null;
  /** Edge the reveal grows from; `null` when the frame has no reveal. */
  revealFrom: AnimationDirection | null;
}

export interface ElementFrameInput {
  preset: ElementAnimationPreset;
  /** Raw progress 0..1 before easing. */
  progress: number;
  easing: AnimationEasing;
  direction: AnimationDirection;
  /** Object box in page pixels; offsets and the scale pivot derive from it. */
  size: { width: number; height: number };
  /** Reveal steps for `words`/`typewriter` (>= 1); ignored by the rest. */
  steps: number;
}

const RISE_DISTANCE = 64;
const SLIDE_DISTANCE = 64;
const FOCUS_SCALE = 0.08;
const POP_START_SCALE = 0.55;

/** Quantized reveal: the steps appear one by one, the last one lands on 1. */
function steppedReveal(t: number, steps: number): number {
  const count = Math.max(1, Math.floor(steps));

  return Math.min(1, Math.ceil(t * count) / count);
}

/** Offsets that keep a scaled box growing from its own center. */
function centerCompensation(scale: number, size: { width: number; height: number }) {
  return {
    x: ((1 - scale) * size.width) / 2,
    y: ((1 - scale) * size.height) / 2,
  };
}

/**
 * One frame of an element entrance. Every preset lands exactly on the resting
 * state at progress 1 (opacity 1, no offset, scale 1, reveal complete), so the
 * adapter restores nothing on top of it.
 */
export function elementFrame(input: ElementFrameInput): ElementFrame {
  const { preset, progress, easing, direction, size, steps } = input;
  const raw = clamp01(progress);
  const t = easingValue(easing, raw);

  switch (preset) {
    case 'fade':
      return { opacity: t, offsetX: 0, offsetY: 0, scale: 1, reveal: null, revealFrom: null };

    case 'rise': {
      const distance = directionDistance(direction, RISE_DISTANCE);
      const remaining = 1 - t;

      return {
        opacity: Math.min(1, raw * 1.6),
        offsetX: withoutNegativeZero(distance.x * remaining),
        offsetY: withoutNegativeZero(distance.y * remaining),
        scale: 1,
        reveal: null,
        revealFrom: null,
      };
    }

    case 'pop': {
      const scale = POP_START_SCALE + (1 - POP_START_SCALE) * t;
      const compensation = centerCompensation(scale, size);

      return {
        opacity: Math.min(1, raw * 2.5),
        offsetX: compensation.x,
        offsetY: compensation.y,
        scale,
        reveal: null,
        revealFrom: null,
      };
    }

    case 'slide': {
      const distance = directionDistance(direction, SLIDE_DISTANCE);
      const remaining = 1 - t;

      return {
        opacity: Math.min(1, raw * 1.6),
        offsetX: withoutNegativeZero(distance.x * remaining),
        offsetY: withoutNegativeZero(distance.y * remaining),
        scale: 1,
        reveal: null,
        revealFrom: null,
      };
    }

    case 'words':
    case 'typewriter':
      return {
        opacity: 1,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        reveal: steppedReveal(t, steps),
        revealFrom: 'left',
      };

    case 'wipe':
      return {
        opacity: 1,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        reveal: t,
        revealFrom: direction,
      };

    case 'focus': {
      const scale = 1 + (1 - t) * FOCUS_SCALE;
      const compensation = centerCompensation(scale, size);

      return {
        opacity: t,
        offsetX: compensation.x,
        offsetY: compensation.y,
        scale,
        reveal: null,
        revealFrom: null,
      };
    }
  }
}

/**
 * How many steps a stepped reveal has: one per word, one per character, and a
 * fixed stepped reveal for objects without text (words/typewriter on a shape
 * still reads as a reveal instead of a hard cut).
 */
export function elementRevealSteps(
  preset: ElementAnimationPreset,
  object: DocumentObject,
): number {
  if (preset !== 'words' && preset !== 'typewriter') return 1;
  if (object.type !== 'text') return 8;

  if (preset === 'words') {
    const words = object.text.split(/\s+/).filter(Boolean);
    return Math.max(1, words.length);
  }

  return Math.max(1, [...object.text].length);
}

export type TransitionRevealShape = 'wipe' | 'circle' | 'blinds';

export interface TransitionFrame {
  /** Multiplied with the surface's resting opacity (usually 1). */
  opacity: number;
  /** CSS blur, in pixels. */
  blurPx: number;
  /** CSS brightness (1 is untouched; 0 is the black of `dip`). */
  brightness: number;
  /** Translation as a fraction of the page size (1 = one page width). */
  translateX: number;
  translateY: number;
  scale: number;
  rotateDeg: number;
  rotateYDeg: number;
  reveal: number | null;
  revealShape: TransitionRevealShape | null;
  revealFrom: AnimationDirection | null;
}

const TRANSITION_SLIDE_DISTANCE = 0.16;
const TRANSITION_PUSH_DISTANCE = 1;
const DISSOLVE_BLUR = 6;
const BLUR_AMOUNT = 18;
const ZOOM_START_SCALE = 1.15;
const SPIN_START_SCALE = 0.92;
const SPIN_START_ANGLE = -14;
const FLIP_START_ANGLE = -90;

/**
 * One frame of a page transition. The preview plays the *entrance* of the
 * incoming page — `push`, `cover` and `uncover` differ in how the outgoing
 * page behaves, which a single-surface preview cannot show; the full
 * two-layer compositing lands with the export slice. Every preset lands on the
 * resting state at progress 1.
 */
export function transitionFrame(
  preset: PageTransitionPreset,
  progress: number,
  easing: AnimationEasing,
  direction: AnimationDirection,
): TransitionFrame {
  const raw = clamp01(progress);
  const t = easingValue(easing, raw);
  const resting: TransitionFrame = {
    opacity: 1,
    blurPx: 0,
    brightness: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotateDeg: 0,
    rotateYDeg: 0,
    reveal: null,
    revealShape: null,
    revealFrom: null,
  };

  switch (preset) {
    case 'fade':
      return { ...resting, opacity: t };

    case 'dip':
      return { ...resting, brightness: t };

    case 'dissolve':
      return { ...resting, opacity: t, blurPx: (1 - t) * DISSOLVE_BLUR };

    case 'blur':
      return { ...resting, opacity: Math.min(1, raw * 1.3), blurPx: (1 - t) * BLUR_AMOUNT };

    case 'slide': {
      const distance = directionDistance(direction, TRANSITION_SLIDE_DISTANCE);

      return {
        ...resting,
        opacity: Math.min(1, raw * 1.4),
        translateX: withoutNegativeZero(distance.x * (1 - t)),
        translateY: withoutNegativeZero(distance.y * (1 - t)),
      };
    }

    case 'push': {
      const distance = directionDistance(direction, TRANSITION_PUSH_DISTANCE);

      return {
        ...resting,
        translateX: withoutNegativeZero(distance.x * (1 - t)),
        translateY: withoutNegativeZero(distance.y * (1 - t)),
      };
    }

    case 'cover':
      return { ...resting, reveal: t, revealShape: 'wipe', revealFrom: direction };

    case 'uncover':
      return { ...resting, reveal: t, revealShape: 'wipe', revealFrom: direction };

    case 'zoom':
      return {
        ...resting,
        opacity: Math.min(1, raw * 1.4),
        scale: ZOOM_START_SCALE + (1 - ZOOM_START_SCALE) * t,
      };

    case 'wipe':
      return { ...resting, reveal: t, revealShape: 'wipe', revealFrom: direction };

    case 'circle':
      return { ...resting, reveal: t, revealShape: 'circle', revealFrom: 'up' };

    case 'flip':
      return { ...resting, rotateYDeg: withoutNegativeZero(FLIP_START_ANGLE * (1 - t)) };

    case 'spin':
      return {
        ...resting,
        opacity: Math.min(1, raw * 1.5),
        rotateDeg: withoutNegativeZero(SPIN_START_ANGLE * (1 - t)),
        scale: SPIN_START_SCALE + (1 - SPIN_START_SCALE) * t,
      };

    case 'blinds':
      return { ...resting, reveal: t, revealShape: 'blinds', revealFrom: 'up' };
  }
}

/** Page box and surface size, in the surface element's own coordinates. */
export interface TransitionStage {
  page: { x: number; y: number; width: number; height: number };
  container: { width: number; height: number };
}

export interface TransitionCss {
  opacity?: string;
  transform?: string;
  transformOrigin?: string;
  filter?: string;
  clipPath?: string;
  maskImage?: string;
}

const BLINDS_COUNT = 12;

function wipeInset(reveal: number, from: AnimationDirection, stage: TransitionStage): string {
  const { x, y, width, height } = stage.page;
  const right = stage.container.width - (x + width);
  const bottom = stage.container.height - (y + height);
  const remainingX = width * (1 - reveal);
  const remainingY = height * (1 - reveal);

  switch (from) {
    case 'left':
      return `inset(${round2(y)}px ${round2(right + remainingX)}px ${round2(bottom)}px ${round2(x)}px)`;
    case 'right':
      return `inset(${round2(y)}px ${round2(right)}px ${round2(bottom)}px ${round2(x + remainingX)}px)`;
    case 'up':
      return `inset(${round2(y)}px ${round2(right)}px ${round2(bottom + remainingY)}px ${round2(x)}px)`;
    case 'down':
      return `inset(${round2(y + remainingY)}px ${round2(right)}px ${round2(bottom)}px ${round2(x)}px)`;
  }
}

function circleClip(reveal: number, stage: TransitionStage): string {
  const centerX = stage.page.x + stage.page.width / 2;
  const centerY = stage.page.y + stage.page.height / 2;
  const radius = reveal * Math.hypot(stage.page.width / 2, stage.page.height / 2) * 1.02;

  return `circle(${round2(radius)}px at ${round2(centerX)}px ${round2(centerY)}px)`;
}

function blindsMask(reveal: number, stage: TransitionStage): string {
  const period = Math.max(1, stage.page.height / BLINDS_COUNT);
  const stripe = period * reveal;

  return `repeating-linear-gradient(to bottom, #000 0 ${round2(stripe)}px, transparent ${round2(stripe)}px ${round2(period)}px)`;
}

/**
 * CSS of one transition frame, relative to the surface element (the canvas
 * element, whose painted content is exactly the page). Properties at their
 * resting value are omitted, so a caller can apply the frame with a plain
 * spread and clean up what is left over.
 */
export function transitionStyle(frame: TransitionFrame, stage: TransitionStage): TransitionCss {
  const css: TransitionCss = {};

  if (frame.opacity < 1) css.opacity = String(round2(frame.opacity));

  const transformParts: string[] = [];

  if (frame.translateX !== 0 || frame.translateY !== 0) {
    transformParts.push(
      `translate(${round2(frame.translateX * stage.page.width)}px, ${round2(frame.translateY * stage.page.height)}px)`,
    );
  }

  if (frame.scale !== 1) transformParts.push(`scale(${round2(frame.scale)})`);
  if (frame.rotateDeg !== 0) transformParts.push(`rotate(${round2(frame.rotateDeg)}deg)`);
  if (frame.rotateYDeg !== 0) transformParts.push(`rotateY(${round2(frame.rotateYDeg)}deg)`);

  if (transformParts.length > 0) {
    css.transform =
      (frame.rotateYDeg !== 0 ? 'perspective(1200px) ' : '') + transformParts.join(' ');
    css.transformOrigin = `${round2(stage.page.x + stage.page.width / 2)}px ${round2(stage.page.y + stage.page.height / 2)}px`;
  }

  const filters: string[] = [];

  if (frame.blurPx > 0.05) filters.push(`blur(${round2(frame.blurPx)}px)`);
  if (frame.brightness < 0.995) filters.push(`brightness(${round2(frame.brightness)})`);
  if (filters.length > 0) css.filter = filters.join(' ');

  if (frame.reveal !== null && frame.revealShape && frame.reveal < 1) {
    const reveal = clamp01(frame.reveal);

    if (frame.revealShape === 'wipe') {
      css.clipPath = wipeInset(reveal, frame.revealFrom ?? 'left', stage);
    } else if (frame.revealShape === 'circle') {
      css.clipPath = circleClip(reveal, stage);
    } else {
      css.maskImage = blindsMask(reveal, stage);
    }
  }

  return css;
}
