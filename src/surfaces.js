(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Gezi zeminleri için grafik motoru yüklenemedi.');
  window.FLASH_SURFACES = { create:create };

  function random(seed) {
    return function () { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  }
  function seedFor(id) { var seed=91431; for(var i=0;i<id.length;i++)seed=Math.imul(seed^id.charCodeAt(i),16777619); return seed>>>0; }
  function rgb(hex) { return [(hex>>16)&255,(hex>>8)&255,hex&255]; }
  function shade(base, light, alpha) {
    var c=base.map(function(v){return Math.round(v+(light<0?v:255-v)*light);});
    return alpha===undefined?'rgb('+c.join(',')+')':'rgba('+c.join(',')+','+alpha+')';
  }
  function canvas(size) { var c=document.createElement('canvas');c.width=c.height=size;return c; }

  function groundCanvas(environment, seed) {
    var cv=canvas(1024),g=cv.getContext('2d'),r=random(seed),base=rgb(environment.groundTint),kind=environment.ground;
    g.fillStyle=shade(base,0);g.fillRect(0,0,1024,1024);
    // Large, soft clumps vary the colour before individual blades / grains.
    for(var i=0;i<170;i++){
      var x=r()*1024,y=r()*1024,rad=30+r()*130,light=(r()-.46)*(kind==='grass'?.23:.10);
      for(var ox=-1024;ox<=1024;ox+=1024)for(var oy=-1024;oy<=1024;oy+=1024){
        if(x+ox+rad<0||x+ox-rad>1024||y+oy+rad<0||y+oy-rad>1024)continue;
        var grad=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,rad);grad.addColorStop(0,shade(base,light,.7));grad.addColorStop(1,shade(base,light,0));g.fillStyle=grad;g.fillRect(x+ox-rad,y+oy-rad,rad*2,rad*2);
      }
    }
    if(kind==='grass'){
      g.lineCap='round';
      for(var blade=0;blade<22000;blade++){
        var bx=r()*1024,by=r()*1024,h=3+r()*12,bend=(r()-.5)*5;
        g.strokeStyle=shade(base,(r()-.36)*.39,.72);g.lineWidth=.6+r()*.9;
        g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+bend*.4,by-h*.55,bx+bend,by-h);g.stroke();
        if(by<h){g.beginPath();g.moveTo(bx,by+1024);g.quadraticCurveTo(bx+bend*.4,by+1024-h*.55,bx+bend,by+1024-h);g.stroke();}
      }
      // A few old leaves, moss flecks and flower tips stay part of one map.
      for(var fleck=0;fleck<900;fleck++){g.fillStyle=fleck%7===0?'rgba(249,222,135,.42)':shade(base,-.22,.45);g.fillRect(r()*1024,r()*1024,1+r()*2,1+r()*3);}
    }else if(kind==='snow'){
      // Smooth wind drifts and ice crystals; the snow remains white, not green.
      for(var drift=0;drift<65;drift++){
        var sx=r()*1024,sy=r()*1024,rx=35+r()*95,ry=10+r()*26;
        g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(sx,sy,rx,ry,-.28,0,Math.PI*2);g.fill();
        g.strokeStyle='rgba(158,183,206,.15)';g.lineWidth=1.5;g.beginPath();g.ellipse(sx,sy+2,rx,ry,-.28,.1,Math.PI);g.stroke();
      }
      for(var ice=0;ice<23000;ice++){g.fillStyle=ice%3?'rgba(255,255,255,.66)':'rgba(155,190,214,.26)';g.fillRect(r()*1024,r()*1024,.7+r()*1.6,.7+r()*1.2);}
    }else{
      // Shallow, periodic wind ripples: the edge of the tile joins itself.
      for(var ripple=-2;ripple<46;ripple++){
        var row=ripple*24;g.lineWidth=1.4;g.strokeStyle='rgba(124,88,40,.11)';g.beginPath();
        for(var px=0;px<=1024;px+=8){var py=row+8*Math.sin(px*Math.PI*4/1024)+3*Math.sin(px*Math.PI*8/1024);if(px===0)g.moveTo(px,py);else g.lineTo(px,py);}g.stroke();
        g.strokeStyle='rgba(255,246,214,.26)';g.beginPath();for(var qx=0;qx<=1024;qx+=8){var qy=row-2+8*Math.sin(qx*Math.PI*4/1024)+3*Math.sin(qx*Math.PI*8/1024);if(qx===0)g.moveTo(qx,qy);else g.lineTo(qx,qy);}g.stroke();
      }
      for(var grain=0;grain<27000;grain++){g.fillStyle=grain%3?'rgba(255,246,208,.35)':'rgba(128,89,43,.24)';g.fillRect(r()*1024,r()*1024,.6+r()*1.2,.6+r()*1.2);}
    }
    return cv;
  }

  function bumpCanvas(source) {
    var cv=canvas(512),g=cv.getContext('2d');g.drawImage(source,0,0,512,512);
    var pixels=g.getImageData(0,0,512,512),d=pixels.data;
    for(var i=0;i<d.length;i+=4){var value=Math.round(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722);d[i]=d[i+1]=d[i+2]=value;}
    g.putImageData(pixels,0,0);return cv;
  }
  function pathCanvas(environment, seed) {
    var cv=canvas(256),g=cv.getContext('2d'),r=random(seed^713);
    if(environment.path==='sand'){
      g.fillStyle='#cfac6c';g.fillRect(0,0,256,256);for(var i=0;i<2300;i++){g.fillStyle=i%2?'rgba(248,224,169,.25)':'rgba(133,102,49,.12)';g.fillRect(r()*256,r()*256,1+r()*2,1+r()*3);}
      for(var stripe=0;stripe<5;stripe++){g.strokeStyle='rgba(246,216,158,.22)';g.lineWidth=3;g.beginPath();g.moveTo(35+stripe*45,0);g.lineTo(30+stripe*45,256);g.stroke();}
    }else{
      var snowy=environment.path==='cleared';g.fillStyle=snowy?'#9eacb5':'#b7ae9a';g.fillRect(0,0,256,256);
      for(var row=0;row<8;row++)for(var col=-1;col<8;col++){
        var x=col*36+(row%2)*18,y=row*33;g.fillStyle=snowy?(row+col)%3?'#c9d2d7':'#dde4e7':(row+col)%3?'#dcd3bf':'#ece0c9';g.fillRect(x+2,y+2,32,29);
        g.fillStyle=snowy?'rgba(242,249,255,.45)':'rgba(255,255,242,.20)';g.fillRect(x+3,y+3,30,1);
      }
      for(var speck=0;speck<1600;speck++){g.fillStyle='rgba(90,86,76,.12)';g.fillRect(r()*256,r()*256,1,1);}
      if(snowy){var edge=g.createLinearGradient(0,0,256,0);edge.addColorStop(0,'rgba(243,249,255,.8)');edge.addColorStop(.13,'rgba(243,249,255,0)');edge.addColorStop(.87,'rgba(243,249,255,0)');edge.addColorStop(1,'rgba(243,249,255,.8)');g.fillStyle=edge;g.fillRect(0,0,256,256);}
    }
    return cv;
  }
  function texture(image, repeatX, repeatY, color, anisotropy) {
    var tex=new T.CanvasTexture(image);if(color)tex.colorSpace=T.SRGBColorSpace;
    tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeatX,repeatY);tex.anisotropy=anisotropy;return tex;
  }

  function mergeGeometries(parts) {
    var positions=[],normals=[],uvs=[];
    parts.forEach(function(part){var g=part.index?part.toNonIndexed():part;positions.push.apply(positions,g.attributes.position.array);normals.push.apply(normals,g.attributes.normal.array);uvs.push.apply(uvs,g.attributes.uv.array);if(g!==part)g.dispose();part.dispose();});
    var result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));result.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));return result;
  }
  function sidesGeometry(environment) {
    var pos=[],normals=[],colors=[],heights=[-.05,-.22,-.76,-1.65],corners=[[-36,-36],[36,-36],[36,36],[-36,36]],snow=environment.ground==='snow',sand=environment.ground==='sand';
    var shades=snow?[0xe7eff5,0x928570,0x726650]:sand?[0xd1ad6b,0xb79159,0x98784c]:[0x657f43,0x9b7953,0x796046];
    for(var side=0;side<4;side++)for(var layer=0;layer<3;layer++){
      var a=corners[side],b=corners[(side+1)%4],color=new T.Color(shades[layer]),normal=[0,0,0];normal[side%2?0:2]=side<2?-1:1;if(side===1)normal[0]=1;if(side===3)normal[0]=-1;
      var verts=[[a[0],heights[layer],a[1]],[b[0],heights[layer],b[1]],[a[0],heights[layer+1],a[1]],[b[0],heights[layer],b[1]],[b[0],heights[layer+1],b[1]],[a[0],heights[layer+1],a[1]]];
      verts.forEach(function(v){pos.push.apply(pos,v);normals.push.apply(normals,normal);colors.push(color.r,color.g,color.b);});
    }
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
  }
  function distanceToPath(x,z,place) {
    var ax=0,az=23,dx=place.x-ax,dz=place.z-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-ax-dx*t,z-az-dz*t);
  }
  function grassTufts(country,environment,seed) {
    var r=random(seed^317),pos=[],uv=[];
    // Fine, leaning blades rather than large triangular cones. Five tiny
    // opaque leaves share one geometry and one instanced drawing batch.
    for(var blade=0;blade<5;blade++){var angle=blade*2.39996,dx=Math.cos(angle)*.014,dz=Math.sin(angle)*.014,lean=Math.sin(blade*3.1)*.034,height=.115+(blade%3)*.017;pos.push(-dx,0,-dz,dx,0,dz,dx*.4+Math.cos(angle+.8)*lean,height,dz*.4+Math.sin(angle+.8)*lean);uv.push(0,0,1,0,.6,1);}
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
    var mat=new T.MeshStandardMaterial({color:0xffffff,roughness:.95,side:T.DoubleSide}),mesh=new T.InstancedMesh(geo,mat,1700),dummy=new T.Object3D(),tint=new T.Color(environment.groundTint),color=new T.Color(),count=0;
    for(var attempt=0;attempt<7000&&count<1700;attempt++){
      var x=(r()-.5)*70,z=(r()-.5)*70;if(Math.hypot(x,z-25)<4||country.places.some(function(p){return Math.hypot(x-p.x,z-p.z)<(p.radius||6)+1||distanceToPath(x,z,p)<2;}))continue;
      dummy.position.set(x,-.047,z);dummy.rotation.y=r()*Math.PI*2;dummy.scale.setScalar(.6+r()*.9);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);color.copy(tint).multiplyScalar(.78+r()*.4);mesh.setColorAt(count,color);count++;
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.name='nabızsız küçük çim tutamları';mesh.receiveShadow=false;mesh.castShadow=false;mesh.computeBoundingSphere();return mesh;
  }

  function create(country,renderer) {
    var environment=Object.assign({ground:'grass',weather:'clear',season:'ilkbahar',groundTint:0x8fb073,path:'paving',moisture:0,waterColor:0x54afbe},country.environment||{}),root=new T.Group(),disposed=false;
    root.name='zemin-'+country.id;var seed=seedFor(country.id),anisotropy=renderer?Math.min(4,renderer.capabilities.getMaxAnisotropy()):1;
    var source=groundCanvas(environment,seed),repeat=environment.ground==='grass'?10:8,groundMap=texture(source,repeat,repeat,true,anisotropy),bumpMap=texture(bumpCanvas(source),repeat,repeat,false,anisotropy),pavingMap=texture(pathCanvas(environment,seed),1,12,true,anisotropy);
    var roughness=environment.ground==='snow'?.88:environment.ground==='sand'?.98:.96-environment.moisture*.20;
    var material=new T.MeshStandardMaterial({color:0xffffff,map:groundMap,bumpMap:bumpMap,bumpScale:environment.ground==='snow'?.09:environment.ground==='sand'?.045:.055,roughness:roughness});
    var top=new T.Mesh(new T.PlaneGeometry(72,72),material);top.rotation.x=-Math.PI/2;top.position.y=-.05;top.receiveShadow=true;top.name='yürüme yüzeyi';root.add(top);
    var sides=new T.Mesh(sidesGeometry(environment),new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1}));sides.name='toprak katmanları';root.add(sides);
    var water=new T.Mesh(new T.PlaneGeometry(210,210),new T.MeshStandardMaterial({color:environment.waterColor,roughness:.5}));water.rotation.x=-Math.PI/2;water.position.y=-1.5;water.name='dış su yüzeyi';root.add(water);
    var pathParts=[];country.places.forEach(function(p){var a=new T.Vector3(0,0,23),b=new T.Vector3(p.x,0,p.z),d=b.clone().sub(a),g=new T.PlaneGeometry(3.2,d.length()),matrix=new T.Matrix4(),q=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,Math.atan2(d.x,d.z)));matrix.compose(a.add(b).multiplyScalar(.5).setY(-.01),q,new T.Vector3(1,1,1));g.applyMatrix4(matrix);pathParts.push(g);});
    var paths=new T.Mesh(mergeGeometries(pathParts),new T.MeshStandardMaterial({color:0xffffff,map:pavingMap,roughness:environment.moisture>.5?.78:.96}));paths.receiveShadow=true;paths.name='üç keşif patikası';root.add(paths);
    if(environment.ground==='grass')root.add(grassTufts(country,environment,seed));
    // Every map and buffer is owned by this one surface stage, including bump.
    function dispose(){if(disposed)return;disposed=true;root.removeFromParent();var geos=new Set(),mats=new Set(),maps=new Set();root.traverse(function(o){if(o.isInstancedMesh)o.dispose();if(o.geometry)geos.add(o.geometry);var list=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];list.forEach(function(m){mats.add(m);['map','bumpMap','normalMap','roughnessMap'].forEach(function(key){if(m[key])maps.add(m[key]);});});});geos.forEach(function(g){g.dispose();});mats.forEach(function(m){m.dispose();});maps.forEach(function(t){t.dispose();});}
    return {root:root,environment:environment,dispose:dispose};
  }
}());
