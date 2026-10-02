'use strict';
window.FLASH_GLOBE = (() => {
  // Real Natural Earth 1:50m geometry, locally embedded in geography.js.
  // Colours and ocean shading are illustration, not physical terrain data.
  const G = window.FLASH_GEO;
  if (!G) throw new Error('Dünya haritası verisi yüklenemedi.');
  const palette = ['#a0ce99', '#e9ce91', '#bdcfa4', '#e0b6a1', '#a8d4b9', '#d8c491', '#a2c7b8', '#d5b7ce', '#d6d598', '#acc5df', '#ecbf98', '#b5caa0', '#c7b8d8'];
  const latLon = (lat, lon, r = 4.6) => {
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return new THREE.Vector3(Math.cos(a) * Math.sin(b) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(b) * r);
  };
  function texture() {
    const mobile=window.FLASH_CORE?.profile.mobile || navigator.maxTouchPoints>1;
    const cv = document.createElement('canvas'); cv.width = mobile ? 2048 : 4096; cv.height = cv.width/2;
    const g = cv.getContext('2d');
    const ocean = g.createLinearGradient(0, 0, 0, cv.height);
    ocean.addColorStop(0, '#337fba'); ocean.addColorStop(0.35, '#49a8c1'); ocean.addColorStop(0.65, '#3998b9'); ocean.addColorStop(1, '#256d9d');
    g.fillStyle = ocean; g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = 'rgba(224,250,251,.17)'; g.lineWidth = 1.3;
    for (let lon = -180; lon <= 180; lon += 15) { const x = (lon + 180) / 360 * cv.width; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, cv.height); g.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { const y = (90 - lat) / 180 * cv.height; g.beginPath(); g.moveTo(0, y); g.lineTo(cv.width, y); g.stroke(); }
    for (const country of G.countries) {
      g.beginPath();
      for (const ring of country.rings) {
        const p = ring.points;
        for (let i = 0; i < p.length; i += 2) { const x = (p[i] + 180) / 360 * cv.width, y = (90 - p[i + 1]) / 180 * cv.height; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.closePath();
      }
      g.fillStyle = country.id === 'aq' ? '#f0f5eb' : country.id === 'gl' ? '#d5e9d9' : palette[(country.color - 1) % palette.length];
      g.fill('evenodd'); g.strokeStyle = country.id === 'aq' ? '#dce9df' : 'rgba(59,111,99,.73)'; g.lineWidth = 2.1*cv.width/4096; g.lineJoin = 'round'; g.stroke();
    }
    const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; return map;
  }
  function create(countries) {
    const root = new THREE.Group();
    const earth = new THREE.Mesh(new THREE.SphereGeometry(4.5, 96, 64), new THREE.MeshStandardMaterial({ map: texture(), roughness: 0.94, metalness: 0 }));
    earth.rotation.y = -Math.PI / 2; root.add(earth);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(4.59, 48, 32), new THREE.MeshBasicMaterial({ color: 0x89e6ed, transparent: true, opacity: 0.11, side: THREE.BackSide })); root.add(halo);
    const markers = [], rings = [], markerMaterials = [], ringMaterials = [];
    const markerGeometry = new THREE.SphereGeometry(0.13, 14, 10), ringGeometry = new THREE.TorusGeometry(0.22, 0.028, 6, 28);
    countries.forEach(country => {
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffcb4e }); markerMaterials.push(markerMaterial);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial); marker.position.copy(latLon(country.lat, country.lon, 4.67)); marker.userData.country = country; root.add(marker); markers.push(marker);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xfff8d1 }); ringMaterials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial); ring.position.copy(latLon(country.lat, country.lon, 4.575)); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.position.clone().normalize()); root.add(ring); rings.push(ring);
    });
    const laterGeometry = new THREE.SphereGeometry(0.065, 8, 6), laterMaterial = new THREE.MeshBasicMaterial({ color: 0x709c9e });
    [[-33, 151], [-41, 174], [-34, 18], [20, -100], [22, 79]].forEach(([lat, lon]) => { const marker = new THREE.Mesh(laterGeometry, laterMaterial); marker.position.copy(latLon(lat, lon, 4.57)); root.add(marker); });
    let desired = -0.5, desiredTilt = 0.25, selected = null;
    const wrapped = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    function focus(country, immediate = false) {
      selected = country; const target = -country.lon * Math.PI / 180;
      desired = immediate ? target : root.rotation.y + wrapped(target - root.rotation.y);
      desiredTilt = Math.max(-1.2, Math.min(1.2, country.lat * Math.PI / 180));
      if (immediate) { root.rotation.y = desired; root.rotation.x = desiredTilt; }
      countries.forEach((entry, i) => { const active = entry.id === country.id; markerMaterials[i].color.set(active ? 0xff7840 : 0xffcb4e); ringMaterials[i].color.set(active ? 0xffe9a0 : 0xfff8d1); markers[i].scale.setScalar(active ? 1.2 : 1); });
    }
    return {
      root, markers, latLon, focus,
      update(dt, time) { const k = 1 - Math.exp(-dt * 3); root.rotation.y += (desired - root.rotation.y) * k; root.rotation.x += (desiredTilt - root.rotation.x) * k; rings.forEach((ring, i) => ring.scale.setScalar((selected && countries[i].id === selected.id ? 1.2 : 1) + 0.09 * Math.sin(time * 2 + i))); },
      drag(dx, dy = 0) { desired += dx * 0.006; desiredTilt = Math.max(-1.2, Math.min(1.2, desiredTilt + dy * 0.004)); },
      pick(ray) { const hit = ray.intersectObjects(markers)[0]; if (!hit) return null; const earthHit = ray.intersectObject(earth)[0]; return earthHit && earthHit.distance < hit.distance - 0.13 ? null : hit.object.userData.country; }
    };
  }
  return { create, latLon };
})();
