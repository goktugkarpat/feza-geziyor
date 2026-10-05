/* Feza's little space shuttle. Classic THREE script, no textures or downloads.
 * The open cockpit faces +Z. windowPosition/windowPose.position is the child's
 * FOOT position in shuttle-local coordinates; keep his own root independent.
 * Seven opaque geometry batches plus one engine glow: no pane hides the face.
 */
(function () {
  'use strict';
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  function placed(g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    return g.applyMatrix4(new THREE.Matrix4().compose(V(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz)));
  }
  function sphere(x, y, z, sx, sy, sz) {
    return placed(new THREE.SphereGeometry(1, 20, 12), x, y, z, sx, sy, sz);
  }
  function ring(x, y, z, radius, tube, sx = 1, sy = 1) {
    return placed(new THREE.TorusGeometry(radius, tube, 6, 36), x, y, z, sx, sy, 1);
  }
  function cylinder(x, y, z, r, length) {
    return placed(new THREE.CylinderGeometry(r, r, length, 16), x, y, z, 1, 1, 1, Math.PI / 2);
  }
  function plate(points, thickness, y) {
    const shape = new THREE.Shape();
    points.forEach(([x, z], i) => i ? shape.lineTo(x, z) : shape.moveTo(x, z));
    shape.closePath();
    return placed(new THREE.ExtrudeGeometry(shape, {
      depth: thickness, bevelEnabled: true, bevelThickness: .04,
      bevelSize: .05, bevelSegments: 1, curveSegments: 1
    }), 0, y, 0, 1, 1, 1, Math.PI / 2);
  }
  function join(parts) {
    let vertices = 0, indices = 0;
    parts.forEach(g => { vertices += g.attributes.position.count; indices += g.index ? g.index.count : g.attributes.position.count; });
    const position = new Float32Array(vertices * 3), normal = new Float32Array(vertices * 3),
      uv = new Float32Array(vertices * 2), index = new Uint32Array(indices);
    let vertex = 0, at = 0;
    parts.forEach(g => {
      const n = g.attributes.position.count;
      position.set(g.attributes.position.array, vertex * 3);
      normal.set(g.attributes.normal.array, vertex * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, vertex * 2);
      for (let i = 0, count = g.index ? g.index.count : n; i < count; i++) index[at++] = vertex + (g.index ? g.index.array[i] : i);
      vertex += n; g.dispose();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  function create() {
    const root = new THREE.Group(); root.name = "Feza'nın sevimli uzay mekiği";
    const batches = { white: [], teal: [], gold: [], red: [], cabin: [], light: [], glow: [] };
    const add = (key, g) => batches[key].push(g);
    // Rear shell stops BEHIND the child. A low curved nose sits below his face.
    add('white', sphere(0, 1.23, -.84, 1.40, 1.17, 1.48));
    add('white', sphere(0, .71, 1.43, .99, .43, 1.17));
    add('teal', sphere(0, .53, .76, 1.08, .20, 1.31));
    add('cabin', sphere(0, 1.69, .46, .94, .90, .14));
    // The low sill and round canopy frame provide a clear, big open window.
    add('white', ring(0, 2.07, 1.35, 1, .115, 1.07, 1.10));
    add('teal', ring(0, 2.07, 1.41, 1, .045, .98, 1.01));
    add('gold', ring(0, 2.07, 1.47, 1, .018, 1.02, 1.05));
    add('teal', sphere(0, 1.03, 1.37, .74, .13, .18));
    // Cockpit seat and side panels remain behind the hero, with friendly lights.
    add('teal', sphere(0, 1.60, .79, .45, .58, .12));
    for (const s of [-1, 1]) {
      add('cabin', sphere(s * .70, 1.25, 1.03, .13, .15, .30));
      for (let i = 0; i < 3; i++) add('light', sphere(s * .70, 1.40, .90 + i * .13, .035, .018, .035));
      const wing = [[s * 1.03, -.15], [s * 3.51, -1.44], [s * 3.42, -1.98], [s * 1.00, -1.48]];
      add('white', plate(wing, .12, .76));
      add('teal', plate([[s * 1.35, -.62], [s * 3.21, -1.57], [s * 3.10, -1.77], [s * 1.30, -1.26]], .022, .80));
      add('gold', sphere(s * 3.35, .77, -1.59, .15, .085, .32));
      // Two chunky rounded engines, visible from either side of the hull.
      add('white', cylinder(s * 1.21, .61, -1.79, .38, 1.14));
      add('teal', cylinder(s * 1.21, .61, -1.80, .385, .46));
      add('gold', ring(s * 1.21, .61, -2.39, .305, .064));
      add('cabin', cylinder(s * 1.21, .61, -2.42, .265, .045));
      add('glow', sphere(s * 1.21, .61, -2.46, .235, .235, .085));
      add('glow', placed(new THREE.ConeGeometry(.20, .80, 12), s * 1.21, .61, -2.88, 1, 1, 1, -Math.PI / 2));
    }
    // Swept tail with a coloured cap, round antenna, and a lightning nose badge.
    const tail = new THREE.Shape();
    tail.moveTo(-1.53, 1.65); tail.lineTo(-2.36, 1.68); tail.lineTo(-2.24, 3.22); tail.lineTo(-1.81, 2.90); tail.closePath();
    add('teal', placed(new THREE.ExtrudeGeometry(tail, { depth: .13, bevelEnabled: true,
      bevelThickness: .035, bevelSize: .035, bevelSegments: 1 }), -.065, 0, 0, 1, 1, 1, 0, -Math.PI / 2));
    add('gold', sphere(0, 3.15, -2.18, .10, .075, .19));
    add('gold', placed(new THREE.CylinderGeometry(.033, .033, .31, 10), 0, 2.68, -.85));
    add('white', placed(new THREE.CylinderGeometry(.23, .23, .024, 24), 0, .76, 2.57, 1, 1, 1, Math.PI / 2));
    const badge = new THREE.Shape();
    badge.moveTo(.08, .18); badge.lineTo(-.11, -.015); badge.lineTo(-.02, -.015);
    badge.lineTo(-.08, -.18); badge.lineTo(.14, .055); badge.lineTo(.03, .055); badge.closePath();
    add('gold', placed(new THREE.ExtrudeGeometry(badge, { depth: .018, bevelEnabled: false }), 0, .76, 2.59));

    // Rear body stripes follow the ellipsoid's shrinking cross-section (centre z -.84, radii 1.40 x 1.17 x 1.48).
    [[-1.26, 'red', .05], [-1.44, 'gold', .06], [-1.62, 'teal', .07]].forEach(([z, key, thick]) => {
      const k = Math.sqrt(1 - Math.pow((z + .84) / 1.48, 2)) * 1.016;
      add(key, sphere(0, 1.23, z, 1.40 * k, 1.17 * k, thick));
    });
    for (const s of [-1, 1]) {
      // Round portholes on the sides, small canards at the nose, wing-tip caps, engine fins.
      add('white', sphere(s * 1.29, 1.34, -.38, .07, .19, .19));
      add('cabin', sphere(s * 1.335, 1.34, -.38, .035, .13, .13));
      add('teal', sphere(s * 1.30, 1.34, -.38, .075, .03, .26));
      add('teal', plate([[s * .55, 1.55], [s * 1.55, .95], [s * 1.55, .68], [s * .55, 1.0]], .05, .64));
      add('red', plate([[s * 3.16, -1.36], [s * 3.51, -1.44], [s * 3.42, -1.98], [s * 3.08, -1.86]], .03, .84));
      add('gold', plate([[s * 2.50, -1.07], [s * 3.15, -1.34], [s * 3.06, -1.84], [s * 2.40, -1.60]], .02, .84));
      add('teal', sphere(s * 1.21, 1.06, -1.92, .045, .30, .52));
      add('gold', placed(new THREE.CylinderGeometry(.022, .022, .72, 8), s * 3.30, 1.16, -1.56));
    }
    add('teal', sphere(0, 2.18, -1.05, .08, .36, .86));
    const materials = {
      white: new THREE.MeshStandardMaterial({ color: 0xfffcf3, roughness: .42, metalness: .08 }),
      teal: new THREE.MeshStandardMaterial({ color: 0x35bbc5, roughness: .43, metalness: .07 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffcc54, roughness: .36, metalness: .23 }),
      red: new THREE.MeshStandardMaterial({ color: 0xf26069, roughness: .47 }),
      cabin: new THREE.MeshStandardMaterial({ color: 0x285168, roughness: .78 }),
      light: new THREE.MeshBasicMaterial({ color: 0xb6ffdf }),
      glow: new THREE.MeshBasicMaterial({ color: 0x9cefff })
    };
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const geometries = [], meshes = {}, extraMaterials = [];
    // Everything that belongs to the ship hangs under "rig", so the landing bounce moves it as one piece.
    const rig = new THREE.Group(); rig.name = 'Mekik gövdesi'; root.add(rig);
    Object.entries(batches).forEach(([key, parts]) => {
      const g = join(parts), mesh = new THREE.Mesh(g, materials[key]);
      mesh.name = 'Mekik ' + key; mesh.castShadow = !['light', 'glow'].includes(key); mesh.receiveShadow = true;
      rig.add(mesh); meshes[key] = mesh; geometries.push(g);
    });
    // Blinking navigation lights (own tiny basic materials, colour changed in place).
    const navGeometry = new THREE.SphereGeometry(1, 12, 8); geometries.push(navGeometry);
    const nav = [[-3.44, .92, -1.56, 0xff4b57, .11], [3.44, .92, -1.56, 0x4dff9a, .11], [0, 2.86, -.85, 0xff5d68, .095], [0, 3.30, -2.18, 0xfff2b0, .07]].map(([x, y, z, color, r]) => {
      const m = new THREE.MeshBasicMaterial({ color }); extraMaterials.push(m);
      const mesh = new THREE.Mesh(navGeometry, m); mesh.position.set(x, y, z); mesh.scale.setScalar(r); mesh.name = 'Mekik ışığı'; rig.add(mesh);
      return { mesh, base: new THREE.Color(color) };
    });
    // Two little pennants on the wing tips; they sway on their poles.
    const flagGeometry = new THREE.BufferGeometry(); geometries.push(flagGeometry);
    flagGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, .27, 0, 0, .135, -.46], 3));
    flagGeometry.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
    const flags = [-1, 1].map((s, i) => {
      const m = new THREE.MeshStandardMaterial({ color: i ? 0xffcf4d : 0xf26069, roughness: .6, side: THREE.DoubleSide }); extraMaterials.push(m);
      const mesh = new THREE.Mesh(flagGeometry, m); mesh.position.set(s * 3.30, 1.27, -1.56); mesh.name = 'Mekik bayrağı'; rig.add(mesh); return mesh;
    });
    // Soft exhaust flames: four crossed ribbons shaded in the shader (no textures).
    const flameUniforms = { uTime: { value: 0 }, uThrust: { value: 1 } };
    const flamePlanes = [];
    for (const s of [-1, 1]) {
      const h = new THREE.PlaneGeometry(.62, 1).rotateX(-Math.PI / 2), v = new THREE.PlaneGeometry(.62, 1).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
      flamePlanes.push(placed(h, s * 1.21, .61, -3.05), placed(v, s * 1.21, .61, -3.05));
    }
    const flameGeometry = join(flamePlanes); geometries.push(flameGeometry);
    const flameMaterial = new THREE.ShaderMaterial({ uniforms: flameUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      vertexShader: 'uniform float uTime, uThrust; varying float vT; varying float vU; void main(){ float t = clamp((-position.z - 2.55) / 1.0, 0.0, 1.0); vec3 p = position; ' +
        'p.z = -2.55 - t * (1.0 + 1.6 * uThrust) * (0.9 + 0.1 * sin(uTime * 23.0 + p.x * 9.0)); p.xy += (t * 0.04) * vec2(sin(uTime * 17.0 + t * 6.0), cos(uTime * 13.0 + t * 5.0)); vT = t; vU = ' +
        'abs(position.x - sign(position.x) * 1.21) + abs(position.y - 0.61); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'varying float vT; varying float vU; void main(){ float w = (1.0 - vT) * (1.0 - vT); float side = 1.0 - smoothstep(0.0, 0.34 * (1.0 - vT * 0.7), vU); ' +
        'float a = w * side * 0.85; vec3 c = mix(vec3(1.0, 0.97, 0.82), vec3(0.35, 0.82, 1.0), smoothstep(0.0, 0.55, vT)); c = mix(c, vec3(1.0, 0.52, 0.78), smoothstep(0.55, 1.0, vT));' +
        'gl_FragColor = vec4(c * a, a);\n#include <colorspace_fragment>\n}' });
    extraMaterials.push(flameMaterial);
    const flame = new THREE.Mesh(flameGeometry, flameMaterial); flame.frustumCulled = false; flame.name = 'Mekik alevi'; rig.add(flame);

    // GPU-only particles in two draws (additive sparkle, soft normal-blend puffs): positions come from time
    // and descent progress in the vertex shader, so nothing is allocated or uploaded per frame.
    function particleGeometry(entries) {
      const pos = new Float32Array(entries.length * 3), data = new Float32Array(entries.length * 4);
      entries.forEach((e, i) => data.set(e, i * 4));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aD', new THREE.BufferAttribute(data, 4));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50); return g;
    }
    let ps = 7011; const pr = () => { ps = (Math.imul(ps, 1664525) + 1013904223) >>> 0; return ps / 4294967296; };
    const addList = []; for (let i = 0; i < 20; i++) addList.push([0, pr(), i < 10 ? 0 : 1, pr()]); for (let i = 0; i < 14; i++) addList.push([1, pr(), pr(), pr()]); for (let i = 0; i < 4; i++) addList.push([2, 0, i, pr()]);
    const softList = []; for (let i = 0; i < 18; i++) softList.push([3, pr(), pr(), pr()]); for (let i = 0; i < 28; i++) softList.push([4, pr(), i / 28, pr()]); for (let i = 0; i < 7; i++) softList.push([5, pr(), i / 6, pr()]);
    const particleUniforms = { uTime: { value: 0 }, uProgress: { value: 0 }, uScreen: { value: 400 } };
    const particleVertex = 'uniform float uTime, uProgress, uScreen; attribute vec4 aD; varying vec4 vC; varying float vKind;\n' +
      'float h(float x){ return fract(sin(x * 127.1 + 17.3) * 43758.5453); }\n' +
      'void main(){ float kind = aD.x, s = aD.y, a = aD.z, b = aD.w; vec3 p = vec3(0.0); float size = 0.0; vec4 c = vec4(0.0); vKind = kind;\n' +
      'float glowEnv = smoothstep(0.28, 0.5, uProgress) * (1.0 - smoothstep(0.7, 0.88, uProgress));\n' +
      'float cloudEnv = smoothstep(0.5, 0.62, uProgress) * (1.0 - smoothstep(0.86, 0.95, uProgress));\n' +
      'float landT = clamp((uProgress - 0.86) / 0.14, 0.0, 1.0);\n' +
      'if (kind < 0.5) { float age = fract(uTime * 1.1 + s); float side = a < 0.5 ? -1.0 : 1.0; p = vec3(side * 1.21 + (h(s * 7.0) - 0.5) * 0.3 * age, 0.61 + (h(s * 11.0) - 0.5) * 0.3 * age, -2.7 - age * 3.0);' +
      '  size = 0.34 * (1.0 - age) + 0.06; c = vec4(mix(vec3(0.6, 0.95, 1.0), vec3(1.0, 0.85, 0.5), age), (1.0 - age) * 0.8); }\n' +
      'else if (kind < 1.5) { float ang = uTime * (0.35 + 0.3 * s) + s * 6.283; float r = 3.0 + s * 2.2 + 0.3 * sin(uTime + b * 9.0); p = vec3(cos(ang) * r, 1.3 + sin(uTime * 0.7 + b * 12.0) * 1.1 + a * 0.8, sin(ang) * r * 0.45 - 0.9);' +
      '  float tw = 0.5 + 0.5 * sin(uTime * 3.0 + s * 40.0); size = 0.18 + 0.34 * tw; c = vec4(mix(vec3(1.0, 0.92, 0.55), vec3(0.8, 0.95, 1.0), b), 0.35 + 0.65 * tw); }\n' +
      'else if (kind < 2.5) { float i = a; vec3 q = i < 0.5 ? vec3(0.0, 0.3, 0.8) : i < 1.5 ? vec3(-2.3, 0.7, -0.9) : i < 2.5 ? vec3(2.3, 0.7, -0.9) : vec3(0.0, 0.55, -2.0); p = q; size = i < 0.5 ? 5.4 : 3.8;' +
      '  c = vec4(mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.36, 0.55), 0.5 + 0.5 * sin(uTime * 4.0 + i)), glowEnv * (0.30 + 0.08 * sin(uTime * 11.0 + i * 2.0))); }\n' +
      'else if (kind < 3.5) { float age = fract(uTime * (0.55 + 0.4 * s) + b); p = vec3((s - 0.5) * 17.0, -8.0 + age * 18.0, -2.6 - b * 3.0); size = 3.2 + 3.4 * b; c = vec4(0.97, 0.98, 1.0, cloudEnv * 0.5 * sin(age * 3.1416)); }\n' +
      'else if (kind < 4.5) { float ang = a * 6.2832 + b; float r = 1.0 + landT * (5.0 + 2.0 * b); p = vec3(cos(ang) * r, -1.0 + landT * 0.6 + b * 0.3, sin(ang) * r * 0.55 - 0.8); size = 1.1 + landT * 1.8; c = vec4(1.0, 0.96, 0.88, smoothstep(0.0, 0.12, landT) * (1.0 - landT) * 0.7); }\n' +
      'else { float th = (a - 0.5) * 2.4; p = vec3(sin(th) * 4.2, 5.6 + cos(th) * 1.5 + 0.12 * sin(uTime * 2.0 + a * 6.0), -1.5); size = 2.3 + b * 0.5;' +
      '  float env = smoothstep(0.66, 0.76, uProgress) * (1.0 - smoothstep(0.9, 0.97, uProgress)); c = vec4(1.0, 0.99, 0.97, env * 0.7); }\n' +
      'vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vC = c;\n' +
      'gl_PointSize = size * projectionMatrix[1][1] * 0.5 * uScreen / max(0.0001, -mv.z) * length(modelMatrix[0].xyz); if (c.a < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }';
    const particleFragment = 'varying vec4 vC; varying float vKind; void main(){ vec2 q = (gl_PointCoord - 0.5) * 2.0; float r = length(q); float a;\n' +
      'if (vKind > 0.5 && vKind < 1.5) a = (1.0 / (1.0 + 60.0 * abs(q.x * q.y)) + 0.6 * (1.0 - smoothstep(0.0, 0.5, r))) * (1.0 - smoothstep(0.55, 1.0, r));\n' +
      'else if (vKind > 2.5) { float c1 = 1.0 - smoothstep(0.3, 0.72, r), c2 = 1.0 - smoothstep(0.2, 0.5, length(q - vec2(0.45, -0.12))), c3 = 1.0 - smoothstep(0.2, 0.52, length(q + vec2(0.42, 0.1))); a = max(c1, 0.92 * max(c2, c3)); }\n' +
      'else { a = (1.0 - smoothstep(0.1, 1.0, r)); a *= a; } if (a * vC.a < 0.004) discard; gl_FragColor = vec4(vC.rgb, vC.a * a);\n#include <colorspace_fragment>\n}';
    const addGeometry = particleGeometry(addList), softGeometry = particleGeometry(softList); geometries.push(addGeometry, softGeometry);
    const additive = new THREE.ShaderMaterial({ uniforms: particleUniforms, vertexShader: particleVertex, fragmentShader: particleFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const normalPuff = new THREE.ShaderMaterial({ uniforms: particleUniforms, vertexShader: particleVertex, fragmentShader: particleFragment, transparent: true, depthWrite: false, toneMapped: false });
    extraMaterials.push(additive, normalPuff);
    const sparkles = new THREE.Points(addGeometry, additive), puffs = new THREE.Points(softGeometry, normalPuff);
    sparkles.frustumCulled = puffs.frustumCulled = false; sparkles.renderOrder = 3; puffs.renderOrder = 2; sparkles.name = 'Mekik kıvılcımları'; puffs.name = 'Mekik bulutçukları';
    root.add(puffs, sparkles);
    if (reduced) { sparkles.visible = puffs.visible = false; flame.scale.set(1, 1, .5); }

    const windowPosition = V(0, 1.00, 1.28), windowBase = V(0, 1.00, 1.28);
    const windowPose = Object.freeze({ position: windowPosition, scale: 1, rotationY: 0 });
    let destroyed = false;
    const tint = new THREE.Color();
    function update(dt, time = 0, progress = 0) {
      if (destroyed) return;
      // No allocation: the app owns flight; this only animates the little details and the landing bounce.
      const p = Math.max(0, Math.min(1, progress));
      meshes.glow.scale.z = .97 + Math.sin(time * 7) * .025;
      meshes.light.material.color.setHex(p > .94 ? 0xd9ffe3 : 0xb6ffdf);
      let bob = 0;
      if (!reduced) {
        bob = Math.sin(time * 1.6) * .05;
        if (p > .9) { const t = (p - .9) / .1; bob += Math.abs(Math.cos(t * Math.PI * 2.5)) * Math.exp(-t * 3.2) * .34 - .12 * Math.exp(-t * 2) }
        for (let i = 0; i < flags.length; i++) { flags[i].rotation.y = Math.sin(time * 5 + i * 1.7) * .32; flags[i].scale.z = .9 + Math.sin(time * 9 + i) * .1; }
        // gentle "blink-blink" on the tail beacon, and a slow alternating pulse on the wing lights
        const beat = Math.sin(time * 5.5) > .35 ? 1 : .18;
        nav[2].mesh.material.color.copy(nav[2].base).multiplyScalar(beat);
        nav[3].mesh.material.color.copy(nav[3].base).multiplyScalar(Math.sin(time * 5.5 + 2.4) > .55 ? 1 : .12);
        nav[0].mesh.material.color.copy(nav[0].base).multiplyScalar(.55 + .45 * Math.sin(time * 3));
        nav[1].mesh.material.color.copy(nav[1].base).multiplyScalar(.55 + .45 * Math.sin(time * 3 + 3.14));
        meshes.light.material.color.multiplyScalar(.7 + .3 * Math.sin(time * 4));
      }
      rig.position.y = bob; windowPosition.y = windowBase.y + bob;
      flameUniforms.uTime.value = reduced ? 0 : time; flameUniforms.uThrust.value = reduced ? .5 : (p > .9 ? .35 : .85 + Math.sin(time * 9) * .12);
      particleUniforms.uTime.value = reduced ? 0 : time % 600; particleUniforms.uProgress.value = reduced ? 0 : p;
      const renderer = window.FLASH_CORE && window.FLASH_CORE.renderer;
      particleUniforms.uScreen.value = (typeof innerHeight === 'number' ? innerHeight : 800) * (renderer ? renderer.getPixelRatio() : 1);
    }
    function dispose() {
      if (destroyed) return; destroyed = true;
      geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose()); extraMaterials.forEach(m => m.dispose());
      root.removeFromParent();
    }
    return { root, windowPosition, windowPose, update, dispose };
  }
  window.FLASH_SHUTTLE = Object.freeze({ create });
})();
