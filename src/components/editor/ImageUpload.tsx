import { type ClipboardEvent, type FormEvent, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardPanelIcon, LinkPanelIcon, UploadPanelIcon } from '@/components/icons/AppIcons';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import {
  SourceResolutionError,
  detectSourceMode,
  resolveFileSource,
  resolveSourceFromUrl,
} from '@/lib/sourceResolver';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

interface SourceControlsProps {
  variant?: 'home' | 'editor';
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

export function SourceControls({ variant = 'home' }: SourceControlsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { copy } = useI18n();
  const isEditor = variant === 'editor';

  const source = useStore((state) => state.source);
  const frame = useStore((state) => state.frame);
  const setDraftUrl = useStore((state) => state.setDraftUrl);
  const startSourceLoading = useStore((state) => state.startSourceLoading);
  const commitResolvedSource = useStore((state) => state.commitResolvedSource);
  const failSourceLoading = useStore((state) => state.failSourceLoading);
  const clearSourceError = useStore((state) => state.clearSourceError);

  const goToEditor = () => {
    if (!location.pathname.startsWith('/editor')) {
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

  const handleUrlSubmit = async (event: FormEvent) => {
    event.preventDefault();
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

  const handlePaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    await handleFile(file, 'clipboard-image');
  };

  return (
    <div className="space-y-3" onPaste={handlePaste} data-testid={variant === 'home' ? 'home-source' : 'editor-source'}>
      <div
        className={cn(
          isEditor
            ? 'rounded-[1.2rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.55] p-3 transition'
            : 'surface-card rounded-[1.5rem] border px-4 py-3 transition',
          dragActive ? 'border-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.16)]' : '',
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={async (event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer.files?.[0];
          if (file) await handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) {
              await handleFile(file);
              event.target.value = '';
            }
          }}
        />

        <div className={cn('space-y-3', isEditor && 'space-y-3')}>
          <form onSubmit={handleUrlSubmit} className={cn('space-y-3', isEditor && 'space-y-2')}>
            <label className={cn('text-sm font-medium text-[hsl(var(--text-muted))]', isEditor && 'text-xs uppercase tracking-[0.18em]')} htmlFor="source-url">
              {copy.source.label}
            </label>
            <div className={cn('flex flex-col gap-3 sm:flex-row', isEditor && 'sm:items-stretch')}>
              <div className="relative flex-1">
                <LinkPanelIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-soft))]" />
                <input
                  id="source-url"
                  type="text"
                  placeholder={copy.source.placeholder}
                  className={cn(
                    'w-full border border-input bg-background text-sm text-foreground outline-none transition placeholder:text-[hsl(var(--text-soft))] focus:border-accent focus:ring-2 focus:ring-accent/20',
                    isEditor ? 'h-11 rounded-[1rem] px-11' : 'h-11 rounded-xl px-10',
                  )}
                  value={source.draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                />
                {source.status === 'loading' && (
                  <span className="absolute right-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent animate-pulse" />
                )}
              </div>
              <Button type="submit" className={cn(isEditor ? 'h-11 rounded-[1rem] px-5' : 'h-11 rounded-xl px-5')}>
                {source.status === 'loading' ? copy.source.loading : copy.source.submit}
              </Button>
            </div>
          </form>

          <div className={cn("grid gap-3", isEditor ? "sm:grid-cols-2" : "grid-cols-1")}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'surface-muted flex items-center gap-3 border text-left transition hover:border-accent/40 hover:bg-[hsl(var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isEditor ? 'justify-center rounded-[1rem] px-3 py-2.5' : 'rounded-xl px-4 py-2.5',
              )}
            >
              <UploadPanelIcon className="h-5 w-5 text-accent" />
              <div className={cn(isEditor && 'flex items-center gap-2')}>
                <p className="text-sm font-semibold text-foreground">{copy.source.upload}</p>
                {!isEditor && <p className="text-xs text-[hsl(var(--text-soft))]">{copy.source.uploadHint}</p>}
              </div>
            </button>

            {isEditor && (
              <button
                type="button"
                onClick={handleClipboardRead}
                className={cn(
                  'surface-muted flex items-center gap-3 border text-left transition hover:border-accent/40 hover:bg-[hsl(var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isEditor ? 'justify-center rounded-[1rem] px-3 py-2.5' : 'rounded-xl px-4 py-2.5',
                )}
              >
                <ClipboardPanelIcon className="h-5 w-5 text-primary" />
                <div className={cn(isEditor && 'flex items-center gap-2')}>
                  <p className="text-sm font-semibold text-foreground">{copy.source.paste}</p>
                  {!isEditor && <p className="text-xs text-[hsl(var(--text-soft))]">{copy.source.pasteHint}</p>}
                </div>
              </button>
            )}
          </div>

          {source.status === 'loading' && (
            <p className={cn('text-sm text-[hsl(var(--text-muted))]', isEditor && 'text-xs')}>{copy.source.loading}</p>
          )}
        </div>
      </div>

      {source.errorMessage && (
        <div className="rounded-[1.25rem] border border-accent/30 bg-accent/10 p-4 text-sm text-foreground">
          <p className="font-semibold">{copy.source.fallbackTitle}</p>
          <p className="mt-2 leading-6 text-[hsl(var(--text-muted))]">{source.errorMessage}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
            {copy.source.fallbackAction}
          </p>
        </div>
      )}
    </div>
  );
}

export { SourceControls as ImageUpload };
