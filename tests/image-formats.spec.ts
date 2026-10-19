import { expect, test, type Page } from '@playwright/test';

/**
 * Fatia 4 proof: the acceptance matrix and the typed `mp4` refusal reach the
 * UI, and a refused source leaves the document exactly as it was. The document
 * is read from the editor's own store — the same module graph the canvas uses
 * — so the comparison is over the JSON the app would serialize, not over a
 * visual proxy.
 *
 * Every refusal is exercised twice: through the file picker and through a URL
 * (the object entry and the background entry). Video is outside the product
 * scope; the refusal is the only behavior asserted.
 */

const PAGE_SIZE = 1080;

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

/** The document as the editor would serialize it. */
async function documentSnapshot(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const { useStore } = await import('/fremit/src/store/useStore.ts');

    return JSON.stringify(useStore.getState().document);
  });
}

const MP4 = {
  name: 'clip.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112]),
};

const VIDEO_COPY = /Video is not supported|Vídeo não é suportado|El vídeo no es compatible/i;

async function openEditor(page: Page) {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
}

async function openMenuOnImage(page: Page) {
  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const inside = pageToScreen(host, 540, 390);

  await page.mouse.click(inside.x, inside.y, { button: 'right' });
  await expect(page.getByTestId('image-context-menu')).toBeVisible();
}

test('the image object refuses video from the picker and from the panel without mutating', async ({
  page,
}) => {
  await openEditor(page);
  const before = await documentSnapshot(page);

  // Context-menu replacement: the picker path.
  await openMenuOnImage(page);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('image-context-menu-replace-image').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(MP4);

  await expect(page.getByTestId('image-replace-error')).toHaveText(VIDEO_COPY);
  await expect(page.getByTestId('image-context-menu')).toHaveCount(0);

  // The Images drawer: the insertion path, file and URL.
  await page.getByTestId('sidebar-rail').getByRole('button', { name: /Images|Imagens|Imágenes/ }).click();
  const panel = page.getByTestId('sidebar-panel-images');
  await expect(panel).toBeVisible();

  await panel.getByTestId('images-file').setInputFiles(MP4);
  await expect(panel.getByTestId('images-error')).toHaveText(VIDEO_COPY);

  await panel.getByTestId('images-url').fill('https://example.test/clip.mp4');
  await panel.getByTestId('images-add-url').click();
  await expect(panel.getByTestId('images-error')).toHaveText(VIDEO_COPY);

  // Nothing entered the page: same layer count, same document.
  await page
    .getByTestId('sidebar-rail')
    .getByRole('button', { name: /Layers|Camadas|Capas/ })
    .click();
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  expect(await documentSnapshot(page)).toBe(before);
});

test('the image background refuses video from the picker and from the URL without mutating', async ({
  page,
}) => {
  await openEditor(page);

  await page
    .getByTestId('sidebar-rail')
    .getByRole('button', { name: /Background|Fundo|Fondo/ })
    .click();
  const panel = page.getByTestId('sidebar-panel-background');
  await expect(panel).toBeVisible();

  await panel.getByTestId('background-kind-image').click();
  const before = await documentSnapshot(page);

  await panel.getByTestId('background-image-file').setInputFiles(MP4);
  await expect(panel.getByTestId('background-error')).toHaveText(VIDEO_COPY);

  await panel.getByTestId('background-image-url').fill('https://example.test/clip.mp4');
  await panel.getByTestId('background-image-add-url').click();
  await expect(panel.getByTestId('background-error')).toHaveText(VIDEO_COPY);

  // The fill is still the one the page had before both attempts.
  await expect(panel.getByTestId('background-image-preview')).toHaveCount(0);
  expect(await documentSnapshot(page)).toBe(before);
});
