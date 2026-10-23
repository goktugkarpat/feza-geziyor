/* Pasaport kitabı — window.FLASH_PASAPORT. Sözleşme: TASARIM.md §7.
 * Sayfaları çevrilen bir defter: kapak, sonra ülke başına bir çift sayfa (solda damga + rehber portresi, sağda üç çıkartma).
 * Her şey yalnız bu oturumda tutulur (her açılışta gezi sıfırdan başlar). Yazıya dayanmaz: resimler, damgalar, büyük oklar. */
(function () {
  'use strict';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function create(o) {
    var P = window.FLASH_PICTO, ulkeler = o.ulkeler, kazanilan = new Set(), damgalar = new Set(), sira = [];
    var kok = el('section', 'pk'); kok.id = 'pasaport-kitap'; kok.hidden = true; kok.setAttribute('aria-label', 'Pasaport');
    var kitap = el('div', 'pk-kitap'), sol = el('div', 'pk-sayfa pk-sol'), sag = el('div', 'pk-sayfa pk-sag'), sirt = el('div', 'pk-sirt');
    kitap.append(sol, sag, sirt);
    var geri = el('button', 'pk-ok pk-geri round', P.svg('back')); geri.setAttribute('aria-label', 'Önceki sayfa');
    var ileri = el('button', 'pk-ok pk-ileri round', P.svg('arrow')); ileri.setAttribute('aria-label', 'Sonraki sayfa');
    var kapat = el('button', 'pk-kapat round', P.svg('close')); kapat.setAttribute('aria-label', 'Pasaportu kapat');
    kok.append(kitap, geri, ileri, kapat); document.body.append(kok);
    var sayfa = 0, acik = false, cevriliyor = false;
    // Sayfa 0: kapak içi; 1..n: ülkeler (önce gidilenler, gezilme sırasıyla; sonra kalanlar).
    function ulkeSirasi() { var gidilen = sira.slice(); ulkeler.forEach(function (c) { if (gidilen.indexOf(c.id) < 0) gidilen.push(c.id); }); return gidilen.map(function (id) { return ulkeler.find(function (c) { return c.id === id; }); }); }
    function cikartmaSayisi(c) { return c.places.filter(function (p) { return kazanilan.has(c.id + ':' + p.id); }).length; }
    function kapakSol() {
      var d = el('div', 'pk-kapak');
      d.append(el('div', 'pk-kapak-simge', P.svg('globe')), el('div', 'pk-kapak-yildiz', P.svg('star') + P.svg('star') + P.svg('star')));
      var b = el('b', 'pk-kapak-ad'); b.textContent = 'FEZA'; d.append(b);
      return d;
    }
    function kapakSag() {
      var d = el('div', 'pk-ozet');
      var toplam = ulkeler.reduce(function (n, c) { return n + c.places.length; }, 0);
      var satir = el('div', 'pk-ozet-satir'); satir.append(el('span', 'pk-ozet-simge', P.svg('star'))); var s = el('b'); s.textContent = kazanilan.size + ' / ' + toplam; satir.append(s); d.append(satir);
      var dam = el('div', 'pk-ozet-damgalar');
      ulkeler.forEach(function (c) { var m = el('span', 'pk-mini-damga' + (damgalar.has(c.id) ? ' var' : '')); m.append(o.bayrak(c)); dam.append(m); });
      d.append(dam); return d;
    }
    function ulkeSol(c) {
      var d = el('div', 'pk-ulke-sol'), dm = el('button', 'pk-damga' + (damgalar.has(c.id) ? ' var' : ''));
      dm.setAttribute('aria-label', c.name);
      var resim = el('img', 'pk-damga-resim'); resim.src = 'assets/ui/country-' + c.id + '.png'; resim.alt = '';
      dm.append(resim, o.bayrak(c)); dm.onclick = function () { o.ses('choose-' + c.id); };
      var ad = el('b', 'pk-ulke-ad'); ad.textContent = c.id === 'us' ? 'Amerika' : c.name;
      d.append(ad, dm);
      var portre = o.portre ? o.portre(c.id) : null;
      if (portre) { var pr = el('img', 'pk-portre'); pr.src = portre; pr.alt = ''; d.append(pr); }
      return d;
    }
    function ulkeSag(c) {
      var d = el('div', 'pk-ulke-sag');
      c.places.forEach(function (p, i) {
        var var_ = kazanilan.has(c.id + ':' + p.id), b = el('button', 'pk-cikartma' + (var_ ? ' var' : ''));
        b.style.setProperty('--egim', ((i % 2 ? 1 : -1) * (3 + i * 2)) + 'deg');
        b.setAttribute('aria-label', p.name);
        var img = el('img'); img.src = o.resim(c, p); img.alt = ''; b.append(img);
        if (!var_) b.append(el('span', 'pk-soru', P.svg('star')));
        b.onclick = function () { if (var_) o.ses('place-' + c.id + '-' + p.id); };
        d.append(b);
      });
      return d;
    }
    function icerik(i) { if (i === 0) return [kapakSol(), kapakSag()]; var c = ulkeSirasi()[i - 1]; return [ulkeSol(c), ulkeSag(c)]; }
    function ciz() { var k = icerik(sayfa); sol.replaceChildren(k[0]); sag.replaceChildren(k[1]); geri.disabled = sayfa === 0; ileri.disabled = sayfa >= ulkeler.length; }
    function cevir(yon) {
      var yeni = sayfa + yon; if (cevriliyor || yeni < 0 || yeni > ulkeler.length) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { sayfa = yeni; ciz(); return; }
      cevriliyor = true;
      var eski = icerik(sayfa), gelen = icerik(yeni);
      // Çevrilen yaprak: önünde eski sayfa, arkasında yeni sayfa. Altında öbür taraf zaten yeni içerikle durur.
      var yaprak = el('div', 'pk-yaprak ' + (yon > 0 ? 'pk-yaprak-ileri' : 'pk-yaprak-geri')), on = el('div', 'pk-sayfa pk-on'), arka = el('div', 'pk-sayfa pk-arka');
      if (yon > 0) { on.append(eski[1]); arka.append(gelen[0]); sag.replaceChildren(gelen[1]); }
      else { on.append(eski[0]); arka.append(gelen[1]); sol.replaceChildren(gelen[0]); }
      yaprak.append(on, arka); kitap.append(yaprak);
      o.efekt && o.efekt('sayfa');
      setTimeout(function () { yaprak.remove(); sayfa = yeni; ciz(); cevriliyor = false; }, 620);
    }
    geri.onclick = function () { cevir(-1); }; ileri.onclick = function () { cevir(1); };
    kapat.onclick = function () { kapa(); };
    var kayDown = null;
    kitap.addEventListener('pointerdown', function (e) { kayDown = { x: e.clientX, y: e.clientY }; });
    kitap.addEventListener('pointerup', function (e) { if (!kayDown) return; var dx = e.clientX - kayDown.x, dy = e.clientY - kayDown.y; kayDown = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) cevir(dx < 0 ? 1 : -1); });
    function ac(ulkeId) {
      if (ulkeId) { var i = ulkeSirasi().findIndex(function (c) { return c.id === ulkeId; }); sayfa = i >= 0 ? i + 1 : 0; } else sayfa = 0;
      ciz(); kok.hidden = false; acik = true; o.ses('pasaport-ac');
    }
    function kapa() { kok.hidden = true; acik = false; if (o.kapaninca) o.kapaninca(); }
    function sayac() { if (o.sayacGuncelle) o.sayacGuncelle(kazanilan.size); }
    // Çıkartma ekran ortasında belirir, büyür, sonra pasaport düğmesine uçar.
    function uc(src, damga, c) {
      var hedef = o.buton && !o.buton.hidden ? o.buton.getBoundingClientRect() : { left: innerWidth - 80, top: 20, width: 60, height: 60 };
      var u = el('div', damga ? 'pk-ucan pk-ucan-damga' : 'pk-ucan');
      if (damga) { var im = el('img'); im.src = 'assets/ui/country-' + c.id + '.png'; im.alt = ''; u.append(im, o.bayrak(c)); }
      else { var img = el('img'); img.src = src; img.alt = ''; u.append(img); }
      document.body.append(u);
      var hx = hedef.left + hedef.width / 2 - innerWidth / 2, hy = hedef.top + hedef.height / 2 - innerHeight / 2;
      u.animate([
        { transform: 'translate(-50%,-50%) scale(.2) rotate(-20deg)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.15) rotate(' + (damga ? -8 : 6) + 'deg)', opacity: 1, offset: 0.18 },
        { transform: 'translate(-50%,-50%) scale(1) rotate(' + (damga ? -8 : 4) + 'deg)', opacity: 1, offset: 0.62 },
        { transform: 'translate(calc(-50% + ' + hx + 'px), calc(-50% + ' + hy + 'px)) scale(.18) rotate(0deg)', opacity: 0.9 }
      ], { duration: damga ? 2600 : 2100, easing: 'ease-in-out', fill: 'forwards' }).onfinish = function () {
        u.remove(); sayac();
        if (o.buton) o.buton.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
      };
    }
    function yerKazan(cid, pid) {
      var key = cid + ':' + pid; if (kazanilan.has(key)) return false;
      kazanilan.add(key); if (sira.indexOf(cid) < 0) sira.push(cid);
      var c = ulkeler.find(function (x) { return x.id === cid; }), p = c && c.places.find(function (x) { return x.id === pid; });
      if (!p) return false;
      o.efekt && o.efekt('cikartma');
      uc(o.resim(c, p), false, c);
      if (cikartmaSayisi(c) === c.places.length && !damgalar.has(cid)) {
        damgalar.add(cid);
        setTimeout(function () { o.efekt && o.efekt('damga'); o.ses('ulke-damga'); uc(null, true, c); }, 2300);
      }
      return true;
    }
    function ulkeGeldi(cid) { if (sira.indexOf(cid) < 0) sira.push(cid); }
    return {
      ac: ac, kapat: kapa, yerKazan: yerKazan, ulkeGeldi: ulkeGeldi,
      get acik() { return acik; }, var: function (cid, pid) { return kazanilan.has(cid + ':' + pid); },
      sayi: function () { return kazanilan.size; }, damgaVar: function (cid) { return damgalar.has(cid); },
      durum: function () { return { cikartma: Array.from(kazanilan), damga: Array.from(damgalar), acik: acik, sayfa: sayfa }; },
      cevir: cevir
    };
  }
  window.FLASH_PASAPORT = Object.freeze({ create: create });
}());
