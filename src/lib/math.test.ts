import { describe, expect, it } from 'vitest';
import { round2 } from '@/lib/math';

describe('round2', () => {
  it('rounds to two decimals and leaves two-decimal values alone', () => {
    expect(round2(0)).toBe(0);
    expect(round2(1.239)).toBe(1.24);
    expect(round2(246.2468)).toBe(246.25);
    expect(round2(-2)).toBe(-2);
    expect(round2(-2.3456)).toBe(-2.35);
  });

  it('keeps a negative rotation exactly as the canvas reports it', () => {
    // The worked document of `document.test.ts` stores rotation -2: the codec
    // rounds the Fabric angle, it does not canonicalize it modulo 360.
    expect(round2(-2)).toBe(-2);
  });
});
