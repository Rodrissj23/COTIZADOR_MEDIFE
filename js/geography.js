/* Geografía comercial · fuentes internas revisadas el 09/10/2026.
   La región documentada permite calcular la tarifa aunque no exista una
   filial equivalente. Esa ruta no hereda beneficios exclusivos de filial. */
(() => {
  'use strict';
  const OTHER = '__other__';
  const pending = 'La región tarifaria de esta localidad todavía no está configurada.';
  const suspended = 'Esta zona figura suspendida para ventas en el listado comercial vigente.';
  const f = (value, localities, extra={}) => ({value, label:value, localities, status:'active', ...extra});
  const p = (id, label, localities, message='', status='tariff-only') => f(id, localities, {label, message, status});
  const z = (value, label, region, filials) => ({value, label, region, filials});
  const one = (region, filials) => [z(region, region, region, filials)];
  const provinces = [
    {value:'CABA', label:'Ciudad Autónoma de Buenos Aires (CABA)', zones:one('AMBA',[f('CABA',['CABA'])])},
    {value:'Buenos Aires', zones:[
      z('AMBA','AMBA · Gran Buenos Aires','AMBA',[
        f('GBA Norte',['Zona GBA Norte']), f('GBA Oeste',['Zona GBA Oeste']), f('GBA Sur',['Zona GBA Sur'])]),
      z('Bahía/MDQ','Bahía Blanca / Mar del Plata','Bahía/MDQ',[
        f('Bahía Blanca',['Bahía Blanca']), f('Mar del Plata',['Mar del Plata']),
        p('__costa__','Otras localidades de Bahía / costa',['Punta Alta','Necochea','Pinamar','Villa Gesell','Miramar','Quequén','Guaminí']),
        p('__tres_arroyos__','Tres Arroyos · suspendida',['Tres Arroyos'],suspended,'suspended')]),
      z('Sur','Interior bonaerense · Mercedes y otras localidades','Sur',[
        f('Mercedes',['Mercedes, Buenos Aires']),
        p('__interior__','Otras localidades del interior',['Azul','Chivilcoy','Olavarría','Tandil','Trenque Lauquen'])]),
      z('Norte','San Nicolás / San Pedro','Norte',[
        p('__norte_ba__','San Nicolás / San Pedro',['San Nicolás','San Pedro'])])
    ]},
    {value:'Catamarca', zones:[], message:'Catamarca todavía no tiene una región tarifaria configurada.'},
    {value:'Chaco', zones:[], message:'Chaco figura suspendida para ventas en la guía comercial disponible.'},
    {value:'Chubut', zones:one('Patagonia',[f('Patagonia Sur',['Comodoro Rivadavia','Puerto Madryn','Rawson','Trelew'])])},
    {value:'Córdoba', zones:one('Norte',[f('Córdoba',['Córdoba capital','Villa Carlos Paz'])])},
    {value:'Corrientes', zones:one('Norte',[f('Corrientes',['Corrientes capital'])])},
    // Correspondencia Norte derivada de los valores declarados por Medifé
    // ante SSSalud; evidencia en docs/parana-tariff-evidence.md.
    // La región no implica filial Santa Fe ni sus descuentos exclusivos.
    {value:'Entre Ríos', zones:one('Norte',[p('__parana__','Paraná',['Paraná'])])},
    {value:'Formosa', zones:[], message:suspended},
    {value:'Jujuy', zones:[], message:suspended},
    {value:'La Pampa', zones:one('Sur',[p('__pampa_sur__','Santa Rosa',['Santa Rosa'])])},
    {value:'La Rioja', zones:one('Sur',[p('__rioja_sur__','La Rioja',['La Rioja capital'])])},
    {value:'Mendoza', zones:one('Sur',[f('Mendoza',['Mendoza capital'])])},
    {value:'Misiones', zones:one('Norte',[f('Misiones',['Posadas'])])},
    {value:'Neuquén', zones:one('Patagonia',[
      f('Comahue',['Neuquén capital','Plottier']),
      p('Patagonia Norte','San Martín de los Andes',['San Martín de los Andes'])])},
    {value:'Río Negro', zones:one('Patagonia',[f('Patagonia Norte',['San Carlos de Bariloche'])])},
    {value:'Salta', zones:[], message:suspended},
    {value:'San Juan', zones:one('Sur',[f('San Juan',['San Juan capital'])])},
    {value:'San Luis', zones:[], message:suspended+' Villa Mercedes, San Luis, no es Mercedes, Buenos Aires.'},
    {value:'Santa Cruz', zones:one('Patagonia',[
      p('Patagonia Sur','Patagonia Austral',['Caleta Olivia','Río Gallegos'])])},
    {value:'Santa Fe', zones:one('Norte',[
      f('Santa Fe',['Santa Fe capital']), f('Rosario',['Rosario']),
      p('__reconquista__','Reconquista',['Reconquista'])])},
    {value:'Santiago del Estero', zones:[], message:suspended},
    {value:'Tierra del Fuego', zones:one('Patagonia',[
      p('Patagonia Sur','Patagonia Austral',['Ushuaia','Río Grande'])])},
    {value:'Tucumán', zones:one('Norte',[f('Noa',['San Miguel de Tucumán'])])}
  ];
  for(const province of provinces) province.label ||= province.value;
  function province(value){return provinces.find(p=>p.value===value);}
  function zone(provinceValue, zoneValue){return province(provinceValue)?.zones.find(z=>z.value===zoneValue);}
  function filial(provinceValue, zoneValue, filialValue){return zone(provinceValue,zoneValue)?.filials.find(f=>f.value===filialValue);}
  function route(client){return filial(client.province,client.geographyZone,client.filial);}
  function canQuote(fi){return fi?.status==='active'||fi?.status==='tariff-only';}
  function pricingFilial(client){
    if(!Object.prototype.hasOwnProperty.call(client,'province'))return client.filial||'';
    const fi=route(client);
    return fi?.status==='active'?fi.value:'';
  }
  function filialLabel(client){return route(client)?.label||client.filial||'';}
  function validate(client){
    const pr=province(client.province);
    if(!pr)return 'Seleccioná la provincia del domicilio del cliente.';
    if(!pr.zones.length)return pr.message || pending;
    const zo=zone(client.province,client.geographyZone);
    if(!zo)return 'Seleccioná la zona correspondiente al domicilio del cliente.';
    const fi=filial(client.province,client.geographyZone,client.filial);
    if(!fi)return 'Seleccioná una filial válida para la provincia y zona elegidas.';
    if(!canQuote(fi))return fi.message || pending;
    if(client.locality===OTHER)return 'Esta localidad todavía no tiene una región tarifaria configurada. Elegí una localidad del listado.';
    if(!fi.localities.includes(client.locality))return 'Seleccioná una localidad o zona válida para la filial elegida.';
    if(client.region!==zo.region)return 'La región tarifaria no coincide con la provincia y zona elegidas.';
    if(client.noaProvince!==(fi.value==='Noa'?pr.value:''))return 'La provincia NOA no coincide con el domicilio seleccionado.';
    return null;
  }
  const api={provinces,province,zone,filial,route,canQuote,pricingFilial,filialLabel,validate,OTHER};
  (typeof window!=='undefined'?window:globalThis).MEDIFE_GEOGRAPHY=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
