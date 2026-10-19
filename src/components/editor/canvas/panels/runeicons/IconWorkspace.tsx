/**
 * Icons workspace of the content panel (the first tab, open by default): the
 * vendored Runeicons catalog with search (name/id/tags), category and style
 * filters, a paged grid of previews and the properties inspector of the
 * selected icon.
 *
 * Everything here runs on the local manifest — no network for the browsing —
 * and the artwork is fetched per visible card (cached), so the panel chunk
 * carries metadata only. Insertion freezes the final SVG as an image object
 * through the store; the panel state (filters, colors) never touches the
 * document until that click.
 */

import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/useI18n';
import {
  DEFAULT_RUNEICON_FILTER,
  RUNEICON_CATEGORY_IDS,
  RUNEICON_ENTRIES,
  RUNEICON_STYLE_IDS,
  filterRuneicons,
  type RuneiconEntry,
  type RuneiconFilter,
  type RuneiconStyle,
} from '@/lib/runeicons/catalog';
import { buildRuneiconImageObject } from '@/lib/runeicons/insert';
import { loadRuneiconSvg } from '@/lib/runeicons/load';
import { DEFAULT_RUNEICON_COLORS, type RuneiconColorState } from '@/lib/runeicons/svg';
import { useStore } from '@/store/useStore';
import { IconCard } from './IconCard';
import { IconInspector } from './IconInspector';

/** Cards per page; the grid grows by this much on "show more". */
const GRID_PAGE_SIZE = 48;

export function IconWorkspace() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const addObject = useStore((state) => state.addObject);

  const [filter, setFilter] = useState<RuneiconFilter>(DEFAULT_RUNEICON_FILTER);
  const [colors, setColors] = useState<RuneiconColorState>(DEFAULT_RUNEICON_COLORS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shown, setShown] = useState(GRID_PAGE_SIZE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  const results = useMemo(() => filterRuneicons(RUNEICON_ENTRIES, filter), [filter]);
  const styleTotal = useMemo(
    () => RUNEICON_ENTRIES.filter((entry) => entry.styles.includes(filter.style)).length,
    [filter.style],
  );
  const selected = RUNEICON_ENTRIES.find((entry) => entry.id === selectedId) ?? null;

  const applyFilter = (patch: Partial<RuneiconFilter>) => {
    const next = { ...filter, ...patch };
    setFilter(next);
    setShown(GRID_PAGE_SIZE);
    setError(null);

    // The selection follows visibility: an icon filtered out of the results
    // stops being selected (a style change alone keeps it while the icon still
    // ships that style). `results` derives only from the filter, so this is the
    // single path that can remove the selection.
    if (
      selectedId !== null &&
      !filterRuneicons(RUNEICON_ENTRIES, next).some((entry) => entry.id === selectedId)
    ) {
      setSelectedId(null);
    }
  };

  const selectIcon = (id: string) => {
    setSelectedId(id);
    setError(null);
  };

  const insert = async () => {
    if (!selected || !page || busy) return;

    setBusy(true);
    setError(null);

    try {
      const svg = await loadRuneiconSvg(selected, filter.style);
      addObject(
        buildRuneiconImageObject(svg, selected, {
          page: { width: page.width, height: page.height },
          style: filter.style,
          colors,
        }),
      );
    } catch {
      setError(copy.icons.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          type="search"
          value={filter.query}
          onChange={(event) => applyFilter({ query: event.target.value })}
          placeholder={copy.icons.search}
          aria-label={copy.icons.search}
          data-testid="icon-search"
          spellCheck={false}
          autoComplete="off"
          className="h-9 w-full rounded-[0.9rem] border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0 space-y-1">
            <span className="sr-only">{copy.icons.category}</span>
            <select
              value={filter.category}
              onChange={(event) =>
                applyFilter({ category: event.target.value as RuneiconFilter['category'] })
              }
              aria-label={copy.icons.category}
              data-testid="icon-category"
              className="h-9 w-full rounded-[0.9rem] border border-border/70 bg-background px-2 text-xs text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">{copy.icons.allCategories}</option>
              {RUNEICON_CATEGORY_IDS.map((category) => (
                <option key={category} value={category}>
                  {copy.icons.categories[category]}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0 space-y-1">
            <span className="sr-only">{copy.icons.style}</span>
            <select
              value={filter.style}
              onChange={(event) => applyFilter({ style: event.target.value as RuneiconStyle })}
              aria-label={copy.icons.style}
              data-testid="icon-style"
              className="h-9 w-full rounded-[0.9rem] border border-border/70 bg-background px-2 text-xs text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
            >
              {RUNEICON_STYLE_IDS.map((style) => (
                <option key={style} value={style}>
                  {copy.icons.styles[style]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-[11px] tabular-nums text-[hsl(var(--text-muted))]" data-testid="icon-count">
          {results.length} / {styleTotal}
        </p>
      </div>

      {results.length === 0 ? (
        <p data-testid="icon-empty" className="text-xs text-[hsl(var(--text-muted))]">
          {copy.icons.empty}
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5" data-testid="icon-grid">
          {results.slice(0, shown).map((entry: RuneiconEntry) => (
            <IconCard
              key={entry.id}
              entry={entry}
              style={filter.style}
              selected={entry.id === selectedId}
              onSelect={() => selectIcon(entry.id)}
            />
          ))}
        </div>
      )}

      {results.length > shown && (
        <button
          type="button"
          data-testid="icon-load-more"
          onClick={() => setShown((current) => current + GRID_PAGE_SIZE)}
          className="h-8 w-full rounded-[0.8rem] border border-dashed border-border/70 text-[11px] font-medium text-[hsl(var(--text-muted))] transition hover:border-accent/50 hover:text-foreground"
        >
          {copy.icons.showMore}
        </button>
      )}

      {selected && (
        <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-1">
          <IconInspector
            entry={selected}
            style={filter.style}
            colors={colors}
            onColorsChange={setColors}
            onInsert={() => void insert()}
            busy={busy}
            canInsert={page !== null}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
