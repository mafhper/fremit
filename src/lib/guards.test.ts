import { describe, expect, it } from 'vitest';
import { isRecord } from '@/lib/guards';

describe('isRecord', () => {
  it('accepts plain objects and rejects the shapes a JSON parse can hand us', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ kind: 'solid' })).toBe(true);

    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord([{ kind: 'solid' }])).toBe(false);
    expect(isRecord('solid')).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(() => null)).toBe(false);
  });
});
