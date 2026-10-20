import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Screen position of a page point, mirroring `fitViewport` (the page is
 * centered with FIT_PADDING around it).
 */
function pageToScreen(
  host: { x: number; y: number; width: number; height: number },
  pageSize: number,
  x: number,
  y: number,
) {
  const fitPadding = 48;
  const zoom = Math.min((host.width - fitPadding) / pageSize, (host.height - fitPadding) / pageSize);
  const originX = (host.width - pageSize * zoom) / 2;
  const originY = (host.height - pageSize * zoom) / 2;

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

/** Cheap fingerprint of the painted canvas: any document edit changes it. */
async function canvasHash(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return 'none';
    const context = canvas.getContext('2d');
    if (!context) return 'no-context';
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 0;
    for (let index = 0; index < data.length; index += 41) {
      hash = (hash * 31 + data[index]) % 2147483647;
    }
    return String(hash);
  });
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

/**
 * Reads the active page back through the SVG export — the document's own
 * truth, the same bytes a user would download.
 */
async function exportActivePageAsSvg(page: Page): Promise<string> {
  const exportPanel = page.getByTestId('editor-panel').getByTestId('export-panel');

  await exportPanel.getByTestId('export-format').click();
  await page.getByRole('option', { name: 'SVG', exact: true }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportPanel.getByTestId('export-button').click(),
  ]);
  const path = await download.path();

  if (!path) throw new Error('the download has no local path');

  return readFile(path, 'utf8');
}

/**
 * Exports the active page as PNG at 1x and samples document points from the
 * decoded file in the browser. The sample is the raster proof: it reads the
 * bytes a user downloads, not the live canvas.
 */
async function sampleExportedPng(
  page: Page,
  points: { x: number; y: number }[],
): Promise<number[][]> {
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
 * Page-space y of the first dark (ink) row inside a page-space box of the
 * live canvas — scanned from the top or from the bottom — or `null` when the
 * box holds no ink. The box math mirrors `fitViewport`, like the other canvas
 * samplers in this file.
 */
async function edgeInkRowInPageBox(
  page: Page,
  pageSize: number,
  box: { x: number; y: number; width: number; height: number },
  edge: 'top' | 'bottom',
): Promise<number | null> {
  return page.evaluate(({ pageSize, box, edge }) => {
    const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const fitPadding = 48;
    const zoom = Math.min(
      (canvas.clientWidth - fitPadding) / pageSize,
      (canvas.clientHeight - fitPadding) / pageSize,
    );
    const originX = (canvas.clientWidth - pageSize * zoom) / 2;
    const originY = (canvas.clientHeight - pageSize * zoom) / 2;
    const dpr = canvas.width / canvas.clientWidth;
    const startX = Math.round((originX + box.x * zoom) * dpr);
    const startY = Math.round((originY + box.y * zoom) * dpr);
    const width = Math.max(1, Math.round(box.width * zoom * dpr));
    const height = Math.max(1, Math.round(box.height * zoom * dpr));
    const { data } = context.getImageData(startX, startY, width, height);

    for (let step = 0; step < height; step += 1) {
      const row = edge === 'top' ? step : height - 1 - step;

      for (let column = 0; column < width; column += 1) {
        const index = (row * width + column) * 4;
        if (data[index] < 90 && data[index + 1] < 90 && data[index + 2] < 90) {
          return box.y + row / (zoom * dpr);
        }
      }
    }

    return null;
  }, { pageSize, box, edge });
}

/**
 * Ink rows of the middle of an arc's box vs its start, at the given edge of
 * the glyphs. A rainbow (up) peaks at the top; a valley (down) bottoms out at
 * the bottom edge.
 */
async function arcInkRows(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
  edge: 'top' | 'bottom',
): Promise<{ middle: number | null; end: number | null }> {
  const sample = { y: box.y - 90, height: box.height + 180 };
  const middleX = box.x + box.width / 2;

  return {
    middle: await edgeInkRowInPageBox(
      page,
      1080,
      { ...sample, x: middleX - 12, width: 24 },
      edge,
    ),
    end: await edgeInkRowInPageBox(page, 1080, { ...sample, x: box.x + 2, width: 24 }, edge),
  };
}

test('home hero and source controls stay inside the first viewport', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/');

  await expect(page.getByRole('heading', { name: /Paste\. Drop\. Create\.|Cole\. Solte\. Crie\.|Pega\. Suelta\. Crea\./i })).toBeVisible();
  await expect(page.getByTestId('home-source')).toBeVisible();
  await expect(page.getByLabel(/Enter a link|Insira um link|Insertar un enlace/i)).toBeVisible();

  const hero = page.locator('.hero');
  await expect(hero).toBeVisible();
  const heroRect = await hero.boundingBox();
  const viewport = page.viewportSize();
  expect(heroRect!.height).toBeGreaterThanOrEqual(Math.min(viewport!.height * 0.75, 560));
  expect(heroRect!.y + heroRect!.height).toBeLessThanOrEqual(viewport!.height + 8);

  const sourceSection = page.getByTestId('home-source');
  await expect(sourceSection).toBeVisible();
  const sourceRect = await sourceSection.boundingBox();
  expect(sourceRect!.y).toBeGreaterThanOrEqual(heroRect!.y);
  expect(sourceRect!.y + sourceRect!.height).toBeLessThanOrEqual(viewport!.height + 8);
});

test('public mobile menu exposes navigation and open app', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fremit/');

  await expect(page.getByRole('heading', { name: /Paste\. Drop\. Create\.|Cole\. Solte\. Crie\.|Pega\. Suelta\. Crea\./i })).toBeVisible();

  const menu = page.getByRole('button', { name: /Menu|Menú/i });
  await expect(menu.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');

  await expect(page.getByRole('link', { name: /^(Home|Início|Inicio)$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^(About|Sobre)$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open app|Abrir app/i }).first()).toBeVisible();
});

test('about page exposes workflow, features, FAQ, and developer sections', async ({ page }) => {
  await page.goto('/fremit/about');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /How to use Fremit\.|Como usar o Fremit\./i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('How it works').or(page.getByText('Como funciona'))).toBeVisible({ timeout: 15000 });

  await page.goto('/fremit/about#faq');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /Frequently asked questions\.|Perguntas frequentes\./i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Limitations of URL mode').or(page.getByText('Limitações do modo URL'))).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .getByRole('button', { name: 'Why does a link fail sometimes?' })
      .or(page.getByRole('button', { name: 'Por que um link falha às vezes?' })),
  ).toBeVisible();
});

test('mockup editor desktop stays inside the viewport with a dedicated side panel', async ({ page }) => {
  await page.goto('/fremit/mockup');
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('editor-panel')).toBeVisible({ timeout: 15000 });

  const metrics = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 8);
});

test('theme selector switches between dark and light', async ({ page }) => {
  await page.goto('/fremit/editor');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const selector = page.getByRole('button', {
    name: /Color selector|Seletor de cores|Selector de color/i,
  });

  // The chrome icons are vendored Runeicons too (sun/moon), decorative.
  await expect(selector.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(selector.locator('svg')).toHaveAttribute('stroke', 'currentColor');

  await expect.poll(() => page.evaluate(() => document.documentElement.className)).not.toBe('');
  const initialTheme = await page.evaluate(() => document.documentElement.className);
  await selector.click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.className))
    .not.toBe(initialTheme);
  const expectedTheme = initialTheme === 'dark' ? 'light' : 'dark';
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('fremit.theme')))
    .toBe(expectedTheme);

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.className))
    .toBe(expectedTheme);

  await page.getByRole('button', {
    name: /Color selector|Seletor de cores|Selector de color/i,
  }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.className))
    .toBe(initialTheme);
});

test('mockup editor hides internal source strategy labels after loading a url', async ({ page }) => {
  await page.goto('/fremit/mockup');

  const input = page.getByTestId('editor-source').locator('input[type="text"]').first();
  await input.fill('https://mafhper.github.io/mark-lee/pt-BR/faq');
  await page.getByRole('button', { name: /Capture page|Capturar página/i }).click();

  await expect(page.getByTestId('editor-panel').getByText(/mark-lee\/pt-BR\/faq/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/microlink-screenshot|og-image|direct-image/i)).toHaveCount(0);

  // The capture from /mockup keeps its own route: the guard normalizes the
  // deploy base instead of trusting the raw pathname.
  expect(new URL(page.url()).pathname).toBe('/fremit/mockup');
});

test('mockup editor waits for dynamic pages and offers precise framing', async ({ page }) => {
  const captureRequests: URL[] = [];
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.route('https://api.microlink.io/**', async (route) => {
    captureRequests.push(new URL(route.request().url()));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          title: 'Dinopad — Atlas',
          screenshot: { url: 'https://preview.example.test/dinopad.png' },
        },
      }),
    });
  });
  await page.route('https://preview.example.test/dinopad.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );

  await page.goto('/fremit/mockup');

  await page.getByLabel(/Page to capture|Página a capturar|Página para capturar/i).fill(
    'https://mafhper.github.io/dinopad/#/atlas',
  );
  await page.getByLabel(/Wait for the page|Aguardar a página|Esperar la página/i).click();
  await page.getByRole('option', { name: /Complex page|Página complexa/i }).click();
  await page.getByLabel(/Focus section|Seção em foco|Sección en foco/i).fill('main');
  await page.getByRole('button', { name: /Capture page|Capturar página/i }).click();

  await expect(page.getByTestId('preview-image')).toBeVisible();
  await expect(page.getByTestId('framing-controls')).toBeVisible();
  await expect(page.getByTestId('editor-panel').getByText('Dinopad — Atlas')).toBeVisible();

  expect(captureRequests).toHaveLength(1);
  expect(captureRequests[0].searchParams.get('url')).toBe(
    'https://mafhper.github.io/dinopad/#/atlas',
  );
  expect(captureRequests[0].searchParams.get('waitForTimeout')).toBe('5000');
  expect(captureRequests[0].searchParams.get('waitForSelector')).toBe('main');
  expect(captureRequests[0].searchParams.get('element')).toBe('main');

  const preview = page.getByTestId('preview-image');
  const image = preview.locator('img');
  await preview.focus();
  await preview.press('ArrowRight');
  await expect(image).toHaveCSS('object-position', '52% 50%');

  const zoom = page.getByRole('slider', { name: /Zoom/i });
  await zoom.focus();
  await zoom.press('ArrowRight');
  await expect(zoom).toHaveAttribute('aria-valuenow', '101');

  await page.getByRole('button', { name: /Reset framing|Redefinir enquadramento|Restablecer encuadre/i }).click();
  await expect(image).toHaveCSS('object-position', '50% 50%');
  await expect(zoom).toHaveAttribute('aria-valuenow', '100');
});

