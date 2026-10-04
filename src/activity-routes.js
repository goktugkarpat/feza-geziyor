/* Hedefler binaların arkasında veya erişilemeyen bir köşede doğmaz. */
'use strict';
window.FLASH_ACTIVITY_ROUTES=(()=>{
  function layout(country,colliders){
    const size=119,point=i=>({x:i%size-59,z:Math.floor(i/size)-59});
    const free=(x,z,margin)=>Math.abs(x)<58&&Math.abs(z)<58&&!colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+margin);
    const linked=(a,b)=>{for(let t=0;t<=1;t+=.25)if(!free(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,1.05))return false;return true;};
    let start=-1,best=Infinity;
    for(let i=0;i<size*size;i++){const p=point(i),d=Math.hypot(p.x,p.z-25);if(d<best&&free(p.x,p.z,1.05)){best=d;start=i;}}
    const reachable=new Uint8Array(size*size),queue=[];
    if(start>=0){queue.push(start);reachable[start]=1;}
    for(let k=0;k<queue.length;k++){
      const i=queue[k],p=point(i),ix=i%size,iz=Math.floor(i/size);
      for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
        if((!dx&&!dz)||ix+dx<0||ix+dx>=size||iz+dz<0||iz+dz>=size)continue;
        const j=(iz+dz)*size+ix+dx,q=point(j);
        if(reachable[j]||!free(q.x,q.z,1.05)||!linked(p,q))continue;
        reachable[j]=1;queue.push(j);
      }
    }
    const candidates=queue.map(point).filter(p=>free(p.x,p.z,2.1)),result={};
    country.places.forEach(place=>{
      const targets=[];
      // A wide playful arc on the camera-facing side leaves the landmark visible.
      for(const angle of [0,-.52,.52,-1.02,1.02]){
        const radius=place.radius+3.5,ideal={x:place.x+Math.sin(angle)*radius,z:place.z+Math.cos(angle)*radius};
        let target=null,score=Infinity;
        candidates.forEach(p=>{
          if(targets.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<4.2))return;
          const d=Math.hypot(p.x-ideal.x,p.z-ideal.z)+Math.max(0,Math.hypot(p.x-place.x,p.z-place.z)-radius-5)*2;
          if(d<score){score=d;target=p;}
        });
        if(target)targets.push({x:target.x,z:target.z});
      }
      result[place.id]=targets;
    });
    return result;
  }
  return Object.freeze({layout});
})();
