import { useState } from 'react';
import { Link } from 'react-router';
import iconUrl from '/icon.svg?url';
import { Button } from '@/components/ui';
import { ThemeSelector } from '@/components/layout/ThemeSelector';
import { Sidebar } from '@/components/editor/Sidebar';
import { PreviewArea } from '@/components/preview/PreviewArea';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useImageColors } from '@/hooks/useImageColors';
import { useViewportSourceSync } from '@/hooks/useViewportSourceSync';
import { useI18n } from '@/i18n/useI18n';

export function MainLayout() {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const { copy } = useI18n();

  useImageColors();
  useApplyTheme();
  useViewportSourceSync();

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground" data-testid="editor-shell">
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

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_372px]">
        <PreviewArea className="min-h-0" />

        <div className="hidden min-h-0 border-l border-border/80 lg:block">
          <Sidebar />
        </div>
      </div>

      {mobilePanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 top-auto max-h-[72svh] rounded-t-[1.75rem] border border-border/80 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
              <div className="text-sm font-semibold">{copy.editor.openControls}</div>
              <div className="flex items-center gap-2">
                <ThemeSelector />
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setMobilePanelOpen(false)}>
                  {copy.nav.close}
                </Button>
              </div>
            </div>
            <div className="h-[calc(72svh-65px)]">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
