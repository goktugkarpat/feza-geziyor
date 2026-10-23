/* Ortak "oyuncak diorama" görünümü (GRAFIK). Klasik script, THREE r170 yerel.
 * core.js'ten hemen sonra, diğer bütün sahne dosyalarından önce yüklenir.
 *
 * 1) Bütün MeshStandardMaterial / MeshPhysicalMaterial gölgelendiricilerine tek
 *    seferlik, dokusuz bir "oyuncak" katmanı eklenir: yumuşak kenar parıltısı
 *    (fresnel, gökyüzü renginde), yere yakın dik yüzeylerde temas gölgesi (AO
 *    hissi) ve doku tekrarını kıran çok hafif dünya-uzayı gürültüsü. Sisli
 *    sahnelerde (gezi, yolculuk) tam, sissiz uzayda yalnız hafif kenar ışığı.
 *    Ek çizim, doku veya kare başına CPU işi yoktur.
 * 2) waterify(material, opts): stilize su (kıyı köpüğü, dalga çizgileri,
 *    güneş pırıltısı, gökyüzü yansıması, dikey yüzeyde akan şelale).
 * 3) sky / clouds / horizon: tek çizimlik gökyüzü kubbesi, tek çizimlik
 *    billboard bulut halkası, tek çizimlik uzak tepe/şehir silüeti halkası.
 * Ortak saat FLASH_GRAFIK.time (uniform nesnesi) sahne çizilmeden önce güncellenir;
 * azaltılmış hareket tercihinde donuktur. */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Grafik kütüphanesi için THREE yüklenemedi.');
  var TAU = Math.PI * 2;
  var reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CLOCK = { value: 0 };

  var NOISE = [
    'float gzHash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float gzNoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gzHash(i),gzHash(i+vec2(1,0)),f.x),mix(gzHash(i+vec2(0,1)),gzHash(i+vec2(1,1)),f.x),f.y); }',
    'float gzFbm(vec2 p){ return gzNoise(p)*.55+gzNoise(p*2.03+7.1)*.3+gzNoise(p*4.1+3.7)*.15; }'
  ].join('\n');

  // ------------------------------------------------------------ toy shading
  var TOY_VS = [
    '#include <fog_vertex>',
    '{ vec4 gzP = vec4( transformed, 1.0 );',
    '#ifdef USE_BATCHING',
    '  gzP = batchingMatrix * gzP;',
    '#endif',
    '#ifdef USE_INSTANCING',
    '  gzP = instanceMatrix * gzP;',
    '#endif',
    '  vGzW = ( modelMatrix * gzP ).xyz; vGzUv = uv; }'
  ].join('\n');
  // Breaks texture repetition with a large, soft world-space tone drift.
  var TOY_FS_TONE = [
    '#ifdef USE_FOG',
    '{ float gzTn = gzNoise( vGzW.xz * 0.21 + vGzW.y * 0.37 ) * 0.65 + gzNoise( vGzW.zx * 0.83 - vGzW.y * 0.5 ) * 0.35;',
    '  diffuseColor.rgb *= 0.95 + 0.10 * gzTn; }',
    '#endif',
    '#include <roughnessmap_fragment>'
  ].join('\n');
  // Contact shadow near the ground on side faces + darker undersides.
  var TOY_FS_AO = [
    '#include <aomap_fragment>',
    '#ifdef USE_FOG',
    '{ vec3 gzNw = inverseTransformDirection( normal, viewMatrix );',
    '  float gzSide = 1.0 - smoothstep( 0.45, 0.9, gzNw.y );',
    '  float gzLow = 1.0 - smoothstep( -0.1, 1.15, vGzW.y );',
    '  float gzAO = 1.0 - 0.36 * gzLow * gzLow * gzSide - 0.18 * max( -gzNw.y, 0.0 );',
    '  reflectedLight.indirectDiffuse *= gzAO;',
    '  reflectedLight.directDiffuse *= mix( 1.0, gzAO, 0.5 ); }',
    '#endif'
  ].join('\n');
  // Soft sky-coloured sheen along silhouettes, stronger on upward faces.
  var TOY_FS_RIM = [
    '{ vec3 gzNw2 = inverseTransformDirection( normal, viewMatrix );',
    '  float gzF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );',
    '  gzF = gzF * gzF * gzF;',
    '  vec3 gzSky = vec3( 0.8, 0.9, 1.0 );',
    '#if NUM_HEMI_LIGHTS > 0',
    '  gzSky = hemisphereLights[ 0 ].skyColor;',
    '#endif',
    '#ifdef USE_FOG',
    '  float gzK = 0.26;',
    '#else',
    '  float gzK = 0.10;',
    '#endif',
    '  outgoingLight += gzSky * ( diffuseColor.rgb * 0.75 + 0.1 ) * gzF * gzK * ( 0.4 + 0.6 * saturate( gzNw2.y * 0.5 + 0.6 ) ); }',
    '#include <opaque_fragment>'
  ].join('\n');
  function patchToy(lib) {
    if (!lib || lib.vertexShader.indexOf('vGzW') >= 0) return;
    lib.vertexShader = 'varying vec3 vGzW;\nvarying vec2 vGzUv;\n' + lib.vertexShader.replace('#include <fog_vertex>', TOY_VS);
    lib.fragmentShader = 'varying vec3 vGzW;\nvarying vec2 vGzUv;\n' + NOISE + '\n' + lib.fragmentShader
      .replace('#include <roughnessmap_fragment>', TOY_FS_TONE)
      .replace('#include <aomap_fragment>', TOY_FS_AO)
      .replace('#include <opaque_fragment>', TOY_FS_RIM);
  }
  patchToy(T.ShaderLib.standard);
  if (T.ShaderLib.physical && T.ShaderLib.physical !== T.ShaderLib.standard) patchToy(T.ShaderLib.physical);

  // ------------------------------------------------------------------ water
  var WATER_COLOR = [
    '#include <color_fragment>',
    'vec3 gzWn = normalize( inverseTransformDirection( vNormal, viewMatrix ) );',
    'float gzTop = smoothstep( 0.45, 0.8, gzWn.y );',
    'float gzDist = length( vViewPosition );',
    'float gzNear = 1.0 - smoothstep( 28.0, 85.0, gzDist );',
    'float gzFoamOut = 0.0;',
    '{ vec2 gzP = vGzW.xz; float gzT = gzTime; float gzEdge = 1e3;',
    '#if GZ_EDGE == 1',
    '  { vec2 e = min( vGzUv, 1.0 - vGzUv ); vec2 du = max( fwidth( vGzUv ), vec2( 1e-5 ) ); float wp = length( fwidth( vGzW ) ); vec2 ew = e * ( wp / du ); gzEdge = min( ew.x, ew.y ); }',
    '#elif GZ_EDGE == 2',
    '  gzEdge = max( abs( gzP.x ), abs( gzP.y ) ) - GZ_ISLAND;',
    '#endif',
    '  vec3 gzBase = diffuseColor.rgb;',
    '  vec3 gzDeep = gzBase * vec3( 0.50, 0.74, 0.90 );',
    '  vec3 gzShallow = mix( gzBase * 1.06, vec3( 0.72, 0.97, 0.93 ), 0.32 );',
    '  vec3 gzCol = mix( gzDeep, gzShallow, exp( -max( gzEdge, 0.0 ) * GZ_SHALLOW ) );',
    '  float gzN1 = gzNoise( gzP * 0.42 + vec2( gzT * 0.16, gzT * 0.05 ) );',
    '  float gzN2 = gzNoise( gzP * 1.15 + vec2( -gzT * 0.09, gzT * 0.14 ) );',
    '  float gzCrest = 1.0 - smoothstep( 0.0, 0.05, abs( gzN1 + gzN2 * 0.45 - 0.72 ) );',
    '  gzCol = mix( gzCol, vec3( 0.92, 1.0, 1.0 ), gzCrest * 0.45 * gzNear * gzTop );',
    '  float gzFw = GZ_FOAM * ( 1.0 + 0.45 * sin( gzT * 1.4 + gzP.x * 0.6 + gzP.y * 0.45 ) + ( gzN2 - 0.5 ) * 0.9 );',
    '  float gzFoam = 1.0 - smoothstep( gzFw * 0.55, gzFw, gzEdge );',
    '  gzFoam += ( 1.0 - smoothstep( 0.0, 0.07 + GZ_FOAM * 0.12, abs( gzEdge - gzFw * 2.1 - GZ_FOAM * 0.5 * sin( gzT * 0.9 + gzN1 * 3.0 ) ) ) ) * 0.6;',
    '  gzFoam = clamp( gzFoam, 0.0, 1.0 ) * gzTop;',
    '  float gzFall = 1.0 - gzTop;',
    '  float gzStreak = smoothstep( 0.5, 0.85, gzNoise( vec2( ( vGzW.x + vGzW.z ) * 2.4, vGzW.y * 0.8 + gzT * 2.8 ) ) );',
    '  gzCol = mix( gzCol, mix( gzBase, vec3( 1.0 ), 0.3 ), gzFall * 0.6 );',
    '  gzFoam = max( gzFoam, gzStreak * gzFall * 0.8 );',
    '  diffuseColor.rgb = mix( gzCol, vec3( 1.0 ), gzFoam * 0.92 );',
    '  gzFoamOut = gzFoam; }'
  ].join('\n');
  var WATER_NORMAL = [
    '#include <normal_fragment_maps>',
    '{ vec2 q = vGzW.xz; float t = gzTime;',
    '  vec2 g = vec2( cos( q.x * 1.3 + t * 1.4 + sin( q.y * 0.7 ) ), cos( q.y * 1.1 - t * 1.1 + sin( q.x * 0.5 ) ) ) * 0.11',
    '         + vec2( cos( ( q.x + q.y ) * 2.7 + t * 2.1 ), cos( ( q.x - q.y ) * 2.3 - t * 1.7 ) ) * 0.06;',
    '  normal = normalize( normal + ( viewMatrix * vec4( g.x, 0.0, g.y, 0.0 ) ).xyz * gzTop * ( 1.0 - gzFoamOut ) * ( 0.35 + 0.65 * gzNear ) ); }'
  ].join('\n');
  var WATER_EMISSIVE = [
    '#include <emissivemap_fragment>',
    '{ float gzFr = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 4.0 );',
    '  vec3 gzSkyC = vec3( 0.78, 0.9, 1.0 );',
    '#ifdef USE_FOG',
    '  gzSkyC = fogColor;',
    '#endif',
    '  totalEmissiveRadiance += gzSkyC * gzFr * 0.5 * gzTop * ( 1.0 - gzFoamOut );',
    '  vec2 c = floor( vGzW.xz * 1.7 ); float h = gzHash( c ); vec2 f = fract( vGzW.xz * 1.7 ) - 0.5;',
    '  float d = length( f - ( vec2( gzHash( c + 3.1 ), gzHash( c + 9.7 ) ) - 0.5 ) * 0.5 );',
    '  float tw = step( 0.86, h ) * pow( max( 0.0, sin( gzTime * 2.3 + h * 70.0 ) ), 8.0 ) * ( 1.0 - smoothstep( 0.03, 0.11, d ) ) * gzNear * gzTop * ( 1.0 - gzFoamOut );',
    '  totalEmissiveRadiance += vec3( 1.0, 0.98, 0.9 ) * tw * 0.9; }'
  ].join('\n');
  /* Turns an existing MeshStandardMaterial into stylized water. Keeps any
   * previous onBeforeCompile (e.g. places.js motion/fx) and extends its cache key.
   * opts.edge: 'uv' (box/strip edges from UVs, default), 'island' (square island
   * of half size opts.island), 'none'. opts.foam: foam width in metres. */
  function waterify(mat, opts) {
    if (!mat || mat.userData.gzWater) return mat;
    opts = opts || {};
    var edge = opts.edge === 'island' ? 2 : opts.edge === 'none' ? 0 : 1;
    var prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
    mat.map = null; mat.roughness = opts.roughness === undefined ? .16 : opts.roughness; mat.metalness = opts.metalness === undefined ? .05 : opts.metalness;
    mat.defines = Object.assign({}, mat.defines, { GZ_EDGE: edge, GZ_ISLAND: (opts.island || 62).toFixed(2), GZ_SHALLOW: (opts.shallow || .35).toFixed(3), GZ_FOAM: (opts.foam || .32).toFixed(3) });
    mat.userData.gzWater = true;
    mat.onBeforeCompile = function (shader, renderer) {
      if (prev) prev.call(this, shader, renderer);
      shader.uniforms.gzTime = CLOCK;
      shader.fragmentShader = 'uniform float gzTime;\n' + shader.fragmentShader
        .replace('#include <color_fragment>', WATER_COLOR)
        .replace('#include <normal_fragment_maps>', WATER_NORMAL)
        .replace('#include <emissivemap_fragment>', WATER_EMISSIVE);
    };
    var key = 'gzw' + edge;
    mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(mat) : '') + '|' + key; };
    mat.needsUpdate = true;
    return mat;
  }

  // ---------------------------------------------------------------- foliage
  // Leaves/blossom: a little more colour, brighter sun-facing tops and a soft
  // "light through the leaves" wrap, so canopies read as cheerful rounded toys.
  var LEAF_LIGHT = [
    '#include <lights_fragment_end>',
    '#if NUM_DIR_LIGHTS > 0',
    '{ float gzNL = dot( geometryNormal, directionalLights[ 0 ].direction );',
    '  reflectedLight.directDiffuse += BRDF_Lambert( diffuseColor.rgb ) * directionalLights[ 0 ].color * ( 0.5 * gzNL + 0.5 - saturate( gzNL ) ) * 0.55; }',
    '#endif'
  ].join('\n');
  // The landmark leaf texture is slightly green; use only its brightness so
  // blossom stays pink (not salmon), then lift pink blossom towards pink-white.
  var LEAF_COLOR = [
    '#include <color_fragment>',
    '{',
    '#ifdef USE_MAP',
    '  vec4 gzTx = texture2D( map, vMapUv ); float gzTl = dot( gzTx.rgb, vec3( 0.299, 0.587, 0.114 ) );',
    '  diffuseColor.rgb = diffuseColor.rgb / max( gzTx.rgb, vec3( 0.05 ) ) * gzTl;',
    '#endif',
    '  vec3 gzC = diffuseColor.rgb; float gzL = dot( gzC, vec3( 0.299, 0.587, 0.114 ) );',
    '  float gzPink = smoothstep( 0.02, 0.12, gzC.r - gzC.g ) * smoothstep( -0.05, 0.05, gzC.b - gzC.g * 0.9 );',
    '  gzC = max( mix( vec3( gzL ), gzC, 1.2 ), 0.0 ) * 1.05;',
    '  gzC = mix( gzC, vec3( 1.0, 0.72, 0.84 ) * max( gzL * 1.25, 0.55 ), gzPink * 0.55 );',
    '  diffuseColor.rgb = gzC; }'
  ].join('\n');
  function foliage(mat) {
    if (!mat || mat.userData.gzLeaf) return mat;
    var prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
    mat.userData.gzLeaf = true;
    mat.onBeforeCompile = function (shader, renderer) {
      if (prev) prev.call(this, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', LEAF_COLOR).replace('#include <lights_fragment_end>', LEAF_LIGHT);
    };
    mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(mat) : '') + '|gzleaf'; };
    mat.needsUpdate = true;
    return mat;
  }
  /* Ready-made stylized water for country decor (lakes, canals, pools):
   * su({renk, sig (0..1 shallowness), kenar: 'uv'|'yok', kopuk (foam m)}). */
  function su(o) {
    o = o || {};
    var c = new T.Color(o.renk === undefined ? 0x52c8dc : o.renk);
    if (o.sig) c.lerp(new T.Color(0xbff3ec), Math.min(1, o.sig) * .45);
    return waterify(new T.MeshStandardMaterial({ color: c }), { edge: o.kenar === 'yok' ? 'none' : 'uv', foam: o.kopuk || .32, shallow: .35 });
  }
  /* One hook for landmark materials by surface type (places.js / country modules):
   * 'water' -> waterify, 'leaf' -> foliage; other types keep the global toy look. */
  function surface(mat, type, opts) {
    if (type === 'water') return waterify(mat, opts || { edge: 'uv' });
    if (type === 'leaf') return foliage(mat);
    return mat;
  }

  // -------------------------------------------------------------- sky dome
  var SKY_VERT = 'varying vec3 vDir;\nvoid main(){ vDir=normalize(position); vec4 wp=vec4(position+cameraPosition,1.0); gl_Position=projectionMatrix*viewMatrix*wp; gl_Position.z=gl_Position.w; }';
  var SKY_FRAG = [
    'uniform vec3 uHorizon,uZenith,uSunDir,uSunCol;',
    'uniform float uTime,uCloud,uHaze;',
    'varying vec3 vDir;',
    NOISE,
    'void main(){',
    '  vec3 d=normalize(vDir); float h=d.y, hp=max(h,0.0);',
    '  vec3 col=mix(uHorizon,uZenith,pow(smoothstep(0.0,.78,hp),.75));',
    '  float s=max(dot(d,uSunDir),0.0);',
    '  col+=uSunCol*(pow(s,5.0)*.10+pow(s,48.0)*.32);',
    '  col=mix(col,vec3(1.0,.98,.9),smoothstep(.9988,.9994,s)*step(0.0,h));',
    '  col=mix(col,uHorizon*1.03+vec3(.025,.018,.0),(1.0-smoothstep(0.0,.1,hp))*uHaze);',
    '  if(h>0.01){',
    '    vec2 cp=d.xz/(h+.2)*1.3+vec2(uTime*.010,uTime*.004);',
    '    float n=gzFbm(cp*1.1);',
    '    float cl=smoothstep(.56,.80,n)*smoothstep(.02,.22,h)*uCloud;',
    '    col=mix(col,mix(vec3(1.0,.99,.97),uHorizon,.2),cl*.6);',
    '  }',
    '  if(h<0.0) col=uHorizon;',
    '  gl_FragColor=vec4(col,1.0);',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  function trackFog(uniform) {
    return function (renderer, scene) { var h = uniform.value; if (scene.fog) h.copy(scene.fog.color); else if (scene.background && scene.background.isColor) h.copy(scene.background); };
  }
  /* opts: horizon (Color/hex, tracks scene fog), zenith, sunDir (Vector3),
   * sunColor, cloud (0..1 high wispy clouds), haze (0..1). One draw. */
  function sky(opts) {
    opts = opts || {};
    var u = { uHorizon: { value: new T.Color(opts.horizon === undefined ? 0xc9e9f1 : opts.horizon) }, uZenith: { value: new T.Color(opts.zenith === undefined ? 0x6bb6e6 : opts.zenith) },
      uSunDir: { value: (opts.sunDir || new T.Vector3(-18, 30, 16)).clone().normalize() }, uSunCol: { value: new T.Color(opts.sunColor === undefined ? 0xfff0c8 : opts.sunColor) },
      uTime: CLOCK, uCloud: { value: opts.cloud === undefined ? .7 : opts.cloud }, uHaze: { value: opts.haze === undefined ? .6 : opts.haze } };
    var mesh = new T.Mesh(new T.SphereGeometry(100, 24, 14), new T.ShaderMaterial({ uniforms: u, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: T.BackSide, depthWrite: false, depthTest: true, transparent: true, blending: T.NoBlending, fog: false, toneMapped: false }));
    mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'gökyüzü';
    mesh.onBeforeRender = opts.fixedHorizon ? function () {} : trackFog(u.uHorizon);
    mesh.raycast = function () {};
    return mesh;
  }

  // --------------------------------------------------------- cloud puffs
  // Each cloud is one camera-facing (around Y) quad; the shape is 5 soft lobes
  // with a flat base, lit from above. All puffs: one draw, no textures.
  var CLOUD_VERT = [
    'uniform float uTime, uSpin;',
    'attribute vec3 aCenter; attribute vec3 aInfo;',
    'varying vec2 vP; varying float vSeed, vFar, vAsp;',
    'void main(){',
    '  float a = uTime * uSpin * (0.6 + aInfo.z * 0.8);',
    '  float cs = cos(a), sn = sin(a);',
    '  vec3 c = vec3(aCenter.x*cs - aCenter.z*sn, aCenter.y, aCenter.x*sn + aCenter.z*cs);',
    '  vec3 toCam = cameraPosition - c; vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));',
    '  vec3 wp = c + right * position.x * aInfo.x + vec3(0.0, 1.0, 0.0) * position.y * aInfo.y;',
    '  vP = position.xy; vSeed = aInfo.z; vAsp = aInfo.x / aInfo.y; vFar = clamp((length(toCam) - 60.0) / 140.0, 0.0, 1.0);',
    '  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);',
    '}'
  ].join('\n');
  // Cumulus: a flat base, a big central dome and 6 smaller lumps, in a space
  // where the lobes stay round whatever the quad's aspect.
  var CLOUD_FRAG = [
    'uniform vec3 uHorizon, uTop, uShadow; uniform float uOpacity;',
    'varying vec2 vP; varying float vSeed, vFar, vAsp;',
    'float h1(float n){ return fract(sin(n) * 43758.5453); }',
    'void main(){',
    '  vec2 p = vec2(vP.x, vP.y / vAsp);',
    '  float top = 1.0 / vAsp; float base = -top * 0.55; float hg = 0.0;',
    '  for (int i = 0; i < 7; i++) {',
    '    float fi = float(i); float s1 = h1(vSeed * 91.7 + fi * 13.13), s2 = h1(vSeed * 47.3 + fi * 7.77);',
    '    float x = (i == 0) ? (s1 - 0.5) * 0.2 : (fi - 3.5) / 3.5 * 0.68 + (s1 - 0.5) * 0.14;',
    '    float bulge = 1.0 - min(1.0, abs(x) / 0.85);',
    '    float r = (i == 0) ? 0.34 + s2 * 0.06 : 0.13 + bulge * 0.17 + s2 * 0.07;',
    '    float y = base + r * (0.55 + s1 * 0.35) + bulge * top * 0.18;',
    '    vec2 q = (p - vec2(x, y)) / r; float dd = dot(q, q);',
    '    hg = max(hg, sqrt(max(0.0, 1.0 - dd)) * r);',
    '  }',
    '  float cut = smoothstep(base - 0.01, base + 0.035, p.y);',
    '  float a = smoothstep(0.0, 0.045, hg) * cut * uOpacity;',
    '  if (a < 0.01) discard;',
    '  float lit = clamp(hg * 2.4 + (p.y - base) * 1.1, 0.0, 1.0);',
    '  vec3 col = mix(uShadow, uTop, smoothstep(0.05, 0.85, lit));',
    '  col = mix(col, uHorizon, vFar * 0.5);',
    '  gl_FragColor = vec4(col, a);',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  /* opts: count, radius [min,max], height [min,max], size [min,max], seed,
   * spin (rad/s), opacity, top/shadow colours, center (Vector3). One draw. */
  function clouds(opts) {
    opts = opts || {};
    var n = opts.count || 14, r0 = (opts.radius || [120, 150])[0], r1 = (opts.radius || [120, 150])[1], h0 = (opts.height || [22, 40])[0], h1 = (opts.height || [22, 40])[1];
    var s0 = (opts.size || [14, 26])[0], s1 = (opts.size || [14, 26])[1], seed = (opts.seed || 1234) >>> 0, cx = opts.center ? opts.center.x : 0, cz = opts.center ? opts.center.z : 0;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    var pos = new Float32Array(n * 12), cen = new Float32Array(n * 12), info = new Float32Array(n * 12), idx = [];
    var corners = [-1, -1, 1, -1, 1, 1, -1, 1];
    for (var i = 0; i < n; i++) {
      var a = (i + rnd() * .7) / n * TAU, rad = r0 + rnd() * (r1 - r0), y = h0 + rnd() * (h1 - h0), w = s0 + Math.pow(rnd(), 1.6) * (s1 - s0), hh = w * (.5 + rnd() * .14), sd = rnd();
      if (opts.arc) a = opts.arc[0] + (i + rnd() * .7) / n * (opts.arc[1] - opts.arc[0]);
      for (var k = 0; k < 4; k++) {
        var o = (i * 4 + k) * 3;
        pos[o] = corners[k * 2]; pos[o + 1] = corners[k * 2 + 1]; pos[o + 2] = 0;
        cen[o] = cx + Math.cos(a) * rad; cen[o + 1] = y; cen[o + 2] = cz + Math.sin(a) * rad;
        info[o] = w; info[o + 1] = hh; info[o + 2] = sd;
      }
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aCenter', new T.BufferAttribute(cen, 3)); g.setAttribute('aInfo', new T.BufferAttribute(info, 3)); g.setIndex(idx);
    var u = { uTime: CLOCK, uSpin: { value: reduced ? 0 : (opts.spin === undefined ? .004 : opts.spin) }, uHorizon: { value: new T.Color(0xc9e9f1) },
      uTop: { value: new T.Color(opts.top === undefined ? 0xfffdf6 : opts.top) }, uShadow: { value: new T.Color(opts.shadow === undefined ? 0xb9cce0 : opts.shadow) }, uOpacity: { value: opts.opacity === undefined ? .95 : opts.opacity } };
    var mesh = new T.Mesh(g, new T.ShaderMaterial({ uniforms: u, vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, depthTest: true, fog: false, toneMapped: false }));
    mesh.frustumCulled = false; mesh.renderOrder = -9; mesh.name = 'yumuşak bulutlar'; mesh.onBeforeRender = trackFog(u.uHorizon); mesh.raycast = function () {};
    return mesh;
  }

  // ------------------------------------------------------- horizon ring
  // Far hills / mountains / dunes / mesas / karst peaks and optional little
  // city skylines, as two concentric silhouette bands facing the centre.
  // Never trees. Aerial perspective blends them into the fog colour.
  var HZ_VERT = [
    'attribute vec3 color; attribute float aLayer;',
    'varying vec3 vCol; varying float vLayer, vH;',
    'void main(){ vCol = color; vLayer = aLayer; vH = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');
  var HZ_FRAG = [
    'uniform vec3 uHorizon; uniform float uAir;',
    'varying vec3 vCol; varying float vLayer, vH;',
    'void main(){',
    '  float air = mix(uAir * 0.55, uAir, vLayer);',
    '  air = mix(air, min(1.0, air + 0.35), 1.0 - smoothstep(-1.5, 3.0, vH));',
    '  gl_FragColor = vec4(mix(vCol, uHorizon, air), 1.0);',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  function ridgeHeight(type, a, k, rnd2) {
    var h;
    if (type === 1) { var m = .5 + .28 * Math.sin(a * 3 + k) + .16 * Math.sin(a * 7 + k * 2) + .07 * Math.sin(a * 13 + k * .5); h = .16 + Math.pow(Math.max(m, 0), 1.6) * 1.05; }
    else if (type === 2) h = .35 + .25 * Math.sin(a * 5 + k) + .14 * Math.sin(a * 11 + k * .7) + .06 * Math.sin(a * 23);
    else if (type === 3) { var s = .5 + .5 * Math.sin(a * 6 + k); h = Math.pow(s, 1.8) * (.6 + .4 * Math.sin(a * 2 + 1)) * .95 + .16 + .05 * Math.sin(a * 13 + k); }
    else if (type === 4) h = Math.min(.62, Math.max(.18, .45 + .9 * Math.sin(a * 5 + k) + .3 * Math.sin(a * 13))) * 1.05;
    else if (type === 5) h = .1 + .03 * Math.sin(a * 17 + k);
    else h = .45 + .3 * Math.sin(a * 3 + 1.2 + k) + .17 * Math.sin(a * 7 + k) + .09 * Math.sin(a * 13 + 2 * k);
    return Math.max(.05, h);
  }
  /* opts: type 0 rolling, 1 snowy mountains, 2 dunes, 3 karst/tropical peaks,
   * 4 mesas, 5 flat polder; c / c2 (near / far colour), snow (0..1), radius,
   * height, city (number of skyline clusters), cityColor, seed, air (0..1). */
  function horizon(opts) {
    opts = opts || {};
    var type = opts.type || 0, R = opts.radius || 112, H = opts.height || (type === 1 ? 34 : type === 3 ? 28 : type === 5 ? 7 : type === 2 ? 15 : 22), seed = (opts.seed || 777) >>> 0;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    var SEG = 180, pos = [], col = [], lay = [], idx = [], v = 0;
    var cNear = new T.Color(opts.c === undefined ? 0x86b58f : opts.c), cFar = new T.Color(opts.c2 === undefined ? 0xa4c9a8 : opts.c2), snow = new T.Color(0xf4f8fc), tmp = new T.Color(), tmp2 = new T.Color();
    var cityCol = new T.Color(opts.cityColor === undefined ? 0x9fb0c0 : opts.cityColor);
    var cities = [];
    for (var ci = 0; ci < (opts.city || 0); ci++) cities.push({ a: rnd() * TAU, w: .16 + rnd() * .14 });
    function cityAt(a) {
      for (var i = 0; i < cities.length; i++) { var d = Math.atan2(Math.sin(a - cities[i].a), Math.cos(a - cities[i].a)); if (Math.abs(d) < cities[i].w) return 1 - Math.abs(d) / cities[i].w; }
      return 0;
    }
    // three soft layers, far to near: [aerial weight, radius, height, phase, angular stretch]
    var cBack = cFar.clone().lerp(new T.Color(0xffffff), .18);
    [[1, R + 58, 1.18, 5.3, 1], [.55, R + 26, 1.0, 3.1, 1], [0, R, .78, 1.3, 1]].forEach(function (L) {
      var layer = L[0], rad = L[1], hs = L[2] * H, k = L[3], st = L[4], cBand = layer > .9 ? cBack : layer > 0 ? cFar : cNear;
      for (var i = 0; i <= SEG; i++) {
        var a = i / SEG * TAU, h = ridgeHeight(type, a * st, k + layer * 2.7) * hs;
        var city = layer === 0 ? cityAt(a) : 0;
        if (city > 0) { var block = Math.floor(i / 3); var bh = (.35 + .65 * Math.abs(Math.sin(block * 12.9898 + k) * 43758.5453 % 1)) * H * .9 * (.45 + .55 * city); h = Math.max(h * .5, bh); }
        var x = Math.cos(a) * rad, z = Math.sin(a) * rad, mid = h * (type === 1 ? .6 : .55);
        // three rows: foot (under the water line), shoulder, crest
        pos.push(x, -3, z, x, mid, z, x, h, z);
        tmp.copy(cBand).multiplyScalar(.82); col.push(tmp.r, tmp.g, tmp.b);
        tmp.copy(cBand); col.push(tmp.r, tmp.g, tmp.b);
        if (city > 0) tmp2.copy(cityCol).multiplyScalar(1.08);
        else if (opts.snow && (type === 1 || type === 3) && h > hs * .62) tmp2.copy(cBand).lerp(snow, Math.min(1, opts.snow));
        else tmp2.copy(cBand).multiplyScalar(1.1);
        if (city > 0) { col[col.length - 3] = cityCol.r; col[col.length - 2] = cityCol.g; col[col.length - 1] = cityCol.b; }
        col.push(tmp2.r, tmp2.g, tmp2.b);
        lay.push(layer, layer, layer);
        if (i < SEG) { var q = v; idx.push(q, q + 3, q + 1, q + 1, q + 3, q + 4, q + 1, q + 4, q + 2, q + 2, q + 4, q + 5); }
        v += 3;
      }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('aLayer', new T.Float32BufferAttribute(lay, 1)); g.setIndex(idx);
    var u = { uHorizon: { value: new T.Color(0xc9e9f1) }, uAir: { value: opts.air === undefined ? .55 : opts.air } };
    var mesh = new T.Mesh(g, new T.ShaderMaterial({ uniforms: u, vertexShader: HZ_VERT, fragmentShader: HZ_FRAG, side: T.DoubleSide, fog: false, toneMapped: false }));
    mesh.frustumCulled = false; mesh.renderOrder = -8; mesh.name = 'uzak ufuk'; mesh.onBeforeRender = trackFog(u.uHorizon); mesh.raycast = function () {};
    if (opts.y !== undefined) mesh.position.y = opts.y;
    return mesh;
  }

  // ------------------------------------------------- shared outdoor sky
  // One dome + one cloud ring for every foggy (outdoor) scene: country tour and
  // the journey between countries. Hidden in space. Countries tint it with
  // gokyuzu({...}); the clouds follow the camera so they stay "far away".
  var shared = null, cloudCount = 18;
  function ensureShared() {
    var C = window.FLASH_CORE; if (shared || !C) return shared;
    var dome = sky({ cloud: .6, haze: .6 });
    var puffs = clouds({ count: cloudCount, radius: [110, 150], height: [24, 46], size: [16, 32], seed: 9071 });
    var g = new T.Group(); g.name = 'ortak gökyüzü'; g.add(dome, puffs); C.scene.add(g);
    shared = { group: g, dome: dome, puffs: puffs, C: C };
    return shared;
  }
  /* Tint the shared outdoor sky: zenith, sunColor, cloud (high wisps 0..1), haze,
   * cloudTop / cloudShadow colours, clouds (visible puff count 0..18). */
  function gokyuzu(o) {
    var sh = ensureShared(); if (!sh) return; o = o || {};
    var u = sh.dome.material.uniforms, cu = sh.puffs.material.uniforms;
    u.uZenith.value.set(o.zenith === undefined ? 0x6bb6e6 : o.zenith); u.uSunCol.value.set(o.sunColor === undefined ? 0xfff0c8 : o.sunColor);
    u.uCloud.value = o.cloud === undefined ? .6 : o.cloud; u.uHaze.value = o.haze === undefined ? .6 : o.haze;
    cu.uTop.value.set(o.cloudTop === undefined ? 0xfffdf6 : o.cloudTop); cu.uShadow.value.set(o.cloudShadow === undefined ? 0xb9cce0 : o.cloudShadow);
    sh.puffs.geometry.setDrawRange(0, Math.max(0, Math.min(cloudCount, o.clouds === undefined ? 13 : o.clouds)) * 6);
  }
  var camPos = new T.Vector3();
  function frameSky(scene, camera) {
    var sh = shared; if (!sh) return;
    var on = !!scene.fog; sh.group.visible = on;
    // 'Akıcı' (low) profile: keep the dome, drop the transparent cloud puffs.
    sh.puffs.visible = !(sh.C.quality === 'low');
    if (on && camera) { camera.getWorldPosition(camPos); sh.puffs.position.set(camPos.x, 0, camPos.z); }
  }

  // ------------------------------------------------------------ the clock
  function tick(scene, camera) { CLOCK.value = reduced ? 0 : (performance.now() * .001) % 3600; if (scene) { ensureShared(); frameSky(scene, camera); } }

  window.FLASH_GRAFIK = Object.freeze({ time: CLOCK, noise: NOISE, waterify: waterify, foliage: foliage, surface: surface, su: su, gokyuzu: gokyuzu, sky: sky, clouds: clouds, horizon: horizon, tick: tick, reduced: reduced });
}());
