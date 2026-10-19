/**
 * Pure helpers for the color fields. Kept out of the component file so they
 * can be unit-tested directly (the `.tsx` test files are not collected by the
 * Vitest include pattern) and so the component file exports components only.
 */

import { isCompleteHex } from '@/lib/colorHex';

const SHORT_HEX = /^#([0-9a-f]{3})$/i;

/**
 * `<input type="color">` only accepts `#rrggbb`; `#rgb` expands and anything
 * incomplete falls back to black so the well never receives an invalid value.
 */
export function toColorInputValue(value: string): string {
  const hex = value.trim();

  if (SHORT_HEX.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return isCompleteHex(hex) ? hex.toLowerCase() : '#000000';
}
