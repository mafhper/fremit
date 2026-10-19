/**
 * Tool rail of the canvas shell: one button per registered panel (icon +
 * label), `aria-pressed` marking the open tool. Clicking the open tool closes
 * the dock; any other tool takes its place. Lazy panels start downloading on
 * hover/focus, so the chunk is usually there before the click.
 *
 * The rail is a toolbar with roving tabindex: arrows move focus between the
 * tools (vertical on the desktop rail, horizontal in the mobile sheet), Home
 * and End jump to the ends, and only one button sits in the tab order.
 *
 * The desktop rail is the vertical instance; the mobile sheet reuses the same
 * component horizontally (same order, same labels, same test hooks).
 */

import { useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { cn } from '@/lib/utils';
import { SIDEBAR_PANELS, type PanelId } from './panels/registry';

export interface SidebarRailProps {
  activePanelId: PanelId | null;
  onToggle: (panelId: PanelId) => void;
  orientation?: 'vertical' | 'horizontal';
  testId?: string;
  className?: string;
}

export function SidebarRail({
  activePanelId,
  onToggle,
  orientation = 'vertical',
  testId,
  className,
}: SidebarRailProps) {
  const { copy } = useI18n();
  const vertical = orientation === 'vertical';
  const railRef = useRef<HTMLDivElement | null>(null);
  // The index the user interacted with; `null` means "nobody yet" and the
  // roving tabindex follows the open tool instead. Deriving it this way keeps
  // the tab order correct when the open tool changes outside this rail (the
  // dock close button, the other instance inside the mobile sheet) without an
  // effect syncing state.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const activeIndex = SIDEBAR_PANELS.findIndex((panel) => panel.id === activePanelId);
  const rovingIndex = focusIndex ?? (activeIndex >= 0 ? activeIndex : 0);

  /** Index of the button that really holds focus, or `null` when focus is outside. */
  const focusedButtonIndex = (): number | null => {
    const buttons = railRef.current?.querySelectorAll<HTMLButtonElement>('button');

    if (!buttons) return null;

    for (let index = 0; index < buttons.length; index += 1) {
      if (buttons[index] === document.activeElement) return index;
    }

    return null;
  };

  const focusButtonAt = (index: number) => {
    const buttons = railRef.current?.querySelectorAll<HTMLButtonElement>('button');

    buttons?.[index]?.focus();
    setFocusIndex(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = SIDEBAR_PANELS.length;
    // Arrows move from the real focus, not from a state that a later render
    // may have moved elsewhere; the roving index is only the fallback.
    const current = focusedButtonIndex() ?? rovingIndex;
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    let target: number | null = null;

    if (event.key === nextKey) target = (current + 1) % count;
    else if (event.key === previousKey) target = (current - 1 + count) % count;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = count - 1;

    if (target === null) return;

    event.preventDefault();
    focusButtonAt(target);
  };

  return (
    <div
      ref={railRef}
      data-testid={testId}
      role="toolbar"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={copy.sidebar.rail}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex shrink-0 gap-1 bg-[hsl(var(--surface))/0.6]',
        vertical
          ? 'w-16 flex-col items-stretch overflow-y-auto border-r border-border/80 px-1 py-2'
          : 'items-stretch overflow-x-auto border-b border-border/80 px-2 py-2',
        className,
      )}
    >
      {SIDEBAR_PANELS.map((panel, index) => {
        const Icon = panel.icon;
        const label = copy.sidebar[panel.id];
        const active = panel.id === activePanelId;

        return (
          <button
            key={panel.id}
            type="button"
            data-tool={panel.id}
            aria-pressed={active}
            aria-label={label}
            title={label}
            tabIndex={index === rovingIndex ? 0 : -1}
            onClick={() => {
              setFocusIndex(index);
              onToggle(panel.id);
            }}
            onPointerEnter={panel.preload}
            onFocus={() => {
              setFocusIndex(index);
              panel.preload?.();
            }}
            className={cn(
              'flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] font-medium leading-tight transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-[hsl(var(--surface-muted))] text-foreground'
                : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-muted))/0.6] hover:text-foreground',
              !vertical && 'w-16',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-full truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
