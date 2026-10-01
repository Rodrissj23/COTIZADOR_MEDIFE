const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('PDF · genera y descarga la propuesta manual como PDF real', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'El binario PDF se valida una sola vez por corrida.');
  await page.goto('/index.html');
  await expect(page.locator('#quoteForm')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-medife-configurator','ready');
  await page.locator('#clientName').fill('QA PDF');
  await page.locator('#receiptContribution').fill('30000');
  await page.getByRole('button',{name:/Ver (planes disponibles|precios base)/i}).click();
  const plata=page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'PLATA',exact:true})});
  await plata.getByRole('button',{name:/Armar propuesta/i}).click();
  await expect(page.locator('#proposalBuilder')).toBeVisible();
  await page.locator('.benefit-card[data-benefit-id="strategic:1"]').click();
  await page.locator('#openManualQuote').click();
  await expect(page.locator('#quoteDialog')).toBeVisible();

  const cover=page.locator('.medife-cover');
  await expect(cover).toBeVisible();
  await expect(cover.locator(':scope > *')).toHaveCount(1);
  await expect(cover.locator('img.medife-cover-photo')).toHaveCount(1);
  await expect(cover).not.toContainText('Hola');
  await page.waitForFunction(()=>{
    const img=document.querySelector('.medife-cover-photo');
    return Boolean(img && img.complete && img.naturalWidth>0 && img.naturalHeight>0);
  },null,{timeout:15000});

  await expect(page.locator('#quotePages')).toContainText('PLATA');
  await expect(page.locator('#quotePages')).toContainText('Opción 1');
  await expect(page.locator('#quotePages')).toContainText('7 días hábiles');
  await page.waitForFunction(()=>Boolean(window.html2canvas&&window.jspdf?.jsPDF),null,{timeout:15000});
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await page.locator('#downloadQuote').click();
  const download=await downloadPromise;const filePath=await download.path();
  expect(download.suggestedFilename()).toMatch(/^Cotizacion_Medife_QA_PDF_PLATA\.pdf$/);expect(filePath).toBeTruthy();
  const bytes=fs.readFileSync(filePath);expect(bytes.length).toBeGreaterThan(20000);expect(bytes.subarray(0,5).toString('ascii')).toBe('%PDF-');
  await expect(page.locator('#downloadQuote')).toBeEnabled();
});
