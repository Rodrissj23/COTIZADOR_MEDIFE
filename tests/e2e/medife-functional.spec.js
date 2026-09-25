const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.goto('/index.html');
  await expect(page.locator('#quoteForm')).toBeVisible();
  await page.locator('#clientName').fill('QA Zeroka');
}

async function fillMandatoryContribution(page, value = '30000') {
  await page.locator('#contributionSource').selectOption('relacion');
  await page.locator('#receiptContribution').fill(value);
}

async function submit(page) {
  await page.getByRole('button', { name: /Ver planes disponibles/i }).click();
}

function planCard(page, plan) {
  return page.locator('.plan-card').filter({ has: page.getByRole('heading', { name: plan, exact: true }) });
}

async function choosePlan(page, plan) {
  const card = planCard(page, plan);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /Elegir plan/i }).click();
  await expect(page.locator('#selectedBar')).toBeVisible();
}

function digitsOnly(text) {
  return String(text || '').replace(/\D/g, '');
}

test.describe('Cotizador Medifé · QA funcional vendedor', () => {
  test('01 · carga sin errores y muestra la vigencia correcta', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('body')).toContainText('7 días hábiles');
    await expect(page.locator('body')).not.toContainText('72 hs');
    await expect(page.locator('body')).not.toContainText('MEDIFÉ+');
  });

  test('02 · región actualiza correctamente las filiales', async ({ page }) => {
    await openApp(page);
    const cases = [
      ['AMBA', ['CABA', 'GBA Norte', 'GBA Oeste', 'GBA Sur']],
      ['Norte', ['Córdoba', 'Corrientes', 'Misiones', 'Noa', 'Rosario', 'Santa Fe']],
      ['Sur', ['Mendoza', 'Mercedes', 'San Juan']],
      ['Patagonia', ['Comahue', 'Patagonia Norte', 'Patagonia Sur']],
      ['Bahía/MDQ', ['Bahía Blanca', 'Mar del Plata']]
    ];
    for (const [region, filials] of cases) {
      await page.locator('#region').selectOption({ label: region });
      const values = await page.locator('#filial option').allTextContents();
      expect(values).toEqual(filials);
    }
  });

  test('03 · NOA solicita provincia únicamente cuando corresponde', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#noaProvinceWrap')).toBeHidden();
    await page.locator('#region').selectOption('Norte');
    await page.locator('#filial').selectOption('Noa');
    await expect(page.locator('#noaProvinceWrap')).toBeVisible();
    await page.locator('#filial').selectOption('Córdoba');
    await expect(page.locator('#noaProvinceWrap')).toBeHidden();
  });

  test('04 · UCC aparece solo para región Norte', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#uccWrap')).toBeHidden();
    await page.locator('#region').selectOption('Norte');
    await expect(page.locator('#uccWrap')).toBeVisible();
    await page.locator('#region').selectOption('Sur');
    await expect(page.locator('#uccWrap')).toBeHidden();
    await expect(page.locator('#ucc')).not.toBeChecked();
  });

  test('05 · GAF se filtra por macrozona comercial', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#gaf option[value="prestadores_amba"]')).toHaveCount(1);
    await expect(page.locator('#gaf option[value="ex_invap"]')).toHaveCount(0);

    await page.locator('#region').selectOption('Patagonia');
    await expect(page.locator('#gaf option[value="ex_invap"]')).toHaveCount(1);
    await expect(page.locator('#gaf option[value="prestadores_sur"]')).toHaveCount(1);
    await expect(page.locator('#gaf option[value="prestadores_amba"]')).toHaveCount(0);

    await page.locator('#region').selectOption('Norte');
    await expect(page.locator('#gaf option[value="prestadores_norte"]')).toHaveCount(1);
    await expect(page.locator('#gaf option[value="tributo_simple"]')).toHaveCount(1);
    await expect(page.locator('#gaf option[value="ex_invap"]')).toHaveCount(0);
  });

  test('06 · Voluntario oculta aportes y elimina convenios solo obligatorios', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#contributionSection')).toBeVisible();
    await expect(page.locator('#gaf option[value="empleados_10"]')).toHaveCount(1);
    await page.locator('input[name="category"][value="Voluntario"]').check();
    await expect(page.locator('#contributionSection')).toBeHidden();
    await expect(page.locator('#gaf option[value="empleados_10"]')).toHaveCount(0);
    await expect(page.locator('#gaf option[value="tributo_simple"]')).toHaveCount(1);
  });

  test('07 · pareja y unificación de aportes muestran solo los campos necesarios', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#partnerFields')).toBeHidden();
    await page.locator('#hasPartner').check();
    await expect(page.locator('#partnerFields')).toBeVisible();
    await expect(page.locator('#partnerContributionFields')).toBeHidden();
    await page.locator('#unifyPartnerContribution').check();
    await expect(page.locator('#partnerContributionFields')).toBeVisible();
    await page.locator('#unifyPartnerContribution').uncheck();
    await expect(page.locator('#partnerContributionFields')).toBeHidden();
  });

  test('08 · hijos generan campos por integrante y rechazan edades mayores a 29', async ({ page }) => {
    await openApp(page);
    await page.locator('#children').fill('2');
    await expect(page.locator('.child-age')).toHaveCount(2);
    await page.locator('.child-age').nth(0).fill('10');
    await page.locator('.child-age').nth(1).fill('30');
    await fillMandatoryContribution(page);
    await submit(page);
    await expect(page.locator('#formError')).toContainText('0 y 29');
  });

  test('09 · Opción 5 solo se habilita con procedencia + opciones 1/2/3', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#option5Wrap')).toBeHidden();
    await page.locator('#procedencia').check();
    await page.locator('#promotion').selectOption('1');
    await expect(page.locator('#option5Wrap')).toBeVisible();
    await page.locator('#promotion').selectOption('4');
    await expect(page.locator('#option5Wrap')).toBeHidden();
    await expect(page.locator('#option5')).not.toBeChecked();
  });

  test('10 · Opción 7 aparece únicamente al marcar ex asociado', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#promotion option[value="7"]')).toHaveCount(0);
    await page.locator('#exAssociate').check();
    await expect(page.locator('#promotion option[value="7"]')).toHaveCount(1);
    await page.locator('#exAssociate').uncheck();
    await expect(page.locator('#promotion option[value="7"]')).toHaveCount(0);
  });

  test('11 · Obligatorio sin aporte no permite cotizar y explica el error', async ({ page }) => {
    await openApp(page);
    await page.locator('#receiptContribution').fill('');
    await submit(page);
    await expect(page.locator('#formError')).toContainText('aporte del 3%');
    await expect(page.locator('#resultados')).toBeHidden();
  });

  test('12 · AMBA muestra seis planes, incluido INDIE y sin Medifé+', async ({ page }) => {
    await openApp(page);
    await fillMandatoryContribution(page);
    await submit(page);
    await expect(page.locator('.plan-card')).toHaveCount(6);
    await expect(planCard(page, 'INDIE')).toHaveCount(1);
    await expect(page.locator('#plansGrid')).not.toContainText('MEDIFÉ+');
  });

  test('13 · fuera de AMBA INDIE no aparece y quedan cinco planes', async ({ page }) => {
    await openApp(page);
    await page.locator('#region').selectOption('Sur');
    await page.locator('#filial').selectOption('Mendoza');
    await fillMandatoryContribution(page);
    await submit(page);
    await expect(page.locator('.plan-card')).toHaveCount(5);
    await expect(planCard(page, 'INDIE')).toHaveCount(0);
  });

  test('14 · cambiar datos después de elegir un plan invalida la selección anterior', async ({ page }) => {
    await openApp(page);
    await fillMandatoryContribution(page);
    await submit(page);
    await choosePlan(page, 'PLATA');
    await page.locator('#age').fill('36');
    await expect(page.locator('#selectedBar')).toBeHidden();
  });

  test('15 · flujo completo familiar abre cotización coherente y con vigencia correcta', async ({ page }) => {
    await openApp(page);
    await page.locator('#clientName').fill('María QA');
    await page.locator('#age').fill('35');
    await fillMandatoryContribution(page, '30000');
    await page.locator('#hasPartner').check();
    await page.locator('#partnerAge').fill('34');
    await page.locator('#unifyPartnerContribution').check();
    await page.locator('#partnerContributionSource').selectOption('relacion');
    await page.locator('#partnerReceiptContribution').fill('25000');
    await page.locator('#children').fill('2');
    await page.locator('.child-age').nth(0).fill('8');
    await page.locator('.child-age').nth(1).fill('22');
    await submit(page);
    await choosePlan(page, 'PLATA');
    await page.getByRole('button', { name: /Ver cotización/i }).click();
    await expect(page.locator('#quoteDialog')).toBeVisible();
    await expect(page.locator('#quotePages')).toContainText('María');
    await expect(page.locator('#quotePages')).toContainText('PLATA');
    await expect(page.locator('#quotePages')).toContainText('7 días hábiles');
    await expect(page.locator('#quotePages')).toContainText('2 hijos');
  });

  test('16 · Voluntario cotiza con IVA y sin exigir aportes', async ({ page }) => {
    await openApp(page);
    await page.locator('input[name="category"][value="Voluntario"]').check();
    await submit(page);
    await expect(page.locator('#formError')).toHaveText('');
    await expect(page.locator('.plan-card')).toHaveCount(6);
    await expect(planCard(page, 'PLATA')).toContainText('IVA 10,5%');
  });

  test('17 · Norte aplica UCC y lo informa en resultados', async ({ page }) => {
    await openApp(page);
    await page.locator('#region').selectOption('Norte');
    await page.locator('#filial').selectOption('Córdoba');
    await fillMandatoryContribution(page);
    await page.locator('#ucc').check();
    await submit(page);
    await expect(planCard(page, 'PLATA')).toContainText('UCC 15%');
  });

  test('18 · táctico automático de GBA Sur Bronce aparece sin selección manual', async ({ page }) => {
    await openApp(page);
    await page.locator('#filial').selectOption('GBA Sur');
    await page.locator('#age').fill('38');
    await fillMandatoryContribution(page);
    await submit(page);
    await expect(planCard(page, 'BRONCE')).toContainText('Dto Mes 36/40_Bronce');
  });

  test('19 · Opción 7 suprime táctico en plan estratégico pero INDIE conserva su táctico', async ({ page }) => {
    await openApp(page);
    await page.locator('#age').fill('40');
    await fillMandatoryContribution(page);
    await page.locator('#exAssociate').check();
    await page.locator('#promotion').selectOption('7');
    await submit(page);
    await expect(planCard(page, 'PLATA')).toContainText('Opción 7');
    await expect(planCard(page, 'PLATA')).not.toContainText('Dto Mes 36/65_Plata');
    await expect(planCard(page, 'INDIE')).toContainText('Dto Indie 36/40');
  });

  test('20 · aportes altos nunca muestran cuota negativa y layout no desborda', async ({ page }) => {
    await openApp(page);
    await fillMandatoryContribution(page, '99999999');
    await submit(page);
    const priceText = await planCard(page, 'BRONCE CLASSIC').locator('.plan-price strong').textContent();
    expect(digitsOnly(priceText)).toBe('0');

    const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 1);

    await choosePlan(page, 'BRONCE CLASSIC');
    await page.getByRole('button', { name: /Ver cotización/i }).click();
    await expect(page.locator('#quoteDialog')).toBeVisible();
    const dialogBox = await page.locator('#quoteDialog').boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox.width).toBeLessThanOrEqual(overflow.viewport + 1);
  });
});
