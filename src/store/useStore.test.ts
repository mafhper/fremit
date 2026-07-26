import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/store/useStore';
import type { ResolvedSource } from '@/types/app';

const workingSource: ResolvedSource = {
  mode: 'upload',
  strategy: 'direct-image',
  sourceUrl: null,
  resolvedImageUrl: 'data:image/png;base64,working',
  title: 'Working preview',
  requestedViewportWidth: null,
  requestedViewportHeight: null,
  requestedCaptureDelayMs: null,
  requestedCaptureSelector: null,
  status: 'ready',
  errorCode: null,
  errorMessage: null,
};

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      source: {
        draftUrl: '',
        status: 'idle',
        active: null,
        pendingMode: null,
        pendingUrl: null,
        captureDelayMs: 3000,
        captureSelector: '',
        errorCode: null,
        errorMessage: null,
      },
    }));
  });

  it('keeps the last successful preview when a later load fails', () => {
    useStore.getState().commitResolvedSource(workingSource);
    useStore.getState().startSourceLoading('website-url', 'https://broken.example');
    useStore.getState().failSourceLoading('no-preview', 'Use a screenshot instead.');

    const state = useStore.getState();

    expect(state.source.active?.resolvedImageUrl).toBe('data:image/png;base64,working');
    expect(state.source.status).toBe('error');
    expect(state.source.errorCode).toBe('no-preview');
  });

  it('preserves framing on a recapture and resets it for a different page', () => {
    const firstPage: ResolvedSource = {
      ...workingSource,
      mode: 'website-url',
      strategy: 'microlink-screenshot',
      sourceUrl: 'https://example.com/page-a',
    };

    useStore.getState().commitResolvedSource(firstPage);
    useStore.getState().updateFrame({
      imageZoom: 160,
      imagePositionX: 72,
      imagePositionY: 28,
    });
    useStore.getState().commitResolvedSource({
      ...firstPage,
      requestedViewportWidth: 390,
      requestedViewportHeight: 844,
    });

    expect(useStore.getState().frame).toMatchObject({
      imageZoom: 160,
      imagePositionX: 72,
      imagePositionY: 28,
    });

    useStore.getState().commitResolvedSource({
      ...firstPage,
      sourceUrl: 'https://example.com/page-b',
    });

    expect(useStore.getState().frame).toMatchObject({
      imageZoom: 100,
      imagePositionX: 50,
      imagePositionY: 50,
    });
  });
});
