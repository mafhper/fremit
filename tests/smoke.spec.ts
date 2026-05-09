import { expect, test } from '@playwright/test';

test('home hero stays inside the first viewport with SourceControls below fold', async ({ page }) => {
  await page.goto('/fremit/');

  await expect(page.getByRole('heading', { name: /Paste, edit, and export\.|Cole, edite e exporte\./i })).toBeVisible();
  await expect(page.getByTestId('home-source')).toBeVisible();
  await expect(page.getByLabel('Link or image URL').or(page.getByLabel('Link ou URL da imagem'))).toBeVisible();

  const hero = page.locator('.hero');
  await expect(hero).toBeVisible();
  const heroRect = await hero.boundingBox();
  expect(heroRect!.height).toBeGreaterThanOrEqual(600);

  const sourceSection = page.getByTestId('home-source');
  await expect(sourceSection).toBeVisible();
  const sourceRect = await sourceSection.boundingBox();
  expect(sourceRect!.y).toBeGreaterThanOrEqual(heroRect!.y + heroRect!.height - 50);
});

test('public mobile menu exposes navigation and open app', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fremit/');

  await page.getByRole('button', { name: /Menu|Menú/i }).click();

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

test('editor desktop stays inside the viewport with a dedicated side panel', async ({ page }) => {
  await page.goto('/fremit/editor');
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
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/fremit/editor');

  const selector = page.getByRole('button', {
    name: /Color selector|Seletor de cores|Selector de color/i,
  });

  await expect.poll(() => page.evaluate(() => document.documentElement.className)).not.toBe('');
  const initialTheme = await page.evaluate(() => document.documentElement.className);
  await selector.click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.className))
    .not.toBe(initialTheme);

  await page.reload();
  const toggledTheme = await page.evaluate(() => document.documentElement.className);
  expect(toggledTheme).not.toBe(initialTheme);

  await page.getByRole('button', {
    name: /Color selector|Seletor de cores|Selector de color/i,
  }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.className))
    .not.toBe(toggledTheme);
});

test('editor hides internal source strategy labels after loading a url', async ({ page }) => {
  await page.goto('/fremit/editor');

  const input = page.getByTestId('editor-source').locator('input[type="text"]').first();
  await input.fill('https://mafhper.github.io/mark-lee/pt-BR/faq');
  await page.getByRole('button', { name: /Open|Abrir/i }).click();

  await expect(page.getByTestId('editor-panel').getByText(/mark-lee\/pt-BR\/faq/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/microlink-screenshot|og-image|direct-image/i)).toHaveCount(0);
});

test('editor mobile uses controls overlay without turning into a long page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fremit/editor');

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
