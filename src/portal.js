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
      else if (kind === 'octa') g = new T.OctahedronGeometry(1, 0);
      else if (kind === 'band') g = new T.TorusGeometry(1, 0.075, 6, 20).rotateX(Math.PI / 2);
      else if (kind === 'base') g = new T.CylinderGeometry(1, 1.04, 1, 40);
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
    // Stone platform and carved bands, crystal gems along the arch and on the pillar caps.
    part('base', 0xe3dcc6, 0, 0.03, 0.3, 3.1, 0.06, 3.1);
    part('base', 0x67d3cb, 0, 0.065, 0.3, 2.62, 0.03, 2.62);
    part('base', 0xefe6cc, 0, 0.08, 0.3, 2.5, 0.04, 2.5);
    part('base', 0xffd98a, 0, 0.1, 0.3, 1.25, 0.02, 1.25);
    part('base', 0xefe6cc, 0, 0.11, 0.3, 1.15, 0.02, 1.15);
    for (var side2 = 0; side2 < 2; side2++) {
      var px = side2 ? -1.9 : 1.9;
      for (var b = 0; b < 3; b++) part('band', b === 1 ? 0xfff0b8 : 0xffd46a, px, 0.85 + b * 0.8, 0, 0.27, 0.27, 0.27);
      part('octa', side2 ? 0xff9ec0 : 0x9ae9ff, px, 3.42, 0, 0.17, 0.3, 0.17);
      part('base', 0xc8f4ef, px, 0.62, 0, 0.215, 0.05, 0.215);
    }
    var gemColours = [0xff9ec0, 0x9ae9ff, 0xffe27a, 0xbba7ff];
    for (var gem = 0; gem < 9; gem++) {
      var ga = (gem + 0.5) / 9 * Math.PI, gx = Math.cos(ga) * 2.12, gy = 3.08 + Math.sin(ga) * 2.12;
      part('octa', gemColours[gem % 4], gx, gy, 0.02, 0.11, 0.2, 0.11, 0, 0, ga - Math.PI / 2);
    }
    part('octa', 0xfff0a0, 0, 5.2, 0.02, 0.2, 0.33, 0.2);
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
    // Soft rainbow/aurora veil in the doorway (additive, thin; it never hides Feza) and a ground ring that wakes up when she is near.
    var uniforms = { uTime: { value: 0 }, uNear: { value: 0 } };
    var veilGeometry = new T.PlaneGeometry(4.2, 5.4).translate(0, 2.7, 0); ownedGeometries.push(veilGeometry);
    var veilMaterial = new T.ShaderMaterial({ uniforms: uniforms, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false,
      vertexShader: 'varying vec2 vP; void main(){ vP = vec2((uv.x - 0.5) * 4.2, uv.y * 5.4); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime, uNear; varying vec2 vP; void main(){ vec2 c = vec2(vP.x, vP.y - 3.08); float e = vP.y > 3.08 ? 1.78 - length(c) : min(1.78 - abs(vP.x), vP.y);' +
        ' if (e <= 0.0) discard; float mask = smoothstep(0.0, 0.5, e), rim = exp(-e * 5.5); float r = length(c), ang = atan(c.y, c.x);' +
        ' float sw = 0.5 + 0.5 * sin(ang * 3.0 + r * 4.5 - uTime * 1.1), sw2 = 0.5 + 0.5 * sin(ang * 5.0 - r * 6.0 + uTime * 0.8);' +
        ' float hue = ang / 6.2832 + r * 0.28 - uTime * 0.07; vec3 rainbow = 0.55 + 0.45 * cos(6.2832 * (hue + vec3(0.0, 0.33, 0.67)));' +
        ' vec3 aurora = mix(vec3(0.35, 1.0, 0.8), vec3(0.72, 0.5, 1.0), sw2); vec3 col = mix(aurora, rainbow, 0.55 + 0.3 * sw);' +
        ' float boost = 1.0 + uNear * 0.9; float a = (mask * (0.17 + 0.22 * sw * sw2) + rim * 0.34) * boost; gl_FragColor = vec4(col, a);\n#include <colorspace_fragment>\n}' });
    materials.push(veilMaterial);
    var veil = new T.Mesh(veilGeometry, veilMaterial); veil.position.set(0, 0, 0.03); veil.renderOrder = 4; veil.name = 'dünya-kapısı-perde'; root.add(veil);
    var glowGeometry = new T.CircleGeometry(3.3, 56); ownedGeometries.push(glowGeometry);
    var glowMaterial = new T.ShaderMaterial({ uniforms: uniforms, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: 'varying vec2 vQ; void main(){ vQ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime, uNear; varying vec2 vQ; void main(){ float r = length(vQ), ang = atan(vQ.y, vQ.x);' +
        ' float wave = 0.5 + 0.5 * sin(r * 5.2 - uTime * (1.6 + uNear * 2.6)); float fade = smoothstep(3.3, 2.5, r) * smoothstep(0.35, 0.9, r);' +
        ' vec3 rainbow = 0.55 + 0.45 * cos(6.2832 * (ang / 6.2832 + r * 0.2 - uTime * 0.05 + vec3(0.0, 0.33, 0.67))); vec3 col = mix(vec3(0.47, 0.87, 0.83), rainbow, 0.55);' +
        ' float outer = exp(-abs(r - 2.9) * 9.0) * (0.45 + uNear * 0.5), ring2 = exp(-abs(r - 1.9 - 0.15 * sin(uTime * 2.0)) * 11.0) * (0.12 + uNear * 0.5);' +
        ' float a = (0.035 + 0.05 * wave + uNear * 0.22) * fade + outer * 0.55 + ring2 * 0.7; gl_FragColor = vec4(mix(col, vec3(1.0, 0.86, 0.45), outer), min(0.8, a));\n#include <colorspace_fragment>\n}' });
    materials.push(glowMaterial);
    var glow = new T.Mesh(glowGeometry, glowMaterial); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.13, 0.3); glow.renderOrder = 3; root.add(glow);
    // Mini Earth rim light (a thin additive shell).
    var rimGeometry = new T.SphereGeometry(1.03, 24, 16); ownedGeometries.push(rimGeometry);
    var rimMaterial = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN, vV; void main(){ float d = max(0.0, dot(normalize(vN), normalize(vV))); float a = smoothstep(0.0, 0.3, d) * (1.0 - smoothstep(0.3, 0.55, d)); a *= a * 0.9; gl_FragColor = vec4(vec3(0.55, 0.9, 1.0) * a, a);\n#include <colorspace_fragment>\n}' });
    materials.push(rimMaterial);
    var rim = new T.Mesh(rimGeometry, rimMaterial); rim.position.copy(earth.position); rim.renderOrder = 5; root.add(rim);
    // Orbiting sparkles: fourteen little gems swirling around the gate (one instanced draw).
    var sparkGeometry = new T.OctahedronGeometry(1, 0); ownedGeometries.push(sparkGeometry);
    var sparkMaterial = new T.MeshBasicMaterial({ color: 0xffffff }); materials.push(sparkMaterial);
    var sparks = new T.InstancedMesh(sparkGeometry, sparkMaterial, 14); sparks.frustumCulled = false; sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);
    var sparkColours = [0xffe27a, 0x9ae9ff, 0xff9ec0, 0xbba7ff, 0xb8ffd8];
    for (var sc = 0; sc < 14; sc++) sparks.setColorAt(sc, new T.Color(sparkColours[sc % 5]));
    root.add(sparks);

    var stars = new T.InstancedMesh(source('star'), solid, 5), starPositions = [[0, 5.40, 0.06, 0.28], [-1.55, 4.83, 0.14, 0.17], [1.55, 4.83, 0.14, 0.17], [-2.19, 3.01, 0.12, 0.14], [2.19, 3.01, 0.12, 0.14]];
    // Shared material vertex colours are supplied on this geometry too, while
    // instance colours make the small stars gold/turquoise without extra draws.
    var starColour = new Float32Array(stars.geometry.getAttribute('position').count * 3); starColour.fill(1);
    stars.geometry.setAttribute('color', new T.BufferAttribute(starColour, 3));
    for (var s = 0; s < starPositions.length; s++) stars.setColorAt(s, new T.Color(s > 2 ? 0xfff0b5 : 0xffd767));
    stars.instanceMatrix.setUsage(T.DynamicDrawUsage); stars.frustumCulled = false; stars.castShadow = true; root.add(stars);

    var near = 0, nearGoal = 0, reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update(dt, time, heroPosition) {
      if (disposed) return;
      time = Number.isFinite(time) ? time : 0; dt = Number.isFinite(dt) ? dt : 0;
      // Optional third argument: the runner's world position. The ground ring and veil brighten as she gets close.
      if (heroPosition && Number.isFinite(heroPosition.x)) {
        var gap = Math.hypot(heroPosition.x - root.position.x, heroPosition.z - root.position.z);
        nearGoal = 1 - Math.min(1, Math.max(0, (gap - 2.2) / 7));
      } else nearGoal = 0;
      near += (nearGoal - near) * (1 - Math.exp(-dt * 4));
      var t = reducedMotion ? 0 : time;
      uniforms.uTime.value = t % 1200; uniforms.uNear.value = reducedMotion ? 0 : near;
      // Keep land in view: a full rotation periodically turns the whole sign into an unrecognisable blue ball.
      earth.rotation.y = -1.43 + Math.sin(t * 0.27) * 0.55 + Math.sin(t * 0.11) * 0.2;
      for (var i = 0; i < starPositions.length; i++) {
        var p = starPositions[i]; instance.position.set(p[0], p[1] + Math.sin(t * 1.8 + i * 0.7) * 0.045, p[2]);
        instance.rotation.set(0, 0, Math.sin(t * 1.3 + i) * 0.11); instance.scale.setScalar(p[3]); instance.updateMatrix(); stars.setMatrixAt(i, instance.matrix);
      }
      stars.instanceMatrix.needsUpdate = true;
      for (var k = 0; k < 14; k++) {
        var lap = t * (0.28 + (k % 3) * 0.05) * (k % 2 ? 1 : -1) + k * 0.449, rad = 2.45 + (k % 4) * 0.22 + Math.sin(t * 0.9 + k) * 0.12 + near * 0.25;
        var tw = 0.65 + 0.35 * Math.sin(t * 3 + k * 2.1);
        instance.position.set(Math.cos(lap) * rad, 3.08 + Math.sin(lap) * rad * 0.98, 0.1 + Math.sin(t * 1.3 + k) * 0.22);
        if (instance.position.y < 0.35) instance.position.y = 0.35 + (0.35 - instance.position.y) * 0.2;
        instance.rotation.set(t * 1.1 + k, t * 0.9, 0); instance.scale.setScalar((0.065 + (k % 3) * 0.02) * tw * (1 + near * 0.5)); instance.updateMatrix(); sparks.setMatrixAt(k, instance.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;
    }
    function dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent(); stars.dispose(); sparks.dispose();
      sources.forEach(function (g) { g.dispose(); }); ownedGeometries.forEach(function (g) { g.dispose(); });
      materials.forEach(function (m) { m.dispose(); }); if (ownedMap && map) map.dispose(); root.clear();
    }
    update(0, 0);
    return { root: root, update: update, dispose: dispose };
  }
  window.FLASH_PORTAL = { create: create };
}());
