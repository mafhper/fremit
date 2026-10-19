/**
 * One icon of the grid: the vendored file, fetched when the card mounts and
 * normalized for the preview (one-slot styles ride the theme text color).
 * Clicking selects the icon for the inspector — it never writes to the
 * document by itself.
 */

import { runeiconPreviewMarkup } from '@/lib/runeicons/svg';
import type { RuneiconEntry, RuneiconStyle } from '@/lib/runeicons/catalog';
import { cn } from '@/lib/utils';
import { useRuneiconSvg } from './useRuneiconSvg';

export interface IconCardProps {
  entry: RuneiconEntry;
  style: RuneiconStyle;
  selected: boolean;
  onSelect: () => void;
}

export function IconCard({ entry, style, selected, onSelect }: IconCardProps) {
  const { markup, failed } = useRuneiconSvg(entry, style);
  const preview = markup ? runeiconPreviewMarkup(markup, style) : null;

  return (
    <button
      type="button"
      data-testid={`icon-card-${entry.id}`}
      aria-label={entry.name}
      aria-pressed={selected}
      title={entry.name}
      onClick={onSelect}
      className={cn(
        'flex aspect-square items-center justify-center rounded-[0.7rem] border p-1.5 transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-accent bg-[hsl(var(--surface-muted))/0.9] text-foreground'
          : 'border-border/60 bg-background text-foreground hover:border-accent/50 hover:bg-[hsl(var(--surface-muted))/0.6]',
      )}
    >
      {preview ? (
        <span
          aria-hidden="true"
          className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'block h-full w-full rounded-[0.5rem] bg-[hsl(var(--surface-muted))/0.6]',
            !failed && 'animate-pulse',
          )}
        />
      )}
    </button>
  );
}
