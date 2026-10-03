/* PDF v2: portada fotográfica + resumen comercial. */
(() => {
  const qFooter=(page,total)=>`<div class="medife-pdf-footer"><span>Tarifario ${esc(DATA.version)} · vigencia ${esc(VALIDITY_LABEL)}</span><span>${page} / ${total} · Grupo Zeroka</span></div>`;
  const summaryRow=(label,value,note='')=>`<div class="medife-summary-row${note?' has-note':''}${note.length>95?' has-long-note':''}"><b>${esc(label)}</b><span class="${value.length>35?'is-long':value.length>24?'is-medium':''}">${esc(value)}${note?`<small>${esc(note)}</small>`:''}</span></div>`;
  const timelineLabel=m=>m.option6Rate
    ? `Opción 6 · ${pct(m.option6Rate)} por tarjeta`
    : m.commercialRate
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
    const total=3;
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
    const rows=[
      ['Grupo familiar',compositionLabel(c),''],
      ['Región · filial',`${c.region} · ${c.filial}`,''],
      ['Categoría',c.category,''],
      ['Precio base del grupo',money(q.listPrice),'Antes de beneficios'],
      ['Ajustes seleccionados',q.permanentDiscount?`- ${money(q.permanentDiscount)}`:money(0),adjustmentLabel],
      ['Promoción comercial',promoLabel,''],
      ...(q.selection?.option6?[['Medio de pago','Débito automático con tarjeta de crédito','Opción 6: continuidad de Opción 4 durante los meses 13–24']]:[]),
      ...(q.uccRate?[['UCC',`${pct(q.uccRate)} dto.`, 'Empleador acumulable']]:[]),
      [c.category==='Obligatorio'?'Aportes a descontar':'IVA',contributionLabel,contributionNote],
      ...(q.gafRate?[['Convenio / afinidad',`${q.gaf?.label||'GAF'} · ${pct(q.gafRate)}`,'Aplicado sobre el valor final previo al convenio']]:[]),
      ['Valor regular actual',money(q.regularPrice),'Sin beneficios temporales']
    ];
    const groups=timelineGroups(q.timeline);
    const maxPrice=Math.max(q.regularPrice,...groups.map(g=>g.row.price),1);
    const timeline=groups.map((g,index)=>{
      const period=g.start===g.end?`Mes ${g.start}`:`Meses ${g.start}–${g.end}`;
      return `<div class="month-card${index===0?' is-first':''}"><div class="month-card-head"><i>${String(index+1).padStart(2,'0')}</i><b>${period}</b></div><span>${money(g.row.price)}</span><small>${timelineLabel(g.row)}</small><div class="month-price-track" aria-hidden="true"><div style="width:${Math.max(0,Math.min(100,g.row.price/maxPrice*100)).toFixed(2)}%"></div></div></div>`;
    }).join('');
    const coverSrc='assets/medife-cover-hola.jpg';

    $('#quotePages').innerHTML=`
      <section class="quote-page medife-pdf-page medife-cover" aria-label="Portada de la cotización">
        <img class="medife-cover-photo" src="${coverSrc}" alt="">
      </section>

      <section class="quote-page medife-pdf-page medife-summary${rows.length>8?' medife-summary--dense':''}">
        <div class="medife-summary-panel">
          <header class="medife-summary-title"><span>Tu</span><strong>COTIZACIÓN</strong></header>
          <div class="medife-summary-plan"><span>PLAN MEDIFÉ</span><strong>${esc(plan)}</strong></div>
          <div class="medife-summary-table">${rows.map(r=>summaryRow(...r)).join('')}</div>
          <div class="medife-summary-total"><b>PRIMERA CUOTA ESTIMADA</b><strong>${money(q.finalPrice)}</strong></div>
          <div class="medife-summary-legal">
            <p>*Los importes son una estimación comercial y pueden variar ante cambios en datos, tarifas o condiciones de contratación.</p>
            <p>*Tarifario ${esc(DATA.version)} · propuesta válida por ${esc(VALIDITY_LABEL)} desde su emisión. Los beneficios mostrados son únicamente los seleccionados por el asesor entre los compatibles con el caso.</p>
          </div>
        </div>
        ${qFooter(2,total)}
      </section>

      <section class="quote-page medife-pdf-page medife-timeline${groups.length>4?' medife-timeline--dense':''}">
        <header class="medife-timeline-head"><p class="eyebrow">EVOLUCIÓN DE TU COTIZACIÓN</p><h2>Tu cuota,<br>etapa por etapa.</h2><p>Los valores y beneficios de la propuesta que elegiste, ordenados en el tiempo.</p></header>
        <div class="quote-content">
          <div class="quote-kpis"><div class="quote-kpi"><small>Primera cuota</small><strong>${money(q.finalPrice)}</strong></div><div class="quote-kpi"><small>Valor regular actual</small><strong>${money(q.regularPrice)}</strong></div><div class="quote-kpi"><small>Beneficio comercial</small><strong>${esc(promoLabel)}</strong></div></div>
          <div class="medife-stages-title"><h3>Así se organiza tu propuesta</h3><span>${q.timeline.length} meses de referencia</span></div>
          <div class="timeline">${timeline}</div>
          <aside class="medife-timeline-guide"><h3>Cómo leer estos valores</h3><div><b>Beneficios seleccionados</b><p>Cada etapa muestra los beneficios que elegiste y el importe calculado para esos meses.</p></div><div><b>Cuando termina una etapa</b><p>La cuota cambia si finaliza o se modifica un beneficio temporal. Los meses con el mismo valor se agrupan.</p></div><div><b>Una referencia al tarifario actual</b><p>Esta evolución no incluye futuros aumentos de tarifa. Los importes pueden variar si cambian las condiciones.</p></div></aside>
          <div class="quote-note">Cotización comercial elaborada por Grupo Zeroka. La contratación y cobertura definitiva quedan sujetas a la documentación y condiciones vigentes de Medifé.</div>
        </div>
        ${qFooter(3,total)}
      </section>`;
  };

  if(typeof document!=='undefined'){
    const pdfCss=document.createElement('link');pdfCss.rel='stylesheet';pdfCss.href='css/pdf-v4.css';document.head.appendChild(pdfCss);
  }
})();
