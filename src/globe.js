'use strict';
window.FLASH_GLOBE = (() => {
  // Real Natural Earth 1:50m geometry, locally embedded in geography.js.
  // Colours, ocean shading, clouds, city lights and little ships are illustration, not physical data.
  const G = window.FLASH_GEO;
  if (!G) throw new Error('Dünya haritası verisi yüklenemedi.');
  // Pastel but richer: each country keeps one of these with a soft top-to-bottom light gradient.
  const palette = ['#9bd68f', '#f0d283', '#b5d89a', '#eba98f', '#8fd7b4', '#e3c97f', '#8fcdbb', '#e1a9d0', '#d9dc8b', '#9cc4ee', '#f4b383', '#a9d58f', '#bba7e6'];
  const latLon = (lat, lon, r = 4.6) => {
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r);
  };
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed = 90417;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function trace(g, country, w, h) {
    g.beginPath();
    for (const ring of country.rings) {
      const p = ring.points;
      for (let i = 0; i < p.length; i += 2) { const x = (p[i] + 180) / 360 * w, y = (90 - p[i + 1]) / 180 * h; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.closePath();
    }
  }
  // One pass builds the visible map, an exact country-id mask (selected glow), a gloss map
  // (shiny sea, matte land) and a tiny night-lights map. All canvases are built once at setup.
  function textures(mobile) {
    const W = mobile ? 2048 : 4096, H = W / 2, k = W / 4096;
    const cv = canvasOf(W, H), g = cv.getContext('2d');
    const ocean = g.createLinearGradient(0, 0, 0, H);
    ocean.addColorStop(0, '#2b74b4'); ocean.addColorStop(0.18, '#3a93bf'); ocean.addColorStop(0.5, '#47b0c8'); ocean.addColorStop(0.82, '#3a93bf'); ocean.addColorStop(1, '#236aa6');
    g.fillStyle = ocean; g.fillRect(0, 0, W, H);
    // Faint wave strokes and a soft lat/long net keep the open sea alive.
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * W, y = (0.06 + rnd() * 0.88) * H, l = (10 + rnd() * 26) * k;
      g.strokeStyle = 'rgba(214,248,252,' + (0.05 + rnd() * 0.07).toFixed(3) + ')'; g.lineWidth = (1.2 + rnd() * 1.4) * k;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * .5, y - l * .22, x + l, y); g.stroke();
    }
    g.strokeStyle = 'rgba(224,250,251,.11)'; g.lineWidth = 1.2 * k;
    for (let lon = -180; lon <= 180; lon += 15) { const x = (lon + 180) / 360 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { const y = (90 - lat) / 180 * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // Pale shallow-water ring around every coast (land is painted over the inner half).
    g.lineJoin = 'round';
    for (const [lw, a] of [[22, .13], [14, .17], [8, .22]]) {
      g.strokeStyle = 'rgba(183,246,236,' + a + ')'; g.lineWidth = lw * k;
      for (const c of G.countries) { if (c.id === 'aq') continue; trace(g, c, W, H); g.stroke(); }
    }
    for (const c of G.countries) {
      trace(g, c, W, H);
      let top = 1e9, bottom = -1e9;
      for (const ring of c.rings) { top = Math.min(top, (90 - ring.bounds[3]) / 180 * H); bottom = Math.max(bottom, (90 - ring.bounds[1]) / 180 * H); }
      const base = c.id === 'aq' ? '#f0f5eb' : c.id === 'gl' ? '#d5e9d9' : palette[(((c.color | 0) - 1) % palette.length + palette.length) % palette.length];
      const grad = g.createLinearGradient(0, top, 0, bottom + 1);
      grad.addColorStop(0, c.id === 'aq' || c.id === 'gl' ? base : shade(base, 1.09)); grad.addColorStop(1, c.id === 'aq' || c.id === 'gl' ? base : shade(base, .93));
      g.fillStyle = grad; g.fill('evenodd');
      g.strokeStyle = c.id === 'aq' ? '#dce9df' : 'rgba(53,104,92,.66)'; g.lineWidth = 2.1 * k; g.stroke();
    }
    const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;

    // Country-id mask. Red and green carry two unrelated codes so blends at borders never match a country.
    const MW = mobile ? 1024 : 2048, MH = MW / 2, mc = canvasOf(MW, MH), mg = mc.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, MW, MH);
    G.countries.forEach((c, i) => {
      trace(mg, c, MW, MH); const id = i + 1;
      mg.fillStyle = mg.strokeStyle = 'rgb(' + id + ',' + ((id * 53 + 17) & 255) + ',0)'; mg.lineWidth = 1.1; mg.lineJoin = 'round'; mg.fill('evenodd'); mg.stroke();
    });
    const mask = new THREE.CanvasTexture(mc); mask.magFilter = mask.minFilter = THREE.NearestFilter; mask.generateMipmaps = false;

    // Gloss map: green channel is roughness (low on the sea => sun glint, high on land).
    const RW = 1024, RH = 512, rc = canvasOf(RW, RH), rg = rc.getContext('2d');
    rg.fillStyle = 'rgb(0,58,0)'; rg.fillRect(0, 0, RW, RH);
    rg.fillStyle = 'rgb(0,238,0)'; rg.strokeStyle = 'rgb(0,238,0)'; rg.lineWidth = 1.2;
    for (const c of G.countries) { trace(rg, c, RW, RH); rg.fill('evenodd'); rg.stroke(); }
    const rough = new THREE.CanvasTexture(rc); rough.generateMipmaps = true;

    // Night lights: little warm clusters inside each country, sized by the country's bounds.
    const CW = 1024, CH = 512, cc = canvasOf(CW, CH), cg = cc.getContext('2d');
    cg.fillStyle = '#000'; cg.fillRect(0, 0, CW, CH);
    for (const c of G.countries) {
      if (c.id === 'aq' || c.id === 'gl') continue;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const ring of c.rings) {
        x0 = Math.min(x0, (ring.bounds[0] + 180) / 360 * CW); x1 = Math.max(x1, (ring.bounds[2] + 180) / 360 * CW);
        y0 = Math.min(y0, (90 - ring.bounds[3]) / 180 * CH); y1 = Math.max(y1, (90 - ring.bounds[1]) / 180 * CH);
      }
      const inside = (x, y) => { const hit = G.countryAt(90 - y / CH * 180, x / CW * 360 - 180); return !!hit && hit.id === c.id; };
      const area = (x1 - x0) * (y1 - y0), clusters = Math.max(1, Math.min(4, Math.round(area / 2600)));
      for (let n = 0; n < clusters; n++) {
        let cx = 0, cy = 0, tries = 0;
        do { cx = x0 + rnd() * (x1 - x0); cy = y0 + rnd() * (y1 - y0); tries++; } while (tries < 60 && !inside(cx, cy));
        if (tries >= 60) continue;
        const dots = 5 + Math.round(Math.min(26, Math.sqrt(area) * 0.7));
        for (let d = 0; d < dots; d++) {
          const sx = cx + (rnd() + rnd() + rnd() - 1.5) * Math.min(14, 3 + Math.sqrt(area) * .22), sy = cy + (rnd() + rnd() + rnd() - 1.5) * Math.min(9, 2 + Math.sqrt(area) * .15);
          if (!inside(sx, sy)) continue;
          const r = 0.7 + rnd() * 1.1;
          cg.fillStyle = 'rgba(255,' + (190 + (rnd() * 50 | 0)) + ',120,' + (0.55 + rnd() * 0.45).toFixed(2) + ')';
          cg.beginPath(); cg.arc(sx, sy, r, 0, 6.2832); cg.fill();
        }
      }
    }
    const city = new THREE.CanvasTexture(cc);
    // Soft puffy clouds with wrap-around so the drifting layer never shows a seam.
    const KW = 1024, KH = 512, kc = canvasOf(KW, KH), kg = kc.getContext('2d');
    const puff = (x, y, r, a) => {
      for (const ox of [0, -KW, KW]) {
        const gr = kg.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(0.55, 'rgba(255,255,255,' + a * .55 + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        kg.fillStyle = gr; kg.beginPath(); kg.arc(x + ox, y, r, 0, 6.2832); kg.fill();
      }
    };
    for (let band = 0; band < 46; band++) {
      const lat = (rnd() < .5 ? -1 : 1) * (rnd() < .5 ? 8 + rnd() * 24 : 38 + rnd() * 30) * (rnd() < .2 ? .2 : 1);
      const cx = rnd() * KW, cy = (90 - lat) / 180 * KH, n = 5 + (rnd() * 8 | 0);
      for (let i = 0; i < n; i++) puff(cx + (rnd() - .5) * 110, cy + (rnd() - .5) * 22, 16 + rnd() * 24, .38 + rnd() * .3);
    }
    const clouds = new THREE.CanvasTexture(kc); clouds.colorSpace = THREE.SRGBColorSpace; clouds.wrapS = THREE.RepeatWrapping;
    return { map, mask, rough, city, clouds };
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return 'rgb(' + c(n >> 16) + ',' + c(n >> 8 & 255) + ',' + c(n & 255) + ')';
  }
  // Tiny merged non-indexed geometry (position, normal, colour) used for ships and planes.
  function merged(parts) {
    const pos = [], nor = [], col = [];
    parts.forEach(([geo, color, m]) => {
      const g = (geo.index ? geo.toNonIndexed() : geo).clone().applyMatrix4(m); g.computeVertexNormals();
      const c = new THREE.Color(color), p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  }
  const M = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  function boatGeometry() {
    const sail = new THREE.BufferGeometry();
    sail.setAttribute('position', new THREE.Float32BufferAttribute([0, .02, 0, 0, .13, 0, .09, .02, 0, 0, .02, 0, .09, .02, 0, 0, .13, 0], 3));
    return merged([[new THREE.BoxGeometry(.2, .035, .075), 0xf0605f, M(0, .02, 0)], [new THREE.BoxGeometry(.12, .02, .06), 0xffffff, M(-.01, .045, 0)],
      [sail, 0xffffff, M(-.01, .04, 0, 1, 1, 1)], [new THREE.BoxGeometry(.012, .15, .012), 0x8a5a3a, M(-.01, .09, 0)]]);
  }
  function planeGeometry() {
    return merged([[new THREE.CylinderGeometry(.018, .012, .15, 8).rotateX(Math.PI / 2), 0xffffff, M(0, 0, 0)], [new THREE.BoxGeometry(.17, .006, .04), 0xff7a62, M(0, 0, .0)],
      [new THREE.BoxGeometry(.06, .006, .025), 0xff7a62, M(0, 0, -.065)], [new THREE.BoxGeometry(.006, .045, .03), 0xffd35a, M(0, .02, -.065)]]);
  }
  function create(countries) {
    const mobile = window.FLASH_CORE?.profile.mobile || navigator.maxTouchPoints > 1, reduced = reducedMotion();
    const tex = textures(mobile);
    const root = new THREE.Group();
    const uniforms = { uMask: { value: tex.mask }, uCity: { value: tex.city }, uTexel: { value: new THREE.Vector2(1 / tex.mask.image.width, 1 / tex.mask.image.height) },
      uSel: { value: new THREE.Vector2() }, uSelOn: { value: 0 }, uTime: { value: 0 } };
    const earthMaterial = new THREE.MeshStandardMaterial({ map: tex.map, roughnessMap: tex.rough, roughness: 1, metalness: 0 });
    earthMaterial.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uMask, uCity;\nuniform vec2 uTexel, uSel;\nuniform float uSelOn, uTime;\n' +
          'float isSel(vec2 uv){ vec4 m = texture2D(uMask, uv) * 255.0; return step(abs(m.r - uSel.x), 0.7) * step(abs(m.g - uSel.y), 0.7); }')
        .replace('#include <map_fragment>', '#include <map_fragment>\n' +
          'float selMatch = 0.0, selEdge = 0.0, selHalo = 0.0, pulse = 0.65 + 0.35 * sin(uTime * 3.0);\n' +
          'if (uSelOn > 0.5) {\n' +
          '  selMatch = isSel(vMapUv); vec2 o = uTexel * 1.6, w = uTexel * 4.0;\n' +
          '  float inner = isSel(vMapUv + vec2(o.x, 0.0)) * isSel(vMapUv - vec2(o.x, 0.0)) * isSel(vMapUv + vec2(0.0, o.y)) * isSel(vMapUv - vec2(0.0, o.y));\n' +
          '  selEdge = selMatch * (1.0 - inner);\n' +
          '  float outer = max(max(isSel(vMapUv + vec2(w.x, 0.0)), isSel(vMapUv - vec2(w.x, 0.0))), max(isSel(vMapUv + vec2(0.0, w.y)), isSel(vMapUv - vec2(0.0, w.y))));\n' +
          '  selHalo = (1.0 - selMatch) * outer * 0.8;\n' +
          '  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.18 + vec3(0.07, 0.05, 0.0), selMatch * (0.5 + 0.22 * pulse));\n' +
          '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.74), selEdge * 0.85);\n' +
          '}')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
          'totalEmissiveRadiance += vec3(1.0, 0.82, 0.38) * (selEdge * 0.55 + selHalo * 0.42 + selMatch * 0.05) * (0.7 + 0.3 * pulse);\n' +
          '#if NUM_DIR_LIGHTS > 0\n' +
          '  float night = 1.0 - smoothstep(-0.32, -0.02, dot(normal, directionalLights[0].direction));\n' +
          '  if (night > 0.001) totalEmissiveRadiance += texture2D(uCity, vMapUv).r * night * (0.62 + 0.38 * sin(uTime * 1.9 + vMapUv.x * 913.0 + vMapUv.y * 517.0)) * vec3(1.0, 0.62, 0.22) * 1.05;\n' +
          '#endif');
    };
    earthMaterial.customProgramCacheKey = () => 'flash-globe-v2';
    const earth = new THREE.Mesh(new THREE.SphereGeometry(4.5, 96, 64), earthMaterial);
    earth.rotation.y = -Math.PI / 2; root.add(earth);
    // One cheap cloud layer, drifting slowly over the land and sea.
    const cloudMaterial = new THREE.MeshStandardMaterial({ map: tex.clouds, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1, metalness: 0 });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(4.555, 64, 40), cloudMaterial); clouds.rotation.y = -Math.PI / 2; root.add(clouds);
    // Soft blue rim light around the planet (additive, no lights, no texture).
    const atmosphereMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN, vV; void main(){ float d = max(0.0, dot(normalize(vN), normalize(vV))); ' +
        'float a = smoothstep(0.0, 0.30, d) * (1.0 - smoothstep(0.30, 0.52, d)); a = a * a * 0.8; ' +
        'vec3 c = mix(vec3(0.38, 0.78, 1.0), vec3(0.78, 0.94, 1.0), smoothstep(0.1, 0.34, d)); gl_FragColor = vec4(c * a, a);\n' +
        '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(4.8, 64, 40), atmosphereMaterial); root.add(halo);

    const markers = [], rings = [], markerMaterials = [], ringMaterials = [];
    const markerGeometry = new THREE.SphereGeometry(0.13, 14, 10), ringGeometry = new THREE.TorusGeometry(0.22, 0.028, 6, 28);
    countries.forEach(country => {
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffcb4e }); markerMaterials.push(markerMaterial);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial); marker.position.copy(latLon(country.lat, country.lon, 4.67)); marker.userData.country = country; root.add(marker); markers.push(marker);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xfff8d1 }); ringMaterials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial); ring.position.copy(latLon(country.lat, country.lon, 4.575)); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.position.clone().normalize()); root.add(ring); rings.push(ring);
    });
    const laterGeometry = new THREE.SphereGeometry(0.065, 8, 6), laterMaterial = new THREE.MeshBasicMaterial({ color: 0x709c9e });
    [[-41, 174], [-34, 18], [20, -100]].forEach(([lat, lon]) => { const marker = new THREE.Mesh(laterGeometry, laterMaterial); marker.position.copy(latLon(lat, lon, 4.57)); root.add(marker); });

    // Little life on the sea and in the sky: 5 sailing boats + 3 planes in two instanced draws.
    const boatMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 });
    const boats = new THREE.InstancedMesh(boatGeometry(), boatMaterial, 5), planes = new THREE.InstancedMesh(planeGeometry(), boatMaterial, 3);
    boats.frustumCulled = planes.frustumCulled = false; root.add(boats, planes);
    const craft = [
      // lat, lon, heading (rad, 0 = east), swing amplitude, speed, phase, radius
      [28, -42, .4, .13, .5, 0, 4.545], [-18, -25, 1.9, .12, .42, 1.7, 4.545], [8, -148, .2, .15, .38, 3, 4.545], [-34, -118, 2.4, .12, .46, 4.6, 4.545], [-14, 78, .9, .13, .44, 2.2, 4.545]
    ];
    const flights = [[46, -30, .35, .16, 0, 4.78], [10, 60, 2.2, .12, 2, 4.8], [-25, -140, 1.1, .14, 4, 4.76]];
    const n = new THREE.Vector3(), f = new THREE.Vector3(), a = new THREE.Vector3(), e = new THREE.Vector3(), u = new THREE.Vector3(), mat = new THREE.Matrix4(), yAxis = new THREE.Vector3(0, 1, 0);
    function place(mesh, i, pos, fwd, radius, scale) {
      // basis: x = right (east-ish), y = surface normal, z = forward
      e.crossVectors(pos, fwd).normalize(); u.copy(pos).normalize();
      mat.makeBasis(e.multiplyScalar(scale), u.multiplyScalar(scale), fwd.normalize().multiplyScalar(scale)); mat.setPosition(pos.x * radius / pos.length(), pos.y * radius / pos.length(), pos.z * radius / pos.length());
      mesh.setMatrixAt(i, mat);
    }
    function sailors(time) {
      for (let i = 0; i < craft.length; i++) {
        const c = craft[i], lat = c[0] * Math.PI / 180, lon = c[1] * Math.PI / 180;
        n.set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
        a.crossVectors(yAxis, n).normalize(); f.crossVectors(n, a).normalize();            // a = east, f = north
        const fx = a.x * Math.cos(c[2]) + f.x * Math.sin(c[2]), fy = a.y * Math.cos(c[2]) + f.y * Math.sin(c[2]), fz = a.z * Math.cos(c[2]) + f.z * Math.sin(c[2]);
        f.set(fx, fy, fz); a.crossVectors(n, f).normalize();                               // a = rotation axis (right of travel)
        const s = Math.sin(time * c[4] + c[5]) * c[3], flip = Math.cos(time * c[4] + c[5]) < 0 ? -1 : 1;
        n.applyAxisAngle(a, s); f.applyAxisAngle(a, s).multiplyScalar(flip);
        // gentle bob riding the swell
        place(boats, i, n.multiplyScalar(1), f, c[6] + Math.sin(time * 1.7 + i * 2) * .004, 1.1);
      }
      boats.instanceMatrix.needsUpdate = true;
    }
    function flyers(time) {
      for (let i = 0; i < flights.length; i++) {
        const c = flights[i], lat = c[0] * Math.PI / 180, lon = c[1] * Math.PI / 180;
        n.set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
        a.crossVectors(yAxis, n).normalize(); f.crossVectors(n, a).normalize();
        const fx = a.x * Math.cos(c[2]) + f.x * Math.sin(c[2]), fy = a.y * Math.cos(c[2]) + f.y * Math.sin(c[2]), fz = a.z * Math.cos(c[2]) + f.z * Math.sin(c[2]);
        f.set(fx, fy, fz); a.crossVectors(n, f).normalize();
        const s = time * 0.075 + c[4];
        n.applyAxisAngle(a, s); f.applyAxisAngle(a, s);
        place(planes, i, n, f, c[5], 1.25);
      }
      planes.instanceMatrix.needsUpdate = true;
    }
    sailors(0); flyers(0);

    let desired = -0.5, desiredTilt = 0.25, selected = null;
    let velY = 0, velX = 0, lastDragAt = -1e9;
    const wrapped = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    const idByCountry = new Map(G.countries.map((c, i) => [c.id, i + 1]));
    function focus(country, immediate = false) {
      selected = country; const target = -country.lon * Math.PI / 180; velX = velY = 0;
      desired = immediate ? target : root.rotation.y + wrapped(target - root.rotation.y);
      desiredTilt = Math.max(-1.2, Math.min(1.2, country.lat * Math.PI / 180));
      if (immediate) { root.rotation.y = desired; root.rotation.x = desiredTilt; }
      const id = idByCountry.get(country.id);
      if (id) { uniforms.uSel.value.set(id, (id * 53 + 17) & 255); uniforms.uSelOn.value = 1; } else uniforms.uSelOn.value = 0;
      countries.forEach((entry, i) => { const active = entry.id === country.id; markerMaterials[i].color.set(active ? 0xff7840 : 0xffcb4e); ringMaterials[i].color.set(active ? 0xffe9a0 : 0xfff8d1); markers[i].scale.setScalar(active ? 1.2 : 1); });
    }
    return {
      root, markers, latLon, focus,
      update(dt, time) {
        const now = performance.now(), dragging = now - lastDragAt < 90;
        uniforms.uTime.value = reduced ? 0 : time % 3000;
        if (!dragging && !reduced) {
          // Let a flick keep rolling and settle; with no choice made yet the globe idles slowly.
          if (Math.abs(velY) > .01 || Math.abs(velX) > .01) {
            desired += velY * dt; desiredTilt = Math.max(-1.2, Math.min(1.2, desiredTilt + velX * dt));
            const decay = Math.exp(-dt * 3.4); velY *= decay; velX *= decay;
          } else if (!selected) desired += .05 * dt;
          clouds.rotation.y += dt * .012;
        }
        const k = 1 - Math.exp(-dt * (dragging ? 16 : 3.2));
        root.rotation.y += (desired - root.rotation.y) * k; root.rotation.x += (desiredTilt - root.rotation.x) * k;
        rings.forEach((ring, i) => ring.scale.setScalar((selected && countries[i].id === selected.id ? 1.2 : 1) + 0.09 * Math.sin(time * 2 + i)));
        if (!reduced) { sailors(time); flyers(time); }
      },
      drag(dx, dy = 0) {
        const now = performance.now(), dt = Math.max(.008, Math.min(.12, (now - lastDragAt) / 1000));
        desired += dx * 0.006; desiredTilt = Math.max(-1.2, Math.min(1.2, desiredTilt + dy * 0.004));
        const vy = Math.max(-4, Math.min(4, dx * 0.006 / dt)), vx = Math.max(-3, Math.min(3, dy * 0.004 / dt));
        velY = dt > .1 ? 0 : velY * .5 + vy * .5; velX = dt > .1 ? 0 : velX * .5 + vx * .5; lastDragAt = now;
      },
      pick(ray) { const hit = ray.intersectObjects(markers)[0]; if (!hit) return null; const earthHit = ray.intersectObject(earth)[0]; return earthHit && earthHit.distance < hit.distance - 0.13 ? null : hit.object.userData.country; }
    };
  }
  return { create, latLon };
})();
