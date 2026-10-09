const {test,expect}=require('@playwright/test');
const {selectGeography}=require('../geography-helpers');

async function open(page){
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-medife-configurator','ready');
  await page.locator('#clientName').fill('QA geografía');
  await page.locator('#receiptContribution').fill('30000');
}
async function submit(page){await page.getByRole('button',{name:/Ver precios base/}).click();}
async function choosePlata(page){await page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'PLATA',exact:true})}).getByRole('button',{name:/Armar propuesta/}).click();}

test('Provincia inicial vacía, 17 jurisdicciones habilitadas y región calculada sin selección manual',async({page})=>{
  await open(page);
  await expect(page.locator('#province')).toHaveValue('');
  await expect(page.locator('#province option')).toHaveCount(18);
  await expect(page.locator('#filial')).toBeDisabled();
  await expect(page.locator('#region')).toBeHidden();
  await expect(page.locator('#region')).toBeDisabled();
  await submit(page);await expect(page.locator('#resultados')).toBeHidden();
});

test('Santa Fe y Rosario conservan tarifas y descuentos distintos, también en la propuesta PDF',async({page})=>{
  await open(page);
  await selectGeography(page,{province:'Santa Fe',filial:'Santa Fe',locality:'Santa Fe capital'});
  await submit(page);await choosePlata(page);
  const discount=page.locator('[data-benefit-id="filial"]');
  await expect(discount).toContainText('5%');await expect(discount).not.toHaveClass(/is-selected/);
  await discount.click();await page.locator('#openManualQuote').click();
  await expect(page.locator('.medife-summary-table')).toContainText('Santa Fe · Santa Fe capital');
  await page.locator('#closeQuote').click();
  await page.locator('#filial').selectOption('Rosario');
  await expect(page.locator('#locality')).toHaveValue('');
  await expect(page.locator('#proposalBuilder')).toBeHidden();
  await expect(page.locator('#resultados')).toBeHidden();
  await expect(page.locator('#selectedBar')).toBeHidden();
  await page.locator('#locality').selectOption('Rosario');
  await submit(page);await choosePlata(page);
  await expect(page.locator('[data-benefit-id="filial"]')).toHaveCount(0);
});

test('Buenos Aires ofrece cuatro zonas y limpia localidad, filial y propuesta al cambiar',async({page})=>{
  await open(page);
  await selectGeography(page,{province:'Buenos Aires',zone:'AMBA',filial:'GBA Oeste'});
  expect(await page.locator('#filial option').evaluateAll(options=>options.map(o=>o.value))).not.toContain('CABA');
  await expect(page.locator('#locality')).toHaveValue('Zona GBA Oeste');
  await submit(page);await choosePlata(page);
  await page.locator('#geographyZone').selectOption('Bahía/MDQ');
  await expect(page.locator('#region')).toHaveValue('Bahía/MDQ');
  await expect(page.locator('#filial')).toHaveValue('');
  await expect(page.locator('#locality')).toBeDisabled();
  await expect(page.locator('#proposalBuilder')).toBeHidden();
  await page.locator('#filial').selectOption('Mar del Plata');
  await expect(page.locator('#locality')).toHaveValue('');
  await page.locator('#locality').selectOption('Mar del Plata');
  await submit(page);await expect(page.locator('.plan-card')).toHaveCount(5);
  await selectGeography(page,{province:'Buenos Aires',zone:'Sur',filial:'Mercedes',locality:'Mercedes, Buenos Aires'});
  await expect(page.locator('#region')).toHaveValue('Sur');
  await submit(page);await expect(page.locator('.plan-card')).toHaveCount(5);
});

test('Una región documentada permite cotizar sin heredar una filial por cercanía',async({page})=>{
  await open(page);
  for(const c of [
    {province:'Buenos Aires',zone:'Norte',filial:'__norte_ba__',locality:'San Nicolás'},
    {province:'Santa Fe',filial:'__reconquista__',locality:'Reconquista'},
    {province:'Buenos Aires',zone:'Sur',filial:'__interior__',locality:'Tandil'},
    {province:'Santa Cruz',filial:'Patagonia Sur',locality:'Río Gallegos'},
    {province:'La Pampa',locality:'Santa Rosa'},
    {province:'La Rioja',locality:'La Rioja capital'},
    {province:'Buenos Aires',zone:'Sur',filial:'__interior__',locality:'Trenque Lauquen'}
  ]){
    await selectGeography(page,c);await expect(page.locator('#geographyHelp')).toHaveAttribute('data-blocked','false');
    await submit(page);await expect(page.locator('#formError')).toBeEmpty();await expect(page.locator('.plan-card')).toHaveCount(5);
    await choosePlata(page);await expect(page.locator('[data-benefit-id="filial"]')).toHaveCount(0);
  }
});

