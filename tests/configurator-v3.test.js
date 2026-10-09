const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
require('../js/geography.js');

for(const file of ['data-core','rules-v2','tariffs-amba','tariffs-norte','tariffs-sur','tariffs-patagonia','tariffs-bahia-mdq'])require(`../js/${file}.js`);
const engine=require('../js/engine-v2.js');
const sandbox={
  window:{MEDIFE_ENGINE:engine},
  document:{querySelector:()=>null,createElement:()=>({}),documentElement:{dataset:{}}},
  Intl,Number,Math,Set,JSON,String,Boolean
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/configurator-v3.js'),'utf8'),sandbox);
const {manualQuote,blankSelection,selectionError,context,bestSelection}=sandbox.window.MEDIFE_CONFIGURATOR;
const client=(more={})=>({
  name:'QA pago',region:'AMBA',filial:'CABA',category:'Obligatorio',paymentMethod:'TC',
  age:35,hasPartner:false,partnerAge:0,childrenAges:[],procedencia:true,exAssociate:false,
  gaf:'none',uccEligible:false,contributionSource:'relacion',receiptContribution:30000,
  promotion:'none',option5:false,...more
});
const option4={...blankSelection(),strategic:'4'};
const combined={...option4,option6:true};

for(const [category,rate] of [['Obligatorio',.20],['Voluntario',.15]]){
  const c=client({category,contributionSource:category==='Obligatorio'?'relacion':null});
  const alone=manualQuote('PLATA',c,option4);
  const q=manualQuote('PLATA',c,combined);
  assert.equal(q.status,'ok');
  assert.equal(q.timeline.length,24);
  assert.equal(q.finalPrice,alone.finalPrice,'Opción 6 no altera el primer mes');
  assert.equal(q.timeline[0].strategicRate,rate);
  assert.equal(q.timeline[0].option6Rate,0);
  assert.equal(q.timeline[11].commercialRate,rate);
  assert.equal(q.timeline[12].strategicRate,0);
  assert.equal(q.timeline[12].option6Rate,rate);
  assert.equal(q.timeline[23].commercialRate,rate);
  assert.ok(q.timeline[12].price<q.regularPrice);
}

for(const changes of [{paymentMethod:'CBU'},{paymentMethod:null},{age:61},{hasPartner:true,partnerAge:61},{procedencia:false}]){
  const c=client(changes);
  assert.equal(manualQuote('PLATA',c,combined).status,'invalid');
  assert.match(selectionError(context('PLATA',c),c,combined),changes.procedencia===false?/promoción estratégica/:/Opción 6/);
}
assert.equal(manualQuote('PLATA',client(),{...combined,strategic:'1'}).status,'invalid');
assert.equal(manualQuote('INDIE',client(),combined).status,'invalid');
assert.equal(bestSelection('PLATA',client()).quote.status,'ok');

for(const geography of [
  {province:'La Pampa',geographyZone:'Sur',filial:'__pampa_sur__',locality:'Santa Rosa'},
  {province:'Buenos Aires',geographyZone:'Sur',filial:'__interior__',locality:'Trenque Lauquen'}
]){
  const c=client({...geography,region:'Sur',noaProvince:'',category:'Voluntario',age:32,contributionSource:null,receiptContribution:0});
  const q=manualQuote('PLATA',c);
  assert.equal(q.status,'ok');
  assert.equal(q.finalPrice,337667.71);
  const oro=context('ORO',{...c,age:40});
  assert.equal(oro.filial,null);
  assert.equal(oro.tactical,null);
  assert.equal(manualQuote('ORO',{...c,age:40},{...blankSelection(),tactical:true}).status,'invalid');
  assert.equal(manualQuote('PLATA',c,{...blankSelection(),filial:true}).status,'invalid');
  assert.equal(context('PLATA',{...c,age:40}).tactical.rate,.10);
  const oblig=client({...geography,region:'Sur',noaProvince:'',age:32});
  assert.equal(manualQuote('PLATA',oblig).finalPrice,212189.49);
}

{
  const c=client({province:'Entre Ríos',geographyZone:'Norte',region:'Norte',filial:'__parana__',locality:'Paraná',noaProvince:'',category:'Voluntario',age:32});
  assert.equal(manualQuote('PLATA',c).finalPrice,338719.11);
  assert.equal(context('PLATA',{...c,category:'Obligatorio'}).filial,null);
  assert.equal(manualQuote('PLATA',{...c,category:'Obligatorio'},{...blankSelection(),filial:true}).status,'invalid');
}
console.log('OK - configurador: Opción 6 y cotización regional Santa Rosa/Trenque/Paraná con selección válida de beneficios');
