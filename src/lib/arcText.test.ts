import { describe, expect, it } from 'vitest';
import {
  ARC_MAX_SWEEP_DEGREES,
  ARC_MIN_SWEEP_DEGREES,
  DEFAULT_ARC_AMOUNT,
  arcSweepDegrees,
  arcTextBox,
  arcTextWidth,
  buildArcPathData,
  clampArcAmount,
  measureTextWidth,
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

/** Arc length from the endpoint parameters: the sweep is 2·asin(chord/2r). */
function arcLength(d: string): number {
  const arc = readArcPath(d);
  const chord = arc.x1 - arc.x0;

  return arc.radius * 2 * Math.asin(chord / (2 * arc.radius));
}

describe('arc text layout width', () => {
  it('runs on the engine layout when it is wider than the string measure', () => {
    // The Linux/FreeType case: the engine's per-glyph sum lands a fraction of
    // a pixel past the one-shot string measure. The path must cover it.
    const measured = 400;
    const layout = 400.75;

    const width = arcTextWidth(measured, layout);

    expect(width).toBeGreaterThan(layout);
    expect(width).toBeCloseTo(layout + 1, 6);
  });

  it('keeps a sub-pixel slack over the wider measurement', () => {
    // The layout is the same as the string measure (Windows/DirectWrite): the
    // path still gets a 1 px floor, because the path data is rounded and the
    // two measurements never agree to the last bit.
    expect(arcTextWidth(400, 0)).toBeCloseTo(401, 6);
    expect(arcTextWidth(400, 320)).toBeCloseTo(401, 6);

    // Long runs outgrow the floor: the slack scales with the width.
    expect(arcTextWidth(4000, 0)).toBeCloseTo(4008, 6);
  });

  it('never lets the centering offset go negative', () => {
    // Fabric centers the run with `(pathLength - layoutWidth) / 2` and wraps
    // the first glyph to the end of the path when that offset is negative.
    const measured = 352.15;
    const layout = 352.83;

    for (const direction of ['up', 'down'] as const) {
      const geometry = buildArcPathData({
        textWidth: arcTextWidth(measured, layout),
        direction,
        amount: 0.6,
      });

      expect((arcLength(geometry.d) - layout) / 2, `${direction} offset`).toBeGreaterThan(0);
    }
  });

  it('derives the stored box from the same width as the path', () => {
    const metrics = {
      text: 'Curved text',
      fontFamily: 'Inter, sans-serif',
      fontSize: 59,
      fontWeight: 600,
    };

    const measuredOnly = arcTextBox(metrics, { direction: 'up', amount: 0.6 });
    const layout = measureTextWidth(metrics) + 4;
    const withLayout = arcTextBox(metrics, { direction: 'up', amount: 0.6 }, layout);

    // Same sweep, longer run: the chord and the sagitta both grow, so a box
    // measured from only one of the two inputs could describe a narrower run
    // than the path it is stored with.
    expect(withLayout.width).toBeGreaterThan(measuredOnly.width);
    expect(withLayout.height).toBeGreaterThan(measuredOnly.height);
    expect(arcLength(withLayout.geometry.d)).toBeGreaterThan(layout);
    expect((arcLength(withLayout.geometry.d) - layout) / 2).toBeGreaterThan(0);
  });
});
