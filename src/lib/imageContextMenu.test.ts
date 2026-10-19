import { describe, expect, it } from 'vitest';
import {
  clampMenuPosition,
  contextMenuActionsFor,
  contextMenuCommand,
  hasImageContextMenu,
  nextMenuIndex,
  pasteReplacementTarget,
} from '@/lib/imageContextMenu';
import { createImageObject, createShapeObject, createTextObject } from '@/lib/document';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('contextMenuActionsFor', () => {
  it('offers the replacement and the mask preset for an unmasked image', () => {
    expect(contextMenuActionsFor(createImageObject(onePixelPng))).toEqual([
      'replace-image',
      'mask-image',
    ]);
  });

  it('offers clearing once the image carries the mask', () => {
    expect(
      contextMenuActionsFor(createImageObject(onePixelPng, { mask: 'rounded' })),
    ).toEqual(['replace-image', 'clear-mask']);
  });

  it('has no menu for a text, a shape or the empty area', () => {
    expect(contextMenuActionsFor(createTextObject('Hello'))).toBeNull();
    expect(contextMenuActionsFor(createShapeObject('rect'))).toBeNull();
    expect(contextMenuActionsFor(null)).toBeNull();
    expect(contextMenuActionsFor(undefined)).toBeNull();
  });

  it('never returns an empty list: an object without actions has no menu', () => {
    // The non-empty tuple is the contract; there is no state where the menu
    // component receives zero rows.
    expect(contextMenuActionsFor(createTextObject('Hello'))).not.toEqual([]);
  });
});

describe('hasImageContextMenu', () => {
  it('is the single predicate: an image has a menu in both mask states', () => {
    expect(hasImageContextMenu(createImageObject(onePixelPng))).toBe(true);
    expect(hasImageContextMenu(createImageObject(onePixelPng, { mask: 'rounded' }))).toBe(true);
  });

  it('is false for every other object and for the empty area', () => {
    expect(hasImageContextMenu(createTextObject('Hello'))).toBe(false);
    expect(hasImageContextMenu(createShapeObject('rect'))).toBe(false);
    expect(hasImageContextMenu(null)).toBe(false);
    expect(hasImageContextMenu(undefined)).toBe(false);
  });
});

describe('pasteReplacementTarget', () => {
  const image = createImageObject(onePixelPng, { id: 'image-1' });
  const text = createTextObject('Hello', { id: 'text-1' });
  const shape = createShapeObject('rect', { id: 'shape-1' });
  const objects = [image, text, shape];

  it('targets the selected image — the same predicate the right-click uses', () => {
    expect(pasteReplacementTarget(objects, 'image-1')).toBe(image);
  });

  it('has no target when the selection is another kind or is empty', () => {
    expect(pasteReplacementTarget(objects, 'text-1')).toBeNull();
    expect(pasteReplacementTarget(objects, 'shape-1')).toBeNull();
    expect(pasteReplacementTarget(objects, null)).toBeNull();
    expect(pasteReplacementTarget(objects, 'missing')).toBeNull();
  });
});

describe('nextMenuIndex', () => {
  it('wraps around and enters at the end the movement comes from', () => {
    expect(nextMenuIndex(0, 1, 1)).toBe(0);
    expect(nextMenuIndex(0, 1, -1)).toBe(0);
    expect(nextMenuIndex(2, 3, 1)).toBe(0);
    expect(nextMenuIndex(0, 3, -1)).toBe(2);
    expect(nextMenuIndex(-1, 3, 1)).toBe(0);
    expect(nextMenuIndex(-1, 3, -1)).toBe(2);
  });

  it('has nowhere to go on an empty menu', () => {
    expect(nextMenuIndex(0, 0, 1)).toBe(-1);
  });
});

describe('contextMenuCommand', () => {
  it('moves the focus with the arrow keys, Home and End', () => {
    expect(contextMenuCommand('ArrowDown', 0, 2)).toEqual({ type: 'focus', index: 1 });
    expect(contextMenuCommand('ArrowUp', 0, 2)).toEqual({ type: 'focus', index: 1 });
    expect(contextMenuCommand('ArrowDown', 1, 2)).toEqual({ type: 'focus', index: 0 });
    expect(contextMenuCommand('Home', 1, 3)).toEqual({ type: 'focus', index: 0 });
    expect(contextMenuCommand('End', 0, 3)).toEqual({ type: 'focus', index: 2 });
  });

  it('activates the focused action with Enter or Space', () => {
    expect(contextMenuCommand('Enter', 0, 1)).toEqual({ type: 'activate' });
    expect(contextMenuCommand(' ', 0, 1)).toEqual({ type: 'activate' });
  });

  it('closes with Escape returning the focus to the canvas host', () => {
    expect(contextMenuCommand('Escape', 0, 1)).toEqual({ type: 'close', restoreFocus: true });
  });

  it('closes with Tab without stealing the focus back', () => {
    expect(contextMenuCommand('Tab', 0, 1)).toEqual({ type: 'close', restoreFocus: false });
  });

  it('ignores keys the menu does not own', () => {
    expect(contextMenuCommand('a', 0, 1)).toBeNull();
    expect(contextMenuCommand('PageDown', 0, 1)).toBeNull();
  });
});

describe('clampMenuPosition', () => {
  const menu = { width: 200, height: 48 };

  it('keeps the menu inside the host', () => {
    expect(clampMenuPosition({ x: 900, y: 500 }, menu, { width: 800, height: 600 })).toEqual({
      x: 600,
      y: 500,
    });
    expect(clampMenuPosition({ x: -20, y: -8 }, menu, { width: 800, height: 600 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('pins the menu to the origin when the host is smaller than it', () => {
    expect(clampMenuPosition({ x: 40, y: 40 }, menu, { width: 100, height: 30 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});
