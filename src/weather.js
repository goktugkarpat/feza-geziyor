/* Selected seasonal scenes, not live weather. One fixed GPU particle pool per
 * country; classic THREE script, no textures, DOM, audio or frame allocations. */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Mevsim havası için grafik motoru yüklenemedi.');
  var HEIGHT = 10, WIDTH = 26;
  var defaults = {
    clear: { kind: 'clear', colour: 0xffffff },
    mist: { kind: 'mist', colour: 0xffffff },
    snow: { kind: 'snow', touchCount: 72, desktopCount: 112, speed: .68, wind: .045, size: 76, opacity: .82, colour: 0xf4fbff },
    rain: { kind: 'rain', touchCount: 80, desktopCount: 128, speed: 3.2, wind: .07, length: .26, opacity: .56, colour: 0xc4e6ee },
    petals: { kind: 'petals', touchCount: 64, desktopCount: 96, speed: .42, wind: .025, size: 102, opacity: .86, colour: 0xffadc7 }
  };
  Object.keys(defaults).forEach(function (key) { Object.freeze(defaults[key]); });
  var profiles = {
    tr: defaults.clear, us: defaults.clear, ca: defaults.snow,
    be: Object.freeze({ kind: 'rain', touchCount: 64, desktopCount: 96, speed: 2.3, wind: .04, length: .22, opacity: .46, colour: 0xd6e9ed }),
    fr: defaults.clear, ru: defaults.snow, jp: defaults.petals,
    cn: defaults.mist, eg: defaults.clear, br: defaults.rain
  };
  Object.freeze(profiles);
  var pointsVertex = [
    'uniform float uTime, uSpeed, uWind, uSize, uPetal;',
    'attribute float aSeed;',
    'varying float vSeed, vFade;',
    'void main(){',
    '  float y = mod(position.y - uTime * uSpeed * (0.82 + aSeed * 0.34), 10.0);',
    '  vec3 p = position; p.y = y;',
    '  float wave = uTime * (0.34 + aSeed * 0.13) + aSeed * 19.0;',
    '  p.x += sin(wave) * (0.28 + uPetal * 0.35) + (10.0-y) * uWind;',
    '  p.z += cos(wave * 0.81) * (0.17 + uPetal * 0.32);',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = clamp(uSize / max(1.0, -mv.z), 1.4, 4.5 + uPetal * 1.5);',
    '  vSeed = aSeed;',
    '  vFade = smoothstep(0.0, 0.65, y) * (1.0 - smoothstep(9.35, 10.0, y));',
    '}'
  ].join('\n');
  var pointsFragment = [
    'uniform vec3 uColour;',
    'uniform float uOpacity, uPetal, uTime;',
    'varying float vSeed, vFade;',
    'void main(){',
    '  vec2 q = (gl_PointCoord - 0.5) * 2.0;',
    '  float angle = vSeed * 6.2831853 + uTime * 0.38;',
    '  float cs = cos(angle), sn = sin(angle);',
    '  vec2 r = vec2(q.x*cs-q.y*sn, q.x*sn+q.y*cs);',
    '  float circle = length(q);',
    '  float petal = length(vec2(r.x / 0.65, r.y / 0.95));',
    '  float edge = mix(circle, petal, uPetal);',
    '  float alpha = (1.0 - smoothstep(0.38, 1.0, edge)) * uOpacity * vFade;',
    '  if(alpha < 0.03) discard;',
    '  gl_FragColor = vec4(mix(uColour, vec3(1.0), vSeed * 0.10), alpha);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  var rainVertex = [
    'uniform float uTime, uSpeed, uWind, uLength;',
    'attribute float aSeed, aEnd;',
    'varying float vFade;',
    'void main(){',
    '  float y = mod(position.y - uTime * uSpeed * (0.88 + aSeed * 0.24), 10.0);',
    '  vec3 p = position;',
    '  p.y = y - aEnd * uLength;',
    '  p.x += (10.0-y) * uWind + aEnd * uLength * 0.34;',
    '  p.z += aEnd * uLength * 0.12;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '  vFade = smoothstep(0.0, 0.55, y) * (1.0 - smoothstep(9.45, 10.0, y));',
    '}'
  ].join('\n');
  var rainFragment = [
    'uniform vec3 uColour;',
    'uniform float uOpacity;',
    'varying float vFade;',
    'void main(){',
    '  gl_FragColor = vec4(uColour, uOpacity * vFade);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');

  function create(country, options) {
    options = options || {};
    var id = typeof country === 'string' ? country : country && country.id || '';
    var preset = profiles[id] || defaults.clear;
    var requested = country && country.environment && country.environment.weather;
    var kind = Object.prototype.hasOwnProperty.call(defaults, requested) ? requested : preset.kind;
    var style = kind === preset.kind ? preset : defaults[kind];
    var reduced = options.reduced === undefined ? typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches : !!options.reduced;
    var count = reduced ? 0 : (options.touch ? style.touchCount : style.desktopCount) || 0;
    var root = new T.Group(); root.name = 'mevsim-havası-' + kind;
    var profile = Object.freeze({ country: id, kind: kind, count: count, draws: count ? 1 : 0,
      reduced: !!reduced, speed: style.speed || 0, wind: style.wind || 0, colour: style.colour,
      height: HEIGHT, width: WIDTH, cpuPositionsPerFrame: 0, textures: 0 });
    root.userData.weather = profile;
    var geometry = null, material = null, destroyed = false, clock = 0;
    if (count) {
      var rain = kind === 'rain', vertices = count * (rain ? 2 : 1);
      var positions = new Float32Array(vertices * 3), seeds = new Float32Array(vertices), ends = rain ? new Float32Array(vertices) : null;
      var seed = 48179 + id.length * 173;
      for (var letter = 0; letter < id.length; letter++) seed += id.charCodeAt(letter) * (letter + 1) * 137;
      function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
      for (var i = 0; i < count; i++) {
        var x = (random() - .5) * WIDTH, z = (random() - .5) * WIDTH;
        // Keep the physical space around the child clear. The small particles
        // are decorative, with no bright screen-sized sheets or face effects.
        if (x*x + z*z < 9) { x += x < 0 ? -3 : 3; z += z < 0 ? -1 : 1; }
        var y = random() * HEIGHT, particleSeed = random();
        for (var end = 0; end < (rain ? 2 : 1); end++) {
          var at = rain ? i * 2 + end : i;
          positions[at*3] = x; positions[at*3+1] = y; positions[at*3+2] = z; seeds[at] = particleSeed;
          if (ends) ends[at] = end;
        }
      }
      geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      geometry.setAttribute('aSeed', new T.BufferAttribute(seeds, 1));
      if (ends) geometry.setAttribute('aEnd', new T.BufferAttribute(ends, 1));
      geometry.boundingSphere = new T.Sphere(new T.Vector3(0, HEIGHT*.5, 0), 22);
      var uniforms = { uTime: { value: 0 }, uColour: { value: new T.Color(style.colour) },
        uOpacity: { value: style.opacity }, uSpeed: { value: style.speed }, uWind: { value: style.wind } };
      if (rain) uniforms.uLength = { value: style.length };
      else { uniforms.uSize = { value: style.size }; uniforms.uPetal = { value: kind === 'petals' ? 1 : 0 }; }
      material = new T.ShaderMaterial({ uniforms: uniforms, vertexShader: rain ? rainVertex : pointsVertex,
        fragmentShader: rain ? rainFragment : pointsFragment, transparent: true, depthWrite: false, depthTest: true, toneMapped: false });
      var effect = rain ? new T.LineSegments(geometry, material) : new T.Points(geometry, material);
      effect.name = kind === 'snow' ? 'Yumuşak kar taneleri' : kind === 'petals' ? 'Kiraz çiçeği yaprakları' : 'Hafif yağmur';
      // Bounds cover the complete shader motion; no buffers are uploaded again.
      effect.frustumCulled = false; effect.renderOrder = 2; root.add(effect);
    }
    function update(dt, time, anchor) {
      if (destroyed) return;
      clock = Number.isFinite(time) ? time : clock + Math.min(.1, Math.max(0, Number(dt) || 0));
      if (material) material.uniforms.uTime.value = ((clock % 3600) + 3600) % 3600;
      if (anchor) root.position.set(Number.isFinite(anchor.x) ? anchor.x : 0, 0, Number.isFinite(anchor.z) ? anchor.z : 0);
    }
    function dispose() {
      if (destroyed) return; destroyed = true;
      root.removeFromParent(); if (geometry) geometry.dispose(); if (material) material.dispose();
      geometry = null; material = null; root.clear();
    }
    return Object.freeze({ root: root, kind: kind, count: count, profile: profile, update: update, dispose: dispose });
  }
  window.FLASH_WEATHER = Object.freeze({ create: create, profiles: profiles });
}());
