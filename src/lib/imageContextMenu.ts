/**
 * Model of the image context menu: which actions the menu offers for an
 * object, how the keyboard walks inside it and where it lands inside the
 * canvas host. Pure functions — the component only renders what they return,
 * which is what keeps the menu testable without a canvas.
 */

import type { DocumentObject, ImageObject } from '@/lib/document';
import type { Point, Size } from '@/lib/editorViewport';

/** Actions of the image context menu. */
export type ContextMenuActionId = 'replace-image' | 'mask-image' | 'clear-mask';

/**
 * Actions of an open menu: at least one. The menu never admits an empty list —
 * an object without actions has no menu at all (`null`), which is what keeps a
 * right-click off a text, shape or empty area from opening anything.
 */
export type ContextMenuActions = [ContextMenuActionId, ...ContextMenuActionId[]];

/**
 * Actions the menu offers for an object; `null` when the object has no menu.
 * The mask pair follows the object state: an unmasked image offers the preset,
 * a masked one offers clearing it back to the untouched box.
 */
export function contextMenuActionsFor(
  object: DocumentObject | null | undefined,
): ContextMenuActions | null {
  if (object?.type !== 'image') return null;

  return object.mask === null
    ? ['replace-image', 'mask-image']
    : ['replace-image', 'clear-mask'];
}

/**
 * The one "has a menu" predicate. The right-click, the ContextMenu key and the
 * clipboard replacement all consume this instead of restating the condition —
 * two spellings would diverge on the first adjustment.
 */
export function hasImageContextMenu(
  object: DocumentObject | null | undefined,
): object is ImageObject {
  return contextMenuActionsFor(object) !== null;
}

/**
 * Object a clipboard image replaces: the selected object, and only when it has
 * a menu. Paste and right-click therefore agree on what a target is.
 */
export function pasteReplacementTarget(
  objects: readonly DocumentObject[],
  selectedObjectId: string | null,
): ImageObject | null {
  if (!selectedObjectId) return null;

  const target = objects.find((object) => object.id === selectedObjectId) ?? null;

  return hasImageContextMenu(target) ? target : null;
}

/**
 * Next focused index, wrapping around: the focus never leaves the menu through
 * an arrow key. A neutral index (`-1`, nothing focused yet) enters at the end
 * the movement comes from.
 */
export function nextMenuIndex(current: number, count: number, step: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return step === 1 ? 0 : count - 1;

  return (current + step + count) % count;
}

/** What the menu does with a key; `null` means the key is not the menu's. */
export type ContextMenuCommand =
  | { type: 'focus'; index: number }
  | { type: 'activate' }
  | { type: 'close'; restoreFocus: boolean };

/**
 * Key -> command of the menu. Arrows keep the focus inside it, Enter/Space
 * activate the focused action, Escape closes returning the focus to the canvas
 * host (the focus proxy of the object the menu opened for) and Tab closes
 * handing the focus to the browser.
 */
export function contextMenuCommand(
  key: string,
  index: number,
  count: number,
): ContextMenuCommand | null {
  switch (key) {
    case 'ArrowDown':
      return { type: 'focus', index: nextMenuIndex(index, count, 1) };
    case 'ArrowUp':
      return { type: 'focus', index: nextMenuIndex(index, count, -1) };
    case 'Home':
      return count > 0 ? { type: 'focus', index: 0 } : null;
    case 'End':
      return count > 0 ? { type: 'focus', index: count - 1 } : null;
    case 'Enter':
    case ' ':
      return index >= 0 && index < count ? { type: 'activate' } : null;
    case 'Escape':
      return { type: 'close', restoreFocus: true };
    case 'Tab':
      return { type: 'close', restoreFocus: false };
    default:
      return null;
  }
}

/**
 * Keeps the menu inside the host, so the panel never hangs off the canvas
 * area; a host smaller than the menu pins it to the origin.
 */
export function clampMenuPosition(position: Point, menu: Size, host: Size): Point {
  return {
    x: Math.min(Math.max(position.x, 0), Math.max(host.width - menu.width, 0)),
    y: Math.min(Math.max(position.y, 0), Math.max(host.height - menu.height, 0)),
  };
}
