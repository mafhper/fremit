import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * F1.7 acceptance: the export panel renders the Documento JSON (never the live
 * canvas) into PNG/JPG/SVG. The starter document is the worked fixture: one
 * 1080x1080 poster page with an image, an accent bar and a headline.
 */

interface DownloadedFile {
  bytes: Buffer;
  filename: string;
}

async function downloadOn(page: Page, click: () => Promise<void>): Promise<DownloadedFile> {
  const [download] = await Promise.all([page.waitForEvent('download'), click()]);
  const path = await download.path();
  if (!path) throw new Error('the download has no local path');

  return { bytes: await readFile(path), filename: download.suggestedFilename() };
}

function pngSize(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegSize(bytes: Buffer): { width: number; height: number } {
  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }

    offset += 2 + bytes.readUInt16BE(offset + 2);
  }

  throw new Error('no JPEG start-of-frame marker found');
}

/**
 * Desktop export panel: the aside (`editor-panel`) is its home on desktop; the
 * mobile sheet mounts its own copy, so every export query is scoped to one
 * container instead of matching both.
 */
function exportPanel(page: Page) {
  return page.getByTestId('editor-panel').getByTestId('export-panel');
}

async function selectExportFormat(page: Page, name: 'WEBP' | 'PNG' | 'JPG' | 'SVG'): Promise<void> {
  await exportPanel(page).getByTestId('export-format').click();
  await page.getByRole('option', { name, exact: true }).click();
}

/**
 * Expands one family of the template gallery. The panel opens on the first
 * family and keeps one open at a time, so the click is skipped when the
 * section is already expanded (clicking an open header would collapse it).
 */
async function openTemplateSection(templates: Locator, section: string) {
  const toggle = templates.getByTestId(`template-section-toggle-${section}`);

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
}

/** Decodes the bytes in the browser — the "opens in a common viewer" check. */
async function decodedSize(
  page: Page,
  mimeType: string,
  bytes: Buffer,
): Promise<{ width: number; height: number }> {
  return page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();

      return { width: image.naturalWidth, height: image.naturalHeight };
    },
    `data:${mimeType};base64,${bytes.toString('base64')}`,
  );
}

/** Per-channel distance check for lossy formats (WebP at quality < 1). */
function channelsClose(actual: number[], expected: number[], tolerance: number): boolean {
  return expected.every((value, index) => Math.abs(actual[index] - value) <= tolerance);
}

const PAGE_FORMATS = [
  { option: /Poster/, width: 1080, height: 1080 },
  { option: /Banner/, width: 1500, height: 500 },
  { option: /Hero/, width: 1920, height: 1080 },
] as const;

/**
 * Precondition of the WebP default (ADR-007): the browser must encode WebP
 * through `canvas.toBlob` before the export panel promises it. Fabric's
 * `StaticCanvas.toBlob` forwards the format to this same browser API, so the
 * capability proven here is the one the default depends on — and the RIFF/WEBP
 * magic is checked from the bytes, not from the requested type.
 */
test('the browser encodes WebP through canvas.toBlob', async ({ page }) => {
  const proof = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.fillStyle = '#1f6feb';
    context.fillRect(0, 0, 2, 2);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.92),
    );
    if (!blob) return null;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

    return { type: blob.type, riff: ascii(0, 4), webp: ascii(8, 12) };
  });

  expect(proof).not.toBeNull();
  expect(proof?.type).toBe('image/webp');
  expect(proof?.riff).toBe('RIFF');
  expect(proof?.webp).toBe('WEBP');
});

/**
 * The default export (ADR-007): the panel opens in WebP, the file is a real
 * WebP container and the browser decodes it at page size.
 */
test('the export panel opens in WebP and the default export is a decodable WebP', async ({
  page,
}) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await expect(exportPanel(page).getByTestId('export-format')).toContainText('WEBP');

  const { bytes, filename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(filename).toBe('poster.webp');
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  expect(await decodedSize(page, 'image/webp', bytes)).toEqual({ width: 1080, height: 1080 });
});

