import { describe, expect, it } from 'vitest';
import { displayValue, parseDraft } from '@/components/editor/canvas/panels/numberValue';

describe('numberValue', () => {
  it('shows at most two decimals', () => {
    expect(displayValue(12)).toBe('12');
    expect(displayValue(12.3456)).toBe('12.35');
    expect(displayValue(0.1 + 0.2)).toBe('0.3');
  });

  it('waits on empty or non-numeric drafts instead of writing', () => {
    expect(parseDraft('')).toBeNull();
    expect(parseDraft('   ')).toBeNull();
    expect(parseDraft('abc')).toBeNull();
    expect(parseDraft('-')).toBeNull();
    expect(parseDraft('Infinity')).toBeNull();
  });

  it('commits a clamped number for a finite draft', () => {
    expect(parseDraft('12.')).toBe(12);
    expect(parseDraft('-5')).toBe(-5);
    expect(parseDraft('0', 1)).toBe(1);
    expect(parseDraft('150', undefined, 100)).toBe(100);
    expect(parseDraft('42', 0, 100)).toBe(42);
  });
});
