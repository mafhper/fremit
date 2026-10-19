/**
 * Hex color helpers shared by the document ops and the color fields. They
 * live in `lib` so `documentOps` and the store can validate a page background
 * without importing UI code (the reverse direction — `src/lib` importing
 * `components` — is the one this repo forbids).
 */

const COMPLETE_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A value worth writing to the document: complete `#rgb` or `#rrggbb`. */
export function isCompleteHex(value: string): boolean {
  return COMPLETE_HEX.test(value.trim());
}

/**
 * The value the document stores: a complete hex trimmed and lowercased.
 * `null` means "not a color the document accepts" — the store ignores the
 * write and the color well falls back to black.
 */
export function normalizeHexColor(value: string): string | null {
  const hex = value.trim();

  return isCompleteHex(hex) ? hex.toLowerCase() : null;
}

/**
 * The same value in six digits: `#rgb` is expanded to `#rrggbb`, because the
 * SVG paint and the native color wells both want the long form. `null` for
 * anything that is not a complete hex.
 */
export function completeHexColor(value: string): string | null {
  const hex = normalizeHexColor(value);
  if (!hex) return null;

  return hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
}
