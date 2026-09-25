const assert=require('node:assert/strict');
require('../js/data-core.js');
require('../js/rules-v2.js');
require('../js/tariffs-amba.js');
require('../js/tariffs-norte.js');
require('../js/tariffs-sur.js');
require('../js/tariffs-patagonia.js');
require('../js/tariffs-bahia-mdq.js');
const E=require('../js/engine-v2.js');

// Valores esperados derivados directamente de Cotizador Individual_202609_Provisorio (3).xlsx.
// Tolerancia de 2 centavos: las matrices JS conservan 4 decimales de la tarifa Excel.
const approx=(actual,expected,t=.02,msg='')=>assert.ok(Math.abs(actual-expected)<=t,`${msg} esperado ${expected}, recibido ${actual}`);
const month=(q,n,expected)=>approx(q.timeline[n-1].price,expected,.02,`${q.plan} mes ${n}`);
const base=(over={})=>({
  name:'QA Excel',dni:'',region:'AMBA',filial:'CABA',noaProvince:'',category:'Obligatorio',paymentMethod:null,
  procedencia:false,exAssociate:false,gaf:'none',ucc:false,age:35,hasPartner:false,partnerAge:0,childrenAges:[],
  contributionSource:'relacion',receiptContribution:30000,monotributoCategory:'A',unifyPartnerContribution:false,
  partnerContributionSource:'relacion',partnerReceiptContribution:0,partnerMonotributoCategory:'A',promotion:'none',option5:false,
  ...over
});

// 1. AMBA: segmento joven 25 años + aporte relación dependencia.
{
  const q=E.quote('BRONCE CLASSIC',base({age:25}));
  assert.equal(q.status,'ok');
  approx(q.listPrice,193137.529,.02);
  approx(q.youngDiscount,50215.76,.02);
  approx(q.contribution,71145,.02);
  month(q,1,71776.77);
}

// 2. AMBA: ajuste hijos 45% desplaza segmento joven.
{
  const q=E.quote('BRONCE CLASSIC',base({age:25,childrenAges:[10]}));
  approx(q.childDiscount,86911.89,.02);
  approx(q.youngDiscount,0,.001);
  month(q,1,228218.17);
}

// 3. AMBA Voluntario: Oro CABA, táctico 15% + Opción 1 + IVA.
{
  const q=E.quote('ORO',base({category:'Voluntario',age:40,promotion:'1',contributionSource:null,receiptContribution:0}));
  approx(q.tactical.rate,.15,.0001);
  month(q,1,282608.59); month(q,3,282608.59); month(q,4,333991.98);
  month(q,6,385375.36); month(q,7,462450.43); month(q,8,513833.81);
}

// 4. INDIE: Opción 7 no aplica y no debe borrar su táctico propio 20%.
{
  const q=E.quote('INDIE',base({age:30,promotion:'7',exAssociate:true}));
  approx(q.tactical.rate,.20,.0001);
  approx(q.timeline[0].strategicRate,0,.0001);
  month(q,1,45554.09); month(q,12,45554.09);
}

// 5. Norte Córdoba: filial 10% + Op1 + Op5 + UCC + aportes.
{
  const q=E.quote('PLATA',base({region:'Norte',filial:'Córdoba',age:35,promotion:'1',procedencia:true,option5:true,ucc:true}));
  approx(q.filialRate,.10,.0001); approx(q.uccRate,.15,.0001);
  month(q,1,0); month(q,2,0); month(q,3,41217.84); month(q,6,83353.91); month(q,7,97399.26); month(q,8,139535.33);
}

// 6. Norte Corrientes: descuento filial 25% + Opción 2.
{
  const q=E.quote('ORO',base({region:'Norte',filial:'Corrientes',age:40,promotion:'2'}));
  approx(q.filialRate,.25,.0001);
  month(q,1,92706.03); month(q,6,92706.03); month(q,7,165528.70); month(q,10,201940.04);
}

// 7. Norte Voluntario Misiones: táctico 20% + Opción 3 + Prestadores Norte.
{
  const q=E.quote('BRONCE',base({region:'Norte',filial:'Misiones',category:'Voluntario',age:40,promotion:'3',gaf:'prestadores_norte',contributionSource:null,receiptContribution:0}));
  approx(q.tactical.rate,.20,.0001); approx(q.gafRate,.15,.0001);
  month(q,1,192949.67); month(q,6,192949.67); month(q,7,252318.80); month(q,11,296845.64);
}

// 8. Norte Voluntario NOA: táctico 15% + Tributo Simple.
{
  const q=E.quote('PLATA',base({region:'Norte',filial:'Noa',noaProvince:'Tucumán',category:'Voluntario',age:60,gaf:'tributo_simple',contributionSource:null,receiptContribution:0}));
  approx(q.tactical.rate,.15,.0001);
  month(q,1,435253.20); month(q,6,435253.20); month(q,7,512062.59);
}

// 9. Sur San Juan: Oro táctico 30% + Opción 1.
{
  const q=E.quote('ORO',base({region:'Sur',filial:'San Juan',age:40,promotion:'1'}));
  approx(q.tactical.rate,.30,.0001);
  month(q,1,20732.90); month(q,3,75859.64); month(q,6,130986.38); month(q,7,241239.86); month(q,8,296366.61);
}

