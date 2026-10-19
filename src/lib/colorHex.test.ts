import { describe, expect, it } from 'vitest';
import { isCompleteHex, normalizeHexColor } from '@/lib/colorHex';

describe('colorHex', () => {
  it('accepts only complete hex colors', () => {
    expect(isCompleteHex('#fff')).toBe(true);
    expect(isCompleteHex('#1F6FEB')).toBe(true);
    expect(isCompleteHex('  #f5f0e8  ')).toBe(true);
    expect(isCompleteHex('#ff')).toBe(false);
    expect(isCompleteHex('rgb(255 0 0)')).toBe(false);
    expect(isCompleteHex('')).toBe(false);
  });

  it('normalizes a complete hex to trimmed lowercase', () => {
    expect(normalizeHexColor('#1F6FEB')).toBe('#1f6feb');
    expect(normalizeHexColor('  #F5F0E8  ')).toBe('#f5f0e8');
    expect(normalizeHexColor('#ABC')).toBe('#abc');
  });

  it('returns null for anything the document must not store', () => {
    expect(normalizeHexColor('red')).toBeNull();
    expect(normalizeHexColor('#ff')).toBeNull();
    expect(normalizeHexColor('linear-gradient(#fff, #000)')).toBeNull();
    expect(normalizeHexColor('')).toBeNull();
  });
});
