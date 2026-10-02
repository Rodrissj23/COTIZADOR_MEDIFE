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

  async function addCoverDirect(pdf, page) {
    const image = page.querySelector('.medife-cover-photo');
    if (!image) return false;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('No se pudo cargar la portada. Intentá descargar de nuevo.');
    }

    // Mantener proporción original y cubrir A4 sin deformar la imagen.
    const scale = Math.max(pageW / image.naturalWidth, pageH / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (pageW - width) / 2;
    const y = (pageH - height) / 2;
    pdf.addImage(image, 'PNG', x, y, width, height, undefined, 'FAST');
    return true;
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

        // La portada se inserta con sus píxeles originales y compresión sin pérdida.
        if (i === 0 && await addCoverDirect(pdf, pages[i])) continue;

        // Las páginas con texto se exportan a mayor escala y como PNG para mantener nitidez.
        const canvas = await html2canvas(pages[i], {
          scale: 2.35,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
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
