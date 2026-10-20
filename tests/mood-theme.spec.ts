import { expect, test } from '@playwright/test';

/**
 * O clima chrome troca os tokens no <html>: header, footer e body são irmãos do <main>,
 * então a paleta da home precisa alcançá-los por herança de custom property. O atributo
 * também não pode vazar para as outras rotas.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fremit.locale', 'en-US');
    localStorage.setItem('fremit.theme', 'light');
  });
});

test('the chrome mood repaints every surface and leaves with the home page', async ({ page }) => {
  await page.goto('/fremit/');
  await expect(page.getByTestId('home-source')).toBeVisible();

  const read = () =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const color = (selector: string) => {
        const element = document.querySelector(selector);
        return element ? getComputedStyle(element).color : null;
      };
      return {
        mood: document.documentElement.getAttribute('data-mood'),
        background: root.getPropertyValue('--background').trim(),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        headerNav: color('header nav a[aria-current="page"]'),
        footerLink: color('footer a'),
      };
    });

  const morning = await read();
  expect(morning.mood).toBeNull();
  expect(morning.background).toBe('210 20% 98%');
  expect(morning.bodyBackground).toBe('rgb(249, 250, 251)');

  await page.getByRole('button', { name: 'Chrome' }).click();
  // O link do rodapé anima a cor (transition), então o valor final chega depois do clique.
  await expect.poll(async () => (await read()).footerLink).toBe('rgb(196, 186, 186)');

  const chrome = await read();
  expect(chrome.mood).toBe('chrome');
  expect(chrome.background).toBe('0 40% 8%');
  expect(chrome.bodyBackground).toBe('rgb(29, 12, 12)');
  expect(chrome.headerNav).toBe('rgb(244, 241, 241)');

  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/fremit\/about$/);
  await expect(page.locator('.about-page')).toBeVisible();

  const about = await read();
  expect(about.mood).toBeNull();
  expect(about.background).toBe('215 28% 7%');
});

type Rgb = [number, number, number];

const AA_NORMAL = 4.5;

function parseRgb(value: string): Rgb {
  const match = value.match(/^rgba?\((.+)\)$/);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  const [r, g, b] = match[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  return [r, g, b];
}

function hueOf([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const delta = max - min;
  const raw = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (raw * 60 + 360) % 360;
}

function luminance([r, g, b]: Rgb): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * O bloco [data-mood="chrome"] redefine só parte dos tokens; os que ficam de fora herdam
 * os valores azulados de `.dark`. Estes são os que ainda podem aparecer na home (botão
 * secundário, popover do menu de idioma, trilho do slider) — e o canvas-workspace, que é
 * literal azul e não alias. O teste mede a cor computada no navegador, não o arquivo CSS.
 */
const CHROME_SURFACE_TOKENS = [
  '--secondary',
  '--muted',
  '--card',
  '--popover',
  '--input',
  '--canvas-workspace',
] as const;

test('the chrome mood leaves no blue surface token and keeps AA text contrast', async ({ page }) => {
  await page.goto('/fremit/');
  await expect(page.getByTestId('home-source')).toBeVisible();
  await page.getByRole('button', { name: 'Chrome' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mood', 'chrome');
  await expect
    .poll(async () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
      ),
    )
    .toBe('0 40% 8%');

  const vars = await page.evaluate((names) => {
    const root = getComputedStyle(document.documentElement);
    const resolve = (name: string) => {
      const probe = document.createElement('span');
      probe.style.color = `hsl(var(${name}))`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    const out: Record<string, string> = {};
    for (const name of names) {
      out[name] = root.getPropertyValue(name).trim() ? resolve(name) : '';
    }
    return out;
  }, [...CHROME_SURFACE_TOKENS, '--foreground', '--muted-foreground']);

  for (const name of CHROME_SURFACE_TOKENS) {
    expect(vars[name], `${name} precisa resolver para uma cor`).not.toBe('');
    const hue = hueOf(parseRgb(vars[name]));
    // O clima chrome é vermelho/ouro (hue 0–43); hue azul significa herança de `.dark`.
    expect.soft(hue, `${name} herdou azul do tema escuro (hue ${hue.toFixed(0)})`).toBeLessThanOrEqual(60);
  }

  const pairs: Array<[label: string, fg: string, bg: string]> = [
    ['foreground on secondary', '--foreground', '--secondary'],
    ['muted-foreground on secondary', '--muted-foreground', '--secondary'],
    ['muted-foreground on muted', '--muted-foreground', '--muted'],
    ['foreground on card', '--foreground', '--card'],
    ['foreground on popover', '--foreground', '--popover'],
    ['foreground on canvas workspace', '--foreground', '--canvas-workspace'],
  ];

  for (const [label, fg, bg] of pairs) {
    const ratio = contrastRatio(parseRgb(vars[fg]), parseRgb(vars[bg]));
    expect.soft(ratio, `${label}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
  }
});
