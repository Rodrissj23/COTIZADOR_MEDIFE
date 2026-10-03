const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('PDF · genera y descarga la propuesta manual como PDF real', async ({ page }, testInfo) => {
  test.setTimeout(60000);
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
  await expect(cover.locator('.medife-cover-photo')).toHaveAttribute('src', /quote-cover-photo\.jpg$/);
  await expect(page.locator('#quotePages .medife-wordmark, #quotePages .logo-box, #quotePages .medife-cover-logo-fix')).toHaveCount(0);
  await expect(cover).not.toContainText('Hola');
  await page.waitForFunction(()=>{
    const img=document.querySelector('.medife-cover-photo');
    return Boolean(img && img.complete && img.naturalWidth>0 && img.naturalHeight>0);
  },null,{timeout:15000});

  await expect(page.locator('#quotePages')).toContainText('PLATA');
  await expect(page.locator('#quotePages')).toContainText('Opción 1');
  await expect(page.locator('#quotePages')).toContainText('7 días hábiles');
  const totalBox=await page.locator('.medife-summary-total').boundingBox();
  const legalBox=await page.locator('.medife-summary-legal').boundingBox();
  expect(totalBox.y+totalBox.height).toBeLessThan(legalBox.y);
  const noteBox=await page.locator('.medife-timeline .quote-note').boundingBox();
  const footerBox=await page.locator('.medife-timeline .medife-pdf-footer').boundingBox();
  expect(noteBox.y+noteBox.height).toBeLessThan(footerBox.y);
  for(const [selector,name] of [['.medife-summary','resumen'],['.medife-timeline','evolucion']]){
    await page.locator(selector).screenshot({path:testInfo.outputPath(`${name}.png`)});
  }
  await page.waitForFunction(()=>Boolean(window.html2canvas&&window.jspdf?.jsPDF),null,{timeout:15000});
  const downloadPromise=page.waitForEvent('download',{timeout:30000});
  await page.locator('#downloadQuote').click();
  const download=await downloadPromise;const filePath=await download.path();
  await download.saveAs(testInfo.outputPath('propuesta.pdf'));
  expect(download.suggestedFilename()).toMatch(/^Cotizacion_Medife_QA_PDF_PLATA\.pdf$/);expect(filePath).toBeTruthy();
  const bytes=fs.readFileSync(filePath);expect(bytes.length).toBeGreaterThan(20000);expect(bytes.subarray(0,5).toString('ascii')).toBe('%PDF-');
  expect(bytes.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(3);
  await expect(page.locator('#downloadQuote')).toBeEnabled();
});

test('PDF · cinco etapas de cuota entran en una sola hoja',async({page},testInfo)=>{
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-medife-configurator','ready');
  await page.locator('#clientName').fill('QA cinco etapas');
  await page.locator('#age').fill('40');
  await page.locator('#receiptContribution').fill('30000');
  await page.getByRole('button',{name:/Ver precios base/}).click();
  await page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'PLATA',exact:true})}).getByRole('button',{name:/Armar propuesta/}).click();
  for(const id of ['tactical','strategic:1','gaf:prestadores_amba'])await page.locator(`.benefit-card[data-benefit-id="${id}"]`).click();
  await page.locator('#openManualQuote').click();
  await expect(page.locator('.medife-timeline .month-card')).toHaveCount(5);
  const note=await page.locator('.medife-timeline .quote-note').boundingBox();
  const footer=await page.locator('.medife-timeline .medife-pdf-footer').boundingBox();
  expect(note.y+note.height).toBeLessThan(footer.y);
  await page.locator('.medife-timeline').screenshot({path:testInfo.outputPath('evolucion-cinco-etapas.png')});
});

test('PDF · resumen completo con UCC, convenio y ajustes sin recortes', async ({page},testInfo)=>{
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-medife-configurator','ready');
  await page.locator('#clientName').fill('QA propuesta completa');
  await page.locator('#region').selectOption('Norte');
  await page.locator('#filial').selectOption('Córdoba');
  await page.locator('#age').fill('25');
  await page.locator('#children').fill('1');
  await page.locator('.child-age').fill('8');
  await page.locator('#receiptContribution').fill('30000');
  await page.locator('#ucc').check();
  await page.getByRole('button',{name:/Ver precios base/}).click();
  await page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'PLATA',exact:true})}).getByRole('button',{name:/Armar propuesta/}).click();
  for(const id of ['child','young','filial','strategic:1','ucc','gaf:prestadores_norte']){
    await page.locator(`.benefit-card[data-benefit-id="${id}"]`).click();
  }
  await page.locator('#openManualQuote').click();
  await expect(page.locator('.medife-summary-row')).toHaveCount(10);
  await expect(page.locator('#quotePages .medife-wordmark, #quotePages .logo-box')).toHaveCount(0);
  const total=await page.locator('.medife-summary-total').boundingBox();
  const legal=await page.locator('.medife-summary-legal').boundingBox();
  expect(total.y+total.height).toBeLessThan(legal.y);
  const note=await page.locator('.medife-timeline .quote-note').boundingBox();
  const footer=await page.locator('.medife-timeline .medife-pdf-footer').boundingBox();
  expect(note.y+note.height).toBeLessThan(footer.y);
  // La captura se hace con la caja A4 real; detecta notas largas que salgan de su fila.
  expect(await page.locator('.medife-summary-row>span').evaluateAll(values=>values.every(el=>el.scrollHeight<=el.clientHeight+1))).toBe(true);
  await page.locator('.medife-summary').screenshot({path:testInfo.outputPath('resumen-completo.png')});
  await page.locator('.medife-timeline').screenshot({path:testInfo.outputPath('evolucion-completa.png')});
});