test('the default WebP export carries the document pixels', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);

  const { bytes } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  const sampled = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/webp;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported WebP');
    context.drawImage(image, 0, 0);

    const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data);

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      background: pixel(4, 4),
      accentBar: pixel(300, 743),
      coverImage: pixel(540, 390),
    };
  }, bytes.toString('base64'));

  // The same document points the PNG test asserts bit-identical, here within
  // the tolerance of a lossy codec: page (#f5f0e8), accent bar (#1f6feb) and
  // the cover image area. A wrong point would differ by far more than 16.
  expect(sampled.width).toBe(1080);
  expect(sampled.height).toBe(1080);
  expect(channelsClose(sampled.background, [245, 240, 232, 255], 16)).toBe(true);
  expect(channelsClose(sampled.accentBar, [31, 111, 235, 255], 16)).toBe(true);
  expect(channelsClose(sampled.coverImage, [30, 41, 59, 255], 16)).toBe(true);
});

test('export panel produces 12 artifacts across the three page formats', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const pageFormatSelect = page.getByRole('combobox', { name: /^Format(o)?$/ });
  const exportButton = exportPanel(page).getByTestId('export-button');
  const artifacts = new Set<string>();

  for (const pageFormat of PAGE_FORMATS) {
    await pageFormatSelect.click();
    await page.getByRole('option', { name: pageFormat.option }).click();

    for (const format of ['WEBP', 'PNG', 'JPG', 'SVG'] as const) {
      await selectExportFormat(page, format);

      const { bytes, filename } = await downloadOn(page, () => exportButton.click());
      expect(filename).toBe(`poster.${format.toLowerCase()}`);

      if (format === 'WEBP') {
        expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
        expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
        expect(await decodedSize(page, 'image/webp', bytes)).toEqual({
          width: pageFormat.width,
          height: pageFormat.height,
        });
      } else if (format === 'PNG') {
        expect(bytes.subarray(0, 8)).toEqual(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );
        expect(pngSize(bytes)).toEqual({ width: pageFormat.width, height: pageFormat.height });
        expect(await decodedSize(page, 'image/png', bytes)).toEqual({
          width: pageFormat.width,
          height: pageFormat.height,
        });
      } else if (format === 'JPG') {
        expect(bytes[0]).toBe(0xff);
        expect(bytes[1]).toBe(0xd8);
        expect(jpegSize(bytes)).toEqual({ width: pageFormat.width, height: pageFormat.height });
        expect(await decodedSize(page, 'image/jpeg', bytes)).toEqual({
          width: pageFormat.width,
          height: pageFormat.height,
        });
      } else {
        const svg = bytes.toString('utf8');
        expect(svg.startsWith('<?xml')).toBe(true);
        expect(svg).toContain('<svg');
        expect(svg).toContain('<image');
        expect(svg).toContain('<text');
        expect(svg).toContain(`width="${pageFormat.width}"`);
        expect(svg).toContain(`height="${pageFormat.height}"`);
      }

      artifacts.add(`${pageFormat.width}x${pageFormat.height}:${format}`);
    }
  }

  expect(artifacts.size).toBe(12);
});

/**
 * F2.7a: the README hero seed declares its image slot as a self-contained SVG
 * data URL (the seed's own contract). This is the export proof of it: the slot
 * is a normal image object, so it must travel through the real render path —
 * loaded by `loadImage` and painted by the throwaway `StaticCanvas` behind
 * `renderPageRaster`/`renderPageSvg`. A skipped image would leave the page
 * background where the slot should be.
 */
