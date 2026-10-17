/**
 * Pages panel: multipage operations (add, duplicate, move, rename, switch)
 * plus the minimal format resize (poster, banner, hero). The resize keeps the
 * page content inside the new format — see `resizePageToFormat`.
 */

import { ChevronDown, ChevronUp, Copy, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import { PAGE_FORMATS, type PageFormatId } from '@/lib/documentOps';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { IconButton } from './IconButton';

export function PagesPanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const setActivePage = useStore((state) => state.setActivePage);
  const addPage = useStore((state) => state.addPage);
  const duplicatePage = useStore((state) => state.duplicatePage);
  const movePage = useStore((state) => state.movePage);
  const renamePage = useStore((state) => state.renamePage);
  const resizePage = useStore((state) => state.resizePage);

  const activePage = document.pages.find((page) => page.id === activePageId) ?? null;
  const activeFormat = activePage
    ? PAGE_FORMATS.find(
        (format) => format.width === activePage.width && format.height === activePage.height,
      )
    : undefined;
  const formatLabels: Record<PageFormatId, string> = {
    poster: copy.canvas.formatPoster,
    banner: copy.canvas.formatBanner,
    hero: copy.canvas.formatHero,
  };

  return (
    <section className="flex flex-col" aria-label={copy.canvas.pages}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold tracking-tight">{copy.canvas.pages}</h2>
        <div className="flex items-center gap-1">
          <IconButton label={copy.canvas.addPage} testId="page-add" onClick={addPage}>
            <Plus className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={copy.canvas.duplicatePage}
            testId="page-duplicate"
            disabled={!activePage}
            onClick={() => activePage && duplicatePage(activePage.id)}
          >
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={copy.canvas.pageUp}
            testId="page-up"
            disabled={!activePage}
            onClick={() => activePage && movePage(activePage.id, 'up')}
          >
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={copy.canvas.pageDown}
            testId="page-down"
            disabled={!activePage}
            onClick={() => activePage && movePage(activePage.id, 'down')}
          >
            <ChevronDown className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <ul className="mt-2 space-y-1" data-testid="page-list">
        {document.pages.map((page, index) => {
          const isActive = page.id === activePageId;

          return (
            <li key={page.id} data-testid="page-row">
              <button
                type="button"
                aria-pressed={isActive}
                data-testid="page-select"
                onClick={() => setActivePage(page.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[0.9rem] border px-2 py-1.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-border/80 bg-[hsl(var(--surface-muted))] text-foreground'
                    : 'border-transparent hover:border-border/60 hover:bg-[hsl(var(--surface-muted))/0.6]',
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--text-soft))]">
                  {index + 1}
                </span>
                <span className="truncate">{page.name}</span>
                <span className="ml-auto text-[10px] text-[hsl(var(--text-soft))]">
                  {Math.round(page.width)}×{Math.round(page.height)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {activePage && (
        <div className="mt-3 space-y-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
              {copy.canvas.pageName}
            </span>
            <input
              type="text"
              value={activePage.name}
              aria-label={copy.canvas.pageName}
              data-testid="page-name-input"
              onChange={(event) => renamePage(activePage.id, event.target.value)}
              className="h-9 w-full rounded-[0.9rem] border border-border/60 bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
              {copy.canvas.format}
            </span>
            <Select
              value={activeFormat?.id}
              onValueChange={(value) => resizePage(activePage.id, value as PageFormatId)}
            >
              <SelectTrigger aria-label={copy.canvas.format} className="h-9 rounded-[0.9rem]">
                <SelectValue placeholder={copy.canvas.format} />
              </SelectTrigger>
              <SelectContent>
                {PAGE_FORMATS.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    {`${formatLabels[format.id]} · ${format.width} × ${format.height}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </section>
  );
}
