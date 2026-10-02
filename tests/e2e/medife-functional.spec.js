const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.goto('/index.html');
  await expect(page.locator('#quoteForm')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-medife-configurator','ready');
  await page.locator('#clientName').fill('QA Zeroka');
}
async function fillMandatoryContribution(page, value='30000') {
  await page.locator('#contributionSource').selectOption('relacion');
  await page.locator('#receiptContribution').fill(value);
}
async function submit(page) {
  await page.getByRole('button',{name:/Ver (planes disponibles|precios base)/i}).click();
}
function planCard(page, plan) {
  return page.locator('.plan-card').filter({has:page.getByRole('heading',{name:plan,exact:true})});
}
async function choosePlan(page, plan) {
  const card=planCard(page,plan);await expect(card).toBeVisible();
  await card.getByRole('button',{name:/Armar propuesta/i}).click();
  await expect(page.locator('#proposalBuilder')).toBeVisible();
  await expect(page.locator('#proposalHeader')).toContainText(plan);
}
function benefit(page,title){return page.locator('.benefit-card').filter({hasText:title});}
function benefitId(page,id){return page.locator(`.benefit-card[data-benefit-id="${id}"]`);}
function digitsOnly(text){return String(text||'').replace(/\D/g,'');}


test.describe('Cotizador Medifé · QA funcional configurador V3',()=>{
  test('01 · carga sin errores y mantiene universo/vigencia correctos',async({page})=>{
    await openApp(page);
    await expect(page.locator('body')).toContainText('7 días hábiles');
    await expect(page.locator('body')).not.toContainText('72 hs');
    await expect(page.locator('body')).not.toContainText('MEDIFÉ+');
    await expect(page.locator('.form-step--promo')).toContainText('Condiciones especiales');
  });

  test('02 · región actualiza correctamente las filiales',async({page})=>{
    await openApp(page);
    const cases=[['AMBA',['CABA','GBA Norte','GBA Oeste','GBA Sur']],['Norte',['Córdoba','Corrientes','Misiones','Noa','Rosario','Santa Fe']],['Sur',['Mendoza','Mercedes','San Juan']],['Patagonia',['Comahue','Patagonia Norte','Patagonia Sur']],['Bahía/MDQ',['Bahía Blanca','Mar del Plata']]];
    for(const [region,filials] of cases){await page.locator('#region').selectOption({label:region});expect(await page.locator('#filial option').allTextContents()).toEqual(filials);}
  });

  test('03 · NOA solicita provincia únicamente cuando corresponde',async({page})=>{
    await openApp(page);await expect(page.locator('#noaProvinceWrap')).toBeHidden();
    await page.locator('#region').selectOption('Norte');await page.locator('#filial').selectOption('Noa');await expect(page.locator('#noaProvinceWrap')).toBeVisible();
    await page.locator('#filial').selectOption('Córdoba');await expect(page.locator('#noaProvinceWrap')).toBeHidden();
  });

  test('04 · UCC se pregunta como condición de elegibilidad y solo en Norte',async({page})=>{
    await openApp(page);await expect(page.locator('#uccWrap')).toBeHidden();
    await page.locator('#region').selectOption('Norte');await expect(page.locator('#uccWrap')).toBeVisible();await expect(page.locator('#uccWrap')).toContainText('Tiene empleador UCC');
    await page.locator('#region').selectOption('Sur');await expect(page.locator('#uccWrap')).toBeHidden();
  });

  test('05 · promociones y convenios ya no se eligen en el formulario inicial',async({page})=>{
    await openApp(page);
    await expect(page.locator('#promotion').locator('xpath=..')).toBeHidden();
    await expect(page.locator('#gaf').locator('xpath=..')).toBeHidden();
    await expect(page.locator('#option5Wrap')).toBeHidden();
    await expect(page.locator('.form-step--promo')).toContainText('Los beneficios se eligen después');
  });

  test('06 · Voluntario oculta aportes; Obligatorio los mantiene automáticos',async({page})=>{
    await openApp(page);await expect(page.locator('#contributionSection')).toBeVisible();
    await page.locator('input[name="category"][value="Voluntario"]').check();await expect(page.locator('#contributionSection')).toBeHidden();
    await page.locator('input[name="category"][value="Obligatorio"]').check();await expect(page.locator('#contributionSection')).toBeVisible();
  });

  test('07 · pareja y unificación muestran únicamente campos necesarios',async({page})=>{
    await openApp(page);await expect(page.locator('#partnerFields')).toBeHidden();await page.locator('#hasPartner').check();await expect(page.locator('#partnerFields')).toBeVisible();
    await expect(page.locator('#partnerContributionFields')).toBeHidden();await page.locator('#unifyPartnerContribution').check();await expect(page.locator('#partnerContributionFields')).toBeVisible();
  });

  test('08 · hijos generan campos y siguen limitados a 29 años',async({page})=>{
    await openApp(page);await page.locator('#children').fill('2');await expect(page.locator('.child-age')).toHaveCount(2);
    const second=page.locator('.child-age').nth(1);await second.fill('30');await fillMandatoryContribution(page);expect(await second.evaluate(el=>el.validity.rangeOverflow)).toBe(true);
    await submit(page);await expect(page.locator('#resultados')).toBeHidden();await second.fill('29');await submit(page);await expect(page.locator('#resultados')).toBeVisible();
  });

  test('09 · AMBA muestra precio base puro de seis planes, sin beneficios aplicados',async({page})=>{
    await openApp(page);await fillMandatoryContribution(page);await submit(page);
    await expect(page.locator('.plan-card')).toHaveCount(6);await expect(planCard(page,'INDIE')).toHaveCount(1);await expect(page.locator('#plansGrid')).not.toContainText('MEDIFÉ+');
    await expect(planCard(page,'PLATA')).toContainText('VALOR BASE DEL GRUPO');await expect(planCard(page,'PLATA')).not.toContainText('Opción 1');
  });

  test('10 · fuera de AMBA INDIE no aparece y quedan cinco planes base',async({page})=>{
    await openApp(page);await page.locator('#region').selectOption('Sur');await page.locator('#filial').selectOption('Mendoza');await fillMandatoryContribution(page);await submit(page);
    await expect(page.locator('.plan-card')).toHaveCount(5);await expect(planCard(page,'INDIE')).toHaveCount(0);
  });

  test('11 · Obligatorio sin aporte no permite cotizar',async({page})=>{
    await openApp(page);await page.locator('#receiptContribution').fill('');await submit(page);await expect(page.locator('#formError')).toContainText('aporte del 3%');await expect(page.locator('#resultados')).toBeHidden();
  });

  test('12 · elegir plan abre configurador con beneficios comerciales apagados y aportes automáticos',async({page})=>{
    await openApp(page);await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'PLATA');
    await expect(page.locator('.benefit-card.is-selected')).toHaveCount(0);
    await expect(page.locator('#proposalSummary')).toContainText('Aportes');
    await expect(page.locator('#proposalSummary')).not.toContainText('Beneficios comerciales mes 1');
    await expect(page.locator('#proposalHeader')).toContainText('VALOR BASE DEL GRUPO');
  });

  test('13 · AMBA explica 45% sobre hijos y muestra impacto real sobre el grupo',async({page})=>{
    await openApp(page);await page.locator('#age').fill('35');await page.locator('#children').fill('1');await page.locator('.child-age').fill('10');await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'PLATA');
    const child=benefitId(page,'child');await expect(child).toBeVisible();await expect(child).toContainText('45% sobre tarifa de hijos elegibles');await expect(child).toContainText('impacto máximo sobre este grupo');
    const txt=await child.textContent();expect(txt).not.toMatch(/impacto máximo sobre este grupo 45%/);
  });

  test('14 · Interior explica 55% sobre hijos sin presentarlo como 55% del grupo',async({page})=>{
    await openApp(page);await page.locator('#region').selectOption('Sur');await page.locator('#filial').selectOption('Mendoza');await page.locator('#hasPartner').check();await page.locator('#children').fill('1');await page.locator('.child-age').fill('10');await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'PLATA');
    const child=benefitId(page,'child');await expect(child).toContainText('55% sobre tarifa de hijos elegibles');
    const txt=await child.textContent();expect(txt).not.toMatch(/impacto máximo sobre este grupo 55%/);
  });

  test('15 · AMBA bloquea segmento joven al aplicar ajuste por hijos',async({page})=>{
    await openApp(page);await page.locator('#age').fill('25');await page.locator('#children').fill('1');await page.locator('.child-age').fill('10');await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'PLATA');
    const child=benefitId(page,'child');const young=benefitId(page,'young');await expect(young).toBeEnabled();await child.click();await expect(benefitId(page,'child')).toHaveClass(/is-selected/);await expect(benefitId(page,'young')).toBeDisabled();await expect(benefitId(page,'young')).toContainText('desplaza este beneficio');
  });

  test('16 · táctico válido aparece disponible pero no se aplica hasta que el asesor lo elige',async({page})=>{
    await openApp(page);await page.locator('#filial').selectOption('GBA Sur');await page.locator('#age').fill('38');await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'BRONCE');
    const tactical=benefitId(page,'tactical');await expect(tactical).toBeVisible();await expect(tactical).not.toHaveClass(/is-selected/);
    const before=digitsOnly(await page.locator('.summary-total strong').textContent());await tactical.click();await expect(benefitId(page,'tactical')).toHaveClass(/is-selected/);const after=digitsOnly(await page.locator('.summary-total strong').textContent());expect(Number(after)).toBeLessThan(Number(before));
  });

  test('17 · Opción 7 y táctico incompatible se bloquean de forma explicable',async({page})=>{
    await openApp(page);await page.locator('#age').fill('40');await fillMandatoryContribution(page);await page.locator('#exAssociate').check();await submit(page);await choosePlan(page,'PLATA');
    await benefitId(page,'tactical').click();await expect(benefitId(page,'strategic:7')).toBeDisabled();await expect(benefitId(page,'strategic:7')).toContainText('Desactivá primero el táctico');
    await benefitId(page,'tactical').click();await expect(benefitId(page,'strategic:7')).toBeEnabled();await benefitId(page,'strategic:7').click();await expect(benefitId(page,'strategic:7')).toHaveClass(/is-selected/);await expect(benefitId(page,'tactical')).toBeDisabled();
  });

  test('18 · aplicar mejor combinación selecciona beneficios válidos pero nunca acredita un convenio por sí sola',async({page})=>{
    await openApp(page);await page.locator('#age').fill('38');await page.locator('#filial').selectOption('GBA Sur');await page.locator('#children').fill('1');await page.locator('.child-age').fill('8');await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'PLATA');
    const before=Number(digitsOnly(await page.locator('.summary-total strong').textContent()));await page.locator('#bestBenefits').click();
    const after=Number(digitsOnly(await page.locator('.summary-total strong').textContent()));expect(after).toBeLessThanOrEqual(before);expect(await page.locator('.benefit-card.is-selected').count()).toBeGreaterThan(0);
    await expect(page.locator('.benefit-card[data-benefit-kind="gaf"].is-selected')).toHaveCount(0);
  });

  test('19 · convenios se ofrecen recién al armar propuesta y filtrados por zona',async({page})=>{
    await openApp(page);await page.locator('#region').selectOption('Patagonia');await page.locator('#filial').selectOption('Comahue');await fillMandatoryContribution(page);await submit(page);await choosePlan(page,'PLATA');
    await expect(benefit(page,'Ex INVAP Jubilados')).toBeVisible();await expect(benefit(page,'Prestadores Medifé Sur')).toBeVisible();await expect(benefit(page,'Prestadores Medifé AMBA')).toHaveCount(0);
  });

  test('20 · flujo completo permite seleccionar beneficios y genera vista previa coherente sin desborde',async({page})=>{
    await openApp(page);await page.locator('#clientName').fill('María QA');await page.locator('#age').fill('35');await page.locator('#children').fill('1');await page.locator('.child-age').fill('8');await fillMandatoryContribution(page);await page.locator('#procedencia').check();await submit(page);await choosePlan(page,'PLATA');
    await benefitId(page,'child').click();await benefitId(page,'strategic:1').click();
    await page.locator('#openManualQuote').click();await expect(page.locator('#quoteDialog')).toBeVisible();
    const cover=page.locator('.medife-cover');await expect(cover).toBeVisible();await expect(cover.locator(':scope > *')).toHaveCount(2);await expect(cover.locator('img.medife-cover-photo')).toHaveCount(1);await expect(cover.locator('.medife-cover-logo-fix img')).toHaveAttribute('src',/grupo-zeroka-wordmark-red\.png$/);
    await expect(page.locator('#quotePages')).toContainText('PLATA');await expect(page.locator('#quotePages')).toContainText('Ajuste hijos');await expect(page.locator('#quotePages')).toContainText('Opción 1');await expect(page.locator('#quotePages')).toContainText('7 días hábiles');
    const totalBox=await page.locator('.medife-summary-total').boundingBox();
    const legalBox=await page.locator('.medife-summary-legal').boundingBox();
    expect(totalBox.y+totalBox.height).toBeLessThan(legalBox.y);
    const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth}));expect(overflow.width).toBeLessThanOrEqual(overflow.viewport+1);
  });
});
