(() => {
  'use strict';

  // Cargamos la capa visual del PDF después de pdf-v4.css para que gane prioridad.
  if (typeof document !== 'undefined' && !document.querySelector('link[data-medife-pdf-v6]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'css/pdf-v6.css';
    css.dataset.medifePdfV6 = '1';
    document.head.appendChild(css);
  }

  const current = document.querySelector('#downloadQuote');
  if (!current) return;

  // El listener original es anónimo. Clonamos el botón para removerlo sin tocar app-v2.js.
  const btn = current.cloneNode(true);
  current.replaceWith(btn);

  const pageW = 595.28;
  const pageH = 841.89;

  async function capturePage(page) {
    // Una copia sin escala evita exportar el PDF al tamaño de la pantalla del celular.
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:794px;z-index:-1;pointer-events:none';
    host.setAttribute('aria-hidden', 'true');
    const copy = page.cloneNode(true);
    copy.style.transform = 'none';
    copy.style.margin = '0';
    host.appendChild(copy);
    document.body.appendChild(host);
    try {
      await Promise.all(Array.from(copy.querySelectorAll('img')).map(img => img.decode()));
      return await html2canvas(copy, {
        scale: 2.35,
        width: 794,
        height: 1123,
        windowWidth: 1024,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
    } finally {
      host.remove();
    }
  }

  btn.addEventListener('click', async () => {
    buildQuote();
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generando…';

    try {
      if (!window.html2canvas || !window.jspdf?.jsPDF) {
        throw new Error('No se cargó el generador PDF.');
      }

      const { jsPDF } = window.jspdf;
      const pages = $$('.quote-page', $('#quotePages'));
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage('a4', 'portrait');

        const canvas = await capturePage(pages[i]);
        const img = canvas.toDataURL('image/png');
        pdf.addImage(img, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
      }

      const safe = (state.client.name || 'cliente')
        .replace(/[^a-z0-9áéíóúñ]+/gi, '_')
        .replace(/^_|_$/g, '');
      pdf.save(`Cotizacion_Medife_${safe}_${state.plan}.pdf`);
    } catch (err) {
      alert(err.message || 'No se pudo generar el PDF.');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  });
})();