test('mockup editor mobile uses controls overlay without turning into a long page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fremit/mockup');

  let metrics = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 8);

  await page.getByTestId('mobile-controls-trigger').click();
  await expect(page.getByTestId('editor-panel').last()).toBeVisible();

  metrics = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 8);
});

// The dedicated canvas at /editor renders the Documento JSON: one page with
// three objects (image, shape, text) from `src/lib/starterDocument`.
test('canvas editor renders the starter document and lists its layers', async ({ page }) => {
  await page.goto('/fremit/editor');
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('editor-panel')).toBeVisible();
  await expect(page.getByTestId('canvas-host')).toBeVisible();
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Cover image' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Accent bar' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Headline' })).toHaveCount(1);

  // Pages live in the rail dock now: open the tool to list them.
  await page.getByTestId('sidebar-rail').getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('sidebar-panel-pages')).toBeVisible();
  await expect(page.getByTestId('page-row')).toHaveCount(1);

  // Something was actually painted on the canvas (page background + objects).
  const paintedPixels = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] > 0) painted += 1;
    }
    return painted;
  });
  expect(paintedPixels ?? 0).toBeGreaterThan(1000);

  const metrics = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 8);
});

test('canvas shell exposes the ten-tool rail, the dock and the inspector', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });

  const rail = page.getByTestId('sidebar-rail');
  await expect(rail).toBeVisible();
  await expect(rail.getByRole('button')).toHaveCount(10);

  // Every tool renders its icon; the vendored Runeicons inherit the text
  // color (no color of their own) and stay decorative for the button label.
  await expect(rail.locator('button svg')).toHaveCount(10);
  const layersIcon = rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).locator('svg');
  await expect(layersIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(layersIcon).toHaveAttribute('stroke', 'currentColor');

  // Layers opens by default and marks its tool as pressed.
  await expect(page.getByTestId('sidebar-panel-layers')).toBeVisible();
  await expect(rail.getByRole('button', { name: /Layers|Camadas|Capas/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // The docked section owns the region name; the panel body never repeats it.
  await expect(page.getByRole('region', { name: /Layers|Camadas|Capas/ })).toHaveCount(1);

  // The animate panel is real now: it opens with its two sections and a
  // ready status.
  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  const animate = page.getByTestId('sidebar-panel-animate');
  await expect(animate).toBeVisible();
  await expect(animate).toHaveAttribute('data-status', 'ready');
  await expect(animate.getByTestId('animate-element')).toBeVisible();
  await expect(animate.getByTestId('animate-page')).toBeVisible();
  await expect(page.getByTestId('sidebar-panel-layers')).toHaveCount(0);

  // Clicking the open tool again closes the dock.
  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  await expect(page.getByTestId('sidebar-panel-animate')).toHaveCount(0);

  // The brand panel is real now: it opens with its local palette.
  await rail.getByRole('button', { name: /Brand|Marca/ }).click();
  const brand = page.getByTestId('sidebar-panel-brand');
  await expect(brand).toBeVisible();
  await expect(brand).toHaveAttribute('data-status', 'ready');
  await expect(brand.getByTestId('brand-palette').getByTestId('brand-swatch').first()).toBeVisible();

  // The inspector shows the page state while nothing is selected.
  const inspector = page.getByTestId('inspector');
  await expect(inspector).toBeVisible();
  await expect(inspector.getByRole('combobox', { name: /^Format(o)?$/ })).toBeVisible();
});

test('canvas workspace follows the theme while the page keeps its document color', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fremit.theme', 'light');
  });
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('canvas-host')).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  // The cover image lands asynchronously; wait for the painted canvas.
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

  const readWorkspace = () =>
    page.evaluate(() => {
      const host = document.querySelector('[data-testid="canvas-host"]');
      return host ? getComputedStyle(host).backgroundColor : null;
    });

  // The page corner in the live canvas: the document is the only source.
  const readPageCorner = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return null;
      const context = canvas.getContext('2d');
      if (!context) return null;

      // Same math as `fitViewport`: the page is centered with FIT_PADDING.
      const pageSize = 1080;
      const fitPadding = 48;
      const zoom = Math.min(
        (canvas.clientWidth - fitPadding) / pageSize,
        (canvas.clientHeight - fitPadding) / pageSize,
      );
      const originX = (canvas.clientWidth - pageSize * zoom) / 2;
      const originY = (canvas.clientHeight - pageSize * zoom) / 2;
      const dpr = canvas.width / canvas.clientWidth;

      return Array.from(
        context.getImageData(
          Math.round((originX + 4 * zoom) * dpr),
          Math.round((originY + 4 * zoom) * dpr),
          1,
          1,
        ).data,
      );
    });

  const lightWorkspace = await readWorkspace();
  const lightPage = await readPageCorner();
  // #f5f0e8 from the starter document, not from the workspace token.
  expect(lightPage?.slice(0, 3)).toEqual([245, 240, 232]);

  await page
    .getByRole('button', { name: /Color selector|Seletor de cores|Selector de color/i })
    .click();
  await expect.poll(() => page.evaluate(() => document.documentElement.className)).toBe('dark');

  const darkWorkspace = await readWorkspace();
  const darkPage = await readPageCorner();

  expect(lightWorkspace).not.toBeNull();
  expect(darkWorkspace).not.toBe(lightWorkspace);
  // The theme never touches the document: same page pixel in both themes.
  expect(darkPage).toEqual(lightPage);
});

test('canvas editor mobile opens the rail and the panels in the bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('canvas-host')).toBeVisible({ timeout: 15000 });

  await page.getByTestId('mobile-controls-trigger').click();

  // The sheet is a container of its own: the desktop aside stays in the DOM
  // (hidden by CSS), so the export test ids resolve twice without scoping.
  const sheet = page.getByTestId('mobile-panel-sheet');
  await expect(sheet.getByTestId('export-panel')).toBeVisible();

  // The sheet hides the panel header, so the heading is kept for the outline.
  await expect(sheet.getByRole('heading', { name: /Layers|Camadas|Capas/ })).toBeVisible();

  // The sheet mounts its own copy of the active panel (the desktop dock is
  // hidden by CSS but still in the DOM), so the sheet's section comes last.
  const layersPanel = page.getByTestId('sidebar-panel-layers').last();
  await expect(layersPanel).toBeVisible();
  await expect(layersPanel.getByTestId('layer-row')).toHaveCount(3);

  await page.getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('sidebar-panel-pages').last()).toBeVisible();
  await expect(page.getByTestId('page-row').last()).toHaveCount(1);

  const metrics = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 8);
});

test('canvas editor applies a template and inserts a sticker from the rail panels', async ({
  page,
}) => {
  // Two lazy chunks (templates, icons) plus several panel switches: the
  // test is slow by design and deserves the same headroom as the first test.
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  const openTool = (name: RegExp) => rail.getByRole('button', { name }).click();

  // Templates panel: applying a card lands the seed as a new active page.
  await openTool(/Templates|Plantillas/);
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();
  // The card shows a live thumbnail rendered from its own seed document.
  await expect(templates.getByTestId('template-card-quote-card').locator('svg')).toBeVisible();
  await templates.getByTestId('template-card-quote-card').click();

  await openTool(/Layers|Camadas|Capas/);
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Quote mark' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Quote' })).toHaveCount(2);

  await openTool(/Pages|Páginas/);
  await expect(page.getByTestId('page-row')).toHaveCount(2);
  await expect(page.getByTestId('page-row').last()).toContainText('Quote card');

  // The Ícones shortcut opens on the icons workspace; the sticker pack is the
  // second tab. Switch to it: the sticker inserts as normal objects on the
  // active page.
  await openTool(/Icons|Ícones|Iconos/);
  const content = page.getByTestId('sidebar-panel-icons');
  await expect(content).toBeVisible();
  await expect(content.getByTestId('icon-search')).toBeVisible();

  const workspaceTabs = content.getByTestId('icons-workspace-switch').getByRole('tab');
  await expect(workspaceTabs).toHaveCount(2);
  await expect(workspaceTabs.nth(0)).toHaveText(/Icons|Ícones|Iconos/);
  await expect(workspaceTabs.nth(1)).toHaveText(/Stickers/);

  await content.getByTestId('icons-tab-stickers').click();
  await expect(content.getByTestId('sticker-card-star-rating').locator('svg')).toBeVisible();
  await content.getByTestId('sticker-card-star-rating').click();

  await openTool(/Layers|Camadas|Capas/);
  await expect(page.getByTestId('layer-row')).toHaveCount(5);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Star rating' })).toHaveCount(1);

  // The page still paints: the seed plus the sticker are real content.
  const paintedPixels = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] > 0) painted += 1;
    }
    return painted;
  });
  expect(paintedPixels ?? 0).toBeGreaterThan(1000);
});

