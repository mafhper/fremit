import { describe, expect, it } from 'vitest';
import {
  ARC_MAX_SWEEP_DEGREES,
  ARC_MIN_SWEEP_DEGREES,
  DEFAULT_ARC_AMOUNT,
  arcSweepDegrees,
  buildArcPathData,
  clampArcAmount,
} from '@/lib/arcText';

/**
 * Reads the SVG arc `M x0 y0 A r r 0 0 f x1 y1` as its endpoint parameters.
 * The assertions below work from these numbers and from circle geometry, not
 * from the formulas `buildArcPathData` used to produce them.
 */
function readArcPath(d: string) {
  const match = d.match(
    /^M (-?[\d.]+) (-?[\d.]+) A ([\d.]+) [\d.]+ 0 0 ([01]) (-?[\d.]+) (-?[\d.]+)$/,
  );

  if (!match) throw new Error(`not an arc path: ${d}`);

  return {
    x0: Number(match[1]),
    y0: Number(match[2]),
    radius: Number(match[3]),
    sweepFlag: Number(match[4]),
    x1: Number(match[5]),
    y1: Number(match[6]),
  };
}

describe('arc text geometry', () => {
  it('clamps the amount into 0..1 with a usable default', () => {
    expect(clampArcAmount(-1)).toBe(0);
    expect(clampArcAmount(2)).toBe(1);
    expect(clampArcAmount(Number.NaN)).toBe(DEFAULT_ARC_AMOUNT);
    expect(DEFAULT_ARC_AMOUNT).toBeGreaterThan(0);
    expect(DEFAULT_ARC_AMOUNT).toBeLessThan(1);
  });

  it('maps the amount to a sweep between the minimum and the maximum', () => {
    expect(arcSweepDegrees(0)).toBe(ARC_MIN_SWEEP_DEGREES);
    expect(arcSweepDegrees(1)).toBe(ARC_MAX_SWEEP_DEGREES);
    expect(arcSweepDegrees(0.5)).toBeGreaterThan(ARC_MIN_SWEEP_DEGREES);
    expect(arcSweepDegrees(0.5)).toBeLessThan(ARC_MAX_SWEEP_DEGREES);
  });

  it('lays both directions on a symmetric chord whose arc length is the text width', () => {
    const textWidth = 500;

    for (const direction of ['up', 'down'] as const) {
      const geometry = buildArcPathData({ textWidth, direction, amount: 0.6 });
      const arc = readArcPath(geometry.d);

      // Both endpoints sit at the same height: the chord is horizontal and the
      // run is symmetric around the apex. The bug this pins is the tilted
      // chord, which spans more than the circle's chord for the same sweep.
      expect(arc.y0, `${direction} chord`).toBe(arc.y1);

      // Independent circle geometry: a chord of length c on a circle of
      // radius r spans a sweep of 2·asin(c/2r), and the arc length is r·sweep.
      // It must equal the text width, or the glyph spacing stretches.
      const chord = arc.x1 - arc.x0;
      const sweep = 2 * Math.asin(chord / (2 * arc.radius));
      expect(arc.radius * sweep, `${direction} arc length`).toBeCloseTo(textWidth, 1);

      // The box is the tight bounding box of that segment: the chord is the
      // width and the sagitta is the height. Pythagoras on the right triangle
      // (radius, half chord, apothem) gives the sagitta without any formula
      // from the implementation.
      const apothem = Math.sqrt(arc.radius ** 2 - (chord / 2) ** 2);
      expect(geometry.width, `${direction} box width`).toBeCloseTo(chord, 2);
      expect(geometry.height, `${direction} box height`).toBeCloseTo(
        arc.radius - apothem,
        1,
      );
      expect(geometry.width).toBeLessThan(textWidth);
      expect(geometry.height).toBeGreaterThan(0);
    }
  });

  it('anchors the arc at the origin: up bulges over, down dips under', () => {
    const up = buildArcPathData({ textWidth: 400, direction: 'up', amount: 0.6 });
    const down = buildArcPathData({ textWidth: 400, direction: 'down', amount: 0.6 });
    const upArc = readArcPath(up.d);
    const downArc = readArcPath(down.d);

    // Up: the endpoints sit on the box's bottom edge and the sweep flag bulges
    // over the chord. Down: mirrored, endpoints on the top edge.
    expect(upArc.y0).toBe(up.height);
    expect(upArc.y1).toBe(up.height);
    expect(upArc.sweepFlag).toBe(1);

    expect(downArc.y0).toBe(0);
    expect(downArc.y1).toBe(0);
    expect(downArc.sweepFlag).toBe(0);

    // Both directions occupy the same box: same chord, same sagitta.
    expect(down.width).toBe(up.width);
    expect(down.height).toBe(up.height);
  });

  it('curves more (shorter chord, taller sagitta) as the amount grows', () => {
    const soft = buildArcPathData({ textWidth: 400, direction: 'up', amount: 0.2 });
    const hard = buildArcPathData({ textWidth: 400, direction: 'up', amount: 1 });

    expect(hard.width).toBeLessThan(soft.width);
    expect(hard.height).toBeGreaterThan(soft.height);
  });

  it('keeps the box positive for tiny text', () => {
    for (const direction of ['up', 'down'] as const) {
      const geometry = buildArcPathData({ textWidth: 4, direction, amount: 0 });

      expect(geometry.width).toBeGreaterThan(0);
      expect(geometry.height).toBeGreaterThan(0);
      expect(geometry.d).not.toContain('NaN');
    }
  });
});
