/* Flaş Feza'nın çevrimdışı kopyası. Diğer oyunların önbelleklerine dokunmaz. */
'use strict';
const PREFIX = 'flash-feza-geziyor-';
const CACHE = PREFIX + 'v3-b20f1e0d4b97';
const CORE = [
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vendor/three.js',
  'src/activities.js',
  'src/activity-routes.js',
  'src/app.js',
  'src/audio.js',
  'src/bootstrap.js',
  'src/core.js',
  'src/countries.js',
  'src/geography.js',
  'src/globe.js',
  'src/hero.js',
  'src/pictograms.js',
  'src/places.js',
  'src/playflow.css',
  'src/portal.js',
  'src/shuttle.js',
  'src/space.js',
  'src/surfaces.js',
  'src/travel.js',
  'src/ui.css',
  'src/weather.js',
  'assets/voice/activity-ball.mp3',
  'assets/voice/activity-balloons.mp3',
  'assets/voice/activity-butterflies.mp3',
  'assets/voice/activity-done-1.mp3',
  'assets/voice/activity-done-2.mp3',
  'assets/voice/activity-done-3.mp3',
  'assets/voice/activity-flowers.mp3',
  'assets/voice/activity-rings.mp3',
  'assets/voice/activity-splash.mp3',
  'assets/voice/activity-wind.mp3',
  'assets/voice/be.mp3',
  'assets/voice/br.mp3',
  'assets/voice/ca.mp3',
  'assets/voice/challenge-done.mp3',
  'assets/voice/challenge-found.mp3',
  'assets/voice/challenge-start.mp3',
  'assets/voice/choose-be.mp3',
  'assets/voice/choose-br.mp3',
  'assets/voice/choose-ca.mp3',
  'assets/voice/choose-cn.mp3',
  'assets/voice/choose-eg.mp3',
  'assets/voice/choose-fr.mp3',
  'assets/voice/choose-jp.mp3',
  'assets/voice/choose-ru.mp3',
  'assets/voice/choose-tr.mp3',
  'assets/voice/choose-us.mp3',
  'assets/voice/cn.mp3',
  'assets/voice/country-tap.mp3',
  'assets/voice/eg.mp3',
  'assets/voice/found.mp3',
  'assets/voice/fr.mp3',
  'assets/voice/help-map.mp3',
  'assets/voice/help-passport.mp3',
  'assets/voice/help-photo.mp3',
  'assets/voice/help-route.mp3',
  'assets/voice/help-speed.mp3',
  'assets/voice/help-start.mp3',
  'assets/voice/help-tour.mp3',
  'assets/voice/intro.mp3',
  'assets/voice/jp.mp3',
  'assets/voice/lines.json',
  'assets/voice/place-be-atomium.mp3',
  'assets/voice/place-be-grandplace.mp3',
  'assets/voice/place-be-waffle.mp3',
  'assets/voice/place-br-christ.mp3',
  'assets/voice/place-br-copacabana.mp3',
  'assets/voice/place-br-sugarloaf.mp3',
  'assets/voice/place-ca-cntower.mp3',
  'assets/voice/place-ca-hockey.mp3',
  'assets/voice/place-ca-niagara.mp3',
  'assets/voice/place-cn-bamboo.mp3',
  'assets/voice/place-cn-greatwall.mp3',
  'assets/voice/place-cn-heaven.mp3',
  'assets/voice/place-eg-nile.mp3',
  'assets/voice/place-eg-pyramids.mp3',
  'assets/voice/place-eg-sphinx.mp3',
  'assets/voice/place-fr-eiffel.mp3',
  'assets/voice/place-fr-louvre.mp3',
  'assets/voice/place-fr-seine.mp3',
  'assets/voice/place-jp-fuji.mp3',
  'assets/voice/place-jp-sakura.mp3',
  'assets/voice/place-jp-torii.mp3',
  'assets/voice/place-ru-basils.mp3',
  'assets/voice/place-ru-kremlin.mp3',
  'assets/voice/place-ru-redsquare.mp3',
  'assets/voice/place-tr-bosphorus.mp3',
  'assets/voice/place-tr-cappadocia.mp3',
  'assets/voice/place-tr-galata.mp3',
  'assets/voice/place-us-brooklyn.mp3',
  'assets/voice/place-us-centralpark.mp3',
  'assets/voice/place-us-liberty.mp3',
  'assets/voice/portal-travel.mp3',
  'assets/voice/portal.mp3',
  'assets/voice/ru.mp3',
  'assets/voice/tr.mp3',
  'assets/voice/travel-arrive.mp3',
  'assets/voice/travel-land.mp3',
  'assets/voice/travel-space.mp3',
  'assets/voice/travel-water.mp3',
  'assets/voice/travel.mp3',
  'assets/voice/us.mp3',
  'assets/ui/country-be.png',
  'assets/ui/country-br.png',
  'assets/ui/country-ca.png',
  'assets/ui/country-cn.png',
  'assets/ui/country-eg.png',
  'assets/ui/country-fr.png',
  'assets/ui/country-jp.png',
  'assets/ui/country-ru.png',
  'assets/ui/country-tr.png',
  'assets/ui/country-us.png',
  'assets/ui/place-be-atomium.png',
  'assets/ui/place-be-grandplace.png',
  'assets/ui/place-be-waffle.png',
  'assets/ui/place-br-christ.png',
  'assets/ui/place-br-copacabana.png',
  'assets/ui/place-br-sugarloaf.png',
  'assets/ui/place-ca-cntower.png',
  'assets/ui/place-ca-hockey.png',
  'assets/ui/place-ca-niagara.png',
  'assets/ui/place-cn-bamboo.png',
  'assets/ui/place-cn-greatwall.png',
  'assets/ui/place-cn-heaven.png',
  'assets/ui/place-eg-nile.png',
  'assets/ui/place-eg-pyramids.png',
  'assets/ui/place-eg-sphinx.png',
  'assets/ui/place-fr-eiffel.png',
  'assets/ui/place-fr-louvre.png',
  'assets/ui/place-fr-seine.png',
  'assets/ui/place-jp-fuji.png',
  'assets/ui/place-jp-sakura.png',
  'assets/ui/place-jp-torii.png',
  'assets/ui/place-ru-basils.png',
  'assets/ui/place-ru-kremlin.png',
  'assets/ui/place-ru-redsquare.png',
  'assets/ui/place-tr-bosphorus.png',
  'assets/ui/place-tr-cappadocia.png',
  'assets/ui/place-tr-galata.png',
  'assets/ui/place-us-brooklyn.png',
  'assets/ui/place-us-centralpark.png',
  'assets/ui/place-us-liberty.png',
  'assets/music/world-adventure.json',
  'assets/music/world-adventure.mp3'
];
const INDEX = new URL('index.html', self.registration.scope).href;
const ROOT = new URL(self.registration.scope).pathname;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE.map(path => new Request(new URL(path, self.registration.scope), {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function audioRange(response, header) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return response;
  const bytes = await response.arrayBuffer();
  let start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
  let end = match[1] && match[2] ? Number(match[2]) : bytes.byteLength - 1;
  end = Math.min(end, bytes.byteLength - 1);
  if (start > end || start >= bytes.byteLength) {
    return new Response(null, {status: 416, headers: {'Content-Range': 'bytes */' + bytes.byteLength}});
  }
  return new Response(bytes.slice(start, end + 1), {status: 206, headers: {
    'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
    'Content-Range': 'bytes ' + start + '-' + end + '/' + bytes.byteLength,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'
  }});
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return;
  const index = url.pathname === ROOT || url.pathname === new URL(INDEX).pathname;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (index) {
      // Ana sayfa: güncel sürüm için önce ağ, bağlantı yoksa hazır kopya.
      try {
        const response = await fetch(request, {cache: 'no-cache'});
        if (response.ok) {
          try { await cache.put(INDEX, response.clone()); } catch (error) { /* Ağdan gelen oyun yine açılır. */ }
          return response;
        }
        const saved = await cache.match(INDEX);
        return saved || response;
      } catch (error) {
        const saved = await cache.match(INDEX);
        if (saved) return saved;
        throw error;
      }
    }
    // Modeller, yerel çizim motoru, simgeler ve sesler: önce önbellek.
    const saved = await cache.match(request, {ignoreSearch: true});
    if (saved) return request.headers.has('Range') ? audioRange(saved, request.headers.get('Range')) : saved;
    const response = await fetch(request);
    if (response.ok && response.status !== 206) {
      try { await cache.put(request, response.clone()); } catch (error) { /* Kayıt yapılamasa da dosyayı döndür. */ }
    }
    return response;
  })());
});