test('canvas editor groups the template gallery into collapsible families', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // One collapsible section per family: each header is a button with the
  // chevron and its label. The gallery opens on the first family (own
  // starters) and every other family starts collapsed.
  const sections = [
    'own',
    'readme-hero',
    'animated',
    'readme-demo',
    'sponsors',
    'release',
    'profile',
    'section-title',
    'github',
  ];

  for (const id of sections) {
    const toggle = templates.getByTestId(`template-section-toggle-${id}`);

    await expect(toggle).toBeVisible();
    await expect(toggle.locator('svg')).toBeVisible();
  }

  // The header carries the localized family label of the section.
  await expect(templates.getByTestId('template-section-toggle-own')).toHaveText(
    /Own starters|Designs próprios|Diseños propios/,
  );

  await expect(templates.getByTestId('template-section-toggle-own')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(templates.getByTestId('template-card-social-post')).toBeVisible();
  await expect(templates.getByTestId('template-card-readme-hero-369')).toHaveCount(0);

  // Expanding another family collapses the open one (one at a time).
  const heroToggle = templates.getByTestId('template-section-toggle-readme-hero');

  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(templates.getByTestId('template-card-readme-hero-369')).toBeVisible();
  await expect(templates.getByTestId('template-section-toggle-own')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(templates.getByTestId('template-card-social-post')).toHaveCount(0);

  // Clicking the open header collapses it: the gallery can sit all-closed.
  await heroToggle.click();
  await expect(heroToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(templates.getByTestId('template-card-readme-hero-369')).toHaveCount(0);

  // Keyboard: the header is a native button — Enter expands, Space collapses.
  await heroToggle.focus();
  await page.keyboard.press('Enter');
  await expect(heroToggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(heroToggle).toHaveAttribute('aria-expanded', 'false');

  // Applying a card inside an expanded family lands the seed as a new page.
  await heroToggle.click();
  const card = templates.getByTestId('template-card-readme-hero-840');

  await expect(card.locator('svg')).toBeVisible();
  await card.click();

  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('page-row')).toHaveCount(2);
  await expect(page.getByTestId('page-row').last()).toContainText('README hero 840');
});

test('canvas editor applies every README hero preset as its own page', async ({ page }) => {
  test.slow();

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // The hero family is its own collapsible section: expand it before
  // applying. Each card shows its own seed as a live SVG thumbnail; applying
  // it lands the seed as a new page of the document.
  await openTemplateSection(templates, 'readme-hero');

  const heroes = [
    'readme-hero-369',
    'readme-hero-430',
    'readme-hero-720',
    'readme-hero-840',
    'readme-hero-1200',
    'readme-hero-fluid-100',
  ];

  for (const hero of heroes) {
    const card = templates.getByTestId(`template-card-${hero}`);
    await expect(card.locator('svg')).toBeVisible();
    await card.click();
  }

  // Six seeds applied on top of the starter page, each keeping its own name.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('page-row')).toHaveCount(7);

  const pageNames = (await page.getByTestId('page-row').allTextContents()).join(' | ');
  for (const name of [
    'README hero 369',
    'README hero 430',
    'README hero 720',
    'README hero 840',
    'README hero 1200',
    'README hero 100%',
  ]) {
    expect(pageNames).toContain(name);
  }

  // The fluid seed (applied last) is the active page: its layers are the
  // accent bar, the project name, the tagline and the hero image slot.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Hero image' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Project name' })).toHaveCount(1);

  // Fit the fluid page and sample a point inside its image slot: the
  // placeholder SVG must paint over the page fill — #064e3b is the slot,
  // #022c22 is the page.
  await page.getByRole('button', { name: /Fit page|Ajustar à página|Ajustar a la página/ }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
          if (!(canvas instanceof HTMLCanvasElement)) return null;
          const context = canvas.getContext('2d');
          if (!context) return null;

          const pageWidth = 1600;
          const pageHeight = 1392;
          const fitPadding = 48;
          const zoom = Math.min(
            (canvas.clientWidth - fitPadding) / pageWidth,
            (canvas.clientHeight - fitPadding) / pageHeight,
          );
          const originX = (canvas.clientWidth - pageWidth * zoom) / 2;
          const originY = (canvas.clientHeight - pageHeight * zoom) / 2;
          const dpr = canvas.width / canvas.clientWidth;
          const { data } = context.getImageData(
            Math.round((originX + 120 * zoom) * dpr),
            Math.round((originY + 560 * zoom) * dpr),
            1,
            1,
          );

          return [data[0], data[1], data[2], data[3]];
        }),
      { timeout: 10000 },
    )
    .toEqual([6, 78, 59, 255]);
});

test('canvas editor applies the README demo and sponsors presets as their own pages', async ({
  page,
}) => {
  test.slow();

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // Demo first, sponsors after it: the reading order of the README, each
  // family in its own collapsible section. Each card shows its own seed as a
  // live SVG thumbnail.
  await openTemplateSection(templates, 'readme-demo');
  const demoCard = templates.getByTestId('template-card-readme-demo-600');
  await expect(demoCard.locator('svg')).toBeVisible();
  await demoCard.click();

  await openTemplateSection(templates, 'sponsors');
  const sponsorsCard = templates.getByTestId('template-card-sponsors-table');
  await expect(sponsorsCard.locator('svg')).toBeVisible();
  await sponsorsCard.click();

  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('page-row')).toHaveCount(3);

  const pageNames = (await page.getByTestId('page-row').allTextContents()).join(' | ');
  expect(pageNames).toContain('README demo 600');
  expect(pageNames).toContain('Sponsors table');

  // The sponsors page (applied last) is the active one: its layers are the
  // heading, the three logo rows and the banner with its link.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(12);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Sponsor logo' })).toHaveCount(3);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Sponsor banner' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Demo video' })).toHaveCount(0);

  // Fit the page and sample a point inside the banner slot: the placeholder
  // SVG must paint over the page fill — #f1f5f9 is the banner, #ffffff the
  // page. The sample sits left of the banner's centered label.
  await page.getByRole('button', { name: /Fit page|Ajustar à página|Ajustar a la página/ }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
          if (!(canvas instanceof HTMLCanvasElement)) return null;
          const context = canvas.getContext('2d');
          if (!context) return null;

          const pageWidth = 600;
          const pageHeight = 438;
          const fitPadding = 48;
          const zoom = Math.min(
            (canvas.clientWidth - fitPadding) / pageWidth,
            (canvas.clientHeight - fitPadding) / pageHeight,
          );
          const originX = (canvas.clientWidth - pageWidth * zoom) / 2;
          const originY = (canvas.clientHeight - pageHeight * zoom) / 2;
          const dpr = canvas.width / canvas.clientWidth;
          const { data } = context.getImageData(
            Math.round((originX + 120 * zoom) * dpr),
            Math.round((originY + 320 * zoom) * dpr),
            1,
            1,
          );

          return [data[0], data[1], data[2], data[3]];
        }),
      { timeout: 10000 },
    )
    .toEqual([241, 245, 249, 255]);
});

test('canvas editor applies the release, profile and illustrated title presets as their own pages', async ({
  page,
}) => {
  test.slow();

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // Release notes, then the profile family, then the illustrated title — the
  // reading order of the batch, each family in its own collapsible section.
  // Each card shows its own seed as a live SVG thumbnail.
  await openTemplateSection(templates, 'release');
  const releaseCard = templates.getByTestId('template-card-release-grade');
  await expect(releaseCard.locator('svg')).toBeVisible();
  // The release card carries no partial badge (checked while it is visible).
  await expect(templates.getByTestId('template-partial-release-grade')).toHaveCount(0);
  await releaseCard.click();

  await openTemplateSection(templates, 'profile');
  for (const id of ['profile-hero-640', 'profile-hero-400', 'profile-hero-fluid-100']) {
    const card = templates.getByTestId(`template-card-${id}`);
    await expect(card.locator('svg')).toBeVisible();
    await card.click();
  }
  // Nor does the profile card (checked while the family is open).
  await expect(templates.getByTestId('template-partial-profile-hero-640')).toHaveCount(0);

  await openTemplateSection(templates, 'section-title');
  const titleCard = templates.getByTestId('template-card-section-title-illustrated');
  await expect(titleCard.locator('svg')).toBeVisible();
  await titleCard.click();

  // The partial marker shows on the illustrated title card, and only there.
  await expect(templates.getByTestId('template-partial-section-title-illustrated')).toHaveText(
    /Partial|Parcial/,
  );

  // Five seeds applied on top of the starter page, each keeping its own name.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('page-row')).toHaveCount(6);

  const pageNames = (await page.getByTestId('page-row').allTextContents()).join(' | ');
  for (const name of [
    'Release notes',
    'Profile hero 640',
    'Profile hero 400',
    'Profile hero 100%',
    'Section title',
  ]) {
    expect(pageNames).toContain(name);
  }

  // The release page is text-only: its fifteen layers are the title, the
  // changelog, the attachments heading and the three name/size/SHA rows —
  // never an image (no mocked screenshot on the latest).
  await page.getByTestId('page-select').nth(1).click();
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(15);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Attachment name' })).toHaveCount(3);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Attachment SHA' })).toHaveCount(3);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Screenshot' })).toHaveCount(0);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Hero image' })).toHaveCount(0);

  // Back to the illustrated title (applied last): its three layers are the
  // logo, the heading and the screenshot. Switching panels closed the Pages
  // dock, so it is reopened before the page switch.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await page.getByTestId('page-select').nth(5).click();
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Section logo' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Screenshot' })).toHaveCount(1);

  // Fit the page and sample a point inside the screenshot slot: the
  // placeholder SVG must paint over the page fill — #1e293b is the slot,
  // #ffffff is the page. The sample sits left of the centered label.
  await page.getByRole('button', { name: /Fit page|Ajustar à página|Ajustar a la página/ }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
          if (!(canvas instanceof HTMLCanvasElement)) return null;
          const context = canvas.getContext('2d');
          if (!context) return null;

          const pageWidth = 600;
          const pageHeight = 654;
          const fitPadding = 48;
          const zoom = Math.min(
            (canvas.clientWidth - fitPadding) / pageWidth,
            (canvas.clientHeight - fitPadding) / pageHeight,
          );
          const originX = (canvas.clientWidth - pageWidth * zoom) / 2;
          const originY = (canvas.clientHeight - pageHeight * zoom) / 2;
          const dpr = canvas.width / canvas.clientWidth;
          const { data } = context.getImageData(
            Math.round((originX + 60 * zoom) * dpr),
            Math.round((originY + 300 * zoom) * dpr),
            1,
            1,
          );

          return [data[0], data[1], data[2], data[3]];
        }),
      { timeout: 10000 },
    )
    .toEqual([30, 41, 59, 255]);
});

