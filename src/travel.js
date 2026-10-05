/* Gerçek kara/deniz rotasının neşeli, sadeleştirilmiş manzarası.
 * Ağaçlar, köyler, yel değirmenleri ve tepeler dekoratif; yükseklik/bitki örtüsü verisi değildir.
 * Her şey kurulumda bir kez yapılır; her karede yalnızca küçük örnek (instance) matrisleri güncellenir. */
'use strict';
window.FLASH_TRAVEL=(()=>{
  function create(samples,from,to){
    const root=new THREE.Group(),length=900,sections=100,step=length/sections;
    const shared=[],groups=new Map(),anim=[];
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors={sea:0x49bbd4,sea2:0x8ae0ee,grass:0x9bdb78,grass2:0x8fd36e,flower1:0xff9fc4,flower2:0xffe36a,flower3:0xffffff,rock:0xb7b2a6,desert:0xefcf8b,sand2:0xe3b96d,snow:0xe5f5ef,path:0xf3ddb0,wood:0x9b704b,leaf:0x50aa65,leaf2:0x73c75e,pine:0x2f8a5c,roof:0xea7864,wall:0xffedc7,cloud:0xffffff,cloud2:0xf1f8ff,foam:0xcaf8ff,hill:0x73be77,white:0xfaf6ee,red:0xe8545c,teal:0x3fc4c0,gold:0xffcf55,blue:0x4a8fe0,whale:0x4f7fa8,sail:0xffffff,glint:0xffffff,shadow:0x5d7f9d};
    function material(key){if(!groups.has(key))groups.set(key,{mat:new THREE.MeshStandardMaterial({color:colors[key],roughness:key==='sea'?.22:key==='glint'||key==='sail'?.5:1,metalness:0,emissive:key==='glint'?0xffffff:0,emissiveIntensity:key==='glint'?.6:0}),items:[]});return groups.get(key);}
    const box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,7),sphere=new THREE.SphereGeometry(1,10,6),pyramid=new THREE.ConeGeometry(1,1,4),cyl=new THREE.CylinderGeometry(1,1,1,10),flat=new THREE.ConeGeometry(1,1,3),bud=new THREE.SphereGeometry(1,6,4);
    shared.push(box,cone,sphere,pyramid,cyl,flat,bud);
    function item(key,geo,x,y,z,sx,sy,sz,ry=0){material(key).items.push({geo,x,y,z,sx,sy,sz,ry});}
    function at(p,out=new THREE.Vector3()){return out.set(Math.sin(p*Math.PI*3)*7+Math.sin(p*Math.PI*7)*2,.08,20-p*length);}
    function sample(p){return samples[Math.min(samples.length-1,Math.max(0,Math.round(p*(samples.length-1))))];}
    let seed=54891;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function biome(s){return !s.land?'sea':Math.abs(s.lat)>57?'snow':s.country==='eg'||(s.lat>12&&s.lat<31&&s.lon>-17&&s.lon<55)?'desert':'grass';}
    // Animated pools: [mesh data] rebuilt each frame only when the runner is near them.
    const glints=[],boats=[],whales=[],birds=[],blades=[];
    function village(pos,side,z,j){const hx=pos.x+side*(12+j*5),hz=z+rand()*8;item('wall',box,hx,1.4,hz,3,2.8,3.4);item(j%2?'roof':'red',cone,hx,3.4,hz,2.6,1.9,2.6,Math.PI/4);item('wood',box,hx,.85,hz+1.74,.7,1.6,.05);item('gold',box,hx+1.1,1.9,hz+1.74,.5,.5,.05);}
    function windmill(x,z){item('wall',cone,x,3.4,z,2.4,7,2.4);item('roof',cone,x,7.6,z,2.9,2.2,2.9);item('wood',box,x,2.0,z+1.2,.8,1.8,.05);item('gold',bud,x,6.6,z+1.6,.5,.5,.5);blades.push({x,y:6.6,z:z+1.75,phase:rand()*6});}
    function lighthouse(x,z){item('white',cyl,x,4.5,z,1.5,9,1.5);for(let k=0;k<3;k++)item('red',cyl,x,1.5+k*3,z,1.56,1.4,1.56);item('gold',sphere,x,9.6,z,1.3,1,1.3);item('red',cone,x,10.8,z,1.7,1.5,1.7);item('wood',box,x,.5,z,3.4,1,3.4);}
    function pyramids(x,z){item('sand2',pyramid,x,3.5,z,5,7,5,Math.PI/4);item('sand2',pyramid,x+7.5,2.4,z+3,3.4,4.8,3.4,Math.PI/4+.1);item('sand2',pyramid,x-6,1.8,z+5,2.6,3.6,2.6,Math.PI/4-.1);}
    function palm(x,z){item('wood',box,x,2,z,.4,4,.4);for(let k=0;k<4;k++)item('leaf2',sphere,x+Math.cos(k*1.57)*1.1,4.2,z+Math.sin(k*1.57)*1.1,1.4,.3,.6,k*1.57);}
    function igloo(x,z){item('snow',sphere,x,.5,z,3.4,2.8,3.4);item('shadow',box,x,.8,z+2.7,1,1.4,.5);item('white',sphere,x,2.8,z,1,.5,1);}
    function pine(x,z,s=1){item('wood',box,x,.8*s,z,.5*s,1.6*s,.5*s);item('pine',cone,x,2.6*s,z,2.1*s,3.2*s,2.1*s);item('pine',cone,x,4.4*s,z,1.6*s,2.8*s,1.6*s);item('snow',cone,x,5.6*s,z,.7*s,1.2*s,.7*s);}
    for(let i=0;i<=sections;i++){
      const p=i/sections,s=sample(p),type=biome(s),pos=at(p),previous=i?sample((i-1)/sections):s;
      item(type==='grass'&&((i/3|0)%2)?'grass2':type,box,0,-.28,pos.z,140,.5,step+1);
      if(s.land){
        item('path',box,pos.x,-.005,pos.z,4,.05,step+2);
        for(const side of [-1,1]){
          const x=pos.x+side*(19+rand()*30),z=pos.z+(rand()-.5)*step;
          if(i%3===0){item(type==='snow'?'snow':'hill',sphere,x,-1,z,9+rand()*6,3+rand()*7,8+rand()*7);}
          if(type==='snow'){if(i%2===0)for(let j=0;j<2;j++)pine(pos.x+side*(12+rand()*30),z+rand()*7,.8+rand()*.5);}
          else if(type!=='desert'&&i%2===0){for(let j=0;j<3;j++){const tx=pos.x+side*(12+rand()*32),tz=z+rand()*7;item('wood',box,tx,1.1,tz,.55,2.4,.55);item(j%2?'leaf':'leaf2',cone,tx,3.4,tz,2.1,4.5,2.1);}}
          if(i%11===0){for(let j=0;j<3;j++)village(pos,side,z,j);}
          if(type==='desert'&&i%7===0)item('sand2',cone,x,2,z,6,7,6);
          if(type==='desert'&&i%4===0){item('rock',bud,pos.x+side*(8+rand()*20),.5,z,1.4,.9,1.2);palm(pos.x+side*(14+rand()*24),z);}
          if(type==='grass'){for(let j=0;j<4;j++){const fx=pos.x+side*(4+rand()*14),fz=z+(rand()-.5)*step;item('flower'+(1+(rand()*3|0)),bud,fx,.12,fz,.2,.14,.2);}}
          if(type!=='grass'&&rand()<.3)item('rock',bud,pos.x+side*(7+rand()*18),.45,z,1.3,.9,1.1);
        }
        // Little landmark silhouettes, one in a few sections, never on the running path.
        if(i%13===5&&i<95){const side=i%2?1:-1,lx=pos.x+side*(18+rand()*10),lz=pos.z;if(type==='grass')windmill(lx,lz);else if(type==='desert')pyramids(lx+side*10,lz);else igloo(lx,lz);}
        if(!previous.land)lighthouse(pos.x+22,pos.z);
      }else{
        for(let j=0;j<3;j++)item('foam',box,pos.x+(j-1)*21+rand()*9,.012,pos.z+rand()*7,7+rand()*7,.03,.12);
        for(let j=0;j<2;j++)item('sea2',box,pos.x+(rand()-.5)*100,.01,pos.z+(rand()-.5)*step,10+rand()*12,.03,.28);
        for(let j=0;j<5;j++)glints.push({x:pos.x+(rand()-.5)*110,y:.12,z:pos.z+(rand()-.5)*step,s:.35+rand()*.5,ph:rand()*6.28});
        if(i%6===2){const side=rand()<.5?-1:1;boats.push({x:pos.x+side*(14+rand()*22),z:pos.z,r:rand()*6.28,ph:rand()*6.28});}
        if(i%17===8)whales.push({x:pos.x+(rand()<.5?-1:1)*(18+rand()*18),z:pos.z,ph:rand()*6.28});
      }
      if(i%7===0){const x=(rand()-.5)*95,y=19+rand()*6,z=pos.z;for(let j=0;j<5;j++)item(j%2?'cloud2':'cloud',sphere,x+(j-2)*2.7,y+(j%2)*.8+(j===2?.9:0),z+(j%3-1),3.8-Math.abs(j-2)*.45,1.35,2.2);}
      if(i%10===0&&s.land){const side=i%20?1:-1;item('white',box,pos.x+side*5.5,1.3,pos.z,.35,2.6,.35);item(i%20?'red':'blue',box,pos.x+side*5.5,2.5,pos.z+.5,.06,.7,1.1);}
      if(previous.land!==s.land)item('foam',box,0,.03,pos.z+step/2,140,.04,.65);
    }
    // Journey start and finish: a flag post at the beginning, a welcome gate with a little globe at the end.
    const endPos=at(1),startPos=at(0);
    for(const side of [-1,1]){item('teal',box,endPos.x+side*7,5,endPos.z-8,1.1,10,1.1);item('gold',sphere,endPos.x+side*7,10.4,endPos.z-8,.9,.9,.9);item('gold',box,startPos.x+side*6,2,startPos.z+6,.25,4,.25);item(side<0?'red':'teal',box,startPos.x+side*6,3.5,startPos.z+6.1,.05,.9,1.4);}
    item('gold',box,endPos.x,9.8,endPos.z-8,14,1,1.1);item('blue',sphere,endPos.x,12.3,endPos.z-8,2,2,2);item('teal',box,endPos.x,9.8,endPos.z-8,14,.35,1.3);
    // Merge every repeated part per material and geometry: long journeys stay cheap to draw.
    const dummy=new THREE.Object3D();
    for(const group of groups.values()){
      const byGeo=new Map();for(const a of group.items){if(!byGeo.has(a.geo))byGeo.set(a.geo,[]);byGeo.get(a.geo).push(a);}
      for(const [geo,list]of byGeo){const mesh=new THREE.InstancedMesh(geo,group.mat,list.length);list.forEach((a,i)=>{dummy.position.set(a.x,a.y,a.z);dummy.rotation.set(0,a.ry,0);dummy.scale.set(a.sx,a.sy,a.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);}
    }
    // Animated pools (small, updated only near the runner): glints, boats, whales, birds, windmill blades.
    function pool(key,geo,count,castShadow=false){const mesh=new THREE.InstancedMesh(geo,material(key).mat,Math.max(1,count));mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=castShadow;mesh.count=count;dummy.scale.setScalar(0);dummy.updateMatrix();for(let i=0;i<count;i++)mesh.setMatrixAt(i,dummy.matrix);root.add(mesh);return mesh;}
    const glintMesh=pool('glint',box,glints.length),hullMesh=pool('red',box,boats.length,true),sailMesh=pool('sail',flat,boats.length,true),mastMesh=pool('wood',box,boats.length),whaleMesh=pool('whale',sphere,whales.length*2),bladeMesh=pool('wood',box,blades.length*2),birdMesh=pool('white',flat,9);
    const NEAR_BEHIND=40,NEAR_AHEAD=170;
    const heroAt=new THREE.Vector3();
    function put(mesh,i,x,y,z,sx,sy,sz,rx,ry,rz){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    const wake=new THREE.Mesh(new THREE.PlaneGeometry(1.4,5),new THREE.MeshBasicMaterial({color:0xeaffff,transparent:true,opacity:.58,depthWrite:false}));wake.rotation.x=-Math.PI/2;root.add(wake);
    // Soft sun glow on the water, a thin additive streak that follows the runner (one plane, no texture).
    const sunGlint=new THREE.Mesh(new THREE.PlaneGeometry(10,70),new THREE.MeshBasicMaterial({color:0xfff2c4,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));sunGlint.rotation.x=-Math.PI/2;sunGlint.position.y=.05;root.add(sunGlint);
    function animate(time,p,pos){
      const hz=pos.z,tt=reduced?0:time;
      for(let i=0;i<glints.length;i++){const g=glints[i],near=g.z<hz+NEAR_BEHIND&&g.z>hz-NEAR_AHEAD,k=near?Math.max(0,Math.sin(tt*3.2+g.ph))*(reduced?0:1)+(reduced?.4:0):0;put(glintMesh,i,g.x,g.y,g.z,g.s*k*1.4,.03,g.s*k*.5,0,g.ph,0);}
      glintMesh.instanceMatrix.needsUpdate=true;
      for(let i=0;i<boats.length;i++){const b=boats[i],near=b.z<hz+NEAR_BEHIND&&b.z>hz-NEAR_AHEAD,sc=near?1:0,bob=Math.sin(tt*1.6+b.ph)*.12,roll=Math.sin(tt*1.3+b.ph)*.06;
        put(hullMesh,i,b.x,.25+bob,b.z,3.4*sc,.7*sc,1.5*sc,0,b.r,roll);put(sailMesh,i,b.x,2.3+bob,b.z,1.5*sc,3*sc,.12*sc,0,b.r+Math.PI/2,roll);put(mastMesh,i,b.x,1.9+bob,b.z,.12*sc,3.4*sc,.12*sc,0,0,roll);}
      hullMesh.instanceMatrix.needsUpdate=sailMesh.instanceMatrix.needsUpdate=mastMesh.instanceMatrix.needsUpdate=true;
      for(let i=0;i<whales.length;i++){const w=whales[i],near=w.z<hz+NEAR_BEHIND&&w.z>hz-NEAR_AHEAD,sc=near?1:0,u=Math.sin(tt*.9+w.ph),rise=Math.max(0,u);
        put(whaleMesh,i*2,w.x,-.2+rise*.9,w.z,2.6*sc,1.4*sc,4.8*sc,-rise*.3,0,0);put(whaleMesh,i*2+1,w.x,-.3+rise*1.6,w.z+5.4*sc,.4*sc,1.1*sc*(rise>.1?1:0),1.2*sc,0,0,0);}
      whaleMesh.instanceMatrix.needsUpdate=true;
      for(let i=0;i<blades.length;i++){const b=blades[i],near=b.z<hz+NEAR_BEHIND&&b.z>hz-NEAR_AHEAD,sc=near?1:0,a=tt*1.3+b.phase;for(let k=0;k<2;k++)put(bladeMesh,i*2+k,b.x,b.y,b.z,.45*sc,11*sc,.12*sc,0,0,a+k*Math.PI/2);}
      bladeMesh.instanceMatrix.needsUpdate=true;
      // A little flock escorts the runner, flapping.
      for(let i=0;i<9;i++){const ox=(i%3-1)*7+(i>>1&1)*2.5,oz=-22-(i/3|0)*8-(i%2)*3,flap=Math.sin(tt*9+i*1.4);
        put(birdMesh,i,pos.x+ox+Math.sin(tt*.8+i)*2,9+Math.sin(tt*1.3+i*2)*1.2+(i%3),hz+oz,.75,.12+Math.abs(flap)*.22,1.1,-Math.PI/2+flap*.5,0,Math.PI);}
      birdMesh.instanceMatrix.needsUpdate=true;
    }
    animate(0,0,at(0));
    const camOffset=new THREE.Vector3();
    return {root,length,positionAt:at,sample,
      // Optional gentle camera sway; the app may call it after it has posed the camera.
      sway(camera,time){if(reduced||!camera)return;camera.position.x+=Math.sin(time*.7)*.45;camera.position.y+=Math.sin(time*.9+1)*.28;camera.rotation.z+=Math.sin(time*.55)*.012;},
      update(dt,time,p){const pos=at(p),land=sample(p).land;wake.visible=!land;wake.position.set(pos.x,.06,pos.z+3);wake.material.opacity=.45+(reduced?0:Math.sin(time*13)*.13);
        sunGlint.visible=!land;sunGlint.position.set(pos.x+7,.05,pos.z-24);
        animate(time,p,pos);},
      dispose(){root.removeFromParent();const mats=new Set();root.traverse(m=>{if(m.material)mats.add(m.material);if(m.isInstancedMesh)m.dispose();});mats.forEach(m=>m.dispose());shared.forEach(g=>g.dispose());wake.geometry.dispose();sunGlint.geometry.dispose();}};
  }
  return {create};
})();
