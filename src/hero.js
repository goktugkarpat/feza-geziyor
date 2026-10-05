/* Flash Feza: young travelling superhero. Classic script; only window.THREE is required.
 * Real reuse from feza-huysuzlara-karsi/src/04_feza.js: parametric Feza head,
 * original facial GLSL (eyes, brows, nose and smirk), procedural brown hair,
 * blended skinned geometry builder, pose channels and idle/running animation.
 * Inventory, fighting, lightsabers, cape, thumbnail baking and x-ray removed.
 * create() -> { root, update(dt, speed01, boost, time), dispose() }; faces +Z.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2, HEAD_SCALE = 1.13, BODY_SCALE = 0.76, BODY_WIDTH = 0.93;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sq = x => x * x;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const keep = o => o;
  const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const V2 = (x, y = x) => new THREE.Vector2(x, y);
  function mulberry32(a) { return function () { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function paramGeo(fn, nu, nv, ctr, wrapU) {
    const n1 = nu + 1, nV = n1 * (nv + 1);
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const p = v3(), a = v3(), b = v3(), c = v3(), d = v3(), n = v3(), e = 1e-3;
    for (let j = 0, k = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
      const u = i / nu, v = j / nv;
      fn(u, v, p);
      fn(wrapU ? u + e : Math.min(1, u + e), v, a); fn(wrapU ? u - e : Math.max(0, u - e), v, b); a.sub(b);
      fn(u, Math.min(1, v + e), c); fn(u, Math.max(0, v - e), d); c.sub(d);
      n.crossVectors(a, c);
      if (n.lengthSq() < 1e-14) n.copy(p).sub(ctr);
      n.normalize();
      if (n.dot(d.copy(p).sub(ctr)) < 0) n.negate();
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      nor[k * 3] = n.x; nor[k * 3 + 1] = n.y; nor[k * 3 + 2] = n.z;
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const q = j * n1 + i; idx.push(q, q + 1, q + n1 + 1, q, q + n1 + 1, q + n1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    fixWinding(g);
    return g;
  }
  // Make triangle winding agree with the vertex normals (front faces outward).
  function fixWinding(g) {
    const I = g.index.array, P = g.attributes.position, N = g.attributes.normal, a = v3(), b = v3(), c = v3(), n = v3();
    let s = 0;
    for (let t = 0; t < I.length; t += 3 * Math.max(1, (I.length / 3 / 60) | 0)) {
      a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]).sub(a); c.fromBufferAttribute(P, I[t + 2]).sub(a);
      n.crossVectors(b, c); if (n.lengthSq() < 1e-16) continue;
      a.fromBufferAttribute(N, I[t]); s += n.dot(a) > 0 ? 1 : -1;
    }
    if (s < 0) for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
  }
  // Lathe (profile bottom → top as [r, y]) with the seam at the back, elliptic (sx, sz), UVs in texture tiles if `tile`.
  function lathe(prof, seg, cx, cz, sx, sz, tile) {
    const pts = prof.map(p => V2(p[0], p[1]));
    const g = new THREE.LatheGeometry(pts, seg, Math.PI, TAU);
    g.applyMatrix4(new THREE.Matrix4().makeScale(sx, 1, sz));
    g.translate(cx, 0, cz);
    if (tile) {
      const uv = g.attributes.uv, n = pts.length, L = [0];
      let rMax = 0;
      for (let j = 0; j < n; j++) { rMax = Math.max(rMax, pts[j].x); if (j) L[j] = L[j - 1] + pts[j].distanceTo(pts[j - 1]); }
      const C = TAU * rMax * (sx + sz) / 2;
      for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) uv.setXY(i * n + j, i / seg * C / tile, L[j] / tile);
    }
    return g;
  }
  // Sweep an elliptic cross-section along points P[i] with up vectors U[i]. wf/tf(t) half width/thickness,
  // flat squashes the underside, colf(t, color), flexf(t). Returns indexed geometry with color + aFlex.
  function sweep(P, U, wf, tf, M, flat, colf, flexf) {
    const N = P.length - 1, nv = (N + 1) * (M + 1);
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), fl = new Float32Array(nv);
    const T = v3(), Nn = v3(), B = v3(), q = v3(), c = new THREE.Color();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      T.subVectors(P[Math.min(N, i + 1)], P[Math.max(0, i - 1)]).normalize();
      Nn.copy(U[i]).addScaledVector(T, -U[i].dot(T)).normalize();
      B.crossVectors(T, Nn).normalize();
      const w = wf(t), th = tf(t), f = flexf ? flexf(t) : 0;
      colf(t, c);
      for (let k = 0; k <= M; k++) {
        const a = k / M * TAU, ca = Math.cos(a), sa = Math.sin(a), o = i * (M + 1) + k;
        q.copy(P[i]).addScaledVector(B, ca * w).addScaledVector(Nn, sa < 0 ? sa * th * flat : sa * th);
        pos[o * 3] = q.x; pos[o * 3 + 1] = q.y; pos[o * 3 + 2] = q.z;
        uv[o * 2] = k / M; uv[o * 2 + 1] = t;
        col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
        fl[o] = f;
      }
    }
    const idx = [];
    for (let i = 0; i < N; i++) for (let k = 0; k < M; k++) { const a = i * (M + 1) + k, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    // outward check: the top of the ring (k = M/4) must face +up
    const k4 = Math.round(M / 4), mid = Math.floor(N / 2) * (M + 1), nA = g.attributes.normal;
    T.subVectors(P[Math.min(N, Math.floor(N / 2) + 1)], P[Math.max(0, Math.floor(N / 2) - 1)]).normalize();
    Nn.copy(U[Math.floor(N / 2)]).addScaledVector(T, -U[Math.floor(N / 2)].dot(T)).normalize();
    if (q.fromBufferAttribute(nA, mid + k4).dot(Nn) < 0) {
      const I = g.index.array; for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
      g.computeVertexNormals();
    }
    return g;
  }
  // Catmull-Rom through 3D points, returns N+1 samples.
  const curvePts = (pts, N) => new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(N);
  // Concatenate geometries that share the same attribute set.
  function concat(geos) {
    const names = Object.keys(geos[0].attributes);
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const out = new THREE.BufferGeometry(), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    for (const n of names) {
      const s = geos[0].attributes[n].itemSize, arr = new Float32Array(nv * s);
      let vo = 0;
      for (const g of geos) { const a = g.attributes[n]; for (let i = 0; i < a.count * s; i++) arr[vo * s + i] = a.array[i]; vo += g.attributes.position.count; }
      out.setAttribute(n, new THREE.BufferAttribute(arr, s));
    }
    let vo = 0, io = 0;
    for (const g of geos) {
      const c = g.attributes.position.count;
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo; io += I.length; }
      else { for (let i = 0; i < c; i++) idx[io + i] = vo + i; io += c; }
      vo += c;
    }
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  // Kit-like merge with skin weights. part: {geo, bone} or {geo, w(x,y,z) → [bone0, bone1, weight1]}, color hex|fn, face?
  function mergeSkinned(parts, withFace) {
    let nv = 0, ni = 0;
    for (const p of parts) { nv += p.geo.attributes.position.count; ni += p.geo.index ? p.geo.index.count : p.geo.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), face = withFace ? new Float32Array(nv * 2).fill(-10) : null, glow = parts.some(p => p.glow) ? new Float32Array(nv) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    const cc = new THREE.Color();
    for (const p of parts) {
      const g = p.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, F = g.attributes.aFace, C = g.attributes.color;
      const cfn = typeof p.color === 'function' ? p.color : null, cfix = cfn ? null : new THREE.Color(p.color ?? 0xffffff);
      for (let i = 0; i < P.count; i++) {
        const o = vo + i, x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
        nor[o * 3] = N.getX(i); nor[o * 3 + 1] = N.getY(i); nor[o * 3 + 2] = N.getZ(i);
        if (p.flat) { uv[o * 2] = 0.508; uv[o * 2 + 1] = 0.006; } else if (U) { uv[o * 2] = U.getX(i); uv[o * 2 + 1] = U.getY(i); }
        const c = cfn ? cfn(x, y, z) : C ? cc.setRGB(C.getX(i), C.getY(i), C.getZ(i)).multiply(cfix) : cfix;
        col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
        if (p.w) { const w = p.w(x, y, z); si[o * 4] = w[0]; si[o * 4 + 1] = w[1]; sw[o * 4] = 1 - w[2]; sw[o * 4 + 1] = w[2]; }
        else { si[o * 4] = p.bone; sw[o * 4] = 1; }
        if (face && F) { face[o * 2] = F.getX(i); face[o * 2 + 1] = F.getY(i); }
        if (glow && p.glow) glow[o] = p.glow;
      }
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo; io += I.length; }
      else { for (let i = 0; i < P.count; i++) idx[io + i] = vo + i; io += P.count; }
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (face) out.setAttribute('aFace', new THREE.BufferAttribute(face, 2));
    if (glow) out.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return keep(out);
  }
  const HB = 1.60 * BODY_SCALE, HC = v3(0, 0.24, 0.012);
  function headSurf(th, ph, o) {
    const cp = Math.cos(ph), dx = Math.sin(th) * cp, dy = Math.sin(ph), dz = Math.cos(th) * cp;
    let x = dx * 0.272, y = dy * lerp(0.198, 0.262, sstep(-0.35, 0.35, dy)), z = dz * lerp(0.27, 0.258, sstep(-0.35, 0.35, dz));
    const jaw = sstep(0.3, 1.25, -ph);                                                     // narrower jaw, short soft chin
    x *= 1 - 0.14 * jaw; z *= 1 - 0.13 * jaw;
    const at = Math.abs(th), front = sstep(-0.1, 0.4, dz);
    let b = 0.029 * Math.exp(-sq((at - 0.5) / 0.33) - sq((ph + 0.35) / 0.27)) * front;      // round cheeks
    b += 0.013 * Math.exp(-sq(th / 0.08) - sq((ph + 0.262) / 0.065));                      // button nose
    b += 0.006 * Math.exp(-sq(th / 0.3) - sq((ph + 0.92) / 0.2));                          // chin
    o.set(HC.x + x + dx * b, HC.y + y + dy * b, HC.z + z + dz * b);
    return o;
  }
  const _ha = v3(), _hb = v3(), _hc = v3(), _hd = v3();
  function headNormal(th, ph, o) {
    const e = 1e-3;
    headSurf(th + e, ph, _ha); headSurf(th - e, ph, _hb); _ha.sub(_hb);
    headSurf(th, Math.min(ph + e, 1.5707), _hc); headSurf(th, Math.max(ph - e, -1.5707), _hd); _hc.sub(_hd);
    o.crossVectors(_ha, _hc);
    if (o.lengthSq() < 1e-12) { headSurf(th, ph, o); o.sub(HC); }
    return o.normalize();
  }
  // Non-uniform head grid: dense over the face, sparse at the back and top (under the hair) → a third of the triangles.
  const headTh = u => { const s = 2 * u - 1; return Math.PI * s * (0.38 + 0.62 * s * s); };
  const PH_CDF = (() => {
    const N = 256, d = ph => 1 + 1.4 * Math.exp(-sq((ph + 0.3) / 0.6)), c = [0];
    for (let i = 1; i <= N; i++) c.push(c[i - 1] + d(-Math.PI / 2 + (i - 0.5) / N * Math.PI));
    return c.map(x => x / c[N]);
  })();
  function headPh(v) {
    v = clamp(v, 0, 1);
    let lo = 0, hi = PH_CDF.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PH_CDF[m] <= v) lo = m; else hi = m; }
    const f = (v - PH_CDF[lo]) / Math.max(1e-9, PH_CDF[hi] - PH_CDF[lo]);
    return -Math.PI / 2 + (lo + f) / (PH_CDF.length - 1) * Math.PI;
  }
  function headGeo() {
    const NU = 48, NV = 32, ctr = v3(0, HB + HC.y * HEAD_SCALE, HC.z * HEAD_SCALE);
    const g = paramGeo((u, v, o) => { headSurf(headTh(u), headPh(v), o).multiplyScalar(HEAD_SCALE); o.y += HB; }, NU, NV, ctr, true);
    const f = new Float32Array((NU + 1) * (NV + 1) * 2);
    for (let j = 0, k = 0; j <= NV; j++) for (let i = 0; i <= NU; i++, k++) { f[k * 2] = headTh(i / NU); f[k * 2 + 1] = headPh(j / NV); }
    g.setAttribute('aFace', new THREE.BufferAttribute(f, 2));
    return g;
  }
  const HAIR_D = new THREE.Color(0x2c180c), HAIR_L = new THREE.Color(0x4a2b16), HAIR_H = new THREE.Color(0x6b4424);
  function hairline(th) {
    const a = Math.abs(th), saw = th * 2.3 + 0.35 - Math.floor(th * 2.3 + 0.35);
    const front = 0.46 + 0.06 * th + 0.06 * Math.pow(saw, 1.7);                              // the locks make the fringe edge
    let h = lerp(front, -0.3, sstep(0.6, 1.25, a));                                          // temples → sideburns
    h = lerp(h, -0.28, sstep(1.75, 2.2, a));                                                 // behind the ears
    h = lerp(h, -0.34, sstep(2.4, 2.9, a));                                                  // nape (the idle head tilt lowers it)
    h = lerp(h, -0.04, sstep(1.28, 1.46, a) * (1 - sstep(1.76, 1.96, a)));                   // around the ear
    return h + 0.03 * Math.sin(th * 11 + 0.7) * sstep(0.5, 1.2, a);
  }
  function hairThick(th, ph) {
    const a = Math.abs(th);
    return 0.016 + 0.034 * sstep(-0.1, 1.1, ph) + 0.006 * sstep(1.9, 2.8, a) * sstep(-0.6, 0.3, ph);
  }
  const capLift = (th, ph) => { const hl = hairline(th); return hairThick(th, ph) * sstep(hl - 0.1, hl + 0.06, ph); };
  const dirOf = (th, ph) => v3(Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));
  function hairCapGeo() {
    const NU = 64, NV = 16, n = v3(), ctr = HC.clone();
    const g = paramGeo((u, v, o) => {
      const th = -Math.PI + u * TAU, hl = hairline(th), s = Math.pow(v, 0.85), ph = lerp(hl, Math.PI / 2 - 1e-3, s);
      headSurf(th, ph, o); headNormal(th, ph, n);
      o.addScaledVector(n, hairThick(th, ph) * (0.18 + 0.82 * sstep(0, 0.16, v)));
    }, NU, NV, ctr, true);
    const cnt = g.attributes.position.count, col = new Float32Array(cnt * 3), fl = new Float32Array(cnt), uv = g.attributes.uv, c = new THREE.Color();
    for (let i = 0; i < cnt; i++) {
      const u = uv.getX(i), v = uv.getY(i), th = -Math.PI + u * TAU;
      const streak = 0.5 + 0.5 * Math.sin(th * 23 + Math.sin(th * 7) * 2) * Math.sin(th * 9 + 1);
      c.copy(HAIR_D).lerp(HAIR_L, 0.3 + 0.25 * streak * sstep(0.1, 0.8, v)).multiplyScalar(0.8 + 0.2 * sstep(0, 0.3, v));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      uv.setXY(i, u * 10, v * 2.2);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    return g;
  }
  function hairLocks() {
    const R = mulberry32(20190612), r = (a, b) => a + R() * (b - a), L = [];
    const add = (pts, w, t, tone, flex, tuft) => L.push({ pts, w, t, tone, flex, tuft: !!tuft });
    const P = (th, ph, lift) => [dirOf(th, ph), lift];
    const lock4 = (th0, ph0, th1, ph1, lifts, w, t, tone, flex, bulge = 0) => add([P(th0, ph0, lifts[0]), P(lerp(th0, th1, 0.4) + bulge, lerp(ph0, ph1, 0.42), lifts[1]),
      P(lerp(th0, th1, 0.78), lerp(ph0, ph1, 0.8), lifts[2]), P(th1, ph1, lifts[3])], w, t, tone, flex);
    // fringe: swept diagonally to Feza's right (th < 0) — short on his left so that corner of the forehead shows,
    // down to the right brow; some tips flick up
    for (let i = 0; i < 12; i++) {
      const f = i / 11, th0 = 0.8 - i * 0.125 + r(-0.03, 0.03), ph0 = 0.8 + r(-0.04, 0.05);
      const th1 = th0 - 0.3 - r(0, 0.14), ph1 = lerp(0.37, 0.15, f) + r(-0.03, 0.03) - Math.max(0, -th1 - 0.5) * 0.2;
      lock4(th0, ph0, th1, ph1, [0, 0.017, 0.013, 0.011 + 0.012 * R()], r(0.05, 0.064), r(0.018, 0.022), r(0.05, 0.75), 0.8, 0.02);
    }
    for (let i = 0; i < 5; i++) {   // shorter top layer so the fringe root is not a flat line
      const th0 = 0.62 - i * 0.3 + r(-0.05, 0.05), ph0 = 1.0 + r(0, 0.08);
      lock4(th0, ph0, th0 - 0.3 - r(0, 0.1), 0.5 + r(0, 0.08), [0, 0.018, 0.017, 0.014], r(0.055, 0.07), 0.02, r(0.4, 1), 0.7, 0.03);
    }
    lock4(0.1, 0.74, 0.36, 0.44, [0, 0.015, 0.017, 0.022], 0.044, 0.017, 0.85, 0.8);          // one rebel the other way
    // sides: shaggy, ear-lobe length in front of and behind the ear, short over it; tips flick outward
    for (const s of [1, -1]) {
      for (let i = 0; i < 3; i++) {   // temples / sideburns
        const th0 = s * (0.8 + i * 0.16 + r(-0.03, 0.03)), ph0 = 0.5 + r(-0.03, 0.06);
        lock4(th0, ph0, th0 + s * (0.14 + r(0, 0.08)), -0.13 - r(0, 0.06), [0, 0.019, 0.026, 0.048], r(0.056, 0.068), 0.022, r(0.1, 0.9), 1, s * 0.04);
      }
      for (let i = 0; i < 3; i++) {   // over the ear: covers its top half
        const th0 = s * (1.36 + i * 0.17 + r(-0.03, 0.03)), ph0 = 0.56 + r(-0.03, 0.06);
        lock4(th0, ph0, th0 + s * r(0.04, 0.14), -0.03 - r(0, 0.05), [0, 0.022, 0.032, 0.052], r(0.06, 0.072), 0.023, r(0, 1), 1);
      }
      for (let i = 0; i < 3; i++) {   // behind the ear
        const th0 = s * (1.95 + i * 0.2 + r(-0.04, 0.04)), ph0 = 0.62 + r(-0.03, 0.08);
        lock4(th0, ph0, th0 + s * r(0.04, 0.16), -0.16 - r(0, 0.08), [0, 0.022, 0.03, 0.05], r(0.064, 0.076), 0.024, r(0, 1), 1);
      }
      for (let i = 0; i < 4; i++) {   // short upper-side layer (volume seen from above)
        const th0 = s * (0.8 + i * 0.42 + r(-0.05, 0.05)), ph0 = 1.02 + r(0, 0.1);
        lock4(th0, ph0, th0 + s * r(0.04, 0.16), 0.26 + r(-0.08, 0.08), [0, 0.021, 0.026, 0.028], r(0.068, 0.082), 0.024, r(0.3, 1), 0.8);
      }
    }
    // nape: uneven tips at the top of the neck, flicking out
    for (let i = 0; i < 9; i++) {
      const th0 = Math.PI + (i - 4) * 0.22 + r(-0.04, 0.04), ph0 = 0.72 + r(0, 0.1), th1 = th0 + r(-0.16, 0.16), ph1 = -0.06 - r(0, 0.18) + (i & 1) * 0.06;
      lock4(th0, ph0, th1, ph1, [0, 0.022, 0.032, 0.045 + r(0, 0.035)], r(0.068, 0.082), 0.025, r(0, 0.9), 1);
    }
    // shorter layer over the back of the head, so the back reads layered and tousled, not as one straight curtain
    for (let i = 0; i < 7; i++) {
      const th0 = Math.PI + (i - 3) * 0.3 + r(-0.06, 0.06), ph0 = 0.95 + r(0, 0.1);
      lock4(th0, ph0, th0 + r(-0.2, 0.2), 0.3 + r(-0.08, 0.1), [0, 0.024, 0.028, 0.034 + r(0, 0.012)], r(0.07, 0.085), 0.024, r(0.3, 1), 0.8);
    }
    // crown: short tousled clumps swirling out of a whorl a little behind the top (very visible from the game camera)
    const Cw = dirOf(Math.PI * 0.92, 1.18), e1 = v3().crossVectors(Cw, v3(1, 0, 0)).normalize(), e2 = v3().crossVectors(Cw, e1);
    const at = (a, d) => Cw.clone().multiplyScalar(Math.cos(d)).addScaledVector(e1, Math.cos(a) * Math.sin(d)).addScaledVector(e2, Math.sin(a) * Math.sin(d)).normalize();
    const clump = (a, tw, d0, d1, l0, l1, l2, l3, w, t, tone, flex) => add([[at(a, d0), l0], [at(a + tw * 0.4, lerp(d0, d1, 0.4)), l1], [at(a + tw * 0.8, lerp(d0, d1, 0.78)), l2], [at(a + tw, d1), l3]], w, t, tone, flex);
    for (let i = 0; i < 8; i++) clump(i / 8 * TAU + r(-0.2, 0.2), 0.35 + r(-0.1, 0.15), 0.03, r(0.3, 0.4), 0.004, 0.02, 0.022, 0.02 + r(0, 0.012), r(0.068, 0.082), r(0.018, 0.022), r(0.3, 1), 0.5);
    for (let i = 0; i < 12; i++) { const d0 = r(0.26, 0.34); clump(i / 12 * TAU + r(-0.15, 0.15), r(-0.45, 0.45), d0, d0 + r(0.32, 0.44), 0.006, 0.022, 0.02, 0.017 + r(0, 0.016), r(0.07, 0.086), r(0.018, 0.023), r(0.2, 1), 0.6); }
    // cowlicks (collapsed under hats)
    const cw = [[0.5, 0.11, 0.06], [-0.3, 0.13, 0.08], [0.15, 0.08, 0.05], [1.4, 0.07, 0.035]];
    for (const [a, h, len] of cw) {
      const b = dirOf(Math.PI * 0.9 + a * 0.25, 1.22), m = dirOf(Math.PI * 0.9 + a * 0.4, 1.05 + len), e = dirOf(Math.PI * 0.95 + a * 0.6, 0.9 + len);
      add([[b, 0.01], [m, h * 0.6], [e, h]], 0.028, 0.012, 0.7, 1.4, true);
    }
    return L;
  }
  function lockGeo(L) {
    const N = 8, dirs = curvePts(L.pts.map(p => p[0]), N), n1 = L.pts.length - 1;
    const liftAt = t => { const f = t * n1, i = Math.min(n1 - 1, Math.floor(f)), u = f - i, a = L.pts[i][1], b = L.pts[i + 1][1]; return a + (b - a) * u * u * (3 - 2 * u); };
    const P = [], U = [], n = v3();
    for (let i = 0; i <= N; i++) {
      const d = dirs[i].normalize(), th = Math.atan2(d.x, d.z), ph = Math.asin(clamp(d.y, -1, 1));
      const p = headSurf(th, ph, v3()); headNormal(th, ph, n);
      p.addScaledVector(n, capLift(th, ph) + liftAt(i / N) + L.t * 0.35);
      P.push(p); U.push(n.clone());
    }
    const base = HAIR_D.clone().lerp(HAIR_L, L.tone);
    // aFlex < 0 marks cowlick vertices (the hair shader collapses them under a hat)
    return sweep(P, U, t => L.w * (0.7 + 0.3 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2)) * Math.pow(1 - t, 0.9),
      t => L.t * (1 - 0.75 * t), 6, 0.5,
      (t, c) => { c.copy(base).multiplyScalar(0.86 + 0.26 * t); if (L.tone > 0.75 && t > 0.3) c.lerp(HAIR_H, 0.3); },
      t => L.tuft ? -(Math.pow(t, 1.5) * L.flex + 0.01) : Math.pow(t, 1.5) * L.flex);
  }
  const FACE_GLSL = `
    uniform vec4 fzEye; uniform vec3 fzEyeW; uniform vec4 fzMouth; uniform vec3 fzBrow;
    varying vec2 vFace;
    #define SRGB(r, g, b) pow(vec3(r, g, b), vec3(2.2))
    float fzSq(float x) { return x * x; }
    float fzSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
    float fzLine(float d, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, d); }
    void fzFace(inout vec3 col, inout float gloss, inout vec3 emis, vec2 q, float aa) {
      // cheeks + nose tip
      float bl = exp(-fzSq((abs(q.x) - 0.35) / 0.13) - fzSq((q.y + 0.40) / 0.085)) * (0.12 + 0.2 * fzBrow.z);
      col = mix(col, SRGB(0.98, 0.58, 0.54), bl);
      float blm = exp(-fzSq((abs(q.x) - 0.35) / 0.17) - fzSq((q.y + 0.34) / 0.07)) * 0.05 * (0.4 + fzBrow.z);
      col = mix(col, SRGB(1.0, 0.42, 0.45), blm);
      col = mix(col, SRGB(0.97, 0.66, 0.6), 0.22 * exp(-fzSq(q.x / 0.04) - fzSq((q.y + 0.252) / 0.035)));
      // eyes (e: eye-local, +x = outer corner)
      float side = q.x < 0.0 ? -1.0 : 1.0;
      vec2 ec = vec2(0.25 * side, -0.115), er = vec2(0.178, 0.205);
      vec2 e = vec2((q.x - ec.x) * side, q.y - ec.y) / er;
      float aE = aa / er.y;
      float xx = clamp(e.x, -1.0, 1.0), cx = sqrt(max(0.0, 1.0 - xx * xx));
      float top = pow(cx, 0.75) * 0.84, bot = -cx * 0.92;
      // going to happy ^ / wince >: both lids squeeze shut onto that curve (the lid line becomes the ^), so an in-between
      // frame is a smiling squint, never a see-through pale ghost eye
      float hx = clamp(e.x, -0.95, 0.95), hy = -0.08 + 0.62 * (1.0 - hx * hx);
      float sq = clamp(1.0 - fzEyeW.x, 0.0, 1.0), tgt = mix(0.04, hy, fzEyeW.y / max(fzEyeW.y + fzEyeW.z, 1e-3));
      float lid = mix(mix(top, tgt + 0.03, sq), bot * 0.9 + 0.06, fzEye.x);
      lid = min(lid, top - fzEye.w * 0.6 * cx);
      float rr = length(vec2(e.x, e.y > 0.0 ? e.y / max(0.05, top / max(cx, 0.05)) : e.y / 0.92));
      float lidL = mix(-1.6, tgt - 0.03, sq);
      float vis = (1.0 - smoothstep(1.0 - aE, 1.0 + aE, rr)) * (1.0 - smoothstep(-aE, aE, e.y - lid)) * smoothstep(-aE, aE, e.y - lidL);
      vec2 ic = ec + vec2(fzEye.y * 0.034, fzEye.z * 0.026 - 0.004);
      vec2 di = q - ic; float ir = 0.152, dr = length(di) / ir, aI = aa / ir;
      vec3 iris = mix(SRGB(0.36, 0.2, 0.1), SRGB(0.72, 0.46, 0.22), smoothstep(0.2, -0.95, di.y / ir));
      iris *= 0.86 + 0.14 * sin(atan(di.y, di.x) * 15.0 + dr * 5.0);
      iris = mix(iris, SRGB(0.16, 0.08, 0.04), smoothstep(0.68, 0.98, dr));
      iris = mix(iris, SRGB(0.05, 0.025, 0.02), 1.0 - smoothstep(0.46 - aI, 0.46 + aI, dr));
      vec3 scl = SRGB(0.97, 0.965, 0.99) * (1.0 - 0.1 * smoothstep(0.6, 1.0, rr));
      vec3 eye = mix(scl, iris, 1.0 - smoothstep(1.0 - aI, 1.0 + aI, dr));
      eye *= 1.0 - 0.45 * smoothstep(lid - 0.62, lid, e.y);
      float c1 = 1.0 - smoothstep(0.31 - aI, 0.31 + aI, length(di / ir - vec2(-0.34, 0.38)));
      float c2 = 1.0 - smoothstep(0.16 - aI, 0.16 + aI, length(di / ir - vec2(0.40, -0.34)));
      float c3 = 1.0 - smoothstep(0.08 - aI, 0.08 + aI, length(di / ir - vec2(0.12, 0.62)));
      float cl = max(max(c1, c2 * 0.92), c3 * 0.8);
      eye = mix(eye, vec3(1.0), cl);
      // thin, even upper lid line (no outer flick: a boy, not mascara)
      float lw = (0.12 + 0.08 * fzEye.x) * mix(0.8, 1.0, smoothstep(-1.0, 0.3, e.x));
      float ly = e.y - lid;
      float lash = smoothstep(-0.05 - aE, -0.05 + aE, ly) * (1.0 - smoothstep(lw - aE, lw + aE, ly)) * (1.0 - smoothstep(0.88, 1.02, abs(e.x)));
      // closed variants: happy ^ and wince >
      float happy = fzLine(abs(e.y - hy) / sqrt(1.0 + fzSq(1.24 * hx)), 0.17, aE) * (1.0 - smoothstep(0.9, 1.02, abs(e.x)));
      float wd = min(fzSeg(e, vec2(0.95, 0.5), vec2(-0.5, 0.02)), fzSeg(e, vec2(-0.5, 0.02), vec2(0.95, -0.42)));
      float wince = fzLine(wd, 0.16, aE);
      vec3 lashC = SRGB(0.17, 0.09, 0.06);
      float lower = fzLine(abs(e.y - max(bot, lidL) - 0.05), 0.045, aE) * smoothstep(0.95, 0.4, abs(e.x - 0.1)) * (1.0 - max(fzEye.x, sq));
      float ow = smoothstep(0.05, 0.35, fzEyeW.x), cw = smoothstep(0.45, 0.9, sq);   // open eye fades only once nearly shut
      col = mix(col, col * SRGB(0.8, 0.62, 0.58), lower * 0.7 * ow);
      col = mix(col, eye, vis * ow);
      col = mix(col, lashC, lash * ow);
      col = mix(col, lashC, happy * fzEyeW.y * cw);
      col = mix(col, lashC, wince * fzEyeW.z * cw);
      gloss = max(gloss, vis * ow);
      emis += vec3(0.55) * cl * vis * ow;
      // brows
      float bx = e.x;
      float by = ec.y + er.y + 0.055 + fzBrow.x * 0.04 + 0.022 * (1.0 - bx * bx) - fzBrow.y * 0.03 * bx;
      float bw = 0.02 * (1.2 - 0.3 * (bx + 1.0)) * (1.0 - 0.3 * smoothstep(0.5, 1.0, abs(bx)));
      float brow = (1.0 - smoothstep(bw * 0.35, bw * 1.25 + aa, abs(q.y - by))) * (1.0 - smoothstep(0.7, 1.0, abs(bx - 0.05)));
      col = mix(col, SRGB(0.2, 0.1, 0.06), brow * 0.9);
      // mouth
      vec2 m = q - vec2(0.012, -0.44);
      vec3 mline = SRGB(0.5, 0.22, 0.19), minner = SRGB(0.45, 0.1, 0.13), medge = SRGB(0.4, 0.12, 0.12);
      // sweet closed smile: symmetric arc, tiny dimple ticks at the corners and a soft lower lip
      float sx = clamp(m.x, -0.108, 0.108);
      float sy = 1.9 * sx * sx - 0.004;
      float sd = abs(m.y - sy) / sqrt(1.0 + fzSq(3.8 * sx));
      float sw = 0.0145 * (1.0 - 0.45 * smoothstep(0.04, 0.11, abs(m.x)));
      float inX = 1.0 - smoothstep(0.108, 0.124, abs(m.x));
      float smirk = fzLine(sd, sw, aa) * inX;
      float lipLo = exp(-fzSq(m.x / 0.065) - fzSq((m.y - sy + 0.024) / 0.015));
      float dimple = (fzLine(fzSeg(vec2(abs(m.x), m.y), vec2(0.124, 0.024), vec2(0.136, 0.056)), 0.0065, aa)) * smoothstep(0.0, 0.01, abs(m.x) - 0.09);
      col = mix(col, SRGB(0.93, 0.5, 0.5), 0.5 * lipLo * inX * fzMouth.x);
      col = mix(col, col * SRGB(1.0, 1.1, 1.1), 0.3 * exp(-fzSq(m.x / 0.022) - fzSq((m.y - sy + 0.022) / 0.005)) * fzMouth.x);
      col = mix(col, col * SRGB(0.8, 0.6, 0.56), 0.7 * dimple * fzMouth.x);
      col = mix(col, mline, smirk * fzMouth.x);
      // open grin and "o" grow open as they blend in (solid colour at every weight, no pale see-through mouth)
      float gk = mix(0.3, 1.0, fzMouth.y), ga = smoothstep(0.0, 0.3, fzMouth.y);
      float gx = m.x / (0.142 * mix(0.8, 1.0, fzMouth.y)), gt = 0.021 + 1.2 * m.x * m.x, gb = gt - 0.12 * gk * sqrt(max(0.0, 1.0 - gx * gx));
      float gin = min(min(gt - m.y, m.y - gb), (1.0 - abs(gx)) * 0.03);
      float gI = smoothstep(-aa, aa, gin), gE = smoothstep(-aa, aa, gin + 0.006) - gI;
      vec3 gc = mix(minner, SRGB(0.95, 0.46, 0.52), 1.0 - smoothstep(0.045 * gk - aa, 0.045 * gk + aa, length(m - vec2(0.0, gt - 0.09 * gk))));
      float gty = gt - 0.017 * mix(0.6, 1.0, fzMouth.y);                                        // teeth
      gc = mix(gc, vec3(0.98), smoothstep(gty - aa, gty + aa, m.y));
      col = mix(col, medge, gE * ga); col = mix(col, gc, gI * ga);
      float ok = mix(0.4, 1.0, fzMouth.z), oa = smoothstep(0.0, 0.3, fzMouth.z);
      vec2 om = (m - vec2(0.0, -0.014)) / (vec2(0.033, 0.04) * ok);                              // "o"
      float od = (length(om) - 1.0) * 0.033 * ok, oI = 1.0 - smoothstep(-aa, aa, od), oE = (1.0 - smoothstep(-aa, aa, od - 0.006)) - oI;
      col = mix(col, medge, oE * oa); col = mix(col, mix(minner, SRGB(0.9, 0.42, 0.48), smoothstep(-0.2, -0.9, om.y)), oI * oa);
      float kx = clamp(m.x, -0.034, 0.034), ky = 2.4 * kx * kx - 0.004;                          // small relaxed line
      float small = fzLine(abs(m.y - ky) / sqrt(1.0 + fzSq(4.8 * kx)), 0.0058, aa) * (1.0 - smoothstep(0.032, 0.042, abs(m.x)));
      col = mix(col, mline, small * fzMouth.w);
      gloss = max(gloss, (gI * ga + oI * oa) * 0.6);
    }`;
  const KNEE = 'outgoingLight = mix(outgoingLight, 1.0 + (outgoingLight - 1.0) / (1.0 + (outgoingLight - 1.0) * 5.0), step(1.0, outgoingLight));';
  function makeSkinMat() {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, color: SKIN, roughness: 0.55, envMapIntensity: 0.75 });
    const U = { fzEye: { value: new THREE.Vector4(0, 0, 0, 0) }, fzEyeW: { value: v3(1, 0, 0) }, fzMouth: { value: new THREE.Vector4(.35, .65, 0, 0) }, fzBrow: { value: v3(0, 0, .32) } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aFace; varying vec2 vFace;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFace = aFace;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FACE_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float fzGloss = 0.0; vec3 fzEmis = vec3(0.0);
          vec2 fzQ = vec2(vFace.x * cos(vFace.y), vFace.y); float fzAA = max(length(fwidth(fzQ)) * 0.7, 1e-4);
          if (vFace.x > -9.0) {
            float hoodSide = smoothstep(0.96, 1.16, abs(vFace.x)) * smoothstep(-0.72, -0.34, vFace.y);
            float hood = max(smoothstep(-0.35, -0.29, vFace.y), hoodSide);
            diffuseColor.rgb = mix(diffuseColor.rgb, SRGB(0.80, 0.035, 0.075), hood);
            float trimM = (1.0 - smoothstep(0.005, 0.017, abs(vFace.y + 0.325))) * (1.0 - smoothstep(0.9, 1.1, abs(vFace.x)));
            diffuseColor.rgb = mix(diffuseColor.rgb, SRGB(1.0, 0.72, 0.2), trimM * 0.95);
          }
          if (vFace.x > -9.0 && abs(vFace.x) < 1.2) fzFace(diffuseColor.rgb, fzGloss, fzEmis, fzQ, fzAA);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, fzGloss);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += fzEmis;')
        .replace('#include <opaque_fragment>', `float fzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += diffuseColor.rgb * vec3(0.6, 0.2, 0.12) * fzF * fzF * 0.38 + vec3(1.0, 0.74, 0.56) * pow(fzF, 3.0) * 0.12 * (1.0 - fzGloss);
          // fake subsurface: warm wrap light past the terminator (the lower face no longer goes dark / grey-tan under an
          // overhead light) + a little warm bounce under the chin
          vec3 fzWrap = vec3(0.0); float fzNL;
          #if NUM_POINT_LIGHTS > 0
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
            getPointLightInfo( pointLights[ i ], geometryPosition, directLight );
            fzNL = dot( geometryNormal, directLight.direction );
            fzWrap += directLight.color * ( 0.5 * fzNL + 0.5 - saturate( fzNL ) );
          }
          #pragma unroll_loop_end
          #endif
          #if NUM_DIR_LIGHTS > 0
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
            getDirectionalLightInfo( directionalLights[ i ], directLight );
            fzNL = dot( geometryNormal, directLight.direction );
            fzWrap += directLight.color * ( 0.5 * fzNL + 0.5 - saturate( fzNL ) );
          }
          #pragma unroll_loop_end
          #endif
          float fzLow = (vFace.x > -9.0 && abs(vFace.x) < 1.6) ? smoothstep(-0.12, -0.6, vFace.y) : 0.0;
          outgoingLight += (BRDF_Lambert(diffuseColor.rgb) * fzWrap * vec3(0.62, 0.36, 0.28) + reflectedLight.indirectDiffuse * vec3(0.25, 0.1, 0.04) * fzLow) * (1.0 - fzGloss);
          ${KNEE}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'flashFezaSkin2';
    m.userData.fz = U;
    return m;
  }
  const CHN = ['bX', 'bY', 'bZ', 'bRX', 'bRY', 'bRZ', 'hRX', 'hRY', 'hRZ', 'cRX', 'cRY', 'cRZ', 'kRX', 'kRY', 'kRZ',
    'aLX', 'aLY', 'aLZ', 'fL', 'fLZ', 'aRX', 'aRY', 'aRZ', 'fR', 'fRZ', 'wX', 'wY', 'wZ', 'tLX', 'tLZ', 'sL', 'tRX', 'tRZ', 'sR'];
  const C = {}; CHN.forEach((n, i) => { C[n] = i; });
  const NCH = CHN.length;
  const LEGS = [C.tLX, C.tLZ, C.sL, C.tRX, C.tRZ, C.sR];
  const BASE = new Float32Array(NCH);
  Object.entries({ cRX: 0.015, kRX: -0.10, kRZ: 0.025, aLX: 0.025, aLZ: 0.14, fL: -0.24, aRX: 0.025, aRY: 0, aRZ: -0.14, fR: -0.24,
    wX: 2.8, wY: 0, wZ: 0.3, tLZ: 0.035, sL: 0.03, tRZ: -0.035, sR: 0.03 }).forEach(([k, v]) => { BASE[C[k]] = v; });
    function idlePose(p, t) {
      p.set(BASE);
      const br = Math.sin(t * 2.3), sw = Math.sin(t * 0.9);
      p[C.cRX] += 0.025 * br; p[C.aLZ] += 0.02 * br; p[C.aRZ] -= 0.02 * br; p[C.bY] += 0.004 * br; p[C.kRX] -= 0.015 * br;
      p[C.hRZ] = 0.03 * sw; p[C.bX] = 0.008 * sw; p[C.kRZ] += 0.025 * Math.sin(t * 0.9 + 1); p[C.cRZ] = -0.02 * sw;
      p[C.tLZ] += 0.02 * sw; p[C.tRZ] += 0.02 * sw;
    }
    function runPose(p, ph, m) {
      p.set(BASE);
      const s = Math.sin(ph), c = Math.cos(ph);
      p[C.bY] = m * (.016 + .022 * (1 - Math.cos(ph * 2))); p[C.bRX] = .15 * m;
      p[C.hRY] = .10 * s * m; p[C.cRY] = -.16 * s * m; p[C.hRZ] = .022 * c * m;
      p[C.kRX] = -.10 - .13 * m; p[C.kRY] = .045 * s * m; p[C.kRZ] = .012;
      p[C.tLX] = -.82 * s * m; p[C.tRX] = .82 * s * m;
      p[C.sL] = m * (.16 + 1.26 * Math.max(0, c)); p[C.sR] = m * (.16 + 1.26 * Math.max(0, -c));
      p[C.aLX] = .04 + .67 * s * m; p[C.aLZ] = .14 + .055 * m; p[C.fL] = -.24 - m * (.70 + .16 * c);
      p[C.aRX] = .04 - .67 * s * m; p[C.fR] = -.24 - m * (.70 - .16 * c); p[C.aRZ] = -p[C.aLZ];
      p[C.bRZ] = -.022 * c * m;
    }
  // Child runner proportions; bone numbering and hierarchy retain the original
  // Feza rig, so the original running channels can be reused without retargeting.
  const BONES = [
    ['root', -1, 0, 0, 0], ['hips', 0, 0, 0.95, 0],
    ['chest', 1, 0, 0.25, 0], ['head', 2, 0, 0.40, 0],
    ['armL', 2, 0.275, 0.30, -0.005], ['foreL', 4, 0, -0.28, 0],
    ['armR', 2, -0.275, 0.30, -0.005], ['foreR', 6, 0, -0.28, 0],
    ['thighL', 1, 0.12, -0.05, 0], ['shinL', 8, 0, -0.40, 0],
    ['thighR', 1, -0.12, -0.05, 0], ['shinR', 10, 0, -0.40, 0],
    ['finL', 3, 0, 0, 0], ['finR', 3, 0, 0, 0]
  ];
  const RED = 0xcd1535, GOLD = 0xffca43, SKIN = 0xf2cbb5;

  function ellipsoid(cx, cy, cz, sx, sy, sz, seg = 14) {
    const g = new THREE.SphereGeometry(1, seg, 10);
    g.scale(sx, sy, sz); g.translate(cx, cy, cz); return g;
  }
  function transformed(g, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(v3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), v3(1, 1, 1));
    return g.applyMatrix4(m);
  }
  function lightningGeo(x, y, z, scale, rx = 0, ry = 0, rz = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(0.16, 0.55); shape.lineTo(-0.37, 0.02);
    shape.lineTo(-0.09, 0.02); shape.lineTo(-0.20, -0.56);
    shape.lineTo(0.41, 0.17); shape.lineTo(0.12, 0.17); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.075, bevelEnabled: false, curveSegments: 1 });
    g.scale(scale, scale, scale);
    return transformed(g, x, y, z, rx, ry, rz);
  }
  function mergeParts(parts, face) {
    // A shorter body and the original Feza-sized face make the four-year-old
    // silhouette clear. Head/hood details are already built in child head space.
    for (const p of parts) if (!p.childHead) {
      p.geo.scale(BODY_WIDTH, BODY_SCALE, BODY_WIDTH);
      // Profiles and weight thresholds are authored in the SAME unscaled rig
      // space. Feeding the shortened vertex y to them bound the whole sleeve
      // to the forearm, pulling its shoulder away whenever the elbow bent.
      if (p.w) {
        const weights = p.w;
        p.w = (x, y, z) => weights(x / BODY_WIDTH, y / BODY_SCALE, z / BODY_WIDTH);
      }
    }
    const g = mergeSkinned(parts, face);
    for (const p of parts) p.geo.dispose();
    return g;
  }
  // Swept wing fin of the Flash cowl: three stacked tapered blades, pivoting at the ear (bone finL / finR).
  function finGeo(s, ear) {
    const blade = (len, hgt, wid, rot, dz) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, -wid * 0.5); sh.quadraticCurveTo(len * 0.55, -wid * 0.6, len, hgt);
      sh.quadraticCurveTo(len * 0.62, wid * 0.6, 0, wid * 0.5); sh.closePath();
      const e = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 6 });
      e.translate(0, 0, -0.012);
      e.applyMatrix4(new THREE.Matrix4().makeRotationZ(rot));
      e.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2 - 0.72));   // shape +X -> back (-z), extrusion -> outwards (+x)
      e.translate(Math.abs(ear.x) + 0.012, HB + ear.y + 0.012 + dz, ear.z + 0.03);
      if (s < 0) {   // mirror to the left of the head and keep the winding outward
        e.scale(-1, 1, 1);
        for (const n of ['position', 'normal', 'uv']) {
          const A = e.attributes[n], k = A.itemSize;
          for (let i = 0; i < A.count; i += 3) for (let c = 0; c < k; c++) { const t = A.array[(i + 1) * k + c]; A.array[(i + 1) * k + c] = A.array[(i + 2) * k + c]; A.array[(i + 2) * k + c] = t; }
        }
        const N = e.attributes.normal; for (let i = 0; i < N.count; i++) N.setX(i, -N.getX(i));
      }
      return e;
    };
    return [blade(0.3, 0.1, 0.075, 0.1, 0.016), blade(0.22, 0.04, 0.062, -0.05, -0.002), blade(0.15, -0.02, 0.05, -0.2, -0.02)];
  }
  function buildRunner() {
    const skin = [{ geo: headGeo(), bone: 3, childHead:true }], suit = [], gold = [];
    skin.push({ geo: lathe([[0, 1.47], [0.068, 1.49], [0.066, 1.58], [0.058, 1.65], [0, 1.68]],
      16, 0, 0, 1, 0.90), w: (x, y) => [2, 3, sstep(1.56, 1.63, y)] });
    // Streamlined torso, long sleeves and trousers replace the original shirt,
    // shorts and equipment. Elbows, knees, neck and waist still use blended skin weights.
    suit.push({ geo: lathe([[0, 0.89], [0.16, 0.91], [0.20, 0.98], [0.20, 1.06],
      [0.225, 1.18], [0.265, 1.33], [0.275, 1.43], [0.225, 1.50],
      [0.145, 1.54], [0.066, 1.56], [0, 1.56]], 36, 0, 0, 1, 0.68),
      w: (x, y) => [1, 2, sstep(1.01, 1.26, y)], color: RED });
    gold.push({ geo: lathe([[0.195, 0.993], [0.208, 1.00], [0.211, 1.02], [0.208, 1.035], [0.20, 1.045]],
      36, 0, 0, 1, 0.72), bone: 1, color: GOLD });
    gold.push({ geo: lathe([[.073, 1.531], [.086, 1.538], [.088, 1.55], [.084, 1.557], [.073, 1.563]],
      18, 0, 0, 1, .90), bone: 2, color: GOLD });
    // Belt buckle: round gold frame with a softly glowing lightning plate.
    gold.push({ geo: transformed(new THREE.CylinderGeometry(0.066, 0.066, 0.02, 24), 0, 1.02, 0.152, Math.PI / 2), bone: 1, color: GOLD });
    gold.push({ geo: transformed(new THREE.CylinderGeometry(0.048, 0.048, 0.016, 24), 0, 1.02, 0.158, Math.PI / 2), bone: 1, color: 0xfff0a8, glow: 1 });
    suit.push({ geo: lightningGeo(0, 1.02, 0.1685, 0.062), bone: 1, color: RED, flat: true });
    // The familiar white disk and gold lightning are model geometry, not an image.
    suit.push({ geo: transformed(new THREE.CylinderGeometry(0.123, 0.123, 0.018, 36),
      0, 1.385, 0.179, Math.PI / 2), bone: 2, color: 0xfff7dd, flat: true });
    gold.push({ geo: transformed(new THREE.TorusGeometry(0.126, 0.011, 8, 40), 0, 1.385, 0.186), bone: 2, color: GOLD });
    gold.push({ geo: lightningGeo(0, 1.385, 0.190, 0.17), bone: 2, color: GOLD, glow: 0.55 });
    for (const s of [1, -1]) {
      const up = s > 0 ? 4 : 6, fore = up + 1, thigh = s > 0 ? 8 : 10, shin = thigh + 1;
      const ax = 0.275 * s, lx = 0.12 * s;
      suit.push({ geo: lathe([[0, 0.91], [0.05, 0.93], [0.06, 0.98], [0.063, 1.05],
        [0.077, 1.16], [0.079, 1.22], [0.084, 1.32], [0.094, 1.43],
        [0.088, 1.48], [0.061, 1.525], [0, 1.54]], 20, ax, -0.005, 1, 0.95),
        w: (x, y) => [up, fore, sstep(1.29, 1.17, y)], color: RED });
      // Round joint caps stay centred on the actual pivots. They cover the
      // bent sleeve/trouser silhouette without separating rigid body pieces.
      suit.push({ geo: ellipsoid(ax, 1.50, -.005, .088, .089, .082, 14), bone: up, color: RED });
      suit.push({ geo: ellipsoid(ax, 1.22, -.005, .077, .08, .074, 14), bone: fore, color: RED });
      // Shoulder pad: a rounded dome with a gold rim, on the upper-arm bone (stays on the shoulder in every pose).
      suit.push({ geo: transformed(ellipsoid(0, 0, 0, .104, .06, .094, 16), ax + s * .012, 1.532, -.005, 0, 0, -s * .28), bone: up, color: 0xd91a3c });
      gold.push({ geo: transformed(new THREE.TorusGeometry(.098, .0085, 6, 28), ax + s * .02, 1.514, -.005, Math.PI / 2, 0, -s * .28 * 0), bone: up, color: GOLD });
      // A round palm, separate soft fingertips and a turned-in thumb read as
      // small gloves, while staying in the same single skinned suit batch.
      suit.push({ geo: ellipsoid(ax, .933, .009, .062, .064, .054, 14), bone: fore, color: RED });
      for (let finger = 0; finger < 4; finger++) {
        const fx = ax + (finger - 1.5) * .023;
        suit.push({ geo: ellipsoid(fx, .884 + Math.abs(finger - 1.5) * .005, .018,
          .0145, .036 - Math.abs(finger - 1.5) * .004, .022, 10), bone: fore, color: RED });
      }
      suit.push({ geo: transformed(ellipsoid(0, 0, 0, .025, .041, .027, 10),
        ax - .052 * s, .936, .036, 0, 0, -.42 * s), bone: fore, color: RED });
      gold.push({ geo: ellipsoid(ax, .952, .06, .032, .017, .008, 10), bone: fore, color: GOLD, glow: 0.4 });
      gold.push({ geo: lathe([[0.067, 1.014], [0.072, 1.02], [0.072, 1.056], [0.067, 1.062]],
        18, ax, -0.005, 1, 0.97), bone: fore, color: GOLD });
      suit.push({ geo: lathe([[0, 0.08], [0.05, 0.10], [0.058, 0.21], [0.077, 0.34],
        [0.075, 0.45], [0.072, 0.50], [0.089, 0.64], [0.105, 0.78],
        [0.11, 0.87], [0.092, 0.965], [0, 0.99]], 20, lx, 0, 1, 0.98),
        w: (x, y) => [thigh, shin, sstep(0.57, 0.46, y)], color: RED });
      suit.push({ geo: ellipsoid(lx, .50, 0, .077, .08, .073, 14), bone: shin, color: RED });
      // Boots: gold shaft with a fold-over cuff, thick cream sole, red toe cap and heel, lightning accents.
      gold.push({ geo: lathe([[0.05, 0.04], [0.058, 0.08], [0.061, 0.15], [0.073, 0.27],
        [0.083, 0.36], [0.084, 0.405], [0.08, 0.435]], 20, lx, 0, 1.02, 1.01),
        bone: shin, color: GOLD });
      gold.push({ geo: lathe([[0.081, 0.395], [0.093, 0.402], [0.096, 0.425], [0.092, 0.452], [0.082, 0.458]], 20, lx, 0, 1.02, 1.01),
        bone: shin, color: 0xffe07a });
      gold.push({ geo: ellipsoid(lx, .083, .067, .09, .066, .172), bone: shin, color: GOLD });
      suit.push({ geo: ellipsoid(lx, .032, .065, .093, .03, .178), bone: shin, color: 0xfff5dc, flat: true });
      suit.push({ geo: ellipsoid(lx, .08, .16, .066, .05, .06), bone: shin, color: RED });
      suit.push({ geo: ellipsoid(lx, .076, -.064, .083, .058, .048), bone: shin, color: RED });
      gold.push({ geo: lightningGeo(lx + s * .088, .22, .01, .075, 0, s * Math.PI / 2), bone: shin, color: 0xfff0b0, glow: 0.7 });
      gold.push({ geo: lightningGeo(lx + s * .094, .09, .09, .05, 0, s * Math.PI / 2), bone: shin, color: 0xfff0b0, glow: 0.7 });
      // Cowl wing fins on the head: own bones so they can flutter.
      const ear = headSurf(s * 1.6, -0.19, v3()).multiplyScalar(HEAD_SCALE);
      for (const g of finGeo(s, ear)) gold.push({ geo: g, bone: s > 0 ? 12 : 13, color: GOLD, childHead: true, glow: 0.15 });
    }
    const hairPieces = [hairCapGeo()];
    for (const lock of hairLocks()) hairPieces.push(lockGeo(lock));
    const hair = concat(hairPieces);
    for (const g of hairPieces) g.dispose();
    return { skin: mergeParts(skin, true), suit: mergeParts(suit), gold: mergeParts(gold), hair };
  }
  // Soft rim + a fake "hair gloss" band that follows the camera (view-space normal), no extra lights.
  const RIM_GLSL = (rim, k) => `
          { float fzR = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
            outgoingLight += vec3(${rim}) * fzR * fzR * fzR * ${k}; }`;
  function makeHairMat() {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.51 });
    const offset = { value: v3() };
    const patch = sh => {
      sh.uniforms.fzHOff = offset;
      sh.vertexShader = sh.vertexShader.replace('#include <common>',
        '#include <common>\nattribute float aFlex; uniform vec3 fzHOff;')
        .replace('#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed += fzHOff * abs(aFlex);');
    };
    m.onBeforeCompile = patch;
    m.customProgramCacheKey = () => 'flashFezaHair1';
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = patch; depth.customProgramCacheKey = () => 'flashFezaHairDepth1';
    m.userData.offset = offset; m.userData.depth = depth;
    return m;
  }

  // ---- procedural suit cloth: fine weave + side seams, one 256x256 canvas used for colour, roughness and bump ----
  function makeClothTexture() {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cx = x & 3, cy = y & 3, over = ((x >> 2) + (y >> 2)) & 1;
      const t = Math.sin(((over ? cx : cy) + 0.5) / 4 * Math.PI);
      let v = 0.8 + 0.2 * t;
      const sd = Math.min(Math.abs(x - 64), Math.abs(x - 192), Math.min(x, N - 1 - x));   // seams: both sides + back centre
      if (sd < 2) v *= (y & 7) < 5 ? 0.62 : 0.8;                                       // stitched seam
      else if (sd < 4) v *= 0.9;
      const k = (y * N + x) * 4, c = Math.max(0, Math.min(255, v * 255)) | 0;
      d[k] = d[k + 1] = d[k + 2] = c; d[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
    return tex;
  }
  // soft pooled sparkle sprites: bolt + four-point star in one 64x32 canvas
  function makeSparkTexture() {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath();
    g.moveTo(21, 3); g.lineTo(8, 17); g.lineTo(15, 17); g.lineTo(11, 29); g.lineTo(25, 13); g.lineTo(18, 13); g.lineTo(23, 3); g.closePath(); g.fill();
    const gr = g.createRadialGradient(48, 16, 0, 48, 16, 11); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(34, 2, 28, 28);
    g.fillStyle = '#fff'; g.beginPath();
    g.moveTo(48, 2); g.quadraticCurveTo(49, 15, 62, 16); g.quadraticCurveTo(49, 17, 48, 30); g.quadraticCurveTo(47, 17, 34, 16); g.quadraticCurveTo(47, 15, 48, 2); g.fill();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    return tex;
  }
  const hash1 = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const bump = (x, w) => (x > 0 && x < w) ? Math.sin(x / w * Math.PI) : 0;
  const SPARKS = 40;

  function create() {
    const body = buildRunner(), root = new THREE.Group(); root.name = 'Flash Feza';
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bones = BONES.map(b => {
      const bone = new THREE.Bone(); bone.name = b[0]; bone.position.set(b[2]*BODY_WIDTH,b[3]*BODY_SCALE,b[4]*BODY_WIDTH);
      bone.rotation.order = 'YXZ'; return bone;
    });
    BONES.forEach((b, i) => { if (b[1] >= 0) bones[b[1]].add(bones[i]); });
    for (const [i, s] of [[12, 1], [13, -1]]) bones[i].position.copy(headSurf(s * 1.6, -0.19, v3()).multiplyScalar(HEAD_SCALE));
    root.add(bones[0]); root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    const cloth = makeClothTexture(), sparkTex = makeSparkTexture();
    const skinMat = makeSkinMat(), hairMat = makeHairMat();
    const rimPatch = (m, key, rim, k, glow) => {
      m.onBeforeCompile = sh => {
        if (glow) {
          sh.uniforms.fzGlow = glow;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow; uniform float fzGlow;')
            .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow * fzGlow;');
        }
        sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', RIM_GLSL(rim, k) + '\n#include <opaque_fragment>');
      };
      m.customProgramCacheKey = () => key;
    };
    const suitMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: cloth, bumpMap: cloth, bumpScale: 0.5, roughness: 0.46, metalness: 0.05 });
    rimPatch(suitMat, 'flashFezaSuit2', '1.0, 0.45, 0.4', 0.34);
    const glowU = { value: 0.8 };
    const goldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.28, emissive: 0xffb62f, emissiveIntensity: 0.06 });
    rimPatch(goldMat, 'flashFezaGold2', '1.0, 0.85, 0.5', 0.4, glowU);
    function skinned(g, mat) {
      const mesh = new THREE.SkinnedMesh(g, mat); mesh.name = 'Flash Feza gövde';
      mesh.castShadow = true; mesh.frustumCulled = false; root.add(mesh); mesh.bind(skeleton); return mesh;
    }
    skinned(body.skin, skinMat); skinned(body.suit, suitMat); skinned(body.gold, goldMat);
    const hair = new THREE.Mesh(body.hair, hairMat); hair.name = 'Feza özgün saç';
    hair.scale.setScalar(HEAD_SCALE); hair.castShadow = true;
    hair.customDepthMaterial = hairMat.userData.depth; bones[3].add(hair);
    // ---- pooled sparkle sprites (bolts + stars); world-space, one additive draw, hidden when idle ----
    const spPos = new Float32Array(SPARKS * 3), spData = new Float32Array(SPARKS * 4), spCol = new Float32Array(SPARKS * 3);
    const spVel = new Float32Array(SPARKS * 3), spLife = new Float32Array(SPARKS), spMax = new Float32Array(SPARKS), spSz = new Float32Array(SPARKS);
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); spGeo.setAttribute('aData', new THREE.BufferAttribute(spData, 4));
    spGeo.setAttribute('aCol', new THREE.BufferAttribute(spCol, 3));
    spGeo.boundingSphere = new THREE.Sphere(v3(), 1e5);
    const spU = { map: { value: sparkTex }, uScale: { value: 600 } };
    const spMat = new THREE.ShaderMaterial({
      uniforms: spU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute vec4 aData; attribute vec3 aCol; uniform float uScale; varying vec4 vD; varying vec3 vC;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = aData; vC = aCol;
          gl_PointSize = clamp(aData.y * uScale / max(0.1, -mv.z), 1.0, 90.0) * step(0.001, aData.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vD; varying vec3 vC;
        void main() { vec2 p = gl_PointCoord - 0.5; float c = cos(vD.x), s = sin(vD.x); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
          if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
          vec4 t = texture2D(map, vec2(p.x * 0.5 + 0.5 * vD.w, 1.0 - p.y));
          gl_FragColor = vec4(vC * t.r * 0.9, t.r * vD.z * 0.8); }`
    });
    const sparksMesh = new THREE.Points(spGeo, spMat); sparksMesh.name = 'Feza kıvılcımları';
    sparksMesh.frustumCulled = false; sparksMesh.matrixAutoUpdate = false; sparksMesh.matrixWorldAutoUpdate = false; sparksMesh.renderOrder = 5;
    const _sz = new THREE.Vector2();
    sparksMesh.onBeforeRender = (rd, sc, cam) => { rd.getDrawingBufferSize(_sz); spU.uScale.value = _sz.y * 0.5 * cam.projectionMatrix.elements[5]; };
    // Compile the sparkle program now (under the loading picture); the mesh is only visible while sparks live.
    try {
      const rd = window.FLASH_CORE && window.FLASH_CORE.renderer;
      if (rd) { const tmp = new THREE.Scene(); tmp.add(sparksMesh); rd.compile(tmp, new THREE.PerspectiveCamera()); tmp.remove(sparksMesh); }
    } catch (e) { /* first sparkle will compile instead */ }
    sparksMesh.visible = false; root.add(sparksMesh);
    let spLive = 0, spNext = 0, spAcc = 0, spSide = 1;
    function spawn(x, y, z, vx, vy, vz, life, size, kind, r, g, b) {
      const i = spNext; spNext = (spNext + 1) % SPARKS;
      spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z; spVel[i * 3] = vx; spVel[i * 3 + 1] = vy; spVel[i * 3 + 2] = vz;
      spLife[i] = spMax[i] = life; spSz[i] = size; spData[i * 4] = Math.random() * 6.28; spData[i * 4 + 3] = kind;
      spCol[i * 3] = r; spCol[i * 3 + 1] = g; spCol[i * 3 + 2] = b;
    }
    function stepSparks(dt) {
      let live = 0;
      for (let i = 0; i < SPARKS; i++) {
        if (spLife[i] <= 0) { spData[i * 4 + 2] = 0; continue; }
        spLife[i] -= dt; const u = Math.max(0, spLife[i] / spMax[i]);
        spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
        spVel[i * 3 + 1] -= 1.2 * dt;
        spData[i * 4 + 1] = spSz[i] * (0.4 + 0.6 * Math.sin(Math.min(1, u * 1.4) * Math.PI / 2)); spData[i * 4] += dt * 2.5;
        spData[i * 4 + 2] = Math.min(1, u * 2.2); live++;
      }
      if (live || spLive) { spGeo.attributes.position.needsUpdate = true; spGeo.attributes.aData.needsUpdate = true; spGeo.attributes.aCol.needsUpdate = true; }
      spLive = live; sparksMesh.visible = live > 0;
    }
    const B = {}; bones.forEach(b => { B[b.name] = b; });
    const P = new Float32Array(NCH), Q = new Float32Array(NCH), J = new Float32Array(NCH);
    let phase = 0, move = 0, clock = 0, destroyed = false, started = false;
    // gaze / head, pigtail spring, face state, one-shot animations
    let gazeX = 0, gazeY = 0, headYaw = 0, lastX = 0, lastZ = 0, lastScale = 0, followY = 0;
    let celT = -1, celDur = 2.3, landT = -1, target = null;
    const sw = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    const FS = { grin: 0, ooh: 0, happy: 0, brow: 0, blush: 0.32, tilt: 0, squint: 0 };
    const FT = { grin: 0, ooh: 0, happy: 0, brow: 0, blush: 0.32, tilt: 0, squint: 0 };
    const _v = v3();
    const smoothPose = (cur, tgt, k) => cur + (tgt - cur) * k;

    function applyPose(p) {
      B.root.position.set(p[C.bX], p[C.bY] * 1.4, p[C.bZ]); B.root.rotation.set(p[C.bRX], p[C.bRY], p[C.bRZ]);
      B.hips.rotation.set(p[C.hRX], p[C.hRY], p[C.hRZ]); B.chest.rotation.set(p[C.cRX], p[C.cRY], p[C.cRZ]);
      B.head.rotation.set(p[C.kRX], p[C.kRY], p[C.kRZ]);
      B.armL.rotation.set(p[C.aLX], p[C.aLY], p[C.aLZ]); B.foreL.rotation.set(p[C.fL], 0, p[C.fLZ]);
      B.armR.rotation.set(p[C.aRX], p[C.aRY], p[C.aRZ]); B.foreR.rotation.set(p[C.fR], 0, p[C.fRZ]);
      B.thighL.rotation.set(p[C.tLX], 0, p[C.tLZ]); B.shinL.rotation.set(p[C.sL], 0, 0);
      B.thighR.rotation.set(p[C.tRX], 0, p[C.tRZ]); B.shinR.rotation.set(p[C.sR], 0, 0);
    }
    // Squat / crouch weight k (0..1): knees bent, body lowered, arms swung back.
    function crouch(p, k) {
      p[C.bY] -= 0.062 * k; p[C.tLX] -= 0.55 * k; p[C.tRX] -= 0.55 * k; p[C.sL] += 1.05 * k; p[C.sR] += 1.05 * k; p[C.bRX] += 0.2 * k;
      p[C.aLX] += 0.45 * k; p[C.aRX] += 0.45 * k; p[C.aLZ] += 0.25 * k; p[C.aRZ] -= 0.25 * k;
    }
    // V-arms up, legs tucked / apart (celebration + airborne): w blends 0..1, tuck 0..1
    function cheer(p, w, tuck, t) {
      const wob = reduced ? 0 : Math.sin(t * 9) * 0.06;
      p[C.aLZ] = lerp(p[C.aLZ], 2.45 + wob, w); p[C.aRZ] = lerp(p[C.aRZ], -2.45 - wob, w);
      p[C.aLX] = lerp(p[C.aLX], 0.0, w); p[C.aRX] = lerp(p[C.aRX], 0.0, w);
      p[C.fL] = lerp(p[C.fL], -0.3, w); p[C.fR] = lerp(p[C.fR], -0.3, w);
      p[C.tLX] = lerp(p[C.tLX], -0.45, tuck); p[C.sL] = lerp(p[C.sL], 0.95, tuck);
      p[C.tRX] = lerp(p[C.tRX], -0.15, tuck); p[C.sR] = lerp(p[C.sR], 0.55, tuck);
      p[C.tLZ] = lerp(p[C.tLZ], 0.16, tuck); p[C.tRZ] = lerp(p[C.tRZ], -0.16, tuck);
      p[C.kRX] = lerp(p[C.kRX], -0.22, w);
    }
    function burst(n, cx, cy, cz, spread, up, big) {
      const ry = root.rotation.y, sc = root.scale.x;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, r = spread * (0.5 + Math.random() * 0.5), hot = Math.random();
        spawn(cx + Math.cos(a) * r * 0.5, cy + Math.random() * 0.4 * sc, cz + Math.sin(a) * r * 0.5, Math.cos(a) * r * 1.4, up * (0.6 + Math.random() * 0.8), Math.sin(a) * r * 1.4,
          0.55 + Math.random() * 0.5, (big ? 0.15 : 0.11) * sc * (0.7 + Math.random() * 0.6), Math.random() < 0.3 ? 1 : 0, 1, 0.78 + 0.2 * hot, 0.25 + 0.5 * hot);
      }
    }

    function update(dt, speed01 = 0, boost = false, time) {
      if (destroyed) return;
      dt = clamp(Number(dt) || 0, 0, 0.1); speed01 = clamp(Number(speed01) || 0, 0, 1);
      const fast = clamp(Number(boost) || 0, 0, 1);
      clock = Number.isFinite(time) ? time : clock + dt;
      move += (speed01 - move) * (dt === 0 ? 1 : 1 - Math.exp(-16 * dt));
      phase = (phase + dt * (7 + 7 * speed01 + 4 * fast) * (move > 0.02 ? Math.min(1, move * 1.7) : 0)) % TAU;
      const rp = root.position, sc = root.scale.x, ry = root.rotation.y;
      // arrival detection: entering the tour scale or a large teleport = landing from the shuttle / portal
      if (started && !reduced) {
        const entered = sc > 1.3 && sc < 1.5 && (lastScale < 1.3 || lastScale > 1.5), jumped = Math.hypot(rp.x - lastX, rp.z - lastZ) > 4;
        if ((entered || jumped) && speed01 < 0.2 && celT < 0) { landT = 0; }
      }
      started = true; lastScale = sc; lastX = rp.x; lastZ = rp.z;
      // ---- base pose: idle + run ----
      idlePose(P, clock);
      // look around: eyes lead, head follows a little; or look at a given target
      let gx, gy;
      if (target) {
        const dx = target.x - rp.x, dz = target.z - rp.z, c = Math.cos(ry), s = Math.sin(ry);
        const lx = dx * c - dz * s, lz = dx * s + dz * c, d = Math.max(0.5, Math.hypot(lx, lz));
        gx = clamp(Math.atan2(lx, lz) / 0.9, -1, 1); gy = clamp((target.y - rp.y - 2.0 * sc) / d * 2.5, -0.7, 0.7);
      } else {
        const seg = 3.1, n = Math.floor(clock / seg), f = clock / seg - n, k = sstep(0, 0.14, f);
        const a0 = (hash1(n - 1) - 0.5) * 2, a1 = (hash1(n) - 0.5) * 2, b0 = (hash1(n + 99) - 0.5), b1 = (hash1(n + 100) - 0.5);
        gx = lerp(a0, a1, k) * 0.9; gy = lerp(b0, b1, k) * 0.9;
        FT.ooh = (hash1(n + 7) > 0.72 ? bump(f - 0.12, 0.45) : 0) * 0.9;
      }
      const run = move > 0.001;
      if (run) {
        runPose(Q, phase, Math.max(move, 0.08));
        Q[C.aRY] = 0;
        Q[C.bRX] += .10 * fast; Q[C.kRX] -= .08 * fast;
        const blend = Math.min(1, move * 2.5);
        for (let i = 0; i < NCH; i++) P[i] += (Q[i] - P[i]) * blend;
        gx *= 1 - blend; gy *= 1 - blend;
        FT.ooh *= 1 - blend;
      }
      gazeX += (gx - gazeX) * (1 - Math.exp(-10 * dt)); gazeY += (gy - gazeY) * (1 - Math.exp(-10 * dt));
      headYaw += (gazeX * 0.32 - headYaw) * (1 - Math.exp(-5 * dt));
      if (!reduced) { P[C.kRY] += headYaw; P[C.kRX] += -gazeY * 0.08; P[C.kRZ] += 0.04 * Math.sin(clock * 0.55 + 1) - headYaw * 0.1; }
      // idle personality: occasional toe-bounce and shoulder shrug
      if (!run && !reduced) { const q = bump((clock % 9.7) - 6.1, 0.8); P[C.bY] += 0.012 * q; P[C.aLZ] += 0.08 * q; P[C.aRZ] -= 0.08 * q; }
      // face targets for the base state
      FT.grin = run ? clamp(0.45 * move + 0.5 * fast, 0, 1) : 0; FT.happy = 0; FT.brow = fast * 0.5; FT.blush = 0.32 + 0.4 * fast + 0.15 * move; FT.tilt = fast * -0.16; FT.squint = fast * 0.12;
      if (run) FT.ooh = 0;
      // ---- airborne (activity hop) ----
      const air = reduced ? 0 : sstep(0.03, 0.22, rp.y);
      if (air > 0.001 && celT < 0) {
        J.set(P); cheer(J, 0.85, 1, clock);
        for (let i = 0; i < NCH; i++) P[i] += (J[i] - P[i]) * air;
        FT.grin = Math.max(FT.grin, air); FT.happy = Math.max(FT.happy, 0.6 * air); FT.brow = Math.max(FT.brow, 0.4 * air);
      }
      // ---- celebration: crouch, jump + spin, land, ta-da ----
      let celW = 0;
      if (celT >= 0) {
        celT += dt;
        const u = celT, cu = clamp(1 - u / celDur, 0, 1);
        J.set(P);
        if (reduced) {
          cheer(J, sstep(0, 0.3, u), 0, clock); FT.grin = 1; FT.happy = 0.8; FT.brow = 0.5; FT.blush = 0.6;
          celW = sstep(0, 0.3, u) * (1 - sstep(celDur - 0.5, celDur, u));
        } else {
          let h = 0, spin = 0, cr = 0, w = 1, tuck = 0;
          if (u < 0.24) { cr = sstep(0, 0.24, u); }
          else if (u < 0.98) { const x = (u - 0.24) / 0.74; h = 0.62 * 4 * x * (1 - x); spin = x; cr = 0; w = sstep(0, 0.2, x); tuck = sstep(0.05, 0.3, x) * (1 - sstep(0.75, 1, x) * 0.5); }
          else if (u < 1.3) { cr = 1 - sstep(0.98, 1.3, u); w = 1; }
          else { w = 1; }
          cheer(J, Math.max(w * (u > 0.24 ? 1 : 0), 0), tuck, clock);
          crouch(J, cr);
          J[C.bY] += h / 1.4; J[C.bRY] = spin * TAU;
          if (u > 1.3) { const q = Math.abs(Math.sin((u - 1.3) * 5.2)); J[C.bY] += 0.028 * q; J[C.hRZ] += 0.05 * Math.sin((u - 1.3) * 5.2); J[C.kRZ] = 0.07 * Math.sin((u - 1.3) * 5.2); }
          FT.grin = 1; FT.happy = u > 0.24 ? 1 : 0; FT.brow = 0.55; FT.blush = 0.65; FT.ooh = 0;
          celW = sstep(0, 0.12, u) * (1 - sstep(celDur - 0.4, celDur, u));
          if (u > 0.24 && u < 0.98 && !reduced) { spAcc += dt * 20; while (spAcc >= 1) { spAcc -= 1; burst(1, rp.x, rp.y + (0.5 + h * 1.4) * sc, rp.z, 0.7 * sc, 1.1, true); } }
        }
        celW *= 1 - sstep(0.15, 0.6, move);
        for (let i = 0; i < NCH; i++) P[i] += (J[i] - P[i]) * celW;
        if (u >= celDur || (move > 0.6 && u > 0.5)) celT = -1;
      }
      // ---- landing from the shuttle / portal: squash, pop, wave-ish arms ----
      if (landT >= 0) {
        landT += dt; const u = landT; J.set(P);
        const cr = u < 0.3 ? sstep(0, 0.3, u) : 1 - sstep(0.3, 0.55, u), h = u > 0.3 && u < 0.78 ? 0.2 * 4 * ((u - 0.3) / 0.48) * (1 - (u - 0.3) / 0.48) : 0;
        cheer(J, sstep(0.3, 0.5, u) * (1 - sstep(1.0, 1.4, u) * 0.5), u > 0.3 && u < 0.8 ? 0.7 : 0, clock);
        if (u < 0.3) { J[C.aLZ] = 0.9; J[C.aRZ] = -0.9; J[C.fL] = -0.2; J[C.fR] = -0.2; }
        crouch(J, cr); J[C.bY] += h / 1.4; J[C.kRZ] += 0.06 * Math.sin(u * 7) * sstep(0.8, 1.0, u);
        FT.ooh = u < 0.3 ? 0.9 : 0; FT.grin = u >= 0.3 ? 1 : 0; FT.happy = u > 0.5 ? 0.7 : 0; FT.brow = 0.6; FT.blush = 0.5;
        const lw = (1 - sstep(1.2, 1.6, u)) * (1 - sstep(0.15, 0.6, move));
        for (let i = 0; i < NCH; i++) P[i] += (J[i] - P[i]) * lw;
        if (u > 0.3 && !reduced && u - dt <= 0.3) burst(14, rp.x, rp.y + 0.1 * sc, rp.z, 1.1 * sc, 1.4, true);
        if (u > 1.6 || (move > 0.6 && u > 0.4)) landT = -1;
      }
      applyPose(P);
      // ---- face ----
      const kf = 1 - Math.exp(-12 * dt), U = skinMat.userData.fz;
      for (const k in FS) FS[k] = smoothPose(FS[k], FT[k], kf);
      const blinkT = clock % 4.3, dbl = Math.floor(clock / 4.3) % 3 === 0 ? bump(blinkT - 0.34, 0.14) : 0;
      let blink = Math.max(bump(blinkT, 0.15), dbl); blink *= 1 - FS.happy;
      U.fzEye.value.set(blink, gazeX * 0.9, gazeY * 0.9, FS.squint);
      U.fzEyeW.value.set(1 - FS.happy, FS.happy, 0);
      const gr = FS.grin, oo = FS.ooh, sm = Math.max(0, 1 - gr - oo);
      U.fzMouth.value.set(sm, gr, oo, 0);
      U.fzBrow.value.set(0.035 + FS.brow * 0.8, FS.tilt, FS.blush);
      // ---- hair, fins, pigtails ----
      const bobY = P[C.bY];
      followY += (bobY - followY) * (1 - Math.exp(-9 * dt));
      const fwd = move * (0.05 + fast * 0.03), inY = (followY - bobY) * 3.2;
      const k1 = 70, c1 = 7;
      if (!reduced) {
        const tx = Math.sin(clock * 1.3) * 0.006 + P[C.hRY] * 0.05 + P[C.kRZ] * 0.15, ty = inY, tz = -fwd;
        sw.vx += ((tx - sw.x) * k1 - sw.vx * c1) * dt; sw.vy += ((ty - sw.y) * k1 - sw.vy * c1) * dt; sw.vz += ((tz - sw.z) * k1 - sw.vz * c1) * dt;
        sw.x += sw.vx * dt; sw.y += sw.vy * dt; sw.z += sw.vz * dt;
        sw.x = clamp(sw.x + Math.sin(phase * 2) * 0.012 * move * 0.0, -0.1, 0.1); sw.y = clamp(sw.y, -0.12, 0.12); sw.z = clamp(sw.z, -0.15, 0.1);
      }
      hairMat.userData.offset.value.set(0, -move * 0.008, -move * (0.018 + fast * 0.016));
      const fl = reduced ? 0 : 1;
      for (const [fn, s] of [[B.finL, 1], [B.finR, -1]]) {
        fn.rotation.set(fl * (0.07 * Math.sin(clock * 2.1 + s) - 0.14 * move - inY * 0.8 + 0.18 * (celT >= 0 ? 1 : 0)), fl * s * (0.12 * move + 0.03 * Math.sin(clock * 1.4)), 0);
      }
      goldMat.emissiveIntensity = 0.06 + fast * 0.32;
      glowU.value = 0.7 + (reduced ? 0 : 0.25 * Math.sin(clock * 2.6)) + fast * 0.5;
      // ---- feet sparks: only when really running fast; none for reduced motion ----
      if (!reduced) {
        const hot = (fast > 0.5 && move > 0.5) ? 1 : (move > 0.92 ? 0.35 : 0);
        if (hot > 0) {
          spAcc += dt * 38 * hot * move;
          const cs = Math.cos(ry), sn = Math.sin(ry);
          while (spAcc >= 1) {
            spAcc -= 1; spSide = -spSide;
            const lx = spSide * 0.12 * BODY_WIDTH * sc, lz = -0.06 * sc;
            const wx = rp.x + lx * cs + lz * sn, wz = rp.z - lx * sn + lz * cs, r = Math.random();
            spawn(wx, rp.y + 0.05 * sc, wz, -sn * 0.55 * sc * 2 + (r - 0.5) * 0.8, 0.5 + r * 0.8, -cs * 0.55 * sc * 2 + (Math.random() - 0.5) * 0.8,
              0.3 + Math.random() * 0.25, (0.1 + Math.random() * 0.07) * sc, Math.random() < 0.7 ? 0 : 1, 1, 0.82 + 0.15 * r, 0.3 + 0.4 * r);
          }
        }
      }
      stepSparks(dt);
    }
    function celebrate(seconds) { if (reduced) celDur = 1.4; else celDur = clamp(Number(seconds) || 2.3, 1.6, 4); celT = 0; landT = -1; spAcc = 0; }
    function land() { if (!reduced) { landT = 0; celT = -1; } }
    function lookAt(p) { target = p && Number.isFinite(p.x) ? p : null; }
    function dispose() {
      if (destroyed) return; destroyed = true;
      Object.values(body).forEach(g => g.dispose());
      [skinMat, suitMat, goldMat, hairMat, hairMat.userData.depth, spMat].forEach(m => m.dispose());
      cloth.dispose(); sparkTex.dispose(); spGeo.dispose();
      skeleton.dispose(); root.removeFromParent();
    }
    update(0, 0, false, 0);
    return { root, update, dispose, bones: B, skeleton, celebrate, land, lookAt };
  }
  window.FLASH_HERO = Object.freeze({ create });
})();
