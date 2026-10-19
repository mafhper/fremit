/**
 * Pure helpers of the numeric field, kept out of the component file so they
 * can be unit-tested directly (the `.tsx` test files are not collected by the
 * Vitest include pattern) and so the component file exports components only.
 */

import { round2 } from '@/lib/math';

/** Display value with at most two decimals — page geometry is fractional. */
export function displayValue(value: number): string {
  return String(round2(value));
}

/**
 * Parses the draft shown in the input into the value that goes to `onCommit`.
 * `null` means "wait for the blur re-sync": an empty or non-finite draft is
 * never a write. A finite draft is clamped, so the document never sees a value
 * outside the field bounds.
 */
export function parseDraft(raw: string, min?: number, max?: number): number | null {
  if (raw.trim() === '') return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  const withMin = min === undefined ? parsed : Math.max(min, parsed);

  return max === undefined ? withMin : Math.min(max, withMin);
}
