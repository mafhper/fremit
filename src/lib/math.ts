/**
 * Numeric helpers shared by the geometry modules: one rounding rule for every
 * value that reaches the document or the SVG markup, so the output reads clean
 * in exactly the same way everywhere.
 */

/** Rounds to two decimals — the precision of every geometry value we write. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
