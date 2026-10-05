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
  renderer.shadowMap.type = THREE.PCFShadowMap; // simpler, cheaper, stable edges
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9e9f1);
  const camera = new THREE.PerspectiveCamera(43,innerWidth/innerHeight,0.1,250);
  const hemi = new THREE.HemisphereLight(0xe9f7ff,0x695844,1.6);
  const sun = new THREE.DirectionalLight(0xffecd5,2.7);
  sun.position.set(-18,30,16); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  // Wide box (covers everything the camera can see, so far trees/landmarks cast from the first frame they are visible),
  // centred AHEAD of Feza; the light sits far back so tall landmarks are never clipped by the near plane.
  const SHADOW_DIST=64, SHADOW_AHEAD=9; let shadowHalf=48, shadowTexel=96/1024;
  Object.assign(sun.shadow.camera,{left:-shadowHalf,right:shadowHalf,top:shadowHalf,bottom:-shadowHalf,near:1,far:150});
  sun.shadow.normalBias=0.06; sun.shadow.bias=-0.0004;
  const LD=new THREE.Vector3(18,-30,-16).normalize(), LR=new THREE.Vector3(0,1,0).cross(LD).normalize().negate(), LU=new THREE.Vector3().crossVectors(LR,LD).normalize();
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
    if(size>0){ // 512 (touch) maps use a slightly tighter box so texels stay small enough
      shadowHalf=size<=512?42:48; const c=sun.shadow.camera; c.left=-shadowHalf;c.right=shadowHalf;c.top=shadowHalf;c.bottom=-shadowHalf;c.updateProjectionMatrix();
      shadowTexel=shadowHalf*2/size;
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
  function shadowsAt(x,z) {
    // aim ahead of Feza (camera looks toward -z), then snap the target to the shadow texel grid so shadows do not swim while walking
    const tx=x, tz=z-SHADOW_AHEAD, t=shadowTexel;
    const r=tx*LR.x+tz*LR.z, u=tx*LU.x+tz*LU.z;
    const dr=Math.round(r/t)*t-r, du=Math.round(u/t)*t-u;
    const ax=tx+LR.x*dr+LU.x*du, ay=LR.y*dr+LU.y*du, az=tz+LR.z*dr+LU.z*du;
    sun.target.position.set(ax,ay,az); sun.position.set(ax-LD.x*SHADOW_DIST,ay-LD.y*SHADOW_DIST,az-LD.z*SHADOW_DIST); sun.target.updateMatrixWorld();
  }
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
