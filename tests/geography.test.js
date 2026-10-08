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
assert.ok(E.validateClient({...sf,filial:'__reconquista__',locality:'Reconquista'}));
assert.ok(E.validateClient({...sf,locality:GEO.OTHER}));
const tucuman={...sf,province:'Tucumán',filial:'Noa',locality:'San Miguel de Tucumán',noaProvince:'Tucumán'};
assert.equal(E.validateClient(tucuman),null);
assert.equal(E.quote('PLATA',tucuman).filialRate,.20);
assert.ok(E.validateClient({...tucuman,noaProvince:'Salta'}));
for(const province of ['Salta','Jujuy','Formosa','San Luis','Santiago del Estero'])assert.match(E.validateClient({...base,province}),/suspendida/);
for(const province of ['Catamarca','Chaco','Entre Ríos','La Pampa','La Rioja'])assert.ok(E.validateClient({...base,province}));
let active=0,pending=0;
for(const pr of GEO.provinces)for(const zo of pr.zones)for(const fi of zo.filials)for(const locality of fi.localities){
  const c={...base,province:pr.value,geographyZone:zo.value,region:zo.region,filial:fi.value,locality,noaProvince:fi.value==='Noa'?pr.value:''};
  const error=E.validateClient(c);
  if(fi.status==='active'){
    assert.equal(error,null,`${pr.value} / ${fi.value} / ${locality}`);
    assert.ok(E.DATA.filialsByRegion[zo.region].includes(fi.value));
    const legacy={...c};delete legacy.province;delete legacy.geographyZone;delete legacy.locality;
    for(const plan of E.PLAN_ORDER){assert.deepEqual(E.quote(plan,c),E.quote(plan,legacy),'la geografía no altera importes ni beneficios');}
    active++;
  }else{assert.ok(error,'el motor bloquea recorridos pendientes/suspendidos');pending++;}
}
console.log(`OK - geografía: 24 jurisdicciones, ${active} recorridos confirmados, ${pending} pendientes/suspendidos; equivalencia de tarifas y beneficios en todos los planes`);
