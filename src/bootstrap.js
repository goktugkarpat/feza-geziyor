/* Önce kayıtlı oyun sürümünü yenile; eski dosyalar yeni menüyle karışmasın. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  var controlledAtStart = !!navigator.serviceWorker.controller;
  var reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    // İlk kurulum zaten güncel dosyaları kullanır; çocuğun ilk seçimini kesme.
    if (!controlledAtStart || reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (registration) {
    registration.update().catch(function () {});
  }).catch(function () {});
}());
