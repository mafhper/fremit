/**
 * Dedicated canvas editor at `/editor`: document pages, layers, rulers, snap
 * and zoom over the Documento JSON, wired into the app store (theme, source,
 * background). The mockup composer stays at `/mockup` until the export from
 * the document replaces it.
 */

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import iconUrl from '/icon.svg?url';
import { Image as ImageIcon, Maximize, Square, Type, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Switch } from '@/components/ui';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useI18n } from '@/i18n/useI18n';
import { createShapeObject, createTextObject } from '@/lib/document';
import { fitViewport, RULER_SIZE, zoomAtPoint, type Viewport } from '@/lib/editorViewport';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { CanvasRulers } from './CanvasRulers';
import { CanvasStage } from './CanvasStage';
import { LayersPanel } from './LayersPanel';
import { PagesPanel } from './PagesPanel';

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-[0.7rem] border border-border/70 bg-background px-2.5 text-xs font-medium text-foreground transition',
        'hover:border-accent/50 hover:bg-[hsl(var(--surface-muted))]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {children}
    </button>
  );
}

export function CanvasEditor() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const activeSource = useStore((state) => state.source.active);
  const addObject = useStore((state) => state.addObject);
  const upsertSourceImage = useStore((state) => state.upsertSourceImage);

  useApplyTheme();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fittedRef = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({ zoom: 0.5, x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  const pageSize = page ? { width: page.width, height: page.height } : { width: 0, height: 0 };
  // The canvas element lives inside the ruler strips, so the viewport space is
  // the stage minus `RULER_SIZE` on both axes.
  const canvasWidth = Math.max(stageSize.width - RULER_SIZE, 0);
  const canvasHeight = Math.max(stageSize.height - RULER_SIZE, 0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  // Fit the page once the stage has a size.
  useEffect(() => {
    if (fittedRef.current || canvasWidth <= 0 || canvasHeight <= 0 || !page) return;

    fittedRef.current = true;
    setViewport(
      fitViewport({ width: page.width, height: page.height }, { width: canvasWidth, height: canvasHeight }),
    );
  }, [page, canvasWidth, canvasHeight]);

  // A resolved source lands on the canvas as an image object (the current
  // capture flow keeps working on the dedicated canvas).
  useEffect(() => {
    if (!activeSource) return;

    upsertSourceImage(activeSource.resolvedImageUrl, activeSource.title);
  }, [activeSource, upsertSourceImage]);

  const zoomBy = (factor: number) => {
    setViewport((current) =>
      zoomAtPoint(current, current.zoom * factor, {
        x: canvasWidth / 2,
        y: canvasHeight / 2,
      }),
    );
  };

  const fitPage = () => {
    if (!page) return;

    setViewport(
      fitViewport({ width: page.width, height: page.height }, { width: canvasWidth, height: canvasHeight }),
    );
  };

  const addText = () => {
    if (!page) return;

    addObject(
      createTextObject('Text', {
        name: 'Text',
        x: page.width * 0.12,
        y: page.height * 0.42,
        width: page.width * 0.76,
        fontSize: Math.max(24, Math.round(page.width * 0.07)),
      }),
    );
  };

  const addShape = () => {
    if (!page) return;

    const size = Math.round(Math.min(page.width, page.height) * 0.4);

    addObject(
      createShapeObject('rect', {
        name: 'Shape',
        x: Math.round((page.width - size) / 2),
        y: Math.round((page.height - size) / 2),
        width: size,
        height: size,
        cornerRadius: Math.round(size * 0.12),
      }),
    );
  };

  const addImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        upsertSourceImage(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="flex h-svh flex-col overflow-hidden bg-background text-foreground"
      data-testid="editor-shell"
    >
      <header className="border-b border-border/80 bg-background/88 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={iconUrl} alt="Fremit" className="h-9 w-9" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight">{copy.editor.title}</p>
              <p className="truncate text-sm text-[hsl(var(--text-muted))]">{copy.editor.subtitle}</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeSelector />
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/">{copy.nav.backToSite}</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setMobilePanelOpen(true)}
              data-testid="mobile-controls-trigger"
            >
              {copy.editor.openControls}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
              {copy.canvas.insert}
            </span>
            <ToolbarButton label={copy.canvas.addText} onClick={addText}>
              <Type className="h-4 w-4" />
              {copy.canvas.addText}
            </ToolbarButton>
            <ToolbarButton label={copy.canvas.addShape} onClick={addShape}>
              <Square className="h-4 w-4" />
              {copy.canvas.addShape}
            </ToolbarButton>
            <ToolbarButton
              label={copy.canvas.addImage}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
              {copy.canvas.addImage}
            </ToolbarButton>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={addImageFile}
            />

            <div className="ml-auto flex items-center gap-2">
              <ToolbarButton label={copy.canvas.zoomOut} onClick={() => zoomBy(1 / 1.2)}>
                <ZoomOut className="h-4 w-4" />
              </ToolbarButton>
              <span
                data-testid="zoom-value"
                className="min-w-[3.25rem] text-center text-xs font-semibold text-[hsl(var(--text-muted))]"
              >
                {Math.round(viewport.zoom * 100)}%
              </span>
              <ToolbarButton label={copy.canvas.zoomIn} onClick={() => zoomBy(1.2)}>
                <ZoomIn className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label={copy.canvas.zoomFit} onClick={fitPage}>
                <Maximize className="h-4 w-4" />
              </ToolbarButton>
              <label className="flex items-center gap-2 pl-1 text-xs text-[hsl(var(--text-muted))]">
                <Switch
                  checked={snapEnabled}
                  onCheckedChange={setSnapEnabled}
                  aria-label={copy.canvas.snap}
                />
                {copy.canvas.snap}
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-2 md:p-3">
            <div
              ref={stageRef}
              className="relative h-full w-full overflow-hidden rounded-[1.6rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.35]"
            >
              <CanvasRulers viewport={viewport} pageSize={pageSize} stageSize={stageSize} />
              <CanvasStage
                viewport={viewport}
                onViewportChange={setViewport}
                snapEnabled={snapEnabled}
              />
            </div>
          </div>
        </div>

        <aside
          className="hidden min-h-0 overflow-y-auto border-l border-border/80 bg-[hsl(var(--surface))/0.94] px-3 py-4 lg:block"
          data-testid="editor-panel"
        >
          <div className="space-y-5">
            <PagesPanel />
            <LayersPanel />
          </div>
        </aside>
      </div>

      {mobilePanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 top-auto max-h-[72svh] rounded-t-[1.75rem] border border-border/80 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
              <div className="text-sm font-semibold">{copy.editor.openControls}</div>
              <div className="flex items-center gap-2">
                <ThemeSelector />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setMobilePanelOpen(false)}
                >
                  {copy.nav.close}
                </Button>
              </div>
            </div>
            <div className="h-[calc(72svh-65px)] overflow-y-auto px-3 py-4">
              <div className="space-y-5">
                <PagesPanel />
                <LayersPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
