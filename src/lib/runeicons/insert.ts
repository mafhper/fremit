/**
 * Insertion of a vendored Runeicon into the active page.
 *
 * The icon is frozen at insert time: the final markup (colors applied) becomes
 * a data URL and lands as a normal `image` object, so the Documento JSON
 * schema is untouched and every export route already renders it. Changing the
 * colors afterwards means inserting again — the panel says so; a parametric
 * `icon` object type stays a documented alternative (ADR-008), not this slice.
 */

import { createImageObject, type ImageObject } from '@/lib/document';
import type { RuneiconEntry, RuneiconStyle } from './catalog';
import { buildRuneiconImageSrc, type RuneiconColorState } from './svg';

/** Side of an inserted icon, as a fraction of the page's smallest side. */
export const RUNEICON_INSERT_FRACTION = 0.22;

export interface RuneiconInsertOptions {
  page: { width: number; height: number };
  style: RuneiconStyle;
  colors: RuneiconColorState;
}

export function buildRuneiconImageObject(
  svg: string,
  entry: RuneiconEntry,
  options: RuneiconInsertOptions,
): ImageObject {
  const size = Math.max(
    24,
    Math.round(Math.min(options.page.width, options.page.height) * RUNEICON_INSERT_FRACTION),
  );

  return createImageObject(
    buildRuneiconImageSrc(svg, {
      style: options.style,
      colors: options.colors,
      size,
    }),
    {
      name: entry.name,
      x: Math.round((options.page.width - size) / 2),
      y: Math.round((options.page.height - size) / 2),
      width: size,
      height: size,
      fit: 'contain',
    },
  );
}
