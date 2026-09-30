/* PDF v2: portada Medifé + resumen comercial tipo resto de cotizadores. */
(() => {
  const logoWord=()=>`<span class="medife-wordmark">Medifé</span>`;
  const qFooter=(page,total)=>`<div class="medife-pdf-footer"><span>Tarifario ${esc(DATA.version)} · vigencia ${esc(VALIDITY_LABEL)}</span><span>${page} / ${total} · Grupo Zeroka</span></div>`;
  const summaryRow=(label,value,note='')=>`<div class="medife-summary-row"><b>${esc(label)}</b><span>${esc(value)}${note?`<small>${esc(note)}</small>`:''}</span></div>`;
  const timelineLabel=m=>m.commercialRate
    ? `${pct(m.commercialRate)} beneficio comercial`
    : (m.gafRate?`${pct(m.gafRate)} convenio`:(m.uccRate?`${pct(m.uccRate)} UCC`:'sin beneficio temporal'));
  const timelineGroups=timeline=>{
    const groups=[];
    for(const m of timeline||[]){
      const key=[Number(m.price).toFixed(2),Number(m.commercialRate||0).toFixed(6),Number(m.gafRate||0).toFixed(6),Number(m.uccRate||0).toFixed(6)].join('|');
      const prev=groups[groups.length-1];
      if(prev&&prev.key===key&&prev.end===m.month-1){prev.end=m.month;continue;}
      groups.push({key,start:m.month,end:m.month,row:m});
    }
    return groups;
  };

  buildQuote = function buildQuoteV2(){
    const c=state.client,q=state.quote,plan=state.plan;if(!q||!plan)return;
    const dates=quoteDates(),total=3;
    const clientName=String(c.name||'Cliente').trim();
    const firstName=esc(clientName.split(/\s+/)[0]||clientName);
    const promoLabel=selectedPromotionLabel(c,q);
    const permanent=[];
    if(q.childDiscount){
      const rule=q.childAdjustmentRate?`${pct(q.childAdjustmentRate)} sobre tarifa de hijos elegibles`:'';
      const impact=q.childEffectiveDiscountRate?`${pct(q.childEffectiveDiscountRate)} impacto sobre el grupo`:'';
      permanent.push(`Ajuste hijos${rule?` · ${rule}`:''}${impact?` · ${impact}`:''} - ${money(q.childDiscount)}`);
    }
    if(q.youngDiscount) permanent.push(`Segmento joven - ${money(q.youngDiscount)}`);
    if(q.filialDiscount) permanent.push(`${q.filialLabel||'Descuento filial'} - ${money(q.filialDiscount)}`);
    const adjustmentLabel=permanent.length?permanent.join(' · '):'Sin ajustes seleccionados';
    const contributionLabel=c.category==='Obligatorio'?`- ${money(q.contribution)}`:'10,5%';
    const contributionNote=c.category==='Obligatorio'?'Aporte computable estimado':'IVA aplicado luego de descuentos';
    const meta=[c.dni?`DNI ${c.dni}`:null,c.region,c.filial,c.category].filter(Boolean).join(' · ');
    const rows=[
      ['Grupo familiar',compositionLabel(c),''],
      ['Región · filial',`${c.region} · ${c.filial}`,''],
      ['Categoría',c.category,''],
      ['Precio base del grupo',money(q.listPrice),'Antes de beneficios'],
      ['Ajustes seleccionados',q.permanentDiscount?`- ${money(q.permanentDiscount)}`:money(0),adjustmentLabel],
      ['Promoción comercial',promoLabel,''],
      ...(q.uccRate?[['UCC',`${pct(q.uccRate)} dto.`, 'Empleador acumulable']]:[]),
      [c.category==='Obligatorio'?'Aportes a descontar':'IVA',contributionLabel,contributionNote],
      ...(q.gafRate?[['Convenio / afinidad',`${q.gaf?.label||'GAF'} · ${pct(q.gafRate)}`,'Aplicado sobre el valor final previo al convenio']]:[]),
      ['Valor regular actual',money(q.regularPrice),'Sin beneficios temporales']
    ];
    const timeline=timelineGroups(q.timeline).map(g=>{
      const period=g.start===g.end?`Mes ${g.start}`:`Meses ${g.start}–${g.end}`;
      return `<div class="month-card"><b>${period}</b><span>${money(g.row.price)}</span><small>${timelineLabel(g.row)}</small></div>`;
    }).join('');

    $('#quotePages').innerHTML=`
      <section class="quote-page medife-pdf-page medife-cover">
        <div class="medife-cover-logo">${logoWord()}</div>
        <div class="medife-cover-kicker">PROPUESTA MEDIFÉ · ${esc(DATA.version.toUpperCase())}</div>
        <h1>Hola, ${firstName}.<br>Esta es tu propuesta.</h1>
        <p class="medife-cover-sub">Plan, primera cuota y evolución de los beneficios elegidos para este caso, presentados de forma simple.</p>
        <div class="medife-cover-meta">${esc(meta)} · Emitida ${esc(dates.issued)} · vigencia ${esc(VALIDITY_LABEL)}</div>
        <div class="medife-cover-card">
          <div><span>PLAN ELEGIDO</span><strong>${esc(plan)}</strong></div>
          <div><span>GRUPO FAMILIAR</span><strong>${esc(compositionLabel(c))}</strong></div>
          <div><span>PRIMERA CUOTA ESTIMADA</span><strong>${money(q.finalPrice)}</strong></div>
        </div>
        ${qFooter(1,total)}
      </section>

      <section class="quote-page medife-pdf-page medife-summary">
        <div class="medife-summary-panel">
          <header class="medife-summary-title"><span>Tu</span><strong>PROPUESTA</strong></header>
          <div class="medife-summary-plan"><span>PLAN</span><strong>${esc(plan)}</strong></div>
          <div class="medife-summary-table">${rows.map(r=>summaryRow(...r)).join('')}</div>
          <div class="medife-summary-total"><b>PRIMERA CUOTA ESTIMADA</b><strong>${money(q.finalPrice)}</strong></div>
          <div class="medife-summary-legal">
            <p>*Los importes son una estimación comercial y pueden variar ante cambios en datos, tarifas o condiciones de contratación.</p>
            <p>*Tarifario ${esc(DATA.version)} · propuesta válida por ${esc(VALIDITY_LABEL)} desde su emisión. Los beneficios mostrados son únicamente los seleccionados por el asesor entre los compatibles con el caso.</p>
          </div>
          <div class="medife-summary-brand"><span class="logo-box">${logoWord()}</span><b>Grupo Zeroka · ${esc(dates.issued)}</b></div>
        </div>
      </section>

      <section class="quote-page medife-pdf-page medife-timeline">
        <div class="quote-content">
          <div class="medife-timeline-head"><div><p class="eyebrow">EVOLUCIÓN DE LA PROPUESTA</p><h2>Cómo cambia la cuota.</h2></div><span class="medife-timeline-logo">${logoWord()}</span></div>
          <p>Agrupamos los meses que mantienen el mismo valor y beneficio para que sea fácil entender qué pasa en cada etapa.</p>
          <div class="quote-kpis"><div class="quote-kpi"><small>Primera cuota</small><strong>${money(q.finalPrice)}</strong></div><div class="quote-kpi"><small>Valor regular actual</small><strong>${money(q.regularPrice)}</strong></div><div class="quote-kpi"><small>Beneficio comercial</small><strong>${esc(promoLabel)}</strong></div></div>
          <div class="timeline">${timeline}</div>
          <div class="quote-note">Cotización comercial elaborada por Grupo Zeroka. La contratación y cobertura definitiva quedan sujetas a la documentación y condiciones vigentes de Medifé.</div>
        </div>
        ${qFooter(3,total)}
      </section>`;
  };

  // Capas visuales/comerciales cargadas después de la app auditada.
  if(typeof document!=='undefined'){
    const pdfCss=document.createElement('link');pdfCss.rel='stylesheet';pdfCss.href='css/pdf-v4.css';document.head.appendChild(pdfCss);
    const css=document.createElement('link');css.rel='stylesheet';css.href='css/configurator-v3.css';document.head.appendChild(css);
    const script=document.createElement('script');script.src='js/configurator-v3.js';document.body.appendChild(script);
  }
})();
