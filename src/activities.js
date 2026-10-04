(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Koşu oyunları için grafik motoru yüklenemedi.');

  // The child only moves. These are generous, playful encounters rather than
  // tasks with a timer, a jump button, a required speed, or a losing condition.
  var TYPES = {
    music: { id: 'music', icon: 'music', title: 'Müzik bahçesi', voiceKey: 'activity-music', doneKey: 'activity-music-done' },
    train: { id: 'train', icon: 'train', title: 'Oyuncak tren', voiceKey: 'activity-train', doneKey: 'activity-train-done' },
    painting: { id: 'painting', icon: 'paint', title: 'Renkli resim', voiceKey: 'activity-painting', doneKey: 'activity-painting-done' },
    lanterns: { id: 'lanterns', icon: 'lantern', title: 'Fener şenliği', voiceKey: 'activity-lanterns', doneKey: 'activity-lanterns-done' },
    picnic: { id: 'picnic', icon: 'picnic', title: 'Ayıcık pikniği', voiceKey: 'activity-picnic', doneKey: 'activity-picnic-done' },
    rings: { id: 'rings', icon: 'ring', title: 'Hız halkaları', voiceKey: 'activity-rings' },
    flowers: { id: 'flowers', icon: 'flowers', title: 'Renkli çiçek yolu', voiceKey: 'activity-flowers' },
    windmills: { id: 'windmills', icon: 'windmills', title: 'Rüzgâr değirmenleri', voiceKey: 'activity-wind' },
    splashes: { id: 'splashes', icon: 'splash', title: 'Neşeli su sıçramaları', voiceKey: 'activity-splash' },
    kites: { id: 'kites', icon: 'kite', title: 'Uçurtma uçuralım', voiceKey: 'activity-balloons' },
    balls: { id: 'balls', icon: 'ball', title: 'Toplarla koşalım', voiceKey: 'activity-ball' },
    butterflies: { id: 'butterflies', icon: 'butterfly', title: 'Kelebek bahçesi', voiceKey: 'activity-butterflies' }
  };
  var PLACE_TYPES = {
    galata: 'windmills', bosphorus: 'splashes', cappadocia: 'kites',
    liberty: 'rings', brooklyn: 'kites', centralpark: 'flowers',
    niagara: 'splashes', cntower: 'windmills', hockey: 'balls',
    atomium: 'balls', grandplace: 'windmills', waffle: 'butterflies',
    eiffel: 'windmills', louvre: 'rings', seine: 'splashes',
    basils: 'flowers', kremlin: 'kites', redsquare: 'rings',
    fuji: 'kites', torii: 'butterflies', sakura: 'flowers',
    greatwall: 'windmills', heaven: 'kites', bamboo: 'butterflies',
    pyramids: 'windmills', sphinx: 'rings', nile: 'splashes',
    christ: 'butterflies', sugarloaf: 'kites', copacabana: 'balls'
  };
  var PALETTE = [0xff7b8f, 0xffce55, 0x6ecdf1, 0xa68bf4, 0x75d5a0, 0xffac64];
  var UP = new T.Vector3(0, 1, 0), TAU = Math.PI * 2;
  var CAPTURE_RADIUS = 2.4, REWARD_SECONDS = 1.8;
  var shared = null;

  function typeFor(country, place) {
    var id = typeof place === 'string' ? place : place && (place.id || place.kind);
    return (place && place.activityType) || PLACE_TYPES[id] || ({ falls: 'splashes', river: 'splashes', suspension: 'splashes', park: 'flowers', beach: 'balls', square: 'rings' })[id] || 'rings';
  }


  function choicesFor(country, place) {
    var original = typeFor(country, place), all = ['music', 'train', 'painting', 'lanterns', 'picnic'];
    var id = (country && country.id || '') + ':' + (place && place.id || place || '');
    var hash = 0; for (var i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return [all[hash % all.length], original, all[(hash + 2) % all.length]];
  }

  // A country prewarms the rotating activity choices for its three places. They share geometry and material GPU
  // resources, while each stage owns its instance buffers and logical poses.
  function acquire() {
    if (!shared) shared = { users: 0, geometry: new Map(), material: new Map() };
    shared.users++;
    return shared;
  }
  function release(pool) {
    pool.users--;
    if (pool.users !== 0) return;
    pool.geometry.forEach(function (g) { g.dispose(); });
    pool.material.forEach(function (m) { m.dispose(); });
    if (shared === pool) shared = null;
  }
  function shapeGeometry(kind) {
    var s = new T.Shape();
    if (kind === 'star') {
      for (var i = 0; i < 10; i++) {
        var a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.43 : 1;
        if (!i) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      return new T.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.045, bevelThickness: 0.035 });
    }
    if (kind === 'kite') {
      s.moveTo(0, 0.95); s.lineTo(0.67, 0); s.lineTo(0, -0.76); s.lineTo(-0.67, 0); s.closePath();
      return new T.ShapeGeometry(s);
    }
    // One rounded wing, mirrored for the other side. The lower lobe and broad
    // upper lobe give the insect a readable butterfly silhouette at a distance.
    s.moveTo(0, 0); s.bezierCurveTo(0.04, 0.50, 0.88, 0.92, 0.97, 0.40);
    s.bezierCurveTo(1.03, 0.11, 0.73, 0.01, 0.53, 0.02);
    s.bezierCurveTo(1.00, -0.18, 0.74, -0.71, 0.32, -0.45);
    s.bezierCurveTo(0.06, -0.27, 0.08, -0.09, 0, 0);
    return new T.ShapeGeometry(s, 12);
  }
  function geometry(pool, kind) {
    if (pool.geometry.has(kind)) return pool.geometry.get(kind);
    var g;
    if (kind === 'sphere') g = new T.SphereGeometry(1, 16, 10);
    else if (kind === 'cylinder') g = new T.CylinderGeometry(1, 1, 1, 16);
    else if (kind === 'cone') g = new T.ConeGeometry(1, 1, 16);
    else if (kind === 'box') g = new T.BoxGeometry(1, 1, 1);
    else if (kind === 'torus') g = new T.TorusGeometry(1, 0.065, 6, 32);
    else g = shapeGeometry(kind);
    pool.geometry.set(kind, g);
    return g;
  }
  function material(pool, kind) {
    if (pool.material.has(kind)) return pool.material.get(kind);
    var m;
    if (kind === 'glow') m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide });
    else if (kind === 'flat') m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, side: T.DoubleSide });
    else m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.06 });
    pool.material.set(kind, m);
    return m;
  }
  function smooth(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }

  function create(options) {
    options = options || {};
    var gentle = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var motion = gentle ? 0.25 : 1;
    var type = TYPES[options.type] ? options.type : typeFor(options.country, options.place);
    var points = (options.targets || []).map(function (p, i) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) throw new Error('Koşu hedefi ' + i + ' için geçerli bir konum gerekiyor.');
      return { x: p.x, z: p.z };
    });
    var root = new T.Group(); root.name = 'koşu-etkinliği-' + type;
    var pool = acquire(), batches = new Map(), targets = [], meshes = [];
    var elapsed = 0, count = 0, disposed = false, complete = points.length === 0, previous = null;
    var rootInverse = new T.Matrix4(), instanceMatrix = new T.Matrix4(), zero = new T.Matrix4().makeScale(0, 0, 0);
    var worldPoint = new T.Vector3(), vector = new T.Vector3();

    function node(parent, x, y, z) {
      var n = new T.Object3D(); n.position.set(x || 0, y || 0, z || 0); parent.add(n); return n;
    }
    function part(parent, kind, color, x, y, z, sx, sy, sz, rx, ry, rz, mat) {
      var n = node(parent, x, y, z);
      n.scale.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz);
      n.rotation.set(rx || 0, ry || 0, rz || 0);
      var key = kind + ':' + (mat || 'solid');
      if (!batches.has(key)) batches.set(key, { kind: kind, mat: mat || 'solid', records: [] });
      var batch = batches.get(key), record = { node: n, color: color, index: batch.records.length, batch: batch };
      batch.records.push(record); n.userData.activityRecord = record;
      return n;
    }
    function rod(parent, color, a, b, thickness) {
      var n = part(parent, 'cylinder', color, 0, 0, 0, thickness, 1, thickness);
      segment(n, a, b, thickness); return n;
    }
    function segment(n, a, b, thickness) {
      n.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      vector.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      var length = vector.length();
      n.scale.set(thickness, Math.max(0.001, length), thickness);
      if (length) n.quaternion.setFromUnitVectors(UP, vector.multiplyScalar(1 / length));
    }
    function pad(target) {
      target.markers = [];
      if (type === 'rings') {
        part(target.base, 'cylinder', target.color, 0, 0.035, 0, 1.43, 0.06, 1.43, 0, 0, 0, 'glow');
        target.rim = part(target.base, 'torus', 0xffde65, 0, 0.10, 0, 1.92, 1.92, 1.92, Math.PI / 2);
        target.markers.push(target.rim);
      } else if (type === 'flowers') {
        part(target.base, 'cylinder', 0xb89b74, 0, 0.035, 0, 1.18, 0.06, 1.18);
        for (var f = 0; f < 8; f++) {
          var a = f * TAU / 8;
          part(target.base, 'sphere', f % 2 ? 0x92d49a : 0x74ba82, Math.sin(a) * 1.1, 0.07, Math.cos(a) * 1.1, 0.34, 0.055, 0.54, 0, a);
        }
      } else if (type === 'windmills') {
        part(target.base, 'cylinder', 0xd4d4bd, 0, 0.025, 0, 1.36, 0.05, 1.36);
        for (var w = 0; w < 7; w++) {
          var a = w * TAU / 7 + 0.2, r = 1.35 + (w % 2) * 0.13;
          part(target.base, 'sphere', w % 2 ? 0xb5baac : 0xe4e3cc, Math.sin(a) * r, 0.10, Math.cos(a) * r, 0.17, 0.09, 0.22, 0, a);
        }
        target.markers.push(part(target.base, 'star', 0xffdc61, 0.66, 0.20, 1.15, 0.22, 0.22, 0.22, -Math.PI / 2, 0, 0.2));
      } else if (type === 'splashes') {
        part(target.base, 'sphere', 0x68d4ef, 0, 0.045, 0, 1.44, 0.05, 1.04);
        part(target.base, 'sphere', 0x68d4ef, 0.67, 0.045, 0.20, 0.75, 0.05, 1.05, 0, -0.25);
        part(target.base, 'sphere', 0x68d4ef, -0.69, 0.045, -0.20, 0.66, 0.05, 0.86, 0, 0.3);
      } else if (type === 'kites') {
        // A ribbon of colours is a runway, rather than another collecting ring.
        for (var k = 0; k < 6; k++) {
          part(target.base, 'box', PALETTE[(target.index + k) % PALETTE.length], -1.4 + k * 0.56, 0.035, Math.sin(k * 0.8) * 0.10, 0.62, 0.05, 0.91, 0, Math.sin(k * 0.8) * 0.12);
        }
        part(target.base, 'box', 0xfff8db, 0, 0.065, 0.30, 2.98, 0.023, 0.045);
        part(target.base, 'box', 0xfff8db, 0, 0.065, -0.30, 2.98, 0.023, 0.045);
      } else if (type === 'balls') {
        part(target.base, 'box', 0x81c9a5, 0, 0.02, -0.35, 2.7, 0.025, 3.4, 0, 0, 0, 'glow');
        for (var side = 0; side < 2; side++) part(target.base, 'box', 0xfff9df, side ? -1.24 : 1.24, 0.05, -0.35, 0.045, 0.035, 3.35);
        part(target.base, 'box', 0xfff9df, 0, 0.05, 1.3, 2.5, 0.035, 0.045);
      } else if (type === 'butterflies') {
        for (var leaf = 0; leaf < 5; leaf++) {
          var a = leaf * TAU / 5;
          part(target.base, 'sphere', leaf % 2 ? 0x9bd5a1 : 0x76bd88, Math.sin(a) * 0.62, 0.055, Math.cos(a) * 0.62, 0.45, 0.06, 0.95, 0, a);
        }
      }
      // Small footprints communicate movement without turning every game into
      // a circle. Their colours change once, while the themed object reacts.
      for (var i = 0; i < 4; i++) {
        target.markers.push(part(target.base, 'sphere', 0xfff9db, i % 2 ? -0.17 : 0.17, 0.11, 1.0 + Math.floor(i / 2) * 0.36, 0.10, 0.04, 0.18, 0, i % 2 ? -0.16 : 0.16));
      }
      target.stars = [];
      for (var s = 0; s < 3; s++) {
        var star = part(target.base, 'star', s === 1 ? 0xffdf65 : target.color, 0, 1, 0, 0.32, 0.32, 0.32, 0, 0.42, 0);
        star.visible = false; target.stars.push(star);
      }
    }
    function flowers(target) {
      var stem = part(target.base, 'cylinder', 0x53ae77, 0, 0.44, 0, 0.055, 0.86, 0.055);
      for (var i = 0; i < 2; i++) part(target.base, 'sphere', 0x78cf8b, i ? 0.20 : -0.20, 0.35 + i * 0.19, 0, 0.29, 0.055, 0.12, 0, 0, i ? 0.4 : -0.4);
      var head = node(target.base, 0, 0.88, 0), petals = [];
      part(head, 'sphere', 0xffdb63, 0, 0.06, 0, 0.24, 0.15, 0.24);
      for (var p = 0; p < 7; p++) petals.push(part(head, 'sphere', target.color, 0, 0, 0, 0.16, 0.075, 0.35, 0, p * TAU / 7, 0));
      target.animate = function (age, idle) {
        var e = target.collected ? smooth(age / 0.7) : 0;
        stem.position.y = 0.44 + e * 0.30; stem.scale.y = 0.86 + e * 0.60;
        head.position.y = 0.88 + e * 0.60; head.rotation.z = Math.sin(idle * 1.8 + target.index) * 0.09 * motion;
        for (var p = 0; p < petals.length; p++) {
          var a = p * TAU / petals.length;
          petals[p].position.set(Math.sin(a) * (0.13 + e * 0.35), -0.04 + (1 - e) * 0.23, Math.cos(a) * (0.13 + e * 0.35));
          petals[p].scale.set(0.16 + e * 0.18, 0.075, 0.35 + e * 0.30);
          petals[p].rotation.x = (1 - e) * -0.85;
        }
      };
    }
    function windmills(target) {
      part(target.base, 'cone', 0xfff0bf, 0, 0.90, 0, 0.60, 1.8, 0.60);
      part(target.base, 'cone', target.color, 0, 1.94, 0, 0.78, 0.56, 0.78);
      part(target.base, 'box', 0x8b98a2, 0, 0.47, 0.53, 0.26, 0.47, 0.07);
      var rotor = node(target.base, 0, 1.55, 0.61);
      part(rotor, 'sphere', 0xffd461, 0, 0, 0.06, 0.17, 0.17, 0.13);
      for (var b = 0; b < 4; b++) {
        var blade = node(rotor, 0, 0, 0); blade.rotation.z = b * Math.PI / 2;
        part(blade, 'box', 0xfff9dc, 0.40, 0, 0, 0.92, 0.17, 0.07);
        part(blade, 'box', target.color, 0.72, 0, 0.03, 0.31, 0.28, 0.075);
        part(blade, 'box', 0xffdf67, 0.28, 0, 0.05, 0.07, 0.20, 0.03);
      }
      target.angle = target.index * 0.8;
      target.animate = function (age, idle, dt) {
        target.angle += dt * (target.collected ? 6 * Math.exp(-Math.max(0, age - 2) * 0.24) + 0.6 : 0.22);
        rotor.rotation.z = target.angle;
      };
    }
    function splashes(target) {
      var drop = node(target.base, 0, 0.79, 0);
      part(drop, 'sphere', 0x83e2fb, 0, 0, 0, 0.30, 0.33, 0.30);
      part(drop, 'cone', 0x83e2fb, 0, 0.30, 0, 0.23, 0.45, 0.23);
      part(drop, 'sphere', 0xf1fcff, -0.09, 0.11, 0.24, 0.07, 0.11, 0.03);
      var ripples = [], droplets = [];
      for (var r = 0; r < 3; r++) ripples.push(part(target.base, 'torus', 0xe6faff, 0, 0.15 + r * 0.005, 0, 0.5, 0.5, 0.5, Math.PI / 2));
      for (var d = 0; d < 12; d++) droplets.push(part(target.base, 'sphere', d % 3 ? 0x8ce4ff : 0xecfbff, 0, 0.2, 0, 0.12, 0.18, 0.12));
      target.animate = function (age, idle) {
        drop.visible = !target.collected;
        drop.position.y = 0.82 + Math.sin(idle * 2 + target.index) * 0.10 * motion;
        for (var r = 0; r < ripples.length; r++) {
          var v = target.collected ? (age * 0.7 + r / 3) % 1 : (idle * 0.35 + r / 3) % 1;
          ripples[r].scale.setScalar(0.22 + v * 1.03);
        }
        for (var d = 0; d < droplets.length; d++) {
          var a = d / droplets.length * TAU, t = age / 1.35, radius = 0.15 + t * 1.9;
          droplets[d].visible = target.collected && t < 1;
          droplets[d].position.set(Math.cos(a) * radius, 0.25 + Math.sin(Math.min(1, t) * Math.PI) * (1.5 + d % 3 * 0.35), Math.sin(a) * radius);
          droplets[d].scale.set(0.12 * (1 - t * 0.35), 0.18 * (1 - t * 0.35), 0.12 * (1 - t * 0.35));
        }
      };
    }
    function kites(target) {
      var kite = node(target.base, 0, 1.53, 0); kite.rotation.y = 0.48;
      part(kite, 'kite', target.color, 0, 0, 0, 0.88, 0.88, 0.88, 0, 0, 0, 'flat');
      part(kite, 'box', 0xfff9de, 0, 0.06, 0.024, 0.047, 1.48, 0.025);
      part(kite, 'box', 0xfff9de, 0, 0, 0.024, 1.16, 0.047, 0.025);
      var bows = [];
      for (var i = 0; i < 5; i++) {
        var bow = node(kite, 0, -0.88 - i * 0.21, 0);
        part(bow, 'kite', PALETTE[(target.index + i + 1) % PALETTE.length], -0.075, 0, 0, 0.15, 0.09, 0.09, 0, 0, Math.PI / 2, 'flat');
        part(bow, 'kite', PALETTE[(target.index + i + 1) % PALETTE.length], 0.075, 0, 0, 0.15, 0.09, 0.09, 0, 0, -Math.PI / 2, 'flat');
        bows.push(bow);
      }
      var strings = []; for (var s = 0; s < 6; s++) strings.push(rod(target.base, 0xfff9dc, [0, 0, 0], [0, 1, 0], 0.013));
      target.animate = function (age, idle) {
        var e = target.collected ? smooth(age / 1.15) : 0;
        kite.position.set(Math.sin(idle * 1.6 + target.index) * (0.09 + e * 0.35) * motion, 1.53 + e * 1.6 + Math.sin(idle * 1.4) * 0.07 * motion, -e * 0.45);
        kite.rotation.z = Math.sin(idle * 2 + target.index) * (0.06 + e * 0.12) * motion;
        for (var b = 0; b < bows.length; b++) bows[b].position.x = Math.sin(idle * 3 - b * 0.65) * (0.025 + e * 0.08) * motion;
        for (var s = 0; s < strings.length; s++) {
          var a = s / strings.length, b = (s + 1) / strings.length;
          segment(strings[s], [kite.position.x * a + Math.sin(a * Math.PI) * 0.20, 0.13 + (kite.position.y - 0.80) * a, kite.position.z * a],
            [kite.position.x * b + Math.sin(b * Math.PI) * 0.20, 0.13 + (kite.position.y - 0.80) * b, kite.position.z * b], 0.013);
        }
      };
    }
    function balls(target) {
      var hockey = options.place && (options.place.id === 'hockey' || options.place.kind === 'hockey');
      var ball = node(target.base, 0, hockey ? 0.18 : 0.62, 0), goal = node(target.base, 0, 0, -2.05);
      if (hockey) {
        part(target.base, 'cylinder', 0xd9f2fa, 0, 0.065, 0, 1.45, 0.07, 1.45);
        part(ball, 'cylinder', 0x344c67, 0, 0, 0, 0.53, 0.27, 0.53);
        part(ball, 'cylinder', 0x8fb4ce, 0, 0.14, 0, 0.28, 0.012, 0.28);
      } else {
        part(ball, 'sphere', target.color, 0, 0, 0, 0.61, 0.61, 0.61);
        part(ball, 'torus', 0xfff9e4, 0, 0, 0, 0.60, 0.60, 0.60, Math.PI / 2);
        part(ball, 'torus', 0xfff9e4, 0, 0, 0, 0.60, 0.60, 0.60, 0, Math.PI / 2);
        part(ball, 'sphere', 0xfff9e4, 0, 0.58, 0, 0.19, 0.07, 0.19);
      }
      rod(goal, 0xfff7db, [-0.88, 0.08, 0], [-0.88, 1.22, 0], 0.065);
      rod(goal, 0xfff7db, [0.88, 0.08, 0], [0.88, 1.22, 0], 0.065);
      rod(goal, 0xfff7db, [-0.88, 1.22, 0], [0.88, 1.22, 0], 0.065);
      for (var i = 0; i < 5; i++) part(goal, 'box', 0xd3eddd, -0.8 + i * 0.4, 0.60, -0.20, 0.022, 1.1, 0.022);
      for (var h = 0; h < 4; h++) part(goal, 'box', 0xd3eddd, 0, 0.17 + h * 0.31, -0.20, 1.65, 0.022, 0.022);
      part(goal, 'star', 0xffdd65, 0, 1.65, 0, 0.23, 0.23, 0.23, 0, 0.48, 0);
      target.animate = function (age, idle) {
        var e = target.collected ? smooth(age / 0.85) : 0;
        ball.position.z = -e * 1.87;
        ball.position.y = hockey ? 0.18 : 0.62 + (target.collected ? Math.sin(Math.min(1, age / 0.85) * Math.PI) * 0.25 : Math.sin(idle * 2.2 + target.index) * 0.045 * motion);
        ball.rotation.x = hockey ? 0 : -e * Math.PI * 1.7;
        ball.rotation.y = hockey ? e * Math.PI * 2 : target.index * 0.45;
      };
    }
    function butterflies(target) {
      var insect = node(target.base, 0, 1.37, 0); insect.rotation.y = 0.43;
      var wings = [];
      for (var side = 0; side < 2; side++) {
        var wing = node(insect, side ? -0.03 : 0.03, 0, 0); wing.scale.x = side ? -1 : 1;
        part(wing, 'wing', target.color, 0, 0, 0, 0.94, 0.94, 0.94, 0, 0, 0, 'flat');
        part(wing, 'wing', 0xffed99, 0.025, 0.045, 0.012, 0.55, 0.55, 0.55, 0, 0, 0, 'flat');
        part(wing, 'sphere', 0xfff5df, 0.49, 0.40, 0.04, 0.11, 0.11, 0.035);
        wings.push(wing);
      }
      part(insect, 'sphere', 0x67547b, 0, -0.02, 0.04, 0.10, 0.37, 0.10);
      part(insect, 'sphere', 0xffd26a, 0, 0.31, 0.06, 0.15, 0.14, 0.13);
      for (var i = 0; i < 2; i++) {
        var direction = i ? -1 : 1;
        rod(insect, 0x67547b, [direction * 0.05, 0.40, 0.05], [direction * 0.18, 0.64, 0.05], 0.018);
        part(insect, 'sphere', 0xffdb68, direction * 0.18, 0.64, 0.05, 0.045, 0.045, 0.045);
      }
      part(target.base, 'sphere', 0xffd868, 0, 0.24, 0, 0.25, 0.14, 0.25);
      for (var p = 0; p < 5; p++) part(target.base, 'sphere', 0xff98af, Math.sin(p * TAU / 5) * 0.35, 0.17, Math.cos(p * TAU / 5) * 0.35, 0.28, 0.09, 0.28);
      target.animate = function (age, idle) {
        var e = target.collected ? smooth(age / 1.4) : 0;
        insect.position.set(Math.sin(idle * 2 + target.index) * (0.12 + e * 0.52) * motion, 1.37 + e * 1.5 + Math.sin(idle * 2.7) * 0.08 * motion, Math.cos(idle * 1.7) * e * 0.42 * motion);
        for (var w = 0; w < wings.length; w++) wings[w].rotation.y = (w ? -1 : 1) * (0.14 + (Math.sin(idle * (target.collected ? 16 : 7) + target.index) + 1) * 0.45 * motion);
      };
    }
    function rings(target) {
      var ring = node(target.base, 0, 1.53, 0); ring.rotation.y = 0.46;
      part(ring, 'torus', 0xffd459, 0, 0, 0, 1.28, 1.28, 1.28);
      part(ring, 'star', target.color, 0, 1.18, 0.02, 0.22, 0.22, 0.22);
      for (var i = 0; i < 3; i++) part(ring, 'sphere', 0xfff6c9, Math.sin(i * TAU / 3) * 1.28, Math.cos(i * TAU / 3) * 1.28, 0.07, 0.11, 0.11, 0.11);
      target.animate = function (age, idle) {
        ring.visible = !target.collected || age < 1.25;
        ring.position.y = 1.53 + (target.collected ? smooth(age / 1.25) * 1.6 : Math.sin(idle * 1.5 + target.index) * 0.10 * motion);
        ring.scale.setScalar(target.collected ? Math.max(0.05, 1 - smooth(age / 1.25) * 0.88) : 1);
      };
    }


    function music(target) {
      var arch = node(target.base, 0, 0, 0), bells = [];
      rod(arch, 0xe2b57c, [-.9,0,0],[-.9,2.1,0],.09); rod(arch, 0xe2b57c, [.9,0,0],[.9,2.1,0],.09);
      rod(arch, 0xe2b57c, [-.9,2.1,0],[.9,2.1,0],.09);
      for(var b=0;b<3;b++) {
        var bell=node(arch,(b-1)*.55,1.65,0); bells.push(bell);
        part(bell,'cone',PALETTE[(target.index+b)%6],0,-.18,0,.24,.45,.24,Math.PI);
        part(bell,'sphere',0xffd567,0,-.4,0,.07,.07,.07);
        rod(arch,0xffefd6,[(b-1)*.55,2.1,0],[(b-1)*.55,1.65,0],.016);
      }
      var note=node(target.base,0,.9,.3);
      part(note,'sphere',target.color,-.16,0,0,.23,.16,.12); part(note,'box',target.color,.03,.35,0,.07,.72,.07);
      part(note,'box',target.color,.2,.67,0,.4,.12,.08,0,0,-.3);
      target.animate=function(age,idle){
        note.visible=!target.collected;
        bells.forEach(function(b,i){b.rotation.z=target.collected?Math.sin(idle*7+i+target.index)*.35*motion:Math.sin(idle+i)*.04*motion;});
      };
    }
    function train(target) {
      for(var side=0;side<2;side++) part(target.base,'box',0x9c8878,side?-.62:.62,.09,0,.07,.08,3.1);
      for(var t=0;t<6;t++) part(target.base,'box',0xc8a681,0,.055,-1.4+t*.55,1.55,.07,.15);
      var wagon=node(target.base,0,.55,0), wheels=[];
      part(wagon,'box',target.color,0,.14,0,1.3,.62,1.6); part(wagon,'box',0xffefbd,0,.5,0,1.4,.12,1.7);
      if(!target.index){part(wagon,'cylinder',0xffdb64,0,.81,-.45,.19,.6,.19);part(wagon,'box',0x6ecdf1,0,.95,.4,1,.8,.65);part(wagon,'box',0xffe5ad,0,1.4,.4,1.2,.14,.85);}
      else {part(wagon,'sphere',0xffe6aa,0,.8,0,.38,.4,.35);part(wagon,'cone',0xff8da3,0,1.27,0,.33,.5,.33);}
      for(var w=0;w<4;w++) wheels.push(part(wagon,'cylinder',0x485b75,w%2?-.72:.72,-.25,w<2?-.5:.5,.25,.12,.25,0,0,Math.PI/2));
      target.animate=function(age,idle){var e=target.collected?smooth(age):0;wagon.position.z=complete?Math.sin(idle*1.5+target.index*.35)*.75*motion:0;wagon.position.y=.55+e*.06+ (target.collected?Math.abs(Math.sin(idle*3+target.index))*.08*motion:0);wheels.forEach(function(w){w.rotation.x=complete?idle*3*motion:0;});};
    }
    function painting(target) {
      var canvas=node(target.base,0,1.5,0);
      part(canvas,'box',0xc6996a,0,0,-.07,2.1,1.85,.12);part(canvas,'box',0xfff9df,0,0,.01,1.91,1.66,.08);
      rod(target.base,0xc6996a,[-.8,0,.15],[0,2.6,-.12],.065);rod(target.base,0xc6996a,[.8,0,.15],[0,2.6,-.12],.065);
      var drawing=node(canvas,0,0,.09), kind=target.index%5;
      if(kind===0){part(drawing,'sphere',0xffd35e,0,0,0,.43,.43,.035);for(var i=0;i<8;i++){var a=i*TAU/8;part(drawing,'box',0xffd35e,Math.sin(a)*.64,Math.cos(a)*.64,0,.07,.25,.035,0,0,-a);}}
      else if(kind===1){for(var i=0;i<5;i++)part(drawing,'sphere',PALETTE[i],Math.sin(i*TAU/5)*.3,Math.cos(i*TAU/5)*.3,0,.28,.28,.025);part(drawing,'sphere',0xffd35e,0,0,.025,.18,.18,.03);}
      else if(kind===2){for(var i=0;i<4;i++)part(drawing,'torus',PALETTE[i],0,-.35,0,.7-i*.12,.7-i*.12,.025);part(drawing,'box',0xfff9df,0,-.63,.06,1.7,.55,.04);}
      else if(kind===3){part(drawing,'cone',0x75d5a0,0,.05,0,.63,1.1,.025);part(drawing,'box',0xb58762,0,-.5,0,.14,.35,.025);}
      else {part(drawing,'box',0xffac8d,0,-.16,0,.85,.68,.035);part(drawing,'cone',0xa68bf4,0,.4,0,.68,.6,.035);part(drawing,'box',0x6ecdf1,0,-.23,.04,.22,.38,.02);}
      var brush=node(target.base,.85,.6,.7);part(brush,'cylinder',0xb98b64,0,0,0,.055,.75,.055,0,0,-.4);part(brush,'sphere',target.color,.16,.4,0,.14,.22,.12);
      target.animate=function(age,idle){drawing.visible=target.collected;drawing.scale.setScalar(target.collected?Math.max(.01,smooth(age/.65)): .01);brush.visible=!target.collected;canvas.rotation.z=complete?Math.sin(idle*2+target.index)*.04*motion:0;};
    }
    function lanterns(target) {
      var lantern=node(target.base,0,.9,0);
      part(lantern,'sphere',target.color,0,0,0,.57,.65,.57);
      for(var i=0;i<6;i++)part(lantern,'torus',0xffe9a8,0,0,0,.56,.64,.56,0,i*Math.PI/6);
      part(lantern,'cylinder',0xffd369,0,-.62,0,.22,.09,.22);part(lantern,'cylinder',0xffd369,0,.62,0,.22,.09,.22);
      part(lantern,'sphere',0xffed94,0,0,0,.7,.76,.7,0,0,0,'glow');
      target.animate=function(age,idle){var e=target.collected?smooth(age/1.5):0;lantern.position.y=.9+e*2.7+Math.sin(idle*1.7+target.index)*.12*motion;lantern.position.x=Math.sin(idle+target.index)*e*.45*motion;lantern.rotation.z=Math.sin(idle*1.4+target.index)*.1*motion;};
    }
    function picnic(target) {
      var spread=node(target.base,0,0,0);
      for(var x=0;x<4;x++)for(var z=0;z<4;z++)part(spread,'box',(x+z)%2?0xfff3d9:target.color,(x-1.5)*.5,.045,(z-1.5)*.5,.5,.035,.5);
      var bear=node(target.base,0,.65,-.65);
      part(bear,'sphere',0xcfa574,0,0,0,.38,.46,.3);part(bear,'sphere',0xe1b985,0,.55,0,.35,.32,.3);
      for(var i=0;i<2;i++){part(bear,'sphere',0xcfa574,i?-.28:.28,.78,0,.14,.14,.11);part(bear,'sphere',0x465064,i?-.12:.12,.59,.28,.035,.045,.025);}
      part(bear,'sphere',0xffe8bc,0,.43,.27,.16,.12,.09);part(bear,'sphere',0x735a4b,0,.47,.35,.05,.04,.025);
      var arms=[];for(var i=0;i<2;i++)arms.push(part(bear,'sphere',0xcfa574,i?-.4:.4,.14,0,.14,.3,.14,0,0,i?-.5:.5));
      var food=node(target.base,0,.15,.32);
      part(food,'cylinder',0xfff6df,0,0,0,.55,.045,.55);
      for(var i=0;i<3;i++){part(food,'sphere',PALETTE[(target.index+i)%6],(i-1)*.24,.17,0,.17,.19,.17);part(food,'cylinder',0x77ac71,(i-1)*.24,.37,0,.018,.1,.018);}
      target.animate=function(age,idle){food.visible=target.collected;food.scale.setScalar(target.collected?Math.max(.01,smooth(age/.65)):.01);bear.rotation.y=Math.sin(idle+target.index)*.1*motion;arms.forEach(function(a,i){a.rotation.z=(i?-1:1)*(.5+(target.collected?(Math.sin(idle*5+target.index)+1)*.5*motion:0));});};
    }

    var builders = { music: music, train: train, painting: painting, lanterns: lanterns, picnic: picnic, flowers: flowers, windmills: windmills, splashes: splashes, kites: kites, balls: balls, butterflies: butterflies, rings: rings };
    points.forEach(function (point, index) {
      var base = node(root, point.x, 0, point.z); base.name = 'hedef-' + index;
      var target = { index: index, base: base, x: point.x, z: point.z, color: PALETTE[index % PALETTE.length], collected: false, at: -Infinity, angle: 0 };
      pad(target); builders[type](target); targets.push(target);
    });
    batches.forEach(function (batch) {
      var mesh = new T.InstancedMesh(geometry(pool, batch.kind), material(pool, batch.mat), batch.records.length);
      mesh.name = type + '-' + batch.kind + '-' + batch.mat;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false; // Tiny stages animate upward after collection.
      mesh.castShadow = batch.mat !== 'glow'; mesh.receiveShadow = batch.mat !== 'glow';
      for (var i = 0; i < batch.records.length; i++) mesh.setColorAt(i, new T.Color(batch.records[i].color));
      mesh.instanceColor.setUsage(T.DynamicDrawUsage);
      root.add(mesh); meshes.push(mesh); batch.mesh = mesh;
    });

    function worldPosition(target) { return worldPoint.set(target.x, 0, target.z).applyMatrix4(root.matrixWorld); }
    function poses(dt, time) {
      for (var i = 0; i < targets.length; i++) {
        var target = targets[i], age = target.collected ? elapsed - target.at : 0;
        // Only decorative motion slows down. Capture, opening and reward times
        // retain their original timing, so feedback remains immediate.
        target.animate(age, time * motion, dt * motion);
        if (target.rim) target.rim.scale.setScalar(1.92 + (!target.collected ? Math.sin(time * 2.5 * motion + i) * 0.05 * motion : 0));
        for (var s = 0; s < target.stars.length; s++) {
          var star = target.stars[s], p = age / REWARD_SECONDS;
          star.visible = target.collected && p < 1;
          star.position.set((s - 1) * (0.4 + p * 0.50 * motion), 1.35 + Math.sin(Math.min(1, p) * Math.PI) * 1.2 * motion + s * 0.19, 0.27);
          star.rotation.z = Math.sin(time * 4 * motion + s) * 0.25 * motion;
          star.scale.setScalar((0.22 + Math.sin(Math.min(1, p) * Math.PI) * 0.16 * motion) * Math.min(1, Math.max(0, (1 - p) * 5)));
        }
      }
      root.updateMatrixWorld(true); rootInverse.copy(root.matrixWorld).invert();
      batches.forEach(function (batch) {
        for (var i = 0; i < batch.records.length; i++) {
          var n = batch.records[i].node, visible = true;
          for (var p = n; p && p !== root; p = p.parent) if (!p.visible) { visible = false; break; }
          if (visible) batch.mesh.setMatrixAt(i, instanceMatrix.multiplyMatrices(rootInverse, n.matrixWorld));
          else batch.mesh.setMatrixAt(i, zero);
        }
        batch.mesh.instanceMatrix.needsUpdate = true;
      });
    }
    function capture(target, position) {
      var p = worldPosition(target), ax = previous ? previous.x : position.x, az = previous ? previous.z : position.z;
      var dx = position.x - ax, dz = position.z - az, lengthSquared = dx * dx + dz * dz;
      var t = lengthSquared ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / lengthSquared)) : 0;
      return Math.hypot(p.x - ax - t * dx, p.z - az - t * dz) <= CAPTURE_RADIUS;
    }
    function update(dt, time, position, speed) {
      var result = { collected: [], complete: false };
      if (disposed) return result;
      dt = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
      elapsed += dt;
      root.updateWorldMatrix(true, false);
      if (position && Number.isFinite(position.x) && Number.isFinite(position.z)) {
        for (var i = 0; i < targets.length; i++) if (!targets[i].collected && capture(targets[i], position)) {
          var target = targets[i]; target.collected = true; target.at = elapsed; count++; result.collected.push(i);
          for (var m = 0; m < target.markers.length; m++) {
            var record = target.markers[m].userData.activityRecord;
            record.batch.mesh.setColorAt(record.index, new T.Color(0x77dc9a)); record.batch.mesh.instanceColor.needsUpdate = true;
          }
        }
        // A continuous swept test keeps a quick dash from skipping a wide
        // target when rendering briefly slows down. Position is read only.
        if (!previous) previous = { x: position.x, z: position.z };
        else { previous.x = position.x; previous.z = position.z; }
      } else previous = null;
      if (!complete && count === targets.length) { complete = true; result.complete = true; }
      poses(dt, Number.isFinite(time) ? time : elapsed);
      return result;
    }
    function getState() {
      root.updateWorldMatrix(true, false);
      return { type: type, collected: count, total: targets.length, complete: complete,
        targets: targets.map(function (target) { var p = worldPosition(target); return { x: p.x, z: p.z, collected: target.collected }; }) };
    }
    function reset() {
      if (disposed) return;
      elapsed = 0; count = 0; previous = null; complete = targets.length === 0;
      targets.forEach(function (target) { target.collected = false; target.at = -Infinity; target.angle = target.index * 0.8; });
      batches.forEach(function (batch) {
        for (var r = 0; r < batch.records.length; r++) batch.mesh.setColorAt(r, new T.Color(batch.records[r].color));
        batch.mesh.instanceColor.needsUpdate = true;
      });
      poses(0, 0);
    }
    function dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent();
      meshes.forEach(function (mesh) { mesh.dispose(); });
      root.clear(); release(pool);
    }
    reset();
    return { root: root, update: update, getState: getState, reset: reset, dispose: dispose };
  }

  window.FLASH_ACTIVITIES = { types: TYPES, typeIds: Object.keys(TYPES), typeFor: typeFor, choicesFor: choicesFor, create: create,
    captureRadius: CAPTURE_RADIUS, rewardSeconds: REWARD_SECONDS };
}());
