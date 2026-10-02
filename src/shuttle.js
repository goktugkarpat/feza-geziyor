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
      add('red', sphere(s * 3.40, .86, -1.51, .10, .05, .10));
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
    add('red', sphere(0, 2.86, -.85, .095, .095, .095));
    add('white', placed(new THREE.CylinderGeometry(.23, .23, .024, 24), 0, .76, 2.57, 1, 1, 1, Math.PI / 2));
    const badge = new THREE.Shape();
    badge.moveTo(.08, .18); badge.lineTo(-.11, -.015); badge.lineTo(-.02, -.015);
    badge.lineTo(-.08, -.18); badge.lineTo(.14, .055); badge.lineTo(.03, .055); badge.closePath();
    add('gold', placed(new THREE.ExtrudeGeometry(badge, { depth: .018, bevelEnabled: false }), 0, .76, 2.59));
    const materials = {
      white: new THREE.MeshStandardMaterial({ color: 0xfffcf3, roughness: .42, metalness: .08 }),
      teal: new THREE.MeshStandardMaterial({ color: 0x35bbc5, roughness: .43, metalness: .07 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffcc54, roughness: .36, metalness: .23 }),
      red: new THREE.MeshStandardMaterial({ color: 0xf26069, roughness: .47 }),
      cabin: new THREE.MeshStandardMaterial({ color: 0x285168, roughness: .78 }),
      light: new THREE.MeshBasicMaterial({ color: 0xb6ffdf }),
      glow: new THREE.MeshBasicMaterial({ color: 0x9cefff })
    };
    const geometries = [], meshes = {};
    Object.entries(batches).forEach(([key, parts]) => {
      const g = join(parts), mesh = new THREE.Mesh(g, materials[key]);
      mesh.name = 'Mekik ' + key; mesh.castShadow = !['light', 'glow'].includes(key); mesh.receiveShadow = true;
      root.add(mesh); meshes[key] = mesh; geometries.push(g);
    });
    const windowPosition = V(0, 1.00, 1.28);
    const windowPose = Object.freeze({ position: windowPosition, scale: 1, rotationY: 0 });
    let destroyed = false;
    function update(dt, time = 0, progress = 0) {
      if (destroyed) return;
      // No particle allocation or oscillating root transform: app owns flight.
      const burn = .97 + Math.sin(time * 7) * .025;
      meshes.glow.scale.z = burn;
      meshes.light.material.color.setHex(progress > .94 ? 0xd9ffe3 : 0xb6ffdf);
    }
    function dispose() {
      if (destroyed) return; destroyed = true;
      geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose());
      root.removeFromParent();
    }
    return { root, windowPosition, windowPose, update, dispose };
  }
  window.FLASH_SHUTTLE = Object.freeze({ create });
})();
