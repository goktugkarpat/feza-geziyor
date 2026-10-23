/* Ülke içerik kaydı (yeni "canlı dünya turu" sistemi). Sözleşme: TASARIM.md › "Ülke içerik kaydı".
 * Her ülke src/ulke/<id>.js (ve isterse src/ulke/<id>-rehber.js) içinde kendini kaydeder:
 *   FLASH_ULKE.kaydet('tr', { rehber:{...}, tasitlar:[...], oyunlar:{galata:{...}}, dekor(ctx){...}, sesler:{...} });
 * Aynı ülke birden çok kez kaydedilebilir; parçalar birleşir (rehber/dekor/sesler/oyunlar nesne olarak, tasitlar dizi olarak).
 * Kaydı olmayan ülke eski sistemle (FLASH_ACTIVITIES) oynanır. Klasik script; ES module yok. */
(function () {
  'use strict';
  var kayit = Object.create(null);
  function birlestir(eski, yeni) {
    var sonuc = eski || { id: yeni.id, tasitlar: [], oyunlar: {}, sesler: {}, yerler: {} };
    Object.keys(yeni).forEach(function (k) {
      var v = yeni[k];
      if (k === 'tasitlar') sonuc.tasitlar = sonuc.tasitlar.concat(v || []);
      else if (k === 'oyunlar' || k === 'sesler' || k === 'yerler') sonuc[k] = Object.assign({}, sonuc[k], v || {});
      else if (k === 'rehber' && sonuc.rehber) sonuc.rehber = Object.assign({}, sonuc.rehber, v);
      else sonuc[k] = v;
    });
    return sonuc;
  }
  window.FLASH_ULKE = Object.freeze({
    kaydet: function (id, parca) {
      if (!id || !parca) throw new Error('FLASH_ULKE.kaydet(id, parca) eksik');
      kayit[id] = birlestir(kayit[id], Object.assign({ id: id }, parca));
      return kayit[id];
    },
    al: function (id) { return kayit[id] || null; },
    // Yeni sistem ancak rehber + en az bir yer oyunu kayıtlıysa açılır; yoksa ülke eski oyunlarla oynanır.
    var: function (id) { var d = kayit[id]; return !!(d && d.rehber && d.rehber.yap && Object.keys(d.oyunlar).length); },
    liste: function () { return Object.keys(kayit); }
  });
}());
