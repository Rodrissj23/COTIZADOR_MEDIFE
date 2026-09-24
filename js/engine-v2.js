(function(root){
  'use strict';
  const DATA=root.MEDIFE_DATA;
  if(!DATA) throw new Error('MEDIFE_DATA no está cargado.');

  const PLAN_ORDER=DATA.plans.map(p=>p.name);
  const STRATEGIC_PLANS=new Set(['BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const YOUNG_PLANS_AMBA_OBL=new Set(['INDIE','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const YOUNG_PLANS_STANDARD=new Set(['BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const CHILD_ADJUST_PLANS=new Set(['BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);

  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  const round2=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();

  function adultBand(age){
    age=n(age);
    if(age<=25)return '00-25';
    if(age<=35)return '26-35';
    if(age<=40)return '36-40';
    if(age<=50)return '41-50';
    if(age<=60)return '51-60';
    if(age<=65)return '61-65';
    return '66-00';
  }
  function adultKey(role,age){
    const band=adultBand(age);
    if(role==='Titular')return band==='61-65'?'TITULAR L 61-65':`TITULAR  ${band}`;
    return `ESPOSO (A) ${band}`;
  }
  function childKey(region,age,index){
    age=n(age);
    if(age<0||age>29)return null;
    if(region==='AMBA'){
      if(age<=1)return 'HIJO (0 a 1)';
      if(age<=20)return 'HIJO (2 a 20)';
      return 'HIJO AD. (21 a 29)';
    }
    if(age<=20)return index===0?'HIJO 1':'HIJO 2';
    return 'HIJO MAYOR A CARGO';
  }
  function childStatus(age){
    age=n(age);
    if(age<=20)return 'Hijo';
    if(age<=25)return 'Hijo estudiante';
    return 'Hijo a cargo';
  }
  function tariff(region,key,category,plan){
    const row=DATA.tariffs?.[region]?.[key];
    const planIndex=DATA.planNames.indexOf(plan);
    const categoryIndex=category==='Obligatorio'?0:1;
    const value=row?.[categoryIndex]?.[planIndex];
    return Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
  }
  function memberList(plan,client){
    const members=[];
    const titularKey=adultKey('Titular',client.age);
    const titularPrice=tariff(client.region,titularKey,client.category,plan);
    if(titularPrice==null)return {ok:false,reason:'No hay tarifa para el titular con esta combinación.'};
    members.push({role:'Titular',age:n(client.age),key:titularKey,listPrice:titularPrice,kind:'adult'});
    if(client.hasPartner){
      const key=adultKey('Pareja',client.partnerAge);
      const price=tariff(client.region,key,client.category,plan);
      if(price==null)return {ok:false,reason:'No hay tarifa para la pareja con esta combinación.'};
      members.push({role:'Pareja',age:n(client.partnerAge),key,listPrice:price,kind:'adult'});
    }
    const ages=Array.isArray(client.childrenAges)?client.childrenAges:[];
    for(let i=0;i<ages.length;i++){
      const age=n(ages[i]);
      const key=childKey(client.region,age,i);
      if(!key)return {ok:false,reason:'Los hijos se cotizan hasta los 29 años.'};
      const price=tariff(client.region,key,client.category,plan);
      if(price==null)return {ok:false,reason:`No hay tarifa de hijo para ${plan} en ${client.region}.`};
      members.push({role:`${childStatus(age)} ${i+1}`,age,key,listPrice:price,kind:'child'});
    }
    return {ok:true,members};
  }

  // Mantener precisión completa durante el cálculo. Se redondea solo al exponer importes finales.
  function payrollContribution(item3Percent){
    const item=Math.max(0,n(item3Percent));
    if(!item)return 0;
    const base=item*100/3;
    const cap=DATA.remunerationCap;
    const employeePart=Math.min(base,cap)*0.0255;
    const employerPart=base*0.051;
    return (employeePart+employerPart)*0.93;
  }
  function sourceContribution(source,receipt,monoCategory){
    if(source==='monotributo')return n(DATA.monotributo?.[String(monoCategory||'').toUpperCase()]||0);
    if(source==='relacion')return payrollContribution(receipt);
    return 0;
  }
  function totalContribution(client){
    if(client.category!=='Obligatorio')return 0;
    let total=sourceContribution(client.contributionSource,client.receiptContribution,client.monotributoCategory);
    if(client.hasPartner&&client.unifyPartnerContribution){
      total+=sourceContribution(client.partnerContributionSource,client.partnerReceiptContribution,client.partnerMonotributoCategory);
    }
    return total;
  }

  function youngDiscount(plan,client,members,childDiscount){
    const adults=members.filter(m=>m.kind==='adult');
    let discount=0;
    if(client.region==='AMBA'){
      if(childDiscount>0)return {amount:0,label:null};
      const eligible=client.category==='Obligatorio'?YOUNG_PLANS_AMBA_OBL:YOUNG_PLANS_STANDARD;
      if(!eligible.has(plan))return {amount:0,label:null};
      for(const m of adults){
        const rate=m.age<=25?0.26:(m.age<=29?0.13:0);
        discount+=m.listPrice*rate;
      }
    }else{
      if(!YOUNG_PLANS_STANDARD.has(plan))return {amount:0,label:null};
      for(const m of adults)if(m.age<=25)discount+=m.listPrice*0.26;
    }
    return {amount:discount,label:discount>0?'Segmento joven':null};
  }
  function permanentAdjustments(plan,client,members){
    const children=members.filter(m=>m.kind==='child');
    let childDiscount=0;
    if(CHILD_ADJUST_PLANS.has(plan)){
      const eligibleChildren=children.filter(m=>client.region==='AMBA'?m.age<=29:m.age<=20);
      const rate=DATA.permanent.childAdjustment[client.region]||0;
      childDiscount=eligibleChildren.reduce((s,m)=>s+m.listPrice,0)*rate;
    }
    const young=youngDiscount(plan,client,members,childDiscount);
    const base=members.reduce((s,m)=>s+m.listPrice,0);
    return {base,childDiscount,youngDiscount:young.amount,nominalAdjusted:base-childDiscount-young.amount};
  }

  function filialDiscountPolicy(plan,client){
    if(plan==='INDIE'||client.category!=='Obligatorio')return null;
    return (DATA.filialDiscounts||[]).find(r=>{
      if(r.category!==client.category||r.region!==client.region)return false;
      if(r.filial&&norm(r.filial)!==norm(client.filial))return false;
      if(r.filials&&!(r.filials||[]).some(x=>norm(x)===norm(client.filial)))return false;
      if(r.provinces&&!(r.provinces||[]).some(x=>norm(x)===norm(client.noaProvince)))return false;
      return true;
    })||null;
  }

  function conditionMatches(condition,client){
    const c=norm(condition),f=norm(client.filial);
    if(c==='AMBA')return client.region==='AMBA';
    if(c==='GBA')return /^GBA /.test(String(client.filial||''));
    if(c==='SUR')return client.region==='Sur';
    if(c==='PATAGONIA')return client.region==='Patagonia';
    if(c==='BAHIA/MDQ')return client.region==='Bahía/MDQ';
    if(c==='CORRIENTES/MISIONES')return ['CORRIENTES','MISIONES'].includes(f);
    if(c==='MENDOZA/MERCEDES')return ['MENDOZA','MERCEDES'].includes(f);
    if(c==='NOA/ROSARIO')return ['NOA','ROSARIO'].includes(f);
    return c===f;
  }
  function tacticalFor(plan,client){
    const age=n(client.age);
    for(const t of DATA.tactical||[]){
      const rate=n(t.planRates?.[plan]);
      if(!rate)continue;
      if(t.category!==client.category||t.region!==client.region)continue;
      if(age<t.minAge||age>t.maxAge)continue;
      if(!conditionMatches(t.condition,client))continue;
      return {...t,rate};
    }
    return null;
  }

  // Zonas comerciales del Excel: SUR abarca Sur + Patagonia + Bahía/MDQ.
  function gafZoneMatches(g,client){
    if(!g?.zone||norm(g.zone)==='NACIONAL')return true;
    const zone=norm(g.zone);
    if(zone==='AMBA')return client.region==='AMBA';
    if(zone==='NORTE')return client.region==='Norte';
    if(zone==='SUR')return ['Sur','Patagonia','Bahía/MDQ'].includes(client.region);
    return false;
  }
  function gafEligibility(client){
    return Object.entries(DATA.gaf||{})
      .filter(([,g])=>(g.categories||[]).includes(client.category)&&gafZoneMatches(g,client))
      .map(([value,g])=>({value,label:g.label}));
  }
  function selectedGaf(client){
    const g=DATA.gaf?.[String(client.gaf||'none')];
    return g&&(g.categories||[]).includes(client.category)&&gafZoneMatches(g,client)?g:DATA.gaf?.none;
  }
  function gafRateAt(client,month){
    const g=selectedGaf(client);
    if(!g||!g.rate)return 0;
    if(g.months==null)return g.rate;
    return month<=g.months?g.rate:0;
  }
  function uccRateAt(client,month){
    if(!client.ucc||client.region!==DATA.ucc?.region)return 0;
    if(DATA.ucc.months==null)return DATA.ucc.rate;
    return month<=DATA.ucc.months?DATA.ucc.rate:0;
  }

  function strategicEligibility(client){
    const base=[
      {value:'none',label:'Sin promoción estratégica'},
      {value:'1',label:`Opción 1 · ${DATA.strategic[client.category]['1'].detail}`},
      {value:'2',label:`Opción 2 · ${DATA.strategic[client.category]['2'].detail}`},
      {value:'3',label:`Opción 3 · ${DATA.strategic[client.category]['3'].detail}`}
    ];
    if(client.procedencia)base.push({value:'4',label:`Opción 4 · ${DATA.strategic[client.category]['4'].detail}`});
    if(client.exAssociate)base.push({value:'7',label:`Opción 7 · ${DATA.strategic[client.category]['7'].detail}`});
    return base;
  }
  function rateAt(schedule,month){
    for(const row of schedule||[])if(month>=row[0]&&month<=row[1])return n(row[2]);
    return 0;
  }
  function strategicRate(client,month){
    const selected=String(client.promotion||'none');
    if(selected==='none')return 0;
    const promo=DATA.strategic[client.category]?.[selected];
    return promo?rateAt(promo.schedule,month):0;
  }
  function option5Rate(client,month){
    if(!client.option5||!client.procedencia||!['1','2','3'].includes(String(client.promotion)))return 0;
    return rateAt(DATA.option5[client.category].schedule,month);
  }
  function applyTaxOrContribution(amount,client,contribution){
    const result=client.category==='Voluntario'?amount*(1+DATA.ivaVoluntario):amount-contribution;
    return Math.max(0,result);
  }
  function timeline(plan,client,nominalAdjusted,filialRate,contribution){
    const selected=String(client.promotion||'none');
    const option7Applies=selected==='7'&&STRATEGIC_PLANS.has(plan);
    const tactical=option7Applies?null:tacticalFor(plan,client);
    const strategicApplies=STRATEGIC_PLANS.has(plan)&&!(tactical&&tactical.stackStrategic===false);
    const horizon=option7Applies?24:12;
    const months=[];
    for(let month=1;month<=horizon;month++){
      const sr=strategicApplies?strategicRate(client,month):0;
      const o5=strategicApplies?option5Rate(client,month):0;
      const tr=tactical&&month<=tactical.months?tactical.rate:0;
      const commercialRate=Math.min(sr+o5+tr,DATA.discountCap??0.85);
      const uccRate=uccRateAt(client,month);
      const beforeTax=nominalAdjusted*(1-filialRate-commercialRate-uccRate);
      const preGafRaw=applyTaxOrContribution(beforeTax,client,contribution);
      const gafRate=gafRateAt(client,month);
      const finalRaw=Math.max(0,preGafRaw*(1-gafRate));
      months.push({
        month,strategicRate:sr,option5Rate:o5,tacticalRate:tr,commercialRate,totalRate:commercialRate,
        filialRate,uccRate,gafRate,preGaf:round2(preGafRaw),price:round2(finalRaw)
      });
    }
    return {months,tactical,strategicApplies};
  }

  function validateClient(client){
    if(!DATA.tariffs[client.region])return 'Región tarifaria inválida.';
    if(!['Obligatorio','Voluntario'].includes(client.category))return 'Categoría inválida.';
    const allowedFilials=DATA.filialsByRegion?.[client.region]||[];
    if(!allowedFilials.includes(client.filial))return 'Seleccioná una filial válida para la región.';
    if(client.filial==='Noa'&&!DATA.noaProvinces.includes(client.noaProvince))return 'Indicá la provincia dentro de NOA.';
    if(n(client.age)<18)return 'El titular debe tener 18 años o más.';
    if(client.hasPartner&&n(client.partnerAge)<18)return 'La pareja debe tener 18 años o más.';
    if((client.childrenAges||[]).some(a=>n(a)<0||n(a)>29))return 'Los hijos deben tener entre 0 y 29 años.';
    if(client.category==='Obligatorio'){
      if(!['relacion','monotributo'].includes(client.contributionSource))return 'Indicá el tipo de aporte del titular.';
      if(client.contributionSource==='relacion'&&n(client.receiptContribution)<=0)return 'Ingresá el aporte del 3% del recibo del titular.';
      if(client.contributionSource==='monotributo'&&!DATA.monotributo[String(client.monotributoCategory||'').toUpperCase()])return 'Indicá la categoría de monotributo del titular.';
      if(client.hasPartner&&client.unifyPartnerContribution){
        if(!['relacion','monotributo'].includes(client.partnerContributionSource))return 'Indicá el tipo de aporte de la pareja.';
        if(client.partnerContributionSource==='relacion'&&n(client.partnerReceiptContribution)<=0)return 'Ingresá el aporte del 3% del recibo de la pareja.';
        if(client.partnerContributionSource==='monotributo'&&!DATA.monotributo[String(client.partnerMonotributoCategory||'').toUpperCase()])return 'Indicá la categoría de monotributo de la pareja.';
      }
    }
    const promos=new Set(strategicEligibility(client).map(x=>x.value));
    if(!promos.has(String(client.promotion||'none')))return 'La promoción elegida no es válida para las condiciones informadas.';
    if(client.option5&&!(['1','2','3'].includes(String(client.promotion))&&client.procedencia))return 'Opción 5 solo puede acumularse con opciones 1, 2 o 3 y procedencia comprobable.';
    const gafValues=new Set(gafEligibility(client).map(x=>x.value));
    if(!gafValues.has(String(client.gaf||'none')))return 'El convenio / afinidad no corresponde a la categoría o zona seleccionada.';
    if(client.ucc&&client.region!==DATA.ucc.region)return 'UCC solo corresponde a región Norte.';
    return null;
  }

  function quote(plan,client){
    const error=validateClient(client);
    if(error)return {status:'invalid',reason:error,plan};
    if(!PLAN_ORDER.includes(plan))return {status:'invalid',reason:'Plan inválido.',plan};
    if(plan==='INDIE'&&client.region!=='AMBA')return {status:'unavailable',reason:'INDIE se ofrece únicamente en AMBA.',plan};

    const list=memberList(plan,client);
    if(!list.ok)return {status:'unavailable',reason:list.reason,plan};
    const permanent=permanentAdjustments(plan,client,list.members);
    const filialPolicy=filialDiscountPolicy(plan,client);
    const filialRate=filialPolicy?.rate||0;
    const filialDiscountRaw=permanent.nominalAdjusted*filialRate;
    const contribution=totalContribution(client);
    const tl=timeline(plan,client,permanent.nominalAdjusted,filialRate,contribution);
    const month1=tl.months[0];

    const regularBase=permanent.nominalAdjusted*(1-filialRate-uccRateAt(client,999));
    let regular=applyTaxOrContribution(regularBase,client,contribution);
    const g=selectedGaf(client);
    if(g?.rate&&g.months==null)regular=Math.max(0,regular*(1-g.rate));

    return {
      status:'ok',plan,members:list.members,
      listPrice:permanent.base,
      childDiscount:permanent.childDiscount,
      youngDiscount:permanent.youngDiscount,
      filialDiscount:round2(filialDiscountRaw),filialRate,filialLabel:filialPolicy?.label||null,
      nominalAdjustedPrice:permanent.nominalAdjusted,
      adjustedPrice:round2(permanent.nominalAdjusted-filialDiscountRaw),
      permanentDiscount:round2(permanent.childDiscount+permanent.youngDiscount+filialDiscountRaw),
      contribution,
      tactical:tl.tactical,
      strategicApplies:tl.strategicApplies,
      uccRate:month1.uccRate,
      uccDiscount:round2(permanent.nominalAdjusted*month1.uccRate),
      gaf:selectedGaf(client),gafRate:month1.gafRate,gafDiscount:round2(month1.preGaf*month1.gafRate),
      month1DiscountRate:month1.commercialRate,
      finalPrice:month1.price,
      regularPrice:round2(regular),
      timeline:tl.months
    };
  }
  function quoteAll(client){return PLAN_ORDER.map(plan=>quote(plan,client));}

  const api={
    DATA,PLAN_ORDER,adultBand,adultKey,childKey,childStatus,payrollContribution,totalContribution,
    strategicEligibility,gafEligibility,filialDiscountPolicy,tacticalFor,validateClient,quote,quoteAll,round2
  };
  root.MEDIFE_ENGINE=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);