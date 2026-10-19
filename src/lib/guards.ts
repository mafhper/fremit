/**
 * Type guards shared by the parsing and storage modules: one definition of
 * "plain JSON object", so every tolerant reader accepts exactly the same
 * shapes (and rejects `null`, arrays and primitives alike).
 */

/** A plain object record — not `null`, not an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
