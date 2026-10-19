/**
 * Docked panel column of the canvas shell: a labelled region with the panel
 * title, the close action and the panel body. Lazy panels render behind a
 * Suspense boundary — the skeleton is silent and only shows up when the chunk
 * is still in flight. The mobile sheet mounts the same section without the
 * visible header (the sheet owns its own chrome) and keeps an sr-only heading.
 */

import { Suspense } from 'react';
import { RuneXIcon } from '@/components/icons/rune/X';
import { useI18n } from '@/i18n/useI18n';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';
import type { PanelDefinition } from './panels/registry';

export interface PanelSectionProps {
  panel: PanelDefinition;
  onClose?: () => void;
  showHeader?: boolean;
  className?: string;
}

function PanelSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-24 animate-pulse rounded-[0.9rem] bg-[hsl(var(--surface-muted))/0.6]"
    />
  );
}

export function PanelSection({ panel, onClose, showHeader = false, className }: PanelSectionProps) {
  const { copy } = useI18n();
  const label = copy.sidebar[panel.id];
  const Content = panel.component;

  return (
    <section
      data-testid={`sidebar-panel-${panel.id}`}
      data-status={panel.status}
      aria-label={label}
      aria-disabled={panel.status === 'planned' ? true : undefined}
      className={cn('flex min-h-0 flex-col', className)}
    >
      {showHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
          <h2 className="truncate text-sm font-semibold tracking-tight">{label}</h2>
          {onClose && (
            <IconButton label={copy.nav.close} onClick={onClose}>
              <RuneXIcon className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      ) : (
        // The mobile sheet owns its chrome and hides this header, but the
        // panel still needs a heading in the document outline.
        <h2 className="sr-only">{label}</h2>
      )}

      {/* The gutter is reserved only in the docked column (lg+): the mobile
          sheet keeps its untouched layout, and the body stays `overflow-y:
          auto` instead of permanently scrolling. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:[scrollbar-gutter:stable]">
        <Suspense fallback={<PanelSkeleton />}>
          <Content />
        </Suspense>
      </div>
    </section>
  );
}
