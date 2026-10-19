/**
 * Right inspector of the canvas shell. With a selection it shows the object
 * properties (F1.9, `ObjectInspector`); with no selection it shows the page:
 * format and page background — the resize lives here since the dock took the
 * pages panel. Esc clears the selection (handled by the canvas), which
 * returns this panel to the page state.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import { PAGE_FORMATS, type PageFormatId } from '@/lib/documentOps';
import { useStore } from '@/store/useStore';
import { ObjectInspector } from './ObjectInspector';
import { PageBackgroundField } from './panels/PageBackgroundField';

export function Inspector() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const resizePage = useStore((state) => state.resizePage);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  const selected = page?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const activeFormat = page
    ? PAGE_FORMATS.find(
        (format) => format.width === page.width && format.height === page.height,
      )
    : undefined;
  const formatLabels: Record<PageFormatId, string> = {
    poster: copy.canvas.formatPoster,
    banner: copy.canvas.formatBanner,
    hero: copy.canvas.formatHero,
  };

  return (
    <section className="flex flex-col" aria-label={copy.sidebar.inspector} data-testid="inspector">
      <h2 className="px-1 text-sm font-semibold tracking-tight">{copy.sidebar.inspector}</h2>

      {selected ? (
        <ObjectInspector object={selected} />
      ) : (
        page && (
          <div className="mt-2 space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
                {copy.canvas.format}
              </span>
              <Select
                value={activeFormat?.id ?? ''}
                onValueChange={(value) => resizePage(page.id, value as PageFormatId)}
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

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
                {copy.canvas.pageBackground}
              </span>
              <PageBackgroundField />
            </div>
          </div>
        )
      )}
    </section>
  );
}
