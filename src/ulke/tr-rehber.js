/* Türkiye rehberi: Van kedisi Pamuk. Bembeyaz yumuşak tüy, bir gözü mavi bir gözü kehribar, kulak dipleri ve kuyruğu
 * kızıl-kahve (Van deseni), pembe burun ve pati yastıkları, bıyıklar, boynunda kırmızı-beyaz küçük fular.
 * FLASH_REHBER_KIT.hayvan ile yapılır; diğer ülke rehberleri için örnek şablondur. */
(function () {
  'use strict';
  if (!window.FLASH_ULKE) throw new Error('Önce src/ulke-kayit.js yüklenmeli');
  const T = window.THREE;
  const KIZIL = 0xc9773f, KOYU_KIZIL = 0xa65a2c, BEYAZ = 0xfffcf8;

  function yap(kit) {
    const K = kit || window.FLASH_REHBER_KIT, s = K.yardim.sstep;
    const kizil = new T.Color(KIZIL), koyu = new T.Color(KOYU_KIZIL), beyaz = new T.Color(0xffffff);
    let lekeler = null;
    return K.hayvan({
      ad: 'Pamuk', tip: 'iki', boy: 2.05,
      renk: { kurk: BEYAZ, karin: 0xffffff, ic: 0xf6a7b6, burun: 0xf28a9c, pati: 0xf7a2b3, yanak: 0xffa3b2, kenar: 0x2e201d, agiz: 0x8c3442, dil: 0xf27f95 },
      bas: { r: [.53, .45, .46] },
      govde: { en: 1.02, dolgun: 1.02 },
      goz: { yaw: .37, pitch: .05, en: .108, boy: .132, iris: [0x3d9be6, 0xeda329], bebek: 'yuvarlak' },
      kulak: { tip: 'sivri', boy: 1.0, en: 1.0, aci: .32 },
      kuyruk: { tip: 'kabarik', boy: 1.05, kalin: 1.2, kivrik: 1 },
      agizlik: { tip: 'kedi', en: 1 },
      biyik: true, biyikRenk: 0xc9c1ba,
      boya(parca, c, p, uv) {
        if (parca === 'bas' || parca === 'yanakTuy') {
          // Kulak diplerinde iki kızıl leke; alnın ortasında beyaz şerit kalır.
          if (!lekeler) return;
          for (const q of lekeler) { const d = p.distanceTo(q); if (d < .3) c.lerp(kizil, .95 * (1 - s(.12, .3, d))); }
        } else if (parca === 'kulakL' || parca === 'kulakR') {
          c.lerp(kizil, 1 - s(.06, .2, p.y));
        } else if (parca === 'kuyruk') {
          const t = uv ? uv.x : 0;
          c.copy(beyaz).lerp(kizil, s(.04, .16, t));
          const halka = Math.sin(t * Math.PI * 9 - .6);
          if (t > .2) c.lerp(koyu, .55 * s(.35, .85, halka));
        } else if (parca === 'kuyrukUc') c.copy(kizil);
      },
      ekle(y, k, o) {
        const bm = o.basMerkez;
        // Yanaklardaki kabarık tüy (Van kedisinin yumuşak yüzü)
        for (const sx of [1, -1]) y.elips(k.bas, BEYAZ, [sx * .34, bm[1] - .18, bm[2] + .12], [.15, .13, .15], { ad: 'yanakTuy' });
        // Kırmızı-beyaz fular: boyun bandı + öne sarkan üçgen + beyaz puanlar
        y.parca(k.govde, new T.TorusGeometry(.172, .05, 10, 28), 0xd8323d, { p: [0, .3, .012], r: [Math.PI / 2 + .1, 0, 0], s: [1, 1.08, .85], sahip: true });
        const ucgen = new T.SphereGeometry(1, 18, 12); { const pp = ucgen.attributes.position; for (let i = 0; i < pp.count; i++) { const yy = pp.getY(i); pp.setX(i, pp.getX(i) * (.25 + .75 * (yy * .5 + .5))); } ucgen.computeVertexNormals(); }
        y.parca(k.govde, ucgen, 0xd8323d, { p: [0, .2, .17], s: [.15, .13, .04], r: [-.32, 0, 0], sahip: true,
          boya: (c, p, uv, h) => { const n = Math.hypot(h.x * 1.0 + .3, h.y - .25), m = Math.hypot(h.x - .35, h.y + .2), r = Math.hypot(h.x + .1, h.y + .55); if (h.z > 0 && (n < .17 || m < .14 || r < .13)) c.set(0xfff7ef); } });
        lekeler = [1, -1].map(sx => new T.Vector3(sx * .27, bm[1] + .33, bm[2] + .02));
      }
    });
  }

  window.FLASH_ULKE.kaydet('tr', { rehber: { ad: 'Pamuk', tur: 'Van kedisi', renk: '#ffffff', yap } });
}());
