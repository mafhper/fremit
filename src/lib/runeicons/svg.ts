/**
 * Pure SVG transforms for the vendored Runeicons artwork.
 *
 * A vendored file is a plain 24×24 (or pixelated ~40×41) `<svg>` whose paint
 * uses fixed slot values per style — measured over all 919 vendored files:
 * `black` (normal, pixelated), `#A4A5A6`/`#DDDDDD` (duotone) and
 * `#DDDDDD`/`#1C1F21` (fill). White fills only appear inside `clipPath`/`mask`
 * definitions, so they are structure, never paint, and are left alone. Glass
 * carries baked gradients and keeps its design.
 *
 * The panel recolors the fetched markup for the preview and freezes the final
 * SVG as a data URL when the icon lands in the document — the document stores
 * an `image` object, no schema change, and the export routes already know how
 * to render it.
 */

import { completeHexColor } from '@/lib/colorHex';
import type { RuneiconStyle } from './catalog';

export interface RuneiconColorState {
  primary: string | null;
  secondary: string | null;
  gradient: boolean;
}

export const DEFAULT_RUNEICON_COLORS: RuneiconColorState = {
  primary: null,
  secondary: null,
  gradient: false,
};

/**
 * Id of the injected gradient. One fixed id is safe: the panel previews a
 * single icon at a time, and a frozen icon is a standalone data-URL image (its
 * own document), so two inserted icons never share an id namespace.
 */
const GRADIENT_ID = 'runeicon-gradient';

/**
 * Intermediate markers of the slot rewrite; never part of any vendored file,
 * so a chosen color cannot collide with the value of the other slot.
 */
const PRIMARY_TOKEN = '__runeicon_primary__';
const SECONDARY_TOKEN = '__runeicon_secondary__';

/** The paint values of each style, as the vendored artwork writes them. */
const SLOT_VALUES: Partial<Record<RuneiconStyle, { primary: string[]; secondary: string[] }>> = {
  normal: { primary: ['black'], secondary: [] },
  pixelated: { primary: ['black'], secondary: [] },
  duotone: { primary: ['#A4A5A6'], secondary: ['#DDDDDD'] },
  fill: { primary: ['#DDDDDD'], secondary: ['#1C1F21'] },
};

/** The colors the artwork ships with; the panel starts from these. */
const DESIGNED_COLORS: Partial<
  Record<RuneiconStyle, { primary: string; secondary: string | null }>
> = {
  normal: { primary: '#000000', secondary: null },
  pixelated: { primary: '#000000', secondary: null },
  duotone: { primary: '#A4A5A6', secondary: '#DDDDDD' },
  fill: { primary: '#DDDDDD', secondary: '#1C1F21' },
};

/** Glass carries baked gradients: no color controls, inserted as designed. */
export function supportsRuneiconColor(style: RuneiconStyle): boolean {
  return style in SLOT_VALUES;
}

export interface ResolvedRuneiconColors {
  primary: string;
  secondary: string;
  gradient: boolean;
}

/**
 * The concrete colors of a state: the chosen value, else the designed one.
 * One-slot styles (normal, pixelated) have no designed second color, so their
 * gradient end starts as a lighter tint of the primary. `null` for styles
 * without color support.
 */
export function resolveRuneiconColors(
  style: RuneiconStyle,
  state: RuneiconColorState,
): ResolvedRuneiconColors | null {
  const designed = DESIGNED_COLORS[style];
  if (!designed) return null;

  const primary = completeHexColor(state.primary ?? '') ?? designed.primary;
  const secondary =
    completeHexColor(state.secondary ?? '') ??
    designed.secondary ??
    mixHex(primary, '#ffffff', 0.5);

  return { primary, secondary, gradient: state.gradient };
}

/** Blends two hex colors; invalid input keeps the target color. */
export function mixHex(from: string, to: string, amount: number): string {
  const source = expandHex(from);
  const target = expandHex(to);
  if (!source || !target) return to;

  const ratio = Math.min(1, Math.max(0, amount));
  const channels = source.map((channel, index) =>
    Math.round(channel + (target[index] - channel) * ratio)
      .toString(16)
      .padStart(2, '0'),
  );

  return `#${channels.join('')}`;
}