test('canvas editor applies the animated README presets as their own pages', async ({ page }) => {
  test.slow();

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // The animated families (P-webp2/P-webp3): the hero band 760/800/100% and
  // the demo percentages 23/80, each declaring its animated slot and the
  // named static fallback. All five live in the animated family section.
  // Each card shows its own seed as a live SVG thumbnail.
  await openTemplateSection(templates, 'animated');

  const seeds = [
    'readme-hero-anim-760',
    'readme-hero-anim-800',
    'readme-hero-anim-fluid-100',
    'readme-demo-anim-23',
    'readme-demo-anim-80',
  ];

  for (const id of seeds) {
    const card = templates.getByTestId(`template-card-${id}`);
    await expect(card.locator('svg')).toBeVisible();
    await card.click();
  }

  // Five seeds applied on top of the starter page, each keeping its own name.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('page-row')).toHaveCount(6);

  const pageNames = (await page.getByTestId('page-row').allTextContents()).join(' | ');
  for (const name of [
    'README hero anim 760',
    'README hero anim 800',
    'README hero anim 100%',
    'README demo anim 23%',
    'README demo anim 80%',
  ]) {
    expect(pageNames).toContain(name);
  }

  // The 760 hero (applied first): its five layers are the accent bar, the
  // project name, the tagline, the animated slot and the named static
  // fallback — the declared pair of P-webp2.
  await page.getByTestId('page-select').nth(1).click();
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(5);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Hero anim' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Static fallback' })).toHaveCount(1);

  // Fit the 760x660 page and sample a point inside its slot: the placeholder
  // SVG must paint over the page fill — #27272a is the slot, #18181b the
  // page. The sample sits left of the slot's centered label.
  await page.getByRole('button', { name: /Fit page|Ajustar à página|Ajustar a la página/ }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
          if (!(canvas instanceof HTMLCanvasElement)) return null;
          const context = canvas.getContext('2d');
          if (!context) return null;

          const pageWidth = 760;
          const pageHeight = 660;
          const fitPadding = 48;
          const zoom = Math.min(
            (canvas.clientWidth - fitPadding) / pageWidth,
            (canvas.clientHeight - fitPadding) / pageHeight,
          );
          const originX = (canvas.clientWidth - pageWidth * zoom) / 2;
          const originY = (canvas.clientHeight - pageHeight * zoom) / 2;
          const dpr = canvas.width / canvas.clientWidth;
          const { data } = context.getImageData(
            Math.round((originX + 100 * zoom) * dpr),
            Math.round((originY + 300 * zoom) * dpr),
            1,
            1,
          );

          return [data[0], data[1], data[2], data[3]];
        }),
      { timeout: 10000 },
    )
    .toEqual([39, 39, 42, 255]);

  // The 80% demo (applied last): the static hero band, the heading, the
  // animated slot at its declared percentage width, the alt caption and the
  // named static fallback.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await page.getByTestId('page-select').nth(5).click();
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(5);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Demo anim' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Hero image' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Static fallback' })).toHaveCount(1);

  // Fit the 600x766 page and sample a point inside the 480px-wide slot (x
  // 60..540, y 394..664): the slot fill paints over the white page.
  await page.getByRole('button', { name: /Fit page|Ajustar à página|Ajustar a la página/ }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
          if (!(canvas instanceof HTMLCanvasElement)) return null;
          const context = canvas.getContext('2d');
          if (!context) return null;

          const pageWidth = 600;
          const pageHeight = 766;
          const fitPadding = 48;
          const zoom = Math.min(
            (canvas.clientWidth - fitPadding) / pageWidth,
            (canvas.clientHeight - fitPadding) / pageHeight,
          );
          const originX = (canvas.clientWidth - pageWidth * zoom) / 2;
          const originY = (canvas.clientHeight - pageHeight * zoom) / 2;
          const dpr = canvas.width / canvas.clientWidth;
          const { data } = context.getImageData(
            Math.round((originX + 100 * zoom) * dpr),
            Math.round((originY + 450 * zoom) * dpr),
            1,
            1,
          );

          return [data[0], data[1], data[2], data[3]];
        }),
      { timeout: 10000 },
    )
    .toEqual([30, 41, 59, 255]);
});

test('canvas editor inserts a duotone runeicon with custom colors', async ({ page }) => {
  test.slow();

  // Every artwork request is collected: the icons come from the app itself.
  const svgRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/runeicons/')) svgRequests.push(request.url());
  });

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Icons|Ícones|Iconos/ }).click();
  const panel = page.getByTestId('sidebar-panel-icons');
  await expect(panel).toBeVisible();

  // Workspace switch at the top of the panel: the shortcut opens straight on
  // the icons workspace (first tab), not on the sticker pack (second).
  await expect(panel.getByTestId('icons-tab-icons')).toHaveAttribute('aria-selected', 'true');
  await expect(panel.getByTestId('icons-tab-stickers')).toHaveAttribute('aria-selected', 'false');
  await expect(panel.getByTestId('icon-search')).toBeVisible();

  // Search over the local manifest; the style filter narrows to duotone.
  await panel.getByTestId('icon-search').fill('arrow down left');
  await panel.getByTestId('icon-style').selectOption('duotone');
  const card = panel.getByTestId('icon-card-arrows-arrow-down-left');
  await expect(card.locator('svg')).toBeVisible();
  await card.click();

  // Properties: the two duotone slots get custom colors before insertion.
  const inspector = panel.getByTestId('icon-properties');
  await expect(inspector).toBeVisible();
  await expect(inspector.getByTestId('icon-selected-name')).toHaveText('Arrow Down Left');
  await inspector.getByTestId('icon-color-primary-hex').fill('#ff0000');
  await inspector.getByTestId('icon-color-secondary-hex').fill('#0000ff');
  await inspector.getByTestId('icon-insert').click();

  // The icon lands as a normal image layer of the document.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Arrow Down Left' })).toHaveCount(1);

  // Both chosen slots paint on the canvas.
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let red = 0;
    let blue = 0;
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (data[index + 3] < 200) continue;
      if (r > 180 && g < 90 && b < 90) red += 1;
      if (b > 180 && r < 90 && g < 90) blue += 1;
    }
    return { red, blue };
  });
  expect(painted?.red ?? 0).toBeGreaterThan(20);
  expect(painted?.blue ?? 0).toBeGreaterThan(20);

  // Every artwork fetch is same-origin (static files of the app, no CDN).
  expect(svgRequests.length).toBeGreaterThan(0);
  for (const url of svgRequests) {
    expect(new URL(url).origin).toBe('http://127.0.0.1:4275');
  }
});

test('canvas editor fills the GitHub template from the public API', async ({ page }) => {
  const requests: string[] = [];

  // The real `GET /repos/mafhper/aurawall` payload (fetched 2026-10-18): the
  // non-zero star count catches a mapping that swaps the real value for the
  // placeholder.
  await page.route('https://api.github.com/repos/mafhper/aurawall', (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        full_name: 'mafhper/aurawall',
        description: 'Procedural Vector Wallpaper Generator',
        language: 'TypeScript',
        stargazers_count: 2,
        forks_count: 0,
      }),
    });
  });

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // The repo fill controls live in the GitHub family, collapsed by default.
  await openTemplateSection(templates, 'github');

  await templates.getByTestId('template-github-repo').fill('mafhper/aurawall');
  await templates.getByTestId('template-github-fill').click();

  await expect(templates.getByTestId('template-github-status')).toHaveText(
    /Repository loaded|Repositório carregado|Repositorio cargado/i,
  );
  expect(requests).toHaveLength(1);

  // The gallery card reflects the loaded repo — the template updates with the
  // provided data, thumbnail and label alike.
  const card = templates.getByTestId('template-card-github-project');
  await expect(card).toContainText('mafhper/aurawall');
  await expect(card).toContainText('Procedural Vector Wallpaper Generator');
  await expect(card).toContainText('TypeScript');
  await expect(card).toContainText('★ 2 · 0 forks');

  // The seed lands as the active page with its seven slot objects.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(7);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Repository name' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Language dot' })).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Repository stats' })).toHaveCount(1);

  // The applied page carries the loaded values (read back through the export).
  const appliedSvg = await exportActivePageAsSvg(page);
  expect(appliedSvg).toContain('mafhper/aurawall');
  expect(appliedSvg).toContain('Procedural Vector Wallpaper Generator');
  expect(appliedSvg).toContain('★ 2 · 0 forks');

  // The loaded repo persists across panels: applying the card again keeps the
  // provided data instead of falling back to the placeholders.
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  // The panel remounts on the switch, so the GitHub family opens collapsed.
  await openTemplateSection(templates, 'github');
  await expect(card).toContainText('★ 2 · 0 forks');
  await card.click();
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(7);
  const reappliedSvg = await exportActivePageAsSvg(page);
  expect(reappliedSvg).toContain('mafhper/aurawall');
  expect(reappliedSvg).toContain('★ 2 · 0 forks');

  // Clearing the repo input returns the card to the placeholders.
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  await openTemplateSection(templates, 'github');
  await templates.getByTestId('template-github-repo').fill('');
  await expect(card).toContainText('owner/repo');
  await expect(card).toContainText('★ 128 · 12 forks');
});

test('canvas editor keeps the GitHub template usable offline', async ({ page }) => {
  await page.route('https://api.github.com/**', (route) => route.abort());

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Templates|Plantillas/ }).click();
  const templates = page.getByTestId('sidebar-panel-templates');
  await expect(templates).toBeVisible();

  // The repo fill controls live in the GitHub family, collapsed by default.
  await openTemplateSection(templates, 'github');

  await templates.getByTestId('template-github-repo').fill('mafhper/fremit');
  await templates.getByTestId('template-github-fill').click();

  await expect(templates.getByTestId('template-github-status')).toHaveText(
    /unreachable|inacessível|no disponible/i,
  );

  // The card keeps the placeholders and the seed still lands with them.
  const card = templates.getByTestId('template-card-github-project');
  await expect(card).toContainText('owner/repo');
  await expect(card).toContainText('★ 128 · 12 forks');

  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(7);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Repository name' })).toHaveCount(1);
});

test('canvas editor selects, nudges, locks and reorders layers from the panel', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const shapeRow = page.getByTestId('layer-row').filter({ hasText: 'Accent bar' });
  await shapeRow.getByTestId('layer-select').click();
  await expect(shapeRow.getByTestId('layer-select')).toHaveAttribute('aria-pressed', 'true');

  const x = page.getByTestId('selection-x');
  const y = page.getByTestId('selection-y');
  const startX = Number(await x.textContent());
  const startY = Number(await y.textContent());

  await page.keyboard.press('ArrowRight');
  await expect(x).toHaveText(String(startX + 1));
  await page.keyboard.press('Shift+ArrowDown');
  await expect(y).toHaveText(String(startY + 10));

  // A locked object does not move from the canvas keyboard.
  await shapeRow.getByTestId('layer-lock').click();
  await expect(shapeRow.getByTestId('layer-lock')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(x).toHaveText(String(startX + 1));

  await shapeRow.getByTestId('layer-visibility').click();
  await expect(shapeRow.getByTestId('layer-visibility')).toHaveAttribute('aria-pressed', 'true');
  await shapeRow.getByTestId('layer-visibility').click();

  await page.getByTestId('layer-up').click();
  await expect(page.getByTestId('layer-row').first()).toContainText('Accent bar');
});

