/**
 * Dedicated canvas editor at `/editor`: document pages, layers, rulers, snap
 * and zoom over the Documento JSON, wired into the app store (theme, source,
 * background). Insertion lives in the rail panels (text/shapes/images); the
 * toolbar keeps the viewport controls. The mockup composer stays at `/mockup`
 * until the export from the document replaces it.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import iconUrl from '/icon.svg?url';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Switch } from '@/components/ui';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useI18n } from '@/i18n/useI18n';
import { fitViewport, RULER_SIZE, zoomAtPoint, type Viewport } from '@/lib/editorViewport';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { CanvasRulers } from './CanvasRulers';
import { CanvasStage } from './CanvasStage';
import { ExportPanel } from './ExportPanel';
import { Inspector } from './Inspector';
import { PanelSection } from './PanelSection';
import { PresentBar } from './PresentBar';
import { SidebarRail } from './SidebarRail';
import {
  DEFAULT_PANEL_ID,
  findPanel,
  togglePanel,
  type PanelId,
} from './panels/registry';

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
  const upsertSourceImage = useStore((state) => state.upsertSourceImage);
  const presenting = useStore((state) => state.presenting);
  const stopPresenting = useStore((state) => state.stopPresenting);

  useApplyTheme();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const fittedRef = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({ zoom: 0.5, x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activePanelId, setActivePanelId] = useState<PanelId | null>(DEFAULT_PANEL_ID);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const activePanel = findPanel(activePanelId);

  const togglePanelById = (panelId: PanelId) => {
    setActivePanelId((current) => togglePanel(current, panelId));
  };

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

  // Escape leaves presentation mode; the canvas keeps its own Escape handling
  // for the selection, which is harmless while presenting.
  useEffect(() => {
    if (!presenting) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopPresenting();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presenting, stopPresenting]);

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

  return (
    <div
      className="relative flex h-svh flex-col overflow-hidden bg-background text-foreground"
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

      <div className="flex min-h-0 flex-1">
        {!presenting && (
          <SidebarRail
            testId="sidebar-rail"
            activePanelId={activePanelId}
            onToggle={togglePanelById}
            className="hidden lg:flex"
          />
        )}

        {!presenting && activePanel && (
          <PanelSection
            panel={activePanel}
            showHeader
            onClose={() => setActivePanelId(null)}
            className={cn(
              // One dock width for every category: `placement` is content
              // semantics, not a width step. The wide step wins because the
              // translated labels grow.
              'hidden shrink-0 border-r border-border/80 bg-[hsl(var(--surface))/0.55] lg:flex lg:w-80',
            )}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!presenting && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border/70 px-3 py-2">
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
          )}

          <div className="min-h-0 flex-1 p-2 md:p-3">
            <div
              ref={stageRef}
              className="relative h-full w-full overflow-hidden rounded-[1.6rem] border border-border/70 bg-[hsl(var(--canvas-workspace))]"
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

        {!presenting && (
          <aside
            className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-border/80 bg-[hsl(var(--surface))/0.94] px-3 py-4 lg:block"
            data-testid="editor-panel"
          >
            <div className="space-y-5">
              <Inspector />
              <ExportPanel />
            </div>
          </aside>
        )}
      </div>

      {presenting && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <PresentBar />
        </div>
      )}

      {mobilePanelOpen && !presenting && (
        <div className="fixed inset-0 z-50 bg-black/45 lg:hidden">
          <div
            className="absolute inset-x-0 bottom-0 top-auto max-h-[72svh] rounded-t-[1.75rem] border border-border/80 bg-background shadow-2xl"
            data-testid="mobile-panel-sheet"
          >
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
            <div className="flex h-[calc(72svh-65px)] min-h-0 flex-col">
              <SidebarRail
                orientation="horizontal"
                activePanelId={activePanelId}
                onToggle={togglePanelById}
              />
              {activePanel && <PanelSection panel={activePanel} className="min-h-0 flex-1" />}
              <div className="shrink-0 border-t border-border/80 px-3 py-3">
                <ExportPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
