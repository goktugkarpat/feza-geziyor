/* Three.js r170, Feza Huysuzlara Karşı ile aynı yerel çizim motoru. */
'use strict';
window.FLASH_CORE = (() => {
  const query = new URLSearchParams(location.search);
  const canvas = document.getElementById('game');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
  catch (e) { document.getElementById('boot').innerHTML='<h1>Oyun alanı açılamadı</h1><p>Tarayıcıyı güncelleyip yeniden dene.</p>'; throw e; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9e9f1);
  const camera = new THREE.PerspectiveCamera(43,innerWidth/innerHeight,0.1,250);
  const hemi = new THREE.HemisphereLight(0xe9f7ff,0x695844,1.6);
  const sun = new THREE.DirectionalLight(0xffecd5,2.7);
  sun.position.set(-18,30,16); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:100});
  sun.shadow.normalBias=0.045; sun.shadow.bias=-0.0003;
  scene.add(hemi,sun,sun.target);
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const touch = navigator.maxTouchPoints>1;
  const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (touch && /Mac/i.test(navigator.platform));
  let quality = 'auto', lost=false;
  // Stable profiles: the iPad never changes resolution while Feza is running.
  function profile() {
    return { mobile: touch, appleMobile, pixelRatioCap:quality==='high'?1.6:quality==='low'||touch?1:/Mac/i.test(navigator.platform)?1.2:1.5,
      shadowSize:quality==='low'?0:quality==='high'?1024:touch?512:1024 };
  }
  function shadowQuality() {
    const size=profile().shadowSize;
    renderer.shadowMap.enabled=size>0;
    if(size===0 || sun.shadow.mapSize.x!==size){
      if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
      if(sun.shadow.mapPass){sun.shadow.mapPass.dispose();sun.shadow.mapPass=null;}
      if(size>0)sun.shadow.mapSize.set(size,size);sun.shadow.needsUpdate=true;
    }
  }
  function resize() {
    const maxDpr=profile().pixelRatioCap;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,maxDpr));
    renderer.setSize(innerWidth,innerHeight,false);
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  }
  function point(x,y,out) {
    pointer.set(x/innerWidth*2-1,1-y/innerHeight*2); ray.setFromCamera(pointer,camera);
    return ray.ray.intersectPlane(groundPlane,out);
  }
  function setSky(color) {scene.background.set(color); scene.fog=new THREE.Fog(color,44,112);}
  function shadowsAt(x,z) {sun.position.set(x-18,30,z+16); sun.target.position.set(x,0,z);sun.target.updateMatrixWorld();}
  function dispose(root) {
    const geos=new Set(),mats=new Set(),tex=new Set();
    root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geos.add(o.geometry); for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]) {mats.add(m); for(const k of ['map','normalMap','roughnessMap'])if(m[k])tex.add(m[k]);}});
    root.removeFromParent();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;document.getElementById('context-note').hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();document.getElementById('context-note').hidden=true;});
  addEventListener('resize',resize); shadowQuality();resize();
  return {renderer,scene,camera,canvas,ray,query,touch,point,setSky,shadowsAt,dispose,resize,sun,
    setQuality(value){quality=['auto','low','high'].includes(value)?value:'auto';shadowQuality();resize();}, get profile(){return profile();}, get lost(){return lost;}, get quality(){return quality;}};
})();
