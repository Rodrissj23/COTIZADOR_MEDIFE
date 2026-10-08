const { selectGeography } = require('../geography-helpers');
const { test, expect } = require('@playwright/test');

test('Presentación: campos alineados, etiquetas legibles y propuesta sin superposiciones', async ({ page }, testInfo) => {
  // También verifica el caso observado en producción: fuentes externas no disponibles.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/index.html');
  await selectGeography(page);
  await expect(page.locator('html')).toHaveAttribute('data-medife-configurator', 'ready');
  await page.locator('#clientName').fill('Revisión visual de un grupo familiar');
  await page.locator('#receiptContribution').fill('30000');
  await page.locator('#hasPartner').check();
  await page.locator('#children').fill('2');
  await page.locator('.child-age').nth(0).fill('8');
  await page.locator('.child-age').nth(1).fill('12');

  const source = await page.locator('#contributionSource').boundingBox();
  const amount = await page.locator('#receiptContribution').boundingBox();
  if (testInfo.project.name === 'desktop-chromium') {
    expect(Math.abs(source.y - amount.y)).toBeLessThanOrEqual(1);
  } else {
    expect(await page.locator('#clientName').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
  expect(await page.locator('.form-card h2').evaluate(el => getComputedStyle(el).fontFamily)).toContain('sans-serif');

  await page.getByRole('button', { name: /Ver precios base/ }).click();
  await expect(page.locator('.results-head .eyebrow')).toHaveText('01 · PRECIOS BASE');
  const plata = page.locator('.plan-card').filter({ has: page.getByRole('heading', { name: 'PLATA', exact: true }) });
  const recommendation = await plata.locator('.plan-recommended').boundingBox();
  const tag = await plata.locator('.tag').boundingBox();
  const intersects = recommendation.x < tag.x + tag.width && recommendation.x + recommendation.width > tag.x && recommendation.y < tag.y + tag.height && recommendation.y + recommendation.height > tag.y;
  expect(intersects).toBe(false);

  await plata.getByRole('button', { name: /Armar propuesta/ }).click();
  const benefit = page.locator('.benefit-card[data-benefit-id="child"]');
  await expect(benefit).toHaveAttribute('aria-pressed', 'false');
  await benefit.click();
  await expect(page.locator('.benefit-card[data-benefit-id="child"]')).toHaveAttribute('aria-pressed', 'true');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.locator('.summary-lines')).toBeVisible();
    expect(await page.locator('.summary-sticky').evaluate(el => getComputedStyle(el).position)).toBe('static');
  }
  await page.locator('#proposalBuilder').screenshot({ path: testInfo.outputPath('propuesta.png') });
});