test('canvas editor creates and duplicates objects from the layers panel header', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  const layers = page.getByTestId('sidebar-panel-layers');

  // The sidebar path already lands a row in the list — the store wiring is
  // there. The rectangle preset is the reference geometry for the panel's own
  // add: centered at 40% of the 1080×1080 page, a 432 square at (324, 324).
  await rail.getByRole('button', { name: /Shapes|Formas/ }).click();
  const shapes = page.getByTestId('sidebar-panel-shapes');
  await expect(shapes).toBeVisible();
  await shapes.getByTestId('shape-preset-rect').click();

  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(layers).toBeVisible();
  await expect(layers.getByTestId('layer-row')).toHaveCount(4);

  const presetBox = await readSelectionBox(page);
  expect(presetBox).toEqual({ x: 324, y: 324, width: 432, height: 432 });

  // Remove it: with nothing selected, duplicate waits for a target and add is
  // always ready.
  await layers.getByTestId('layer-delete').click();
  await expect(layers.getByTestId('layer-row')).toHaveCount(3);
  await expect(layers.getByTestId('layer-duplicate')).toBeDisabled();
  await expect(layers.getByTestId('layer-add')).toBeEnabled();

  // The header controls render their vendored icons too.
  await expect(layers.getByTestId('layer-add').locator('svg')).toHaveCount(1);

  // The panel's own add inserts the same default object — no drawer involved.
  await layers.getByTestId('layer-add').click();
  await expect(layers.getByTestId('layer-row')).toHaveCount(4);
  await expect(layers.getByTestId('layer-row').first()).toContainText('Rectangle');
  expect(await readSelectionBox(page)).toEqual(presetBox);

  // Duplicate clones the selection right above itself and follows the copy.
  await layers.getByTestId('layer-duplicate').click();
  await expect(layers.getByTestId('layer-row')).toHaveCount(5);
  await expect(layers.getByTestId('layer-row').filter({ hasText: 'Rectangle copy' })).toHaveCount(1);
  await expect(layers.getByTestId('layer-row').first()).toContainText('Rectangle copy');
  await expect(
    layers.getByTestId('layer-row').first().getByTestId('layer-select'),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await readSelectionBox(page)).toEqual(presetBox);
});

test('canvas editor keeps a locked object in place when dragged', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const shapeRow = page.getByTestId('layer-row').filter({ hasText: 'Accent bar' });
  await shapeRow.getByTestId('layer-lock').click();
  await expect(shapeRow.getByTestId('layer-lock')).toHaveAttribute('aria-pressed', 'true');
  await shapeRow.getByTestId('layer-select').click();

  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const pageSize = 1080;
  const fitPadding = 48;
  const zoom = Math.min((host.width - fitPadding) / pageSize, (host.height - fitPadding) / pageSize);
  const originX = (host.width - pageSize * zoom) / 2;
  const originY = (host.height - pageSize * zoom) / 2;
  const toScreen = (x: number, y: number) => ({
    x: host.x + originX + x * zoom,
    y: host.y + originY + y * zoom,
  });

  const x = page.getByTestId('selection-x');
  const y = page.getByTestId('selection-y');
  const startX = await x.textContent();
  const startY = await y.textContent();

  // Drag the locked bar by 200 page pixels; the stored geometry must not move.
  const start = toScreen(150, 743);
  const end = toScreen(150 - 200, 743);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();

  await expect(x).toHaveText(startX ?? '');
  await expect(y).toHaveText(startY ?? '');
});

test('canvas editor zooms with the wheel over the stage', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('canvas-host')).toBeVisible();

  const zoomLabel = page.getByTestId('zoom-value');
  const initial = Number((await zoomLabel.textContent())?.replace('%', ''));
  expect(initial).toBeGreaterThan(0);

  await page.getByTestId('canvas-host').hover();
  await page.mouse.wheel(0, -300);

  await expect
    .poll(async () => Number((await zoomLabel.textContent())?.replace('%', '')))
    .toBeGreaterThan(initial);
});

test('canvas editor drags an object and snaps it to the page edge', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const shapeRow = page.getByTestId('layer-row').filter({ hasText: 'Accent bar' });
  await shapeRow.getByTestId('layer-select').click();

  const host = await page.getByTestId('canvas-host').boundingBox();
  expect(host).not.toBeNull();

  // Mirror of `fitViewport`: the page is centered with FIT_PADDING around it.
  const pageSize = 1080;
  const fitPadding = 48;
  const zoom = Math.min(
    (host!.width - fitPadding) / pageSize,
    (host!.height - fitPadding) / pageSize,
  );
  const originX = (host!.width - pageSize * zoom) / 2;
  const originY = (host!.height - pageSize * zoom) / 2;
  const toScreen = (x: number, y: number) => ({
    x: host!.x + originX + x * zoom,
    y: host!.y + originY + y * zoom,
  });

  // The accent bar is at (90, 730) 420x26 in page pixels. Grab it away from
  // the center: at low zoom its resize controls cover the middle of the bar.
  const start = toScreen(150, 743);
  const end = toScreen(150 - 85, 743);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });

  // A guide appears while the edge is inside the snap tolerance.
  await expect(page.getByTestId('snap-guide').first()).toBeVisible();

  await page.mouse.up();

  // The left edge lands exactly on the page edge; the vertical position holds.
  await expect(page.getByTestId('selection-x')).toHaveText('0');
  await expect(page.getByTestId('selection-y')).toHaveText('730');
});

test('canvas editor resizes an object from its corner handle', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const imageRow = page.getByTestId('layer-row').filter({ hasText: 'Cover image' });
  await imageRow.getByTestId('layer-select').click();

  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const pageSize = 1080;
  const fitPadding = 48;
  const zoom = Math.min((host.width - fitPadding) / pageSize, (host.height - fitPadding) / pageSize);
  const originX = (host.width - pageSize * zoom) / 2;
  const originY = (host.height - pageSize * zoom) / 2;
  const toScreen = (x: number, y: number) => ({
    x: host.x + originX + x * zoom,
    y: host.y + originY + y * zoom,
  });

  const width = page.getByTestId('selection-width');
  const height = page.getByTestId('selection-height');
  const startWidth = Number(await width.textContent());
  const startHeight = Number(await height.textContent());

  // Bottom-right corner of the cover image (90,110 900x560 in page pixels).
  const corner = toScreen(990, 670);
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  await page.mouse.move(corner.x + 60, corner.y + 40, { steps: 10 });
  await page.mouse.up();

  await expect.poll(async () => Number(await width.textContent())).toBeGreaterThan(startWidth);
  await expect.poll(async () => Number(await height.textContent())).toBeGreaterThan(startHeight);
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
});

test('canvas editor inserts text presets, shapes and images from the rail panels', async ({
  page,
}) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  const openTool = (name: RegExp) => rail.getByRole('button', { name }).click();
  const layers = () => page.getByTestId('layer-row');

  // Text drawer: straight presets, a pairing (heading + body) and a list. The
  // dock shows one panel at a time, so the layers panel comes back for counts.
  await openTool(/Text|Texto/);
  const textPanel = page.getByTestId('sidebar-panel-text');
  await expect(textPanel).toBeVisible();

  await textPanel.getByTestId('text-preset-subheading').click();
  await openTool(/Layers|Camadas|Capas/);
  await expect(layers()).toHaveCount(4);
  await expect(layers().filter({ hasText: 'Subheading' })).toHaveCount(1);

  await openTool(/Text|Texto/);
  await textPanel.getByTestId('text-preset-classic').click();
  // The pairing lands as one insertion and the selection follows the last
  // object (the body), which the inspector names.
  await expect(page.getByTestId('inspector-name')).toHaveValue('Classic body');
  await openTool(/Layers|Camadas|Capas/);
  await expect(layers()).toHaveCount(6);
  await expect(layers().filter({ hasText: 'Classic heading' })).toHaveCount(1);
  await expect(layers().filter({ hasText: 'Classic body' })).toHaveCount(1);

  await openTool(/Text|Texto/);
  await textPanel.getByTestId('text-preset-numbered-list').click();
  await openTool(/Layers|Camadas|Capas/);
  await expect(layers()).toHaveCount(7);
  await expect(layers().filter({ hasText: 'Numbered list' })).toHaveCount(1);

  // Shapes drawer.
  await openTool(/Shapes|Formas/);
  const shapesPanel = page.getByTestId('sidebar-panel-shapes');
  await expect(shapesPanel).toBeVisible();
  await shapesPanel.getByTestId('shape-preset-ellipse').click();
  await openTool(/Layers|Camadas|Capas/);
  await expect(layers()).toHaveCount(8);
  await expect(layers().filter({ hasText: 'Ellipse' })).toHaveCount(1);

  // Images drawer: the upload path.
  await openTool(/Images|Imagens|Imágenes/);
  const imagesPanel = page.getByTestId('sidebar-panel-images');
  await expect(imagesPanel).toBeVisible();
  await imagesPanel.getByTestId('images-file').setInputFiles({
    name: 'sticker.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await openTool(/Layers|Camadas|Capas/);
  await expect(layers()).toHaveCount(9);
  await expect(layers().filter({ hasText: 'sticker.png' })).toHaveCount(1);

  // WebP upload: the fixture is encoded by this same browser, uploaded through
  // the file input (data URL path) and decoded back onto the canvas — import
  // accepts WebP and the browser decodes it (ADR-007).
  const webpBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context for the WebP fixture');
    context.fillStyle = '#e11d48';
    context.fillRect(0, 0, 32, 32);

    return canvas.toDataURL('image/webp').split(',')[1];
  });

  await openTool(/Images|Imagens|Imágenes/);
  await imagesPanel.getByTestId('images-file').setInputFiles({
    name: 'sticker.webp',
    mimeType: 'image/webp',
    buffer: Buffer.from(webpBase64, 'base64'),
  });
  await openTool(/Layers|Camadas|Capas/);
  await expect(layers()).toHaveCount(10);
  await expect(layers().filter({ hasText: 'sticker.webp' })).toHaveCount(1);

  // Decode proof: the flat red square paints at the center of its box (the
  // inserted image is 32x32, contain-fitted and centered in the layer box).
  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const center = pageToScreen(host, 1080, 540, 453.6);
  await expect
    .poll(async () => {
      const pixel = await readCanvasPixel(page, center);
      return pixel ? pixel[0] > 180 && pixel[1] < 90 : false;
    })
    .toBe(true);
});

