/**
 * Lazy loader for rail panels. `React.lazy` alone only starts the download
 * when the component first renders; the rail wants the chunk to already be
 * there when the tool is clicked, so the loader promise is memoized and
 * exposed as `preload` (called on hover/focus of the button).
 *
 * The promise is cached on purpose: a rejected load is not retried by a later
 * render, which keeps the failure deterministic instead of flickering between
 * error and retry.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type PreloadableLazy = LazyExoticComponent<ComponentType> & {
  /** Starts the download ahead of the first render. Safe to call repeatedly. */
  preload: () => void;
};

export function lazyPanel(loader: () => Promise<{ default: ComponentType }>): PreloadableLazy {
  let pending: Promise<{ default: ComponentType }> | null = null;
  const load = () => (pending ??= loader());

  const component = lazy(load) as PreloadableLazy;
  component.preload = () => {
    void load();
  };

  return component;
}
