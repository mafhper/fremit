import { expect, test, type Page } from '@playwright/test';

/**
 * Geometry of the docked sidebar column across every rail category.
 *
 * Two independent regressions are measured here: the column width used to
 * follow `PanelPlacement` (a 32px step between `drawer` and `sidebar` panels,
 * moving the stage on every switch), and the panel body used to scroll without
 * a reserved gutter (the native scrollbar intermittently stole ~15px of
 * content width). Both are proven numerically: the dock width, the scroll
 * container's client width and the stage position must stay within one pixel
 * across all ten tools.
 */

const TOLERANCE_PX = 1;

interface DockMetrics {
  id: string;
  columnWidth: number;
  bodyClientWidth: number;
  bodyScrollHeight: number;
  bodyClientHeight: number;
  bodyOverflowY: string;
  bodyScrollbarGutter: string;
  stageX: number;
  stageWidth: number;
}

async function readDockMetrics(page: Page, panelId: string): Promise<DockMetrics> {
  return page.evaluate((id) => {
    const section = document.querySelector<HTMLElement>(`[data-testid="sidebar-panel-${id}"]`);
    const stage = document.querySelector<HTMLElement>('[data-testid="canvas-host"]');

    if (!section) throw new Error(`missing docked panel ${id}`);
    if (!stage) throw new Error('missing canvas-host');

    // The section is header (docked only) + scrollable body; the body owns
    // `overflow-y: auto` and is therefore the element the gutter applies to.
    const body = section.lastElementChild;

    if (!(body instanceof HTMLElement)) throw new Error(`missing panel body for ${id}`);

    const bodyStyle = getComputedStyle(body);
    const sectionRect = section.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    return {
      id,
      columnWidth: sectionRect.width,
      bodyClientWidth: body.clientWidth,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      bodyOverflowY: bodyStyle.overflowY,
      bodyScrollbarGutter: bodyStyle.scrollbarGutter,
      stageX: stageRect.x,
      stageWidth: stageRect.width,
    };
  }, panelId);
}

/** Opens every tool of the rail, one at a time, and reads the geometry. */
async function measureEveryTool(page: Page): Promise<DockMetrics[]> {
  const rail = page.getByTestId('sidebar-rail');

  await expect(rail).toBeVisible();

  const tools = await rail
    .locator('button[data-tool]')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-tool') ?? ''));

  expect(tools, 'the rail advertises every category').toHaveLength(10);

  const samples: DockMetrics[] = [];

  for (const tool of tools) {
    const button = rail.locator(`button[data-tool="${tool}"]`);

    // Clicking the open tool closes the dock; keep it open when it already is.
    if ((await button.getAttribute('aria-pressed')) !== 'true') {
      await button.click();
    }

    await expect(page.getByTestId(`sidebar-panel-${tool}`)).toBeVisible();
    samples.push(await readDockMetrics(page, tool));
  }

  return samples;
}

function expectStableDock(samples: DockMetrics[]) {
  const baseline = samples[0];

  for (const sample of samples.slice(1)) {
    expect(
      Math.abs(sample.columnWidth - baseline.columnWidth),
      `${sample.id}: dock column ${sample.columnWidth}px vs ${baseline.id} ${baseline.columnWidth}px`,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(
      Math.abs(sample.bodyClientWidth - baseline.bodyClientWidth),
      `${sample.id}: panel body ${sample.bodyClientWidth}px vs ${baseline.id} ${baseline.bodyClientWidth}px`,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(
      Math.abs(sample.stageX - baseline.stageX),
      `${sample.id}: stage x ${sample.stageX}px vs ${baseline.id} ${baseline.stageX}px`,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(
      Math.abs(sample.stageWidth - baseline.stageWidth),
      `${sample.id}: stage width ${sample.stageWidth}px vs ${baseline.id} ${baseline.stageWidth}px`,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
  }

  for (const sample of samples) {
    // `overflow-y: scroll` is not the fix and a custom scrollbar is not either:
    // the body stays auto and reserves the gutter instead.
    expect(sample.bodyOverflowY, `${sample.id}: body keeps overflow-y auto`).toBe('auto');
    expect(
      sample.bodyScrollbarGutter,
      `${sample.id}: body reserves the scrollbar gutter`,
    ).toBe('stable');
  }
}

async function attachMetrics(samples: DockMetrics[]) {
  await test.info().attach('dock-metrics', {
    body: JSON.stringify(samples, null, 2),
    contentType: 'application/json',
  });
}

async function openEditor(page: Page) {
  await page.goto('/fremit/editor');
  await expect(page.getByTestId('canvas-host')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('sidebar-panel-layers')).toBeVisible();
}

test.describe('docked sidebar column', () => {
  test('keeps one width for every category and never moves the stage', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 720 });
    await openEditor(page);

    const samples = await measureEveryTool(page);

    await attachMetrics(samples);
    expectStableDock(samples);
  });

  test.describe('short viewport', () => {
    test.use({ viewport: { width: 1280, height: 420 } });

    test('keeps the same geometry while the panel bodies overflow', async ({ page }) => {
      test.slow();
      await openEditor(page);

      const samples = await measureEveryTool(page);
      const overflowing = samples.filter(
        (sample) => sample.bodyScrollHeight > sample.bodyClientHeight,
      );

      await attachMetrics(samples);
      expect(
        overflowing.length,
        'a short viewport must force at least one panel body to scroll',
      ).toBeGreaterThan(0);
      expectStableDock(samples);
    });
  });

  test.describe('200% zoom', () => {
    // Browser zoom at 200% halves the CSS viewport: a 2560x840 physical window
    // lays out as 1280x420 CSS pixels. `deviceScaleFactor: 2` is the same
    // device-pixel ratio the zoomed browser reports.
    test.use({ viewport: { width: 1280, height: 420 }, deviceScaleFactor: 2 });

    test('keeps the same geometry with a device-pixel ratio of two', async ({ page }) => {
      test.slow();
      expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
      await openEditor(page);

      const samples = await measureEveryTool(page);

      await attachMetrics(samples);
      expectStableDock(samples);
    });
  });
});
