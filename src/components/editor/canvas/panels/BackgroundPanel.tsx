/**
 * Background drawer (block A of the sidebar plan): the workspace outside the
 * page follows the app theme through the `--canvas-workspace` token — it is
 * decoupled from the mockup background and never touches the document — while
 * the page keeps its own fill from the Documento JSON (solid, gradient or
 * image, schema v2). The swatch previews the workspace token; it changes with
 * the theme, like the stage, and is a labelled image — the only preview of the
 * token, so it is not hidden from assistive tech.
 */

import { useI18n } from '@/i18n/useI18n';
import { PageBackgroundField } from './PageBackgroundField';

export function BackgroundPanel() {
  const { copy } = useI18n();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
          {copy.canvas.workspaceBackground}
        </h3>
        <div className="flex items-center gap-2">
          <span
            role="img"
            aria-label={copy.canvas.workspaceBackground}
            data-workspace-swatch=""
            className="h-7 w-7 rounded-full border border-border/70"
            style={{ background: 'hsl(var(--canvas-workspace))' }}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--text-soft))]">
          {copy.canvas.pageBackground}
        </h3>
        <PageBackgroundField />
      </section>
    </div>
  );
}
