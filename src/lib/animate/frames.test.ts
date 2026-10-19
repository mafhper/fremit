import { describe, expect, it } from 'vitest';
import { ELEMENT_ANIMATION_PRESETS, PAGE_TRANSITION_PRESETS, createShapeObject, createTextObject, type AnimationDirection, type ElementAnimationPreset } from '@/lib/document';
import {
  clamp01,
  easingValue,
  elementFrame,
  elementProgress,
  elementRevealSteps,
  playbackDuration,
  transitionFrame,
  transitionStyle,
  type ElementFrame,
  type TransitionStage,
} from '@/lib/animate/frames';

const size = { width: 200, height: 100 };

function frameAt(
  preset: ElementAnimationPreset,
  progress: number,
  overrides: Partial<{ easing: 'linear' | 'easeOut' | 'easeInOut' | 'backOut'; direction: AnimationDirection; steps: number }> = {},
): ElementFrame {
  return elementFrame({
    preset,
    progress,
    easing: overrides.easing ?? 'linear',
    direction: overrides.direction ?? 'up',
    size,
    steps: overrides.steps ?? 4,
  });
}

const stage: TransitionStage = {
  page: { x: 100, y: 50, width: 400, height: 300 },
  container: { width: 800, height: 600 },
};

describe('animate easings', () => {
  it('pins both ends of every easing', () => {
    for (const easing of ['linear', 'easeOut', 'easeInOut', 'backOut'] as const) {
      expect(easingValue(easing, 0), easing).toBe(0);
      expect(easingValue(easing, 1), easing).toBe(1);
    }
  });

  it('shapes the curve as declared', () => {
    expect(easingValue('linear', 0.5)).toBe(0.5);
    // Cubic out is ahead of the line in the middle of the timeline.
    expect(easingValue('easeOut', 0.5)).toBeGreaterThan(0.5);
    // Back out overshoots past the resting value before settling.
    expect(easingValue('backOut', 0.8)).toBeGreaterThan(1);
    expect(easingValue('easeInOut', 0.5)).toBeCloseTo(0.5, 10);
    expect(easingValue('easeInOut', 0.25)).toBeLessThan(0.25);
  });

  it('clamps progress outside 0..1', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(easingValue('linear', 3)).toBe(1);
  });

  it('collapses the timeline under reduced motion', () => {
    expect(playbackDuration(600, false)).toBe(600);
    expect(playbackDuration(600, true)).toBe(0);
  });

  it('turns elapsed time into progress with a zero duration already over', () => {
    expect(elementProgress(0, 600)).toBe(0);
    expect(elementProgress(300, 600)).toBe(0.5);
    expect(elementProgress(900, 600)).toBe(1);
    expect(elementProgress(0, 0)).toBe(1);
  });
});