test('the README hero seed exports its SVG placeholder slot', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  const templates = page.getByTestId('sidebar-panel-templates');

  // Fixed 720 seed first: the raster proof.
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  await expect(templates).toBeVisible();

  // The hero family is its own collapsible section: expand it before applying.
  await openTemplateSection(templates, 'readme-hero');

  const fixedCard = templates.getByTestId('template-card-readme-hero-720');
  await expect(fixedCard.locator('svg')).toBeVisible();
  await fixedCard.click();

  // The seed landed as the active page: its four layers replace the starter's.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Hero image' })).toHaveCount(1);

  await selectExportFormat(page, 'PNG');
  const { bytes, filename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(filename).toBe('readme_hero_720.png');
  expect(pngSize(bytes)).toEqual({ width: 720, height: 588 });

  const sampled = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/png;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported PNG');
    context.drawImage(image, 0, 0);

    const at = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data);

    // The slot sits at (40,228) 640x320 on the 720 page; (100,260) is inside
    // it and away from the placeholder's centered label.
    return { background: at(4, 4), slot: at(100, 260) };
  }, bytes.toString('base64'));

  // #0f172a page fill, #1e293b slot fill: the slot color is the image data
  // URL painting, not the page behind it.
  expect(sampled.background).toEqual([15, 23, 42, 255]);
  expect(sampled.slot).toEqual([30, 41, 59, 255]);

  // Fluid seed next: the vector proof. The panel remounts on the first family,
  // so the hero section is expanded again.
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  await expect(templates).toBeVisible();
  await openTemplateSection(templates, 'readme-hero');

  const fluidCard = templates.getByTestId('template-card-readme-hero-fluid-100');
  await expect(fluidCard.locator('svg')).toBeVisible();
  await fluidCard.click();

  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(4);

  await selectExportFormat(page, 'SVG');
  const { bytes: svgBytes, filename: svgFilename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(svgFilename).toBe('readme_hero_100.svg');
  const svg = svgBytes.toString('utf8');
  expect(svg).toContain('<image');
  expect(svg).toContain('data:image/svg+xml;charset=utf-8,');

  // The file still opens in the browser at the declared fluid page size.
  expect(await decodedSize(page, 'image/svg+xml', svgBytes)).toEqual({ width: 1600, height: 1392 });
});

test('exported poster PNG carries the document pixels at page size', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  // The default is WebP; this test pins the PNG route as a non-regression.
  await selectExportFormat(page, 'PNG');

  const { bytes } = await downloadOn(page, () => exportPanel(page).getByTestId('export-button').click());
  const base64 = bytes.toString('base64');

  const sampled = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/png;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported PNG');
    context.drawImage(image, 0, 0);

    const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data);
    const countDifferentFrom = (x: number, y: number, width: number, height: number, reference: number[]) => {
      const { data } = context.getImageData(x, y, width, height);
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (
          Math.abs(data[index] - reference[0]) > 12 ||
          Math.abs(data[index + 1] - reference[1]) > 12 ||
          Math.abs(data[index + 2] - reference[2]) > 12
        ) {
          count += 1;
        }
      }
      return count;
    };
    const countDark = (x: number, y: number, width: number, height: number) => {
      const { data } = context.getImageData(x, y, width, height);
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] < 80 && data[index + 1] < 80 && data[index + 2] < 80) count += 1;
      }
      return count;
    };

    const background = pixel(4, 4);

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      background,
      accentBar: pixel(300, 743),
      coverImage: pixel(540, 390),
      // The cover image (90,110 900x560) is a flat illustration whose colors
      // all differ from the page background: a missing image reads as 0 here.
      imagePixels: countDifferentFrom(92, 112, 896, 556, background),
      imageArea: 896 * 556,
      // The headline box (90,800 900x150) holds dark glyphs (#111111).
      textPixels: countDark(90, 800, 900, 150),
    };
  }, base64);

  // Expected values come from the starter document, not from the exporter:
  // 1080x1080 page (#f5f0e8), accent bar at (90,730) 420x26 (#1f6feb), cover
  // image at (90,110) 900x560 and headline "Fremit 1.0" at (90,800).
  expect(sampled.width).toBe(1080);
  expect(sampled.height).toBe(1080);
  expect(sampled.background).toEqual([245, 240, 232, 255]);
  expect(sampled.accentBar).toEqual([31, 111, 235, 255]);
  expect(sampled.coverImage).toEqual([30, 41, 59, 255]);
  expect(sampled.imagePixels).toBeGreaterThan(sampled.imageArea * 0.9);
  expect(sampled.textPixels).toBeGreaterThan(500);
});

