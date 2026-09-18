'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const ENGINE=window.MEDIFE_ENGINE;
if(!ENGINE) throw new Error('No se pudo cargar el motor Medifé.');
const {DATA,quote,quoteAll,strategicEligibility,validateClient}=ENGINE;
const VALIDITY_HOURS=72;

const state={client:null,plan:null,quote:null};
const money=v=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(v)||0);
const pct=v=>`${Math.round((Number(v)||0)*1000)/10}%`;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const initials=name=>(String(name||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'MF');

function fillMonoSelect(select){
  select.innerHTML=Object.keys(DATA.monotributo).map(k=>`<option value="${k}">${k}</option>`).join('');
}
fillMonoSelect($('#monotributoCategory'));
fillMonoSelect($('#partnerMonotributoCategory'));

function childrenAgesFromUI(){return $$('.child-age',$('#childrenAgeFields')).map(i=>Number(i.value));}
function renderChildAges(count){
  count=Math.max(0,Math.min(10,Math.floor(Number(count)||0)));
  const previous=childrenAgesFromUI();
  $('#childrenAgeFields').innerHTML=Array.from({length:count},(_,i)=>{
    const val=Number.isFinite(previous[i])?previous[i]:Math.min(20,5+i);
    return `<label><span>Edad hijo ${i+1}</span><input class="child-age" type="number" min="0" max="29" value="${val}" required></label>`;
  }).join('');
  $('#childrenAgesWrap').hidden=count===0;
}

function syncContributionSource(prefix=''){
  const partner=prefix==='partner';
  const source=$(partner?'#partnerContributionSource':'#contributionSource').value;
  $(partner?'#partnerReceiptWrap':'#receiptWrap').hidden=source!=='relacion';
  $(partner?'#partnerMonoWrap':'#monoWrap').hidden=source!=='monotributo';
}

function syncConditionalUI(){
  const category=$('input[name="category"]:checked')?.value||'Obligatorio';
  const hasPartner=$('#hasPartner').checked;
  $('#contributionSection').hidden=category!=='Obligatorio';
  $('#partnerFields').hidden=!hasPartner;
  $('#unifyWrap').hidden=category!=='Obligatorio';
  $('#partnerContributionFields').hidden=!(category==='Obligatorio'&&hasPartner&&$('#unifyPartnerContribution').checked);
  syncContributionSource('');
  syncContributionSource('partner');
  $$('.choice').forEach(c=>c.classList.toggle('active',Boolean($('input',c)?.checked)));
  const childCount=Math.max(0,Math.min(10,Math.floor(Number($('#children').value)||0)));
  $('#childrenAgesWrap').hidden=childCount===0;
  if($$('.child-age',$('#childrenAgeFields')).length!==childCount) renderChildAges(childCount);
}

function readClient(promotionOverride){
  const category=$('input[name="category"]:checked')?.value||'Obligatorio';
  const hasPartner=$('#hasPartner').checked;
  const currentPromo=promotionOverride!==undefined?promotionOverride:($('#promotion').value||'none');
  return {
    name:$('#clientName').value.trim()||'Nueva cotización',dni:$('#clientDni').value.trim(),
    region:$('#region').value,category,paymentMethod:$('#paymentMethod').value,
    procedencia:$('#procedencia').checked,exAssociate:$('#exAssociate').checked,
    age:Number($('#age').value),hasPartner,partnerAge:hasPartner?Number($('#partnerAge').value):0,
    childrenAges:childrenAgesFromUI(),
    contributionSource:category==='Obligatorio'?$('#contributionSource').value:null,
    receiptContribution:Number($('#receiptContribution').value)||0,
    monotributoCategory:$('#monotributoCategory').value,
    unifyPartnerContribution:category==='Obligatorio'&&hasPartner&&$('#unifyPartnerContribution').checked,
    partnerContributionSource:$('#partnerContributionSource').value,
    partnerReceiptContribution:Number($('#partnerReceiptContribution').value)||0,
    partnerMonotributoCategory:$('#partnerMonotributoCategory').value,
    promotion:currentPromo,
    option5:$('#option5').checked
  };
}

function syncPromotionOptions(){
  const select=$('#promotion');
  const previous=select.value||'none';
  const draft=readClient('none');
  const options=strategicEligibility(draft);
  select.innerHTML=options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  select.value=options.some(o=>o.value===previous)?previous:'none';
  const canOption5=['1','2','3'].includes(select.value)&&draft.procedencia;
  $('#option5Wrap').hidden=!canOption5;
  if(!canOption5) $('#option5').checked=false;
}

function compositionLabel(c){
  const bits=[`Titular ${c.age} años`];
  if(c.hasPartner) bits.push(`Pareja ${c.partnerAge}`);
  if(c.childrenAges.length) bits.push(`${c.childrenAges.length} hijo${c.childrenAges.length>1?'s':''}`);
  return bits.join(' · ');
}

function syncCase(){
  syncConditionalUI();
  syncPromotionOptions();
  const c=readClient();
  state.client=c;
  $('#caseName').textContent=c.name;
  $('#caseInitials').textContent=initials(c.name);
  $('#caseComposition').textContent=compositionLabel(c);
  $('#caseMode').textContent=`${c.category} · ${c.region}${c.category==='Obligatorio'?' · con aportes':''}`;
}

function invalidateSelection(){state.plan=null;state.quote=null;$('#selectedBar').hidden=true;}

$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
$$('.choice').forEach(choice=>choice.addEventListener('click',()=>{const radio=$('input',choice);if(radio)radio.checked=true;syncCase();invalidateSelection();}));
$('#children').addEventListener('input',()=>{renderChildAges($('#children').value);syncCase();invalidateSelection();});
$('#hasPartner').addEventListener('change',()=>{syncCase();invalidateSelection();});
$('#unifyPartnerContribution').addEventListener('change',()=>{syncCase();invalidateSelection();});
$('#contributionSource').addEventListener('change',()=>{syncContributionSource('');syncCase();invalidateSelection();});
$('#partnerContributionSource').addEventListener('change',()=>{syncContributionSource('partner');syncCase();invalidateSelection();});
$('#promotion').addEventListener('change',()=>{const c=readClient();$('#option5Wrap').hidden=!(['1','2','3'].includes(c.promotion)&&c.procedencia);if($('#option5Wrap').hidden)$('#option5').checked=false;invalidateSelection();syncCase();});
$('#quoteForm').addEventListener('input',e=>{if(e.target.id==='children'||e.target.id==='promotion')return;syncCase();invalidateSelection();});
$('#quoteForm').addEventListener('change',e=>{if(['children','promotion','hasPartner','unifyPartnerContribution','contributionSource','partnerContributionSource'].includes(e.target.id))return;syncCase();invalidateSelection();});

function planFlags(q,c){
  const flags=[];
  if(q.childDiscount>0)flags.push('Ajuste hijos');
  if(q.youngDiscount>0)flags.push('Segmento joven');
  if(q.tactical)flags.push(q.tactical.label);
  if(q.strategicApplies&&c.promotion!=='none')flags.push(c.promotion==='4+6'?'Opción 4 + 6':`Opción ${c.promotion}`);
  if(c.option5&&q.strategicApplies)flags.push('Opción 5');
  if(c.category==='Obligatorio'&&q.contribution>0)flags.push(`Aportes ${money(q.contribution)}`);
  if(c.category==='Voluntario')flags.push('IVA 10,5%');
  return flags;
}

function cardSummary(q){
  if(q.finalPrice===q.regularPrice)return `Valor mensual calculado`;
  return `Luego ${money(q.regularPrice)}${q.timeline.some(m=>m.totalRate>0)?' al finalizar bonificaciones':''}`;
}

function renderPlans(){
  const c=state.client;
  const results=quoteAll(c).filter(q=>q.status!=='unavailable');
  if(!results.length){$('#plansGrid').innerHTML='<div class="empty-state"><b>No hay planes disponibles.</b><span>Revisá los datos ingresados.</span></div>';return;}
  $('#plansGrid').innerHTML=results.map(q=>{
    if(q.status!=='ok')return `<article class="plan-card"><div class="plan-top"><h3>${esc(q.plan)}</h3></div><div class="plan-price"><small>Revisar caso</small><strong>Consultar</strong><small>${esc(q.reason)}</small></div></article>`;
    const meta=DATA.plans.find(p=>p.name===q.plan);
    const flags=planFlags(q,c);
    return `<article class="plan-card ${q.plan==='PLATA'?'featured':''}">
      <div class="plan-top"><h3>${esc(q.plan)}</h3><span class="tag">${esc(meta?.tag||'Medifé')}</span></div>
      <p class="plan-family">${esc(compositionLabel(c))}</p>
      <div class="plan-flags">${flags.slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
      <div class="plan-price"><small>Primera cuota estimada</small><strong>${money(q.finalPrice)}</strong><small class="price-note">${esc(cardSummary(q))}</small></div>
      <button class="button button--primary" data-plan="${esc(q.plan)}">Elegir plan <span>→</span></button>
    </article>`;
  }).join('');
  $$('[data-plan]').forEach(b=>b.addEventListener('click',()=>selectPlan(b.dataset.plan)));
}

function selectPlan(plan){
  const q=quote(plan,state.client);if(q.status!=='ok')return;
  state.plan=plan;state.quote=q;
  $('#selectedName').textContent=plan;
  $('#selectedPrice').textContent=money(q.finalPrice);
  $('#selectedRegular').textContent=q.finalPrice!==q.regularPrice?`Valor sin bonificaciones temporales: ${money(q.regularPrice)}`:'Valor mensual calculado';
  const flags=planFlags(q,state.client);$('#selectedPromo').textContent=flags.length?flags.join(' · '):'Sin bonificación temporal';
  $('#selectedBar').hidden=false;
  $('#selectedBar').scrollIntoView({behavior:'smooth',block:'end'});
}

$('#quoteForm').addEventListener('submit',e=>{
  e.preventDefault();syncCase();
  const err=validateClient(state.client);$('#formError').textContent=err||'';if(err)return;
  renderPlans();$('#resultados').hidden=false;$('#resultados').scrollIntoView({behavior:'smooth'});
});

function quoteDates(){
  const issued=new Date(),valid=new Date(issued.getTime()+VALIDITY_HOURS*3600000);
  const fmt=d=>new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(d);
  return {issued:fmt(issued),valid:fmt(valid)};
}
function footer(page,total){return `<div class="quote-footer"><span>Tarifario ${esc(DATA.version)} · vigencia ${VALIDITY_HOURS} hs</span><span>${page} / ${total} · Grupo Zeroka</span></div>`;}
function selectedPromotionLabel(c,q){
  const labels=[];
  if(q.strategicApplies&&c.promotion!=='none')labels.push(c.promotion==='4+6'?'Opción 4 + 6':`Opción ${c.promotion}`);
  if(c.option5&&q.strategicApplies)labels.push('Opción 5');
  if(q.tactical)labels.push(q.tactical.label);
  return labels.length?labels.join(' + '):'Sin descuento temporal';
}

function buildQuote(){
  const c=state.client,q=state.quote,plan=state.plan;if(!q||!plan)return;
  const dates=quoteDates(),total=3;
  const clientMeta=[c.dni?`DNI ${c.dni}`:null,c.region,c.category].filter(Boolean).join(' · ');
  const firstName=esc(c.name.split(/\s+/)[0]||c.name);
  const permanent=[];
  if(q.childDiscount)permanent.push(`Ajuste hijos −${money(q.childDiscount)}`);
  if(q.youngDiscount)permanent.push(`Segmento joven −${money(q.youngDiscount)}`);
  const promoLabel=selectedPromotionLabel(c,q);
  const memberRows=q.members.map(m=>`<div class="detail-row"><span><b>${esc(m.role)} · ${m.age} años</b><br><small>${esc(m.key)}</small></span><span>${money(m.listPrice)}</span></div>`).join('');
  const timeline=q.timeline.map(m=>`<div class="month-card"><b>Mes ${m.month}</b><span>${money(m.price)}</span><small>${m.totalRate?pct(m.totalRate)+' dto. temporal':'sin dto. temporal'}</small></div>`).join('');

  $('#quotePages').innerHTML=`
    <section class="quote-page quote-cover"><div class="quote-brand">medifé</div><div class="quote-cover-copy"><p>PROPUESTA PERSONALIZADA · ${esc(DATA.version.toUpperCase())}</p><h1>Hola, ${firstName}.<br>Esta es tu propuesta.</h1><p>${esc(clientMeta)}</p><p>Emitida ${esc(dates.issued)} · válida hasta ${esc(dates.valid)}</p></div><div class="cover-card"><div><small>PLAN ELEGIDO</small><strong>${esc(plan)}</strong><span>${esc(compositionLabel(c))}</span></div><div><small>PRIMERA CUOTA ESTIMADA</small><strong>${money(q.finalPrice)}</strong><span>${esc(promoLabel)}</span></div></div>${footer(1,total)}</section>
    <section class="quote-page"><div class="quote-content"><p class="eyebrow">DETALLE ECONÓMICO</p><h2>Cómo se forma el valor.</h2><p>La propuesta utiliza la tarifa de cada integrante y aplica únicamente las reglas compatibles con el caso cargado.</p><div class="quote-kpis"><div class="quote-kpi"><small>Precio de lista</small><strong>${money(q.listPrice)}</strong></div><div class="quote-kpi"><small>Ajustes permanentes</small><strong>− ${money(q.permanentDiscount)}</strong></div><div class="quote-kpi"><small>${c.category==='Obligatorio'?'Aportes':'IVA'}</small><strong>${c.category==='Obligatorio'?`− ${money(q.contribution)}`:'10,5%'}</strong></div></div><div class="detail-list">${memberRows}<div class="detail-row"><span><b>Precio luego de ajustes permanentes</b><br><small>${esc(permanent.join(' · ')||'Sin ajustes permanentes')}</small></span><span>${money(q.adjustedPrice)}</span></div>${c.category==='Obligatorio'?`<div class="detail-row"><span><b>Aportes computables</b><br><small>Se descuentan después de las bonificaciones temporales.</small></span><span>− ${money(q.contribution)}</span></div>`:`<div class="detail-row"><span><b>IVA Voluntario</b><br><small>10,5% aplicado luego de descuentos.</small></span><span>10,5%</span></div>`}</div><div class="quote-note">No se aplican descuentos dependientes de una filial específica porque esta versión trabaja por región tarifaria. GAF/afinidades está deliberadamente desactivado.</div></div>${footer(2,total)}</section>
    <section class="quote-page"><div class="quote-content"><p class="eyebrow">CRONOGRAMA</p><h2>Cuota estimada mes a mes.</h2><p><b>${esc(promoLabel)}</b>. Las promociones se calculan sobre el precio luego de ajustes permanentes; en Obligatorio los aportes se descuentan al final y en Voluntario se suma IVA 10,5%.</p><div class="timeline">${timeline}</div><div class="quote-note">Los importes están calculados con el tarifario ${esc(DATA.version)} y no proyectan futuros aumentos de cuota. La propuesta es comercial y queda sujeta a las condiciones de afiliación y validaciones de Medifé.</div></div>${footer(3,total)}</section>`;
}

$('#openQuote').addEventListener('click',()=>{buildQuote();$('#quoteDialog').showModal();});
$('#closeQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#quoteDialog').addEventListener('click',e=>{if(e.target===$('#quoteDialog'))$('#quoteDialog').close();});

$('#downloadQuote').addEventListener('click',async()=>{
  buildQuote();
  const btn=$('#downloadQuote'),old=btn.textContent;btn.disabled=true;btn.textContent='Generando…';
  try{
    if(!window.html2canvas||!window.jspdf?.jsPDF)throw new Error('No se cargó el generador PDF.');
    const {jsPDF}=window.jspdf;const pages=$$('.quote-page',$('#quotePages'));const pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
    for(let i=0;i<pages.length;i++){
      const canvas=await html2canvas(pages[i],{scale:1.5,useCORS:true,backgroundColor:'#ffffff',logging:false});
      const img=canvas.toDataURL('image/jpeg',0.92);if(i>0)pdf.addPage('a4','portrait');
      pdf.addImage(img,'JPEG',0,0,595.28,841.89);
    }
    const safe=(state.client.name||'cliente').replace(/[^a-z0-9áéíóúñ]+/gi,'_').replace(/^_|_$/g,'');
    pdf.save(`Cotizacion_Medife_${safe}_${state.plan}.pdf`);
  }catch(err){alert(err.message||'No se pudo generar el PDF.');}
  finally{btn.disabled=false;btn.textContent=old;}
});

$('#logoutButton').addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST'})}finally{location.href='login.html';}});

syncConditionalUI();renderChildAges(0);syncPromotionOptions();syncCase();
