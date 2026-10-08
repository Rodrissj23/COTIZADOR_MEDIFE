/* Geografía comercial · fuentes internas revisadas el 08/10/2026.
   Una sucursal de carga no equivale a una filial comercial. Los pendientes
   quedan visibles, pero nunca se resuelven por cercanía ni por defecto. */
(() => {
  'use strict';
  const OTHER = '__other__';
  const pending = 'Falta confirmar la correspondencia de región, filial o habilitación de esta localidad. Consultá a administración.';
  const suspended = 'Esta zona figura suspendida en la documentación disponible. Consultá a administración antes de cotizar.';
  const f = (value, localities, extra={}) => ({value, label:value, localities, status:'active', ...extra});
  const p = (id, label, localities, message=pending, status='pending') => f(id, localities, {label, message, status});
  const z = (value, label, region, filials) => ({value, label, region, filials});
  const one = (region, filials) => [z(region, region, region, filials)];
  const provinces = [
    {value:'CABA', label:'Ciudad Autónoma de Buenos Aires (CABA)', zones:one('AMBA',[f('CABA',['CABA'])])},
    {value:'Buenos Aires', zones:[
      z('AMBA','AMBA · Gran Buenos Aires','AMBA',[
        f('GBA Norte',['Zona GBA Norte']), f('GBA Oeste',['Zona GBA Oeste']), f('GBA Sur',['Zona GBA Sur'])]),
      z('Bahía/MDQ','Bahía Blanca / Mar del Plata','Bahía/MDQ',[
        f('Bahía Blanca',['Bahía Blanca']), f('Mar del Plata',['Mar del Plata']),
        p('__costa__','Otras localidades de Bahía / costa · a validar',['Punta Alta','Necochea','Pinamar','Villa Gesell','Miramar','Quequén','Guaminí']),
        p('__tres_arroyos__','Tres Arroyos · suspendida',['Tres Arroyos'],suspended,'suspended')]),
      z('Sur','Interior bonaerense · Mercedes y otras localidades','Sur',[
        f('Mercedes',['Mercedes, Buenos Aires']),
        p('__interior__','Otras localidades del interior · filial a validar',['Azul','Chivilcoy','Olavarría','Tandil','Trenque Lauquen'])]),
      z('Norte','San Nicolás / San Pedro · filial a validar','Norte',[
        p('__norte_ba__','Filial comercial a validar',['San Nicolás','San Pedro'],'La fuente asigna región Norte y sucursal de carga Rosario. La filial comercial debe confirmarse; San Pedro también requiere confirmar habilitación.')])
    ]},
    {value:'Catamarca', zones:[], message:'No hay una correspondencia confirmada para Catamarca. Consultá a administración.'},
    {value:'Chaco', zones:[], message:'Chaco figura suspendida en una guía y no aparece en el otro listado. Administración debe confirmar su situación.'},
    {value:'Chubut', zones:one('Patagonia',[f('Patagonia Sur',['Comodoro Rivadavia','Puerto Madryn','Rawson','Trelew'])])},
    {value:'Córdoba', zones:one('Norte',[f('Córdoba',['Córdoba capital','Villa Carlos Paz'])])},
    {value:'Corrientes', zones:one('Norte',[f('Corrientes',['Corrientes capital'])])},
    {value:'Entre Ríos', zones:[], message:'Paraná figura autorizada, pero falta confirmar su región y filial comercial. No se asigna automáticamente a Santa Fe.'},
    {value:'Formosa', zones:[], message:suspended},
    {value:'Jujuy', zones:[], message:suspended},
    {value:'La Pampa', zones:[], message:'Santa Rosa figura en región Sur con sucursal de carga Trenque Lauquen. Falta confirmar la filial comercial.'},
    {value:'La Rioja', zones:[], message:'La Rioja figura en región Sur, pero falta confirmar una filial comercial compatible con el cotizador.'},
    {value:'Mendoza', zones:one('Sur',[f('Mendoza',['Mendoza capital'])])},
    {value:'Misiones', zones:one('Norte',[f('Misiones',['Posadas'])])},
    {value:'Neuquén', zones:one('Patagonia',[
      f('Comahue',['Neuquén capital','Plottier']),
      p('Patagonia Norte','Patagonia Norte · habilitación a validar',['San Martín de los Andes'],'San Martín de los Andes aparece en el esquema de Patagonia Norte. Falta confirmar su habilitación comercial.')])},
    {value:'Río Negro', zones:one('Patagonia',[f('Patagonia Norte',['San Carlos de Bariloche'])])},
    {value:'Salta', zones:[], message:suspended},
    {value:'San Juan', zones:one('Sur',[f('San Juan',['San Juan capital'])])},
    {value:'San Luis', zones:[], message:suspended+' Villa Mercedes, San Luis, no es Mercedes, Buenos Aires.'},
    {value:'Santa Cruz', zones:one('Patagonia',[
      p('Patagonia Sur','Patagonia Sur / Austral · a validar',['Caleta Olivia','Río Gallegos'],'Las localidades están listadas, pero falta confirmar la equivalencia de Patagonia Austral con la filial del cotizador.')])},
    {value:'Santa Fe', zones:one('Norte',[
      f('Santa Fe',['Santa Fe capital']), f('Rosario',['Rosario']),
      p('__reconquista__','Reconquista · filial a validar',['Reconquista'],'Reconquista figura autorizada, pero falta confirmar su filial comercial. No se extiende automáticamente el descuento de Santa Fe.')])},
    {value:'Santiago del Estero', zones:[], message:suspended},
    {value:'Tierra del Fuego', zones:one('Patagonia',[
      p('Patagonia Sur','Patagonia Sur / Austral · a validar',['Ushuaia','Río Grande'],'Las localidades están listadas, pero falta confirmar la equivalencia de Patagonia Austral con la filial del cotizador.')])},
    {value:'Tucumán', zones:one('Norte',[f('Noa',['San Miguel de Tucumán'])])}
  ];
  for(const province of provinces) province.label ||= province.value;
  function province(value){return provinces.find(p=>p.value===value);}
  function zone(provinceValue, zoneValue){return province(provinceValue)?.zones.find(z=>z.value===zoneValue);}
  function filial(provinceValue, zoneValue, filialValue){return zone(provinceValue,zoneValue)?.filials.find(f=>f.value===filialValue);}
  function validate(client){
    const pr=province(client.province);
    if(!pr)return 'Seleccioná la provincia del domicilio del cliente.';
    if(!pr.zones.length)return pr.message || pending;
    const zo=zone(client.province,client.geographyZone);
    if(!zo)return 'Seleccioná la zona correspondiente al domicilio del cliente.';
    const fi=filial(client.province,client.geographyZone,client.filial);
    if(!fi)return 'Seleccioná una filial válida para la provincia y zona elegidas.';
    if(fi.status!=='active')return fi.message || pending;
    if(client.locality===OTHER)return 'La localidad no está confirmada en este recorrido. Consultá a administración; no selecciones otra localidad para cotizar.';
    if(!fi.localities.includes(client.locality))return 'Seleccioná una localidad o zona válida para la filial elegida.';
    if(client.region!==zo.region)return 'La región tarifaria no coincide con la provincia y zona elegidas.';
    if(client.noaProvince!==(fi.value==='Noa'?pr.value:''))return 'La provincia NOA no coincide con el domicilio seleccionado.';
    return null;
  }
  const api={provinces,province,zone,filial,validate,OTHER};
  (typeof window!=='undefined'?window:globalThis).MEDIFE_GEOGRAPHY=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
