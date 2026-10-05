(function () {
  'use strict';
  // Layered, purely diegetic delight for the run-by games: pooled particles, creature companions,
  // per-place prop themes, jump pads, sparkle gates, a finale and rare gentle surprises.
  // Nothing here adds buttons, timers or failure; everything is built once while the stage is created.
  var T = window.THREE;
  if (!T) return;
  var TAU = Math.PI * 2, PI = Math.PI;
  // do - re - mi - sol - la, the same five notes as assets/music/chime-1..5.wav
  var NOTE = [0xff6f8e, 0xffa94d, 0xffe14f, 0x62dc9a, 0x6fb4ff];
  var GOLD = 0xffd24a, WHITE = 0xffffff;

  // ---------- per-country flavour ----------
  var COUNTRY = {
    tr: { flag: [0xe30a17, 0xffffff, 0xffd24a], spark: 'petal', animal: { shape: 'ears', body: 0xe8a35c, belly: 0xfff0dc, accent: 0xc77d3a }, finale: null },
    us: { flag: [0x3c5fd1, 0xffffff, 0xe5484d, 0xffd24a], spark: 'star', animal: { shape: 'bird', body: 0x7a5638, belly: 0xffffff, accent: 0x5c3d26, head: 0xffffff }, finale: null },
    ca: { flag: [0xe5484d, 0xffffff, 0xff9a62], spark: 'leaf', animal: { shape: 'ears', body: 0x9a6a45, belly: 0xe9cfa8, accent: 0x6e4a2e }, finale: null },
    be: { flag: [0x3a3a44, 0xffd24a, 0xe5484d], spark: 'dot', animal: { shape: 'ears', body: 0x8a5535, belly: 0xf3d9b0, accent: 0x5e3822 }, finale: null },
    fr: { flag: [0x3c5fd1, 0xffffff, 0xe5484d], spark: 'petal', animal: { shape: 'bunny', body: 0xf1ece6, belly: 0xffffff, accent: 0xffb8c6 }, finale: null },
    ru: { flag: [0xffffff, 0x3c5fd1, 0xe5484d], spark: 'snow', animal: { shape: 'ears', body: 0x8a5a3c, belly: 0xd2b08c, accent: 0x5e3b25 }, finale: null },
    jp: { flag: [0xe5484d, 0xffffff, 0xffb7c8], spark: 'petal', animal: { shape: 'fox', body: 0xf08a3c, belly: 0xffffff, accent: 0x7a3f1d }, finale: null },
    cn: { flag: [0xe5484d, 0xffd24a, 0xffffff], spark: 'star', animal: { shape: 'ears', body: 0xfafafa, belly: 0xffffff, accent: 0x2b2b33 }, finale: null },
    eg: { flag: [0xffd24a, 0x2ab7a9, 0xd9a05b], spark: 'sand', animal: { shape: 'camel', body: 0xd9a96a, belly: 0xf0d5a6, accent: 0xa8773d }, comp: 'scarab' },
    br: { flag: [0x2fbf71, 0xffd24a, 0x3c5fd1, 0xff6fa5], spark: 'confetti', animal: { shape: 'bird', body: 0xe5484d, belly: 0xffd24a, accent: 0x2fbf71, beak: 0x2b2b33 }, comp: 'bird' }
  };
  // Two props per spot (data keyed by place id). Unknown places fall back to their country, then to a default.
  var COUNTRY_PROPS = { tr: ['nazar', 'tulip'], us: ['starpost', 'pennant'], ca: ['maple', 'snowman'], be: ['macaron', 'waffle'], fr: ['macaron', 'tulip'],
    ru: ['matryoshka', 'dome'], jp: ['koi', 'paperlantern'], cn: ['paperlantern', 'bamboo'], eg: ['scarab', 'sandswirl'], br: ['carnival', 'palm'] };
  var PLACE_THEME = {
    galata: { p: ['nazar', 'tulip'], s: 'petal' }, bosphorus: { p: ['boat', 'buoy'], s: 'water' }, cappadocia: { p: ['balloon', 'tulip'], s: 'sand' },
    liberty: { p: ['starpost', 'buoy'], s: 'star' }, brooklyn: { p: ['pennant', 'buoy'], s: 'star' }, centralpark: { p: ['tulip', 'pennant'], s: 'leaf' },
    niagara: { p: ['maple', 'icicle'], s: 'water' }, cntower: { p: ['maple', 'pennant'], s: 'leaf' }, hockey: { p: ['snowman', 'icicle'], s: 'snow' },
    atomium: { p: ['atom', 'macaron'], s: 'star' }, grandplace: { p: ['macaron', 'dome'], s: 'dot' }, waffle: { p: ['waffle', 'macaron'], s: 'dot' },
    eiffel: { p: ['pennant', 'tulip'], s: 'petal' }, louvre: { p: ['macaron', 'obelisk'], s: 'star' }, seine: { p: ['boat', 'buoy'], s: 'water' },
    basils: { p: ['dome', 'matryoshka'], s: 'snow' }, kremlin: { p: ['starpost', 'dome'], s: 'snow' }, redsquare: { p: ['matryoshka', 'pennant'], s: 'snow' },
    fuji: { p: ['paperlantern', 'sakura'], s: 'snow' }, torii: { p: ['koi', 'paperlantern'], s: 'petal' }, sakura: { p: ['sakura', 'paperlantern'], s: 'petal' },
    greatwall: { p: ['paperlantern', 'pennant'], s: 'star' }, heaven: { p: ['paperlantern', 'bamboo'], s: 'star' }, bamboo: { p: ['bamboo', 'tulip'], s: 'leaf' },
    pyramids: { p: ['scarab', 'sandswirl'], s: 'sand' }, sphinx: { p: ['obelisk', 'scarab'], s: 'sand' }, nile: { p: ['palm', 'boat'], s: 'water' },
    christ: { p: ['carnival', 'tulip'], s: 'confetti' }, sugarloaf: { p: ['carnival', 'palm'], s: 'confetti' }, copacabana: { p: ['palm', 'carnival'], s: 'confetti' }
  };
  var KIND_THEME = { falls: 'water', river: 'water', suspension: 'water', beach: 'confetti', hockey: 'snow', park: 'leaf' };
  var FINALE = { rings: 'fireworks', balls: 'fireworks', flowers: 'bloom', butterflies: 'bloom', windmills: 'rainbow', painting: 'rainbow',
    splashes: 'parade', train: 'parade', picnic: 'parade', lanterns: 'lanterns', kites: 'cannon', music: 'cannon' };
  var COMPANION = { butterflies: 'butterfly', flowers: 'bee', splashes: 'duck', kites: 'bird', picnic: 'bee' };

  function themeFor(cid, place) {
    var pid = place && (place.id || place.kind) || '', t = PLACE_THEME[pid], c = COUNTRY[cid] || COUNTRY.tr;
    var props = t ? t.p : (COUNTRY_PROPS[cid] || ['tulip', 'pennant']);
    var spark = t ? t.s : (KIND_THEME[pid] || (place && KIND_THEME[place.kind]) || c.spark);
    return { props: props, spark: spark, flag: c.flag, animal: c.animal, comp: c.comp, ice: pid === 'hockey' };
  }

  // ---------- shared GPU resources (reference counted like the stage pool in activities.js) ----------
  var shared = null;
  function acquire() {
    if (shared) { shared.users++; return shared; }
    var s = new T.Shape(); s.moveTo(0, 1); s.lineTo(0.24, 0.24); s.lineTo(1, 0); s.lineTo(0.24, -0.24); s.lineTo(0, -1); s.lineTo(-0.24, -0.24); s.lineTo(-1, 0); s.lineTo(-0.24, 0.24); s.closePath();
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var g = cv.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    shared = { users: 1, tex: tex,
      dotGeo: new T.CircleGeometry(1, 10), sparkGeo: new T.ShapeGeometry(s), confGeo: new T.PlaneGeometry(1, 0.62),
      dotMat: new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
      sparkMat: new T.MeshBasicMaterial({ side: T.DoubleSide, toneMapped: false, fog: false }),
      confMat: new T.MeshBasicMaterial({ side: T.DoubleSide }) };
    return shared;
  }
  function release(s) {
    if (--s.users) return;
    s.tex.dispose(); s.dotGeo.dispose(); s.sparkGeo.dispose(); s.confGeo.dispose(); s.dotMat.dispose(); s.sparkMat.dispose(); s.confMat.dispose();
    if (shared === s) shared = null;
  }

  // ---------- pooled particles (one InstancedMesh each, no per-frame allocation) ----------
  function Pool(geo, mat, n, mode) {
    this.n = n; this.mode = mode; this.sizeMul = mode === 'conf' ? 1.6 : 2.0; this.cursor = 0; this.alive = 0; this.dirty = false;
    this.mesh = new T.InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false; this.mesh.renderOrder = 4;
    var c = new T.Color(1, 1, 1);
    for (var i = 0; i < n; i++) this.mesh.setColorAt(i, c);
    this.mesh.instanceColor.setUsage(T.DynamicDrawUsage);
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3);
    this.age = new Float32Array(n); this.life = new Float32Array(n); this.size = new Float32Array(n);
    this.rot = new Float32Array(n); this.spin = new Float32Array(n); this.g = new Float32Array(n);
    this.drag = new Float32Array(n); this.kind = new Uint8Array(n); this.live = new Uint8Array(n);
    this.colorDirty = false; this.clear();
  }
  var tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpQ2 = new T.Quaternion(), tmpP = new T.Vector3(), tmpS = new T.Vector3(), tmpE = new T.Euler(), AXZ = new T.Vector3(0, 0, 1), zeroM = new T.Matrix4().makeScale(0, 0, 0), tmpC = new T.Color();
  Pool.prototype.clear = function () {
    for (var i = 0; i < this.n; i++) { this.live[i] = 0; this.mesh.setMatrixAt(i, zeroM); }
    this.alive = 0; this.mesh.instanceMatrix.needsUpdate = true;
  };
  // kind: 0 = shrink out, 1 = puff (grow, then thin out)
  Pool.prototype.spawn = function (x, y, z, vx, vy, vz, life, size, hex, g, drag, kind, spin) {
    var i = this.cursor; this.cursor = (this.cursor + 1) % this.n;
    if (!this.live[i]) this.alive++;
    this.live[i] = 1; this.age[i] = 0; this.life[i] = life; this.size[i] = size * this.sizeMul; this.g[i] = g || 0; this.drag[i] = drag || 0; this.kind[i] = kind || 0;
    this.rot[i] = Math.random() * TAU; this.spin[i] = spin === undefined ? (Math.random() - 0.5) * 6 : spin;
    var k = i * 3; this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.mesh.setColorAt(i, tmpC.setHex(hex)); this.colorDirty = true; this.dirty = true;
    return i;
  };
  Pool.prototype.update = function (dt, camQ) {
    if (!this.alive && !this.dirty) { this.mesh.visible = this.keepVisible === true; return; }
    this.mesh.visible = true; this.dirty = false;
    for (var i = 0; i < this.n; i++) {
      if (!this.live[i]) continue;
      var a = this.age[i] += dt, L = this.life[i];
      if (a >= L) { this.live[i] = 0; this.alive--; this.mesh.setMatrixAt(i, zeroM); continue; }
      var k = i * 3, d = Math.exp(-this.drag[i] * dt);
      this.v[k] *= d; this.v[k + 2] *= d; this.v[k + 1] = this.v[k + 1] * d - this.g[i] * dt;
      this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      if (this.p[k + 1] < 0.04 && this.g[i] > 0) { this.p[k + 1] = 0.04; this.v[k + 1] *= -0.25; }
      this.rot[i] += this.spin[i] * dt;
      var t = a / L, pop = Math.min(1, a / 0.07), s;
      if (this.kind[i] === 1) s = this.size[i] * (0.45 + t * 1.1) * pop * (1 - t * t * t);
      else { var out = Math.max(0, (t - 0.5) / 0.5); s = this.size[i] * pop * (1 - out * out); }
      tmpP.set(this.p[k], this.p[k + 1], this.p[k + 2]);
      if (this.mode === 'conf') {
        tmpE.set(this.rot[i] * 1.3, this.rot[i], this.rot[i] * 0.7); tmpQ.setFromEuler(tmpE); tmpS.set(s, s, s);
      } else {
        tmpQ.copy(camQ); tmpQ2.setFromAxisAngle(AXZ, this.rot[i]); tmpQ.multiply(tmpQ2); tmpS.set(s, s, s);
      }
      this.mesh.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty) { this.mesh.instanceColor.needsUpdate = true; this.colorDirty = false; }
  };

  function smooth(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }
  function pop(t) { // squash-stretch spring, 0 -> 1 with overshoot
    if (t <= 0) return 0; if (t >= 1) return 1;
    return 1 - Math.exp(-7 * t) * Math.cos(t * 13);
  }
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }

  function attach(c) {
    var type = c.type, place = c.place || null, country = c.country || null, targets = c.targets, motion = c.motion, gentle = c.gentle;
    var cid = country && country.id || '', TH = themeFor(cid, place), flag = TH.flag;
    var part = c.part, node = c.node, rod = c.rod;
    var Q = gentle ? 0.35 : 1;
    var cx = 0, cz = 0;
    if (place) { cx = place.x; cz = place.z; } else if (targets.length) { for (var q = 0; q < targets.length; q++) { cx += targets[q].x / targets.length; cz += targets[q].z / targets.length; } }
    var pr = place ? place.radius || 7 : 7;
    var sh = acquire();
    var dots = new Pool(sh.dotGeo, sh.dotMat, 110, 'bill'), sparks = new Pool(sh.sparkGeo, sh.sparkMat, 120, 'bill'), conf = new Pool(sh.confGeo, sh.confMat, 100, 'conf');
    dots.keepVisible = sparks.keepVisible = conf.keepVisible = true; // stay drawn until the first update so the loading cover warms their shaders
    dots.mesh.name = 'fx-dots'; sparks.mesh.name = 'fx-sparks'; conf.mesh.name = 'fx-confetti';
    c.root.add(dots.mesh, sparks.mesh, conf.mesh);
    var now = 0, started = false, disposed = false;
    var hx = 0, hz = 0, phx = 0, phz = 0, hvx = 0, hvz = 0, hspeed = 0, haveHero = false, heroY = 0;
    var events = [], lastChime = -9, lastCollect = -9, collected = 0, hopAt = -9, hopAmp = 0;
    var completeAt = -1, finale = null, surprise = null, awarded = null, holdSeconds = 0, trailAcc = 0, boostUntil = -1;
    var cam = window.FLASH_CORE && window.FLASH_CORE.camera, camQ = cam ? cam.quaternion : new T.Quaternion();

    // ---- emit helpers ----
    function sp(x, y, z, vx, vy, vz, life, size, hex, g, drag) { return sparks.spawn(x, y, z, vx, vy, vz, life, size, hex, g, drag, 0); }
    function dt_(x, y, z, vx, vy, vz, life, size, hex, g, drag, kind) { return dots.spawn(x, y, z, vx, vy, vz, life, size, hex, g, drag, kind); }
    function cf(x, y, z, vx, vy, vz, life, size, hex, g, drag) { return conf.spawn(x, y, z, vx, vy, vz, life, size, hex, g, drag || 1.2, 0, (Math.random() - 0.5) * 12); }
    function cnt(n) { return Math.max(1, Math.round(n * Q)); }
    function flagColor(i) { return flag[i % flag.length]; }
    function ring(x, y, z, n, speed, up, hexFn, life, size) {
      n = cnt(n);
      for (var k = 0; k < n; k++) { var a = k / n * TAU + Math.random() * 0.3; sp(x, y, z, Math.cos(a) * speed, up + Math.random() * 0.8, Math.sin(a) * speed, life, size, hexFn(k), 2.4, 0.8); }
    }
    function sphereBurst(x, y, z, n, speed, hexA, hexB, life, size) {
      n = cnt(n);
      for (var k = 0; k < n; k++) {
        var yy = 1 - 2 * (k + 0.5) / n, r = Math.sqrt(1 - yy * yy), a = k * 2.399963;
        var sd = speed * (0.75 + Math.random() * 0.35);
        sp(x, y, z, Math.cos(a) * r * sd, yy * sd, Math.sin(a) * r * sd, life, size * (0.8 + Math.random() * 0.5), k % 3 ? hexA : hexB, 2.2, 1.3);
      }
    }
    function later(sec, fn) { if (events.length < 60) events.push({ t: now + sec, fn: fn }); }
    function chime(i, force) {
      if (!window.FLASH_AUDIO || !window.FLASH_AUDIO.chime) return;
      if (!force && (now - lastChime < 0.75 || now - lastCollect < 0.75)) return;
      lastChime = now; window.FLASH_AUDIO.chime(i);
    }
    function recolor(n, hex, boost) {
      var r = n.userData.activityRecord; if (!r || !r.batch.mesh) return;
      tmpC.setHex(hex); if (boost) tmpC.multiplyScalar(boost);
      r.batch.mesh.setColorAt(r.index, tmpC); r.batch.mesh.instanceColor.needsUpdate = true;
    }

    // ---- creature / prop builders (all go through the stage's instanced batches) ----
    function animal(parent, spec, s) {
      var g = node(parent, 0, 0, 0); g.scale.setScalar(s);
      var b = spec.body, bl = spec.belly, ac = spec.accent;
      part(g, 'bead', b, 0, 0.36, 0, 0.34, 0.30, 0.40);
      part(g, 'bead', bl, 0, 0.30, 0.12, 0.22, 0.2, 0.26);
      var hd = spec.head || b, hy = 0.74;
      if (spec.shape === 'camel') { part(g, 'bead', b, 0, 0.64, -0.1, 0.2, 0.2, 0.2); part(g, 'bead', b, 0, 0.62, 0.34, 0.14, 0.34, 0.14, 0.5); hy = 0.98; }
      part(g, 'bead', hd, 0, hy, 0.24, 0.22, 0.2, 0.22);
      part(g, 'bead', 0xffffff, -0.08, hy + 0.04, 0.42, 0.045, 0.05, 0.03); part(g, 'bead', 0xffffff, 0.08, hy + 0.04, 0.42, 0.045, 0.05, 0.03);
      part(g, 'bead', 0x2b2b38, -0.08, hy + 0.04, 0.45, 0.025, 0.03, 0.02); part(g, 'bead', 0x2b2b38, 0.08, hy + 0.04, 0.45, 0.025, 0.03, 0.02);
      if (spec.shape === 'bird') {
        part(g, 'cone', spec.beak || 0xffa43c, 0, hy - 0.03, 0.5, 0.07, 0.2, 0.07, PI / 2);
        part(g, 'bead', ac, -0.3, 0.4, 0, 0.07, 0.2, 0.3); part(g, 'bead', ac, 0.3, 0.4, 0, 0.07, 0.2, 0.3);
        part(g, 'cone', ac, 0, 0.42, -0.42, 0.12, 0.3, 0.05, -PI / 2.4);
      } else if (spec.shape === 'bunny') {
        part(g, 'bead', b, -0.09, hy + 0.34, 0.2, 0.07, 0.25, 0.05); part(g, 'bead', b, 0.09, hy + 0.34, 0.2, 0.07, 0.25, 0.05);
        part(g, 'bead', ac, 0, hy - 0.04, 0.46, 0.04, 0.04, 0.03); part(g, 'bead', 0xffffff, 0, 0.36, -0.4, 0.1, 0.1, 0.1);
      } else if (spec.shape === 'fox') {
        part(g, 'cone', ac, -0.1, hy + 0.2, 0.2, 0.07, 0.2, 0.05); part(g, 'cone', ac, 0.1, hy + 0.2, 0.2, 0.07, 0.2, 0.05);
        part(g, 'bead', 0xffffff, 0, 0.32, -0.46, 0.1, 0.1, 0.22, 0.4); part(g, 'bead', ac, 0, hy - 0.03, 0.46, 0.04, 0.04, 0.03);
      } else {
        part(g, 'bead', ac, -0.14, hy + 0.17, 0.2, 0.07, 0.07, 0.05); part(g, 'bead', ac, 0.14, hy + 0.17, 0.2, 0.07, 0.07, 0.05);
        part(g, 'bead', 0x3a2b2b, 0, hy - 0.04, 0.46, 0.04, 0.035, 0.03);
      }
      part(g, 'bead', ac, -0.14, 0.08, 0.1, 0.09, 0.09, 0.12); part(g, 'bead', ac, 0.14, 0.08, 0.1, 0.09, 0.09, 0.12);
      return g;
    }
    var P = {
      tulip: function (g, a) { rod(g, 0x4faa72, [0, 0, 0], [0, 0.7, 0], 0.05); part(g, 'bead', a, 0, 0.8, 0, 0.17, 0.22, 0.17); part(g, 'bead', 0x7fd18c, 0.13, 0.3, 0, 0.14, 0.04, 0.07, 0, 0, -0.5); },
      nazar: function (g) { rod(g, 0x8b6d4c, [0, 0, 0], [0, 0.55, 0], 0.045); part(g, 'cylinder', 0x2a6fd6, 0, 0.9, 0, 0.36, 0.05, 0.36, PI / 2); part(g, 'cylinder', 0xffffff, 0, 0.9, 0.02, 0.25, 0.05, 0.25, PI / 2); part(g, 'cylinder', 0x2a6fd6, 0, 0.9, 0.04, 0.16, 0.05, 0.16, PI / 2); part(g, 'cylinder', 0x1d1f33, 0, 0.9, 0.06, 0.07, 0.05, 0.07, PI / 2); },
      balloon: function (g, a) { part(g, 'bead', a, 0, 1.55, 0, 0.42, 0.46, 0.42); part(g, 'cone', 0xffe9b8, 0, 1.0, 0, 0.26, 0.32, 0.26, PI); part(g, 'box', 0xb98b5e, 0, 0.74, 0, 0.2, 0.16, 0.2); part(g, 'bead', 0xfff0c0, 0, 1.58, 0, 0.44, 0.1, 0.44); },
      pennant: function (g, a) { rod(g, 0xe9e2d0, [0, 0, 0], [0, 1.3, 0], 0.035); for (var i = 0; i < 3; i++) part(g, 'box', i % 2 ? WHITE : a, 0.22, 1.2 - i * 0.11, 0, 0.42, 0.1, 0.02); part(g, 'star', GOLD, 0, 1.38, 0, 0.1, 0.1, 0.1); },
      starpost: function (g) { rod(g, 0x6f7a92, [0, 0, 0], [0, 0.8, 0], 0.05); part(g, 'star', GOLD, 0, 1.05, 0, 0.26, 0.26, 0.26); },
      maple: function (g) { rod(g, 0x8b6d4c, [0, 0, 0], [0, 0.5, 0], 0.04); part(g, 'star', 0xe5484d, 0, 0.82, 0, 0.32, 0.32, 0.32, 0, 0.3, 0.3); },
      snowman: function (g) { part(g, 'bead', WHITE, 0, 0.25, 0, 0.27, 0.25, 0.27); part(g, 'bead', WHITE, 0, 0.6, 0, 0.2, 0.19, 0.2); part(g, 'bead', WHITE, 0, 0.87, 0, 0.14, 0.14, 0.14); part(g, 'cone', 0xff8a3c, 0, 0.87, 0.16, 0.035, 0.16, 0.035, PI / 2); part(g, 'bead', 0x2b2b38, -0.05, 0.92, 0.12, 0.02, 0.02, 0.02); part(g, 'bead', 0x2b2b38, 0.05, 0.92, 0.12, 0.02, 0.02, 0.02); part(g, 'cylinder', 0xe5484d, 0, 0.74, 0, 0.17, 0.04, 0.17); },
      icicle: function (g) { part(g, 'cone', 0xbfe9ff, 0, 0.35, 0, 0.14, 0.7, 0.14); part(g, 'cone', 0xdff6ff, 0.2, 0.22, 0.05, 0.1, 0.44, 0.1); part(g, 'cone', 0xa6dcf7, -0.19, 0.18, -0.02, 0.09, 0.36, 0.09); },
      macaron: function (g, a) { part(g, 'bead', a, 0, 0.18, 0, 0.3, 0.1, 0.3); part(g, 'bead', 0xfff3dd, 0, 0.3, 0, 0.27, 0.06, 0.27); part(g, 'bead', a, 0, 0.42, 0, 0.3, 0.1, 0.3); },
      waffle: function (g, a) { part(g, 'box', 0xd9a35c, 0, 0.1, 0, 0.62, 0.12, 0.62); part(g, 'bead', 0xfff3dd, 0, 0.22, 0, 0.2, 0.09, 0.2); part(g, 'bead', a, 0.03, 0.34, 0, 0.09, 0.09, 0.09); },
      matryoshka: function (g, a) { part(g, 'bead', a, 0, 0.36, 0, 0.3, 0.4, 0.3); part(g, 'bead', 0xffd9b0, 0, 0.8, 0, 0.2, 0.2, 0.2); part(g, 'bead', GOLD, 0, 0.86, -0.02, 0.23, 0.15, 0.22); part(g, 'bead', WHITE, 0, 0.34, 0.24, 0.17, 0.2, 0.08); },
      dome: function (g) { part(g, 'cylinder', 0xfff1d0, 0, 0.3, 0, 0.2, 0.6, 0.2); part(g, 'bead', 0xf0b83a, 0, 0.78, 0, 0.3, 0.36, 0.3); part(g, 'cone', 0xf0b83a, 0, 1.2, 0, 0.07, 0.4, 0.07); },
      koi: function (g, a) { part(g, 'cylinder', 0x5fc7ea, 0, 0.04, 0, 1.0, 0.07, 1.0); var f = node(g, 0, 0.14, 0); part(f, 'bead', 0xff8a3c, 0, 0, 0, 0.15, 0.09, 0.3); part(f, 'cone', 0xffb066, 0, 0, -0.34, 0.12, 0.25, 0.04, -PI / 2); part(f, 'bead', WHITE, 0.03, 0.07, 0.04, 0.07, 0.04, 0.12); return f; },
      paperlantern: function (g) { rod(g, 0x8b6d4c, [0, 0, 0], [0, 0.9, 0], 0.035); part(g, 'bead', 0xe5484d, 0, 1.1, 0, 0.26, 0.3, 0.26); part(g, 'cylinder', GOLD, 0, 1.4, 0, 0.13, 0.05, 0.13); part(g, 'cylinder', GOLD, 0, 0.8, 0, 0.13, 0.05, 0.13); part(g, 'bead', 0xffe9a0, 0, 1.1, 0, 0.34, 0.38, 0.34, 0, 0, 0, 'glow'); },
      sakura: function (g) { rod(g, 0x7a5a48, [0, 0, 0], [0, 0.8, 0], 0.07); part(g, 'bead', 0xffb7c8, 0, 1.0, 0, 0.38, 0.28, 0.38); part(g, 'bead', 0xffd1de, -0.24, 0.86, 0.08, 0.22, 0.18, 0.22); part(g, 'bead', 0xffc2d2, 0.24, 0.9, -0.04, 0.2, 0.17, 0.2); },
      bamboo: function (g) { for (var i = 0; i < 3; i++) { part(g, 'cylinder', 0x8cc86e, (i - 1) * 0.16, 0.45 + i % 2 * 0.15, 0, 0.065, 0.9 + i % 2 * 0.3, 0.065); part(g, 'bead', 0x62a84e, (i - 1) * 0.16, 0.9 + i % 2 * 0.3, 0.07, 0.17, 0.04, 0.07, 0, 0, 0.4); } },
      scarab: function (g) { part(g, 'bead', 0x2ab7a9, 0, 0.14, 0, 0.18, 0.1, 0.24); part(g, 'bead', GOLD, 0, 0.14, 0.24, 0.1, 0.07, 0.07); part(g, 'bead', GOLD, 0, 0.24, 0, 0.02, 0.02, 0.2); part(g, 'bead', 0xfff2a8, 0, 0.45, 0, 0.1, 0.1, 0.1, 0, 0, 0, 'glow'); },
      sandswirl: function (g) { for (var i = 0; i < 3; i++) part(g, 'torus', i % 2 ? 0xe6c07a : 0xf2d391, 0, 0.04 + i * 0.03, 0, 0.8 - i * 0.22, 0.8 - i * 0.22, 0.8 - i * 0.22, PI / 2); part(g, 'bead', 0xe6c07a, 0, 0.1, 0, 0.14, 0.1, 0.14); },
      obelisk: function (g) { part(g, 'box', 0xe8cf9a, 0, 0.55, 0, 0.2, 1.1, 0.2); part(g, 'cone', GOLD, 0, 1.2, 0, 0.17, 0.2, 0.17); },
      palm: function (g) { rod(g, 0x9a7650, [0, 0, 0], [0.12, 1.0, 0], 0.07); for (var i = 0; i < 4; i++) { var a = i * PI / 2 + 0.4; part(g, 'bead', 0x5fb86a, 0.12 + Math.sin(a) * 0.28, 1.02, Math.cos(a) * 0.28, 0.32, 0.04, 0.12, 0, a, 0.15); } },
      carnival: function (g, a) { rod(g, 0xb98b5e, [0, 0, 0], [0, 1.2, 0], 0.04); var cols = [0xff6fa5, 0xffd24a, 0x2fbf71, 0x3c9bff]; for (var i = 0; i < 4; i++) { var ang = i * PI / 2; rod(g, cols[i], [0, 1.2, 0], [Math.cos(ang) * 0.5, 0.78, Math.sin(ang) * 0.5], 0.035); part(g, 'bead', cols[(i + 1) % 4], Math.cos(ang) * 0.5, 0.74, Math.sin(ang) * 0.5, 0.09, 0.14, 0.09); } part(g, 'star', a, 0, 1.3, 0, 0.14, 0.14, 0.14); },
      buoy: function (g) { part(g, 'bead', 0xe5484d, 0, 0.18, 0, 0.2, 0.22, 0.2); part(g, 'torus', WHITE, 0, 0.18, 0, 0.2, 0.2, 0.2, PI / 2); part(g, 'cylinder', 0x6f7a92, 0, 0.5, 0, 0.025, 0.4, 0.025); part(g, 'bead', 0xffd24a, 0, 0.72, 0, 0.06, 0.06, 0.06); },
      boat: function (g, a) { part(g, 'box', 0xb98b5e, 0, 0.12, 0, 0.8, 0.18, 0.34); part(g, 'cone', 0xfff6e4, 0, 0.62, 0, 0.3, 0.7, 0.04); part(g, 'cylinder', 0x8b6d4c, 0, 0.5, 0, 0.025, 0.7, 0.025); part(g, 'box', a, 0, 0.23, 0, 0.82, 0.04, 0.36); },
      atom: function (g) { part(g, 'bead', 0xd6dbe6, 0, 0.9, 0, 0.3, 0.3, 0.3); part(g, 'bead', 0xd6dbe6, 0.55, 0.4, 0, 0.22, 0.22, 0.22); part(g, 'bead', 0xd6dbe6, -0.5, 0.35, 0.2, 0.2, 0.2, 0.2); rod(g, 0xaab2c2, [0, 0.9, 0], [0.55, 0.4, 0], 0.04); rod(g, 0xaab2c2, [0, 0.9, 0], [-0.5, 0.35, 0.2], 0.04); }
    };

    // ---- props around each target, data driven by the place theme ----
    var props = [];
    var propColors = [0xff7b8f, 0xffce55, 0x6ecdf1, 0xa68bf4, 0x75d5a0];
    targets.forEach(function (t, ti) {
      var ox = t.x - cx, oz = t.z - cz, base = Math.atan2(ox, oz);
      for (var k = 0; k < 2; k++) {
        var a = base + (k ? -1 : 1) * 0.95, r = 2.15;
        var g = node(t.pad, Math.sin(a) * r, 0, Math.cos(a) * r), kind = TH.props[k % TH.props.length];
        g.rotation.y = a + PI;
        var inner = P[kind](g, propColors[(ti + k) % 5]) || null;
        props.push({ g: g, inner: inner, kind: kind, t: t, ph: ti * 1.7 + k, hop: -9, near: false, x: t.x + Math.sin(a) * r, z: t.z + Math.cos(a) * r });
      }
    });

    // ---- halos (soft glow pulses), one per target ----
    targets.forEach(function (t) { t.halo = part(t.pad, 'cylinder', t.color, 0, 0.05, 0, 1.6, 0.03, 1.6, 0, 0, 0, 'glow'); t.pulseAt = -9; t.popAt = -9; });

    // ---- companions that circle / follow Feza (one appears per goal) ----
    var compKind = COMPANION[type] || TH.comp || 'wisp', comps = [];
    for (var ci = 0; ci < 5; ci++) {
      var cg = node(c.root, 0, -50, 0), cm = { g: cg, kind: compKind, wings: [], on: -9, x: 0, y: 0, z: 0, vx: 0, vz: 0, ph: ci * 1.3 };
      cg.visible = false;
      if (compKind === 'butterfly') {
        for (var w = 0; w < 2; w++) { var wing = node(cg, w ? -0.02 : 0.02, 0, 0); wing.scale.x = w ? -1 : 1; part(wing, 'wing', NOTE[ci], 0, 0, 0, 0.36, 0.36, 0.36, 0, 0, 0, 'flat'); part(wing, 'wing', 0xfff0a8, 0.01, 0.02, 0.01, 0.2, 0.2, 0.2, 0, 0, 0, 'flat'); cm.wings.push(wing); }
        part(cg, 'bead', 0x5b4a73, 0, 0, 0, 0.03, 0.12, 0.03);
      } else if (compKind === 'bee') {
        part(cg, 'bead', 0xffd24a, 0, 0, 0, 0.1, 0.09, 0.14); part(cg, 'bead', 0x2b2b38, 0, 0.01, -0.06, 0.1, 0.09, 0.05);
        for (var w2 = 0; w2 < 2; w2++) { var wg = node(cg, w2 ? -0.06 : 0.06, 0.08, 0); wg.scale.x = w2 ? -1 : 1; part(wg, 'wing', 0xe9f7ff, 0, 0, 0, 0.14, 0.14, 0.14, 0, 0, 0, 'flat'); cm.wings.push(wg); }
      } else if (compKind === 'duck') {
        cm.animal = animal(cg, { shape: 'bird', body: 0xffe05c, belly: 0xfff4b8, accent: 0xffc83a, beak: 0xff9a3c }, 0.7);
      } else if (compKind === 'bird') {
        cm.animal = animal(cg, TH.animal.shape === 'bird' ? { shape: 'bird', body: TH.animal.body, belly: TH.animal.belly, accent: TH.animal.accent, beak: TH.animal.beak } : { shape: 'bird', body: NOTE[ci], belly: 0xffffff, accent: NOTE[(ci + 2) % 5] }, 0.42);
        cm.wingL = 0;
      } else if (compKind === 'scarab') {
        P.scarab(cg); cg.scale.setScalar(0.8);
      } else {
        part(cg, 'bead', NOTE[ci], 0, 0, 0, 0.12, 0.12, 0.12); part(cg, 'bead', 0xffffff, 0, 0.0, 0, 0.2, 0.2, 0.2, 0, 0, 0, 'glow');
      }
      comps.push(cm);
    }

    // ---- finale parts, only for the kind this activity uses ----
    var fKind = FINALE[type] || 'fireworks';
    if (place && place.id === 'hockey') fKind = 'fireworks';
    var arcs = [], blooms = [], lants = [], parade = [], pathPts = [], pathLen = [];
    var RAINBOW = [0xff5a6a, 0xff9a4a, 0xffe14f, 0x62dc9a, 0x6fb4ff, 0x6a6ae0, 0xb26ae0];
    var sortedT = targets.slice().sort(function (a, b) { return Math.atan2(a.x - cx, a.z - cz) - Math.atan2(b.x - cx, b.z - cz); });
    if (fKind === 'rainbow') {
      for (var ai = 0; ai < 7; ai++) { var an = node(c.root, cx, 0, cz - 2.5); an.visible = false; part(an, 'arc', RAINBOW[ai], 0, 0, 0, 1, 1, 1); arcs.push(an); }
    } else if (fKind === 'bloom') {
      sortedT.forEach(function (t, ti) {
        for (var b = 0; b < 5; b++) {
          var a = b * TAU / 5 + ti * 0.7, r = 2.7 + (b % 2) * 0.7, fg = node(c.root, t.x + Math.sin(a) * r, 0, t.z + Math.cos(a) * r); fg.visible = false;
          var col = PALETTE5[(ti + b) % 5];
          rod(fg, 0x53ae77, [0, 0, 0], [0, 0.45, 0], 0.04); part(fg, 'bead', GOLD, 0, 0.5, 0, 0.1, 0.07, 0.1);
          for (var pt = 0; pt < 5; pt++) part(fg, 'bead', col, Math.sin(pt * TAU / 5) * 0.14, 0.48, Math.cos(pt * TAU / 5) * 0.14, 0.1, 0.05, 0.14, 0, pt * TAU / 5);
          blooms.push({ g: fg, at: (ti * 5 + b) * 0.07, x: fg.position.x, z: fg.position.z, col: col });
        }
      });
    } else if (fKind === 'lanterns') {
      for (var li = 0; li < 12; li++) {
        var lg = node(c.root, 0, 0, 0); lg.visible = false; var lc = [flag[li % flag.length], 0xffd24a, 0xff9a62][li % 3];
        part(lg, 'bead', lc, 0, 0, 0, 0.26, 0.3, 0.26); part(lg, 'cylinder', GOLD, 0, 0.3, 0, 0.12, 0.04, 0.12); part(lg, 'cylinder', GOLD, 0, -0.3, 0, 0.12, 0.04, 0.12); part(lg, 'bead', 0xffe9a0, 0, 0, 0, 0.36, 0.4, 0.36, 0, 0, 0, 'glow');
        lants.push({ g: lg, at: li * 0.17, ang: li * 2.4, rad: 1 + (li % 4) * 0.55 });
      }
    } else if (fKind === 'parade') {
      for (var pi2 = 0; pi2 < 8; pi2++) {
        var pg = node(c.root, 0, 0, 0); pg.visible = false;
        var spec = pi2 % 3 === 1 ? { shape: 'bird', body: 0xffe05c, belly: 0xfff4b8, accent: 0xffc83a, beak: 0xff9a3c } : TH.animal;
        var inner2 = node(pg, 0, 0, 0); animal(inner2, spec, 1.25);
        parade.push({ g: pg, inner: inner2, off: pi2 * 0.085, ph: pi2 * 0.8 });
      }
    }

    // ---- pads (gentle jump pads) and sparkle gates, placed on free route segments by activity-routes.js ----
    var pads = [];
    (c.pads || []).forEach(function (pd, pi) {
      var g = node(c.root, pd.x, 0, pd.z), col = NOTE[(pi * 2 + 1) % 5];
      if (pd.kind === 'jump') {
        part(g, 'cylinder', 0xfff4d6, 0, 0.04, 0, 0.95, 0.07, 0.95); var dome = part(g, 'bead', col, 0, 0.08, 0, 0.62, 0.16, 0.62);
        part(g, 'torus', GOLD, 0, 0.1, 0, 0.9, 0.9, 0.9, PI / 2);
        pads.push({ kind: 'jump', x: pd.x, z: pd.z, g: g, dome: dome, at: -9, col: col, i: pi });
      } else {
        var dx = pd.dx, dz = pd.dz, nx = -dz, nz = dx; // across the path
        for (var s = -1; s <= 1; s += 2) { rod(g, 0xfff2cf, [nx * 1.45 * s, 0, nz * 1.45 * s], [nx * 1.45 * s, 1.3, nz * 1.45 * s], 0.06); part(g, 'bead', col, nx * 1.45 * s, 1.4, nz * 1.45 * s, 0.14, 0.14, 0.14); part(g, 'bead', 0xffffff, nx * 1.45 * s, 1.4, nz * 1.45 * s, 0.26, 0.26, 0.26, 0, 0, 0, 'glow'); }
        var rib = []; for (var rb = 0; rb < 3; rb++) { var rr = rod(g, flag[rb % flag.length], [-nx * 1.4, 1.25 - rb * 0.12, -nz * 1.4], [nx * 1.4, 1.25 - rb * 0.12, nz * 1.4], 0.03); rib.push(rr); }
        part(g, 'box', GOLD, 0, 0.03, 0, 0.5, 0.025, 0.5, 0, Math.atan2(dx, dz)); part(g, 'box', GOLD, dx * 0.45, 0.03, dz * 0.45, 0.3, 0.025, 0.3, 0, Math.atan2(dx, dz) + PI / 4);
        pads.push({ kind: 'gate', x: pd.x, z: pd.z, dx: dx, dz: dz, g: g, at: -9, col: col, i: pi, rib: rib, px: 0, pz: 0 });
      }
    });

    // ---- surprise pieces (one set, built hidden) ----
    var sur = { g: node(c.root, 0, -50, 0), orb: null, glow: null, stars: [], buddy: null, stamp: null };
    sur.g.visible = false;
    sur.orb = node(sur.g, 0, 1.3, 0);
    part(sur.orb, 'bead', 0xffc83a, 0, 0, 0, 0.45, 0.45, 0.45); sur.glowN = part(sur.orb, 'bead', 0xffe28a, 0, 0, 0, 0.7, 0.7, 0.7, 0, 0, 0, 'glow');
    for (var ss = 0; ss < 5; ss++) { var st = part(sur.orb, 'star', 0xffd24a, Math.sin(ss * TAU / 5) * 0.8, Math.cos(ss * TAU / 5) * 0.8, 0, 0.16, 0.16, 0.16); sur.stars.push(st); }
    sur.orbMark = node(sur.g, 0, 0.05, 0); part(sur.orbMark, 'torus', GOLD, 0, 0, 0, 1.3, 1.3, 1.3, PI / 2);
    sur.buddyG = node(c.root, 0, -50, 0); sur.buddyG.visible = false;
    sur.buddyInner = node(sur.buddyG, 0, 0, 0); animal(sur.buddyInner, TH.animal, 1.25);
    sur.stampG = node(c.root, 0, -50, 0); sur.stampG.visible = false;
    part(sur.stampG, 'box', 0xfff6e0, 0, 0, 0, 1.2, 1.2, 0.1); part(sur.stampG, 'box', flag[0], 0, 0.28, 0.06, 0.95, 0.24, 0.05); part(sur.stampG, 'box', flag[1 % flag.length], 0, 0, 0.065, 0.95, 0.24, 0.05); part(sur.stampG, 'box', flag[2 % flag.length], 0, -0.28, 0.06, 0.95, 0.24, 0.05); part(sur.stampG, 'star', GOLD, 0, 0, 0.1, 0.24, 0.24, 0.24);

    // ---------- collect reactions, layered per activity ----------
    var dustRed = [0xd9c9a8, 0xe6dbc2];
    function react(i, t) {
      var x = t.x, z = t.z, n = NOTE[i % 5], hi = 1.3 + i * 0.14, col = function () { return n; };
      lastCollect = now; t.popAt = now; t.pulseAt = now;
      recolor(t.halo, GOLD, 1.0);
      ring(x, hi, z, 12, 2.6, 0.8, function (k) { return k % 2 ? n : WHITE; }, 0.8, 0.16);
      for (var d = 0; d < cnt(5); d++) dt_(x + (Math.random() - 0.5) * 0.6, hi, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8, 0.8, 0.45, n, 0, 1, 1);
      var k;
      switch (type) {
        case 'rings':
          for (k = 0; k < cnt(14); k++) { var a = k * 0.7; sp(x + Math.cos(a) * 0.9, 0.8 + k * 0.12, z + Math.sin(a) * 0.9, -Math.sin(a) * 1.6, 2.0, Math.cos(a) * 1.6, 1.0, 0.14, k % 3 ? GOLD : WHITE, 0.4, 0.4); }
          break;
        case 'flowers':
          for (k = 0; k < cnt(14); k++) cf(x, 1.2, z, (Math.random() - 0.5) * 3.4, 2.2 + Math.random() * 1.6, (Math.random() - 0.5) * 3.4, 1.6, 0.2, k % 2 ? t.color : 0xffffff, 1.6, 1.4);
          for (k = 0; k < cnt(6); k++) dt_(x, 1.5, z, (Math.random() - 0.5) * 1.6, 1 + Math.random(), (Math.random() - 0.5) * 1.6, 1.2, 0.22, 0xfff0a0, -0.2, 1.2, 1);
          break;
        case 'windmills':
          for (k = 0; k < cnt(14); k++) { var a2 = k * 0.62; cf(x + Math.cos(a2) * 0.6, 1.1 + k * 0.12, z + Math.sin(a2) * 0.6, -Math.sin(a2) * 3, 1.3, Math.cos(a2) * 3, 1.5, 0.17, k % 2 ? 0xdff6e0 : 0xffffff, 0.3, 0.5); }
          for (k = 0; k < 3; k++) later(k * 0.28, function () { ring(x, 1.6, z, 8, 1.6, 0.2, function () { return 0xeaf6ff; }, 0.9, 0.12); });
          break;
        case 'splashes':
          for (k = 0; k < cnt(18); k++) { var a3 = k / 18 * TAU, sd = 1.6 + Math.random() * 1.8; dt_(x, 0.4, z, Math.cos(a3) * sd, 4.4 + Math.random() * 2, Math.sin(a3) * sd, 1.1, 0.2, k % 2 ? 0x8ce4ff : 0xe8fbff, 9.8, 0.3, 0); }
          for (k = 0; k < cnt(8); k++) sp(x, 0.8, z, (Math.random() - 0.5) * 3, 3.4 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.9, 0.13, WHITE, 8, 0.2);
          break;
        case 'kites':
          for (k = 0; k < cnt(12); k++) cf(x, 1.6 + k * 0.1, z, (k % 2 ? 1 : -1) * (0.5 + Math.random()), 2.6 + Math.random(), -0.4 + Math.random() * 0.5, 1.7, 0.2, flagColor(k) , 0.9, 1.3);
          for (k = 0; k < cnt(6); k++) sp(x, 2 + k * 0.3, z, (Math.random() - 0.5) * 1.5, 1.2, (Math.random() - 0.5), 1.1, 0.14, WHITE, 0, 0.8);
          break;
        case 'balls':
          for (var bi = 0; bi < 3; bi++) (function (bi2) { later(bi2 * 0.28 + 0.1, function () { for (var q2 = 0; q2 < cnt(7); q2++) { var aa = Math.random() * TAU; dt_(x + Math.sin(aa) * 0.3, 0.12, z - bi2 * 0.55 + Math.cos(aa) * 0.3, Math.sin(aa) * 1.1, 0.5 + Math.random() * 0.5, Math.cos(aa) * 1.1 - 0.3, 0.7, 0.4, TH.ice ? 0xeaf6ff : dustRed[q2 % 2], 0, 2.5, 1); } }); })(bi);
          if (TH.ice) for (k = 0; k < cnt(16); k++) { (function (kk) { later(kk * 0.04, function () { sp(x + (Math.random() - 0.5) * 0.4, 0.18, z - kk * 0.11 - 0.2, (Math.random() - 0.5), 0.8 + Math.random(), -0.4, 0.8, 0.12, kk % 2 ? 0xdff6ff : WHITE, 3, 0.8); }); })(k); }
          break;
        case 'butterflies':
          for (k = 0; k < cnt(12); k++) sp(x + (Math.random() - 0.5) * 0.8, 1.4 + Math.random() * 0.8, z + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, -0.2 - Math.random() * 0.4, (Math.random() - 0.5) * 0.8, 1.5, 0.12, k % 2 ? 0xffe8a0 : n, 0.2, 0.6);
          break;
        case 'music':
          for (k = 0; k < cnt(9); k++) dt_(x + (Math.random() - 0.5) * 1.5, 1.2, z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.8, 1.7 + Math.random(), 0, 1.4, 0.34, NOTE[(i + k) % 5], 0, 0.6, 1);
          for (k = 0; k < 3; k++) later(k * 0.2, function () { ring(x, 1.6, z, 10, 1.4 + k * 0.3, 0, function () { return n; }, 0.7, 0.12); });
          break;
        case 'train':
          for (k = 0; k < cnt(7); k++) (function (kk) { later(kk * 0.1, function () { dt_(x, 1.8, z - 0.45, (Math.random() - 0.5) * 0.5, 1.1 + Math.random() * 0.4, 0, 1.3, 0.5, WHITE, 0, 0.4, 1); }); })(k);
          for (k = 0; k < cnt(8); k++) sp(x + (k % 2 ? 0.7 : -0.7), 0.35, z + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 1.2, (Math.random() - 0.5) * 2, 0.6, 0.1, GOLD, 4, 0.5);
          break;
        case 'painting':
          for (k = 0; k < cnt(16); k++) dt_(x, 1.6, z, (Math.random() - 0.5) * 3.4, 1 + Math.random() * 2.4, (Math.random() - 0.5) * 2.2, 1.2, 0.26, NOTE[(i + k) % 5], 6, 0.3, 0);
          break;
        case 'lanterns':
          for (k = 0; k < cnt(12); k++) sp(x + (Math.random() - 0.5) * 1.2, 1 + Math.random(), z + (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.4, 1.0 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, 2.0, 0.11, k % 2 ? 0xffe9a0 : 0xffb066, -0.15, 0.6);
          break;
        case 'picnic':
          for (k = 0; k < cnt(8); k++) dt_(x + (Math.random() - 0.5), 1.2, z + (Math.random() - 0.5), (Math.random() - 0.5) * 0.7, 1.2 + Math.random() * 0.6, 0, 1.4, 0.34, k % 2 ? 0xffb04f : 0xffe14f, 0, 0.6, 1);
          for (k = 0; k < cnt(7); k++) cf(x, 1.0, z, (Math.random() - 0.5) * 2.8, 2.0 + Math.random(), (Math.random() - 0.5) * 2.8, 1.4, 0.16, flagColor(k), 1.6, 1.3);
          break;
      }
      // sound-reactive: higher notes lift a taller shaft of light
      for (k = 0; k < cnt(4 + i); k++) sp(x, 0.4 + k * 0.45, z, 0, 0.3, 0, 0.7, 0.13, k % 2 ? n : WHITE, 0, 0.5);
      if (i < comps.length) { comps[i].on = now; comps[i].x = hx; comps[i].z = hz; comps[i].y = 1.0; comps[i].g.visible = true; }
    }

    // ---------- finale ----------
    function polyAt(s, out) {
      var L = pathLen.total || 1, d = Math.max(0, Math.min(1, s)) * L, i = 1;
      while (i < pathLen.length - 1 && pathLen[i] < d) i++;
      var a = pathPts[i - 1], b = pathPts[i], seg = pathLen[i] - pathLen[i - 1] || 1, u = (d - pathLen[i - 1]) / seg;
      out.x = a.x + (b.x - a.x) * u; out.z = a.z + (b.z - a.z) * u; out.tx = (b.x - a.x) / seg; out.tz = (b.z - a.z) / seg;
    }
    var pp = { x: 0, z: 0, tx: 0, tz: 1 };
    function startFinale(res) {
      completeAt = now; finale = { kind: fKind, t0: now, fired: 0 };
      var lastT = targets.length ? targets[targets.length - 1] : { x: cx, z: cz };
      var f1 = flagColor(0), f2 = flagColor(1), f3 = flagColor(2), top = Math.max(7.5, pr * 0.9 + 3.5);
      if (fKind === 'fireworks') {
        var cols = TH.ice ? [[0xdff6ff, 0x9fd8ff], [WHITE, 0xbfe9ff], [0x9fd8ff, 0xe8f4ff]] : [[f1, WHITE], [f2, f3], [f3, f1]];
        for (var b = 0; b < 6; b++) (function (bi) {
          later(0.2 + bi * 0.46, function () {
            // seen from the play camera: a little behind and above the child, so the show is always on screen
            var a = bi * 2.1, mx = (hx + cx) / 2 - 3, mz = (hz + cz) / 2 - 5, bx = mx + Math.sin(a) * (3.5 + bi % 2 * 2.5), bz = mz + Math.cos(a) * 2.5, by = 5.2 + (bi % 3) * 1.3, cc = cols[bi % 3];
            sphereBurst(bx, by, bz, 34, 7.5, cc[0], cc[1], 1.7, 0.32);
            sphereBurst(bx, by, bz, 12, 3.2, WHITE, cc[0], 1.3, 0.22);
            for (var u = 0; u < cnt(8); u++) dt_(bx, by, bz, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.7, 0.9, cc[0], 0, 0.6, 1);
            chime(bi % 5);
          });
        })(b);
      } else if (fKind === 'cannon') {
        var srcs = [{ x: hx - 3.8, z: hz + 2.6 }, { x: hx + 3.8, z: hz - 2.6 }, { x: hx - 1, z: hz - 4.2 }];
        for (var cb = 0; cb < 4; cb++) (function (bi) {
          later(0.15 + bi * 0.55, function () {
            var s = srcs[bi % srcs.length], dir = Math.atan2(hx - s.x, hz - s.z);
            for (var q = 0; q < cnt(26); q++) { var sp0 = 3 + Math.random() * 4, ang = dir + (Math.random() - 0.5) * 1.1;
              cf(s.x, 1.0, s.z, Math.sin(ang) * sp0 * 0.55, 5.5 + Math.random() * 4.5, Math.cos(ang) * sp0 * 0.55, 2.0, 0.26, q % 4 === 0 ? NOTE[q % 5] : flagColor(q), 5.5, 0.9); }
            for (var q3 = 0; q3 < cnt(10); q3++) sp(s.x, 1.0, s.z, (Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4, 1.0, 0.18, q3 % 2 ? GOLD : WHITE, 6, 0.8);
            chime(bi % 5);
          });
        })(cb);
      } else if (fKind === 'bloom') {
        for (var bl = 0; bl < blooms.length; bl++) (function (o) {
          later(0.1 + o.at, function () {
            o.g.visible = true; o.born = now;
            for (var p = 0; p < cnt(5); p++) cf(o.x, 0.6, o.z, (Math.random() - 0.5) * 2.4, 2.0 + Math.random() * 1.4, (Math.random() - 0.5) * 2.4, 1.5, 0.18, p % 2 ? o.col : 0xffffff, 1.8, 1.2);
            if (Math.random() < 0.4) sp(o.x, 0.7, o.z, 0, 1.2, 0, 0.7, 0.12, GOLD, 0, 0.4);
          });
        })(blooms[bl]);
        for (var bn = 0; bn < 4; bn++) (function (bi) { later(bi * 0.7, function () { chime(bi % 5); }); })(bn);
      } else if (fKind === 'rainbow') {
        for (var r = 0; r < arcs.length; r++) arcs[r].userData.born = now + 0.15 + r * 0.17;
        for (var rn = 0; rn < 3; rn++) (function (bi) { later(0.3 + bi * 0.55, function () { chime(bi * 2 % 5); }); })(rn);
      } else if (fKind === 'lanterns') {
        for (var lx = 0; lx < lants.length; lx++) { lants[lx].born = now + 0.1 + lants[lx].at; lants[lx].cx = lastT.x; lants[lx].cz = lastT.z; }
        for (var ln = 0; ln < 3; ln++) (function (bi) { later(bi * 0.8, function () { chime((bi * 2) % 5); }); })(ln);
      } else if (fKind === 'parade') {
        // the little animals trot a circle around Feza (always on screen, always on ground she just cleared)
        pathPts = []; var pr0 = 3.3; for (var cp = 0; cp <= 24; cp++) { var ca = cp / 24 * TAU * 1.4; pathPts.push({ x: hx + Math.cos(ca) * pr0, z: hz + Math.sin(ca) * pr0 }); }
        var tot = 0; pathLen = [0]; for (var pl = 1; pl < pathPts.length; pl++) { tot += Math.hypot(pathPts[pl].x - pathPts[pl - 1].x, pathPts[pl].z - pathPts[pl - 1].z); pathLen.push(tot); } pathLen.total = tot;
        for (var pa = 0; pa < parade.length; pa++) parade[pa].g.visible = false;
        for (var pn = 0; pn < 4; pn++) (function (bi) { later(0.1 + bi * 0.6, function () { chime(bi % 5); }); })(pn);
      }
      // country ambience over the whole finale
      for (var amb = 0; amb < cnt(18); amb++) (function (kk) {
        later(kk * 0.16, function () { trailSpark(hx - 3 + (Math.random() - 0.5) * 12, 4.5 + Math.random() * 2.5, hz - 3 + (Math.random() - 0.5) * 9, 0, true); });
      })(amb);
      // maybe a rare, gentle surprise (never a failure state)
      var want = c.options.surprise;
      if (want === undefined || want === null) want = Math.random() < 0.22;
      if (want) {
        var kinds = ['golden', 'buddy', 'stamp'], pick = typeof want === 'string' ? want : kinds[(hash((cid || '') + (place && place.id || '') + type) + Math.floor(Math.random() * 3)) % 3];
        // choose the free route point nearest the child that is not right under their feet
        var best = null, bd = Infinity;
        for (var tp = 0; tp < targets.length; tp++) { var dd = Math.hypot(targets[tp].x - hx, targets[tp].z - hz); if (dd > 4.5 && dd < bd) { bd = dd; best = targets[tp]; } }
        if (!best) best = targets[0] || { x: cx, z: cz };
        surprise = { kind: pick, x: best.x, z: best.z, t0: now + 1.1, state: 0, grow: 0, angle: 0, lastA: 0, have: false, follow: 0, travelled: 0, vis: 0 };
        holdSeconds = 9;
      }
    }

    function trailSpark(x, y, z, kindBoost, drift) {
      var s = TH.spark, up = drift ? -0.8 : 0.6;
      if (s === 'petal') cf(x, y, z, (Math.random() - 0.5) * 0.8, drift ? -0.6 : 0.8, (Math.random() - 0.5) * 0.8, 1.4, 0.17, Math.random() < 0.5 ? 0xffb7c8 : 0xfff0f4, 0.35, 1.2);
      else if (s === 'leaf') cf(x, y, z, (Math.random() - 0.5) * 0.8, drift ? -0.6 : 0.8, (Math.random() - 0.5) * 0.8, 1.4, 0.18, Math.random() < 0.5 ? 0xe5484d : 0xff9a3c, 0.35, 1.2);
      else if (s === 'sand') dt_(x, drift ? y : 0.12, z, (Math.random() - 0.5) * 0.8, drift ? -0.5 : 0.4, (Math.random() - 0.5) * 0.8, 1.0, 0.3, Math.random() < 0.5 ? 0xe8c98a : 0xf5deb0, 0, 1.2, 1);
      else if (s === 'water') dt_(x, drift ? y : 0.18, z, (Math.random() - 0.5) * 0.6, drift ? -0.5 : 1.4, (Math.random() - 0.5) * 0.6, 0.8, 0.18, Math.random() < 0.5 ? 0x8ce4ff : 0xe8fbff, drift ? 0 : 5, 0.4, 0);
      else if (s === 'snow') sp(x, y, z, (Math.random() - 0.5) * 0.6, drift ? -0.6 : 0.5, (Math.random() - 0.5) * 0.6, 1.1, 0.12, Math.random() < 0.5 ? WHITE : 0xcfeeff, 0.1, 0.6);
      else if (s === 'confetti') cf(x, y, z, (Math.random() - 0.5) * 0.8, drift ? -0.6 : 0.9, (Math.random() - 0.5) * 0.8, 1.2, 0.17, flagColor((Math.random() * 4) | 0), 0.35, 1.2);
      else if (s === 'star') sp(x, y, z, (Math.random() - 0.5) * 0.6, drift ? -0.5 : 0.6, (Math.random() - 0.5) * 0.6, 0.9, 0.14, Math.random() < 0.5 ? GOLD : WHITE, 0.2, 0.6);
      else dt_(x, y, z, (Math.random() - 0.5) * 0.6, drift ? -0.4 : 0.5, (Math.random() - 0.5) * 0.6, 0.9, 0.2, NOTE[(Math.random() * 5) | 0], 0, 0.6, 1);
    }

    // ---------- surprise logic ----------
    function stepSurprise(dt) {
      var s = surprise; if (!s || s.state >= 2) return;
      if (now < s.t0) return;
      if (s.state === 0) { s.state = 1; s.born = now; sur.g.position.set(s.x, 0, s.z); ring(s.x, 1.2, s.z, 14, 2.4, 1, function (k) { return k % 2 ? GOLD : WHITE; }, 0.9, 0.16); if (s.kind === 'buddy') { sur.buddyG.position.set(s.x, 0, s.z); } if (s.kind === 'stamp') { sur.stampG.position.set(s.x, 0.9, s.z); } }
      var d = Math.hypot(hx - s.x, hz - s.z), age = now - s.born;
      if (s.kind === 'golden') {
        // running circles around it makes it grow; simply touching it is enough, too
        if (d > 1.6 && d < 8 && hspeed > 3) { var ang = Math.atan2(hz - s.z, hx - s.x), da = ang - s.lastA; if (da > PI) da -= TAU; if (da < -PI) da += TAU; if (s.have) s.angle += Math.abs(da); s.lastA = ang; s.have = true; } else s.have = false;
        var target = Math.min(1, s.angle / (PI * 3.2));
        s.grow += (target - s.grow) * Math.min(1, dt * 6);
        if (Math.random() < dt * 8 * (0.3 + s.grow)) sp(s.x + (Math.random() - 0.5) * 1.6, 0.8 + Math.random() * 1.8, s.z + (Math.random() - 0.5) * 1.6, 0, 0.6, 0, 0.9, 0.12, GOLD, 0, 0.5);
        if (d < 2.0 || s.grow > 0.97) win(s, 'golden');
      } else if (s.kind === 'buddy') {
        if (age > 0.4) {
          var bx = sur.buddyG.position.x, bz = sur.buddyG.position.z, gap = Math.hypot(hx - bx, hz - bz);
          if (gap > 2.4) { var sp2 = Math.min(gap - 2.2, dt * 9); bx += (hx - bx) / gap * sp2; bz += (hz - bz) / gap * sp2; sur.buddyG.position.x = bx; sur.buddyG.position.z = bz; s.travelled += sp2; }
          if (gap < 4.5) s.follow += dt * (hspeed > 2 ? 1 : 0.4);
          if (Math.random() < dt * 6) dt_(bx, 0.15, bz, (Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4, 0.6, 0.3, 0xffffff, 0, 1.5, 1);
          if (s.follow > 3.2 && s.travelled > 6) win(s, 'buddy');
        }
      } else if (s.kind === 'stamp') {
        if (Math.random() < dt * 14) sp(s.x + (Math.random() - 0.5) * 0.8, 0.2, s.z + (Math.random() - 0.5) * 0.8, 0, 1.2 + Math.random(), 0, 1.0, 0.13, Math.random() < 0.5 ? GOLD : WHITE, 0, 0.4);
        if (d < 2.6) win(s, 'stamp');
      }
      if (s.state === 2) return;
    }
    function win(s, kind) {
      s.state = 2; s.won = now;
      sphereBurst(s.kind === 'buddy' ? sur.buddyG.position.x : s.x, 2, s.kind === 'buddy' ? sur.buddyG.position.z : s.z, 30, 4, GOLD, flagColor(0), 1.4, 0.2);
      for (var k = 0; k < cnt(14); k++) cf(s.x, 1.5, s.z, (Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4, 1.8, 0.24, flagColor(k), 5, 1);
      chime(2, true); later(0.22, function () { chime(4, true); });
      awarded = (cid + ':' + (place && place.id || type) + ':' + kind);
      if (window.FLASH_ACTIVITIES && window.FLASH_ACTIVITIES.stickers) window.FLASH_ACTIVITIES.stickers[awarded] = { country: cid, place: place && place.id, kind: kind, type: type };
      pendingSticker = awarded; holdSeconds = 0;
    }
    var pendingSticker = null;

    // ---------- per-frame logic ----------
    function step(dt, time, pos, speed, res) {
      if (!started) { started = true; dots.keepVisible = sparks.keepVisible = conf.keepVisible = false; }
      now += dt;
      if (pos) {
        phx = haveHero ? hx : pos.x; phz = haveHero ? hz : pos.z; hx = pos.x; hz = pos.z; haveHero = true;
        if (dt > 0) { hvx = (hx - phx) / dt; hvz = (hz - phz) / dt; }
        hspeed = Math.hypot(hvx, hvz); if (typeof speed === 'number' && speed > hspeed) hspeed = speed;
      }
      for (var e = events.length - 1; e >= 0; e--) if (events[e].t <= now) { var fn = events[e].fn; events.splice(e, 1); fn(); }
      if (haveHero && dt > 0) {
        // gentle jump pads (auto) and sparkle gates; neither changes speed or can fail
        for (var i = 0; i < pads.length; i++) {
          var p = pads[i];
          if (p.kind === 'jump') {
            if (now - p.at > 1.2 && Math.hypot(hx - p.x, hz - p.z) < 1.25) {
              p.at = now; if (!gentle) { hopAt = now; hopAmp = 0.9; }
              ring(p.x, 0.3, p.z, 12, 2.2, 1.6, function (k) { return k % 2 ? p.col : WHITE; }, 0.8, 0.15);
              for (var q = 0; q < cnt(5); q++) trailSpark(p.x + (Math.random() - 0.5), 0.5, p.z + (Math.random() - 0.5), 0, false);
              chime(p.i % 5);
            }
          } else {
            var side = (hx - p.x) * -p.dz + (hz - p.z) * p.dx, prev = (phx - p.x) * -p.dz + (phz - p.z) * p.dx, along = (hx - p.x) * p.dx + (hz - p.z) * p.dz;
            if (now - p.at > 1.5 && ((side >= 0) !== (prev >= 0)) && Math.abs(along) < 1.5) {
              p.at = now; boostUntil = now + 1.6;
              for (var s2 = 0; s2 < cnt(16); s2++) { var lat = (Math.random() - 0.5) * 2.4; cf(p.x + (-p.dz) * lat, 0.7 + Math.random() * 0.8, p.z + p.dx * lat, p.dx * (3 + Math.random() * 3), 1 + Math.random(), p.dz * (3 + Math.random() * 3), 1.2, 0.24, flagColor(s2), 1.5, 1.4); }
              ring(p.x, 1.1, p.z, 10, 1.8, 0.4, function (k) { return k % 2 ? GOLD : WHITE; }, 0.7, 0.15);
              chime(p.i % 5);
            }
          }
        }
        // trail effect: little theme sparkles at Feza's feet while running
        if (!gentle && hspeed > 5.5) {
          trailAcc += dt * (now < boostUntil ? 40 : 14);
          while (trailAcc >= 1) { trailAcc -= 1; trailSpark(hx - hvx * 0.03 + (Math.random() - 0.5) * 0.5, 0.35 + Math.random() * 0.5, hz - hvz * 0.03 + (Math.random() - 0.5) * 0.5, 0, false); }
        }
        // props react when Feza runs past: a little hop and a theme sparkle
        for (var pi3 = 0; pi3 < props.length; pi3++) {
          var pr2 = props[pi3], near = Math.hypot(hx - pr2.x, hz - pr2.z) < 2.7;
          if (near && !pr2.near && now - pr2.hop > 1.4) { pr2.hop = now; for (var q4 = 0; q4 < cnt(3); q4++) trailSpark(pr2.x, 0.9, pr2.z, 0, false); }
          pr2.near = near;
        }
      }
      stepSurprise(dt);
      var camQuat = cam ? cam.quaternion : camQ;
      dots.update(dt, camQuat); sparks.update(dt, camQuat); conf.update(dt, camQuat);
      if (pendingSticker) { res.sticker = pendingSticker; pendingSticker = null; }
    }

    // ---------- transforms (called each frame before matrices are baked) ----------
    var tmpPath = { x: 0, z: 0, tx: 0, tz: 1 };
    function animate(dt, time) {
      var i, k, t, ph = time * motion;
      // target squash/stretch + halo
      for (i = 0; i < targets.length; i++) {
        t = targets[i]; var ap = now - t.popAt, e = t.collected ? ap : -1;
        if (e >= 0 && e < 1) {
          var s = pop(e / 0.9), wob = Math.exp(-6 * e) * Math.sin(e * 16);
          t.body.scale.set(1 - wob * 0.16, 1 + wob * 0.28, 1 - wob * 0.16);
        } else t.body.scale.set(1, 1, 1);
        var breathe = 1.55 + Math.sin(ph * 2 + i) * 0.05 * motion, pulse = t.collected ? ap : -1;
        t.halo.scale.set(pulse >= 0 && pulse < 0.9 ? breathe + 1.8 * Math.sin(pulse / 0.9 * PI) : breathe * (t.collected ? 0.9 : 1), 0.03, pulse >= 0 && pulse < 0.9 ? breathe + 1.8 * Math.sin(pulse / 0.9 * PI) : breathe * (t.collected ? 0.9 : 1));
        t.halo.scale.y = 0.03;
      }
      // props: idle sway, hop when Feza is near
      for (i = 0; i < props.length; i++) {
        var p = props[i], ho = now - p.hop, sw = Math.sin(ph * 1.6 + p.ph);
        if (p.kind === 'koi') { p.inner.position.set(Math.sin(ph * 0.9 + p.ph) * 0.3, 0.14, Math.cos(ph * 0.9 + p.ph) * 0.3); p.inner.rotation.y = ph * 0.9 + p.ph + PI / 2; }
        else if (p.kind === 'balloon') p.g.position.y = Math.sin(ph * 1.2 + p.ph) * 0.18;
        else if (p.kind === 'boat' || p.kind === 'buoy') { p.g.position.y = Math.sin(ph * 1.5 + p.ph) * 0.05; p.g.rotation.z = sw * 0.06; }
        else p.g.rotation.z = sw * 0.05 * motion;
        if (ho >= 0 && ho < 0.7) { var hh = Math.sin(ho / 0.7 * PI), sq = Math.exp(-5 * ho) * Math.sin(ho * 18); p.g.scale.set(1 - sq * 0.12, 1 + hh * 0.18 + sq * 0.12, 1 - sq * 0.12); p.g.position.y += hh * 0.25 * motion; }
        else p.g.scale.set(1, 1, 1);
      }
      // companions
      var circle = compKind === 'duck' || compKind === 'scarab' ? 0 : 1;
      for (i = 0; i < comps.length; i++) {
        var cm = comps[i];
        if (cm.on < 0 || !haveHero) { cm.g.visible = false; continue; }
        cm.g.visible = true; var born = now - cm.on, a2 = ph * (1.5 + i * 0.12) + i * TAU / 5, gx, gz, gy;
        if (compKind === 'duck' || compKind === 'scarab') {
          var back = 1.3 + i * 0.85, bl = hspeed > 0.5 ? Math.hypot(hvx, hvz) : 1, dx = hspeed > 0.5 ? hvx / bl : Math.sin(cm.fa || 0), dz = hspeed > 0.5 ? hvz / bl : Math.cos(cm.fa || 0);
          if (hspeed > 0.5) cm.fa = Math.atan2(hvx, hvz);
          gx = hx - dx * back + Math.sin((cm.fa || 0) + PI / 2) * (i % 2 ? 0.5 : -0.5); gz = hz - dz * back + Math.cos((cm.fa || 0) + PI / 2) * (i % 2 ? 0.5 : -0.5); gy = 0;
        } else {
          var r = (compKind === 'bird' ? 2.3 : 1.45) + i * 0.16; gx = hx + Math.cos(a2) * r; gz = hz + Math.sin(a2) * r; gy = (compKind === 'bird' ? 2.6 : 1.25) + Math.sin(ph * 2 + i) * 0.25 + i * 0.12;
        }
        var kk = born < 0.05 ? 1 : 1 - Math.exp(-dt * 5);
        cm.x += (gx - cm.x) * kk; cm.z += (gz - cm.z) * kk; cm.y += (gy - cm.y) * kk;
        var vxm = gx - cm.x, vzm = gz - cm.z;
        if (compKind === 'duck' || compKind === 'scarab') { cm.g.rotation.y = cm.fa || 0; cm.g.rotation.z = Math.sin(ph * 9 + i * 2) * 0.16; cm.y += Math.abs(Math.sin(ph * 9 + i * 2)) * (hspeed > 1 ? 0.1 : 0.02); }
        else { cm.g.rotation.y = Math.atan2(-Math.sin(a2), Math.cos(a2)) + PI / 2 * 0; }
        cm.g.position.set(cm.x, cm.y + (compKind === 'duck' || compKind === 'scarab' ? Math.abs(Math.sin(ph * 9 + i * 2)) * (hspeed > 1 ? 0.1 : 0.02) : 0), cm.z);
        var sc = pop(born / 0.5); cm.g.scale.setScalar(Math.max(0.01, sc) * (compKind === 'scarab' ? 0.8 : 1));
        for (k = 0; k < cm.wings.length; k++) cm.wings[k].rotation.y = (k ? -1 : 1) * (0.2 + (Math.sin(ph * 16 + i) + 1) * 0.5);
        if (compKind === 'wisp' && Math.random() < dt * 10) dots.spawn(cm.x, cm.y, cm.z, 0, 0.1, 0, 0.5, 0.3, NOTE[i], 0, 0, 1, 0);
        if (compKind === 'butterfly' && Math.random() < dt * 3) sp(cm.x, cm.y, cm.z, 0, -0.3, 0, 0.8, 0.07, NOTE[i], 0.2, 0.4);
      }
      // finale
      if (finale) {
        var tf = now - finale.t0;
        if (finale.kind === 'rainbow') {
          for (i = 0; i < arcs.length; i++) {
            var a = arcs[i], b = a.userData.born !== undefined ? now - a.userData.born : -1, R = Math.max(7, pr * 0.85 + 3.2) - i * 0.5;
            if (b < 0) { a.visible = false; continue; }
            var g = pop(b / 0.9), out = tf > 3.4 ? 1 - smooth((tf - 3.4) / 0.6) : 1;
            a.visible = out > 0.01; var sc2 = Math.max(0.001, g * out);
            a.scale.set(R * sc2, R * sc2, R * sc2 * 0.6); a.position.set(cx, 0, cz - 2.5);
            if (b < 1 && Math.random() < dt * 9) { var aa = Math.random() * PI; sp(cx + Math.cos(aa) * R, Math.sin(aa) * R, cz - 2.5, 0, -0.3, 0, 0.8, 0.12, RAINBOW[i], 0, 0.5); }
          }
        } else if (finale.kind === 'bloom') {
          for (i = 0; i < blooms.length; i++) { var o = blooms[i]; if (o.born === undefined) continue; var bb = now - o.born; var gg = pop(bb / 0.7); gg *= 1.7; o.g.scale.set(gg, gg * (1 + Math.exp(-5 * bb) * Math.sin(bb * 16) * 0.2), gg); o.g.rotation.y = Math.sin(ph + i) * 0.1; if (tf > 3.7) o.g.scale.multiplyScalar(Math.max(0.01, 1 - (tf - 3.7) * 2)); }
        } else if (finale.kind === 'lanterns') {
          for (i = 0; i < lants.length; i++) {
            var L = lants[i], lb = now - L.born; if (lb < 0) { L.g.visible = false; continue; }
            var rise = smooth(lb / 3.2); L.g.visible = tf < 3.9; var ls = pop(lb / 0.5) * (tf > 3.3 ? Math.max(0.01, 1 - (tf - 3.3) / 0.6) : 1);
            L.g.scale.setScalar(Math.max(0.01, ls)); L.g.position.set(L.cx + Math.cos(L.ang + lb * 0.5) * L.rad + Math.sin(lb * 1.3 + L.ang) * 0.5, 1 + rise * 8.5, L.cz + Math.sin(L.ang + lb * 0.5) * L.rad);
            L.g.rotation.z = Math.sin(lb * 1.4 + i) * 0.1;
            if (Math.random() < dt * 5 && lb > 0.3) sp(L.g.position.x, L.g.position.y - 0.3, L.g.position.z, 0, -0.2, 0, 0.8, 0.09, 0xffd070, 0, 0.5);
          }
        } else if (finale.kind === 'parade') {
          var travel = 3.3;
          for (i = 0; i < parade.length; i++) {
            var an = parade[i], u = (tf - 0.05) / travel - an.off * 1.3; if (u < 0 || u > 1.02) { an.g.visible = false; continue; }
            an.g.visible = true; polyAt(u, tmpPath);
            var bob = Math.abs(Math.sin(tf * 9 + an.ph));
            an.g.position.set(tmpPath.x, 0, tmpPath.z); an.g.rotation.y = Math.atan2(tmpPath.tx, tmpPath.tz);
            an.inner.position.y = bob * 0.3; an.inner.rotation.z = Math.sin(tf * 9 + an.ph) * 0.12; an.inner.scale.set(1 + (1 - bob) * 0.08, 1 - (1 - bob) * 0.1, 1 + (1 - bob) * 0.08);
            if (bob < 0.12 && Math.random() < dt * 14) dt_(tmpPath.x, 0.1, tmpPath.z, (Math.random() - 0.5) * 0.7, 0.4, (Math.random() - 0.5) * 0.7, 0.6, 0.32, 0xffffff, 0, 1.5, 1);
            if (Math.random() < dt * 5) sp(tmpPath.x, 1.0 + Math.random() * 0.6, tmpPath.z, 0, 0.8, 0, 0.8, 0.11, NOTE[i % 5], 0, 0.4);
          }
        }
        if (tf > 4.8) finale.kind = 'done';
      }
      // pads
      for (i = 0; i < pads.length; i++) {
        var pd = pads[i], pa = now - pd.at;
        if (pd.kind === 'jump') { var sq2 = pa >= 0 && pa < 0.8 ? Math.exp(-5 * pa) * Math.sin(pa * 18) : 0; pd.dome.scale.set(0.62 * (1 + sq2 * 0.2), 0.16 * (1 - sq2 * 1.1 + Math.sin(ph * 2 + i) * 0.1), 0.62 * (1 + sq2 * 0.2)); }
        else { for (k = 0; k < pd.rib.length; k++) pd.rib[k].position.y = Math.sin(ph * 4 + k) * 0.03 + (pa >= 0 && pa < 0.6 ? Math.sin(pa / 0.6 * PI) * 0.18 : 0); }
      }
      // surprise visuals
      sur.g.visible = false; sur.buddyG.visible = false; sur.stampG.visible = false;
      if (surprise && surprise.state >= 1) {
        var s = surprise, age = now - s.born, appear = pop(age / 0.7), gone = s.state === 2 ? Math.max(0, 1 - (now - s.won) / 0.4) : 1;
        if (s.kind === 'golden') {
          sur.g.visible = gone > 0.01; var gs = (0.7 + s.grow * 1.5) * appear * gone;
          sur.orb.scale.setScalar(Math.max(0.01, gs * (1 + Math.sin(ph * 5) * 0.05))); sur.orb.position.y = 1.3 + gs * 0.5 + Math.sin(ph * 2) * 0.12;
          sur.orbMark.rotation.y = ph; sur.orbMark.scale.setScalar(Math.max(0.01, appear * gone));
          for (k = 0; k < sur.stars.length; k++) { var sr = sur.stars[k].userData.activityRecord; sur.stars[k].rotation.z = ph * 2 + k; }
        } else if (s.kind === 'buddy') {
          sur.buddyG.visible = gone > 0.01 || s.state < 2;
          var moving = hspeed > 1, hop = Math.abs(Math.sin(ph * 8)) * (moving ? 0.35 : 0.1) + (s.state === 2 ? Math.abs(Math.sin((now - s.won) * 10)) * 0.8 : 0);
          sur.buddyInner.position.y = hop; sur.buddyG.scale.setScalar(Math.max(0.01, appear * (s.state === 2 ? Math.max(0.01, 1 - Math.max(0, now - s.won - 1.0) / 0.5) : 1)));
          sur.buddyG.rotation.y = Math.atan2(hx - sur.buddyG.position.x, hz - sur.buddyG.position.z); sur.buddyInner.rotation.z = Math.sin(ph * 8) * 0.1;
        } else if (s.kind === 'stamp') {
          sur.stampG.visible = true;
          if (s.state === 1) { sur.stampG.position.y = 0.9 + Math.sin(ph * 2) * 0.12; sur.stampG.scale.setScalar(Math.max(0.01, appear * 0.55)); sur.stampG.rotation.y = ph * 1.2; }
          else { var w = now - s.won; sur.stampG.position.set(s.x, 0.9 + w * 3.2, s.z); sur.stampG.rotation.y = ph * 4; sur.stampG.scale.setScalar(Math.max(0.01, 0.55 + Math.sin(Math.min(1, w) * PI) * 0.6) * Math.max(0.01, 1 - Math.max(0, w - 1.4) / 0.4)); sur.stampG.visible = w < 1.9; }
        }
      }
      // jump-pad hop: a gentle arc on top of Feza's normal height; written by update() into the hero position
    }
    function hopHeight() {
      var h = now - hopAt; if (h < 0 || h > 0.62) return 0; return Math.sin(h / 0.62 * PI) * hopAmp;
    }

    function reset() {
      now = 0; collected = 0; events.length = 0; finale = null; surprise = null; awarded = null; pendingSticker = null; holdSeconds = 0; completeAt = -1; hopAt = -9; boostUntil = -1; haveHero = false;
      lastChime = lastCollect = -9; trailAcc = 0;
      dots.clear(); sparks.clear(); conf.clear();
      for (var i = 0; i < comps.length; i++) { comps[i].on = -9; comps[i].g.visible = false; comps[i].fa = 0; }
      for (i = 0; i < props.length; i++) { props[i].hop = -9; props[i].near = false; }
      for (i = 0; i < pads.length; i++) pads[i].at = -9;
      for (i = 0; i < blooms.length; i++) { blooms[i].g.visible = false; blooms[i].born = undefined; }
      for (i = 0; i < arcs.length; i++) { arcs[i].visible = false; arcs[i].userData.born = undefined; }
      for (i = 0; i < lants.length; i++) { lants[i].g.visible = false; lants[i].born = 1e9; }
      for (i = 0; i < parade.length; i++) parade[i].g.visible = false;
      for (i = 0; i < targets.length; i++) { targets[i].popAt = -9; targets[i].pulseAt = -9; targets[i].body.scale.set(1, 1, 1); }
    }
    function dispose() {
      if (disposed) return; disposed = true;
      dots.mesh.dispose(); sparks.mesh.dispose(); conf.mesh.dispose();
      dots.mesh.removeFromParent(); sparks.mesh.removeFromParent(); conf.mesh.removeFromParent();
      release(sh);
    }
    return {
      animate: animate, step: step, react: react, finale: function (res) { startFinale(res); }, reset: reset, dispose: dispose, hopHeight: hopHeight,
      get hold() { return holdSeconds; }, peek: function () { return surprise ? { kind: surprise.kind, x: surprise.x, z: surprise.z, state: surprise.state, grow: surprise.grow } : null; }, get theme() { return TH; }
    };
  }
  var PALETTE5 = [0xff7b8f, 0xffce55, 0x6ecdf1, 0xa68bf4, 0x75d5a0];

  window.FLASH_ACTIVITY_FX = { attach: attach, NOTE: NOTE, COUNTRY: COUNTRY, PLACE_THEME: PLACE_THEME, FINALE: FINALE, themeFor: themeFor };
}());