test('Las provincias suspendidas o sin tarifa y Tres Arroyos no se ofrecen',async({page})=>{
  await open(page);
  const provinces=await page.locator('#province option').evaluateAll(options=>options.map(o=>o.value));
  for(const province of ['Salta','Jujuy','Formosa','San Luis','Santiago del Estero','Catamarca','Chaco']){
    expect(provinces).not.toContain(province);
  }
  await selectGeography(page,{province:'Buenos Aires',zone:'Bahía/MDQ'});
  expect(await page.locator('#filial option').allTextContents()).not.toContain('Tres Arroyos · suspendida');
  expect(await page.locator('#filial option').evaluateAll(options=>options.map(o=>o.value))).not.toContain('__tres_arroyos__');
  await expect(page.locator('#geographyHelp')).toHaveAttribute('data-blocked','false');
});

test('Sólo se ofrecen localidades cotizables y cambiar domicilio limpia el resultado',async({page})=>{
  await open(page);await selectGeography(page,{province:'Córdoba',locality:'Villa Carlos Paz'});
  await submit(page);await choosePlata(page);
  expect(await page.locator('#locality option').evaluateAll(options=>options.map(o=>o.value))).not.toContain('__other__');
  await page.locator('#locality').selectOption('Córdoba capital');
  await expect(page.locator('#proposalBuilder')).toBeHidden();
  await expect(page.locator('#resultados')).toBeHidden();
  await submit(page);await expect(page.locator('#formError')).toBeEmpty();
  await expect(page.locator('.plan-card')).toHaveCount(5);
});

test('Cada localidad ofrecida da precios en Obligatorio y Voluntario sin cartel de bloqueo',async({page})=>{
  test.setTimeout(120000);
  await open(page);await page.locator('#age').fill('35');
  const values=selector=>page.locator(`${selector} option`).evaluateAll(options=>options.map(o=>o.value).filter(Boolean));
  let routes=0;
  for(const province of await values('#province')){
    await page.locator('#province').selectOption(province);
    for(const zone of await values('#geographyZone')){
      if(await page.locator('#geographyZone').inputValue()!==zone)await page.locator('#geographyZone').selectOption(zone);
      for(const filial of await values('#filial')){
        await page.locator('#filial').selectOption(filial);
        const localities=await values('#locality');expect(localities).not.toContain('__other__');
        for(const locality of localities){
          await page.locator('#locality').selectOption(locality);
          for(const category of ['Obligatorio','Voluntario']){
            await page.locator(`input[name="category"][value="${category}"]`).check();
            await expect(page.locator('#geographyHelp')).toHaveAttribute('data-blocked','false');
            await expect(page.locator('#geographyHelp')).not.toContainText(/suspendida|sin tarifa|falta confirmar|no tiene una región/);
            await submit(page);await expect(page.locator('#formError')).toBeEmpty();
            await expect(page.locator('#resultados')).toBeVisible();
            const prices=await page.locator('.plan-card .plan-price strong').allTextContents();
            expect(prices.length).toBeGreaterThanOrEqual(5);
            for(const price of prices)expect(price).toMatch(/\$[\s\d.]+/);
          }
          routes++;
        }
      }
    }
  }
  expect(routes).toBe(46);
});

test('NOA se deriva de Tucumán y Neuquén distingue filiales dentro de Patagonia',async({page})=>{
  await open(page);await selectGeography(page,{province:'Tucumán',locality:'San Miguel de Tucumán'});
  await expect(page.locator('#noaProvince')).toHaveValue('Tucumán');await submit(page);await choosePlata(page);
  await expect(page.locator('[data-benefit-id="filial"]')).toContainText('20%');
  await selectGeography(page,{province:'Neuquén',filial:'Comahue',locality:'Plottier'});
  await expect(page.locator('#noaProvince')).toHaveValue('');
  await expect(page.locator('#region')).toHaveValue('Patagonia');await submit(page);
  await expect(page.locator('.plan-card')).toHaveCount(5);
  await page.locator('#filial').selectOption('Patagonia Norte');
  await expect(page.locator('#locality')).toHaveValue('');
  await expect(page.locator('#geographyHelp')).toContainText('beneficios generales');
});

