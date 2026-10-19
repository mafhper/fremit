import { describe, expect, it } from 'vitest';
import { toColorInputValue } from '@/components/editor/canvas/panels/colorValue';

describe('colorValue', () => {
  it('expands short hex for the native color well', () => {
    expect(toColorInputValue('#abc')).toBe('#aabbcc');
    expect(toColorInputValue('#1F6FEB')).toBe('#1f6feb');
  });

  it('falls back to black for values the well cannot represent', () => {
    expect(toColorInputValue('linear-gradient(#fff, #000)')).toBe('#000000');
    expect(toColorInputValue('#ab')).toBe('#000000');
  });
});
