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

  const hasUrlValue = source.draftUrl.trim().length > 0;

  if (!isEditor) {
    return (
      <div 
        className="relative w-full max-w-2xl mx-auto" 
        onPaste={handlePaste}
        data-testid="home-source"
      >
        <div
          className={cn(
            'about-card relative flex flex-col transition-all duration-500 rounded-[2.5rem] border border-border/40 overflow-hidden',
            dragActive ? 'scale-[1.02] border-accent/60 bg-accent/5 ring-8 ring-accent/5' : 'shadow-2xl shadow-black/10',
            source.status === 'loading' && 'opacity-80 pointer-events-none'
          )}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) await handleFile(file);
          }}
        >
          {/* Top Zone: URL */}
          <div className="p-6 md:p-10 space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-accent">
                {copy.source.label}
              </h2>
            </div>

            <form onSubmit={handleUrlSubmit} className="relative group">
              <div className="relative flex items-center">
                <LinkPanelIcon className="absolute left-5 h-5 w-5 text-[hsl(var(--text-soft))] group-focus-within:text-accent transition-colors" />
                <input
                  id="source-url"
                  type="text"
                  aria-label={copy.source.label}
                  autoFocus
                  placeholder={copy.source.placeholder}
                  className={cn(
                    'w-full h-16 rounded-3xl border border-border/50 bg-background/50 px-14 text-lg text-foreground outline-none transition-all placeholder:text-[hsl(var(--text-soft))/60] focus:border-accent/40 focus:bg-background focus:ring-8 focus:ring-accent/5',
                    hasUrlValue && 'pr-44'
                  )}
                  value={source.draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                />
                <div className={cn(
                  'absolute right-2 flex items-center transition-all duration-300',
                  hasUrlValue ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
                )}>
                  <Button 
                    type="submit" 
                    size="lg"
                    className="h-12 rounded-2xl px-6 shadow-xl shadow-primary/20"
                  >
                    {source.status === 'loading' ? copy.source.loading : copy.source.submit}
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-center text-xs font-medium text-[hsl(var(--text-soft))] uppercase tracking-widest opacity-60">
                {copy.source.helper}
              </p>
            </form>
          </div>

          {/* Bottom Zone: Upload / Drop */}
          <div className="bg-foreground/[0.03] border-t border-border/30">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'group relative w-full flex flex-col items-center justify-center gap-4 py-12 transition-all duration-300',
                'hover:bg-accent/5 active:scale-[0.99]'
              )}
            >
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
                dragActive ? "bg-accent text-white scale-110 shadow-lg shadow-accent/20" : "bg-foreground/5 text-foreground/40 group-hover:text-accent group-hover:bg-accent/10"
              )}>
                <UploadPanelIcon className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-lg font-bold transition-colors",
                  dragActive ? "text-accent" : "text-foreground/70 group-hover:text-foreground"
                )}>
                  {dragActive ? "Drop image now" : copy.source.upload}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--text-soft))] font-bold uppercase tracking-[0.2em]">
                  {copy.source.uploadHint} (SVG, PNG, JPG)
                </p>
              </div>
              
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) { await handleFile(file); e.target.value = ''; }
                }}
              />
            </button>
          </div>

          {source.status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold uppercase tracking-widest text-accent animate-pulse">
                  {copy.source.loading}
                </p>
              </div>
            </div>
          )}
        </div>

        {source.errorMessage && (
          <div className="mt-6 about-card rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="font-bold text-destructive">{copy.source.fallbackTitle}</p>
                <p className="mt-1 text-[hsl(var(--text-muted))]">{source.errorMessage}</p>
              </div>
              <button 
                onClick={clearSourceError}
                className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--text-soft))] hover:text-foreground"
              >
                {copy.nav.close}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" onPaste={handlePaste} data-testid="editor-source">
      <div
        className={cn(
          'rounded-[1.2rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.55] p-3 transition',
          dragActive ? 'border-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.16)]' : '',
        )}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) await handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) { await handleFile(file); e.target.value = ''; }
          }}
        />

        <div className="space-y-3">
          <form onSubmit={handleUrlSubmit} className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--text-muted))]" htmlFor="source-url">
              {copy.source.label}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <LinkPanelIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-soft))]" />
                <input
                  id="source-url"
                  type="text"
                  placeholder={copy.source.placeholder}
                  className="w-full h-11 border border-border/60 bg-background px-11 rounded-[1rem] text-sm text-foreground outline-none transition placeholder:text-[hsl(var(--text-soft))] focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
                  value={source.draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                />
                {source.status === 'loading' && (
                  <span className="absolute right-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent animate-pulse" />
                )}
              </div>
              <Button type="submit" className="h-11 rounded-[1rem] px-5">
                {source.status === 'loading' ? copy.source.loading : copy.source.submit}
              </Button>
            </div>
          </form>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="surface-muted flex h-11 items-center justify-center gap-3 border rounded-[1rem] px-3 transition hover:border-accent/40 hover:bg-[hsl(var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UploadPanelIcon className="h-5 w-5 text-accent" />
              <p className="text-sm font-semibold text-foreground">{copy.source.upload}</p>
            </button>

            <button
              type="button"
              onClick={handleClipboardRead}
              className="surface-muted flex h-11 items-center justify-center gap-3 border rounded-[1rem] px-3 transition hover:border-accent/40 hover:bg-[hsl(var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ClipboardPanelIcon className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">{copy.source.paste}</p>
            </button>
          </div>
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
