const assert=require('node:assert/strict');
const GEO=require('../js/geography.js');
for(const file of ['data-core','rules-v2','tariffs-amba','tariffs-norte','tariffs-sur','tariffs-patagonia','tariffs-bahia-mdq'])require(`../js/${file}.js`);
const E=require('../js/engine-v2.js');
const base={province:'CABA',geographyZone:'AMBA',region:'AMBA',filial:'CABA',locality:'CABA',noaProvince:'',category:'Voluntario',age:35,childrenAges:[],hasPartner:false,promotion:'none',gaf:'none',ucc:false};
assert.equal(GEO.provinces.length,24);
assert.equal(new Set(GEO.provinces.map(p=>p.value)).size,24);
assert.equal(GEO.validate(base),null);
assert.equal(E.quote('PLATA',base).status,'ok');
assert.ok(GEO.validate({...base,province:''}));
assert.ok(GEO.validate({...base,province:'Santa Fe'}),'no puede reutilizar AMBA');
assert.ok(GEO.validate({...base,region:'Norte'}),'no puede alterar la tarifa calculada');
assert.deepEqual(GEO.province('Buenos Aires').zones.map(z=>z.region),['AMBA','Bahía/MDQ','Sur','Norte']);
assert.ok(!GEO.zone('Buenos Aires','AMBA').filials.some(f=>f.value==='CABA'));
const sf={...base,province:'Santa Fe',geographyZone:'Norte',region:'Norte',filial:'Santa Fe',locality:'Santa Fe capital',category:'Obligatorio',contributionSource:'relacion',receiptContribution:30000};
assert.equal(E.validateClient(sf),null);
assert.equal(E.quote('PLATA',sf).filialRate,.05);
const rosario={...sf,filial:'Rosario',locality:'Rosario'};
assert.equal(E.validateClient(rosario),null);
assert.equal(E.quote('PLATA',rosario).filialRate,0);
const reconquista={...sf,filial:'__reconquista__',locality:'Reconquista'};
assert.equal(E.validateClient(reconquista),null);
assert.equal(E.quote('PLATA',reconquista).filialRate,0,'Reconquista no hereda el 5% de filial Santa Fe');
assert.ok(E.validateClient({...sf,locality:GEO.OTHER}));
const tucuman={...sf,province:'Tucumán',filial:'Noa',locality:'San Miguel de Tucumán',noaProvince:'Tucumán'};
assert.equal(E.validateClient(tucuman),null);
assert.equal(E.quote('PLATA',tucuman).filialRate,.20);
assert.ok(E.validateClient({...tucuman,noaProvince:'Salta'}));
for(const province of ['Salta','Jujuy','Formosa','San Luis','Santiago del Estero'])assert.match(E.validateClient({...base,province}),/suspendida/);
for(const province of ['Catamarca','Chaco','Entre Ríos'])assert.ok(E.validateClient({...base,province}));
const santaRosa={...base,province:'La Pampa',geographyZone:'Sur',region:'Sur',filial:'__pampa_sur__',locality:'Santa Rosa',age:32};
const trenque={...santaRosa,province:'Buenos Aires',filial:'__interior__',locality:'Trenque Lauquen'};
for(const client of [santaRosa,trenque]){
  assert.equal(E.validateClient(client),null);
  const q=E.quote('PLATA',client);
  assert.equal(q.status,'ok');
  // Septiembre 2026: Sur, Voluntario, titular 26-35, Plata; IVA 10,5%.
  assert.ok(Math.abs(q.listPrice-305581.6407)<.02);
  assert.equal(q.finalPrice,337667.71);
  assert.equal(q.filialRate,0);
  assert.equal(E.quote('ORO',{...client,age:40}).tactical,null,'no se hereda el táctico Mendoza/Mercedes');
  assert.equal(E.quote('PLATA',{...client,age:40}).tactical.rate,.10,'se conserva el táctico general Sur');
  assert.equal(E.quote('BRONCE',{...client,category:'Obligatorio',contributionSource:'relacion',receiptContribution:30000}).tactical.rate,.05);
  assert.ok(E.validateClient({...client,region:'Norte'}),'la ruta no permite manipular su tarifa');
  assert.ok(E.validateClient({...client,filial:'Mercedes'}),'no admite una filial ajena al recorrido');
  assert.ok(E.validateClient({...client,locality:'Mendoza capital'}),'el domicilio sigue validado');
  const legacy={...client};delete legacy.province;
  assert.ok(E.validateClient(legacy),'una filial no canónica solo se acepta dentro de un recorrido documentado');
}
assert.equal(E.quote('PLATA',santaRosa).finalPrice,E.quote('PLATA',trenque).finalPrice);
assert.equal(GEO.filialLabel(santaRosa),'Santa Rosa');
assert.equal(GEO.pricingFilial(santaRosa),'');
let active=0,tariffOnly=0,suspended=0;
for(const pr of GEO.provinces)for(const zo of pr.zones)for(const fi of zo.filials)for(const locality of fi.localities){
  const c={...base,province:pr.value,geographyZone:zo.value,region:zo.region,filial:fi.value,locality,noaProvince:fi.value==='Noa'?pr.value:''};
  const error=E.validateClient(c);
  if(fi.status==='active'){
    assert.equal(error,null,`${pr.value} / ${fi.value} / ${locality}`);
    assert.ok(E.DATA.filialsByRegion[zo.region].includes(fi.value));
    const legacy={...c};delete legacy.province;delete legacy.geographyZone;delete legacy.locality;
    for(const plan of E.PLAN_ORDER){assert.deepEqual(E.quote(plan,c),E.quote(plan,legacy),'la geografía no altera importes ni beneficios');}
    active++;
  }else if(fi.status==='tariff-only'){
    assert.equal(error,null,`${pr.value} / ${fi.label} / ${locality}`);
    for(const plan of E.PLAN_ORDER){
      const q=E.quote(plan,c);
      assert.notEqual(q.status,'invalid');
      if(q.status==='ok')assert.equal(q.filialRate,0);
    }
    assert.equal(GEO.pricingFilial(c),'');
    tariffOnly++;
  }else{assert.ok(error,'se conservan las suspensiones documentadas');suspended++;}
}
console.log(`OK - geografía: 24 jurisdicciones, ${active} recorridos con filial, ${tariffOnly} con tarifa regional, ${suspended} suspendidos; Santa Rosa/Trenque contra tarifa Excel y sin descuentos ajenos`);
