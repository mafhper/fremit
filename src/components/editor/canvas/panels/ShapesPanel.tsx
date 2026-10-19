/**
 * Shapes drawer of the canvas shell: one card per shape kind, each previewed
 * from the very preset that lands on the page (`pageToSvg` over a miniature
 * page), so a card can never promise a different shape than it inserts. The
 * geometry is the shared `createShapePreset`, so the layers header inserts the
 * same default rectangle and both add affordances agree.
 *
 * Kinds: rectangle, ellipse, triangle, line, star and polygon — the
 * Documento v2 shape contract. The star and the polygon carry their own
 * parameters (`sides`, `innerRadius`), edited in the inspector.
 */

import { useMemo } from 'react';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentPage, ShapeKind } from '@/lib/document';
import { SHAPE_PRESET_NAMES, createShapePreset } from '@/lib/shapePresets';
import { pageToSvg } from '@/lib/templateThumbnail';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const PREVIEW_SIZE = 120;

/** Rail order of the cards: primitives first, then the parameterised kinds. */
const SHAPE_OPTIONS: readonly ShapeKind[] = [
  'rect',
  'ellipse',
  'triangle',
  'line',
  'star',
  'polygon',
];

function shapePreviewPage(kind: ShapeKind): DocumentPage {
  return {
    id: `shape-preview-${kind}`,
    name: SHAPE_PRESET_NAMES[kind],
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    background: { kind: 'solid', color: 'transparent' },
    transition: null,
    objects: [createShapePreset(kind, { width: PREVIEW_SIZE, height: PREVIEW_SIZE })],
  };
}

export function ShapesPanel() {
  const { copy } = useI18n();
  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const addObject = useStore((state) => state.addObject);

  // One preview per kind, built once from the preset itself.
  const previews = useMemo(
    () =>
      new Map(
        SHAPE_OPTIONS.map((kind) => [kind, pageToSvg(shapePreviewPage(kind))] as const),
      ),
    [],
  );

  const page = document.pages.find((candidate) => candidate.id === activePageId) ?? null;
  if (!page) return null;

  const labels: Record<ShapeKind, string> = {
    rect: copy.shapes.rectangle,
    ellipse: copy.shapes.ellipse,
    triangle: copy.shapes.triangle,
    line: copy.shapes.line,
    star: copy.shapes.star,
    polygon: copy.shapes.polygon,
  };

  const insertShape = (kind: ShapeKind) => {
    addObject(createShapePreset(kind, page));
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {SHAPE_OPTIONS.map((kind) => (
        <button
          key={kind}
          type="button"
          data-testid={`shape-preset-${kind}`}
          aria-label={labels[kind]}
          onClick={() => insertShape(kind)}
          className={cn(
            'flex flex-col gap-1.5 rounded-[0.9rem] border border-border/70 bg-background p-2 text-left transition',
            'hover:border-accent/50 hover:bg-[hsl(var(--surface-muted))/0.6]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <span
            aria-hidden="true"
            className="block h-16 w-full overflow-hidden rounded-[0.7rem] border border-border/60 bg-[hsl(var(--surface-muted))/0.5] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: previews.get(kind) ?? '' }}
          />
          <span className="block truncate text-xs font-medium">{labels[kind]}</span>
        </button>
      ))}
    </div>
  );
}