describe('element frames', () => {
  it('lands exactly on the resting state at progress 1 for every preset', () => {
    for (const preset of ELEMENT_ANIMATION_PRESETS) {
      const frame = frameAt(preset, 1);

      expect(frame.opacity, preset).toBe(1);
      expect(frame.offsetX, preset).toBe(0);
      expect(frame.offsetY, preset).toBe(0);
      expect(frame.scale, preset).toBe(1);
      expect(frame.reveal === null || frame.reveal === 1, preset).toBe(true);
    }
  });

  it('starts hidden or displaced at progress 0 for every preset', () => {
    for (const preset of ELEMENT_ANIMATION_PRESETS) {
      const frame = frameAt(preset, 0);
      const hidden =
        frame.opacity === 0 ||
        frame.offsetX !== 0 ||
        frame.offsetY !== 0 ||
        frame.scale !== 1 ||
        frame.reveal === 0;

      expect(hidden, preset).toBe(true);
    }
  });

  it('fades in with opacity only', () => {
    const frame = frameAt('fade', 0.5, { easing: 'linear' });

    expect(frame.opacity).toBe(0.5);
    expect(frame.offsetX).toBe(0);
    expect(frame.reveal).toBeNull();
  });

  it('rises from below by the fixed distance and honours direction', () => {
    expect(frameAt('rise', 0).offsetY).toBe(64);
    expect(frameAt('rise', 0, { direction: 'down' }).offsetY).toBe(-64);
    expect(frameAt('rise', 1).offsetY).toBe(0);
  });

  it('pops from a smaller scale around the object centre', () => {
    const start = frameAt('pop', 0);

    expect(start.scale).toBe(0.55);
    // Growing around the centre pushes the top-left corner outwards.
    expect(start.offsetX).toBeCloseTo((1 - 0.55) * size.width * 0.5, 10);
    expect(start.offsetY).toBeCloseTo((1 - 0.55) * size.height * 0.5, 10);
  });

  it('slides from the chosen edge', () => {
    expect(frameAt('slide', 0, { direction: 'left' }).offsetX).toBe(-64);
    expect(frameAt('slide', 0, { direction: 'right' }).offsetX).toBe(64);
    expect(frameAt('slide', 0, { direction: 'up' }).offsetY).toBe(64);
    expect(frameAt('slide', 0, { direction: 'down' }).offsetY).toBe(-64);
  });

  it('reveals words and typewriter stepped, never past the last step', () => {
    const words = [0, 0.1, 0.3, 0.6, 0.9, 1].map((progress) => frameAt('words', progress).reveal);
    const typewriter = [0, 0.2, 0.5, 1].map((progress) => frameAt('typewriter', progress).reveal);

    expect(words[0]).toBe(0);
    expect(words[words.length - 1]).toBe(1);
    expect(new Set(words)).toEqual(new Set([0, 0.25, 0.5, 0.75, 1]));
    expect(typewriter[typewriter.length - 1]).toBe(1);
    // Every value sits exactly on one of the four steps of the timeline.
    for (const reveal of words) {
      const value = reveal as number;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(Math.abs(value * 4 - Math.round(value * 4))).toBeLessThan(1e-9);
    }
  });

  it('wipes continuously from the chosen edge', () => {
    const frame = frameAt('wipe', 0.4, { direction: 'right' });

    expect(frame.reveal).toBeCloseTo(0.4, 10);
    expect(frame.revealFrom).toBe('right');
  });

  it('focuses by settling from a slightly larger scale', () => {
    const start = frameAt('focus', 0);

    expect(start.scale).toBeCloseTo(1.08, 10);
    expect(start.opacity).toBe(0);
    expect(start.offsetX).toBeLessThan(0);
  });
});

describe('element reveal steps', () => {
  it('counts words and characters for text objects', () => {
    expect(elementRevealSteps('words', createTextObject('one two three'))).toBe(3);
    expect(elementRevealSteps('typewriter', createTextObject('abcd'))).toBe(4);
  });

  it('falls back to a fixed stepped reveal for objects without text', () => {
    expect(elementRevealSteps('words', createShapeObject('rect'))).toBe(8);
    expect(elementRevealSteps('typewriter', createShapeObject('rect'))).toBe(8);
  });

  it('reports a single step for continuous presets', () => {
    expect(elementRevealSteps('fade', createTextObject('one two'))).toBe(1);
    expect(elementRevealSteps('wipe', createTextObject('one two'))).toBe(1);
  });
});

describe('transition frames', () => {
  it('lands exactly on the resting state at progress 1 for every preset', () => {
    for (const preset of PAGE_TRANSITION_PRESETS) {
      const frame = transitionFrame(preset, 1, 'linear', 'left');

      expect(frame.opacity, preset).toBe(1);
      expect(frame.blurPx, preset).toBe(0);
      expect(frame.brightness, preset).toBe(1);
      expect(frame.translateX, preset).toBe(0);
      expect(frame.translateY, preset).toBe(0);
      expect(frame.scale, preset).toBe(1);
      expect(frame.rotateDeg, preset).toBe(0);
      expect(frame.rotateYDeg, preset).toBe(0);
      expect(frame.reveal === null || frame.reveal === 1, preset).toBe(true);
    }
  });

  it('starts displaced, hidden or filtered at progress 0 for every preset', () => {
    for (const preset of PAGE_TRANSITION_PRESETS) {
      const frame = transitionFrame(preset, 0, 'linear', 'left');
      const active =
        frame.opacity === 0 ||
        frame.blurPx > 0 ||
        frame.brightness === 0 ||
        frame.translateX !== 0 ||
        frame.translateY !== 0 ||
        frame.scale !== 1 ||
        frame.rotateDeg !== 0 ||
        frame.rotateYDeg !== 0 ||
        frame.reveal === 0;

      expect(active, preset).toBe(true);
    }
  });

  it('dips through black with brightness, not opacity', () => {
    const frame = transitionFrame('dip', 0, 'linear', 'up');

    expect(frame.brightness).toBe(0);
    expect(frame.opacity).toBe(1);
  });

  it('pushes the incoming page by a full page width from the chosen edge', () => {
    expect(transitionFrame('push', 0, 'linear', 'left').translateX).toBe(-1);
    expect(transitionFrame('push', 0, 'linear', 'right').translateX).toBe(1);
    expect(transitionFrame('push', 0, 'linear', 'up').translateY).toBe(1);
  });

  it('covers and uncovers with a reveal from their own default edge', () => {
    expect(transitionFrame('cover', 0.5, 'linear', 'left').revealFrom).toBe('left');
    expect(transitionFrame('uncover', 0.5, 'linear', 'right').revealFrom).toBe('right');
  });

  it('spins and flips with rotation', () => {
    expect(transitionFrame('flip', 0, 'linear', 'up').rotateYDeg).toBe(-90);
    expect(transitionFrame('spin', 0, 'linear', 'up').rotateDeg).toBe(-14);
    expect(transitionFrame('spin', 0, 'linear', 'up').scale).toBeCloseTo(0.92, 10);
  });
});

