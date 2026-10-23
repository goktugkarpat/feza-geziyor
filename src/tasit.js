/* Taşıt motoru — window.FLASH_TASIT. Sözleşme: TASARIM.md §5.
 * Ülke kaydındaki taşıt tanımından (yap/yol/duraklar) çalışan bir taşıt üretir: durakta park eder, istenince
 * yolu Catmull-Rom eğrisiyle yumuşak hızlanıp yavaşlayarak izler. Yolcuları (Feza/Bilbo/rehber) src/tur.js bindirir. */
(function () {
  'use strict';
  var T = window.THREE;
  var _a = new T.Vector3(), _b = new T.Vector3();
  function create(def, ctx) {
    var arac = def.yap(ctx);
    var root = new T.Group(); root.name = 'tasit-' + def.id; root.add(arac.root); ctx.kok.add(root);
    var durak = 0, egri = null, sure = def.sure || 10, t = 0, yolda = false, bitince = null, hedef = 0, yon = 0, hiz = 0, sonP = new T.Vector3();
    var oturak = {};
    Object.keys(arac.oturak || {}).forEach(function (k) { var o = arac.oturak[k]; oturak[k] = new T.Vector3(o[0], o[1], o[2]); });
    function park(i) {
      var yolu = def.yol(i, 1 - i), p = yolu[0], q = yolu[1] || yolu[0];
      root.position.set(p[0], p[1], p[2]);
      // Durakta yolculuk yönüne bak; böylece biniş ve kalkış aynı yöne olur.
      yon = Math.atan2(q[0] - p[0], q[2] - p[2]); root.rotation.set(0, yon, 0); durak = i;
    }
    park(0);
    function baslat(hedefDurak, f) {
      hedef = hedefDurak; var noktalar = def.yol(durak, hedef).map(function (p) { return new T.Vector3(p[0], p[1], p[2]); });
      egri = new T.CatmullRomCurve3(noktalar, false, 'centripetal', 0.5); t = 0; yolda = true; bitince = f || null; sonP.copy(root.position);
    }
    // Yumuşak kalkış/varış: ilk ve son %15'te hız artar/azalır.
    function ilerleme(u) { var a = 0.15; if (u < a) return u * u / (2 * a * (1 - a)); if (u > 1 - a) { var v = 1 - u; return 1 - v * v / (2 * a * (1 - a)); } return (u - a / 2) / (1 - a); }
    function guncelle(dt, time) {
      if (yolda) {
        t = Math.min(1, t + dt / sure); var u = ilerleme(t);
        egri.getPointAt(u, _a); egri.getTangentAt(Math.min(0.999, Math.max(0.001, u)), _b);
        hiz = _a.distanceTo(sonP) / Math.max(dt, 1e-4); sonP.copy(_a);
        root.position.copy(_a);
        if (def.yonlu !== false) {
          var hedefYon = Math.atan2(_b.x, _b.z), fark = Math.atan2(Math.sin(hedefYon - yon), Math.cos(hedefYon - yon));
          yon += fark * (1 - Math.exp(-dt * 3)); root.rotation.y = yon;
        }
        if (t >= 1) { yolda = false; durak = hedef; hiz = 0; var f = bitince; bitince = null; if (f) f(); }
      }
      if (arac.guncelle) arac.guncelle(dt, time, { ilerleme: yolda ? ilerleme(t) : (durak ? 1 : 0), hareket: yolda, hiz: hiz, yolda: yolda });
    }
    function oturakDunya(ad, out) { root.updateMatrixWorld(true); return (out || new T.Vector3()).copy(oturak[ad] || oturak.feza || _a.set(0, 1, 0)).applyMatrix4(arac.root.matrixWorld); }
    return {
      def: def, root: root, arac: arac, oturak: oturak,
      get durak() { return durak; }, get yolda() { return yolda; }, get ilerleme() { return t; }, get yon() { return yon; },
      durakNokta: function (i) { var d = def.duraklar[i]; return { x: d.x, z: d.z, yon: d.yon || 0 }; },
      baslat: baslat, guncelle: guncelle, oturakDunya: oturakDunya, park: park,
      dispose: function () { root.removeFromParent(); if (arac.dispose) arac.dispose(); }
    };
  }
  window.FLASH_TASIT = Object.freeze({ create: create });
}());
