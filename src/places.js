(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Flash gezi sahneleri için grafik motoru yüklenemedi.');
  var UP = new T.Vector3(0, 1, 0);
  var WHITE = 0xf9eed8, STONE = 0xc8b48f, GOLD = 0xf3c35c, WATER = 0x52c8dc;
  // All destinations use the same reflected sky. Retain one tiny cube texture
  // for the game, so Three can reuse its filtered environment between trips.
  // Country-owned textures below are still disposed with their country.
  var sharedEnvironment = null;

  function environment() {
    if(sharedEnvironment)return sharedEnvironment;
    if(typeof document==='undefined')return null;
    var faces=[];for(var face=0;face<6;face++){var cv=document.createElement('canvas');cv.width=cv.height=64;var g=cv.getContext('2d'),d=g.createLinearGradient(0,0,0,64);d.addColorStop(0,'#b5e1ff');d.addColorStop(.47,'#f9fbf1');d.addColorStop(.52,'#91b6ad');d.addColorStop(1,'#496864');g.fillStyle=d;g.fillRect(0,0,64,64);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(12+face*3,7,22,6);faces.push(cv);}
    sharedEnvironment=new T.CubeTexture(faces);sharedEnvironment.colorSpace=T.SRGBColorSpace;sharedEnvironment.needsUpdate=true;return sharedEnvironment;
  }

  window.FLASH_PLACES = { create: create };

  function create(country, options) {
    options = options || {};
    var root = new T.Group();
    root.name = 'gezi-' + country.id;
    var materials = new Map(), geometries = new Map(), textures = new Map(), colliders = [], animated = [];
    var disposed = false;
    var winter = country.environment && country.environment.ground === 'snow';
    var autumn = country.environment && country.environment.season === 'sonbahar';

    function surface(color, type) { return { color: color, surface: type }; }
    function inferSurface(color) {
      if ([WATER,0xa3e1eb,0x9ce5eb].includes(color)) return 'water';
      if ([0x6babc2,0x688294,0x6296b4,0x83c4d4,0x8bc5d6].includes(color)) return 'glass';
      if ([GOLD,0xcad4d5,0x9aadaf,0x889c9a,0x667978,0x9b825e,0xb1956b,0xdfe9e7].includes(color)) return 'metal';
      if ([0x96744b,0x977348,0x7e6045,0xb16b4b,0x9a774c,0xb68355].includes(color)) return 'wood';
      if ([0x5c7681,0x607480,0xaa6855,0x688b7c,0x477fa7,0x538870].includes(color)) return 'roof';
      if ([0xbc6656,0xb55748,0xc96953,0xe2c99d].includes(color)) return 'brick';
      if ([0xeaf4f0].includes(color)) return 'ice';
      if ([0xd7b477,0xd4b178,0xe1bf82,0xbe955e,0xebcf9b,0xf2d8a0,0xefdab4].includes(color)) return 'sand';
      var c = new T.Color(color);
      if (c.g > c.r * 1.03 && c.g > c.b * 1.08 || [0xe8a4bb,0xeda5bf,0xf0b8cd,0xe8aac5].includes(color)) return 'leaf';
      return 'stone';
    }
    function texture(type) {
      if (textures.has(type)) return textures.get(type);
      // Geometry and navigation checks run without a DOM; material colours
      // remain valid there. Real browsers generate every texture locally.
      if (typeof document === 'undefined') return null;
      var cv = document.createElement('canvas'); cv.width = cv.height = 256;
      var g = cv.getContext('2d'), seed = 6171;
      function random() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
      g.fillStyle = '#ded9cd'; g.fillRect(0,0,256,256);
      if (['stone','brick','sand','roof'].includes(type)) {
        var bw = type==='brick'?64:type==='roof'?32:86, bh = type==='brick'?32:type==='roof'?24:43;
        g.fillStyle = type==='roof'?'#706f69':'#9d9689'; g.fillRect(0,0,256,256);
        for(var row=-1;row<Math.ceil(256/bh)+1;row++)for(var col=-1;col<Math.ceil(256/bw)+1;col++){
          var x=col*bw+(row%2)*bw/2,y=row*bh,k=Math.floor(190+random()*48);
          g.fillStyle='rgb('+k+','+(k-3)+','+(k-10)+')';g.fillRect(x+2,y+2,bw-4,bh-4);
          g.strokeStyle='rgba(255,255,255,.36)';g.strokeRect(x+3,y+3,bw-6,bh-6);
        }
      } else if(type==='rock'||type==='snow'){
        g.fillStyle=type==='snow'?'#ffffff':'#dde0d8';g.fillRect(0,0,256,256);
        if(type==='rock')for(var vein=0;vein<45;vein++){g.strokeStyle='rgba(68,78,71,'+(.025+random()*.08)+')';g.lineWidth=1+random()*3;g.beginPath();var xx=random()*256;g.moveTo(xx,0);for(var yy=0;yy<=256;yy+=16)g.lineTo(xx+Math.sin(yy*.018+vein)*12,yy);g.stroke();}
      } else if(type==='wood'){
        g.fillStyle='#ddc5a0';g.fillRect(0,0,256,256);
        for(var w=0;w<80;w++){g.strokeStyle='rgba(106,77,45,'+(.08+random()*.2)+')';g.lineWidth=1+random()*2;g.beginPath();var xx=random()*256;g.moveTo(xx,0);for(var yy=0;yy<=256;yy+=16)g.lineTo(xx+Math.sin(yy*.035+w)*4,yy);g.stroke();}
        for(var plank=0;plank<4;plank++){g.fillStyle='#82725f';g.fillRect(plank*64,0,2,256);}
      } else if(type==='water'||type==='ice'){
        var grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#ffffff');grad.addColorStop(.5,type==='ice'?'#c3e0e9':'#a9dce5');grad.addColorStop(1,'#f1ffff');g.fillStyle=grad;g.fillRect(0,0,256,256);
        for(var wave=0;wave<22;wave++){g.strokeStyle='rgba(255,255,255,'+(.15+random()*.45)+')';g.lineWidth=1+random()*2;g.beginPath();var wy=wave*12;g.moveTo(0,wy);for(var wx=0;wx<=256;wx+=8)g.lineTo(wx,wy+Math.sin(wx*.035+wave)*3);g.stroke();}
      } else if(type==='glass'||type==='metal'){
        var shine=g.createLinearGradient(0,0,256,256);shine.addColorStop(0,'#c4e1e8');shine.addColorStop(.24,'#fffefa');shine.addColorStop(.33,'#d0e1e5');shine.addColorStop(.65,'#a6bbc6');shine.addColorStop(.8,'#f7ffff');shine.addColorStop(1,'#d5e3da');g.fillStyle=shine;g.fillRect(0,0,256,256);
        if(type==='glass'){g.fillStyle='rgba(255,255,255,.40)';g.fillRect(48,0,11,256);g.fillRect(65,0,3,256);}
      } else if(type==='leaf'){
        g.fillStyle='#e0ebc8';g.fillRect(0,0,256,256);for(var leaf=0;leaf<300;leaf++){g.fillStyle=random()>.5?'rgba(255,255,236,.27)':'rgba(55,90,49,.13)';g.beginPath();g.ellipse(random()*256,random()*256,4+random()*9,3+random()*5,random()*6.28,0,6.28);g.fill();}
      } else if(type==='cloth'){
        g.fillStyle='#fffaf0';g.fillRect(0,0,256,256);for(var thread=0;thread<256;thread+=4){g.fillStyle='rgba(88,75,55,.045)';g.fillRect(thread,0,1,256);g.fillRect(0,thread,256,1);}
      }
      if(!['glass','metal','water','ice'].includes(type))for(var grain=0;grain<2400;grain++){g.fillStyle=random()>.5?'rgba(255,255,255,.075)':'rgba(20,16,9,.045)';g.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
      var t = new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4; textures.set(type,t);return t;
    }
    function material(color, vertexColors) {
      var spec=typeof color==='object'?color:{color:color,surface:inferSurface(color)};
      var type=spec.surface||inferSurface(spec.color),key=type+':'+(vertexColors?'batch':spec.color);
      if(!materials.has(key)){
        var opt={color:vertexColors?0xffffff:spec.color,vertexColors:!!vertexColors,roughness:.82,metalness:0,map:texture(type)};
        if(type==='metal'){opt.roughness=.19;opt.metalness=.83;opt.envMap=environment();opt.envMapIntensity=1.1;}
        if(type==='glass'){opt.roughness=.06;opt.metalness=.18;opt.transparent=true;opt.opacity=.61;opt.envMap=environment();opt.envMapIntensity=1.3;opt.side=T.DoubleSide;opt.depthWrite=false;}
        if(type==='water'){opt.roughness=.22;opt.metalness=.24;opt.envMap=environment();opt.envMapIntensity=.55;}
        if(type==='ice'){opt.roughness=.24;opt.metalness=.1;}
        if(type==='roof'){opt.roughness=.67;opt.metalness=.1;}
        if(['stone','brick','sand','wood','roof','rock'].includes(type)){opt.bumpMap=opt.map;opt.bumpScale=type==='rock'?.12:type==='stone'?.075:.035;}
        var mat=new T.MeshStandardMaterial(opt);mat.userData.surface=type;mat.forceSinglePass=true; materials.set(key,mat);
      }
      return materials.get(key);
    }
    function geometry(kind) {
      if (!geometries.has(kind)) {
        var g;
        if (kind === 'box') g = new T.BoxGeometry(1, 1, 1);
        else if (kind === 'sphere') g = new T.SphereGeometry(1, 20, 14);
        else if (kind === 'cone') g = new T.ConeGeometry(1, 1, 24);
        else if (kind === 'pyramid') g = new T.ConeGeometry(1, 1, 4);
        else if (kind === 'ring') g = new T.TorusGeometry(1, 0.04, 4, 48);
        else g = new T.CylinderGeometry(1, 1, 1, 24);
        geometries.set(kind, g);
      }
      return geometries.get(kind);
    }
    function part(parent, kind, color, x, y, z, sx, sy, sz, rx, ry, rz) {
      var m = new T.Mesh(geometry(kind), material(color));
      m.position.set(x || 0, y || 0, z || 0);
      m.scale.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz);
      m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.kind=kind;
      parent.add(m);
      return m;
    }
    function box(p, c, x, y, z, w, h, d, ry) { return part(p, 'box', c, x, y, z, w, h, d, 0, ry || 0); }
    function cyl(p, c, x, y, z, r, h) { return part(p, 'cylinder', c, x, y, z, r, h, r); }
    function cone(p, c, x, y, z, r, h) { return part(p, 'cone', c, x, y, z, r, h, r); }
    function sphere(p, c, x, y, z, r, sy) { return part(p, 'sphere', c, x, y, z, r, sy || r, r); }
    function line(p, c, a, b, r) {
      var start = new T.Vector3(a[0], a[1], a[2]), end = new T.Vector3(b[0], b[1], b[2]);
      var d = end.sub(start), length = d.length();
      var m = part(p, 'cylinder', c, start.x + d.x / 2, start.y + d.y / 2, start.z + d.z / 2, r, length, r);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      return m;
    }
    function collider(p, x, z, r) { colliders.push({ x: p.position.x + x, z: p.position.z + z, r: r }); }
    var uniqueGeometry=0;
    function mesh(p,g,c,x,y,z,rx,ry,rz){
      geometries.set('detail-'+uniqueGeometry++,g);var m=new T.Mesh(g,material(c));m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
    }
    function profile(p,c,points,x,y,z,sx,sy,sz){
      var g=new T.LatheGeometry(points.map(function(a){return new T.Vector2(a[0],a[1]);}),32);
      var m=mesh(p,g,c,x,y,z);m.scale.set(sx||1,sy||1,sz||1);return m;
    }
    function arch(p,c,x,y,z,w,h,depth,ry){
      function path(out,inset){var hw=w/2-inset,top=h-w/2,low=inset;out.moveTo(-hw,low);out.lineTo(hw,low);out.lineTo(hw,top);out.absarc(0,top,hw,0,Math.PI,false);out.lineTo(-hw,low);}
      var shape=new T.Shape();path(shape,0);var hole=new T.Path();path(hole,.13);shape.holes.push(hole);
      return mesh(p,new T.ExtrudeGeometry(shape,{depth:depth||.13,bevelEnabled:false,curveSegments:12}),c,x,y,z,0,ry||0,0);
    }
    function windowArch(p,x,y,z,w,h,ry){
      var g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry||0;p.add(g);
      box(g,surface(0x387799,'glass'),0,h*.38,.03,w*.83,h*.76,.035);
      sphere(g,surface(0x387799,'glass'),0,h-w*.48,.025,w*.41,w*.4).scale.z=.035;
      arch(g,surface(0xe8dac5,'stone'),0,0,.07,w,h,.12);
      box(g,surface(0xf3e6ca,'stone'),0,0,.13,w+.2,.11,.28);
      box(g,surface(0xe8dac5,'stone'),0,h*.4,.13,.055,h*.8,.035);
    }
    function rails(p,c,r,y,height){
      mesh(p,new T.TorusGeometry(r,.065,5,64),c,0,y+height,0,Math.PI/2);
      for(var i=0;i<24;i++){var a=i/24*Math.PI*2;cyl(p,c,Math.sin(a)*r,y+height/2,Math.cos(a)*r,.037,height);}
    }
    function staircase(p,c,x,z,w,steps,rise,depth){for(var i=0;i<steps;i++)box(p,c,x,rise*(i+1)/2,z-(i*depth),w,rise*(i+1),depth*(steps-i));}
    function foam(p,x,y,z,w,d){
      var positions=new Float32Array(42*3);for(var i=0;i<42;i++){positions[i*3]=x+Math.sin(i*2.39)*w*.5;positions[i*3+1]=y+(i%4)*.06;positions[i*3+2]=z+Math.cos(i*1.87)*d*.5;}
      var geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geometries.set('foam-'+uniqueGeometry++,geo);
      var key='foam-points',mat=materials.get(key);if(!mat){mat=new T.PointsMaterial({color:0xf1fcf9,size:.20,transparent:true,opacity:.60,depthWrite:false});materials.set(key,mat);}
      var obj=new T.Points(geo,mat);obj.userData.dynamic=true;p.add(obj);animated.push({type:'foam',object:obj,base:positions.slice()});
    }
    function rock(p,c,x,z,r,h,snow){
      var rings=[[r,0],[r*.90,h*.12],[r*.64,h*.37],[r*.40,h*.62],[r*.22,h*.82],[r*.055,h]],seg=32,pos=[],uv=[],indices=[];
      for(var j=0;j<rings.length;j++)for(var i=0;i<=seg;i++){var a=i/seg*Math.PI*2,rough=1+.055*Math.sin(a*7)+.03*Math.sin(a*11+j);pos.push(Math.sin(a)*rings[j][0]*rough,rings[j][1],Math.cos(a)*rings[j][0]*rough);uv.push(i/seg,j/(rings.length-1));}
      for(var row=0;row<rings.length-1;row++)for(var col=0;col<seg;col++){var n=row*(seg+1)+col;indices.push(n,n+1,n+seg+1,n+1,n+seg+2,n+seg+1);}
      var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(p,geo,surface(c,'rock'),x,0,z);
      if(snow){var ring=[[r*.33,h*.71],[r*.23,h*.82],[r*.060,h*1.008]],pp=[],uu=[],ii=[];for(var j=0;j<ring.length;j++)for(var i=0;i<=seg;i++){var a=i/seg*Math.PI*2,rough=1+.055*Math.sin(a*7)+.03*Math.sin(a*11+j);pp.push(Math.sin(a)*ring[j][0]*rough,ring[j][1]+(j===0?Math.sin(a*7)*.17:0),Math.cos(a)*ring[j][0]*rough);uu.push(i/seg,j/(ring.length-1));}for(var j=0;j<ring.length-1;j++)for(var i=0;i<seg;i++){var n=j*(seg+1)+i;ii.push(n,n+1,n+seg+1,n+1,n+seg+2,n+seg+1);}var cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(pp,3));cap.setAttribute('uv',new T.Float32BufferAttribute(uu,2));cap.setIndex(ii);cap.computeVertexNormals();mesh(p,cap,surface(0xfffdf7,'snow'),x,0,z);cyl(p,surface(0xfffdf7,'snow'),x,h*1.007,z,r*.061,.06);}
    }
    function tree(p, x, z, color, size, palm) {
      size = size || 1;
      cyl(p, surface(0x967047,'wood'), x, 1.1 * size, z, 0.18 * size, 2.2 * size);
      if (palm) {
        for (var i = 0; i < 5; i++) {
          var a = i * Math.PI * 2 / 5;
          var dir=[Math.cos(a),Math.sin(a)];for(var f=0;f<4;f++){var t=f/3;line(p,surface(color,'leaf'),[x+dir[0]*t*1.5*size,2.7*size-t*.6*size,z+dir[1]*t*1.5*size],[x+dir[0]*(t+.35)*1.5*size,2.6*size-(t+.35)*.6*size,z+dir[1]*(t+.35)*1.5*size],(.20-.13*t)*size);}
        }
      } else {
        if (autumn) color = x < 0 ? 0xcb904b : 0xd6a954;
        sphere(p, surface(color,'leaf'), x, 2.55 * size, z, 1.2 * size, 1.5 * size);
        sphere(p, surface(color,'leaf'), x + 0.75 * size, 2.6 * size, z + 0.3 * size, 0.75 * size);
        sphere(p,surface(color,'leaf'),x-.65*size,2.4*size,z-.25*size,.78*size,.92*size);
        line(p,surface(0x967047,'wood'),[x,1.5*size,z],[x+.5*size,2.2*size,z+.12*size],.09*size);
        if (winter) {
          sphere(p,surface(0xf4fbff,'snow'),x,3.78*size,z,.99*size,.24*size);
          sphere(p,surface(0xf4fbff,'snow'),x+.75*size,3.27*size,z+.3*size,.63*size,.17*size);
          sphere(p,surface(0xf4fbff,'snow'),x-.65*size,3.13*size,z-.25*size,.64*size,.16*size);
        }
      }
    }
    function bench(p, x, z, ry) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g);
      box(g, 0x96744b, 0, 0.65, 0, 2.1, 0.16, 0.65);
      box(g, 0x96744b, 0, 1.05, -0.3, 2.1, 0.7, 0.14);
      box(g, 0x667978, -0.75, 0.3, 0, 0.15, 0.6, 0.5);
      box(g, 0x667978, 0.75, 0.3, 0, 0.15, 0.6, 0.5);
    }
    function building(p, x, z, w, h, d, c, roof) {
      box(p, c, x, h / 2, z, w, h, d);
      var roofColor=surface(roof||0xaa6855,'roof');
      if(country.id==='us'){box(p,roofColor,x,h+.14,z,w+.3,.28,d+.3);box(p,surface(0x8da6a7,'metal'),x+.5,h+.4,z-.4,w*.3,.5,d*.35);}
      else {var g=new T.Group();g.position.set(x,h,z);p.add(g);box(g,roofColor,-w*.25,w*.15,0,w*.60,.22,d+.45).rotation.z=.52;box(g,roofColor,w*.25,w*.15,0,w*.60,.22,d+.45).rotation.z=-.52;
        if(winter){box(g,surface(0xf4fbff,'snow'),-w*.25,w*.15+.13,0,w*.60,.06,d+.44).rotation.z=.52;box(g,surface(0xf4fbff,'snow'),w*.25,w*.15+.13,0,w*.60,.06,d+.44).rotation.z=-.52;}}
      var levels=Math.max(1,Math.floor(h/2));
      for(var level=0;level<levels;level++)for(var k=0;k<3;k++){
        var yy=1.5+level*(h-1.3)/levels,xx=x+(k-1)*w*.27;
        box(p,surface(0xf6e6c8,'stone'),xx,yy,z+d/2+.06,w*.20,.94,.12);
        box(p,surface(0x4389ae,'glass'),xx,yy,z+d/2+.135,w*.145,.72,.035);
        box(p,surface(0xf6e6c8,'stone'),xx,yy,z+d/2+.16,.045,.77,.04);
        box(p,surface(0xf6e6c8,'stone'),xx,yy,z+d/2+.16,w*.16,.035,.04);
      }
      box(p,surface(0xd5b889,'stone'),x,h-.12,z+d/2+.08,w+.2,.18,.18);
      box(p,surface(0x795039,'wood'),x,.8,z+d/2+.13,Math.min(w*.22,1.2),1.6,.10);
      arch(p,surface(0xe8d5ad,'stone'),x-.01,0,z+d/2+.15,Math.min(w*.3,1.45),1.9,.12);
    }
    function ring(p, x, z, r, c) { var m = part(p, 'ring', c, x, 0.045, z, r, r, r, -Math.PI / 2); m.castShadow = false; }
    function river(p, egypt) {
      box(p, WATER, 0, 0.01, 0, 15, 0.08, 8);
      box(p, 0xdac9a4, 0, 0.08, -4.3, 16, 0.15, 0.7);
      box(p, 0xdac9a4, 0, 0.08, 4.3, 16, 0.15, 0.7);
      for (var i = 0; i < 5; i++) box(p, 0xa3e1eb, -5 + i * 2.5, 0.065, (i % 2 ? 1 : -1) * 1.8, 1.4, 0.015, 0.12);
      box(p, 0xb16b4b, -2.8, 0.42, 0, 3.2, 0.5, 1.1);
      if (egypt) {
        cyl(p, 0x9a774c, -2.8, 1.8, 0, 0.07, 2.8);
        var sail = new T.Shape(); sail.moveTo(0, 0); sail.lineTo(1.7, 0); sail.lineTo(0, 2.6); sail.closePath();
        var sg = new T.ShapeGeometry(sail); geometries.set('sail', sg);
        var sm = new T.Mesh(sg, material(WHITE)); sm.position.set(-2.8, 0.8, 0); sm.castShadow = true; p.add(sm);
      } else box(p, WHITE, -2.8, 0.95, 0, 1.8, 0.7, 0.8);
      tree(p, -6, 6, 0x65a573, 1, egypt); tree(p, 6, 6, 0x65a573, 1, egypt);
      bench(p, 0, 5.7);
      box(p,surface(0x93643f,'wood'),-2.8,.68,0,3.0,.09,.98);for(var plank=0;plank<5;plank++)box(p,surface(0xc1915e,'wood'),-3.8+plank*.5,.74,0,.38,.05,.86);
      line(p,surface(0xe7d8b6,'cloth'),[-2.8,3.1,0],[-4.1,.8,.15],.015);line(p,surface(0xe7d8b6,'cloth'),[-2.8,3.1,0],[-1.5,.8,-.15],.015);
      for(var bank of [-1,1])for(var rail=0;rail<8;rail++){var x=-7+rail*2;cyl(p,surface(0x7e796c,'metal'),x,.4,bank*4.4,.035,.7);if(rail<7)line(p,surface(0x7e796c,'metal'),[x,.7,bank*4.4],[x+2,.7,bank*4.4],.035);}
      if(egypt){for(var reed=0;reed<7;reed++){var x=-6+reed*.4;cyl(p,surface(0x86a762,'wood'),x,.5,3.4,.025,1);sphere(p,surface(0x8fae64,'leaf'),x,.84,3.4,.10,.27);}foam(p,0,.10,0,10,5);}
      else{var pont=new T.Group();pont.position.set(4.8,0,0);p.add(pont);box(p,surface(0xe9d4b4,'stone'),0,1.4,0,2.0,.30,8.8);for(var bank of [-1,1]){arch(pont,surface(0xe0cdb2,'stone'),0,.10,bank*3.35,1.8,1.25,.3);box(pont,surface(0xe9d4b4,'stone'),0,1.85,bank*4.2,2.0,.7,.20);}}
    }

    var models = {
      galata: function (p) {
        profile(p,surface(0xcbb89b,'stone'),[[2.4,0],[2.4,.4],[2.32,.55],[2.32,7.55],[2.6,7.75],[2.75,8.0],[2.72,8.3],[2.35,8.4],[2.35,9.35]],0,0,0);collider(p,0,0,2.4);
        for(var level=0;level<3;level++)for(var i=0;i<8;i++){var a=i*Math.PI/4;windowArch(p,Math.sin(a)*2.34,1.4+level*2.1,Math.cos(a)*2.34,.55,.93,a);}
        for(var b=0;b<12;b++){var a=b/12*Math.PI*2;windowArch(p,Math.sin(a)*2.35,8.35,Math.cos(a)*2.35,.54,.87,a);}
        rails(p,surface(0x525b59,'metal'),2.69,8.10,.54);
        profile(p,surface(0x607884,'roof'),[[2.6,0],[2.63,.12],[2.26,.45],[1.55,1.45],[.88,2.30],[.18,3.15],[0,3.25]],0,9.36,0);
        arch(p,surface(0xd9c7a7,'stone'),0,0,2.35,1.15,1.8,.14);box(p,surface(0x704b33,'wood'),0,.65,2.4,.85,1.3,.08);
        cyl(p,surface(GOLD,'metal'),0,13.0,0,.055,.8);sphere(p,surface(GOLD,'metal'),0,13.48,0,.10);
        ring(p,0,0,4,0xe8d49b);staircase(p,surface(STONE,'stone'),0,3.0,1.5,3,.13,.27);
      },
      suspension: function (p) { bridge(p, false); },
      brooklyn: function (p) { bridge(p, true); },
      cappadocia: function (p) {
        var spots = [[-3, 0, 2.2, 6], [1.5, -2, 1.7, 7], [3.8, 2.5, 1.6, 4.8], [-1, 3.7, 1.35, 4]];
        spots.forEach(function(s){profile(p,surface(0xd9b78c,'stone'),[[s[2],0],[s[2]*.85,.35],[s[2]*.65,s[3]*.30],[s[2]*.38,s[3]*.78],[s[2]*.34,s[3]],[0,s[3]+.1]],s[0],0,s[1]);cone(p,surface(0x937655,'stone'),s[0],s[3]+.15,s[1],s[2]*.58,1.2);windowArch(p,s[0],s[3]*.35,s[1]+s[2]*.60,.42,.65);collider(p,s[0],s[1],s[2]*.6);});
        var balloon = new T.Group(); balloon.position.set(-3, 10.5, -2); balloon.userData.dynamic = true; p.add(balloon);
        for(var band=0;band<8;band++){var g=new T.SphereGeometry(1,6,16,band*Math.PI/4,Math.PI/4);var m=mesh(balloon,g,surface([0xf16455,0xffd55b,0x70cddd,0xf29cbf][band%4],'cloth'),0,1.5,0);m.scale.set(1.6,2.05,1.6);}
        box(balloon,surface(0x9e6b44,'wood'),0,-1,0,.9,.65,.7);box(balloon,surface(0x754832,'wood'),0,-.65,0,1.0,.10,.8);
        line(balloon, 0xddd8c8, [-0.4, -0.75, 0], [-0.7, 0.2, 0], 0.03); line(balloon, 0xddd8c8, [0.4, -0.75, 0], [0.7, 0.2, 0], 0.03);
        animated.push({ object: balloon, y: 10.5, phase: 0, type: 'float' });
      },
      liberty: function (p) {
        box(p, STONE, 0, 1.25, 0, 4, 2.5, 4); collider(p, 0, 0, 2.8);
        var patina=surface(0x64b9a2,'metal');
        profile(p,patina,[[1.25,0],[1.28,.2],[1.05,1.1],[.84,3.0],[.84,4.5],[.62,5.3]],0,2.5,0);sphere(p,patina,0,8.7,0,.65,.80);
        for(var fold=0;fold<10;fold++){var a=fold/10*Math.PI*2;line(p,surface(0x459582,'metal'),[Math.sin(a)*1.21,2.7,Math.cos(a)*1.21],[Math.sin(a)*.82,7,Math.cos(a)*.82],.055);}
        line(p, 0x65ab94, [0.6, 7.1, 0], [1.5, 10.1, 0], 0.27);
        box(p, 0x5c9e88, -0.85, 6.9, 0.45, 0.7, 1.2, 0.22);
        cyl(p, STONE, 1.5, 10.55, 0, 0.2, 0.9); cone(p, 0xffb843, 1.5, 11.3, 0, 0.45, 0.9);
        for (var i = 0; i < 7; i++) { var a = i * Math.PI / 6 - Math.PI / 2; line(p, 0x65ab94, [Math.sin(a) * 0.5, 8.9 + Math.cos(a) * 0.25, 0], [Math.sin(a) * 1.05, 9 + Math.cos(a) * 0.9, 0], 0.065); }
        sphere(p,patina,0,8.75,.58,.105,.15);box(p,surface(0x2d6d62,'metal'),-.22,8.9,.61,.16,.06,.04);box(p,surface(0x2d6d62,'metal'),.22,8.9,.61,.16,.06,.04);box(p,surface(0x377467,'metal'),0,8.46,.62,.27,.04,.035);
        sphere(p,surface(0xffdb52,'metal'),1.5,11.35,0,.35,.72);profile(p,surface(0xd1c4a9,'stone'),[[2.3,0],[2.3,.3],[2,.5],[2,1.7],[2.15,1.8]],0,0,0);
        box(p, WATER, 0, -0.015, 0, 10, 0.035, 10); cyl(p, 0x8bbd7d, 0, 0.05, 0, 4, 0.16);
      },
      park: function (p) {
        ring(p, 0, 0, 5.2, 0xefdfb4); ring(p, 0, 0, 5.4, 0xefdfb4);
        cyl(p, WATER, 0, 0.05, 0, 2.1, 0.16); cyl(p, WHITE, 0, 0.35, 0, 0.45, 0.5); collider(p, 0, 0, 0.6);
        for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; tree(p, Math.sin(a) * 7, Math.cos(a) * 7, 0x67a571, 1.1); }
        bench(p, -4, 0, Math.PI / 2); bench(p, 4, 0, -Math.PI / 2);
        profile(p,surface(0xe9dfc9,'stone'),[[1.0,0],[1.15,.12],[.65,.22],[.50,.35],[.42,.85],[1.0,.95],[1.05,1.10]],0,.45,0);
        for(var f=0;f<7;f++){var a=f/7*Math.PI*2;sphere(p,surface(0x9fd9e3,'water'),Math.sin(a)*.55,1.50,Math.cos(a)*.55,.09,.55);}
        for(var flower=0;flower<20;flower++){var a=flower*.8,r=6.0;sphere(p,surface(flower%2?0xf2ad63:0xe97e98,'leaf'),Math.sin(a)*r,.2,Math.cos(a)*r,.12,.15);}
      },
      falls: function (p) {
        box(p, 0x87a28c, 0, 2.3, -1.6, 12, 4.6, 4.5);
        box(p, WATER, 0, 4.64, -2, 12, 0.08, 4);
        box(p, WATER, 0, 0.025, 3.2, 13, 0.07, 5);
        for (var i = 0; i < 7; i++) { box(p, WHITE, -4.8 + i * 1.6, 2.4, 0.87, 0.13, 4.3, 0.04); sphere(p, 0xc6f2ee, -5 + i * 1.65, 0.18, 1.1, 0.8, 0.26); }
        for (var j = -1; j <= 1; j++) collider(p, j * 4, -1.6, 2.45);
        var pos=[],uv=[],index=[];for(var i=0;i<=48;i++){var a=(i/48-.5)*Math.PI*1.3,x=Math.sin(a)*6,z=3-Math.cos(a)*2;pos.push(x,.10,z,x,4.62,z);uv.push(i/48*3,0,i/48*3,2.5);if(i<48){var n=i*2;index.push(n,n+2,n+1,n+1,n+2,n+3);}}
        var waterfall=new T.BufferGeometry();waterfall.setAttribute('position',new T.Float32BufferAttribute(pos,3));waterfall.setAttribute('uv',new T.Float32BufferAttribute(uv,2));waterfall.setIndex(index);waterfall.computeVertexNormals();mesh(p,waterfall,surface(0xbdeaf0,'water'));
        foam(p,0,.25,2.8,11,2.8);rails(p,surface(0x8c7560,'wood'),7.4,.12,.7);
      },
      cntower: function (p) {
        cyl(p, 0xbbc6c4, 0, 7.8, 0, 0.55, 15.6); collider(p, 0, 0, 0.8);
        cyl(p, 0xb7c2bd, 0, 13, 0, 2.25, 0.8); cyl(p, 0x6296b4, 0, 13.6, 0, 1.75, 0.5);
        cone(p, 0xdce1d6, 0, 14.2, 0, 1.6, 0.7); cyl(p, 0xebebe4, 0, 17, 0, 0.1, 5.2);
        ring(p, 0, 0, 3.7, 0xe3cd9d);
        mesh(p,new T.TorusGeometry(2.15,.075,5,48),surface(0xe5e7d9,'metal'),0,13.98,0,Math.PI/2);
        for(var w=0;w<20;w++){var a=w/20*Math.PI*2;box(p,surface(0xe9eadd,'metal'),Math.sin(a)*1.77,13.62,Math.cos(a)*1.77,.055,.52,.055,a);}
        staircase(p,surface(0xd1d2c0,'stone'),0,2.6,1.8,4,.12,.25);windowArch(p,0,.2,.6,.65,1.6);
      },
      hockey: function (p) {
        box(p, 0xeaf4f0, 0, 0.04, 0, 12, 0.12, 7.5); ring(p, 0, 0, 1.25, 0xd76158);
        box(p, 0xd76158, 0, 0.115, 0, 0.08, 0.015, 7); box(p, 0x6a99c3, -3, 0.115, 0, 0.1, 0.015, 7); box(p, 0x6a99c3, 3, 0.115, 0, 0.1, 0.015, 7);
        [-5.5, 5.5].forEach(function (x) { line(p, 0xdb5750, [x, 0.15, -1], [x, 1.5, -1], 0.08); line(p, 0xdb5750, [x, 0.15, 1], [x, 1.5, 1], 0.08); line(p, 0xdb5750, [x, 1.5, -1], [x, 1.5, 1], 0.08); });
        cyl(p, 0x334047, 1.6, 0.18, 0.8, 0.22, 0.15); bench(p, 0, 5);
        for(var side of [-1,1]){
          box(p,surface(0xf4f3e4,'stone'),0,.30,side*3.8,12.6,.55,.13);box(p,surface(0xd75258,'cloth'),0,.59,side*3.8,12.6,.07,.16);
          for(var nz=-1;nz<=1;nz+=.25)line(p,surface(0xe1e8dc,'cloth'),[side*5.55,.18,nz],[side*5.55,1.42,nz],.013);
          for(var ny=.25;ny<1.45;ny+=.24)line(p,surface(0xe1e8dc,'cloth'),[side*5.55,ny,-1],[side*5.55,ny,1],.013);
        }
        line(p,surface(0x97704b,'wood'),[2,.20,1.5],[3.2,1.75,1.5],.045);box(p,surface(0x3e494a,'metal'),1.78,.20,1.5,.6,.12,.10);
      },
      atomium: function (p) {
        var nodes = [[0, 6.5, 0]];
        for (var x = -1; x <= 1; x += 2) for (var y = -1; y <= 1; y += 2) for (var z = -1; z <= 1; z += 2) nodes.push([x * 2.5, 6.5 + y * 2.5, z * 2.5]);
        nodes.forEach(function(a,i){sphere(p,surface(0xdbe6e8,'metal'),a[0],a[1],a[2],1.15);if(i)line(p,surface(0xb2c6c9,'metal'),nodes[0],a,.14);
          // Equatorial seams and blue observation windows keep each sphere readable.
          mesh(p,new T.TorusGeometry(1.154,.018,4,36),surface(0x8fa7ae,'metal'),a[0],a[1],a[2],Math.PI/2);
          if(i%2===0)box(p,surface(0x80b4cb,'glass'),a[0],a[1],a[2]+1.12,.58,.17,.035);
        });
        for (var i = 1; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) { var d = 0; for (var k = 0; k < 3; k++) if (nodes[i][k] !== nodes[j][k]) d++; if (d === 1) line(p, 0x9aadaf, nodes[i], nodes[j], 0.15); }
        line(p,0x889c9a,[0,0,0],nodes[0],.38);collider(p,0,0,.65);
        for(var brace=0;brace<3;brace++){var a=brace/3*Math.PI*2;line(p,surface(0xadc2c6,'metal'),[Math.sin(a)*3.2,0,Math.cos(a)*3.2],[0,4,0],.11);}
        ring(p,0,0,5,0xe3cd9d);cyl(p,surface(0xd8dbca,'stone'),0,.09,0,3.7,.18);
      },
      grandplace: function (p) {
        box(p, 0xdacdaf, 0, 0.02, 0, 13, 0.06, 10);
        [-4.5, 0, 4.5].forEach(function (x, i) { building(p, x, -3.8, 3.6, 5 + i % 2, 2.8, [0xccaf82, 0xd3bf96, 0xbda789][i], GOLD); cone(p, GOLD, x, 6.7 + i % 2, -3.8, 1.45, 2.2); collider(p, x, -3.8, 2.25); });
        cyl(p, STONE, 0, 8, -3.8, 0.45, 5); cone(p, GOLD, 0, 11.3, -3.8, 0.65, 1.8);
        bench(p, -4.5, 2); bench(p, 4.5, 2);
        [-4.5,0,4.5].forEach(function(x,i){for(var y=1.6;y<5.7+i%2;y+=1.35)for(var col=-1;col<=1;col++)windowArch(p,x+col*.85,y,-2.37,.62,.92);
          for(var step=0;step<4;step++)box(p,surface(0xe7c36d,'stone'),x,6.5+step*.30,-2.30,3.4-step*.66,.35,.27);
          for(var pil of [-1.65,1.65])cyl(p,surface(0xdfbf72,'stone'),x+pil,3,-2.32,.11,5.7);
        });
        sphere(p,surface(0xfbe1a6,'metal'),0,10.25,-3.38,.43);box(p,surface(0x614b39,'wood'),0,10.25,-2.94,.03,.58,.02);box(p,surface(0x614b39,'wood'),.13,10.25,-2.94,.25,.03,.02);
        for(var paving=0;paving<8;paving++)box(p,surface(0xb5aa94,'stone'),-5.7+paving*1.65,.065,2,1.55,.025,.32);
      },
      waffle: function (p) {
        box(p, 0xb68355, 0, 0.95, 0, 4.5, 1.9, 2.1); collider(p, 0, 0, 2.4);
        box(p, 0xe9bca0, 0, 2.9, 0, 5, 0.3, 3.2);
        [-2, 2].forEach(function (x) { cyl(p, WHITE, x, 2, 0, 0.08, 2.1); });
        for (var i = 0; i < 6; i++) box(p, i % 2 ? 0xed765c : WHITE, -2.08 + i * 0.83, 2.9, 0, 0.8, 0.33, 3.25);
        var waffle = box(p, GOLD, 0, 4.1, 0, 2, 1.5, 0.22); waffle.rotation.z = -0.15;
        for (var j = -1; j <= 1; j++) { box(p, 0xb88737, j * 0.48, 4.1, 0.13, 0.065, 1.32, 0.05); box(p, 0xb88737, 0, 4.1 + j * 0.36, 0.13, 1.75, 0.055, 0.05); }
        cyl(p,surface(0xfff2d6,'stone'),0,1.96,.50,.68,.07);
        box(p,surface(0xf0bb5e,'sand'),0,2.04,.50,.92,.10,.65);
        for(var x=-2;x<=2;x++)for(var z=-1;z<=1;z++)box(p,surface(0xb97c31,'sand'),x*.18,2.10,.5+z*.17,.11,.015,.10);
        sphere(p,surface(0xf06866,'leaf'),.32,2.15,.5,.14,.18);sphere(p,surface(0xfdf7e9,'cloth'),-.18,2.17,.48,.22,.16);
        for(var s of [-1,1]){box(p,surface(0xfde1b5,'wood'),s*1.7,1.95,.68,.75,.07,.58);sphere(p,surface(0xf0b748,'sand'),s*1.7,2.15,.68,.25,.08);}
      },
      eiffel: function (p) {
        var iron=surface(0x94775c,'metal');
        for (var x = -1; x <= 1; x += 2) for (var z = -1; z <= 1; z += 2) {
          line(p,iron,[x*3.1,0,z*3.1],[x*1.1,7.5,z*1.1],.22);collider(p,x*3.1,z*3.1,.45);
          line(p,iron,[x*1.1,7.5,z*1.1],[0,14.5,0],.12);
          // Each leg itself is a latticed girder rather than a solid pole.
          for(var j=0;j<7;j++){var y0=j*1.05,y1=(j+1)*1.05,w0=3.1-y0*2/7.5,w1=3.1-y1*2/7.5;
            line(p,iron,[x*(w0-.16),y0,z*w0],[x*(w1+.16),y1,z*w1],.035);
            line(p,iron,[x*(w0+.16),y0,z*w0],[x*(w1-.16),y1,z*w1],.035);
          }
        }
        box(p,iron,0,3.5,0,4.7,.30,4.7);box(p,iron,0,7.5,0,2.8,.25,2.8);
        for (var h = 1; h <= 4; h++) { var w = 3.1 - h * 0.46; line(p, 0xb1956b, [-w, h * 1.7, -w], [w, h * 1.7, -w], 0.07); line(p, 0xb1956b, [-w, h * 1.7, w], [w, h * 1.7, w], 0.07); }
        cyl(p, 0x9b825e, 0, 15.3, 0, 0.065, 1.6);
        for(var side=0;side<4;side++)for(var level=0;level<10;level++){
          var ya=.75+level*1.24,yb=ya+1.24,wa=ya<7.5?3.1-ya*2/7.5:1.1*(14.5-ya)/7,wb=yb<7.5?3.1-yb*2/7.5:1.1*(14.5-yb)/7;
          function sidePoint(s,w,y,u){var a=[u*w,y,w];if(s===1)a=[w,y,u*w];if(s===2)a=[u*w,y,-w];if(s===3)a=[-w,y,u*w];return a;}
          line(p,iron,sidePoint(side,wa,ya,-1),sidePoint(side,wb,yb,1),.037);line(p,iron,sidePoint(side,wa,ya,1),sidePoint(side,wb,yb,-1),.037);
          line(p,iron,sidePoint(side,wa,ya,-1),sidePoint(side,wa,ya,1),.041);
        }
        for(var s=0;s<4;s++){var g=new T.Group();g.rotation.y=s*Math.PI/2;p.add(g);arch(g,iron,0,.35,3.12,5.4,3.0,.14);}
        for(var yy of [3.72,7.67])for(var s=0;s<4;s++){var g=new T.Group();g.rotation.y=s*Math.PI/2;p.add(g);var rr=yy<5?2.35:1.4;box(g,iron,0,yy+.22,rr,rr*2,.055,.055);for(var k=-3;k<=3;k++)box(g,iron,k*rr/3,yy+.1,rr,.032,.38,.032);}
        cyl(p,iron,0,13.7,0,.33,.5);ring(p,0,0,6,0xe0cfa5);
      },
      louvre: function (p) {
        building(p, -5.5, -2, 3.6, 4.5, 5.5, 0xd3bb8f, 0x607480); building(p, 5.5, -2, 3.6, 4.5, 5.5, 0xd3bb8f, 0x607480);
        building(p, 0, -5, 9, 4.5, 2.5, 0xd3bb8f, 0x607480);
        part(p,'pyramid',surface(0xb2e1ec,'glass'),0,2.5,.5,4.5,5,4.5,0,Math.PI/4);
        collider(p, 0, 0.5, 4.5); collider(p, -5.5, -2, 3.3); collider(p, 5.5, -2, 3.3); collider(p, 0, -5, 4.7);
        var corners = [[-3.18, 0, -2.68], [3.18, 0, -2.68], [-3.18, 0, 3.68], [3.18, 0, 3.68]];
        corners.forEach(function (a) { line(p, WHITE, a, [0, 5, 0.5], 0.045); });
        // Both directions of the diamond glazing grid, following the four faces.
        var base=[[-3.18,0,-2.68],[3.18,0,-2.68],[3.18,0,3.68],[-3.18,0,3.68]],top=[0,5,.5];
        function mix3(a,b,t){return a.map(function(v,i){return v+(b[i]-v)*t;});}
        for(var face=0;face<4;face++){var a=base[face],b=base[(face+1)%4];for(var k=1;k<9;k++){var t=k/9;line(p,surface(0xc8d9db,'metal'),mix3(a,top,t),mix3(b,top,t),.025);line(p,surface(0xc8d9db,'metal'),mix3(a,b,t),top,.023);}}
        box(p,surface(0xcfdcc9,'stone'),0,.04,.5,9,.08,8);box(p,surface(0x70afc4,'water'),-5,.06,4.0,3,.10,1.7);box(p,surface(0x70afc4,'water'),5,.06,4.0,3,.10,1.7);
      },
      river: function (p) { river(p, false); },
      basils: function (p) {
        box(p, 0xe2c99d, 0, 2.2, 0, 5.5, 4.4, 5); collider(p, 0, 0, 3.55);
        var towers=[[-2.4,-2,6.3,0x59a181],[2.4,-2,7.2,0xe76b54],[-2.4,2,7.2,0x66a5d0],[2.4,2,6.3,GOLD],[0,0,9.5,0x59a181],[-2.8,0,5.2,0xe77289],[2.8,0,5.5,0x749bd0],[0,-2.7,6.0,0xeac65d],[0,2.7,5.4,0x86b66f]];
        towers.forEach(function(a,i){cyl(p,surface(0xd67a60,'brick'),a[0],a[2]-1.4,a[1],.68,3.2);
          for(var tier=0;tier<3;tier++)cyl(p,surface(0xf4dcc4,'stone'),a[0],a[2]-2.4+tier*.65,a[1],.72,.12);
          var pr=[[.5,0],[.72,.15],[1.00,.55],[1.03,.9],[.85,1.25],[.58,1.55],[.22,1.95],[0,2.25]];
          profile(p,surface(a[3],'roof'),pr,a[0],a[2]-.15,a[1]);
          // Twist ribs around the true bulbous onion profile.
          for(var stripe=0;stripe<7;stripe++){var points=[];for(var j=1;j<pr.length-1;j++){var angle=stripe/7*Math.PI*2+pr[j][1]*.7;points.push(new T.Vector3(a[0]+Math.sin(angle)*(pr[j][0]+.014),a[2]-.15+pr[j][1],a[1]+Math.cos(angle)*(pr[j][0]+.014)));}mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.037,4,false),surface(i%2?0xfde6ab:0xee9a64,'roof'));}
          cyl(p,surface(GOLD,'metal'),a[0],a[2]+2.4,a[1],.035,.60);box(p,surface(GOLD,'metal'),a[0],a[2]+2.5,a[1],.3,.035,.04);
          windowArch(p,a[0],a[2]-2.0,a[1]+.68,.40,.77);
        });
        for(var arc=-2;arc<=2;arc++)arch(p,surface(0xf4d8bf,'stone'),arc*1.08,.35,2.55,.8,1.65,.13);
        staircase(p,surface(0xddc6a0,'stone'),0,3.5,1.8,5,.12,.22);
      },
      kremlin: function (p) {
        box(p, 0xbc6656, 0, 1.7, 0, 12, 3.4, 1.2);
        [-5, 0, 5].forEach(function (x) { box(p, 0xb55748, x, 3, 0, 2.2, 6, 2.2); cone(p, 0x538870, x, 7.2, 0, 1.75, 3); sphere(p, GOLD, x, 9, 0, 0.21); collider(p, x, 0, 1.7); });
        for (var i = 0; i < 9; i++) box(p, 0xbc6656, -5.6 + i * 1.4, 3.6, 0, 0.6, 0.8, 1.2);
        collider(p, -2.5, 0, 1.4); collider(p, 2.5, 0, 1.4);
        for(var t of [-5,0,5]){
          windowArch(p,t,1.7,1.12,.55,1.5);box(p,surface(0xf4dbc0,'stone'),t,5.7,1.15,2.0,.11,.12);
          if(t===0){cyl(p,surface(0xf8e1a0,'metal'),t,5.15,1.19,.56,.065).rotation.x=Math.PI/2;line(p,surface(0x725443,'wood'),[t,5.15,1.24],[t+.31,5.34,1.24],.025);line(p,surface(0x725443,'wood'),[t,5.15,1.24],[t,5.54,1.24],.022);}
        }
      },
      square: function (p) {
        box(p, 0xc79483, 0, 0.03, 0, 12, 0.08, 10); ring(p, 0, 0, 4, GOLD);
        for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; box(p, GOLD, Math.sin(a) * 4, 0.09, Math.cos(a) * 4, 0.6, 0.08, 0.6, a); }
        bench(p, -5.5, 0, Math.PI / 2); bench(p, 5.5, 0, -Math.PI / 2);
        for(var lamp of [-4.8,4.8]){cyl(p,surface(0x574a41,'metal'),lamp,1.45,-4,.065,2.9);sphere(p,surface(0xffe8a2,'glass'),lamp,3,-4,.25,.32);cone(p,surface(0x67533d,'metal'),lamp,3.38,-4,.34,.18);}
        for(var tile=0;tile<16;tile++){var a=tile/16*Math.PI*2;box(p,surface(0xe4bea0,'stone'),Math.sin(a)*4.9,.10,Math.cos(a)*4.9,.43,.035,.65,a);}
      },
      fuji: function (p) {
        rock(p,0x748eac,0,0,8,11.2,true);collider(p,0,0,7.8);
        tree(p, -7, 5, 0xe8a4bb, 0.8); tree(p, 7, 5, 0xe8a4bb, 0.8);
      },
      torii: function (p) {
        [-2.4, 2.4].forEach(function (x) { cyl(p, 0xde674a, x, 2.8, 0, 0.3, 5.6); cyl(p, 0x624f49, x, 0.38, 0, 0.36, 0.76); collider(p, x, 0, 0.4); });
        box(p, 0xde674a, 0, 4.6, 0, 6.3, 0.35, 0.45); box(p, 0x654b43, 0, 5.8, 0, 7, 0.4, 0.65); box(p, 0xde674a, 0, 5.3, 0, 6.6, 0.3, 0.55);
        box(p, 0xde674a, 0, 5.05, 0, 0.45, 1, 0.4);
        for (var i = -2; i <= 2; i++) box(p, 0xd4c4a2, 0, 0.055, i * 1.9, 2.8, 0.12, 1.55);
        var beam=new T.Shape();beam.moveTo(-3.7,5.75);beam.quadraticCurveTo(0,5.45,3.7,5.75);beam.lineTo(3.7,6.03);beam.quadraticCurveTo(0,5.72,-3.7,6.03);beam.closePath();mesh(p,new T.ExtrudeGeometry(beam,{depth:.67,bevelEnabled:false,curveSegments:20}),surface(0x64483a,'wood'),0,0,-.335);
        var rope=new T.CatmullRomCurve3([new T.Vector3(-2.2,4.0,.30),new T.Vector3(0,3.65,.30),new T.Vector3(2.2,4.0,.30)]);mesh(p,new T.TubeGeometry(rope,20,.045,5,false),surface(0xf3dfba,'cloth'));
        for(var paper=-1;paper<=1;paper++){box(p,surface(0xfff4e0,'cloth'),paper*.85,3.55,.35,.18,.4,.025).rotation.z=paper*.12;}
      },
      sakura: function (p) {
        [-5, 0, 5].forEach(function (x) { tree(p, x, -3, 0xeda5bf, 1.35); tree(p, x + 0.5, 3, 0xf0b8cd, 1.15); });
        box(p, 0xddc6a4, 0, 0.03, 0, 14, 0.07, 2); bench(p, 0, -1.9);
        for (var i = 0; i < 12; i++) box(p, 0xf3c3d8, Math.sin(i * 2.37) * 6, 0.085, Math.cos(i * 1.71) * 4, 0.16, 0.02, 0.14, i);
        for(var flower=0;flower<30;flower++){var x=Math.sin(flower*2.73)*6,z=Math.cos(flower*1.47)*4;sphere(p,surface(0xffdded,'leaf'),x,.12,z,.13,.06);sphere(p,surface(0xf095b7,'leaf'),x+.11,.13,z,.10,.05);}
        var bridge=new T.Group();bridge.position.set(3,0,0);p.add(bridge);box(bridge,surface(0x90c7d6,'water'),0,-.01,0,1.5,.05,8);for(var rail of [-1,1]){line(bridge,surface(0x9c6650,'wood'),[-1,.7,rail],[1,.7,rail],.045);for(var sx of [-1,1])cyl(bridge,surface(0x9c6650,'wood'),sx,.35,rail,.05,.7);}
      },
      greatwall: function (p) {
        var a = [[-6, 2], [-3, 0], [0, -1], [3, 0], [6, -2]];
        for (var i = 0; i < a.length - 1; i++) {
          var x = (a[i][0] + a[i + 1][0]) / 2, z = (a[i][1] + a[i + 1][1]) / 2;
          var dx = a[i + 1][0] - a[i][0], dz = a[i + 1][1] - a[i][1];
          box(p, 0xb4a388, x, 1.4, z, Math.sqrt(dx * dx + dz * dz) + 0.3, 2.8, 1.6, -Math.atan2(dz, dx)); collider(p, x, z, 1.65);
        }
        [-6, 0, 6].forEach(function (x) { var z = x === -6 ? 2 : x === 6 ? -2 : -1; box(p, STONE, x, 2, z, 2.4, 4, 2.4); cone(p, 0x688b7c, x, 4.6, z, 1.8, 1.5); collider(p, x, z, 1.8); });
        for (var j = 0; j < a.length; j++) box(p, STONE, a[j][0], 3, a[j][1], 0.6, 0.6, 1.9);
        for(var s=0;s<a.length-1;s++){var aa=a[s],bb=a[s+1],len=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]),ry=-Math.atan2(bb[1]-aa[1],bb[0]-aa[0]),g=new T.Group();g.position.set((aa[0]+bb[0])/2,0,(aa[1]+bb[1])/2);g.rotation.y=ry;p.add(g);
          for(var side of [-1,1]){box(g,surface(0xc5b69a,'stone'),0,2.94,side*.77,len,.25,.22);for(var tooth=0;tooth<4;tooth++)box(g,surface(0xc5b69a,'stone'),-len*.4+tooth*len*.27,3.22,side*.77,.34,.46,.26);}
        }
        for(var wx of [-6,0,6]){var wz=wx===-6?2:wx===6?-2:-1;windowArch(p,wx,1.6,wz+1.24,.56,.93);for(var side of [-1,1])box(p,surface(0xe2ceaa,'stone'),wx+side*1.20,4.08,wz,.17,.36,2.5);}
      },
      heaven: function (p) {
        cyl(p, WHITE, 0, 0.45, 0, 4.5, 0.9); cyl(p, WHITE, 0, 1.05, 0, 3.5, 0.6); cyl(p, 0xc96953, 0, 3.2, 0, 2.4, 3.7); collider(p, 0, 0, 4.3);
        [2.55,4.08,5.46].forEach(function(y,i){var r=3.4-i*.65;profile(p,surface(0x367fc1,'roof'),[[r,0],[r,.12],[r*.84,.25],[r*.61,.60],[r*.35,1.00],[r*.11,1.34],[0,1.52]],0,y,0);mesh(p,new T.TorusGeometry(r,.045,4,48),surface(0xe8c865,'metal'),0,y+.10,0,Math.PI/2);});
        cyl(p, GOLD, 0, 7.3, 0, 0.16, 0.65);
        for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; cyl(p, 0xc96953, Math.sin(a) * 2.35, 2.3, Math.cos(a) * 2.35, 0.12, 2.5); }
        staircase(p,surface(0xece7d5,'stone'),0,5.2,2.0,5,.16,.35);rails(p,surface(0xede5d3,'stone'),4.35,.95,.45);
        for(var i=0;i<12;i++){var a=i/12*Math.PI*2;windowArch(p,Math.sin(a)*2.41,1.7,Math.cos(a)*2.41,.39,.67,a);}
      },
      bamboo: function (p) {
        for (var i = 0; i < 18; i++) {
          var x = Math.sin(i * 2.39) * 5.5, z = Math.cos(i * 1.87) * 4.5;
          if (Math.abs(z) < 1.2) z += 2;
          var h = 3.2 + i % 4 * 0.55; cyl(p, 0x70a96d, x, h / 2, z, 0.15, h);
          for (var k = 1; k <= 3; k++) { cyl(p, 0x4d8755, x, k * h / 4, z, 0.18, 0.06); line(p, 0x72a967, [x, k * h / 4, z], [x + (k % 2 ? 0.7 : -0.7), k * h / 4 + 0.25, z + 0.2], 0.08); }
          for(var k=1;k<=3;k++){var dir=k%2?1:-1;var m=sphere(p,surface(0x76b56a,'leaf'),x+dir*.60,k*h/4+.34,z+.21,.37,.075);m.rotation.z=dir*.35;var m2=sphere(p,surface(0x90c579,'leaf'),x+dir*.85,k*h/4+.35,z+.16,.28,.055);m2.rotation.y=.6;}
        }
        for (var j = -3; j <= 3; j++) cyl(p, 0xc5c4ab, j * 1.6, 0.05, 0, 0.55, 0.08);
      },
      pyramids: function (p) {
        [[-2.3, -1, 5.6, 8], [4.7, -4, 3.7, 5.8], [5, 3.2, 2.5, 3.8]].forEach(function (a) {
          var levels=18;for(var level=0;level<levels;level++){var w=a[2]*Math.SQRT2*(1-level/levels),h=a[3]/levels;box(p,surface(level%2?0xdac08d:0xd0ae72,'sand'),a[0],level*h+h/2,a[1],w,h,w);}collider(p,a[0],a[1],a[2]);
          part(p,'pyramid',surface(0xf1d8aa,'sand'),a[0],a[3]-.02,a[1],a[2]*.058,.40,a[2]*.058,0,Math.PI/4);
        });
        box(p, 0xebcf9b, 0, 0.035, 0, 17, 0.07, 14);
      },
      sphinx: function (p) {
        box(p, 0xd4b178, 0, 1.5, 0, 3.3, 3, 5.8); box(p, 0xd4b178, -1, 0.6, 4.1, 1, 1.2, 3); box(p, 0xd4b178, 1, 0.6, 4.1, 1, 1.2, 3);
        sphere(p, 0xd4b178, 0, 4.4, 2, 1.2, 1.7); box(p, 0xbe955e, 0, 4.65, 1.7, 3, 2.7, 1.3); sphere(p, 0xe1bf82, 0, 4.4, 2.65, 0.95, 1.3);
        box(p, 0xa17e49, -0.35, 4.65, 3.44, 0.22, 0.12, 0.05); box(p, 0xa17e49, 0.35, 4.65, 3.44, 0.22, 0.12, 0.05);
        sphere(p,surface(0xd6b981,'sand'),0,1.55,-.8,1.60,1.45).scale.z=3.2;
        for(var side of [-1,1]){sphere(p,surface(0xdfc18b,'sand'),side,1.0,3.9,.54,.54).scale.z=1.55;for(var toe=-1;toe<=1;toe++)box(p,surface(0xb49161,'sand'),side+toe*.23,.65,5.5,.045,.20,.10);}
        for(var band=0;band<8;band++){box(p,surface(band%2?0xccab77:0x9c7b4d,'sand'),-1.10,3.70+band*.28,2.3,.55,.12,.85);box(p,surface(band%2?0xccab77:0x9c7b4d,'sand'),1.10,3.70+band*.28,2.3,.55,.12,.85);}
        box(p,surface(0xbd9663,'sand'),0,4.23,3.58,.36,.10,.04);sphere(p,surface(0xd4b078,'sand'),0,4.52,3.49,.10,.13);box(p,surface(0xaa8758,'sand'),0,3.98,3.30,.25,.36,.15);
        collider(p, 0, 0, 3.4); collider(p, -1, 4.1, 1.5); collider(p, 1, 4.1, 1.5);
      },
      nile: function (p) { river(p, true); },
      christ: function (p) {
        rock(p,0x88a884,0,0,4.5,4,false);collider(p,0,0,4.3);
        box(p, 0xe4e5d8, 0, 4, 0, 2.4, 1, 2.4); cone(p, 0xe4e5d8, 0, 7.1, 0, 1, 5.2);
        sphere(p, 0xe4e5d8, 0, 10.3, 0, 0.65); box(p, 0xe4e5d8, 0, 8.8, 0, 7.6, 0.8, 0.8);
        profile(p,surface(0xede8dc,'stone'),[[1.02,0],[.88,.5],[.65,3.1],[.62,4.6]],0,4.6,0,.95,1,.68);
        for(var side of [-1,1]){sphere(p,surface(0xeee9dc,'stone'),side*3.55,8.8,.06,.48,.19);for(var finger=0;finger<4;finger++)box(p,surface(0xd3d4c5,'stone'),side*3.83,8.76,finger*.12-.18,.14,.035,.045);}
        sphere(p,surface(0xe5ded0,'stone'),0,10.25,.6,.10,.17);box(p,surface(0x999d92,'stone'),-.22,10.46,.61,.14,.06,.04);box(p,surface(0x999d92,'stone'),.22,10.46,.61,.14,.06,.04);box(p,surface(0xbbbcb1,'stone'),0,9.96,.60,.25,.05,.03);
        for(var fold=-3;fold<=3;fold++)line(p,surface(0xd2d2c5,'stone'),[fold*.21,4.7,.61],[fold*.12,8.2,.43],.025);
      },
      sugarloaf: function (p) {
        profile(p,surface(0x9ba899,'rock'),[[5.4,0],[5.2,1.5],[4.45,4.8],[3.45,7.2],[2.5,9.0],[1.5,10.1],[.35,10.55],[0,10.6]],0,0,0);collider(p,0,0,5.4);
        sphere(p, 0x87a785, -7, 1.5, 3, 2.6, 2.8); collider(p, -7, 3, 2.4);
        line(p, 0x6d8078, [-7, 4.3, 3], [0, 10.4, 0], 0.035);
        box(p, 0xefba4b, -3.4, 7, 1.5, 1.5, 1.2, 1.1); box(p, 0x83c4d4, -3.4, 7.2, 2.06, 1.2, 0.55, 0.025);
        tree(p, 5, 5, 0x6aa36e, 1, true);
        for(var patch=0;patch<7;patch++){var a=patch/7*Math.PI*2;sphere(p,surface(0x71a679,'leaf'),Math.sin(a)*4.4,1.5,Math.cos(a)*4.4,1.3,.85);}
        box(p,surface(0xe2d7bf,'stone'),0,10.65,0,2,.20,1.9);box(p,surface(0x7ab8cb,'glass'),0,11.15,0,1.2,.9,1.2);box(p,surface(0xd6c28c,'roof'),0,11.72,0,1.7,.23,1.7);
        var car=new T.Group();car.userData.dynamic=true;car.position.set(-3.5,6.15,1.5);p.add(car);box(car,surface(0xffc657,'metal'),0,0,0,1.5,1.15,1.1);box(car,surface(0x9ecedb,'glass'),0,.2,.56,1.26,.52,.035);box(car,surface(0x9ecedb,'glass'),0,.2,-.56,1.26,.52,.035);line(car,surface(0x556c6f,'metal'),[0,.55,0],[0,1.18,0],.045);animated.push({type:'cablecar',object:car});
      },
      beach: function (p) {
        box(p, 0xf2d8a0, 0, 0.025, 0, 15, 0.07, 10); box(p, WATER, 0, 0.04, -4, 15, 0.08, 3.5);
        [[-4, 1, 0xed8c5c], [3.5, 2, 0x658fd1]].forEach(function (a) { cyl(p, WHITE, a[0], 1.3, a[1], 0.06, 2.6); cone(p, a[2], a[0], 2.5, a[1], 1.9, 0.6); box(p, WHITE, a[0], 0.15, a[1] + 0.5, 1.5, 0.15, 2.3); });
        sphere(p, GOLD, 0, 0.48, 1.5, 0.45); sphere(p, 0xec7561, 0, 0.49, 1.52, 0.32);
        tree(p, -6, 5.5, 0x6aa36e, 1.3, true); tree(p, 6, 5.5, 0x6aa36e, 1.3, true);
        for(var wave=0;wave<5;wave++)box(p,surface(0xd9f5ef,'water'),0,.09,-2.5-wave*.35,13,.025,.045);
        for(var board=0;board<2;board++){var g=new T.Group();g.position.set(4.7+board*.7,.18,4.5);g.rotation.y=.25+board*.2;p.add(g);var m=sphere(g,surface(board?0xf27d79:0x6abce0,'cloth'),0,0,0,.32,.065);m.scale.z=1.10;box(g,surface(0xffecc0,'cloth'),0,.075,0,.055,.025,1.6);}
        for(var tile=0;tile<30;tile++){var x=-7+tile*.48;box(p,surface(tile%4<2?0x4c5960:0xefe6cf,'stone'),x,.12,4.8+Math.sin(tile*.7)*.16,.44,.035,.45);}
        foam(p,0,.12,-2.7,12,.6);
      }
    };

    function bridge(p, stone) {
      var c = stone ? 0xbba38a : 0xdfe9e7;
      box(p, WATER, 0, 0.01, 0, 18, 0.06, 8);
      box(p, 0x829391, 0, 2.1, 0, 16, 0.3, 2.1);
      [-4.5, 4.5].forEach(function (x) {
        [-1.15, 1.15].forEach(function (z) { box(p, c, x, 4, z, stone ? 0.9 : 0.4, 8, 0.7); collider(p, x, z, stone ? 0.6 : 0.38); });
        box(p, c, x, 7, 0, stone ? 1 : 0.5, 0.6, 3);
      });
      function cableHeight(x) { var a = Math.abs(x); return a <= 4.5 ? 3.2 + 3.7 * Math.pow(a / 4.5, 2) : 6.9 - 3.9 * (a - 4.5) / 3.5; }
      for (var z = -1.15; z <= 1.15; z += 2.3) for (var i = 0; i < 8; i++) {
        var x1 = -7.8 + i * 1.95, x2 = x1 + 1.95;
        var y1 = cableHeight(x1), y2 = cableHeight(x2);
        line(p, c, [x1, y1, z], [x2, y2, z], 0.06); line(p, c, [x1, 2.3, z], [x1, y1, z], 0.025);
      }
      if (stone) [-4.5, 4.5].forEach(function (x) { box(p, c, x, 8, 0, 1.2, 0.5, 3.3); });
      for(var side of [-1,1]){
        box(p,surface(0xb5c2bc,'metal'),0,2.75,side*1.05,16,.09,.07);
        for(var post=0;post<20;post++)cyl(p,surface(0xced8d1,'metal'),-7.7+post*.8,2.55,side*1.05,.022,.63);
      }
      if(stone)for(var tx of [-4.5,4.5]){
        for(var side of [-1,1])arch(p,surface(0xcbb393,'stone'),tx-.5,3.2,side*1.21,1.0,2.8,.15);
        box(p,surface(0xd4c19e,'stone'),tx,6.25,0,1.4,.14,3.4);box(p,surface(0xd4c19e,'stone'),tx,7.92,0,1.4,.14,3.4);
      }
      else {for(var lamp=0;lamp<7;lamp++)sphere(p,surface(0xffe7a8,'glass'),-6+lamp*2,2.86,1.12,.075,.12);}
    }

    // Quiet perimeter city scenery leaves the spawn and the three routes open.
    var perimeter = [[-29, -28], [-16, -29], [-3, -29], [10, -29], [28, -28], [-29, 3], [-29, 16], [-23, 29], [28, 28]];
    if (country.id !== 'eg') perimeter.forEach(function (a, i) {
      var h = country.id === 'us' ? 7 + i % 3 * 3 : 3.2 + i % 3 * 0.9;
      var tint = i % 2 ? WHITE : STONE;
      building(root, a[0], a[1], 4, h, 3.5, tint, country.color);
      colliders.push({ x: a[0], z: a[1], r: 2.7 });
    });
    else { tree(root, -29, 14, 0x72a96c, 1.2, true); tree(root, 29, 26, 0x72a96c, 1.2, true); }
    var walkwayColor = country.id === 'eg' ? 0xefdab4 : winter ? 0xb5c1c5 : 0xd8ccb0;
    box(root, walkwayColor, 0, 0.015, 8, 3.8, 0.05, 36);
    box(root, walkwayColor, 0, 0.016, -5, 41, 0.05, 3.6);
    for (var i = 0; i < 5; i++) {
      tree(root, -9, 3 + i * 5, country.id === 'jp' ? 0xe8aac5 : 0x71a477, 0.75, country.id === 'br' || country.id === 'eg');
      tree(root, 8, -22 + i * 6, country.id === 'jp' ? 0xe8aac5 : 0x71a477, 0.75, country.id === 'br' || country.id === 'eg');
    }
    country.places.forEach(function (place) {
      var p = new T.Group(); p.name = place.id; p.position.set(place.x, 0, place.z); root.add(p);
      if (!models[place.kind]) throw new Error('Bilinmeyen gezi modeli: ' + place.kind);
      models[place.kind](p);
    });

    // Parts with different colours share one draw per physical surface type.
    // UVs survive the merge, so real masonry/tile grain is preserved. Named
    // groups can remain unmerged for the icon/thumbnail renderer.
    if(!options.unbatched&&!options.thumbnail){
    root.updateMatrixWorld(true);
    var batches = new Map(), old = [];
    root.traverse(function (m) {
      if (!m.isMesh) return;
      var parent = m;
      while (parent && parent !== root) { if (parent.userData.dynamic) return; parent = parent.parent; }
      var key = m.material.userData.surface || 'stone';
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(m); old.push(m);
    });
    batches.forEach(function (meshes, type) {
      var mat=material(surface(0xffffff,type),true);
      var positions = [], normals = [], uvs = [], colors = [], indices = [], count = 0;
      var v = new T.Vector3(), n = new T.Vector3(), normalMatrix = new T.Matrix3();
      meshes.forEach(function (m) {
        var p = m.geometry.getAttribute('position'), norm = m.geometry.getAttribute('normal'), uv=m.geometry.getAttribute('uv'), ix = m.geometry.index;
        normalMatrix.getNormalMatrix(m.matrixWorld);
        for (var i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); positions.push(v.x, v.y, v.z);
          if (norm) n.fromBufferAttribute(norm, i).applyNormalMatrix(normalMatrix); else n.copy(UP);
          normals.push(n.x, n.y, n.z);
          colors.push(m.material.color.r,m.material.color.g,m.material.color.b);
          var u=uv?uv.getX(i):0,vv=uv?uv.getY(i):0;
          if(['stone','brick','roof','wood','sand'].includes(type)){
            if(m.userData.kind==='box'&&norm){
              var ax=Math.abs(norm.getX(i)),ay=Math.abs(norm.getY(i)),az=Math.abs(norm.getZ(i));
              if(ay>=ax&&ay>=az){u=p.getX(i)*m.scale.x*.35;vv=p.getZ(i)*m.scale.z*.35;}
              else if(ax>az){u=p.getZ(i)*m.scale.z*.35;vv=p.getY(i)*m.scale.y*.35;}
              else{u=p.getX(i)*m.scale.x*.35;vv=p.getY(i)*m.scale.y*.35;}
            }else{u*=Math.max(1,m.scale.x*1.7);vv*=Math.max(1,m.scale.y*.35);}
          }
          uvs.push(u,vv);
        }
        if (ix) for (var j = 0; j < ix.count; j++) indices.push(count + ix.getX(j));
        else for (var k = 0; k < p.count; k++) indices.push(count + k);
        count += p.count;
      });
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeBoundingSphere();
      var merged = new T.Mesh(g, mat); merged.castShadow = type!=='water'&&type!=='glass'; merged.receiveShadow = true; root.add(merged);
    });
    old.forEach(function (m) { m.removeFromParent(); });
    root.updateMatrixWorld(true);
    }

    return {
      root: root,
      colliders: colliders,
      update: function (dt, time) {
        if (disposed) return;
        var water=textures.get('water');if(water)water.offset.y=-time*.32;
        animated.forEach(function (a) {if(a.type==='float'){a.object.position.y=a.y+Math.sin(time*.55+a.phase)*.45;a.object.rotation.y=Math.sin(time*.13)*.15;}else if(a.type==='cablecar'){var t=.5+Math.sin(time*.16)*.43;a.object.position.set(-7+t*7,3.12+t*6.1,3-t*3);}else if(a.type==='foam'){var arr=a.object.geometry.attributes.position.array;for(var i=0;i<a.base.length/3;i++){arr[i*3+1]=a.base[i*3+1]+Math.sin(time*3+i*.71)*.14;arr[i*3+2]=a.base[i*3+2]+Math.sin(time*1.7+i*.3)*.13;}a.object.geometry.attributes.position.needsUpdate=true;}});
      },
      dispose: function () {
        if (disposed) return;
        disposed = true;
        var seen = new Set();
        root.traverse(function (m) { if (m.isMesh && !seen.has(m.geometry)) { seen.add(m.geometry); m.geometry.dispose(); } });
        geometries.forEach(function (g) { if (!seen.has(g)) g.dispose(); });
        materials.forEach(function (m) { m.dispose(); });
        textures.forEach(function(t){t.dispose();});
        root.removeFromParent();
      }
    };
  }
}());
