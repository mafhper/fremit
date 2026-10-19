/**
 * Content sidebar of the canvas shell (the `icons` rail tool) — one panel,
 * two workspaces:
 *
 * - Icons: the vendored Runeicons catalog (`IconWorkspace`) — search,
 *   category/style filters, fetched previews and the properties inspector.
 *   First tab and the default, so the rail shortcut opens straight on it.
 * - Stickers: the own vector pack (rounded rects, ellipses and glyph texts)
 *   as a grid of previews. Each preview is rendered from the sticker's own
 *   objects through `pageToSvg`, so the card shows what will land on the page;
 *   clicking inserts the whole composition in one store write.
 *
 * The switch lives at the top of the panel and its state is local: browsing
 * never touches the document, and the sticker pack is unchanged.
 */

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentPage } from '@/lib/document';
import { pageToSvg } from '@/lib/templateThumbnail';
import { STICKER_PACK, type StickerDefinition, type StickerId } from '@/lib/stickers';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { IconWorkspace } from './runeicons/IconWorkspace';

const PREVIEW_SIZE = 120;

type Workspace = 'icons' | 'stickers';

const WORKSPACES: readonly Workspace[] = ['icons', 'stickers'];

function stickerPreviewPage(sticker: StickerDefinition): DocumentPage {
  return {
    id: `sticker-preview-${sticker.id}`,
    name: sticker.id,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    background: { kind: 'solid', color: 'transparent' },
    transition: null,
    objects: sticker.build({ width: PREVIEW_SIZE, height: PREVIEW_SIZE }),
  };
}

function StickerGrid() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const addObjects = useStore((state) => state.addObjects);

  // One preview per sticker, built once from the sticker's own objects.
  const previews = useMemo(
    () => new Map(STICKER_PACK.map((sticker) => [sticker.id, pageToSvg(stickerPreviewPage(sticker))])),
    [],
  );

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  if (!page) return null;

  const labels: Record<StickerId, string> = {
    'badge-new': copy.stickers.badgeNew,
    'sale-tag': copy.stickers.saleTag,
    'speech-bubble': copy.stickers.speechBubble,
    'star-rating': copy.stickers.starRating,
    'check-badge': copy.stickers.checkBadge,
    'arrow-right': copy.stickers.arrowRight,
    heart: copy.stickers.heart,
    sparkles: copy.stickers.sparkles,
    'quote-mark': copy.stickers.quoteMark,
    'dot-grid': copy.stickers.dotGrid,
  };

  const pageSize = { width: page.width, height: page.height };

  return (
    <div className="grid grid-cols-2 gap-2">
      {STICKER_PACK.map((sticker) => (
        <button
          key={sticker.id}
          type="button"
          data-testid={`sticker-card-${sticker.id}`}
          aria-label={labels[sticker.id]}
          onClick={() => addObjects(sticker.build(pageSize))}
          className={cn(
            'flex flex-col gap-1.5 rounded-[0.9rem] border border-border/70 bg-background p-2 text-left transition',
            'hover:border-accent/50 hover:bg-[hsl(var(--surface-muted))/0.6]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <span
            aria-hidden="true"
            className="block h-16 w-full overflow-hidden rounded-[0.7rem] border border-border/60 bg-[hsl(var(--surface-muted))/0.5] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: previews.get(sticker.id) ?? '' }}
          />
          <span className="block truncate text-xs font-medium">{labels[sticker.id]}</span>
        </button>
      ))}
    </div>
  );
}

function WorkspaceSwitch({
  value,
  onChange,
}: {
  value: Workspace;
  onChange: (next: Workspace) => void;
}) {
  const { copy } = useI18n();
  const labels: Record<Workspace, string> = {
    icons: copy.icons.tab,
    stickers: copy.stickers.tab,
  };

  // Minimal tab keyboard support: left/right flips the selection and moves
  // focus to the tab that is now active. Home/End (APG-optional) stay out on
  // purpose — with two tabs they add nothing the arrows do not cover.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const next: Workspace = value === 'icons' ? 'stickers' : 'icons';
    onChange(next);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-testid="icons-tab-${next}"]`)
      ?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={copy.icons.workspace}
      data-testid="icons-workspace-switch"
      onKeyDown={handleKeyDown}
      className="grid grid-cols-2 gap-1 rounded-[0.9rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.5] p-1"
    >
      {WORKSPACES.map((workspace) => (
        <button
          key={workspace}
          type="button"
          role="tab"
          id={`icons-tab-${workspace}`}
          aria-controls="icons-tabpanel"
          aria-selected={value === workspace}
          tabIndex={value === workspace ? 0 : -1}
          data-testid={`icons-tab-${workspace}`}
          onClick={() => onChange(workspace)}
          className={cn(
            'rounded-[0.6rem] px-2 py-1.5 text-xs font-medium transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === workspace
              ? 'bg-background text-foreground shadow-sm'
              : 'text-[hsl(var(--text-muted))] hover:text-foreground',
          )}
        >
          {labels[workspace]}
        </button>
      ))}
    </div>
  );
}

export function StickersPanel() {
  const [workspace, setWorkspace] = useState<Workspace>('icons');

  return (
    <div className="space-y-3">
      <WorkspaceSwitch value={workspace} onChange={setWorkspace} />
      {/* One panel id for both tabs: the workspaces mount lazily (only the
          active one), so a per-workspace id would leave the inactive tab's
          aria-controls pointing at an element that does not exist. */}
      <div
        role="tabpanel"
        id="icons-tabpanel"
        aria-labelledby={`icons-tab-${workspace}`}
      >
        {workspace === 'icons' ? <IconWorkspace /> : <StickerGrid />}
      </div>
    </div>
  );
}
