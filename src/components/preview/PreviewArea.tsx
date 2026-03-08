import { useEffect, useRef, useState } from 'react';
import iconUrl from '/icon.svg?url';
import { cn } from '@/lib/utils';
import { BrowserWindow } from './BrowserWindow';
import { getFrameOuterSize } from './previewMetrics';
import { useStore } from '@/store/useStore';
import { useI18n } from '@/i18n/useI18n';

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

export function PreviewArea({ className }: { className?: string }) {
  const { copy } = useI18n();
  const background = useStore((state) => state.background);
  const frame = useStore((state) => state.frame);
  const activeSource = useStore((state) => state.source.active);
  const { ref, size } = useElementSize<HTMLDivElement>();

  const backgroundStyle =
    background.bgType === 'solid'
      ? { backgroundColor: background.bgColor }
      : background.bgType === 'gradient'
        ? { backgroundImage: background.bgGradient }
        : background.bgImage
          ? {
              backgroundImage: `url(${background.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {};

  const outerFrame = getFrameOuterSize(frame);
  const compositionWidth = outerFrame.width + background.padding * 2;
  const compositionHeight = outerFrame.height + background.padding * 2;
  const stageInset = size.width < 640 ? 12 : 24;
  const scale = Math.min(
    size.width > 0 ? Math.max(size.width - stageInset * 2, 0) / compositionWidth : 1,
    size.height > 0 ? Math.max(size.height - stageInset * 2, 0) / compositionHeight : 1,
    1,
  );

  return (
    <main className={cn('flex min-h-0 flex-1 overflow-hidden p-2 md:p-3', className)}>
      <div
        ref={ref}
        className="surface-card relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.9rem] border p-3 md:p-4"
      >
        {!activeSource ? (
          <div
            id="fremit-preview"
            className="h-full w-full rounded-[1.75rem] border border-border/60 transition-all duration-300 ease-out"
            style={backgroundStyle}
          >
            <div className="flex h-full items-center justify-center p-6 md:p-10">
              <div className="surface-card flex w-full max-w-xl flex-col items-start gap-5 rounded-[1.8rem] border px-6 py-7 md:px-8 md:py-9">
                <img src={iconUrl} alt="Fremit" className="h-12 w-12" />
                <div className="space-y-2">
                  <p className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--surface-muted))/0.72] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--text-soft))]">
                    {copy.editor.previewEmptyTag}
                  </p>
                  <p className="text-2xl font-semibold tracking-tight md:text-3xl">{copy.editor.previewEmptyTitle}</p>
                  <p className="max-w-md text-sm leading-6 text-[hsl(var(--text-muted))]">{copy.editor.previewEmptyBody}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{
              width: compositionWidth * scale,
              height: compositionHeight * scale,
            }}
          >
            <div
              style={{
                width: compositionWidth,
                height: compositionHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                id="fremit-preview"
                className="h-full w-full rounded-[1.75rem] border border-border/40 transition-all duration-300 ease-out"
                style={{
                  ...backgroundStyle,
                  padding: `${background.padding}px`,
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <BrowserWindow />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
