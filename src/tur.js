/* Kayıtlı ülkede "canlı dünya turu" oturumu — window.FLASH_TUR. Sözleşme: TASARIM.md §1, §3–§7.
 * app.js ülke hazırlığında FLASH_TUR.hazirla(ulke, uyg) çağırır; kayıt yoksa null döner ve ülke eski sistemle oynar.
 * Oturum: rehber karşılaması → rota boyunca öncülük → yere özgü mini oyun → taşıt yolculukları → pasaport çıkartması.
 * uyg (app.js'ten): { dunya, kamera, renderer, feza, bilbo, carpisma(x,z,m), yolBul(hedef, r, bas), kos(x,z,r), ses(id,ayar),
 *   efekt(ad), cing(i,son), kutla(sn), pasaport, resim(c,p), azHareket, kapiKonum() } */
(function () {
  'use strict';
  var T = window.THREE, P = window.FLASH_PICTO, Y = window.FLASH_MINI.yardim;
  var portreler = {};
  var _v = new T.Vector3(), _w = new T.Vector3(), _ray = new T.Raycaster(), _ndc = new T.Vector2(), _plane = new T.Plane(new T.Vector3(0, 1, 0), 0);

  // Ortak DOM: rehber balonu, taşıt durağı işaretleri, oyundan çıkış düğmesi (bir kez yaratılır, oturumlar paylaşır).
  var dom = null;
  function domHazirla() {
    if (dom) return dom;
    var balon = document.createElement('button'); balon.id = 'rehber-balon'; balon.hidden = true; balon.setAttribute('aria-label', 'Rehberin gösterdiği yere koş');
    var bimg = document.createElement('img'); bimg.alt = ''; var bsim = document.createElement('span'); bsim.className = 'rehber-balon-simge';
    balon.append(bimg, bsim);
    var cik = document.createElement('button'); cik.id = 'oyun-cik'; cik.hidden = true; cik.className = 'icon-button'; cik.setAttribute('aria-label', 'Oyundan çık, gezmeye devam');
    cik.innerHTML = P.svg('foot') + P.svg('arrow');
    var duraklar = document.createElement('div'); duraklar.id = 'tasit-duraklari';
    document.body.append(balon, cik, duraklar);
    dom = { balon: balon, bimg: bimg, bsim: bsim, cik: cik, duraklar: duraklar };
    return dom;
  }

  function hazirla(ulke, uyg) {
    var kayit = window.FLASH_ULKE && window.FLASH_ULKE.al(ulke.id);
    if (!kayit || !window.FLASH_ULKE.var(ulke.id)) return null;
    var D = domHazirla(), kok = new T.Group(); kok.name = 'tur-' + ulke.id; uyg.dunya.add(kok);
    var havuz = Y.havuz(), zaman = 0;
    var yerler = {}; ulke.places.forEach(function (p) { yerler[p.id] = p; });
    var ctx = {
      THREE: T, ulke: ulke, dunya: kok, kok: kok, havuz: havuz, azHareket: uyg.azHareket, kit: Y,
      yer: function (id) { return yerler[id]; }, zemin: function () { return 0; },
      carpisma: uyg.carpisma, ses: function (id) { uyg.ses(id); }, efekt: uyg.efekt, cing: uyg.cing,
      yolBul: function (bas, hedef, r) { return uyg.yolBul(hedef, r, bas); }
    };
    // ── İçerik ──
    // Ülkenin kendi kurduğu yer modelleri (places.js'teki eski modelin yerine). Yerel koordinat = yer merkezi.
    var ozelYerler = [];
    Object.keys(kayit.yerler || {}).forEach(function (id) {
      var p = yerler[id], yd = kayit.yerler[id]; if (!p || !yd.yap) return;
      var g = new T.Group(); g.name = 'yer-' + id; g.position.set(p.x, 0, p.z); kok.add(g);
      var y; try { y = yd.yap(Object.assign({}, ctx, { kok: g, yerBilgi: p })); } catch (e) { console.error('Yer modeli kurulamadı: ' + id, e); return; }
      if (y && y.root) g.add(y.root);
      if (y && y.engeller && uyg.engelEkle) uyg.engelEkle(y.engeller.map(function (c) { return { x: p.x + c.x, z: p.z + c.z, r: c.r }; }));
      ozelYerler.push({ g: g, y: y || {} });
    });
    var dekor = kayit.dekor ? kayit.dekor(ctx) : null; if (dekor && dekor.root) kok.add(dekor.root);
    if (dekor && dekor.engeller && uyg.engelEkle) uyg.engelEkle(dekor.engeller);
    var rehber = window.FLASH_REHBER.create(kayit.rehber, ctx);
    var tasitlar = (kayit.tasitlar || []).map(function (d) { return window.FLASH_TASIT.create(d, ctx); });
    var rs = kayit.rehber.sesler || {};
    var rota = (kayit.rota || ulke.places.map(function (p) { return p.id; }).concat(['kapi']));
    var bitenYer = new Set(), binilen = new Set();
    var faz = 'hazir', oyun = null, tasit = null, karsilamaSon = 0, gelSes = -99, gelSelam = 0, kapiDedi = false, dokunSira = 0, sonKarar = -1;
    var kameraTaraf = 0, fezaYolu = [], fezaHedef = null, fezaHiz = 0, fezaBak = new T.Vector3(), engelYer = null, binisBekle = null, hop = [], kameraHedef = null;
    var ovguSira = Math.floor(Math.random() * 6);
    // Portre (pasaport için): rehber yükleme perdesi altında bir kez küçük resme çizilir.
    function portreCiz() {
      if (portreler[ulke.id] || !uyg.renderer) return;
      var R = uyg.renderer, N = 192, sc = new T.Scene(), m = kayit.rehber.yap(window.FLASH_REHBER_KIT);
      m.guncelle(0.016, 0, { mod: 'bekle', hiz: 0, bak: null }); sc.add(m.root);
      sc.add(new T.HemisphereLight(0xfff3dd, 0x5f4b3d, 1.7)); var key = new T.DirectionalLight(0xffe5c4, 2.6); key.position.set(-2, 4, 5); sc.add(key);
      var boy = m.boy || 2, cam = new T.PerspectiveCamera(26, 1, 0.1, 50); cam.position.set(0.15, boy * 0.78, boy * 2.1); cam.lookAt(0, boy * 0.72, 0);
      var rt = new T.WebGLRenderTarget(N, N, { samples: 4 }); rt.texture.colorSpace = T.SRGBColorSpace;
      var eskiRT = R.getRenderTarget(), eskiR = R.getClearColor(new T.Color()), eskiA = R.getClearAlpha();
      try {
        R.setRenderTarget(rt); R.setClearColor(0, 0); R.clear(); R.render(sc, cam);
        var px = new Uint8Array(N * N * 4); R.readRenderTargetPixels(rt, 0, 0, N, N, px);
        var cv = document.createElement('canvas'); cv.width = cv.height = N; var g = cv.getContext('2d'), im = g.createImageData(N, N);
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var a = ((N - 1 - y) * N + x) * 4, b = (y * N + x) * 4, al = px[a + 3], k = al > 0 ? 255 / al : 0; im.data[b] = Math.min(255, px[a] * k); im.data[b + 1] = Math.min(255, px[a + 1] * k); im.data[b + 2] = Math.min(255, px[a + 2] * k); im.data[b + 3] = al; }
        g.putImageData(im, 0, 0); portreler[ulke.id] = cv.toDataURL('image/png');
      } catch (e) { /* portresiz pasaport da çalışır */ }
      finally { R.setRenderTarget(eskiRT); R.setClearColor(eskiR, eskiA); rt.dispose(); m.dispose(); }
    }
    portreCiz();

    // ── Rota ve hedef ──
    function adimBitti(a) {
      if (a === 'kapi') return false;
      if (yerler[a]) return bitenYer.has(a);
      var t = tasitlar.find(function (x) { return x.def.id === a; });
      if (!t) return true;
      // Taşıt adımı: binildiyse ya da sonraki yer zaten bittiyse tamam.
      var i = rota.indexOf(a), sonraki = rota.slice(i + 1).find(function (s) { return yerler[s]; });
      return binilen.has(a) || (sonraki && bitenYer.has(sonraki));
    }
    function siradaki() { for (var i = 0; i < rota.length; i++) if (!adimBitti(rota[i])) return rota[i]; return 'kapi'; }
    function hedefNokta(a, out) {
      out = out || {};
      if (yerler[a]) {
        var p = yerler[a], od = kayit.oyunlar[a], f = od && od.feza;
        // Yerin iniş tarafındaki önü; oyunun Feza noktasının yanı.
        if (f) { out.x = p.x + f[0] + 2.2; out.z = p.z + f[1] + 1.2; }
        else { var dx = 0 - p.x, dz = 25 - p.z, l = Math.hypot(dx, dz) || 1; out.x = p.x + dx / l * (p.radius + 1.5); out.z = p.z + dz / l * (p.radius + 1.5); }
        out.r = 1; out.resim = uyg.resim(ulke, p); out.ikon = null; return out;
      }
      var t = tasitlar.find(function (x) { return x.def.id === a; });
      if (t) { var d = t.durakNokta(t.durak); out.x = d.x + 2; out.z = d.z + 1.5; out.r = 1; out.resim = null; out.ikon = t.def.ikon; out.tasit = t; return out; }
      var k = uyg.kapiKonum(); out.x = k.x + 2.6; out.z = k.z + 2.2; out.r = 1; out.resim = null; out.ikon = 'globe'; return out;
    }

    // ── Feza'yı koşturma (dokunma) ──
    function fezayiGotur(a) {
      if (yerler[a]) { var p = yerler[a], od = kayit.oyunlar[a]; if (od && od.feza) uyg.kos(p.x + od.feza[0], p.z + od.feza[1], 1.2); else uyg.kos(p.x, p.z, p.radius - 1); return; }
      var t = tasitlar.find(function (x) { return x.def.id === a; });
      if (t) { istenenTasit = t; var d = t.durakNokta(t.durak); uyg.kos(d.x, d.z, 0.9); return; }
      var k = uyg.kapiKonum(); uyg.kos(k.x, k.z, 0.7, true);
    }

    // ── Karşılama ──
    function basla() {
      faz = 'karsilama'; zaman = 0;
      var f = uyg.feza.root.position;
      rehber.isinla(f.x + 7, f.z - 9, -2.4);
      rehber.git(f.x + 2.3, f.z - 2.4, { hiz: 6.5, varinca: function () {
        rehber.bak(uyg.feza.root.position); rehber.oyna('selam', 2.6); uyg.ses(rs.merhaba, { replacePending: true }); if (uyg.ilkMi && uyg.ilkMi()) uyg.ses('help-tour');
        if (uyg.feza.wave) uyg.feza.wave(2.4); if (uyg.bilbo) uyg.bilbo.sevin(1.6);
        karsilamaSon = zaman + 4.2;
      } });
      karsilamaSon = zaman + 9;
      rehber.bak(f);
    }
    function karsilamaBitir() { if (faz !== 'karsilama') return; faz = 'gezi'; rehber.oyna('konus', 1.2); }

    // ── Mini oyun ──
    function oyunVar(p) { return !!kayit.oyunlar[p.id]; }
    // Oyunlar ülke hazırlanırken bir kez kurulur (yükleme perdesi altında derlensin diye) ve gizli bekler.
    function oyunKur(p) {
      var od = kayit.oyunlar[p.id];
      var ok = new T.Group(); ok.position.set(p.x, 0, p.z); ok.name = 'oyun-' + od.id; kok.add(ok);
      var kayitli = { sayi: 0 };
      var o = Object.assign({}, ctx, {
        kok: ok, yerBilgi: p, feza: uyg.feza, bilbo: uyg.bilbo,
        rehber: { sevin: function () { rehber.oyna('sevin', 1.3); }, dans: function () { rehber.oyna('dans', 3); }, konus: function (id) { rehber.oyna('konus', 2); if (id) uyg.ses(id); }, root: rehber.root },
        ilerle: function () { kayitli.sayi++; ilerle(kayitli.sayi); },
        ekran: ekran, enYakin: enYakin, kamera: uyg.kamera
      });
      var g;
      try { g = od.kur(o); } catch (e) { console.error('Mini oyun kurulamadı: ' + od.id, e); ok.removeFromParent(); return null; }
      return { def: od, yer: p, oyun: g, kok: ok, bitti: false, bitisZaman: 0, toplam: od.toplam || 5, adim: 0 };
    }
    var hazirOyun = {};
    ulke.places.forEach(function (p) { if (kayit.oyunlar[p.id]) { var h = oyunKur(p); if (h) { h.kok.visible = false; hazirOyun[p.id] = h; } } });
    function derleme(acik) { Object.keys(hazirOyun).forEach(function (k) { hazirOyun[k].kok.visible = acik; }); }
    function oyunBaslat(p) {
      var od = kayit.oyunlar[p.id]; if (!od) return false;
      oyunBitir(true);
      var h = hazirOyun[p.id]; delete hazirOyun[p.id];
      if (!h) h = oyunKur(p); if (!h) return false;
      h.kok.visible = true; oyun = h;
      faz = 'oyun'; engelYer = p;
      var f = od.feza || [0, 6];
      fezaHedef = new T.Vector3(p.x + f[0], 0, p.z + f[1]);
      // Feza oyun noktasına engellerin (su, bina) çevresinden, yol planıyla ve hızlı koşarak gelir.
      var fp = uyg.feza.root.position;
      fezaYolu = Math.hypot(fp.x - fezaHedef.x, fp.z - fezaHedef.z) > 1.2 ? (uyg.yolBul(fezaHedef, 0.9, fp) || []).slice() : [];
      // Uzaktan geliyorsa Feza şimşek hızıyla yolun son birkaç metresine "zıplar": oyun başladığında üçü de kadrajda olsun.
      if (fezaYolu.length) { var son = fezaYolu[fezaYolu.length - 1], kalan = 0, k2 = fezaYolu.length - 1;
        for (; k2 > 0; k2--) { kalan += Math.hypot(fezaYolu[k2].x - fezaYolu[k2 - 1].x, fezaYolu[k2].z - fezaYolu[k2 - 1].z); if (kalan > 3) break; }
        if (k2 > 0) { fp.x = fezaYolu[k2 - 1].x; fp.z = fezaYolu[k2 - 1].z; fezaYolu = fezaYolu.slice(k2); } if (!son) fezaYolu = []; }
      var kb = od.kamera || {}, bak = kb.bak || [0, 1.5, 0];
      fezaBak.set(p.x + bak[0], 0, p.z + bak[2]);
      if (uyg.bilbo && uyg.bilbo.bekle) { var bb = od.bilbo || [f[0] - 1.8, f[1] + 1.2]; uyg.bilbo.bekle({ x: p.x + bb[0], z: p.z + bb[1] }); }
      var rn = od.rehber || [f[0] + 2.4, f[1] + 0.8];
      // Rehber çok uzaktaysa oyun noktasının yakınına gelip oradan yürür (oyun başında kadrajda olsun).
      if (!rehber.binili && Math.hypot(rehber.konum.x - (p.x + rn[0]), rehber.konum.z - (p.z + rn[1])) > 9) rehber.isinla(p.x + rn[0], p.z + rn[1], Math.atan2(bak[0] - rn[0], bak[2] - rn[1]));
      rehber.git(p.x + rn[0], p.z + rn[1], { hiz: 8, varinca: function () { rehber.bak(new T.Vector3(p.x + bak[0], 1, p.z + bak[2])); } });
      uyg.feza.lookAt && uyg.feza.lookAt(null);
      if (od.sesler && od.sesler.basla) uyg.ses(od.sesler.basla, { replacePending: true });
      gostergeCiz(); document.getElementById('challenge').hidden = false; document.body.classList.add('has-activity');
      D.cik.hidden = false;
      return true;
    }
    function ilerle(n) {
      if (!oyun) return;
      oyun.adim = n; uyg.cing(n - 1, n >= oyun.toplam); gostergeCiz();
      if (n < oyun.toplam) {
        if (Math.random() < 0.55) rehber.oyna('sevin', 1.1);
        if (uyg.bilbo && Math.random() < 0.4) uyg.bilbo.sevin(1);
        // Övgü ara sıra ve çeşitli: her adımda değil.
        if (n > 1 && Math.random() < 0.3) { ovguSira = (ovguSira + 1) % 6; uyg.ses('ovgu-' + (ovguSira + 1)); }
      }
    }
    function gostergeCiz() {
      if (!oyun) return;
      var ic = document.getElementById('challenge-icon'), say = document.getElementById('challenge-count'), ikon = oyun.def.ikon || 'star';
      ic.replaceChildren(P.node(ikon)); say.replaceChildren();
      for (var i = 0; i < oyun.toplam; i++) { var n = P.node(ikon); n.classList.toggle('earned', i < oyun.adim); say.append(n); }
    }
    function oyunBitir(sessiz) {
      if (!oyun) return;
      var o = oyun; oyun = null;
      try { o.oyun.dispose && o.oyun.dispose(); } catch (e) { console.error(e); }
      o.kok.removeFromParent();
      fezaHedef = null; kameraHedef = null; if (uyg.bilbo && uyg.bilbo.bekle) uyg.bilbo.bekle(null);
      document.getElementById('challenge').hidden = true; document.body.classList.remove('has-activity'); D.cik.hidden = true;
      if (faz === 'oyun') faz = 'gezi';
      if (!sessiz) rehber.oyna('selam', 1.4);
    }
    function oyunTamam() {
      var o = oyun; o.bitti = true; o.bitisZaman = zaman;
      bitenYer.add(o.yer.id);
      if (o.def.sesler && o.def.sesler.bitti) uyg.ses(o.def.sesler.bitti, { replacePending: true });
      uyg.kutla(2.4); rehber.oyna('dans', 3.2);
      if (uyg.feza.cheer) uyg.feza.cheer(1.8); if (uyg.bilbo) uyg.bilbo.sevin(2);
      setTimeout(function () { uyg.pasaport.yerKazan(ulke.id, o.yer.id); }, 900);
      D.cik.hidden = true;
    }
    // Oyun dokunma yardımcıları
    function ekran(v, out) { out = out || {}; _v.copy(v).project(uyg.kamera); out.x = (_v.x * 0.5 + 0.5) * innerWidth; out.y = (-_v.y * 0.5 + 0.5) * innerHeight; out.gorunur = _v.z > 0 && _v.z < 1; return out; }
    var _e = {};
    function enYakin(liste, konumFn, t, px) {
      var en = null, d0 = px || 80;
      for (var i = 0; i < liste.length; i++) { var v = konumFn(liste[i], i); if (!v) continue; ekran(v, _e); if (!_e.gorunur) continue; var d = Math.hypot(_e.x - t.x, _e.y - t.y); if (d < d0) { d0 = d; en = liste[i]; } }
      return en;
    }
    function isaretOlay(x, y, faz2, dx, dy) {
      _ndc.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2); _ray.setFromCamera(_ndc, uyg.kamera);
      var zemin = _ray.ray.intersectPlane(_plane, new T.Vector3());
      return { x: x, y: y, isin: _ray, zemin: zemin, faz: faz2, dx: dx || 0, dy: dy || 0 };
    }

    // ── Taşıt ──
    // Feza'nın biniş/iniş hareketi adım adım: önce (varsa) iskelenin ucuna koşar, sonra koltuğa zıplar; inişte tersi.
    // Bütün adımlar ayakta (koşu/zıplama) yapılır; oturma pozu yalnız koltuğa değince açılır.
    var fezaSira = [], fezaAdim = null, istenenTasit = null;
    function fezaAdimBasla() {
      fezaAdim = fezaSira.shift() || null; if (!fezaAdim) return;
      fezaAdim.bas = uyg.feza.root.position.clone(); fezaAdim.t = 0;
      if (fezaAdim.tip === 'zipla' || fezaAdim.tip === 'in') { var d0 = fezaAdim.bas.distanceTo(fezaAdim.tip === 'zipla' ? tasit.oturakDunya('feza', _w) : fezaAdim.son); fezaAdim.sure = Math.min(1.1, 0.5 + d0 * 0.06); }
    }
    function fezaAdimGuncelle(dt) {
      if (!fezaAdim) { if (fezaSira.length) fezaAdimBasla(); if (!fezaAdim) return; }
      var a = fezaAdim, f = uyg.feza.root.position;
      if (a.tip === 'yuru') {
        var dx = a.son.x - f.x, dz = a.son.z - f.z, d = Math.hypot(dx, dz);
        if (d < 0.15) { fezaAdim = null; return; }
        var adim = Math.min(d, dt * 12); f.x += dx / d * adim; f.z += dz / d * adim; f.y = a.son.y || 0; fezaHiz = 12; uyg.feza.root.rotation.y = Math.atan2(dx, dz);
        return;
      }
      a.t += dt / a.sure; var u = Math.min(1, a.t), e = Y.ease.yumusak(u);
      if (a.tip === 'zipla') {
        tasit.oturakDunya('feza', _w); _w.y -= (uyg.feza.seatHeight || 0.43) * uyg.feza.root.scale.y;
        Y.yay(a.bas, _w, 1.8, e, f); var ry = Math.atan2(_w.x - a.bas.x, _w.z - a.bas.z), cur = uyg.feza.root.rotation.y;
        uyg.feza.root.rotation.y = u < 0.7 ? ry : cur + Math.atan2(Math.sin(tasit.yon - cur), Math.cos(tasit.yon - cur)) * 0.3;
        if (u >= 1) { uyg.feza.root.rotation.y = tasit.yon; uyg.feza.setSeated && uyg.feza.setSeated(true); uyg.feza.land && uyg.feza.land(); fezaAdim = null; }
      } else if (a.tip === 'in') {
        Y.yay(a.bas, a.son, 1.5, e, f); uyg.feza.root.rotation.y = Math.atan2(a.son.x - a.bas.x, a.son.z - a.bas.z);
        if (u >= 1) { f.y = a.son.y || 0; uyg.feza.land && uyg.feza.land(); fezaAdim = null; }
      }
    }
    function fezaHareketBitti() { return !fezaAdim && !fezaSira.length; }
    function binis(t) {
      if (faz !== 'gezi' || t.yolda) return;
      faz = 'binis'; tasit = t; binisBekle = null; kameraTaraf = 0; istenenTasit = null; document.body.classList.add('tur-kilit');
      uyg.durdur && uyg.durdur();
      var s = t.def.sesler || {}; if (s.bin) uyg.ses(s.bin, { replacePending: true });
      var hedef = 1 - t.durak, dk = t.def.duraklar[t.durak]; if (t.def.duraklar[hedef].yer) binilen.add(t.def.id);
      fezaSira = []; fezaAdim = null;
      if (dk.yuru) fezaSira.push({ tip: 'yuru', son: new T.Vector3(dk.yuru[0], dk.yuru[2] || 0.3, dk.yuru[1]) });
      fezaSira.push({ tip: 'zipla' });
      // Bilbo ve rehber de zıplayarak yerine geçer (taşıtın yerel koordinatında).
      hop = [];
      if (uyg.bilbo) { var bp = uyg.bilbo.root.getWorldPosition(new T.Vector3()); uyg.bilbo.bin(t.arac.root, new T.Vector3().copy(t.oturak.bilbo || t.oturak.feza), 0); hop.push({ kim: 'bilbo', bas: t.arac.root.worldToLocal(bp), sure: 0.9, t: dk.yuru ? -0.5 : -0.1 }); }
      var rp = rehber.root.position.clone(); rehber.bin(t.arac.root, new T.Vector3().copy(t.oturak.rehber || t.oturak.feza), 0); hop.push({ kim: 'rehber', bas: t.arac.root.worldToLocal(rp), sure: 0.9, t: dk.yuru ? -0.65 : -0.25 });
      binisZaman = zaman;
    }
    var binisZaman = 0;
    function kalkis(t) {
      faz = 'yolculuk'; var s = t.def.sesler || {};
      if (t.def.efekt && t.def.efekt.kalkis) uyg.efekt(t.def.efekt.kalkis);
      if (s.yol) uyg.ses(s.yol);
      rehber.oyna('selam', 2);
      t.baslat(1 - t.durak, function () { inis(t); });
    }
    function inis(t) {
      faz = 'inis';
      var d = t.durakNokta(t.durak), dk = t.def.duraklar[t.durak], s = t.def.sesler || {};
      if (s.var) uyg.ses(s.var);
      uyg.feza.setSeated && uyg.feza.setSeated(false);
      var dy = d.yon || 0, ox = Math.sin(dy + Math.PI / 2), oz = Math.cos(dy + Math.PI / 2);
      fezaSira = []; fezaAdim = null;
      if (dk.yuru) { fezaSira.push({ tip: 'in', son: new T.Vector3(dk.yuru[0], dk.yuru[2] || 0.3, dk.yuru[1]) }); fezaSira.push({ tip: 'yuru', son: new T.Vector3(d.x, 0, d.z) }); }
      else fezaSira.push({ tip: 'in', son: new T.Vector3(d.x, 0, d.z) });
      var ilk = fezaSira[0].son;
      var rw = rehber.root.getWorldPosition(new T.Vector3()); rehber.in(rw.x, rw.z, dy); hop = [{ kim: 'rehber-in', bas: rw, son: new T.Vector3(ilk.x + ox * 1.8, ilk.y, ilk.z + oz * 1.8), sure: 0.8, t: -0.15, sonra: { x: d.x + ox * 1.8, z: d.z + oz * 1.8 } }];
      if (uyg.bilbo) uyg.bilbo.in(d.x - ox * 1.6, d.z - oz * 1.6, dy);
      binisBekle = { t: t, x: d.x, z: d.z };
    }
    function inisBitti() {
      document.body.classList.remove('tur-kilit'); faz = 'gezi'; tasit = null; rehber.oyna('sevin', 1.2); if (uyg.bilbo) uyg.bilbo.sevin(1.2);
    }
    function hopGuncelle(dt) {
      for (var i = hop.length - 1; i >= 0; i--) {
        var h = hop[i]; h.t += dt; var u = Math.max(0, Math.min(1, h.t / h.sure)), e = Y.ease.yumusak(u);
        if (h.kim === 'bilbo') { var sb = tasit.oturak.bilbo || tasit.oturak.feza; Y.yay(h.bas, sb, 1.6, e, uyg.bilbo.root.position); }
        else if (h.kim === 'rehber') { var sr = tasit.oturak.rehber || tasit.oturak.feza; Y.yay(h.bas, sr, 1.8, e, rehber.root.position); }
        else if (h.kim === 'rehber-in') { Y.yay(h.bas, h.son, 1.4, e, rehber.root.position); if (u >= 1 && h.sonra) rehber.git(h.sonra.x, h.sonra.z, { hiz: 8 }); }
        if (u >= 1) hop.splice(i, 1);
      }
    }

    // ── Kare güncellemesi ──
    var hedefBilgi = {};
    function guncelle(dt, time) {
      zaman += dt; Y.suSaati.value = uyg.azHareket ? 0 : time;
      if (dekor && dekor.guncelle) dekor.guncelle(dt, time);
      for (var oy = 0; oy < ozelYerler.length; oy++) if (ozelYerler[oy].y.guncelle) ozelYerler[oy].y.guncelle(dt, time);
      for (var i = 0; i < tasitlar.length; i++) tasitlar[i].guncelle(dt, time);
      var f = uyg.feza.root.position;
      if (faz === 'karsilama' && zaman > karsilamaSon) karsilamaBitir();
      if (faz === 'gezi') gezi(dt, f);
      if (faz === 'oyun' && oyun) {
        oyun.oyun.guncelle(dt, time);
        if (!oyun.bitti && oyun.oyun.bitti && oyun.oyun.bitti()) oyunTamam();
        if (oyun && oyun.bitti && zaman - oyun.bitisZaman > 5) { oyunBitir(true); }
      }
      // Oyun sırasında Feza oyun noktasına yürür ve oyuna bakar.
      fezaHiz = 0;
      if (fezaHedef && faz === 'oyun') {
        while (fezaYolu.length && Math.hypot(fezaYolu[0].x - f.x, fezaYolu[0].z - f.z) < 0.3) fezaYolu.shift();
        var hn = fezaYolu.length ? fezaYolu[0] : fezaHedef, dx = hn.x - f.x, dz = hn.z - f.z, d = Math.hypot(dx, dz), hz = fezaYolu.length ? 26 : 10;
        if (d > 0.08) { var adim = Math.min(d, dt * hz); f.x += dx / d * adim; f.z += dz / d * adim; fezaHiz = hz; uyg.feza.root.rotation.y = Math.atan2(dx, dz); }
        else { var hy = Math.atan2(fezaBak.x - f.x, fezaBak.z - f.z), cur = uyg.feza.root.rotation.y, fk = Math.atan2(Math.sin(hy - cur), Math.cos(hy - cur)); uyg.feza.root.rotation.y = cur + fk * (1 - Math.exp(-dt * 8)); }
      }
      if (faz === 'binis' || faz === 'inis') fezaAdimGuncelle(dt);
      if (tasit && (faz === 'yolculuk' || (faz === 'binis' && fezaHareketBitti()))) {
        tasit.oturakDunya('feza', _w); _w.y -= (uyg.feza.seatHeight || 0.43) * uyg.feza.root.scale.y; f.copy(_w); uyg.feza.root.rotation.y = tasit.yon;
      }
      if (hop.length) hopGuncelle(dt);
      if (faz === 'binis' && fezaHareketBitti() && !hop.length && zaman - binisZaman > 0.6) kalkis(tasit);
      if (faz === 'inis' && fezaHareketBitti() && !hop.length) inisBitti();
      // Taşıttan inince aynı durakta yeniden binmek için önce uzaklaş.
      if (binisBekle && Math.hypot(f.x - binisBekle.x, f.z - binisBekle.z) > 6) binisBekle = null;
      // Oyun bittiyse ve Feza uzaklaştıysa aynı yerin oyunu yeniden açılabilir.
      if (engelYer && faz === 'gezi' && Math.hypot(f.x - engelYer.x, f.z - engelYer.z) > engelYer.radius + 6) engelYer = null;
      rehber.guncelle(dt, time);
      if (faz === 'oyun' || faz === 'karsilama') rehber.bak(faz === 'karsilama' ? f : null);
      domGuncelle();
    }
    function gezi(dt, f) {
      // Yerin yakınına gelince o yerin oyunu kendiliğinden başlar.
      for (var id in kayit.oyunlar) {
        var p = yerler[id]; if (!p || p === engelYer) continue;
        if (Math.hypot(f.x - p.x, f.z - p.z) < p.radius) { uyg.kesfet(p); oyunBaslat(p); return; }
      }
      // Taşıt durağına gelince biner.
      for (var i = 0; i < tasitlar.length; i++) {
        var t = tasitlar[i]; if (t.yolda) continue; var d = t.durakNokta(t.durak);
        if ((!binisBekle || binisBekle.t !== t) && (istenenTasit === t || siradaki() === t.def.id) && Math.hypot(f.x - d.x, f.z - d.z) < 2.6) { binis(t); return; }
      }
      // Rehber öncülüğü (yarım saniyede bir karar).
      if (zaman - sonKarar < 0.5) return; sonKarar = zaman;
      var a = siradaki(); hedefNokta(a, hedefBilgi);
      var rp = rehber.konum, fRehber = Math.hypot(f.x - rp.x, f.z - rp.z), rHedef = Math.hypot(hedefBilgi.x - rp.x, hedefBilgi.z - rp.z);
      if (fRehber > 34) { rehber.isinla(f.x + 3, f.z + 3, 0); return; }
      if (a === 'kapi' && !kapiDedi && rs.kapi) { kapiDedi = true; uyg.ses(rs.kapi); rehber.oyna('selam', 2.4); }
      if (fRehber > 11) {
        if (rehber.yuruyor) rehber.dur();
        rehber.bak(f);
        if (zaman - gelSelam > 6) { gelSelam = zaman; rehber.oyna('selam', 1.8); }
        if (zaman - gelSes > 22 && rs.gel) { gelSes = zaman; var g = [].concat(rs.gel); uyg.ses(g[Math.floor(Math.random() * g.length)]); }
      } else if (rHedef > 1.6) {
        if (!rehber.yuruyor) rehber.git(hedefBilgi.x, hedefBilgi.z, { hiz: fRehber < 6 ? 8.5 : 6.5 });
        rehber.bak(null);
      } else {
        // Hedefte: Feza'ya ya da hedefe doğru işaret eder.
        rehber.bak(fRehber > 7 ? f : null);
        if (fRehber > 7 && zaman - gelSelam > 7) { gelSelam = zaman; rehber.oyna('isaret', 1.8); }
      }
    }
    var _s = {}, engelKutu = [], engelZaman = -9;
    // Balon/durak işaretleri yer listesi paneli, üst çubuk ve alt düğmelerin üstüne binmesin: dışına kaydır.
    function uzakTut(n, yarimG, boy) {
      if (zaman - engelZaman > 1) {
        engelKutu.length = 0; engelZaman = zaman;
        ['.tour-card', '#hud .hud-actions', '#hud .brand', '#boost', '.speed-card', '#challenge'].forEach(function (q) { var e = document.querySelector(q); if (e && e.offsetParent !== null) engelKutu.push(e.getBoundingClientRect()); });
      }
      for (var i = 0; i < engelKutu.length; i++) {
        var r = engelKutu[i], sol = n.x - yarimG, sag = n.x + yarimG, ust = n.y - boy, alt = n.y;
        if (sag > r.left && sol < r.right && alt > r.top && ust < r.bottom) {
          var sagaKay = r.right + yarimG + 8, asagiKay = r.bottom + boy + 8;
          if (r.left < innerWidth / 2 && sagaKay - n.x < asagiKay - n.y) n.x = sagaKay; else if (r.left >= innerWidth / 2) n.x = Math.min(n.x, r.left - yarimG - 8); else n.y = asagiKay;
        }
      }
    }
    function domGuncelle() {
      var goster = faz === 'gezi' && !uyg.modal();
      if (goster) {
        var a = siradaki(); hedefNokta(a, hedefBilgi);
        _v.set(rehber.root.position.x, (rehber.model.boy || 2) + 1.15, rehber.root.position.z); ekran(_v, _s);
        if (_s.gorunur && _s.x > 40 && _s.x < innerWidth - 40 && _s.y > 70 && _s.y < innerHeight - 60) {
          uzakTut(_s, 50, 100);
          D.balon.hidden = false; D.balon.style.left = _s.x + 'px'; D.balon.style.top = _s.y + 'px'; D.balon.dataset.hedef = a;
          if (hedefBilgi.resim) { if (D.bimg.getAttribute('src') !== hedefBilgi.resim) D.bimg.src = hedefBilgi.resim; D.bimg.hidden = false; D.bsim.hidden = true; }
          else { D.bimg.hidden = true; D.bsim.hidden = false; if (D.bsim.dataset.ikon !== hedefBilgi.ikon) { D.bsim.dataset.ikon = hedefBilgi.ikon; D.bsim.innerHTML = P.svg(hedefBilgi.ikon); } }
        } else D.balon.hidden = true;
      } else D.balon.hidden = true;
      // Taşıt durağı işaretleri: durakta bekleyen taşıtın üstünde dokunulabilir resim.
      var gerek = goster ? tasitlar.length : 0;
      while (D.duraklar.children.length < gerek) { var b = document.createElement('button'); b.className = 'tasit-durak'; b.setAttribute('aria-label', 'Taşıta bin'); D.duraklar.append(b); }
      for (var i = 0; i < D.duraklar.children.length; i++) {
        var el = D.duraklar.children[i], t = tasitlar[i];
        if (i >= gerek || !t || t.yolda) { el.hidden = true; continue; }
        var d = t.durakNokta(t.durak); _v.set(d.x, 4.2, d.z); ekran(_v, _s);
        if (!_s.gorunur || _s.x < 30 || _s.x > innerWidth - 30 || _s.y < 70 || _s.y > innerHeight - 50) { el.hidden = true; continue; }
        uzakTut(_s, 44, 88); el.hidden = false; el.style.left = _s.x + 'px'; el.style.top = _s.y + 'px';
        if (el.dataset.ikon !== t.def.ikon) { el.dataset.ikon = t.def.ikon; el.innerHTML = P.svg(t.def.ikon); el.onclick = (function (tt) { return function () { istenenTasit = tt; var dd = tt.durakNokta(tt.durak); uyg.kos(dd.x, dd.z, 0.9); }; })(t); }
      }
    }
    D.balon.onclick = function () { var a = D.balon.dataset.hedef; if (a) { fezayiGotur(a); rehber.oyna('isaret', 1.2); } };
    D.cik.onclick = function () { if (oyun && !oyun.bitti) { oyunBitir(false); var p = engelYer; if (p) { var f = uyg.feza.root.position, dx = f.x - p.x, dz = f.z - p.z, l = Math.hypot(dx, dz) || 1; uyg.kos(p.x + dx / l * (p.radius + 3), p.z + dz / l * (p.radius + 3), 1); } } };

    // ── Dokunma / sürükleme ──
    var basili = null;
    function dokun(x, y) {
      if (faz === 'karsilama') { karsilamaBitir(); return false; }
      if (faz === 'oyun' && oyun) { if (!oyun.bitti && oyun.oyun.dokun) oyun.oyun.dokun(isaretOlay(x, y, 'dokun')); return true; }
      if (faz === 'binis' || faz === 'yolculuk' || faz === 'inis') return true;
      // Rehbere dokunmak: sevimli bir cümle ve küçük sevinç.
      _v.set(rehber.root.position.x, (rehber.model.boy || 2) * 0.6, rehber.root.position.z); ekran(_v, _s);
      if (_s.gorunur && Math.hypot(_s.x - x, _s.y - y) < 70) {
        var dl = [].concat(rs.dokun || []); if (dl.length) { uyg.ses(dl[dokunSira % dl.length], { replacePending: true }); dokunSira++; }
        rehber.oyna(dokunSira % 2 ? 'sevin' : 'dans', 1.6); return true;
      }
      // Taşıtın kendisine dokunmak durağa koşturur.
      for (var i = 0; i < tasitlar.length; i++) {
        var t = tasitlar[i]; if (t.yolda) continue; t.root.getWorldPosition(_v); _v.y += 1.5; ekran(_v, _s);
        if (_s.gorunur && Math.hypot(_s.x - x, _s.y - y) < 90) { istenenTasit = t; var d = t.durakNokta(t.durak); uyg.kos(d.x, d.z, 0.9); return true; }
      }
      return false;
    }
    function oyunda() { return faz === 'oyun' && !!oyun; }
    function isaretci(fz, x, y) {
      if (!oyunda()) return false;
      if (fz === 'basla') { basili = { x: x, y: y, ox: x, oy: y, kaydi: false }; if (oyun.oyun.surukle) oyun.oyun.surukle(isaretOlay(x, y, 'basla')); return true; }
      if (!basili) return true;
      var dx = x - basili.x, dy = y - basili.y; basili.x = x; basili.y = y;
      if (Math.hypot(x - basili.ox, y - basili.oy) > 10) basili.kaydi = true;
      if (fz === 'devam') { if (oyun.oyun.surukle) oyun.oyun.surukle(isaretOlay(x, y, 'devam', dx, dy)); return true; }
      if (fz === 'bit') { var k = basili.kaydi; basili = null; if (oyun.oyun.surukle) oyun.oyun.surukle(isaretOlay(x, y, 'bit', dx, dy)); if (!k) dokun(x, y); return true; }
      return true;
    }

    // ── Kamera ──
    function kamera(aim, pos) {
      if (faz === 'oyun' && oyun) {
        var kb = oyun.def.kamera || {}, p = oyun.yer, bak = kb.bak || [0, 1.5, 0], uz = kb.uzak || 15, yk = kb.yukari || 8, yon = kb.yon || 0;
        aim.set(p.x + bak[0], bak[1], p.z + bak[2]); pos.set(aim.x + Math.sin(yon) * uz, aim.y + yk, aim.z + Math.cos(yon) * uz);
        return true;
      }
      if (tasit && (faz === 'yolculuk' || faz === 'binis' || faz === 'inis')) {
        var kk = tasit.def.kamera || {}, r = tasit.root.position, u2 = kk.uzak || 20, yb = Math.abs(kk.yan != null ? kk.yan : 0.7);
        // Kamera tarafı yolculuk başında bir kez seçilir: adanın merkezinden uzak taraf (evler/ağaçlar kadrajı kapatmasın).
        if (kameraTaraf === 0) { var y1 = tasit.yon + Math.PI + yb, y2 = tasit.yon + Math.PI - yb; kameraTaraf = Math.hypot(r.x + Math.sin(y1) * u2, r.z + Math.cos(y1) * u2) >= Math.hypot(r.x + Math.sin(y2) * u2, r.z + Math.cos(y2) * u2) ? 1 : -1; }
        var yy = tasit.yon + Math.PI + yb * kameraTaraf;
        aim.set(r.x, r.y + (kk.bakY || 2), r.z); pos.set(r.x + Math.sin(yy) * u2, r.y + (kk.yukari || 9), r.z + Math.cos(yy) * u2);
        return true;
      }
      return false;
    }

    function dispose() {
      oyunBitir(true); D.balon.hidden = true; D.cik.hidden = true; D.duraklar.replaceChildren(); document.body.classList.remove('tur-kilit');
      Object.keys(hazirOyun).forEach(function (k) { var h = hazirOyun[k]; try { h.oyun.dispose && h.oyun.dispose(); } catch (e) {} h.kok.removeFromParent(); });
      ozelYerler.forEach(function (o) { try { o.y.dispose && o.y.dispose(); } catch (e) {} o.g.removeFromParent(); });
      tasitlar.forEach(function (t) { t.dispose(); }); rehber.dispose(); if (dekor && dekor.dispose) dekor.dispose();
      havuz.dispose(); kok.removeFromParent();
    }
    return {
      kayit: kayit, rehber: rehber, tasitlar: tasitlar, kok: kok,
      basla: basla, guncelle: guncelle, derleme: derleme, dokun: dokun, isaretci: isaretci, kamera: kamera, dispose: dispose,
      oyunVar: oyunVar, oyunBaslat: oyunBaslat, oyunda: oyunda,
      get kilit() { return faz === 'oyun' || faz === 'binis' || faz === 'yolculuk' || faz === 'inis'; },
      get fezaHiz() { return fezaHiz; }, get faz() { return faz; },
      yardimSesi: function () { if (oyun && oyun.def.sesler) return oyun.def.sesler.ipucu || oyun.def.sesler.basla; return null; },
      tasitaBin: function (id) { var t = tasitlar.find(function (x) { return x.def.id === id; }); if (t) { faz = 'gezi'; var d = t.durakNokta(t.durak); uyg.feza.root.position.set(d.x, 0, d.z); binis(t); } },
      durum: function () { return { faz: faz, siradaki: siradaki(), oyun: oyun ? { id: oyun.def.id, adim: oyun.adim, toplam: oyun.toplam, bitti: oyun.bitti } : null, tasit: tasit ? { id: tasit.def.id, ilerleme: tasit.ilerleme } : null, biten: Array.from(bitenYer), binilen: Array.from(binilen), rehber: { x: rehber.root.position.x, z: rehber.root.position.z, mod: rehber.mod } }; }
    };
  }
  window.FLASH_TUR = Object.freeze({ hazirla: hazirla, portre: function (id) { return portreler[id] || null; } });
}());
