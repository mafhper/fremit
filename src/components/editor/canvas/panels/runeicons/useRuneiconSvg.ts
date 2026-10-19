/**
 * Loads the vendored SVG of one icon for the panel, reusing the module cache
 * of `loadRuneiconSvg` (a card and the inspector share the same fetch). The
 * hook never throws: a failed load becomes a `failed` flag, and the panel
 * shows its own error copy.
 *
 * The request is keyed by the asset URL (style + folder + file), not by the
 * entry object: a recreated entry with the same request must not re-run the
 * effect, and a different style must. The state carries the URL it belongs to,
 * so switching the selection shows the loading state again without resetting
 * state from the effect body.
 */

import { useEffect, useState } from 'react';
import type { RuneiconEntry, RuneiconStyle } from '@/lib/runeicons/catalog';
import { loadRuneiconSvgByUrl, runeiconAssetUrl } from '@/lib/runeicons/load';

export interface RuneiconSvgState {
  markup: string | null;
  failed: boolean;
}

interface LoadedRuneiconSvg extends RuneiconSvgState {
  key: string;
}

const LOADING: RuneiconSvgState = { markup: null, failed: false };

export function useRuneiconSvg(entry: RuneiconEntry, style: RuneiconStyle): RuneiconSvgState {
  const [loaded, setLoaded] = useState<LoadedRuneiconSvg | null>(null);
  const url = runeiconAssetUrl(entry, style);

  useEffect(() => {
    let active = true;

    loadRuneiconSvgByUrl(url)
      .then((markup) => {
        if (active) setLoaded({ key: url, markup, failed: false });
      })
      .catch(() => {
        if (active) setLoaded({ key: url, markup: null, failed: true });
      });

    return () => {
      active = false;
    };
  }, [url]);

  return loaded && loaded.key === url ? loaded : LOADING;
}
