import { describe, expect, it } from 'vitest';
import { repairFabricSvgAttributes } from '@/lib/export/svgMarkup';

describe('repairFabricSvgAttributes', () => {
  it('separates the rotate attribute from the inline style Fabric glues to it', () => {
    const broken =
      '<tspan x="41.1746" y="-22.8276"  rotate="11.7172"style="white-space: pre; "> </tspan>';

    expect(repairFabricSvgAttributes(broken)).toBe(
      '<tspan x="41.1746" y="-22.8276"  rotate="11.7172" style="white-space: pre; "> </tspan>',
    );
  });

  it('leaves well-formed markup and unrelated quotes untouched', () => {
    const fine =
      '<tspan rotate="-33.3" style="white-space: pre; ">C</tspan><text style="fill: red">x</text>';

    expect(repairFabricSvgAttributes(fine)).toBe(fine);
    // A value that merely ends with a quote is not the defect.
    expect(repairFabricSvgAttributes('xlink:href="data:x" y="1"')).toBe(
      'xlink:href="data:x" y="1"',
    );
  });

  it('inserts the separator for any attribute glued to a style block', () => {
    // The measured case is `rotate`, but the missing separator is the defect:
    // a hand-edited value or a Fabric change would glue the next attribute the
    // same way, and the repair is the same.
    expect(repairFabricSvgAttributes('fill="red"style="x"')).toBe('fill="red" style="x"');
  });

  it('repairs every occurrence in a curved run', () => {
    const broken = 'rotate="1"style="a" rotate="2"style="b"';
    const repaired = 'rotate="1" style="a" rotate="2" style="b"';

    expect(repairFabricSvgAttributes(broken)).toBe(repaired);
  });
});
