/**
 * On-demand loader for the vendored Runeicons artwork.
 *
 * The SVGs live under `public/runeicons/` and are served as static files, so
 * the `/editor` bundle never carries one: the panel fetches the file of the
 * icon it shows and keeps the text in a module cache, which also makes a
 * second selection of the same icon free (and the insert reuse the preview's
 * fetch).
 *
 * Every fetch is same-origin and offline-safe after deployment — the files
 * ship with the app. The markup is checked before it is trusted on the page
 * (the grid inlines it), and a failed load is not cached, so a retry can
 * still succeed.
 */

import { runeiconAssetPath, type RuneiconEntry, type RuneiconStyle } from './catalog';

const svgCache = new Map<string, Promise<string>>();

/** URL of one icon file, under the app base (`/fremit/` on Pages). */
export function runeiconAssetUrl(entry: RuneiconEntry, style: RuneiconStyle): string {
  return `${import.meta.env.BASE_URL}${runeiconAssetPath(entry, style)}`;
}

/**
 * Plain `<svg>` document with no executable content — the contract of the
 * vendored set (enforced by `scripts/vendor-runeicons.mjs`), re-checked here
 * because the fetched text is inlined into the panel.
 */
export function isSafeRuneiconSvg(markup: string): boolean {
  if (!markup.startsWith('<svg') || !markup.endsWith('</svg>')) return false;

  return !/<script|javascript:|\son\w+\s*=/i.test(markup);
}

export function loadRuneiconSvg(entry: RuneiconEntry, style: RuneiconStyle): Promise<string> {
  return loadRuneiconSvgByUrl(runeiconAssetUrl(entry, style));
}

/**
 * URL-keyed loader behind `loadRuneiconSvg`: the panel hook depends on the URL
 * (a string), so a recreated entry object with the same request does not run
 * the effect again.
 */
export function loadRuneiconSvgByUrl(url: string): Promise<string> {
  const cached = svgCache.get(url);
  if (cached) return cached;

  const pending = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`runeicon request failed: ${response.status}`);

      return response.text();
    })
    .then((text) => {
      const markup = text.trim();
      if (!isSafeRuneiconSvg(markup)) throw new Error(`runeicon markup rejected: ${url}`);

      return markup;
    });

  svgCache.set(url, pending);
  // A failed load leaves the cache, so the next attempt can still succeed.
  void pending.catch(() => svgCache.delete(url));

  return pending;
}
