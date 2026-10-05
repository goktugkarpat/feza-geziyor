/* Nokta (.) tuşuyla açılıp kapanan FPS ve çözünürlük göstergesi (Bahtiyar'daki gibi). Yalnız ebeveyn içindir; oyunu etkilemez. */
'use strict';
window.FLASH_PERF = (() => {
  const renderer = FLASH_CORE.renderer;
  let box = null, on = false, frames = 0, start = 0;

  function toggle() {
    on = !on;
    if (on && !box) {
      box = document.createElement('pre');
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:60;margin:0;padding:8px 12px;pointer-events:none;' +
        'background:#000b;color:#d7e3d8;font:600 14px/1.5 system-ui,sans-serif;font-variant-numeric:tabular-nums;border-radius:6px;white-space:pre;';
      box.textContent = 'FPS ölçülüyor…';
      document.body.appendChild(box);
    }
    if (box) box.hidden = !on;
    frames = 0; start = 0;
  }
  addEventListener('keydown', e => {
    if (e.code !== 'Period' && e.key !== '.') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || (e.target.matches && e.target.matches('select,input,textarea'))) return;
    toggle();
  });

  // Her gerçek çizimden sonra çağrılır; yarım saniyede bir FPS ve çözünürlüğü yazar.
  function draw(now) {
    if (!on) return;
    if (!start) { start = now; frames = 0; return; }
    frames++;
    const span = now - start;
    if (span < 500) return;
    const canvas = renderer.domElement;
    box.textContent = Math.round(frames * 1000 / span) + ' FPS\n' + canvas.width + ' × ' + canvas.height;
    start = now; frames = 0;
  }
  return { draw, toggle };
})();
