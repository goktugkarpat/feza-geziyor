/* Yerel Türkçe kayıtlar ve özgün müzik. file:// destekli; tarayıcı seslendirmesi yok. */
(function () {
  'use strict';
  var silent = new URLSearchParams(window.location.search).has('sessiz');
  var enabled = !silent;
  var musicEnabled = !silent;
  var ready = false;
  var musicReady = false;
  var player = null;
  var music = null;
  var musicContext = null;
  var musicGain = null;
  var musicLevel = 0;
  var musicFade = null;
  var playing = '';
  var queue = [];
  var requestId = 0;
  var musicRequestId = 0;
  var musicPending = false;
  var narratorUnlocked = false;
  var unlocking = false;
  var fadeTimer = null;
  var musicTarget = 0;
  var voiceVolume = 0.9;
  var musicVolume = 0.52;
  var duckVolume = 0.15;
  var doc = typeof document === 'undefined' ? null : document;
  var hidden = !!(doc && doc.hidden);
  // İlk dokunuşta anlatıcıyı da açan 20 ms sessizlik; gerçek cümle hemen gelebilir.
  var unlockSound = 'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  var countryPlaces = {
    tr: ['galata', 'bosphorus', 'cappadocia'], us: ['liberty', 'brooklyn', 'centralpark'],
    ca: ['niagara', 'cntower', 'hockey'], be: ['atomium', 'grandplace', 'waffle'],
    fr: ['eiffel', 'louvre', 'seine'], ru: ['basils', 'kremlin', 'redsquare'],
    jp: ['fuji', 'torii', 'sakura'], cn: ['greatwall', 'heaven', 'bamboo'],
    eg: ['pyramids', 'sphinx', 'nile'], br: ['christ', 'sugarloaf', 'copacabana']
  };
  var keys = ['intro', 'found', 'travel', 'travel-space', 'travel-land', 'travel-water', 'travel-arrive', 'help-start', 'help-map', 'help-tour', 'help-speed',
    'help-passport', 'help-photo', 'help-route', 'country-tap', 'portal', 'portal-travel', 'challenge-start', 'challenge-found', 'challenge-done',
    'activity-flowers', 'activity-wind', 'activity-splash', 'activity-balloons', 'activity-ball',
    'activity-butterflies', 'activity-rings', 'activity-done-1', 'activity-done-2', 'activity-done-3'];
  Object.keys(countryPlaces).forEach(function (id) {
    keys.push(id, 'choose-' + id);
    countryPlaces[id].forEach(function (place) { keys.push('place-' + id + '-' + place); });
  });

  function has(key) { return keys.indexOf(key) >= 0; }
  function clearPending() { queue.length = 0; }

  function readMusicVolume() {
    if (!musicGain) return music ? music.volume : 0;
    if (!musicFade) return musicLevel;
    var t = Math.min(1, (Date.now() - musicFade.at) / musicFade.duration);
    if (t === 1) return musicFade.target;
    return musicFade.start + (musicFade.target - musicFade.start) * t;
  }

  function cancelFade() {
    musicLevel = readMusicVolume();
    musicFade = null;
    if (fadeTimer !== null && typeof clearTimeout === 'function') clearTimeout(fadeTimer);
    fadeTimer = null;
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(musicContext.currentTime);
      musicGain.gain.setValueAtTime(musicLevel, musicContext.currentTime);
    }
  }

  function fadeMusic(target, duration) {
    musicTarget = target;
    cancelFade();
    if (!music || hidden || !musicEnabled) return;
    var start = readMusicVolume();
    if (musicGain) {
      // iPad'de HTMLAudio.volume değişmez; GainNode bütün cihazlarda yumuşak kısar.
      if (!duration) { musicGain.gain.setValueAtTime(target, musicContext.currentTime); musicLevel = target; return; }
      musicFade = {start: start, target: target, duration: duration, at: Date.now()};
      musicGain.gain.setValueAtTime(start, musicContext.currentTime);
      musicGain.gain.linearRampToValueAtTime(target, musicContext.currentTime + duration / 1000);
      return;
    }
    if (!duration || typeof setTimeout !== 'function') { music.volume = target; return; }
    var at = Date.now();
    function step() {
      fadeTimer = null;
      if (!music || hidden || !musicEnabled) return;
      var t = Math.min(1, (Date.now() - at) / duration);
      var eased = t * t * (3 - 2 * t);
      music.volume = Math.max(0, Math.min(1, start + (target - start) * eased));
      if (t < 1) fadeTimer = setTimeout(step, 25);
    }
    step();
  }

  function balanceMusic() { fadeMusic(playing && enabled ? duckVolume : musicVolume, playing ? 180 : 650); }

  function suspendMusicContext() {
    if (!musicContext || !musicContext.suspend) return;
    try {
      var result = musicContext.suspend();
      if (result && result.catch) result.catch(function () {});
    } catch (_) { /* Eski tarayıcılarda HTMLAudio durdurma yine çalışır. */ }
  }

  function resumeMusicContext() {
    if (!musicContext || musicContext.state === 'running') return;
    try {
      var result = musicContext.resume();
      if (result && result.then) result.then(function () {
        if (!musicEnabled || hidden) suspendMusicContext();
      }, function () { /* Bir sonraki kullanıcı dokunuşunda yeniden denenir. */ });
    } catch (_) { /* Bir sonraki kullanıcı dokunuşunda yeniden denenir. */ }
  }

  function pauseMusic() {
    musicRequestId++;
    musicPending = false;
    cancelFade();
    if (music) music.pause();
    suspendMusicContext();
  }

  function playMusic() {
    if (silent || !musicEnabled || hidden || !musicReady || !music) return;
    resumeMusicContext();
    if (!music.paused || musicPending) { balanceMusic(); return; }
    var id = ++musicRequestId;
    musicPending = true;
    var result;
    try { result = music.play(); }
    catch (_) { musicPending = false; return; }
    balanceMusic();
    if (result && result.then) result.then(function () {
      if (id !== musicRequestId) return;
      musicPending = false;
      if (!musicEnabled || hidden) music.pause();
    }, function () {
      if (id !== musicRequestId) return;
      musicPending = false;
      cancelFade();
    });
    else musicPending = false;
  }

  function ensureMusic() {
    if (musicReady || silent || !musicEnabled) return;
    music = new Audio();
    music.preload = 'auto';
    music.loop = true;
    music.volume = 0;
    music.src = 'assets/music/world-adventure.mp3';
    music.addEventListener('error', pauseMusic);
    var Context = window.AudioContext || window.webkitAudioContext;
    var protocol = window.location.protocol;
    // file:// CORS kısıtına takılmamak için dosyaya çift tıklamada doğal oynatıcı kalır.
    if (Context && (protocol === 'https:' || protocol === 'http:')) {
      var context = null;
      try {
        context = new Context();
        var gain = context.createGain();
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.connect(context.destination);
        var source = context.createMediaElementSource(music);
        source.connect(gain);
        musicContext = context;
        musicGain = gain;
        music.volume = 1;
      } catch (_) {
        if (context && context.close) {
          var closing = context.close();
          if (closing && closing.catch) closing.catch(function () {});
        }
      }
    }
    musicReady = true;
  }

  function ensureNarrator() {
    if (ready || silent || !enabled) return;
    player = new Audio();
    player.preload = 'none';
    player.volume = voiceVolume;
    player.addEventListener('ended', finish);
    player.addEventListener('error', finish);
    ready = true;
  }

  function unlockNarrator() {
    if (!enabled || hidden || !player || playing || narratorUnlocked || unlocking) return;
    var id = ++requestId;
    unlocking = true;
    // Örnekler sıfırdır; muted yerine gerçek kullanıcı dokunuşuyla kilidi açar.
    player.muted = false;
    player.src = unlockSound;
    var result;
    try { result = player.play(); }
    catch (_) { unlocking = false; player.muted = false; return; }
    function done(ok) {
      if (id !== requestId || playing) return;
      narratorUnlocked = ok;
      unlocking = false;
      player.pause();
      player.muted = false;
      player.volume = voiceVolume;
    }
    if (result && result.then) result.then(function () { done(true); }, function () { done(false); });
    else done(true);
  }

  function next() {
    if (!enabled || hidden || !ready || !player || playing || !queue.length) return;
    playing = queue.shift();
    unlocking = false;
    var id = ++requestId;
    player.muted = false;
    player.volume = voiceVolume;
    player.src = 'assets/voice/' + playing + '.mp3';
    balanceMusic();
    var result;
    try { result = player.play(); }
    catch (_) { result = Promise.reject(new Error('Ses henüz açılamadı')); }
    if (result && result.then) result.then(function () {
      if (id === requestId) narratorUnlocked = true;
    }, function () {
      if (id !== requestId) return;
      playing = '';
      queue.length = 0;
      balanceMusic();
    });
  }

  function finish() {
    if (unlocking) { unlocking = false; player.muted = false; return; }
    requestId++;
    playing = '';
    next();
    balanceMusic();
  }

  function resumeNarrator() {
    if (!enabled || hidden || !player || !playing || !player.paused) return;
    var id = ++requestId;
    var result;
    try { result = player.play(); } catch (_) { return; }
    if (result && result.then) result.then(function () {
      if (id === requestId) narratorUnlocked = true;
    }, function () { /* Yeni dokunuşta aynı cümleyi yeniden sürdürmeyi dene. */ });
  }

  function init() {
    if (silent || hidden || (!enabled && !musicEnabled)) return false;
    // Dokunuş sırasında iki ayrı ses öğesi açılır; ayar yüklemek ses oluşturmaz.
    if (enabled) {
      ensureNarrator();
      if (playing) resumeNarrator();
      else { next(); if (!playing) unlockNarrator(); }
    }
    if (musicEnabled) { ensureMusic(); playMusic(); }
    return ready || musicReady;
  }

  function stop() {
    requestId++;
    queue.length = 0;
    playing = '';
    unlocking = false;
    if (player) {
      player.pause();
      player.removeAttribute('src');
      player.load();
    }
    balanceMusic();
  }

  function setMusicEnabled(value) {
    musicEnabled = !silent && !!value;
    if (!musicEnabled) pauseMusic();
    else if (musicReady) playMusic();
    return musicEnabled;
  }

  if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', function () {
    hidden = !!doc.hidden;
    if (hidden) {
      if (player) {
        // pause() bekleyen play() Promise'ini AbortError ile iptal eder.
        // Bu eski sonuç başladı/yüklenmekte olan cümleyi ve kuyruğunu silemesin.
        requestId++;
        unlocking = false;
        player.pause();
      }
      pauseMusic();
    } else {
      if (enabled) { if (playing) resumeNarrator(); else next(); }
      if (musicEnabled) playMusic();
    }
  });

  window.FLASH_AUDIO = Object.freeze({
    init: init,
    setEnabled: function (value) {
      enabled = !silent && !!value;
      if (!enabled) stop();
      return enabled;
    },
    isEnabled: function () { return enabled; },
    setMusicEnabled: setMusicEnabled,
    toggleMusic: function () { return setMusicEnabled(!musicEnabled); },
    isMusicEnabled: function () { return musicEnabled; },
    play: function (key, options) {
      if (!enabled || !has(key)) return false;
      // Menü/ülke değişirken eski bekleyen yönlendirmeler temizlenebilir.
      // Başlamış cümle yine sonuna kadar çalar.
      if (options && options.replacePending) clearPending();
      if (key === playing || queue.indexOf(key) >= 0) return false;
      // Koşarken çok sayıda keşif yapıldığında eski anonslar birikmesin.
      if (queue.length >= 3) queue.shift();
      queue.push(key);
      next();
      return true;
    },
    clearPending: clearPending,
    has: has,
    getStatus: function () {
      return {playing: playing, queued: queue.slice(), enabled: enabled, ready: ready,
        musicEnabled: musicEnabled, musicReady: musicReady,
        musicPlaying: !!(music && musicEnabled && !music.paused && !hidden && (!musicContext || musicContext.state === 'running')),
        musicVolume: readMusicVolume(), musicTarget: musicTarget,
        musicGainReady: !!musicGain, hidden: hidden};
    },
    stop: stop,
    silent: silent
  });
})();
