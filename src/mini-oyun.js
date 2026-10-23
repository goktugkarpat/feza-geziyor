/* Mini oyun, taşıt ve dekor yazarları için ortak yardımcılar — window.FLASH_MINI.
 * Sözleşme: TASARIM.md §6. Oyun oturumunu (başlat/ilerle/bitir, kamera, ses) src/tur.js yönetir; bu dosya yalnız
 * tekrar kullanılabilir yapı taşlarını verir. Klasik script, yalnız window.THREE.
 *
 *   const Y = FLASH_MINI.yardim;
 *   const h = Y.havuz();                         // ülke/oyun başına malzeme+geometri havuzu; h.dispose() hepsini bırakır
 *   const m = Y.model();                         // çok renkli parçaları TEK çizim çağrısında birleştirir (vertexColors)
 *   m.ekle(h.geo('kure', () => new THREE.SphereGeometry(1, 20, 14)), 0xff8844, [x,y,z], [rx,ry,rz], [sx,sy,sz]);
 *   const mesh = m.mesh(h.malzeme('boya'));      // MeshStandardMaterial({vertexColors}) — havuzdan, paylaşılan
 *   const p = Y.parcacik(kok, { sayi: 120 });    // tek InstancedMesh: p.patla(v3, {renkler, adet, hiz, yukari, omur, boy}); p.guncelle(dt)
 *   Y.ease.gerYay(t), Y.ease.cik(t), Y.ease.zipla(t); Y.yay(a, b, yukseklik, t, out) (atış eğrisi)
 */
