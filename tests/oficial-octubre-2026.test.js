const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const fixture=require('./fixtures/oficial-octubre-2026.json');
for(const f of ['data-core','rules-v2','tariffs-amba','tariffs-norte','tariffs-sur','tariffs-patagonia','tariffs-bahia-mdq'])require(`../js/${f}.js`);
const E=require('../js/engine-v2.js');
const sandbox={window:{MEDIFE_ENGINE:E},document:{querySelector:()=>null,createElement:()=>({}),documentElement:{dataset:{}}},Intl,Number,Math,Set,JSON,String,Boolean};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/configurator-v3.js'),'utf8'),sandbox);
const C=sandbox.window.MEDIFE_CONFIGURATOR;
const near=(actual,expected,tolerance=fixture.tolerancePesos)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
let compared=0,unavailable=0,crossPlanOnly=0;
const plans=['INDIE','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM'];
for(const c of fixture.cases){
 for(const [i,plan] of plans.entries()){
  const client={promotion:'none',gaf:'none',...c.client};
  const ctx=C.context(plan,client);
  if(plan==='INDIE'&&client.region!=='AMBA'){assert.equal(ctx.status,'unavailable');unavailable++;continue;}
  assert.equal(ctx.status,'ok',c.id);
  // El oficial cotiza todos los planes a la vez: una casilla táctica de
  // Plata/Oro demora el GAF incluso en Bronce, y Op3 lo demora en Indie.
  // Son selecciones inexistentes para esos planes en el configurador por plan.
  // Los controles GAF solo, en esta misma fuente, sí verifican esos planes.
  if(fixture.crossPlanOnly[c.id]?.includes(plan)){crossPlanOnly++;continue;}
  const sel={...C.blankSelection(),...c.selection};
  if(!ctx.child.amount)sel.child=false;
  if(!ctx.young.amount)sel.young=false;
  if(!ctx.filial)sel.filial=false;
  if(!ctx.tactical||(c.tacticalPlans&&!c.tacticalPlans.includes(plan)))sel.tactical=false;
  if(plan==='INDIE')sel.strategic='none';
  const q=C.manualQuote(plan,client,sel);
  assert.equal(q.status,'ok',`${c.id}/${plan}`);
  near(q.finalPrice,c.finals[i]);compared++;
 }
}
assert.equal(compared,105);assert.equal(unavailable,11);assert.equal(crossPlanOnly,4);
const client={region:'AMBA',filial:'GBA Sur',category:'Obligatorio',age:40,hasPartner:false,childrenAges:[],contributionSource:'relacion',receiptContribution:30000,promotion:'none',gaf:'none'};
near(E.payrollContribution(30000,'obra_social'),71145,.001);
near(E.payrollContribution(30000,'medife'),74205,.001);
near(E.totalContribution({...client,payrollOrigin:'medife',hasPartner:true,partnerAge:40,unifyPartnerContribution:true,partnerContributionSource:'relacion',partnerReceiptContribution:30000,partnerPayrollOrigin:'obra_social'}),145350,.001);
assert.match(E.validateClient({...client,payrollOrigin:'otro'}),/origen/i);
assert.throws(()=>E.payrollContribution(30000,'otro'),/Origen/);
const q=C.manualQuote('PLATA',client,{...C.blankSelection(),strategic:'3',gaf:'prestadores_amba'});
for(const month of [1,6,7,11])near(q.timeline[month-1].price,181220);
for(const month of [12,13,24,25])near(q.timeline[month-1].price,207664);
assert.equal(q.gafStartMonth,12);assert.equal(q.gafRate,0);
const legacy=E.quote('PLATA',{...client,promotion:'3',gaf:'prestadores_amba'});
assert.equal(legacy.gafStartMonth,12);assert.equal(legacy.timeline[11].gafRate,.15);
const pat=C.manualQuote('PLATA',{...client,region:'Patagonia',filial:'Comahue',category:'Voluntario'},{...C.blankSelection(),tactical:true,gaf:'camara_bariloche'});
near(pat.timeline[5].price,391055);near(pat.timeline[6].price,411830);near(pat.timeline[24].price,411830);
for(const family of [{hasPartner:true,partnerAge:23},{childrenAges:[10]}]){
 const c={...client,age:23,...family};
 assert.equal(C.context('PLATA',c).young.amount,0);
 assert.equal(C.manualQuote('PLATA',c,{...C.blankSelection(),young:true}).status,'invalid');
 assert.equal(E.quote('PLATA',c).youngDiscount,0);
 assert.equal(C.bestSelection('PLATA',c).selection.young,false);
}
const north={...client,region:'Norte',filial:'Córdoba',age:23,hasPartner:true,partnerAge:40,uccEligible:true};
assert.equal(C.context('PLATA',north).young.amount,0);
assert.equal(C.context('PLATA',north).tactical.rate,.1);
const mixed=C.manualQuote('PLATA',north,{...C.blankSelection(),filial:true});
assert.deepEqual(mixed.members.map(m=>m.age),[23,40]);
assert.deepEqual(mixed.members.map(m=>m.pricingAge),[40,40]);
assert.equal(C.manualQuote('PLATA',north,{...C.blankSelection(),ucc:true,gaf:'prestadores_norte'}).status,'invalid');
assert.match(E.validateClient({...north,ucc:true,gaf:'prestadores_norte'}),/UCC/);
console.log(`OK - 20 escenarios oficiales: ${compared} cuotas comparables; ${unavailable} Indie Interior no comercializados; ${crossPlanOnly} selecciones globales sin equivalente por plan; calendarios y elegibilidad verificados`);
