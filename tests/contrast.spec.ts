import { expect, test } from '@playwright/test';

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = luminance(...fg);
  const l2 = luminance(...bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(cssVar: string): [number, number, number] {
  const match = cssVar.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!match) return [0, 0, 0];
  const h = parseInt(match[1], 10);
  const s = parseInt(match[2], 10) / 100;
  const l = parseInt(match[3], 10) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;

  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

interface ColorPair {
  fg: string;
  bg: string;
  label: string;
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

test('light theme text meets WCAG AA contrast', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fremit.theme', 'light');
  });
  await page.goto('/fremit/');

  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      fg: style.getPropertyValue('--foreground').trim(),
      'text-muted': style.getPropertyValue('--text-muted').trim(),
      'text-soft': style.getPropertyValue('--text-soft').trim(),
      surface: style.getPropertyValue('--surface').trim(),
      'surface-muted': style.getPropertyValue('--surface-muted').trim(),
      background: style.getPropertyValue('--background').trim(),
      border: style.getPropertyValue('--border').trim(),
    };
  });

  const bg = parseColor(vars.background);
  const surface = parseColor(vars.surface);
  const surfaceMuted = parseColor(vars['surface-muted']);

  const pairs: ColorPair[] = [
    { fg: vars.fg, bg: vars.background, label: 'foreground on background' },
    { fg: vars['text-muted'], bg: vars.background, label: 'text-muted on background' },
    { fg: vars['text-soft'], bg: vars.background, label: 'text-soft on background' },
    { fg: vars.fg, bg: vars.surface, label: 'foreground on surface' },
    { fg: vars['text-muted'], bg: vars.surface, label: 'text-muted on surface' },
    { fg: vars['text-muted'], bg: vars['surface-muted'], label: 'text-muted on surface-muted' },
  ];

  for (const pair of pairs) {
    const fgColor = parseColor(pair.fg);
    const bgColor = parseColor(pair.bg);
    const ratio = contrastRatio(fgColor, bgColor);
    expect.soft(ratio, `${pair.label}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
  }
});

test('dark theme text meets WCAG AA contrast', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fremit.theme', 'dark');
  });
  await page.goto('/fremit/');

  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      fg: style.getPropertyValue('--foreground').trim(),
      'text-muted': style.getPropertyValue('--text-muted').trim(),
      'text-soft': style.getPropertyValue('--text-soft').trim(),
      surface: style.getPropertyValue('--surface').trim(),
      'surface-muted': style.getPropertyValue('--surface-muted').trim(),
      background: style.getPropertyValue('--background').trim(),
      border: style.getPropertyValue('--border').trim(),
    };
  });

  const bg = parseColor(vars.background);
  const surface = parseColor(vars.surface);
  const surfaceMuted = parseColor(vars['surface-muted']);

  const pairs: ColorPair[] = [
    { fg: vars.fg, bg: vars.background, label: 'foreground on background' },
    { fg: vars['text-muted'], bg: vars.background, label: 'text-muted on background' },
    { fg: vars['text-soft'], bg: vars.background, label: 'text-soft on background' },
    { fg: vars.fg, bg: vars.surface, label: 'foreground on surface' },
    { fg: vars['text-muted'], bg: vars.surface, label: 'text-muted on surface' },
    { fg: vars['text-muted'], bg: vars['surface-muted'], label: 'text-muted on surface-muted' },
  ];

  for (const pair of pairs) {
    const fgColor = parseColor(pair.fg);
    const bgColor = parseColor(pair.bg);
    const ratio = contrastRatio(fgColor, bgColor);
    expect.soft(ratio, `${pair.label}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
  }
});