(function () {
  'use strict';
  var T = window.THREE;
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var ease = {
    cik: function (t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); },
    gir: function (t) { t = clamp01(t); return t * t * t; },
    yumusak: function (t) { t = clamp01(t); return t * t * (3 - 2 * t); },
    gerYay: function (t) { t = clamp01(t); var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    zipla: function (t) { t = clamp01(t); return Math.sin(t * Math.PI); },
    yaylan: function (t) { t = clamp01(t); return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
  };

  // Malzeme/geometri havuzu: aynı türden malzeme tek kez derlenir; dispose yalnız havuzun kendi nesnelerini bırakır.
  function havuz() {
    var mats = new Map(), geos = new Map(), texs = [];
    return {
      malzeme: function (tur, ayar) {
        var key = tur + (ayar ? JSON.stringify(ayar) : '');
        if (mats.has(key)) return mats.get(key);
        var m, a = ayar || {};
        if (tur === 'boya') m = new T.MeshStandardMaterial({ vertexColors: true, roughness: a.puruz != null ? a.puruz : 0.62, metalness: a.metal || 0 });
        else if (tur === 'parlak') m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.05 });
        else if (tur === 'isik') m = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
        else if (tur === 'saydam') m = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: a.opak != null ? a.opak : 0.5, depthWrite: false, side: T.DoubleSide });
        else if (tur === 'su') m = window.FLASH_GRAFIK && window.FLASH_GRAFIK.su ? window.FLASH_GRAFIK.su({ renk: a.renk, sig: a.sigOran, kenar: a.kenar, kopuk: a.kopuk }) : suMalzemesi(a);
        else m = new T.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.6 }, a));
        mats.set(key, m); return m;
      },
      geo: function (ad, yap) { if (!geos.has(ad)) geos.set(ad, yap()); return geos.get(ad); },
      doku: function (t) { texs.push(t); return t; },
      dispose: function () { mats.forEach(function (m) { m.dispose(); }); geos.forEach(function (g) { g.dispose(); }); texs.forEach(function (t) { t.dispose(); }); mats.clear(); geos.clear(); texs.length = 0; }
    };
  }

  // Basit, ucuz, dünya koordinatlı dalgalı su (GRAFIK ortak su malzemesi verene dek). uZaman: paylaşılan saat.
  var suSaati = { value: 0 };
  function suMalzemesi(a) {
    var m = new T.MeshStandardMaterial({ color: a.renk || 0x4fb3c8, roughness: 0.18, metalness: 0.05, transparent: !!a.saydam, opacity: a.saydam ? 0.88 : 1 });
    var sig = new T.Color(a.sig || 0xbff0ec);
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uSuZaman = suSaati; sh.uniforms.uSig = { value: sig };
      sh.vertexShader = 'varying vec3 vSuDunya;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSuDunya=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = 'uniform float uSuZaman;uniform vec3 uSig;varying vec3 vSuDunya;\n' + sh.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\nvec2 sp=vSuDunya.xz;float w=sin(sp.x*.9+uSuZaman*1.3)*sin(sp.y*.7-uSuZaman*1.1)+.5*sin((sp.x+sp.y)*2.1+uSuZaman*2.0);' +
        'float kpk=smoothstep(.95,1.35,w);diffuseColor.rgb=mix(diffuseColor.rgb,uSig,.18+.18*w*.5)+kpk*.22;');
    };
    m.customProgramCacheKey = function () { return 'mini-su'; };
    return m;
  }

  // Çok renkli parçaları tek BufferGeometry'de birleştir (renk = vertex color). Dizinli/dizinsiz geometrileri kabul eder.
  var _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3(), _n = new T.Matrix3(), _c = new T.Color();
  function model() {
    var parcalar = [];
    function ekle(geo, renk, p, r, s) {
      _p.set(p ? p[0] : 0, p ? p[1] : 0, p ? p[2] : 0);
      _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e);
      if (typeof s === 'number') _s.set(s, s, s); else _s.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1);
      parcalar.push({ geo: geo, renk: renk, matris: new T.Matrix4().compose(_p, _q, _s) });
      return api;
    }
    function ekleMatris(geo, renk, matris) { parcalar.push({ geo: geo, renk: renk, matris: matris.clone() }); return api; }
    function geometri() {
      var top = 0, topI = 0;
      parcalar.forEach(function (k) { top += k.geo.attributes.position.count; topI += k.geo.index ? k.geo.index.count : k.geo.attributes.position.count; });
      var pos = new Float32Array(top * 3), nor = new Float32Array(top * 3), col = new Float32Array(top * 3), uv = new Float32Array(top * 2);
      var idx = top > 65535 ? new Uint32Array(topI) : new Uint16Array(topI), v = 0, ii = 0, tmp = new T.Vector3();
      parcalar.forEach(function (k) {
        var g = k.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color, base = v;
        _n.getNormalMatrix(k.matris);
        if (typeof k.renk !== 'function') _c.set(k.renk);
        for (var i = 0; i < P.count; i++, v++) {
          tmp.fromBufferAttribute(P, i).applyMatrix4(k.matris); pos[v * 3] = tmp.x; pos[v * 3 + 1] = tmp.y; pos[v * 3 + 2] = tmp.z;
          if (typeof k.renk === 'function') k.renk(_c, tmp, i);
          else if (C) { _c.set(k.renk); _c.r *= C.getX(i); _c.g *= C.getY(i); _c.b *= C.getZ(i); }
          col[v * 3] = _c.r; col[v * 3 + 1] = _c.g; col[v * 3 + 2] = _c.b;
          if (N) { tmp.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); nor[v * 3] = tmp.x; nor[v * 3 + 1] = tmp.y; nor[v * 3 + 2] = tmp.z; }
          if (U) { uv[v * 2] = U.getX(i); uv[v * 2 + 1] = U.getY(i); }
          if (C && typeof k.renk !== 'function') _c.set(k.renk);
        }
        // Aynalı ölçek (negatif determinant) üçgen yönünü çevirir.
        var ters = k.matris.determinant() < 0;
        if (g.index) for (var j = 0; j < g.index.count; j += 3) { var a = g.index.getX(j), b = g.index.getX(j + 1), c = g.index.getX(j + 2); idx[ii++] = base + a; idx[ii++] = base + (ters ? c : b); idx[ii++] = base + (ters ? b : c); }
        else for (var j2 = 0; j2 < P.count; j2 += 3) { idx[ii++] = base + j2; idx[ii++] = base + j2 + (ters ? 2 : 1); idx[ii++] = base + j2 + (ters ? 1 : 2); }
      });
      var out = new T.BufferGeometry();
      out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3));
      out.setAttribute('color', new T.BufferAttribute(col, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
      out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere(); out.computeBoundingBox();
      return out;
    }
    function mesh(malzeme, golge) {
      var me = new T.Mesh(geometri(), malzeme);
      me.castShadow = golge !== false; me.receiveShadow = true; me.userData.sahipGeo = true;
      return me;
    }
    var api = { ekle: ekle, ekleMatris: ekleMatris, geometri: geometri, mesh: mesh, get adet() { return parcalar.length; } };
    return api;
  }

  // Tek InstancedMesh'li parçacık patlaması (konfeti, su damlası, yıldız). Her karede nesne yaratmaz.
  function parcacik(kok, ayar) {
    ayar = ayar || {};
    var N = ayar.sayi || 96, geo = ayar.geo || new T.IcosahedronGeometry(0.12, 0), kendiGeo = !ayar.geo;
    var mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, emissive: 0x222222 });
    var im = new T.InstancedMesh(geo, mat, N); im.frustumCulled = false; im.count = 0; im.castShadow = false;
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    var cols = new Float32Array(N * 3); im.instanceColor = new T.InstancedBufferAttribute(cols, 3);
    var P = []; for (var i = 0; i < N; i++) P.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, omur: 0, boy: 1, don: 0, yer: 0 });
    var yazi = 0, aktif = 0, m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color();
    kok.add(im);
    function patla(konum, o) {
      o = o || {}; var adet = o.adet || 18, renkler = o.renkler || [0xff6b81, 0xffd35a, 0x6ccff6, 0x8be08b, 0xc39bff];
      for (var k = 0; k < adet; k++) {
        var a = P[yazi]; yazi = (yazi + 1) % N;
        var aci = Math.random() * Math.PI * 2, h = (o.hiz || 4) * (0.5 + Math.random() * 0.7);
        a.x = konum.x; a.y = konum.y; a.z = konum.z;
        a.vx = Math.cos(aci) * h * (o.yayil != null ? o.yayil : 1); a.vz = Math.sin(aci) * h * (o.yayil != null ? o.yayil : 1);
        a.vy = (o.yukari != null ? o.yukari : 5) * (0.6 + Math.random() * 0.6);
        a.t = 0; a.omur = (o.omur || 1.2) * (0.7 + Math.random() * 0.6); a.boy = (o.boy || 1) * (0.6 + Math.random() * 0.8);
        a.don = (Math.random() - 0.5) * 12; a.yer = o.yercekimi != null ? o.yercekimi : 9;
        c.set(renkler[k % renkler.length]); a.r = c.r; a.g = c.g; a.b = c.b;
      }
    }
    function guncelle(dt) {
      var n = 0;
      for (var i = 0; i < N; i++) {
        var a = P[i]; if (a.t >= a.omur) continue;
        a.t += dt; if (a.t >= a.omur) continue;
        a.vy -= a.yer * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
        var sol = 1 - Math.pow(a.t / a.omur, 3), b = a.boy * sol;
        e.set(a.t * a.don, a.t * a.don * 0.7, 0); q.setFromEuler(e); p.set(a.x, a.y, a.z); s.set(b, b, b);
        m.compose(p, q, s); im.setMatrixAt(n, m); cols[n * 3] = a.r; cols[n * 3 + 1] = a.g; cols[n * 3 + 2] = a.b; n++;
      }
      im.count = n; aktif = n;
      if (n) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
    }
    return { mesh: im, patla: patla, guncelle: guncelle, get aktif() { return aktif; },
      dispose: function () { im.removeFromParent(); im.dispose(); mat.dispose(); if (kendiGeo) geo.dispose(); } };
  }

  // a'dan b'ye yükseklik h olan parabol üzerindeki nokta (t 0..1).
  function yay(a, b, h, t, out) {
    out = out || new T.Vector3();
    out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * h, a.z + (b.z - a.z) * t);
    return out;
  }

  // Basit kanvas dokusu (yazısız desen/çizim). ciz(g, w, h). Havuz verilirse onunla dispose edilir.
  function kanvasDoku(w, h, ciz, h2) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; ciz(cv.getContext('2d'), w, h);
    var t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    if (h2) h2.doku(t);
    return t;
  }

  // Sık kullanılan sevimli şekiller.
  var sekil = {
    // Yuvarlatılmış kutu (köşe yarıçapı r, s parça).
    yuvarlakKutu: function (w, h, d, r, s) {
      var g = new T.BoxGeometry(w, h, d, s || 4, s || 4, s || 4), P = g.attributes.position, v = new T.Vector3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
      for (var i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        var cx = Math.max(-hw, Math.min(hw, v.x)), cy = Math.max(-hh, Math.min(hh, v.y)), cz = Math.max(-hd, Math.min(hd, v.z));
        var dx = v.x - cx, dy = v.y - cy, dz = v.z - cz, l = Math.hypot(dx, dy, dz) || 1;
        P.setXYZ(i, cx + dx / l * r, cy + dy / l * r, cz + dz / l * r);
      }
      g.computeVertexNormals(); return g;
    },
    // Profil döndürme: [[r, y], ...] alttan üste.
    torna: function (profil, seg) { return new T.LatheGeometry(profil.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 24); }
  };

  window.FLASH_MINI = Object.freeze({
    yardim: Object.freeze({ ease: ease, havuz: havuz, model: model, parcacik: parcacik, yay: yay, kanvasDoku: kanvasDoku, sekil: sekil, suSaati: suSaati, clamp01: clamp01 })
  });
}());
