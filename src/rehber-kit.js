/* Rehber hayvan kiti — window.FLASH_REHBER_KIT. Klasik script, yalnız window.THREE gerekir.
 * Bütün ülke rehberleri (Türkiye: Van kedisi Pamuk, src/ulke/tr-rehber.js) bu kitle yapılır; kalite çıtası buradadır:
 * heykel gibi sürekli yüzeyler (loft), kadife kürk parlaması, büyük parlak gözler (iris + bebek + iki parlama + kırpma),
 * yumuşak boyanmış yanak allığı, yumuşak (damping) geçişli canlı animasyon.
 *
 * ── MODEL SÖZLEŞMESİ (rehber motoru bunu kullanır) ──
 *   model = { root, boy, kemik, guncelle(dt, time, durum), dispose() }
 *   root   : THREE.Group, +Z'ye bakar, ayak y=0; root.scale=1 iken tur sahnesindeki doğru boydur (Feza ≈ 2.53).
 *   boy    : kulaklar dahil toplam yükseklik (birim).
 *   durum  : { mod:'bekle'|'yuru'|'kos'|'selam'|'dans'|'sevin'|'konus'|'otur'|'isaret', hiz:m/s, bak:THREE.Vector3|null }
 *            hiz adım temposunu verir (konumu/gövde yönünü motor değiştirir). bak dünya noktasıdır; baş yumuşakça döner.
 *            otur: root = taşıt zemini; kalça zeminden ≈ boy*0.35 yukarıda (oturak ≈ boy*0.3).
 *   dispose: modelin kendi geometrisi + iskeleti bırakılır; kit malzemeleri ve paylaşılan temel geometriler KALICIDIR.
 *
 * ── HIZLI YOL: K.hayvan(ayar) ── (standart sevimli hayvan; çoğu ülke için yeterli)
 *   const model = K.hayvan({
 *     tip: 'iki' | 'dort',              // dik çizgi-film hayvanı ya da dört ayaklı yavru (deve, fil…)
 *     boy: 2.05,                        // kulaklar dahil hedef boy
 *     renk: { kurk, karin, ic (kulak içi), burun, pati (pati yastıkları), yanak, kenar (göz çevresi), agiz (ağız içi), dil },
 *     bas:  { r:[.50,.44,.46] },        // baş yarıçapları (x,y,z) — çizgi film için büyük baş
 *     govde:{ en:1, dolgun:1 },         // gövde ölçek çarpanları
 *     goz:  { yaw:.36, pitch:.04, en:.105, boy:.13, iris:[sol,sag], bebek:'yuvarlak'|'dikey', parlak:1 },
 *     kulak:{ tip:'sivri'|'yuvarlak'|'uzun'|'sarkik'|'yok', boy:1, en:1, aci:.3 },
 *     kuyruk:{ tip:'ince'|'kabarik'|'kalin'|'kisa'|'yok', boy:1, kalin:1, kivrik:1 },
 *     agizlik:{ tip:'kedi'|'burun'|'duz', uzun:.18, en:1 },   // kedi: bıyık yastıkları + ω ağız; burun: çıkık burun (köpek, ayı, kanguru)
 *     biyik: true,                      // kedi bıyıkları
 *     boya(parca, renk, p, uv, ham) {}, // isteğe bağlı desen: parca adı ('bas','govde','kulakL','kulakIcL','kuyruk','kolL','elL','bacakL','ayakL',…),
 *                                       // renk THREE.Color (değiştir), p kemik uzayında köşe, uv (boru/loft için), ham geometri köşesi
 *     ekle(y, k, o) {}                  // ek parçalar: y = yapıcı, k = kemikler, o = ölçüler (bas merkezi vb.)
 *   });
 *
 * ── YAPICI (özel parçalar ve tamamen özel hayvanlar için) ──
 *   const y = K.yapici('Ad');
 *   y.kemik(ust|null, ad, x, y, z)                 → THREE.Bone (ust null = gövde kökü)
 *   y.parca(kemik, geo, renk, {p,s,r,q, mat, boya, harman, sahip})
 *       mat: 'kurk' (kadife, varsayılan) | 'parlak' (göz, burun, ağız) | 'isik' (beyaz parlamalar, gölgesiz)
 *       harman(p, uv, ham) → [[kemik, ağırlık], …]   (yumuşak bükülme: gövde/kuyruk)
 *       sahip: true → geo birleştirmeden sonra dispose edilir (kendi yaptığın geçici geometri).
 *   y.elips(kemik, renk, p, s, opt)   y.kucuk(...)  (az üçgenli küre)   y.yogun(...) (çok üçgenli küre: baş/gövde)
 *   y.boru(kemik, noktalar[[x,y,z]…], r | (t)=>r, renk, opt)   ince/kalın eğri boru (bıyık, ağız çizgisi, kuyruk)
 *   y.goz(kemik, merkez[3], yaricap[3], {yaw,pitch,en,boy,iris,bebek,kenar}) → { acik:Bone, mutlu:Bone }
 *   y.bitir(hedefBoy) → { boy, iskelet, meshler }   // parçaları malzeme başına TEK SkinnedMesh'e birleştirir
 *   y.root, y.kok (ölçeklenen iç grup), y.kemikler
 *   K.surucu(k, {tip, olcu}) → guncelle(dt,time,durum)   standart animasyon (K.hayvan bunu kullanır)
 *
 * ── GEOMETRİ YARDIMCILARI ──
 *   K.loft(kesitler[[z,rx,ry,cy]…], satir, yan)  Bilbo'daki gibi z boyunca sürekli yüzey
 *   K.dikLoft(kesitler[[y,rx,rz,cz]…], satir, yan) y boyunca (gövde, kulak)
 *   K.kapsul(r0, r1, uzun, yan)                    -y yönünde yuvarlak uçlu uzuv (paylaşılan, önbellekli)
 *   K.boruGeo(noktalar, r|(t)=>r, segment, yan)    kalınlık profilli boru; uv.x = 0..1 uzunluk
 *   K.kulakGeo(tip, en, boy)                        { dis, ic } (paylaşılan değil; model dispose eder)
 *   K.yuzeyNoktasi(r[3], yaw, pitch) → { p:Vector3, n:Vector3, q:Quaternion }   elipsoid üstü nokta + normal
 *   K.malzeme.kurk / .parlak / .isik               paylaşılan malzemeler (dispose ETME)
 *   K.geo.kure / .kucuk / .yogun                   paylaşılan birim küreler (dispose ETME)
 *   K.renk(hex) / K.karistir(a, b, t)              renk yardımcıları
 *
 * BÜTÇE: rehber başına ≤ 10 çizim (standart model 3 SkinnedMesh: kurk + parlak + isik), ≤ 20k üçgen.
 */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) throw new Error('Rehber kiti için THREE gerekli');
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const clamp01 = x => clamp(x, 0, 1);
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);

  // ── Paylaşılan malzemeler (kalıcı) ──
  function kadife(mat, rgb, k, p, key) {
    mat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
        `{ float kRim = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
           outgoingLight += diffuseColor.rgb * vec3(${rgb}) * (pow(kRim, ${p}) * ${k}); }
         #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => key;
    return mat;
  }
  const MALZEME = {
    kurk: kadife(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), '1.20, 1.10, 1.00', '0.42', '2.6', 'rehberKurk'),
    parlak: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.0 }),
    isik: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  };
  MALZEME.kurk.name = 'rehber kürk'; MALZEME.parlak.name = 'rehber parlak'; MALZEME.isik.name = 'rehber ışık';
  // Kubbe disk: +Z'ye bakan, ortası 1 yüksekliğinde yumuşak kubbe; göz parçaları için (pürüzsüz kenar, az üçgen).
  function kubbe(seg, halka) {
    const pos = [0, 0, 1], uv = [.5, .5], idx = [];
    for (let r = 1; r <= halka; r++) {
      const rr = r / halka, z = Math.sqrt(Math.max(0, 1 - rr * rr * .985));
      for (let i = 0; i < seg; i++) { const a = i / seg * TAU; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, z); uv.push(.5 + Math.cos(a) * rr * .5, .5 + Math.sin(a) * rr * .5); }
    }
    for (let i = 0; i < seg; i++) idx.push(0, 1 + i, 1 + (i + 1) % seg);
    for (let r = 1; r < halka; r++) { const a0 = 1 + (r - 1) * seg, b0 = 1 + r * seg;
      for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; idx.push(a0 + i, b0 + i, b0 + j, a0 + i, b0 + j, a0 + j); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const GEO = { kure: new T.SphereGeometry(1, 18, 12), kucuk: new T.SphereGeometry(1, 14, 10), mini: new T.SphereGeometry(1, 8, 6), yogun: new T.SphereGeometry(1, 40, 28),
    kubbe: kubbe(40, 5), kubbeKucuk: kubbe(20, 2) };
  const KAPSUL = new Map();

  // ── Geometri ──
  function loft(sections, rows = 40, sides = 32) {
    const pos = [], uv = [], idx = [];
    const sample = (t, k) => {
      const u = t * (sections.length - 1), i = Math.min(sections.length - 2, Math.floor(u)), f = u - i;
      const a = sections[Math.max(0, i - 1)][k], b = sections[i][k], c = sections[i + 1][k], d = sections[Math.min(sections.length - 1, i + 2)][k];
      return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    };
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, z = sample(t, 0), rx = Math.max(0.001, sample(t, 1)), ry = Math.max(0.001, sample(t, 2)), cy = sample(t, 3);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * TAU;
        pos.push(Math.cos(a) * rx, cy + Math.sin(a) * ry, z); uv.push(t, j / sides);
        if (i < rows && j < sides) { const n = i * (sides + 1) + j; idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // y boyunca loft: kesit [y, rx, rz, cz]; yan yüzeyi dışa bakar.
  function dikLoft(sections, rows = 36, sides = 32) {
    const g = loft(sections.map(s => [s[0], s[1], s[2], s[3]]), rows, sides);
    // loft: (x, cy+sin*ry, z) → dik: (x, z, cy+sin*ry) ; ayna olduğu için sarımı çevir.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getZ(i), z = p.getY(i); p.setXYZ(i, p.getX(i), y, z); }
    const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const x = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = x; }
    g.computeVertexNormals();
    return g;
  }
  // -y yönünde yuvarlak uçlu uzuv: üst merkez y=0 (r0), alt merkez y=-uzun (r1).
  function kapsul(r0, r1, uzun, yan = 12) {
    const key = [r0, r1, uzun, yan].map(x => x.toFixed(3)).join('|');
    if (KAPSUL.has(key)) return KAPSUL.get(key);
    const pts = [], n = 6;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, Math.cos(a) * r1), -uzun + Math.sin(a) * r1)); }
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, Math.cos(a) * r0), Math.sin(a) * r0)); }
    const g = new T.LatheGeometry(pts, yan);
    g.userData.paylasilan = true; KAPSUL.set(key, g); return g;
  }
  // Kalınlık profilli boru (uv.x = uzunluk 0..1). r sayı ya da t=>r.
  function boruGeo(noktalar, r, seg = 24, yan = 10) {
    const curve = new T.CatmullRomCurve3(noktalar.map(p => (p.isVector3 ? p : V(p[0], p[1], p[2]))));
    const g = new T.TubeGeometry(curve, seg, 1, yan, false);
    const p = g.attributes.position, c = V(), rf = typeof r === 'function' ? r : () => r;
    for (let i = 0; i < p.count; i++) {
      const ring = Math.floor(i / (yan + 1)), t = ring / seg, k = Math.max(0.0005, rf(t));
      curve.getPointAt(t, c);
      p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
    }
    // Uçları kapat: ilk/son halkayı merkeze topla (yuvarlak görünür, delik kalmaz).
    g.computeVertexNormals();
    return g;
  }
  function kulakGeo(tip, en = 1, boy = 1) {
    if (tip === 'yuvarlak') {
      const dis = new T.SphereGeometry(1, 20, 14); dis.scale(.15 * en, .14 * boy, .065); dis.translate(0, .1 * boy, 0);
      const ic = new T.SphereGeometry(1, 16, 10); ic.scale(.095 * en, .085 * boy, .03); ic.translate(0, .1 * boy, .045);
      return { dis, ic };
    }
    if (tip === 'sarkik') {
      const mk = (k, d) => {
        const g = dikLoft([[0, .07 * k * en, .05 * k, 0], [-.08, .12 * k * en, .055 * k, .02], [-.22, .14 * k * en, .05 * k, .04], [-.34, .12 * k * en, .04 * k, .05], [-.42, .07 * k * en, .03 * k, .05], [-.45, .001, .001, .05]].map(s => [s[0] * boy, s[1], s[2], s[3] + d]), 24, 20);
        return g;
      };
      return { dis: mk(1, 0), ic: mk(.7, .03) };
    }
    const L = tip === 'uzun' ? .62 : .36;
    const prof = tip === 'uzun'
      ? [[0, .11, .06, 0], [.1, .13, .065, .01], [.3, .12, .055, .02], [.48, .085, .04, .02], [.58, .04, .025, .015], [.62, .001, .001, .01]]
      : [[0, .16, .07, 0], [.08, .15, .068, .006], [.18, .11, .055, .016], [.28, .06, .036, .026], [.34, .022, .018, .03], [.36, .001, .001, .03]];
    const mk = (pr, k, dz, flat) => dikLoft(pr.map(s => [s[0] * boy, s[1] * en * k, s[2] * flat, s[3] + dz]), 12, 14);
    // İç kulak alttan yuvarlak başlar (dış kulakla dişli kesişme olmasın).
    const ic = [[prof[0][0] + .035, .001, .001, prof[0][3]], [prof[0][0] + .07, prof[1][1] * .85, prof[1][2], prof[1][3]]].concat(prof.slice(2).map(s => [s[0] * .93, s[1], s[2], s[3]]));
    return { dis: mk(prof, 1, 0, 1), ic: mk(ic, .66, .036, .45), uzun: L * boy };
  }
  // Elipsoid (r) üstünde yön (yaw, pitch) noktası, dış normal ve +Z'yi normale çeviren dönüş.
  const Z = V(0, 0, 1);
  function yuzeyNoktasi(r, yaw, pitch) {
    const d = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const t = 1 / Math.sqrt(sq(d.x / r[0]) + sq(d.y / r[1]) + sq(d.z / r[2]));
    const p = d.multiplyScalar(t), n = V(p.x / (r[0] * r[0]), p.y / (r[1] * r[1]), p.z / (r[2] * r[2])).normalize();
    return { p, n, q: new T.Quaternion().setFromUnitVectors(Z, n) };
  }
  function sq(x) { return x * x; }

  // ── Yapıcı: parçaları kemiklere bağla, malzeme başına tek SkinnedMesh'e birleştir ──
  function yapici(ad) {
    const root = new T.Group(); root.name = ad || 'Rehber';
    const kok = new T.Group(); kok.name = 'rehber kök'; root.add(kok);
    const ust = new T.Bone(); ust.name = 'ust'; kok.add(ust);
    const kemikler = [ust], parcalar = [], sahip = [];
    const _e = new T.Euler(), _q = new T.Quaternion(), _s = V(), _p = V();
    function kemik(ebeveyn, isim, x = 0, y = 0, z = 0) {
      const b = new T.Bone(); b.name = isim; b.position.set(x, y, z); (ebeveyn || ust).add(b); kemikler.push(b); return b;
    }
    function parca(k, geo, renk, o = {}) {
      const p = o.p || [0, 0, 0], s = o.s == null ? [1, 1, 1] : (typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s);
      if (o.q) _q.copy(o.q); else { const r = o.r || [0, 0, 0]; _q.setFromEuler(_e.set(r[0], r[1], r[2])); }
      const m = new T.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
      const part = { k, geo, renk: new T.Color(renk), m, mat: o.mat || 'kurk', boya: o.boya, harman: o.harman, ad: o.ad || '' };
      parcalar.push(part); if (o.sahip) sahip.push(geo); return part;
    }
    const elips = (k, renk, p, s, o = {}) => parca(k, GEO.kure, renk, Object.assign({}, o, { p, s }));
    const kucuk = (k, renk, p, s, o = {}) => parca(k, GEO.kucuk, renk, Object.assign({}, o, { p, s }));
    const mini = (k, renk, p, s, o = {}) => parca(k, GEO.mini, renk, Object.assign({}, o, { p, s }));
    const kubbeP = (k, renk, p, s, o = {}) => parca(k, o.kucuk ? GEO.kubbeKucuk : GEO.kubbe, renk, Object.assign({}, o, { p, s }));
    const yogun = (k, renk, p, s, o = {}) => parca(k, GEO.yogun, renk, Object.assign({}, o, { p, s }));
    function boru(k, noktalar, r, renk, o = {}) { return parca(k, boruGeo(noktalar, r, o.seg || 16, o.yan || 6), renk, Object.assign({ sahip: true }, o)); }
    // Büyük parlak göz: kenar + iris (aşağı doğru açılan renk) + bebek + iki parlama; mutlu "^" kapalı göz ayrı kemikte.
    function goz(basK, merkez, r, o) {
      const yp = yuzeyNoktasi(r, o.yaw, o.pitch), en = o.en, boy = o.boy;
      const pos = yp.p.clone().addScaledVector(yp.n, -0.012).add(V(merkez[0], merkez[1], merkez[2]));
      const acik = kemik(basK, 'goz', pos.x, pos.y, pos.z); acik.quaternion.copy(yp.q);
      const mutlu = kemik(basK, 'gozMutlu', pos.x, pos.y, pos.z); mutlu.quaternion.copy(yp.q);
      const kenar = o.kenar == null ? 0x2b1d1b : o.kenar, iris = new T.Color(o.iris), acikIris = iris.clone().lerp(new T.Color(0xffffff), .35);
      kubbeP(acik, kenar, [0, 0, -.02], [en * 1.075, boy * 1.075, .055], { mat: 'parlak' });
      kubbeP(acik, iris, [0, -boy * .03, -.012], [en * .93, boy * .93, .06], { mat: 'parlak', boya: (c, p, uv, h) => c.copy(iris).lerp(acikIris, sstep(.1, -.9, h.y)).multiplyScalar(1 - .28 * sstep(.15, 1, h.y)) });
      const bx = o.bebek === 'dikey' ? .3 : .5, by = o.bebek === 'dikey' ? .72 : .56;
      kubbeP(acik, 0x120d0c, [0, -boy * .02, -.004], [en * bx, boy * by, .06], { mat: 'parlak' });
      kubbeP(acik, 0xffffff, [-en * .33, boy * .34, .012], [en * .3, boy * .25, .045], { mat: 'isik', kucuk: true });
      kubbeP(acik, 0xffffff, [en * .32, -boy * .34, .01], [en * .13, boy * .11, .045], { mat: 'isik', kucuk: true });
      boru(mutlu, [[-en * .95, -boy * .15, .03], [-en * .5, boy * .32, .05], [0, boy * .45, .055], [en * .5, boy * .32, .05], [en * .95, -boy * .15, .03]], t => .022 * (0.55 + .45 * Math.sin(Math.PI * t)), kenar, { mat: 'parlak', seg: 18, yan: 6 });
      mutlu.scale.setScalar(.001);
      return { acik, mutlu };
    }
    function bitir(hedefBoy) {
      root.updateMatrixWorld(true);
      const gruplar = new Map(), v = V(), n = V(), b = V(), nm = new T.Matrix3(), uv = new T.Vector2(), c = new T.Color(), h = V();
      for (const p of parcalar) { if (!gruplar.has(p.mat)) gruplar.set(p.mat, []); gruplar.get(p.mat).push(p); }
      let maxY = 0; const veriler = [];
      gruplar.forEach((list, matKey) => {
        const pos = [], nor = [], col = [], uvs = [], si = [], sw = [], idx = []; let base = 0;
        for (const p of list) {
          const m = p.k.matrixWorld.clone().multiply(p.m), a = p.geo.attributes, bi = kemikler.indexOf(p.k);
          nm.getNormalMatrix(m); const nmLocal = new T.Matrix3().getNormalMatrix(p.m);
          for (let i = 0; i < a.position.count; i++) {
            h.fromBufferAttribute(a.position, i);
            v.copy(h).applyMatrix4(m); pos.push(v.x, v.y, v.z); if (v.y > maxY) maxY = v.y;
            n.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); nor.push(n.x, n.y, n.z);
            b.copy(h).applyMatrix4(p.m);   // kemik uzayı
            if (a.uv) uv.fromBufferAttribute(a.uv, i); else uv.set(0, 0);
            c.copy(p.renk); if (p.boya) p.boya(c, b, a.uv ? uv : null, h);
            const shade = matKey === 'kurk' ? .86 + .14 * clamp01(n.y * .5 + .55) : 1;
            col.push(c.r * shade, c.g * shade, c.b * shade);
            uvs.push(uv.x, uv.y);
            const w = p.harman ? p.harman(b, a.uv ? uv : null, h) : null;
            if (w && w.length) {
              let tot = 0; for (const e of w) tot += e[1];
              for (let j = 0; j < 4; j++) { const e = w[j]; si.push(e ? kemikler.indexOf(e[0]) : 0); sw.push(e ? e[1] / (tot || 1) : 0); }
            } else { si.push(bi, 0, 0, 0); sw.push(1, 0, 0, 0); }
          }
          const index = p.geo.index;
          for (let i = 0; i < (index ? index.count : a.position.count); i++) idx.push(base + (index ? index.getX(i) : i));
          base += a.position.count;
        }
        veriler.push({ matKey, pos, nor, col, uvs, si, sw, idx });
      });
      sahip.forEach(g => g.dispose());
      const olcek = hedefBoy && maxY > 0 ? hedefBoy / maxY : 1;
      kok.scale.setScalar(olcek); root.updateMatrixWorld(true);
      const iskelet = new T.Skeleton(kemikler), meshler = [];
      for (const d of veriler) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(d.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(d.nor, 3));
        g.setAttribute('color', new T.Float32BufferAttribute(d.col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(d.uvs, 2));
        g.setAttribute('skinIndex', new T.Uint16BufferAttribute(d.si, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(d.sw, 4));
        g.setIndex(d.pos.length / 3 > 65535 ? new T.Uint32BufferAttribute(d.idx, 1) : new T.Uint16BufferAttribute(d.idx, 1));
        g.computeBoundingSphere();
        const mesh = new T.SkinnedMesh(g, MALZEME[d.matKey] || MALZEME.kurk); mesh.name = root.name + ' ' + d.matKey;
        mesh.castShadow = d.matKey !== 'isik'; mesh.receiveShadow = d.matKey === 'kurk'; mesh.frustumCulled = false;
        kok.add(mesh); mesh.bind(iskelet); meshler.push(mesh);
      }
      return { boy: maxY * olcek, olcek, iskelet, meshler };
    }
    return { root, kok, kemikler, kemik, parca, elips, kucuk, mini, kubbe: kubbeP, yogun, boru, goz, bitir };
  }

  // ── Standart animasyon sürücüsü ──
  // k: kemikler { kalca, govde, bas, kolL, kolR, dirsekL, dirsekR, elL, elR, bacakL, bacakR, dizL, dizR, ayakL, ayakR,
  //               kuyruk:[...], kulakL, kulakR, agiz, gozler:[{acik,mutlu}] }, o: { tip, olcu }
  const MODLAR = ['bekle', 'yuru', 'kos', 'selam', 'dans', 'sevin', 'konus', 'otur', 'isaret'];
  function surucu(root, kok, k, o) {
    const dort = o.tip === 'dort', ol = o.olcu;
    const W = {}; MODLAR.forEach(m => { W[m] = m === 'bekle' ? 1 : 0; });
    const rest = new Map();
    const hepsi = Object.values(k).flat().filter(b => b && b.isBone);
    hepsi.forEach(b => rest.set(b, { p: b.position.clone(), r: b.rotation.clone(), s: b.scale.clone() }));
    k.gozler.forEach(g => rest.set(g.acik, { p: g.acik.position.clone(), r: g.acik.rotation.clone(), s: V(1, 1, 1) }));
    const ch = {}; // kanal toplayıcı
    const CH = ['kokY', 'kokRy', 'kokZ', 'kalcaY', 'kalcaX', 'kalcaZ', 'kalcaRy', 'govdeX', 'govdeZ', 'govdeY', 'basX', 'basY', 'basZ',
      'kolLx', 'kolLz', 'kolLy', 'kolRx', 'kolRz', 'kolRy', 'dirsekLx', 'dirsekLz', 'dirsekRx', 'dirsekRz', 'elLx', 'elRx', 'elLz', 'elRz',
      'bacakLx', 'bacakRx', 'bacakLz', 'bacakRz', 'dizLx', 'dizRx', 'ayakLx', 'ayakRx',
      'k1x', 'k1y', 'k2x', 'k2y', 'k3x', 'k3y', 'kulakLz', 'kulakRz', 'kulakLx', 'kulakRx', 'agiz', 'mutlu'];
    let t = 0, faz = 0, kosu = 0, yurume = 0, kirpT = 2.5, kirp = -1, kirpCift = false, bakYaw = 0, bakPitch = 0, gezYaw = 0, gezPitch = 0, gezT = 3;
    const kulakT = [3.1, 4.7], kulakS = [0, 0];
    let dansT = 0, donus = 0, konusFaz = 0;
    const hedef = V(), omuz = V(), _m = new T.Matrix4();
    // Kolun aşağı vektörünü yerel yön d'ye çeviren XYZ euler: (x=φ, z=θ).
    function kolYon(dx, dy, dz, out) {
      const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
      const th = Math.asin(clamp(dx, -1, 1)), ph = Math.atan2(-dz, -dy);
      out[0] = ph; out[1] = th; return out;
    }
    const tmpA = [0, 0], tmpB = [0, 0], tmpC = [0, 0], tmpD = [0, 0];
    const _q1 = new T.Quaternion(), _e1 = new T.Euler(), _v1 = V();
    // Üst kol yönü dU ve ön kol yönü dL (ikisi de gövde uzayında) → üst kol (U) ve dirsek (L) euler'leri.
    function kolIki(ux, uy, uz, lx, ly, lz, U, Lo) {
      kolYon(ux, uy, uz, U); _q1.setFromEuler(_e1.set(U[0], 0, U[1])).invert();
      _v1.set(lx, ly, lz).normalize().applyQuaternion(_q1); kolYon(_v1.x, _v1.y, _v1.z, Lo); return U;
    }
    // Kanal ekle: kolu (taraf 'L'|'R') verilen yönlere getir (ağırlık w).
    function kolPoz(taraf, ux, uy, uz, lx, ly, lz, w) {
      kolIki(ux, uy, uz, lx, ly, lz, tmpC, tmpD);
      const r = k._rest, rd = k._restDirsek;
      ekle('kol' + taraf + 'x', tmpC[0] - r['kol' + taraf + 'x'], w); ekle('kol' + taraf + 'z', tmpC[1] - r['kol' + taraf + 'z'], w);
      ekle('dirsek' + taraf + 'x', tmpD[0] - rd[taraf + 'x'], w); ekle('dirsek' + taraf + 'z', tmpD[1] - rd[taraf + 'z'], w);
    }
    function ekle(ad, deger, w) { ch[ad] += deger * w; }
    function R(b, x, y, z) { if (!b) return; const r = rest.get(b).r; b.rotation.set(r.x + x, r.y + y, r.z + z); }

    return function guncelle(dt, time, durum) {
      dt = clamp(dt || 0, 0, 0.1); t += dt;
      const mod = durum && MODLAR.includes(durum.mod) ? durum.mod : 'bekle';
      let hiz = durum && Number.isFinite(durum.hiz) ? Math.max(0, durum.hiz) : 0;
      if (mod === 'yuru' && hiz < .2) hiz = 1.4; if (mod === 'kos' && hiz < .2) hiz = 4.5;
      if (mod === 'otur') hiz = 0;
      for (const m of MODLAR) W[m] = damp(W[m], m === mod ? 1 : 0, 7, dt);
      yurume = damp(yurume, hiz > .15 ? 1 : 0, 9, dt);
      kosu = damp(kosu, clamp01((hiz - 1.6) / 3.5), 6, dt);
      faz += dt * Math.min(17, 4 + hiz * 2.3);
      for (const c of CH) ch[c] = 0;

      // Yürüyüş/koşu (her modla katmanlı)
      const g = yurume, s1 = Math.sin(faz), c1 = Math.cos(faz), amp = .42 + .4 * kosu;
      const kolSerbest = 1 - Math.max(W.selam, W.sevin, W.isaret, W.dans, W.konus * .6);
      if (!dort) {
        ekle('bacakLx', -amp * s1, g); ekle('bacakRx', amp * s1, g);
        ekle('dizLx', (.25 + .6 * kosu) * Math.max(0, c1) + .1, g); ekle('dizRx', (.25 + .6 * kosu) * Math.max(0, -c1) + .1, g);
        ekle('ayakLx', .25 * s1, g); ekle('ayakRx', -.25 * s1, g);
        ekle('kolLx', .55 * amp * s1 * kolSerbest, g); ekle('kolRx', -.55 * amp * s1 * kolSerbest, g);
        ekle('dirsekLx', -(.25 + .6 * kosu) * kolSerbest, g); ekle('dirsekRx', -(.25 + .6 * kosu) * kolSerbest, g);
        ekle('kokY', (.025 + .05 * kosu) * Math.abs(c1) * ol.H, g); ekle('govdeX', .06 + .16 * kosu, g); ekle('basX', -.04 - .1 * kosu, g);
        ekle('kalcaRy', .1 * s1, g); ekle('govdeY', -.14 * s1, g);
      } else {
        const a = .38 + .3 * kosu;
        ekle('kolLx', a * s1, g); ekle('bacakRx', a * s1, g); ekle('kolRx', -a * s1, g); ekle('bacakLx', -a * s1, g);
        ekle('dirsekLx', .35 * Math.max(0, c1), g); ekle('dirsekRx', .35 * Math.max(0, -c1), g);
        ekle('dizLx', -.35 * Math.max(0, -c1), g); ekle('dizRx', -.35 * Math.max(0, c1), g);
        ekle('kokY', (.02 + .05 * kosu) * Math.abs(c1) * ol.H, g); ekle('basX', .05 * Math.sin(faz * 2), g);
      }
      ekle('agiz', .25 * kosu, g);

      // Bekle: nefes + kuyruk + etrafa bakma
      const nefes = Math.sin(t * 2.1);
      ch.govdeX += .02 * nefes; ch.kalcaY += .004 * ol.H * nefes; ch.basX += -.015 * nefes;
      if (!dort) { ch.kolLz += .03 * nefes; ch.kolRz -= .03 * nefes; }
      gezT -= dt;
      if (gezT <= 0) { gezT = 2.5 + Math.random() * 3.5; gezYaw = Math.random() < .3 ? 0 : (Math.random() - .5) * 1.0; gezPitch = (Math.random() - .5) * .25; }

      // Selam: el sallama
      if (W.selam > .001) {
        const w = W.selam;
        if (!dort) {
          const sl = Math.sin(t * 8.5);
          kolPoz('R', -.85, .14, .5, -.3 + .55 * sl, 1, .3, w); ekle('elRz', .35 * Math.sin(t * 8.5 - 1.0), w);
          ekle('basZ', .14 + .05 * Math.sin(t * 4.5), w); ekle('govdeZ', .06, w); ekle('kalcaZ', -.03 * Math.sin(t * 4.5), w);
        } else {
          ekle('kolRx', -1.25, w); ekle('dirsekRx', .5 + .45 * Math.sin(t * 9), w); ekle('basZ', .15, w); ekle('kalcaX', -.08, w); ekle('kokZ', -.03 * ol.H, w);
        }
        ekle('agiz', .35, w); ekle('mutlu', .0, w);
      }
      // Dans: sağa sola, zıplama, kollar sırayla, ara sıra tam dönüş
      dansT = W.dans > .5 ? dansT + dt : 0;
      if (W.dans > .001) {
        const w = W.dans, b = Math.sin(t * 6.2), bb = Math.abs(Math.sin(t * 6.2));
        ekle('kokY', .06 * ol.H * bb, w); ekle('kalcaZ', .14 * b, w); ekle('govdeZ', -.2 * b, w); ekle('basZ', .18 * b, w); ekle('basX', -.06, w);
        if (!dort) {
          kolPoz('L', .9, .15 + .35 * b, .3, .45, .3 + .7 * Math.max(0, b), .35, w);
          kolPoz('R', -.9, .15 - .35 * b, .3, -.45, .3 + .7 * Math.max(0, -b), .35, w);
          ekle('bacakLz', .12 * Math.max(0, b), w); ekle('bacakRz', -.12 * Math.max(0, -b), w);
          ekle('dizLx', .5 * Math.max(0, b), w); ekle('dizRx', .5 * Math.max(0, -b), w); ekle('bacakLx', -.3 * Math.max(0, b), w); ekle('bacakRx', -.3 * Math.max(0, -b), w);
        } else {
          ekle('kolLx', -.5 * Math.max(0, b), w); ekle('kolRx', -.5 * Math.max(0, -b), w);
        }
        ekle('agiz', .55, w); ekle('mutlu', 1, w);
        // Her 4.5 saniyede bir neşeli tam dönüş.
        const evre = dansT % 4.5;
        donus = evre > 3.6 ? (evre - 3.6) / .9 : 0;
      } else donus = 0;
      ch.kokRy += donus > 0 ? TAU * (donus * donus * (3 - 2 * donus)) : 0;
      // Sevin: zıplama + kollar yukarı
      if (W.sevin > .001) {
        const w = W.sevin, z = Math.abs(Math.sin(t * 6.5));
        ekle('kokY', .22 * ol.H * z * z, w);
        if (!dort) {
          const sw = .25 * Math.sin(t * 13);
          kolPoz('L', .75, .6, .25, .35 + sw, 1, .1, w); kolPoz('R', -.75, .6, .25, -.35 - sw, 1, .1, w);
          ekle('dizLx', .5 * z, w); ekle('dizRx', .5 * z, w); ekle('bacakLx', -.25 * z, w); ekle('bacakRx', -.25 * z, w);
        } else {
          ekle('kolLx', -.6 * z, w); ekle('kolRx', -.6 * z, w); ekle('bacakLx', .5 * z, w); ekle('bacakRx', .5 * z, w);
        }
        ekle('basX', -.15, w); ekle('agiz', .75, w); ekle('mutlu', 1, w);
      }
      // Konuş: ağız açılıp kapanır, el hareketi
      konusFaz += dt * (10 + 3 * Math.sin(t * 1.7));
      if (W.konus > .001) {
        const w = W.konus, a = Math.max(0, Math.sin(konusFaz)) * (.55 + .45 * Math.sin(t * 2.9)) ;
        ekle('agiz', .15 + .7 * a, w); ekle('basX', -.05 * a, w); ekle('basZ', .08 * Math.sin(t * 2.2), w);
        if (!dort) {
          const kw = .55 + .45 * Math.sin(t * 2.4);
          kolPoz('L', .45, -.75, .45, .35, .15 + .2 * kw, 1, w * (.5 + .5 * kw));
          ekle('elLz', .3 * Math.sin(t * 5), w); ekle('govdeY', .08 * Math.sin(t * 1.3), w);
        } else ekle('kolLx', -.4 * Math.max(0, Math.sin(t * 2.4)), w);
      }
      // Otur: taşıtta oturma
      if (W.otur > .001) {
        const w = W.otur;
        if (!dort) {
          ekle('kalcaY', ol.oturY - ol.kalcaY, w);
          ekle('bacakLx', -1.5, w); ekle('bacakRx', -1.5, w); ekle('dizLx', 1.45 + .12 * Math.sin(t * 2.3), w); ekle('dizRx', 1.45 + .12 * Math.sin(t * 2.3 + 1.4), w);
          ekle('ayakLx', .1, w); ekle('ayakRx', .1, w);
          ekle('kolLx', -.5, w); ekle('kolRx', -.5, w); ekle('dirsekLx', -.6, w); ekle('dirsekRx', -.6, w); ekle('govdeX', -.05, w);
        } else {
          ekle('kalcaX', -.6, w); ekle('kokY', -.12 * ol.H, w); ekle('bacakLx', -1.1, w); ekle('bacakRx', -1.1, w); ekle('dizLx', 1.9, w); ekle('dizRx', 1.9, w);
          ekle('kolLx', .55, w); ekle('kolRx', .55, w); ekle('basX', .35, w);
        }
      }
      // İşaret: kolla bak yönünü göster
      let sagdan = true;
      if (durum && durum.bak && durum.bak.isVector3) {
        root.updateMatrixWorld(); _m.copy(kok.matrixWorld).invert(); hedef.copy(durum.bak).applyMatrix4(_m);
      } else hedef.set(0, ol.basMerkezY, 10);
      if (W.isaret > .001) {
        const w = W.isaret;
        if (!dort) {
          sagdan = hedef.x <= 0; const s = sagdan ? -1 : 1;
          omuz.set(s * ol.omuzX, ol.omuzY, 0);
          let dx = hedef.x - omuz.x, dy = hedef.y - omuz.y, dz = hedef.z - omuz.z;
          if (dz < .2) dz = .2; dy = clamp(dy, -.4 * Math.hypot(dx, dz), 1.2 * Math.hypot(dx, dz));
          kolYon(dx, dy, dz, tmpA);
          const kx = sagdan ? 'kolRx' : 'kolLx', kz = sagdan ? 'kolRz' : 'kolLz', rx = sagdan ? k._rest.kolRx : k._rest.kolLx, rz = sagdan ? k._rest.kolRz : k._rest.kolLz;
          ekle(kx, tmpA[0] - rx, w); ekle(kz, tmpA[1] - rz, w); ekle(sagdan ? 'dirsekRx' : 'dirsekLx', -.05, w);
          ekle('govdeY', clamp(Math.atan2(hedef.x, Math.max(.3, hedef.z)) * .35, -.4, .4), w);
          ekle('agiz', .25, w);
        } else { ekle('kolRx', -1.1, w); ekle('dirsekRx', .3, w); }
      }

      // Baş bakışı
      let yaw = gezYaw * W.bekle, pitch = gezPitch * W.bekle;
      if (durum && durum.bak && durum.bak.isVector3) {
        const dx = hedef.x, dz = hedef.z - ol.basMerkezZ, dy = hedef.y - ol.basMerkezY;
        yaw = clamp(Math.atan2(dx, Math.max(.05, dz)), -1.05, 1.05) * (dz < 0 ? .5 : 1);
        pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -.45, .4);
      }
      const hareketli = Math.max(W.dans, W.sevin);
      bakYaw = damp(bakYaw, yaw * (1 - hareketli), 5, dt); bakPitch = damp(bakPitch, pitch * (1 - hareketli), 5, dt);
      ch.basY += bakYaw * .8; ch.govdeY += bakYaw * .2; ch.basX -= bakPitch;

      // Kuyruk
      const nese = Math.max(W.selam, W.dans, W.sevin, W.konus * .5);
      const kh = t * (1.3 + 5.5 * nese + 2 * kosu);
      const ka = .22 + .3 * nese;
      ch.k1y += ka * Math.sin(kh); ch.k2y += ka * 1.25 * Math.sin(kh - .7); ch.k3y += ka * 1.4 * Math.sin(kh - 1.4);
      ch.k1x += .06 * Math.sin(t * 1.1) - .25 * kosu; ch.k2x += .05 * Math.sin(t * 1.1 - .5); ch.k3x += .08 * Math.sin(t * 1.4 - 1);
      // Kulak kıpırtısı
      for (let i = 0; i < 2; i++) {
        kulakT[i] -= dt; if (kulakT[i] <= 0) { kulakT[i] = 2.5 + Math.random() * 4.5; kulakS[i] = .35; }
        kulakS[i] = Math.max(0, kulakS[i] - dt);
        const tw = kulakS[i] > 0 ? Math.sin((.35 - kulakS[i]) / .35 * Math.PI) * .28 : 0;
        ch[i ? 'kulakRz' : 'kulakLz'] += (i ? -1 : 1) * (tw + .05 * Math.sin(t * 1.7 + i) + .12 * kosu) ;
        ch[i ? 'kulakRx' : 'kulakLx'] += -.1 * kosu + .08 * nese * Math.sin(t * 6.2 + i);
      }

      // ── Uygula ──
      kok.position.set(0, ch.kokY * ol.olcek, ch.kokZ * ol.olcek); kok.rotation.y = ch.kokRy;
      if (k.kalca) { const r = rest.get(k.kalca); k.kalca.position.set(r.p.x, r.p.y + ch.kalcaY, r.p.z); R(k.kalca, ch.kalcaX, ch.kalcaRy, ch.kalcaZ); }
      R(k.govde, ch.govdeX, ch.govdeY, ch.govdeZ); R(k.bas, ch.basX, ch.basY, ch.basZ);
      R(k.kolL, ch.kolLx, ch.kolLy, ch.kolLz); R(k.kolR, ch.kolRx, ch.kolRy, ch.kolRz);
      R(k.dirsekL, ch.dirsekLx, 0, ch.dirsekLz); R(k.dirsekR, ch.dirsekRx, 0, ch.dirsekRz);
      R(k.elL, ch.elLx, 0, ch.elLz); R(k.elR, ch.elRx, 0, ch.elRz);
      R(k.bacakL, ch.bacakLx, 0, ch.bacakLz); R(k.bacakR, ch.bacakRx, 0, ch.bacakRz);
      R(k.dizL, ch.dizLx, 0, 0); R(k.dizR, ch.dizRx, 0, 0); R(k.ayakL, ch.ayakLx, 0, 0); R(k.ayakR, ch.ayakRx, 0, 0);
      if (k.kuyruk) { R(k.kuyruk[0], ch.k1x, ch.k1y, 0); R(k.kuyruk[1], ch.k2x, ch.k2y, 0); R(k.kuyruk[2], ch.k3x, ch.k3y, 0); }
      R(k.kulakL, ch.kulakLx, 0, ch.kulakLz); R(k.kulakR, ch.kulakRx, 0, ch.kulakRz);
      // Ağız
      if (k.agiz) { const a = clamp01(ch.agiz); k.agiz.scale.set(.55 + .45 * a, Math.max(.001, a), .7 + .3 * a); }
      // Göz kırpma + mutlu gözler
      kirpT -= dt;
      if (kirpT <= 0 && kirp < 0) { kirp = 0; kirpCift = Math.random() < .2; kirpT = 2.2 + Math.random() * 3.2; }
      let kapak = 1;
      if (kirp >= 0) { kirp += dt; kapak = 1 - .96 * Math.sin(Math.PI * clamp01(kirp / .15)); if (kirp > .15) { if (kirpCift) { kirpCift = false; kirp = -.08; } else kirp = -1; } }
      else if (kirp > -1 && kirp < 0) { kirp += dt; if (kirp >= 0) kirp = 0; }
      const mu = clamp01(ch.mutlu);
      for (const gz of k.gozler) {
        gz.acik.scale.set(1, Math.max(.001, kapak * (1 - mu)), 1);
        gz.mutlu.scale.setScalar(Math.max(.001, mu));
      }
    };
  }

  // ── Standart hayvan ──
  function hayvan(a) {
    a = a || {};
    const dort = a.tip === 'dort';
    const R = Object.assign({ kurk: 0xd9a066, karin: null, ic: 0xf2a7b5, burun: 0xe98593, pati: 0xf4a3b3, yanak: 0xff9aa8, kenar: 0x2b1d1b, agiz: 0x8a3340, dil: 0xf07f93 }, a.renk || {});
    if (R.karin == null) R.karin = new T.Color(R.kurk).lerp(new T.Color(0xffffff), .45).getHex();
    const br = (a.bas && a.bas.r) || [.5, .44, .46];
    const gv = Object.assign({ en: 1, dolgun: 1 }, a.govde || {});
    const gz = Object.assign({ yaw: .36, pitch: .04, en: .105, boy: .13, iris: [0x6b4a2e, 0x6b4a2e], bebek: 'yuvarlak' }, a.goz || {});
    const ku = Object.assign({ tip: 'sivri', boy: 1, en: 1, aci: .3 }, a.kulak || {});
    const kq = Object.assign({ tip: 'ince', boy: 1, kalin: 1, kivrik: 1 }, a.kuyruk || {});
    const ag = Object.assign({ tip: 'kedi', uzun: .18, en: 1 }, a.agizlik || {});
    const boyaKullanici = a.boya || null;
    const boyaFn = (ad, extra) => (c, p, uv, h) => { if (extra) extra(c, p, uv, h); if (boyaKullanici) boyaKullanici(ad, c, p, uv, h); };
    const y = yapici(a.ad || 'Rehber');
    const k = { gozler: [] };
    const ol = { H: 2.2 };
    const yanakNoktalari = [];
    const yanakBoya = (c, p) => {
      for (const q of yanakNoktalari) { const d = p.distanceTo(q); if (d < .16) c.lerp(new T.Color(R.yanak), .6 * (1 - sstep(.0, .16, d))); }
    };

    let basMerkez;
    if (!dort) {
      // İki ayaklı çizgi film oranları (baş büyük, bacak kısa). Ölçüler nominal; bitir() hedef boya ölçekler.
      const kalcaY = .62;
      k.kalca = y.kemik(null, 'kalca', 0, kalcaY, 0);
      k.govde = y.kemik(k.kalca, 'govde', 0, .2, 0);
      k.bas = y.kemik(k.govde, 'bas', 0, .36, .01);
      const E = gv.en, D = gv.dolgun;
      const govdeGeo = dikLoft([[-.21, .001, .001, .01], [-.19, .15 * E, .14 * D, .01], [-.12, .25 * E, .22 * D, .02], [.02, .285 * E, .245 * D, .03], [.18, .26 * E, .22 * D, .025],
        [.36, .21 * E, .18 * D, .01], [.5, .155 * E, .135 * D, 0], [.58, .1, .095, 0], [.62, .001, .001, 0]], 28, 26);
      y.parca(k.kalca, govdeGeo, R.kurk, { sahip: true, ad: 'govde',
        harman: p => { const w = sstep(.08, .34, p.y); return [[k.kalca, 1 - w], [k.govde, w]]; },
        boya: boyaFn('govde', (c, p) => { const f = sstep(.02, .2, p.z) * (1 - sstep(.38, .52, p.y)) * sstep(-.18, -.05, p.y); c.lerp(new T.Color(R.karin), f * .9); }) });
      // Kollar
      ol.omuzX = .25; ol.omuzY = kalcaY + .2 + .22;
      for (const s of [1, -1]) {
        const L = s > 0 ? 'L' : 'R';
        const kol = y.kemik(k.govde, 'kol' + L, s * .245, .22, 0);
        y.parca(kol, kapsul(.085, .075, .24), R.kurk, { ad: 'kol' + L, boya: boyaFn('kol' + L) });
        const dirsek = y.kemik(kol, 'dirsek' + L, 0, -.24, 0);
        y.parca(dirsek, kapsul(.077, .08, .2), R.kurk, { ad: 'dirsek' + L, boya: boyaFn('dirsek' + L) });
        const el = y.kemik(dirsek, 'el' + L, 0, -.22, 0);
        y.elips(el, R.kurk, [0, -.04, .005], [.098, .105, .09], { ad: 'el' + L, boya: boyaFn('el' + L) });
        // Pati yastıkları (avuç +Z yönünde; el sallarken görünür)
        y.mini(el, R.pati, [0, -.065, .072], [.042, .036, .018], { mat: 'parlak' });
        for (const i of [-1, 0, 1]) y.mini(el, R.pati, [i * .036, -.012 + Math.abs(i) * .008, .078], [.017, .019, .012], { mat: 'parlak' });
        kol.rotation.z = s * .2; dirsek.rotation.x = -.22;
        k['kol' + L] = kol; k['dirsek' + L] = dirsek; k['el' + L] = el;
        // Bacaklar
        const bacak = y.kemik(k.kalca, 'bacak' + L, s * .14, -.05, 0);
        y.parca(bacak, kapsul(.12, .1, .22), R.kurk, { ad: 'bacak' + L, boya: boyaFn('bacak' + L) });
        const diz = y.kemik(bacak, 'diz' + L, 0, -.23, 0);
        y.parca(diz, kapsul(.098, .085, .19), R.kurk, { ad: 'diz' + L, boya: boyaFn('diz' + L) });
        const ayak = y.kemik(diz, 'ayak' + L, 0, -.21, 0);
        y.elips(ayak, R.kurk, [0, -.035, .07], [.115, .085, .175], { ad: 'ayak' + L, boya: boyaFn('ayak' + L) });
        for (const i of [-1, 0, 1]) y.mini(ayak, R.kurk, [i * .045, -.02, .21], [.036, .036, .036], { ad: 'ayak' + L, boya: boyaFn('ayak' + L) });
        k['bacak' + L] = bacak; k['diz' + L] = diz; k['ayak' + L] = ayak;
      }
      basMerkez = [0, .4, .03];
      ol.kalcaY = kalcaY; ol.oturY = 0; // aşağıda bitir() sonrası boy*0.35'e göre ayarlanır
      ol.basMerkezY = kalcaY + .2 + .36 + basMerkez[1]; ol.basMerkezZ = basMerkez[2];
    } else {
      // Dört ayaklı yavru: yatay gövde, büyük baş öne-yukarı.
      k.kalca = y.kemik(null, 'kalca', 0, .86, -.32);
      k.govde = y.kemik(k.kalca, 'govde', 0, 0, .62);
      k.bas = y.kemik(k.govde, 'bas', 0, .16, .24);
      const E = gv.en, D = gv.dolgun;
      const govdeGeo = loft([[-.3, .001, .001, .02], [-.26, .18 * E, .17 * D, .02], [-.1, .29 * E, .28 * D, .02], [.15, .31 * E, .29 * D, .01], [.45, .29 * E, .28 * D, .02], [.72, .25 * E, .26 * D, .05], [.88, .17, .19, .08], [.95, .001, .001, .08]], 34, 30);
      y.parca(k.kalca, govdeGeo, R.kurk, { sahip: true, ad: 'govde',
        harman: p => { const w = sstep(.25, .55, p.z); return [[k.kalca, 1 - w], [k.govde, w]]; },
        boya: boyaFn('govde', (c, p) => c.lerp(new T.Color(R.karin), sstep(-.05, -.22, p.y) * .85)) });
      // Boyun
      y.elips(k.govde, R.kurk, [0, .1, .16], [.2, .24, .2], { ad: 'boyun', boya: boyaFn('boyun') });
      for (const s of [1, -1]) {
        const L = s > 0 ? 'L' : 'R';
        const kol = y.kemik(k.govde, 'kol' + L, s * .17, -.08, .04);
        y.parca(kol, kapsul(.125, .1, .3), R.kurk, { ad: 'kol' + L, boya: boyaFn('kol' + L) });
        const dirsek = y.kemik(kol, 'dirsek' + L, 0, -.3, 0);
        y.parca(dirsek, kapsul(.1, .095, .28), R.kurk, { ad: 'dirsek' + L, boya: boyaFn('dirsek' + L) });
        const el = y.kemik(dirsek, 'el' + L, 0, -.3, 0);
        y.elips(el, R.kurk, [0, .02, .03], [.115, .09, .14], { ad: 'el' + L, boya: boyaFn('el' + L) });
        k['kol' + L] = kol; k['dirsek' + L] = dirsek; k['el' + L] = el;
        const bacak = y.kemik(k.kalca, 'bacak' + L, s * .17, -.05, -.02);
        y.parca(bacak, kapsul(.15, .11, .3), R.kurk, { ad: 'bacak' + L, boya: boyaFn('bacak' + L) });
        const diz = y.kemik(bacak, 'diz' + L, 0, -.3, 0);
        y.parca(diz, kapsul(.105, .095, .28), R.kurk, { ad: 'diz' + L, boya: boyaFn('diz' + L) });
        const ayak = y.kemik(diz, 'ayak' + L, 0, -.3, 0);
        y.elips(ayak, R.kurk, [0, .02, .03], [.115, .09, .14], { ad: 'ayak' + L, boya: boyaFn('ayak' + L) });
        k['bacak' + L] = bacak; k['diz' + L] = diz; k['ayak' + L] = ayak;
      }
      basMerkez = [0, .3, .16];
      ol.omuzX = .17; ol.omuzY = .78;
      ol.basMerkezY = .86 + .16 + basMerkez[1]; ol.basMerkezZ = -.32 + .62 + .24 + basMerkez[2];
    }

    // ── Baş ──
    const bm = basMerkez;
    yanakNoktalari.push(...[1, -1].map(s => { const q = yuzeyNoktasi(br, s * .7, -.2).p; return V(q.x + bm[0], q.y + bm[1], q.z + bm[2]); }));
    y.yogun(k.bas, R.kurk, bm, br, { ad: 'bas', boya: boyaFn('bas', (c, p) => {
      // alın üstü hafif koyu, çene altı açık; allık yumuşak boyanır
      const yy = (p.y - bm[1]) / br[1], zz = (p.z - bm[2]) / br[2];
      c.lerp(new T.Color(R.karin), sstep(-.1, -.75, yy) * sstep(-.2, .6, zz) * .8);
      yanakBoya(c, p);
    }) });
    // Ağızlık
    const onZ = bm[2] + br[2];
    let agizMerkez;
    if (ag.tip === 'kedi') {
      for (const s of [1, -1]) y.elips(k.bas, R.karin, [bm[0] + s * .075 * ag.en, bm[1] - .13, onZ - .055], [.095 * ag.en, .075, .075], { ad: 'agizlik', boya: boyaFn('agizlik') });
      y.elips(k.bas, R.karin, [bm[0], bm[1] - .2, onZ - .085], [.07, .05, .06], { ad: 'cene', boya: boyaFn('cene') });
      // Burun: yumuşak ters üçgen
      const burun = new T.SphereGeometry(1, 16, 12); { const p = burun.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setX(i, p.getX(i) * (1 + .45 * yy)); } burun.computeVertexNormals(); }
      y.parca(k.bas, burun, R.burun, { p: [bm[0], bm[1] - .075, onZ + .005], s: [.05, .034, .03], mat: 'parlak', sahip: true, r: [-.25, 0, 0] });
      y.mini(k.bas, 0xffffff, [bm[0] - .014, bm[1] - .064, onZ + .03], [.014, .008, .006], { mat: 'isik' });
      // ω ağız çizgisi
      const yA = bm[1] - .112, zA = onZ - .006;
      for (const s of [1, -1]) y.boru(k.bas, [[0, yA + .004, zA + .016], [s * .016, yA - .016, zA + .014], [s * .036, yA - .022, zA + .01], [s * .056, yA - .012, zA + .002], [s * .068, yA + .004, zA - .006]], t => .009 * (1 - .3 * t), R.kenar, { mat: 'parlak', seg: 20 });
      agizMerkez = [bm[0], yA - .035, zA - .012];
    } else if (ag.tip === 'burun') {
      const L = ag.uzun;
      y.elips(k.bas, R.karin, [bm[0], bm[1] - .1, onZ - .08 + L * .5], [.15 * ag.en, .11, .09 + L * .5], { ad: 'agizlik', boya: boyaFn('agizlik') });
      y.elips(k.bas, R.burun, [bm[0], bm[1] - .04, onZ - .02 + L], [.07 * ag.en, .048, .045], { mat: 'parlak' });
      y.mini(k.bas, 0xffffff, [bm[0] - .02, bm[1] - .02, onZ + .02 + L], [.018, .01, .008], { mat: 'isik' });
      const yA = bm[1] - .14, zA = onZ - .01 + L * .9;
      for (const s of [1, -1]) y.boru(k.bas, [[0, yA + .012, zA], [s * .035, yA - .008, zA - .012], [s * .07, yA + .006, zA - .035]], .0075, R.kenar, { mat: 'parlak' });
      agizMerkez = [bm[0], yA - .03, zA - .02];
    } else {
      y.elips(k.bas, R.burun, [bm[0], bm[1] - .07, onZ - .005], [.045, .032, .03], { mat: 'parlak' });
      const yA = bm[1] - .12, zA = onZ - .015;
      y.boru(k.bas, [[-.06, yA + .01, zA - .01], [0, yA - .02, zA + .005], [.06, yA + .01, zA - .01]], .0075, R.kenar, { mat: 'parlak' });
      agizMerkez = [bm[0], yA - .035, zA - .015];
    }
    // Açılan ağız: koyu iç + dil (kapalıyken ölçek ~0)
    k.agiz = y.kemik(k.bas, 'agiz', agizMerkez[0], agizMerkez[1], agizMerkez[2]);
    y.kucuk(k.agiz, R.agiz, [0, 0, 0], [.055, .05, .03], { mat: 'parlak' });
    y.kucuk(k.agiz, R.dil, [0, -.025, .012], [.035, .022, .02], { mat: 'parlak' });
    // Gözler (sol = +x)
    for (const s of [1, -1]) {
      const g = y.goz(k.bas, bm, br, { yaw: s * gz.yaw, pitch: gz.pitch, en: gz.en, boy: gz.boy, iris: s > 0 ? gz.iris[0] : gz.iris[1], bebek: gz.bebek, kenar: R.kenar });
      k.gozler.push(g);
    }
    // Kulaklar
    if (ku.tip !== 'yok') {
      for (const s of [1, -1]) {
        const L = s > 0 ? 'L' : 'R';
        const yp = yuzeyNoktasi(br, s * (ku.tip === 'yuvarlak' ? .78 : .56), ku.tip === 'sarkik' ? .45 : .82);
        const kb = y.kemik(k.bas, 'kulak' + L, bm[0] + yp.p.x * .92, bm[1] + yp.p.y * .9, bm[2] + yp.p.z * .9 - .03);
        const kg = kulakGeo(ku.tip, ku.en, ku.boy);
        const r = ku.tip === 'sarkik' ? [0, 0, s * .25] : [-.12, 0, -s * ku.aci];
        y.parca(kb, kg.dis, R.kurk, { r, sahip: true, ad: 'kulak' + L, boya: boyaFn('kulak' + L) });
        y.parca(kb, kg.ic, R.ic, { r, sahip: true, ad: 'kulakIc' + L, boya: boyaFn('kulakIc' + L) });
        k['kulak' + L] = kb;
      }
    }
    // Kuyruk (3 kemikli, yumuşak harmanlı)
    if (kq.tip !== 'yok') {
      const Lq = kq.boy, kv = kq.kivrik;
      let pts, rf;
      if (kq.tip === 'kisa') { pts = [[0, 0, 0], [0, .03, -.08], [0, .06, -.14]]; rf = t => .09 * kq.kalin * Math.sin(Math.PI * (.25 + .75 * t)) + .02; }
      else if (kq.tip === 'kalin') { pts = [[0, 0, 0], [0, -.12, -.3 * Lq], [0, -.3, -.6 * Lq], [0, -.5 * Lq, -.85 * Lq]]; rf = t => (.15 * (1 - t) + .02) * kq.kalin; }
      else {
        pts = dort ? [[0, 0, 0], [0, .05, -.18 * Lq], [0, .2 * Lq, -.36 * Lq], [.04 * kv, .42 * Lq, -.42 * Lq], [.1 * kv, .58 * Lq, -.36 * Lq]]
          : [[0, 0, 0], [0, -.05, -.22 * Lq], [0, .14 * Lq, -.46 * Lq], [.05 * kv, .46 * Lq, -.55 * Lq], [.13 * kv, .7 * Lq, -.44 * Lq]];
        rf = kq.tip === 'kabarik' ? t => (.05 + .062 * Math.sin(Math.PI * Math.min(1, t * 1.05)) - .015 * t) * kq.kalin * (1 + .07 * Math.cos(t * Math.PI * 9 - .6) * Math.min(1, t * 4)) : t => (.06 - .025 * t) * kq.kalin;
      }
      const kokP = dort ? [0, .06, -.28] : [0, -.02, -.22];
      const curve = new T.CatmullRomCurve3(pts.map(p => V(p[0], p[1], p[2])));
      const c1 = curve.getPointAt(.33), c2 = curve.getPointAt(.66);
      const q1 = y.kemik(k.kalca, 'kuyruk1', kokP[0], kokP[1], kokP[2]);
      const q2 = y.kemik(q1, 'kuyruk2', c1.x, c1.y, c1.z);
      const q3 = y.kemik(q2, 'kuyruk3', c2.x - c1.x, c2.y - c1.y, c2.z - c1.z);
      k.kuyruk = [q1, q2, q3];
      const geo = boruGeo(pts, rf, kq.tip === 'kabarik' ? 40 : 28, 12);
      // Uç kapakları: ilk ve son halka merkeze çekilir → yuvarlak kapalı uç.
      y.parca(q1, geo, R.kurk, { sahip: true, ad: 'kuyruk', boya: boyaFn('kuyruk'),
        harman: (p, uv) => { const t = uv ? uv.x : 0; const a1 = 1 - sstep(.18, .45, t), a3 = sstep(.5, .8, t); return [[q1, a1], [q2, Math.max(0, 1 - a1 - a3)], [q3, a3]]; } });
      y.elips(q3, R.kurk, [pts[pts.length - 1][0] - c2.x, pts[pts.length - 1][1] - c2.y, pts[pts.length - 1][2] - c2.z], rf(1) * 1.05, { ad: 'kuyruk', boya: boyaFn('kuyrukUc') });
      y.elips(q1, R.kurk, [0, 0, 0], rf(0) * 1.05, { ad: 'kuyruk', boya: boyaFn('kuyrukKok') });
    }
    // Bıyıklar
    if (a.biyik && ag.tip === 'kedi') {
      const bc = a.biyikRenk == null ? 0xd8d2cc : a.biyikRenk;
      for (const s of [1, -1]) for (const i of [0, 1, 2]) {
        const y0 = bm[1] - .115 + i * .022, z0 = onZ - .05;
        y.boru(k.bas, [[s * .13, y0, z0], [s * .25, y0 + .02 - i * .02, z0 - .03], [s * .37, y0 + .01 - i * .045, z0 - .09]], t => .0055 * (1 - .7 * t), bc, { seg: 8, yan: 4 });
      }
    }
    // Ülkeye özel ekler (fular, desen, şapka…)
    const olculer = { basMerkez: bm, basR: br, onZ, dort };
    if (a.ekle) a.ekle(y, k, olculer);

    const sonuc = y.bitir(a.boy || 2.05);
    // Oturma yüksekliği: kalça zeminden ≈ boy*0.35
    ol.H = sonuc.boy / sonuc.olcek; ol.olcek = sonuc.olcek;
    if (!dort) ol.oturY = .35 * ol.H;
    k._rest = { kolLx: k.kolL.rotation.x, kolLz: k.kolL.rotation.z, kolRx: k.kolR.rotation.x, kolRz: k.kolR.rotation.z };
    k._restDirsek = { Lx: k.dirsekL.rotation.x, Lz: k.dirsekL.rotation.z, Rx: k.dirsekR.rotation.x, Rz: k.dirsekR.rotation.z };
    const guncelle = surucu(y.root, y.kok, k, { tip: dort ? 'dort' : 'iki', olcu: ol });
    let bitti = false;
    guncelle(0, 0, { mod: 'bekle' });
    return {
      root: y.root, boy: sonuc.boy, kemik: k, meshler: sonuc.meshler,
      guncelle,
      dispose() {
        if (bitti) return; bitti = true;
        sonuc.meshler.forEach(m => m.geometry.dispose()); sonuc.iskelet.dispose(); y.root.removeFromParent();
      }
    };
  }

  window.FLASH_REHBER_KIT = Object.freeze({
    hayvan, yapici, surucu, loft, dikLoft, kapsul, boruGeo, kulakGeo, yuzeyNoktasi,
    malzeme: MALZEME, geo: GEO, MODLAR: MODLAR.slice(),
    renk: hex => new T.Color(hex),
    karistir: (a, b, t) => new T.Color(a).lerp(new T.Color(b), t).getHex(),
    yardim: { clamp, clamp01, sstep, damp }
  });
}());