test('exported PNG matches the live canvas at the same document points', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  // The cover image lands asynchronously; wait for it before sampling.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
        if (!(canvas instanceof HTMLCanvasElement)) return -1;
        const context = canvas.getContext('2d');
        if (!context) return -1;
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let painted = 0;
        for (let index = 3; index < data.length; index += 4) {
          if (data[index] > 0) painted += 1;
        }
        return painted;
      }),
    )
    .toBeGreaterThan(1000);
  // The default is WebP; this test compares PNG against the live canvas.
  await selectExportFormat(page, 'PNG');

  const { bytes } = await downloadOn(page, () => exportPanel(page).getByTestId('export-button').click());
  const base64 = bytes.toString('base64');

  const samples = await page.evaluate(async (payload) => {
    const exported = new Image();
    exported.src = `data:image/png;base64,${payload}`;
    await exported.decode();

    const exportedCanvas = document.createElement('canvas');
    exportedCanvas.width = exported.naturalWidth;
    exportedCanvas.height = exported.naturalHeight;
    const exportedContext = exportedCanvas.getContext('2d');
    if (!exportedContext) throw new Error('no 2d context for the exported PNG');
    exportedContext.drawImage(exported, 0, 0);

    const liveCanvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(liveCanvas instanceof HTMLCanvasElement)) throw new Error('live canvas not found');
    const liveContext = liveCanvas.getContext('2d');
    if (!liveContext) throw new Error('no 2d context for the live canvas');

    // Same math as `fitViewport`: page centered in the stage with FIT_PADDING.
    const pageSize = 1080;
    const fitPadding = 48;
    const zoom = Math.min(
      (liveCanvas.clientWidth - fitPadding) / pageSize,
      (liveCanvas.clientHeight - fitPadding) / pageSize,
    );
    const originX = (liveCanvas.clientWidth - pageSize * zoom) / 2;
    const originY = (liveCanvas.clientHeight - pageSize * zoom) / 2;
    const dpr = liveCanvas.width / liveCanvas.clientWidth;

    const exportedAt = (x: number, y: number) =>
      Array.from(exportedContext.getImageData(x, y, 1, 1).data);
    const liveAt = (x: number, y: number) =>
      Array.from(
        liveContext.getImageData(
          Math.round((originX + x * zoom) * dpr),
          Math.round((originY + y * zoom) * dpr),
          1,
          1,
        ).data,
      );

    return [
      { name: 'page corner', x: 4, y: 4 },
      { name: 'accent bar', x: 300, y: 743 },
      { name: 'cover image', x: 540, y: 390 },
    ].map((point) => ({
      name: point.name,
      exported: exportedAt(point.x, point.y),
      live: liveAt(point.x, point.y),
    }));
  }, base64);

  for (const sample of samples) {
    expect(sample.exported, `${sample.name} at (${sample.exported.join(',')})`).toEqual(sample.live);
  }
});

test('SVG export carries image and text elements and opens in the browser', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await selectExportFormat(page, 'SVG');
  const { bytes, filename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(filename).toBe('poster.svg');
  const svg = bytes.toString('utf8');
  expect(svg.startsWith('<?xml')).toBe(true);
  expect(svg).toContain('<svg');
  expect(svg).toContain('width="1080"');
  expect(svg).toContain('height="1080"');
  expect(svg).toContain('<rect');
  expect(svg).toContain('fill="#f5f0e8"');
  expect(svg).toContain('<image');
  expect(svg).toContain('xlink:href="data:image/png');
  expect(svg).toContain('<text');
  expect(svg).toContain('Fremit 1.0');

  // The browser opens it: decode the SVG as an image and check its size.
  expect(await decodedSize(page, 'image/svg+xml', bytes)).toEqual({ width: 1080, height: 1080 });
});

test('SVG export keeps curved text on its arc', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // Insert the curved preset from the text drawer.
  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Text|Texto/ }).click();
  await page.getByTestId('sidebar-panel-text').getByTestId('text-preset-arc-up').click();
  await expect(page.getByTestId('inspector-name')).toHaveValue('Arc up');

  await selectExportFormat(page, 'SVG');
  const { bytes, filename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(filename).toBe('poster.svg');
  const svg = bytes.toString('utf8');

  // Curved text exports one rotated tspan per glyph along the arc; the
  // straight headline of the starter document has no rotated spans.
  const rotatedSpans = svg.match(/<tspan[^>]*rotate="-?\d+(\.\d+)?"/g) ?? [];
  expect(rotatedSpans.length).toBeGreaterThanOrEqual(8);

  // The invisible guide path travels with the text and stays hidden.
  expect(svg).toContain('<path');
  expect(svg).toContain('visibility: hidden');

  // The browser still opens it.
  expect(await decodedSize(page, 'image/svg+xml', bytes)).toEqual({ width: 1080, height: 1080 });
});

