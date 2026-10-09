'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const ENGINE=window.MEDIFE_ENGINE;
if(!ENGINE) throw new Error('No se pudo cargar el motor Medifé.');
const GEOGRAPHY=window.MEDIFE_GEOGRAPHY;
if(!GEOGRAPHY) throw new Error('No se pudo cargar la geografía comercial Medifé.');
const {DATA,quote,quoteAll,strategicEligibility,gafEligibility,validateClient}=ENGINE;
const VALIDITY_LABEL='7 días hábiles';

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

function fillGeographySelect(select, options, placeholder, previous='', automatic=false){
  select.innerHTML=`<option value="">${esc(placeholder)}</option>`+options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  select.value=options.some(o=>o.value===previous)?previous:(automatic&&options.length===1?options[0].value:'');
  select.disabled=options.length===0;
}
fillGeographySelect($('#province'),GEOGRAPHY.provinces,'Seleccioná la provincia');
function fillGafSelect(){
  const select=$('#gaf');
  const previous=select.value||'none';
  const draft={
    category:$('input[name="category"]:checked')?.value||'Obligatorio',
    region:$('#region').value
  };
  const values=gafEligibility(draft);
  select.innerHTML=values.map(v=>`<option value="${esc(v.value)}">${esc(v.label)}</option>`).join('');
  select.value=values.some(v=>v.value===previous)?previous:'none';
}
function syncGeography(changed=''){
  const pr=GEOGRAPHY.province($('#province').value);
  const zones=pr?.zones||[];
  const zoneSelect=$('#geographyZone');
  fillGeographySelect(zoneSelect,zones,pr?.tariffSelection?'Seleccioná el tarifario':'Seleccioná la zona',changed==='province'?'':zoneSelect.value,true);
  $('#geographyZoneHeading').textContent=pr?.tariffSelection?'Tarifario de la cotización':'Zona dentro de la provincia';
  $('#geographyZoneWrap').hidden=zones.length<2;
  zoneSelect.required=zones.length>1;
  const zo=GEOGRAPHY.zone(pr?.value,zoneSelect.value);
  $('#region').value=zo?.region||'';
  const filialSelect=$('#filial');
  const resetFilial=['province','geographyZone'].includes(changed);
  fillGeographySelect(filialSelect,zo?.filials||[],'Seleccioná la filial',resetFilial?'':filialSelect.value,true);
  const fi=GEOGRAPHY.filial(pr?.value,zoneSelect.value,filialSelect.value);
  const localitySelect=$('#locality');
  const scoped=pr?.value==='CABA'||zo?.region==='AMBA';
  const localities=(fi?.localities||[]).map(value=>({value,label:value}));
  if(fi&&!scoped)localities.push({value:GEOGRAPHY.OTHER,label:'Otra localidad · sin tarifa configurada'});
  fillGeographySelect(localitySelect,localities,'Seleccioná la localidad',resetFilial||changed==='filial'?'':localitySelect.value,scoped);
  $('#localityWrap').hidden=!fi;
  $('#noaProvince').value=fi?.value==='Noa'?pr.value:'';
  const norte=zo?.region==='Norte'&&GEOGRAPHY.canQuote(fi);
  $('#uccWrap').hidden=!norte;
  if(!norte||['province','geographyZone','filial'].includes(changed))$('#ucc').checked=false;
  let message='Primero seleccioná la provincia del domicilio del cliente.';
  let blocked=false;
  if(pr){
    if(!zones.length){message=pr.message;blocked=true;}
    else if(!zo)message=pr.tariffSelection?'Paraná está habilitada para cotizar. Seleccioná el tarifario Norte o Sur que corresponda a esta cotización.':'Esta provincia tiene distintas zonas tarifarias. Elegí la que corresponde al domicilio.';
    else if(!fi)message='Seleccioná la filial correspondiente al domicilio. Las opciones dependen de la provincia y zona.';
    else if(!GEOGRAPHY.canQuote(fi)){message=fi.message;blocked=true;}
    else if(localitySelect.value===GEOGRAPHY.OTHER){message='Esta localidad todavía no tiene una región tarifaria configurada. Elegí una localidad del listado.';blocked=true;}
    else if(fi.status==='tariff-only')message=`Podés cotizar con tarifa ${zo.region}. Se ofrecen los beneficios generales de la región, sin descuentos exclusivos de filial.`;
    else message=scoped?'Confirmá que el domicilio pertenece a esta zona.':'Elegí la localidad real del domicilio para ver los precios.';
  }
  $('#geographyHelp').textContent=message;
  $('#geographyHelp').dataset.blocked=String(blocked);
  $('#geographyResolved').hidden=!zo;
  $('#geographyResolved').textContent=zo?`${pr.tariffSelection?'Tarifario seleccionado':'Región tarifaria calculada'}: ${zo.region}${fi?` · ${fi.label}`:''}`:'';
  $('#filialHeading').textContent=fi?.status==='tariff-only'?'Zona comercial':'Filial comercial';
}

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
  if($$('.child-age',$('#childrenAgeFields')).length!==childCount)renderChildAges(childCount);
  fillGafSelect();
}

