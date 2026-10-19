import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no critical or serious a11y violations', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('about page has no critical or serious a11y violations', async ({ page }) => {
  await page.goto('/fremit/about');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('canvas editor page has no critical or serious a11y violations', async ({ page }) => {
  await page.goto('/fremit/editor');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('icons workspace has no critical or serious a11y violations', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Icons|Ícones|Iconos/ }).click();
  // The icons workspace is the first tab and opens by default.
  await expect(page.getByTestId('icon-search')).toBeVisible();
  await page.getByTestId('icon-search').fill('arrow down left');
  await page.getByTestId('icon-card-arrows-arrow-down-left').click();
  await expect(page.getByTestId('icon-properties')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('animate panel has no critical or serious a11y violations', async ({ page }) => {
  test.slow();
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('layer-row')).toHaveCount(3);

  await page
    .getByTestId('layer-row')
    .filter({ hasText: 'Headline' })
    .getByTestId('layer-select')
    .click();

  const rail = page.getByTestId('sidebar-rail');
  await rail.getByRole('button', { name: /Animate|Animar/ }).click();
  await page.getByTestId('animate-preset-fade').click();
  await page.getByTestId('animate-transition-dissolve').click();
  await expect(page.getByTestId('animate-element')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('mockup editor page has no critical or serious a11y violations', async ({ page }) => {
  await page.goto('/fremit/mockup');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
