/**
 * Local brand kit (block E of the sidebar plan): a small palette, a heading
 * font, a body font and a logo, kept in localStorage. No backend, no account —
 * the kit is a convenience over document fields the inspector already edits,
 * and the panel applies it through the store, never around it.
 *
 * The stored JSON is read tolerantly: an unreadable, partial or hand-edited
 * value falls back per field instead of breaking the panel. Colors are
 * normalized to the same `#rgb`/`#rrggbb` contract the document accepts, and
 * the logo is only kept when it is an image data URL within
 * `BRAND_LOGO_MAX_LENGTH` — a stored value is validated on the way in and on
 * the way out.
 */

import { normalizeHexColor } from '@/lib/colorHex';
import { FONT_STACKS } from '@/lib/fonts';
import { isRecord } from '@/lib/guards';

export interface BrandKit {
  /** Normalized hex colors, at most `BRAND_COLOR_LIMIT`. */
  colors: string[];
  headingFont: string;
  bodyFont: string;
  /** Data URL of the logo; `null` when the kit has none. */
  logo: string | null;
}

export const BRAND_KIT_STORAGE_KEY = 'fremit.brand';
export const BRAND_COLOR_LIMIT = 8;

/**
 * Cap of a stored logo, in characters of the data URL. A logo is a small mark,
 * not an asset library: anything longer is refused before it reaches
 * localStorage, where it would eat the quota of every other key.
 */
export const BRAND_LOGO_MAX_LENGTH = 1_000_000;

/**
 * A logo the kit accepts: an image data URL (the panel uploads produce one)
 * within the size cap. Anything else — a remote URL, another MIME type, an
 * oversized file — is not stored.
 */
export function isValidBrandLogo(src: string): boolean {
  return src.startsWith('data:image/') && src.length <= BRAND_LOGO_MAX_LENGTH;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  colors: ['#111111', '#f5f0e8', '#1f6feb', '#38bdf8', '#f59e0b', '#e11d48'],
  headingFont: FONT_STACKS.inter,
  bodyFont: FONT_STACKS.inter,
  logo: null,
};

function readFont(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

/** Tolerant read of a stored kit; every field falls back on its own. */
export function parseBrandKit(raw: string | null): BrandKit {
  if (!raw) return DEFAULT_BRAND_KIT;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_BRAND_KIT;
  }

  if (!isRecord(parsed)) return DEFAULT_BRAND_KIT;

  const colors: string[] = [];
  if (Array.isArray(parsed.colors)) {
    for (const candidate of parsed.colors) {
      if (typeof candidate !== 'string') continue;

      const color = normalizeHexColor(candidate);
      if (color && !colors.includes(color) && colors.length < BRAND_COLOR_LIMIT) {
        colors.push(color);
      }
    }
  }

  const logo = typeof parsed.logo === 'string' ? parsed.logo.trim() : '';

  return {
    colors: colors.length > 0 ? colors : DEFAULT_BRAND_KIT.colors,
    headingFont: readFont(parsed.headingFont, DEFAULT_BRAND_KIT.headingFont),
    bodyFont: readFont(parsed.bodyFont, DEFAULT_BRAND_KIT.bodyFont),
    logo: logo !== '' && isValidBrandLogo(logo) ? logo : null,
  };
}

export function serializeBrandKit(kit: BrandKit): string {
  return JSON.stringify(kit);
}

/** Adds a color; an invalid, repeated or over-limit value is not a write. */
export function addBrandColor(kit: BrandKit, color: string): BrandKit {
  const normalized = normalizeHexColor(color);

  if (!normalized || kit.colors.includes(normalized) || kit.colors.length >= BRAND_COLOR_LIMIT) {
    return kit;
  }

  return { ...kit, colors: [...kit.colors, normalized] };
}

export function removeBrandColor(kit: BrandKit, color: string): BrandKit {
  if (!kit.colors.includes(color)) return kit;

  return { ...kit, colors: kit.colors.filter((candidate) => candidate !== color) };
}

export function setBrandFont(kit: BrandKit, role: 'heading' | 'body', stack: string): BrandKit {
  if (stack.trim() === '') return kit;

  return role === 'heading' ? { ...kit, headingFont: stack } : { ...kit, bodyFont: stack };
}

/** Sets the logo; a value the kit cannot store is not a write. */
export function setBrandLogo(kit: BrandKit, src: string | null): BrandKit {
  const trimmed = src?.trim() ?? '';

  if (trimmed !== '' && !isValidBrandLogo(trimmed)) return kit;

  const logo = trimmed !== '' ? trimmed : null;

  return logo === kit.logo ? kit : { ...kit, logo };
}

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

function defaultReadStorage(): ReadStorage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function defaultWriteStorage(): WriteStorage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

/** Reads the kit from storage; anything unreadable falls back to the defaults. */
export function loadBrandKit(storage: ReadStorage | null = defaultReadStorage()): BrandKit {
  if (!storage) return DEFAULT_BRAND_KIT;

  try {
    return parseBrandKit(storage.getItem(BRAND_KIT_STORAGE_KEY));
  } catch {
    return DEFAULT_BRAND_KIT;
  }
}

/** Best-effort write: a full or blocked storage never breaks the panel. */
export function saveBrandKit(
  kit: BrandKit,
  storage: WriteStorage | null = defaultWriteStorage(),
): void {
  if (!storage) return;

  // Last gate before the write: a logo the contract refuses is dropped here
  // too, so no path can land an invalid value in the storage.
  const safe = kit.logo !== null && !isValidBrandLogo(kit.logo) ? { ...kit, logo: null } : kit;

  try {
    storage.setItem(BRAND_KIT_STORAGE_KEY, serializeBrandKit(safe));
  } catch {
    // Private mode or quota: the kit stays in memory for the session.
  }
}
