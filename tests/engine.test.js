const assert=require('node:assert/strict');
require('../js/data-core.js');
require('../js/tariffs-amba.js');
require('../js/tariffs-norte.js');
require('../js/tariffs-sur.js');
require('../js/tariffs-patagonia.js');
require('../js/tariffs-bahia-mdq.js');
const E=require('../js/engine.js');
const D=globalThis.MEDIFE_DATA;
const T=(region,key,category,plan)=>D.tariffs[region][key][category==='Obligatorio'?0:1][D.planNames.indexOf(plan)];
const approx=(a,b,t=0.02)=>assert.ok(Math.abs(a-b)<=t,`Esperado ${b}, recibido ${a}`);
const baseClient=(over={})=>({
  name:'Prueba',dni:'',region:'AMBA',category:'Obligatorio',paymentMethod:'TC',procedencia:false,exAssociate:false,
  age:35,hasPartner:false,partnerAge:0,childrenAges:[],contributionSource:'relacion',receiptContribution:30000,
  monotributoCategory:'A',unifyPartnerContribution:false,partnerContributionSource:'relacion',partnerReceiptContribution:0,
  partnerMonotributoCategory:'A',promotion:'none',option5:false,...over
});

approx(E.payrollContribution(30000),(1000000*0.0255+1000000*0.051)*0.93);

{
  const c=baseClient({age:25});
  const q=E.quote('BRONCE CLASSIC',c);assert.equal(q.status,'ok');
  const list=T('AMBA','TITULAR  00-25','Obligatorio','BRONCE CLASSIC');
  approx(q.youngDiscount,list*.26);approx(q.childDiscount,0);
  approx(q.finalPrice,Math.max(0,list*(1-.26)-E.payrollContribution(30000)));
}

{
  const c=baseClient({age:25,childrenAges:[10]});
  const q=E.quote('BRONCE CLASSIC',c);assert.equal(q.status,'ok');
  const adult=T('AMBA','TITULAR  00-25','Obligatorio','BRONCE CLASSIC');
  const child=T('AMBA','HIJO (2 a 20)','Obligatorio','BRONCE CLASSIC');
  approx(q.childDiscount,child*.45);approx(q.youngDiscount,0);
  approx(q.finalPrice,Math.max(0,adult+child-child*.45-E.payrollContribution(30000)));
}

{
  const c=baseClient({region:'Sur',age:25,childrenAges:[8],contributionSource:'monotributo',monotributoCategory:'D'});
  const q=E.quote('BRONCE',c);assert.equal(q.status,'ok');
  const adult=T('Sur','TITULAR  00-25','Obligatorio','BRONCE');
  const child=T('Sur','HIJO 1','Obligatorio','BRONCE');
  approx(q.childDiscount,child*.55);approx(q.youngDiscount,adult*.26);
  approx(q.contribution,D.monotributo.D);
}

{
  const c=baseClient({region:'Sur',category:'Voluntario',age:40,contributionSource:null,receiptContribution:0});
  const q=E.quote('PLATA',c);assert.equal(q.status,'ok');
  const list=T('Sur','TITULAR  36-40','Voluntario','PLATA');
  approx(q.timeline[0].totalRate,.10);approx(q.finalPrice,list*.90*1.105);
  approx(q.timeline[6].price,list*1.105);
}

{
  const c=baseClient({category:'Voluntario',age:35,contributionSource:null,receiptContribution:0,promotion:'1'});
  const q=E.quote('BRONCE',c);assert.equal(q.status,'ok');
  approx(q.timeline[0].totalRate,.30);approx(q.timeline[2].totalRate,.30);approx(q.timeline[3].totalRate,.20);
}

{
  const c=baseClient({procedencia:true,promotion:'1',option5:true});
  const q=E.quote('PLATA',c);assert.equal(q.status,'ok');approx(q.timeline[0].totalRate,.50);
}

{
  const c=baseClient({procedencia:true,promotion:'4+6',paymentMethod:'TC',age:35});
  const q=E.quote('PLATA',c);assert.equal(q.status,'ok');assert.equal(q.timeline.length,24);
  approx(q.timeline[0].strategicRate,.20);approx(q.timeline[11].strategicRate,.20);approx(q.timeline[12].strategicRate,.20);approx(q.timeline[23].strategicRate,.20);
}

{
  const c=baseClient({age:30,promotion:'1'});const q=E.quote('INDIE',c);assert.equal(q.status,'ok');
  approx(q.timeline[0].strategicRate,0);approx(q.timeline[0].tacticalRate,.20);
  const outside=E.quote('INDIE',baseClient({region:'Sur'}));assert.equal(outside.status,'unavailable');
}

{
  const c=baseClient({hasPartner:true,partnerAge:34,unifyPartnerContribution:true,partnerContributionSource:'monotributo',partnerMonotributoCategory:'F'});
  approx(E.totalContribution(c),E.payrollContribution(30000)+D.monotributo.F);
}

{
  const c=baseClient({age:25,childrenAges:[10],exAssociate:true,promotion:'7'});
  const q=E.quote('PLATA',c);assert.equal(q.status,'ok');
  approx(q.childDiscount,0);approx(q.youngDiscount,0);assert.equal(q.tactical,null);
  approx(q.timeline[0].totalRate,.25);
}

console.log('OK - motor Medifé: 10 escenarios validados');
