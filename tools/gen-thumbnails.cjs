/* Okuma gerektirmeyen düğmeler için oyunun gerçek 3B yerlerinden resimler üretir.
 * node tools/gen-thumbnails.cjs              -> 30 yer + 10 ülke resmi
 * node tools/gen-thumbnails.cjs --country tr -> yalnız Türkiye
 * PLAYWRIGHT_MODULE / EDGE_EXECUTABLE ile kurulu araç yolları verilebilir.
 * FLASH_THUMBNAIL_OUT alternatif önizleme klasörünü belirtir.
 * Oyun modelleri ayrı, sessiz bir sayfada çizilir; başka oyun dosyası değişmez.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.FLASH_THUMBNAIL_OUT ? path.resolve(process.env.FLASH_THUMBNAIL_OUT) : path.join(ROOT, 'assets', 'ui');
let playwright;
for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright',
  path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(id); break; } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
}
if (!playwright) throw new Error('Playwright bulunamadı. PLAYWRIGHT_MODULE ile kurulu kütüphaneyi belirt.');
const EDGE = process.env.EDGE_EXECUTABLE || [
  path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
  path.join(process.env.ProgramFiles || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe')
].find(file => fs.existsSync(file));
const selectedIndex = process.argv.indexOf('--country');
const selected = selectedIndex >= 0 ? process.argv[selectedIndex + 1] : '';
assert.ok(selectedIndex < 0 || selected, '--country ardından ülke kodu gerekli');

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'flash-feza-thumbnails-'));
  const probe = path.join(temporary, 'render.html');
  fs.writeFileSync(probe, '<!doctype html><html lang="tr"><meta charset="utf-8"><title>Sessiz gezi resimleri</title><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100%;height:100%}</style><canvas id="picture"></canvas></html>');
  fs.mkdirSync(OUT, {recursive: true});
  const browser = await playwright.chromium.launch({headless: true, executablePath: EDGE,
    args: ['--mute-audio', '--allow-file-access-from-files']});
  try {
    const page = await browser.newPage({viewport: {width: 384, height: 384}, deviceScaleFactor: 1});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(pathToFileURL(probe).href + '?sessiz');
    await page.addScriptTag({path: path.join(ROOT, 'vendor/three.js')});
    await page.addScriptTag({path: path.join(ROOT, 'src/countries.js')});
    await page.addScriptTag({path: path.join(ROOT, 'src/places.js')});
    const countries = await page.evaluate(() => FLASH_COUNTRIES.map(country => ({id: country.id,
      sky: '#' + country.sky.toString(16).padStart(6, '0'), places: country.places.map(place => place.id)})));
    assert.ok(!selected || countries.some(country => country.id === selected), 'Bilinmeyen ülke: ' + selected);
    await page.evaluate(() => {
      const T = THREE;
      const renderer = new T.WebGLRenderer({canvas: document.getElementById('picture'), antialias: true, preserveDrawingBuffer: true});
      renderer.setSize(384, 384, false); renderer.setPixelRatio(1);
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      const scene = new T.Scene(), camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.05, 300);
      const hemi = new T.HemisphereLight(0xe9f7ff, 0x877663, 2.2);
      const sun = new T.DirectionalLight(0xffedcf, 3.1); sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = 0.025;
      scene.add(hemi, sun, sun.target);
      const floor = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShadowMaterial({opacity: 0.18}));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
      let model = null, current = null, placed = null, originalPosition = null;
      function restore() {
        if (!placed) return;
        placed.removeFromParent(); placed.position.copy(originalPosition); model.root.add(placed);
        placed = null;
      }
      function loadCountry(id) {
        restore(); if (model) model.dispose();
        current = FLASH_COUNTRIES.find(country => country.id === id);
        model = FLASH_PLACES.create(current, {unbatched: true, thumbnail: true});
        for (const place of current.places) {
          const group = model.root.getObjectByName(place.id); let meshes = 0;
          if (group) group.traverse(object => { if (object.isMesh) meshes++; });
          if (!meshes) throw new Error('Resim için ayrı yer modeli gerekli: ' + id + '/' + place.id);
        }
        scene.background = new T.Color(current.sky);
      }
      function renderPlace(id) {
        restore(); placed = model.root.getObjectByName(id); originalPosition = placed.position.clone();
        placed.removeFromParent(); placed.position.set(0, 0, 0); scene.add(placed);
        scene.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(placed), center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
        const distance = Math.max(size.length() * 1.7, 16);
        camera.position.copy(center).addScaledVector(new T.Vector3(1, 0.74, 1.6).normalize(), distance);
        camera.lookAt(center); camera.updateMatrixWorld(true);
        let extent = 0;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const point = new T.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
        }
        extent = Math.max(1, extent) * 1.12;
        Object.assign(camera, {left: -extent, right: extent, top: extent, bottom: -extent, near: 0.05, far: distance + size.length() * 3 + 40});
        camera.updateProjectionMatrix();
        const width = Math.max(size.x, size.z, 4) * 2;
        floor.position.set(center.x, box.min.y - 0.025, center.z); floor.scale.set(width, width, 1);
        sun.position.copy(center).add(new T.Vector3(-distance * 0.5, distance, distance * 0.6));
        sun.target.position.copy(center); sun.target.updateMatrixWorld();
        Object.assign(sun.shadow.camera, {left: -width, right: width, top: width, bottom: -width, near: 1, far: distance * 4 + 60});
        sun.shadow.camera.updateProjectionMatrix();
        renderer.compile(scene, camera); renderer.render(scene, camera);
      }
      window.THUMBNAILS = {loadCountry, renderPlace, close() {
        restore(); if (model) model.dispose(); floor.geometry.dispose(); floor.material.dispose(); renderer.dispose();
      }};
    });
    let count = 0;
    const collage = await browser.newPage({viewport: {width: 256, height: 256}, deviceScaleFactor: 1});
    await collage.goto(pathToFileURL(probe).href + '?sessiz');
    for (const country of countries.filter(country => !selected || country.id === selected)) {
      await page.evaluate(id => THUMBNAILS.loadCountry(id), country.id);
      const images = [];
      for (const place of country.places) {
        await page.evaluate(id => THUMBNAILS.renderPlace(id), place);
        const filename = path.join(OUT, 'place-' + country.id + '-' + place + '.png');
        const pixels = await page.screenshot({path: filename});
        assert.ok(pixels.length > 1000, 'Boş gezi resmi: ' + filename);
        images.push('data:image/png;base64,' + pixels.toString('base64')); count++;
      }
      await collage.setContent('<!doctype html><html lang="tr"><meta charset="utf-8"><style>html,body{margin:0;width:256px;height:256px;overflow:hidden;background:' + country.sky + '}img{position:absolute;display:block;object-fit:contain}.main{inset:0;width:256px;height:256px}.small{bottom:5px;width:94px;height:94px;border:3px solid #fff7e6;border-radius:22px;box-shadow:0 3px 9px #0b203526}.left{left:5px}.right{right:5px}</style><img class="main" src="' + images[0] + '"><img class="small left" src="' + images[1] + '"><img class="small right" src="' + images[2] + '"></html>');
      await collage.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
      await collage.screenshot({path: path.join(OUT, 'country-' + country.id + '.png')}); count++;
      console.log(country.id + ': 3 yer ve ülke resmi hazır.');
    }
    await page.evaluate(() => THUMBNAILS.close());
    assert.deepEqual(errors, [], 'Resimleri üretirken çizim hatası olmamalı');
    console.log(count + ' resim üretildi: ' + OUT);
  } finally {
    await browser.close();
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('flash-feza-thumbnails-'));
    fs.rmSync(temporary, {recursive: true, force: true});
  }
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