test('canvas editor inserts every shape kind, renders it and exports it', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Shapes|Formas/ }).click();
  const shapes = page.getByTestId('sidebar-panel-shapes');
  await expect(shapes).toBeVisible();

  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const names = {
    line: 'Line',
    rect: 'Rectangle',
    ellipse: 'Ellipse',
    triangle: 'Triangle',
    star: 'Star',
    polygon: 'Polygon',
  } as const;
  const isBlue = (pixel: number[] | undefined) =>
    !!pixel && pixel[0] < 90 && pixel[2] > 150;

  // The line first, alone on the page: a pixel sample proves its stroke
  // without any filled shape underneath. The segment rides the box diagonal
  // at the page center, so the sample sits on the stroke; the control sample
  // sits below the starter cover image, where only the page fill paints.
  await shapes.getByTestId('shape-preset-line').click();
  await expect(page.getByTestId('inspector-name')).toHaveValue('Line');

  const onLine = pageToScreen(host, 1080, 540, 542);
  const offLine = pageToScreen(host, 1080, 540, 750);
  await expect.poll(async () => isBlue(await readCanvasPixel(page, onLine))).toBe(true);
  const background = await readCanvasPixel(page, offLine);
  expect(background?.[0]).toBeGreaterThan(200);

  // The raster export paints the same stroke: the new geometry travels
  // through the real render path, not only through the live canvas.
  const [linePixel, pagePixel] = await sampleExportedPng(page, [
    { x: 540, y: 542 },
    { x: 540, y: 750 },
  ]);
  expect(isBlue(linePixel)).toBe(true);
  expect(pagePixel[0]).toBeGreaterThan(200);

  // The filled kinds share the same centered box, so each new one lands on
  // top of the previous and the center sample shows the kind just inserted.
  const center = pageToScreen(host, 1080, 540, 540);

  for (const kind of ['rect', 'ellipse', 'triangle', 'star', 'polygon'] as const) {
    await shapes.getByTestId(`shape-preset-${kind}`).click();
    await expect(page.getByTestId('inspector-name')).toHaveValue(names[kind]);
    await expect.poll(async () => isBlue(await readCanvasPixel(page, center))).toBe(true);
  }

  // Every kind landed as a layer.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(9);

  // The vector export carries each kind as its own element: rect, ellipse,
  // polyline (the line) and one polygon per triangle, star and polygon.
  const svg = await exportActivePageAsSvg(page);
  expect(svg).toContain('<rect');
  expect(svg).toContain('<ellipse');
  expect(svg).toContain('<polyline');
  expect((svg.match(/<polygon/g) ?? []).length).toBeGreaterThanOrEqual(3);
  expect(svg).toContain('vector-effect="non-scaling-stroke"');

  // The inspector edits the new parameters live: star tips and inner radius,
  // and the line's length over its box diagonal. The dock went back to the
  // layers panel for the count, so the shapes drawer comes back first.
  await rail.getByRole('button', { name: /Shapes|Formas/ }).click();
  await expect(shapes).toBeVisible();

  const inspector = page.getByTestId('inspector');

  await shapes.getByTestId('shape-preset-star').click();
  await expect(inspector.getByTestId('inspector-sides')).toHaveValue('5');
  let hash = await canvasHash(page);
  await inspector.getByTestId('inspector-sides').fill('7');
  await expect.poll(() => canvasHash(page)).not.toBe(hash);
  await expect(inspector.getByTestId('inspector-sides')).toHaveValue('7');

  hash = await canvasHash(page);
  await inspector.getByTestId('inspector-inner-radius').fill('70');
  await expect.poll(() => canvasHash(page)).not.toBe(hash);
  await expect(inspector.getByTestId('inspector-inner-radius')).toHaveValue('70');

  await shapes.getByTestId('shape-preset-line').click();
  await expect(inspector.getByTestId('inspector-length')).toHaveValue('432');
  hash = await canvasHash(page);
  await inspector.getByTestId('inspector-length').fill('600');
  await expect.poll(() => canvasHash(page)).not.toBe(hash);
  await expect(inspector.getByTestId('inspector-width')).toHaveValue('600');
});

test('canvas editor inspector edits the selected shape live', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Accent bar' })
    .getByTestId('layer-select')
    .click();
  const inspector = page.getByTestId('inspector');

  // Geometry: the width control writes the document; the layers readout follows.
  await inspector.getByTestId('inspector-width').fill('200');
  await expect(page.getByTestId('selection-width')).toHaveText('200');

  // Fill: the canvas repaints the bar with the new color. The sample sits
  // inside the bar but away from the Fabric controls (corners and mid-edges),
  // which paint over the content while the object is selected.
  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const center = pageToScreen(host, 1080, 150, 743);
  const before = await readCanvasPixel(page, center);
  expect(before?.slice(0, 3)).toEqual([31, 111, 235]);

  await inspector.getByTestId('inspector-fill').locator('input[type="text"]').fill('#ff0000');
  // The hex field writes once, on blur/Enter: the Enter is the commit.
  await inspector.getByTestId('inspector-fill').locator('input[type="text"]').press('Enter');
  await expect.poll(async () => (await readCanvasPixel(page, center))?.[0]).toBeGreaterThan(200);
  const painted = await readCanvasPixel(page, center);
  expect(painted?.[1]).toBeLessThan(80);

  // Opacity blends the bar with the page background.
  await inspector.getByTestId('inspector-opacity').fill('50');
  await expect.poll(async () => (await readCanvasPixel(page, center))?.[1]).toBeGreaterThan(80);

  // Rotation is a live control too: the painted canvas changes.
  const hash = await canvasHash(page);
  await inspector.getByTestId('inspector-rotation').fill('8');
  await expect.poll(() => canvasHash(page)).not.toBe(hash);
});

test('canvas editor inspector locks a selected object and Escape clears the selection', async ({
  page,
}) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Headline' })
    .getByTestId('layer-select')
    .click();
  const inspector = page.getByTestId('inspector');
  await expect(inspector.getByTestId('inspector-font-family')).toBeVisible();

  await inspector.getByTestId('inspector-lock').click();
  await expect(inspector.getByTestId('inspector-lock')).toHaveAttribute('aria-pressed', 'true');
  await expect(inspector.getByTestId('inspector-locked-note')).toBeVisible();
  await expect(inspector.getByTestId('inspector-font-size')).toBeDisabled();
  await expect(inspector.getByTestId('inspector-name')).toBeDisabled();

  await inspector.getByTestId('inspector-lock').click();
  await expect(inspector.getByTestId('inspector-font-size')).toBeEnabled();

  await page.keyboard.press('Escape');
  await expect(inspector.getByTestId('inspector-font-size')).toHaveCount(0);
  await expect(inspector.getByRole('combobox', { name: /^Format(o)?$/ })).toBeVisible();
});

test('images panel adds an image from a URL and from the clipboard', async ({ page }) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  // A different 1x1 PNG so the clipboard path does not dedupe into the URL insert.
  const pastedPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  await page.route('https://images.example.test/photo.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );
  await page.addInitScript((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/png' });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => [{ types: ['image/png'], getType: async () => blob }],
      },
    });
  }, pastedPng.toString('base64'));

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');
  const openTool = (name: RegExp) => rail.getByRole('button', { name }).click();

  await openTool(/Images|Imagens|Imágenes/);
  const panel = page.getByTestId('sidebar-panel-images');

  // URL path: CORS fetch + data URL, like the home flow. The field clears
  // itself on success, which is the signal that the object landed.
  await panel.getByTestId('images-url').fill('https://images.example.test/photo.png');
  await panel.getByTestId('images-add-url').click();
  await expect(panel.getByTestId('images-url')).toHaveValue('');
  await openTool(/Layers|Camadas|Capas/);
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(
    page.getByTestId('layer-row').filter({ hasText: 'images.example.test/photo.png' }),
  ).toHaveCount(1);

  // Clipboard path: the pasted blob lands as its own image object.
  await openTool(/Images|Imagens|Imágenes/);
  await panel.getByTestId('images-paste').click();
  await openTool(/Layers|Camadas|Capas/);
  await expect(page.getByTestId('layer-row')).toHaveCount(5);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Pasted image' })).toHaveCount(1);

  // A file outside the matrix is refused by the shared source gate before the
  // document changes, with copy that names the accepted formats.
  await openTool(/Images|Imagens|Imágenes/);
  await panel.getByTestId('images-file').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });
  await expect(panel.getByTestId('images-error')).toHaveText(
    /This file type is not supported|Este tipo de arquivo não é suportado|Este tipo de archivo no es compatible/i,
  );
});

test('canvas editor inspector switches the image fit live', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Cover image' })
    .getByTestId('layer-select')
    .click();
  const inspector = page.getByTestId('inspector');
  await expect(inspector.getByTestId('inspector-fit')).toBeVisible();

  // A squarer box makes the two fits visually different. The starter image is
  // cover, so the switch goes to contain ("show entire image").
  await inspector.getByTestId('inspector-width').fill('400');

  const covered = await canvasHash(page);
  await inspector.getByTestId('inspector-fit').click();
  await page
    .getByRole('option', { name: /Show entire image|Mostrar imagem inteira|Mostrar imagen completa/i })
    .click();
  await expect.poll(() => canvasHash(page)).not.toBe(covered);
});

test('canvas rail moves focus between tools with the arrow keys', async ({ page }) => {
  await page.goto('/fremit/editor');
  const rail = page.getByTestId('sidebar-rail');
  await expect(rail).toBeVisible({ timeout: 15000 });

  const layers = rail.getByRole('button', { name: /Layers|Camadas|Capas/ });
  await layers.focus();
  await page.keyboard.press('ArrowUp');
  await expect(rail.getByRole('button', { name: /Pages|Páginas/ })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(rail.getByRole('button', { name: /Animate|Animar/ })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(rail.getByRole('button', { name: /Templates|Plantillas/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(layers).toBeFocused();

  // The arrows continue from the tool that actually holds focus: after a click
  // on Text (which also moves the roving tabindex), ArrowDown reaches Shapes.
  await rail.getByRole('button', { name: /Text|Texto/ }).click();
  await page.keyboard.press('ArrowDown');
  await expect(rail.getByRole('button', { name: /Shapes|Formas/ })).toBeFocused();
});

test('canvas editor edits text in place and keeps it through a page round-trip', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);

  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const pageSize = 1080;
  const fitPadding = 48;
  const zoom = Math.min((host.width - fitPadding) / pageSize, (host.height - fitPadding) / pageSize);
  const originX = (host.width - pageSize * zoom) / 2;
  const originY = (host.height - pageSize * zoom) / 2;
  const toScreen = (x: number, y: number) => ({
    x: host.x + originX + x * zoom,
    y: host.y + originY + y * zoom,
  });

  const canvasHash = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return 'none';
      const context = canvas.getContext('2d');
      if (!context) return 'no-context';
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let hash = 0;
      for (let index = 0; index < data.length; index += 41) {
        hash = (hash * 31 + data[index]) % 2147483647;
      }
      return String(hash);
    });

  const original = await canvasHash();

  // Edit the headline ("Fremit 1.0" -> "Fremit canvas") on the canvas itself.
  const headline = toScreen(150, 870);
  await page.mouse.dblclick(headline.x, headline.y);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Fremit canvas');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Clear the selection from the panel so the hash only reflects the document.
  const headlineRow = page.getByTestId('layer-row').filter({ hasText: 'Headline' });
  await headlineRow.getByTestId('layer-select').click();
  await expect(page.getByTestId('selection-x')).toHaveCount(0);
  await page.waitForTimeout(200);
  const edited = await canvasHash();
  expect(edited).not.toBe(original);

  // The store holds the edited text: switching pages and back re-renders it.
  // Pages live in the rail dock; layers come back when the tool returns.
  await page.getByTestId('sidebar-rail').getByRole('button', { name: /Pages|Páginas/ }).click();
  await expect(page.getByTestId('sidebar-panel-pages')).toBeVisible();
  await page.getByTestId('page-add').click();
  await expect(page.getByTestId('page-row')).toHaveCount(2);
  await page.getByTestId('page-row').first().getByTestId('page-select').click();
  await page.getByTestId('sidebar-rail').getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('sidebar-panel-layers')).toBeVisible();
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await page.waitForTimeout(300);

  await expect.poll(canvasHash).toBe(edited);
});