describe('transition styles', () => {
  it('serializes nothing for the resting frame', () => {
    expect(transitionStyle(transitionFrame('fade', 1, 'linear', 'left'), stage)).toEqual({});
    expect(transitionStyle(transitionFrame('push', 1, 'linear', 'left'), stage)).toEqual({});
    expect(transitionStyle(transitionFrame('wipe', 1, 'linear', 'left'), stage)).toEqual({});
    expect(transitionStyle(transitionFrame('blinds', 1, 'linear', 'left'), stage)).toEqual({});
  });

  it('fades through the surface opacity', () => {
    expect(transitionStyle(transitionFrame('fade', 0.5, 'linear', 'left'), stage)).toEqual({
      opacity: '0.5',
    });
  });

  it('dips through brightness and dissolves through blur', () => {
    expect(transitionStyle(transitionFrame('dip', 0.5, 'linear', 'left'), stage)).toEqual({
      filter: 'brightness(0.5)',
    });

    const dissolve = transitionStyle(transitionFrame('dissolve', 0.5, 'linear', 'left'), stage);
    expect(dissolve.opacity).toBe('0.5');
    expect(dissolve.filter).toBe('blur(3px)');
  });

  it('pushes with a page-sized translate and a page-centred origin', () => {
    const style = transitionStyle(transitionFrame('push', 0, 'linear', 'left'), stage);

    expect(style.transform).toBe('translate(-400px, 0px)');
    expect(style.transformOrigin).toBe('300px 200px');
  });

  it('flips with perspective and rotation around the page centre', () => {
    const style = transitionStyle(transitionFrame('flip', 0, 'linear', 'left'), stage);

    expect(style.transform).toBe('perspective(1200px) rotateY(-90deg)');
    expect(style.transformOrigin).toBe('300px 200px');
  });

  it('wipes as an inset clip of the page box, from the chosen edge', () => {
    const fromLeft = transitionStyle(transitionFrame('wipe', 0.25, 'linear', 'left'), stage);
    const fromRight = transitionStyle(transitionFrame('wipe', 0.25, 'linear', 'right'), stage);

    expect(fromLeft.clipPath).toBe('inset(50px 600px 250px 100px)');
    expect(fromRight.clipPath).toBe('inset(50px 300px 250px 400px)');
  });

  it('reveals in a circle from the page centre', () => {
    const style = transitionStyle(transitionFrame('circle', 1, 'linear', 'left'), stage);

    expect(style.clipPath).toBeUndefined();
    expect(transitionStyle(transitionFrame('circle', 0.5, 'linear', 'left'), stage).clipPath).toBe(
      'circle(127.5px at 300px 200px)',
    );
  });

  it('blinds as a repeating mask that grows the opaque stripe', () => {
    const style = transitionStyle(transitionFrame('blinds', 0.5, 'linear', 'left'), stage);

    expect(style.maskImage).toBe(
      'repeating-linear-gradient(to bottom, #000 0 12.5px, transparent 12.5px 25px)',
    );
  });
});
