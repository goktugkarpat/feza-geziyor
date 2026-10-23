/* Bilbo — Feza'nın çikolata kahve Labrador'u, gezinin yol arkadaşı.
 * Model, iskelet ve yürüyüş ../feza-bilbo/hala/src/04_bilbo.js; iz takibi 04_bilbo_follow.js; mutlu/koklama/binme
 * pozları 04_bilbo_fun.js kaynaklarının BAĞIMSIZ KOPYASIDIR (aksesuar, kemik atma, ödül, hapşırma çıkarıldı).
 * Klasik script, yalnız window.THREE. Sözleşme: TASARIM.md › "Bilbo".
 * FLASH_BILBO.create({free(x,z,r), ses(ad), reduced}) → { root, guncelle(dt,time,feza), isinla, kokla, havla, sevin,
 *   otur, bin, in, bak, mod, dispose }. root.scale = 1 tur sahnesinde doğru boydur; iç ölçek OLCEK_TUR. +Z'ye bakar.
 */
(function () {
  'use strict';
  const THREE = window.THREE;
  // hala'da Feza 1.546 birim, Bilbo 1.378 × 0.78 (BILBO_SCALE) = 1.075 birim → Bilbo/Feza = 0.695.
  // Bu oyunda Feza turda 1.78 × 1.42 ≈ 2.53 birim → Bilbo ≈ 1.76 birim → iç ölçek 1.76 / 1.378 ≈ 1.28.
  // Sırtı Feza'nın beline gelsin (feza-bilbo oranı; tur'da Feza ≈ 2.53 birim).
  const OLCEK_TUR = 1.1;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const TURNS = [0, -.6, .6, -1.2, 1.2, Math.PI], SIDES = [-1, 1, 0];
  // Açık çikolata-kahve (yukarıdan bakışta da köpek olarak okunsun).
  const COAT = 0x7f5639, EAR = 0x684429, MUZZLE = 0x8d6444;

  // ── Paylaşılan malzeme ve geometri: ilk create() çağrısında bir kez kurulur. ──
  let SH = null;
  function sheen(mat, rgb, k, p, key) {
    // Kadife kahve tüy: ucuz bir kenar parlaması (ek ışık yok), köşe renklerini korur.
    mat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
        `{ float bRim = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
           outgoingLight += diffuseColor.rgb * vec3(${rgb}) * (pow(bRim, ${p}) * ${k}); }
         #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => key;
    return mat;
  }
  // Sürekli yontulmuş yüzeyler. Kesitler: z, yatay yarıçap, dikey yarıçap, merkez y.
  function loft(sections, rows = 40, sides = 32) {
    const pos = [], uv = [], idx = [];
    const sample = (t, k) => {
      const u = t * (sections.length - 1), i = Math.min(sections.length - 2, Math.floor(u)), f = u - i;
      const a = sections[Math.max(0, i - 1)][k], b = sections[i][k], c = sections[i + 1][k], d = sections[Math.min(sections.length - 1, i + 2)][k];
      return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    };
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, z = sample(t, 0), rx = Math.max(0.001, sample(t, 1)), ry = Math.max(0.001, sample(t, 2)), cy = sample(t, 3);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        pos.push(Math.cos(a) * rx, cy + Math.sin(a) * ry, z); uv.push(j / sides, t);
        if (i < rows && j < sides) { const n = i * (sides + 1) + j; idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function earGeo(side) {
    // Kafatasının içine bağlı, yanakta geniş, ucu içe kıvrık yuvarlak kulak kıvrımı.
    const g = loft([[0, .001, .001, 0], [.035, .064, .034, .012], [.12, .123, .046, .035],
      [.24, .125, .039, .075], [.35, .089, .030, .105], [.43, .039, .018, .11], [.46, .001, .001, .10]], 26, 18);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getZ(i), u = clamp01(t / .46);
      p.setXYZ(i, p.getX(i) + side * (.045 * Math.sin(u * Math.PI) - .014 * u), -t, p.getY(i));
    }
    g.computeVertexNormals(); return g;
  }
  function shared() {
    if (SH) return SH;
    const furMat = sheen(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74 }), '1.30, 1.12, 0.98', '0.75', '2.8', 'flashBilboFur');
    const wetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36 });
    const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16 });
    const shineMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const sphere = new THREE.SphereGeometry(1, 22, 14), detail = new THREE.SphereGeometry(1, 12, 9);
    const trunkGeo = loft([[-0.91, .001, .001, .72], [-.77, .23, .26, .73], [-.52, .32, .33, .75],
      [-.16, .32, .31, .77], [.18, .35, .37, .78], [.42, .33, .38, .83], [.59, .19, .27, .88], [.66, .001, .001, .89]], 32, 26);
    const headGeo = loft([[-.29, .001, .001, .02], [-.23, .23, .24, .045], [-.08, .315, .29, .07],
      [.10, .31, .27, .07], [.25, .24, .20, .015], [.40, .235, .155, -.055], [.54, .215, .14, -.068], [.63, .13, .08, -.06], [.65, .001, .001, -.05]], 38, 32);
    { const p = headGeo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > .20) p.setY(i, .20 + (p.getY(i) - .20) * .55); headGeo.computeVertexNormals(); }
    const foreGeo = loft([[-.07, .065, .08, 0], [.04, .127, .15, 0], [.17, .118, .125, 0], [.30, .099, .103, 0], [.44, .085, .087, .015], [.60, .078, .08, .035], [.67, .068, .064, .04]], 24, 18);
    const hindGeo = loft([[-.09, .065, .09, 0], [.02, .18, .21, 0], [.15, .17, .185, 0], [.29, .12, .13, -.035], [.43, .089, .095, -.02], [.59, .075, .08, .03], [.67, .068, .064, .04]], 24, 18);
    const tailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .03, -.22), new THREE.Vector3(0, .14, -.47), new THREE.Vector3(0, .20, -.73)
    ]), 24, .08, 12, false);
    { const p = tailGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = Math.floor(i / 13) / 24, k = 1 - .86 * t;
        const c = tailGeo.parameters.path.getPointAt(t);
        p.setXYZ(i, p.getX(i) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
      tailGeo.computeVertexNormals(); }
    SH = { furMat, wetMat, eyeMat, shineMat, sphere, detail, trunkGeo, headGeo, earL: earGeo(-1), earR: earGeo(1), foreGeo, hindGeo, tailGeo };
    return SH;
  }

  // ── Model: hala'daki eklemli iskelet, dört malzeme çizimi (tüy, ıslak burun/ağız, göz, parıltı). ──
  function buildModel() {
    const S = shared(), { furMat, wetMat, eyeMat, shineMat, sphere, detail } = S;
    const inner = new THREE.Group(); inner.name = 'Bilbo model';
    const bones = [], parts = [], owned = [];
    function joint(parent, name, x = 0, y = 0, z = 0) {
      const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); bones.push(b); return b;
    }
    function part(bone, geo, color, pos = [0, 0, 0], scale = [1, 1, 1], mat = furMat, rot = [0, 0, 0]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
      const p = { bone, geo, color: new THREE.Color(color), m, mat }; parts.push(p); return p;
    }
    const ell = (b, col, p, s, mat = furMat, rot) => part(b, sphere, col, p, s, mat, rot);
    const small = (b, col, p, s, mat = wetMat) => part(b, detail, col, p, s, mat);
    function curve(b, pts, radius, color, mat = wetMat) {
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 20, radius, 6, false);
      owned.push(g); part(b, g, color, undefined, undefined, mat);
    }
    const body = joint(inner, 'body'); part(body, S.trunkGeo, COAT);
    const neck = joint(body, 'neck', 0, .91, .38);
    ell(neck, COAT, [0, .06, .08], [.29, .32, .30], furMat, [-.25, 0, 0]);
    const head = joint(neck, 'head', 0, .18, .13);
    part(head, S.headGeo, COAT).muzzle = true;
    small(head, 0x563831, [0, -.022, .635], [.137, .073, .070]);
    curve(head, [[0, -.09, .645], [0, -.15, .622], [0, -.174, .598]], .006, 0x402b23);
    for (const side of [-1, 1]) {
      small(head, 0x241b19, [side * .066, -.017, .702], [.032, .023, .015]);
      curve(head, [[0, -.174, .598], [side * .11, -.193, .552], [side * .19, -.150, .43]], .006, 0x402b23);
      ell(head, 0x3b2a21, [side * .202, .131, .262], [.074, .060, .040]);
      const eye = joint(head, 'eye' + side, side * .202, .135, .294);
      small(eye, 0xc08f45, [0, 0, 0], [.061, .053, .020], eyeMat);
      small(eye, 0x171311, [0, .001, .016], [.040, .043, .011], eyeMat);
      small(eye, 0xffffff, [-.015, .020, .027], [.015, .014, .006], shineMat);
      small(eye, 0xfff1d6, [.017, -.017, .026], [.0065, .0065, .004], shineMat);
      ell(head, COAT, [side * .19, .168, .170], [.094, .040, .085]);
      // Yuvarlak yanaklar uzun Labrador ağzını yavru köpek gülüşüne çevirir.
      ell(head, MUZZLE, [side * .088, -.072, .500], [.105, .082, .118]);
    }
    const eyes = bones.filter(b => b.name.startsWith('eye'));
    const ears = [-1, 1].map(side => {
      const b = joint(head, 'ear' + side, side * .268, .235, .015); part(b, side < 0 ? S.earL : S.earR, EAR); return { b, side, z: 0 };
    });
    const jaw = joint(head, 'jaw', 0, -.12, .26);
    ell(jaw, 0x7a3a40, [0, -.062, .205], [.150, .028, .158], wetMat);
    ell(jaw, MUZZLE, [0, -.093, .19], [.195, .055, .177]);
    const tongue = joint(jaw, 'tongue', 0, -.060, .25);
    small(tongue, 0xe07c86, [0, 0, .095], [.068, .020, .13]);
    small(tongue, 0xbd5a66, [0, .012, .11], [.008, .010, .10]);
    const legs = [];
    for (const front of [true, false]) for (const side of [-1, 1]) {
      const b = joint(body, (front ? 'fore' : 'hind') + side, side * .25, .75, front ? .33 : -.56);
      const shin = joint(b, 'shin', 0, -.30, front ? 0 : -.035);
      const limb = part(b, front ? S.foreGeo : S.hindGeo, COAT, [0, 0, 0], [1, 1, 1], furMat, [Math.PI / 2, 0, 0]);
      limb.skin = z => { let w = clamp01((z - .20) / .20); w = w * w * (3 - 2 * w); return { bone: shin, w }; };
      const foot = joint(shin, 'paw', 0, -.34, .035);
      ell(foot, COAT, [0, -.02, .075], [.135, .090, .204]);
      for (const x of [-.045, .045]) curve(foot, [[x, .025, .228], [x, .047, .17], [x, .055, .11]], .0035, 0x493023, furMat);
      legs.push({ b, shin, foot, front, side });
    }
    const tail = joint(body, 'tail', 0, .83, -.79); part(tail, S.tailGeo, COAT);
    inner.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones), meshes = [];
    // Bütün tüy tek deri yüzeyi paylaşır; köpeğin tamamı dört malzeme çizimidir.
    for (const mat of new Set(parts.map(p => p.mat))) {
      const list = parts.filter(p => p.mat === mat), positions = [], normals = [], colors = [], uvs = [], skinI = [], skinW = [], indices = [];
      const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
      const muzzleColor = new THREE.Color(MUZZLE), painted = new THREE.Color();
      let base = 0;
      for (const p of list) {
        const m = p.bone.matrixWorld.clone().multiply(p.m), a = p.geo.attributes, bi = bones.indexOf(p.bone);
        nm.getNormalMatrix(m);
        for (let i = 0; i < a.position.count; i++) {
          v.fromBufferAttribute(a.position, i).applyMatrix4(m); positions.push(v.x, v.y, v.z);
          n.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
          const shade = mat === furMat ? .91 + .09 * clamp01(n.y * .5 + .5) : 1;
          painted.copy(p.color);
          if (p.muzzle) painted.lerp(muzzleColor, clamp01((a.position.getZ(i) - .20) / .32) * clamp01((.20 - a.position.getY(i)) / .20));
          colors.push(painted.r * shade, painted.g * shade, painted.b * shade);
          uvs.push(a.uv ? a.uv.getX(i) : 0, a.uv ? a.uv.getY(i) : 0);
          const skin = p.skin ? p.skin(a.position.getZ(i)) : null;
          skinI.push(bi, skin ? bones.indexOf(skin.bone) : 0, 0, 0); skinW.push(skin ? 1 - skin.w : 1, skin ? skin.w : 0, 0, 0);
        }
        const index = p.geo.index;
        for (let i = 0; i < (index ? index.count : a.position.count); i++) indices.push(base + (index ? index.getX(i) : i));
        base += a.position.count;
      }
      const g = new THREE.BufferGeometry();
      for (const [key, data, size] of [['position', positions, 3], ['normal', normals, 3], ['color', colors, 3], ['uv', uvs, 2], ['skinWeight', skinW, 4]]) g.setAttribute(key, new THREE.Float32BufferAttribute(data, size));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4)); g.setIndex(indices); g.computeBoundingSphere();
      const mesh = new THREE.SkinnedMesh(g, mat); mesh.name = 'Bilbo yüzeyi'; mesh.castShadow = mat !== shineMat; mesh.receiveShadow = false;
      mesh.frustumCulled = false; inner.add(mesh); mesh.bind(skel); meshes.push(mesh);
    }
    owned.forEach(g => g.dispose());
    return { inner, bones, meshes, skel, body, neck, head, eyes, ears, jaw, tongue, legs, tail };
  }

  function create(opts) {
    opts = opts || {};
    const reduced = !!opts.reduced || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const say = typeof opts.ses === 'function' ? opts.ses : () => {};
    const freeFn = typeof opts.free === 'function' ? opts.free : null;
    const K = buildModel(), { inner, body, neck, head, eyes, ears, jaw, tongue, legs, tail } = K;
    const root = new THREE.Group(); root.name = 'Bilbo'; root.add(inner);
    inner.scale.setScalar(OLCEK_TUR);

    // ── Poz durumu (hala BILBO.update ile aynı katmanlar) ──
    let t = 0, stride = 0, run = 0, rest = 0, sit = 0, blinkAt = 2.8, blink = 0;
    let happy = 0, sniff = 0, dig = 0, ride = 0, wagPh = 0, lookYaw = 0, lookPitch = 0;
    const ST = { speed: 0, bark: 0, sit: false, happy: 0, sniff: false, dig: false, ride: false };
    function pose(dt) {
      dt = Math.min(Math.max(dt || 0, 0), .1); t += dt;
      const speed = Math.max(0, ST.speed || 0), moving = speed > .10;
      run = smooth(run, clamp01(speed / 5.2), 10, dt);
      // Çok hızlı koşuda adım sıklığı sınırlanır; dörtnal sıçraması (aşağıda) hızı anlatır.
      stride += Math.min(speed, 8.5) * dt * 3.8;
      rest = moving || ST.bark > 0 || ST.sniff || ST.dig || ST.ride ? 0 : rest + dt;
      sit = smooth(sit, ST.sit || rest > 25 ? 1 : 0, 4, dt);
      happy = smooth(happy, clamp01(ST.happy || 0), 2.5, dt); sniff = smooth(sniff, ST.sniff ? 1 : 0, 6, dt);
      dig = smooth(dig, ST.dig ? 1 : 0, 8, dt); ride = smooth(ride, ST.ride ? 1 : 0, 6, dt);
      const age = 1.30 - (ST.bark || 0);
      const bark = ST.bark > 0 ? Math.exp(-Math.pow((age - .13) / .11, 2)) + Math.exp(-Math.pow((age - .85) / .12, 2)) : 0;
      body.position.y = run * .018 * Math.cos(stride * 2) + .004 * Math.sin(t * 2.2) - sit * .13;
      body.rotation.set(-.09 * sit + .02 * run * Math.cos(stride), 0, .014 * run * Math.sin(stride));
      for (const { b, shin, foot, front, side } of legs) {
        const phase = stride + (front ? 0 : Math.PI) + (side > 0 ? Math.PI : 0), s = Math.sin(phase);
        b.position.y = .75 + (front ? .08 * sit : 0);
        b.rotation.x = .48 * run * s + (front ? -.10 : 1.03) * sit;
        shin.rotation.x = .60 * run * Math.max(0, -Math.cos(phase)) - (front ? 0 : 1.35) * sit;
        foot.rotation.x = -b.rotation.x * .30 - shin.rotation.x * .55;
      }
      neck.rotation.set(-.035 * run + .025 * bark, 0, 0);
      head.rotation.x = -.02 + .028 * (1 - run) * Math.sin(t * 1.4) - .11 * bark;
      head.rotation.y = .045 * (1 - run) * Math.sin(t * .63);
      head.rotation.z = .02 * (1 - run) * Math.sin(t * .7);
      for (const e of ears) { e.z = smooth(e.z, e.side * (.04 + .10 * run * Math.sin(stride - .6) + .10 * bark), 12, dt); e.b.rotation.z = e.z; }
      // Mutlu kuyruk: faz biriktirici, tempo zıplamadan yumuşakça artar.
      const glee = Math.max(happy, sniff, dig, ride);
      wagPh += dt * (5.4 + 9.5 * glee);
      tail.rotation.y = (.18 + .25 * run + .42 * glee) * Math.sin(wagPh);
      tail.rotation.x = -.10 + .07 * Math.sin(t * 2.7) - sit * .18;
      jaw.rotation.x = .012 + .55 * bark;
      blinkAt -= dt;
      if (blinkAt <= 0) { blink = .18; blinkAt = 2.7 + Math.random() * 2.4; }
      blink = Math.max(0, blink - dt);
      const lid = 1 - .92 * Math.sin(Math.PI * clamp01(blink / .18));
      eyes.forEach(b => { b.scale.y = lid; });
      ears.forEach(({ b, side }) => { b.rotation.x = .035 * run * Math.sin(stride + side); });
      head.rotation.z += .055 * (1 - run) * Math.sin(t * .91);
      jaw.rotation.x += run > .45 ? .065 + .025 * Math.sin(t * 8) : 0;
      tongue.scale.setScalar(Math.max(.1, run * .55, bark > .1 ? .8 : 0));
      funPose(bark);
      // Bakış: boyun ve baş paylaşır; koşarken azalır.
      const lk = 1 - .6 * run;
      neck.rotation.y += lookYaw * .4 * lk; head.rotation.y += lookYaw * .6 * lk; head.rotation.x += lookPitch * lk;
    }
    // Mutlu / koklama / kazma / binme pozları (yürüyüşün üstüne katmanlanır).
    function funPose(bark) {
      const wig = Math.sin(wagPh);
      // Kuyrukla bütün arka sallanır; boyun ters döner, sevimli yüz sabit kalır.
      const rear = .075 * Math.max(happy, sniff) * (1 - run) * (1 - sit) * wig;
      body.rotation.y += rear; neck.rotation.y -= rear;
      body.rotation.z += .02 * happy * (1 - run) * Math.sin(wagPh + .8);
      const grin = Math.max(happy * (1 - sniff) * (1 - dig), ride);
      jaw.rotation.x += .15 * grin + .035 * grin * Math.sin(t * 9.5);
      tongue.rotation.x = .18 + .32 * grin + .05 * Math.sin(t * 9.5) * grin;
      tongue.scale.setScalar(Math.max(tongue.scale.x, .92 * grin));
      if (ride > .01) for (const { b, side } of ears) b.rotation.z += side * ride * (.10 + .12 * Math.sin(t * 15 + side));
      if (sniff > .01) {
        const burstOn = Math.sin(t * 3.1) > -.2 ? 1 : 0;
        neck.rotation.x += .66 * sniff; head.rotation.x += .26 * sniff + .05 * sniff * burstOn * Math.sin(t * 34);
        head.rotation.y += .22 * sniff * Math.sin(t * 1.7);
        body.rotation.x += .05 * sniff;
        for (const { b } of ears) b.rotation.x -= .2 * sniff;
        for (const e of eyes) e.scale.y *= 1 - .25 * sniff;
      }
      if (dig > .01) {
        body.rotation.x += .27 * dig; body.position.y -= .04 * dig;
        neck.rotation.x += .40 * dig; head.rotation.x += .16 * dig;
        for (const L of legs) {
          if (L.front) {
            const s = Math.sin(t * 17 + (L.side > 0 ? Math.PI : 0));
            L.b.rotation.x += (-.42 - .55 * s - L.b.rotation.x * .6) * dig;
            L.shin.rotation.x += (.75 * Math.max(0, s) + .15) * dig;
            L.foot.rotation.x += (-.35 * Math.max(0, -s)) * dig;
          } else L.b.rotation.x -= .25 * dig;
        }
        for (const e of eyes) e.scale.y *= 1 - .15 * dig;
      }
    }

    // ── İz takibi (hala BILBO_FOLLOW; bu oyunun ölçeğine büyütüldü: Feza 14–28 birim/sn koşar). ──
    const W = OLCEK_TUR / 0.78;                    // hala dünyasına göre büyüme (≈1.64)
    const RADIUS = .34 * W, SPACING = 1.75 * W, PERSONAL = 1.02 * W;
    const pos = { x: 0, z: 0 }, g0 = { x: 0, z: 0 }, tmpP = { x: 0, z: 0 };
    const trail = []; let trailHead = 0, trailLen = 0; const TRAIL_MAX = 160;
    for (let i = 0; i < TRAIL_MAX; i++) trail.push({ x: 0, z: 0 });
    let last = { x: 0, z: 0, ok: false }, vx = 0, vz = 0, face = 0, speed = 0, walking = false;
    const free = (x, z) => !freeFn || freeFn(x, z, RADIUS);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    function clearPath(a, b) {
      if (!freeFn) return true;
      const n = Math.max(1, Math.ceil(dist(a, b) / .35));
      for (let i = 1; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false;
      return true;
    }
    function move(dx, dz) {
      // Engelin kenarında kayarak ilerler; Feza'yı asla itmez.
      if (free(pos.x + dx, pos.z + dz)) { pos.x += dx; pos.z += dz; return; }
      if (free(pos.x + dx, pos.z)) pos.x += dx;
      else if (free(pos.x, pos.z + dz)) pos.z += dz;
    }
    function pushTrail(x, z) {
      const p = trail[trailHead]; p.x = x; p.z = z; trailHead = (trailHead + 1) % TRAIL_MAX; trailLen = Math.min(TRAIL_MAX, trailLen + 1);
    }
    function trailAt(k) { return trail[(trailHead - 1 - k + TRAIL_MAX * 2) % TRAIL_MAX]; }   // k=0 en yeni
    function resetFollow(hx, hz, x, z, angle) {
      pos.x = x; pos.z = z; face = angle; speed = vx = vz = 0; walking = false;
      trailLen = 0; trailHead = 0; pushTrail(x, z); pushTrail(hx, hz); last.x = hx; last.z = hz; last.ok = true;
    }
    function goal(hero) {
      if (!last.ok || dist(hero, last) > .18 * W) { pushTrail(hero.x, hero.z); last.x = hero.x; last.z = hero.z; last.ok = true; }
      let px = hero.x, pz = hero.z, left = SPACING;
      const oldest = trailLen ? trailAt(trailLen - 1) : hero;
      g0.x = oldest.x; g0.z = oldest.z;
      for (let k = 0; k < trailLen; k++) {
        const p = trailAt(k), d = Math.hypot(px - p.x, pz - p.z);
        if (d >= left) { const f = left / d; g0.x = px + (p.x - px) * f; g0.z = pz + (p.z - pz) * f; break; }
        left -= d; px = p.x; pz = p.z;
      }
      // Ani dönüşte eski iz Feza'nın içine düşebilir; sabit, güvenli bir yan seç.
      if (dist(g0, hero) < PERSONAL + .18 * W || !free(g0.x, g0.z)) {
        const a = Math.atan2(pos.x - hero.x, pos.z - hero.z);
        for (const turn of TURNS) {
          tmpP.x = hero.x + Math.sin(a + turn) * SPACING; tmpP.z = hero.z + Math.cos(a + turn) * SPACING;
          if (free(tmpP.x, tmpP.z) && clearPath(hero, tmpP)) { g0.x = tmpP.x; g0.z = tmpP.z; break; }
        }
      }
      // Kamera ile Feza arasına girme: hedef kamera tarafındaysa Feza'nın yanına (kameraya göre sağ/sol) kaydır.
      if (Number.isFinite(hero.kx)) {
        let fx = hero.x - hero.kx, fz = hero.z - hero.kz; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        const sx = -fz, sz = fx, yan = (pos.x - hero.x) * sx + (pos.z - hero.z) * sz >= 0 ? 1 : -1;
        const lat = (g0.x - hero.x) * sx + (g0.z - hero.z) * sz, lon = (g0.x - hero.x) * fx + (g0.z - hero.z) * fz, YAN = 2.3;
        if (Math.abs(lat) < YAN && lon < 1.2) {
          const ileri = Math.max(-0.6, Math.min(0.8, lon));
          tmpP.x = hero.x + sx * yan * YAN + fx * ileri; tmpP.z = hero.z + sz * yan * YAN + fz * ileri;
          if (!free(tmpP.x, tmpP.z)) { tmpP.x = hero.x - sx * yan * YAN + fx * ileri; tmpP.z = hero.z - sz * yan * YAN + fz * ileri; }
          if (free(tmpP.x, tmpP.z)) { g0.x = tmpP.x; g0.z = tmpP.z; }
        }
      }
      return g0;
    }
    function spotNear(hx, hz, yon) {
      // Feza'nın arka-yanında boş bir yer (hala bilboSpot).
      const c = Math.cos(yon), s = Math.sin(yon);
      for (const side of SIDES) {
        const x = hx + side * c * 1.45 * W - s * .65 * W, z = hz - side * s * 1.45 * W - c * .65 * W;
        if (free(x, z)) { tmpP.x = x; tmpP.z = z; return tmpP; }
      }
      tmpP.x = hx - s * 1.6 * W; tmpP.z = hz - c * 1.6 * W; return tmpP;
    }
    function steerTo(dt, target, hero, maxSpeed, gain, stopAt) {
      const d = dist(pos, target);
      if (walking ? d < stopAt : d > stopAt + .23 * W) walking = !walking;
      let ux = d > .001 ? (target.x - pos.x) / d : 0, uz = d > .001 ? (target.z - pos.z) / d : 0;
      const desired = walking ? Math.min(maxSpeed, d * gain) : 0;
      if (hero) {
        const hx = pos.x - hero.x, hz = pos.z - hero.z, hd = Math.hypot(hx, hz);
        // Çocuğun gövdesine varmadan etrafından dolan; geçiş boyunca aynı yanı kullan.
        if (hd < 1.65 * W && hd > .001 && ux * hx + uz * hz < 0) {
          const into = (ux * hx + uz * hz) / (hd * hd);
          ux -= hx * into; uz -= hz * into;
          if (Math.hypot(ux, uz) < .1) { ux = -hz / hd; uz = hx / hd; }
          const l = Math.hypot(ux, uz); ux /= l; uz /= l;
        }
      }
      vx = smooth(vx, ux * desired, 9, dt); vz = smooth(vz, uz * desired, 9, dt);
      if (!walking && Math.hypot(vx, vz) < .025) vx = vz = 0;
      const bx = pos.x, bz = pos.z;
      let mx = vx * dt, mz = vz * dt;
      const len = Math.hypot(mx, mz);
      if (len > d && d > .01) { mx *= d / len; mz *= d / len; }
      move(mx, mz);
      if (hero) {
        const sep = dist(pos, hero);
        if (sep < PERSONAL) {
          let ax = pos.x - hero.x, az = pos.z - hero.z;
          if (sep < .001) { ax = Math.sin(face + Math.PI / 2); az = Math.cos(face + Math.PI / 2); }
          const n = Math.hypot(ax, az), x = hero.x + ax / n * PERSONAL, z = hero.z + az / n * PERSONAL;
          if (free(x, z)) { pos.x = x; pos.z = z; }
        }
      }
      const travelled = Math.hypot(pos.x - bx, pos.z - bz), actual = dt > 0 ? travelled / dt : 0;
      speed = smooth(speed, actual, 9, dt);
      if (travelled > .002 && actual > .10) {
        const tf = Math.atan2(pos.x - bx, pos.z - bz);
        face += wrap(tf - face) * (1 - Math.exp(-(actual > 6 ? 12 : 8) * dt));
      }
      if (actual < .08 && desired > .5) vx = vz = 0;
      return d;
    }

    // ── Eylemler ──
    let mode = 'takip', homeParent = null, barkT = 0, happyT = 0, happyDur = 1, spin = 0, hopT = -1, hop = 0;
    let sniffJob = null, lookTarget = null, lastHero = { x: 0, z: 0 }, idleLook = 0;
    const tmpV = new THREE.Vector3(), worldPos = new THREE.Vector3();
    function havla() { barkT = 1.30; say('hav'); }
    function sevin(sn) { happyDur = Math.max(.6, Number(sn) || 1.5); happyT = happyDur; if (!reduced) hopT = 0; }
    function isinla(x, z, yon) {
      yon = Number.isFinite(yon) ? yon : 0;
      const s = spotNear(x, z, yon), bx = s.x, bz = s.z;
      resetFollow(x, z, bx, bz, yon);
      if (mode !== 'bin') mode = 'takip';
      sniffJob = null; root.position.set(bx, 0, bz); root.rotation.y = yon; lastHero.x = x; lastHero.z = z;
    }
    function kokla(nokta, sn) {
      if (!nokta || !Number.isFinite(nokta.x) || !Number.isFinite(nokta.z) || mode === 'bin') return false;
      sniffJob = { x: nokta.x, z: nokta.z, sn: Math.max(.6, Number(sn) || 2.2), faz: 'git', t: 0 };
      mode = 'kokla'; walking = false; return true;
    }
    // Mini oyunda belirli bir yere gidip orada oturarak izler; bekle(null) takibe döndürür.
    const yerHedef = { x: 0, z: 0 }; let yerSure = 0;
    function bekle(nokta) {
      if (mode === 'bin') return;
      if (nokta && Number.isFinite(nokta.x)) {
        yerHedef.x = nokta.x; yerHedef.z = nokta.z; mode = 'yer'; sniffJob = null; yerSure = 0;
        // Çok uzaktaysa (ya da arada su/engel varsa) hedefin yanına sıçrar; oyun başında kadrajda olsun.
        if (dist(pos, yerHedef) > 8 * W / 1.41) { pos.x = yerHedef.x; pos.z = yerHedef.z; vx = vz = 0; if (!reduced) hopT = 0; }
      }
      else if (mode === 'yer') { mode = 'takip'; resetFollow(lastHero.x, lastHero.z, pos.x, pos.z, face); }
    }
    function otur(on) {
      if (mode === 'bin') return;
      if (on) { mode = 'otur'; sniffJob = null; vx = vz = 0; walking = false; }
      else if (mode === 'otur') { mode = 'takip'; resetFollow(lastHero.x, lastHero.z, pos.x, pos.z, face); }
    }
    function bin(parent, localPos, yon) {
      if (!parent) return false;
      if (mode !== 'bin') homeParent = root.parent;
      mode = 'bin'; sniffJob = null; vx = vz = speed = 0; walking = false;
      parent.add(root);
      if (localPos) root.position.copy(localPos); else root.position.set(0, 0, 0);
      root.rotation.set(0, Number(yon) || 0, 0);
      return true;
    }
    function inmek(x, z, yon) {
      if (mode !== 'bin') return false;
      root.removeFromParent();
      if (homeParent) homeParent.add(root);
      mode = 'takip'; homeParent = null;
      yon = Number.isFinite(yon) ? yon : face;
      resetFollow(lastHero.x, lastHero.z, x, z, yon);
      root.position.set(x, 0, z); root.rotation.set(0, yon, 0); hopT = reduced ? -1 : 0;
      return true;
    }
    function bak(nokta) { lookTarget = nokta && Number.isFinite(nokta.x) ? nokta : null; }

    function guncelle(dt, time, feza) {
      dt = Math.min(.05, Math.max(0, dt || 0));
      const hero = feza && Number.isFinite(feza.x) ? feza : lastHero;
      if (hero !== lastHero) { lastHero.x = hero.x; lastHero.z = hero.z; }
      barkT = Math.max(0, barkT - dt);
      happyT = Math.max(0, happyT - dt);
      ST.sniff = false; ST.dig = false; ST.ride = false; ST.sit = false;

      if (mode === 'bin') {
        speed = 0; ST.ride = true; ST.sit = true;
      } else if (mode === 'yer') {
        yerSure += dt;
        if (yerSure > 3.5 && dist(pos, yerHedef) > .8 * W) { pos.x = yerHedef.x; pos.z = yerHedef.z; vx = vz = 0; if (!reduced) hopT = 0; }   // takıldıysa
        if (dist(pos, yerHedef) > .35 * W) steerTo(dt, yerHedef, null, 30, 3.6, .1 * W);
        else { speed = smooth(speed, 0, 9, dt); vx = vz = 0; walking = false; ST.sit = happyT <= 0;
          face += wrap(Math.atan2(hero.x - pos.x, hero.z - pos.z) - face) * (1 - Math.exp(-4 * dt)); }
      } else if (mode === 'otur') {
        speed = smooth(speed, 0, 9, dt); ST.sit = true;
      } else if (mode === 'kokla' && sniffJob) {
        const j = sniffJob; j.t += dt;
        if (j.faz === 'git') {
          const d = steerTo(dt, j, null, 30, 3.6, .7 * W);
          if (d < .95 * W || j.t > 6) { j.faz = 'kokla'; j.t = 0; vx = vz = 0; walking = false; }
          else if (dist(pos, hero) > 40) { j.faz = 'don'; }
        } else if (j.faz === 'kokla') {
          speed = smooth(speed, 0, 9, dt); ST.sniff = true;
          face += wrap(Math.atan2(j.x - pos.x, j.z - pos.z) - face) * (1 - Math.exp(-6 * dt));
          if (j.t >= j.sn) { j.faz = 'havla'; j.t = 0; havla(); happyT = Math.max(happyT, 1.4); happyDur = Math.max(happyDur, 1.4); }
        } else if (j.faz === 'havla') {
          speed = smooth(speed, 0, 9, dt);
          if (j.t >= 1.35) j.faz = 'don';
        }
        if (j.faz === 'don') { sniffJob = null; mode = 'takip'; resetFollow(hero.x, hero.z, pos.x, pos.z, face); }
      } else {
        mode = 'takip';
        const d0 = dist(pos, hero);
        if (d0 > 30) {
          // Çok geride kaldı: Feza'nın yanına sıçrar.
          const s = spotNear(hero.x, hero.z, Number.isFinite(hero.yon) ? hero.yon : face);
          resetFollow(hero.x, hero.z, s.x, s.z, Number.isFinite(hero.yon) ? hero.yon : face);
          if (!reduced) hopT = 0;
        } else {
          const g = goal(hero);
          // Uzaklaşınca kazanç artar (>14 birimde tam hız): Feza 28 birim/sn koşsa bile kopmaz.
          steerTo(dt, g, hero, 32, d0 > 14 ? 5.2 : 3.6, .13 * W);
        }
      }

      // Hop: ışınlanma/inişte küçük zıplama ya da sevinç zıplaması.
      hop = 0;
      if (hopT >= 0) { hopT += dt; const u = hopT / .42; if (u >= 1) hopT = -1; else hop = Math.sin(Math.PI * u) * .55 * W * .5; }
      if (happyT > 0 && !reduced) {
        const u = 1 - happyT / happyDur;
        if (mode !== 'bin') hop = Math.max(hop, Math.abs(Math.sin(u * Math.PI * 2)) * .22 * W * (1 - u * .3));
        // Yerinde dururken bir tur döner.
        spin = speed < 1.5 && mode !== 'bin' ? Math.PI * 2 * (u * u * (3 - 2 * u)) : 0;
      } else spin = 0;
      // Dörtnal: çok hızlıyken gövde hafifçe sıçrar.
      if (mode !== 'bin' && speed > 10 && !reduced) hop = Math.max(hop, Math.abs(Math.sin(stride)) * .12 * W * clamp01((speed - 10) / 8));

      // Bakış hedefi: açıkça verilen nokta; yoksa dururken Feza'ya.
      let want = lookTarget;
      if (!want && mode !== 'kokla' && speed < .6 && mode !== 'bin') { idleLook += dt; if (idleLook > 1.2) want = hero; } else idleLook = 0;
      let yawWant = 0, pitchWant = 0;
      if (want) {
        root.getWorldPosition(worldPos);
        tmpV.set(want.x, Number.isFinite(want.y) ? want.y : worldPos.y + 1.6 * W, want.z);
        root.worldToLocal(tmpV);
        const yaw = Math.atan2(tmpV.x, Math.max(.2, tmpV.z));
        yawWant = Math.max(-1.0, Math.min(1.0, yaw));
        if (Number.isFinite(want.y)) pitchWant = Math.max(-.35, Math.min(.35, -Math.atan2(tmpV.y - 1.4 * W, Math.hypot(tmpV.x, tmpV.z)) * .6));
      }
      lookYaw = smooth(lookYaw, yawWant, 6, dt); lookPitch = smooth(lookPitch, pitchWant, 6, dt);

      if (mode !== 'bin') { root.position.set(pos.x, hop, pos.z); root.rotation.set(0, face + spin, 0); }
      else inner.position.y = 0;
      ST.speed = speed / OLCEK_TUR; ST.bark = barkT;
      ST.happy = happyT > 0 ? 1 : (mode === 'bin' ? .6 : 0);
      if (!ST.happy && mode === 'takip' && speed < .6 && dist(pos, hero) < 6 * W) ST.happy = .45;   // Feza yanındayken hafif kuyruk
      pose(dt);
    }

    function dispose() {
      K.meshes.forEach(m => { m.geometry.dispose(); m.removeFromParent(); });
      K.skel.dispose(); root.removeFromParent();
    }
    resetFollow(0, 0, 0, -SPACING, 0);
    root.position.set(0, 0, -SPACING);
    ST.speed = 0; pose(0);
    return {
      root, guncelle, isinla, kokla, havla, sevin, otur, bekle, bin, in: inmek, bak,
      mod: () => mode, olcek: OLCEK_TUR, bones: K.bones, head: K.head,
      konum: () => pos, dispose
    };
  }

  window.FLASH_BILBO = Object.freeze({ create, OLCEK_TUR });
}());
