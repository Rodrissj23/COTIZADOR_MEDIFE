const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
require('../js/data-core.js');
require('../js/rules-v2.js');
require('../js/tariffs-amba.js');
require('../js/tariffs-norte.js');
require('../js/tariffs-sur.js');
require('../js/tariffs-patagonia.js');
require('../js/tariffs-bahia-mdq.js');
const E=require('../js/engine-v2.js');

const approx=(a,b,t=.02)=>assert.ok(Math.abs(a-b)<=t,`Esperado ${b}, recibido ${a}`);
const baseClient=(over={})=>({
  name:'Prueba',dni:'',region:'AMBA',filial:'CABA',noaProvince:'',category:'Obligatorio',paymentMethod:null,
  procedencia:false,exAssociate:false,gaf:'none',ucc:false,age:35,hasPartner:false,partnerAge:0,childrenAges:[],
  contributionSource:'relacion',receiptContribution:30000,monotributoCategory:'A',unifyPartnerContribution:false,
  partnerContributionSource:'relacion',partnerReceiptContribution:0,partnerMonotributoCategory:'A',promotion:'none',option5:false,
  ...over
});

// Universo comercial: Medifé+ no se rinde.
assert.deepEqual(E.PLAN_ORDER,['INDIE','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);

// Golden case 1: AMBA / Obligatorio / Bronce Classic / 25 años / aporte 3% = 30.000.
{
  const q=E.quote('BRONCE CLASSIC',baseClient({age:25}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,193137.529);
  approx(q.youngDiscount,50215.75754);
  approx(q.contribution,71145);
  approx(q.finalPrice,71776.77);
}

// Golden case 2: en AMBA, con hijo, el ajuste hijos 45% desplaza segmento joven.
{
  const q=E.quote('BRONCE CLASSIC',baseClient({age:25,childrenAges:[10]}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,386275.058);
  approx(q.childDiscount,86911.88805);
  approx(q.youngDiscount,0);
  approx(q.finalPrice,228218.17);
}

// Golden case 3: Interior, hijo 21-29 es HIJO MAYOR A CARGO y NO recibe ajuste hijos 55%.
{
  const q=E.quote('BRONCE CLASSIC',baseClient({region:'Sur',filial:'Mendoza',age:25,childrenAges:[22]}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,524748.7448);
  approx(q.childDiscount,0);
  approx(q.youngDiscount,52924.332318);
  approx(q.finalPrice,400679.41);
  assert.equal(q.tactical,null);
}

// Descuento permanente de filial Córdoba: 10% en Obligatorio, fuera del cap comercial.
{
  const q=E.quote('PLATA',baseClient({region:'Norte',filial:'Córdoba',age:35}));
  assert.equal(q.status,'ok');
  approx(q.filialRate,.10);
  approx(q.filialDiscount,q.nominalAdjustedPrice*.10);
}

// NOA: Tucumán/Salta/Jujuy reciben 20%; "Otra" no.
{
  const yes=E.quote('PLATA',baseClient({region:'Norte',filial:'Noa',noaProvince:'Tucumán'}));
  const no=E.quote('PLATA',baseClient({region:'Norte',filial:'Noa',noaProvince:'Otra'}));
  approx(yes.filialRate,.20);approx(no.filialRate,0);
}

// Tácticos dependen de filial: CABA Oro Vol 15%, GBA Oro Vol 20%.
{
  const caba=E.quote('ORO',baseClient({category:'Voluntario',region:'AMBA',filial:'CABA',age:40,contributionSource:null,receiptContribution:0}));
  const gba=E.quote('ORO',baseClient({category:'Voluntario',region:'AMBA',filial:'GBA Norte',age:40,contributionSource:null,receiptContribution:0}));
  approx(caba.tactical.rate,.15);approx(gba.tactical.rate,.20);
}

// Otros grupos tácticos recuperados.
{
  approx(E.quote('PLATA',baseClient({category:'Voluntario',region:'Norte',filial:'Misiones',age:40,contributionSource:null,receiptContribution:0})).tactical.rate,.20);
  approx(E.quote('ORO',baseClient({category:'Obligatorio',region:'Sur',filial:'San Juan',age:40})).tactical.rate,.30);
  approx(E.quote('BRONCE',baseClient({category:'Voluntario',region:'Patagonia',filial:'Comahue',age:40,contributionSource:null,receiptContribution:0})).tactical.rate,.15);
  approx(E.quote('PLATA',baseClient({category:'Voluntario',region:'Bahía/MDQ',filial:'Mar del Plata',age:40,contributionSource:null,receiptContribution:0})).tactical.rate,.10);
}

// INDIE: táctico propio sí; descuento estratégico no se suma.
{
  const q=E.quote('INDIE',baseClient({age:30,promotion:'1'}));
  assert.equal(q.status,'ok');
  approx(q.tactical.rate,.20);
  approx(q.timeline[0].strategicRate,0);
  approx(q.timeline[0].commercialRate,.20);
}

// Opción 7 en planes estratégicos conserva ajustes permanentes y excluye tácticos.
{
  const q=E.quote('PLATA',baseClient({age:25,childrenAges:[10],exAssociate:true,promotion:'7'}));
  assert.equal(q.status,'ok');
  assert.ok(q.childDiscount>0,'Opción 7 no debe borrar ajuste hijos');
  assert.equal(q.tactical,null);
  approx(q.timeline[0].strategicRate,.25);
  assert.equal(q.timeline.length,24);
}

// Regresión V2.1: Opción 7 NO aplica a INDIE y no debe borrar su táctico propio.
{
  const q=E.quote('INDIE',baseClient({age:30,exAssociate:true,promotion:'7'}));
  assert.equal(q.status,'ok');
  assert.ok(q.tactical,'INDIE debe conservar su táctico aunque el caso tenga Opción 7 seleccionada');
  approx(q.tactical.rate,.20);
  approx(q.timeline[0].strategicRate,0);
  approx(q.timeline[0].commercialRate,.20);
  assert.equal(q.timeline.length,12);
}

// GAF se aplica después de aportes. Tributo Simple 10%.
{
  const q=E.quote('BRONCE',baseClient({age:35,gaf:'tributo_simple'}));
  assert.equal(q.status,'ok');
  approx(q.timeline[0].preGaf,156075.37);
  approx(q.gafRate,.10);
  approx(q.finalPrice,140467.84);
}

// Plan Empleados 10% es solo Obligatorio.
{
  const c=baseClient({category:'Voluntario',gaf:'empleados_10',contributionSource:null,receiptContribution:0});
  assert.match(E.validateClient(c)||'',/convenio/i);
}

// Regresión V2.1: GAF se filtra también por macrozona comercial.
{
  const amba=new Set(E.gafEligibility(baseClient({region:'AMBA'})).map(x=>x.value));
  assert.ok(amba.has('prestadores_amba'));
  assert.ok(amba.has('tributo_simple'));
  assert.ok(!amba.has('ex_invap'));
  assert.ok(!amba.has('prestadores_norte'));

  const patagonia=new Set(E.gafEligibility(baseClient({region:'Patagonia',filial:'Comahue'})).map(x=>x.value));
  assert.ok(patagonia.has('acipan'));
  assert.ok(patagonia.has('camara_bariloche'));
  assert.ok(patagonia.has('ex_invap'));
  assert.ok(patagonia.has('prestadores_sur'));
  assert.ok(!patagonia.has('prestadores_amba'));
  assert.ok(!patagonia.has('prestadores_norte'));

  const norte=new Set(E.gafEligibility(baseClient({region:'Norte',filial:'Córdoba'})).map(x=>x.value));
  assert.ok(norte.has('prestadores_norte'));
  assert.ok(!norte.has('prestadores_sur'));

  assert.match(E.validateClient(baseClient({region:'AMBA',filial:'CABA',gaf:'ex_invap'}))||'',/zona|convenio/i);
}

// UCC es acumulable, previo a aportes/IVA y fuera del cap comercial; solo Norte.
{
  const q=E.quote('PLATA',baseClient({region:'Norte',filial:'Córdoba',ucc:true,procedencia:true,promotion:'1',option5:true}));
  assert.equal(q.status,'ok');
  approx(q.timeline[0].uccRate,.15);
  assert.ok(q.timeline[0].commercialRate<=.85);
  assert.ok(q.timeline[0].preGaf<q.nominalAdjustedPrice);
  assert.match(E.validateClient(baseClient({region:'AMBA',filial:'CABA',ucc:true}))||'',/UCC/i);
}

// Regresión V2.1: nunca se exponen cuotas negativas; si aportes cubren todo, el valor es $0.
{
  const q=E.quote('BRONCE',baseClient({receiptContribution:500000}));
  assert.equal(q.status,'ok');
  assert.equal(q.finalPrice,0);
  assert.equal(q.regularPrice,0);
  assert.ok(q.timeline.every(m=>m.price>=0&&m.preGaf>=0));
}

// Regresión V2.1: no se redondean aportes durante el cálculo interno.
{
  const expected=29277.756405000004;
  const actual=E.payrollContribution(12345.67);
  assert.ok(Math.abs(actual-expected)<1e-9,`Esperado precisión completa ${expected}, recibido ${actual}`);
  assert.notEqual(actual,E.round2(actual));
}

// Opción 6 / 4+6 queda deliberadamente fuera hasta confirmar requisito real de medio de pago.
{
  const values=E.strategicEligibility(baseClient({procedencia:true})).map(x=>x.value);
  assert.ok(!values.includes('4+6'));
  assert.ok(!values.includes('6'));
}

// El cap comercial de Excel sigue siendo 85%.
approx(E.DATA.discountCap,.85);

// Regresión documental V2.1: la vigencia visible debe ser 7 días hábiles, no 72 hs.
{
  const files=['../index.html','../js/app-v2.js','../js/quote-v2.js'];
  const joined=files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
  assert.match(joined,/7 días hábiles/);
  assert.doesNotMatch(joined,/72\s*hs/i);
  assert.doesNotMatch(joined,/VALIDITY_HOURS/);
}

console.log('OK - motor Medifé v2.1: auditoría fina y regresiones validadas');