// 10. Sur Voluntario Mendoza: Oro táctico 15% + Opción 2 + ACIPAN.
{
  const q=E.quote('ORO',base({region:'Sur',filial:'Mendoza',category:'Voluntario',age:40,promotion:'2',gaf:'acipan',contributionSource:null,receiptContribution:0}));
  approx(q.tactical.rate,.15,.0001); approx(q.gafRate,.10,.0001);
  month(q,1,240907.79); month(q,4,328510.62); month(q,7,394212.74); month(q,10,438014.16);
}

// 11. Patagonia Obligatorio: Oro táctico 15% + Opción 3 + Ex INVAP.
{
  const q=E.quote('ORO',base({region:'Patagonia',filial:'Comahue',age:50,promotion:'3',gaf:'ex_invap'}));
  approx(q.tactical.rate,.15,.0001); approx(q.gafRate,.30,.0001);
  month(q,1,144171.13); month(q,6,144171.13); month(q,7,188934.04); month(q,12,248617.92);
}

// 12. Patagonia Voluntario: Comahue Plata táctico 15% + Op1 + Cámara Bariloche 15,75%.
{
  const q=E.quote('PLATA',base({region:'Patagonia',filial:'Comahue',category:'Voluntario',age:40,promotion:'1',gaf:'camara_bariloche',contributionSource:null,receiptContribution:0}));
  approx(q.tactical.rate,.15,.0001); approx(q.gafRate,.1575,.0001);
  month(q,1,222174.15); month(q,4,262569.45); month(q,7,363557.70); month(q,8,403953.00);
}

// 13. Bahía/MDQ Obligatorio: Oro táctico 30% + Opción 4.
{
  const q=E.quote('ORO',base({region:'Bahía/MDQ',filial:'Bahía Blanca',age:40,promotion:'4',procedencia:true}));
  approx(q.tactical.rate,.30,.0001);
  month(q,1,112610.80); month(q,6,112610.80); month(q,7,222864.28); month(q,12,222864.28);
}

// 14. Bahía/MDQ Voluntario: Plata táctico 10% + Prestadores Sur.
{
  const q=E.quote('PLATA',base({region:'Bahía/MDQ',filial:'Mar del Plata',category:'Voluntario',age:65,gaf:'prestadores_sur',contributionSource:null,receiptContribution:0}));
  approx(q.tactical.rate,.10,.0001); approx(q.gafRate,.15,.0001);
  month(q,1,598921.73); month(q,6,598921.73); month(q,7,665468.59);
}

// 15. Interior: pareja joven + hijo 10 + hijo mayor a cargo 22 + unificación de aportes.
{
  const q=E.quote('BRONCE CLASSIC',base({region:'Sur',filial:'Mendoza',age:25,hasPartner:true,partnerAge:25,childrenAges:[10,22],unifyPartnerContribution:true,partnerContributionSource:'monotributo',partnerMonotributoCategory:'D'}));
  approx(q.childDiscount,111955.32,.02); approx(q.youngDiscount,100556.23,.02); approx(q.contribution,99543.07,.02);
  month(q,1,599448.86);
}

// 16. AMBA Voluntario: un hijo activa ajuste y suprime segmento joven de todo el GF.
{
  const q=E.quote('BRONCE CLASSIC',base({category:'Voluntario',age:24,hasPartner:true,partnerAge:28,childrenAges:[10],contributionSource:null,receiptContribution:0}));
  approx(q.childDiscount,96849.12,.02); approx(q.youngDiscount,0,.001);
  month(q,1,582655.05);
}

// 17. Monotributo K + táctico Plata AMBA 41-65.
{
  const q=E.quote('PLATA',base({age:50,contributionSource:'monotributo',monotributoCategory:'K'}));
  approx(q.contribution,81731.0226,.0001); approx(q.tactical.rate,.10,.0001);
  month(q,1,205728.14);
}

// 18. Piso cero: aportes mayores a cuota luego de descuentos.
{
  const q=E.quote('BRONCE',base({age:35,receiptContribution:200000,promotion:'1'}));
  month(q,1,0);
}

// 19. Opción 7 conserva ajuste hijos; Tributo Simple vence al mes 12.
{
  const q=E.quote('PLATA',base({age:25,childrenAges:[10],promotion:'7',exAssociate:true,gaf:'tributo_simple'}));
  assert.ok(q.childDiscount>0);
  assert.equal(q.tactical,null);
  month(q,1,242469.28); month(q,12,242469.28); month(q,13,269410.31); month(q,24,269410.31);
}

// 20. Opción 7 + GAF Sur: ACIPAN termina al mes 12, Opción 7 continúa hasta 24.
{
  const q=E.quote('BRONCE CLASSIC',base({region:'Sur',filial:'Mendoza',category:'Voluntario',age:40,promotion:'7',exAssociate:true,gaf:'acipan',contributionSource:null,receiptContribution:0}));
  month(q,1,197440.35); month(q,12,197440.35); month(q,13,219378.17); month(q,24,219378.17);
}

// Validaciones de alcance operacional cerradas.
assert.equal(E.quote('INDIE',base({region:'Sur',filial:'Mendoza'})).status,'unavailable');
assert.match(E.validateClient(base({childrenAges:[30]}))||'',/0 y 29/i);
assert.ok(!E.strategicEligibility(base({procedencia:true})).some(x=>['6','4+6'].includes(x.value)));

console.log('OK - QA Excel Medifé: 20 escenarios comerciales + límites operativos validados');