test('SVG export keeps a downward arc on its path', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // Insert the downward curved preset from the text drawer.
  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Text|Texto/ }).click();
  await page.getByTestId('sidebar-panel-text').getByTestId('text-preset-arc-down').click();
  await expect(page.getByTestId('inspector-name')).toHaveValue('Arc down');

  await selectExportFormat(page, 'SVG');
  const { bytes, filename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(filename).toBe('poster.svg');
  const svg = bytes.toString('utf8');

  // The valley mirrors the rainbow: the first glyph leans clockwise (positive
  // rotation) and the last one counterclockwise, and the run is symmetric.
  const rotations = [...svg.matchAll(/<tspan[^>]*rotate="(-?[\d.]+)"/g)].map((match) =>
    Number(match[1]),
  );
  expect(rotations.length).toBeGreaterThanOrEqual(8);
  expect(rotations[0]).toBeGreaterThan(0);
  expect(rotations[rotations.length - 1]).toBeLessThan(0);

  // The invisible guide path travels with the text and stays hidden.
  expect(svg).toContain('<path');
  expect(svg).toContain('visibility: hidden');

  // The browser still opens it (the malformed `rotate="…"style="…"` pair of
  // Fabric 7.2 is repaired before the file is written).
  expect(await decodedSize(page, 'image/svg+xml', bytes)).toEqual({ width: 1080, height: 1080 });
});

test('exported PNG and SVG carry the gradient and image page fills', async ({ page }) => {
  // One opaque black pixel: the image fill covers the whole page.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // Red to blue at 90deg: the page runs left (red) to right (blue).
  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Background|Fundo|Fondo/ }).click();
  const panel = page.getByTestId('sidebar-panel-background');
  await panel.getByTestId('background-kind-gradient').click();
  const from = panel.getByTestId('background-from').locator('input[type="text"]');
  const to = panel.getByTestId('background-to').locator('input[type="text"]');
  await from.fill('#ff0000');
  await from.press('Enter');
  await to.fill('#0000ff');
  await to.press('Enter');
  await panel.getByTestId('background-angle').fill('90');

  // The default is WebP; this test pins the PNG route.
  await selectExportFormat(page, 'PNG');
  const { bytes } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  const corners = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/png;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported PNG');
    context.drawImage(image, 0, 0);

    const at = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data);

    return { left: at(4, 4), right: at(1076, 4) };
  }, bytes.toString('base64'));

  expect(corners.left[0]).toBeGreaterThan(200);
  expect(corners.left[2]).toBeLessThan(60);
  expect(corners.right[2]).toBeGreaterThan(200);
  expect(corners.right[0]).toBeLessThan(60);

  // SVG: the gradient travels as a defs block the page rect references.
  await selectExportFormat(page, 'SVG');
  const { bytes: svgBytes } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );
  const svg = svgBytes.toString('utf8');

  expect(svg).toContain('<linearGradient');
  expect(svg).toContain('stop-color:#ff0000');
  expect(svg).toContain('stop-color:#0000ff');
  expect(svg).toMatch(/fill: url\(#SVGID_\d+\)/);

  // The image fill takes the same route: the exporter reads the stored source
  // (the one the preview frames), not a preview-only copy.
  await panel.getByTestId('background-kind-image').click();
  await panel.getByTestId('background-image-file').setInputFiles({
    name: 'fill.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(panel.getByTestId('background-image-preview')).toBeVisible();

  await selectExportFormat(page, 'PNG');
  const { bytes: imageBytes } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  const imageCorner = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/png;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported PNG');
    context.drawImage(image, 0, 0);

    return Array.from(context.getImageData(4, 4, 1, 1).data);
  }, imageBytes.toString('base64'));

  expect(imageCorner.slice(0, 3)).toEqual([0, 0, 0]);
});

test('the scale and quality controls follow the format and 2x doubles the raster size', async ({
  page,
}) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const scaleSelect = exportPanel(page).getByTestId('export-scale');
  const qualitySlider = exportPanel(page).getByTestId('export-quality');

  await selectExportFormat(page, 'SVG');
  await expect(scaleSelect).toBeDisabled();
  await expect(qualitySlider).toBeDisabled();

  await selectExportFormat(page, 'PNG');
  await expect(scaleSelect).toBeEnabled();
  // PNG ignores the quality slider: it is a lossless format.
  await expect(qualitySlider).toBeDisabled();
  await scaleSelect.click();
  await page.getByRole('option', { name: '2x', exact: true }).click();

  const { bytes } = await downloadOn(page, () => exportPanel(page).getByTestId('export-button').click());

  expect(pngSize(bytes)).toEqual({ width: 2160, height: 2160 });

  // WebP is a raster format too: the same 2x applies and the quality slider
  // is live for it.
  await selectExportFormat(page, 'WEBP');
  await expect(qualitySlider).toBeEnabled();

  const { bytes: webpBytes } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(await decodedSize(page, 'image/webp', webpBytes)).toEqual({ width: 2160, height: 2160 });
});

