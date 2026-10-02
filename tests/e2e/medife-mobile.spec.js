const { test, expect } = require('@playwright/test');

test.describe('Celular: login y cotización completa', () => {
  for (const width of [320, 390, 412, 768]) {
    test(`Login sin desbordes a ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/login.html');
      const brand = await page.locator('.login-brand').boundingBox();
      const card = await page.locator('.login-card').boundingBox();
      expect(card.y).toBeGreaterThanOrEqual(brand.y + brand.height - 1);
      for (const selector of ['.login-card h2', '[name="username"]', '#password', '#showPassword', '#loginForm [type="submit"]']) {
        const box = await page.locator(selector).boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      await page.locator('#password').fill('prueba-visual');
      await page.locator('#showPassword').click();
      await expect(page.locator('#password')).toHaveAttribute('type', 'text');
      await page.locator('#password').fill('');
      await page.locator('.login-shell').screenshot({ path: testInfo.outputPath(`login-${width}.png`) });
    });
  }

  test('Vista previa ajustada al celular y al cambio de orientación', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveAttribute('data-medife-configurator', 'ready');
    await page.screenshot({ path: testInfo.outputPath('inicio-mobile.png') });
    await page.locator('#clientName').fill('Revisión móvil');
    await page.locator('#receiptContribution').fill('30000');
    await page.getByRole('button', { name: /Ver precios base/ }).click();
    const plata = page.locator('.plan-card').filter({ has: page.getByRole('heading', { name: 'PLATA', exact: true }) });
    await plata.getByRole('button', { name: /Armar propuesta/ }).click();
    await page.locator('#openManualQuote').click();
    await expect(page.locator('#quoteDialog')).toBeVisible();
    await expect(page.locator('.quote-page-preview')).toHaveCount(3);
    for (const width of [390, 320, 700]) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(async () => {
        const box = await page.locator('.medife-cover').boundingBox();
        return box.x >= 0 && box.x + box.width <= width + 1;
      }).toBe(true);
      const box = await page.locator('.medife-cover').boundingBox();
      expect(box.height / box.width).toBeCloseTo(1123 / 794, 2);
      const toolbar = await page.locator('.dialog-toolbar').boundingBox();
      expect(toolbar.x + toolbar.width).toBeLessThanOrEqual(width + 1);
      await page.locator('.medife-cover').screenshot({ path: testInfo.outputPath(`portada-${width}.png`) });
    }
    await page.locator('#closeQuote').click();
    await expect(page.locator('#quoteDialog')).not.toBeVisible();
  });
});
