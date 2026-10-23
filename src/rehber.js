/* Rehber davranış motoru — window.FLASH_REHBER. Sözleşme: TASARIM.md §4.3.
 * Modeli (ülke kaydındaki rehber.yap(kit)) dünyada yürütür, çevirir ve durum.mod seçer. Hangi hedefe gidileceğine
 * src/tur.js karar verir; bu dosya yalnız hareket + geçici hareketleri (selam/dans/sevin/konuş) bilir. */
(function () {
  'use strict';
  var T = window.THREE;
  function create(def, ctx) {
    var model = def.yap(window.FLASH_REHBER_KIT);
    var root = new T.Group(); root.name = 'rehber-' + (def.ad || ''); root.add(model.root);
    ctx.kok.add(root);
    var durum = { mod: 'bekle', hiz: 0, bak: null }, bakNokta = new T.Vector3(), bakVar = false;
    var yol = [], varinca = null, hizHedef = 0, hiz = 0, yon = Math.PI, gecici = null, geciciSon = 0, zaman = 0, binili = false, temel = 'bekle';
    var tmp = new T.Vector3();
    function isinla(x, z, y) { root.position.set(x, 0, z); if (y != null) yon = y; root.rotation.y = yon; yol = []; hiz = 0; }
    function git(x, z, ayar) {
      ayar = ayar || {};
      var p = ctx.yolBul ? ctx.yolBul(root.position, { x: x, z: z }, ayar.yaricap || 0.8) : null;
      yol = p && p.length ? p.slice() : [{ x: x, z: z }];
      hizHedef = ayar.hiz || 7; varinca = ayar.varinca || null;
    }
    function dur() { yol = []; varinca = null; }
    function oyna(mod, sn) { gecici = mod; geciciSon = zaman + (sn || 1.6); }
    function bak(v) { if (v) { bakNokta.copy(v); bakVar = true; } else bakVar = false; }
    function bin(parent, yerel, y) { binili = true; dur(); parent.add(root); root.position.copy(yerel); root.rotation.set(0, y || 0, 0); hiz = 0; }
    function inis(x, z, y) { binili = false; ctx.kok.add(root); isinla(x, z, y); }
    function guncelle(dt, time) {
      zaman += dt;
      if (gecici && zaman >= geciciSon) gecici = null;
      var hareket = false;
      if (!binili && yol.length) {
        var n = yol[0], dx = n.x - root.position.x, dz = n.z - root.position.z, d = Math.hypot(dx, dz);
        if (d < 0.4) { yol.shift(); if (!yol.length) { var f = varinca; varinca = null; if (f) f(); } }
        else {
          hiz += (hizHedef - hiz) * (1 - Math.exp(-dt * 5));
          var adim = Math.min(d, hiz * dt);
          root.position.x += dx / d * adim; root.position.z += dz / d * adim;
          var hedefYon = Math.atan2(dx, dz), fark = Math.atan2(Math.sin(hedefYon - yon), Math.cos(hedefYon - yon));
          yon += fark * (1 - Math.exp(-dt * 10)); hareket = true;
        }
      }
      if (!hareket) {
        hiz *= Math.exp(-dt * 8);
        // Dururken bakılan noktaya gövdeyle de yavaşça dön (baş dönüşünü model yapar).
        if (bakVar && !binili) {
          var hy = Math.atan2(bakNokta.x - root.position.x, bakNokta.z - root.position.z), fk = Math.atan2(Math.sin(hy - yon), Math.cos(hy - yon));
          if (Math.abs(fk) > 0.5) yon += fk * (1 - Math.exp(-dt * 3));
        }
      }
      if (!binili) root.rotation.y = yon;
      durum.hiz = hareket ? hiz : 0;
      durum.mod = binili ? 'otur' : hareket ? (hiz > 4.5 ? 'kos' : 'yuru') : (gecici || temel);
      if (binili && (gecici === 'selam' || gecici === 'konus')) durum.mod = gecici; // oturur hâlde el sallar/konuşur
      durum.bak = bakVar ? bakNokta : null;
      model.guncelle(dt, time, durum);
    }
    return {
      model: model, root: root, def: def,
      get konum() { return root.position; }, get yon() { return yon; }, get yuruyor() { return yol.length > 0; },
      get binili() { return binili; }, get mod() { return durum.mod; },
      set temel(m) { temel = m; }, get temel() { return temel; },
      isinla: isinla, git: git, dur: dur, oyna: oyna, bak: bak, bin: bin, in: inis, guncelle: guncelle,
      dispose: function () { root.removeFromParent(); model.dispose(); }
    };
  }
  window.FLASH_REHBER = Object.freeze({ create: create });
}());
