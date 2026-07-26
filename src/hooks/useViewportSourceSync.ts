import { useEffect } from 'react';
import { resolveWebsiteUrl, SourceResolutionError } from '@/lib/sourceResolver';
import { useStore } from '@/store/useStore';

export function useViewportSourceSync() {
  const activeSource = useStore((state) => state.source.active);
  const frame = useStore((state) => state.frame);
  const startSourceLoading = useStore((state) => state.startSourceLoading);
  const commitResolvedSource = useStore((state) => state.commitResolvedSource);
  const failSourceLoading = useStore((state) => state.failSourceLoading);

  useEffect(() => {
    if (!activeSource || activeSource.mode !== 'website-url' || !activeSource.sourceUrl) {
      return;
    }

    if (
      activeSource.requestedViewportWidth === frame.windowWidth &&
      activeSource.requestedViewportHeight === frame.windowHeight
    ) {
      return;
    }

    const sourceUrl = activeSource.sourceUrl;
    if (!sourceUrl) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      startSourceLoading('website-url', sourceUrl);

      try {
        const resolved = await resolveWebsiteUrl(sourceUrl, {
          viewportWidth: frame.windowWidth,
          viewportHeight: frame.windowHeight,
          captureDelayMs: useStore.getState().source.captureDelayMs,
          captureSelector: useStore.getState().source.captureSelector,
        });

        if (!cancelled) {
          commitResolvedSource(resolved);
        }
      } catch (error) {
        if (cancelled) return;

        if (error instanceof SourceResolutionError) {
          failSourceLoading(error.code, error.message);
          return;
        }

        failSourceLoading('unknown', 'The source could not be loaded. Try again or use a screenshot.');
      }
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    }, [
      activeSource,
      commitResolvedSource,
      failSourceLoading,
      frame.windowHeight,
      frame.windowWidth,
      startSourceLoading,
    ]);
}
