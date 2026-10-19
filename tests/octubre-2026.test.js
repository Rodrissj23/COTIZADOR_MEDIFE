const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=require('./fixtures/octubre-2026.json');
for(const f of ['data-core','rules-v2','tariffs-amba','tariffs-norte','tariffs-sur','tariffs-patagonia','tariffs-bahia-mdq'])require(`../js/${f}.js`);
const E=require('../js/engine-v2.js');
const sandbox={window:{MEDIFE_ENGINE:E},document:{querySelector:()=>null,createElement:()=>({}),documentElement:{dataset:{}}},Intl,Number,Math,Set,JSON,String,Boolean};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/configurator-v3.js'),'utf8'),sandbox);
const V=sandbox.window.MEDIFE_CONFIGURATOR;
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.011,`${label}: ${a} != ${b}`);
const round=v=>Math.round((Math.max(0,v)+Number.EPSILON)*100)/100;
assert.deepEqual(E.DATA.tariffs,source.tariffs,'1414 importes del Excel');
assert.equal(E.DATA.version,'Octubre 2026');
assert.equal(E.DATA.remunerationCap,source.remunerationCap);
assert.deepEqual(E.DATA.monotributo,source.monotributo);
function band(age){return age<=25?'00-25':age<=35?'26-35':age<=40?'36-40':age<=50?'41-50':age<=60?'51-60':age<=65?'61-65':'66-00';}
function adult(age,partner=false){const b=band(age);return partner?`ESPOSO (A) ${b}`:b==='61-65'?'TITULAR L 61-65':`TITULAR  ${b}`;}
function child(region,age,index){return region==='AMBA'?(age<=1?'HIJO (0 a 1)':age<=20?'HIJO (2 a 20)':'HIJO AD. (21 a 29)'):age>20?'HIJO MAYOR A CARGO':index===0?'HIJO 1':'HIJO 2';}
const payroll=item=>{const base=item*100/3;return (Math.min(base,source.remunerationCap)*.0255+base*.051)*.93;};
const filialByRegion={'AMBA':'CABA','Norte':'Córdoba','Sur':'Mendoza','Patagonia':'Comahue','Bahía/MDQ':'Bahía Blanca'};
function client(region,category,age,extra={}){return {name:'QA Octubre',region,filial:filialByRegion[region],category,age,hasPartner:false,partnerAge:40,childrenAges:[],noaProvince:'Tucumán',paymentMethod:'TC',procedencia:true,exAssociate:true,contributionSource:'relacion',receiptContribution:30000,unifyPartnerContribution:false,gaf:'none',ucc:false,promotion:'none',option5:false,...extra};}
const value=(c,key,plan)=>source.tariffs[c.region][key][c.category==='Obligatorio'?0:1][E.DATA.planNames.indexOf(plan)];
let cases=0;
for(const region of Object.keys(source.tariffs))for(const category of ['Obligatorio','Voluntario'])for(const age of [18,25,26,29,35,36,40,41,50,51,60,61,65,66])for(const plan of E.PLAN_ORDER){
  if(plan==='INDIE'&&region!=='AMBA')continue;
  for(const extra of [{},{hasPartner:true,partnerAge:40},{childrenAges:[0]},{childrenAges:[10,24]},{hasPartner:true,partnerAge:32,childrenAges:[0,10,29]}]){
    const c=client(region,category,age,extra);
    let list=value(c,adult(c.age),plan);
    if(c.hasPartner)list+=value(c,adult(c.partnerAge,true),plan);
    const children=c.childrenAges.map((a,i)=>({age:a,price:value(c,child(region,a,i),plan)}));
    list+=children.reduce((sum,m)=>sum+m.price,0);
    const q=V.manualQuote(plan,c,V.blankSelection());
    assert.equal(q.status,'ok',`${region}/${category}/${age}/${plan}`);
    near(q.listPrice,list,'Lista por integrante');
    const net=base=>round(category==='Voluntario'?base*1.105:base-payroll(30000));
    near(q.finalPrice,net(list),'Base sin beneficios');
    if(plan!=='INDIE'){
      const eligible=children.filter(m=>region==='AMBA'||m.age<=20);
      const reduction=eligible.reduce((sum,m)=>sum+m.price,0)*(region==='AMBA'?.45:.55);
      if(reduction){
        const adjusted=V.manualQuote(plan,c,{...V.blankSelection(),child:true});
        assert.equal(adjusted.status,'ok');near(adjusted.finalPrice,net(list-reduction),'Hijos');
      }
    }
    cases++;
  }
}
// Contrast tactical eligibility against the rows of Políticas Comerciales,
// including age boundaries and branch exceptions before regional defaults.
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
function matches(condition,c){const k=norm(condition),f=norm(c.filial);return k==='AMBA'?c.region==='AMBA':k==='GBA'?f.startsWith('GBA '):k==='SUR'?c.region==='Sur':k==='PATAGONIA'?c.region==='Patagonia':k==='BAHIA/MDQ'?c.region==='Bahía/MDQ':k.split('/').includes(f);}
function expectedTactical(plan,c){const found=source.tacticalSource.filter(({rule:r})=>r.region===c.region&&r.category===c.category&&r.planRates[plan]&&c.age>=r.minAge&&c.age<=r.maxAge&&matches(r.condition,c));found.sort((a,b)=>Number(['AMBA','SUR','PATAGONIA','BAHIA/MDQ'].includes(norm(a.rule.condition)))-Number(['AMBA','SUR','PATAGONIA','BAHIA/MDQ'].includes(norm(b.rule.condition))));return found[0]?.rule;}
let tacticals=0;
for(const [region,filials] of Object.entries(E.DATA.filialsByRegion))for(const filial of filials)for(const category of ['Obligatorio','Voluntario'])for(const age of [18,25,26,35,36,40,41,50,51,60,61,65,66])for(const plan of E.PLAN_ORDER){
  if(plan==='INDIE'&&region!=='AMBA')continue;
  const c=client(region,category,age,{filial});const expected=expectedTactical(plan,c);const actual=E.tacticalFor(plan,c);
  assert.equal(actual?.rate||0,expected?.planRates[plan]||0,`${filial}/${category}/${age}/${plan}`);
  if(expected){
    const q=V.manualQuote(plan,c,{...V.blankSelection(),tactical:true});assert.equal(q.status,'ok');
    const list=value(c,adult(age),plan),rate=expected.planRates[plan];
    for(const month of [1,6,7,12,13].filter(m=>m<=q.timeline.length)){const base=list*(1-(month<=expected.months?rate:0));near(q.timeline[month-1].price,round(category==='Voluntario'?base*1.105:base-payroll(30000)),`Táctico mes ${month}`);}
  }
  tacticals++;
}
for(const item of [0,30000,source.remunerationCap*.03-.01,source.remunerationCap*.03,source.remunerationCap*.03+.01,200000])near(E.payrollContribution(item),payroll(item),'Tope aporte octubre');
assert.equal(E.PLAN_ORDER.includes('MEDIFÉ+'),false);
console.log(`OK Octubre 2026: 1414 celdas, ${cases} familias, ${tacticals} combinaciones tácticas, IVA, aportes, hijos y límites.`);