function readClient(promotionOverride){
  const category=$('input[name="category"]:checked')?.value||'Obligatorio';
  const hasPartner=$('#hasPartner').checked;
  const currentPromo=promotionOverride!==undefined?promotionOverride:($('#promotion').value||'none');
  return {
    name:$('#clientName').value.trim()||'Nueva cotización',dni:$('#clientDni').value.trim(),
    province:$('#province').value,geographyZone:$('#geographyZone').value,locality:$('#locality').value,
    region:$('#region').value,filial:$('#filial').value,noaProvince:$('#noaProvince').value,
    category,paymentMethod:$('#paymentMethod')?.value||null,
    procedencia:$('#procedencia').checked,exAssociate:$('#exAssociate').checked,
    gaf:$('#gaf').value||'none',ucc:$('#ucc').checked,
    age:Number($('#age').value),hasPartner,partnerAge:hasPartner?Number($('#partnerAge').value):0,
    childrenAges:childrenAgesFromUI(),
    contributionSource:category==='Obligatorio'?$('#contributionSource').value:null,
    receiptContribution:Number($('#receiptContribution').value)||0,
    monotributoCategory:$('#monotributoCategory').value,
    unifyPartnerContribution:category==='Obligatorio'&&hasPartner&&$('#unifyPartnerContribution').checked,
    partnerContributionSource:$('#partnerContributionSource').value,
    partnerReceiptContribution:Number($('#partnerReceiptContribution').value)||0,
    partnerMonotributoCategory:$('#partnerMonotributoCategory').value,
    promotion:currentPromo,option5:$('#option5').checked
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
  if(!canOption5)$('#option5').checked=false;
}
function compositionLabel(c){
  const bits=[`Titular ${c.age} años`];
  if(c.hasPartner)bits.push(`Pareja ${c.partnerAge}`);
  if(c.childrenAges.length)bits.push(`${c.childrenAges.length} hijo${c.childrenAges.length>1?'s':''}`);
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
  const filialLabel=GEOGRAPHY.filialLabel(c);
  $('#caseMode').textContent=[c.category,c.province||'Provincia pendiente',c.region,filialLabel,c.category==='Obligatorio'?'con aportes':''].filter(Boolean).join(' · ');
  $('#caseFilial').textContent=filialLabel||'A seleccionar';
}
function invalidateSelection(){state.plan=null;state.quote=null;$('#selectedBar').hidden=true;}

$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
$$('.choice').forEach(choice=>choice.addEventListener('click',()=>{const radio=$('input',choice);if(radio)radio.checked=true;syncCase();invalidateSelection();}));
for(const id of ['province','geographyZone','filial','locality']){
  $('#'+id).addEventListener('change',()=>{syncGeography(id);syncCase();invalidateSelection();$('#formError').textContent='';});
}
$('#children').addEventListener('input',()=>{renderChildAges($('#children').value);syncCase();invalidateSelection();});
$('#hasPartner').addEventListener('change',()=>{syncCase();invalidateSelection();});
$('#unifyPartnerContribution').addEventListener('change',()=>{syncCase();invalidateSelection();});
$('#contributionSource').addEventListener('change',()=>{syncContributionSource('');syncCase();invalidateSelection();});
$('#partnerContributionSource').addEventListener('change',()=>{syncContributionSource('partner');syncCase();invalidateSelection();});
$('#promotion').addEventListener('change',()=>{const c=readClient();$('#option5Wrap').hidden=!(['1','2','3'].includes(c.promotion)&&c.procedencia);if($('#option5Wrap').hidden)$('#option5').checked=false;invalidateSelection();syncCase();});
$('#quoteForm').addEventListener('input',e=>{if(e.target.id==='children'||e.target.id==='promotion')return;syncCase();invalidateSelection();});
$('#quoteForm').addEventListener('change',e=>{if(['province','geographyZone','filial','locality','children','promotion','hasPartner','unifyPartnerContribution','contributionSource','partnerContributionSource'].includes(e.target.id))return;syncCase();invalidateSelection();});

function planFlags(q,c){
  const flags=[];
  if(q.childDiscount>0)flags.push('Ajuste hijos');
  if(q.youngDiscount>0)flags.push('Segmento joven');
  if(q.filialDiscount>0)flags.push(q.filialLabel||'Descuento filial');
  if(q.tactical)flags.push(q.tactical.label);
  if(q.strategicApplies&&c.promotion!=='none')flags.push(`Opción ${c.promotion}`);
  if(c.option5&&q.strategicApplies)flags.push('Opción 5');
  if(q.uccRate>0)flags.push('UCC 15%');
  if(q.gafRate>0)flags.push(q.gaf?.label||'Convenio / afinidad');
  if(c.category==='Obligatorio'&&q.contribution>0)flags.push(`Aportes ${money(q.contribution)}`);
  if(c.category==='Voluntario')flags.push('IVA 10,5%');
  return flags;
}
function cardSummary(q){
  if(q.finalPrice===q.regularPrice)return 'Valor mensual calculado';
  return `Luego ${money(q.regularPrice)}${q.timeline.some(m=>m.commercialRate>0||m.gafRate>0)?' al finalizar beneficios temporales':''}`;
}
function renderPlans(){
  const c=state.client;
  const results=quoteAll(c).filter(q=>q.status!=='unavailable');
  if(!results.length){$('#plansGrid').innerHTML='<div class="empty-state"><b>No hay planes disponibles.</b><span>Revisá los datos ingresados.</span></div>';return;}
  $('#plansGrid').innerHTML=results.map(q=>{
    if(q.status!=='ok')return `<article class="plan-card"><div class="plan-top"><h3>${esc(q.plan)}</h3></div><div class="plan-price"><small>Revisar caso</small><strong>Consultar</strong><small>${esc(q.reason)}</small></div></article>`;
    const meta=DATA.plans.find(p=>p.name===q.plan);
    const flags=planFlags(q,c);
    return `<article class="plan-card ${q.plan==='PLATA'?'featured':''}"><div class="plan-top"><h3>${esc(q.plan)}</h3><span class="tag">${esc(meta?.tag||'Medifé')}</span></div><p class="plan-family">${esc(compositionLabel(c))}</p><div class="plan-flags">${flags.slice(0,5).map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="plan-price"><small>Primera cuota estimada</small><strong>${money(q.finalPrice)}</strong><small class="price-note">${esc(cardSummary(q))}</small></div><button class="button button--primary" data-plan="${esc(q.plan)}">Elegir plan <span>→</span></button></article>`;
  }).join('');
  $$('[data-plan]').forEach(b=>b.addEventListener('click',()=>selectPlan(b.dataset.plan)));
}
function selectPlan(plan){
  const q=quote(plan,state.client);if(q.status!=='ok')return;
  state.plan=plan;state.quote=q;
  $('#selectedName').textContent=plan;
  $('#selectedPrice').textContent=money(q.finalPrice);
  $('#selectedRegular').textContent=q.finalPrice!==q.regularPrice?`Valor sin beneficios temporales: ${money(q.regularPrice)}`:'Valor mensual calculado';
  const flags=planFlags(q,state.client);$('#selectedPromo').textContent=flags.length?flags.join(' · '):'Sin bonificación temporal';
  $('#selectedBar').hidden=false;$('#selectedBar').scrollIntoView({behavior:'smooth',block:'end'});
}
$('#quoteForm').addEventListener('submit',e=>{
  e.preventDefault();syncCase();
  const err=validateClient(state.client);$('#formError').textContent=err||'';if(err)return;
  renderPlans();$('#resultados').hidden=false;$('#resultados').scrollIntoView({behavior:'smooth'});
});

function quoteDates(){
  const issued=new Date();
  const fmt=d=>new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(d);
  return {issued:fmt(issued),validity:VALIDITY_LABEL};
}
function selectedPromotionLabel(c,q){
  const labels=[];
  if(q.strategicApplies&&c.promotion!=='none')labels.push(`Opción ${c.promotion}`);
  if(c.option5&&q.strategicApplies)labels.push('Opción 5');
  if(q.selection?.option6)labels.push('Opción 6 · débito TC, meses 13–24');
  if(q.tactical)labels.push(q.tactical.label);
  if(q.uccRate>0)labels.push('UCC 15%');
  if(q.gafRate>0)labels.push(q.gaf?.label||'Convenio / afinidad');
  return labels.length?labels.join(' + '):'Sin descuento temporal';
}
function buildQuote(){
  if(!state.quote||!state.plan)return;
  $('#quotePages').innerHTML=`<section class="quote-page"><div class="quote-content"><p class="eyebrow">COTIZACIÓN MEDIFÉ</p><h2>${esc(state.plan)}</h2><p>${esc(state.client.name)} · ${esc(state.client.region)} · ${esc(GEOGRAPHY.filialLabel(state.client))}</p><div class="quote-kpi"><small>Primera cuota estimada</small><strong>${money(state.quote.finalPrice)}</strong></div></div></section>`;
}
$('#openQuote').addEventListener('click',()=>{buildQuote();$('#quoteDialog').showModal();});
$('#closeQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#quoteDialog').addEventListener('click',e=>{if(e.target===$('#quoteDialog'))$('#quoteDialog').close();});
$('#downloadQuote').addEventListener('click',async()=>{
  buildQuote();const btn=$('#downloadQuote'),old=btn.textContent;btn.disabled=true;btn.textContent='Generando…';
  try{
    if(!window.html2canvas||!window.jspdf?.jsPDF)throw new Error('No se cargó el generador PDF.');
    const {jsPDF}=window.jspdf,pages=$$('.quote-page',$('#quotePages')),pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
    for(let i=0;i<pages.length;i++){
      const canvas=await html2canvas(pages[i],{scale:1.5,useCORS:true,backgroundColor:'#ffffff',logging:false});
      const img=canvas.toDataURL('image/jpeg',0.92);if(i>0)pdf.addPage('a4','portrait');pdf.addImage(img,'JPEG',0,0,595.28,841.89);
    }
    const safe=(state.client.name||'cliente').replace(/[^a-z0-9áéíóúñ]+/gi,'_').replace(/^_|_$/g,'');
    pdf.save(`Cotizacion_Medife_${safe}_${state.plan}.pdf`);
  }catch(err){alert(err.message||'No se pudo generar el PDF.');}finally{btn.disabled=false;btn.textContent=old;}
});
$('#logoutButton').addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST'})}finally{location.href='login.html';}});

syncGeography();renderChildAges(0);fillGafSelect();syncConditionalUI();syncPromotionOptions();syncCase();

