/**
 * useSourceEntry.ts
 * Entrada de fonte (link, arquivo, imagem colada) compartilhada pela home e pelo editor:
 * resolve a fonte, grava na store e leva ao editor.
 */

import { type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useI18n } from '@/i18n/useI18n';
import { isAppRoute } from '@/lib/appPath';
import {
  SourceResolutionError,
  detectSourceMode,
  resolveFileSource,
  resolveSourceFromUrl,
} from '@/lib/sourceResolver';
import { useStore } from '@/store/useStore';

/** Subconjunto do ClipboardEvent do React usado aqui (facilita testar). */
export interface PasteLikeEvent {
  clipboardData: DataTransfer;
  preventDefault: () => void;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof SourceResolutionError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: 'unknown',
    message: fallbackMessage,
  };
}

export function useSourceEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { copy } = useI18n();

  const source = useStore((state) => state.source);
  const frame = useStore((state) => state.frame);
  const setDraftUrl = useStore((state) => state.setDraftUrl);
  const startSourceLoading = useStore((state) => state.startSourceLoading);
  const commitResolvedSource = useStore((state) => state.commitResolvedSource);
  const failSourceLoading = useStore((state) => state.failSourceLoading);
  const clearSourceError = useStore((state) => state.clearSourceError);

  const goToEditor = () => {
    // From the public site the capture lands on the dedicated canvas; the
    // mockup composer keeps its own capture in place. `isAppRoute` strips the
    // deploy base, so the check holds whatever `useLocation` reports.
    if (!isAppRoute(location.pathname, '/editor') && !isAppRoute(location.pathname, '/mockup')) {
      navigate('/editor');
    }
  };

  const handleResolved = async (task: Promise<Awaited<ReturnType<typeof resolveSourceFromUrl>>>) => {
    clearSourceError();
    try {
      const resolved = await task;
      commitResolvedSource(resolved);
      goToEditor();
    } catch (error) {
      const { code, message } = getErrorMessage(error, copy.source.genericError);
      failSourceLoading(code, message);
    }
  };

  const handleFile = async (file: File, mode: 'upload' | 'clipboard-image' = 'upload') => {
    startSourceLoading(mode);
    await handleResolved(resolveFileSource(file, mode));
  };

  const handleUrlSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!source.draftUrl.trim()) return;

    try {
      const mode = detectSourceMode(source.draftUrl);
      startSourceLoading(mode, source.draftUrl.trim());
      await handleResolved(
        resolveSourceFromUrl(
          source.draftUrl,
          mode === 'website-url'
            ? {
                viewportWidth: frame.windowWidth,
                viewportHeight: frame.windowHeight,
                captureDelayMs: source.captureDelayMs,
                captureSelector: source.captureSelector,
              }
            : {},
        ),
      );
    } catch (error) {
      const { code, message } = getErrorMessage(error, copy.source.genericError);
      failSourceLoading(code, message);
    }
  };

  const handleClipboardRead = async () => {
    try {
      if (!navigator.clipboard?.read) {
        throw new SourceResolutionError(
          'clipboard-unavailable',
          'Clipboard image read is not supported here. Paste directly or upload a screenshot.',
        );
      }

      const items = await navigator.clipboard.read();
      const imageItem = items.find((item) => item.types.some((type) => type.startsWith('image/')));

      if (!imageItem) {
        throw new SourceResolutionError(
          'clipboard-empty',
          'No image was found in your clipboard. Copy a screenshot and try again.',
        );
      }

      const imageType = imageItem.types.find((type) => type.startsWith('image/'));
      if (!imageType) {
        throw new SourceResolutionError('clipboard-empty', 'No image was found in your clipboard.');
      }

      const blob = await imageItem.getType(imageType);
      const file = new File([blob], 'clipboard-image.png', { type: blob.type });
      await handleFile(file, 'clipboard-image');
    } catch (error) {
      const { code, message } = getErrorMessage(error, copy.source.genericError);
      failSourceLoading(code, message);
    }
  };

  const handlePaste = async (event: PasteLikeEvent) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    await handleFile(file, 'clipboard-image');
  };

  return {
    source,
    isLoading: source.status === 'loading',
    setDraftUrl,
    clearSourceError,
    handleFile,
    handleUrlSubmit,
    handleClipboardRead,
    handlePaste,
  };
}