/** Document box of the current selection, read from the layers panel. */
async function readSelectionBox(page: Page) {
  return {
    x: Number(await page.getByTestId('selection-x').textContent()),
    y: Number(await page.getByTestId('selection-y').textContent()),
    width: Number(await page.getByTestId('selection-width').textContent()),
    height: Number(await page.getByTestId('selection-height').textContent()),
  };
}

/** Inserts one curved preset on a fresh page and returns its document box. */
async function insertArcPreset(page: Page, direction: 'up' | 'down') {
  const rail = page.getByTestId('sidebar-rail');
  const name = direction === 'up' ? 'Arc up' : 'Arc down';

  // A fresh empty page keeps the ink sample free of the starter artwork.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await page.getByTestId('page-add').click();
  await expect(page.getByTestId('page-row')).toHaveCount(2);

  await rail.getByRole('button', { name: /Text|Texto/ }).click();
  const textPanel = page.getByTestId('sidebar-panel-text');
  await expect(textPanel).toBeVisible();
  await textPanel.getByTestId(`text-preset-arc-${direction}`).click();

  // The insertion is selected and named, and the layer lands on top.
  await expect(page.getByTestId('inspector-name')).toHaveValue(name);
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(1);
  await expect(page.getByTestId('layer-row').filter({ hasText: name })).toHaveCount(1);

  // The stored box is the arc's own bounding box, so the samples below read
  // it from the selection; the fonts must be settled before painting.
  await page.evaluate(() => document.fonts.ready);

  return readSelectionBox(page);
}

test('canvas editor inserts curved text and the arc paints as a curve', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const box = await insertArcPreset(page, 'up');

  // Curvature on the live canvas: the stored box is the arc's own bounding
  // box, so the middle glyphs rise above its top edge while the ends sit
  // lower on the curve — a straight run would paint both tops at the same
  // height.
  const up = await arcInkRows(page, box, 'top');
  expect(up.middle).not.toBeNull();
  expect(up.end).not.toBeNull();
  // The middle glyphs are the highest point of the arch; the first glyph of
  // the run sits well below (roughly the sagitta of the curve).
  const upDelta = (up.end as number) - (up.middle as number);
  expect(upDelta).toBeGreaterThan(20);

  // The amount control deepens the same arch: a stronger curvature lifts the
  // middle further from the ends and re-flows the box with it.
  await page.getByTestId('inspector-arc-amount').fill('1');
  await expect(page.getByTestId('inspector-arc-amount')).toHaveValue('1');

  await expect
    .poll(async () => {
      const rows = await arcInkRows(page, await readSelectionBox(page), 'top');
      if (rows.middle === null || rows.end === null) return -999;

      return (rows.end as number) - (rows.middle as number);
    })
    .toBeGreaterThan(upDelta + 6);

  // The direction control flips the arch into a valley.
  await page.getByTestId('inspector-arc-direction').click();
  await page.getByRole('option', { name: /Arc down|Arco para baixo|Arco hacia abajo/ }).click();

  await expect
    .poll(async () => {
      const rows = await arcInkRows(page, await readSelectionBox(page), 'bottom');
      if (rows.middle === null || rows.end === null) return -999;

      return Math.round((rows.middle as number) - (rows.end as number));
    })
    .toBeGreaterThan(20);

  // Straighten collapses the arc controls to the button and repaints the
  // object as boxed text; re-curving is one click away.
  const curvedHash = await canvasHash(page);
  await page.getByTestId('inspector-arc-straighten').click();
  await expect(page.getByTestId('inspector-arc-add')).toBeVisible();
  await expect(page.getByTestId('inspector-arc-direction')).toHaveCount(0);
  await expect.poll(() => canvasHash(page)).not.toBe(curvedHash);

  await page.getByTestId('inspector-arc-add').click();
  await expect(page.getByTestId('inspector-arc-direction')).toBeVisible();
});

test('canvas editor inserts the down arc preset as a valley', async ({ page }) => {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const box = await insertArcPreset(page, 'down');

  // Valley: the middle glyphs are the lowest point of the run; the first
  // glyph sits well above them (roughly the sagitta of the curve).
  const down = await arcInkRows(page, box, 'bottom');
  expect(down.middle).not.toBeNull();
  expect(down.end).not.toBeNull();
  expect((down.middle as number) - (down.end as number)).toBeGreaterThan(20);
});

test('canvas editor applies gradient and image page fills', async ({ page }) => {
  // The 1x1 PNG used across the suite is one opaque black pixel.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('canvas-host')).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const host = (await page.getByTestId('canvas-host').boundingBox())!;
  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Background|Fundo|Fondo/ }).click();
  const panel = page.getByTestId('sidebar-panel-background');
  await expect(panel).toBeVisible();

  // The stored kind is the source of truth for the tab.
  await expect(panel.getByTestId('background-kind-solid')).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // Gradient: red to blue at 90deg — the page runs left (red) to right (blue).
  await panel.getByTestId('background-kind-gradient').click();
  const from = panel.getByTestId('background-from').locator('input[type="text"]');
  const to = panel.getByTestId('background-to').locator('input[type="text"]');
  await from.fill('#ff0000');
  await from.press('Enter');
  await to.fill('#0000ff');
  await to.press('Enter');
  await panel.getByTestId('background-angle').fill('90');

  // Opening the drawer resizes the stage; fit the page again so the sampling
  // math below matches the live viewport.
  await page.getByRole('button', { name: /Fit page|Ajustar/ }).click();

  const left = await readCanvasPixel(page, pageToScreen(host, 1080, 4, 4));
  const right = await readCanvasPixel(page, pageToScreen(host, 1080, 1076, 4));

  expect(left?.[0]).toBeGreaterThan(200);
  expect(left?.[2]).toBeLessThan(60);
  expect(right?.[2]).toBeGreaterThan(200);
  expect(right?.[0]).toBeLessThan(60);

  // Image: the uploaded pixel covers the whole page.
  await panel.getByTestId('background-kind-image').click();
  await panel.getByTestId('background-image-file').setInputFiles({
    name: 'fill.png',
    mimeType: 'image/png',
    buffer: png,
  });

  await page.getByRole('button', { name: /Fit page|Ajustar/ }).click();
  await expect
    .poll(async () => (await readCanvasPixel(page, pageToScreen(host, 1080, 4, 4)))?.[0])
    .toBeLessThan(10);
  await expect(panel.getByTestId('background-error')).toHaveCount(0);

  // Swapping the source is an update: the canvas follows the new reference,
  // and the fill to restore on removal is still the first one.
  const whitePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await panel.getByTestId('background-image-file').setInputFiles({
    name: 'fill-2.png',
    mimeType: 'image/png',
    buffer: whitePng,
  });
  await page.getByRole('button', { name: /Fit page|Ajustar/ }).click();
  await expect
    .poll(async () => (await readCanvasPixel(page, pageToScreen(host, 1080, 4, 4)))?.[0])
    .toBeGreaterThan(245);

  // The applied fill has a preview around the stored source, framed at the
  // page format (poster is square).
  const preview = panel.getByTestId('background-image-preview');
  await expect(preview).toBeVisible();
  await expect
    .poll(async () => {
      const box = await preview.boundingBox();
      return box ? Math.round(box.width / box.height) : 0;
    })
    .toBe(1);

  // A source that cannot resolve reports the error instead of writing a fill.
  await panel.getByTestId('background-image-url').fill('not-a-url');
  await panel.getByTestId('background-image-add-url').click();
  await expect(panel.getByTestId('background-error')).toBeVisible();

  // Changing the anchor format reflows the preview to the new format (banner
  // is 3:1) without recreating the stored image fill.
  const formatSelect = page
    .getByTestId('inspector')
    .getByRole('combobox', { name: /^Format(o)?$/ });
  await formatSelect.click();
  await page.getByRole('option', { name: /Banner/ }).click();
  await expect
    .poll(async () => {
      const box = await preview.boundingBox();
      return box ? Math.round(box.width / box.height) : 0;
    })
    .toBe(3);

  // The solid fill the page showed before the gradient comes back — the page
  // remembers its last solid instead of resetting to white.
  await panel.getByTestId('background-kind-solid').click();
  await expect(panel.getByTestId('background-color').locator('input[type="text"]')).toHaveValue(
    '#f5f0e8',
  );
  await expect(panel.getByTestId('background-image-preview')).toHaveCount(0);

  // Applying an image over that solid and removing it returns exactly to the
  // same solid: no preview is left and no image reference survives.
  await panel.getByTestId('background-kind-image').click();
  await panel.getByTestId('background-image-file').setInputFiles({
    name: 'fill-3.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(panel.getByTestId('background-image-preview')).toBeVisible();
  await panel.getByTestId('background-image-remove').click();
  await expect(panel.getByTestId('background-kind-solid')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(panel.getByTestId('background-color').locator('input[type="text"]')).toHaveValue(
    '#f5f0e8',
  );
  await expect(panel.getByTestId('background-image-preview')).toHaveCount(0);
});

test('canvas editor applies a local brand kit to the selection', async ({ page }) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  // The layers tool is open by default: select the shape while it is visible.
  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Accent bar' })
    .getByTestId('layer-select')
    .click();

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Brand|Marca/ }).click();
  const panel = page.getByTestId('sidebar-panel-brand');
  await expect(panel).toBeVisible();

  // A palette color fills the selected shape.
  await panel.locator('[data-testid="brand-swatch"][data-color="#111111"]').click();
  await expect(page.getByTestId('inspector-fill').locator('input[type="text"]')).toHaveValue(
    '#111111',
  );

  // Removing a palette color takes the swatch out of the kit.
  await panel.locator('[data-testid="brand-remove-color"][data-color="#111111"]').click();
  await expect(panel.locator('[data-testid="brand-swatch"][data-color="#111111"]')).toHaveCount(0);

  // A file that is not an image reports the error and leaves the kit alone.
  await panel.getByTestId('brand-logo-file').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });
  await expect(panel.getByTestId('brand-error')).toBeVisible();
  await expect(panel.getByTestId('brand-logo-preview')).toHaveCount(0);

  // A kit font applies to the selected text: select it from the layers tool,
  // then come back to the brand panel.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Headline' })
    .getByTestId('layer-select')
    .click();
  await rail.getByRole('button', { name: /Brand|Marca/ }).click();
  await panel.getByTestId('brand-font-heading').click();
  await page.getByRole('option', { name: 'Georgia' }).click();
  await panel.getByTestId('brand-apply-heading').click();
  await expect(page.getByTestId('inspector-font-family')).toHaveText(/Georgia/);

  // The body font applies the same way, from its own control.
  await panel.getByTestId('brand-font-body').click();
  await page.getByRole('option', { name: 'Trebuchet' }).click();
  await panel.getByTestId('brand-apply-body').click();
  await expect(page.getByTestId('inspector-font-family')).toHaveText(/Trebuchet/);

  // The logo uploads into the kit and inserts as a normal image layer.
  await panel.getByTestId('brand-logo-file').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(panel.getByTestId('brand-logo-preview')).toBeVisible();
  await panel.getByTestId('brand-logo-insert').click();

  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Logo' })).toHaveCount(1);

  // The kit is local and survives a reload; the document does not.
  await page.reload();
  await rail.getByRole('button', { name: /Brand|Marca/ }).click();
  await expect(panel.getByTestId('brand-logo-preview')).toBeVisible();

  // Removing the logo empties the kit's logo and disables inserting it.
  await panel.getByTestId('brand-logo-remove').click();
  await expect(panel.getByTestId('brand-logo-preview')).toHaveCount(0);
  await expect(panel.getByTestId('brand-logo-insert')).toBeDisabled();
});

