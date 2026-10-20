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
