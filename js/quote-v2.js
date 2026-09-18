/* PDF v2: portada Medifé + resumen comercial tipo resto de cotizadores. */
(() => {
  const logoWord=()=>`<span class="medife-wordmark">Medifé</span>`;
  const qFooter=(page,total)=>`<div class="medife-pdf-footer"><span>Tarifario ${esc(DATA.version)} · vigencia ${VALIDITY_HOURS} hs</span><span>${page} / ${total} · Grupo Zeroka</span></div>`;
  const summaryRow=(label,value,note='')=>`<div class="medife-summary-row"><b>${esc(label)}</b><span>${esc(value)}${note?`<small>${esc(note)}</small>`:''}</span></div>`;

  buildQuote = function buildQuoteV2(){
    const c=state.client,q=state.quote,plan=state.plan;if(!q||!plan)return;
    const dates=quoteDates(),total=3;
    const clientName=String(c.name||'Cliente').trim();
    const firstName=esc(clientName.split(/\s+/)[0]||clientName);
    const promoLabel=selectedPromotionLabel(c,q);
    const permanent=[];
    if(q.childDiscount) permanent.push(`Ajuste hijos - ${money(q.childDiscount)}`);
    if(q.youngDiscount) permanent.push(`Segmento joven - ${money(q.youngDiscount)}`);
    const adjustmentLabel=permanent.length?permanent.join(' · '):'Sin ajustes permanentes';
    const contributionLabel=c.category==='Obligatorio'?`- ${money(q.contribution)}`:'Incluido 10,5%';
    const contributionNote=c.category==='Obligatorio'?'Aporte computable estimado':'IVA aplicado luego de descuentos';
    const paymentLabel=c.paymentMethod==='TC'?'Tarjeta de crédito':'CBU';
    const meta=[c.dni?`DNI ${c.dni}`:null,c.region,c.category].filter(Boolean).join(' · ');
    const rows=[
      ['Grupo familiar',compositionLabel(c),''],
      ['Región · categoría',`${c.region} · ${c.category}`,''],
      ['Medio de pago',paymentLabel,''],
      ['Valor de lista',money(q.listPrice),''],
      ['Ajustes permanentes',q.permanentDiscount?`- ${money(q.permanentDiscount)}`:money(0),adjustmentLabel],
      [c.category==='Obligatorio'?'Aportes a descontar':'IVA',contributionLabel,contributionNote],
      ['Promoción aplicada',promoLabel,''],
      ['Valor regular actual',money(q.regularPrice),'Sin bonificaciones temporales']
    ];
    const timeline=q.timeline.map(m=>`<div class="month-card"><b>Mes ${m.month}</b><span>${money(m.price)}</span><small>${m.totalRate?pct(m.totalRate)+' dto. temporal':'sin dto. temporal'}</small></div>`).join('');

    $('#quotePages').innerHTML=`
      <section class="quote-page medife-pdf-page medife-cover">
        <div class="medife-cover-logo">${logoWord()}</div>
        <div class="medife-cover-kicker">NUEVA COTIZACIÓN · ${esc(DATA.version.toUpperCase())}</div>
        <h1>Hola, ${firstName}.<br>Tu propuesta Medifé.</h1>
        <p class="medife-cover-sub">Una propuesta clara para que puedas comparar el plan, el valor y los beneficios aplicados en tu cotización.</p>
        <div class="medife-cover-meta">${esc(meta)} · Emitida ${esc(dates.issued)} · válida hasta ${esc(dates.valid)}</div>
        <div class="medife-cover-card">
          <div><span>PLAN ELEGIDO</span><strong>${esc(plan)}</strong></div>
          <div><span>GRUPO FAMILIAR</span><strong>${esc(compositionLabel(c))}</strong></div>
          <div><span>PRIMERA CUOTA ESTIMADA</span><strong>${money(q.finalPrice)}</strong></div>
        </div>
        ${qFooter(1,total)}
      </section>

      <section class="quote-page medife-pdf-page medife-summary">
        <div class="medife-summary-panel">
          <header class="medife-summary-title"><span>| Nueva</span><strong>COTIZACIÓN</strong></header>
          <div class="medife-summary-plan"><span>PLAN</span><strong>${esc(plan)}</strong></div>
          <div class="medife-summary-table">${rows.map(r=>summaryRow(...r)).join('')}</div>
          <div class="medife-summary-total"><b>TOTAL · PRIMERA CUOTA</b><strong>${money(q.finalPrice)}</strong></div>
          <div class="medife-summary-legal">
            <p>*Los importes son una estimación comercial y pueden variar ante cambios en datos, tarifas o condiciones de contratación.</p>
            <p>*Tarifario ${esc(DATA.version)} · propuesta válida por ${VALIDITY_HOURS} hs. Los beneficios dependientes de filial no se aplican en esta versión.</p>
          </div>
          <div class="medife-summary-brand"><span class="logo-box">${logoWord()}</span><b>Grupo Zeroka · ${esc(dates.issued)}</b></div>
        </div>
      </section>

      <section class="quote-page medife-pdf-page medife-timeline">
        <div class="quote-content">
          <div class="medife-timeline-head"><div><p class="eyebrow">CRONOGRAMA COMERCIAL</p><h2>Cómo evoluciona tu cuota.</h2></div><span class="medife-timeline-logo">${logoWord()}</span></div>
          <p>El cronograma muestra los descuentos temporales seleccionados. Los valores permanecen sujetos a futuros aumentos generales de tarifa.</p>
          <div class="quote-kpis"><div class="quote-kpi"><small>Primera cuota</small><strong>${money(q.finalPrice)}</strong></div><div class="quote-kpi"><small>Valor regular actual</small><strong>${money(q.regularPrice)}</strong></div><div class="quote-kpi"><small>Beneficio comercial</small><strong>${esc(promoLabel)}</strong></div></div>
          <div class="timeline">${timeline}</div>
          <div class="quote-note">Cotización comercial elaborada por Grupo Zeroka. La contratación y cobertura definitiva quedan sujetas a la documentación y condiciones vigentes de Medifé.</div>
        </div>
        ${qFooter(3,total)}
      </section>`;
  };
})();
