import { expect, test } from '@playwright/test';

test('home hero and source controls stay inside the first viewport', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/');

  await expect(page.getByRole('heading', { name: /Paste, edit, and export\.|Cole, edite e exporte\./i })).toBeVisible();
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

  await expect(page.getByRole('heading', { name: /Paste, edit, and export\.|Cole, edite e exporte\./i })).toBeVisible();

  const menu = page.getByRole('button', { name: /Menu|Menú/i });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');

  await expect(page.getByRole('link', { name: /Home|Início|Inicio/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /About|Sobre/i })).toBeVisible();
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

test('canvas editor adds text, shape and image from the toolbar', async ({ page }) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await page.getByRole('button', { name: /Add text|Adicionar texto|Añadir texto/i }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(4);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Text' })).toHaveCount(1);

  await page.getByRole('button', { name: /Add shape|Adicionar forma|Añadir forma/i }).click();
  await expect(page.getByTestId('layer-row')).toHaveCount(5);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'Shape' })).toHaveCount(1);

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'sticker.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('layer-row')).toHaveCount(6);
  await expect(page.getByTestId('layer-row').filter({ hasText: 'sticker.png' })).toHaveCount(1);
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
  await page.getByTestId('page-add').click();
  await expect(page.getByTestId('layer-row')).toHaveCount(0);
  await page.getByTestId('page-row').first().getByTestId('page-select').click();
  await expect(page.getByTestId('layer-row')).toHaveCount(3);
  await page.waitForTimeout(300);

  await expect.poll(canvasHash).toBe(edited);
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
