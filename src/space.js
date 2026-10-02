/* A quiet illustrated sky: three fixed GPU draws, behind the Earth and Feza.
 * Classic THREE r170 script. No textures, audio, timers or frame allocations. */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Uzay için grafik motoru yüklenemedi.');
  var DEPTH = 90, STAR_COUNT = 720;
  var starsVertex = [
    'uniform vec2 uHalf;',
    'uniform float uDepth, uTime, uPixelRatio;',
    'attribute float aSeed, aSize;',
    'varying float vBrightness, vSeed;',
    'void main(){',
    '  vec3 p = vec3(position.xy * uHalf, -uDepth);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '  gl_PointSize = aSize * uPixelRatio;',
    '  vBrightness = 0.78 + 0.12 * sin(uTime * (0.38 + aSeed * 0.22) + aSeed * 21.0);',
    '  vSeed = aSeed;',
    '}'
  ].join('\n');
  var starsFragment = [
    'varying float vBrightness, vSeed;',
    'void main(){',
    '  float radius = length((gl_PointCoord - 0.5) * 2.0);',
    '  float alpha = (1.0 - smoothstep(0.28, 1.0, radius)) * vBrightness;',
    '  if(alpha < 0.035) discard;',
    '  vec3 colour = mix(vec3(0.64, 0.80, 1.0), vec3(1.0, 0.94, 0.80), vSeed * 0.48);',
    '  gl_FragColor = vec4(colour, alpha);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  var shootingVertex = [
    'uniform vec2 uHalf;',
    'uniform float uDepth, uTime, uPixelWorld;',
    'attribute float aShooter, aTail;',
    'varying float vAlpha, vTail;',
    'void main(){',
    '  float second = step(0.5, aShooter);',
    '  float delay = mix(2.5, 7.2, second);',
    '  float period = mix(9.0, 13.0, second);',
    '  float elapsed = uTime - delay;',
    '  float age = mod(max(0.0, elapsed), period);',
    '  float duration = mix(2.15, 2.4, second);',
    '  float progress = clamp(age / duration, 0.0, 1.0);',
    '  vec2 start = mix(vec2(-1.06, 0.90), vec2(1.06, 0.87), second);',
    '  vec2 travel = mix(vec2(0.78, -0.14), vec2(-1.02, -0.12), second);',
    '  vec2 head = (start + travel * progress) * uHalf;',
    '  vec2 direction = normalize(travel * uHalf);',
    '  vec2 p = head - direction * aTail * mix(62.0, 72.0, second) * uPixelWorld;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, -uDepth, 1.0);',
    '  vAlpha = step(0.0, elapsed) * smoothstep(0.0, 0.18, age) * (1.0 - smoothstep(duration - 0.32, duration, age));',
    '  vTail = aTail;',
    '}'
  ].join('\n');
  var shootingFragment = [
    'varying float vAlpha, vTail;',
    'void main(){',
    '  float alpha = vAlpha * (1.0 - vTail) * (1.0 - vTail) * 0.78;',
    '  if(alpha < 0.018) discard;',
    '  gl_FragColor = vec4(mix(vec3(0.77, 0.88, 1.0), vec3(1.0, 0.97, 0.86), 1.0-vTail), alpha);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  var meteorVertex = [
    'uniform vec2 uHalf;',
    'uniform float uDepth, uTime, uPixelWorld;',
    'attribute vec2 aOrigin;',
    'attribute float aSeed, aRadius;',
    'varying vec3 vNormal;',
    'varying float vSeed;',
    'void main(){',
    '  float angle = aSeed * 6.2831853 + uTime * (0.075 + aSeed * 0.035);',
    '  float cs = cos(angle), sn = sin(angle), ct = cos(angle*0.67), st = sin(angle*0.67);',
    '  mat3 rotation = mat3(cs, sn, 0.0, -sn*ct, cs*ct, st, sn*st, -cs*st, ct);',
    '  vec3 rock = rotation * position * aRadius * uPixelWorld;',
    '  vec2 drift = vec2(sin(uTime * 0.055 + aSeed * 9.0) * 0.045, cos(uTime * 0.041 + aSeed * 7.0) * 0.035);',
    '  vec3 p = rock + vec3((aOrigin + drift) * uHalf, -uDepth);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '  vNormal = rotation * normal; vSeed = aSeed;',
    '}'
  ].join('\n');
  var meteorFragment = [
    'varying vec3 vNormal;',
    'varying float vSeed;',
    'void main(){',
    '  float light = 0.52 + 0.48 * max(0.0, dot(normalize(vNormal), normalize(vec3(-0.5, 0.75, 0.65))));',
    '  vec3 colour = mix(vec3(0.39, 0.48, 0.62), vec3(0.61, 0.48, 0.42), vSeed);',
    '  gl_FragColor = vec4(colour * light, 1.0);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');

  function create(options) {
    options = options || {};
    var touch = !!options.touch;
    var reduced = options.reduced === undefined ? typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches : !!options.reduced;
    var root = new T.Group(); root.name = 'sakin-uzay';
    var profile = Object.freeze({ stars: STAR_COUNT, shootingStars: reduced ? 0 : 2,
      meteors: reduced ? 0 : 3, draws: reduced ? 1 : 3, geometries: reduced ? 1 : 3,
      materials: reduced ? 1 : 3, textures: 0, cpuBufferUploadsPerFrame: 0,
      backgroundDepth: DEPTH, reduced: !!reduced, touch: touch,
      starSizePixels: Object.freeze([1.1, 2.8]), meteorDiameterPixels: Object.freeze([5.4, 7.0, 4.8]),
      shootingTailPixels: Object.freeze([62, 72]), shootingPeriodsSeconds: Object.freeze([9, 13]),
      shootingDelaysSeconds: Object.freeze([2.5, 7.2]), shootingDurationsSeconds: Object.freeze([2.15, 2.4]) });
    root.userData.space = profile;
    var geometries = [], materials = [], meteor = null, destroyed = false, clock = 0;
    var worldPosition = new T.Vector3(), worldQuaternion = new T.Quaternion();
    var common = { uHalf: { value: new T.Vector2(35.4, 35.4) }, uDepth: { value: DEPTH },
      uTime: { value: 0 }, uPixelWorld: { value: 70.8 / 768 }, uPixelRatio: { value: 1 } };
    function material(vertex, fragment, transparent) {
      var value = new T.ShaderMaterial({ uniforms: common, vertexShader: vertex, fragmentShader: fragment,
        transparent: transparent, depthTest: true, depthWrite: !transparent, toneMapped: false, fog: false });
      materials.push(value); return value;
    }
    var seed = 83021;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    var positions = new Float32Array(STAR_COUNT * 3), seeds = new Float32Array(STAR_COUNT), sizes = new Float32Array(STAR_COUNT);
    for (var i = 0; i < STAR_COUNT; i++) {
      positions[i*3] = (random() * 2 - 1) * 1.04;
      positions[i*3+1] = (random() * 2 - 1) * 1.04;
      seeds[i] = random(); sizes[i] = i % 23 === 0 ? 2.8 : 1.1 + random() * 1.1;
    }
    var starGeometry = new T.BufferGeometry(); geometries.push(starGeometry);
    starGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    starGeometry.setAttribute('aSeed', new T.BufferAttribute(seeds, 1));
    starGeometry.setAttribute('aSize', new T.BufferAttribute(sizes, 1));
    var stars = new T.Points(starGeometry, material(starsVertex, starsFragment, true));
    stars.name = 'uzay-yıldızları'; stars.frustumCulled = false; root.add(stars);
    if (!reduced) {
      // Sixteen short segments in each tail, with two immutable vertex pools.
      var segments = 16, vertices = 2 * segments * 2;
      var linePositions = new Float32Array(vertices * 3), shooters = new Float32Array(vertices), tails = new Float32Array(vertices);
      for (var shooter = 0; shooter < 2; shooter++) for (var segment = 0; segment < segments; segment++) for (var end = 0; end < 2; end++) {
        var at = (shooter * segments + segment) * 2 + end;
        shooters[at] = shooter; tails[at] = (segment + end) / segments;
      }
      var lineGeometry = new T.BufferGeometry(); geometries.push(lineGeometry);
      lineGeometry.setAttribute('position', new T.BufferAttribute(linePositions, 3));
      lineGeometry.setAttribute('aShooter', new T.BufferAttribute(shooters, 1));
      lineGeometry.setAttribute('aTail', new T.BufferAttribute(tails, 1));
      var shooting = new T.LineSegments(lineGeometry, material(shootingVertex, shootingFragment, true));
      shooting.name = 'seyrek-kayan-yıldızlar'; shooting.frustumCulled = false; root.add(shooting);
      var rockGeometry = new T.IcosahedronGeometry(1, 1); geometries.push(rockGeometry);
      rockGeometry.setAttribute('aOrigin', new T.InstancedBufferAttribute(new Float32Array([-.76,.42, .80,.70, .73,-.59]), 2));
      rockGeometry.setAttribute('aSeed', new T.InstancedBufferAttribute(new Float32Array([.19,.64,.92]), 1));
      rockGeometry.setAttribute('aRadius', new T.InstancedBufferAttribute(new Float32Array([2.7,3.5,2.4]), 1));
      meteor = new T.InstancedMesh(rockGeometry, material(meteorVertex, meteorFragment, false), 3);
      var identity = new T.Matrix4();
      for (var instance = 0; instance < 3; instance++) meteor.setMatrixAt(instance, identity);
      meteor.instanceMatrix.needsUpdate = true;
      meteor.name = 'küçük-uzay-taşları'; meteor.frustumCulled = false; root.add(meteor);
    }
    function update(dt, time, camera) {
      if (destroyed) return;
      clock = Number.isFinite(time) ? time : clock + Math.min(.1, Math.max(0, Number(dt) || 0));
      // The two shooting periods divide this wrap; long sessions retain small
      // GPU time values without accumulating floating-point jitter.
      common.uTime.value = reduced ? 0 : Math.max(0, clock) % 46800;
      if (!camera) return;
      // The caller positions the camera first. Keep every decorative fragment
      // ninety units away, so ordinary depth testing protects the foreground.
      camera.getWorldPosition(worldPosition); camera.getWorldQuaternion(worldQuaternion);
      root.position.copy(worldPosition); root.quaternion.copy(worldQuaternion);
      var fov = Number.isFinite(camera.fov) ? camera.fov : 43;
      var zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
      var half = DEPTH * Math.tan(fov * Math.PI / 360) / zoom;
      var aspect = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1;
      var height = Number.isFinite(window.innerHeight) && window.innerHeight > 0 ? window.innerHeight : 768;
      common.uHalf.value.set(half * aspect, half); common.uPixelWorld.value = half * 2 / height;
      // This optional read only keeps tiny Points consistent with the game's
      // chosen drawing resolution; no renderer is required by the module.
      var renderer = window.FLASH_CORE && window.FLASH_CORE.renderer;
      var ratio = renderer && typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : Math.min(Number(window.devicePixelRatio) || 1, touch ? 1 : 1.5);
      common.uPixelRatio.value = Math.max(.5, Math.min(2, ratio));
    }
    function dispose() {
      if (destroyed) return; destroyed = true;
      root.removeFromParent(); if (meteor) meteor.dispose();
      for (var i = 0; i < geometries.length; i++) geometries[i].dispose();
      for (var j = 0; j < materials.length; j++) materials[j].dispose();
      root.clear(); geometries.length = materials.length = 0; meteor = null;
    }
    return Object.freeze({ root: root, update: update, dispose: dispose, profile: profile });
  }
  window.FLASH_SPACE = Object.freeze({ create: create });
}());
