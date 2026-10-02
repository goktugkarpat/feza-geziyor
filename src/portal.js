(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Dünya kapısı için grafik motoru yüklenemedi.');
  var TAU = Math.PI * 2;

  // The Earth texture normally comes from the real geographical globe. The
  // tiny local fallback is decorative and keeps double-click/file:// working.
  function fallbackMap() {
    if (typeof document === 'undefined') return null;
    var canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    var g = canvas.getContext('2d'), ocean = g.createLinearGradient(0, 0, 0, 128);
    ocean.addColorStop(0, '#8edeea'); ocean.addColorStop(0.5, '#5ec4df'); ocean.addColorStop(1, '#94dfed');
    g.fillStyle = ocean; g.fillRect(0, 0, 256, 128);
    var continents = [
      [[15,27],[35,16],[64,20],[71,35],[58,49],[45,51],[41,64],[28,53]],
      [[59,62],[77,70],[81,86],[73,110],[64,104],[56,82]],
      [[120,26],[141,22],[152,30],[172,22],[207,28],[235,43],[210,56],[181,52],[171,69],[157,57],[137,51],[132,39]],
      [[130,52],[155,58],[165,74],[155,95],[140,102],[127,80]],
      [[207,84],[227,84],[236,98],[218,105],[206,97]],
      [[83,9],[109,9],[106,25],[88,25]]
    ];
    continents.forEach(function (points, i) {
      g.beginPath(); points.forEach(function (p, n) { if (n) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
      g.fillStyle = i % 2 ? '#91cc8d' : '#b0d998'; g.fill();
      g.strokeStyle = '#6eb57e'; g.lineWidth = 1.5; g.stroke();
    });
    g.fillStyle = '#edf7ed'; g.fillRect(0, 0, 256, 5); g.fillRect(0, 122, 256, 6);
    var map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 2; return map;
  }
  function starGeometry() {
    var s = new T.Shape();
    for (var i = 0; i < 10; i++) {
      var a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.45 : 1;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return new T.ExtrudeGeometry(s, { depth: 0.11, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.045, bevelThickness: 0.03, steps: 1 });
  }
  function create(options) {
    options = options || {};
    var root = new T.Group(); root.name = 'dünya-kapısı';
    root.position.set(Number.isFinite(options.x) ? options.x : 0, 0, Number.isFinite(options.z) ? options.z : 0);
    root.rotation.y = 0.46;
    var sources = new Map(), pieces = [], ownedGeometries = [], materials = [], disposed = false;
    var transform = new T.Object3D(), instance = new T.Object3D();
    function source(kind) {
      if (sources.has(kind)) return sources.get(kind);
      var g;
      if (kind === 'sphere') g = new T.SphereGeometry(1, 16, 12);
      else if (kind === 'cylinder') g = new T.CylinderGeometry(1, 1, 1, 20);
      else if (kind === 'box') g = new T.BoxGeometry(1, 1, 1);
      else if (kind === 'arch') g = new T.TorusGeometry(1.9, 0.18, 8, 48, Math.PI);
      else if (kind === 'trim') g = new T.TorusGeometry(1.9, 0.047, 6, 48, Math.PI);
      else if (kind === 'halo') g = new T.TorusGeometry(1.04, 0.065, 6, 40);
      else if (kind === 'star') g = starGeometry();
      sources.set(kind, g); return g;
    }
    function part(kind, color, x, y, z, sx, sy, sz, rx, ry, rz) {
      var g = source(kind).clone();
      transform.position.set(x || 0, y || 0, z || 0); transform.scale.set(sx || 1, sy || 1, sz || 1);
      transform.rotation.set(rx || 0, ry || 0, rz || 0); transform.updateMatrix(); g.applyMatrix4(transform.matrix);
      pieces.push({ geometry: g, color: new T.Color(color) });
    }
    // The gold halo leaves 2.875 metres of clear space above the bigger runner.
    // remains visible while passing through the lower middle of the doorway.
    part('arch', 0x60cfc8, 0, 3.08, 0, 1, 1, 1);
    part('trim', 0xffd46a, 0, 3.08, 0.172, 1, 1, 1);
    for (var side = 0; side < 2; side++) {
      var x = side ? -1.9 : 1.9;
      part('cylinder', 0x64cec9, x, 1.59, 0, 0.18, 2.98, 0.18);
      part('cylinder', 0xffd46a, x, 0.42, 0, 0.235, 0.12, 0.235);
      part('box', 0xe7e8cf, x, 0.10, 0, 0.74, 0.20, 0.68);
      part('box', 0xffe499, x, 0.23, 0, 0.53, 0.10, 0.50);
      part('cylinder', 0xffdb73, x, 3.02, 0, 0.23, 0.11, 0.23);
      // Soft cloud cheeks sit beside the Earth sign, rather than in the path.
      for (var cloud = 0; cloud < 3; cloud++) {
        part('sphere', 0xfffbed, x + (cloud - 1) * 0.21, 3.75 + (cloud === 1 ? 0.12 : 0), -0.01, 0.31, 0.23, 0.16);
      }
    }
    part('halo', 0xffd567, 0, 3.98, 0.06, 1, 1, 1);
    // Little arrow-shaped stepping stones point into the arch. They are part
    // of the world and do not require the child to read or tap a new button.
    for (var arrow = 0; arrow < 3; arrow++) {
      var z = 0.76 + arrow * 0.41;
      part('box', 0xffdfa0, -0.125, 0.035, z, 0.08, 0.025, 0.37, 0, -0.72);
      part('box', 0xffdfa0, 0.125, 0.035, z, 0.08, 0.025, 0.37, 0, 0.72);
    }

    var positions = [], normals = [], colors = [];
    pieces.forEach(function (p) {
      var g = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
      var a = g.getAttribute('position'), n = g.getAttribute('normal');
      for (var i = 0; i < a.count; i++) {
        positions.push(a.getX(i), a.getY(i), a.getZ(i)); normals.push(n.getX(i), n.getY(i), n.getZ(i));
        colors.push(p.color.r, p.color.g, p.color.b);
      }
      if (g !== p.geometry) g.dispose(); p.geometry.dispose();
    });
    var staticGeometry = new T.BufferGeometry();
    staticGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    staticGeometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    staticGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    staticGeometry.computeBoundingSphere(); ownedGeometries.push(staticGeometry);
    var solid = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.06 }); materials.push(solid);
    var arch = new T.Mesh(staticGeometry, solid); arch.castShadow = arch.receiveShadow = true; root.add(arch);

    var map = options.map && options.map.isTexture ? options.map : fallbackMap(), ownedMap = map !== options.map;
    var earthGeometry = new T.SphereGeometry(0.92, 32, 20); ownedGeometries.push(earthGeometry);
    var earthMaterial = new T.MeshStandardMaterial({ map: map, color: map ? 0xffffff : 0x67c9dd, roughness: 0.84 }); materials.push(earthMaterial);
    if (!map) {
      // DOM-less checks still see a readable blue-and-green globe. No texture
      // creation, network, or document dependency is needed for model tests.
      var uv = earthGeometry.getAttribute('uv'), colour = new Float32Array(uv.count * 3), green = new T.Color(0xa8d38e), blue = new T.Color(0x67c9dd);
      for (var v = 0; v < uv.count; v++) {
        var u = uv.getX(v), y = uv.getY(v);
        var land = ((u - 0.22) * (u - 0.22) / 0.009 + (y - 0.68) * (y - 0.68) / 0.06 < 1) || ((u - 0.59) * (u - 0.59) / 0.02 + (y - 0.51) * (y - 0.51) / 0.065 < 1);
        var c = land ? green : blue; colour[v * 3] = c.r; colour[v * 3 + 1] = c.g; colour[v * 3 + 2] = c.b;
      }
      earthGeometry.setAttribute('color', new T.BufferAttribute(colour, 3)); earthMaterial.color.set(0xffffff); earthMaterial.vertexColors = true;
    }
    var earth = new T.Mesh(earthGeometry, earthMaterial); earth.name = 'dünya-kapısı-küre'; earth.position.set(0, 3.98, 0.04); earth.castShadow = true; root.add(earth);
    var glowGeometry = new T.RingGeometry(0.42, 1.66, 40); ownedGeometries.push(glowGeometry);
    var glowMaterial = new T.MeshBasicMaterial({ color: 0x79ded3, transparent: true, opacity: 0.19, depthWrite: false, side: T.DoubleSide }); materials.push(glowMaterial);
    var glow = new T.Mesh(glowGeometry, glowMaterial); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.022; root.add(glow);

    var stars = new T.InstancedMesh(source('star'), solid, 5), starPositions = [[0, 5.40, 0.06, 0.28], [-1.55, 4.83, 0.14, 0.17], [1.55, 4.83, 0.14, 0.17], [-2.19, 3.01, 0.12, 0.14], [2.19, 3.01, 0.12, 0.14]];
    // Shared material vertex colours are supplied on this geometry too, while
    // instance colours make the small stars gold/turquoise without extra draws.
    var starColour = new Float32Array(stars.geometry.getAttribute('position').count * 3); starColour.fill(1);
    stars.geometry.setAttribute('color', new T.BufferAttribute(starColour, 3));
    for (var s = 0; s < starPositions.length; s++) stars.setColorAt(s, new T.Color(s > 2 ? 0xfff0b5 : 0xffd767));
    stars.instanceMatrix.setUsage(T.DynamicDrawUsage); stars.frustumCulled = false; stars.castShadow = true; root.add(stars);

    function update(dt, time) {
      if (disposed) return;
      time = Number.isFinite(time) ? time : 0;
      // Keep land in view: a full rotation periodically turns the whole sign
      // into an unrecognisable blue ball. A small sway still reads as a globe.
      earth.rotation.y = -1.43 + Math.sin(time * 0.27) * 0.20;
      glow.scale.setScalar(0.98 + Math.sin(time * 1.7) * 0.028); glowMaterial.opacity = 0.17 + Math.sin(time * 1.7) * 0.022;
      for (var i = 0; i < starPositions.length; i++) {
        var p = starPositions[i]; instance.position.set(p[0], p[1] + Math.sin(time * 1.8 + i * 0.7) * 0.045, p[2]);
        instance.rotation.set(0, 0, Math.sin(time * 1.3 + i) * 0.11); instance.scale.setScalar(p[3]); instance.updateMatrix(); stars.setMatrixAt(i, instance.matrix);
      }
      stars.instanceMatrix.needsUpdate = true;
    }
    function dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent(); stars.dispose();
      sources.forEach(function (g) { g.dispose(); }); ownedGeometries.forEach(function (g) { g.dispose(); });
      materials.forEach(function (m) { m.dispose(); }); if (ownedMap && map) map.dispose(); root.clear();
    }
    update(0, 0);
    return { root: root, update: update, dispose: dispose };
  }
  window.FLASH_PORTAL = { create: create };
}());
