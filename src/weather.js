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


  // Small ambient life (butterflies, birds, falling leaves, lanterns, dust):
  // one pooled Points draw, positions wrap around the child in the shader.
  var LIFE_SPAN = 40;
  var lifeVertex = [
    'uniform float uTime, uScale;',
    'uniform vec3 uAnchor;',
    'attribute float aSeed, aType;',
    'attribute vec3 aColour;',
    'varying float vSeed, vType;',
    'varying vec3 vColour;',
    'void main(){',
    '  vec3 p = position;',
    '  float t = uTime, sd = aSeed;',
    '  float size = 5.0;',
    '  if(aType < .5){',
    '    p.x += sin(t*(.35+sd*.3)+sd*40.0)*3.2 + t*.12; p.z += cos(t*(.3+sd*.25)+sd*17.0)*3.2;',
    '    p.y += sin(t*2.1+sd*30.0)*.22 + sin(t*.4+sd*9.0)*.35; size = 7.0;',
    '  } else if(aType < 1.5){',
    '    p.x += t*(1.2+sd*1.4); p.z += sin(t*.2+sd*9.0)*4.0; p.y += sin(t*.5+sd*7.0)*.8; size = 15.0;',
    '  } else if(aType < 2.5){',
    '    p.y = mod(position.y - t*(.35+sd*.25), 9.0) + .1; p.x += sin(t*.9+sd*30.0)*.9; p.z += cos(t*.7+sd*23.0)*.9; size = 6.0;',
    '  } else if(aType < 3.5){',
    '    p.y = mod(position.y + t*(.22+sd*.1), 14.0) + 1.0; p.x += sin(t*.3+sd*20.0)*.6; p.z += cos(t*.27+sd*11.0)*.6; size = 22.0;',
    '  } else {',
    '    p.x += t*(.5+sd*.5) + sin(t*.6+sd*20.0); p.z += sin(t*.35+sd*13.0)*1.2; p.y += sin(t*.8+sd*15.0)*.25; size = 3.5;',
    '  }',
    '  p.xz = mod(p.xz - uAnchor.xz + 20.0, 40.0) - 20.0;',
    '  float away = length(p.xz);',
    '  if(away < 2.6 && p.y < 4.0) p.xz *= 2.6 / max(away, .1);',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = clamp(uScale * size / max(1.0, -mv.z), 2.0, 30.0);',
    '  vSeed = sd; vType = aType; vColour = aColour;',
    '}'
  ].join('\n');
  var lifeFragment = [
    'uniform float uTime;',
    'varying float vSeed, vType;',
    'varying vec3 vColour;',
    'void main(){',
    '  vec2 q = (gl_PointCoord - .5) * 2.0; q.y = -q.y;',
    '  float a = 0.0; vec3 col = vColour;',
    '  if(vType < .5){',
    '    float f = .35 + .65 * abs(cos(uTime*13.0 + vSeed*40.0));',
    '    vec2 w = vec2((abs(q.x) - .42*f) / (.4*f + .05), q.y / .8);',
    '    a = 1.0 - smoothstep(.8, 1.0, length(w));',
    '    float body = (1.0 - smoothstep(.07, .14, abs(q.x))) * (1.0 - smoothstep(.4, .55, abs(q.y)));',
    '    col = mix(col, vec3(.15,.1,.08), body); a = max(a, body);',
    '  } else if(vType < 1.5){',
    '    float f = sin(uTime*5.5 + vSeed*30.0);',
    '    float d = abs(q.y - (abs(q.x) * (.65 * f) - .15));',
    '    a = (1.0 - smoothstep(.09, .2, d)) * (1.0 - smoothstep(.75, 1.0, abs(q.x)));',
    '  } else if(vType < 2.5){',
    '    float an = uTime*(.8+vSeed) + vSeed*20.0; float cs = cos(an), sn = sin(an);',
    '    vec2 r = vec2(q.x*cs - q.y*sn, q.x*sn + q.y*cs);',
    '    a = 1.0 - smoothstep(.7, 1.0, length(vec2(r.x/.95, r.y/.5)));',
    '  } else if(vType < 3.5){',
    '    float r = length(q); float flick = .88 + .12*sin(uTime*3.0 + vSeed*50.0);',
    '    a = (1.0 - smoothstep(.12, .62, r)) * flick + (1.0 - smoothstep(.0, 1.0, r)) * .3;',
    '    col = mix(col, vec3(1.0,.93,.62), 1.0 - smoothstep(.0, .35, r));',
    '  } else {',
    '    a = (1.0 - smoothstep(.2, 1.0, length(q))) * .32;',
    '  }',
    '  if(a < .03) discard;',
    '  gl_FragColor = vec4(col, min(a, .95));',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  function lifeSpec(id, reduced, touch) {
    var looks = window.FLASH_SURFACES && window.FLASH_SURFACES.looks, look = looks && looks[id], l = look && look.life;
    if (reduced || !l) return null;
    var k = touch ? .75 : 1, list = [];
    function add(type, n, cols, ylo, yhi) { n = Math.round((n || 0) * k); for (var i = 0; i < n; i++) list.push({ type: type, cols: cols, ylo: ylo, yhi: yhi }); }
    add(0, l.butterfly, l.bf || [0xffd35a, 0xffffff], .5, 2.4);
    add(1, l.bird, l.birdc || [0x38505e], 11, 18);
    add(2, l.leaf, l.leafc || [0xd98a3a], 1, 8);
    add(3, l.lantern, l.lanternc || [0xff6a3d, 0xffb347], 1, 12);
    add(4, l.dust, l.dustc || [0xf3dcae], .3, 3);
    return list.length ? list : null;
  }

  function create(country, options) {
    options = options || {};
    var id = typeof country === 'string' ? country : country && country.id || '';
    var preset = profiles[id] || defaults.clear;
    var requested = country && country.environment && country.environment.weather;
    var kind = Object.prototype.hasOwnProperty.call(defaults, requested) ? requested : preset.kind;
    var style = kind === preset.kind ? preset : defaults[kind];
    var reduced = options.reduced === undefined ? typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches : !!options.reduced;
    var lifeList = lifeSpec(id, reduced, options.touch);
    var count = reduced ? 0 : (options.touch ? style.touchCount : style.desktopCount) || 0;
    var root = new T.Group(); root.name = 'mevsim-havası-' + kind;
    var profile = Object.freeze({ country: id, kind: kind, count: count, draws: (count ? 1 : 0) + (lifeList ? 1 : 0), life: lifeList ? lifeList.length : 0,
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
    var lifeGeo = null, lifeMat = null;
    if (lifeList) {
      var n = lifeList.length, lp = new Float32Array(n * 3), ls = new Float32Array(n), lt = new Float32Array(n), lc = new Float32Array(n * 3), col = new T.Color();
      var ls0 = 7331 + id.length * 97; for (var lt0 = 0; lt0 < id.length; lt0++) ls0 += id.charCodeAt(lt0) * (lt0 + 3) * 59;
      var lr = function () { ls0 = (Math.imul(ls0, 1664525) + 1013904223) >>> 0; return ls0 / 4294967296; };
      for (var li = 0; li < n; li++) {
        var it = lifeList[li]; lp[li*3] = (lr() - .5) * 40; lp[li*3+1] = it.ylo + lr() * (it.yhi - it.ylo); lp[li*3+2] = (lr() - .5) * 40;
        ls[li] = lr(); lt[li] = it.type; col.set(it.cols[Math.floor(lr() * it.cols.length) % it.cols.length]); lc[li*3] = col.r; lc[li*3+1] = col.g; lc[li*3+2] = col.b;
      }
      lifeGeo = new T.BufferGeometry();
      lifeGeo.setAttribute('position', new T.BufferAttribute(lp, 3)); lifeGeo.setAttribute('aSeed', new T.BufferAttribute(ls, 1));
      lifeGeo.setAttribute('aType', new T.BufferAttribute(lt, 1)); lifeGeo.setAttribute('aColour', new T.BufferAttribute(lc, 3));
      lifeGeo.boundingSphere = new T.Sphere(new T.Vector3(0, 8, 0), 40);
      lifeMat = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uScale: { value: 60 }, uAnchor: { value: new T.Vector3() } },
        vertexShader: lifeVertex, fragmentShader: lifeFragment, transparent: true, depthWrite: false, depthTest: true, toneMapped: false });
      var lifePoints = new T.Points(lifeGeo, lifeMat); lifePoints.name = 'Küçük canlılar'; lifePoints.frustumCulled = false; lifePoints.renderOrder = 3; root.add(lifePoints);
    }
    function update(dt, time, anchor) {
      if (destroyed) return;
      clock = Number.isFinite(time) ? time : clock + Math.min(.1, Math.max(0, Number(dt) || 0));
      var tv = ((clock % 3600) + 3600) % 3600;
      if (material) material.uniforms.uTime.value = tv;
      if (lifeMat) { lifeMat.uniforms.uTime.value = tv; if (anchor) lifeMat.uniforms.uAnchor.value.set(Number.isFinite(anchor.x) ? anchor.x : 0, 0, Number.isFinite(anchor.z) ? anchor.z : 0); }
      if (anchor) root.position.set(Number.isFinite(anchor.x) ? anchor.x : 0, 0, Number.isFinite(anchor.z) ? anchor.z : 0);
    }
    function dispose() {
      if (destroyed) return; destroyed = true;
      root.removeFromParent(); if (geometry) geometry.dispose(); if (material) material.dispose(); if (lifeGeo) lifeGeo.dispose(); if (lifeMat) lifeMat.dispose();
      geometry = null; material = null; root.clear();
    }
    return Object.freeze({ root: root, kind: kind, count: count, profile: profile, update: update, dispose: dispose });
  }
  window.FLASH_WEATHER = Object.freeze({ create: create, profiles: profiles });
}());