test('3x export renders at triple size with the scaled content', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // The default is WebP; this test starts on the PNG route.
  await selectExportFormat(page, 'PNG');
  await exportPanel(page).getByTestId('export-scale').click();
  await page.getByRole('option', { name: '3x', exact: true }).click();

  const { bytes } = await downloadOn(page, () => exportPanel(page).getByTestId('export-button').click());

  expect(pngSize(bytes)).toEqual({ width: 3240, height: 3240 });

  const sampled = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/png;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported PNG');
    context.drawImage(image, 0, 0);

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      // The starter accent bar sits at (300,743) in page coordinates; at 3x
      // the same document point lands at (900,2229).
      accentBar: Array.from(context.getImageData(900, 2229, 1, 1).data),
    };
  }, bytes.toString('base64'));

  expect(sampled.width).toBe(3240);
  expect(sampled.height).toBe(3240);
  expect(sampled.accentBar).toEqual([31, 111, 235, 255]);

  // WebP honors the same scale: the triple-size WebP decodes and carries the
  // accent bar at the same document point.
  await selectExportFormat(page, 'WEBP');
  const { bytes: webpBytes } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  const webpSampled = await page.evaluate(async (payload) => {
    const image = new Image();
    image.src = `data:image/webp;base64,${payload}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the exported WebP');
    context.drawImage(image, 0, 0);

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      accentBar: Array.from(context.getImageData(900, 2229, 1, 1).data),
    };
  }, webpBytes.toString('base64'));

  expect(webpSampled.width).toBe(3240);
  expect(webpSampled.height).toBe(3240);
  expect(channelsClose(webpSampled.accentBar, [31, 111, 235, 255], 16)).toBe(true);
});

/**
 * The quality control reaches the encoder: the same page exported at 50% and
 * at 100% must produce different bytes (and both decode at page size). The
 * slider opens at the renderer's documented lossy default (92%).
 */
test('the WebP quality slider changes the encoded bytes', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const qualitySlider = exportPanel(page).getByTestId('export-quality');
  await expect(qualitySlider).toHaveValue('92');

  await qualitySlider.fill('50');
  const { bytes: lowQuality } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  await qualitySlider.fill('100');
  const { bytes: highQuality } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  expect(await decodedSize(page, 'image/webp', lowQuality)).toEqual({ width: 1080, height: 1080 });
  expect(await decodedSize(page, 'image/webp', highQuality)).toEqual({ width: 1080, height: 1080 });
  expect(highQuality.length).toBeGreaterThan(lowQuality.length);
});

/**
 * The WebP fallback path (ADR-007): a browser that cannot encode WebP gets
 * PNG bytes under a `.png` name, and the panel announces the swap with its own
 * notice instead of the failure message — the export succeeded. The probe is
 * faked by answering `toDataURL('image/webp')` with a PNG payload before the
 * app loads, which is what a browser without a WebP encoder answers.
 */
test('a browser without WebP gets the PNG fallback with its own notice', async ({ page }) => {
  await page.addInitScript(() => {
    const originalToDataUrl = HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: unknown) {
      if (type === 'image/webp') {
        return originalToDataUrl.call(this, 'image/png', quality);
      }

      return originalToDataUrl.call(this, type, quality);
    };
  });

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await expect(exportPanel(page).getByTestId('export-format')).toContainText('WEBP');

  const { bytes, filename } = await downloadOn(page, () =>
    exportPanel(page).getByTestId('export-button').click(),
  );

  // The bytes are a real PNG: the swap is visible in the file, not silent.
  expect(filename).toBe('poster.png');
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );

  // The panel announces the delivered PNG; the failure alert stays empty.
  await expect(exportPanel(page).getByTestId('export-notice')).toHaveText(
    'Browser without WebP — PNG delivered.',
  );
  await expect(exportPanel(page).getByRole('alert')).toHaveCount(0);
});