test('Santa Rosa y Trenque Lauquen llegan a propuesta y PDF con domicilio correcto',async({page})=>{
  await open(page);await page.locator('#age').fill('32');
  await selectGeography(page,{province:'La Pampa',locality:'Santa Rosa'});
  await expect(page.locator('#region')).toHaveValue('Sur');
  await expect(page.locator('#caseFilial')).toHaveText('Santa Rosa');
  await expect(page.locator('#geographyHelp')).not.toContainText('administración');
  await submit(page);await choosePlata(page);
  await page.locator('#openManualQuote').click();
  await expect(page.locator('.medife-summary-table')).toContainText('La Pampa · Santa Rosa');
  await expect(page.locator('.medife-summary-table')).not.toContainText('__pampa_sur__');
  await page.locator('#closeQuote').click();
  await selectGeography(page,{province:'Buenos Aires',zone:'Sur',filial:'__interior__',locality:'Trenque Lauquen'});
  await expect(page.locator('#resultados')).toBeHidden();
  await expect(page.locator('#proposalBuilder')).toBeHidden();
  await expect(page.locator('#region')).toHaveValue('Sur');
  await submit(page);await choosePlata(page);
  await page.locator('#openManualQuote').click();
  await expect(page.locator('.medife-summary-table')).toContainText('Buenos Aires · Trenque Lauquen');
  await expect(page.locator('.medife-summary-table')).not.toContainText('__interior__');
});

test('Paraná asigna Norte automáticamente, cotiza y conserva domicilio en la propuesta',async({page},testInfo)=>{
  await open(page);await page.locator('#age').fill('32');
  await page.locator('#province').selectOption('Entre Ríos');
  await expect(page.locator('#geographyHelp')).toHaveAttribute('data-blocked','false');
  await expect(page.locator('#geographyHelp')).not.toContainText('confirmar');
  await expect(page.locator('#geographyZoneWrap')).toBeHidden();
  await expect(page.locator('#geographyZone')).toHaveValue('Norte');
  expect(await page.locator('#geographyZone option').evaluateAll(options=>options.map(o=>o.value))).not.toContain('Sur');
  await expect(page.locator('#region')).toHaveValue('Norte');
  await expect(page.locator('#filial')).toHaveValue('__parana__');
  await page.locator('#locality').selectOption('Paraná');
  await expect(page.locator('#geographyResolved')).toContainText('Región tarifaria calculada: Norte');
  await submit(page);await expect(page.locator('.plan-card')).toHaveCount(5);await choosePlata(page);
  await expect(page.locator('[data-benefit-id="filial"]')).toHaveCount(0);
  await page.locator('#openManualQuote').click();
  await expect(page.locator('.medife-summary-table')).toContainText('Entre Ríos · Paraná');
  await expect(page.locator('.medife-summary-table')).toContainText('Norte · Paraná');
  await expect(page.locator('.medife-summary-table')).not.toContainText('__parana__');
  await page.locator('#closeQuote').click();
  await page.locator('.form-step').first().screenshot({path:testInfo.outputPath('parana-habilitada.png')});
  await page.locator('#province').selectOption('La Pampa');
  await expect(page.locator('#region')).toHaveValue('Sur');
  await expect(page.locator('#geographyZoneWrap')).toBeHidden();
  await expect(page.locator('#geographyResolved')).toContainText('Región tarifaria calculada');
  await expect(page.locator('#resultados')).toBeHidden();
  await expect(page.locator('#proposalBuilder')).toBeHidden();
});

test('Geografía legible sin desborde a 320 y 390 píxeles',async({page},testInfo)=>{
  await open(page);await selectGeography(page,{province:'Buenos Aires',zone:'Norte',locality:'San Nicolás'});
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    for(const selector of ['#province','#geographyZone','#filial','#locality','#geographyHelp']){
      const box=await page.locator(selector).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    }
  }
  await page.locator('.form-step').first().screenshot({path:testInfo.outputPath('geografia-mobile.png')});
});
