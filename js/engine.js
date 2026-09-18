(function(root){
  'use strict';
  const DATA = root.MEDIFE_DATA;
  if (!DATA) throw new Error('MEDIFE_DATA no está cargado.');

  const PLAN_ORDER = DATA.plans.map(p=>p.name);
  const STRATEGIC_PLANS = new Set(['MEDIFÉ+','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const YOUNG_PLANS_AMBA_OBL = new Set(['INDIE','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const YOUNG_PLANS_STANDARD = new Set(['BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const CHILD_ADJUST_PLANS = new Set(['MEDIFÉ+','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);

  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const round2 = v => Math.round((n(v)+Number.EPSILON)*100)/100;

  function adultBand(age){
    age=n(age);
    if(age<=25) return '00-25';
    if(age<=35) return '26-35';
    if(age<=40) return '36-40';
    if(age<=50) return '41-50';
    if(age<=60) return '51-60';
    if(age<=65) return '61-65';
    return '66-00';
  }

  function adultKey(role,age){
    const band=adultBand(age);
    if(role==='Titular') return band==='61-65' ? 'TITULAR L 61-65' : `TITULAR  ${band}`;
    return `ESPOSO (A) ${band}`;
  }

  function childKey(region,plan,age,index){
    age=n(age);
    if(age<0 || age>29) return null;
    if(region==='AMBA'){
      if(age<=1) return 'HIJO (0 a 1)';
      if(age<=20) return 'HIJO (2 a 20)';
      return 'HIJO AD. (21 a 29)';
    }
    if(plan==='MEDIFÉ+'){
      if(age<=3) return 'HIJO 0 A 3';
      if(age<=20) return 'HIJO 4 A 20';
      if(age<=25) return 'HIJO 21 A 25';
      return 'HIJO 26 A 29';
    }
    if(age<=20) return index===0 ? 'HIJO 1' : 'HIJO 2';
    return 'HIJO MAYOR A CARGO';
  }

  function childStatus(age){
    age=n(age);
    if(age<=20) return 'Hijo';
    if(age<=25) return 'Hijo estudiante';
    return 'Hijo a cargo';
  }

  function tariff(region,key,category,plan){
    const row=DATA.tariffs?.[region]?.[key];
    const planIndex=PLAN_ORDER.indexOf(plan);
    const categoryIndex=category==='Obligatorio'?0:1;
    const value=row?.[categoryIndex]?.[planIndex];
    return Number.isFinite(Number(value)) && Number(value)>0 ? Number(value) : null;
  }

  function memberList(plan,client){
    const members=[];
    const titularKey=adultKey('Titular',client.age);
    const titularPrice=tariff(client.region,titularKey,client.category,plan);
    if(titularPrice==null) return {ok:false,reason:'No hay tarifa para el titular con esta combinación.'};
    members.push({role:'Titular',age:n(client.age),key:titularKey,listPrice:titularPrice,kind:'adult'});

    if(client.hasPartner){
      const key=adultKey('Pareja',client.partnerAge);
      const price=tariff(client.region,key,client.category,plan);
      if(price==null) return {ok:false,reason:'No hay tarifa para la pareja con esta combinación.'};
      members.push({role:'Pareja',age:n(client.partnerAge),key,listPrice:price,kind:'adult'});
    }

    const ages=Array.isArray(client.childrenAges)?client.childrenAges:[];
    for(let i=0;i<ages.length;i++){
      const age=n(ages[i]);
      const key=childKey(client.region,plan,age,i);
      if(!key) return {ok:false,reason:'Los hijos se cotizan hasta los 29 años en esta versión.'};
      const price=tariff(client.region,key,client.category,plan);
      if(price==null) return {ok:false,reason:`No hay tarifa de hijo para ${plan} en ${client.region}.`};
      members.push({role:`${childStatus(age)} ${i+1}`,age,key,listPrice:price,kind:'child'});
    }
    return {ok:true,members};
  }

  function payrollContribution(item3Percent){
    const item=Math.max(0,n(item3Percent));
    if(!item) return 0;
    const base=item*100/3;
    const cap=DATA.remunerationCap;
    const employeePart=Math.min(base,cap)*0.0255;
    const employerPart=base*0.051;
    return round2((employeePart+employerPart)*0.93);
  }

  function sourceContribution(source,receipt,monoCategory){
    if(source==='monotributo') return round2(DATA.monotributo?.[String(monoCategory||'').toUpperCase()]||0);
    if(source==='relacion') return payrollContribution(receipt);
    return 0;
  }

  function totalContribution(client){
    if(client.category!=='Obligatorio') return 0;
    let total=sourceContribution(client.contributionSource,client.receiptContribution,client.monotributoCategory);
    if(client.hasPartner && client.unifyPartnerContribution){
      total+=sourceContribution(client.partnerContributionSource,client.partnerReceiptContribution,client.partnerMonotributoCategory);
    }
    return round2(total);
  }

  function youngDiscount(plan,client,members,childDiscount){
    const adults=members.filter(m=>m.kind==='adult');
    let discount=0;
    if(client.region==='AMBA'){
      if(childDiscount>0) return {amount:0,rateLabel:null};
      const eligiblePlans=client.category==='Obligatorio'?YOUNG_PLANS_AMBA_OBL:YOUNG_PLANS_STANDARD;
      if(!eligiblePlans.has(plan)) return {amount:0,rateLabel:null};
      for(const m of adults){
        let rate=0;
        if(m.age<=25) rate=0.26;
        else if(m.age<=29) rate=0.13;
        discount+=m.listPrice*rate;
      }
    } else {
      if(!YOUNG_PLANS_STANDARD.has(plan)) return {amount:0,rateLabel:null};
      for(const m of adults){ if(m.age<=25) discount+=m.listPrice*0.26; }
    }
    return {amount:round2(discount),rateLabel:discount>0?'Segmento joven':null};
  }

  function permanentAdjustments(plan,client,members){
    const children=members.filter(m=>m.kind==='child');
    let childDiscount=0;
    if(children.length && CHILD_ADJUST_PLANS.has(plan)){
      const rate=DATA.permanent.childAdjustment[client.region]||0;
      childDiscount=children.reduce((s,m)=>s+m.listPrice,0)*rate;
    }
    childDiscount=round2(childDiscount);
    const young=youngDiscount(plan,client,members,childDiscount);
    const base=round2(members.reduce((s,m)=>s+m.listPrice,0));
    return {base,childDiscount,youngDiscount:young.amount,adjusted:round2(Math.max(0,base-childDiscount-young.amount))};
  }

  function maxGroupAge(client){
    const ages=[n(client.age)];
    if(client.hasPartner) ages.push(n(client.partnerAge));
    if(Array.isArray(client.childrenAges)) ages.push(...client.childrenAges.map(n));
    return Math.max(...ages);
  }

  function strategicEligibility(client){
    const base=[
      {value:'none',label:'Sin promoción estratégica'},
      {value:'1',label:`Opción 1 · ${DATA.strategic[client.category]['1'].detail}`},
      {value:'2',label:`Opción 2 · ${DATA.strategic[client.category]['2'].detail}`},
      {value:'3',label:`Opción 3 · ${DATA.strategic[client.category]['3'].detail}`}
    ];
    if(client.procedencia){
      base.push({value:'4',label:`Opción 4 · ${DATA.strategic[client.category]['4'].detail}`});
      if(client.paymentMethod==='TC' && maxGroupAge(client)<=60) base.push({value:'4+6',label:'Opción 4 + 6 · 24 meses · débito TC · GF hasta 60'});
    }
    if(client.exAssociate) base.push({value:'7',label:`Opción 7 · ${DATA.strategic[client.category]['7'].detail}`});
    return base;
  }

  function rateAt(schedule,month){for(const row of schedule||[]){if(month>=row[0]&&month<=row[1])return n(row[2]);}return 0;}
  function strategicRate(client,month){
    const selected=String(client.promotion||'none');
    if(selected==='none')return 0;
    if(selected==='4+6'){
      if(month<=12)return rateAt(DATA.strategic[client.category]['4'].schedule,month);
      return rateAt(DATA.strategic[client.category]['6'].schedule,month-12);
    }
    const promo=DATA.strategic[client.category][selected];
    return promo?rateAt(promo.schedule,month):0;
  }
  function option5Rate(client,month){if(!client.option5||!client.procedencia||!['1','2','3'].includes(String(client.promotion)))return 0;return rateAt(DATA.option5[client.category].schedule,month);}
  function tacticalFor(plan,client){const age=n(client.age);return DATA.tactical.find(t=>t.category===client.category&&t.region===client.region&&t.plan===plan&&age>=t.minAge&&age<=t.maxAge)||null;}

  function timeline(plan,client,adjusted,contribution){
    const tactical=tacticalFor(plan,client),selected=String(client.promotion||'none');
    const strategicApplies=STRATEGIC_PLANS.has(plan)&&!(tactical&&tactical.stackStrategic===false);
    const horizon=selected==='7'||selected==='4+6'?24:12,months=[];
    for(let month=1;month<=horizon;month++){
      const sr=strategicApplies?strategicRate(client,month):0,o5=strategicApplies?option5Rate(client,month):0,tr=tactical&&month<=tactical.months?tactical.rate:0;
      const tempRate=clamp(sr+o5+tr,0,0.85),afterDiscount=adjusted*(1-tempRate);
      const final=client.category==='Voluntario'?afterDiscount*(1+DATA.ivaVoluntario):Math.max(0,afterDiscount-contribution);
      months.push({month,strategicRate:sr,option5Rate:o5,tacticalRate:tr,totalRate:tempRate,price:round2(final)});
    }
    return {months,tactical,strategicApplies};
  }

  function validateClient(client){
    if(!DATA.tariffs[client.region])return 'Región tarifaria inválida.';
    if(!['Obligatorio','Voluntario'].includes(client.category))return 'Categoría inválida.';
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
    const eligible=new Set(strategicEligibility(client).map(x=>x.value));
    if(!eligible.has(String(client.promotion||'none')))return 'La promoción elegida no es válida para las condiciones informadas.';
    if(client.option5&&!(['1','2','3'].includes(String(client.promotion))&&client.procedencia))return 'Opción 5 solo puede acumularse con opciones 1, 2 o 3 y procedencia comprobable.';
    return null;
  }

  function quote(plan,client){
    const error=validateClient(client);if(error)return{status:'invalid',reason:error,plan};
    if(!PLAN_ORDER.includes(plan))return{status:'invalid',reason:'Plan inválido.',plan};
    if(plan==='INDIE'&&client.region!=='AMBA')return{status:'unavailable',reason:'INDIE se ofrece únicamente en AMBA.',plan};
    const list=memberList(plan,client);if(!list.ok)return{status:'unavailable',reason:list.reason,plan};
    const permanent=permanentAdjustments(plan,client,list.members),contribution=totalContribution(client),tl=timeline(plan,client,permanent.adjusted,contribution),month1=tl.months[0];
    const regularAfterPermanent=client.category==='Voluntario'?permanent.adjusted*(1+DATA.ivaVoluntario):Math.max(0,permanent.adjusted-contribution);
    return {status:'ok',plan,members:list.members,listPrice:permanent.base,childDiscount:permanent.childDiscount,youngDiscount:permanent.youngDiscount,permanentDiscount:round2(permanent.childDiscount+permanent.youngDiscount),adjustedPrice:permanent.adjusted,contribution,tactical:tl.tactical,strategicApplies:tl.strategicApplies,month1DiscountRate:month1.totalRate,finalPrice:month1.price,regularPrice:round2(regularAfterPermanent),timeline:tl.months};
  }
  function quoteAll(client){return PLAN_ORDER.map(plan=>quote(plan,client));}
  const api={DATA,PLAN_ORDER,adultBand,adultKey,childKey,childStatus,payrollContribution,totalContribution,strategicEligibility,validateClient,quote,quoteAll,round2};
  root.MEDIFE_ENGINE=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
