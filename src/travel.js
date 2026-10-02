/* Gerçek kara/deniz rotasının neşeli, sadeleştirilmiş manzarası.
 * Ağaçlar, köyler ve tepeler dekoratif; yükseklik/bitki örtüsü verisi değildir. */
'use strict';
window.FLASH_TRAVEL=(()=>{
  function create(samples,from,to){
    const root=new THREE.Group(),length=900,sections=100,step=length/sections;
    const shared=[],groups=new Map(),animated=[];
    const colors={sea:0x49bbd4,grass:0x9bdb78,desert:0xefcf8b,snow:0xe5f5ef,path:0xf3ddb0,wood:0x9b704b,leaf:0x50aa65,leaf2:0x73c75e,roof:0xea7864,wall:0xffedc7,cloud:0xffffff,foam:0xcaf8ff,hill:0x73be77};
    function material(key){if(!groups.has(key))groups.set(key,{mat:new THREE.MeshStandardMaterial({color:colors[key],roughness:key==='sea'?.32:1,metalness:key==='sea'?.1:0}),items:[]});return groups.get(key);}
    const box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,7),sphere=new THREE.SphereGeometry(1,10,6);shared.push(box,cone,sphere);
    function item(key,geo,x,y,z,sx,sy,sz,ry=0){material(key).items.push({geo,x,y,z,sx,sy,sz,ry});}
    function at(p,out=new THREE.Vector3()){return out.set(Math.sin(p*Math.PI*3)*7+Math.sin(p*Math.PI*7)*2,.08,20-p*length);}
    function sample(p){return samples[Math.min(samples.length-1,Math.max(0,Math.round(p*(samples.length-1))))];}
    let seed=54891;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function biome(s){return !s.land?'sea':Math.abs(s.lat)>57?'snow':s.country==='eg'||(s.lat>12&&s.lat<31&&s.lon>-17&&s.lon<55)?'desert':'grass';}
    for(let i=0;i<=sections;i++){
      const p=i/sections,s=sample(p),type=biome(s),pos=at(p);
      item(type,box,0,-.28,pos.z,140,.5,step+1);
      if(s.land){
        item('path',box,pos.x,-.005,pos.z,4,.05,step+2);
        // Gentle high ridges remain to the sides, leaving the running path open.
        for(const side of [-1,1]){
          const x=pos.x+side*(19+rand()*30),z=pos.z+(rand()-.5)*step;
          if(i%3===0){item(type==='snow'?'snow':'hill',sphere,x,-1,z,9+rand()*6,3+rand()*7,8+rand()*7);}
          if(type!=='desert'&&i%2===0){for(let j=0;j<3;j++){const tx=pos.x+side*(12+rand()*32),tz=z+rand()*7;item('wood',box,tx,1.1,tz,.55,2.4,.55);item(j%2?'leaf':'leaf2',cone,tx,3.4,tz,2.1,4.5,2.1);}}
          if(i%11===0){for(let j=0;j<3;j++){const hx=pos.x+side*(12+j*5),hz=z+rand()*8;item('wall',box,hx,1.4,hz,3,2.8,3.4);item('roof',cone,hx,3.4,hz,2.6,1.9,2.6,Math.PI/4);item('wood',box,hx,.85,hz+1.74,.7,1.6,.05);}}
          if(type==='desert'&&i%7===0)item('desert',cone,x,2,z,6,7,6);
        }
      }else{
        for(let j=0;j<3;j++)item('foam',box,pos.x+(j-1)*21+rand()*9,.012,pos.z+rand()*7,7+rand()*7,.03,.12);
      }
      if(i%7===0){const x=(rand()-.5)*95,y=19+rand()*6,z=pos.z;for(let j=0;j<3;j++)item('cloud',sphere,x+j*3,y+(j%2),z,4,1.3,2.2);}
      const previous=i?sample((i-1)/sections):s;
      if(previous.land!==s.land)item('foam',box,0,.03,pos.z+step/2,140,.04,.65);
    }
    // Batch every repeated part: long journeys stay inexpensive to draw.
    const dummy=new THREE.Object3D();
    for(const group of groups.values()){
      const byGeo=new Map();for(const a of group.items){if(!byGeo.has(a.geo))byGeo.set(a.geo,[]);byGeo.get(a.geo).push(a);}
      for(const [geo,list]of byGeo){const mesh=new THREE.InstancedMesh(geo,group.mat,list.length);list.forEach((a,i)=>{dummy.position.set(a.x,a.y,a.z);dummy.rotation.set(0,a.ry,0);dummy.scale.set(a.sx,a.sy,a.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);}
    }
    const wake=new THREE.Mesh(new THREE.PlaneGeometry(1.4,5),new THREE.MeshBasicMaterial({color:0xeaffff,transparent:true,opacity:.58,depthWrite:false}));wake.rotation.x=-Math.PI/2;root.add(wake);
    return {root,length,positionAt:at,sample,update(dt,time,p){const pos=at(p);wake.visible=!sample(p).land;wake.position.set(pos.x,.06,pos.z+3);wake.material.opacity=.45+Math.sin(time*13)*.13;},dispose(){root.removeFromParent();const mats=new Set();root.traverse(m=>{if(m.material)mats.add(m.material);if(m.isInstancedMesh)m.dispose();});mats.forEach(m=>m.dispose());shared.forEach(g=>g.dispose());wake.geometry.dispose();}};
  }
  return {create};
})();
