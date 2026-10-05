/* Zeminler, patikalar, bitki örtüsü, su ve gökyüzü. Her şey kodla çizilir;
 * dokular yükleme perdesi altında bir kez kurulur. Sabit bitkiler iki birleşik
 * çizim grubunda toplanır (gölge düşüren büyükler / küçük çiçek-çimler) ve
 * rüzgâr sallanması köşe gölgelendiricisinde yapılır: kare başına ayırma yok. */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) throw new Error('Gezi zeminleri için grafik motoru yüklenemedi.');
  window.FLASH_SURFACES = { create:create, looks:null };
  var TAU = Math.PI * 2;

  function random(seed) {
    return function () { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  }
  function seedFor(id) { var seed=91431; for(var i=0;i<id.length;i++)seed=Math.imul(seed^id.charCodeAt(i),16777619); return seed>>>0; }
  function rgb(hex) { return [(hex>>16)&255,(hex>>8)&255,hex&255]; }
  function shade(base, light, alpha) {
    var c=base.map(function(v){return Math.round(v+(light<0?v:255-v)*light);});
    return alpha===undefined?'rgb('+c.join(',')+')':'rgba('+c.join(',')+','+alpha+')';
  }
  function hexCss(hex, light, alpha) { return shade(rgb(hex), light||0, alpha); }
  function canvas(w, h) { var c=document.createElement('canvas');c.width=w;c.height=h||w;return c; }
  function pick(list, r) { return list[Math.floor(r()*list.length)%list.length]; }
  function wrapAt(size, x, y, rad, fn) {
    for(var ox=-size;ox<=size;ox+=size)for(var oy=-size;oy<=size;oy+=size){
      var cx=x+ox,cy=y+oy;if(cx+rad<0||cx-rad>size||cy+rad<0||cy-rad>size)continue;fn(cx,cy);
    }
  }

  // ---------------------------------------------------------------- looks
  // One storybook look per country: ground dressing, path pattern, plants,
  // hills and small life. Colours are hex; counts are for desktop quality.
  var GREEN = [0x5c9b58,0x6cac62,0x4f8c54], DARK = [0x4d8a50,0x5c9a58,0x437f4e];
  var LOOKS = {
    tr:{ fl:[0xfff0a0,0xffffff,0xf6a8bb,0xf7c85a], flN:300, mow:.05, path:'cobble', pc:[0xd9ccb2,0xc2b392,0xe8dcc6],
      trees:[['round',3],['olive',1]], tc:GREEN, bush:[0x5b9a5a,0x6dad63,0x4a8b58], flower:[0xf2c14e,0xf08a5d,0xffffff,0xe86f8d], rock:0x9d978a,
      n:{tree:22,bush:40,flower:60,rock:16,tuft:1100,reed:12}, hills:{type:0,c:0x86b58f,c2:0xa4c9a8,zen:0x6bb6e6}, life:{butterfly:6,bird:4,bf:[0xffd35a,0xffffff,0xff9ec0]} },
    us:{ fl:[0xf2c14e,0xffffff,0xb98adf], flN:120, litter:[0xd98a3a,0xc9622b,0xe8b84a,0xb9532a], litN:700, path:'concrete', pc:[0xc9c6bd,0xb2afa6,0xdedbd2],
      trees:[['round',4]], tc:[0xd78a3a,0xe0a43f,0xc4642b,0x9fae4c], bush:[0xb98a3d,0x8fa148,0xc4642b], flower:[0xf2c14e,0xb98adf,0xffffff], rock:0x8f8a82,
      n:{tree:24,bush:40,flower:36,rock:14,tuft:900,reed:8}, hills:{type:0,c:0xb89a6a,c2:0xd0b283,zen:0x7db4e0}, life:{leaf:18,bird:3,leafc:[0xd98a3a,0xc9622b,0xe8b84a]} },
    ca:{ spark:1, dry:1, path:'cleared', pc:[0x9db0ba,0xc9d4da,0xe2eaee],
      trees:[['snowpine',5],['snowround',1]], tc:[0x3e7a5a,0x35694f,0x4a8a62], bush:[0xe4eef3,0xd1e1e9], flower:[], rock:0xdfe7ea,
      n:{tree:26,bush:30,flower:0,rock:18,tuft:360,reed:6}, hills:{type:1,c:0x9fb7c8,c2:0xc3d4e0,snow:1,zen:0x86b4d8}, life:{bird:3} },
    be:{ fl:[0xffffff,0xf7e26b], flN:90, pud:11, mow:.04, path:'basket', pc:[0xa86a56,0x94554a,0xc08468],
      trees:[['round',4]], tc:DARK, bush:[0x4a8450,0x5b9658,0x436f48], flower:[0xffffff,0xf7e26b,0xe48fb0], rock:0x868d88,
      n:{tree:22,bush:44,flower:30,rock:14,tuft:1100,reed:12}, hills:{type:0,c:0x8aa99a,c2:0xa7c0b4,zen:0x93b3c8}, life:{bird:2} },
    fr:{ fl:[0xa98be0,0xe5483f,0xffffff,0xf7e26b], flN:240, mow:.10, path:'gravel', pc:[0xe3d6b6,0xcdbd98,0xf3e9cd],
      trees:[['poplar',2],['round',2]], tc:[0x62a05a,0x73b068,0x558f55], bush:[0x4f8a52,0x5f9a5c,0x468550], flower:[0xa98be0,0xc9a6ee,0xe5483f,0xffffff], rock:0xcfc7b4,
      n:{tree:20,bush:44,flower:70,rock:10,tuft:1000,reed:10}, hills:{type:0,c:0x96b9a2,c2:0xb4cfbb,zen:0x74b3e4}, life:{butterfly:6,bird:4,bf:[0xffffff,0xffe27a,0xc9a6ee]} },
    ru:{ spark:1, frost:1, path:'cleared', pc:[0x8f6f6a,0xb08a82,0xdfe8ee],
      trees:[['snowpine',5],['snowround',1]], tc:[0x3a6b52,0x2f5f4a,0x467a5c], bush:[0xe1ebf1,0xc9d9e3], flower:[], rock:0xb9c4cc,
      n:{tree:28,bush:28,flower:0,rock:16,tuft:300,reed:6}, hills:{type:1,c:0xa6b8c8,c2:0xc8d6e2,snow:1,zen:0x93b9da}, life:{bird:3} },
    jp:{ fl:[0xffffff,0xf8c4d6,0xf5d85c], flN:200, litter:[0xf7b6cc,0xfad0de,0xee98b8], litN:900, moss:1, path:'stepping', pc:[0xcfc7b2,0x9d9684,0x7f9a6a],
      trees:[['cherry',4],['pine',1],['round',1]], tc:GREEN, bush:[0xe98ab0,0xf3a7c3,0x5c9a5e,0x4f8c54], flower:[0xffffff,0xf8c4d6,0xf5d85c], rock:0x7d8a76,
      n:{tree:24,bush:42,flower:44,rock:18,tuft:1000,reed:10}, hills:{type:1,c:0x93b6b0,c2:0xb5d0ca,snow:.5,zen:0x80c0e8}, life:{butterfly:4,bird:3,bf:[0xffffff,0xf8c4d6]} },
    cn:{ fl:[0xf29ab6,0xffffff], flN:90, litter:[0xa7c46a,0x8fb25a,0xc3cf7a], litN:600, moss:1, path:'bluestone', pc:[0x8e9ea0,0x77888c,0xaebcbc],
      trees:[['bamboo',4],['pine',1],['round',1]], tc:[0x5a9a5c,0x6cae66,0x4f8f58], bush:[0x5f9f62,0x74b06a,0x4a8a5a], flower:[0xf29ab6,0xffffff], rock:0x8da39f,
      n:{tree:26,bush:34,flower:24,rock:20,tuft:1100,reed:14}, hills:{type:3,c:0x8fb0ab,c2:0xb6cfc9,zen:0x9cc8d8}, life:{lantern:6,bird:2} },
    eg:{ dune:16, path:'sandstone', pc:[0xd8bd8a,0xc2a370,0xeed6a8],
      trees:[['palm',1]], tc:[0x5e9a52,0x6eab5c], bush:[0x9aa66a,0xb2ad74,0x8d9a62], flower:[0xf2d85c], rock:0xc9a874,
      n:{tree:9,bush:34,flower:6,rock:24,tuft:520,reed:14}, reedc:[0x7fa85a,0x93b867], tuftc:[0xc2ae6c,0xb89f5a], hills:{type:2,c:0xd6b883,c2:0xe6cb9c,zen:0x86bfe0}, life:{bird:3,dust:10} },
    br:{ fl:[0xff5a7a,0xffcf3f,0xff8f3a,0xffffff], flN:320, moss:1, pud:5, path:'mosaic', pc:[0xf1eadb,0x5b5961,0xd8d2c4],
      trees:[['palm',3],['round',1]], tc:[0x3f9a5a,0x52ae62,0x2f8450], bush:[0x2f8f55,0x45a864,0xd8465a,0x2f8450], flower:[0xff5a7a,0xffcf3f,0xff8f3a,0xffffff], rock:0x8a8f86,
      n:{tree:22,bush:50,flower:70,rock:12,tuft:1100,reed:10}, hills:{type:3,c:0x6fae8e,c2:0x93c8a8,zen:0x74c3dc}, life:{butterfly:9,bird:2,bf:[0x3fb4ff,0xffd13f,0xff6a8a]} },
    gb:{ fl:[0xffffff,0xf7e26b,0x8a8ae8], flN:200, pud:9, mow:.05, path:'flag', pc:[0xa6a69d,0x8f8f87,0xc4c4ba],
      trees:[['round',4]], tc:[0x4d8a4f,0x5d9a58,0x6aa65a], bush:[0x4a8450,0x5b9658,0x3f7048], flower:[0xffffff,0xf7e26b,0x8a8ae8], rock:0x9b9b94,
      n:{tree:22,bush:46,flower:46,rock:18,tuft:1100,reed:10}, hills:{type:0,c:0x8fae9c,c2:0xadc6b6,zen:0x90b5cf}, life:{bird:3} },
    it:{ fl:[0xe5483f,0xf7e26b,0xffffff], flN:200, mow:.07, dry:1, path:'weave', pc:[0xc9744f,0xe3b98e,0xefd7b5],
      trees:[['cypress',3],['umbrella',1],['olive',2]], tc:[0x6f9a5a,0x869f62,0x3c6b47], bush:[0x6f9a5a,0x869f62,0xb96f9a], flower:[0xe5483f,0xf7e26b,0xffffff], rock:0xd7c9a4,
      n:{tree:22,bush:34,flower:44,rock:14,tuft:1000,reed:8}, tuftc:[0xb8b46a,0xa4a85e], hills:{type:0,c:0xa9b58a,c2:0xc6cfa6,zen:0x78b7e4}, life:{butterfly:5,bird:3,bf:[0xffe27a,0xffffff]} },
    es:{ fl:[0xe85a4a,0xf2c14e,0xff8fb0], flN:200, dry:1, path:'tile', pc:[0xf1ead8,0x3b78b8,0xe0a63c],
      trees:[['olive',3],['umbrella',1]], tc:[0x8aa070,0x9db08a,0x7e9966], bush:[0x8fa064,0xb0a666,0xe45a8a], flower:[0xe85a4a,0xf2c14e,0xff8fb0], rock:0xc79a6c,
      n:{tree:20,bush:36,flower:44,rock:18,tuft:900,reed:6}, tuftc:[0xc2b06a,0xb89f5a], hills:{type:0,c:0xc2a67a,c2:0xdcc59a,zen:0x74b6e6}, life:{butterfly:4,bird:3,bf:[0xffffff,0xf2c14e]} },
    nl:{ fl:[0xe5483f,0xf2c14e,0xf08ab0,0xffffff], flN:420, mow:.10, mowN:12, path:'basket', pc:[0xb5624a,0xa0503f,0xc97e63],
      trees:[['poplar',3],['round',2]], tc:[0x62aa58,0x75b866,0x58a05a], bush:[0x58a05a,0x6cb260,0x4a8c52], flower:[0xe5483f,0xf2c14e,0xf08ab0,0xffffff,0xa86ad8], fkind:'tulip', rock:0x9a9a92,
      n:{tree:18,bush:34,flower:90,rock:8,tuft:1000,reed:16}, hills:{type:5,c:0xa8c9a8,c2:0xc0dac0,zen:0x7ec0ea}, life:{butterfly:5,bird:4,bf:[0xffffff,0xffe27a,0xf08ab0]} },
    au:{ dune:10, red:1, path:'dirt', pc:[0xc8734d,0xb0603f,0xe29a72],
      trees:[['gum',3]], tc:[0x7fa58f,0x8cb59a,0x6f9580], bush:[0xb9a86a,0xc9b36a,0x8fa070], flower:[0xf2c14e,0xe8704a], rock:0xb5593a,
      n:{tree:14,bush:34,flower:12,rock:26,tuft:620,reed:6}, tuftc:[0xc9a85e,0xb8884a], hills:{type:4,c:0xc98062,c2:0xdd9d7e,zen:0x7ebde6}, life:{bird:4,butterfly:2,dust:6,bf:[0xffffff,0xffe27a],birdc:[0xf08ab0,0xffffff]} },
    'in':{ fl:[0xf59a1a,0xf6c12f,0xe0572f], flN:200, dry:1, path:'sandstone', pc:[0xd9a878,0xc08a5a,0xefc9a0],
      trees:[['banyan',2],['palm',1]], tc:[0x5f9a4a,0x6faa55,0x4f8a48], bush:[0x6f9a4a,0xa09a4a,0xf08a1a], flower:[0xf59a1a,0xf6c12f,0xe0572f,0xffffff], rock:0xcaa078,
      n:{tree:20,bush:38,flower:60,rock:14,tuft:900,reed:8}, tuftc:[0xb2b062,0xa4a458], hills:{type:0,c:0xc4ae82,c2:0xdcc79c,zen:0x7ab9e2}, life:{butterfly:6,bird:4,bf:[0xf59a1a,0xffffff,0xf08ab0],birdc:[0x6fbf4a,0x9fd46a]} }
  };
  window.FLASH_SURFACES.looks = LOOKS;
  function lookFor(country, env) {
    var look = LOOKS[country.id] || LOOKS[country.environmentTemplate] || LOOKS.tr;
    return look;
  }

  // -------------------------------------------------------------- ground
  function groundCanvas(env, look, seed) {
    var S=1024,cv=canvas(S),g=cv.getContext('2d'),r=random(seed),base=rgb(look.tint||env.groundTint),kind=env.ground;
    g.fillStyle=shade(base,0);g.fillRect(0,0,S,S);
    for(var i=0;i<150;i++){
      var x=r()*S,y=r()*S,rad=30+r()*130,light=(r()-.46)*(kind==='grass'?.23:.10);
      wrapAt(S,x,y,rad,function(cx,cy){var gr=g.createRadialGradient(cx,cy,0,cx,cy,rad);gr.addColorStop(0,shade(base,light,.7));gr.addColorStop(1,shade(base,light,0));g.fillStyle=gr;g.fillRect(cx-rad,cy-rad,rad*2,rad*2);});
    }
    var k,n;
    if(kind==='grass'){
      if(look.mow){var bands=look.mowN||8,bw=S/bands;for(k=0;k<bands;k++){g.fillStyle=k%2?'rgba(18,64,16,'+look.mow*.85+')':'rgba(255,255,226,'+look.mow+')';g.fillRect(k*bw,0,bw,S);}}
      if(look.dry){for(k=0;k<26;k++){var dx=r()*S,dy=r()*S,dr=40+r()*110;wrapAt(S,dx,dy,dr,function(cx,cy){var gr=g.createRadialGradient(cx,cy,0,cx,cy,dr);gr.addColorStop(0,'rgba(214,184,100,.34)');gr.addColorStop(1,'rgba(214,184,100,0)');g.fillStyle=gr;g.fillRect(cx-dr,cy-dr,dr*2,dr*2);});}}
      g.lineCap='round';
      for(var blade=0;blade<15000;blade++){
        var bx=r()*S,by=r()*S,h=3+r()*11,bend=(r()-.5)*5;
        g.strokeStyle=shade(base,(r()-.36)*.39,.72);g.lineWidth=.6+r()*.9;
        g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+bend*.4,by-h*.55,bx+bend,by-h);g.stroke();
        if(by<h){g.beginPath();g.moveTo(bx,by+S);g.quadraticCurveTo(bx+bend*.4,by+S-h*.55,bx+bend,by+S-h);g.stroke();}
      }
      for(var fleck=0;fleck<700;fleck++){g.fillStyle=fleck%7===0?'rgba(249,222,135,.42)':shade(base,-.22,.45);g.fillRect(r()*S,r()*S,1+r()*2,1+r()*3);}
      if(look.moss){for(k=0;k<60;k++){var mx=r()*S,my=r()*S,mr=10+r()*26;wrapAt(S,mx,my,mr,function(cx,cy){var gr=g.createRadialGradient(cx,cy,0,cx,cy,mr);gr.addColorStop(0,'rgba(60,130,70,.35)');gr.addColorStop(1,'rgba(60,130,70,0)');g.fillStyle=gr;g.fillRect(cx-mr,cy-mr,mr*2,mr*2);});}}
      if(look.litter){n=look.litN||400;for(k=0;k<n;k++){(function(c){var lx=r()*S,ly=r()*S,rot=r()*TAU,lw=2.6+r()*3,lh=1.5+r()*1.6;wrapAt(S,lx,ly,6,function(cx,cy){g.save();g.translate(cx,cy);g.rotate(rot);g.fillStyle=hexCss(c,(r()-.5)*.25,.9);g.beginPath();g.ellipse(0,0,lw,lh,0,0,TAU);g.fill();g.restore();});})(pick(look.litter,r));}}
      if(look.fl){
        n=look.flN||150;
        for(k=0;k<n;k++){
          var fx=r()*S,fy=r()*S,col=pick(look.fl,r),cluster=2+Math.floor(r()*4);
          for(var d=0;d<cluster;d++){
            var px=fx+(r()-.5)*16,py=fy+(r()-.5)*16,pr=1.3+r()*1.5;
            wrapAt(S,px,py,pr+2,function(cx,cy){g.fillStyle=hexCss(col,(r()-.5)*.2,.95);g.beginPath();g.arc(cx,cy,pr,0,TAU);g.fill();g.fillStyle='rgba(255,250,200,.85)';g.fillRect(cx-.5,cy-.5,1,1);});
          }
        }
      }
      if(look.pud){for(k=0;k<look.pud;k++){(function(){var px=r()*S,py=r()*S,rx=26+r()*48,ry=rx*(.38+r()*.28),rot=r()*.8-.4;
        wrapAt(S,px,py,rx+8,function(cx,cy){g.save();g.translate(cx,cy);g.rotate(rot);
          g.fillStyle='rgba(58,74,64,.38)';g.beginPath();g.ellipse(0,0,rx+4,ry+3,0,0,TAU);g.fill();
          var gr=g.createLinearGradient(0,-ry,0,ry);gr.addColorStop(0,'rgba(196,224,238,.95)');gr.addColorStop(1,'rgba(122,164,186,.92)');g.fillStyle=gr;g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);g.fill();
          g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;g.beginPath();g.ellipse(0,-ry*.15,rx*.6,ry*.5,0,Math.PI*1.12,Math.PI*1.78);g.stroke();g.restore();});})();}}
    }else if(kind==='snow'){
      for(k=0;k<65;k++){
        var sx=r()*S,sy=r()*S,rx2=35+r()*95,ry2=10+r()*26;
        g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(sx,sy,rx2,ry2,-.28,0,TAU);g.fill();
        g.strokeStyle='rgba(158,183,206,.15)';g.lineWidth=1.5;g.beginPath();g.ellipse(sx,sy+2,rx2,ry2,-.28,.1,Math.PI);g.stroke();
      }
      if(look.frost){for(k=0;k<30;k++){var fx2=r()*S,fy2=r()*S,fr=30+r()*70;wrapAt(S,fx2,fy2,fr,function(cx,cy){var gr=g.createRadialGradient(cx,cy,0,cx,cy,fr);gr.addColorStop(0,'rgba(150,185,215,.22)');gr.addColorStop(1,'rgba(150,185,215,0)');g.fillStyle=gr;g.fillRect(cx-fr,cy-fr,fr*2,fr*2);});}}
      for(var ice=0;ice<21000;ice++){g.fillStyle=ice%3?'rgba(255,255,255,.66)':'rgba(155,190,214,.26)';g.fillRect(r()*S,r()*S,.7+r()*1.6,.7+r()*1.2);}
      // Dry grass tips and tiny paw-sized dimples peek through the snow.
      g.lineCap='round';for(k=0;k<420;k++){var tx=r()*S,ty=r()*S,th=4+r()*7;g.strokeStyle=k%3?'rgba(168,150,98,.55)':'rgba(120,138,98,.5)';g.lineWidth=.9;g.beginPath();g.moveTo(tx,ty);g.lineTo(tx+(r()-.5)*4,ty-th);g.stroke();}
      for(k=0;k<90;k++){var cxs=r()*S,cys=r()*S,crs=3+r()*8;wrapAt(S,cxs,cys,crs+2,function(cx,cy){g.fillStyle='rgba(168,196,222,.25)';g.beginPath();g.ellipse(cx,cy,crs,crs*.5,0,0,TAU);g.fill();});}
    }else{
      for(var ripple=-2;ripple<46;ripple++){
        var row=ripple*24;g.lineWidth=1.4;g.strokeStyle='rgba(124,88,40,.11)';g.beginPath();
        for(var px2=0;px2<=S;px2+=8){var py2=row+8*Math.sin(px2*Math.PI*4/S)+3*Math.sin(px2*Math.PI*8/S);if(px2===0)g.moveTo(px2,py2);else g.lineTo(px2,py2);}g.stroke();
        g.strokeStyle='rgba(255,246,214,.26)';g.beginPath();for(var qx=0;qx<=S;qx+=8){var qy=row-2+8*Math.sin(qx*Math.PI*4/S)+3*Math.sin(qx*Math.PI*8/S);if(qx===0)g.moveTo(qx,qy);else g.lineTo(qx,qy);}g.stroke();
      }
      if(look.dune){
        for(k=0;k<look.dune;k++){(function(){var dx=r()*S,dy=r()*S,len=130+r()*230,wid=40+r()*70,rot=-.5+r()*.5;
          wrapAt(S,dx,dy,len,function(cx,cy){g.save();g.translate(cx,cy);g.rotate(rot);var gr=g.createLinearGradient(0,-wid,0,wid);
            gr.addColorStop(0,'rgba(255,240,205,.0)');gr.addColorStop(.35,'rgba(255,240,205,.22)');gr.addColorStop(.58,'rgba(255,240,205,.06)');gr.addColorStop(.6,'rgba(110,60,28,.22)');gr.addColorStop(1,'rgba(110,60,28,0)');
            g.fillStyle=gr;g.beginPath();g.ellipse(0,0,len,wid,0,0,TAU);g.fill();g.restore();});})();}
      }
      for(var grain=0;grain<24000;grain++){g.fillStyle=grain%3?'rgba(255,246,208,.35)':'rgba(128,89,43,.24)';g.fillRect(r()*S,r()*S,.6+r()*1.2,.6+r()*1.2);}
      for(k=0;k<260;k++){var pbx=r()*S,pby=r()*S,pbr=1+r()*2.4;g.fillStyle=k%2?'rgba(150,120,80,.55)':'rgba(236,214,170,.65)';g.beginPath();g.ellipse(pbx,pby,pbr,pbr*.7,r(),0,TAU);g.fill();}
      if(look.fl){for(k=0;k<(look.flN||40);k++){g.fillStyle=hexCss(pick(look.fl,r),0,.9);g.beginPath();g.arc(r()*S,r()*S,1.3,0,TAU);g.fill();}}
    }
    return cv;
  }
  function macroCanvas(look, env, seed) {
    var S=512,cv=canvas(S),g=cv.getContext('2d'),r=random(seed^55);
    g.fillStyle='rgb(128,128,128)';g.fillRect(0,0,S,S);
    var pal=env.ground==='snow'?[[120,134,152],[140,140,132],[116,128,142]]:env.ground==='sand'?[[142,124,104],[118,126,134],[150,130,100]]:look.macro||[[150,136,104],[108,128,118],[134,152,98],[122,120,100]];
    for(var i=0;i<52;i++){var x=r()*S,y=r()*S,rad=40+r()*120,c=pal[i%pal.length];wrapAt(S,x,y,rad,function(cx,cy){var gr=g.createRadialGradient(cx,cy,0,cx,cy,rad);gr.addColorStop(0,'rgba('+c[0]+','+c[1]+','+c[2]+',.55)');gr.addColorStop(1,'rgba('+c[0]+','+c[1]+','+c[2]+',0)');g.fillStyle=gr;g.fillRect(cx-rad,cy-rad,rad*2,rad*2);});}
    return cv;
  }
  function bumpCanvas(source) {
    var cv=canvas(512),g=cv.getContext('2d');g.drawImage(source,0,0,512,512);
    var pixels=g.getImageData(0,0,512,512),d=pixels.data;
    for(var i=0;i<d.length;i+=4){var value=Math.round(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722);d[i]=d[i+1]=d[i+2]=value;}
    g.putImageData(pixels,0,0);return cv;
  }

  // ---------------------------------------------------------------- paths
  // The strip is 256 x 512 px for 3.6 x 7.2 m. Pattern first, then a wobbly
  // edge mask (alpha-to-coverage gives soft, antialiased borders).
  function pathCanvas(look, env, seed) {
    var W=256,H=512,cv=canvas(W,H),g=cv.getContext('2d'),r=random(seed^713),pc=look.pc||[0xd8ccb2,0xbfb08e,0xe8dcc6],style=look.path||'cobble',soft=false;
    function fillRect(c,x,y,w,h,l){g.fillStyle=hexCss(c,l||0);g.fillRect(x,y,w,h);}
    function rounded(x,y,w,h,rad,col){g.fillStyle=col;g.beginPath();g.moveTo(x+rad,y);g.arcTo(x+w,y,x+w,y+h,rad);g.arcTo(x+w,y+h,x,y+h,rad);g.arcTo(x,y+h,x,y,rad);g.arcTo(x,y,x+w,y,rad);g.closePath();g.fill();}
    function speckle(n,a){for(var i=0;i<n;i++){g.fillStyle=i%2?'rgba(255,250,235,'+a+')':'rgba(70,60,45,'+a+')';g.fillRect(r()*W,r()*H,1+r()*1.5,1+r()*1.5);}}
    function voronoi(n,pal,gap,tone){tone=tone||.45;
      var pts=[],i,x,y;for(i=0;i<n;i++)pts.push([r()*W,r()*H,r()]);
      var im=g.createImageData(W,H),d=im.data,cols=pal.map(rgb);
      for(y=0;y<H;y++)for(x=0;x<W;x++){
        var d1=1e9,d2=1e9,id=0;
        for(i=0;i<n;i++){var dx=Math.abs(x-pts[i][0]);dx=Math.min(dx,W-dx);var dy=Math.abs(y-pts[i][1]);dy=Math.min(dy,H-dy);var dd=Math.sqrt(dx*dx+dy*dy);if(dd<d1){d2=d1;d1=dd;id=i;}else if(dd<d2)d2=dd;}
        var c=cols[id%cols.length],j=.88+pts[id][2]*.2,e=d2-d1,k=(x+y*W)*4,f=e<gap?(1-tone)+e/gap*tone:(e<gap*2.4?1.07:1);f*=1-.1*Math.min(1,d1/(d2+1));
        d[k]=Math.min(255,c[0]*j*f);d[k+1]=Math.min(255,c[1]*j*f);d[k+2]=Math.min(255,c[2]*j*f);d[k+3]=255;
      }
      g.putImageData(im,0,0);
    }
    if(style==='cobble'||style==='bluestone'||style==='cleared'){
      fillRect(pc[1],0,0,W,H,-.25);
      for(var row=0;row<16;row++)for(var col=0;col<9;col++){
        var x=col*29+(row%2)*14.5-8+r()*2,y=row*32+r()*2,w=26+r()*3,h=28+r()*2,l=(r()-.5)*.22,c=(row+col)%3===0?pc[2]:pc[0];
        rounded(x,y,w,h,8,hexCss(c,l));g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x+4,y+2,w-9,2);
        if(x<0)rounded(x+W,y,w,h,8,hexCss(c,l));
      }
      speckle(900,.08);
    }else if(style==='basket'){
      fillRect(pc[1],0,0,W,H,-.3);
      for(var by=0;by<16;by++)for(var bx=0;bx<8;bx++){
        var horiz=(bx+by)%2===0,x0=bx*32,y0=by*32;
        for(var s2=0;s2<2;s2++){var c2=pick(pc,r),l2=(r()-.5)*.2;if(horiz)rounded(x0+1,y0+s2*16+1,30,14,3,hexCss(c2,l2));else rounded(x0+s2*16+1,y0+1,14,30,3,hexCss(c2,l2));}
      }
      speckle(700,.07);
    }else if(style==='weave'||style==='tile'){
      var cell=style==='tile'?64:32;
      for(var ty=0;ty<H/cell;ty++)for(var tx=0;tx<W/cell;tx++){
        var x3=tx*cell,y3=ty*cell;
        if(style==='tile'){
          fillRect(pc[0],x3,y3,cell,cell,(r()-.5)*.06);g.strokeStyle=hexCss(pc[1],0,.95);g.lineWidth=3;
          g.beginPath();g.moveTo(x3+32,y3+8);g.lineTo(x3+56,y3+32);g.lineTo(x3+32,y3+56);g.lineTo(x3+8,y3+32);g.closePath();g.stroke();
          g.fillStyle=hexCss(pc[2],0,.95);g.beginPath();g.arc(x3+32,y3+32,6,0,TAU);g.fill();g.fillStyle=hexCss(pc[1],0,.9);for(var q=0;q<4;q++)g.fillRect(x3+(q%2)*58+1,y3+(q>>1)*58+1,4,4);
          g.strokeStyle='rgba(120,100,70,.55)';g.lineWidth=2;g.strokeRect(x3+1,y3+1,cell-2,cell-2);
        }else{
          fillRect(pc[(tx+ty)%2?0:1],x3,y3,cell,cell,(r()-.5)*.12);
          g.strokeStyle='rgba(60,40,28,.35)';g.lineWidth=1.5;g.beginPath();g.moveTo(x3,y3+cell/2);g.lineTo(x3+cell,y3+cell/2);g.moveTo(x3+cell/2,y3);g.lineTo(x3+cell/2,y3+cell);g.stroke();g.strokeRect(x3+.5,y3+.5,cell-1,cell-1);
          fillRect(pc[2],x3+3,y3+3,cell-8,2,0);
        }
      }
      speckle(500,.06);
    }else if(style==='mosaic'){
      for(var my=0;my<32;my++)for(var mx=0;mx<16;mx++){
        var dark=((my+Math.round(2.4*Math.sin(mx*TAU/16)))%8)<3.5,cc=dark?pc[1]:pc[0],l3=(r()-.5)*.14;
        rounded(mx*16+.6,my*16+.6,14.8,14.8,3,hexCss(cc,l3));
      }
      g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;
    }else if(style==='flag'||style==='sandstone'||style==='concrete'){
      var pal=[pc[0],pc[1],pc[2],pc[0],pc[1]];
      voronoi(style==='concrete'?10:style==='sandstone'?20:26,pal,style==='concrete'?3:style==='sandstone'?1.6:2.4,style==='sandstone'?.22:.45);speckle(1000,.08);
      if(style==='concrete'){g.strokeStyle='rgba(60,60,60,.35)';g.lineWidth=3;for(var jy=0;jy<=H;jy+=128){g.beginPath();g.moveTo(0,jy);g.lineTo(W,jy);g.stroke();}g.beginPath();g.moveTo(W/2,0);g.lineTo(W/2,H);g.stroke();}
    }else if(style==='gravel'||style==='dirt'||style==='stepping'){
      soft=true;
      fillRect(pc[0],0,0,W,H,0);
      for(var gi=0;gi<5200;gi++){var gx=r()*W,gy=r()*H,gr2=.8+r()*1.9;g.fillStyle=hexCss(pick(pc,r),(r()-.5)*.35,.9);g.beginPath();g.ellipse(gx,gy,gr2,gr2*.75,r()*3,0,TAU);g.fill();}
      if(style==='gravel'||style==='stepping'){g.strokeStyle='rgba(120,100,70,.14)';g.lineWidth=1.2;for(var rk=0;rk<14;rk++){var rx=14+rk*16.5;g.beginPath();for(var ry=0;ry<=H;ry+=16){var xx=rx+2.2*Math.sin(ry*TAU/H*2+rk);if(ry===0)g.moveTo(xx,ry);else g.lineTo(xx,ry);}g.stroke();}}
      if(style==='dirt'){g.fillStyle='rgba(60,30,18,.22)';for(var tr=0;tr<2;tr++){g.fillRect(70+tr*86,0,12,H);}}
      if(style==='stepping'){for(var st=0;st<5;st++){var sy=st*102+30,sx=W/2+(st%2?-26:26)+(r()-.5)*10,sw=64+r()*14,sh=48+r()*10;
        for(var wr=0;wr<2;wr++){var yy=sy+wr*H;rounded(sx-sw/2-3,yy-sh/2-3,sw+6,sh+6,24,'rgba(40,52,30,.38)');rounded(sx-sw/2,yy-sh/2,sw,sh,22,hexCss(pc[1],(r()-.5)*.2));g.fillStyle='rgba(255,255,255,.2)';g.fillRect(sx-sw/2+12,yy-sh/2+5,sw-26,3);g.fillStyle='rgba(120,160,90,.4)';g.beginPath();g.arc(sx+sw*.3,yy+sh*.25,6,0,TAU);g.fill();}}}
    }
    // Edge: per-pixel alpha keeps the stone colours out to the very border.
    function edge(y,side){return 5*Math.sin(y/H*TAU*3+side*1.7)+3*Math.sin(y/H*TAU*8+side*.6);}
    var im=g.getImageData(0,0,W,H),d=im.data,snowy=style==='cleared'||env.ground==='snow';
    for(var y=0;y<H;y++){
      var L=26+edge(y,0),R=W-26+edge(y,1);
      for(var x=0;x<W;x++){
        var dist=Math.min(x-L,R-x),k=(y*W+x)*4,a;
        if(soft)a=Math.max(0,Math.min(1,dist/11));else a=Math.max(0,Math.min(1,dist/2+.5));
        if(!soft&&dist<8&&dist>=0){var f=.7+.3*dist/8;d[k]*=f;d[k+1]*=f;d[k+2]*=f;}
        if(snowy&&dist<46){var t=Math.max(0,1-dist/46);t=t*t*.95;d[k]+=(246-d[k])*t;d[k+1]+=(251-d[k+1])*t;d[k+2]+=(255-d[k+2])*t;}
        d[k+3]=Math.round(a*255);
      }
    }
    g.putImageData(im,0,0);
    return cv;
  }
  function pathGeometry(places, width) {
    var pos=[],nor=[],uv=[],idx=[],base=0,seg=14;
    places.forEach(function(p,pi){
      var ax=0,az=23,dx=p.x-ax,dz=p.z-az,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,nx=-uz,nz=ux,y=-.012+pi*.0008;
      for(var i=0;i<=seg;i++){
        var t=i/seg,s=len*t,flare=1+Math.max(0,1-s/8)*.55,hw=width*.5*flare;
        for(var side=-1;side<=1;side+=2){pos.push(ax+ux*s+nx*hw*side,y,az+uz*s+nz*hw*side);nor.push(0,1,0);uv.push(side<0?0:1,s/7.2);}
      }
      for(var k=0;k<seg;k++){var a=base+k*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
      base+=(seg+1)*2;
    });
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
  }
  function texture(image, repeatX, repeatY, color, anisotropy, clamp) {
    var tex=new T.CanvasTexture(image);if(color)tex.colorSpace=T.SRGBColorSpace;
    tex.wrapS=clamp?T.ClampToEdgeWrapping:T.RepeatWrapping;tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeatX,repeatY);tex.anisotropy=anisotropy;return tex;
  }

  function sidesGeometry(environment, look) {
    var pos=[],normals=[],colors=[],heights=[-.05,-.22,-.76,-1.65],corners=[[-62,-62],[62,-62],[62,62],[-62,62]],snow=environment.ground==='snow',sand=environment.ground==='sand';
    var shades=look.red?[0xc46a46,0xa35639,0x864632]:snow?[0xe7eff5,0x928570,0x726650]:sand?[0xd1ad6b,0xb79159,0x98784c]:[0x657f43,0x9b7953,0x796046];
    for(var side=0;side<4;side++)for(var layer=0;layer<3;layer++){
      var a=corners[side],b=corners[(side+1)%4],color=new T.Color(shades[layer]),normal=[0,0,0];normal[side%2?0:2]=side<2?-1:1;if(side===1)normal[0]=1;if(side===3)normal[0]=-1;
      var verts=[[a[0],heights[layer],a[1]],[b[0],heights[layer],b[1]],[a[0],heights[layer+1],a[1]],[b[0],heights[layer],b[1]],[b[0],heights[layer+1],b[1]],[a[0],heights[layer+1],a[1]]];
      verts.forEach(function(v){pos.push.apply(pos,v);normals.push.apply(normals,normal);colors.push(color.r,color.g,color.b);});
    }
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
  }

  // -------------------------------------------------------- shader glue
  var NOISE = [
    'float fzHash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float fzNoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(fzHash(i),fzHash(i+vec2(1,0)),f.x),mix(fzHash(i+vec2(0,1)),fzHash(i+vec2(1,1)),f.x),f.y); }',
    'float fzFbm(vec2 p){ return fzNoise(p)*.55+fzNoise(p*2.03+7.1)*.3+fzNoise(p*4.1+3.7)*.15; }'
  ].join('\n');
  function addWorldVarying(shader) {
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 fzWP;').replace('#include <begin_vertex>','#include <begin_vertex>\nfzWP=(modelMatrix*vec4(transformed,1.0)).xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 fzWP;\nuniform float uTime;\nfloat fzSpark=0.0;\n'+NOISE);
  }

  // ----------------------------------------------------- vegetation batch
  function Batch() { this.p=[];this.n=[];this.c=[];this.w=[]; }
  var _v=new T.Vector3(),_n=new T.Vector3(),_nm=new T.Matrix3(),_col=new T.Color(),_m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_s=new T.Vector3(),_pp=new T.Vector3(),_up=new T.Vector3(0,1,0),_d=new T.Vector3();
  var ICO=new T.IcosahedronGeometry(1,1),ICO0=new T.IcosahedronGeometry(1,0),CYL=new T.CylinderGeometry(1,.8,1,6,1,true).toNonIndexed(),CONE=new T.ConeGeometry(1,1,7,1,true).toNonIndexed();
  CYL.translate(0,.5,0);CONE.translate(0,.5,0);
  Batch.prototype.geo=function(g,m,color,o){
    var pa=g.attributes.position,na=g.attributes.normal,c=_col.set(color);_nm.getNormalMatrix(m);
    for(var i=0;i<pa.count;i++){
      _v.fromBufferAttribute(pa,i).applyMatrix4(m);_n.fromBufferAttribute(na,i).applyMatrix3(_nm).normalize();
      var k=o.grad?1-o.grad+o.grad*(_n.y*.5+.5):1,top=o.base===undefined?0:Math.min(1,Math.max(0,(_v.y-o.base)/o.h));
      if(o.lift)k*=1+o.lift*top;
      this.p.push(_v.x,_v.y,_v.z);this.n.push(_n.x,_n.y,_n.z);this.c.push(c.r*k,c.g*k,c.b*k);this.w.push((o.amp||0)*Math.pow(top,1.5),o.ph||0);
    }
  };
  Batch.prototype.tri=function(a,b,c,color,wa,wb,wc,ph,up){
    _d.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);var ex=a[0]-c[0],ey=a[1]-c[1],ez=a[2]-c[2];
    var nx=_d.y*ez-_d.z*ey,ny=_d.z*ex-_d.x*ez,nz=_d.x*ey-_d.y*ex,l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;if(ny<0){nx=-nx;ny=-ny;nz=-nz;}if(up){nx*=.3;ny=ny*.3+.7;nz*=.3;}
    var cc=_col.set(color);
    this.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);
    for(var i=0;i<3;i++){this.n.push(nx,ny,nz);this.c.push(cc.r,cc.g,cc.b);}
    this.w.push(wa,ph,wb,ph,wc,ph);
  };
  Batch.prototype.mesh=function(material,cast,name){
    var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.setAttribute('aWind',new T.Float32BufferAttribute(this.w,2));
    var m=new T.Mesh(g,material);m.castShadow=!!cast;m.receiveShadow=true;m.name=name;m.frustumCulled=false;return m;
  };
  function M(x,y,z,sx,sy,sz,ry,rx,rz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_pp.set(x,y,z);_s.set(sx,sy,sz);return _m.compose(_pp,_q,_s);}
  function seg(b,x0,y0,z0,x1,y1,z1,rad,color,o){
    _d.set(x1-x0,y1-y0,z1-z0);var len=_d.length();_q.setFromUnitVectors(_up,_d.normalize());_pp.set(x0,y0,z0);_s.set(rad,len,rad);_m.compose(_pp,_q,_s);b.geo(CYL,_m,color,o);
  }
  function tint(hex, r, amount) { _col.set(hex);var k=1+(r()-.5)*amount;return _col.clone().multiplyScalar(k).getHex(); }
  function shadeHex(hex, f) { return _col.set(hex).multiplyScalar(f).getHex(); }

  var TREES = {
    round:function(b,x,z,s,L,r){
      var ph=r()*TAU,cols=L.tc,o={base:0,h:4*s,amp:.06*s,ph:ph,grad:.3,lift:.12};
      b.geo(CYL,M(x,0,z,.15*s,1.9*s,.15*s),0x8a6a49,{grad:0,ph:ph});
      [[0,2.4,0,1.0],[.72,2.05,.25,.74],[-.66,2.1,-.18,.76],[.12,3.05,-.1,.72],[-.15,2.2,.7,.62]].forEach(function(c,i){
        b.geo(ICO,M(x+c[0]*s,c[1]*s,z+c[2]*s,c[3]*s,c[3]*s*.88,c[3]*s,r()*3),tint(cols[(i+Math.floor(r()*3))%cols.length],r,.2),o);
      });
    },
    cherry:function(b,x,z,s,L,r){
      var ph=r()*TAU,pink=[0xf5a8c3,0xf8bfd2,0xee8fb2,0xfad0de],o={base:0,h:3.6*s,amp:.07*s,ph:ph,grad:.25,lift:.15};
      seg(b,x,0,z,x+.1*s,1.4*s,z,.15*s,0x6e4b3a,{ph:ph});seg(b,x+.1*s,1.4*s,z,x+.5*s,2.2*s,z+.1*s,.08*s,0x6e4b3a,{ph:ph});seg(b,x+.1*s,1.4*s,z,x-.5*s,2.1*s,z-.1*s,.08*s,0x6e4b3a,{ph:ph});
      [[0,2.5,0,1.05],[.85,2.3,.2,.8],[-.8,2.3,-.1,.82],[.1,3.1,-.2,.75],[-.1,2.35,.8,.7],[.5,2.8,-.7,.65]].forEach(function(c,i){
        b.geo(ICO,M(x+c[0]*s,c[1]*s,z+c[2]*s,c[3]*s,c[3]*s*.82,c[3]*s,r()*3),tint(pink[i%4],r,.1),o);
      });
    },
    pine:function(b,x,z,s,L,r,snow){
      var ph=r()*TAU,o={base:0,h:4*s,amp:.045*s,ph:ph,grad:.2},c0=tint(L.tc[Math.floor(r()*L.tc.length)],r,.2);
      b.geo(CYL,M(x,0,z,.13*s,1.2*s,.13*s),0x6e5039,{ph:ph});
      [[1.2,1.5,.7],[.95,1.4,1.55],[.7,1.3,2.3]].forEach(function(c,i){
        b.geo(CONE,M(x,c[2]*s,z,c[0]*s,c[1]*s,c[0]*s,r()*3),shadeHex(c0,.9+i*.06),o);
        if(snow)b.geo(CONE,M(x,(c[2]+c[1]*.34)*s,z,c[0]*.8*s,c[1]*.68*s,c[0]*.8*s,r()*3),0xf2f8fc,{base:0,h:4*s,amp:.045*s,ph:ph,grad:.05});
      });
    },
    snowpine:function(b,x,z,s,L,r){TREES.pine(b,x,z,s,L,r,true);},
    snowround:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:3.5*s,amp:.04*s,ph:ph,grad:.2};
      b.geo(CYL,M(x,0,z,.15*s,1.8*s,.15*s),0x7d6a58,{ph:ph});
      [[0,2.3,0,.95],[.65,2,.2,.7],[-.6,2.05,-.15,.7],[.1,2.9,-.1,.65]].forEach(function(c,i){b.geo(ICO,M(x+c[0]*s,c[1]*s,z+c[2]*s,c[3]*s,c[3]*s*.8,c[3]*s,r()*3),[0xe8f0f5,0xd3e1ea,0xdce8ef,0xc6d8e3][i%4],o);});
    },
    cypress:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:5*s,amp:.04*s,ph:ph,grad:.25,lift:.1},c=0x3c6b47;
      b.geo(ICO,M(x,2.3*s,z,.55*s,2.3*s,.55*s,r()*3),tint(c,r,.2),o);b.geo(ICO,M(x,3.3*s,z,.42*s,1.4*s,.42*s,r()*3),tint(0x467a50,r,.2),o);
    },
    poplar:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:5*s,amp:.06*s,ph:ph,grad:.3,lift:.12};
      b.geo(CYL,M(x,0,z,.11*s,1.4*s,.11*s),0x8a7a62,{ph:ph});
      b.geo(ICO,M(x,2.5*s,z,.72*s,2.0*s,.72*s,r()*3),tint(L.tc[0],r,.2),o);b.geo(ICO,M(x+.15*s,3.1*s,z,.5*s,1.5*s,.5*s,r()*3),tint(L.tc[1],r,.2),o);
    },
    umbrella:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:4.4*s,amp:.04*s,ph:ph,grad:.3,lift:.1};
      seg(b,x,0,z,x+.25*s,1.8*s,z,.13*s,0x7a5c44,{ph:ph});seg(b,x+.25*s,1.8*s,z,x,3.3*s,z+.1*s,.1*s,0x7a5c44,{ph:ph});
      b.geo(ICO,M(x,3.55*s,z+.1*s,1.9*s,.5*s,1.9*s,r()*3),tint(0x4f7f4c,r,.15),o);b.geo(ICO,M(x+.2*s,3.95*s,z,1.3*s,.4*s,1.3*s,r()*3),tint(0x5d8f55,r,.15),o);
    },
    olive:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:3*s,amp:.05*s,ph:ph,grad:.3,lift:.1};
      seg(b,x,0,z,x-.2*s,1.1*s,z,.15*s,0x7f6a52,{ph:ph});seg(b,x-.2*s,1.1*s,z,x+.15*s,1.8*s,z,.11*s,0x7f6a52,{ph:ph});
      [[0,2.2,0,.95],[.8,1.9,.1,.7],[-.75,1.9,-.1,.7],[.1,2.6,.5,.65]].forEach(function(c,i){b.geo(ICO,M(x+c[0]*s,c[1]*s,z+c[2]*s,c[3]*s*1.15,c[3]*s*.62,c[3]*s*1.15,r()*3),tint(L.tc[i%L.tc.length],r,.18),o);});
    },
    gum:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:5*s,amp:.07*s,ph:ph,grad:.25,lift:.15};
      seg(b,x,0,z,x+.1*s,2.2*s,z,.14*s,0xd9cdb6,{ph:ph});seg(b,x+.1*s,2.1*s,z,x+.9*s,3.2*s,z+.2*s,.08*s,0xd9cdb6,{ph:ph});seg(b,x+.1*s,2.3*s,z,x-.8*s,3.4*s,z-.2*s,.08*s,0xd9cdb6,{ph:ph});seg(b,x+.1*s,2.4*s,z,x+.1*s,3.9*s,z-.1*s,.07*s,0xd9cdb6,{ph:ph});
      [[.9,3.4,.2,.9],[-.8,3.6,-.2,.85],[.1,4.1,-.1,.8]].forEach(function(c,i){b.geo(ICO,M(x+c[0]*s,c[1]*s,z+c[2]*s,c[3]*s*1.1,c[3]*s*.55,c[3]*s*1.1,r()*3),tint(L.tc[i%L.tc.length],r,.15),o);});
    },
    banyan:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:4.4*s,amp:.05*s,ph:ph,grad:.3,lift:.1};
      b.geo(CYL,M(x,0,z,.28*s,2.0*s,.28*s),0x7a5e45,{ph:ph});seg(b,x+.7*s,0,z+.2*s,x+.5*s,2*s,z,.07*s,0x8a6c50,{ph:ph});seg(b,x-.8*s,0,z-.1*s,x-.6*s,2*s,z,.07*s,0x8a6c50,{ph:ph});
      [[0,2.8,0,1.3],[1.1,2.5,.3,.95],[-1.0,2.5,-.2,.98],[.2,3.6,-.1,.9],[-.2,2.6,1.0,.8],[.3,2.7,-1.0,.82]].forEach(function(c,i){b.geo(ICO,M(x+c[0]*s,c[1]*s,z+c[2]*s,c[3]*s*1.1,c[3]*s*.75,c[3]*s*1.1,r()*3),tint(L.tc[i%L.tc.length],r,.18),o);});
    },
    palm:function(b,x,z,s,L,r){
      var ph=r()*TAU,bend=(r()-.5)*1.4,hgt=3.4*s,o={base:0,h:4.2*s,amp:.06*s,ph:ph},px=x,py=0,pz=z,i;
      for(i=1;i<=5;i++){var t=i/5,nx=x+bend*t*t*s,ny=hgt*t,nz=z+bend*.3*t*t*s;seg(b,px,py,pz,nx,ny,nz,(.17-.06*t)*s,i%2?0x9a7a55:0x8a6c4a,{ph:ph,base:0,h:4.2*s,amp:.015*s});px=nx;py=ny;pz=nz;}
      var tx=px,ty=py,tz=pz;
      for(i=0;i<8;i++){
        var a=i/8*TAU+r()*.3,dx=Math.cos(a),dz=Math.sin(a),len=(1.8+r()*.4)*s,c=tint(L.tc[i%L.tc.length],r,.2),prev=null;
        for(var k=0;k<=4;k++){
          var t2=k/4,hx=tx+dx*t2*len,hy=ty+.35*s*Math.sin(t2*2.1)-t2*t2*.95*s,hz=tz+dz*t2*len,wd=(.3-.24*t2)*s,sx=-dz*wd,sz=dx*wd;
          var cur=[[hx+sx,hy,hz+sz],[hx-sx,hy,hz-sz]];
          if(prev){var w0=prev.w,w1=.2+t2*1.0;b.tri(prev.a,prev.b,cur[0],c,w0*o.amp*2.5,w0*o.amp*2.5,w1*o.amp*2.5,ph,true);b.tri(prev.b,cur[1],cur[0],c,w0*o.amp*2.5,w1*o.amp*2.5,w1*o.amp*2.5,ph,true);}
          prev={a:cur[0],b:cur[1],w:.2+t2*1.0};
        }
      }
      b.geo(ICO0,M(tx,ty-.05*s,tz,.2*s,.2*s,.2*s),0x8a6040,{ph:ph});
    },
    bamboo:function(b,x,z,s,L,r){
      var ph=r()*TAU,n=6+Math.floor(r()*3),i;
      for(i=0;i<n;i++){
        var a=r()*TAU,rr=r()*.55*s,bx=x+Math.cos(a)*rr,bz=z+Math.sin(a)*rr,h=(3.4+r()*2.0)*s,lx=(r()-.5)*.8*s,lz=(r()-.5)*.8*s,c=i%2?0x8fbf5a:0x7cae58,top=[bx+lx,h,bz+lz];
        seg(b,bx,0,bz,top[0],top[1],top[2],.06*s,c,{base:0,h:h,amp:.22*s,ph:ph+i*.4,grad:.1});
        for(var k=0;k<3;k++){var la=a+k*2.1+r(),ll=.8*s,mid=[top[0]+Math.cos(la)*ll*.5,top[1]-.1*s,top[2]+Math.sin(la)*ll*.5],tip=[top[0]+Math.cos(la)*ll,top[1]-.5*s,top[2]+Math.sin(la)*ll],w=.13*s,lc=tint(L.tc[k%L.tc.length],r,.15);
          b.tri([top[0],top[1]-.2*s,top[2]],[mid[0]-Math.sin(la)*w,mid[1],mid[2]+Math.cos(la)*w],tip,lc,.22*s,.25*s,.3*s,ph+i*.4,true);b.tri([top[0],top[1]-.2*s,top[2]],tip,[mid[0]+Math.sin(la)*w,mid[1],mid[2]-Math.cos(la)*w],lc,.22*s,.3*s,.25*s,ph+i*.4,true);}
      }
    },
    cactus:function(b,x,z,s,L,r){
      var ph=r()*TAU,o={base:0,h:3*s,amp:.0,ph:ph,grad:.25},c=0x5d9a62;
      b.geo(CYL,M(x,0,z,.3*s,2.4*s,.3*s),c,o);b.geo(ICO,M(x,2.4*s,z,.3*s,.3*s,.3*s),c,o);
      seg(b,x+.28*s,1.2*s,z,x+.9*s,1.3*s,z,.17*s,c,o);seg(b,x+.9*s,1.3*s,z,x+.9*s,2.0*s,z,.17*s,c,o);b.geo(ICO,M(x+.9*s,2.0*s,z,.17*s,.17*s,.17*s),c,o);
    }
  };
  function bush(b,x,z,s,cols,r,flower) {
    var ph=r()*TAU,o={base:0,h:1.1*s,amp:.035*s,ph:ph,grad:.3,lift:.15},c=pick(cols,r),n=3+Math.floor(r()*2);
    for(var i=0;i<n;i++){var a=r()*TAU,rr=i?.42*s:0,rad=(.38+r()*.22)*s;b.geo(ICO,M(x+Math.cos(a)*rr,(.3+(i?0:.12))*s,z+Math.sin(a)*rr,rad,rad*.8,rad,r()*3),tint(i%2?shadeHex(c,1.18):c,r,.2),o);}
    if(flower){var fc=flower;for(var f=0;f<4;f++){var a2=r()*TAU,u=.3+r()*.4;b.geo(ICO0,M(x+Math.cos(a2)*u*s,(.4+r()*.35)*s,z+Math.sin(a2)*u*s,.07*s,.07*s,.07*s),fc,{ph:ph,base:0,h:1.1*s,amp:.035*s});}}
  }
  function rock(b,x,z,s,col,r) {
    var sc=.5+r()*.5;b.geo(ICO0,M(x,.18*s,z,(.45+r()*.3)*s,(.3+r()*.15)*s*sc*1.4,(.4+r()*.3)*s,r()*3,r()*.5,r()*.5),tint(col,r,.25),{grad:.35,ph:0});
    if(r()>.4)b.geo(ICO0,M(x+.5*s,.1*s,z+.2*s,.22*s,.16*s,.2*s,r()*3),tint(col,r,.25),{grad:.3});
  }
  function flowerPatch(b,x,z,cols,r,kind) {
    var n=5+Math.floor(r()*6),ph=r()*TAU,c0=pick(cols,r);
    for(var i=0;i<n;i++){
      var a=r()*TAU,u=Math.sqrt(r())*.55,fx=x+Math.cos(a)*u,fz=z+Math.sin(a)*u,h=.22+r()*.16,col=r()<.7?c0:pick(cols,r),amp=.07,lean=(r()-.5)*.08,w=ph+i;
      var base=[fx,0,fz],top=[fx+lean,h,fz],sx=.012;
      b.tri([fx-sx,0,fz],[fx+sx,0,fz],top,0x4f9a4c,0,0,amp*.6,w,true);
      if(kind==='tulip'){b.geo(ICO0,M(fx+lean,h+.04,fz,.05,.085,.05,r()*3),col,{base:0,h:h+.1,amp:amp,ph:w,grad:.2});b.tri([fx,0,fz],[fx+.09,.2,fz+.03],[fx+.01,.01,fz+.02],0x4f9a4c,0,amp*.4,0,w,true);}
      else{var hr=.065+r()*.03,hy=h+.01;for(var k=0;k<6;k++){var a1=k/6*TAU,a2=(k+1)/6*TAU;b.tri([top[0],hy+.012,top[2]],[top[0]+Math.cos(a1)*hr,hy,top[2]+Math.sin(a1)*hr],[top[0]+Math.cos(a2)*hr,hy,top[2]+Math.sin(a2)*hr],col,amp,amp,amp,w,true);}
        b.tri([top[0]-.02,hy+.014,top[2]],[top[0]+.02,hy+.014,top[2]],[top[0],hy+.016,top[2]+.03],0xffd447,amp,amp,amp,w,true);}
    }
  }
  function tuft(b,x,z,col,r,s) {
    var ph=r()*TAU;
    for(var k=0;k<4;k++){
      var a=r()*TAU,h=(.1+r()*.1)*s,lean=(.03+r()*.05)*s,wx=Math.cos(a+1.57)*.016*s,wz=Math.sin(a+1.57)*.016*s,dx=Math.cos(a)*lean,dz=Math.sin(a)*lean,c=shadeHex(col,.8+r()*.4);
      b.tri([x-wx,0,z-wz],[x+wx,0,z+wz],[x+dx,h,z+dz],c,0,0,.1*s,ph,true);
    }
  }
  function reed(b,x,z,cols,r) {
    var ph=r()*TAU,n=6;
    for(var i=0;i<n;i++){
      var a=r()*TAU,u=r()*.35,rx=x+Math.cos(a)*u,rz=z+Math.sin(a)*u,h=1.2+r()*.9,lean=(r()-.5)*.6,la=r()*TAU,tx=rx+Math.cos(la)*Math.abs(lean),tz=rz+Math.sin(la)*Math.abs(lean),w=.03,c=pick(cols,r);
      b.tri([rx-w,0,rz],[rx+w,0,rz],[tx,h,tz],c,0,0,.2,ph+i,true);
      if(r()<.35)b.geo(ICO0,M(tx,h-.08,tz,.035,.14,.035),0x7a5a3a,{base:0,h:h,amp:.2,ph:ph+i});
    }
  }

  function scatter(country, density) {
    var places=country.places,segs=places.map(function(p){return [0,23,p.x,p.z];});
    function dist(x,z,s){var dx=s[2]-s[0],dz=s[3]-s[1],t=Math.max(0,Math.min(1,((x-s[0])*dx+(z-s[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-s[0]-dx*t,z-s[1]-dz*t);}
    return function open(x,z,m,big){
      if(Math.abs(x)>59.5||Math.abs(z)>59.5)return false;
      if(Math.abs(x)<5+m&&z>14-m&&z<32+m)return false;
      for(var i=0;i<places.length;i++){var p=places[i];if(Math.hypot(x-p.x,z-p.z)<(p.radius||6)+m)return false;if(dist(x,z,segs[i])<2.1+m)return false;}
      if(Math.abs(x)<2.4+m&&z>-23-m&&z<39+m)return false;
      if(Math.abs(z+5)<2.4+m&&Math.abs(x)<38+m)return false;
      if(big&&(Math.abs(x)>51.5||z<-51.5||z>51.5))return false;
      return true;
    };
  }
  function pickWeighted(list, r) { var total=0,i;for(i=0;i<list.length;i++)total+=list[i][1];var t=r()*total;for(i=0;i<list.length;i++){t-=list[i][1];if(t<=0)return list[i][0];}return list[0][0]; }

  function buildVegetation(country, env, look, seed, scale, uni, reduced) {
    var r=random(seed^9001),big=new Batch(),small=new Batch(),open=scatter(country),placed=[],n=look.n,g=env.ground;
    function free(x,z,rad){for(var i=0;i<placed.length;i++){var p=placed[i];if(Math.hypot(x-p[0],z-p[1])<rad+p[2])return false;}return true;}
    function sprinkle(count,margin,isBig,rad,fn){
      var done=0;for(var tries=0;tries<count*30&&done<count;tries++){
        var x=(r()-.5)*118,z=(r()-.5)*118;if(!open(x,z,margin,isBig)||!free(x,z,rad))continue;if(isBig)placed.push([x,z,rad]);fn(x,z);done++;
      }
    }
    // Trees, bushes and rocks cast soft shadows; flowers, tufts and reeds do not.
    sprinkle(Math.round(n.tree*scale),2.2,true,2.0,function(x,z){var kind=pickWeighted(look.trees,r),s=.85+r()*.5;(TREES[kind]||TREES.round)(big,x,z,s,look,r);});
    sprinkle(Math.round(n.bush*scale),1.3,true,1.0,function(x,z){bush(big,x,z,.8+r()*.6,look.bush,r,look.flower&&look.flower.length&&r()<.3?pick(look.flower,r):0);});
    sprinkle(Math.round(n.rock*scale),1.0,true,.8,function(x,z){rock(big,x,z,.8+r()*1.2,look.rock,r);});
    if(look.cactusN)sprinkle(look.cactusN,2,true,1,function(x,z){TREES.cactus(big,x,z,.8+r()*.5,look,r);});
    if(n.flower&&look.flower&&look.flower.length){sprinkle(Math.round(n.flower*scale),.4,false,.7,function(x,z){flowerPatch(small,x,z,look.flower,r,look.fkind);});}
    // Path edges: flowers and tufts line the way to each place.
    country.places.forEach(function(p,pi){
      var dx=p.x,dz=p.z-23,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,k;
      if(n.flower&&look.flower&&look.flower.length)for(k=0;k<Math.round(len/2.6*scale);k++){var t=(k+r())*2.6,side=r()<.5?-1:1,off=side*(2.3+r()*.9),x=ux*t-uz*off,z=23+uz*t+ux*off;if(t>6&&open(x,z,-.8,false)&&Math.hypot(x-p.x,z-p.z)>(p.radius||6)+.5)flowerPatch(small,x,z,look.flower,r,look.fkind);}
    });
    var tc=look.tuftc||(g==='snow'?[0xb9a77a,0x9aa87c]:null),tint0=new T.Color(env.groundTint);
    sprinkle(Math.round(n.tuft*scale),.2,false,.28,function(x,z){var col=tc?pick(tc,r):tint0.clone().multiplyScalar(.8).getHex();tuft(small,x,z,col,r,.9+r()*.9);});
    // Reeds hug the shoreline.
    var rc=look.reedc||(g==='snow'?[0xb5a27a,0xc9b88e]:[0x7fa85a,0x93b867,0xa6b873]),clumps=Math.round(n.reed*scale);
    for(var i=0;i<clumps;i++){var edge=(r()*4)|0,u=(r()-.5)*112,off=59.4+r()*1.8,x=edge%2?u:(edge===0?-off:off),z=edge%2?(edge===1?-off:off):u;reed(small,x,z,rc,r);}
    return {big:big,small:small};
  }

  // ------------------------------------------------------------- sky dome
  var SKY_VERT='varying vec3 vDir;\nvoid main(){ vDir=normalize(position); vec4 wp=vec4(position+cameraPosition,1.0); gl_Position=projectionMatrix*viewMatrix*wp; gl_Position.z=gl_Position.w; }';
  var SKY_FRAG=[
    'uniform vec3 uHorizon,uZenith,uSunDir,uHill1,uHill2;',
    'uniform float uTime,uCloud,uHillType,uSnow;',
    'varying vec3 vDir;',
    NOISE,
    'float ridge(float a,float t,float k){',
    '  float h;',
    '  if(t<0.5) h=.5+.5*sin(a*3.0+1.2)*.6+.25*sin(a*7.0+k)+.15*sin(a*13.0+2.0*k);',
    '  else if(t<1.5){ h=1.0-abs(sin(a*4.0+k)*.7+sin(a*9.0+k*2.0)*.3); h=h*h; }',
    '  else if(t<2.5) h=.4+.3*sin(a*5.0+k)+.2*sin(a*11.0);',
    '  else if(t<3.5){ float s=abs(sin(a*6.0+k)); h=pow(s,.45)*(.5+.5*sin(a*2.0+1.0)); }',
    '  else if(t<4.5) h=clamp(.5+.9*sin(a*5.0+k)+.3*sin(a*13.0),0.25,0.62)*.9;',
    '  else h=.12;',
    '  return h; }',
    'void main(){',
    '  vec3 d=normalize(vDir); float h=d.y;',
    '  vec3 col=mix(uHorizon,uZenith,smoothstep(0.0,.62,h));',
    '  float s=max(dot(d,uSunDir),0.0);',
    '  col+=vec3(1.0,.93,.75)*(pow(s,48.0)*.55+pow(s,5.0)*.10);',
    '  col=mix(col,vec3(1.0,.98,.9),smoothstep(.9988,.9994,s)*step(0.0,h));',
    '  if(h>0.015){',
    '    vec2 cp=d.xz/(h+.22)*1.55+vec2(uTime*.012,uTime*.004);',
    '    float n=fzFbm(cp*1.1);',
    '    float cl=smoothstep(.50,.70,n)*smoothstep(.015,.16,h)*uCloud;',
    '    vec3 cc=mix(vec3(1.0),vec3(.84,.9,.97),smoothstep(.55,.8,n));',
    '    col=mix(col,cc,cl*.88);',
    '  }',
    '  float az=atan(d.x,d.z);',
    '  float hh1=ridge(az,uHillType,1.3)*.095+.006, hh2=ridge(az*1.3+2.0,uHillType,3.1)*.07+.003;',
    '  if(uHillType<5.5){',
    '   float far=smoothstep(hh1+.004,hh1-.004,h)*smoothstep(-.02,.0,h);',
    '   col=mix(col,mix(uHorizon,uHill2,.85),far);',
    '   float near=smoothstep(hh2+.004,hh2-.004,h)*smoothstep(-.02,.0,h);',
    '   vec3 nc=mix(uHorizon,uHill1,.75);',
    '   if(uSnow>0.01 && uHillType>.5 && uHillType<1.5) nc=mix(nc,vec3(.96,.98,1.0),smoothstep(hh2*.62,hh2*.82,h)*uSnow);',
    '   col=mix(col,nc,near);',
    '  }',
    '  if(h<0.0) col=uHorizon;',
    '  gl_FragColor=vec4(col,1.0);',
    '  #include <colorspace_fragment>',
    '}'
  ].join('\n');
  var HILL_TYPES={0:0,1:1,2:2,3:3,4:4,5:5};

  // -------------------------------------------------------------- stage
  function create(country,renderer) {
    var environment=Object.assign({ground:'grass',weather:'clear',season:'ilkbahar',groundTint:0x8fb073,path:'paving',moisture:0,waterColor:0x54afbe},country.environment||{}),root=new T.Group(),disposed=false,look=lookFor(country,environment);
    if(look.tint)environment.groundTint=look.tint;
    var reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var touch=navigator.maxTouchPoints>1,scale=touch?.8:1,uni={uTime:{value:0}},owned=[];
    root.name='zemin-'+country.id;var seed=seedFor(country.id),anisotropy=renderer?Math.min(4,renderer.capabilities.getMaxAnisotropy()):1;
    function clock(){uni.uTime.value=reduced?0:(performance.now()*.001)%6283.185;}
    var source=groundCanvas(environment,look,seed),repeat=environment.ground==='grass'?17:14,groundMap=texture(source,repeat,repeat,true,anisotropy),bumpMap=texture(bumpCanvas(source),repeat,repeat,false,anisotropy);
    var macro=texture(macroCanvas(look,environment,seed),1,1,false,anisotropy);macro.minFilter=T.LinearMipmapLinearFilter;
    var pathMap=texture(pathCanvas(look,environment,seed),1,1,true,anisotropy,true);
    owned.push(macro);
    var roughness=environment.ground==='snow'?.88:environment.ground==='sand'?.98:.96-environment.moisture*.20;
    var material=new T.MeshStandardMaterial({color:0xffffff,map:groundMap,bumpMap:bumpMap,bumpScale:environment.ground==='snow'?.09:environment.ground==='sand'?.045:.055,roughness:roughness});
    var cloudAmt=reduced?.07:.11,spark=look.spark?1:0;
    material.onBeforeCompile=function(shader){
      shader.uniforms.uTime=uni.uTime;shader.uniforms.uMacro={value:macro};shader.uniforms.uCloud={value:cloudAmt};
      addWorldVarying(shader);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uMacro;\nuniform float uCloud;').replace('#include <color_fragment>',[
        '#include <color_fragment>',
        'vec3 fzMac=texture2D(uMacro,fzWP*.0178+.5).rgb*2.0;',
        'diffuseColor.rgb*=mix(vec3(1.0),fzMac,.8);',
        'float fzCl=fzFbm(fzWP*.021+vec2(uTime*.012,uTime*.005));',
        'diffuseColor.rgb*=1.0-uCloud*smoothstep(.48,.72,fzCl);',
        spark?['{ vec2 cell=floor(fzWP*3.4); float hs=fzHash(cell); float tw=pow(max(0.0,sin(uTime*2.3+hs*60.0)),20.0);',
          '  float near=1.0-smoothstep(14.0,34.0,length(vViewPosition)); vec2 fc=fract(fzWP*3.4)-.5; float dd=length(fc-(vec2(fzHash(cell+3.1),fzHash(cell+9.7))-.5)*.6); fzSpark=step(.945,hs)*tw*near*(1.0-smoothstep(.015,.075,dd)); }'].join('\n'):''
      ].join('\n')).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.0,.98,.92)*fzSpark*.75;');
    };
    material.customProgramCacheKey=function(){return 'fz-ground-'+spark;};
    var top=new T.Mesh(new T.PlaneGeometry(124,124),material);top.rotation.x=-Math.PI/2;top.position.y=-.05;top.receiveShadow=true;top.name='yürüme yüzeyi';top.onBeforeRender=clock;root.add(top);
    var sides=new T.Mesh(sidesGeometry(environment,look),new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1}));sides.name='toprak katmanları';root.add(sides);
    // Shallow turquoise near the shore, a foam line that breathes, tiny glints.
    var wmat=new T.MeshStandardMaterial({color:environment.waterColor,roughness:.45,metalness:.05});
    wmat.onBeforeCompile=function(shader){
      shader.uniforms.uTime=uni.uTime;shader.uniforms.uShallow={value:new T.Color(environment.waterColor).lerp(new T.Color(0xcff4ee),.45)};addWorldVarying(shader);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uShallow;').replace('#include <color_fragment>',[
        '#include <color_fragment>',
        'float fzEdge=max(abs(fzWP.x),abs(fzWP.y))-62.0;',
        'diffuseColor.rgb=mix(diffuseColor.rgb*.82,uShallow,exp(-max(fzEdge,0.0)*.11));',
        'float fzRip=sin(fzWP.x*.8+uTime*.7+fzNoise(fzWP*.3)*6.0)*sin(fzWP.y*.7-uTime*.5);',
        'diffuseColor.rgb*=1.0+fzRip*.045;',
        'float fzWob=fzNoise(fzWP*.45+uTime*.15)*.9;',
        'float fzFoam=1.0-smoothstep(.1,.9+fzWob*.6+.25*sin(uTime*.9),fzEdge);',
        'float fzLine=smoothstep(.22,0.0,abs(fzEdge-(1.8+.5*sin(uTime*.8+fzWP.x*.2)+fzWob*.4)))*.5*step(0.0,fzEdge);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0),clamp(fzFoam*.8+fzLine,0.0,.9));',
        '{ vec2 cell=floor(fzWP*1.6); float hs=fzHash(cell); vec2 fc=fract(fzWP*1.6)-.5; float dd=length(fc-(vec2(fzHash(cell+3.1),fzHash(cell+9.7))-.5)*.5); fzSpark=step(.9,hs)*pow(max(0.0,sin(uTime*2.1+hs*70.0)),10.0)*(1.0-smoothstep(30.0,80.0,length(vViewPosition)))*(1.0-smoothstep(.04,.14,dd)); }'
      ].join('\n')).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.9,.97,1.0)*fzSpark*.6;');
    };
    wmat.customProgramCacheKey=function(){return 'fz-water';};
    var water=new T.Mesh(new T.PlaneGeometry(210,210),wmat);water.rotation.x=-Math.PI/2;water.position.y=-1.5;water.name='dış su yüzeyi';root.add(water);
    var pathMat=new T.MeshStandardMaterial({color:0xffffff,map:pathMap,roughness:environment.moisture>.5?.78:.96,alphaTest:.5,alphaToCoverage:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    var paths=new T.Mesh(pathGeometry(country.places,3.5),pathMat);paths.receiveShadow=true;paths.name='üç keşif patikası';root.add(paths);
    // Vegetation: wind sway is a vertex-shader offset weighted by height.
    var veg=buildVegetation(country,environment,look,seed,scale,uni,reduced);
    var vmat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.92,side:T.DoubleSide});
    vmat.onBeforeCompile=function(shader){
      shader.uniforms.uTime=uni.uTime;shader.uniforms.uSway={value:reduced?0:1};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aWind;\nuniform float uTime,uSway;').replace('#include <begin_vertex>',[
        '#include <begin_vertex>',
        'float fzW=aWind.x*uSway;',
        'transformed.x+=fzW*(sin(uTime*1.7+aWind.y)+.5*sin(uTime*3.1+aWind.y*2.3));',
        'transformed.z+=fzW*(cos(uTime*1.3+aWind.y*1.4)*.8);'
      ].join('\n'));
    };
    vmat.customProgramCacheKey=function(){return 'fz-veg';};
    var vfrag=T.ShaderChunk.normal_fragment_begin.replace(/gl_FrontFacing\s*\?\s*1\.0\s*:\s*-\s*1\.0/,'1.0');
    var vbase=vmat.onBeforeCompile;vmat.onBeforeCompile=function(shader){vbase(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',vfrag);};
    var bigMesh=veg.big.mesh(vmat,true,'büyük bitkiler'),smallMesh=veg.small.mesh(vmat,false,'çiçek ve çimler');root.add(bigMesh,smallMesh);
    // Sky: gradient, drifting clouds, sun glow and misty hills, one far-plane draw.
    var hills=look.hills||{type:0,c:0x86b58f,c2:0xa4c9a8,zen:0x6bb6e6},skyCol=new T.Color(environment.sky);
    var zen=skyCol.clone().lerp(new T.Color(hills.zen||0x6bb6e6),environment.ground==='snow'?.5:.62);
    var sun=new T.Vector3(-18,30,16).normalize();
    var sky=new T.Mesh(new T.SphereGeometry(100,24,14),new T.ShaderMaterial({
      uniforms:{uHorizon:{value:skyCol.clone()},uZenith:{value:zen},uSunDir:{value:sun},uHill1:{value:new T.Color(hills.c)},uHill2:{value:new T.Color(hills.c2)},uTime:uni.uTime,
        uCloud:{value:environment.weather==='rain'||environment.weather==='mist'?.95:environment.ground==='snow'?.8:.85},uHillType:{value:HILL_TYPES[hills.type]||0},uSnow:{value:hills.snow||0}},
      vertexShader:SKY_VERT,fragmentShader:SKY_FRAG,side:T.BackSide,depthWrite:false,depthTest:true,transparent:true,blending:T.NoBlending,fog:false,toneMapped:false}));
    sky.frustumCulled=false;sky.renderOrder=-10;sky.name='gökyüzü';
    sky.onBeforeRender=function(rend,scene){var h=sky.material.uniforms.uHorizon.value;if(scene.fog)h.copy(scene.fog.color);else if(scene.background&&scene.background.isColor)h.copy(scene.background);};
    root.add(sky);
    // Every map and buffer is owned by this one surface stage, including bump.
    function dispose(){if(disposed)return;disposed=true;root.removeFromParent();var geos=new Set(),mats=new Set(),maps=new Set(owned);root.traverse(function(o){if(o.isInstancedMesh)o.dispose();if(o.geometry)geos.add(o.geometry);var list=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];list.forEach(function(m){mats.add(m);['map','bumpMap','normalMap','roughnessMap'].forEach(function(key){if(m[key])maps.add(m[key]);});});});geos.forEach(function(g){g.dispose();});mats.forEach(function(m){m.dispose();});maps.forEach(function(t){t.dispose();});}
    return {root:root,environment:environment,look:look,dispose:dispose};
  }
}());