function expandHex(value: string): [number, number, number] | null {
  const hex = completeHexColor(value);
  if (!hex) return null;

  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Rewrites the `stroke`/`fill` paint of `values` to `replacement`, wherever a
 * vendored file carries it. The set writes double-quoted, lower-case
 * attributes (measured over all 919 files), but the rewrite still accepts the
 * documented variations a re-vendor could introduce: single quotes, spaces
 * around `=`, color values in any case and the same paint inside an inline
 * `style` attribute. Paint driven by a `<style>` element or a `class` is out
 * of scope — `scripts/vendor-runeicons.mjs` refuses those files.
 */
function replacePaint(svg: string, values: readonly string[], replacement: string): string {
  const wanted = new Set(values.map((value) => value.toLowerCase()));
  const rewrite = (value: string) => (wanted.has(value.trim().toLowerCase()) ? replacement : null);

  let result = svg.replace(
    /(stroke|fill)(\s*=\s*)(["'])([^"']*)\3/g,
    (match, name: string, equals: string, quote: string, value: string) => {
      const next = rewrite(value);

      return next === null ? match : `${name}${equals}${quote}${next}${quote}`;
    },
  );

  result = result.replace(
    /(^|\s)(style\s*=\s*)(["'])([^"']*)\3/gi,
    (match, lead: string, prefix: string, quote: string, css: string) => {
      const declarations = css.replace(
        /(^|;)(\s*)(stroke|fill)(\s*:\s*)([^;]*?)(\s*)(?=;|$)/g,
        (
          declaration,
          start: string,
          space: string,
          name: string,
          colon: string,
          value: string,
          trailing: string,
        ) => {
          const next = rewrite(value);

          return next === null ? declaration : `${start}${space}${name}${colon}${next}${trailing}`;
        },
      );

      return declarations === css ? match : `${lead}${prefix}${quote}${declarations}${quote}`;
    },
  );

  return result;
}

/** Grid preview: one-slot styles ride the theme text color, the rest keep their design. */
export function runeiconPreviewMarkup(svg: string, style: RuneiconStyle): string {
  const slots = style === 'normal' || style === 'pixelated' ? SLOT_VALUES[style] : undefined;
  if (!slots) return svg;

  return replacePaint(svg, slots.primary, 'currentColor');
}

/**
 * The final markup of an icon: slots rewritten to the resolved colors, with a
 * linear gradient over the primary slot when asked. Glass and unknown styles
 * come back untouched.
 *
 * Each slot is first swapped for a token and the tokens are filled in at the
 * end, so a chosen color that happens to equal the *other* slot's value (say
 * `#DDDDDD` as the primary of a duotone) can never rewrite both.
 */
export function applyRuneiconColor(
  svg: string,
  style: RuneiconStyle,
  state: RuneiconColorState,
): string {
  const slots = SLOT_VALUES[style];
  const resolved = resolveRuneiconColors(style, state);
  if (!slots || !resolved) return svg;

  const primaryPaint = resolved.gradient ? `url(#${GRADIENT_ID})` : resolved.primary;
  let result = replacePaint(svg, slots.primary, PRIMARY_TOKEN);

  if (slots.secondary.length > 0) {
    result = replacePaint(result, slots.secondary, SECONDARY_TOKEN);
  }

  result = result.replaceAll(PRIMARY_TOKEN, primaryPaint).replaceAll(SECONDARY_TOKEN, resolved.secondary);

  if (resolved.gradient) {
    result = injectGradientDefs(result, resolved.primary, resolved.secondary);
  }

  return result;
}

function injectGradientDefs(svg: string, from: string, to: string): string {
  const defs =
    `<defs><linearGradient id="${GRADIENT_ID}" x1="0%" y1="0%" x2="100%" y2="100%">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    '</linearGradient></defs>';

  return svg.replace(/<svg\b[^>]*>/, (tag) => `${tag}${defs}`);
}

/**
 * Sets the intrinsic width/height of the frozen file to a multiple of the
 * insertion size (the viewBox keeps the geometry), so the rasterized image
 * stays sharp when the canvas and the export draw it at page scale. The
 * aspect ratio of the viewBox is preserved — the pixelated set is not square.
 */
export function withIntrinsicSize(svg: string, maxSide: number): string {
  const viewBox = readViewBox(svg);
  if (!viewBox) return svg;

  const scale = Math.max(1, maxSide) / Math.max(viewBox.width, viewBox.height);
  const width = Math.max(1, Math.round(viewBox.width * scale));
  const height = Math.max(1, Math.round(viewBox.height * scale));

  return svg.replace(/<svg\b[^>]*>/, (tag) =>
    setAttribute(setAttribute(tag, 'width', String(width)), 'height', String(height)),
  );
}

export interface RuneiconViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function readViewBox(svg: string): RuneiconViewBox | null {
  const match = svg.match(/viewBox="([^"]+)"/);
  if (!match) return null;

  const parts = match[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;

  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function setAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);

  return pattern.test(tag)
    ? tag.replace(pattern, ` ${name}="${value}"`)
    : tag.replace(/>$/, ` ${name}="${value}">`);
}

/** The self-contained image source the document stores for an inserted icon. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface RuneiconFreezeOptions {
  style: RuneiconStyle;
  colors: RuneiconColorState;
  /** Longest side of the artwork, in document units. */
  size: number;
}

/** Intrinsic size of the frozen file, as a multiple of the insertion size. */
export const RUNEICON_INTRINSIC_SCALE = 3;

export function buildRuneiconImageSrc(svg: string, options: RuneiconFreezeOptions): string {
  const colored = applyRuneiconColor(svg, options.style, options.colors);
  const sized = withIntrinsicSize(
    colored,
    Math.round(options.size * RUNEICON_INTRINSIC_SCALE),
  );

  return svgToDataUrl(sized);
}
