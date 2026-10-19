/**
 * Rulers for the dedicated canvas: 24 px thick on both axes, ticks derived
 * from the viewport (zoom + pan) and the page size. The page extent is
 * highlighted so the ruler stays readable at any zoom.
 */

import {
  chooseRulerStep,
  rulerTickMarks,
  RULER_SIZE,
  type Size,
  type Viewport,
} from '@/lib/editorViewport';

export interface CanvasRulersProps {
  viewport: Viewport;
  pageSize: Size;
  stageSize: Size;
}

export function CanvasRulers({ viewport, pageSize, stageSize }: CanvasRulersProps) {
  if (stageSize.width <= 0 || stageSize.height <= 0) return null;

  const step = chooseRulerStep(viewport.zoom);
  const xStart = -viewport.x / viewport.zoom;
  const xEnd = (stageSize.width - viewport.x) / viewport.zoom;
  const yStart = -viewport.y / viewport.zoom;
  const yEnd = (stageSize.height - viewport.y) / viewport.zoom;
  const xTicks = rulerTickMarks(xStart, xEnd, step);
  const yTicks = rulerTickMarks(yStart, yEnd, step);
  const pageStartX = viewport.x;
  const pageStartY = viewport.y;
  const pageWidth = pageSize.width * viewport.zoom;
  const pageHeight = pageSize.height * viewport.zoom;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" aria-hidden="true">
      <div
        className="absolute left-0 top-0 border-b border-r border-border/70 bg-[hsl(var(--surface-muted))/0.9]"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      <div
        className="absolute overflow-hidden border-b border-border/70 bg-[hsl(var(--surface-muted))/0.9]"
        style={{ left: RULER_SIZE, right: 0, top: 0, height: RULER_SIZE }}
      >
        <div
          className="absolute bottom-0 top-0 bg-[hsl(var(--accent)/0.16)]"
          style={{ left: pageStartX, width: pageWidth }}
        />
        {xTicks.map((tick) => (
          <div
            key={`x-${tick.value}`}
            className="absolute bottom-0 w-px bg-[hsl(var(--text-soft)/0.75)]"
            style={{ left: viewport.x + tick.value * viewport.zoom, height: tick.major ? 11 : 5 }}
          />
        ))}
        {xTicks
          .filter((tick) => tick.major)
          .map((tick) => (
            <span
              key={`xl-${tick.value}`}
              className="absolute top-px text-[9px] leading-none text-foreground"
              style={{ left: viewport.x + tick.value * viewport.zoom + 2 }}
            >
              {Math.round(tick.value)}
            </span>
          ))}
      </div>
      <div
        className="absolute overflow-hidden border-r border-border/70 bg-[hsl(var(--surface-muted))/0.9]"
        style={{ left: 0, top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
      >
        <div
          className="absolute left-0 right-0 bg-[hsl(var(--accent)/0.16)]"
          style={{ top: pageStartY, height: pageHeight }}
        />
        {yTicks.map((tick) => (
          <div
            key={`y-${tick.value}`}
            className="absolute right-0 h-px bg-[hsl(var(--text-soft)/0.75)]"
            style={{ top: viewport.y + tick.value * viewport.zoom, width: tick.major ? 11 : 5 }}
          />
        ))}
        {yTicks
          .filter((tick) => tick.major)
          .map((tick) => (
            <span
              key={`yl-${tick.value}`}
              className="absolute text-[9px] leading-none text-foreground"
              style={{
                top: viewport.y + tick.value * viewport.zoom + 2,
                left: 2,
                transform: 'rotate(-90deg)',
                transformOrigin: 'left top',
              }}
            >
              {Math.round(tick.value)}
            </span>
          ))}
      </div>
    </div>
  );
}
