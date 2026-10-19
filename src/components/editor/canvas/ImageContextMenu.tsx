/**
 * Context menu of the canvas, rendered over the object it was opened for. The
 * keyboard behaviour (arrows, Enter/Space, Escape, Tab) comes from the pure
 * `contextMenuCommand`; this component only executes the command and keeps the
 * focus inside the menu while it is open.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/useI18n';
import {
  contextMenuCommand,
  type ContextMenuActionId,
  type ContextMenuActions,
} from '@/lib/imageContextMenu';
import { cn } from '@/lib/utils';

export interface ImageContextMenuProps {
  position: { x: number; y: number };
  /** Non-empty by contract: an object without actions has no menu to render. */
  actions: ContextMenuActions;
  onActivate: (action: ContextMenuActionId) => void;
  onClose: (restoreFocus: boolean) => void;
}

export function ImageContextMenu({
  position,
  actions,
  onActivate,
  onClose,
}: ImageContextMenuProps) {
  const { copy } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const labelFor = (action: ContextMenuActionId) => {
    switch (action) {
      case 'replace-image':
        return copy.contextMenu.replaceImage;
      case 'mask-image':
        return copy.contextMenu.maskImage;
      case 'clear-mask':
        return copy.contextMenu.clearMask;
    }
  };

  // The menu takes the focus on open, so the keyboard can walk it right away.
  useEffect(() => {
    itemRefs.current[0]?.focus();
  }, []);

  // A click anywhere else closes the menu; the focus goes to whatever the
  // pointer chose, so the canvas is not focused back.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose(false);
    };

    window.addEventListener('pointerdown', onPointerDown, true);

    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const command = contextMenuCommand(event.key, focusedIndex, actions.length);
    if (!command) return;

    // The canvas keydown listener (window) must not see a key the menu owns —
    // Escape closing the menu must not clear the selection underneath.
    event.preventDefault();
    event.stopPropagation();

    if (command.type === 'focus') {
      setFocusedIndex(command.index);
      itemRefs.current[command.index]?.focus();
      return;
    }

    if (command.type === 'activate') {
      const action = actions[focusedIndex];
      if (action) onActivate(action);
      return;
    }

    onClose(command.restoreFocus);
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={copy.contextMenu.label}
      data-testid="image-context-menu"
      className="absolute z-30 min-w-[12rem] rounded-[0.9rem] border border-border/80 bg-background p-1 shadow-2xl"
      style={{ left: position.x, top: position.y }}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {actions.map((action, index) => (
        <button
          key={action}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          data-testid={`image-context-menu-${action}`}
          onClick={() => onActivate(action)}
          className={cn(
            'flex w-full items-center rounded-[0.65rem] px-3 py-2 text-left text-sm text-foreground transition',
            'hover:bg-[hsl(var(--surface-muted))]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          )}
        >
          {labelFor(action)}
        </button>
      ))}
    </div>
  );
}