test('capture flow lands on the canvas with the source as an image layer', async ({ page }) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.route('https://api.microlink.io/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          title: 'Dinopad — Atlas',
          screenshot: { url: 'https://preview.example.test/dinopad.png' },
        },
      }),
    });
  });
  await page.route('https://preview.example.test/dinopad.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  );

  await page.goto('/fremit/');
  await page.getByLabel(/Enter a link|Insira um link|Insertar un enlace/i).fill(
    'https://mafhper.github.io/dinopad/#/atlas',
  );
  await page.getByRole('button', { name: /Open in Editor|Abrir no Editor/i }).click();

  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Dinopad — Atlas' })).toHaveCount(1);
});

// The schema preset ids, in catalog order; the loops below prove that every
// one of them applies to the document and previews on the canvas.
const ELEMENT_ANIMATION_IDS = [
  'fade',
  'rise',
  'pop',
  'slide',
  'words',
  'typewriter',
  'wipe',
  'focus',
] as const;
const PAGE_TRANSITION_IDS = [
  'fade',
  'dip',
  'dissolve',
  'blur',
  'slide',
  'push',
  'cover',
  'uncover',
  'zoom',
  'wipe',
  'circle',
  'flip',
  'spin',
  'blinds',
] as const;

test('canvas editor applies and previews every element animation', async ({ page }) => {
  // Eight applies + eight previews, each with a real timeline: slow by design.
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');

  // The layers tool is open by default: select the solid bar first, for the
  // pixel proof below.
  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Accent bar' })
    .getByTestId('layer-select')
    .click();

  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  const panel = page.getByTestId('sidebar-panel-animate');
  await expect(panel).toBeVisible();
  const host = page.getByTestId('canvas-host');

  // A slow, linear fade on the bar proves the preview paints on the live
  // object: while it runs the bar is nearly transparent, and when it ends the
  // ink is back exactly as the document stores it.
  await panel.getByTestId('animate-preset-fade').click();
  await panel.getByTestId('animate-duration').fill('3000');
  await panel.getByTestId('animate-easing').click();
  await page.getByRole('option', { name: /Linear|Lineal/ }).click();

  const hostBox = (await host.boundingBox())!;
  // (150, 743) is the clean sample point the drag tests use: at low zoom the
  // bar's mid-edge controls cover the middle of the 420px-wide bar.
  const barSample = pageToScreen(hostBox, 1080, 150, 743);

  await panel.getByTestId('animate-preview').click();
  await expect(host).toHaveAttribute('data-previewing', 'fade');

  // The fade paints on the live object: the bar goes (near) transparent while
  // the timeline runs, and the end of the playback restores exactly the ink
  // the document stores.
  await expect
    .poll(async () => (await readCanvasPixel(page, barSample))?.[0] ?? 255)
    .toBeGreaterThan(150);

  await expect(host).not.toHaveAttribute('data-previewing');
  expect((await readCanvasPixel(page, barSample))?.slice(0, 3)).toEqual([31, 111, 235]);

  // The selection moves to the text object: words/typewriter need real text.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Headline' })
    .getByTestId('layer-select')
    .click();
  await rail.getByRole('button', { name: /Animate|Animar/ }).click();

  for (const preset of ELEMENT_ANIMATION_IDS) {
    const button = panel.getByTestId(`animate-preset-${preset}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');

    // A short timeline keeps the loop fast; the preview plays the stored
    // animation and reports itself on the canvas host while it runs. The
    // duration stays well above the polling cadence so a loaded machine
    // cannot miss the transient `data-previewing` window between polls.
    await panel.getByTestId('animate-duration').fill('1000');
    await panel.getByTestId('animate-preview').click();
    await expect(host).toHaveAttribute('data-previewing', preset);
    await expect(host).not.toHaveAttribute('data-previewing');
  }

  // The layer carries the badge of the last preset; removing clears it.
  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  const headlineRow = page.getByTestId('layer-row').filter({ hasText: 'Headline' });
  await expect(headlineRow.getByTestId('layer-animation')).toHaveAttribute(
    'data-animation',
    'focus',
  );

  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  await panel.getByTestId('animate-clear').click();
  await expect(panel.getByTestId('animate-preset-focus')).toHaveAttribute('aria-pressed', 'false');

  await rail.getByRole('button', { name: /Layers|Camadas|Capas/ }).click();
  await expect(headlineRow.getByTestId('layer-animation')).toHaveCount(0);
});

test('canvas editor applies and previews every page transition', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('canvas-host')).toBeVisible({ timeout: 15000 });

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  const panel = page.getByTestId('sidebar-panel-animate');
  await expect(panel).toBeVisible();

  // "None" is the starting state; every preset applies and stays pressed.
  await expect(panel.getByTestId('animate-transition-none')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  for (const preset of PAGE_TRANSITION_IDS) {
    const button = panel.getByTestId(`animate-transition-${preset}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await panel.getByTestId('animate-transition-duration').fill('400');
  }

  // The page preview plays the transition on the canvas surface: while the
  // last preset (blinds) runs, its mask is on the canvas element, and the
  // cleanup removes it when the playback ends.
  const host = page.getByTestId('canvas-host');
  await panel.getByTestId('animate-transition-duration').fill('1500');
  await panel.getByTestId('animate-preview-page').click();
  await expect(host).toHaveAttribute('data-previewing', 'page');

  const surfaceStyle = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-host"] canvas.lower-canvas');
      return canvas instanceof HTMLCanvasElement ? canvas.getAttribute('style') ?? '' : '';
    });

  await expect.poll(surfaceStyle).toContain('mask-image');

  await expect(host).not.toHaveAttribute('data-previewing');
  await expect.poll(surfaceStyle).not.toContain('mask-image');

  // Back to "None": the page carries no transition again.
  await panel.getByTestId('animate-transition-none').click();
  await expect(panel.getByTestId('animate-transition-none')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('canvas editor presents pages and plays the transition between them', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  const rail = page.getByTestId('sidebar-rail');

  // A second page with its own transition: entering it plays that transition.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await page.getByTestId('page-add').click();
  await expect(page.getByTestId('page-row')).toHaveCount(2);

  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  const panel = page.getByTestId('sidebar-panel-animate');
  await panel.getByTestId('animate-transition-fade').click();
  // Long enough to be observed between polls on a loaded machine (the
  // transition reports itself on the canvas host while it runs).
  await panel.getByTestId('animate-transition-duration').fill('1000');

  // Back to the first page and into presentation mode.
  await rail.getByRole('button', { name: /Pages|Páginas/ }).click();
  await page.getByTestId('page-row').first().getByTestId('page-select').click();
  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  await panel.getByTestId('animate-present').click();

  await expect(page.getByTestId('present-bar')).toBeVisible();
  // The toolbar carries its own name, distinct from the animate panel button
  // that opened the mode (both used to be "Present").
  await expect(
    page.getByRole('toolbar', {
      name: /Presentation controls|Controles da apresentação|Controles de la presentación/,
    }),
  ).toBeVisible();
  await expect(page.getByTestId('present-page')).toHaveText('1 / 2');
  await expect(page.getByTestId('present-prev')).toBeDisabled();
  await expect(page.getByTestId('sidebar-rail')).toHaveCount(0);
  await expect(page.getByTestId('editor-panel')).toHaveCount(0);

  // Next: the page that lands plays its transition.
  await page.getByTestId('present-next').click();
  await expect(page.getByTestId('present-page')).toHaveText('2 / 2');
  await expect(page.getByTestId('canvas-host')).toHaveAttribute('data-previewing', 'page');
  await expect(page.getByTestId('present-next')).toBeDisabled();

  // Escape leaves the mode and the shell comes back.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('present-bar')).toHaveCount(0);
  await expect(page.getByTestId('sidebar-rail')).toBeVisible();
});
