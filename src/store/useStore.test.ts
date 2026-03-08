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
});
