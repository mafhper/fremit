/**
 * Presentation bar: the floating controls of presentation mode — previous,
 * next, exit and the page indicator. Navigation goes through the store like
 * any page switch, so the canvas plays the transition and the entrances of the
 * page that lands; the bar itself owns no playback.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RuneXIcon } from '@/components/icons/rune/X';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';
import { IconButton } from './IconButton';

export function PresentBar() {
  const { copy } = useI18n();
  const pages = useStore((state) => state.document.pages);
  const activePageId = useStore((state) => state.activePageId);
  const setActivePage = useStore((state) => state.setActivePage);
  const stopPresenting = useStore((state) => state.stopPresenting);

  const index = pages.findIndex((page) => page.id === activePageId);
  const previous = index > 0 ? pages[index - 1] : null;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null;

  return (
    <div
      data-testid="present-bar"
      role="toolbar"
      aria-label={copy.present.toolbar}
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/80 bg-background/92 px-2 py-1.5 shadow-lg backdrop-blur"
    >
      <IconButton
        label={copy.present.previous}
        testId="present-prev"
        disabled={!previous}
        onClick={() => previous && setActivePage(previous.id)}
      >
        <ChevronLeft className="h-4 w-4" />
      </IconButton>

      <span
        data-testid="present-page"
        className="min-w-[3.5rem] text-center text-xs font-semibold tabular-nums text-[hsl(var(--text-muted))]"
      >
        {index + 1} / {pages.length}
      </span>

      <IconButton
        label={copy.present.next}
        testId="present-next"
        disabled={!next}
        onClick={() => next && setActivePage(next.id)}
      >
        <ChevronRight className="h-4 w-4" />
      </IconButton>

      <span className="mx-1 h-5 w-px bg-border/80" aria-hidden="true" />

      <IconButton label={copy.present.exit} testId="present-exit" onClick={stopPresenting}>
        <RuneXIcon className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
