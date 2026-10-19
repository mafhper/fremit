import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

/**
 * F2 proof of the image mask: the preset applied from the menu is one document
 * field, and the canvas, the SVG thumbnail and the exported PNG must show the
 * same crop. The parity is measured by sampling the same page points on the
 * three surfaces — never by inspecting them visually.
 *
 * The sample points come from the worked geometry of the starter image
 * (90,110 900x560, radius 560 * 0.12 = 67.2): (100,120) falls outside the
 * rounded corner and (540,390) sits inside the image. The geometry unit tests
 * pin those two points independently.
 */

const PAGE_SIZE = 1080;
const PAGE_BACKGROUND = [245, 240, 232, 255];

/** The two document points both surfaces are sampled at. */
const CUT_CORNER = { x: 100, y: 120 };
const INSIDE = { x: 540, y: 390 };

/** Screen position of a page point, mirroring `fitViewport`. */
function pageToScreen(
  host: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
) {
  const fitPadding = 48;
  const zoom = Math.min((host.width - fitPadding) / PAGE_SIZE, (host.height - fitPadding) / PAGE_SIZE);
  const originX = (host.width - PAGE_SIZE * zoom) / 2;
  const originY = (host.height - PAGE_SIZE * zoom) / 2;

  return { x: host.x + originX + x * zoom, y: host.y + originY + y * zoom };
}

/** Live canvas pixel at a screen point (device-pixel-ratio aware). */
async function readCanvasPixel(page: Page, point: { x: number; y: number }) {
  return page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const { data } = context.getImageData(
      Math.round((x - rect.left) * dpr),
      Math.round((y - rect.top) * dpr),
      1,
      1,
    );

    return [data[0], data[1], data[2], data[3]];
  }, point);
}

async function readPagePoint(page: Page, point: { x: number; y: number }) {
  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const screen = pageToScreen(host, point.x, point.y);

  return readCanvasPixel(page, screen);
}

function channelsClose(a: number[] | null, b: number[] | null, tolerance: number): boolean {
  return (
    !!a &&
    !!b &&
    a.length === 4 &&
    b.length === 4 &&
    a.every((channel, index) => Math.abs(channel - b[index]) <= tolerance)
  );
}

