/* Medifé V3 · configurador comercial manual.
   El motor auditado V2 permanece como fuente de reglas; esta capa separa
   elegibilidad de aplicación para que el asesor elija qué beneficios usar. */
(() => {
  'use strict';

  const E = window.MEDIFE_ENGINE;
  if (!E) throw new Error('MEDIFE_ENGINE no está cargado.');
  const D = E.DATA;
  const STRATEGIC_PLANS = new Set(['BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const YOUNG_STANDARD = new Set(['BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const YOUNG_AMBA_OBL = new Set(['INDIE','BRONCE CLASSIC','BRONCE','PLATA','ORO','PLATINUM']);
  const $v3 = (s, r=document) => r.querySelector(s);
  const $$v3 = (s, r=document) => [...r.querySelectorAll(s)];
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const round2 = E.round2;
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const moneyV3 = v => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(v)||0);
  const pctV3 = v => `${Math.round((Number(v)||0)*1000)/10}%`;
  const escV3 = v => String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function blankSelection(){
    return {child:false,young:false,filial:false,tactical:false,strategic:'none',option5:false,ucc:false,gaf:'none'};
  }

  function cleanClient(client){
    return {
      ...client,
      promotion:'none',
      option5:false,
      gaf:'none',
      ucc:false
    };
  }

  function youngDetails(plan, client, members){
    const adults = members.filter(m=>m.kind==='adult');
    let amount = 0;
    const eligibleMembers=[];
    if(client.region==='AMBA'){
      const eligiblePlans = client.category==='Obligatorio' ? YOUNG_AMBA_OBL : YOUNG_STANDARD;
      if(!eligiblePlans.has(plan)) return {amount:0,effectiveRate:0,eligibleMembers:[]};
      for(const m of adults){
        const rate=m.age<=25?.26:(m.age<=29?.13:0);
        if(rate){amount+=m.listPrice*rate;eligibleMembers.push({...m,rate});}
      }
    }else{
      if(!YOUNG_STANDARD.has(plan)) return {amount:0,effectiveRate:0,eligibleMembers:[]};
      for(const m of adults){
        if(m.age<=25){amount+=m.listPrice*.26;eligibleMembers.push({...m,rate:.26});}
      }
    }
    const groupListPrice=members.reduce((s,m)=>s+m.listPrice,0);
    return {amount,effectiveRate:groupListPrice?amount/groupListPrice:0,eligibleMembers};
  }

  function rateAt(schedule, month){
    for(const row of schedule||[]) if(month>=row[0]&&month<=row[1]) return n(row[2]);
    return 0;
  }

  function context(plan, client){
    const safe=cleanClient(client);
    const legacy=E.quote(plan,safe);
    if(legacy.status!=='ok') return {status:legacy.status,reason:legacy.reason,plan};
    const members=legacy.members;
    const listPrice=members.reduce((s,m)=>s+m.listPrice,0);
    const child=E.childAdjustmentDetails(plan,safe,members);
    const young=youngDetails(plan,safe,members);
    const filial=E.filialDiscountPolicy(plan,safe);
    const tactical=E.tacticalFor(plan,safe);
    const strategicOptions=STRATEGIC_PLANS.has(plan)
      ? E.strategicEligibility({...safe,procedencia:client.procedencia,exAssociate:client.exAssociate}).filter(x=>x.value!=='none')
      : [];
    const gafOptions=E.gafEligibility(safe).filter(x=>x.value!=='none');
    const contribution=E.totalContribution(safe);
    return {status:'ok',plan,client:safe,members,listPrice,child,young,filial,tactical,strategicOptions,gafOptions,contribution};
  }

  function selectionError(ctx, client, sel){
    if(sel.child && !ctx.child.amount) return 'El ajuste por hijos no corresponde a este plan/caso.';
    if(sel.young && !ctx.young.amount) return 'El segmento joven no corresponde a este plan/caso.';
    if(client.region==='AMBA' && sel.child && sel.young) return 'En AMBA, ajuste por hijos y segmento joven no se aplican simultáneamente.';
    if(sel.filial && !ctx.filial) return 'No existe descuento de filial para este caso.';
    if(sel.tactical && !ctx.tactical) return 'No existe táctico para este caso.';
    const strategicValues=new Set(ctx.strategicOptions.map(x=>String(x.value)));
    if(sel.strategic!=='none'&&!strategicValues.has(String(sel.strategic))) return 'La promoción estratégica elegida no está habilitada.';
    if(sel.strategic==='7'&&sel.tactical) return 'Opción 7 no se acumula con el táctico comercial.';
    if(sel.option5&&!(client.procedencia&&['1','2','3'].includes(String(sel.strategic)))) return 'Opción 5 requiere procedencia y Opción 1, 2 o 3.';
    if(sel.ucc&&!(client.uccEligible&&client.region===D.ucc?.region)) return 'UCC no está habilitado para este caso.';
    const gafValues=new Set(ctx.gafOptions.map(x=>String(x.value)));
    if(sel.gaf!=='none'&&!gafValues.has(String(sel.gaf))) return 'El convenio seleccionado no corresponde al caso.';
    return null;
  }

  function manualQuoteWithContext(ctx, client, selection){
    const sel={...blankSelection(),...selection};
    const err=selectionError(ctx,client,sel);
    if(err) return {status:'invalid',reason:err,plan:ctx.plan,selection:sel};

    const childDiscount=sel.child?ctx.child.amount:0;
    const youngDiscount=sel.young?ctx.young.amount:0;
    const nominalAdjusted=Math.max(0,ctx.listPrice-childDiscount-youngDiscount);
    const filialRate=sel.filial?n(ctx.filial?.rate):0;
    const tactical=sel.tactical?ctx.tactical:null;
    const strategicId=String(sel.strategic||'none');
    const strategicDef=strategicId==='none'?null:D.strategic?.[client.category]?.[strategicId];
    const gafDef=sel.gaf==='none'?D.gaf?.none:D.gaf?.[sel.gaf];
    const horizon=strategicId==='7'?24:12;
    const months=[];

    for(let month=1;month<=horizon;month++){
      const strategicRate=strategicDef?rateAt(strategicDef.schedule,month):0;
      const option5Rate=sel.option5?rateAt(D.option5?.[client.category]?.schedule,month):0;
      const tacticalRate=tactical&&month<=n(tactical.months)?n(tactical.rate):0;
      const rawCommercialRate=strategicRate+option5Rate+tacticalRate;
      const commercialRate=Math.min(rawCommercialRate,n(D.discountCap||.85));
      const uccRate=sel.ucc && (D.ucc?.months==null||month<=n(D.ucc.months)) ? n(D.ucc?.rate) : 0;
      const beforeTax=Math.max(0,nominalAdjusted*(1-filialRate-commercialRate-uccRate));
      const preGaf=client.category==='Voluntario'
        ? beforeTax*(1+n(D.ivaVoluntario))
        : Math.max(0,beforeTax-ctx.contribution);
      const gafRate=gafDef?.rate && (gafDef.months==null||month<=n(gafDef.months)) ? n(gafDef.rate) : 0;
      const price=Math.max(0,preGaf*(1-gafRate));
      months.push({
        month,strategicRate,option5Rate,tacticalRate,rawCommercialRate,commercialRate,
        filialRate,uccRate,gafRate,beforeTax:round2(beforeTax),preGaf:round2(preGaf),price:round2(price)
      });
    }

    const month1=months[0];
    const uccRegularRate=sel.ucc&&D.ucc?.months==null?n(D.ucc.rate):0;
    const regularBeforeTax=Math.max(0,nominalAdjusted*(1-filialRate-uccRegularRate));
    let regular=client.category==='Voluntario'
      ? regularBeforeTax*(1+n(D.ivaVoluntario))
      : Math.max(0,regularBeforeTax-ctx.contribution);
    if(gafDef?.rate&&gafDef.months==null) regular*=1-n(gafDef.rate);
    regular=Math.max(0,regular);

    const baseBeforeTax=ctx.listPrice;
    const baseAfterAutomatic=client.category==='Voluntario'
      ? baseBeforeTax*(1+n(D.ivaVoluntario))
      : Math.max(0,baseBeforeTax-ctx.contribution);
    const filialDiscount=nominalAdjusted*filialRate;
    const commercialDiscount=nominalAdjusted*month1.commercialRate;
    const uccDiscount=nominalAdjusted*month1.uccRate;
    const gafDiscount=month1.preGaf*month1.gafRate;
    const ivaAmount=client.category==='Voluntario'?month1.beforeTax*n(D.ivaVoluntario):0;

    return {
      status:'ok',plan:ctx.plan,members:ctx.members,selection:sel,
      listPrice:ctx.listPrice,basePrice:ctx.listPrice,baseAfterAutomatic:round2(baseAfterAutomatic),
      childDiscount,childAdjustmentRate:ctx.child.rate,childEligibleListPrice:ctx.child.eligibleListPrice,
      childEffectiveDiscountRate:ctx.listPrice?childDiscount/ctx.listPrice:0,
      priceAfterChildAdjustment:ctx.listPrice-childDiscount,
      childAdjustment:{
        rate:ctx.child.rate,eligibleListPrice:ctx.child.eligibleListPrice,amount:childDiscount,
        effectiveRate:ctx.listPrice?childDiscount/ctx.listPrice:0,groupListPrice:ctx.listPrice,
        priceAfterAdjustment:ctx.listPrice-childDiscount,
        eligibleMembers:(ctx.child.eligibleChildren||[]).map(m=>({role:m.role,age:m.age,key:m.key,listPrice:m.listPrice}))
      },
      youngDiscount,
      filialDiscount:round2(filialDiscount),filialRate,filialLabel:ctx.filial?.label||null,
      nominalAdjustedPrice:nominalAdjusted,adjustedPrice:round2(nominalAdjusted-filialDiscount),
      permanentDiscount:round2(childDiscount+youngDiscount+filialDiscount),
      contribution:ctx.contribution,ivaAmount:round2(ivaAmount),
      tactical,strategicApplies:strategicId!=='none'&&STRATEGIC_PLANS.has(ctx.plan),
      uccRate:month1.uccRate,uccDiscount:round2(uccDiscount),
      gaf:gafDef||D.gaf?.none,gafRate:month1.gafRate,gafDiscount:round2(gafDiscount),
      month1DiscountRate:month1.commercialRate,commercialDiscount:round2(commercialDiscount),
      finalPrice:month1.price,regularPrice:round2(regular),timeline:months,
      context:ctx
    };
  }

  function manualQuote(plan, client, selection=blankSelection()){
    const ctx=context(plan,client);
    if(ctx.status!=='ok') return ctx;
    return manualQuoteWithContext(ctx,client,selection);
  }

  function bestSelection(plan,client){
    const ctx=context(plan,client);
    if(ctx.status!=='ok') return {selection:blankSelection(),quote:ctx};
    const bool=v=>v?[false,true]:[false];
    const childOpts=bool(ctx.child.amount>0);
    const youngOpts=bool(ctx.young.amount>0);
    const filialOpts=bool(Boolean(ctx.filial));
    const tacticalOpts=bool(Boolean(ctx.tactical));
    const uccOpts=bool(Boolean(client.uccEligible&&client.region===D.ucc?.region));
    const strategicOpts=['none',...ctx.strategicOptions.map(x=>String(x.value))];
    const gafOpts=['none',...ctx.gafOptions.map(x=>String(x.value))];
    let bestSel=blankSelection(), bestQuote=manualQuoteWithContext(ctx,client,bestSel);

    for(const child of childOpts) for(const young of youngOpts){
      if(client.region==='AMBA'&&child&&young) continue;
      for(const filial of filialOpts) for(const tactical of tacticalOpts) for(const strategic of strategicOpts){
        if(strategic==='7'&&tactical) continue;
        const o5Opts=client.procedencia&&['1','2','3'].includes(strategic)?[false,true]:[false];
        for(const option5 of o5Opts) for(const ucc of uccOpts) for(const gaf of gafOpts){
          const sel={child,young,filial,tactical,strategic,option5,ucc,gaf};
          const q=manualQuoteWithContext(ctx,client,sel);
          if(q.status==='ok'&&q.finalPrice<bestQuote.finalPrice-.005){bestQuote=q;bestSel=sel;}
        }
      }
    }
    return {selection:bestSel,quote:bestQuote};
  }

  function potentialBenefitCount(plan,client){
    const ctx=context(plan,client);if(ctx.status!=='ok')return 0;
    return [ctx.child.amount>0,ctx.young.amount>0,Boolean(ctx.filial),Boolean(ctx.tactical),
      ...ctx.strategicOptions.map(()=>true),client.uccEligible&&client.region===D.ucc?.region,
      ...ctx.gafOptions.map(()=>true)].filter(Boolean).length;
  }

  window.MEDIFE_CONFIGURATOR={blankSelection,context,manualQuote,bestSelection,potentialBenefitCount,selectionError};

  // -------------------- EXPERIENCIA DE USUARIO --------------------
  const manualState={client:null,plan:null,selection:blankSelection(),quote:null};

  function prepareEligibilityForm(){
    const promo=$v3('#promotion');
    const gaf=$v3('#gaf');
    if(promo?.closest('label')) promo.closest('label').hidden=true;
    if(gaf?.closest('label')) gaf.closest('label').hidden=true;
    if($v3('#option5Wrap')) $v3('#option5Wrap').hidden=true;

    const step=$v3('.form-step--promo');
    if(step){
      const h=step.querySelector('.section-heading h3');
      const p=step.querySelector('.section-heading p');
      if(h) h.textContent='Condiciones especiales';
      if(p) p.textContent='Solo marcá condiciones reales del cliente. Los beneficios se eligen después, plan por plan.';
    }
    const ex=$v3('#exAssociate')?.closest('.check-card');
    if(ex){const b=ex.querySelector('b'),s=ex.querySelector('small');if(b)b.textContent='Es ex asociado Medifé';if(s)s.textContent='Habilita Opción 7 al armar la propuesta.';}
    const ucc=$v3('#uccWrap');
    if(ucc){const b=ucc.querySelector('b'),s=ucc.querySelector('small');if(b)b.textContent='Tiene empleador UCC';if(s)s.textContent='Habilita el beneficio UCC para región Norte. No se aplica todavía.';}
    const details=step?.querySelector('.campaign-info');
    if(details){
      const small=details.querySelector('summary small');
      if(small) small.textContent='Cómo funciona la nueva cotización.';
      const body=details.querySelector('.campaign-info-body');
      if(body) body.innerHTML='<p>Primero vas a ver el valor de lista puro de cada plan.</p><p>Después de elegir un plan, el motor muestra únicamente los beneficios que pueden corresponder al caso.</p><p>El asesor decide cuáles aplicar y el sistema bloquea combinaciones inválidas.</p><p>IVA y aportes se calculan automáticamente porque no son promociones comerciales.</p>';
    }
    const foot=$v3('.case-foot');
    if(foot) foot.textContent='Primero vemos el precio base. Después vos elegís entre los beneficios válidos que detecta el motor.';
  }

  function readManualClient(){
    // readClient pertenece a app-v2 y mantiene todas las validaciones de entrada ya auditadas.
    const raw=readClient('none');
    const uccEligible=Boolean(raw.ucc);
    return {...raw,promotion:'none',option5:false,gaf:'none',ucc:false,uccEligible};
  }

  function ensureBuilder(){
    if($v3('#proposalBuilder')) return;
    const section=document.createElement('section');
    section.id='proposalBuilder';
    section.className='proposal-builder';
    section.hidden=true;
    section.innerHTML='<div class="proposal-shell"><div class="proposal-main"><div id="proposalHeader"></div><div id="benefitGroups"></div></div><aside class="proposal-summary" id="proposalSummary"></aside></div>';
    const results=$v3('#resultados');
    results?.insertAdjacentElement('afterend',section);
  }

  function validateForBasePlans(client){
    return E.validateClient({...cleanClient(client),ucc:false,gaf:'none',promotion:'none',option5:false});
  }

  function renderBasePlans(){
    const c=manualState.client;
    const results=E.PLAN_ORDER.map(plan=>manualQuote(plan,c,blankSelection())).filter(q=>q.status!=='unavailable');
    $v3('#plansGrid').innerHTML=results.map(q=>{
      if(q.status!=='ok')return `<article class="plan-card"><div class="plan-top"><h3>${escV3(q.plan)}</h3></div><div class="plan-price"><small>Revisar caso</small><strong>Consultar</strong><small>${escV3(q.reason)}</small></div></article>`;
      const meta=D.plans.find(p=>p.name===q.plan);
      const count=potentialBenefitCount(q.plan,c);
      const autoNote=c.category==='Obligatorio'
        ? `Aportes estimados ${moneyV3(q.contribution)} · se descuentan después`
        : 'IVA 10,5% · se suma automáticamente después';
      return `<article class="plan-card ${q.plan==='PLATA'?'featured':''}">
        <div class="plan-top"><h3>${escV3(q.plan)}</h3><span class="tag">${escV3(meta?.tag||'Medifé')}</span></div>
        <p class="plan-family">${escV3(compositionLabel(c))}</p>
        <div class="base-price-label">VALOR BASE DEL GRUPO</div>
        <div class="plan-price plan-price--base"><strong>${moneyV3(q.listPrice)}</strong><small>${escV3(autoNote)}</small></div>
        <div class="benefit-count"><b>${count}</b><span>${count===1?'beneficio disponible':'beneficios disponibles'} para revisar</span></div>
        <button class="button button--primary" data-build-plan="${escV3(q.plan)}">Armar propuesta <span>→</span></button>
      </article>`;
    }).join('');
    $$v3('[data-build-plan]').forEach(b=>b.addEventListener('click',()=>choosePlan(b.dataset.buildPlan)));
  }

  function choosePlan(plan){
    manualState.plan=plan;
    manualState.selection=blankSelection();
    manualState.quote=manualQuote(plan,manualState.client,manualState.selection);
    renderBuilder();
    const builder=$v3('#proposalBuilder');
    builder.hidden=false;
    $v3('#selectedBar').hidden=true;
    builder.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function benefitImpact(mutator){
    const current=manualState.quote;
    const next=clone(manualState.selection);
    mutator(next);
    const q=manualQuote(manualState.plan,manualState.client,next);
    if(q.status!=='ok') return null;
    return round2(current.finalPrice-q.finalPrice);
  }

  function card({id,title,detail,selected=false,disabled=false,reason='',impact=null,kind='toggle'}){
    const impactText=impact==null?'':(impact>=0?`Ahorra ${moneyV3(impact)}`:`Suma ${moneyV3(Math.abs(impact))}`);
    return `<button type="button" class="benefit-card ${selected?'is-selected':''} ${disabled?'is-disabled':''}" data-benefit-id="${escV3(id)}" data-benefit-kind="${escV3(kind)}" ${disabled?'disabled':''}>
      <span class="benefit-check">${disabled?'🔒':(selected?'✓':'')}</span>
      <span class="benefit-copy"><b>${escV3(title)}</b><small>${escV3(detail)}</small>${reason?`<em>${escV3(reason)}</em>`:''}</span>
      ${impactText?`<span class="benefit-impact">${escV3(impactText)}</span>`:''}
    </button>`;
  }

  function buildCatalog(){
    const c=manualState.client,plan=manualState.plan,s=manualState.selection;
    const ctx=context(plan,c);
    const groups=[];

    const adjustments=[];
    if(ctx.child.amount>0){
      const blocked=c.region==='AMBA'&&s.young;
      adjustments.push(card({id:'child',title:'Ajuste por hijos',selected:s.child,disabled:blocked,
        detail:`${pctV3(ctx.child.rate)} sobre tarifa de hijos elegibles · impacto máximo sobre este grupo ${pctV3(ctx.child.effectiveRate)}`,
        reason:blocked?'En AMBA no se combina con segmento joven.':'',impact:blocked?null:benefitImpact(x=>x.child=!s.child)}));
    }
    if(ctx.young.amount>0){
      const blocked=c.region==='AMBA'&&s.child;
      adjustments.push(card({id:'young',title:'Segmento joven',selected:s.young,disabled:blocked,
        detail:`Ajuste por edad sobre los adultos elegibles · impacto sobre este grupo ${pctV3(ctx.young.effectiveRate)}`,
        reason:blocked?'En AMBA el ajuste por hijos desplaza este beneficio.':'',impact:blocked?null:benefitImpact(x=>x.young=!s.young)}));
    }
    if(ctx.filial){
      adjustments.push(card({id:'filial',title:ctx.filial.label||'Descuento de filial',selected:s.filial,
        detail:`${pctV3(ctx.filial.rate)} permanente según filial`,impact:benefitImpact(x=>x.filial=!s.filial)}));
    }
    if(adjustments.length) groups.push({title:'Ajustes del grupo',subtitle:'Reglas tarifarias que corresponden al caso. Vos decidís si incorporarlas a esta propuesta.',items:adjustments});

    const promos=[];
    if(ctx.tactical){
      const blocked=String(s.strategic)==='7';
      promos.push(card({id:'tactical',title:ctx.tactical.label||'Táctico comercial',selected:s.tactical,disabled:blocked,
        detail:`${pctV3(ctx.tactical.rate)} x ${ctx.tactical.months} meses`,reason:blocked?'Opción 7 no se acumula con este táctico.':'',
        impact:blocked?null:benefitImpact(x=>x.tactical=!s.tactical)}));
    }
    for(const opt of ctx.strategicOptions){
      const value=String(opt.value),selected=String(s.strategic)===value;
      const blocked=value==='7'&&s.tactical;
      const def=D.strategic?.[c.category]?.[value];
      promos.push(card({id:`strategic:${value}`,kind:'strategic',title:`Opción ${value}`,selected,disabled:blocked,
        detail:def?.detail||opt.label,reason:blocked?'Desactivá primero el táctico para usar Opción 7.':'',
        impact:blocked?null:benefitImpact(x=>{x.strategic=selected?'none':value;if(!['1','2','3'].includes(x.strategic))x.option5=false;})}));
    }
    const o5Allowed=c.procedencia&&['1','2','3'].includes(String(s.strategic));
    if(c.procedencia||['1','2','3'].includes(String(s.strategic))){
      promos.push(card({id:'option5',title:'Opción 5',selected:s.option5,disabled:!o5Allowed,
        detail:D.option5?.[c.category]?.detail||'5% x 6 meses',reason:!o5Allowed?'Requiere Opción 1, 2 o 3 + procedencia comprobable.':'',
        impact:o5Allowed?benefitImpact(x=>x.option5=!s.option5):null}));
    }
    if(promos.length) groups.push({title:'Promociones comerciales',subtitle:'Podés elegir la estrategia comercial sin salirte de las combinaciones válidas.',items:promos});

    const affinities=[];
    if(c.region===D.ucc?.region){
      const blocked=!c.uccEligible;
      affinities.push(card({id:'ucc',title:'UCC · Empleador acumulable',selected:s.ucc,disabled:blocked,
        detail:`${pctV3(D.ucc.rate)} sin plazo definido en la matriz vigente`,reason:blocked?'El caso no fue marcado como empleador UCC.':'',
        impact:blocked?null:benefitImpact(x=>x.ucc=!s.ucc)}));
    }
    for(const opt of ctx.gafOptions){
      const value=String(opt.value),selected=s.gaf===value,def=D.gaf?.[value];
      affinities.push(card({id:`gaf:${value}`,kind:'gaf',title:opt.label,selected,
        detail:`${pctV3(def?.rate)}${def?.months==null?' · sin plazo definido':` x ${def.months} meses`}`,
        impact:benefitImpact(x=>x.gaf=selected?'none':value)}));
    }
    if(affinities.length) groups.push({title:'Convenios y afinidades',subtitle:'Elegí únicamente el convenio que el cliente realmente acredita.',items:affinities});
    return groups;
  }

  function selectedBenefitLines(q){
    const rows=[];
    const s=q.selection;
    if(s.child)rows.push(['Ajuste hijos',`- ${moneyV3(q.childDiscount)}`]);
    if(s.young)rows.push(['Segmento joven',`- ${moneyV3(q.youngDiscount)}`]);
    if(s.filial)rows.push([q.filialLabel||'Descuento filial',`- ${moneyV3(q.filialDiscount)}`]);
    if(q.timeline[0].commercialRate>0)rows.push(['Beneficios comerciales mes 1',`- ${moneyV3(q.commercialDiscount)}`]);
    if(s.ucc)rows.push(['UCC',`- ${moneyV3(q.uccDiscount)}`]);
    if(manualState.client.category==='Obligatorio')rows.push(['Aportes',`- ${moneyV3(q.contribution)}`]);
    else rows.push(['IVA 10,5%',`+ ${moneyV3(q.ivaAmount)}`]);
    if(s.gaf!=='none')rows.push([q.gaf?.label||'Convenio',`- ${moneyV3(q.gafDiscount)}`]);
    return rows;
  }

  function renderBuilder(){
    const q=manualQuote(manualState.plan,manualState.client,manualState.selection);
    if(q.status!=='ok')return;
    manualState.quote=q;
    const best=bestSelection(manualState.plan,manualState.client);
    const maxSaving=Math.max(0,q.baseAfterAutomatic-best.quote.finalPrice);
    $v3('#proposalHeader').innerHTML=`
      <div class="proposal-title"><div><p class="eyebrow">02 · ARMAR PROPUESTA</p><h2>${escV3(manualState.plan)}</h2><p>Partimos del precio base. Activá solo los beneficios que quieras ofrecer y que el motor permita.</p></div>
      <button class="button button--outline" id="changePlanV3">← Cambiar plan</button></div>
      <div class="proposal-kpis">
        <div><small>VALOR BASE DEL GRUPO</small><strong>${moneyV3(q.listPrice)}</strong></div>
        <div class="is-current"><small>PRIMERA CUOTA ACTUAL</small><strong>${moneyV3(q.finalPrice)}</strong></div>
        <div><small>MENOR PRIMERA CUOTA DISPONIBLE</small><strong>${moneyV3(best.quote.finalPrice)}</strong><span>Potencial ${moneyV3(maxSaving)} vs. base con aportes/IVA</span></div>
      </div>
      <div class="proposal-tools"><button type="button" class="button button--primary" id="bestBenefits">Aplicar mejor combinación</button><button type="button" class="button button--ghost-dark" id="clearBenefits">Quitar beneficios</button></div>`;

    const groups=buildCatalog();
    $v3('#benefitGroups').innerHTML=groups.map(g=>`<section class="benefit-group"><div class="benefit-group-head"><h3>${escV3(g.title)}</h3><p>${escV3(g.subtitle)}</p></div><div class="benefit-list">${g.items.join('')}</div></section>`).join('');

    const lines=selectedBenefitLines(q);
    $v3('#proposalSummary').innerHTML=`
      <div class="summary-sticky"><p class="eyebrow eyebrow--white">TU PROPUESTA</p><h3>${escV3(manualState.plan)}</h3>
      <div class="summary-base"><span>Precio base</span><b>${moneyV3(q.listPrice)}</b></div>
      <div class="summary-lines">${lines.length?lines.map(([a,b])=>`<div><span>${escV3(a)}</span><b>${escV3(b)}</b></div>`).join(''):'<p class="summary-empty">Todavía no agregaste beneficios comerciales.</p>'}</div>
      <div class="summary-total"><span>PRIMERA CUOTA</span><strong>${moneyV3(q.finalPrice)}</strong><small>Valor regular actual: ${moneyV3(q.regularPrice)}</small></div>
      <button class="button button--white button--wide" id="openManualQuote">Ver cotización →</button>
      <p class="summary-note">El motor valida compatibilidades y mantiene IVA/aportes automáticos.</p></div>`;

    $v3('#changePlanV3')?.addEventListener('click',()=>{$v3('#proposalBuilder').hidden=true;$v3('#resultados').scrollIntoView({behavior:'smooth'});});
    $v3('#bestBenefits')?.addEventListener('click',()=>{manualState.selection=best.selection;renderBuilder();});
    $v3('#clearBenefits')?.addEventListener('click',()=>{manualState.selection=blankSelection();renderBuilder();});
    $$v3('[data-benefit-id]').forEach(btn=>btn.addEventListener('click',()=>toggleBenefit(btn.dataset.benefitId)));
    $v3('#openManualQuote')?.addEventListener('click',openManualQuote);
  }

  function toggleBenefit(id){
    const s={...manualState.selection};
    if(id==='child')s.child=!s.child;
    else if(id==='young')s.young=!s.young;
    else if(id==='filial')s.filial=!s.filial;
    else if(id==='tactical')s.tactical=!s.tactical;
    else if(id==='option5')s.option5=!s.option5;
    else if(id==='ucc')s.ucc=!s.ucc;
    else if(id.startsWith('strategic:')){
      const value=id.split(':')[1];s.strategic=s.strategic===value?'none':value;
      if(!['1','2','3'].includes(String(s.strategic)))s.option5=false;
    }else if(id.startsWith('gaf:')){
      const value=id.slice(4);s.gaf=s.gaf===value?'none':value;
    }
    const q=manualQuote(manualState.plan,manualState.client,s);
    if(q.status==='ok'){manualState.selection=s;manualState.quote=q;renderBuilder();}
  }

  function openManualQuote(){
    const q=manualState.quote;
    const c={...manualState.client,promotion:q.selection.strategic,option5:q.selection.option5,gaf:q.selection.gaf,ucc:q.selection.ucc};
    // Alimentamos la vista/PDF existente con la propuesta manual ya validada.
    state.client=c;state.plan=manualState.plan;state.quote=q;
    buildQuote();
    $v3('#quoteDialog').showModal();
  }

  function handleSubmit(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    syncCase();
    const c=readManualClient();
    const err=validateForBasePlans(c);
    $v3('#formError').textContent=err||'';
    if(err)return;
    manualState.client=c;manualState.plan=null;manualState.selection=blankSelection();manualState.quote=null;
    renderBasePlans();
    const results=$v3('#resultados');results.hidden=false;
    const builder=$v3('#proposalBuilder');if(builder)builder.hidden=true;
    $v3('#selectedBar').hidden=true;
    const head=results.querySelector('.results-head');
    if(head){const eyebrow=head.querySelector('.eyebrow'),h2=head.querySelector('h2'),p=head.querySelector('p');if(eyebrow)eyebrow.textContent='01 · PRECIOS BASE';if(h2)h2.textContent='Elegí el plan para armar la propuesta.';if(p)p.textContent='Estos importes son valores de lista del grupo, sin beneficios comerciales aplicados.';}
    results.scrollIntoView({behavior:'smooth'});
  }

  function invalidateManual(){
    if(!manualState.client)return;
    manualState.plan=null;manualState.quote=null;manualState.selection=blankSelection();
    const builder=$v3('#proposalBuilder');if(builder)builder.hidden=true;
    $v3('#selectedBar').hidden=true;
    $v3('#resultados').hidden=true;
  }

  prepareEligibilityForm();
  ensureBuilder();
  $v3('#quoteForm')?.addEventListener('submit',handleSubmit,true);
  $v3('#quoteForm')?.addEventListener('input',invalidateManual);
  $v3('#quoteForm')?.addEventListener('change',invalidateManual);
  document.documentElement.dataset.medifeConfigurator='ready';
})();
