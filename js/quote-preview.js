/* Escala solo la vista previa. Las páginas fuente siempre conservan el tamaño A4. */
(() => {
  const container = document.querySelector('#quotePages');
  const dialog = document.querySelector('#quoteDialog');
  const zoomButton = document.querySelector('#toggleQuoteZoom');
  if (!container || !dialog) return;

  function fitPages() {
    const style = getComputedStyle(container);
    const available = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (available <= 0) return;
    const scale = Math.min(1, available / 794);
    const zoomed = container.classList.contains('is-zoomed') && matchMedia('(max-width:700px)').matches;
    for (const frame of container.querySelectorAll('.quote-page-preview')) {
      const page = frame.querySelector('.quote-page');
      frame.style.width = `${zoomed ? available : 794 * scale}px`;
      frame.style.height = `${zoomed ? 1123 : 1123 * scale}px`;
      frame.style.overflowX = zoomed ? 'auto' : 'hidden';
      frame.style.overflowY = 'hidden';
      page.style.transform = zoomed ? 'none' : `scale(${scale})`;
    }
  }

  zoomButton?.addEventListener('click', () => {
    const zoomed = container.classList.toggle('is-zoomed');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Ajustar a pantalla' : 'Ampliar para leer';
    fitPages();
  });

  const build = window.buildQuote;
  window.buildQuote = function () {
    build.apply(this, arguments);
    for (const page of container.querySelectorAll(':scope > .quote-page')) {
      const frame = document.createElement('div');
      frame.className = 'quote-page-preview';
      page.before(frame);
      frame.appendChild(page);
    }
    fitPages();
    requestAnimationFrame(fitPages);
  };
  new ResizeObserver(fitPages).observe(container);
  new MutationObserver(() => {
    if (dialog.open) requestAnimationFrame(fitPages);
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
})();
