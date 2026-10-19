import { expect, test } from '@playwright/test';

/**
 * Every asset the shell declares must resolve through the deployed base
 * (`/fremit/`). The Vite dev server answers a missing file with the SPA
 * fallback — `200 text/html` — so a status-only check would pass while the
 * browser received HTML where it expected an image or a font; each assertion
 * pins the content type as well.
 */

/**
 * Brand art published under `public/` ahead of its consumer (the promo site
 * is the last slice): served today, referenced by code later. This is the
 * app-served half of the brand set — the same bytes also live in
 * `assets/brand/` (editable source) and `docs/` (GitHub surface, not served
 * by the app).
 */
const BRAND_ART: ReadonlyArray<{ path: string; type: string }> = [
  { path: '/fremit/icon.svg', type: 'image/svg+xml' },
  { path: '/fremit/og.webp', type: 'image/webp' },
  { path: '/fremit/brand/banner-github.webp', type: 'image/webp' },
  { path: '/fremit/brand/hero.webp', type: 'image/webp' },
  { path: '/fremit/brand/hero@2x.webp', type: 'image/webp' },
];

test('every icon link of the shell resolves under the base path', async ({ page, request }) => {
  await page.goto('/fremit/');

  const hrefs = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'),
      (link) => link.getAttribute('href') ?? '',
    ),
  );

  // The shell declares the SVG favicon, four PNG sizes, the apple touch icon
  // and the ICO — a shrunken list would make the loop below vacuous.
  expect(hrefs.length).toBeGreaterThanOrEqual(7);

  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toMatch(/^image\//);
  }
});

test('the social card resolves at the path the deploy serves', async ({ page, request }) => {
  await page.goto('/fremit/');

  const contents = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]'),
      (meta) => meta.getAttribute('content') ?? '',
    ),
  );

  expect(contents.length).toBeGreaterThanOrEqual(2);

  for (const content of contents) {
    // Absolute Pages URL today; the test asks the local server for the same
    // pathname, so a missing file or a wrong base fails here.
    const { pathname } = new URL(content);
    expect(pathname.startsWith('/fremit/'), pathname).toBe(true);

    const response = await request.get(pathname);
    expect(response.status(), pathname).toBe(200);
    expect(response.headers()['content-type'], pathname).toMatch(/^image\//);
  }
});

test('the brand art served ahead of the promo site stays resolvable', async ({ request }) => {
  for (const { path, type } of BRAND_ART) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toBe(type);
  }
});

test('every font preload of the shell resolves as a font', async ({ page, request }) => {
  await page.goto('/fremit/');

  const hrefs = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('link[rel="preload"][as="font"]'),
      (link) => link.getAttribute('href') ?? '',
    ),
  );

  // The app renders with system stacks plus the bundled Inter, so no font
  // preload is expected; the shell used to preload removed Manrope/Fraunces
  // files that the SPA fallback answered with HTML. Any preload that comes
  // back must point at a real font file.
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toMatch(/^font\//);
  }
});