/** Exported PNG at 1x, sampled at page points in the decoded file. */
async function sampleExportedPng(page: Page, points: { x: number; y: number }[]) {
  const exportPanel = page.getByTestId('editor-panel').getByTestId('export-panel');

  await exportPanel.getByTestId('export-format').click();
  await page.getByRole('option', { name: 'PNG', exact: true }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportPanel.getByTestId('export-button').click(),
  ]);
  const path = await download.path();

  if (!path) throw new Error('the download has no local path');

  const payload = (await readFile(path)).toString('base64');

  return page.evaluate(
    async ({ source, samples }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${source}`;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2d context for the exported PNG');
      context.drawImage(image, 0, 0);

      return samples.map((point) =>
        Array.from(context.getImageData(point.x, point.y, 1, 1).data),
      );
    },
    { source: payload, samples: points },
  );
}

/**
 * Rasterizes the active page through the same `pageToSvg` the template cards
 * use and samples the same page points. The module import is the dev server's
 * own module graph, so the store seen here is the editor's store.
 */
async function sampleThumbnail(page: Page, points: { x: number; y: number }[]) {
  return page.evaluate(async (samples) => {
    const { useStore } = await import('/fremit/src/store/useStore.ts');
    const { pageToSvg } = await import('/fremit/src/lib/templateThumbnail.ts');
    const state = useStore.getState();
    const activePage = state.document.pages.find((candidate) => candidate.id === state.activePageId);

    if (!activePage) throw new Error('no active page for the thumbnail');

    const url = URL.createObjectURL(new Blob([pageToSvg(activePage)], { type: 'image/svg+xml' }));

    try {
      const image = new Image();
      image.src = url;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = activePage.width;
      canvas.height = activePage.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2d context for the thumbnail');
      context.drawImage(image, 0, 0, activePage.width, activePage.height);

      return samples.map((point) =>
        Array.from(context.getImageData(point.x, point.y, 1, 1).data),
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }, points);
}

async function openMenuOnImage(page: Page) {
  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const center = pageToScreen(host, INSIDE.x, INSIDE.y);

  await page.mouse.click(center.x, center.y, { button: 'right' });
  await expect(page.getByTestId('image-context-menu')).toBeVisible();

  return center;
}

test('canvas, thumbnail and PNG export share the mask crop', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // The menu belongs to images only: a right-click on the headline or on the
  // empty area opens nothing.
  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  for (const point of [{ x: 150, y: 870 }, { x: 10, y: 10 }]) {
    const screen = pageToScreen(host, point.x, point.y);
    await page.mouse.click(screen.x, screen.y, { button: 'right' });
    await expect(page.getByTestId('image-context-menu')).toHaveCount(0);
  }

  // Wait for the cover image to land on the canvas.
  await expect.poll(async () => {
    const corner = await readPagePoint(page, CUT_CORNER);
    return channelsClose(corner, PAGE_BACKGROUND, 2);
  }).toBe(false);

  const beforeCorner = await readPagePoint(page, CUT_CORNER);
  const beforeInside = await readPagePoint(page, INSIDE);

  await openMenuOnImage(page);
  await expect(page.getByTestId('image-context-menu-mask-image')).toBeVisible();
  await expect(page.getByTestId('image-context-menu-clear-mask')).toHaveCount(0);

  const inspected = page.getByTestId('inspector').getByTestId('inspector-mask-state');
  await expect(inspected).toHaveAttribute('data-mask', 'none');

  await page.getByTestId('image-context-menu-mask-image').click();
  await expect(page.getByTestId('image-context-menu')).toHaveCount(0);
  await expect(inspected).toHaveAttribute('data-mask', 'rounded');

  // The rounded corner is the page background now; the inside still paints.
  await expect.poll(async () => {
    const corner = await readPagePoint(page, CUT_CORNER);
    return channelsClose(corner, PAGE_BACKGROUND, 4);
  }).toBe(true);
  await expect.poll(async () => {
    const inside = await readPagePoint(page, INSIDE);
    return channelsClose(inside, PAGE_BACKGROUND, 8);
  }).toBe(false);

  const canvasCorner = await readPagePoint(page, CUT_CORNER);
  const canvasInside = await readPagePoint(page, INSIDE);

  const [exportCorner, exportInside] = await sampleExportedPng(page, [CUT_CORNER, INSIDE]);
  const [thumbnailCorner, thumbnailInside] = await sampleThumbnail(page, [CUT_CORNER, INSIDE]);

  // Every consumer cuts the same corner to the page background…
  for (const corner of [canvasCorner, exportCorner, thumbnailCorner]) {
    expect(channelsClose(corner, PAGE_BACKGROUND, 4)).toBe(true);
  }

  // …and keeps the same image pixel inside, across the three surfaces.
  expect(channelsClose(canvasInside, beforeInside, 2)).toBe(true);
  expect(channelsClose(exportInside, thumbnailInside, 2)).toBe(true);
  expect(channelsClose(canvasInside, exportInside, 2)).toBe(true);
  expect(channelsClose(thumbnailInside, PAGE_BACKGROUND, 8)).toBe(false);

  // Clearing returns the corner to the image, and the menu flips its action.
  await openMenuOnImage(page);
  await expect(page.getByTestId('image-context-menu-mask-image')).toHaveCount(0);
  await expect(page.getByTestId('image-context-menu-clear-mask')).toBeVisible();

  await page.getByTestId('image-context-menu-clear-mask').click();
  await expect(page.getByTestId('image-context-menu')).toHaveCount(0);
  await expect(inspected).toHaveAttribute('data-mask', 'none');

  await expect.poll(async () => {
    const corner = await readPagePoint(page, CUT_CORNER);
    return channelsClose(corner, beforeCorner, 4);
  }).toBe(true);
});

test('a canceled picker returns focus to the canvas host', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // Move the focus away from the canvas first, so the assertion measures the
  // return instead of the untouched initial focus.
  await page.getByTestId('layer-row').first().getByTestId('layer-select').click();
  await expect(page.getByTestId('canvas-host')).not.toBeFocused();

  await page.getByTestId('image-replace-file').dispatchEvent('cancel');

  await expect(page.getByTestId('canvas-host')).toBeFocused();
});

test('a failed replacement alert does not outlive the state it described', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const failReplacement = async () => {
    await openMenuOnImage(page);

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('image-context-menu-replace-image').click();
    const chooser = await chooserPromise;

    await chooser.setFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    await expect(page.getByTestId('image-replace-error')).toBeVisible();
  };

  await failReplacement();

  // A page switch closes the menu and the old error.
  await page.getByTestId('sidebar-rail').getByRole('button', { name: /Pages|Páginas/ }).click();
  await page.getByTestId('page-add').click();
  await expect(page.getByTestId('page-row')).toHaveCount(2);
  await expect(page.getByTestId('image-replace-error')).toHaveCount(0);

  // Back on the first page, a selection change clears it too.
  await page.getByTestId('page-row').first().getByTestId('page-select').click();
  await page.getByTestId('sidebar-rail').getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await failReplacement();

  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Headline' })
    .getByTestId('layer-select')
    .click();

  await expect(page.getByTestId('image-replace-error')).toHaveCount(0);
});
