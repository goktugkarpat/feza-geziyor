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
    var materials = new Map(), geometries = new Map(), textures = new Map(), colliders = [];
    var disposed = false;
    var landscapeClock={value:0},reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    var RICH = { stone: 512, brick: 512, roof: 512, wood: 512, sand: 512 };
    function texture(type) {
      if (textures.has(type)) return textures.get(type);
      // Geometry and navigation checks run without a DOM; material colours
      // remain valid there. Real browsers generate every texture locally.
      if (typeof document === 'undefined') return null;
      var N = RICH[type] || 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
      var g = cv.getContext('2d'), seed = 6171 + type.length * 31, k = N / 256;
      function random() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
      g.fillStyle = '#ded9cd'; g.fillRect(0,0,N,N);
      function tone(t, r, gg, b) { return 'rgb(' + Math.round(t + r) + ',' + Math.round(t + gg) + ',' + Math.round(t + b) + ')'; }
      // Wrapped drawing keeps every tile seamless across the texture border.
      function wrapped(x, w, draw) { draw(x); if (x + w > N) draw(x - N); if (x < 0) draw(x + N); }
      if (type === 'ceramic') {
        g.fillStyle='#f2eee3';g.fillRect(0,0,256,256);for(var row=0;row<32;row++)for(var col=0;col<32;col++){g.strokeStyle='rgba(154,145,123,.20)';g.strokeRect(col*8,row*8,8,8);g.fillStyle=(row+col)%3?'rgba(255,255,255,.13)':'rgba(165,151,133,.08)';g.fillRect(col*8+1,row*8+1,6,6);}
      } else if (type === 'stone' || type === 'sand') {
        var sand = type === 'sand', hs = [.15,.11,.14,.12,.13,.10,.14,.11], y = 0;
        g.fillStyle = sand ? '#b9a78a' : '#8f887b'; g.fillRect(0,0,N,N);
        for (var r = 0; r < hs.length; r++) {
          var h = hs[r] * N, x = -random() * N * .2;
          while (x < N) {
            var w = N * (sand ? .22 + random() * .22 : .19 + random() * .2), t = (sand ? 208 : 194) + random() * (sand ? 28 : 42), warm = random() * 6;
            (function (x, y, w, h, t, warm) { wrapped(x, w, function (xx) {
              g.fillStyle = tone(t, 0, -3, -11 - warm); g.fillRect(xx + 2*k, y + 2*k, w - 4*k, h - 4*k);
              var gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,.20)'); gr.addColorStop(.18, 'rgba(255,255,255,0)'); gr.addColorStop(.8, 'rgba(60,45,30,0)'); gr.addColorStop(1, 'rgba(60,45,30,.22)');
              g.fillStyle = gr; g.fillRect(xx + 2*k, y + 2*k, w - 4*k, h - 4*k);
              g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(xx + 2*k, y + 2*k, 2*k, h - 4*k);
              for (var sp = 0; sp < (sand ? 16 : 7); sp++) { g.fillStyle = random() > .5 ? 'rgba(255,255,255,.14)' : 'rgba(70,55,35,.12)'; g.fillRect(xx + 4*k + random() * (w - 10*k), y + 4*k + random() * (h - 10*k), 1.5*k + random() * 3*k, 1 + random() * 2*k); }
            }); })(x, y, w, h, t, warm);
            x += w;
          }
          y += h;
        }
      } else if (type === 'brick') {
        var rowsB = 8, bh = N / rowsB, bw = N / 4;
        g.fillStyle = '#a99d8d'; g.fillRect(0,0,N,N);
        for (var r = 0; r < rowsB; r++) for (var c = -1; c < 4; c++) {
          var bx = c * bw + (r % 2) * bw / 2, by = r * bh, t = 186 + random() * 46;
          (function (bx, by, t) { wrapped(bx, bw, function (xx) {
            g.fillStyle = tone(t, 0, -7, -18); g.fillRect(xx + 3*k, by + 3*k, bw - 6*k, bh - 6*k);
            g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(xx + 3*k, by + 3*k, bw - 6*k, 2.5*k);
            g.fillStyle = 'rgba(50,25,15,.18)'; g.fillRect(xx + 3*k, by + bh - 6*k, bw - 6*k, 3*k);
            for (var sp = 0; sp < 9; sp++) { g.fillStyle = random() > .5 ? 'rgba(255,240,220,.16)' : 'rgba(60,30,15,.14)'; g.fillRect(xx + 5*k + random() * (bw - 12*k), by + 5*k + random() * (bh - 12*k), 1 + random() * 3*k, 1 + random() * 2*k); }
          }); })(bx, by, t);
        }
      } else if (type === 'roof') {
        var rowsR = 12, th = N / rowsR, tw = N / 8;
        g.fillStyle = '#6f6c66'; g.fillRect(0,0,N,N);
        for (var r = 0; r < rowsR; r++) for (var c = -1; c < 8; c++) {
          var tx = c * tw + (r % 2) * tw / 2, ty = r * th, t = 196 + random() * 40;
          (function (tx, ty, t) { wrapped(tx, tw, function (xx) {
            g.beginPath(); g.moveTo(xx, ty); g.lineTo(xx + tw, ty); g.lineTo(xx + tw, ty + th * .55); g.quadraticCurveTo(xx + tw, ty + th * 1.12, xx + tw / 2, ty + th * 1.12); g.quadraticCurveTo(xx, ty + th * 1.12, xx, ty + th * .55); g.closePath();
            g.fillStyle = tone(t, 0, -2, -6); g.fill(); g.lineWidth = 2.2 * k; g.strokeStyle = 'rgba(30,24,20,.42)'; g.stroke();
            g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(xx + 5*k, ty + 2*k, tw - 10*k, 3*k);
          }); })(tx, ty, t);
        }
      } else if (type === 'rock' || type === 'snow') {
        g.fillStyle=type==='snow'?'#ffffff':'#dde0d8';g.fillRect(0,0,256,256);
        if(type==='rock')for(var vein=0;vein<45;vein++){g.strokeStyle='rgba(68,78,71,'+(.025+random()*.08)+')';g.lineWidth=1+random()*3;g.beginPath();var xx=random()*256;g.moveTo(xx,0);for(var yy=0;yy<=256;yy+=16)g.lineTo(xx+Math.sin(yy*.018+vein)*12,yy);g.stroke();}
        if(type==='rock')for(var bl=0;bl<26;bl++){g.fillStyle=random()>.5?'rgba(255,255,255,.07)':'rgba(40,50,42,.06)';g.beginPath();g.ellipse(random()*256,random()*256,6+random()*18,3+random()*8,random()*3,0,6.28);g.fill();}
      } else if (type === 'wood') {
        g.fillStyle = '#ddc5a0'; g.fillRect(0,0,N,N);
        var planks = 8, pw = N / planks;
        for (var pl = 0; pl < planks; pl++) {
          var tt = 20 + random() * 24; g.fillStyle = 'rgb(' + (205 + tt * .5) + ',' + (176 + tt * .5) + ',' + (136 + tt * .4) + ')'; g.fillRect(pl * pw, 0, pw, N);
          for (var gr2 = 0; gr2 < 18; gr2++) { g.strokeStyle = 'rgba(106,72,40,' + (.07 + random() * .2) + ')'; g.lineWidth = (.6 + random() * 1.6) * k; g.beginPath(); var gx = pl * pw + 3*k + random() * (pw - 6*k); g.moveTo(gx, 0); for (var gy = 0; gy <= N; gy += 16*k) g.lineTo(gx + Math.sin(gy * .02 + pl * 3 + gr2) * 3*k, gy); g.stroke(); }
          if (random() > .4) { var kx = pl * pw + pw * (.3 + random() * .4), ky = random() * N; for (var ring2 = 3; ring2 > 0; ring2--) { g.strokeStyle = 'rgba(90,58,30,' + (.16 + ring2 * .06) + ')'; g.lineWidth = 1.4*k; g.beginPath(); g.ellipse(kx, ky, ring2 * 3*k, ring2 * 7*k, 0, 0, 6.28); g.stroke(); } }
          var jy = random() * N; g.fillStyle = 'rgba(70,45,22,.42)'; g.fillRect(pl * pw, jy, pw, 2*k);
          g.fillStyle = 'rgba(60,40,20,.55)'; g.fillRect(pl * pw, 0, 2.5*k, N); g.fillStyle = 'rgba(255,240,210,.18)'; g.fillRect(pl * pw + 3*k, 0, 2*k, N);
        }
      } else if(type==='water'||type==='ice'){
        var grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#ffffff');grad.addColorStop(.5,type==='ice'?'#c3e0e9':'#a9dce5');grad.addColorStop(1,'#f1ffff');g.fillStyle=grad;g.fillRect(0,0,256,256);
        for(var wave=0;wave<22;wave++){g.strokeStyle='rgba(255,255,255,'+(.15+random()*.45)+')';g.lineWidth=1+random()*2;g.beginPath();var wy=wave*12;g.moveTo(0,wy);for(var wx=0;wx<=256;wx+=8)g.lineTo(wx,wy+Math.sin(wx*.035+wave)*3);g.stroke();}
      } else if(type==='glass'||type==='metal'){
        var shine=g.createLinearGradient(0,0,256,256);shine.addColorStop(0,'#c4e1e8');shine.addColorStop(.24,'#fffefa');shine.addColorStop(.33,'#d0e1e5');shine.addColorStop(.65,'#a6bbc6');shine.addColorStop(.8,'#f7ffff');shine.addColorStop(1,'#d5e3da');g.fillStyle=shine;g.fillRect(0,0,256,256);
        if(type==='glass'){g.fillStyle='rgba(255,255,255,.40)';g.fillRect(48,0,11,256);g.fillRect(65,0,3,256);}
      } else if(type==='leaf'){
        g.fillStyle='#e0ebc8';g.fillRect(0,0,256,256);for(var leaf=0;leaf<1100;leaf++){g.fillStyle=random()>.5?'rgba(255,255,236,.27)':'rgba(55,90,49,.13)';g.beginPath();g.ellipse(random()*256,random()*256,1+random()*3,1+random()*2,random()*6.28,0,6.28);g.fill();}
      } else if(type==='cloth'){
        g.fillStyle='#fffaf0';g.fillRect(0,0,256,256);for(var thread=0;thread<256;thread+=4){g.fillStyle='rgba(88,75,55,.045)';g.fillRect(thread,0,1,256);g.fillRect(0,thread,256,1);}
      }
      if(!['glass','metal','water','ice'].includes(type))for(var grain=0,count=2400*k*k;grain<count;grain++){g.fillStyle=random()>.5?'rgba(255,255,255,.06)':'rgba(20,16,9,.04)';g.fillRect(random()*N,random()*N,(1+random()*2)*k,(1+random()*2)*k);}
      var t = new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4; textures.set(type,t);return t;
    }
    function relief(type) {
      var key='relief:'+type;if(textures.has(key))return textures.get(key);
      var source=texture(type);if(!source)return null;
      var N=source.image.width,cv=document.createElement('canvas');cv.width=cv.height=N;var g=cv.getContext('2d');g.drawImage(source.image,0,0);
      var image=g.getImageData(0,0,N,N);for(var i=0;i<image.data.length;i+=4){var k=image.data[i]*.30+image.data[i+1]*.59+image.data[i+2]*.11;image.data[i]=image.data[i+1]=image.data[i+2]=k;}
      g.putImageData(image,0,0);var t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;textures.set(key,t);return t;
    }
    // One shader patch serves every merged material: the per-vertex "fx" attribute
    // carries (glow, flutter, phase). glow>0 adds a soft emissive twinkle in the
    // vertex colour (lanterns, star tips, beacons: no lights), flutter>0 waves the
    // vertex along its normal (flags, bunting, cloth), flutter<0 turns glow into a
    // slow beacon blink. Time is the shared landscape clock, so reduced motion is
    // simply a frozen clock. No per-frame work happens on the CPU.
    // Per-vertex motion (all on the GPU): mv = (centre xyz, speed), mp = (mode, dir xyz).
    // 1 spin about z (windmill rotors) 2 spin about y (orbiting boats, drifting clouds)
    // 3 loop along dir with shrink at the ends (boats, bus, camels) 4 bob/sway (balloons, fish)
    // 5 ping-pong along dir (cable car).  Reduced motion freezes the clock.
    var MOTION_VS =
      'if(mp.x>.5){float tm=uLandscapeTime*mv.w;float ph=dot(mv.xyz,vec3(1.7,.3,2.3));vec3 dd=transformed-mv.xyz;\n' +
      'if(mp.x<1.5){float c=cos(tm),s=sin(tm);transformed.xy=mv.xy+vec2(dd.x*c-dd.y*s,dd.x*s+dd.y*c);}\n' +
      'else if(mp.x<2.5){float c=cos(tm),s=sin(tm);transformed.xz=mv.xz+vec2(dd.x*c+dd.z*s,-dd.x*s+dd.z*c);}\n' +
      'else if(mp.x<3.5){float u=fract(tm+ph);float k=smoothstep(0.,.07,u)*smoothstep(1.,.93,u);transformed=mv.xyz+dd*k+mp.yzw*(u-.5);}\n' +
      'else if(mp.x<4.5){tm+=ph;transformed+=vec3(sin(tm)*mp.y,sin(tm+1.3)*mp.z,cos(tm*.7)*mp.w);}\n' +
      'else{transformed+=mp.yzw*sin(tm);}}\n';
    var MOTION_NORMAL =
      'if(mp.x>.5&&mp.x<2.5){float tm=uLandscapeTime*mv.w;float c=cos(tm),s=sin(tm);if(mp.x<1.5)objectNormal.xy=vec2(objectNormal.x*c-objectNormal.y*s,objectNormal.x*s+objectNormal.y*c);else objectNormal.xz=vec2(objectNormal.x*c+objectNormal.z*s,-objectNormal.x*s+objectNormal.z*c);}\n';
    var FX_VS = 'if(fx.y>0.0)transformed+=normal*sin(uLandscapeTime*4.6+position.x*1.7+position.y*1.1+position.z*1.5+fx.z)*fx.y;\n';
    function patchFx(mat, breeze, useFx) {
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.uLandscapeTime = landscapeClock;
        var add = !useFx ? '' : 'vGlow=0.0;\nif(fx.x>0.0){float pulse=fx.y<0.0?pow(.5+.5*sin(uLandscapeTime*2.6+fx.z),3.0):.84+.16*sin(uLandscapeTime*2.1+fx.z);vGlow=fx.x*pulse;}\n' + FX_VS + MOTION_VS;
        if (breeze) add += 'float breezeWeight = smoothstep(1.0, 4.0, position.y);\ntransformed.x += sin(uLandscapeTime * 1.4 + position.x * .37 + position.z * .21) * .045 * breezeWeight;\ntransformed.z += cos(uLandscapeTime * 1.1 + position.z * .3) * .025 * breezeWeight;\n';
        var vs = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + add);
        if (useFx) vs = vs.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + MOTION_NORMAL);
        shader.vertexShader = 'uniform float uLandscapeTime;\n' + (useFx ? 'attribute vec3 fx;\nattribute vec4 mv;\nattribute vec4 mp;\nvarying float vGlow;\n' : '') + vs;
        if (useFx) shader.fragmentShader = 'varying float vGlow;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow;');
      };
      mat.customProgramCacheKey = function () { return 'gezi-fx-v2' + (breeze ? 'b' : '') + (useFx ? 'f' : ''); };
    }
    // Shadow pass sees the same motion, so spinning blades / flags cast moving shadows.
    function depthMaterial() {
      if (materials.has('depth')) return materials.get('depth');
      var d = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
      d.onBeforeCompile = function (shader) {
        shader.uniforms.uLandscapeTime = landscapeClock;
        shader.vertexShader = 'uniform float uLandscapeTime;\nattribute vec3 fx;\nattribute vec4 mv;\nattribute vec4 mp;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + FX_VS + MOTION_VS);
      };
      d.customProgramCacheKey = function () { return 'gezi-depth-v1'; };
      materials.set('depth', d); return d;
    }
    // Tag every mesh below `a.object` with a GPU motion (see MOTION_VS); resolved to world space when merging.
    var MOTION_MODES = { rotor: 1, orbit: 2, drift: 2, caravan: 3, zswing: 3, xswing: 3, float: 4, fish: 4, cablecar: 5 };
    function tagMotion(a) {
      var g = a.object, frame = g.parent || g, c, D = [0, 0, 0], speed = 1, mode = MOTION_MODES[a.type];
      if (a.type === 'rotor') { c = [g.position.x, g.position.y, g.position.z]; speed = a.s || .65; }
      else if (a.type === 'orbit') { c = [a.cx || 0, g.position.y, a.cz || 0]; speed = -a.s; }
      else if (a.type === 'drift') { c = [0, 0, 0]; speed = a.s; }
      else if (a.type === 'caravan') { var len = a.len || 30; g.position.x = a.x0 + len / 2; c = [g.position.x, g.position.y, g.position.z]; D = [len, 0, 0]; speed = .55 / len; } // len = loop length (boats keep it inside their water strip)
      else if (a.type === 'xswing') { g.position.x = a.x0; c = [g.position.x, g.position.y, g.position.z]; D = [a.amp * 2, 0, 0]; speed = 1 / 26; }
      else if (a.type === 'zswing') { g.position.z = a.z0; c = [g.position.x, g.position.y, g.position.z]; D = [0, 0, a.amp * 2]; speed = 1 / 26; }
      else if (a.type === 'float') { c = [g.position.x, g.position.y, g.position.z]; D = [.12, .45, .1]; speed = .55; }
      else if (a.type === 'fish') { c = [g.position.x, g.position.y, g.position.z]; D = [1.7, 0, .4]; speed = .6; }
      else if (a.type === 'cablecar') { c = [g.position.x, g.position.y, g.position.z]; D = [3.0, 2.62, -1.29]; speed = .16; }
      var spec = { frame: frame, c: c, D: D, speed: speed, mode: mode };
      g.updateMatrix(); g.traverse(function (o) { if (o.isMesh) o.userData.motion = spec; });
    }
    var animated = [];
    var animatedPush = animated.push;
    animated.push = function (a) { if (a && MOTION_MODES[a.type]) { tagMotion(a); return animated.length; } return animatedPush.call(animated, a); };
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
        if(type==='cloth'||type==='ceramic')opt.side=T.DoubleSide;
        if(['stone','brick','sand','wood','roof','rock','ceramic'].includes(type)){opt.bumpMap=relief(type);opt.roughnessMap=opt.bumpMap;opt.bumpScale=type==='rock'?.09:type==='stone'?.06:.025;}
        var mat=new T.MeshStandardMaterial(opt);mat.userData.surface=type;
        if(vertexColors)patchFx(mat,type==='leaf'||type==='cloth',true);
        else if(type==='leaf'||type==='cloth')patchFx(mat,true,false);
        mat.forceSinglePass=true; materials.set(key,mat);
      }
      return materials.get(key);
    }
    function geometry(kind) {
      if (!geometries.has(kind)) {
        var g;
        if (kind === 'box') g = new T.BoxGeometry(1, 1, 1);
        else if (kind === 'foliage') {
          g=new T.SphereGeometry(1,12,8);var a=g.attributes.position;
          for(var i=0;i<a.count;i++){var x=a.getX(i),y=a.getY(i),z=a.getZ(i),k=1+.08*Math.sin(x*11+z*7)*Math.sin(y*9+z*13);a.setXYZ(i,x*k,y*k,z*k);}
          g.computeVertexNormals();
        }else if (kind === 'sphere') g = new T.SphereGeometry(1, 20, 14);
        else if (kind === 'sphere18') g = new T.SphereGeometry(1, 16, 11);
        else if (kind === 'sphere12') g = new T.SphereGeometry(1, 12, 8);
        else if (kind === 'sphere8') g = new T.SphereGeometry(1, 8, 6);
        else if (kind === 'cone') g = new T.ConeGeometry(1, 1, 24);
        else if (kind === 'cone16') g = new T.ConeGeometry(1, 1, 16);
        else if (kind === 'cone8') g = new T.ConeGeometry(1, 1, 8);
        else if (kind === 'pyramid') g = new T.ConeGeometry(1, 1, 4);
        else if (kind === 'pyr') {
          // Square pyramid with its own per-face uv (base y=0, apex y=1, half-width .5).
          var P=[[-.5,0,.5],[.5,0,.5],[.5,0,-.5],[-.5,0,-.5]],ap=[0,1,0],pos=[],nrm=[],uvs=[],idx=[];
          for(var f=0;f<4;f++){var a2=P[f],b2=P[(f+1)%4],ux=b2[0]-a2[0],uz=b2[2]-a2[2],e1=[ux,0,uz],e2=[ap[0]-a2[0],ap[1],ap[2]-a2[2]];var nx=e1[1]*e2[2]-e1[2]*e2[1],ny=e1[2]*e2[0]-e1[0]*e2[2],nz=e1[0]*e2[1]-e1[1]*e2[0],nl=Math.hypot(nx,ny,nz);nx/=nl;ny/=nl;nz/=nl;
            var n0=pos.length/3;pos.push(a2[0],0,a2[2],b2[0],0,b2[2],ap[0],1,ap[2]);for(var q=0;q<3;q++)nrm.push(nx,ny,nz);uvs.push(0,0,1,0,.5,1);idx.push(n0,n0+1,n0+2);}
          g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nrm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(idx);
        }
        else if (kind === 'ring') g = new T.TorusGeometry(1, 0.04, 4, 48);
        else if (kind === 'cylinder') g = new T.CylinderGeometry(1, 1, 1, 24);
        else if (kind === 'cyl16') g = new T.CylinderGeometry(1, 1, 1, 16);
        else if (kind === 'cyl10') g = new T.CylinderGeometry(1, 1, 1, 10);
        else g = new T.CylinderGeometry(1, 1, 1, 6);
        geometries.set(kind, g);
      }
      return geometries.get(kind);
    }
    // Small parts get coarser shared geometry; big landmark bodies keep the round one.
    function lod(kind, sx, sy, sz) {
      var m = Math.max(sx, sz);
      if (kind === 'cylinder') return m < .09 ? 'cyl6' : m < .3 ? 'cyl10' : m < 1.2 ? 'cyl16' : 'cylinder';
      if (kind === 'cone') return m < .3 ? 'cone8' : m < 1.2 ? 'cone16' : 'cone';
      if (kind === 'sphere') { var s = Math.max(sx, sy, sz); return s < .22 ? 'sphere8' : s < .75 ? 'sphere12' : s < 1.05 ? 'sphere18' : 'sphere'; }
      return kind;
    }
    function part(parent, kind, color, x, y, z, sx, sy, sz, rx, ry, rz) {
      sx = sx === undefined ? 1 : sx; sy = sy === undefined ? 1 : sy; sz = sz === undefined ? 1 : sz;
      var m = new T.Mesh(geometry(lod(kind, sx, sy, sz)), material(color));
      m.position.set(x || 0, y || 0, z || 0);
      m.scale.set(sx, sy, sz);
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
      geometries.set('detail-'+uniqueGeometry++,g);var painted=!!g.attributes.color;if(painted){['fx','mv','mp'].forEach(function(nm,i){if(!g.attributes[nm]){var sz=i?4:3;g.setAttribute(nm,new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*sz),sz));}});}var m=new T.Mesh(g,material(c,painted));m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
    }
    function profile(p,c,points,x,y,z,sx,sy,sz){
      var g=new T.LatheGeometry(points.map(function(a){return new T.Vector2(a[0],a[1]);}),32),uv=g.attributes.uv,rmax=0;
      points.forEach(function(a){rmax=Math.max(rmax,a[0]);});var rep=Math.max(2,Math.round(Math.PI*2*rmax*(sx||1)*.35)),n=points.length;
      for(var i=0;i<uv.count;i++){var seg=Math.floor(i/n),j=i%n;uv.setXY(i,seg/32*rep,points[j][1]*(sy||1)*.35);}
      var m=mesh(p,g,c,x,y,z);m.userData.kind='uvfixed';m.scale.set(sx||1,sy||1,sz||1);return m;
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
    function rails(p,c,r,y,height,ox,oz){
      ox=ox||0;oz=oz||0;mesh(p,new T.TorusGeometry(r,.065,5,64),c,ox,y+height,oz,Math.PI/2);
      for(var i=0;i<24;i++){var a=i/24*Math.PI*2;cyl(p,c,ox+Math.sin(a)*r,y+height/2,oz+Math.cos(a)*r,.037,height);}
    }
    function staircase(p,c,x,z,w,steps,rise,depth){for(var i=0;i<steps;i++)box(p,c,x,rise*(i+1)/2,z-(i*depth),w,rise*(i+1),depth*(steps-i));}
    // ---- life: all birds share one mesh and all sparkles/steam/petals one Points
    // cloud (two draws per country, GPU animated, nothing allocated per frame).
    var lifeBirds = [], lifeSparks = [], lifeSeed = 913;
    function lrand() { lifeSeed = (Math.imul(lifeSeed, 1664525) + 1013904223) | 0; return (lifeSeed >>> 0) / 4294967296; }
    function bird(p, x, y, z, r, speed, size, col) { lifeBirds.push({ p: p, x: x, y: y, z: z, r: r, s: speed, size: size || 1, col: col === undefined ? 0xfbfaf4 : col, ph: lrand() * 6.28 }); }
    // kind 0 rising steam/smoke, 1 twinkle, 2 falling petals/snow/leaves, 3 water bob
    function spark(p, x, y, z, n, sx, sy, sz, col, size, kind, speed) { for (var i = 0; i < n; i++) lifeSparks.push({ p: p, x: x + (lrand() - .5) * sx, y: y + (lrand() - .5) * sy, z: z + (lrand() - .5) * sz, col: col, size: size, kind: kind, speed: speed || 1, ph: lrand() }); }
    function foam(p, x, y, z, w, d) { spark(p, x, y, z, 24, w, .1, d, 0xf4fdfa, .30, 3, 1); }
    function fx(m, glow, flutter, phase) { m.userData.fx = [glow || 0, flutter || 0, phase === undefined ? m.position.x * 3.1 + m.position.z * 1.7 : phase]; return m; }
    function glowPart(p, kind, color, x, y, z, a, b, c, amount) { return fx(part(p, kind, color, x, y, z, a, b, c), amount === undefined ? 1 : amount); }
    function lantern(p, x, y, z, s, col) {
      s = s || 1; var m = part(p, 'sphere', surface(col || 0xffd27a, 'cloth'), x, y, z, .17 * s, .23 * s, .17 * s); fx(m, 1.0, 0, x * 2.3 + z);
      cyl(p, surface(0x4a3d33, 'metal'), x, y + .25 * s, z, .11 * s, .06 * s); cyl(p, surface(0x4a3d33, 'metal'), x, y - .24 * s, z, .08 * s, .05 * s); return m;
    }
    function flagGeo(w, h, cf, amp, cols, rows) {
      cols = cols || 6; rows = rows || 4; var pos = [], col = [], fxs = [], uv = [], idx = [], c = new T.Color();
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var u0 = i / cols, u1 = (i + 1) / cols, v0 = j / rows, v1 = (j + 1) / rows, n = pos.length / 3; c.setHex(cf((u0 + u1) / 2, (v0 + v1) / 2));
        [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].forEach(function (q) { pos.push(q[0] * w, (.5 - q[1]) * h, 0); col.push(c.r, c.g, c.b); fxs.push(0, amp * q[0], q[0] * 3.5); uv.push(q[0], 1 - q[1]); });
        idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('fx', new T.Float32BufferAttribute(fxs, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
    }
    // Flag on a slim pole; cf(u,v) returns the colour at that spot of the cloth.
    function flag(p, x, y, z, poleH, w, h, cf, ry, amp) {
      cyl(p, surface(0xcfd6d2, 'metal'), x, y + poleH / 2, z, .045, poleH); sphere(p, surface(GOLD, 'metal'), x, y + poleH + .04, z, .07);
      var m = mesh(p, flagGeo(w, h, cf, amp === undefined ? w * .09 : amp), surface(0xffffff, 'cloth'), x, y + poleH - h / 2 - .08, z, 0, ry || 0, 0); m.userData.kind = 'uvfixed'; m.castShadow = false; return m;
    }
    function bunting(p, a, b, n, sag, cols, size) {
      var pos = [], col = [], fxs = [], idx = [], c = new T.Color(), dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, prev = null;
      function at(t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; }
      for (var i = 0; i <= n * 2; i++) { var q = at(i / (n * 2)); if (prev) line(p, surface(0xe9dcc0, 'cloth'), prev, q, .014); prev = q; }
      for (var i = 0; i < n; i++) {
        var t = (i + .5) / n, q = at(t), hw = len / n * .36; c.setHex(cols[i % cols.length]); var k = pos.length / 3;
        pos.push(q[0] - ux * hw, q[1], q[2] - uz * hw, q[0] + ux * hw, q[1], q[2] + uz * hw, q[0], q[1] - size, q[2]);
        for (var v = 0; v < 3; v++) col.push(c.r, c.g, c.b); fxs.push(0, 0, i * 1.7, 0, 0, i * 1.7 + .3, 0, size * .16, i * 1.7 + .6); idx.push(k, k + 2, k + 1);
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('fx', new T.Float32BufferAttribute(fxs, 3)); g.setIndex(idx); g.computeVertexNormals();
      var m = mesh(p, g, surface(0xffffff, 'cloth')); m.userData.kind = 'uvfixed'; m.castShadow = false; return m;
    }
    // Hip roof with a gentle concave sweep and upturned corner tips (Chinese / Japanese temples).
    function eastRoof(p, c, x, y, z, w, d, h, eave, ry, up) {
      var hx = w / 2 + eave, hz = d / 2 + eave, rx = Math.max(0, (w - d) / 2), rz = Math.max(0, (d - w) / 2), pos = [], uv = [], idx = [], segU = 8, segV = 5;
      var RL = rx > 0 ? [-rx, h, 0] : [0, h, -rz], RR = rx > 0 ? [rx, h, 0] : [0, h, rz], up2 = up === undefined ? .5 : up;
      var faces = [
        [[-hx, 0, hz], [hx, 0, hz], rx > 0 ? RL : RR, RR], [[hx, 0, hz], [hx, 0, -hz], RR, rx > 0 ? RR : RL],
        [[hx, 0, -hz], [-hx, 0, -hz], rx > 0 ? RR : RL, RL], [[-hx, 0, -hz], [-hx, 0, hz], RL, rx > 0 ? RL : RR]];
      faces.forEach(function (f) {
        var n0 = pos.length / 3, elen = Math.hypot(f[1][0] - f[0][0], f[1][2] - f[0][2]);
        for (var j = 0; j <= segV; j++) for (var i = 0; i <= segU; i++) {
          var s = i / segU, t = j / segV, ex = f[0][0] + (f[1][0] - f[0][0]) * s, ez = f[0][2] + (f[1][2] - f[0][2]) * s, rxp = f[2][0] + (f[3][0] - f[2][0]) * s, rzp = f[2][2] + (f[3][2] - f[2][2]) * s;
          var yy = h * Math.pow(t, 1.75) + up2 * Math.pow(1 - t, 2) * Math.pow(Math.abs(2 * s - 1), 2.6);
          pos.push(ex + (rxp - ex) * t, yy, ez + (rzp - ez) * t); uv.push(s * elen * .38, t * h * 1.2 * .38);
        }
        for (var j = 0; j < segV; j++) for (var i = 0; i < segU; i++) { var a = n0 + j * (segU + 1) + i, b = a + 1, cc = b + segU + 1, dd = cc - 1; idx.push(a, b, cc, a, cc, dd); }
      });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      var m = mesh(p, g, surface(c, 'roof'), x, y, z, 0, ry || 0, 0); m.userData.kind = 'uvfixed'; return m;
    }
    function crenel(p, c, x, y, z, len, ry, n, w, h, d) {
      var ca = Math.cos(ry || 0), sa = Math.sin(ry || 0);
      for (var i = 0; i < n; i++) { var u = -len / 2 + (i + .5) * len / n; box(p, c, x + u * ca, y, z - u * sa, w, h, d, ry || 0); }
    }
    function bush(p, x, z, r, c) { var m = part(p, 'foliage', surface(c || 0x5f9a62, 'leaf'), x, r * .55, z, r, r * .68, r * .9); return m; }
    function tuft(p, x, z, colors, n, spread) {
      for (var i = 0; i < n; i++) { var xx = x + Math.sin(i * 2.4) * spread, zz = z + Math.cos(i * 1.9) * spread; cyl(p, surface(0x58915a, 'leaf'), xx, .2, zz, .02, .4); sphere(p, surface(colors[i % colors.length], 'leaf'), xx, .45, zz, .1, .09); }
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
        var crown=[[-.65,2.45,.1,.78,.67],[.6,2.6,.15,.88,.68],[0,3.15,-.05,.9,.72],[-.1,2.8,-.65,.86,.60],[.15,2.55,.65,.85,.59],[-.4,3.45,.25,.68,.55],[.48,3.35,-.35,.65,.60]];
        crown.forEach(function(a,i){var tint=new T.Color(color).multiplyScalar(.89+i*.026),spec=surface(tint.getHex(),'leaf');part(p,'foliage',spec,x+a[0]*size,a[1]*size,z+a[2]*size,a[3]*size,a[4]*size,a[3]*size*.88,0,i*.7,Math.sin(i)*.1);
          if(i<4)line(p,surface(0x94704e,'wood'),[x,1.3*size,z],[x+a[0]*size,a[1]*size,z+a[2]*size],(.095-i*.01)*size);
        });
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
        if(country.id!=='us'&&level<2){var sc=[0x3f7a5e,0x4f7fae,0x9a5a3c,0x7a8f5a][(Math.round(x*7+z*3)+k+level+8)&3];box(p,surface(sc,'wood'),xx-w*.135,yy,z+d/2+.12,.09,.8,.04);box(p,surface(sc,'wood'),xx+w*.135,yy,z+d/2+.12,.09,.8,.04);
          if(level===0){box(p,surface(0x8a5a3c,'wood'),xx,yy-.58,z+d/2+.2,w*.19,.1,.16);for(var fl=0;fl<3;fl++)sphere(p,surface([0xe8506a,0xf5c542,0xf3f0e6][(fl+k)%3],'leaf'),xx+(fl-1)*w*.05,yy-.46,z+d/2+.2,.07,.07);}}
      }
      if(country.id!=='us'){box(p,surface(0xb89a78,'stone'),x+w*.3,h+w*.15+.5,z-d*.2,.42,1.1,.42);box(p,surface(0x8d7456,'stone'),x+w*.3,h+w*.15+1.1,z-d*.2,.55,.1,.55);if(((Math.round(x+z))&1)===0)spark(p,x+w*.3,h+w*.15+1.3,z-d*.2,3,.2,.2,.2,winter?0xeef2f4:0xdedad4,.5,0,.7);}
      box(p,surface(0xd5b889,'stone'),x,h-.12,z+d/2+.08,w+.2,.18,.18);
      box(p,surface(0x795039,'wood'),x,.8,z+d/2+.13,Math.min(w*.22,1.2),1.6,.10);
      arch(p,surface(0xe8d5ad,'stone'),x-.01,0,z+d/2+.15,Math.min(w*.3,1.45),1.9,.12);
    }
    function ring(p, x, z, r, c) { var m = part(p, 'ring', c, x, 0.045, z, r, r, r, -Math.PI / 2); m.castShadow = false; }
    var models = {
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

    function vhash(x, z) { var h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); }
    function vnoise(x, y, z) {
      var u = x * .5 + y * .23, w = z * .5 + y * .31, iu = Math.floor(u), iw = Math.floor(w), fu = u - iu, fw = w - iw;
      fu = fu * fu * (3 - 2 * fu); fw = fw * fw * (3 - 2 * fw);
      return vhash(iu, iw) * (1 - fu) * (1 - fw) + vhash(iu + 1, iw) * fu * (1 - fw) + vhash(iu, iw + 1) * (1 - fu) * fw + vhash(iu + 1, iw + 1) * fu * fw;
    }
    var bakeV = new T.Vector3(), bakeN = new T.Vector3(), bakeNM = new T.Matrix3(), bakeC = new T.Color();
    // Bake meshes of one surface type into a single geometry: positions/normals in
    // `matrixOf(mesh)` space, uv per material rules, vertex colour (material colour
    // x optional per-vertex colour x soft colour noise x ground ambient shade) and fx.
    function bake(list, matrixOf, shade) {
      var pos = [], norm = [], uvs = [], col = [], fxs = [], mvs = [], mps = [], ix = [], count = 0, v = bakeV, n = bakeN, nm = bakeNM;
      list.forEach(function (m) {
        var g = m.geometry, p = g.getAttribute('position'), no = g.getAttribute('normal'), uv = g.getAttribute('uv'), gc = g.getAttribute('color'), gf = g.getAttribute('fx'), mat = matrixOf(m), type = m.material.userData.surface;
        var local = m.userData.fx || null, plain = !shade || type === 'water' || type === 'glass' || type === 'ice' || (local && local[0] > 0);
        var tintMesh = 1 + (vhash(m.matrixWorld.elements[12] * 3.1, m.matrixWorld.elements[14] * 2.3 + m.matrixWorld.elements[13]) - .5) * .06;
        nm.getNormalMatrix(mat);
        var mo = m.userData.motion, mvv = [0, 0, 0, 0], mpv = [0, 0, 0, 0];
        if (mo) { var wc = mo.frame.localToWorld(new T.Vector3(mo.c[0], mo.c[1], mo.c[2])), wd = mo.frame.localToWorld(new T.Vector3(mo.c[0] + mo.D[0], mo.c[1] + mo.D[1], mo.c[2] + mo.D[2])).sub(mo.frame.localToWorld(new T.Vector3(mo.c[0], mo.c[1], mo.c[2]))); mvv = [wc.x, wc.y, wc.z, mo.speed]; mpv = [mo.mode, wd.x, wd.y, wd.z]; }
        for (var i = 0; i < p.count; i++) {
          mvs.push(mvv[0], mvv[1], mvv[2], mvv[3]); mps.push(mpv[0], mpv[1], mpv[2], mpv[3]);
          v.fromBufferAttribute(p, i).applyMatrix4(mat); pos.push(v.x, v.y, v.z);
          if (no) n.fromBufferAttribute(no, i).applyNormalMatrix(nm).normalize(); else n.copy(UP);
          norm.push(n.x, n.y, n.z);
          bakeC.copy(m.material.color); if (gc) { bakeC.r *= gc.getX(i); bakeC.g *= gc.getY(i); bakeC.b *= gc.getZ(i); }
          if (!plain) {
            var wy = v.y, ao = .78 + .22 * Math.min(1, Math.max(0, wy / 2.4)), side = 1 - Math.abs(n.y), shadeK = 1 - (1 - ao) * side, nz = vnoise(v.x, v.y, v.z);
            var k = shadeK * tintMesh * (.93 + nz * .14) * 1.03; bakeC.r *= k * (1 + (nz - .5) * .05); bakeC.g *= k; bakeC.b *= k * (1 - (nz - .5) * .05);
          }
          col.push(bakeC.r, bakeC.g, bakeC.b);
          var u = uv ? uv.getX(i) : 0, vv = uv ? uv.getY(i) : 0;
          if (['stone', 'brick', 'roof', 'wood', 'sand'].includes(type)) {
            var kind = m.userData.kind;
            if (kind === 'box' && no) {
              var ax = Math.abs(no.getX(i)), ay = Math.abs(no.getY(i)), az = Math.abs(no.getZ(i));
              if (ay >= ax && ay >= az) { u = p.getX(i) * m.scale.x * .35; vv = p.getZ(i) * m.scale.z * .35; }
              else if (ax > az) { u = p.getZ(i) * m.scale.z * .35; vv = p.getY(i) * m.scale.y * .35; }
              else { u = p.getX(i) * m.scale.x * .35; vv = p.getY(i) * m.scale.y * .35; }
            } else if (kind === 'pyr' && no) {
              var px = Math.abs(no.getX(i)) > Math.abs(no.getZ(i)) ? p.getZ(i) * m.scale.z : p.getX(i) * m.scale.x; u = px * .35; vv = p.getY(i) * m.scale.y * .42;
            } else if ((kind === 'cylinder' || kind === 'cone') && no) {
              if (Math.abs(no.getY(i)) > .9) { u = p.getX(i) * m.scale.x * .35; vv = p.getZ(i) * m.scale.z * .35; }
              else { u = uv.getX(i) * Math.max(1, Math.round(Math.PI * 2 * m.scale.x * .35)); vv = (p.getY(i) + .5) * m.scale.y * .35; }
            } else if (kind !== 'uvfixed') { u *= Math.max(1, m.scale.x * 1.7); vv *= Math.max(1, m.scale.y * .35); }
          }
          uvs.push(u, vv);
          if (gf) fxs.push(gf.getX(i), gf.getY(i), gf.getZ(i)); else if (local) fxs.push(local[0], local[1], local[2]); else fxs.push(0, 0, 0);
        }
        if (g.index) for (var j = 0; j < g.index.count; j++) ix.push(count + g.index.getX(j)); else for (var q = 0; q < p.count; q++) ix.push(count + q);
        count += p.count;
      });
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(norm, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setAttribute('fx', new T.Float32BufferAttribute(fxs, 3)); geo.setAttribute('mv', new T.Float32BufferAttribute(mvs, 4)); geo.setAttribute('mp', new T.Float32BufferAttribute(mps, 4)); geo.setIndex(ix); geo.computeBoundingSphere();
      return geo;
    }
    // Moving parts now ride in the merged batches (GPU motion); a 'dynamic' group simply joins them.
    function batchMotion(group){group.userData.dynamic=false;group.traverse(function(o){if(o.isMesh)o.userData.kind=o.userData.kind;});}

    // Recognisable landmark silhouettes and explorable surroundings, built locally.
    function lamp(p,x,z){cyl(p,surface(0x495b61,'metal'),x,1.6,z,.065,3.2);fx(sphere(p,surface(0xffe9b3,'glass'),x,3.28,z,.22,.32),.9,0,x*1.3+z);cone(p,surface(0x526269,'metal'),x,3.65,z,.30,.15);cyl(p,surface(0x495b61,'metal'),x,.2,z,.14,.4);}
    function flowerbed(p,x,z,w,d){box(p,surface(0x756548,'wood'),x,.12,z,w,.22,d);for(var i=0;i<32;i++){var xx=x+Math.sin(i*2.399)*w*.43,zz=z+Math.cos(i*1.87)*d*.42;cyl(p,surface(0x538755,'leaf'),xx,.25,zz,.025,.35);sphere(p,surface([0xee8a9c,0xeab44c,0xa28cce][i%3],'leaf'),xx,.45,zz,.12,.095);}}
    function district(p,place){
      var gardens=['park','sakura','bamboo','tulips','parkguell','stonehenge'];
      if(gardens.includes(place.kind))return;
      var natural=['fuji','pyramids','sphinx','cappadocia','uluru','reef','falls','sugarloaf','christ','beach','nile'];
      for(var i=0;i<6;i++){var a=(i/6*Math.PI+Math.PI)*.80,x=Math.sin(a)*13,z=Math.cos(a)*13;
        if(natural.includes(place.kind)){if(country.id==='eg'){part(p,'sphere',surface(0xe6c98e,'cloth'),x,-.25,z,2.0+(i%3)*.5,.7,1.5+(i%2)*.5);if(i%2)palm(p,x*.9,z*.9+1.5,.9);else tuft(p,x*.9,z*.9,[0xe9d27a,0xf3e7c0],5,.5);}else if(country.id==='au'){rock(p,0xc39669,x,z,.8+(i%2)*.3,1.2,false);tuft(p,x*.9,z*.9,[0xe9c46a,0xf3e7c0],5,.5);}else tree(p,x,z,0x679e71,.85+i%3*.15,country.id==='br');}
        else {tree(p,x,z,country.id==='jp'?0xe8aac5:0x6b9f77,.8);if(i%2===0)lamp(p,x*.84,z*.84);}
      }
      if(!natural.includes(place.kind)){bench(p,-9,6,.5);bench(p,9,6,-.5);flowerbed(p,0,10,5,1.2);}
    }
    models.park=function(p){
      box(p,surface(0x83a96b,'leaf'),0,.015,0,29,.04,25);
      box(p,surface(0xdfcdb1,'sand'),0,.045,6,27,.06,2.2);
      box(p,surface(0xdfcdb1,'sand'),-8,.04,0,1.7,.06,24);
      box(p,surface(0xdfcdb1,'sand'),8,.04,0,1.7,.06,24);
      var lake=sphere(p,surface(0x6dabb1,'water'),1,.065,-4,6.5,.08);lake.scale.z=4.2;
      // Bow Bridge inspired arch and balustrade above the lake.
      for(var j=0;j<15;j++){var x=-5+j*.72,h=.4+Math.sin(j/14*Math.PI)*.65;box(p,surface(0xe7e1cf,'stone'),x,h,-4,.75,.15,1.5);for(var sd of [-1,1]){cyl(p,surface(0xe7e1cf,'metal'),x,h+.38,-4+sd*.7,.025,.7);if(j<14)line(p,surface(0xe7e1cf,'metal'),[x,h+.75,-4+sd*.7],[x+.72,.4+Math.sin((j+1)/14*Math.PI)*.65+.75,-4+sd*.7],.035);}}
      // Bethesda-style terrace and fountain, separate from the open lawn.
      box(p,surface(0xcdb693,'stone'),-2,.10,7,6,.20,5);
      cyl(p,surface(0xdbc8a9,'stone'),-2,.25,7,1.9,.35);cyl(p,surface(0x8bbbc8,'water'),-2,.45,7,1.65,.08);
      profile(p,surface(0xe0cfb3,'stone'),[[.5,0],[.6,.2],[.25,.45],[.18,1.3],[.7,1.5],[.74,1.65]],-2,.42,7);
      foam(p,-2,1.8,7,1.1,1.1);collider(p,-2,7,1.4);
      for(var i=0;i<36;i++){var row=Math.floor(i/12),x=-13+(i%12)*2.35,z=[-11,11,-8][row];if(row===2&&Math.abs(x)<8)continue;tree(p,x,z,[0x769255,0xa7a05d,0xc29b55][i%3],.8+(i%4)*.13);}
      for(var j=0;j<6;j++){bench(p,-10+j*4,4,0);lamp(p,-12+j*4,6);}
      flowerbed(p,10,8,5,2);flowerbed(p,-11,0,2,5);
      for(var k=0;k<5;k++)building(p,-12+k*6,-16,4,8+k%3*3,3.4,0xbcbbb2,0x7a8990);
    };
    models.bigben=function(p){
      box(p,surface(0xc5ac7a,'stone'),0,6,0,3.2,12,3.2);collider(p,0,0,2.3);
      for(var y=0;y<5;y++){box(p,surface(0xe6d5ae,'stone'),0,1+y*2,0,3.5,.16,3.5);for(var x of [-1,1])windowArch(p,x,1.2+y*1.8,1.63,.38,.96);}
      for(var side=0;side<4;side++){var g=new T.Group();g.rotation.y=side*Math.PI/2;p.add(g);var face=cyl(g,surface(0xfff2cc,'stone'),0,10.4,1.67,1.04,.09);face.rotation.x=Math.PI/2;
        for(var tick=0;tick<12;tick++){var a=tick*Math.PI/6;line(g,surface(0x6e5c43,'metal'),[Math.sin(a)*.80,10.4+Math.cos(a)*.80,1.74],[Math.sin(a)*.95,10.4+Math.cos(a)*.95,1.74],.022);}line(g,0x544633,[0,10.4,1.77],[0,11.12,1.77],.035);line(g,0x544633,[0,10.4,1.77],[.54,10.22,1.77],.045);}
      cone(p,surface(0x607d70,'roof'),0,13.8,0,2.1,3.6);cyl(p,GOLD,0,16,0,.05,1.0);
      for(var sd of [-1,1])building(p,sd*5,-2,6,4.4,3.5,0xccb98e,0x687c72);
    };
    models.towerbridge=function(p){
      box(p,surface(0x83bdc6,'water'),0,.02,0,25,.035,12);box(p,surface(0xe0cbb0,'stone'),0,.18,0,25,.3,3);
      for(var sd of [-1,1]){var x=sd*6;for(var zz of [-2,2]){box(p,surface(0xc9b995,'stone'),x,4,zz,1.5,8,1.5);cone(p,surface(0x557e96,'roof'),x,9.2,zz,1.12,2.4);collider(p,x,zz,1.0);}arch(p,surface(0xd9c9a6,'stone'),x-.65,2,-2.8,1.3,4,.7);box(p,surface(0x528baf,'metal'),x,7.8,0,1.6,.6,5);}
      box(p,surface(0x6ba8c8,'metal'),0,6.6,0,12,.45,1.2);
      for(var sd of [-1,1])for(var i=0;i<10;i++){var x=-12+i*2.65;line(p,surface(0x66a5c9,'metal'),[x,.45,sd*1.55],[x,1.25,sd*1.55],.05);if(i<9)line(p,surface(0x66a5c9,'metal'),[x,1.25,sd*1.55],[x+2.65,1.25,sd*1.55],.05);}
    };
    models.stonehenge=function(p){
      cyl(p,surface(0x809b62,'leaf'),0,.02,0,13,.04);
      for(var i=0;i<14;i++){var a=i/14*Math.PI*2,x=Math.sin(a)*8,z=Math.cos(a)*8;var m=box(p,surface(0xa4a397,'rock'),x,2.1+(i%3)*.12,z,1.5,4.2+(i%3)*.24,1.1,a);m.rotation.z=Math.sin(i)*.05;collider(p,x,z,.8);if(i%2===0){var a2=(i+1)/14*Math.PI*2;line(p,surface(0xbcb9a8,'rock'),[x,4.35,z],[Math.sin(a2)*8,4.35,Math.cos(a2)*8],.65);}}
      for(var sd of [-1,1]){box(p,surface(0xaaa897,'rock'),sd*1.5,2.7,-1,1,5.4,1.3);collider(p,sd*1.5,-1,.75);}box(p,surface(0xb8b6a6,'rock'),0,5.55,-1,4.2,.8,1.5);
    };
    models.colosseum=function(p){
      for(var level=0;level<3;level++)for(var i=0;i<20;i++){var a=i/20*Math.PI*2,x=Math.sin(a)*9,z=Math.cos(a)*6,g=new T.Group();g.position.set(x,level*2.15,z);g.rotation.y=a;p.add(g);arch(g,surface(0xc8b398,'stone'),0,0,0,2.25,2.1,.55);box(g,surface(0xe0cfad,'stone'),0,2.1,0,2.6,.18,.8);if(level===0)collider(p,x,z,.50);}
      box(p,surface(0xd8bc91,'sand'),0,.01,0,13,.02,7);
      for(var i=0;i<7;i++)box(p,surface(0xbbab92,'stone'),-6.5,6.5+i*.12,-3+i,1,.3,1.1);
    };
    models.pisa=function(p){
      var g=new T.Group();g.rotation.z=-.075;p.add(g);cyl(g,surface(0xe5e2cf,'stone'),0,4.8,0,2.2,9.6);collider(p,0,0,2.7);
      for(var level=0;level<7;level++){cyl(g,surface(0xf0ead8,'stone'),0,.7+level*1.25,0,2.55,.18);for(var j=0;j<16;j++){var a=j/16*Math.PI*2;cyl(g,surface(0xe2dcc9,'stone'),Math.sin(a)*2.35,1.25+level*1.25,Math.cos(a)*2.35,.065,1);if(j<8)windowArch(g,Math.sin(a)*2.21,.9+level*1.25,Math.cos(a)*2.21,.5,.72,a);}}
      cyl(g,surface(0xdbd4ba,'stone'),0,10.2,0,1.6,1.4);rails(g,surface(0xc9baa0,'stone'),1.65,10.6,.5);
    };
    function canalTown(p,dutch){
      box(p,surface(0x74b4bf,'water'),0,.035,0,8,.04,24);
      for(var sd of [-1,1])for(var i=0;i<5;i++){var z=-10+i*4.5,x=sd*7;building(p,x,z,3,4+i%3*1.5,3.2,[0xc58d69,0xe0bf93,0xbc7564,0xd8cead][i%4],dutch?0x5a7372:0x9e6854);collider(p,x,z,1.85);}
      for(var i=0;i<13;i++){var x=-5+i*.83,y=.20+Math.sin(i/12*Math.PI)*.5;box(p,surface(0xd4bc95,'stone'),x,y,4,.9,.2,2.2);for(var sd of [-1,1])cyl(p,surface(0xb6a281,'stone'),x,y+.35,4+sd*1.05,.04,.7);}
      var boat=new T.Group();boat.userData.dynamic=true;boat.position.set(0,.22,-4);p.add(boat);var hull=sphere(boat,surface(dutch?0xb75f47:0x333f49,'wood'),0,0,0,1,.18);hull.scale.z=3;box(boat,surface(0xab7950,'wood'),0,.2,0,.8,.12,1.8);batchMotion(boat);animated.push({type:'boat',object:boat,x:0,z:-4});
    }
    models.venice=function(p){canalTown(p,false);};models.canals=function(p){canalTown(p,true);};
    models.sagrada=function(p){
      building(p,0,0,9,4,5,0xc8b99b,0x997a57);collider(p,0,0,4);
      for(var i=0;i<6;i++){var x=-5+i*2,h=8+(i%3)*2;profile(p,surface(0xd1bf9e,'stone'),[[.8,0],[.72,2],[.55,h*.7],[.25,h],[0,h+.8]],x,2,0);for(var level=0;level<5;level++)windowArch(p,x-.1,3+level*1.5,.65,.35,.85);sphere(p,surface([0x86bbae,0xdfb467,0xcd8e69][i%3],'glass'),x,h+3,0,.35,.6);}
      arch(p,surface(0xe4d2b0,'stone'),0,0,2.8,2.4,3.5,.6);
    };
    models.alhambra=function(p){
      box(p,surface(0xcdb18a,'stone'),0,.1,0,18,.2,14);box(p,surface(0x74b7b9,'water'),0,.24,0,3,.1,10);
      for(var sd of [-1,1])for(var j=0;j<7;j++){var g=new T.Group();g.position.set(sd*7,0,-6+j*2);g.rotation.y=Math.PI/2;p.add(g);arch(g,surface(0xe6cfac,'stone'),0,0,0,1.7,3,.30);cone(p,surface(0x9c715a,'roof'),sd*0,3.55,0,1.4,1.0);}
      building(p,0,-8,16,4.5,3,0xd0a17e,0x9b6c51);collider(p,0,-8,4);
      for(var sd of [-1,1])tree(p,sd*4,3,0x6d9e6d,.9,true);
    };
    models.parkguell=function(p){
      for(var i=0;i<24;i++){var a=i/23*Math.PI,x=Math.cos(a)*10,z=Math.sin(a)*6;box(p,surface([0xf2c463,0x80babb,0xe39079,0xc7b7d9][i%4],'stone'),x,.5,z,1.2,.8,.8,-a);}
      for(var sd of [-1,1]){building(p,sd*7,-6,3.5,3,3,0xe0c49b,0xc79569);sphere(p,surface(0xefdfba,'stone'),sd*7,4.2,-6,2,.6);cone(p,surface(0x719ab4,'roof'),sd*7,6,-6,.4,2.7);}
      var lizard=sphere(p,surface(0x82c2a7,'stone'),0,.4,0,1,.35);lizard.scale.z=2;for(var sd of [-1,1]){sphere(p,surface(0xeab44b,'stone'),sd*.8,.25,.3,.4,.1);sphere(p,surface(0xeab44b,'stone'),sd*.8,.25,-1,.4,.1);}sphere(p,surface(0x69b3c7,'stone'),0,.55,1.5,.6,.35);
      for(var i=0;i<20;i++){var a=i*2.4;tree(p,Math.sin(a)*13,Math.cos(a)*11,0x7aa376,.7+i%3*.15);}flowerbed(p,0,8,10,2);
    };
    models.dutchmill=function(p){
      for(var i=0;i<3;i++){var x=-8+i*8,z=i%2?-3:1;profile(p,surface(0x8a6a4b,'wood'),[[1.6,0],[1.35,3],[1,5],[.8,6]],x,0,z);cone(p,surface(0x52665e,'roof'),x,6.5,z,1.55,1.7);collider(p,x,z,1.8);
        var rotor=new T.Group();rotor.userData.dynamic=true;rotor.position.set(x,4.8,z+1.5);p.add(rotor);for(var j=0;j<4;j++){var blade=new T.Group();blade.rotation.z=j*Math.PI/2;rotor.add(blade);box(blade,surface(0xe6d6b3,'wood'),0,1.6,0,.35,3.4,.12);for(var k=0;k<6;k++)box(blade,surface(0x7b654d,'wood'),.4,.45+k*.45,.06,1.1,.06,.05);}sphere(rotor,surface(0xd8c4a2,'wood'),0,0,.12,.25);batchMotion(rotor);animated.push({type:'rotor',object:rotor});}
      box(p,surface(0x73afbb,'water'),0,.02,7,27,.035,3);for(var i=0;i<6;i++)tree(p,-12+i*4,-8,0x8aac6f,.8);
    };
    models.tulips=function(p){
      for(var row=0;row<9;row++){var z=-10+row*2.5;box(p,surface(0x99754f,'sand'),0,.015,z,26,.025,1.8);for(var i=0;i<24;i++){var x=-12+i*1.04;cyl(p,surface(0x5d9253,'leaf'),x,.40,z,.035,.80);sphere(p,surface([0xe86b78,0xf6c65f,0xdf8cb1,0xf3e4c2,0xb094da][row%5],'leaf'),x,.92,z,.34,.40);}}
      box(p,surface(0xe1ccb0,'sand'),0,.04,0,2,.04,27);bench(p,-11,12);bench(p,11,12);
    };
    models.opera=function(p){
      box(p,surface(0x81b6c2,'water'),0,-.005,0,28,.03,22);box(p,surface(0xc9ae85,'stone'),0,.25,0,20,.5,14);box(p,surface(0x748e9c,'glass'),0,1.6,0,15,2.8,8);
      for(var side of [-1,1])for(var shell=0;shell<3;shell++){
        var positions=[],uvs=[],indices=[],height=[7.5,9,5.4][shell],length=[6.5,7.8,5.2][shell],width=2.5,rows=18,columns=20;
        for(var j=0;j<=rows;j++)for(var k=0;k<=columns;k++){
          var u=k/columns,v=j/rows,rise=Math.pow(Math.sin(v*Math.PI/2),.82),crest=height*rise*(.78+.22*Math.sin(v*Math.PI)),across=Math.sin(u*Math.PI);
          positions.push(-5+shell*4+v*length*.18+(u-.5)*width*(1-v*.72),1+crest*across,side*(1.6+v*length*.65));uvs.push(u*4,v*12);
          if(j<rows&&k<columns){var n=j*(columns+1)+k;indices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1);}
        }
        var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();var roof=mesh(p,geo,surface(0xf5f0df,'ceramic'));roof.material.side=T.DoubleSide;
      }
      collider(p,0,0,6);for(var j=0;j<10;j++)box(p,surface(0xd7c1a0,'stone'),0,.05+j*.05,7+j*.2,18,.1,2-j*.12);
    };
    models.uluru=function(p){
      var g=new T.SphereGeometry(1,48,24),pos=g.attributes.position;for(var i=0;i<pos.count;i++){var y=pos.getY(i),x=pos.getX(i),z=pos.getZ(i);pos.setXYZ(i,x*10*(1+.03*Math.sin(z*19)),Math.max(0,y)*5.8,z*6*(1+.04*Math.sin(x*17)));}g.computeVertexNormals();mesh(p,g,surface(0xb76e4c,'rock'),0,0,0);collider(p,0,0,7);
      for(var i=0;i<12;i++)sphere(p,surface(0x89925b,'leaf'),Math.sin(i*2.4)*13,.3,Math.cos(i*2.4)*9,.65,.45);
    };
    models.reef=function(p){
      box(p,surface(0xefdbb1,'sand'),0,.005,5,28,.02,10);box(p,surface(0x72c6d2,'water'),0,.02,-4,28,.04,15);
      for(var i=0;i<24;i++){var x=Math.sin(i*2.4)*12,z=-5+Math.cos(i*1.9)*4;for(var j=0;j<3;j++)line(p,surface([0xe9a08a,0xc1a3d7,0xf0bc68][i%3],'rock'),[x,.08,z],[x+Math.sin(j*2)*.6,.5+j*.3,z+Math.cos(j*2)*.4],.13);}
      var fish=new T.Group();fish.userData.dynamic=true;p.add(fish);for(var i=0;i<6;i++){sphere(fish,surface(i%2?0xedb85d:0x659fbd,'cloth'),-4+i*1.5,.3,-5,.24,.14);cone(fish,surface(0xe6b15d,'cloth'),-4+i*1.5-.30,.3,-5,.18,.25).rotation.z=Math.PI/2;}batchMotion(fish);animated.push({type:'fish',object:fish});
      tree(p,-11,9,0x77a886,1,true);tree(p,10,10,0x77a886,1,true);
    };
    models.taj=function(p){
      box(p,surface(0xe9e3d2,'stone'),0,.25,-2,18,.5,12);box(p,surface(0xeee9dc,'stone'),0,2.9,-2,9,5.3,7);collider(p,0,-2,4);
      profile(p,surface(0xf1eee1,'stone'),[[2,0],[2.7,.7],[2.3,2],[1.2,3.4],[0,4.0]],0,5.3,-2);cyl(p,GOLD,0,10,-2,.045,1.2);
      for(var sd of [-1,1])for(var zz of [-6,3]){cyl(p,surface(0xe5dfcc,'stone'),sd*7,3.8,zz,.38,7.6);cyl(p,WHITE,sd*7,7.4,zz,.7,.2);sphere(p,WHITE,sd*7,8,zz,.6,.75);collider(p,sd*7,zz,.5);}
      arch(p,surface(0xc4b9a4,'stone'),0,.5,1.55,2.4,4.0,.2);box(p,surface(0x77b8c3,'water'),0,.08,9,2.4,.1,9);
      for(var sd of [-1,1])for(var i=0;i<5;i++)tree(p,sd*4,4+i*2.2,0x5e9271,.55);
    };
    models.hawa=function(p){
      for(var row=0;row<5;row++)for(var col=0;col<9;col++){var x=(col-4)*1.6,h=row*1.5;box(p,surface(0xc98975,'brick'),x,h+.7,0,1.5,1.4,1.2);windowArch(p,x,h+.2,.66,.58,.9);if(row===4)cone(p,surface(0xe0b394,'stone'),x,8.05,0,.65,1.3);}
      for(var x of [-6,-3,0,3,6])collider(p,x,0,1.0);for(var j=0;j<3;j++)box(p,surface(0xe0af8c,'stone'),0,.12+j*.12,1.5+j*.45,16,.22,1.2);
    };
    models.stepwell=function(p){
      box(p,surface(0x7daaad,'water'),0,.02,0,4,.035,8);
      for(var sd of [-1,1])for(var step=0;step<8;step++)box(p,surface(step%2?0xcfb797:0xc3a587,'stone'),sd*(2.4+step*.65),.1+step*.14,0,.7,.2+step*.28,13);
      for(var row=0;row<2;row++)for(var i=0;i<6;i++)arch(p,surface(0xcdbda3,'stone'),-6+i*2.4,row*2.2,-7,1.8,2.1,.6);
      for(var i=0;i<5;i++)collider(p,-5+i*2.5,-7,.5);
    };

    // ======================= richer landmark models =======================
    function pave(p, x, z, r, c, h) { return cyl(p, surface(c || 0xd9c9a8, 'stone'), x, (h || .09) / 2, z, r, h || .09); }
    function mountain(p, type, x, z, R, H, colorFn, o) {
      o = o || {}; var rings = o.rings || 22, seg = o.seg || 48, top = o.top === undefined ? .05 : o.top, k = o.k || 1.55, rough = o.rough === undefined ? .05 : o.rough, pos = [], col = [], uv = [], idx = [];
      for (var j = 0; j <= rings + 1; j++) {
        var t = Math.min(1, j / rings), y = t * H, rad = j > rings ? 0 : R * Math.pow(1 - t * (1 - top), k);
        for (var i = 0; i <= seg; i++) {
          var a = i / seg * Math.PI * 2, rf = 1 + rough * Math.sin(a * 7 + t * 2.5) + rough * .6 * Math.sin(a * 13 - t * 4) + rough * .4 * Math.sin(a * 3 + 1), rr = rad * rf;
          pos.push(Math.sin(a) * rr, y + (o.bump || 0) * Math.sin(a * 5 + t * 3) * Math.sin(t * 9), Math.cos(a) * rr);
          var c = colorFn(t, a, y); col.push(c.r, c.g, c.b); uv.push(i / seg * 3, t * 2);
        }
      }
      for (var j = 0; j <= rings; j++) for (var i = 0; i < seg; i++) { var n = j * (seg + 1) + i; idx.push(n, n + 1, n + seg + 1, n + 1, n + seg + 2, n + seg + 1); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      var m = mesh(p, g, surface(0xffffff, type), x, 0, z); m.userData.kind = 'uvfixed'; return m;
    }
    var cA = new T.Color(), cB = new T.Color(), cOut = new T.Color();
    function mixHex(a, b, t) { cA.setHex(a); cB.setHex(b); return cOut.copy(cA).lerp(cB, Math.min(1, Math.max(0, t))); }
    function hedge(p, x1, z1, x2, z2, c) {
      var len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(-(z2 - z1), x2 - x1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, ca = Math.cos(ry), sa = Math.sin(ry), n = Math.max(2, Math.round(len / .8));
      box(p, surface(c || 0x5a9759, 'leaf'), mx, .26, mz, len, .52, .85, ry);
      for (var i = 0; i < n; i++) { var u = -len / 2 + (i + .5) * len / n; part(p, 'sphere', surface(c || 0x63a35f, 'leaf'), mx + u * ca, .56, mz - u * sa, .5, .34, .5); }
    }
    var tulipColors = [0xe5413f, 0xf5c542, 0xf08ab0, 0xe5413f];
    function turkishFlag(u, v) { var dx = u - .36, dy = (v - .5) * .67; var d1 = Math.hypot(dx, dy), d2 = Math.hypot(u - .42, (v - .5) * .67); if (d1 < .22 && d2 > .18) return 0xffffff; var sx = u - .62, sy = (v - .5) * .67; if (Math.hypot(sx, sy) < .075) return 0xffffff; return 0xe3242b; }
    function frenchFlag(u) { return u < .34 ? 0x2b4ea2 : u < .67 ? 0xfdfaf0 : 0xdd3a3a; }

    models.galata = function (p) {
      var stone = surface(0xd2bd9c, 'stone'), light = surface(0xeadcbf, 'stone'), dark = surface(0x4b413b, 'stone'), lead = surface(0x6c8791, 'roof'), gold = surface(GOLD, 'metal');
      pave(p, 0, 0, 4.3, 0xdccfae); ring(p, 0, 0, 4.3, 0xe8d49b);
      for (var c = 0; c < 28; c++) { var a = c / 28 * Math.PI * 2; box(p, surface(c % 2 ? 0xc9b48e : 0xe6d7b4, 'stone'), Math.sin(a) * 4.0, .1, Math.cos(a) * 4.0, .5, .08, .5, a); }
      profile(p, stone, [[2.68, 0], [2.68, .38], [2.44, .6], [2.36, .78], [2.36, 7.3], [2.54, 7.45], [2.74, 7.66], [2.78, 8.22]], 0, 0, 0); collider(p, 0, 0, 2.4);
      [2.2, 4.55, 6.85].forEach(function (y) { cyl(p, light, 0, y, 0, 2.42, .15); });
      for (var level = 0; level < 3; level++) for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + (level % 2) * .2; windowArch(p, Math.sin(a) * 2.34, 1.35 + level * 2.15 + (level === 2 ? .15 : 0), Math.cos(a) * 2.34, .55, .93, a); }
      for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2; box(p, light, Math.sin(a) * 2.58, 7.5, Math.cos(a) * 2.58, .22, .26, .26, a); }
      arch(p, surface(0xdccbab, 'stone'), 0, 0, 2.35, 1.15, 1.8, .14); box(p, surface(0x704b33, 'wood'), 0, .65, 2.4, .85, 1.3, .08); staircase(p, stone, 0, 3.0, 1.5, 3, .13, .27);
      // open gallery under the roof: dark core with slim pillars and a balcony rail
      cyl(p, dark, 0, 8.8, 0, 2.28, 1.15); cyl(p, light, 0, 8.22, 0, 2.8, .16); cyl(p, light, 0, 9.42, 0, 2.66, .17);
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; cyl(p, light, Math.sin(a) * 2.5, 8.8, Math.cos(a) * 2.5, .13, 1.15); }
      rails(p, surface(0x525b59, 'metal'), 2.72, 8.28, .5);
      profile(p, lead, [[2.9, 0], [2.96, .12], [2.55, .4], [1.85, 1.35], [1.1, 2.4], [.5, 3.2], [.3, 3.5], [0, 3.62]], 0, 9.5, 0);
      for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2 + .26, rr = 2.12, x = Math.sin(a) * rr, z = Math.cos(a) * rr;
        box(p, light, x, 10.28, z, .6, .55, .5, a); box(p, surface(0x3f7a99, 'glass'), x + Math.sin(a) * .26, 10.28, z + Math.cos(a) * .26, .32, .36, .05, a);
        part(p, 'pyr', surface(0x586f79, 'roof'), x, 10.5, z, .82, .42, .82, 0, a + Math.PI / 4, 0); }
      cyl(p, light, 0, 13.35, 0, .34, .5); for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; box(p, surface(0x394b57, 'glass'), Math.sin(a) * .33, 13.35, Math.cos(a) * .33, .16, .3, .04, a); }
      cone(p, lead, 0, 13.95, 0, .42, .7); sphere(p, gold, 0, 14.4, 0, .17); cyl(p, gold, 0, 14.9, 0, .035, .9);
      flag(p, 0, 14.65, 0, 1.2, 1.15, .75, turkishFlag, .4, .09);
      // life: tulips, lantern posts, circling gulls
      for (var i = 0; i < 9; i++) { var a = (i + .5) / 9 * Math.PI * 2 + .35; if (Math.cos(a) > .55) continue; var x = Math.sin(a) * 3.15, z = Math.cos(a) * 3.15; cyl(p, surface(0xa5724c, 'wood'), x, .17, z, .42, .3); tuft(p, x, z, tulipColors, 7, .2); }
      for (var i = 0; i < 3; i++) { var a = i * 2.1 + 1.1, x = Math.sin(a) * 4.6, z = Math.cos(a) * 4.6; cyl(p, surface(0x3f4a4c, 'metal'), x, 1.1, z, .06, 2.2); lantern(p, x, 2.45, z, 1.2); }
      bird(p, 0, 13.5, 0, 5.5, .35, 1.0); bird(p, 0, 15.4, 0, 4, -.45, .9); bird(p, 0, 11.6, 0, 7, .28, .9); bird(p, 1, 12.2, -1, 8.5, -.22, .8);
    };

    // Eiffel: corner girders follow one shared exponential curve so legs, platforms,
    // lattice and arches all line up.
    function eiffelW(y) { return .22 + 2.9 * Math.pow(Math.max(0, 1 - y / 14.2), 2.4); }
    models.eiffel = function (p) {
      var iron = [surface(0x88694f, 'metal'), surface(0x9a7a5d, 'metal'), surface(0xaf9070, 'metal')], gold = surface(GOLD, 'metal');
      function ir(y) { return iron[y < 3.6 ? 0 : y < 7.6 ? 1 : 2]; }
      var corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      corners.forEach(function (cn) { collider(p, cn[0] * 3.1, cn[1] * 3.1, .45);
        for (var y = 0; y < 14; y += .7) { var y2 = Math.min(14.2, y + .7), w1 = eiffelW(y), w2 = eiffelW(y2); line(p, ir(y), [cn[0] * w1, y, cn[1] * w1], [cn[0] * w2, y2, cn[1] * w2], .17 * (1 - y / 16) + .035); }
        box(p, surface(0x6f5a48, 'stone'), cn[0] * 3.1, .18, cn[1] * 3.1, .95, .36, .95);
      });
      // lattice faces above the arches: X braces + horizontals
      for (var side = 0; side < 4; side++) {
        var c1 = corners[side], c2 = corners[(side + 1) % 4];
        for (var y = 3.5; y < 13.8; y += .85) { var y2 = y + .85, w1 = eiffelW(y), w2 = eiffelW(y2), m = ir(y);
          var A1 = [c1[0] * w1, y, c1[1] * w1], B1 = [c2[0] * w1, y, c2[1] * w1], A2 = [c1[0] * w2, y2, c1[1] * w2], B2 = [c2[0] * w2, y2, c2[1] * w2];
          line(p, m, A1, B2, .032); line(p, m, B1, A2, .032); line(p, m, A2, B2, .04);
        }
      }
      // great arches between the feet: two parallel curves + rungs, on each face
      for (var side = 0; side < 4; side++) {
        var c1 = corners[side], c2 = corners[(side + 1) % 4], prevA = null, prevB = null;
        for (var s = 0; s <= 12; s++) { var ang = s / 12 * Math.PI, y = 3.15 * Math.pow(Math.sin(ang), .85), t = Math.cos(ang), w = eiffelW(y);
          var mx = (c1[0] + c2[0]) / 2, mz = (c1[1] + c2[1]) / 2, ex = (c2[0] - c1[0]) / 2, ez = (c2[1] - c1[1]) / 2;
          var P = [mx * w - ex * w * t * -1 * 1, y, mz * w - ez * w * t * -1]; P = [mx * w + ex * w * t * -1, y, mz * w + ez * w * t * -1];
          var Q = [mx * w * .9 + ex * w * t * -.9, Math.max(.05, y - .32), mz * w * .9 + ez * w * t * -.9];
          if (prevA) { line(p, iron[0], prevA, P, .08); line(p, iron[0], prevB, Q, .05); if (s % 2 === 0) line(p, iron[0], P, Q, .035); } prevA = P; prevB = Q; }
      }
      // platforms with railings and a ring of golden lamps
      [[3.45, 1.0], [7.45, .72], [11.3, .45]].forEach(function (pl, li) {
        var y = pl[0], w = eiffelW(y) + pl[1] * .55, m = li === 0 ? iron[0] : li === 1 ? iron[1] : iron[2];
        box(p, m, 0, y, 0, w * 2, .28, w * 2); box(p, surface(0xb89e7e, 'metal'), 0, y + .2, 0, w * 2.1, .09, w * 2.1);
        var n = li === 0 ? 7 : li === 1 ? 5 : 3;
        for (var q = 0; q < 4; q++) { var g = new T.Group(); g.rotation.y = q * Math.PI / 2; p.add(g); box(g, m, 0, y + .62, w + .05, w * 2.1, .06, .06);
          for (var k = 0; k <= n; k++) { var u = -w + k * (w * 2) / n; cyl(g, m, u, y + .42, w + .05, .03, .42); glowPart(g, 'sphere', surface(0xffe2a0, 'cloth'), u, y + .74, w + .05, .075, .075, .075, 1.2).userData.fx[2] = k * .9 + q; } }
      });
      cyl(p, iron[2], 0, 12.2, 0, .42, 1.6); cyl(p, iron[2], 0, 13.3, 0, .52, .22); cyl(p, iron[2], 0, 15.3, 0, .09, 3.8);
      for (var r = 0; r < 4; r++) cyl(p, surface(0xd0b690, 'metal'), 0, 13.7 + r * .55, 0, .13 - r * .01, .06);
      glowPart(p, 'sphere', surface(0xfff0b8, 'cloth'), 0, 17.3, 0, .2, .2, .2, 1.8); fx(p.children[p.children.length - 1], 1.8, -1, 0);
      flag(p, 0, 15.2, 0, 1.0, 1.1, .7, frenchFlag, 0, .1);
      // Champ de Mars: clipped hedges, flower beds, lamps, benches
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (s) { var x = s[0] * 7.2, z = s[1] * 7.2;
        hedge(p, x - 1.5, z, x + 1.5, z); hedge(p, x + s[0] * 1.2, z - s[1] * 2.3, x + s[0] * 1.2, z - s[1] * .3);
        tuft(p, x * .72, z * .72, [0xf27da0, 0xf5c542, 0xffffff], 9, .55); });
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(a) * 5.6, z = Math.cos(a) * 5.6; cyl(p, surface(0x2f3b3d, 'metal'), x, 1.1, z, .06, 2.2); lantern(p, x, 2.45, z, 1.2); }
      ring(p, 0, 0, 6.2, 0xe0cfa5); pave(p, 0, 0, 5.4, 0xd8cdb4, .06);
      spark(p, 0, 7.2, 0, 70, 5.5, 14, 5.5, 0xfff1b8, .26, 1, 2.2);
      bird(p, 0, 9, 0, 8, .3, .9, 0x8a8f95); bird(p, 0, 11, 0, 6, -.4, .8, 0xd7d3cf);
    };

    function camel(g, x, z, sc, col, blanket) {
      var body = surface(col || 0xd9b07a, 'cloth'), dk = surface(0xb68a58, 'cloth'), bl = surface(blanket || 0xd9483b, 'cloth');
      part(g, 'sphere', body, x, 1.3 * sc, z, .95 * sc, .5 * sc, .5 * sc); part(g, 'sphere', body, x - .6 * sc, 1.45 * sc, z, .55 * sc, .45 * sc, .45 * sc);
      part(g, 'sphere', dk, x - .1 * sc, 1.95 * sc, z, .32 * sc, .32 * sc, .3 * sc);
      line(g, body, [x + .75 * sc, 1.4 * sc, z], [x + 1.35 * sc, 2.2 * sc, z], .17 * sc); part(g, 'sphere', body, x + 1.55 * sc, 2.28 * sc, z, .32 * sc, .17 * sc, .16 * sc); sphere(g, dk, x + 1.82 * sc, 2.2 * sc, z, .11 * sc);
      sphere(g, dk, x + 1.45 * sc, 2.42 * sc, z + .1 * sc, .05 * sc); sphere(g, dk, x + 1.45 * sc, 2.42 * sc, z - .1 * sc, .05 * sc);
      [[.55, .22], [.55, -.22], [-.6, .22], [-.6, -.22]].forEach(function (l) { cyl(g, body, x + l[0] * sc, .55 * sc, z + l[1] * sc, .075 * sc, 1.1 * sc); sphere(g, dk, x + l[0] * sc, .05 * sc, z + l[1] * sc, .1 * sc, .06 * sc); });
      line(g, dk, [x - 1.4 * sc, 1.5 * sc, z], [x - 1.5 * sc, .75 * sc, z], .05 * sc);
      box(g, bl, x + .1 * sc, 1.72 * sc, z, .85 * sc, .09 * sc, 1.12 * sc); box(g, surface(0xf2d36b, 'cloth'), x + .1 * sc, 1.76 * sc, z, .85 * sc, .04 * sc, .22 * sc);
      box(g, bl, x + .1 * sc, 1.35 * sc, z + .52 * sc, .6 * sc, .5 * sc, .05 * sc); box(g, bl, x + .1 * sc, 1.35 * sc, z - .52 * sc, .6 * sc, .5 * sc, .05 * sc);
    }
    function palm(p, x, z, s) { tree(p, x, z, 0x5aa36a, s, true); }
    models.pyramids = function (p) {
      var sand = [surface(0xe3c891, 'sand'), surface(0xdcbb82, 'sand'), surface(0xe9d29f, 'sand')], soft = surface(0xe8cd92, 'cloth');
      part(p, 'cylinder', soft, 0, .03, 0, 9.6, .07, 8.0);
      [[-2.3, -1, 5.6, 8], [4.7, -4, 3.7, 5.8], [5, 3.2, 2.5, 3.8]].forEach(function (a, i) {
        var w = a[2] * Math.SQRT2, h = a[3], x = a[0], z = a[1];
        box(p, surface(0xd7bb86, 'sand'), x, .1, z, w * 1.07, .2, w * 1.07);
        part(p, 'pyr', sand[i], x, .18, z, w, h, w);
        part(p, 'pyr', surface(0xf3e2b3, 'sand'), x, .18 + h * .87, z, w * .13, h * .13, w * .13);
        glowPart(p, 'sphere', surface(0xffd766, 'cloth'), x, h + .24, z, .12, .12, .12, 1.4);
        box(p, surface(0x4a3b2c, 'stone'), x, .55, z + w * .5 * (1 - .4 / h) + .03, .6, .75, .1);
        collider(p, x, z, a[2]);
        spark(p, x, h + .5, z, 7, .8, .6, .8, 0xffe9a8, .24, 1, 2);
      });
      // dunes with soft grain, scattered stones, an oasis and a camel caravan
      [[-8.5, 6, 3.0, .9, 2.0], [8.5, 7.5, 3.2, 1.0, 2.2], [-8.5, -7, 2.8, .8, 2.2], [9, -8, 2.6, .7, 2.0]].forEach(function (d) { part(p, 'sphere', soft, d[0], -.2, d[1], d[2], d[3], d[4]); });
      for (var i = 0; i < 9; i++) { var a = i * 2.4, x = Math.sin(a) * 9.2, z = Math.cos(a) * 7.2; sphere(p, surface(0xc8a875, 'stone'), x, .1, z, .35 + (i % 3) * .12, .22); }
      palm(p, -8, 9.2, 1.1); palm(p, -9.6, 8, .9); palm(p, -7.1, 7.8, .8); part(p, 'cylinder', surface(0x6fbfc7, 'water'), -8.2, .08, 7.4, 2.0, .06, 1.2);
      var g = new T.Group(); g.userData.dynamic = true; g.position.set(-14, 0, 9.4); p.add(g);
      camel(g, 0, 0, .8, 0xd9b07a, 0xd9483b); camel(g, -2.7, 0, .75, 0xcfa56e, 0x3f7fb3); camel(g, -5.3, 0, .8, 0xdeb782, 0xe0a63a);
      line(g, surface(0x7a5a38, 'cloth'), [1.4, 1.5, 0], [-.6, 1.5, 0], .02); line(g, surface(0x7a5a38, 'cloth'), [-1.3, 1.45, 0], [-3.0, 1.4, 0], .02);
      batchMotion(g); animated.push({ type: 'caravan', object: g, x0: -15 });
      bird(p, 0, 13, 0, 9, .25, 1.0, 0x3a3532);
    };
    models.sphinx = function (p) {
      var sand = surface(0xd8b676, 'sand'), warm = surface(0xcda766, 'sand'), face = surface(0xdcbc80, 'leaf'), gold = surface(0xf2c53d, 'cloth'), blue = surface(0x3a6ea5, 'cloth'), dark = surface(0x5a4630, 'cloth');
      part(p, 'cylinder', surface(0xe8cd92, 'cloth'), 0, .03, 1.2, 7.5, .07, 8.5);
      box(p, surface(0xcdb07a, 'sand'), 0, .35, -.3, 3.9, .7, 6.2); box(p, surface(0xcdb07a, 'sand'), 0, .35, 4.6, 3.2, .7, 2.4);
      part(p, 'sphere', warm, 0, 1.5, -.9, 1.7, 1.45, 3.1);
      part(p, 'sphere', sand, 0, 2.25, 1.5, 1.35, 1.3, 1.5);
      [-1, 1].forEach(function (s) { box(p, sand, s * .95, .85, 3.9, .95, 1.0, 3.5); part(p, 'sphere', sand, s * .95, 1.28, 3.9, .5, .4, 1.8); part(p, 'sphere', warm, s * .95, .95, 5.5, .5, .38, .55); for (var t = -1; t <= 1; t++) box(p, surface(0xb49161, 'sand'), s * .95 + t * .24, .95, 5.96, .06, .26, .1); });
      part(p, 'cylinder', face, 0, 3.7, 2.15, .85, 1.5, .8);
      part(p, 'sphere', face, 0, 4.7, 2.3, .95, 1.1, .9); part(p, 'sphere', face, 0, 4.45, 2.85, .62, .75, .35);
      sphere(p, surface(0xcfa96a, 'leaf'), 0, 4.55, 3.12, .16, .2);
      [-1, 1].forEach(function (s) { box(p, dark, s * .32, 4.78, 3.08, .24, .1, .1); box(p, surface(0x1e1a16, 'cloth'), s * .32, 4.78, 3.14, .12, .05, .05);
        // nemes headdress: stripes of gold and blue falling beside the face
        for (var b = 0; b < 8; b++) box(p, b % 2 ? blue : gold, s * 1.12, 4.55 - b * .13 + .45, 2.05 + b * .06, .48, .13, 1.05 + b * .04); });
      for (var b = 0; b < 6; b++) box(p, b % 2 ? blue : gold, 0, 5.75 - b * .04, 2.2, 2.1 - b * .05, .12, 1.55); part(p, 'sphere', gold, 0, 5.8, 2.8, .35, .25, .5);
      box(p, gold, 0, 3.78, 3.0, .26, .5, .24); glowPart(p, 'sphere', gold, 0, 5.95, 3.08, .13, .17, .12, .8);
      box(p, surface(0xb6313a, 'cloth'), 0, 4.12, 3.12, .28, .08, .06);
      collider(p, 0, 0, 3.4); collider(p, -1, 4.1, 1.5); collider(p, 1, 4.1, 1.5);
      for (var i = 0; i < 5; i++) palm(p, -7 + i * .3, -6 + i * .8, .8 + (i % 2) * .15);
      bird(p, 0, 9, 0, 7, .3, .9, 0x3a3532); spark(p, 0, 3, 2.5, 8, 5, 4, 5, 0xffe6a0, .2, 1, 1.6);
    };

    function scaleUV(g, k) { var uv = g.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); return g; }
    function starGeo(R, r, n, depth) {
      var sh = new T.Shape(); for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : R, x = Math.sin(a) * rr, y = Math.cos(a) * rr; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      sh.closePath(); return scaleUV(new T.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: false }), .35);
    }
    function sailboat(g, hullColor, sailColor) {
      var hull = part(g, 'sphere', surface(hullColor, 'cloth'), 0, .1, 0, .38, .2, 1.2); box(g, surface(0xf3e8d0, 'cloth'), 0, .27, 0, .5, .08, 1.9); cyl(g, surface(0x8a6a48, 'wood'), 0, 1.3, .15, .04, 2.0);
      var sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 1.9); sh.lineTo(.95, 0); sh.closePath(); var sg = new T.ShapeGeometry(sh); sg.attributes.uv.array.fill(0);
      var sail = mesh(g, sg, surface(sailColor, 'cloth'), .04, .42, .15, 0, Math.PI / 2, 0); sail.userData.kind = 'uvfixed'; sail.castShadow = true;
      var fl = mesh(g, flagGeo(.55, .22, function (u) { return 0xe3453a; }, .05, 4, 1), surface(0xffffff, 'cloth'), 0, 2.32, .15, 0, Math.PI / 2, 0); fl.userData.kind = 'uvfixed';
    }
    function pagoda(p, x, z, s, tiers) {
      var g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
      var red = surface(0xd85a43, 'wood'), cream = surface(0xf6ecd5, 'stone'), roofC = 0x4d5e70;
      box(g, surface(0xb8aa92, 'stone'), 0, .15, 0, 3.4, .3, 3.4); box(g, surface(0xcbbd9f, 'stone'), 0, .4, 0, 3.0, .2, 3.0);
      for (var i = 0; i < tiers; i++) {
        var w = 2.5 - i * .38, y = .5 + i * 1.25;
        box(g, cream, 0, y + .45, 0, w, .9, w); for (var cx of [-1, 1]) for (var cz of [-1, 1]) cyl(g, red, cx * w * .5, y + .45, cz * w * .5, .08, .9);
        box(g, red, 0, y + .88, 0, w + .1, .1, w + .1); box(g, surface(0x6b4a3a, 'wood'), 0, y + .45, w * .5 + .02, w * .3, .55, .05);
        for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2; box(g, surface(0xf3c14c, 'cloth'), Math.sin(a) * w * .5 * .7, y + .12, Math.cos(a) * w * .5 + .02 * 0, .01, .01, .01); }
        eastRoof(g, roofC, 0, y + .92, 0, w, w, .55, .55, 0, .28);
      }
      var ty = .5 + tiers * 1.25; cyl(g, surface(GOLD, 'metal'), 0, ty + .55, 0, .06, 1.2); for (var r = 0; r < 4; r++) cyl(g, surface(GOLD, 'metal'), 0, ty + .1 + r * .22, 0, .2 - r * .035, .05);
      return g;
    }
    models.greatwall = function (p) {
      var pts = [[-6, 2], [-3, 0], [0, -1], [3, 0], [6, -2]], brick = surface(0xb9a68b, 'brick'), cap = surface(0xd4c5a8, 'stone'), plinth = surface(0x938068, 'stone'), dk = surface(0x3a322e, 'stone');
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, g = new T.Group(); g.position.set(mx, 0, mz); g.rotation.y = -Math.atan2(dz, dx); p.add(g);
        box(g, brick, 0, 1.4, 0, len + .3, 2.8, 1.6); box(g, plinth, 0, .14, 0, len + .5, .28, 1.95); box(g, cap, 0, 2.86, 0, len + .3, .12, 1.45);
        for (var side of [-1, 1]) { box(g, brick, 0, 3.12, side * .68, len + .3, .42, .26); crenel(g, brick, 0, 3.55, side * .68, len + .1, 0, Math.round((len + .1) / .8), .4, .46, .3);
          for (var k = 0; k < 3; k++) box(g, dk, -len * .33 + k * len * .33, 2.05, side * .81, .2, .46, .04);
          for (var k = 0; k < 2; k++) box(g, plinth, -len * .15 + k * len * .3, 1.4, side * .86, .3, 2.8, .12); }
        collider(p, mx, mz, 1.65);
      }
      for (var j = 0; j < pts.length; j++) { box(p, cap, pts[j][0], 3.2, pts[j][1], .9, .3, 1.9); box(p, brick, pts[j][0], 3.55, pts[j][1], .7, .45, 1.6); }
      var roofC = 0x587f6f;
      [-6, 0, 6].forEach(function (x, ti) {
        var z = x === -6 ? 2 : x === 6 ? -2 : -1, rot = ti === 0 ? -.45 : ti === 1 ? .2 : .45;
        var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot * .0; p.add(g);
        box(g, brick, 0, 1.75, 0, 2.7, 3.5, 2.7); box(g, plinth, 0, .14, 0, 3.0, .28, 3.0); box(g, cap, 0, 3.62, 0, 3.1, .26, 3.1);
        for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2, ca = Math.round(Math.cos(a)), sa = Math.round(Math.sin(a)); crenel(g, brick, ca * 1.45, 4.02, sa * 1.45, 3.0, -(a) + Math.PI / 2, 5, .42, .48, .3); }
        arch(g, surface(0xe7d8b8, 'stone'), 0, 0, 1.36, 1.15, 1.9, .14); box(g, surface(0xa8392f, 'wood'), 0, .8, 1.38, .9, 1.5, .08);
        [-.9, .9].forEach(function (w) { windowArch(g, w, 2.2, 1.36, .5, .85, 0); });
        box(g, surface(0xc5483a, 'wood'), 0, 4.75, 0, 2.0, 1.4, 2.0); for (var cx of [-1, 1]) for (var cz of [-1, 1]) cyl(g, surface(0x8f2f28, 'wood'), cx * 1.0, 4.75, cz * 1.0, .09, 1.4);
        for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2; box(g, dk, Math.sin(a) * 1.02, 4.8, Math.cos(a) * 1.02, a % Math.PI ? .05 : .62, .62, a % Math.PI ? .62 : .05); }
        eastRoof(g, roofC, 0, 5.45, 0, 2.0, 2.0, 1.15, .75, 0, .5); cyl(g, surface(GOLD, 'metal'), 0, 6.8, 0, .05, .7); sphere(g, surface(GOLD, 'metal'), 0, 7.2, 0, .1);
        lantern(g, -1.05, 4.15, 1.12, 1.2, 0xe03d2c); lantern(g, 1.05, 4.15, 1.12, 1.2, 0xe03d2c);
        flag(g, 1.35, 3.76, -1.3, 2.0, 1.25, .75, function (u, v) { return Math.hypot(u - .3, v - .5) < .16 ? 0xf5d44c : 0xd9362c; }, 0, .1);
        collider(p, x, z, 1.8);
      });
      bunting(p, [-6, 2.8, 1.45], [-3, 3.9, 0.9], 6, .5, [0xe5413f, 0xf5c542, 0xe5413f, 0xf5f0e0], .38);
      spark(p, 6, 8.0, -2, 9, .3, .3, .3, 0xe6e3dd, .9, 0, .9);
      for (var i = 0; i < 4; i++) { var x = -9 + i * 6, z = 6.5 + Math.sin(i) * .6; bush(p, x, z, .9, 0x5f9a62); tuft(p, x + 1.2, z + .4, [0xf27da0, 0xf5f0e0], 5, .3); }
      bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 3, 11, -1, 6, -.35, .9);
    };
    models.liberty = function (p) {
      var granite = surface(0xd2c6ac, 'stone'), patina = surface(0x75c4ae, 'metal'), deep = surface(0x4c9d88, 'metal'), lite = surface(0xa4dcc8, 'metal'), flame = surface(0xffc94a, 'cloth');
      box(p, WATER, 0, -.015, 0, 17, .035, 17); foam(p, 0, .1, 0, 12, 12);
      mesh(p, starGeo(5.9, 4.7, 11, .45), surface(0x9a8a72, 'stone'), 0, 0, 0, -Math.PI / 2, 0, 0); mesh(p, starGeo(5.3, 4.3, 11, .12), surface(0x86b878, 'leaf'), 0, .45, 0, -Math.PI / 2, 0, 0);
      cyl(p, surface(0x8bbd7d, 'leaf'), 0, .5, 0, 3.6, .1); collider(p, 0, 0, 2.8);
      box(p, granite, 0, 1.1, 0, 4.8, 1.0, 4.8); box(p, surface(0xe3d8bf, 'stone'), 0, 1.65, 0, 5.0, .16, 5.0);
      box(p, granite, 0, 2.5, 0, 3.9, 1.7, 3.9); box(p, surface(0xe3d8bf, 'stone'), 0, 3.4, 0, 4.1, .16, 4.1);
      box(p, granite, 0, 4.2, 0, 3.2, 1.7, 3.2); for (var c = -1.2; c <= 1.2; c += .8) cyl(p, surface(0xe7dcc4, 'stone'), c, 4.2, 1.7, .12, 1.5);
      box(p, surface(0xe3d8bf, 'stone'), 0, 5.15, 0, 3.7, .22, 3.7); staircase(p, granite, 0, 3.7, 2.2, 4, .16, .32);
      var S = 1.3, Y0 = 5.26;
      function Q(x, y, z) { return [x * S, y * S + Y0, z * S]; }
      profile(p, patina, [[.95, 0], [1.0, .15], [.85, .8], [.72, 1.7], [.64, 2.5], [.6, 3.1], [.5, 3.45], [.34, 3.65]], 0, Y0, 0, S, S, S);
      function robe(y) { var t = [[0, .95], [.8, .85], [1.7, .72], [2.5, .64], [3.1, .6]]; for (var i = 0; i < t.length - 1; i++) if (y <= t[i + 1][0]) return t[i][1] + (t[i + 1][1] - t[i][1]) * (y - t[i][0]) / (t[i + 1][0] - t[i][0]); return .55; }
      for (var f = 0; f < 11; f++) { var a = (f / 11) * Math.PI * 1.3 - .65 + Math.PI * .5 - Math.PI * .5; var y0 = .2, y1 = 3.0; line(p, deep, Q(Math.sin(a) * robe(y0) * 1.0, y0, Math.cos(a) * robe(y0) * 1.0), Q(Math.sin(a) * robe(y1) * 1.0, y1, Math.cos(a) * robe(y1)), .03 * S + .015); }
      line(p, lite, Q(.45, 3.3, .35), Q(-.55, 1.9, .55), .1 * S); part(p, 'sphere', patina, .38 * S, Y0 + .6 * S, .38 * S, .42 * S, .6 * S, .38 * S);
      // raised arm and torch
      var sh = Q(.5, 3.1, 0), el = Q(.95, 3.95, .05), ha = Q(1.2, 5.1, 0);
      sphere(p, patina, sh[0], sh[1], sh[2], .3 * S); line(p, patina, sh, el, .24 * S); sphere(p, patina, el[0], el[1], el[2], .24 * S); line(p, patina, el, ha, .2 * S);
      part(p, 'cone', deep, el[0] + .1, el[1] - .25 * S, el[2], .38 * S, .8 * S, .38 * S, Math.PI, 0, 0.0); sphere(p, patina, ha[0], ha[1], ha[2], .24 * S);
      var tp = Q(1.2, 5.5, 0); cyl(p, surface(0xcaa44a, 'metal'), tp[0], tp[1], tp[2], .1 * S, .9 * S); var tc = Q(1.2, 6.08, 0); part(p, 'cone', surface(0xd8b24f, 'metal'), tc[0], tc[1], tc[2], .42 * S, .38 * S, .42 * S, Math.PI, 0, 0); cyl(p, surface(0xd8b24f, 'metal'), tc[0], tc[1] + .22 * S, tc[2], .46 * S, .07 * S);
      var fl = Q(1.2, 6.65, 0); fx(part(p, 'cone', flame, fl[0], fl[1], fl[2], .32 * S, 1.0 * S, .32 * S), 1.7, .05, 1); fx(part(p, 'sphere', flame, fl[0], fl[1] - .3 * S, fl[2], .26 * S, .3 * S, .26 * S), 1.9, 0, 2);
      spark(p, fl[0], fl[1] + .3, fl[2], 14, .9, 1.2, .9, 0xffe08a, .3, 1, 2.4);
      // tablet arm
      var s2 = Q(-.5, 3.05, 0), e2 = Q(-.85, 2.3, .35), h2 = Q(-.7, 2.85, .85); sphere(p, patina, s2[0], s2[1], s2[2], .3 * S); line(p, patina, s2, e2, .22 * S); sphere(p, patina, e2[0], e2[1], e2[2], .22 * S); line(p, patina, e2, h2, .19 * S);
      var tb = Q(-.75, 2.75, .95); var tab = box(p, lite, tb[0], tb[1], tb[2], .85 * S, 1.15 * S, .14 * S); tab.rotation.set(-.25, .3, .12); var tab2 = box(p, deep, tb[0] + .02, tb[1], tb[2] + .09 * S, .66 * S, .9 * S, .03); tab2.rotation.copy(tab.rotation);
      // head, crown, face
      var hd = Q(0, 3.95, .05); part(p, 'sphere', patina, hd[0], hd[1], hd[2], .4 * S, .46 * S, .4 * S); cyl(p, deep, hd[0], hd[1] + .38 * S, hd[2], .43 * S, .08 * S);
      for (var r = 0; r < 7; r++) { var a = -Math.PI * .43 + r / 6 * Math.PI * .86, b0 = Q(Math.sin(a) * .38, 4.32 + Math.cos(a) * .1, .05), b1 = Q(Math.sin(a) * 1.05, 4.38 + Math.cos(a) * .95, .05); line(p, patina, b0, b1, .06 * S); sphere(p, surface(0xf3d36a, 'cloth'), b1[0], b1[1], b1[2], .06 * S); }
      var nz = Q(0, 3.9, .42); sphere(p, patina, nz[0], nz[1], nz[2], .07 * S); [-1, 1].forEach(function (sd) { var e = Q(sd * .14, 4.02, .38); box(p, surface(0x2c6b5e, 'metal'), e[0], e[1], e[2], .14 * S, .05 * S, .05 * S); }); var mo = Q(0, 3.78, .4); box(p, surface(0x3f8575, 'metal'), mo[0], mo[1], mo[2], .2 * S, .04 * S, .04 * S);
      // sailboat circling the island
      var bg = new T.Group(); bg.userData.dynamic = true; bg.position.set(6.5, .08, 0); p.add(bg); sailboat(bg, 0xc9473b, 0xfdf6e3); batchMotion(bg); animated.push({ type: 'orbit', object: bg, r: 6.6, s: .16 });
      bird(p, 0, 14, 0, 6, .4, 1.0); bird(p, 0, 12, 0, 8, -.3, .9); bird(p, 0, 16, 0, 5, .5, .8);
    };
    models.fuji = function (p) {
      mountain(p, 'rock', 0, 0, 8, 11.2, function (t, a) {
        var snow = .6 + .06 * Math.sin(a * 9 + 1) + .045 * Math.sin(a * 17 + 2.5) + .025 * Math.sin(a * 31), c;
        if (t < .12) c = mixHex(0x5f9a62, 0x6f9a8a, t / .12); else if (t < .3) c = mixHex(0x6f9a8a, 0x7a92b8, (t - .12) / .18); else c = mixHex(0x7a92b8, 0x8f9fc7, (t - .3) / .3);
        var gully = .93 + .07 * Math.sin(a * 23 + t * 5); c.multiplyScalar(gully);
        if (t > snow - .035) { var s = Math.min(1, (t - (snow - .035)) / .05); c = mixHex(c.getHex(), 0xffffff, s); c.multiplyScalar(1 + .16 * s); }
        return c;
      }, { k: 1.45, top: .075, rough: .035, bump: .05 });
      collider(p, 0, 0, 7.8);
      var cg = new T.Group(); cg.userData.dynamic = true; p.add(cg);
      [[-6, 6.2, -2.5, 1.8, .3, .9], [5.5, 7.8, -5, 1.6, .28, .8], [0, 9.8, -6.5, 1.9, .3, .9]].forEach(function (c) { part(cg, 'sphere', surface(0xffffff, 'cloth'), c[0], c[1], c[2], c[3], c[4], c[5]); part(cg, 'sphere', surface(0xf4f8ff, 'cloth'), c[0] + c[3] * .4, c[1] + .15, c[2], c[3] * .6, c[4] * 1.2, c[5] * .8); });
      batchMotion(cg); animated.push({ type: 'drift', object: cg, s: .035 });
      pagoda(p, 11.5, 5.5, .9, 5);
      part(p, 'cylinder', surface(0x7bc3d6, 'water'), 0, .035, 13.2, 5.5, .05, 2.6); [-1, 1].forEach(function (s) { part(p, 'sphere', surface(0xd9cfb7, 'stone'), s * 4.8, .1, 13, .4, .25, .4); });
      tree(p, -7.5, 6, 0xe8a4bb, .9); tree(p, 8, 9, 0xe8a4bb, .9); tree(p, 14.4, 7.4, 0xeea9c4, .9); tree(p, 9.1, 2.4, 0xf0b8cd, .8); tree(p, -9.5, 2, 0xf0b8cd, .75);
      spark(p, 8, 5, 6, 46, 12, 0, 9, 0xffc9de, .26, 2, .8); bird(p, 0, 14, 0, 9, .25, 1.0);
    };
    models.christ = function (p) {
      function jungle(t, a) { var c = t < .55 ? mixHex(0x5a9a63, 0x7aa56e, t / .55) : mixHex(0x7aa56e, 0xa7a392, (t - .55) / .3); return c.multiplyScalar(.95 + .08 * Math.sin(a * 17 + t * 7)); }
      mountain(p, 'rock', 0, 0, 5.2, 3.8, jungle, { k: 1.25, top: .5, rough: .06, bump: .12, rings: 14 }); collider(p, 0, 0, 4.3);
      for (var i = 0; i < 12; i++) { var a = i * 2.39, t = .08 + (i % 4) * .13, r = 5.2 * Math.pow(1 - t * .5, 1.25) * .93; part(p, 'foliage', surface(i % 3 ? 0x4f8f58 : 0x62a165, 'leaf'), Math.sin(a) * r, 3.8 * t + .55, Math.cos(a) * r, .85, .7, .85); }
      var white = surface(0xf1ede0, 'cloth'), shade = surface(0xd9d4c4, 'cloth');
      box(p, surface(0xe6e3d6, 'stone'), 0, 4.55, 0, 3.1, 1.4, 3.1); arch(p, surface(0xd7d3c4, 'stone'), 0, 3.85, 1.56, 1.0, 1.2, .1); box(p, surface(0x6b5a4a, 'wood'), 0, 4.45, 1.58, .7, 1.0, .06);
      staircase(p, surface(0xdad5c4, 'stone'), 0, 3.5, 1.8, 4, .12, .25); box(p, surface(0xe9e6d9, 'stone'), 0, 5.35, 0, 2.3, 1.2, 2.3); box(p, surface(0xdfdbcc, 'stone'), 0, 6.2, 0, 1.8, .6, 1.8);
      var Y0 = 6.5;
      profile(p, white, [[1.0, 0], [.92, .35], [.78, 1.9], [.72, 3.1], [.66, 3.9], [.45, 4.25]], 0, Y0, 0);
      for (var f = -4; f <= 4; f++) line(p, shade, [f * .13, Y0 + .3, .76 - Math.abs(f) * .03], [f * .08, Y0 + 3.7, .44], .025);
      part(p, 'sphere', white, 0, Y0 + 4.05, 0, 1.15, .45, .6);
      [-1, 1].forEach(function (s) {
        part(p, 'cone', white, s * 2.4, Y0 + 3.98, 0, .6, 3.4, .6, 0, 0, -s * Math.PI / 2); part(p, 'sphere', shade, s * 4.15, Y0 + 3.96, .02, .38, .17, .26);
        for (var fi = 0; fi < 4; fi++) box(p, shade, s * 4.45, Y0 + 3.95, fi * .11 - .17, .26, .04, .05);
        for (var dr = 0; dr < 4; dr++) line(p, shade, [s * (1 + dr * .7), Y0 + 3.62, .1], [s * (1.2 + dr * .72), Y0 + 3.2 - dr * .05, .1], .03);
      });
      part(p, 'cylinder', white, 0, Y0 + 4.4, 0, .34, .4, .34); part(p, 'sphere', white, 0, Y0 + 5.0, 0, .62, .72, .64); part(p, 'sphere', surface(0xd0cbbb, 'cloth'), 0, Y0 + 5.35, -.08, .64, .3, .64);
      box(p, surface(0x8b8578, 'cloth'), -.22, Y0 + 5.05, .58, .16, .06, .05); box(p, surface(0x8b8578, 'cloth'), .22, Y0 + 5.05, .58, .16, .06, .05); box(p, shade, 0, Y0 + 4.85, .62, .1, .2, .08);
      var cg = new T.Group(); cg.userData.dynamic = true; p.add(cg);
      [[-6, 13.5, -4, 1.7, .3, .9], [6.5, 12.5, -5, 1.6, .28, .9], [0, 15.2, -6, 1.8, .3, .9]].forEach(function (c) { part(cg, 'sphere', surface(0xffffff, 'cloth'), c[0], c[1], c[2], c[3], c[4], c[5]); part(cg, 'sphere', surface(0xf3f7ff, 'cloth'), c[0] + c[3] * .45, c[1] + .12, c[2], c[3] * .6, c[4] * 1.2, c[5] * .8); });
      batchMotion(cg); animated.push({ type: 'drift', object: cg, s: .04 });
      bird(p, 0, 13, 0, 5.5, .4, 1.0, 0x2c3238); bird(p, 0, 15, 0, 7, -.3, .9, 0x2c3238); bird(p, 0, 11, 0, 8, .22, .9, 0x2c3238);
      spark(p, 0, 11, 0, 14, 8.8, 3.2, 1.2, 0xfff3c2, .22, 1, 1.4);
    };

    function starShape(R, r, n) { var sh = new T.Shape(); for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : R, x = Math.sin(a) * rr, y = Math.cos(a) * rr; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); } sh.closePath(); return sh; }
    function redTower(p, x, z, w, h, roofH, ry, clock) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g);
      var red = surface(0xb9473a, 'brick'), trim = surface(0xf2e8d2, 'stone'), green = surface(0x3f9a78, 'roof');
      box(g, red, 0, h / 2, 0, w, h, w); box(g, trim, 0, .15, 0, w + .25, .3, w + .25); box(g, trim, 0, h * .5, 0, w + .12, .14, w + .12);
      for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2, ca = Math.round(Math.cos(a)), sa = Math.round(Math.sin(a)); for (var k = -1; k <= 1; k += 2) { var wg = new T.Group(); wg.rotation.y = a; g.add(wg); windowArch(wg, k * w * .22, h * .22, w / 2, .46, .85, 0); } }
      box(g, trim, 0, h - .05, 0, w + .6, .3, w + .6); for (var i = 0; i < 12; i++) { var u = -w / 2 - .15 + i * (w + .3) / 11; for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2; box(g, red, Math.cos(a) * (w / 2 + .3) * 0 + (q % 2 ? Math.round(Math.sin(a)) * (w / 2 + .3) : u), h - .45, (q % 2 ? u : Math.round(Math.cos(a)) * (w / 2 + .3)), .3, .5, .3); } }
      var w2 = w * .72; box(g, red, 0, h + .75, 0, w2, 1.2, w2); for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2; box(g, surface(0x3a2a24, 'stone'), Math.sin(a) * (w2 / 2 + .01), h + .8, Math.cos(a) * (w2 / 2 + .01), a % Math.PI ? .04 : .5, .66, a % Math.PI ? .5 : .04); }
      box(g, trim, 0, h + 1.4, 0, w2 + .2, .14, w2 + .2);
      cone(g, green, 0, h + 1.5 + roofH / 2, 0, w2 * .85, roofH); for (var r = 0; r < 8; r++) { var a = r / 8 * Math.PI * 2; line(g, surface(0xe9dfc4, 'stone'), [Math.sin(a) * w2 * .85, h + 1.5, Math.cos(a) * w2 * .85], [0, h + 1.5 + roofH, 0], .03); }
      cyl(g, surface(GOLD, 'metal'), 0, h + 1.5 + roofH + .5, 0, .05, 1.0);
      var st = new T.ExtrudeGeometry(starShape(.5, .22, 5), { depth: .12, bevelEnabled: false }); var sm = mesh(g, st, surface(0xe0302c, 'cloth'), 0, h + 1.5 + roofH + 1.0, -.06, 0, 0, 0); fx(sm, 1.5, -1, x); sm.userData.kind = 'uvfixed';
      if (clock) { var cf = cyl(g, surface(0xfff3d0, 'metal'), 0, h * .72, w / 2 + .05, w * .3, .1); cf.rotation.x = Math.PI / 2; line(g, surface(0x3b3128, 'metal'), [0, h * .72, w / 2 + .12], [w * .14, h * .72 + w * .08, w / 2 + .12], .04); line(g, surface(0x3b3128, 'metal'), [0, h * .72, w / 2 + .12], [0, h * .72 + w * .22, w / 2 + .12], .035); }
      return g;
    }
    function snowman(p, x, z) {
      var sn = surface(0xffffff, 'snow'); sphere(p, sn, x, .5, z, .52); sphere(p, sn, x, 1.2, z, .38); sphere(p, sn, x, 1.72, z, .28);
      part(p, 'cone', surface(0xf08a2c, 'cloth'), x, 1.72, z + .34, .05, .3, .05, Math.PI / 2, 0, 0); box(p, surface(0x2c2c30, 'cloth'), x, 2.0, z, .5, .1, .5); cyl(p, surface(0x2c2c30, 'cloth'), x, 2.2, z, .22, .35);
      box(p, surface(0x3f7fc4, 'cloth'), x, 1.45, z + .05, .62, .12, .55); sphere(p, surface(0x222222, 'cloth'), x - .09, 1.78, z + .25, .03); sphere(p, surface(0x222222, 'cloth'), x + .09, 1.78, z + .25, .03);
    }
    models.square = function (p) {
      var cobble = surface(0xb5675a, 'brick');
      box(p, cobble, 0, .04, 0, 17, .08, 14); ring(p, 0, 0, 4, GOLD);
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; box(p, GOLD, Math.sin(a) * 4, 0.09, Math.cos(a) * 4, 0.6, 0.08, 0.6, a); }
      var st = mesh(p, new T.ExtrudeGeometry(starShape(3.3, 1.35, 5), { depth: .05, bevelEnabled: false }), surface(0xcf3a30, 'cloth'), 0, .085, 0, -Math.PI / 2, Math.PI, 0); st.userData.kind = 'uvfixed';
      var st2 = mesh(p, new T.ExtrudeGeometry(starShape(1.0, .42, 5), { depth: .04, bevelEnabled: false }), surface(0xf3c04a, 'cloth'), 0, .14, 0, -Math.PI / 2, Math.PI, 0); fx(st2, .6, 0, 0); st2.userData.kind = 'uvfixed';
      // red brick Kremlin wall backdrop with swallowtail crowns and tents
      var red = surface(0xb9473a, 'brick'), trim = surface(0xf2e8d2, 'stone');
      box(p, red, 0, 1.7, -7.6, 18, 3.4, 1.1); box(p, trim, 0, 3.45, -7.6, 18, .14, 1.3);
      crenel(p, red, 0, 3.95, -7.6, 18, 0, 20, .5, .8, .5); for (var i = 0; i < 20; i++) part(p, 'pyr', trim, -9 + (i + .5) * .9, 4.35, -7.6, .4, .22, .4);
      redTower(p, 0, -7.6, 2.6, 5.4, 2.8, 0, true); redTower(p, -7.2, -7.6, 1.7, 3.8, 1.9, 0, false); redTower(p, 7.2, -7.6, 1.7, 3.8, 1.9, 0, false);
      for (var lamp of [-4.8, 4.8]) { cyl(p, surface(0x574a41, 'metal'), lamp, 1.45, -4, .065, 2.9); fx(sphere(p, surface(0xffe8a2, 'glass'), lamp, 3, -4, .25, .32), 1.0, 0, lamp); cone(p, surface(0x67533d, 'metal'), lamp, 3.38, -4, .34, .18); }
      bunting(p, [-4.8, 3.0, -4], [4.8, 3.0, -4], 12, .6, [0xe5413f, 0xf5f0e0, 0x3f7fc4, 0xf5c542], .4);
      bench(p, -5.5, 0, Math.PI / 2); bench(p, 5.5, 0, -Math.PI / 2); snowman(p, -7, 3.2); snowman(p, 7.4, 4);
      for (var tile = 0; tile < 16; tile++) { var a = tile / 16 * Math.PI * 2; box(p, surface(0xe4bea0, 'stone'), Math.sin(a) * 4.9, .10, Math.cos(a) * 4.9, .43, .035, .65, a); }
      spark(p, 0, 1.5, 0, 22, 8, 2, 8, 0xfff0c0, .2, 1, 1.8); bird(p, 0, 9, -4, 6, .35, .9, 0x4a4a52);
    };
    models.kremlin = function (p) {
      var red = surface(0xb9473a, 'brick'), trim = surface(0xf2e8d2, 'stone'), dk = surface(0x3a2a24, 'stone');
      box(p, red, 0, 1.7, 0, 12, 3.4, 1.2); box(p, trim, 0, 3.45, 0, 12, .14, 1.4); box(p, surface(0x8d6a5a, 'stone'), 0, .14, 0, 12.2, .28, 1.5);
      crenel(p, red, 0, 3.95, 0, 12, 0, 13, .5, .8, .5); for (var i = 0; i < 13; i++) part(p, 'pyr', trim, -6 + (i + .5) * 12 / 13, 4.35, 0, .4, .22, .4);
      for (var k = -2; k <= 2; k++) box(p, dk, k * 2.4 + 1.2, 2.2, .61, .2, .55, .04);
      [-5, 0, 5].forEach(function (x, i) { redTower(p, x, 0, i === 1 ? 2.4 : 2.2, i === 1 ? 6.4 : 5.6, i === 1 ? 3.2 : 2.9, 0, i === 1); collider(p, x, 0, 1.7); });
      collider(p, -2.5, 0, 1.4); collider(p, 2.5, 0, 1.4);
      flag(p, 3.2, 3.5, 0, 2.2, 1.3, .8, function (u, v) { return v < .34 ? 0xfdfaf0 : v < .67 ? 0x2b4ea2 : 0xdd3a3a; }, 0, .1);
      for (var i = 0; i < 5; i++) { var x = -8 + i * 4; tuft(p, x, 3.4, [0xf5f0e0, 0xe8a4bb], 4, .3); }
      spark(p, 0, 9, 0, 8, 12, 1, 1, 0xdedcda, .6, 0, .8); bird(p, 0, 11, 0, 8, .3, 1.0, 0x4a4a52);
    };
    models.cntower = function (p) {
      var conc = surface(0xdadbd6, 'snow'), steel = surface(0xcfd6d8, 'metal'), glass = surface(0x4f93b8, 'glass');
      profile(p, conc, [[1.15, 0], [.95, 2.5], [.72, 6], [.58, 10], [.5, 12.6]], 0, 0, 0); collider(p, 0, 0, .8);
      for (var f = 0; f < 3; f++) { var sh = new T.Shape(); sh.moveTo(.5, 0); sh.lineTo(2.7, 0); sh.lineTo(2.3, .4); sh.lineTo(1.0, 6.4); sh.lineTo(.5, 6.8); sh.closePath(); var g = new T.ExtrudeGeometry(sh, { depth: .6, bevelEnabled: false }); g.translate(0, 0, -.3); scaleUV(g, .35); var m = mesh(p, g, conc, 0, 0, 0, 0, f * Math.PI * 2 / 3, 0); m.userData.kind = 'uvfixed'; }
      for (var y = 1.5; y < 12; y += 1.5) cyl(p, surface(0xc3c7c2, 'snow'), 0, y, 0, 1.1 - y * .05 + .02, .08);
      var Y = 12.3;
      profile(p, surface(0xe3e5e0, 'snow'), [[0, 0], [1.3, 0], [1.9, .25], [2.3, .65], [2.36, 1.0], [2.12, 1.28], [1.6, 1.48], [1.0, 1.58], [0, 1.62]], 0, Y, 0);
      cyl(p, glass, 0, Y + .72, 0, 2.38, .34); cyl(p, glass, 0, Y + .3, 0, 2.0, .16);
      for (var i = 0; i < 22; i++) { var a = i / 22 * Math.PI * 2; fx(part(p, 'sphere', surface(0xfff1c0, 'cloth'), Math.sin(a) * 2.1, Y + .02, Math.cos(a) * 2.1, .06, .06, .06), 1.3, 0, i * .6); }
      cyl(p, steel, 0, Y + 1.9, 0, .38, .6); cyl(p, surface(0xe3e5e0, 'snow'), 0, Y + 2.7, 0, .7, 1.0); cyl(p, glass, 0, Y + 2.62, 0, .72, .36); cyl(p, steel, 0, Y + 3.25, 0, .6, .1);
      profile(p, surface(0xe8e9e4, 'metal'), [[.34, 0], [.2, 2.5], [.12, 5.8]], 0, Y + 3.3, 0);
      for (var r = 0; r < 5; r++) cyl(p, r % 2 ? surface(0xd8332b, 'cloth') : surface(0xf5f5f0, 'cloth'), 0, Y + 4.1 + r * 1.0, 0, .2 - r * .022, .5);
      fx(part(p, 'sphere', surface(0xff3b30, 'cloth'), 0, Y + 9.35, 0, .17, .17, .17), 1.9, -1, 0); fx(part(p, 'sphere', surface(0xff3b30, 'cloth'), 0, Y + 7.2, 0, .12, .12, .12), 1.6, -1, 2);
      ring(p, 0, 0, 3.7, 0xe3cd9d); staircase(p, surface(0xd1d2c0, 'stone'), 0, 2.6, 1.8, 4, .12, .25); windowArch(p, 0, .2, .9, .65, 1.6);
      pave(p, 0, 0, 3.3, 0xe3dfd2, .06);
      spark(p, 0, Y + 1, 0, 24, 6, 3, 6, 0xffffff, .24, 1, 2); bird(p, 0, 9, 0, 6.5, .35, 1.0, 0x666b72); bird(p, 0, 16, 0, 5, -.4, .9, 0x666b72);
    };
    models.atomium = function (p) {
      var steel = surface(0xe6eef0, 'metal'), tube = surface(0xbdd0d4, 'metal'), seam = surface(0x8fa7ae, 'metal'), win = surface(0xaee3ff, 'cloth');
      var nodes = [[0, 6.5, 0]];
      for (var x = -1; x <= 1; x += 2) for (var y = -1; y <= 1; y += 2) for (var z = -1; z <= 1; z += 2) nodes.push([x * 2.5, 6.5 + y * 2.5, z * 2.5]);
      nodes.forEach(function (a, i) {
        part(p, 'sphere', steel, a[0], a[1], a[2], 1.15, 1.15, 1.15); if (i) line(p, tube, nodes[0], a, .14);
        mesh(p, new T.TorusGeometry(1.154, .018, 4, 36), seam, a[0], a[1], a[2], Math.PI / 2);
        for (var k = 0; k < 8; k++) { var an = k / 8 * Math.PI * 2 + i; fx(part(p, 'sphere', win, a[0] + Math.sin(an) * 1.13, a[1] + .02, a[2] + Math.cos(an) * 1.13, .1, .1, .06), .45, 0, i + k); }
        if (i % 2 === 0) box(p, surface(0x80b4cb, 'glass'), a[0], a[1] + .5, a[2] + 1.0, .58, .17, .035);
      });
      for (var i = 1; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) { var d = 0; for (var k = 0; k < 3; k++) if (nodes[i][k] !== nodes[j][k]) d++; if (d === 1) { line(p, tube, nodes[i], nodes[j], .15); for (var s = 1; s < 4; s++) { var t = s / 4; fx(part(p, 'sphere', win, nodes[i][0] + (nodes[j][0] - nodes[i][0]) * t, nodes[i][1] + (nodes[j][1] - nodes[i][1]) * t + .16, nodes[i][2] + (nodes[j][2] - nodes[i][2]) * t, .05, .05, .05), .8, 0, s + i); } } }
      line(p, surface(0x889c9a, 'metal'), [0, 0, 0], nodes[0], .38); collider(p, 0, 0, .65);
      for (var brace = 0; brace < 3; brace++) { var a = brace / 3 * Math.PI * 2; line(p, surface(0xadc2c6, 'metal'), [Math.sin(a) * 3.2, 0, Math.cos(a) * 3.2], [0, 4, 0], .11); }
      ring(p, 0, 0, 5, 0xe3cd9d); pave(p, 0, 0, 3.7, 0xd8dbca, .18);
      spark(p, 0, 6.5, 0, 60, 7.5, 7.5, 7.5, 0xffffff, .3, 1, 2.6); bird(p, 0, 12, 0, 7, .3, .9, 0x7c8288);
    };

    function gothic(p, c, x, y, z, w, h, depth, ry) {
      function path(o, i) { var a = w / 2 - i, k = h - w * .5; o.moveTo(-a, i); o.lineTo(a, i); o.lineTo(a, k); o.quadraticCurveTo(a, k + (h - i - k) * .6, 0, h - i); o.quadraticCurveTo(-a, k + (h - i - k) * .6, -a, k); o.lineTo(-a, i); }
      var sh = new T.Shape(); path(sh, 0); var hole = new T.Path(); path(hole, .16); sh.holes.push(hole);
      var m = mesh(p, scaleUV(new T.ExtrudeGeometry(sh, { depth: depth || .2, bevelEnabled: false, curveSegments: 8 }), .35), c, x, y, z, 0, ry || 0, 0); m.userData.kind = 'uvfixed'; return m;
    }
    function balloon(g, x, y, z, cols, s) {
      var geo = new T.SphereGeometry(1, 16, 12), pa = geo.attributes.position;
      for (var i = 0; i < pa.count; i++) { var yy = pa.getY(i), k = yy < 0 ? 1 + yy * .42 : 1; pa.setXYZ(i, pa.getX(i) * k * s, yy * 1.12 * s, pa.getZ(i) * k * s); }
      geo = geo.toNonIndexed(); geo.computeVertexNormals(); var pos = geo.attributes.position, col = [], c = new T.Color();
      for (var t = 0; t < pos.count; t += 3) { var ax = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)), az = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)), band = Math.floor((Math.atan2(ax, az) + Math.PI) / (Math.PI * 2) * 16) % cols.length; c.setHex(cols[band]); for (var q = 0; q < 3; q++) col.push(c.r, c.g, c.b); }
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); var m = mesh(g, geo, surface(0xffffff, 'cloth'), x, y + 1.3 * s, z); m.userData.kind = 'uvfixed';
      box(g, surface(0x9e6b44, 'wood'), x, y - .25 * s * 1.2 - .1, z, .55 * s, .4 * s, .55 * s);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { line(g, surface(0xe9dfc8, 'cloth'), [x + q[0] * .24 * s, y - .1, z + q[1] * .24 * s], [x + q[0] * .5 * s, y + .65 * s, z + q[1] * .5 * s], .014); });
      fx(part(g, 'sphere', surface(0xffb347, 'cloth'), x, y + .02, z, .09, .1, .09), 1.2, 0, x);
    }
    models.suspension = function (p) {
      var steel = surface(0xe3ebe9, 'metal'), red = surface(0xd9473a, 'metal');
      box(p, WATER, 0, 0.01, 0, 20, .06, 9); box(p, surface(0xcdb78f, 'sand'), 0, .08, -4.7, 20, .2, 1.0); box(p, surface(0xcdb78f, 'sand'), 0, .08, 4.7, 20, .2, 1.0);
      box(p, surface(0x7d8a8a, 'metal'), 0, 2.1, 0, 17, .3, 2.1); box(p, surface(0x333b3d, 'stone'), 0, 2.27, 0, 17, .02, 1.5);
      for (var s2 = -1; s2 <= 1; s2 += 2) { box(p, steel, 0, 2.7, s2 * 1.0, 17, .08, .07); }
      [-4.5, 4.5].forEach(function (x) {
        [-1.15, 1.15].forEach(function (z) { box(p, steel, x, 4.5, z, .5, 9, .45); collider(p, x, z, .38); box(p, red, x, .5, z, .52, 1.0, .47); });
        for (var by of [4.6, 6.4, 8.2]) box(p, steel, x, by, 0, .42, .38, 2.7);
        fx(part(p, 'sphere', surface(0xff3b30, 'cloth'), x, 9.25, -1.15, .13, .13, .13), 1.8, -1, x); fx(part(p, 'sphere', surface(0xff3b30, 'cloth'), x, 9.25, 1.15, .13, .13, .13), 1.8, -1, x + 1.5);
      });
      for (var z of [-1.15, 1.15]) {
        function cy(x) { var a = Math.abs(x); return a <= 4.5 ? 3.0 + 5.9 * Math.pow(a / 4.5, 2) : 8.9 - 6.2 * (a - 4.5) / 4.0; }
        var prev = null; for (var i = 0; i <= 34; i++) { var x = -8.5 + i * 17 / 34, q = [x, cy(x), z]; if (prev) line(p, steel, prev, q, .07); prev = q; if (i % 2 === 0 && Math.abs(x) < 8.4) line(p, steel, [x, 2.3, z], q, .018); }
      }
      for (var l = 0; l < 20; l++) fx(part(p, 'sphere', surface(0xffe9b0, 'cloth'), -8.2 + l * .86, 2.82, l % 2 ? .95 : -.95, .06, .06, .06), 1.1, 0, l);
      var ferry = new T.Group(); ferry.userData.dynamic = true; ferry.position.set(-9, .1, 2.8); p.add(ferry);
      var hull = part(ferry, 'sphere', surface(0xf5f0e4, 'cloth'), 0, .22, 0, 1.7, .32, .6); box(ferry, surface(0xd9473a, 'cloth'), 0, .2, 0, 3.2, .1, 1.0); box(ferry, surface(0xf9f6ee, 'cloth'), 0, .6, 0, 2.2, .45, .85); box(ferry, surface(0x5aa3c7, 'cloth'), 0, .66, .43, 1.9, .2, .03); box(ferry, surface(0xf9f6ee, 'cloth'), -.1, 1.0, 0, 1.2, .35, .7);
      cyl(ferry, surface(0xd9473a, 'cloth'), .4, 1.35, 0, .16, .5); cyl(ferry, surface(0x2a2a2e, 'cloth'), .4, 1.62, 0, .17, .08); spark(ferry, .4, 1.8, 0, 1, 0, 0, 0, 0xffffff, 0, 0, 1);
      batchMotion(ferry); animated.push({ type: 'caravan', object: ferry, x0: -8.5, len: 17, dz: 0 });
      for (var h = -1; h <= 1; h += 2) for (var i = 0; i < 4; i++) { var hx = h * (7.2 + i * .7), hz = h * 0 - 4.9 + (i % 2) * .3; box(p, surface([0xf0e0c4, 0xe7b987, 0xd7c9b0, 0xf2d6a0][i], 'stone'), hx, .5 + .25 * i % 2, hz - .2, .7, .9, .6); part(p, 'pyr', surface(0xc45a42, 'roof'), hx, .95 + .25 * i % 2, hz - .2, .92, .4, .8); }
      foam(p, 0, .1, 0, 18, 6); bird(p, 0, 7, 0, 7, .35, 1.0); bird(p, 0, 9, 0, 5, -.5, .9); bird(p, 3, 6, 0, 8, .28, .8);
    };
    models.brooklyn = function (p) {
      var stone = surface(0xb99a7c, 'stone'), lite = surface(0xd2b99a, 'stone'), steel = surface(0x4f5557, 'metal');
      box(p, WATER, 0, 0.01, 0, 20, .06, 9); box(p, surface(0x7b7468, 'stone'), 0, 2.1, 0, 17, .3, 2.2); box(p, surface(0xa3825c, 'wood'), 0, 2.28, 0, 17, .04, .9); box(p, surface(0x3a3f41, 'stone'), 0, 2.27, 1.0, 17, .02, .5); box(p, surface(0x3a3f41, 'stone'), 0, 2.27, -1.0, 17, .02, .5);
      [-4.5, 4.5].forEach(function (x) {
        [-1.15, 1.15].forEach(function (z) { box(p, stone, x, 4, z, 1.0, 8, .8); box(p, lite, x, .15, z, 1.2, .3, 1.0); collider(p, x, z, .6); });
        for (var by of [6.2, 7.9]) box(p, lite, x, by, 0, 1.2, .16, 3.2);
        for (var sd of [-1, 1]) { gothic(p, stone, x - .5, 3.0, sd * 1.15 - .1, 1.0, 3.0, .2, 0); gothic(p, stone, x - .5, 6.3, sd * 1.15 - .1, .9, 1.5, .2, 0); }
        box(p, stone, x, 8.5, 0, 1.2, .9, 3.2); for (var q = -1; q <= 1; q += 2) { part(p, 'pyr', surface(0x6c7a72, 'roof'), x, 8.95, q * 1.15, 1.1, .7, .9); }
        box(p, lite, x, 9.0, 0, 1.0, .12, 3.0);
      });
      function cy(x) { var a = Math.abs(x); return a <= 4.5 ? 3.0 + 5.4 * Math.pow(a / 4.5, 2) : 8.4 - 5.9 * (a - 4.5) / 4.0; }
      for (var z of [-1.15, 1.15]) {
        var prev = null; for (var i = 0; i <= 36; i++) { var x = -8.5 + i * 17 / 36, q = [x, cy(x), z]; if (prev) line(p, steel, prev, q, .06); prev = q; }
        for (var t of [-4.5, 4.5]) for (var k = 1; k <= 8; k++) { var dir = t > 0 ? 1 : -1, xe = t + dir * -k * .52; if (Math.abs(xe) < 8.4) line(p, steel, [t, 8.0, z], [xe + dir * 0, 2.35, z], .018); var xo = t + dir * k * .52; if (Math.abs(xo) < 8.4) line(p, steel, [t, 8.0, z], [xo, 2.35, z], .018); }
      }
      for (var s2 = -1; s2 <= 1; s2 += 2) { for (var post = 0; post < 20; post++) cyl(p, surface(0x9aa3a3, 'metal'), -8.2 + post * .86, 2.55, s2 * 1.05, .02, .62); box(p, surface(0x9aa3a3, 'metal'), 0, 2.85, s2 * 1.05, 17, .06, .06); }
      flag(p, 4.5, 9.05, 0, 1.4, 1.3, .8, function (u, v) { if (u < .42 && v < .55) return ((Math.floor(u * 12) + Math.floor(v * 12)) % 2) ? 0x2a3f86 : 0xffffff; return Math.floor(v * 7) % 2 ? 0xffffff : 0xd33a3a; }, .5, .1);
      for (var l = 0; l < 10; l++) fx(part(p, 'sphere', surface(0xffe7a8, 'cloth'), -7.5 + l * 1.7, 2.9, 0, .07, .07, .07), 1.0, 0, l);
      var boat = new T.Group(); boat.userData.dynamic = true; boat.position.set(-9, .1, 3); p.add(boat); sailboat(boat, 0x2f5f8f, 0xfdf6e3); boat.rotation.y = Math.PI / 2; batchMotion(boat); animated.push({ type: 'caravan', object: boat, x0: -8.5, len: 17 });
      foam(p, 0, .1, 0, 18, 6); bird(p, 0, 11, 0, 7, .3, 1.0); bird(p, 0, 9, 0, 5.5, -.45, .9);
    };
    models.cappadocia = function (p) {
      var tuff = surface(0xeabf9a, 'cloth'), cap = surface(0x8f6a4c, 'cloth'), cave = surface(0x3a2a22, 'stone'), band = surface(0xd69c78, 'cloth');
      part(p, 'cylinder', surface(0xe6c3a0, 'cloth'), 0, .03, .5, 11.5, .07, 9.5);
      [[-3, 0, 2.2, 6], [1.5, -2, 1.7, 7], [3.8, 2.5, 1.6, 4.8], [-1, 3.7, 1.35, 4], [-5.6, -3.8, 1.3, 5.2], [6.2, -3.3, 1.2, 3.6]].forEach(function (s, i) {
        var R = s[2] * .85, H = s[3] * 1.2;
        profile(p, tuff, [[R * 1.2, 0], [R * 1.05, .3], [R * .8, H * .3], [R * .6, H * .58], [R * .5, H * .82], [R * .44, H]], s[0], 0, s[1]);
        function rr(y) { return y < .3 ? R * 1.1 : y < H * .3 ? R * (1.05 - .25 * (y - .3) / (H * .3 - .3)) : y < H * .58 ? R * (.8 - .2 * (y - H * .3) / (H * .28)) : R * (.6 - .16 * (y - H * .58) / (H * .42)); }
        for (var bn = 1; bn < 4; bn++) { var by = H * bn * .22; cyl(p, band, s[0], by, s[1], rr(by) + .03, .1); }
        profile(p, cap, [[R * .62, 0], [R * .68, .1], [R * .5, .5], [R * .22, .95], [0, 1.2]], s[0], H - .05, s[1]);
        for (var w = 0; w < 3; w++) { var a = .4 + w * 1.4 + i, y = H * (.18 + w * .2), r2 = rr(y); var ew = part(p, 'sphere', cave, s[0] + Math.sin(a) * r2, y, s[1] + Math.cos(a) * r2, .2, .3, .09); ew.rotation.y = a; var fr = box(p, surface(0xf2d9bf, 'cloth'), s[0] + Math.sin(a) * (r2 + .02), y + .38, s[1] + Math.cos(a) * (r2 + .02), .5, .09, .1, a); }
        if (i < 4) collider(p, s[0], s[1], s[2] * .6);
      });
      for (var j = 0; j < 8; j++) { var a = j * 2.1, x = Math.sin(a) * 9, z = Math.cos(a) * 7; part(p, 'sphere', surface(0xcaa27a, 'cloth'), x, .2, z, .8 + (j % 3) * .3, .5, .7); }
      [[0xf16455, 0xffd55b, 0x70cddd, 0xf29cbf], [0x4f86d6, 0xffffff, 0xf2a23c], [0x58b368, 0xf5e07a, 0xe86a9b, 0xffffff]].forEach(function (cols, bi) {
        var bg = new T.Group(); bg.userData.dynamic = true; bg.position.set(-3 + bi * 4.5, 10.5 + bi * 1.4, -2 + bi * 2); p.add(bg); balloon(bg, 0, 0, 0, cols, 1.45 - bi * .1); batchMotion(bg); animated.push({ type: 'float', object: bg, y: bg.position.y, phase: bi * 2.1 });
      });
      bird(p, 0, 12, 0, 10, .2, .9, 0xf2f0ea); bird(p, 0, 9, 0, 8, -.3, .8, 0xf2f0ea);
    };

    function sail(p, x, y, z, R, phiLen, thetaLen, face, tiltX, tiltZ) {
      var gg = new T.Group(); gg.position.set(x, y, z); gg.rotation.y = face; p.add(gg);
      var g = new T.SphereGeometry(R, 18, 10, Math.PI / 2 - phiLen / 2, phiLen, 0, thetaLen), m = mesh(gg, g, surface(0xfaf6ea, 'ceramic'), 0, 0, 0, tiltX, 0, tiltZ); m.userData.kind = 'uvfixed'; scaleUV(g, R * .5); return m;
    }
    models.opera = function (p) {
      box(p, surface(0x82b9c6, 'water'), 0, -.005, 0, 30, .03, 24); box(p, surface(0xcdb48c, 'stone'), 0, .25, 0, 20, .5, 14);
      box(p, surface(0x7fa6b3, 'glass'), -4.2, 1.35, 0, 7.5, 1.6, 6.2); box(p, surface(0x7fa6b3, 'glass'), 4.8, 1.2, 0, 6.2, 1.3, 5.2);
      [[-4.9, 1, 5.0, 0], [-3.4, 1, 4.1, 0], [-1.9, 1, 3.3, 0], [-4.9, -1, 4.6, Math.PI], [-3.4, -1, 3.8, Math.PI], [-2.0, -1, 3.0, Math.PI],
       [3.5, 1, 3.7, 0], [4.9, 1, 3.0, 0], [3.7, -1, 3.5, Math.PI], [5.0, -1, 2.8, Math.PI]].forEach(function (s, i) {
        sail(p, s[0], .5, s[1] * 1.3, s[2], 1.55, 1.38, s[3], -.52 - i % 3 * .05, (i % 2 ? .12 : -.12));
      });
      sail(p, 8.3, .5, 1.6, 1.8, 1.4, 1.35, .5, -.5, 0);
      mesh(p, new T.TorusGeometry(2.0, .03, 4, 24, Math.PI), surface(0xe3d9c4, 'stone'), 0, .5, 7.1, 0, 0, 0);
      collider(p, 0, 0, 6);
      for (var j = 0; j < 10; j++) box(p, surface(0xd7c1a0, 'stone'), 0, .05 + j * .05, 7 + j * .2, 18, .1, 2 - j * .12);
      for (var i = 0; i < 8; i++) lantern(p, -7 + i * 2, 1.0, 7.4, .9, 0xfff0c0);
      var boat = new T.Group(); boat.userData.dynamic = true; boat.position.set(-12, .1, 10.6); p.add(boat); sailboat(boat, 0xd9473a, 0xffffff); boat.rotation.y = Math.PI / 2; batchMotion(boat); animated.push({ type: 'caravan', object: boat, x0: -8, len: 16 });
      foam(p, 0, .1, 12, 24, 4); spark(p, 0, .3, 11, 24, 24, 0, 6, 0xffffff, .26, 1, 2); bird(p, 0, 10, 0, 8, .3, 1.0); bird(p, 0, 12, 0, 6, -.4, .9);
    };
    models.uluru = function (p) {
      var g = new T.SphereGeometry(1, 56, 28), pos = g.attributes.position, col = [], c = new T.Color();
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i), x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(x, z), fl = 1 + .025 * Math.sin(a * 26) * Math.max(0, y);
        pos.setXYZ(i, x * 10 * (1 + .03 * Math.sin(z * 19)) * fl, Math.max(0, y) * 5.8 * (1 + .04 * Math.sin(a * 5)), z * 6 * (1 + .04 * Math.sin(x * 17)) * fl);
        var t = Math.max(0, y); c.setHex(0x9a4f38).lerp(cB.setHex(0xe08a52), Math.pow(t, .8)); var st = .92 + .1 * Math.sin(a * 31 + t * 3); c.multiplyScalar(st); col.push(c.r, c.g, c.b);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); scaleUV(g, 3);
      var m = mesh(p, g, surface(0xffffff, 'rock'), 0, 0, 0); m.userData.kind = 'uvfixed'; collider(p, 0, 0, 7);
      for (var i = 0; i < 6; i++) { var a = i * 1.05 + .3; part(p, 'sphere', surface(0x7a3a2a, 'rock'), Math.sin(a) * 9.5 * (1 - .02 * i), 1.0 + (i % 2), Math.cos(a) * 5.4, .8, .7, .5); }
      for (var i = 0; i < 12; i++) { var a = i * 2.4, x = Math.sin(a) * 13, z = Math.cos(a) * 9; bush(p, x, z, .6 + (i % 3) * .15, i % 2 ? 0x8a9a55 : 0x9aa05f); tuft(p, x + .8, z + .3, [0xf2c94c, 0xf0f0e0], 4, .3); }
      bird(p, 0, 9, 0, 10, .3, 1.0, 0xf6e3ea); bird(p, 0, 11, 0, 8, -.4, .9, 0xf6e3ea); bird(p, 2, 8, 1, 12, .22, .9, 0xf6e3ea);
      spark(p, 0, 3, 7.5, 18, 14, 4, 2, 0xffd8a0, .22, 1, 1.5);
    };
    function coral(p, x, z, type, col, s) {
      var c1 = surface(col, 'cloth'), c2 = surface(col === 0xe9708f ? 0xf6a3b8 : col === 0xa779d6 ? 0xc7a3ec : 0xf7c07a, 'cloth');
      if (type === 0) { part(p, 'sphere', c1, x, .1, z, .55 * s, .45 * s, .55 * s); for (var i = 0; i < 6; i++) { var a = i * 1.1; part(p, 'sphere', c2, x + Math.sin(a) * .3 * s, .35 * s, z + Math.cos(a) * .3 * s, .17 * s, .12 * s, .17 * s); } }
      else if (type === 1) { for (var i = 0; i < 5; i++) { var a = i * 1.26, dx = Math.sin(a) * .55 * s, dz = Math.cos(a) * .55 * s; line(p, c1, [x, 0, z], [x + dx, .9 * s, z + dz], .09 * s); sphere(p, c2, x + dx, .95 * s, z + dz, .12 * s); line(p, c1, [x + dx * .5, .45 * s, z + dz * .5], [x + dx * 1.1, .7 * s, z + dz * 1.2], .06 * s); } }
      else { for (var i = 0; i < 4; i++) { var a = i * 1.57 + .5, xx = x + Math.sin(a) * .22 * s, zz = z + Math.cos(a) * .22 * s; cyl(p, c1, xx, .4 * s + i % 2 * .15, zz, .12 * s, .8 * s); cyl(p, surface(0x5a2a40, 'cloth'), xx, .8 * s + i % 2 * .15 + .01, zz, .07 * s, .03); } }
    }
    models.reef = function (p) {
      box(p, surface(0xefdbb1, 'sand'), 0, .005, 6, 30, .02, 9); box(p, surface(0x6ccad6, 'water'), 0, .03, -4, 30, .05, 16);
      for (var i = 0; i < 30; i++) { var x = Math.sin(i * 2.4) * 12.5, z = -5 + Math.cos(i * 1.9) * 5; coral(p, x, z, i % 3, [0xe9708f, 0xa779d6, 0xf29b54][(i * 7) % 3], .9 + (i % 4) * .15); }
      var fish = new T.Group(); fish.userData.dynamic = true; fish.position.set(0, 0, 0); p.add(fish);
      for (var i = 0; i < 8; i++) { var cc = [0xedb85d, 0x4c8fd1, 0xf0714f][i % 3], fx0 = -4 + i * 1.2, fz = -5 + Math.sin(i * 2) * 1.3, fy = .35 + (i % 3) * .18; part(fish, 'sphere', surface(cc, 'cloth'), fx0, fy, fz, .26, .15, .1); var tl = part(fish, 'cone', surface(cc, 'cloth'), fx0 - .3, fy, fz, .13, .22, .03); tl.rotation.z = Math.PI / 2; sphere(fish, surface(0x222222, 'cloth'), fx0 + .14, fy + .04, fz + .08, .02); }
      batchMotion(fish); animated.push({ type: 'fish', object: fish });
      var tg = new T.Group(); tg.userData.dynamic = true; tg.position.set(5, .12, -4); p.add(tg);
      part(tg, 'sphere', surface(0x5f9a58, 'cloth'), 0, .2, 0, .75, .26, .95); part(tg, 'sphere', surface(0xb9d27a, 'cloth'), 0, .16, 0, .6, .1, .8); part(tg, 'sphere', surface(0x8fb86a, 'cloth'), 0, .2, .95, .2, .15, .22);
      for (var sd of [-1, 1]) { part(tg, 'sphere', surface(0x8fb86a, 'cloth'), sd * .8, .15, .45, .45, .05, .2).rotation.y = sd * .4; part(tg, 'sphere', surface(0x8fb86a, 'cloth'), sd * .5, .15, -.6, .2, .05, .15); }
      sphere(tg, surface(0x222222, 'cloth'), .1, .3, 1.1, .03); sphere(tg, surface(0x222222, 'cloth'), -.1, .3, 1.1, .03);
      batchMotion(tg); animated.push({ type: 'orbit', object: tg, r: 6, s: .12, cx: 0, cz: -4 });
      spark(p, 0, .3, -4, 28, 22, 1, 10, 0xffffff, .22, 0, 1.4); spark(p, 0, .3, -4, 26, 26, 0, 14, 0xffffff, .3, 1, 2.2);
      palm(p, -11, 9, 1.1); palm(p, 10, 10, 1.1); palm(p, -8.4, 8.2, .8); sphere(p, surface(0xd9c08a, 'sand'), 3, .15, 7, .8, .3); bird(p, 0, 8, 0, 9, .3, 1.0); bird(p, 0, 10, 0, 7, -.4, .9);
    };
    models.sugarloaf = function (p) {
      function granite(t, a) { var c = t < .35 ? mixHex(0x58985f, 0x7d9d72, t / .35) : mixHex(0x9fa89a, 0xc2c5b8, (t - .35) / .65); return c.multiplyScalar(.93 + .1 * Math.sin(a * 19 + t * 4)); }
      mountain(p, 'rock', 0, 0, 5.6, 10.6, granite, { k: .5, top: .1, rough: .04, bump: .1, rings: 26 }); collider(p, 0, 0, 5.4);
      mountain(p, 'rock', -7, 3, 3.0, 4.3, function (t, a) { return mixHex(0x5a9a60, 0x8aa57a, t).multiplyScalar(.95 + .08 * Math.sin(a * 13)); }, { k: 1.1, top: .35, rough: .05, rings: 12 }); collider(p, -7, 3, 2.4);
      for (var i = 0; i < 9; i++) { var a = i * 2.2, r = 5.4 + (i % 2) * .6, x = Math.sin(a) * r, z = Math.cos(a) * r; part(p, 'foliage', surface(i % 3 ? 0x4d8f56 : 0x63a366, 'leaf'), x, .6, z, .95, .8, .95); }
      line(p, surface(0x6d8078, 'metal'), [-7, 4.4, 3], [0, 10.4, 0], .03); box(p, surface(0xe2d7bf, 'stone'), 0, 10.65, 0, 2, .2, 1.9); box(p, surface(0x7ab8cb, 'glass'), 0, 11.15, 0, 1.2, .9, 1.2); box(p, surface(0xd9503f, 'roof'), 0, 11.72, 0, 1.7, .23, 1.7);
      box(p, surface(0xe2d7bf, 'stone'), -7, 4.35, 3, 1.4, .3, 1.2);
      var car = new T.Group(); car.userData.dynamic = true; car.position.set(-3.5, 6.15, 1.5); p.add(car); box(car, surface(0xffc657, 'cloth'), 0, 0, 0, 1.5, 1.15, 1.1); box(car, surface(0x9ecedb, 'cloth'), 0, .2, .56, 1.26, .52, .035); box(car, surface(0x9ecedb, 'cloth'), 0, .2, -.56, 1.26, .52, .035); box(car, surface(0xd9503f, 'cloth'), 0, .62, 0, 1.55, .1, 1.15); line(car, surface(0x556c6f, 'metal'), [0, .55, 0], [0, 1.18, 0], .045); batchMotion(car); animated.push({ type: 'cablecar', object: car });
      palm(p, 6, 6, 1.1); palm(p, 8, 4, .9); palm(p, -3, 8, .9);
      bird(p, 0, 12, 0, 6, .4, 1.0, 0x2b3035); bird(p, 0, 14, 0, 8, -.3, .9, 0x2b3035);
    };
    function volleyNet(p, x, z, ry) { var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); for (var s of [-1, 1]) cyl(g, surface(0xf2efe6, 'wood'), s * 1.6, .85, 0, .05, 1.7); for (var i = 0; i <= 8; i++) line(g, surface(0xf5f5ee, 'cloth'), [-1.6 + i * .4, 1.65, 0], [-1.6 + i * .4, 1.05, 0], .008); for (var j = 0; j < 4; j++) line(g, surface(0xf5f5ee, 'cloth'), [-1.6, 1.65 - j * .2, 0], [1.6, 1.65 - j * .2, 0], .01); box(g, surface(0xffffff, 'cloth'), 0, 1.68, 0, 3.2, .06, .03); }
    function kite(g, x, y, z, cols) { var sh = new T.Shape(); sh.moveTo(0, .55); sh.lineTo(.4, 0); sh.lineTo(0, -.7); sh.lineTo(-.4, 0); sh.closePath(); var kg = new T.ShapeGeometry(sh), col = [], c = new T.Color(); for (var i = 0; i < kg.attributes.position.count; i++) { c.setHex(cols[i % cols.length]); col.push(c.r, c.g, c.b); } kg.setAttribute('color', new T.Float32BufferAttribute(col, 3)); kg.attributes.uv.array.fill(0); var m = mesh(g, kg, surface(0xffffff, 'cloth'), x, y, z, -.3, 0, 0); m.userData.kind = 'uvfixed'; for (var t = 0; t < 6; t++) { var tt = t / 5; sphere(g, surface(cols[(t + 1) % cols.length], 'cloth'), x + Math.sin(tt * 4) * .25, y - .8 - t * .32, z, .08, .05); } line(g, surface(0xf5f5ee, 'cloth'), [x, y - .7, z], [x - 2, 0, z + 3.5], .01); }
    var oldBeach = models.beach;
    models.beach = function (p) {
      oldBeach(p); volleyNet(p, -1, 3.2, .3); sphere(p, surface(0xffffff, 'cloth'), 1.2, 1.9, 3.1, .17);
      [[0xe85d5d, -6, 1.5], [0x4fa3d9, 6.5, -.2], [0xf2c94c, 2, 4.5]].forEach(function (t) { box(p, surface(t[0], 'cloth'), t[1], .06, t[2], 1.2, .03, .6, .4); box(p, surface(0xffffff, 'cloth'), t[1], .075, t[2], 1.2, .01, .12, .4); });
      var sc = new T.Group(); sc.position.set(-2.5, 0, 6); p.add(sc); cyl(sc, surface(0xe4cd96, 'sand'), 0, .35, 0, .6, .7); for (var i = 0; i < 4; i++) { box(sc, surface(0xe4cd96, 'sand'), Math.sin(i * 1.57) * .6, .85, Math.cos(i * 1.57) * .6, .2, .2, .2, i); } cyl(sc, surface(0xe4cd96, 'sand'), 0, 1.0, 0, .3, .6); cone(sc, surface(0xd94f3f, 'cloth'), 0, 1.5, 0, .3, .4);
      var kg = new T.Group(); kg.userData.dynamic = true; kg.position.set(3, 7, 2); p.add(kg); kite(kg, 0, 0, 0, [0xe85d5d, 0xf2c94c, 0x4fa3d9, 0x58b368]); batchMotion(kg); animated.push({ type: 'float', object: kg, y: 7, phase: 1 });
      spark(p, 0, .15, -4.8, 20, 14, 0, 2.5, 0xffffff, .26, 1, 2); bird(p, 0, 6, -2, 9, .3, 1.0); bird(p, 0, 7.5, -2, 7, -.4, .9);
    };

    function unionJack(u, v) {
      var du = u - .5, dv = (v - .5) * .5, d1 = Math.abs(du * .5 - dv), d2 = Math.abs(du * .5 + dv);
      if (Math.abs(du) < .07 || Math.abs(dv * 2) < .12) return 0xd13a3a; if (Math.abs(du) < .11 || Math.abs(dv * 2) < .2) return 0xffffff;
      if (d1 < .035 || d2 < .035) return 0xd13a3a; if (d1 < .09 || d2 < .09) return 0xffffff; return 0x25407f;
    }
    function phoneBox(p, x, z, ry) { var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g); var red = surface(0xd4352f, 'metal'); box(g, red, 0, .8, 0, .7, 1.6, .7); part(g, 'cylinder', red, 0, 1.62, 0, .38, .12, .38); for (var s = 0; s < 4; s++) { var a = s * Math.PI / 2; box(g, surface(0xbfe3ee, 'glass'), Math.sin(a) * .36, .95, Math.cos(a) * .36, a % Math.PI ? .03 : .45, 1.0, a % Math.PI ? .45 : .03); } fx(box(g, surface(0xfff0c0, 'cloth'), 0, 1.45, .0, .3, .08, .3), .8, 0, x); }
    function bus(g) {
      var red = surface(0xd8322c, 'cloth'), win = surface(0xcfe9f2, 'cloth'), dk = surface(0x2a2a2e, 'cloth');
      box(g, red, 0, .75, 0, 3.4, .8, 1.1); box(g, red, 0, 1.55, 0, 3.3, .8, 1.05); box(g, red, 0, 1.97, 0, 3.4, .06, 1.15);
      for (var i = 0; i < 5; i++) { box(g, win, -1.3 + i * .65, 1.58, .54, .5, .4, .02); box(g, win, -1.3 + i * .65, 1.58, -.54, .5, .4, .02); box(g, win, -1.3 + i * .65, .86, .56, .5, .3, .02); }
      box(g, win, 1.66, 1.58, 0, .02, .4, .8); box(g, surface(0xf5f0e0, 'cloth'), 0, 1.1, .56, 3.3, .08, .02); box(g, surface(0xf5f0e0, 'cloth'), 0, 1.1, -.56, 3.3, .08, .02);
      [-1.1, 1.1].forEach(function (x) { [-.5, .5].forEach(function (z) { var w = cyl(g, dk, x, .3, z, .3, .2); w.rotation.x = Math.PI / 2; }); }); fx(box(g, surface(0xfff2c0, 'cloth'), 1.71, .65, .35, .02, .12, .16), 1.0); fx(box(g, surface(0xfff2c0, 'cloth'), 1.71, .65, -.35, .02, .12, .16), 1.0);
    }
    models.bigben = function (p) {
      var stone = surface(0xd2b987, 'stone'), lite = surface(0xe9d9ac, 'stone'), gold = surface(GOLD, 'metal'), slate = surface(0x4c6c68, 'roof'), dark = surface(0x2f3a45, 'stone');
      collider(p, 0, 0, 2.3);
      box(p, surface(0xb9a275, 'stone'), 0, .25, 0, 4.2, .5, 4.2); box(p, stone, 0, 4.7, 0, 3.0, 8.4, 3.0);
      for (var cx of [-1, 1]) for (var cz of [-1, 1]) { box(p, lite, cx * 1.55, 4.7, cz * 1.55, .42, 8.5, .42); part(p, 'cone', gold, cx * 1.55, 9.2, cz * 1.55, .28, .9, .28); }
      [1.6, 3.5, 5.4, 7.3].forEach(function (y) { box(p, lite, 0, y, 0, 3.35, .14, 3.35); });
      for (var f = 0; f < 4; f++) { var wg = new T.Group(); wg.rotation.y = f * Math.PI / 2; p.add(wg); [1.1, 2.6, 4.1, 5.6, 7.0].forEach(function (y, k) { box(wg, dark, 0, y + .35, 1.52, .5, .85, .04); box(wg, lite, 0, y + .8, 1.53, .66, .12, .06); box(wg, lite, -.3, y + .35, 1.53, .06, .9, .06); box(wg, lite, .3, y + .35, 1.53, .06, .9, .06); }); }
      box(p, lite, 0, 9.0, 0, 3.7, .24, 3.7); box(p, stone, 0, 10.2, 0, 3.5, 2.2, 3.5);
      for (var side = 0; side < 4; side++) { var g = new T.Group(); g.rotation.y = side * Math.PI / 2; p.add(g);
        var face = cyl(g, surface(0xfff5d6, 'metal'), 0, 10.25, 1.78, 1.02, .08); face.rotation.x = Math.PI / 2; fx(face, .28, 0, side);
        var ring = mesh(g, new T.TorusGeometry(1.06, .07, 5, 28), gold, 0, 10.25, 1.8); box(g, surface(0x2c3e5a, 'metal'), 0, 10.25, 1.75, 2.2, 2.2, .04);
        for (var tick = 0; tick < 12; tick++) { var a = tick * Math.PI / 6; fx(part(g, 'sphere', gold, Math.sin(a) * .85, 10.25 + Math.cos(a) * .85, 1.85, .05, .05, .03), .0); }
        line(g, surface(0x2a2a2a, 'metal'), [0, 10.25, 1.9], [0, 10.9, 1.9], .045); line(g, surface(0x2a2a2a, 'metal'), [0, 10.25, 1.9], [.5, 10.1, 1.9], .055); }
      box(p, lite, 0, 11.4, 0, 3.8, .18, 3.8); box(p, stone, 0, 12.3, 0, 3.0, 1.8, 3.0);
      for (var f = 0; f < 4; f++) { var wg = new T.Group(); wg.rotation.y = f * Math.PI / 2; p.add(wg); gothic(wg, lite, -.5, 11.5, 1.5, 1.0, 1.4, .08, 0); box(wg, dark, 0, 12.15, 1.52, .62, 1.0, .03); for (var s = 0; s < 4; s++) box(wg, lite, -.24 + s * .16, 12.15, 1.55, .03, 1.0, .02); }
      box(p, lite, 0, 13.3, 0, 3.4, .16, 3.4);
      part(p, 'pyr', slate, 0, 13.35, 0, 3.3, 4.4, 3.3); for (var c = 0; c < 4; c++) { var a = c * Math.PI / 2 + Math.PI / 4; line(p, gold, [Math.sin(a) * 2.3 * .72, 13.4, Math.cos(a) * 2.3 * .72], [0, 17.6, 0], .05); }
      cyl(p, gold, 0, 18.3, 0, .05, 1.2); sphere(p, gold, 0, 18.95, 0, .12);
      box(p, surface(0xb9a275, 'stone'), 4.2, 1.5, -1.8, 5.6, 3.0, 3.8); box(p, surface(0xe0cfa0, 'stone'), 4.2, 1.5, -1.8, 5.4, .14, 3.95);
      var wing = building(p, 7.8, -2, 6, 4.4, 3.5, 0xd5c291, 0x586f6a); collider(p, 7.6, -2, 3); building(p, -7.8, -2, 6, 4.4, 3.5, 0xd5c291, 0x586f6a); collider(p, -7.6, -2, 3);
      for (var i = 0; i < 5; i++) part(p, 'cone', gold, 5.5 + i * 1.5, 4.7, -.2, .12, .8, .12);
      phoneBox(p, -3.2, 4.2, 0); phoneBox(p, 3.2, 4.2, 0);
      var bg = new T.Group(); bg.userData.dynamic = true; bg.position.set(-16, 0, 7.5); p.add(bg); bus(bg); batchMotion(bg); animated.push({ type: 'caravan', object: bg, x0: -17 });
      flag(p, -3, 4.4, -2, 2.4, 1.3, .8, unionJack, 0, .1); bird(p, 0, 14, 0, 6, .4, 1.0, 0x8c8f94); bird(p, 0, 17, 0, 4, -.5, .9, 0x8c8f94); spark(p, 0, 17.8, 0, 6, 1, 1, 1, 0xfff2b0, .3, 1, 2.2);
    };
    var oldTower = models.towerbridge;
    models.towerbridge = function (p) {
      oldTower(p);
      var blue = surface(0x4c8fb8, 'metal'), lite = surface(0xe8dcc0, 'stone');
      for (var sd of [-1, 1]) {
        var x = sd * 6; for (var zz of [-2, 2]) { for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + Math.PI / 4; part(p, 'cone', surface(0x557e96, 'roof'), x + Math.sin(a) * .62, 8.3, zz + Math.cos(a) * .62, .24, 1.3, .24); }
          box(p, lite, x, 7.9, zz, 1.7, .16, 1.7); for (var lv = 0; lv < 3; lv++) { var wg = new T.Group(); wg.position.set(x, 0, zz); p.add(wg); windowArch(wg, 0, 1.4 + lv * 2.0, .78, .4, .8, 0); } }
        var prev; for (var s = 0; s <= 10; s++) { var t = s / 10, qx = x + sd * (t * 6.2), qy = 7.6 - t * 6.6 + Math.sin(t * Math.PI) * -.5; for (var zz2 of [-2, 2]) { var q = [qx, qy, zz2 * .98]; if (s) line(p, blue, [prev[0], prev[1], zz2 * .98], q, .08); if (s % 2 === 0 && s) line(p, surface(0x66a5c9, 'metal'), [qx, .5, zz2 * .98], q, .025); } prev = [qx, qy, 0]; }
        flag(p, x, 9.4, -2, 1.2, 1.2, .75, unionJack, 0, .09);
      }
      for (var i = 0; i < 8; i++) fx(part(p, 'sphere', surface(0xffe7a8, 'cloth'), -10.5 + i * 3, 1.45, i % 2 ? 1.55 : -1.55, .08, .08, .08), 1.0, 0, i);
      var bg = new T.Group(); bg.userData.dynamic = true; bg.position.set(0, .12, -4.2); bg.rotation.y = Math.PI / 2; p.add(bg); /* river runs along x: sail beside the deck, not across it */ part(bg, 'sphere', surface(0xf5f0e4, 'cloth'), 0, .2, 0, .5, .3, 1.5); box(bg, surface(0xd8322c, 'cloth'), 0, .25, 0, .9, .12, 2.6); box(bg, surface(0xf9f6ee, 'cloth'), 0, .6, .2, .8, .4, 1.1); cyl(bg, surface(0xd8322c, 'cloth'), 0, 1.0, -.5, .14, .4);
      batchMotion(bg); animated.push({ type: 'caravan', object: bg, x0: -11.5, len: 23 });
      foam(p, 0, .1, 0, 22, 10); bird(p, 0, 12, 0, 9, .3, 1.0); bird(p, 0, 11, 0, 7, -.4, .9);
    };
    var oldHenge = models.stonehenge;
    function sheep(p, x, z, ry) { var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); var wool = surface(0xf7f4ea, 'cloth'), dk = surface(0x3a3430, 'cloth'); part(g, 'sphere', wool, 0, .55, 0, .5, .4, .62); part(g, 'sphere', wool, 0, .85, -.1, .32, .22, .32); part(g, 'sphere', dk, 0, .6, .62, .17, .19, .2); for (var s of [-1, 1]) { cyl(g, dk, s * .22, .2, .3, .04, .4); cyl(g, dk, s * .22, .2, -.3, .04, .4); part(g, 'sphere', dk, s * .16, .72, .62, .06, .04, .1); } }
    models.stonehenge = function (p) {
      oldHenge(p);
      for (var i = 0; i < 5; i++) sheep(p, -10 + i * 1.7 + Math.sin(i) * 1, 9 + Math.cos(i * 2) * 1.5, i * 1.3);
      for (var i = 0; i < 12; i++) { var a = i * 1.7, x = Math.sin(a) * 11, z = Math.cos(a) * 11; tuft(p, x, z, [0xf2c94c, 0xffffff, 0xb59ad6], 5, .4); }
      part(p, 'sphere', surface(0xa9a89b, 'rock'), 0, .5, 11, .7, .5, .55); box(p, surface(0xaaa897, 'rock'), 0, 1.0, 14, 1.0, 2.0, .7);
      spark(p, 0, 3, 0, 24, 14, 6, 14, 0xfff0b8, .24, 1, 1.4); spark(p, 0, 0.3, 0, 12, 20, 0, 20, 0xe9efe9, .9, 0, .5); bird(p, 0, 9, 0, 8, .3, 1.0, 0x2a2a30); bird(p, 0, 11, 0, 6, -.4, .9, 0x2a2a30);
    };
    function pine(p, x, z, s) { cyl(p, surface(0x7a5a3d, 'wood'), x, 1.2 * s, z, .14 * s, 2.4 * s); part(p, 'foliage', surface(0x4f8b57, 'leaf'), x, 2.9 * s, z, 1.3 * s, .42 * s, 1.3 * s); part(p, 'foliage', surface(0x5a9a60, 'leaf'), x + .3 * s, 3.0 * s, z, .9 * s, .32 * s, .9 * s); }
    models.colosseum = function (p) {
      var trav = surface(0xd8c29c, 'stone'), lite = surface(0xe7d8b4, 'stone'), dark = surface(0x5e4e40, 'stone');
      profile(p, surface(0xcdb994, 'stone'), [[8.5, 6.5], [7.9, 6.6], [5.9, 3.2], [5.5, .3], [0, .3]], 0, 0, 0, 1, 1, .667); part(p, 'cylinder', surface(0xdcc89c, 'sand'), 0, .32, 0, 5.2, .06, 3.0);
      profile(p, dark, [[8.62, 0], [8.62, 6.5]], 0, 0, 0, 1, 1, .667);
      var gapA = 2.3, gapB = 3.9;
      for (var level = 0; level < 3; level++) for (var i = 0; i < 20; i++) {
        var a = i / 20 * Math.PI * 2, x = Math.sin(a) * 9, z = Math.cos(a) * 6, broken = (a > gapA && a < gapB && level > 0) || (a > gapA + .3 && a < gapB - .2 && level === 0 && false);
        if (level === 0) collider(p, x, z, .5); if (broken) continue;
        var g = new T.Group(); g.position.set(x, level * 2.15, z); g.rotation.y = a; p.add(g); arch(g, trav, 0, 0, 0, 2.25, 2.1, .55); box(g, lite, 0, 2.1, 0, 2.6, .18, .8);
        if (level < 2) { cyl(g, lite, -1.2, 1.0, .1, .1, 2.0); }
      }
      for (var i = 0; i < 20; i++) { var a = i / 20 * Math.PI * 2; if (a > gapA - .1 && a < gapB + .1) continue; var x = Math.sin(a) * 9.02, z = Math.cos(a) * 6.02, g = new T.Group(); g.position.set(x, 6.45, z); g.rotation.y = a; p.add(g); box(g, trav, 0, .55, 0, 2.5, 1.2, .5); box(g, dark, 0, .55, .26, .5, .55, .04); box(g, lite, 0, 1.22, 0, 2.6, .14, .6); }
      for (var side of [-1, 1]) { flag(p, side * 3.2, 0, 7.4, 3.4, 1.4, 1.0, function (u, v) { return Math.abs(v - .5) < .1 && u > .3 && u < .7 ? 0xf3c04a : 0xb8322c; }, 0, .1); }
      pine(p, -11, 8, 1.2); pine(p, 11, 8, 1.1); pine(p, 12, -6, 1.0); pine(p, -12, -5, 1.1);
      for (var i = 0; i < 6; i++) lantern(p, -6 + i * 2.4, 1.2, 8.2, .9, 0xffe4a0);
      bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 0, 11, 0, 6, -.4, .9); spark(p, 0, 1, 0, 12, 10, 2, 6, 0xf0d9a0, .5, 0, .6);
    };
    models.pisa = function (p) {
      part(p, 'cylinder', surface(0x8cbd6b, 'leaf'), 0, .02, 0, 14, .04, 12);
      var g = new T.Group(); g.rotation.z = -.075; p.add(g); collider(p, 0, 0, 2.7);
      var white = surface(0xeee8d6, 'stone'), lite = surface(0xf7f1e0, 'stone'), core = surface(0x8c8272, 'stone');
      cyl(g, white, 0, .9, 0, 2.5, 1.8); for (var j = 0; j < 14; j++) { var a = j / 14 * Math.PI * 2; box(g, lite, Math.sin(a) * 2.5, .9, Math.cos(a) * 2.5, .6, 1.4, .1, a); }
      for (var level = 0; level < 6; level++) {
        var y0 = 1.85 + level * 1.4; cyl(g, core, 0, y0 + .7, 0, 2.2, 1.4); cyl(g, lite, 0, y0, 0, 2.62, .16); cyl(g, lite, 0, y0 + 1.4, 0, 2.62, .12);
        for (var j = 0; j < 18; j++) { var a = j / 18 * Math.PI * 2; cyl(g, white, Math.sin(a) * 2.42, y0 + .7, Math.cos(a) * 2.42, .09, 1.3); part(g, 'sphere', lite, Math.sin(a) * 2.42, y0 + 1.33, Math.cos(a) * 2.42, .11, .07, .11); }
      }
      var yt = 1.85 + 6 * 1.4; cyl(g, core, 0, yt + .6, 0, 1.6, 1.2); cyl(g, lite, 0, yt, 0, 1.9, .14); for (var j = 0; j < 12; j++) { var a = j / 12 * Math.PI * 2; cyl(g, white, Math.sin(a) * 1.72, yt + .6, Math.cos(a) * 1.72, .08, 1.1); }
      cyl(g, lite, 0, yt + 1.25, 0, 1.9, .12); part(g, 'cone', surface(0xc86a4a, 'roof'), 0, yt + 1.7, 0, 1.55, .8, 1.55); sphere(g, surface(GOLD, 'metal'), 0, yt + 2.15, 0, .12);
      // Duomo and baptistery on the lawn
      var dm = new T.Group(); dm.position.set(-9, 0, -3); dm.rotation.y = .5; p.add(dm);
      box(dm, lite, 0, 1.6, 0, 8, 3.2, 3.4); box(dm, surface(0xe3d6b6, 'stone'), 0, .2, 0, 8.4, .4, 3.8);
      for (var i = 0; i < 7; i++) { arch(dm, white, -3 + i * 1.0, .3, 1.72, .7, 2.4, .1); } for (var k = 0; k < 3; k++) for (var i = 0; i < 8; i++) { box(dm, white, -3.5 + i * 1.0, 2.5 + k * .3, 1.72, .08, .26, .06); }
      box(dm, surface(0x8a8f8c, 'roof'), 0, 3.5, 0, 8.2, .4, 2.6); part(dm, 'sphere', surface(0x8a8f8c, 'roof'), 0, 3.6, 0, 1.3, 1.1, 1.0); collider(p, -9, -3, 3.2);
      var bp = new T.Group(); bp.position.set(7.5, 0, 6); p.add(bp); cyl(bp, lite, 0, 1.4, 0, 1.6, 2.8); profile(bp, surface(0xc9bfa6, 'roof'), [[1.7, 0], [1.4, .8], [.7, 1.8], [.2, 2.4], [0, 2.7]], 0, 2.8, 0);
      for (var j = 0; j < 10; j++) { var a = j / 10 * Math.PI * 2; cyl(bp, white, Math.sin(a) * 1.65, 1.2, Math.cos(a) * 1.65, .07, 1.8); } collider(p, 7.5, 6, 1.8);
      for (var i = 0; i < 8; i++) { var a = i * .9; tuft(p, Math.sin(a) * 7, 8 + Math.cos(a) * 2, [0xf6dc62, 0xffffff], 4, .3); }
      pine(p, 10, -5, 1.1); pine(p, -4, 9, 1.0); bird(p, 0, 12, 0, 7, .3, 1.0); bird(p, 0, 14, 0, 5, -.4, .9);
    };

    function townHouse(p, x, z, w, h, d, side, style, col, roofCol, k) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; p.add(g);
      var wall = surface(col, style === 'dutch' ? 'brick' : 'stone'), trim = surface(0xf4ead2, 'stone'), glass = surface(0x4b8fb3, 'glass'), shutter = surface([0x3f7a5e, 0x4f7fae, 0x8a5a3c][k % 3], 'wood');
      box(g, wall, 0, h / 2, 0, w, h, d); box(g, trim, 0, .14, 0, w + .2, .28, d + .2);
      var rows = Math.max(2, Math.floor(h / 1.8)), fz = d / 2;
      for (var r = 1; r < rows; r++) for (var c = -1; c <= 1; c += 2) {
        var wx = c * w * .24, wy = .6 + r * (h - 1.0) / rows + .35;
        box(g, trim, wx, wy, fz + .03, .62, .9, .06); box(g, glass, wx, wy, fz + .07, .48, .74, .03); box(g, trim, wx, wy, fz + .09, .04, .76, .03);
        if (style !== 'dutch') { box(g, shutter, wx - .42, wy, fz + .06, .2, .86, .04); box(g, shutter, wx + .42, wy, fz + .06, .2, .86, .04); } else box(g, trim, wx, wy + .52, fz + .06, .72, .1, .08);
        if (r === 1 && style !== 'dutch') { box(g, surface(0x6f4b36, 'wood'), wx, wy - .5, fz + .22, .8, .08, .36); box(g, surface(0xf3ead6, 'metal'), wx, wy - .32, fz + .38, .8, .3, .03); tuft(g, wx, fz + .22, [0xe8506a, 0xf5c542, 0xffffff], 4, .2); g.children[g.children.length - 1].position.y += wy - .3; }
      }
      arch(g, trim, 0, 0, fz + .05, .9, 1.6, .1); box(g, surface(0x6f4b36, 'wood'), 0, .7, fz + .06, .62, 1.3, .08);
      if (style === 'dutch') {
        var steps = 4; for (var s = 0; s < steps; s++) { var sw = w * (1 - s * .2); box(g, wall, 0, h + .3 + s * .5, 0, sw, .6, d); box(g, trim, 0, h + .62 + s * .5, 0, sw + .08, .08, d + .08); }
        var gy = h + .3 + steps * .5 + .2; box(g, trim, 0, gy, 0, .5, .16, d * .6); cyl(g, surface(0x6f4b36, 'wood'), 0, h + 1.0, fz + .3, .05, 1.1); box(g, surface(0x5c4636, 'wood'), 0, h + 1.5, fz + .45, .06, .06, .8); sphere(g, surface(GOLD, 'metal'), 0, h + 2.0, fz + .08, .22).scale.z = .15;
      } else { var rf = part(g, 'pyr', surface(roofCol, 'roof'), 0, h, 0, Math.max(w, d) * 1.18, 1.1, Math.max(w, d) * 1.18, 0, Math.PI / 4, 0); rf.scale.set(w * 1.35, 1.2, d * 1.35); cyl(g, trim, w * .28, h + .7, -d * .1, .16, 1.0); box(g, trim, w * .28, h + 1.25, -d * .1, .4, .1, .4); }
    }
    function gondola(g, dutch) {
      if (dutch) { var hull = part(g, 'sphere', surface(0x8a4b34, 'wood'), 0, .2, 0, .55, .26, 1.7); box(g, surface(0x3f7aa5, 'cloth'), 0, .3, 0, .9, .05, 2.6); for (var i = 0; i < 4; i++) { cyl(g, surface(0xb86a48, 'cloth'), -.2 + (i % 2) * .4, .5, -.8 + i * .55, .13, .28); sphere(g, surface([0xe5413f, 0xf5c542, 0xf08ab0, 0xffffff][i], 'leaf'), -.2 + (i % 2) * .4, .75, -.8 + i * .55, .14); } return; }
      var hl = part(g, 'sphere', surface(0x25282c, 'cloth'), 0, .2, 0, .42, .22, 2.0); box(g, surface(0x25282c, 'cloth'), 0, .3, 1.7, .08, .55, .1).rotation.x = -.3; box(g, surface(0xc9ccd0, 'metal'), 0, .65, 1.95, .1, .5, .06); box(g, surface(0x25282c, 'cloth'), 0, .3, -1.7, .08, .4, .1).rotation.x = .3;
      box(g, surface(0xb33a3a, 'cloth'), 0, .38, -.3, .6, .12, .9); box(g, surface(0xd9b36a, 'cloth'), 0, .46, .6, .5, .04, .3); fx(sphere(g, surface(0xffd27a, 'cloth'), 0, .95, -1.5, .06), 1.2, 0, 1); cyl(g, surface(0x6b4a30, 'wood'), 0, .6, -1.5, .03, .7);
    }
    function canalTown(p, dutch) {
      box(p, surface(0x6fb3bf, 'water'), 0, .035, 0, 8, .04, 24);
      var pal = dutch ? [0xb4573e, 0xa9482f, 0xc2634a, 0x9d4a36, 0xbb6a4c] : [0xe9b88e, 0xe9d09a, 0xd98a72, 0xd3b58f, 0xe8dcb8];
      for (var sd of [-1, 1]) for (var i = 0; i < 5; i++) {
        var z = -10 + i * 4.5, x = sd * 7, h = (dutch ? 5.2 : 4) + i % 3 * 1.4; townHouse(p, x, z, 3, h, 3.2, sd, dutch ? 'dutch' : 'venice', pal[(i + (sd > 0 ? 2 : 0)) % 5], dutch ? 0x5a7372 : 0xc4623f, i + (sd > 0 ? 1 : 0)); collider(p, x, z, 1.85);
        box(p, surface(0xd7c8a4, 'stone'), sd * 4.25, .22, z, .5, .3, 4.5);
      }
      for (var i = 0; i < 13; i++) { var x = -5 + i * .83, y = .20 + Math.sin(i / 12 * Math.PI) * .5; box(p, surface(0xd4bc95, 'stone'), x, y, 4, .9, .2, 2.2); for (var sd of [-1, 1]) { cyl(p, surface(0xb6a281, 'stone'), x, y + .35, 4 + sd * 1.05, .04, .7); } }
      for (var sd of [-1, 1]) { line(p, surface(0xb6a281, 'stone'), [-5, .9, 4 + sd * 1.05], [-.2, 1.5, 4 + sd * 1.05], .05); line(p, surface(0xb6a281, 'stone'), [.2, 1.5, 4 + sd * 1.05], [5, .9, 4 + sd * 1.05], .05); }
      arch(p, surface(0xcdb691, 'stone'), -1.5, -.05, 4 - 1.15, 3.0, 1.2, .2); arch(p, surface(0xcdb691, 'stone'), -1.5, -.05, 4 + 1.0, 3.0, 1.2, .2);
      for (var i = 0; i < 6; i++) { var z = -9 + i * 3.4; for (var sd of [-1, 1]) { cyl(p, surface(i % 2 ? 0x3f6fae : 0xe9e5d8, 'wood'), sd * 3.9, .6, z + 1.2, .09, 1.2); } }
      bunting(p, [-5.4, 4.6, -7], [5.4, 4.6, -7], 12, .9, dutch ? [0xe8742c, 0xffffff, 0x2f5fa8] : [0xe5413f, 0xf5c542, 0x3f9a78, 0xffffff], .5); bunting(p, [-5.4, 5.1, -1], [5.4, 5.1, -1], 12, .9, dutch ? [0xe8742c, 0xffffff, 0x2f5fa8] : [0xe5413f, 0xf5c542, 0x3f9a78, 0xffffff], .5);
      var boat = new T.Group(); boat.userData.dynamic = true; boat.position.set(0, .2, -4); p.add(boat); gondola(boat, dutch); batchMotion(boat); animated.push({ type: 'zswing', object: boat, z0: -4, amp: 6, s: .12 });
      foam(p, 0, .08, 0, 6, 22); spark(p, 0, .1, 0, 22, 6, 0, 22, 0xffffff, .26, 1, 2); bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 0, 11, 0, 6, -.4, .9);
      if (dutch) for (var i = 0; i < 4; i++) { var z = -8 + i * 5; cyl(p, surface(0x2f3a3a, 'metal'), 4.0, .4, z, .05, .8); }
    }
    models.sagrada = function (p) {
      var honey = surface(0xd8bd8a, 'stone'), pale = surface(0xe7d3a8, 'stone'), dark = surface(0x4a3a2c, 'stone');
      box(p, honey, 0, 2.2, 0, 9, 4.4, 5); box(p, pale, 0, .2, 0, 9.4, .4, 5.4); collider(p, 0, 0, 4);
      for (var i = 0; i < 3; i++) { var x = -2.9 + i * 2.9; gothic(p, pale, x - .75, .3, 2.55, 1.5, 3.4 - (i === 1 ? 0 : .5), .2, 0); box(p, dark, x, 1.3, 2.52, 1.0, 2.0, .04); }
      var rose = cyl(p, surface(0x5a8bd0, 'glass'), 0, 3.7, 2.55, .75, .08); rose.rotation.x = Math.PI / 2; fx(rose, .5, 0, 1); var rr = mesh(p, new T.TorusGeometry(.78, .08, 5, 24), pale, 0, 3.7, 2.58);
      for (var a = 0; a < 8; a++) { var an = a / 8 * Math.PI; line(p, pale, [Math.cos(an) * .75, 3.7 + Math.sin(an) * .75, 2.6], [-Math.cos(an) * .75, 3.7 - Math.sin(an) * .75, 2.6], .025); }
      var mosaic = [0xe8742c, 0xf5c542, 0x58b368, 0xe8506a, 0x4f86d6];
      [-4.0, -1.45, 1.45, 4.0].forEach(function (x, i) {
        var H = i % 3 === 1 || i === 2 ? 12 : 10.5; if (i === 1 || i === 2) H = 12.2;
        profile(p, honey, [[1.05, 0], [.95, 1], [.8, H * .45], [.62, H * .8], [.5, H]], x, 4.2, 0);
        for (var lv = 0; lv < 6; lv++) { var yy = 5.2 + lv * (H - 2) / 6; for (var q = 0; q < 4; q++) { var a = q * Math.PI / 2 + .3; var rad = 1.0 - (yy - 4.2) / H * .5; box(p, dark, x + Math.sin(a) * rad, yy, Math.cos(a) * rad, .22, .5, .22, a); } cyl(p, pale, x, yy + .35, 0, 1.0 - (yy - 4.2) / H * .5 + .04, .1); }
        var top = 4.2 + H; part(p, 'cone', honey, x, top + .5, 0, .5, 1.1, .5);
        for (var m = 0; m < 5; m++) { var a = m * 1.26; sphere(p, surface(mosaic[(m + i) % 5], 'cloth'), x + Math.sin(a) * .28, top + .75 + (m % 2) * .25, Math.cos(a) * .28, .22); }
        fx(sphere(p, surface(0xffe27a, 'cloth'), x, top + 1.55, 0, .17), 1.3, 0, i); cyl(p, surface(GOLD, 'metal'), x, top + 1.0, 0, .035, .8);
      });
      for (var i = 0; i < 3; i++) { var x = -2.9 + i * 2.9; part(p, 'sphere', surface([0x58b368, 0xf5c542, 0xe8742c][i], 'cloth'), x, 4.6, 2.2, .35, .35, .15); }
      var crane = new T.Group(); crane.position.set(6.5, 0, -1); p.add(crane); var yel = surface(0xf2c230, 'metal'); box(crane, yel, 0, 7, 0, .35, 14, .35); box(crane, yel, 2.2, 13.8, 0, 6.5, .22, .22); box(crane, yel, -1.4, 13.8, 0, .9, .45, .45); line(crane, surface(0x333a3c, 'metal'), [0, 14.3, 0], [4.9, 13.9, 0], .02); line(crane, surface(0x333a3c, 'metal'), [3.6, 13.8, 0], [3.6, 10.5, 0], .02); box(crane, yel, 3.6, 10.2, 0, .6, .5, .6);
      fx(part(crane, 'sphere', surface(0xff3b30, 'cloth'), 0, 14.2, 0, .1, .1, .1), 1.6, -1, 0);
      palm(p, -7, 5, 1.0); palm(p, 7, 5, 1.0); for (var i = 0; i < 6; i++) tuft(p, -5 + i * 2, 5.5, [0xe8742c, 0xf5c542], 4, .3);
      bird(p, 0, 13, 0, 7, .3, 1.0); bird(p, 0, 15, 0, 5, -.4, .9);
    };
    models.alhambra = function (p) {
      var stone = surface(0xd9bd94, 'stone'), lace = surface(0xefdcba, 'stone'), red = surface(0xc79a6e, 'stone');
      box(p, surface(0xcdb18a, 'stone'), 0, .1, 0, 18, .2, 14); box(p, surface(0xe9d9b6, 'stone'), 0, .22, 0, 17, .03, 13); box(p, surface(0x74b7b9, 'water'), 0, .26, 0, 3, .1, 10);
      for (var sd of [-1, 1]) for (var j = 0; j < 7; j++) {
        var g = new T.Group(); g.position.set(sd * 6.5, 0, -6 + j * 2); g.rotation.y = sd > 0 ? -Math.PI / 2 : Math.PI / 2; p.add(g);
        arch(g, lace, 0, 0, 0, 1.7, 3.0, .3); for (var cx of [-.95, .95]) { cyl(g, surface(0xf2e8d0, 'stone'), cx, 1.4, .05, .07, 2.8); box(g, lace, cx, 2.85, .05, .22, .12, .22); }
        box(g, red, 0, 3.15, .05, 2.0, .3, .5); cone(g, surface(0x9c715a, 'roof'), 0, 3.7, .05, .55, .8); for (var k = 0; k < 4; k++) box(g, surface(0xb7855e, 'stone'), -.8 + k * .53, 3.4, .32, .3, .12, .02);
      }
      box(p, surface(0xd0a17e, 'stone'), 0, 2.25, -8, 16, 4.5, 3); box(p, lace, 0, 4.6, -8, 16.3, .2, 3.3); crenel(p, surface(0xd0a17e, 'stone'), 0, 5.05, -6.5, 16, 0, 20, .5, .7, .3);
      for (var wi = -3; wi <= 3; wi++) { gothic(p, lace, wi * 2.1 - .5, 1.2, -6.46, 1.0, 2.3, .1, 0); box(p, surface(0x2f4a5a, 'glass'), wi * 2.1, 1.9, -6.5, .6, 1.5, .03); if (wi) box(p, surface(0x3a6f8f, 'glass'), wi * 2.1, 3.7, -6.5, .5, .7, .03); }
      collider(p, 0, -8, 4);
      for (var sd of [-1, 1]) { box(p, red, sd * 8.5, 3.3, -8, 2.2, 6.6, 2.4); crenel(p, red, sd * 8.5, 6.9, -8 + 1.1, 2.4, 0, 4, .4, .6, .3); crenel(p, red, sd * 8.5, 6.9, -8 - 1.1, 2.4, 0, 4, .4, .6, .3); gothic(p, lace, sd * 8.5 - .45, 3.0, -6.82, .9, 1.7, .1, 0); }
      var fb = new T.Group(); p.add(fb); cyl(fb, lace, 0, .5, 0, 1.4, .5); cyl(fb, surface(0x74b7b9, 'water'), 0, .78, 0, 1.2, .08); for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; part(fb, 'sphere', surface(0xe8dcc0, 'stone'), Math.sin(a) * .9, .95, Math.cos(a) * .9, .2, .22, .3); }
      profile(fb, lace, [[.35, 0], [.5, .15], [.3, .35], [.15, .9], [.4, 1.1]], 0, .8, 0); spark(p, 0, 2.0, 0, 16, .8, 1, .8, 0xcff2f4, .2, 0, 1.6); foam(p, 0, .3, 0, 2.4, 9);
      for (var i = 0; i < 6; i++) { var x = (i % 2 ? 1 : -1) * 3.7, z = -4 + Math.floor(i / 2) * 4; part(p, 'cone', surface(0x315a3f, 'leaf'), x, 1.9, z, .55, 3.8, .55); }
      tree(p, -4.6, 3, 0x6d9e6d, .9); tree(p, 4.6, 3, 0x6d9e6d, .9);
      for (var i = 0; i < 6; i++) lantern(p, -7 + i * 2.8, 1.4, 5.8, 1.0, 0xffd9a0);
      bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 0, 7, 0, 6, -.4, .9);
    };
    models.parkguell = function (p) {
      var cols = [0xf2c463, 0x4fa3b0, 0xe8744f, 0x9b7ad0, 0x58b368];
      for (var i = 0; i < 28; i++) { var a = i / 27 * Math.PI, x = Math.cos(a) * 10, z = Math.sin(a) * 6; box(p, surface(cols[i % 5], 'stone'), x, .35, z, 1.2, .5, .9, -a); part(p, 'sphere', surface(cols[(i + 2) % 5], 'stone'), Math.cos(a) * 10.5, .95 + Math.sin(i * .9) * .15, Math.sin(a) * 6.3, .5, .5, .22).rotation.y = -a; if (i % 3 === 0) { box(p, surface(0xf3ead6, 'stone'), x, .62, z + .02, .5, .04, .5, -a); } }
      for (var sd of [-1, 1]) {
        var g = new T.Group(); g.position.set(sd * 7.5, 0, -6.2); p.add(g); box(g, surface(0xe9d2a8, 'stone'), 0, 1.6, 0, 3.6, 3.2, 3.2); box(g, surface(0xd9b7a0, 'stone'), 0, .15, 0, 4.0, .3, 3.6);
        arch(g, surface(0x6fb1c4, 'stone'), 0, 0, 1.62, 1.1, 2.0, .1); box(g, surface(0x6b4a30, 'wood'), 0, .9, 1.64, .8, 1.7, .05); for (var w = -1; w <= 1; w += 2) box(g, surface(0x4b8fb3, 'glass'), w * 1.1, 1.9, 1.62, .6, .8, .04);
        profile(g, surface(0xe6a35c, 'roof'), [[2.6, 0], [2.7, .15], [2.0, .7], [1.0, 1.4], [.35, 1.9], [.0, 2.1]], 0, 3.1, 0); for (var m = 0; m < 10; m++) { var a = m / 10 * Math.PI * 2; sphere(g, surface(cols[m % 5], 'stone'), Math.sin(a) * 2.25, 3.6, Math.cos(a) * 2.25, .22, .14); }
        cyl(g, surface(0xf2e8cf, 'stone'), 0, 5.3, 0, .35, 1.4); part(g, 'cone', surface(0x4fa3b0, 'roof'), 0, 6.5, 0, .5, 1.4, .5); cyl(g, surface(0xf2e8cf, 'stone'), 0, 7.4, 0, .04, .6); box(g, surface(0xf2e8cf, 'stone'), 0, 7.45, 0, .3, .05, .05);
        collider(p, sd * 7.5, -6.2, 2.2);
      }
      var liz = new T.Group(); p.add(liz); for (var s = 0; s < 5; s++) { var r = .9 - s * .12; part(liz, 'sphere', surface(cols[(s + 1) % 5], 'stone'), 0, .55, -.2 + s * .55 - 1.2, r * .75, r * .55, .6); }
      part(liz, 'sphere', surface(0x58b368, 'stone'), 0, .55, 1.9, .55, .4, .7); sphere(liz, surface(0xf2c463, 'stone'), .22, .8, 2.3, .1); sphere(liz, surface(0xf2c463, 'stone'), -.22, .8, 2.3, .1); part(liz, 'sphere', surface(0xe8506a, 'stone'), 0, .45, 2.5, .2, .1, .3);
      for (var sd of [-1, 1]) { part(liz, 'sphere', surface(0xe8744f, 'stone'), sd * .85, .25, .5, .4, .13, .5); part(liz, 'sphere', surface(0xe8744f, 'stone'), sd * .8, .25, -.9, .4, .13, .5); }
      for (var i = 0; i < 14; i++) { var a = i * 1.1; box(liz, surface(cols[i % 5], 'stone'), Math.sin(a) * .5, .9 - (i % 3) * .1, -1 + i * .17, .22, .06, .22, a); }
      spark(p, 0, .9, 2.5, 12, .3, .3, .3, 0xcff2f4, .2, 0, 1.8);
      for (var i = 0; i < 6; i++) { cyl(p, surface(0xe8dcc0, 'stone'), -5 + i * 2, 1.6, -11, .28, 3.2); box(p, surface(0xd9c7a0, 'stone'), -5 + i * 2, 3.3, -11, .7, .2, .7); } box(p, surface(0xefe3c4, 'stone'), 0, 3.6, -11, 11.5, .3, 1.4);
      for (var i = 0; i < 16; i++) { var a = i * 2.4; tree(p, Math.sin(a) * 13, Math.cos(a) * 11, 0x7aa376, .7 + i % 3 * .15); } palm(p, -3, 9, 1.0); palm(p, 3, 9.5, 1.0); flowerbed(p, 0, 8, 10, 2);
      bunting(p, [-8, 3.3, 4.5], [8, 3.3, 4.5], 14, .8, cols, .45); bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 0, 11, 0, 6, -.4, .9);
    };

    models.dutchmill = function (p) {
      var bodies = [[0xf1ead8, 'stone'], [0xb4573e, 'brick'], [0x4a3b30, 'wood']];
      for (var i = 0; i < 3; i++) {
        var x = -8 + i * 8, z = i % 2 ? -3 : 1, wall = surface(bodies[i][0], bodies[i][1]), trim = surface(0xe9dfc8, 'stone');
        profile(p, wall, [[1.75, 0], [1.6, 3], [1.15, 5.2], [.95, 6.2]], x, 0, z); cyl(p, surface(0x7b6a58, 'stone'), x, .25, z, 1.85, .5);
        cyl(p, trim, x, 2.9, z, 1.72, .14); box(p, surface(0x6b4a30, 'wood'), x, 1.0, z + 1.68, .8, 1.5, .1); arch(p, trim, x, 0, z + 1.65, 1.1, 1.8, .1); windowArch(p, x - .01, 3.4, z + 1.35, .5, .8, 0);
        cyl(p, surface(0x7b6a58, 'wood'), x, 4.1, z, 1.62, .12); rails(p, surface(0x7b6a58, 'wood'), 1.7, 3.6, .5, x, z);
        profile(p, surface(0x39464a, 'roof'), [[1.2, 0], [1.28, .12], [.9, .6], [.4, 1.2], [0, 1.45]], x, 6.2, z); box(p, trim, x, 6.4, z + .9, .24, .24, .5);
        var rotor = new T.Group(); rotor.userData.dynamic = true; rotor.position.set(x, 5.0, z + 1.35); p.add(rotor);
        for (var j = 0; j < 4; j++) { var blade = new T.Group(); blade.rotation.z = j * Math.PI / 2; rotor.add(blade); box(blade, surface(0x6b4f3a, 'wood'), 0, 1.9, 0, .22, 3.8, .14); for (var k = 0; k < 7; k++) { box(blade, surface(0xefe6cc, 'wood'), .42, .55 + k * .5, .08, .8, .34, .03); box(blade, surface(0x6b4f3a, 'wood'), 0, .55 + k * .5, .04, .9, .04, .05); } box(blade, surface(0x6b4f3a, 'wood'), .8, 1.9, 0, .08, 3.4, .1); }
        sphere(rotor, surface(0xd8c4a2, 'wood'), 0, 0, .12, .28); batchMotion(rotor); animated.push({ type: 'rotor', object: rotor, s: .6 + i * .12 });
        collider(p, x, z, 1.8); for (var f = 0; f < 5; f++) { var a = f * 1.3; tuft(p, x + Math.sin(a) * 2.8, z + Math.cos(a) * 2.8, [0xe5413f, 0xf5c542, 0xf08ab0], 5, .4); }
      }
      box(p, surface(0x73afbb, 'water'), 0, .02, 7, 28, .035, 3); for (var s = 0; s < 6; s++) { var x = -11 + s * 4.4; box(p, surface(0xb8925f, 'wood'), x, .1, 5.3, .5, .2, .5); }
      var bg = new T.Group(); bg.userData.dynamic = true; bg.position.set(-10, .1, 7); p.add(bg); gondola(bg, true); bg.rotation.y = Math.PI / 2; batchMotion(bg); animated.push({ type: 'caravan', object: bg, x0: -12, len: 24 });
      for (var i = 0; i < 6; i++) tree(p, -12 + i * 4, -8, 0x8aac6f, .8); spark(p, 0, 5, 0, 22, 26, 2, 12, 0xf08ab0, .2, 2, .7); bird(p, 0, 10, 0, 9, .3, 1.0); bird(p, 0, 12, 0, 7, -.4, .9);
    };
    var oldTulips = models.tulips;
    models.tulips = function (p) {
      var cols = [0xe86b78, 0xf6c65f, 0xdf8cb1, 0xf3e4c2, 0xb094da, 0xf08040];
      for (var row = 0; row < 9; row++) {
        var z = -10 + row * 2.5; box(p, surface(0x8a6544, 'sand'), 0, .02, z, 26, .05, 1.8);
        for (var i = 0; i < 24; i++) { var x = -12 + i * 1.04 + (row % 2) * .3; cyl(p, surface(0x5d9253, 'leaf'), x, .35, z, .03, .7); part(p, 'sphere', surface(cols[(row + (i > 11 ? 3 : 0)) % 6], 'leaf'), x, .85, z, .22, .38, .22); }
      }
      box(p, surface(0xe1ccb0, 'sand'), 0, .04, 0, 2, .04, 27); bench(p, -11, 12); bench(p, 11, 12);
      var m = new T.Group(); m.position.set(0, 0, -15); p.add(m); profile(m, surface(0xf1ead8, 'stone'), [[1.3, 0], [1.2, 2.2], [.8, 3.8]], 0, 0, 0); profile(m, surface(0x39464a, 'roof'), [[.9, 0], [.5, .8], [0, 1.0]], 0, 3.8, 0);
      var rotor = new T.Group(); rotor.userData.dynamic = true; rotor.position.set(0, 3.2, 1.1); m.add(rotor); for (var j = 0; j < 4; j++) { var bl = new T.Group(); bl.rotation.z = j * Math.PI / 2; rotor.add(bl); box(bl, surface(0x6b4f3a, 'wood'), 0, 1.3, 0, .16, 2.6, .1); box(bl, surface(0xefe6cc, 'wood'), .35, 1.3, .06, .6, 2.0, .03); } batchMotion(rotor); p.updateMatrixWorld(true); m.remove(rotor); p.add(rotor); rotor.position.set(0, 3.2, -13.9); animated.push({ type: 'rotor', object: rotor, s: .7 });
      for (var i = 0; i < 4; i++) { cyl(p, surface(0x3f4a4c, 'metal'), -10 + i * 6.6, 1.1, 14, .05, 2.2); lantern(p, -10 + i * 6.6, 2.4, 14, 1.1); }
      spark(p, 0, 4, 0, 50, 24, 0, 24, 0xf59ab8, .2, 2, .6); bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 0, 10, 0, 6, -.4, .9);
    };
    models.taj = function (p) {
      var marble = surface(0xf4f0e4, 'stone'), shade = surface(0xe3ddcc, 'stone'), gold = surface(GOLD, 'metal');
      box(p, surface(0xe0d9c6, 'stone'), 0, .25, -2, 18, .5, 12); box(p, surface(0xf0ebdd, 'stone'), 0, .7, -2, 10.5, .4, 8.6);
      box(p, marble, 0, 3.4, -2, 6.6, 5.6, 6.6); var oc = box(p, marble, 0, 3.4, -2, 6.6, 5.6, 6.6, Math.PI / 4); collider(p, 0, -2, 4);
      for (var f = 0; f < 4; f++) { var g = new T.Group(); g.position.set(0, 0, -2); g.rotation.y = f * Math.PI / 2; p.add(g); arch(g, shade, 0, .9, 3.34, 2.4, 4.4, .25); box(g, surface(0x3b3a38, 'stone'), 0, 2.5, 3.32, 1.7, 3.0, .04);
        for (var s = -1; s <= 1; s += 2) { arch(g, shade, s * 2.3 - .65, 1.2, 3.31, 1.3, 2.4, .15); } box(g, shade, 0, 5.6, 3.35, 3.2, .35, .35); for (var k = -1; k <= 1; k++) part(g, 'sphere', marble, k * 1.0, 5.9, 3.3, .12, .25, .12); }
      for (var cx of [-1, 1]) for (var cz of [-1, 1]) { var px = cx * 2.9, pz = -2 + cz * 2.9; for (var q = 0; q < 4; q++) cyl(p, marble, px + (q % 2 - .5) * .5, 6.45, pz + (Math.floor(q / 2) - .5) * .5, .06, .9); sphere(p, marble, px, 7.0, pz, .45, .5); cyl(p, gold, px, 7.7, pz, .03, .5); }
      cyl(p, marble, 0, 6.2, -2, 2.2, .9); profile(p, marble, [[2.0, 0], [2.65, .55], [2.55, 1.5], [1.8, 2.7], [.9, 3.6], [.25, 4.2], [0, 4.4]], 0, 6.5, -2); cyl(p, gold, 0, 11.4, -2, .04, 1.2); sphere(p, gold, 0, 10.9, -2, .13);
      spark(p, 0, 12, -2, 8, .5, .6, .5, 0xfff0b0, .3, 1, 2.2);
      for (var sd of [-1, 1]) for (var zz of [-6, 3]) {
        cyl(p, marble, sd * 7, 3.9, zz, .38, 7.8); box(p, shade, sd * 7, .8, zz, 1.5, .6, 1.5);
        for (var b = 0; b < 3; b++) { cyl(p, shade, sd * 7, 2.2 + b * 2.3, zz, .62, .16); rails(p, marble, .6, 2.2 + b * 2.3, .3, sd * 7, zz); }
        for (var q = 0; q < 4; q++) cyl(p, marble, sd * 7 + (q % 2 - .5) * .6, 8.3, zz + (Math.floor(q / 2) - .5) * .6, .06, .8); sphere(p, marble, sd * 7, 8.9, zz, .55, .55); cyl(p, gold, sd * 7, 9.5, zz, .03, .5); collider(p, sd * 7, zz, .5);
      }
      box(p, surface(0x77b8c3, 'water'), 0, .08, 9, 2.8, .1, 9); box(p, surface(0xe9e3d2, 'stone'), -1.7, .11, 9, .35, .12, 9.2); box(p, surface(0xe9e3d2, 'stone'), 1.7, .11, 9, .35, .12, 9.2); foam(p, 0, .15, 9, 2.6, 8);
      for (var sd of [-1, 1]) for (var i = 0; i < 5; i++) { part(p, 'cone', surface(0x2f5a3f, 'leaf'), sd * 3.4, 1.4, 4.5 + i * 2.2, .5, 2.8, .5); tuft(p, sd * 5.2, 4.5 + i * 2.2, [0xf08ab0, 0xf5c542], 4, .3); }
      bird(p, 0, 12, 0, 8, .3, 1.0); bird(p, 0, 14, 0, 6, -.4, .9);
    };
    models.hawa = function (p) {
      var pink = surface(0xe3a08a, 'stone'), pink2 = surface(0xd88a74, 'stone'), white = surface(0xf6e6d0, 'stone'), dark = surface(0x5a3a30, 'stone');
      var half = [4, 4, 3, 2, 1];
      for (var r = 0; r < 5; r++) for (var c = -half[r]; c <= half[r]; c++) {
        var x = c * 1.6, y = r * 1.65 + .8; box(p, (r + c) % 2 ? pink : pink2, x, y, 0, 1.6, 1.65, 1.3);
        for (var wv = -1; wv <= 1; wv += 2) { var wx = x + wv * .4; box(p, white, wx, y + .05, .68, .56, .8, .14); box(p, dark, wx, y + .05, .76, .38, .6, .04); part(p, 'sphere', white, wx, y + .5, .72, .28, .2, .12); part(p, 'sphere', dark, wx, y + .38, .76, .19, .17, .04); }
        box(p, white, x, y + .78, .05, 1.64, .1, 1.34); if (c === half[r] || c === -half[r] || r === 4) { part(p, 'sphere', white, x, y + .95, .0, .45, .26, .45); part(p, 'cone', surface(0xd9a64a, 'metal'), x, y + 1.3, 0, .05, .4, .05); }
      }
      for (var c = -half[4]; c <= half[4]; c++) { part(p, 'sphere', surface(0xe9b3a0, 'stone'), c * 1.6, 8.95, 0, .85, .6, .85); cyl(p, surface(GOLD, 'metal'), c * 1.6, 9.7, 0, .03, .7); fx(sphere(p, surface(0xffe27a, 'cloth'), c * 1.6, 10.1, 0, .1), 1.2, 0, c); }
      for (var x of [-6, -3, 0, 3, 6]) collider(p, x, 0, 1.0);
      for (var j = 0; j < 3; j++) box(p, surface(0xe0af8c, 'stone'), 0, .12 + j * .12, 1.5 + j * .45, 16, .22, 1.2);
      bunting(p, [-8, 4.0, 3.2], [8, 4.0, 3.2], 16, .8, [0xf29a2e, 0xe5413f, 0xf5e6c8, 0xd9366a], .45);
      for (var i = 0; i < 6; i++) lantern(p, -7.5 + i * 3, 1.4, 4.1, 1.0, 0xffd89a); bird(p, 0, 11, 0, 8, .3, 1.0, 0xe8d5c8); bird(p, 0, 13, 0, 6, -.4, .9, 0xe8d5c8); spark(p, 0, 5, 1, 12, 14, 6, 1, 0xffe9b0, .24, 1, 1.5);
      palm(p, -9, 3, 1.0); palm(p, 9, 3, 1.0);
    };
    models.stepwell = function (p) {
      var cA = surface(0xd6bf9b, 'stone'), cB = surface(0xc2a47f, 'stone'); box(p, surface(0x6fa6a6, 'water'), 0, .03, 0, 2.8, .05, 2.8); foam(p, 0, .1, 0, 2.4, 2.4);
      var S = 6.2; for (var k = 0; k < 7; k++) { var hin = 1.4 + k * .64, y = k * .5 + .25, c = k % 2 ? cA : cB;
        box(p, c, 0, y, (hin + S) / 2, S * 2, .5, S - hin); box(p, c, 0, y, -(hin + S) / 2, S * 2, .5, S - hin); box(p, c, (hin + S) / 2, y, 0, S - hin, .5, hin * 2); box(p, c, -(hin + S) / 2, y, 0, S - hin, .5, hin * 2); }
      for (var side = 0; side < 4; side++) { var g = new T.Group(); g.rotation.y = side * Math.PI / 2; p.add(g); for (var i = -2; i <= 2; i++) box(g, surface(0xe9dbc0, 'stone'), i * 2.4, 3.75, S - .3, 1.8, .25, .5); }
      for (var row = 0; row < 2; row++) for (var i = 0; i < 6; i++) { arch(p, surface(0xcdbda3, 'stone'), -6 + i * 2.4 - .9 + .9, row * 2.2 + .5, -7.4, 1.8, 2.1, .6); }
      box(p, cA, 0, 4.7, -7.0, 14.6, .4, 1.8); for (var i = 0; i < 7; i++) box(p, cB, -7.2 + i * 2.4, 2.4, -7.1, .3, 4.4, 1.0);
      for (var i = 0; i < 5; i++) collider(p, -5 + i * 2.5, -7, .5);
      for (var i = 0; i < 4; i++) part(p, 'cone', surface(0xe9b24a, 'cloth'), -5 + i * 3.3, 5.3, -7.0, .5, .9, .5);
      bunting(p, [-6, 4.5, 6.2], [6, 4.5, 6.2], 12, .6, [0xf29a2e, 0xe5413f, 0xd9366a, 0xf5e6c8], .4); bunting(p, [-6.2, 4.5, -6], [-6.2, 4.5, 6], 10, .6, [0xf29a2e, 0xe5413f, 0xd9366a], .4);
      spark(p, 0, .3, 0, 14, 2.6, 0, 2.6, 0xffffff, .22, 1, 2); for (var i = 0; i < 4; i++) lantern(p, -7 + i * 4.6, 1.4, 7.6, 1.0, 0xffd89a); palm(p, 9, 5, 1.0); palm(p, -9, 5, 1.0); bird(p, 0, 9, 0, 8, .3, 1.0, 0xe8e8e0);
    };

    function mapleFlag(u, v) { return (u < .25 || u > .75) ? 0xd9362c : (Math.abs(u - .5) * 1.6 + Math.abs(v - .5) * .9 < .24 ? 0xd9362c : 0xffffff); }
    function belgianFlag(u) { return u < .34 ? 0x25262a : u < .67 ? 0xf5c52e : 0xd9362c; }
    function toro(p, x, z, s) { s = s || 1; var g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g); var st = surface(0xc9c4b6, 'stone'); box(g, st, 0, .15, 0, .9, .3, .9); cyl(g, st, 0, .9, 0, .16, 1.2); box(g, st, 0, 1.6, 0, .7, .14, .7); fx(box(g, surface(0xffd98a, 'cloth'), 0, 1.85, 0, .42, .38, .42), .9, 0, x); box(g, st, 0, 2.1, 0, .85, .12, .85); part(g, 'pyr', st, 0, 2.15, 0, 1.2, .5, 1.2, 0, Math.PI / 4, 0); sphere(g, st, 0, 2.7, 0, .1); }
    function fox(p, x, z, ry) { var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); var w = surface(0xf4efe4, 'stone'); box(g, surface(0xb9b3a4, 'stone'), 0, .12, 0, .8, .24, .9); part(g, 'cone', w, 0, .75, -.05, .3, 1.0, .3, -.15, 0, 0); part(g, 'sphere', w, 0, 1.35, .15, .26, .24, .27); part(g, 'cone', w, 0, 1.3, .45, .12, .35, .12, Math.PI / 2, 0, 0); for (var s of [-1, 1]) part(g, 'cone', w, s * .15, 1.65, .1, .08, .3, .08); box(g, surface(0xd9362c, 'cloth'), 0, 1.05, .2, .38, .2, .1); part(g, 'sphere', w, 0, .45, -.55, .15, .35, .2, -.4, 0, 0); }
    var oldTorii = models.torii;
    models.torii = function (p) {
      oldTorii(p); toro(p, -4.4, 3.2, 1.1); toro(p, 4.4, 3.2, 1.1); fox(p, -3.4, 5.6, .3); fox(p, 3.4, 5.6, -.3);
      for (var i = 0; i < 4; i++) { var x = -2.4 + (i % 2) * 4.8, y = 3.1 + (i > 1 ? 1 : 0) * 0; lantern(p, x + (x < 0 ? -.9 : .9), 3.0, 0, 1.2, 0xe03d2c); }
      bunting(p, [-2.4, 4.6, 0], [2.4, 4.6, 0], 7, .35, [0xf5f0e0, 0xe03d2c], .35);
      spark(p, 0, 5, 1, 50, 14, 0, 10, 0xffc9de, .24, 2, .8); bird(p, 0, 10, 0, 8, .3, 1.0, 0x2a2a30); for (var i = 0; i < 6; i++) tuft(p, -6 + i * 2.4, 6.5, [0xf0b8cd, 0xffffff], 4, .3);
    };
    var oldSakura = models.sakura;
    models.sakura = function (p) {
      oldSakura(p);
      var g = new T.Group(); g.position.set(-2.5, 0, 6.2); p.add(g); box(g, surface(0xe9eef5, 'cloth'), 0, .04, 0, 2.2, .06, 1.6); for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) if ((i + j) % 2) box(g, surface(0xd9362c, 'cloth'), -.8 + i * .55, .075, -.55 + j * .55, .55, .02, .55);
      box(g, surface(0x6b3b2a, 'wood'), -.3, .2, 0, .55, .24, .4); box(g, surface(0xf0a64a, 'cloth'), -.3, .36, 0, .5, .08, .35); cyl(g, surface(0xf6f1e4, 'cloth'), .5, .18, .15, .2, .18); sphere(g, surface(0xf49ab5, 'cloth'), .5, .32, .15, .14, .08);
      for (var i = 0; i < 6; i++) lantern(p, -6.5 + i * 2.6, 3.4, 7.2, 1.2, 0xffa9c6);
      bunting(p, [-7, 3.5, 7.2], [6, 3.5, 7.2], 14, .8, [0xf8c3d6, 0xffffff, 0xf095b7], .4);
      spark(p, 0, 6, 0, 80, 18, 0, 12, 0xffc4da, .22, 2, .7); spark(p, 0, .15, 0, 40, 14, 0, 9, 0xffc4da, .14, 1, 1); bird(p, 0, 9, 0, 8, .3, 1.0);
    };
    var oldHeaven = models.heaven;
    models.heaven = function (p) {
      oldHeaven(p);
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; lantern(p, Math.sin(a) * 4.35, 1.5, Math.cos(a) * 4.35, .9, 0xe03d2c); }
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4; pine(p, Math.sin(a) * 6.8, Math.cos(a) * 6.8, 1.0); }
      sphere(p, surface(0xffe27a, 'cloth'), 0, 7.95, 0, .17); fx(p.children[p.children.length - 1], 1.5, 0, 0);
      flag(p, 3.2, 1.0, 3.2, 3.2, 1.3, .85, function (u, v) { return Math.hypot(u - .3, v - .5) < .17 ? 0xf5d44c : 0xd9362c; }, 0, .1); flag(p, -3.2, 1.0, 3.2, 3.2, 1.3, .85, function (u, v) { return Math.hypot(u - .3, v - .5) < .17 ? 0xf5d44c : 0xd9362c; }, 0, .1);
      spark(p, 0, 1.0, 0, 20, 12, 1, 12, 0xe8eeea, .9, 0, .5); spark(p, 0, 5, 0, 12, 6, 5, 6, 0xfff0b0, .22, 1, 1.6); bird(p, 0, 10, 0, 7, .3, 1.0); bird(p, 0, 11, 0, 5, -.4, .9);
    };
    function panda(p, x, z, ry) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); var wh = surface(0xfbf8f1, 'cloth'), bk = surface(0x25262a, 'cloth');
      part(g, 'sphere', wh, 0, .75, 0, .7, .75, .65); part(g, 'sphere', wh, 0, 1.65, .15, .5, .46, .48); for (var s of [-1, 1]) { sphere(g, bk, s * .38, 2.05, .05, .17); part(g, 'sphere', bk, s * .2, 1.7, .55, .15, .12, .07); sphere(g, surface(0xffffff, 'cloth'), s * .2, 1.72, .6, .04); part(g, 'sphere', bk, s * .72, .95, .1, .22, .45, .25).rotation.z = s * .3; part(g, 'sphere', bk, s * .4, .15, .45, .26, .18, .4); }
      sphere(g, bk, 0, 1.55, .62, .09, .07); line(g, surface(0x6fb765, 'wood'), [.5, .5, .55], [.5, 1.6, .55], .06); part(g, 'sphere', surface(0x7cc66f, 'leaf'), .5, 1.65, .55, .2, .1, .1);
    }
    var oldBamboo = models.bamboo;
    models.bamboo = function (p) {
      oldBamboo(p); panda(p, 1.9, 1.0, -.5);
      part(p, 'cylinder', surface(0x7bb8c0, 'glass'), -5, .05, 3.8, 2.2, .06, 1.5); part(p, 'cylinder', surface(0x9ab59a, 'stone'), -5, .03, 3.8, 2.5, .05, 1.7);
      for (var i = 0; i < 4; i++) { var a = i * 1.7; sphere(p, surface(0x4f9a5a, 'leaf'), -5 + Math.sin(a) * 1.1, .1, 3.8 + Math.cos(a) * .7, .3, .05); sphere(p, surface(0xf4a6c0, 'leaf'), -5 + Math.sin(a) * 1.1, .15, 3.8 + Math.cos(a) * .7, .12, .1); }
      for (var i = 0; i < 5; i++) lantern(p, -6 + i * 3, 2.6, 5.8, 1.2, 0xe03d2c); bunting(p, [-6, 2.8, 5.8], [6, 2.8, 5.8], 12, .5, [0xe03d2c, 0xf5d44c], .35);
      spark(p, 0, 5, 0, 60, 12, 0, 9, 0x8fd078, .22, 2, .6); spark(p, 0, 1.5, 0, 14, 14, 2, 10, 0xe8f0e8, .9, 0, .4); bird(p, 0, 7, 0, 7, .3, .8, 0x6b5a4a);
    };
    var oldSquareH = models.hockey;
    models.hockey = function (p) {
      oldSquareH(p);
      for (var s of [-1, 1]) { box(p, surface(0xf4f3e4, 'cloth'), 0, .35, s * 3.9, 12.6, .6, .15); box(p, surface(0xd75258, 'cloth'), 0, .7, s * 3.9, 12.7, .08, .2); box(p, surface(0xf4f3e4, 'cloth'), s * 6.2, .35, 0, .15, .6, 7.9); box(p, surface(0xd75258, 'cloth'), s * 6.2, .7, 0, .2, .08, 8); }
      [[-6.4, -4.1], [6.4, -4.1], [-6.4, 4.1], [6.4, 4.1]].forEach(function (c) { flag(p, c[0], 0, c[1], 3.6, 1.5, .9, mapleFlag, 0, .12); });
      var k = new T.Group(); k.position.set(-8.5, 0, 0); p.add(k); box(k, surface(0x9a6a45, 'wood'), 0, .9, 0, 2.2, 1.8, 1.6); box(k, surface(0xf4f3e4, 'cloth'), 0, 2.0, 0, 2.5, .15, 1.9); for (var i = 0; i < 5; i++) box(k, surface(i % 2 ? 0xd9362c : 0xffffff, 'cloth'), -.9 + i * .45, 2.15, .6, .42, .3, .9).rotation.x = .5; for (var i = 0; i < 3; i++) cyl(k, surface(0xf0eadc, 'cloth'), -.6 + i * .6, 1.95, .75, .14, .22);
      spark(k, 0, 2.5, .3, 10, .5, .6, .5, 0xffffff, .55, 0, 1.2); lantern(p, -8.5, 3.2, 1.2, 1.2, 0xffe0a0);
      spark(p, 0, .2, 0, 30, 11, 0, 7, 0xffffff, .2, 1, 2); spark(p, 0, 3, 0, 40, 22, 4, 16, 0xffffff, .18, 2, .5); bird(p, 0, 8, 0, 8, .3, 1.0, 0x555a60);
      bunting(p, [-6.2, 3.2, -4.1], [6.2, 3.2, -4.1], 14, .9, [0xd9362c, 0xffffff, 0x3f7fc4], .45);
    };
    var oldFalls = models.falls;
    models.falls = function (p) {
      oldFalls(p);
      [[-8, -1.5, 2.2, 3.2], [8, -2, 2.4, 3.6], [-7, -5, 2.4, 2.6], [7, -5.5, 2.2, 2.2]].forEach(function (r) { part(p, 'sphere', surface(0x86a08e, 'stone'), r[0], 0, r[1], r[2], r[3] * .8, r[2] * .9); part(p, 'sphere', surface(0xffffff, 'snow'), r[0], r[3] * .55, r[1], r[2] * .62, r[3] * .3, r[2] * .55); });
      var cols = [0xe5413f, 0xf29a3a, 0xf5d44c, 0x58b368, 0x4f86d6, 0x8a5ad0];
      cols.forEach(function (c, k) { var R = 6.4 - k * .22, pts = []; for (var i = 0; i <= 14; i++) { var a = i / 14 * Math.PI; pts.push(new T.Vector3(Math.cos(a) * R, Math.sin(a) * R * .8, 7.5)); } var m = mesh(p, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, .13, 4, false), surface(c, 'cloth')); fx(m, .3, 0, k); m.castShadow = false; m.userData.kind = 'uvfixed'; });
      var bt = new T.Group(); bt.userData.dynamic = true; bt.position.set(-4, .1, 4.5); p.add(bt); part(bt, 'sphere', surface(0x3f7fc4, 'cloth'), 0, .25, 0, 1.2, .28, .5); box(bt, surface(0xf5f0e0, 'cloth'), 0, .55, 0, 1.4, .3, .7); box(bt, surface(0xf5f0e0, 'cloth'), .3, .9, 0, .7, .4, .6); cyl(bt, surface(0xd9362c, 'cloth'), -.4, 1.0, 0, .12, .5); batchMotion(bt); animated.push({ type: 'xswing', object: bt, x0: 0, amp: 4, s: .2 });
      flag(p, -8, 0, 7, 3.4, 1.5, .9, mapleFlag, 0, .12); flag(p, 8, 0, 7, 3.4, 1.5, .9, mapleFlag, 0, .12);
      spark(p, 0, 1.2, 1.4, 40, 11, 2.5, 3, 0xffffff, 1.3, 0, .55); spark(p, 0, 1.2, 3.5, 18, 12, 1, 3, 0xffffff, .24, 1, 2); bird(p, 0, 9, 0, 8, .3, 1.0); bird(p, 0, 11, 0, 6, -.4, .9);
    };
    var oldGP = models.grandplace;
    models.grandplace = function (p) {
      oldGP(p);
      var cols = [0xf5c52e, 0xd9362c, 0x25262a, 0xffffff];
      bunting(p, [-4.5, 5.2, -2], [0, 5.8, -2], 8, .7, cols, .45); bunting(p, [0, 5.8, -2], [4.5, 5.2, -2], 8, .7, cols, .45); bunting(p, [-6, 2.2, 1], [6, 2.2, 1], 18, 1.1, [0xf5c52e, 0xd9362c, 0xffffff], .4);
      for (var i = 0; i < 3; i++) flag(p, -4.5 + i * 4.5, 6.2 + (i % 2) * 1, -3.8, 1.5, 1.3, .8, belgianFlag, 0, .1);
      for (var i = 0; i < 6; i++) { var x = -6.5 + i * 2.6; cyl(p, surface(0x3f4a4c, 'metal'), x, 1.1, 3.4, .05, 2.2); lantern(p, x, 2.4, 3.4, 1.2, 0xffd48a); }
      [-6, 6].forEach(function (x) { box(p, surface(0xd9c3a0, 'stone'), x, .4, 4.3, 1.4, .8, .8); tuft(p, x, 4.3, [0xe5413f, 0xf5c542, 0xffffff], 9, .35); });
      for (var st of [-1, 1]) { box(p, surface(0xefe3c8, 'cloth'), st * 3.2, 1.5, 1.6, 1.5, .1, 1.1); for (var k = 0; k < 4; k++) box(p, surface(k % 2 ? 0xd9362c : 0xffffff, 'cloth'), st * 3.2 + (k - 1.5) * .38, 1.6, 1.3, .36, .06, .6).rotation.x = .3; cyl(p, surface(0x7a5a3a, 'wood'), st * 3.9, .75, 2.1, .04, 1.5); cyl(p, surface(0x7a5a3a, 'wood'), st * 2.5, .75, 2.1, .04, 1.5); box(p, surface(0xb98a5a, 'wood'), st * 3.2, .6, 1.8, 1.4, .8, .8); }
      spark(p, 0, 9, -3.4, 10, 3.5, 3, 1, 0xffe08a, .3, 1, 2); spark(p, 0, 10, -3.8, 6, .4, .8, .4, 0xffe9a8, .32, 1, 2.4); bird(p, 0, 11, 0, 7, .3, 1.0); bird(p, 0, 9, 0, 6, -.4, .9);
    };
    var oldWaffle = models.waffle;
    models.waffle = function (p) {
      oldWaffle(p);
      cyl(p, surface(0xa5724c, 'wood'), 1.5, 3.5, -.6, .1, 1.5); spark(p, 1.5, 3.9, -.6, 12, .5, .5, .5, 0xf4efe6, .6, 0, 1.0); spark(p, -.4, 2.6, .6, 10, .6, .3, .5, 0xfff4e0, .55, 0, 1.3);
      bunting(p, [-3.0, 3.3, 1.8], [3.0, 3.3, 1.8], 10, .5, [0xf5c52e, 0xd9362c, 0x25262a], .38); flag(p, 2.9, 2.8, -1.2, 2.4, 1.3, .85, belgianFlag, 0, .1);
      for (var s of [-1, 1]) { var x = s * 4.6, z = 3.4; cyl(p, surface(0xf0e6d0, 'wood'), x, .7, z, .6, .08); cyl(p, surface(0x7a5a3a, 'wood'), x, .35, z, .05, .7); cyl(p, surface(0x7a5a3a, 'wood'), x, 1.5, z, .04, 2.4); part(p, 'cone', surface(s > 0 ? 0xd9362c : 0xf5c52e, 'cloth'), x, 2.6, z, 1.2, .5, 1.2); sphere(p, surface(0xf0b748, 'sand'), x + .2, .86, z, .2, .1); sphere(p, surface(0xf06866, 'leaf'), x - .2, .9, z + .1, .09); }
      for (var i = 0; i < 3; i++) lantern(p, -2.4 + i * 2.4, 3.1, 1.8, 1.0, 0xffd48a);
      for (var i = 0; i < 4; i++) tuft(p, -5 + i * 3.3, -3.5, [0xf08ab0, 0xf5c542, 0xffffff], 5, .4); bird(p, 0, 7, 0, 6, .3, .9, 0xb9b0a2);
    };
    var oldLouvre = models.louvre;
    models.louvre = function (p) {
      oldLouvre(p);
      glowPart(p, 'sphere', surface(0xffe27a, 'cloth'), 0, 5.2, .5, .14, .14, .14, 1.5); spark(p, 0, 5.2, .5, 8, .8, .8, .8, 0xffffff, .3, 1, 2.2);
      [[-5, 4], [5, 4]].forEach(function (c) { cyl(p, surface(0xe3dccb, 'stone'), c[0], .25, c[1], .3, .5); spark(p, c[0], .9, c[1], 12, .3, .4, .3, 0xcdf0f6, .18, 0, 2); spark(p, c[0], .8, c[1], 6, 1.2, .2, .6, 0xffffff, .26, 3, 1); });
      [[-3.2, 7.8], [3.2, 7.8]].forEach(function (c) { part(p, 'pyr', surface(0xb2e1ec, 'glass'), c[0], 0, c[1], 1.3, 1.2, 1.3, 0, Math.PI / 4, 0); });
      flag(p, -8, 4.5, 2.4, 3.0, 1.5, .95, frenchFlag, 0, .11); flag(p, 8, 4.5, 2.4, 3.0, 1.5, .95, frenchFlag, 0, .11);
      for (var i = 0; i < 6; i++) { var x = -6 + i * 2.4; cyl(p, surface(0x2f3b3d, 'metal'), x, 1.1, 7.2, .05, 2.2); lantern(p, x, 2.4, 7.2, 1.1, 0xffd48a); }
      hedge(p, -8, 6, -3, 6); hedge(p, 3, 6, 8, 6); bird(p, 0, 10, 0, 8, .3, 1.0, 0xe9e7e2); bird(p, 0, 12, 0, 6, -.4, .9, 0xe9e7e2);
    };
    function river2(p, egypt) {
      box(p, egypt ? surface(0x62bcc6, 'water') : surface(0x6fb6c8, 'water'), 0, .02, 0, 15, .08, 8);
      if (!egypt) {
        for (var sd of [-1, 1]) { box(p, surface(0xcdbb98, 'stone'), 0, .3, sd * 4.3, 16, .6, .8); box(p, surface(0xe0d2b0, 'stone'), 0, .66, sd * 4.3, 16, .1, .95);
          for (var i = 0; i < 5; i++) { var x = -6 + i * 3; cyl(p, surface(0x2f3b3d, 'metal'), x, 1.5, sd * 4.5, .05, 1.8); lantern(p, x, 2.55, sd * 4.5, 1.1, 0xffd48a); }
          for (var i = 0; i < 2; i++) { var x = -3 + i * 6, g = new T.Group(); g.position.set(x, .7, sd * 4.55); p.add(g); box(g, surface(0x3f7a5e, 'wood'), 0, .45, 0, 1.6, .7, .6); box(g, surface(0x356a50, 'wood'), 0, .95, sd * -.1, 1.7, .08, .8).rotation.x = sd * .4; for (var b = 0; b < 5; b++) box(g, surface([0xe5413f, 0xf5c542, 0x4f86d6, 0xf2f0e6, 0x8a5ad0][b], 'cloth'), -.6 + b * .3, .85, sd * .1, .2, .22, .1); }
        }
        var pont = new T.Group(); pont.position.set(4.8, 0, 0); p.add(pont); box(pont, surface(0xe9d4b4, 'stone'), 0, 1.4, 0, 2.0, .30, 8.8);
        for (var b of [-1, 1]) { arch(pont, surface(0xe0cdb2, 'stone'), -.9, .10, b * 3.35, 1.8, 1.25, .3); box(pont, surface(0xe9d4b4, 'stone'), 0, 1.85, b * 4.2, 2.0, .7, .2); }
        for (var b of [-1, 1]) for (var i = 0; i < 3; i++) { cyl(pont, surface(0x2f3b3d, 'metal'), 0, 2.2, b * (3.5 - i * 1.6), .05, 1.0); lantern(pont, 0, 2.9, b * (3.5 - i * 1.6), 1.0, 0xffd48a); }
        for (var i = 0; i < 4; i++) { var tx = -6 + i * 3; tree(p, tx, 6.3, 0x6aa86c, 1.0); tree(p, tx + 1.5, -6.3, 0x6aa86c, 1.0); } bench(p, 0, 5.7);
        var bt = new T.Group(); bt.userData.dynamic = true; bt.position.set(-2, .1, 0); p.add(bt); part(bt, 'sphere', surface(0xf5f0e4, 'cloth'), 0, .25, 0, 1.9, .3, .7); box(bt, surface(0xf5f0e4, 'cloth'), 0, .5, 0, 3.2, .35, 1.1); box(bt, surface(0xbfe3ee, 'cloth'), 0, .9, 0, 2.8, .5, .95); box(bt, surface(0xf5f0e4, 'cloth'), 0, 1.2, 0, 3.0, .08, 1.05); box(bt, surface(0xd9362c, 'cloth'), 0, .5, .56, 3.2, .12, .02); flag(bt, 1.6, 1.1, 0, 1.0, .7, .45, frenchFlag, 0, .08); batchMotion(bt); animated.push({ type: 'xswing', object: bt, x0: -1.9, amp: 3.6, s: .13 });
      } else {
        for (var sd of [-1, 1]) { box(p, surface(0xdac9a4, 'sand'), 0, .08, sd * 4.5, 16, .2, 1.4);
          for (var i = 0; i < 9; i++) { var x = -6.5 + i * 1.6; cyl(p, surface(0x86a762, 'wood'), x, .7, sd * 3.9, .03, 1.4 + (i % 3) * .3); sphere(p, surface(0x8fae64, 'leaf'), x, 1.5 + (i % 3) * .3, sd * 3.9, .13, .3); if (i % 3 === 0) sphere(p, surface(0xf4a6c0, 'leaf'), x + .3, .2, sd * 3.5, .15, .1); } }
        palm(p, -6.5, 6, 1.2); palm(p, 6.5, 6, 1.2); palm(p, -5.2, -6, 1.1); palm(p, 7, -6.5, 1.1); bench(p, 0, 5.7);
        var bt = new T.Group(); bt.userData.dynamic = true; bt.position.set(-2, .1, 0); p.add(bt); part(bt, 'sphere', surface(0x8a5b3a, 'wood'), 0, .3, 0, 1.9, .3, .55); box(bt, surface(0xb68355, 'wood'), 0, .55, 0, 1.6, .1, .8);
        cyl(bt, surface(0x7a5a38, 'wood'), .2, 1.9, 0, .06, 3.2); var sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(2.3, .1); sh.lineTo(0, 3.0); sh.closePath(); var sg = new T.ShapeGeometry(sh); sg.attributes.uv.array.fill(0); var sail = mesh(bt, sg, surface(0xf8f2e2, 'cloth'), .2, .6, 0, 0, Math.PI / 2, 0); sail.userData.kind = 'uvfixed'; sail.scale.set(1, 1, 1);
        line(bt, surface(0xe7d8b6, 'cloth'), [.2, 3.3, 0], [-1.6, .55, 0], .015); flag(bt, .2, 3.4, 0, .5, .8, .45, function () { return 0xd9362c; }, 0, .06);
        batchMotion(bt); animated.push({ type: 'xswing', object: bt, x0: -1.9, amp: 3.6, s: .13 });
        foam(p, 0, .1, 0, 10, 5);
      }
      spark(p, 0, .12, 0, 30, 14, 0, 7, 0xffffff, .26, 1, 2); bird(p, 0, 7, 0, 7, .3, 1.0, egypt ? 0xf4f0e6 : 0xf5f5f0); bird(p, 0, 9, 0, 5, -.4, .9, egypt ? 0xf4f0e6 : 0xf5f5f0);
    }
    models.river = function (p) { river2(p, false); }; models.nile = function (p) { river2(p, true); };
    var oldBasils = models.basils;
    models.basils = function (p) {
      oldBasils(p);
      var towers = [[-2.4, -2, 6.3], [2.4, -2, 7.2], [-2.4, 2, 7.2], [2.4, 2, 6.3], [0, 0, 9.5], [-2.8, 0, 5.2], [2.8, 0, 5.5], [0, -2.7, 6.0], [0, 2.7, 5.4]];
      towers.forEach(function (a, i) {
        for (var k = 0; k < 8; k++) { var an = k / 8 * Math.PI * 2 + i; part(p, 'sphere', surface(k % 2 ? 0xf4dcc4 : 0xd9503f, 'stone'), a[0] + Math.sin(an) * .7, a[2] - .45, a[1] + Math.cos(an) * .7, .24, .26, .24); }
        fx(sphere(p, surface(0xffe27a, 'cloth'), a[0], a[2] + 2.9, a[1], .1), 1.4, 0, i); part(p, 'sphere', surface(0xffffff, 'snow'), a[0], a[2] + .8, a[1], .22, .08, .22);
        spark(p, a[0], a[2] + 1.2, a[1], 3, .9, 1.6, .9, 0xfff1b0, .24, 1, 2);
      });
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(a) * 6.2, z = Math.cos(a) * 6.2; cyl(p, surface(0x3f4a4c, 'metal'), x, 1.2, z, .06, 2.4); lantern(p, x, 2.6, z, 1.2, 0xffd48a); }
      bunting(p, [-4.3, 2.5, 4.4], [4.3, 2.5, 4.4], 12, .6, [0xe5413f, 0xf5f0e0, 0x3f7fc4, 0xf5c542], .4); snowman(p, 6.8, 3); snowman(p, -6.6, 3.8);
      for (var i = 0; i < 6; i++) part(p, 'sphere', surface(0xffffff, 'snow'), -5 + i * 2, .2, 4.8 + (i % 2), .9, .3, .6);
      bird(p, 0, 12, 0, 7, .3, 1.0, 0x4a4a52); bird(p, 0, 13, 0, 5, -.4, .9, 0x4a4a52);
    };
    var oldPark = models.park;
    models.park = function (p) {
      oldPark(p);
      var dg = new T.Group(); dg.userData.dynamic = true; dg.position.set(1, .12, -2.7); p.add(dg); for (var i = 0; i < 3; i++) { var x = -1.2 + i * 1.2, z = Math.sin(i * 2) * .3; part(dg, 'sphere', surface(0xfbfaf4, 'cloth'), x, .18, z, .3, .2, .4); sphere(dg, surface(0xfbfaf4, 'cloth'), x + .28, .4, z, .18); part(dg, 'cone', surface(0xf29a2e, 'cloth'), x + .5, .4, z, .07, .2, .07, Math.PI / 2, 0, 0).rotation.z = -Math.PI / 2; } batchMotion(dg); animated.push({ type: 'caravan', object: dg, x0: -1.5, len: 5 });
      var bl = new T.Group(); bl.position.set(-6, 0, 9); p.add(bl); box(bl, surface(0xf3f0e8, 'cloth'), 0, .04, 0, 2.2, .06, 1.7); for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) if ((i + j) % 2) box(bl, surface(0xd9362c, 'cloth'), -.8 + i * .55, .075, -.55 + j * .55, .55, .02, .55); box(bl, surface(0x9a6a45, 'wood'), 0, .22, 0, .6, .28, .4); sphere(bl, surface(0xe5413f, 'leaf'), .6, .15, .3, .12);
      spark(p, 0, 8, 0, 70, 28, 0, 24, 0xe89a3c, .26, 2, .7); spark(p, 1, .15, -4, 20, 11, 0, 6, 0xffffff, .24, 1, 2); bird(p, 0, 12, 0, 12, .3, 1.0, 0x6b5a4a); bird(p, 0, 14, 0, 9, -.4, .9, 0x6b5a4a);
    };

    // Quiet perimeter city scenery leaves the spawn and the three routes open.
    var perimeter = [[-55,-54],[-40,-55],[-24,-55],[-8,-55],[8,-55],[24,-55],[40,-55],[55,-54],[-55,-25],[-55,0],[-55,25],[-45,55],[-25,55],[55,10],[55,32],[45,55]];
    if (country.id !== 'eg') perimeter.forEach(function (a, i) {
      var h = country.id === 'us' ? 7 + i % 3 * 3 : 3.2 + i % 3 * 0.9;
      var tint = i % 2 ? WHITE : STONE;
      building(root, a[0], a[1], 4, h, 3.5, tint, country.color);
      colliders.push({ x: a[0], z: a[1], r: 2.7 });
    });
    else { tree(root, -55, 14, 0x72a96c, 1.2, true); tree(root, 55, 26, 0x72a96c, 1.2, true); }
    var walkwayColor = country.id === 'eg' ? 0xefdab4 : winter ? 0xb5c1c5 : 0xd8ccb0;
    box(root, walkwayColor, 0, 0.015, 8, 3.8, 0.05, 58);
    box(root, walkwayColor, 0, 0.016, -5, 72, 0.05, 3.6);
    for (var i = 0; i < 5; i++) {
      tree(root, -9, 3 + i * 5, country.id === 'jp' ? 0xe8aac5 : 0x71a477, 0.75, country.id === 'br' || country.id === 'eg');
      tree(root, 8, -22 + i * 6, country.id === 'jp' ? 0xe8aac5 : 0x71a477, 0.75, country.id === 'br' || country.id === 'eg');
    }
    country.places.forEach(function (place) {
      var p = new T.Group(); p.name = place.id; p.position.set(place.x, 0, place.z); root.add(p);
      if (!models[place.kind]) throw new Error('Bilinmeyen gezi modeli: ' + place.kind);
      var firstCollider=colliders.length;models[place.kind](p);if(!options.thumbnail)district(p,place);
      var scale=place.scale||1;p.scale.setScalar(scale);
      for(var i=firstCollider;i<colliders.length;i++){var c=colliders[i];c.x=place.x+(c.x-place.x)*scale;c.z=place.z+(c.z-place.z)*scale;c.r*=scale;}
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
      var g=bake(meshes,function(m){return m.matrixWorld;},true);
      var merged = new T.Mesh(g, mat); merged.castShadow = type!=='water'&&type!=='glass'; merged.receiveShadow = true; if(merged.castShadow)merged.customDepthMaterial=depthMaterial(); root.add(merged);
    });
    old.forEach(function (m) { m.removeFromParent(); });
    root.updateMatrixWorld(true);
    }

    // Birds + sparkles: built once as ONE mesh (one draw), animated entirely by the
    // shared clock uniform in the vertex shader. aA = (phase, kind, speed, size),
    // aB = bird centre (xyz) + phase, or the sprite corner (xy) for particles.
    function buildLife() {
      if (!lifeBirds.length && !lifeSparks.length) return;
      var w = new T.Vector3(), pos = [], col = [], aW = [], aB = [], aA = [], idx = [], n = 0, c = new T.Color(), dark = new T.Color();
      var tris = [[[0,.02,.55,0],[-.16,0,-.32,0],[.16,0,-.32,0],0],[[-.12,0,.22,0],[-.12,0,-.22,0],[-1.05,.05,-.12,1],1],[[.12,0,.22,0],[.12,0,-.22,0],[1.05,.05,-.12,1],1],[[0,.0,-.3,0],[-.12,.0,-.62,0],[.12,0,-.62,0],0]];
      lifeBirds.forEach(function (b) {
        var s = b.p.scale.x; w.set(b.x, b.y, b.z); b.p.localToWorld(w); c.setHex(b.col); dark.copy(c).multiplyScalar(.42);
        tris.forEach(function (t) { for (var i = 0; i < 3; i++) { var v = t[i]; pos.push(v[0], v[1], v[2]); aW.push(v[3]); var cc = v[3] ? dark : c; col.push(cc.r, cc.g, cc.b); aB.push(w.x, w.y, w.z, b.ph); aA.push(b.r * s, 10, b.s, b.size * s); idx.push(n++); } });
      });
      var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      lifeSparks.forEach(function (s) {
        var sc = s.p.scale.x; w.set(s.x, s.y, s.z); s.p.localToWorld(w); c.setHex(s.col);
        for (var i = 0; i < 4; i++) { pos.push(w.x, w.y, w.z); aW.push(0); col.push(c.r, c.g, c.b); aB.push(corners[i][0], corners[i][1], 0, 0); aA.push(s.ph, s.kind, s.speed, s.size * sc); }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
      });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('aW', new T.Float32BufferAttribute(aW, 1)); g.setAttribute('aB', new T.Float32BufferAttribute(aB, 4)); g.setAttribute('aA', new T.Float32BufferAttribute(aA, 4)); g.setIndex(idx);
      var m = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, transparent: true, depthWrite: false });
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uLandscapeTime = landscapeClock;
        sh.vertexShader = 'uniform float uLandscapeTime;\nattribute float aW;\nattribute vec4 aB;\nattribute vec4 aA;\nvarying vec2 vC;\nvarying float vKind;\nfloat gFade=1.0;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
          'vKind=aA.y;vC=aB.xy;\n' +
          'if(aA.y>9.5){float a=uLandscapeTime*aA.z+aB.w;vec3 q=position*aA.w;q.y+=aW*sin(uLandscapeTime*8.5+aB.w*5.0)*.5*aA.w;vec2 d=normalize(vec2(-sin(a),cos(a)*.8))*sign(aA.z);\n' +
          'transformed=vec3(aB.x+cos(a)*aA.x+q.x*d.y+q.z*d.x,aB.y+sin(a*2.0)*.35+q.y,aB.z+sin(a)*aA.x*.8-q.x*d.x+q.z*d.y);}\n' +
          'else{float life=fract(uLandscapeTime*aA.z*.1+aA.x);float fade=1.0;\n' +
          'if(aA.y<.5){transformed.y+=life*2.4;transformed.x+=sin(life*6.28+aA.x*9.0)*.25;fade=sin(life*3.14159);}\n' +
          'else if(aA.y<1.5){fade=.12+.88*pow(.5+.5*sin(uLandscapeTime*aA.z*2.2+aA.x*40.0),3.0);}\n' +
          'else if(aA.y<2.5){transformed.y-=life*3.2;transformed.x+=sin(life*9.0+aA.x*30.0)*.6;transformed.z+=cos(life*7.0+aA.x*20.0)*.45;fade=sin(life*3.14159);}\n' +
          'else{transformed.y+=sin(uLandscapeTime*2.0+aA.x*30.0)*.06;fade=.6+.4*sin(uLandscapeTime*3.0+aA.x*50.0);}\n' +
          'gFade=aA.w*(.15+.85*fade)*.34;}').replace('#include <project_vertex>', '#include <project_vertex>\nif(aA.y<9.5){mvPosition.xy+=aB.xy*gFade;gl_Position=projectionMatrix*mvPosition;}');
        sh.fragmentShader = 'varying vec2 vC;\nvarying float vKind;\n' + sh.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif(vKind<9.5){float dd=length(vC);if(dd>1.0)discard;diffuseColor.a*=smoothstep(1.0,.35,dd)*.9;}');
      };
      m.customProgramCacheKey = function () { return 'gezi-life-v2'; };
      var mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.raycast = function () {}; mesh.name = 'canlılık'; root.add(mesh); geometries.set('life', g); materials.set('life', m);
    }
    if (!options.thumbnail) buildLife();

    return {
      root: root,
      colliders: colliders,
      update: function (dt, time) {
        if (disposed) return;
        landscapeClock.value=reducedMotion?0:time;var water=textures.get('water');if(water&&!reducedMotion)water.offset.y=-time*.045;
        animated.forEach(function (a) {if(reducedMotion)return;if(a.type==='rotor'){a.object.rotation.z=time*(a.s||.65);}else if(a.type==='boat'){a.object.position.y=.22+Math.sin(time*1.4)*.045;a.object.position.z=a.z+Math.sin(time*.16)*2;a.object.rotation.z=Math.sin(time*.9)*.018;}else if(a.type==='fish'){a.object.position.x=Math.sin(time*.6)*1.7;a.object.position.z=Math.cos(time*.4)*.4;}else if(a.type==='orbit'){var oa=time*a.s;a.object.position.set((a.cx||0)+Math.cos(oa)*a.r,.08+Math.sin(time*1.3)*.03,(a.cz||0)+Math.sin(oa)*a.r);a.object.rotation.y=-oa-Math.PI/2;}else if(a.type==='xswing'){var xs=Math.sin(time*a.s);a.object.position.x=a.x0+xs*a.amp;a.object.rotation.y=Math.cos(time*a.s)>0?0:Math.PI;}else if(a.type==='zswing'){var zs=Math.sin(time*a.s);a.object.position.z=a.z0+zs*a.amp;a.object.rotation.y=Math.cos(time*a.s)>0?0:Math.PI;}else if(a.type==='drift'){a.object.rotation.y=time*a.s;}else if(a.type==='caravan'){var cx=a.x0+(time*.55)%30;a.object.position.x=cx;a.object.position.y=Math.abs(Math.sin(time*3.1))*.05;}else if(a.type==='float'){a.object.position.y=a.y+Math.sin(time*.55+a.phase)*.45;a.object.rotation.y=Math.sin(time*.13)*.15;}else if(a.type==='cablecar'){var t=.5+Math.sin(time*.16)*.43;a.object.position.set(-7+t*7,3.12+t*6.1,3-t*3);}});
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
