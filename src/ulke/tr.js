/* Türkiye — canlı dünya turu içeriği (ÖRNEK ŞABLON; diğer ülkeler bu dosyayı kopyalayıp uyarlar).
 * Rehber: Van kedisi Pamuk (src/ulke/tr-rehber.js). Rota: Galata → vapur → Boğaz → balon → Kapadokya → Dünya kapısı.
 * Oyunlar: Galata'da martılara simit, Boğaz'da yunuslara selam, Kapadokya'da çömlek yapımı.
 * Sözleşme: TASARIM.md §3 (kayıt), §5 (taşıt), §6 (mini oyun). Yerel koordinatlar yer merkezine göredir (ölçeksiz dünya birimi). */
(function () {
  'use strict';
  var T = window.THREE, Y = window.FLASH_MINI.yardim, E = Y.ease;
  // Kare döngüsünde yeni nesne yaratmamak için modül başında geçici nesneler.
  var _kq = new T.Quaternion(), _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3(), _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3();

  // Ülkeye özel resim simgeleri (64×64, çizgi). Taşıt durağı ve oyun ilerleme göstergesi bunları kullanır.
  var PI = window.FLASH_PICTO;
  if (PI && PI.ekle) {
    PI.ekle('vapur', '<path d="M6 40h52l-7 12H13Z" fill="currentColor"/><path d="M14 40V30h30v10M20 30v-8h14v8M38 22v-9h6v9"/><circle cx="22" cy="35" r="1.5" fill="currentColor"/><circle cx="29" cy="35" r="1.5" fill="currentColor"/><circle cx="36" cy="35" r="1.5" fill="currentColor"/>');
    PI.ekle('balon', '<path d="M32 6c-12 0-20 9-20 19 0 9 8 16 14 21h12c6-5 14-12 14-21 0-10-8-19-20-19Z"/><path d="M32 6v40M22 10q-4 18 4 36M42 10q4 18-4 36"/><path d="M26 46l2 6h8l2-6M27 52h10v6H27Z" fill="currentColor"/>');
    PI.ekle('simit', '<circle cx="32" cy="32" r="21"/><circle cx="32" cy="32" r="8"/><path d="M20 22l2 1M40 18l2 1M45 30l1 2M42 44l-1 2M24 45l-2-1M17 34l1 2" stroke-width="3"/>');
    PI.ekle('yunus', '<path d="M8 38c8-14 26-20 40-12l8-6-2 10c2 3 2 6 0 8-8-4-16-4-22 0l-4 8-2-8c-6-1-12 1-18 0Z"/><circle cx="44" cy="30" r="1.6" fill="currentColor"/><path d="M6 52q6-4 12 0t12 0 12 0 14 0"/>');
    PI.ekle('comlek', '<path d="M24 10h16M26 10q-2 6 2 8-12 6-12 20 0 14 16 16 16-2 16-16 0-14-12-20 4-2 2-8"/><path d="M18 34h28M20 42h24"/><path d="M14 58h36"/>');
  }

  // ─────────────────────────────── Taşıt 1: Boğaz vapuru ───────────────────────────────
  // Galata iskelesi (adanın kuzey kıyısı) ↔ Boğaz iskelesi. Vapur denizde (y=-1.5) kıyı boyunca gider.
  var VAPUR_Y = -1.5;
  var vapur = {
    id: 'vapur', ikon: 'vapur', sure: 11,
    duraklar: [{ yer: 'galata', x: -35, z: -58.5, yon: Math.PI, yuru: [-35, -63.8, 0.3] }, { yer: 'bosphorus', x: 34, z: -58.5, yon: Math.PI, yuru: [34, -63.8, 0.3] }],
    yol: function (a, b) {
      var y = [[-35, VAPUR_Y, -67], [-24, VAPUR_Y, -71.5], [-6, VAPUR_Y, -73.5], [12, VAPUR_Y, -73], [26, VAPUR_Y, -70.5], [34, VAPUR_Y, -67]];
      return a === 0 ? y : y.slice().reverse();
    },
    kamera: { uzak: 21, yukari: 8, yan: 1.15, bakY: 2.5 },
    sesler: { bin: 'tr-vapur-bin', yol: 'tr-vapur-yol', var: 'tr-vapur-var' },
    efekt: { kalkis: 'vapur-duduk' },
    yap: function (ctx) {
      var h = ctx.havuz, m = Y.model(), K = h.geo('kure24', function () { return new T.SphereGeometry(1, 24, 16); });
      var kutu = h.geo('kutu', function () { return new T.BoxGeometry(1, 1, 1); }), sil = h.geo('silindir', function () { return new T.CylinderGeometry(1, 1, 1, 20); });
      var yk = function (w, hh, d, r) { return Y.sekil.yuvarlakKutu(w, hh, d, r, 3); };
      // Gövde: altı lacivert, üstü beyaz, kırmızı şerit. +Z = pruva.
      var govde = yk(4.2, 1.3, 12, 0.55);
      m.ekle(govde, function (c, p) { c.set(p.y < -0.05 ? 0x223a5e : p.y < 0.12 ? 0xd94a3a : 0xf6f2ea); }, [0, 0.65, 0]);
      m.ekle(K, 0xf6f2ea, [0, 0.95, 5.6], [0, 0, 0], [2.05, 0.55, 1.2]);
      m.ekle(kutu, 0xb98a5c, [0, 1.32, 0], 0, [3.9, 0.06, 11.4]);                  // güverte tahtası
      // Kabin (iki kat), pencereler ayrı parlak malzemede.
      m.ekle(yk(3.5, 1.5, 6.4, 0.3), 0xf8f4ec, [0, 2.1, -1.4]);
      m.ekle(yk(3.0, 1.1, 4.4, 0.28), 0xf8f4ec, [0, 3.35, -1.8]);
      m.ekle(kutu, 0xd94a3a, [0, 2.86, -1.4], 0, [3.56, 0.08, 6.46]);
      m.ekle(kutu, 0x3b4b57, [0, 3.95, -1.8], 0, [3.1, 0.1, 4.5]);
      // Baca: beyaz, siyah tepe, kırmızı halka (eski İstanbul vapurları gibi).
      m.ekle(sil, 0xf8f4ec, [0, 4.6, -1.4], 0, [0.45, 1.3, 0.45]);
      m.ekle(sil, 0xd94a3a, [0, 4.7, -1.4], 0, [0.47, 0.22, 0.47]);
      m.ekle(sil, 0x26282c, [0, 5.3, -1.4], 0, [0.47, 0.3, 0.47]);
      // Ön güverte sırası, korkuluk, can simitleri, bayrak direği.
      m.ekle(yk(2.8, 0.18, 0.7, 0.08), 0x9a6a40, [0, 1.72, 3.1]);
      m.ekle(kutu, 0x9a6a40, [0, 1.48, 3.1], 0, [2.6, 0.32, 0.12]);
      for (var i = 0; i < 9; i++) { var zz = -5 + i * 1.25; m.ekle(sil, 0xf8f4ec, [1.95, 1.75, zz], 0, [0.05, 0.85, 0.05]); m.ekle(sil, 0xf8f4ec, [-1.95, 1.75, zz], 0, [0.05, 0.85, 0.05]); }
      m.ekle(kutu, 0xf8f4ec, [1.95, 2.18, 0], 0, [0.08, 0.08, 11]); m.ekle(kutu, 0xf8f4ec, [-1.95, 2.18, 0], 0, [0.08, 0.08, 11]);
      var simit = h.geo('cansimidi', function () { return new T.TorusGeometry(0.32, 0.11, 8, 18); });
      [-1, 1].forEach(function (s) { m.ekle(simit, function (c, p) { c.set(Math.floor((Math.atan2(p.y - 2.05, p.z + 1.2) + 4) * 1.27) % 2 ? 0xff7a2e : 0xffffff); }, [s * 1.8, 2.05, -1.2], [0, Math.PI / 2, 0]); });
      m.ekle(sil, 0xdedede, [0, 2.4, -5.4], 0, [0.05, 2.2, 0.05]);
      // Türk bayrağı (kıçta).
      m.ekle(kutu, 0xd9283a, [0, 3.25, -5.95], 0, [0.04, 0.6, 0.9]);
      m.ekle(h.geo('ay', function () { return new T.CylinderGeometry(0.17, 0.17, 0.06, 18); }), 0xffffff, [0, 3.25, -5.85], [0, 0, Math.PI / 2]);
      m.ekle(h.geo('ay2', function () { return new T.CylinderGeometry(0.14, 0.14, 0.07, 18); }), 0xd9283a, [0, 3.27, -5.81], [0, 0, Math.PI / 2]);
      var root = new T.Group(), govdeM = m.mesh(h.malzeme('boya')); root.add(govdeM);
      var cam = Y.model();
      for (var j = 0; j < 7; j++) { cam.ekle(kutu, 0x9fd7ee, [1.77, 2.15, -4.1 + j * 0.9], 0, [0.04, 0.55, 0.6]); cam.ekle(kutu, 0x9fd7ee, [-1.77, 2.15, -4.1 + j * 0.9], 0, [0.04, 0.55, 0.6]); }
      for (var j2 = 0; j2 < 5; j2++) { cam.ekle(kutu, 0x9fd7ee, [1.52, 3.4, -3.6 + j2 * 0.9], 0, [0.04, 0.45, 0.6]); cam.ekle(kutu, 0x9fd7ee, [-1.52, 3.4, -3.6 + j2 * 0.9], 0, [0.04, 0.45, 0.6]); }
      cam.ekle(kutu, 0x9fd7ee, [0, 2.15, 1.82], 0, [3, 0.55, 0.04]);
      root.add(cam.mesh(h.malzeme('parlak'), false));
      // Dümen suyu ve baca dumanı: tek parçacık sistemi (parçacıklar dünyada kalsın diye kök dünyadır).
      var duman = Y.parcacik(ctx.dunya, { sayi: 70, geo: h.geo('duman', function () { return new T.IcosahedronGeometry(0.28, 1); }) });
      var sonDuman = 0, sonKopuk = 0, gecici = new T.Vector3();
      return {
        root: root,
        oturak: { feza: [-0.3, 1.8, 3.1], bilbo: [0.2, 1.35, 4.55], rehber: [1.1, 1.38, 3.2] },
        guncelle: function (dt, time, hal) {
          // Dalgada hafif sallanma; giderken baca dumanı ve köpük.
          govdeM.rotation.z = Math.sin(time * 1.3) * 0.025; govdeM.position.y = Math.sin(time * 1.7) * 0.06;
          if (hal.hareket && !ctx.azHareket) {
            if (time - sonDuman > 0.24) { sonDuman = time; root.localToWorld(gecici.set(0, 5.6, -1.4)); duman.patla(gecici, { adet: 1, renkler: [0xe4e7ea, 0xd2d7dc], hiz: 0.25, yukari: 1.1, yercekimi: -0.5, omur: 1.6, boy: 0.75 }); }
            if (time - sonKopuk > 0.08) { sonKopuk = time; root.localToWorld(gecici.set((Math.random() - 0.5) * 3, 0.1, -6)); duman.patla(gecici, { adet: 2, renkler: [0xffffff, 0xcff4ff], hiz: 1.2, yukari: 1.0, yercekimi: 5, omur: 0.7, boy: 0.55 }); }
          }
          duman.guncelle(dt);
        },
        dispose: function () { duman.dispose(); root.traverse(function (o) { if (o.isMesh && o.userData.sahipGeo) o.geometry.dispose(); }); }
      };
    }
  };

  // ─────────────────────────────── Taşıt 2: Kapadokya balonu ───────────────────────────────
  var balon = {
    id: 'balon', ikon: 'balon', sure: 13, yonlu: false,
    duraklar: [{ yer: 'bosphorus', x: 18, z: -36.4, yon: 0 }, { yer: 'cappadocia', x: 10, z: 17.6, yon: 0 }],
    yol: function (a, b) {
      var y = [[18, 0, -40], [18.5, 4, -38.5], [17, 13, -31], [12.5, 18, -17], [8.5, 19, -3], [8.5, 14, 7], [10, 4, 12.5], [10, 0, 14]];
      return a === 0 ? y : y.slice().reverse();
    },
    kamera: { uzak: 25, yukari: 5.5, yan: 1.9, bakY: 3.2 },
    sesler: { bin: 'tr-balon-bin', yol: 'tr-balon-yol', var: 'tr-balon-var' },
    efekt: { kalkis: 'balon-ates' },
    yap: function (ctx) {
      var h = ctx.havuz, m = Y.model();
      // Zarf: dilimli (dikey renk şeritli) torna; kök = sepet tabanı.
      // Yumuşak zarf: kontrol noktalarından Catmull-Rom ile 28 noktalı profil, 48 dilim; dilim aralarında ince dikiş.
      var kontrol = [[0.25, 0], [0.9, 0.5], [2.1, 1.7], [3.0, 3.4], [3.25, 4.9], [3.0, 6.3], [2.2, 7.4], [1.1, 8.0], [0.01, 8.15]];
      var egriP = new T.CatmullRomCurve3(kontrol.map(function (k) { return new T.Vector3(k[0], k[1], 0); }), false, 'centripetal');
      var prof = egriP.getPoints(27).map(function (v) { return [Math.max(0.01, v.x), v.y]; });
      var zarf = Y.sekil.torna(prof, 48), renkler = [0xe9473f, 0xffc93c, 0x2fa7b5, 0xf28a3b, 0x7b5ec7, 0x5dbb63];
      m.ekle(zarf, function (c, p) {
        var a = (Math.atan2(p.x, p.z) + Math.PI) / (Math.PI * 2) * 12, dilim = Math.floor(a) % 12, kenar = a - Math.floor(a);
        c.set(renkler[dilim % renkler.length]);
        if (p.y > 7.3 + 3.4 || p.y < 4.1 + 0.55) c.set(0xfff6e6);              // tepe ve etek beyaz
        if (kenar < 0.06 || kenar > 0.94) c.multiplyScalar(0.72);                // dikiş
      }, [0, 3.4, 0]);
      var sil = h.geo('silindir', function () { return new T.CylinderGeometry(1, 1, 1, 20); });
      // Sepet (hasır), halatlar, brülör.
      m.ekle(Y.sekil.yuvarlakKutu(2.3, 1.25, 2.3, 0.18, 3), function (c, p) { c.set((Math.floor(p.y * 7) + Math.floor((p.x + p.z) * 3)) % 2 ? 0xb07a45 : 0x9a6538); }, [0, 0.62, 0]);
      m.ekle(Y.sekil.yuvarlakKutu(2.45, 0.16, 2.45, 0.07, 2), 0x6f4527, [0, 1.25, 0]);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
        _a.set(s[0] * 1.05, 1.3, s[1] * 1.05); _b.set(s[0] * 0.75, 3.75, s[1] * 0.75); _c.subVectors(_b, _a);
        var l = _c.length(); _q.setFromUnitVectors(_p.set(0, 1, 0), _c.normalize()); _e.setFromQuaternion(_q);
        m.ekle(sil, 0x5b4636, [(_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2], [_e.x, _e.y, _e.z], [0.035, l, 0.035]);
      });
      m.ekle(sil, 0x55575c, [0, 3.65, 0], 0, [0.35, 0.3, 0.35]);
      var root = new T.Group(), govde = m.mesh(h.malzeme('boya')); root.add(govde);
      var alev = new T.Mesh(h.geo('alev', function () { return new T.ConeGeometry(0.28, 0.9, 12); }), h.malzeme('alev', { color: 0xffb347, emissive: 0xff7a1a, emissiveIntensity: 2.2, transparent: true, opacity: 0.9, toneMapped: false }));
      alev.position.set(0, 4.2, 0); alev.castShadow = false; root.add(alev);
      return {
        root: root,
        oturak: { feza: [-0.45, 0.95, -0.15], bilbo: [0.15, 0.78, 0.55], rehber: [0.6, 0.45, -0.4] },
        guncelle: function (dt, time, hal) {
          var yanar = hal.hareket && (hal.ilerleme < 0.45 || (time % 3) < 0.6);
          var hedef = yanar ? 1 + Math.sin(time * 30) * 0.15 : 0.05;
          alev.scale.setScalar(alev.scale.x + (hedef - alev.scale.x) * (1 - Math.exp(-dt * 12)));
          alev.visible = alev.scale.x > 0.08;
          govde.rotation.y = ctx.azHareket ? 0 : Math.sin(time * 0.4) * 0.12;
          if (hal.hareket) govde.rotation.z = Math.sin(time * 0.9) * 0.025;
        },
        dispose: function () { root.traverse(function (o) { if (o.isMesh && o.userData.sahipGeo) o.geometry.dispose(); }); }
      };
    }
  };

  // ─────────────────────────────── Oyun 1: Galata — Martılara simit ───────────────────────────────
  // Martılar kulenin önünde döner. Her dokunuşta Feza simit atar; dokunulan (ya da en yakın aç) martı simidi kapar,
  // sevinçle takla atar ve kulenin balkonuna konup simidini kemirir. Kaybetmek yok: her dokunuş bir martıyı doyurur.
  var simitOyunu = {
    id: 'simit', ikon: 'simit', ad: 'Martılara simit', toplam: 5,
    sesler: { basla: 'tr-simit-basla', bitti: 'tr-simit-bitti', ipucu: 'tr-simit-ipucu' },
    feza: [1.6, 7.3], rehber: [-2.4, 7.5], bilbo: [3.7, 8.1],
    kamera: { bak: [0, 5.2, 3], uzak: 24, yukari: 2.8, yon: 0.12 },
    kur: function (o) {
      var h = o.havuz, N = 5;
      // Martı: gövde (beyaz, gri sırt, sarı gaga, göz) tek geometri; kanatlar ayrı (çırpma). Hepsi InstancedMesh.
      var g = Y.model(), K = h.geo('kure16', function () { return new T.SphereGeometry(1, 16, 12); });
      g.ekle(K, function (c, p) { c.set(p.y > 0.12 ? 0xb9c3cc : 0xfbfbf7); }, [0, 0, 0], 0, [0.42, 0.36, 0.8]);
      g.ekle(K, 0xfbfbf7, [0, 0.28, 0.62], 0, [0.3, 0.29, 0.31]);
      g.ekle(h.geo('koni', function () { return new T.ConeGeometry(1, 1, 12); }), 0xffc02e, [0, 0.24, 1.02], [Math.PI / 2, 0, 0], [0.09, 0.32, 0.08]);
      g.ekle(K, 0xf0592b, [0, 0.21, 1.04], 0, [0.05, 0.04, 0.05]);
      [-1, 1].forEach(function (s) { g.ekle(K, 0x1d1d22, [s * 0.2, 0.36, 0.82], 0, [0.06, 0.07, 0.05]); g.ekle(K, 0xffffff, [s * 0.215, 0.39, 0.86], 0, [0.022, 0.022, 0.02]); });
      g.ekle(K, 0x8b96a0, [0, 0.06, -0.86], [0.2, 0, 0], [0.26, 0.08, 0.42]);
      g.ekle(K, 0xf0a33a, [0.15, -0.34, 0.05], 0, [0.06, 0.12, 0.06]); g.ekle(K, 0xf0a33a, [-0.15, -0.34, 0.05], 0, [0.06, 0.12, 0.06]);
      var govdeGeo = g.geometri();
      var kw = Y.model(); kw.ekle(K, function (c, p) { c.set(p.x > 0.85 ? 0x3b3f45 : 0xc8d0d8); }, [0.62, 0, 0], 0, [0.66, 0.06, 0.34]);
      var kanatGeo = kw.geometri();
      var simitGeo = Y.model().ekle(h.geo('simit', function () { return new T.TorusGeometry(0.32, 0.13, 10, 22); }), function (c, p) { c.set(0xc9803c); if (p.z > 0.05 && Math.sin(p.x * 40) * Math.sin(p.y * 40) > 0.6) c.set(0xf7e8c4); }, 0, [Math.PI / 2, 0, 0]).geometri();
      var boya = h.malzeme('boya');
      var govdeI = new T.InstancedMesh(govdeGeo, boya, N), sol = new T.InstancedMesh(kanatGeo, boya, N), sag = new T.InstancedMesh(kanatGeo, boya, N), simitI = new T.InstancedMesh(simitGeo, boya, N);
      [govdeI, sol, sag, simitI].forEach(function (im) { im.frustumCulled = false; im.castShadow = true; im.instanceMatrix.setUsage(T.DynamicDrawUsage); o.kok.add(im); });
      var parca = Y.parcacik(o.kok, { sayi: 80 });
      var martilar = [];
      for (var i = 0; i < N; i++) martilar.push({ i: i, hal: 'uc', aci: i / N * Math.PI * 2, hiz: 0.55 + i * 0.07, y: 6.5 + (i % 3) * 1.4, rx: 7 + (i % 2) * 1.5, rz: 3.2 + (i % 3) * 0.6,
        p: new T.Vector3(), yon: 0, t: 0, kanat: Math.random() * 6, bas: new T.Vector3(), hedef: new T.Vector3(), konak: new T.Vector3(), takla: 0, boy: 0.95 + (i % 2) * 0.1 });
      var simitler = []; for (var k = 0; k < N; k++) simitler.push({ hal: 'yok', t: 0, a: new T.Vector3(), b: new T.Vector3(), p: new T.Vector3(), marti: null });
      var doyan = 0, sonAtis = -9, zaman = 0, bekleyen = [];
      // Balkon konma yerleri: kulenin ön yüzünde (kameraya bakan yarım halka), y ≈ 11.4.
      martilar.forEach(function (m, i) { var a = -1.0 + i * 0.5; m.konak.set(Math.sin(a) * 3.95, 11.45, Math.cos(a) * 3.95); });
      function konum(m, out) {
        out.set(Math.sin(m.aci) * m.rx, m.y + Math.sin(m.aci * 2 + m.i) * 0.6, 2 + Math.cos(m.aci) * m.rz); return out;
      }
      function hedefSec(t) {
        var acik = martilar.filter(function (m) { return m.hal === 'uc'; });
        if (!acik.length) return null;
        var m = o.enYakin(acik, function (mm) { return _a.copy(mm.p).add(o.kok.position); }, t, 150);
        if (m) return m;
        // Kaçırınca en yakın aç martı gelip kapar.
        var en = null, d0 = 1e9; acik.forEach(function (mm) { var e = o.ekran(_a.copy(mm.p).add(o.kok.position)); var d = Math.hypot(e.x - t.x, e.y - t.y); if (d < d0) { d0 = d; en = mm; } });
        return en;
      }
      function at(m) {
        m.hal = 'bekle'; m.t = 0;
        // Martı Feza'ya biraz yaklaşıp havada kanat çırparak bekler.
        m.hedef.copy(m.p).lerp(_a.set(o.feza.root.position.x - o.kok.position.x, 5, o.feza.root.position.z - o.kok.position.z), 0.35);
        m.hedef.y = Math.max(4.2, m.hedef.y);
        _b.copy(m.hedef).add(o.kok.position);
        var gecikme = o.feza.throwAt ? o.feza.throwAt(_b) : 0.25;
        bekleyen.push({ zaman: zaman + gecikme, m: m });
        if (o.bilbo && Math.random() < 0.5) o.bilbo.bak(_b.clone());
      }
      function birak(m) {
        var s = simitler.find(function (x) { return x.hal === 'yok'; }); if (!s) return;
        if (o.feza.handWorld) o.feza.handWorld(s.a, 'R'); else s.a.copy(o.feza.root.position).setY(2);
        s.a.sub(o.kok.position); s.b.copy(m.hedef); s.hal = 'uc'; s.t = 0; s.marti = m; o.efekt && o.efekt('simit-at');
      }
      function guncelle(dt, time) {
        zaman += dt;
        for (var b = bekleyen.length - 1; b >= 0; b--) if (zaman >= bekleyen[b].zaman) { birak(bekleyen[b].m); bekleyen.splice(b, 1); }
        martilar.forEach(function (m, i) {
          m.kanat += dt * (m.hal === 'otur' ? 0 : m.hal === 'bekle' ? 16 : 9);
          var eski = _c.copy(m.p);
          if (m.hal === 'uc') { m.aci += dt * m.hiz; konum(m, m.p); }
          else if (m.hal === 'bekle') { m.p.lerp(m.hedef, 1 - Math.exp(-dt * 4)); m.p.y += Math.sin(zaman * 6 + i) * 0.01; }
          else if (m.hal === 'mutlu') { m.t += dt; m.takla = Math.min(1, m.t / 0.9) * Math.PI * 2; m.p.y += dt * 1.2; if (m.t > 1.0) { m.hal = 'kon'; m.t = 0; m.bas.copy(m.p); } }
          else if (m.hal === 'kon') { m.t += dt / 1.6; var u = E.yumusak(m.t); Y.yay(m.bas, m.konak, 1.5, u, m.p); if (m.t >= 1) { m.hal = 'otur'; m.t = 0; } }
          else if (m.hal === 'otur') { m.t += dt; m.p.copy(m.konak); m.p.y += Math.abs(Math.sin(m.t * 3)) * 0.05; }
          // Yön: hareket yönü; otururken Feza'ya bakar.
          _p.subVectors(m.p, eski);
          if (m.hal === 'otur') m.yon = Math.atan2(m.konak.x, m.konak.z);
          else if (_p.lengthSq() > 1e-6) { var hy = Math.atan2(_p.x, _p.z); m.yon += Math.atan2(Math.sin(hy - m.yon), Math.cos(hy - m.yon)) * (1 - Math.exp(-dt * 8)); }
          var egim = m.hal === 'uc' ? -0.35 : 0;
          _e.set(m.hal === 'mutlu' ? -m.takla : 0, m.yon, egim); _q.setFromEuler(_e); _s.setScalar(m.boy);
          _m.compose(m.p, _q, _s); govdeI.setMatrixAt(i, _m);
          var acik = m.hal === 'otur' ? -0.15 : Math.sin(m.kanat) * 0.75;
          [sol, sag].forEach(function (im, j) {
            var sgn = j ? -1 : 1; _e.set(m.hal === 'mutlu' ? -m.takla : 0, m.yon, egim); _q.setFromEuler(_e);
            _kq.setFromAxisAngle(_p.set(0, 0, 1), sgn * acik); _q.multiply(_kq);   // kanat: yerel z ekseninde çırpma
            _a.set(sgn * 0.2, 0.18, 0).multiplyScalar(m.boy).applyEuler(_e).add(m.p);
            _s.set(sgn * m.boy * (m.hal === 'otur' ? 0.55 : 1), m.boy, m.boy * (m.hal === 'otur' ? 0.8 : 1));
            _m.compose(_a, _q, _s); im.setMatrixAt(i, _m);
          });
        });
        simitler.forEach(function (s, i) {
          if (s.hal === 'uc') {
            s.t += dt / 0.6; Y.yay(s.a, s.b, 1.6, Math.min(1, s.t), s.p);
            if (s.t >= 1) { s.hal = 'agiz'; var m = s.marti; m.hal = 'mutlu'; m.t = 0; doyan++; o.ilerle(); parca.patla(_a.copy(m.p), { adet: 16, hiz: 3, yukari: 3 }); if (o.bilbo && doyan % 2) o.bilbo.havla(); }
          }
          if (s.hal === 'agiz') { var mm = s.marti; _a.set(0, 0.22, 1.1 * mm.boy).applyEuler(_e.set(mm.hal === 'mutlu' ? -mm.takla : 0, mm.yon, 0)); s.p.copy(mm.p).add(_a); }
          var gor = s.hal !== 'yok';
          _e.set(0, s.hal === 'agiz' ? s.marti.yon : zaman * 8, 0); _q.setFromEuler(_e); _s.setScalar(gor ? 0.9 : 0.0001);
          _m.compose(s.p, _q, _s); simitI.setMatrixAt(i, _m);
        });
        govdeI.instanceMatrix.needsUpdate = sol.instanceMatrix.needsUpdate = sag.instanceMatrix.needsUpdate = simitI.instanceMatrix.needsUpdate = true;
        parca.guncelle(dt);
      }
      // Başlangıç pozları (kur anında da doğru görünsün; yükleme perdesinde derlenir).
      martilar.forEach(function (m) { konum(m, m.p); });
      guncelle(0, 0);
      return {
        guncelle: guncelle,
        dokun: function (t) { if (zaman - sonAtis < 0.45) return true; var m = hedefSec(t); if (m) { sonAtis = zaman; at(m); } return true; },
        ilerleme: function () { return doyan; },
        bitti: function () { return doyan >= N && martilar.every(function (m) { return m.hal === 'otur' || m.hal === 'kon'; }); },
        dispose: function () { parca.dispose(); [govdeI, sol, sag, simitI].forEach(function (im) { im.removeFromParent(); im.dispose(); }); govdeGeo.dispose(); kanatGeo.dispose(); simitGeo.dispose(); }
      };
    }
  };

  // ─────────────────────────────── Oyun 2: Boğaz — Yunuslara selam ───────────────────────────────
  // Yunuslar Boğaz'ın suyundan zıplar. Suya dokununca en yakın yunus o noktada kocaman sevinç zıplaması yapar,
  // sonra kıyıya yakın sıraya girip yüzgeciyle el sallar. Beş yunus selamlaşınca biter.
  var yunusOyunu = {
    id: 'yunus', ikon: 'yunus', ad: 'Yunuslara selam', toplam: 5,
    sesler: { basla: 'tr-yunus-basla', bitti: 'tr-yunus-bitti', ipucu: 'tr-yunus-ipucu' },
    feza: [-4.6, 8.0], rehber: [4.8, 8.2], bilbo: [-2.4, 8.9],
    kamera: { bak: [0, 1.4, 2.5], uzak: 18.5, yukari: 5.0, yon: 0 },
    kur: function (o) {
      var h = o.havuz, N = 5, K = h.geo('kure16', function () { return new T.SphereGeometry(1, 16, 12); });
      var g = Y.model(), MAVI = 0x8db8d6, KOYU = 0x6f9cc0, KARIN = 0xf2f7fa;
      g.ekle(K, function (c, p) { c.set(p.y < -0.1 ? KARIN : MAVI); }, [0, 0, 0], 0, [0.36, 0.37, 1.05]);           // gövde
      g.ekle(K, function (c, p) { c.set(p.y < -0.08 ? KARIN : MAVI); }, [0, 0.05, 0.78], 0, [0.31, 0.3, 0.36]);    // küçük yuvarlak baş
      g.ekle(K, function (c, p) { c.set(p.y < -0.07 ? KARIN : 0xa9cbe2); }, [0, -0.06, 1.12], 0, [0.12, 0.09, 0.2]); // kısa gaga
      g.ekle(h.geo('gulus', function () { return new T.TorusGeometry(0.15, 0.016, 5, 14, Math.PI); }), 0x35495c, [0, -0.06, 1.0], [Math.PI / 2, 0, Math.PI], [1, 1, 0.55]); // gülümseme
      g.ekle(h.geo('koni', function () { return new T.ConeGeometry(1, 1, 12); }), KOYU, [0, 0.42, -0.05], [-0.5, 0, 0], [0.07, 0.38, 0.24]);
      g.ekle(K, KOYU, [0.26, -0.08, -1.12], [0, 0.5, 0], [0.34, 0.05, 0.15]); g.ekle(K, KOYU, [-0.26, -0.08, -1.12], [0, -0.5, 0], [0.34, 0.05, 0.15]);
      g.ekle(K, MAVI, [0, -0.02, -0.88], 0, [0.17, 0.18, 0.4]);
      [-1, 1].forEach(function (s) {
        g.ekle(K, KOYU, [s * 0.36, -0.2, 0.32], [0, 0, s * 0.6], [0.26, 0.05, 0.14]);
        g.ekle(K, 0x14171f, [s * 0.2, 0.14, 0.95], 0, [0.075, 0.09, 0.06]);
        g.ekle(K, 0xffffff, [s * 0.215, 0.18, 0.99], 0, [0.03, 0.03, 0.02]); g.ekle(K, 0xffffff, [s * 0.19, 0.11, 1.0], 0, [0.014, 0.014, 0.01]);
        g.ekle(K, 0xf6a6b8, [s * 0.25, 0.0, 0.98], 0, [0.06, 0.035, 0.03]);
      });
      var geo = g.geometri(), boya = h.malzeme('parlak');
      var im = new T.InstancedMesh(geo, boya, N); im.frustumCulled = false; im.castShadow = false; im.instanceMatrix.setUsage(T.DynamicDrawUsage); o.kok.add(im);
      var su = Y.parcacik(o.kok, { sayi: 120, geo: h.geo('damla', function () { return new T.IcosahedronGeometry(0.11, 0); }) });
      var yildiz = Y.parcacik(o.kok, { sayi: 60 });
      var SU_Y = 0.12, yunuslar = [], selamlasan = 0, zaman = 0;
      for (var i = 0; i < N; i++) yunuslar.push({ i: i, hal: 'dal', t: 0, sonra: 0.6 + i * 0.9, a: new T.Vector3(), b: new T.Vector3(), p: new T.Vector3(0, -3, 0), yon: 0, egim: 0, don: 0, sira: new T.Vector3(), yukseklik: 2 });
      function zipla(y, buyuk, x, z) {
        var cx = x != null ? x : (Math.random() - 0.5) * 18, cz = z != null ? z : (Math.random() < 0.5 ? -3.2 : 2.8) + (Math.random() - 0.5);
        cx = Math.max(-11, Math.min(11, cx)); cz = Math.max(-4.6, Math.min(4.2, cz));
        if (Math.abs(Math.abs(cx) - 6.1) < 1.2 && Math.abs(cz) < 2.4) cx += cx > 0 ? 1.6 : -1.6;   // köprü ayaklarından uzak
        var yon = Math.random() < 0.5 ? 1 : -1, L = buyuk ? 2.2 : 3.2;
        y.a.set(cx - yon * L / 2, SU_Y - 0.6, cz); y.b.set(cx + yon * L / 2, SU_Y - 0.6, cz);
        y.yon = yon > 0 ? Math.PI / 2 : -Math.PI / 2; y.hal = buyuk ? 'mutlu' : 'zipla'; y.t = 0; y.yukseklik = buyuk ? 4.2 : 2.1; y.don = 0;
        _a.set(y.a.x, SU_Y, cz); su.patla(_a, { adet: 10, renkler: [0xffffff, 0xcff4ff, 0x9fdcf0], hiz: 2, yukari: 3.5, omur: 0.8 });
      }
      function guncelle(dt) {
        zaman += dt;
        yunuslar.forEach(function (y, i) {
          if (y.hal === 'dal') { y.p.set(0, -3, 0); y.sonra -= dt; if (y.sonra <= 0) zipla(y, false); }
          else if (y.hal === 'zipla' || y.hal === 'mutlu') {
            var sure = y.hal === 'mutlu' ? 1.7 : 1.15; y.t += dt / sure; var u = Math.min(1, y.t);
            Y.yay(y.a, y.b, y.yukseklik, u, y.p);
            y.egim = (u - 0.5) * 2.4; if (y.hal === 'mutlu') y.don = u * Math.PI * 4;
            if (u >= 1) {
              _a.set(y.b.x, SU_Y, y.b.z); su.patla(_a, { adet: y.hal === 'mutlu' ? 22 : 12, renkler: [0xffffff, 0xcff4ff, 0x9fdcf0], hiz: 2.6, yukari: 4, omur: 0.9 });
              if (y.hal === 'mutlu') { y.hal = 'sira'; y.t = 0; y.a.copy(y.p); }
              else { y.hal = 'dal'; y.sonra = 1.6 + Math.random() * 2.6; }
            }
          } else if (y.hal === 'sira' || y.hal === 'selam') {
            // Kıyıya yakın sırada yüzer: hafif dalgalanma, ara sıra yan yatıp yüzgeç sallar, küçük zıplamalar.
            y.t += dt;
            if (y.hal === 'sira') { var u2 = Math.min(1, y.t / 1.4); y.p.lerpVectors(y.a, y.sira, E.yumusak(u2)); y.p.y = SU_Y - 0.15 + Math.sin(u2 * Math.PI) * 0.4; if (u2 >= 1) { y.hal = 'selam'; y.t = 0; } }
            else { y.p.copy(y.sira); y.p.y = SU_Y - 0.3 + Math.sin(zaman * 2.4 + i) * 0.08 + Math.max(0, Math.sin(zaman * 1.3 + i * 1.7)) * 0.25; }
            y.yon = 0; y.egim = -0.25 + Math.sin(zaman * 2 + i) * 0.08; y.don = Math.sin(zaman * 3 + i) * 0.45;
          }
          _e.set(y.egim, y.yon, y.don, 'YXZ'); _q.setFromEuler(_e); _s.setScalar(y.hal === 'dal' ? 0.0001 : 1);
          _m.compose(y.p, _q, _s); im.setMatrixAt(i, _m);
        });
        im.instanceMatrix.needsUpdate = true; su.guncelle(dt); yildiz.guncelle(dt);
      }
      yunuslar.forEach(function (y, i) { y.sira.set(-6 + i * 3, SU_Y, 4.2); });
      guncelle(0);
      return {
        guncelle: guncelle,
        dokun: function (t) {
          var acik = yunuslar.filter(function (y) { return y.hal === 'dal' || y.hal === 'zipla'; });
          if (!acik.length) return true;
          var y = o.enYakin(acik.filter(function (k) { return k.hal === 'zipla'; }), function (k) { return _a.copy(k.p).add(o.kok.position); }, t, 140) || acik[0];
          var x = null, z = null;
          if (t.zemin) { x = t.zemin.x - o.kok.position.x; z = t.zemin.z - o.kok.position.z; }
          if (y.hal === 'zipla') { x = y.p.x; z = y.p.z; }
          zipla(y, true, x, z); selamlasan++; o.ilerle();
          _a.set(y.a.x, 2.5, y.a.z); yildiz.patla(_a, { adet: 14, hiz: 2.5, yukari: 4 });
          o.efekt && o.efekt('su-sicrama');
          if (o.feza.wave && selamlasan % 2) o.feza.wave(1.4);
          if (o.bilbo && selamlasan === 3) o.bilbo.havla();
          return true;
        },
        ilerleme: function () { return selamlasan; },
        bitti: function () { return selamlasan >= N && yunuslar.every(function (y) { return y.hal === 'selam'; }); },
        dispose: function () { su.dispose(); yildiz.dispose(); im.removeFromParent(); im.dispose(); geo.dispose(); }
      };
    }
  };

  // ─────────────────────────────── Oyun 3: Kapadokya — Çömlek yapalım ───────────────────────────────
  // Çark döner. Parmağını sürükledikçe (ya da dokundukça) çamur yükselip çömleğe dönüşür. Sonra bir boya kabına
  // dokununca çömlek desenlenir ve rafa uçar. Üç çömlek. Kaybetmek, yanlış hareket yok.
  var comlekOyunu = {
    id: 'comlek', ikon: 'comlek', ad: 'Çömlek yapalım', toplam: 3,
    sesler: { basla: 'tr-comlek-basla', bitti: 'tr-comlek-bitti', ipucu: 'tr-comlek-ipucu' },
    feza: [5.5, 8.0], rehber: [1.0, 7.6], bilbo: [7.0, 7.1],
    kamera: { bak: [3.0, 1.15, 7.0], uzak: 8.2, yukari: 3.4, yon: 0.05 },
    kur: function (o) {
      var h = o.havuz, CARK = new T.Vector3(3.0, 0, 7.0), RAF = new T.Vector3(2.6, 0, 4.9);
      var K = h.geo('kure16', function () { return new T.SphereGeometry(1, 16, 12); }), sil = h.geo('silindir', function () { return new T.CylinderGeometry(1, 1, 1, 20); });
      // Sabit parçalar (çark, tabure, raf, boya kapları değil) tek mesh.
      var m = Y.model();
      m.ekle(sil, 0x8a5a36, [CARK.x, 0.32, CARK.z], 0, [0.75, 0.64, 0.75]);
      m.ekle(sil, 0x6c4529, [CARK.x, 0.68, CARK.z], 0, [0.85, 0.08, 0.85]);
      m.ekle(sil, 0xa9a39a, [CARK.x, 0.76, CARK.z], 0, [0.62, 0.07, 0.62]);
      m.ekle(Y.sekil.yuvarlakKutu(3.2, 0.14, 0.9, 0.05, 2), 0x9a6a40, [RAF.x, 1.25, RAF.z]);
      m.ekle(Y.sekil.yuvarlakKutu(3.2, 0.14, 0.9, 0.05, 2), 0x9a6a40, [RAF.x, 0.35, RAF.z]);
      [-1.45, 1.45].forEach(function (dx) { m.ekle(Y.sekil.yuvarlakKutu(0.16, 1.5, 0.8, 0.04, 2), 0x7d5232, [RAF.x + dx, 0.75, RAF.z]); });
      // Eski çömlekler rafta (süs) ve yerde bir çamur küpü.
      m.ekle(Y.sekil.torna([[0.01, 0], [0.22, 0.02], [0.3, 0.22], [0.25, 0.45], [0.14, 0.55], [0.17, 0.62]], 16), 0xc46b3d, [RAF.x - 1.2, 0.42, RAF.z]);
      m.ekle(Y.sekil.yuvarlakKutu(0.7, 0.45, 0.6, 0.12, 2), 0xa45a35, [CARK.x - 1.35, 0.22, CARK.z + 0.5]);
      var sabit = m.mesh(h.malzeme('boya')); o.kok.add(sabit);
      // Boya kapları (üç renk) — tek mesh, ayrı ayrı zıplatmak için üç örnek: InstancedMesh.
      var RENK = [0x2d5fb8, 0x2fa7b5, 0xd94a3a];
      var kapGeo = Y.model().ekle(sil, 0xf3ede2, [0, 0.22, 0], 0, [0.3, 0.44, 0.3]).ekle(sil, 0xffffff, [0, 0.46, 0], 0, [0.26, 0.04, 0.26]).geometri();
      var kapRenk = Y.model().ekle(sil, 0xffffff, [0, 0.47, 0], 0, [0.25, 0.03, 0.25]).ekle(K, 0xffffff, [0.12, 0.62, 0], [0, 0, 0.6], [0.05, 0.22, 0.05]).geometri();
      var kaplar = new T.InstancedMesh(kapGeo, h.malzeme('boya'), 3), boyalar = new T.InstancedMesh(kapRenk, h.malzeme('boya'), 3);
      [kaplar, boyalar].forEach(function (x) { x.frustumCulled = false; x.instanceMatrix.setUsage(T.DynamicDrawUsage); o.kok.add(x); });
      var cc = new T.Color(); RENK.forEach(function (r, i) { boyalar.setColorAt(i, cc.set(r)); kaplar.setColorAt(i, cc.set(0xffffff)); });
      var KAP = [new T.Vector3(CARK.x - 1.4, 0, CARK.z + 1.5), new T.Vector3(CARK.x, 0, CARK.z + 1.9), new T.Vector3(CARK.x + 1.4, 0, CARK.z + 1.5)];
      // Çamur/çömlek: sabit köşe sayılı torna; profil her değişiklikte yerinde güncellenir (yalnız değiştiği karede).
      var SEG = 28, PN = 14, comGeo = new T.LatheGeometry(Array.from({ length: PN }, function (_, i) { return new T.Vector2(0.3, i / (PN - 1)); }), SEG);
      comGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(comGeo.attributes.position.count * 3), 3));
      var comMat = h.malzeme('cift', { vertexColors: true, roughness: 0.55, side: T.DoubleSide });
      var comlek = new T.Mesh(comGeo, comMat); comlek.castShadow = true; comlek.position.set(CARK.x, 0.8, CARK.z); o.kok.add(comlek);
      var SEKIL = [
        { r: [0.30, 0.47, 0.55, 0.46, 0.24, 0.17, 0.25], H: 1.25 },   // testi
        { r: [0.28, 0.52, 0.66, 0.72, 0.72, 0.71, 0.76], H: 0.72 },   // çanak
        { r: [0.24, 0.36, 0.42, 0.36, 0.22, 0.18, 0.27], H: 1.55 }    // uzun vazo
      ], TOPAK = { r: [0.52, 0.58, 0.56, 0.48, 0.36, 0.2, 0.04], H: 0.48 };
      var raftakiler = [], parca = Y.parcacik(o.kok, { sayi: 70 });
      var no = 0, buyume = 0, faz = 'cek', boyaRenk = null, zaman = 0, t = 0, ucan = null, kirli = true, sonBuyume = 0;
      function profR(r, u) { var x = u * (r.length - 1), i = Math.min(r.length - 2, Math.floor(x)), f = x - i, s = f * f * (3 - 2 * f); return r[i] + (r[i + 1] - r[i]) * s; }
      function profilYaz(geo, k, g, renk, boyali) {
        var P = geo.attributes.position, C = geo.attributes.color, S = SEKIL[k], H = TOPAK.H + (S.H - TOPAK.H) * g;
        for (var j = 0; j <= SEG; j++) {
          var phi = j / SEG * Math.PI * 2, sn = Math.sin(phi), cs = Math.cos(phi);
          for (var i = 0; i < PN; i++) {
            var u = i / (PN - 1), r = profR(TOPAK.r, u) + (profR(S.r, u) - profR(TOPAK.r, u)) * g, idx = j * PN + i;
            P.setXYZ(idx, r * sn, u * H, r * cs);
            // Çamur rengi; dönerken görünen ince spiral çizgiler; boyanınca çini deseni.
            cc.set(0xc9774a); if (Math.sin(u * 40 + phi * 2) > 0.85) cc.offsetHSL(0, 0, -0.05);
            if (boyali) {
              if ((u > 0.28 && u < 0.36) || (u > 0.66 && u < 0.73) || u > 0.94) cc.set(renk);
              else if (u > 0.42 && u < 0.6) { var d = Math.sin(phi * 8) * Math.sin((u - 0.42) / 0.18 * Math.PI); cc.set(d > 0.45 ? renk : 0xf6efe2); }
              else cc.set(0xf6efe2);
            }
            C.setXYZ(idx, cc.r, cc.g, cc.b);
          }
        }
        P.needsUpdate = true; C.needsUpdate = true; geo.computeVertexNormals();
      }
      function kapPoz(zaman2) {
        for (var i = 0; i < 3; i++) {
          var gor = faz === 'boya' ? Math.min(1, t * 3 - i * 0.3) : 0, s = gor > 0 ? E.gerYay(gor) : 0.0001;
          _p.copy(KAP[i]); _p.y = gor > 0 ? Math.abs(Math.sin(zaman2 * 3 + i)) * 0.12 : 0; _q.identity(); _s.setScalar(Math.max(0.0001, s));
          _m.compose(_p, _q, _s); kaplar.setMatrixAt(i, _m); boyalar.setMatrixAt(i, _m);
        }
        kaplar.instanceMatrix.needsUpdate = boyalar.instanceMatrix.needsUpdate = true;
      }
      function buyut(miktar) {
        if (faz !== 'cek') return;
        buyume = Math.min(1, buyume + miktar); kirli = true;
        if (zaman - sonBuyume > 0.25) { sonBuyume = zaman; _a.set(CARK.x, 0.9 + buyume * 0.9, CARK.z); parca.patla(_a, { adet: 2, renkler: [0xc9774a, 0xb5653c], hiz: 1.5, yukari: 2, omur: 0.6, boy: 0.6 }); }
        if (buyume >= 1) { faz = 'boya'; t = 0; o.rehber.konus('tr-comlek-boya'); if (o.feza.cheer) o.feza.cheer(1.2); }
      }
      function boya(i) {
        if (faz !== 'boya') return;
        boyaRenk = RENK[i]; faz = 'ucus'; t = 0;
        profilYaz(comGeo, no, 1, boyaRenk, true);
        _a.set(CARK.x, 1.6, CARK.z); parca.patla(_a, { adet: 24, renkler: [boyaRenk, 0xffffff, 0xffd35a], hiz: 2.6, yukari: 3.5 });
        // Raftaki kopya: aynı geometrinin kopyası (yalnız 3 kez, oyun anında).
        var kopya = new T.Mesh(comGeo.clone(), comMat); kopya.castShadow = true; kopya.visible = false; o.kok.add(kopya); raftakiler.push(kopya);
        ucan = { mesh: kopya, a: new T.Vector3(CARK.x, 0.8, CARK.z), b: new T.Vector3(RAF.x - 0.6 + no * 0.9, 1.32, RAF.z), olcek: no === 1 ? 0.62 : 0.55 };
        comlek.visible = false; kopya.visible = true;
      }
      function guncelle(dt) {
        zaman += dt; t += dt;
        comlek.rotation.y += dt * (faz === 'cek' ? 7 : 2.5);
        if (kirli && faz === 'cek') { profilYaz(comGeo, no, buyume, null, false); kirli = false; }
        if (faz === 'ucus' && ucan) {
          var u = Math.min(1, t / 1.1); Y.yay(ucan.a, ucan.b, 1.6, E.yumusak(u), ucan.mesh.position);
          ucan.mesh.scale.setScalar(1 + (ucan.olcek - 1) * E.yumusak(u)); ucan.mesh.rotation.y += dt * 4;
          if (u >= 1) {
            parca.patla(_a.copy(ucan.b).setY(1.9), { adet: 14, hiz: 2, yukari: 3 });
            no++; o.ilerle(); ucan = null;
            if (no < 3) { faz = 'cek'; buyume = 0; kirli = true; comlek.visible = true; comlek.scale.setScalar(0.01); t = 0; o.rehber.konus(null); }
            else faz = 'bitti';
          }
        }
        if (faz === 'cek' && comlek.scale.x < 1) comlek.scale.setScalar(Math.min(1, comlek.scale.x + dt * 3));
        kapPoz(zaman); parca.guncelle(dt);
      }
      profilYaz(comGeo, 0, 0, null, false); kapPoz(0);
      return {
        guncelle: guncelle,
        dokun: function (tt) {
          if (faz === 'cek') { buyut(0.14); return true; }
          if (faz === 'boya') { var en = o.enYakin([0, 1, 2], function (i) { return _a.copy(KAP[i]).add(o.kok.position).setY(0.5); }, tt, 200); boya(en == null ? Math.floor(Math.random() * 3) : en); return true; }
          return true;
        },
        surukle: function (tt) { if (tt.faz === 'devam' && faz === 'cek') buyut((Math.abs(tt.dy) + Math.abs(tt.dx) * 0.6) / 520); return true; },
        ilerleme: function () { return no; },
        bitti: function () { return faz === 'bitti'; },
        dispose: function () { parca.dispose(); comGeo.dispose(); kapGeo.dispose(); kapRenk.dispose(); raftakiler.forEach(function (k) { k.geometry.dispose(); k.removeFromParent(); }); [kaplar, boyalar].forEach(function (x) { x.removeFromParent(); x.dispose(); }); sabit.geometry.dispose(); sabit.removeFromParent(); comlek.removeFromParent(); }
      };
    }
  };

  // ─────────────────────────────── Dekor: iskeleler, balon alanları ───────────────────────────────
  function dekor(ctx) {
    var h = ctx.havuz, m = Y.model(), kutu = h.geo('kutu', function () { return new T.BoxGeometry(1, 1, 1); }), sil = h.geo('silindir', function () { return new T.CylinderGeometry(1, 1, 1, 20); });
    // Ahşap iskele: kıyıdan denize (z -55 → -64.5), tahtalar, direkler, fenerler, can simidi.
    [-35, 34].forEach(function (x) {
      for (var i = 0; i < 20; i++) m.ekle(kutu, i % 2 ? 0xa77a4f : 0x9a6d44, [x, 0.22, -55 - i * 0.5], 0, [3.6, 0.14, 0.46]);
      for (var j = 0; j < 4; j++) [-1, 1].forEach(function (s) { m.ekle(sil, 0x6e4c30, [x + s * 1.75, -0.7, -56 - j * 2.8], 0, [0.16, 2.2, 0.16]); });
      [-1, 1].forEach(function (s) { m.ekle(kutu, 0x7b5535, [x + s * 1.75, 0.75, -59.7], 0, [0.1, 0.1, 9.4]); for (var k = 0; k < 6; k++) m.ekle(kutu, 0x7b5535, [x + s * 1.75, 0.5, -55.3 - k * 1.8], 0, [0.1, 0.55, 0.1]); });
      [-1, 1].forEach(function (s) { m.ekle(sil, 0x2f3b3d, [x + s * 1.75, 1.4, -64.3], 0, [0.06, 2.2, 0.06]); m.ekle(K(), 0xffe08a, [x + s * 1.75, 2.6, -64.3], 0, [0.22, 0.28, 0.22]); });
    });
    function K() { return h.geo('kure16', function () { return new T.SphereGeometry(1, 16, 12); }); }
    // Balon kalkış alanları: yuvarlak taş zemin + kum torbaları.
    [[18, -40], [10, 14]].forEach(function (a) {
      m.ekle(sil, 0xe2cfa6, [a[0], 0.04, a[1]], 0, [2.6, 0.08, 2.6]);
      for (var i = 0; i < 8; i++) { var an = i / 8 * Math.PI * 2; m.ekle(K(), 0xc9a873, [a[0] + Math.sin(an) * 2.75, 0.18, a[1] + Math.cos(an) * 2.75], 0, [0.32, 0.22, 0.26]); }
    });
    // Galata önünde simit tezgâhı (kırmızı tekerlekli araba, üstünde simitler).
    var sx = -26.5, sz = -21;
    m.ekle(Y.sekil.yuvarlakKutu(1.8, 0.9, 1.1, 0.12, 2), 0xd94a3a, [sx, 1.0, sz]);
    m.ekle(Y.sekil.yuvarlakKutu(1.9, 0.08, 1.2, 0.03, 2), 0xf6efe2, [sx, 1.5, sz]);
    m.ekle(kutu, 0x9fd7ee, [sx, 1.85, sz], 0, [1.7, 0.6, 1.0]);
    [-1, 1].forEach(function (s) { m.ekle(sil, 0x2a2a2e, [sx + s * 0.7, 0.4, sz + 0.62], [Math.PI / 2, 0, 0], [0.38, 0.1, 0.38]); });
    var simitG = h.geo('simit', function () { return new T.TorusGeometry(0.32, 0.13, 10, 22); });
    for (var i = 0; i < 5; i++) m.ekle(simitG, 0xc9803c, [sx - 0.6 + i * 0.3, 1.62 + (i % 2) * 0.12, sz], [Math.PI / 2, 0, 0], 0.55);
    m.ekle(sil, 0xf6efe2, [sx, 2.6, sz], 0, [0.05, 0.9, 0.05]); m.ekle(h.geo('semsiye', function () { return new T.ConeGeometry(1, 0.5, 12); }), 0xd94a3a, [sx, 3.1, sz], 0, [1.3, 1, 1.3]);
    var mesh = m.mesh(h.malzeme('boya'));
    // Boğaz suyu yürünemez (places.js'teki su kutusu: x 20.5–47.5, z -33.1 – -20.9). Feza, Bilbo ve rehber kıyıdan dolaşır.
    var su = []; for (var wx = 22; wx <= 46; wx += 3) { su.push({ x: wx, z: -30.1, r: 3.0 }); su.push({ x: wx, z: -23.9, r: 3.0 }); }
    return { root: mesh, engeller: [{ x: sx, z: sz, r: 1.2 }].concat(su), dispose: function () { mesh.geometry.dispose(); mesh.removeFromParent(); } };
  }

  window.FLASH_ULKE.kaydet('tr', {
    rota: ['galata', 'vapur', 'bosphorus', 'balon', 'cappadocia', 'kapi'],
    rehber: { sesler: { merhaba: 'tr-rehber-merhaba', gel: ['rehber-gel-1', 'rehber-gel-2', 'rehber-gel-3'], dokun: ['tr-rehber-dokun-1', 'tr-rehber-dokun-2', 'tr-rehber-dokun-3'], kapi: 'tr-rehber-kapi' } },
    tasitlar: [vapur, balon],
    oyunlar: { galata: simitOyunu, bosphorus: yunusOyunu, cappadocia: comlekOyunu },
    dekor: dekor,
    bosAlanlar: [{ x: -35, z: -57, r: 4.5 }, { x: 34, z: -57, r: 4.5 }, { x: 18, z: -40, r: 4.5 }, { x: 10, z: 14, r: 4.5 }, { x: -26.5, z: -21, r: 2.5 }]
  });
}());
