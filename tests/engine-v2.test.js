const assert=require('node:assert/strict');
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
// Valores tomados del tarifario Excel cargado: lista 193.137,529; segmento joven 26%; aporte computable 71.145.
{
  const q=E.quote('BRONCE CLASSIC',baseClient({age:25}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,193137.529);
  approx(q.youngDiscount,50215.76);
  approx(q.contribution,71145);
  approx(q.finalPrice,71776.77);
}

// Golden case 2: en AMBA, con hijo, el ajuste hijos 45% desplaza segmento joven.
{
  const q=E.quote('BRONCE CLASSIC',baseClient({age:25,childrenAges:[10]}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,386275.058);
  approx(q.childDiscount,86911.89);
  approx(q.youngDiscount,0);
  approx(q.finalPrice,228218.17);
}

// Golden case 3: Interior, hijo 21-29 es HIJO MAYOR A CARGO y NO recibe ajuste hijos 55%.
{
  const q=E.quote('BRONCE',baseClient({region:'Sur',filial:'Mendoza',age:25,childrenAges:[22]}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,611860.9075);
  approx(q.childDiscount,0);
  approx(q.youngDiscount,63764.23);
  approx(q.finalPrice,476951.68);
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

// Opción 7 es exclusiva frente a tácticos/otros comerciales, pero conserva ajustes permanentes.
{
  const q=E.quote('PLATA',baseClient({age:25,childrenAges:[10],exAssociate:true,promotion:'7'}));
  assert.equal(q.status,'ok');
  assert.ok(q.childDiscount>0,'Opción 7 no debe borrar ajuste hijos');
  assert.equal(q.tactical,null);
  approx(q.timeline[0].strategicRate,.25);
}

// GAF se aplica después de aportes. Tributo Simple 10%: (227.220,3736 - 71.145) * 90%.
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

// UCC es acumulable, previo a aportes/IVA y fuera del cap comercial; solo Norte.
{
  const q=E.quote('PLATA',baseClient({region:'Norte',filial:'Córdoba',ucc:true,procedencia:true,promotion:'1',option5:true}));
  assert.equal(q.status,'ok');
  approx(q.timeline[0].uccRate,.15);
  assert.ok(q.timeline[0].commercialRate<=.85);
  assert.ok(q.timeline[0].preGaf<q.nominalAdjustedPrice);
  assert.match(E.validateClient(baseClient({region:'AMBA',filial:'CABA',ucc:true}))||'',/UCC/i);
}

// Opción 6 / 4+6 queda deliberadamente fuera hasta confirmar requisito real de medio de pago.
{
  const values=E.strategicEligibility(baseClient({procedencia:true})).map(x=>x.value);
  assert.ok(!values.includes('4+6'));
  assert.ok(!values.includes('6'));
}

// El cap comercial de Excel sigue siendo 85%.
approx(E.DATA.discountCap,.85);

console.log('OK - motor Medifé v2: reglas críticas y golden cases validados');
