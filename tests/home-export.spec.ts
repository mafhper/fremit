import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

/**
 * I2/I4 acceptance: the framed home downloads a real PNG built by
 * `composeArtboardExport` — the shader capture plus `computeExportLayout` —
 * at the size of the selected format. The fixture is drawn by this same
 * browser, so the downloaded bytes are the ones a user gets, and the sampled
 * colors are read back from the file, not from the live canvas.
 *
 * The fallback path is the same flow with WebGL blocked: the capture returns
 * nothing and the poster background must be the flat theme color.
 */

test.use({ colorScheme: 'light' });

const DOWNLOAD = /Download PNG|Baixar PNG|Descargar PNG/;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExportLayout {
  canvas: { width: number; height: number };
  scale: number;
  device: Box;
  titleBarHeight: number;
  radius: number;
}

interface DownloadedFile {
  bytes: Buffer;
  filename: string;
}

/** `computeExportLayout` over the live artboard and device boxes. */
async function exportLayout(page: Page, format: 'hero' | 'poster'): Promise<ExportLayout> {
  const layout = await page.evaluate(async (formatId) => {
    const { computeExportLayout, getArtboardFormat } = await import(
      '/fremit/src/components/canvas/formats.ts'
    );
    const artboard = document.querySelector('.artboard')?.getBoundingClientRect();
    const device = document.querySelector('[data-testid="artboard-device"]')?.getBoundingClientRect();

    if (!artboard || !device) return null;

    return computeExportLayout(getArtboardFormat(formatId), artboard, device);
  }, format);

  expect(layout, 'computeExportLayout needs a framed image').not.toBeNull();

  return layout as ExportLayout;
}

/** An opaque PNG drawn by the browser, so the file decodes as a real image. */
async function pngFixture(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');

    if (!context) throw new Error('no 2d context for the fixture');

    context.fillStyle = '#e11d48';
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png').split(',')[1];
  });

  return Buffer.from(base64, 'base64');
}

/** Frames the fixture and waits until the <img> is decoded (drawImage needs it). */
async function frame(page: Page, buffer: Buffer): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'source.png',
    mimeType: 'image/png',
    buffer,
  });

  const image = page.getByTestId('artboard-device').locator('img');
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
}

async function downloadPng(page: Page): Promise<DownloadedFile> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: DOWNLOAD }).click(),
  ]);
  const path = await download.path();

  if (!path) throw new Error('the download has no local path');

  return { bytes: await readFile(path), filename: download.suggestedFilename() };
}

/** PNG IHDR: width and height are the two 32-bit big-endian values at 16 and 20. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Decodes the downloaded file in the browser and returns the sampled RGBA values. */
async function samplePng(
  page: Page,
  bytes: Buffer,
  points: { x: number; y: number }[],
): Promise<number[][]> {
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
    { source: bytes.toString('base64'), samples: points },
  );
}

/** Center of the framed screenshot: below the chrome bar, inside the image. */
function contentPoint(layout: ExportLayout): { x: number; y: number } {
  return {
    x: Math.round(layout.device.x + layout.device.width / 2),
    y: Math.round(
      layout.device.y +
        layout.titleBarHeight +
        (layout.device.height - layout.titleBarHeight) / 2,
    ),
  };
}

test('framed home downloads a hero PNG at 1920x1080 from the shader capture', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/');
  await expect(page.getByTestId('home-source')).toBeVisible();

  // The real WebGL path: capture() reads the shader frame and the poster gets it.
  await expect(page.locator('canvas[data-webgl-status]')).toHaveAttribute(
    'data-webgl-status',
    'rendering',
    { timeout: 15000 },
  );

  await frame(page, await pngFixture(page));
  const layout = await exportLayout(page, 'hero');

  // The poster canvas is the format size, and the device stays inside it.
  expect(layout.canvas).toEqual({ width: 1920, height: 1080 });
  expect(layout.scale).toBeGreaterThan(0);
  expect(layout.device.x).toBeGreaterThanOrEqual(0);
  expect(layout.device.y).toBeGreaterThanOrEqual(0);
  expect(layout.device.x + layout.device.width).toBeLessThanOrEqual(1920);
  expect(layout.device.y + layout.device.height).toBeLessThanOrEqual(1080);

  const { bytes, filename } = await downloadPng(page);
  expect(filename).toBe('fremit-hero.png');
  expect(bytes.length).toBeGreaterThan(1000);

  const size = pngSize(bytes);
  expect(size).toEqual(layout.canvas);
  expect(size).toEqual({ width: 1920, height: 1080 });

  // The sampled pixels follow the same layout: red screenshot inside the frame,
  // #0a0f18 chrome bar where computeExportLayout puts it.
  const [content, chrome] = await samplePng(page, bytes, [
    contentPoint(layout),
    { x: Math.round(layout.device.x + 3), y: Math.round(layout.device.y + layout.titleBarHeight / 2) },
  ]);
  expect(content).toEqual([225, 29, 72, 255]);
  expect(chrome).toEqual([10, 15, 24, 255]);

  console.log(`[i4] hero ${size.width}x${size.height} ${bytes.length} bytes`);
});

test('framed poster downloads a 1800x2400 PNG after the format switch', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/');
  await expect(page.getByTestId('home-source')).toBeVisible();

  await page.getByRole('button', { name: /^(Poster|Pôster|Póster)$/ }).click();
  await expect(page.locator('.artboard')).toHaveAttribute('data-format', 'poster');
  // The format transition animates --ar for 0.6s; measure after it settles.
  await page.waitForTimeout(800);

  await frame(page, await pngFixture(page));
  const layout = await exportLayout(page, 'poster');

  expect(layout.canvas).toEqual({ width: 1800, height: 2400 });

  const { bytes, filename } = await downloadPng(page);
  expect(filename).toBe('fremit-poster.png');

  const size = pngSize(bytes);
  expect(size).toEqual(layout.canvas);
  expect(size).toEqual({ width: 1800, height: 2400 });

  const [content] = await samplePng(page, bytes, [contentPoint(layout)]);
  expect(content).toEqual([225, 29, 72, 255]);

  console.log(`[i4] poster ${size.width}x${size.height} ${bytes.length} bytes`);
});

test('framed home falls back to the flat theme color when WebGL is blocked', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (/^(webgl2?|experimental-webgl)$/.test(type)) return null;

      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto('/fremit/');
  await expect(page.getByTestId('home-source')).toBeVisible();
  await expect(page.locator('canvas[data-webgl-status]')).toHaveAttribute(
    'data-webgl-status',
    'context-failed',
  );
  expect(await page.evaluate(() => document.documentElement.classList.contains('light'))).toBe(true);

  await frame(page, await pngFixture(page));
  const layout = await exportLayout(page, 'hero');

  const { bytes } = await downloadPng(page);
  const size = pngSize(bytes);
  expect(size).toEqual({ width: 1920, height: 1080 });
  expect(size).toEqual(layout.canvas);

  // Both corners are outside the device: with no capture the background is the
  // flat fallback (#cfe5fb on the light theme), and the frame still composes.
  const [topLeft, bottomRight, content] = await samplePng(page, bytes, [
    { x: 2, y: 2 },
    { x: size.width - 3, y: size.height - 3 },
    contentPoint(layout),
  ]);
  expect(topLeft).toEqual([207, 229, 251, 255]);
  expect(bottomRight).toEqual([207, 229, 251, 255]);
  expect(content).toEqual([225, 29, 72, 255]);

  console.log(`[i4] fallback ${size.width}x${size.height} ${bytes.length} bytes`);
});
