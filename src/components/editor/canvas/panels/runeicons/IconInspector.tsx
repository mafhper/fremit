/**
 * Properties of the selected icon — the "cor/gradiente" of the reference
 * interaction, written from scratch: a live preview of the exact markup that
 * will be frozen, a Solid/Gradient mode, the color slots of the style and the
 * insert action.
 *
 * The preview sits on a fixed light surface on purpose: it shows the colors
 * the icon will carry on the page (the document is theme-independent), not
 * the panel chrome. Glass has no slots — the upstream artwork carries baked
 * gradients — so it shows a note and inserts as designed.
 */

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/useI18n';
import type { RuneiconEntry, RuneiconStyle } from '@/lib/runeicons/catalog';
import {
  applyRuneiconColor,
  resolveRuneiconColors,
  supportsRuneiconColor,
  type RuneiconColorState,
} from '@/lib/runeicons/svg';
import { cn } from '@/lib/utils';
import { ColorField } from './ColorField';
import { useRuneiconSvg } from './useRuneiconSvg';

export interface IconInspectorProps {
  entry: RuneiconEntry;
  style: RuneiconStyle;
  colors: RuneiconColorState;
  onColorsChange: (colors: RuneiconColorState) => void;
  onInsert: () => void;
  busy: boolean;
  /** False without an active page: the insert would have nowhere to land. */
  canInsert: boolean;
  error: string | null;
}

export function IconInspector({
  entry,
  style,
  colors,
  onColorsChange,
  onInsert,
  busy,
  canInsert,
  error,
}: IconInspectorProps) {
  const { copy } = useI18n();
  const { markup } = useRuneiconSvg(entry, style);

  const resolved = resolveRuneiconColors(style, colors);
  const colorable = supportsRuneiconColor(style);
  const multiSlot = style === 'duotone' || style === 'fill';
  const preview = markup ? applyRuneiconColor(markup, style, colors) : null;

  return (
    <section
      data-testid="icon-properties"
      aria-label={copy.icons.properties}
      className="space-y-3 rounded-[1rem] border border-border/80 bg-background p-3 shadow-lg"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
        {copy.icons.properties}
      </h3>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          data-testid="icon-preview"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[0.7rem] border border-border/60 bg-white [&>svg]:h-10 [&>svg]:w-10"
          dangerouslySetInnerHTML={{ __html: preview ?? '' }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold" data-testid="icon-selected-name">
            {entry.name}
          </p>
          <p className="truncate text-[11px] text-[hsl(var(--text-muted))]">
            {copy.icons.styles[style]}
          </p>
        </div>
      </div>

      {colorable && resolved ? (
        <div className="space-y-2">
          <div
            role="group"
            aria-label={copy.icons.colorMode}
            data-testid="icon-color-mode"
            className="grid grid-cols-2 gap-1 rounded-[0.8rem] border border-border/70 bg-[hsl(var(--surface-muted))/0.5] p-1"
          >
            <button
              type="button"
              aria-pressed={!colors.gradient}
              data-testid="icon-mode-solid"
              onClick={() => onColorsChange({ ...colors, gradient: false })}
              className={cn(
                'rounded-[0.6rem] px-2 py-1 text-[11px] font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !colors.gradient
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-[hsl(var(--text-muted))] hover:text-foreground',
              )}
            >
              {copy.icons.solid}
            </button>
            <button
              type="button"
              aria-pressed={colors.gradient}
              data-testid="icon-mode-gradient"
              onClick={() => onColorsChange({ ...colors, gradient: true })}
              className={cn(
                'rounded-[0.6rem] px-2 py-1 text-[11px] font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                colors.gradient
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-[hsl(var(--text-muted))] hover:text-foreground',
              )}
            >
              {copy.icons.gradient}
            </button>
          </div>

          <ColorField
            label={colors.gradient ? copy.icons.start : copy.icons.primary}
            value={resolved.primary}
            onChange={(hex) => onColorsChange({ ...colors, primary: hex })}
            testId="icon-color-primary"
          />

          {(multiSlot || colors.gradient) && (
            <ColorField
              label={colors.gradient ? copy.icons.end : copy.icons.secondary}
              value={resolved.secondary}
              onChange={(hex) => onColorsChange({ ...colors, secondary: hex })}
              testId="icon-color-secondary"
            />
          )}
        </div>
      ) : (
        <p
          data-testid="icon-designed-colors"
          className="text-xs leading-5 text-[hsl(var(--text-muted))]"
        >
          {copy.icons.designed}
        </p>
      )}

      <div className="space-y-1.5">
        <Button
          type="button"
          data-testid="icon-insert"
          onClick={onInsert}
          disabled={busy || !markup || !canInsert}
          className="h-9 w-full rounded-[0.9rem]"
        >
          {copy.icons.insert}
        </Button>
        <p className="text-[11px] leading-4 text-[hsl(var(--text-muted))]">{copy.icons.insertHint}</p>
        {error && (
          <p role="alert" data-testid="icon-error" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
