'use strict';
(() => {
  const C=FLASH_CORE,{renderer,scene,camera}=C,$=id=>document.getElementById(id);
  const P=FLASH_PICTO;
  document.body.classList.toggle('touch-controls',navigator.maxTouchPoints>0||C.touch);
  document.querySelectorAll('[data-picto]').forEach(el=>el.innerHTML=P.svg(el.dataset.picto));
  const picture=(c,p)=>{const img=document.createElement('img');img.className=p?'place-picture':'country-picture';img.alt=p?p.name:c.name;img.src='assets/ui/'+(p?'place-'+c.id+'-'+p.id:'country-'+c.id)+'.png';return img;};
  const countries=FLASH_COUNTRIES,hero=FLASH_HERO.create(),globe=FLASH_GLOBE.create(countries),shuttle=FLASH_SHUTTLE.create();
  const world=new THREE.Group();scene.add(world,globe.root,hero.root,shuttle.root);shuttle.root.visible=false;
  const rayPoint=new THREE.Vector3(),velocity=new THREE.Vector3(),destination=new THREE.Vector3();
  const cameraAim=new THREE.Vector3(),cameraPos=new THREE.Vector3(),tmp=new THREE.Vector3();
  const keys=new Set(),MOVE_KEYS=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'],SAVE='flash-feza.travel.v1';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data={version:1,visited:[],countries:[],current:'tr',sound:true,music:true,quality:'auto',activities:[]},saveOK=true;
  try {const raw=JSON.parse(localStorage.getItem(SAVE)||'null');if(raw&&raw.version===1){
    // A fresh adventure on every opening; only parent preferences persist.
    data.sound=raw.sound;data.music=raw.music;data.quality=raw.quality;
  }}catch(e){saveOK=false;}
  if(!countries.some(c=>c.id===data.current))data.current='tr';
  if(typeof data.sound!=='boolean')data.sound=true;
  if(typeof data.music!=='boolean')data.music=true;
  if(!['auto','low','high'].includes(data.quality))data.quality='auto';
  FLASH_AUDIO.setEnabled(data.sound);FLASH_AUDIO.setMusicEnabled?.(data.music);C.setQuality(data.quality);$('quality').value=data.quality;
  let mode='welcome',selected=countries.find(c=>c.id===data.current),current=null,city=null,ground=null,weather=null;
  let time=0,travelTime=0,journeyDistance=0,fromCountry=null,hasDestination=false,boost=false,boostPointer=null;
  const tourPose={position:new THREE.Vector3(0,0,25),rotation:Math.PI};
  let pointer=null,dragX=0,modal=null,discoveryPlace=null,navPlace=null,challenge=null;
  let lastFrame=0,nextDraw=0,lastUI=0,toastUntil=0,sceneReady=true,hadTour=false;
  let travelStage=null,routeSamples=[],travelDuration=9,lastTerrain=null,lastTerrainVoice=-20,autoPath=[],celebrateUntil=0,mapDistance=19;
  let hasSelection=false,spaceArrival=false,departAt=0,discoveryUntil=0,activityEndAt=0,hopUntil=0;
  const activityRounds=new Map();
  let activityStages=new Map(),lastActivityPlace=null,activityCooldown=0;
  let lastFocusPlace=null;
  let portal=null,portalArmed=false,portalReadyAt=0,portalTravelAt=0,cueTarget=null,guideUIAt=0,lastTravelUI=0;
  let atlasInviteUntil=0;
  const kmFormat=new Intl.NumberFormat('tr-TR');
  const mapPointers=new Map();let pinchDistance=0;
  const space=FLASH_SPACE.create({touch:C.touch,reduced}),spaceStars=space.root;scene.add(spaceStars);
  const trailPositions=new Float32Array(60*3),trailGeo=new THREE.BufferGeometry();
  trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
  const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:0xffc658,transparent:true,opacity:.85}));trail.frustumCulled=false;scene.add(trail);
  const sparksGeo=new THREE.BufferGeometry(),sparksPositions=new Float32Array(48*3);sparksGeo.setAttribute('position',new THREE.BufferAttribute(sparksPositions,3));
  const sparks=new THREE.Points(sparksGeo,new THREE.PointsMaterial({color:0xffe89b,size:.14,transparent:true,opacity:.75}));sparks.frustumCulled=false;scene.add(sparks);
  const guide=new THREE.Group();
  const guideRing=new THREE.Mesh(new THREE.TorusGeometry(1.1,.09,6,30),new THREE.MeshBasicMaterial({color:0xffd268}));guideRing.rotation.x=Math.PI/2;guideRing.position.y=.11;
  const guideArrow=new THREE.Mesh(new THREE.ConeGeometry(.48,.85,4),new THREE.MeshBasicMaterial({color:0xffd268}));guideArrow.position.y=3.4;guideArrow.rotation.z=Math.PI;guide.add(guideRing,guideArrow);scene.add(guide);guide.visible=false;
  function save(){try{localStorage.setItem(SAVE,JSON.stringify({version:1,sound:data.sound,music:data.music,quality:data.quality}));saveOK=true;}catch(e){saveOK=false;}$('save-note').textContent=saveOK?'Ses ve görüntü ayarların saklanır. Her açılışta yepyeni bir gezi başlar.':'Her açılışta yepyeni bir gezi başlar. Bu tarayıcı ses ve görüntü ayarlarını saklayamıyor.';}
  function seen(c,p){return data.visited.includes(c.id+':'+p.id);}
  function stamps(c){return c.places.filter(p=>seen(c,p)).length;}
  const flagCache={};
  function flag(c){const image=document.createElement('img');image.className='country-flag';image.alt=c.name+' bayrağı';image.width=30;image.height=20;
    if(!flagCache[c.id]){const rect=(x,y,w,h,color)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+color+'"/>',star=(x,y,r,color)=>{let points='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.4:r;points+=(x+Math.cos(a)*rr)+','+(y+Math.sin(a)*rr)+' ';}return '<polygon points="'+points+'" fill="'+color+'"/>';};let shapes='';
      if(['it','nl','in','es'].includes(c.id)){
        const cols={it:['#29985b','#fff','#dc4f4d'],nl:['#d65352','#fff','#3964a2'],in:['#ee9d48','#fff','#3c9960'],es:['#c84742','#f1c34d','#c84742']}[c.id];
        cols.forEach((col,i)=>shapes+=c.id==='it'?rect(i*20,0,20,40,col):rect(0,i*40/3,60,40/3+.1,col));
        if(c.id==='in')shapes+='<circle cx="30" cy="20" r="5" fill="none" stroke="#335b9a" stroke-width="1.4"/>'+star(30,20,4,'#335b9a');
      }else if(c.id==='gb'||c.id==='au'){
        shapes=rect(0,0,60,40,'#294b86')+'<path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="9"/><path d="M0 0L60 40M60 0L0 40" stroke="#d04749" stroke-width="3"/><path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12"/><path d="M30 0V40M0 20H60" stroke="#d04749" stroke-width="7"/>';
        if(c.id==='au')shapes='<g transform="scale(.5)">'+shapes+'</g>'+star(14,30,5,'#fff')+star(45,12,4,'#fff')+star(44,32,4,'#fff')+star(35,22,3,'#fff')+star(54,20,3,'#fff');
      }else if(['be','fr','ca'].includes(c.id)){const colors=c.id==='be'?['#181818','#f7cf32','#e3343b']:c.id==='fr'?['#255da1','#fff','#df3a48']:['#d8353c','#fff','#d8353c'];colors.forEach((color,i)=>shapes+=rect(i*20,0,20,40,color));if(c.id==='ca')shapes+='<path d="M30 6l3 10 4-3-1 8 6-1-3 9-7 1v6h-4v-6l-7-1-3-9 6 1-1-8 4 3z" fill="#d8353c"/>';}
      else if(c.id==='ru'){['#fff','#3464b8','#d84140'].forEach((color,i)=>shapes+=rect(0,i*40/3,60,40/3+.1,color));}
      else if(c.id==='jp'){shapes=rect(0,0,60,40,'#fff')+'<circle cx="30" cy="20" r="11" fill="#d9404b"/>';}
      else if(c.id==='eg'){shapes=rect(0,0,60,14,'#d9423b')+rect(0,14,60,13,'#fff')+rect(0,27,60,13,'#222')+'<path d="M30 15l-5 4 2 6h6l2-6z" fill="#cfad40"/>';}
      else if(c.id==='tr'){shapes=rect(0,0,60,40,'#dc3542')+'<circle cx="25" cy="20" r="11" fill="#fff"/><circle cx="28" cy="18" r="9" fill="#dc3542"/>'+star(39,19,6,'#fff');}
      else if(c.id==='cn'){shapes=rect(0,0,60,40,'#dc3940')+star(12,12,7,'#ffdf5f');[[24,5],[28,12],[27,20],[21,25]].forEach(([x,y])=>shapes+=star(x,y,2.5,'#ffdf5f'));}
      else if(c.id==='br'){shapes=rect(0,0,60,40,'#2b9b59')+'<path d="M30 4L56 20 30 36 4 20z" fill="#f4d14e"/><circle cx="30" cy="20" r="10" fill="#2864ab"/><path d="M21 17q10-1 18 7" fill="none" stroke="#fff" stroke-width="2"/>';}
      else if(c.id==='us'){shapes=rect(0,0,60,40,'#fff');for(let i=0;i<13;i+=2)shapes+=rect(0,i*40/13,60,40/13,'#d34a49');shapes+=rect(0,0,26,22,'#28548e');for(let row=0;row<9;row++)for(let col=0;col<(row%2?5:6);col++)shapes+=star(2+col*4.1+(row%2?2:0),2+row*2.15,.85,'#fff');}
      flagCache[c.id]='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">'+shapes+'</svg>');
    }image.src=flagCache[c.id];return image;
  }
  function announce(text){$('toast').textContent=text;$('toast').hidden=false;toastUntil=time+3.4;}
  function resetInput(){keys.clear();hasDestination=false;autoPath=[];mapPointers.clear();pinchDistance=0;boost=false;boostPointer=null;pointer=null;velocity.set(0,0,0);$('joystick').hidden=true;$('boost').classList.remove('active');}
  function showMode(value){if(mode==='tour'&&value!=='tour'){tourPose.position.copy(hero.root.position);tourPose.rotation=hero.root.rotation.y;}mode=value;document.body.classList.toggle('space-flight',value==='travel'&&spaceArrival);departAt=0;resetInput();for(const k of ['welcome','atlas','tour','travel'])$(k).hidden=k!==value;$('hud').hidden=value==='welcome';$('map-open').hidden=value==='travel';$('passport-open').hidden=value==='travel';
    globe.root.visible=value==='welcome'||value==='atlas'||value==='travel'&&spaceArrival;spaceStars.visible=value==='welcome'||value==='atlas'||value==='travel'&&spaceArrival;shuttle.root.visible=value==='travel'&&spaceArrival;world.visible=value==='tour';if(travelStage)travelStage.root.visible=value==='travel';guide.visible=false;trail.visible=false;sparks.visible=false;if(challenge)challenge.root.visible=value==='tour';
    scene.fog=null;C.sun.color.setHex(0xffecd5);C.sun.intensity=2.7;if(weather)weather.root.visible=value==='tour';$('atlas-back').hidden=!hadTour;hero.root.visible=value!=='atlas';$('navigation').hidden=value!=='tour'||!navPlace;
    if(value==='atlas'||value==='welcome'){scene.background.set(0x183662);globe.root.scale.setScalar(1);globe.root.position.set(value==='welcome'?(innerWidth<621?0:4.8):(innerWidth<621?0:-3),innerWidth<621?1.8:0,0);if(hasSelection)globe.focus(selected,true);mapDistance=innerWidth<621?22:19;camera.position.set(0,2,mapDistance);camera.lookAt(0,0,0);hero.root.position.set(innerWidth<621?1.45:6.4,innerWidth<621?-1.2:-3.5,5.5);hero.root.rotation.y=-.4;hero.root.scale.setScalar(innerWidth<621?1.7:1.9);C.sun.castShadow=false;}
    if(value==='tour'){tourEnvironment(current);hero.root.scale.setScalar(1.42);hero.root.position.copy(tourPose.position);hero.root.rotation.y=tourPose.rotation;C.sun.castShadow=true;guide.visible=!!navPlace;updateTourUI();}
    if(value==='travel'){C.setSky(0xb9e1ed);hero.root.scale.setScalar(1.85);hero.root.position.set(0,.1,12);hero.root.rotation.y=Math.PI;C.sun.castShadow=true;camera.position.set(8,7,26);camera.lookAt(0,1,-8);}
    if(value==='travel'&&spaceArrival){scene.background.set(0x183662);scene.fog=null;C.sun.castShadow=false;globe.focus(selected,true);poseSpaceShuttle(0,0);}
    if(value==='welcome'){const small=innerWidth<621,narrow=camera.aspect<1,scale=small?1.9:narrow?2.05:2.4,earthScale=small||narrow?.76:.88;
      const halfAtHero=(mapDistance-5.5)*Math.tan(camera.fov*Math.PI/360)*camera.aspect,halfAtEarth=mapDistance*Math.tan(camera.fov*Math.PI/360)*camera.aspect;
      const heroX=Math.min(small?2.15:5.4,halfAtHero-scale*.38-.15),earthX=small?-1.3:-Math.min(5.2,Math.max(1,halfAtEarth-4.5*earthScale-.35));
      globe.root.scale.setScalar(earthScale);globe.root.position.set(earthX,small?1.7:narrow?.4:-.1,0);hero.root.position.set(heroX,small?.2:-1.2,5.5);hero.root.scale.setScalar(scale);hero.root.rotation.y=-.25;}
    if(portal)portal.root.visible=value==='tour';if(value==='tour')portalArmed=false;
    $('map-open').hidden=true;portalTravelAt=0;$('portal-transition').hidden=true;if(value!=='tour')$('target-cue').hidden=true;
    if(value==='atlas'&&!hasSelection)inviteCountries();else if(value!=='atlas')endCountriesInvitation();
    resetTrail();
  }
  function endCountriesInvitation(){atlasInviteUntil=0;document.querySelector('.country-panel').classList.remove('choose-invitation');if($('atlas-hint'))$('atlas-hint').hidden=true;}
  function inviteCountries(){
    document.querySelector('.atlas-heading h2').textContent='Yeni bir ülke seç!';
    const panel=document.querySelector('.country-panel'),hint=$('atlas-hint'),list=$('country-list');
    panel.classList.add('choose-invitation');if(hint)hint.hidden=false;atlasInviteUntil=time+4.5;
    const next=countries.find(c=>c!==current&&!data.countries.includes(c.id))||countries.find(c=>c!==current)||countries[0];
    const card=list.querySelector('[data-country="'+next.id+'"]');
    if(card)list.scrollTop=Math.max(0,list.scrollTop+card.getBoundingClientRect().top-list.getBoundingClientRect().top-8);
  }
  function poseSpaceShuttle(dt,p){
    // Frame the Earth first. The little shuttle enters from the side rather
    // than pulling the camera so close that the planet disappears behind it.
    const portrait=camera.aspect<1,short=innerHeight<600,tan=Math.tan(camera.fov*Math.PI/360),earthScale=.94+p*.05;
    const earthDiameter=Math.min(innerWidth*.82,innerHeight*(short?.46:.55)),earthRadius=4.5*earthScale;
    const distance=Math.sqrt(earthRadius*earthRadius+Math.pow(earthRadius*innerHeight/(earthDiameter*tan),2))-3;
    camera.position.set(0,0,distance);camera.lookAt(0,0,0);
    const earthHalf=(distance+3)*tan;
    globe.root.scale.setScalar(earthScale);globe.root.position.set((portrait?.12:.23)*earthHalf*camera.aspect,(short?-.22:portrait?-.12:-.18)*earthHalf,-3);
    const shipZ=5-p*1.5,shipHalf=(distance-shipZ)*tan;
    const shipWidth=Math.min(innerWidth*(portrait?.70:.40),innerHeight*(short?.55:.48));
    const shipScale=shipWidth*shipHalf*camera.aspect/(innerWidth*3.55);
    const entry=Math.min(1,p*3),eased=1-Math.pow(1-entry,2),shipX=.12+eased*.20+p*.03,shipY=short?.68:portrait?.78:.73;
    shuttle.root.scale.setScalar(shipScale);shuttle.root.position.set((shipX*2-1)*shipHalf*camera.aspect,(1-shipY*2)*shipHalf-shipScale*1.65,shipZ);
    shuttle.root.rotation.y=.08+Math.sin(p*Math.PI)*.06;shuttle.root.rotation.z=reduced?0:Math.sin(time*1.2)*.015;
    shuttle.update(dt,time,p);shuttle.root.updateMatrixWorld();hero.root.position.copy(shuttle.windowPosition).applyMatrix4(shuttle.root.matrixWorld);hero.root.scale.setScalar(shuttle.windowPose.scale*shipScale);hero.root.rotation.set(0,shuttle.root.rotation.y,shuttle.root.rotation.z);hero.update(dt,0,false,time);
    hero.bones.armR.rotation.set(-.12,-.2,-2.05);hero.bones.foreR.rotation.set(.12,0,-.45+(reduced?0:Math.sin(time*3.5)*.2));
    trail.visible=sparks.visible=false;
  }
  function updateAtlas(){
    const scroll=$('country-list').scrollTop;$('country-list').replaceChildren();countries.forEach(c=>{const b=document.createElement('button');b.className='country-choice'+(hasSelection&&c===selected?' selected':'');b.setAttribute('aria-pressed',String(hasSelection&&c===selected));
      const strong=document.createElement('strong');strong.textContent=c.id==='us'?'Amerika':c.name;b.setAttribute('aria-label',c.name+' ülkesini seç');b.dataset.country=c.id;b.append(picture(c),flag(c),strong,P.stars(stamps(c)));b.onclick=()=>selectCountry(c);$('country-list').append(b);
    });$('country-list').scrollTop=scroll;$('selected-city').textContent=hasSelection?selected.city:'Bir resme dokun.';$('selected-description').textContent=selected.intro;$('depart').disabled=!hasSelection;
    $('depart').replaceChildren(P.node('bolt'),P.node('arrow'));$('depart').setAttribute('aria-label',selected.name+' ülkesine koş');$('stamp-count').textContent=data.visited.length+' / '+FLASH_COUNTRIES.reduce((n,c)=>n+c.places.length,0);
  }
  function selectCountry(c){if(mode!=='atlas'||!sceneReady)return;endCountriesInvitation();selected=c;hasSelection=true;globe.focus(c);updateAtlas();departAt=time+.75;FLASH_AUDIO.init();FLASH_AUDIO.play('choose-'+c.id,{replacePending:true});}
  function makeGround(c){
    const stage=FLASH_SURFACES.create(c,renderer);world.add(stage.root);return stage;
  }
  function tourEnvironment(c){const e=c.environment||{};C.setSky(e.sky??c.sky);scene.fog.near=e.fogNear??44;scene.fog.far=e.fogFar??112;C.sun.color.setHex(e.sunColor??0xffecd5);C.sun.intensity=e.sunIntensity??2.7;}
  function distance(a,b){const rad=Math.PI/180,la=a.lat*rad,lb=b.lat*rad,d=(b.lon-a.lon)*rad;return Math.round(6371*Math.acos(Math.max(-1,Math.min(1,Math.sin(la)*Math.sin(lb)+Math.cos(la)*Math.cos(lb)*Math.cos(d)))));}
  function depart(){if(!sceneReady||mode!=='atlas'||!hasSelection)return;departAt=0;closeDiscovery();cancelChallenge();fromCountry=current;spaceArrival=!current;journeyDistance=current?distance(current,selected):0;
    if(current===selected){showMode('tour');return;}
    routeSamples=fromCountry?FLASH_GEO.route(fromCountry,selected):[];if(travelStage)travelStage.dispose();travelStage=null;if(!spaceArrival){travelStage=FLASH_TRAVEL.create(routeSamples,fromCountry,selected);scene.add(travelStage.root);}
    travelDuration=Math.min(16,Math.max(8,6+Math.sqrt(journeyDistance)/11));lastTerrain=null;lastTerrainVoice=-20;
    const destinationCard=c=>{const card=document.createElement('div');card.className='travel-country';const name=document.createElement('strong');name.className='travel-country-name';name.textContent=c?(c.id==='us'?'Amerika':c.name):'Uzay';card.append(c?picture(c):P.node('globe'),name);return card;};
    $('travel-pictures').replaceChildren(destinationCard(fromCountry),P.node('arrow'),destinationCard(selected));
    travelTime=0;$('travel-route').textContent=spaceArrival?'Uzaydan iniyoruz!':'Şimşek gibi koşalım!';
    // Finish GPU work behind a brief loading picture, before the running animation.
    // Keep the previous materials alive until the new ones have reused their shaders.
    sceneReady=false;$('boot').hidden=false;if(travelStage)travelStage.root.visible=false;setTimeout(()=>{
      const oldCity=city,oldGround=ground,oldWeather=weather,oldStages=activityStages,oldPortal=portal;city=FLASH_PLACES.create(selected);world.add(city.root);ground=makeGround(selected);weather=FLASH_WEATHER.create(selected,{touch:C.touch,reduced});world.add(weather.root);weather.update(0,time,tmp.set(0,0,25));
      const layouts=FLASH_ACTIVITY_ROUTES.layout(selected,city.colliders);activityStages=new Map();
      selected.places.forEach(place=>{const stages=FLASH_ACTIVITIES.choicesFor(selected,place).map(type=>{const stage=FLASH_ACTIVITIES.create({country:selected,place,type,targets:layouts[place.id]});world.add(stage.root);return stage;});activityStages.set(place.id,{stages,place});});
      const portalPoint=[{x:-.75,z:19},{x:-1,z:19},{x:0,z:20},{x:2,z:28}].find(p=>!collides(p.x,p.z,3.4));
      portal=FLASH_PORTAL.create({...portalPoint,map:globe.root.children[0].material.map});world.add(portal.root);
      // Prewarm with the actual tour lights/fog, not an unlit temporary group.
      const priorFog=scene.fog,priorShadow=C.sun.castShadow,priorSky=scene.background.getHex(),priorSun=C.sun.color.getHex(),priorIntensity=C.sun.intensity;tourEnvironment(selected);C.sun.castShadow=true;world.visible=true;
      const ready=renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve(renderer.compile(scene,camera));
      world.visible=false;restoreEnvironment();
      function restoreEnvironment(){scene.fog=priorFog;scene.background.setHex(priorSky);C.sun.castShadow=priorShadow;C.sun.color.setHex(priorSun);C.sun.intensity=priorIntensity;}
      function finishPreparation(){
        const warmCamera=new THREE.PerspectiveCamera(56,camera.aspect,.1,250);warmCamera.position.set(22,48,64);warmCamera.lookAt(0,2,0);
        const visible=[globe.root,hero.root,shuttle.root,spaceStars,trail,sparks,guide].map(o=>[o,o.visible]);visible.forEach(([o])=>o.visible=false);
        const oldTarget=renderer.getRenderTarget(),viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();tourEnvironment(selected);C.sun.castShadow=true;world.visible=true;C.shadowsAt(0,0);hero.root.visible=true;hero.root.position.set(0,0,25);hero.root.scale.setScalar(1);
        // Draw behind the opaque loading picture using the actual screen's colour/tone shaders.
        try{renderer.setRenderTarget(null);renderer.setViewport(0,0,32,32);renderer.setScissor(0,0,32,32);renderer.setScissorTest(true);renderer.render(scene,warmCamera);if(travelStage){world.visible=false;travelStage.root.visible=true;travelStage.positionAt(0,hero.root.position);warmCamera.position.set(10,10,41);warmCamera.lookAt(0,1,5);renderer.render(scene,warmCamera);travelStage.root.visible=false;}
          // Prime the exact arrival view at the full screen resolution as well.
          renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);world.visible=true;hero.root.position.set(0,0,25);hero.root.rotation.y=Math.PI;hero.root.scale.setScalar(1.42);trail.visible=sparks.visible=guide.visible=true;C.shadowsAt(0,25);warmCamera.fov=camera.fov;warmCamera.updateProjectionMatrix();warmCamera.position.set(8,13,40);warmCamera.lookAt(0,1,24);renderer.render(scene,warmCamera);
          // Space uses different fog/shadow shaders. Prime its first visible frame too.
          if(spaceArrival){world.visible=false;scene.fog=null;C.sun.color.setHex(0xffecd5);C.sun.intensity=2.7;C.sun.castShadow=false;globe.root.visible=spaceStars.visible=hero.root.visible=shuttle.root.visible=true;guide.visible=false;globe.focus(selected,true);poseSpaceShuttle(0,0);space.update(0,time,camera);resetTrail();renderer.render(scene,camera);}
        }finally{renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);world.visible=false;restoreEnvironment();visible.forEach(([o,v])=>o.visible=v);activityStages.forEach(a=>a.stages.forEach(stage=>stage.root.visible=false));portal.root.visible=false;}
        oldStages.forEach(a=>a.stages.forEach(stage=>stage.dispose()));oldPortal?.dispose();oldCity?.dispose();oldGround?.dispose();oldWeather?.dispose();sceneReady=true;$('boot').hidden=true;showMode('travel');FLASH_AUDIO.play(spaceArrival?'travel-space':'travel',{replacePending:true});
      }
      ready.then(finishPreparation,finishPreparation);
    },60);
  }
  function arrive(){const firstArrival=!hadTour;current=selected;data.current=current.id;if(!data.countries.includes(current.id))data.countries.push(current.id);save();hadTour=true;tourPose.position.set(0,0,25);tourPose.rotation=Math.PI;hero.root.position.copy(tourPose.position);hero.root.rotation.y=Math.PI;navPlace=null;showMode('tour');portalArmed=false;portalReadyAt=time+8;
    lastFocusPlace=lastActivityPlace=null;activityCooldown=0;if(travelStage){travelStage.dispose();travelStage=null;}cameraAim.set(0,1,24);camera.position.set(8,13,40);camera.lookAt(cameraAim);FLASH_AUDIO.play(current.id,{replacePending:true});if(firstArrival)FLASH_AUDIO.play('help-tour');const first=$('place-list').querySelector('.place-row:not(.done)')||$('place-list').firstElementChild;if(first)first.classList.add('inviting');announce(current.name+' gezisi başlıyor. Üç durağı keşfet!');}
  function updateTourUI(){if(!current)return;$('location-label').textContent=current.name+' · '+stamps(current)+'/3 keşif';$('city-label').textContent=current.city;$('country-title').replaceChildren(flag(current),document.createTextNode(' '+(current.id==='us'?'Amerika':current.name)));$('stamp-count').textContent=data.visited.length+' / '+FLASH_COUNTRIES.reduce((n,c)=>n+c.places.length,0);
    $('place-list').replaceChildren();current.places.forEach(p=>{const b=document.createElement('button');b.className='place-row'+(seen(current,p)?' done':'');b.setAttribute('aria-label',p.name+' yerine git');b.dataset.place=p.id;const text=document.createElement('span');text.textContent=p.name;b.append(picture(current,p),text,P.node(seen(current,p)?'check':'arrow'));b.onclick=()=>{closeDiscovery();cancelChallenge();navPlace=p;lastActivityPlace=null;guide.visible=true;guide.position.set(p.x,0,p.z);autoPath=frontPath(p);$('navigation-picture').src=picture(current,p).src;FLASH_AUDIO.play('help-tour',{replacePending:true});};$('place-list').append(b);});$('photo').disabled=false;
  }
  // Keep a short landmark context for narration and camera focus, without a popup.
  function rememberDiscovery(p){discoveryPlace=p;lastFocusPlace=p;discoveryUntil=time+7;$('discovery').hidden=true;}
  function discover(p){const id=current.id+':'+p.id,isNew=!seen(current,p);if(isNew){data.visited.push(id);save();updateTourUI();celebrate(1.3);}rememberDiscovery(p);startChallenge(p);FLASH_AUDIO.play('place-'+current.id+'-'+p.id);if(navPlace===p){navPlace=null;guide.visible=false;$('navigation').hidden=true;}if(isNew&&data.visited.length===countries.reduce((n,c)=>n+c.places.length,0)){celebrate(3);announce('Dünya turunu tamamladın!');}}
  function closeDiscovery(){discoveryPlace=null;$('discovery').hidden=true;discoveryUntil=0;}
  function collides(x,z,margin=.45){return city&&city.colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+margin);}
  function frontPath(p){for(const angle of [.46,.8,0,1.2,-.4,1.6,-.8]){const r=p.radius-1.5,goal={x:p.x+Math.sin(angle)*r,z:p.z+Math.cos(angle)*r};if(Math.abs(goal.x)>58||Math.abs(goal.z)>58||collides(goal.x,goal.z,1))continue;const route=planPath(goal,.7);if(route.length)return route;}return planPath(p,p.radius-.9);}
  function planPath(goal,radius){
    // A tiny grid routes around buildings, so a child only needs to tap a picture.
    const size=119,step=1,startPos=hero.root.position,point=id=>({x:-59+id%size,z:-59+Math.floor(id/size)});
    const door=portal?.root.position,avoidDoor=door&&Math.hypot(goal.x-door.x,goal.z-door.z)>=1.8,doorGap=p=>door?Math.hypot(p.x-door.x,p.z-door.z):Infinity;
    const cityBlocked=p=>Math.abs(p.x)>59||Math.abs(p.z)>59||collides(p.x,p.z,.8);
    // Normal picture/target routes skirt the door; an intentional door tap enters it.
    const blocked=p=>cityBlocked(p)||avoidDoor&&doorGap(p)<2.5;
    const free=(a,b)=>{const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.4);let leavingDoor=avoidDoor&&doorGap(a)<2.5,lastGap=doorGap(a);for(let i=0;i<=n;i++){const t=n?i/n:0,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(cityBlocked(p))return false;if(avoidDoor){const gap=doorGap(p);if(leavingDoor){if(gap<lastGap-.001)return false;lastGap=gap;if(gap>=2.5)leavingDoor=false;}else if(gap<2.5)return false;}}return true;};
    const startRange=avoidDoor&&doorGap(startPos)<2.5?3.5:2;
    let start=-1,best=Infinity;for(let i=0;i<size*size;i++){const a=point(i),d=Math.hypot(a.x-startPos.x,a.z-startPos.z);if(d<startRange&&d<best&&!blocked(a)&&free(startPos,a)){start=i;best=d;}}
    if(start<0)return [];
    const parent=new Int32Array(size*size).fill(-1),visited=new Uint8Array(size*size),queue=[start];visited[start]=1;let end=-1;
    for(let k=0;k<queue.length;k++){const id=queue[k],a=point(id);if(Math.hypot(a.x-goal.x,a.z-goal.z)<radius){end=id;break;}const ix=id%size,iz=Math.floor(id/size);for(const dx of [-1,0,1])for(const dz of [-1,0,1]){if((!dx&&!dz)||ix+dx<0||ix+dx>=size||iz+dz<0||iz+dz>=size)continue;const ni=(iz+dz)*size+ix+dx,b=point(ni);if(visited[ni]||blocked(b)||!free(a,b))continue;visited[ni]=1;parent[ni]=id;queue.push(ni);}}
    if(end<0)return [];const points=[];for(let i=end;i>=0;i=parent[i])points.push(point(i));points.reverse();const result=[];let anchor=startPos;
    for(let i=0;i<points.length;){let j=i;while(j+1<points.length&&free(anchor,points[j+1]))j++;result.push(points[j]);anchor=points[j];i=j+1;}return result;
  }
  function celebrate(seconds){$('celebration').replaceChildren(P.node('star'),P.node('star'),P.node('star'));$('celebration').hidden=false;celebrateUntil=time+seconds;}
  function challengePictures(state){const meta=FLASH_ACTIVITIES.types[state.type];$('challenge-icon').replaceChildren(P.node(meta.icon));$('challenge-count').replaceChildren();for(let i=0;i<state.total;i++){const icon=P.node(meta.icon);icon.classList.toggle('earned',i<state.collected);$('challenge-count').append(icon);}$('challenge').setAttribute('aria-label',meta.title+' · '+state.collected+' / '+state.total);}
  function move(dx,dz){const pos=hero.root.position,nx=Math.max(-60,Math.min(60,pos.x+dx)),nz=Math.max(-60,Math.min(60,pos.z+dz));
    if(!collides(nx,nz)){pos.x=nx;pos.z=nz;return;}if(!collides(nx,pos.z))pos.x=nx;if(!collides(pos.x,nz))pos.z=nz;
  }
  function cancelChallenge(){if(challenge)challenge.root.visible=false;challenge=null;activityEndAt=0;cueTarget=null;$('target-cue').hidden=true;$('challenge').hidden=true;document.body.classList.remove('has-activity');}
  function startChallenge(place){if(!place||challenge?.place===place)return;cancelChallenge();const prepared=activityStages.get(place.id);if(!prepared)return;const key=current.id+':'+place.id,round=activityRounds.get(key)||0;const stage=prepared.stages[round%prepared.stages.length];activityRounds.set(key,round+1);stage.reset();challenge={stage,place,root:stage.root};stage.root.visible=true;lastActivityPlace=place;activityEndAt=0;challengePictures(stage.getState());$('challenge').hidden=false;document.body.classList.add('has-activity');FLASH_AUDIO.play(FLASH_ACTIVITIES.types[stage.getState().type].voiceKey,{replacePending:true});}
  function updateChallenge(dt){if(!challenge)return;const event=challenge.stage.update(dt,time,hero.root.position,velocity.length());if(event.collected.length){FLASH_AUDIO.chime(challenge.stage.getState().collected-1,event.complete);challengePictures(challenge.stage.getState());guideUIAt=-1;if(challenge.stage.getState().type==='splashes')hopUntil=time+.48;}
    if(event.complete){const id=current.id+':'+challenge.place.id;if(!data.activities.includes(id))data.activities.push(id);save();celebrate(1.8);activityEndAt=time+4;activityCooldown=time+8;FLASH_AUDIO.play(FLASH_ACTIVITIES.types[challenge.stage.getState().type].doneKey||'activity-done-'+((activityRounds.get(id)||0)%3+1),{replacePending:true});}
    if(activityEndAt&&time>=activityEndAt)cancelChallenge();}
  function targetGuide(){
    if(mode!=='tour'||navPlace||modal||portalTravelAt){$('target-cue').hidden=true;cueTarget=null;return;}
    const state=challenge?.stage.getState();
    if(!state||state.complete){guide.visible=false;$('target-cue').hidden=true;cueTarget=null;return;}
    let target=null,index=-1,gap=Infinity;
    state.targets.forEach((p,i)=>{if(p.collected)return;const d=Math.hypot(p.x-hero.root.position.x,p.z-hero.root.position.z);if(d<gap){gap=d;target=p;index=i;}});
    if(!target){guide.visible=false;$('target-cue').hidden=true;cueTarget=null;return;}
    const cueType=state.type,meta=FLASH_ACTIVITIES.types[state.type];
    cueTarget={...target,index};guide.position.set(target.x,0,target.z);guideArrow.position.y=3.4+(reduced?0:Math.sin(time*3)*.25);guide.visible=true;
    tmp.set(target.x,1.3,target.z).project(camera);let x=(tmp.x*.5+.5)*innerWidth,y=(-tmp.y*.5+.5)*innerHeight;
    const hit=document.elementFromPoint(x,y);
    const onCanvas=tmp.z>0&&tmp.z<1&&x>45&&x<innerWidth-45&&y>90&&y<innerHeight-115&&(hit===C.canvas||$('target-cue').contains(hit));
    $('target-cue').hidden=onCanvas;if(onCanvas)return;
    if(tmp.z>1||tmp.z<0){const dx=target.x-hero.root.position.x,dz=target.z-hero.root.position.z;x=innerWidth/2+(dx*.9-dz*.44)*16;y=innerHeight/2+(dx*.44+dz*.9)*12;}
    const cue=$('target-cue'),radius=cue.offsetWidth/2,card=document.querySelector('.tour-card').getBoundingClientRect(),hud=$('hud').getBoundingClientRect();
    const rawX=x,rawY=y,left=card.right+radius+10,top=hud.bottom+radius+10;
    x=Math.max(left,Math.min(innerWidth-radius-14,x));y=Math.max(top,Math.min(innerHeight-145,y));
    // Project the child's face again after an orientation change. Keep the
    // large edge hint away from it, even on a short landscape screen.
    tmp.set(hero.root.position.x,hero.root.position.y+2.1,hero.root.position.z).project(camera);
    const faceX=(tmp.x*.5+.5)*innerWidth,faceY=(-tmp.y*.5+.5)*innerHeight,clearance=radius+48;
    if(tmp.z>0&&tmp.z<1&&Math.hypot(x-faceX,y-faceY)<clearance){
      let best=Infinity,bestX=x,bestY=y;
      for(let i=0;i<8;i++){const angle=i*Math.PI/4,cx=Math.max(left,Math.min(innerWidth-radius-14,faceX+Math.cos(angle)*(clearance+4))),cy=Math.max(top,Math.min(innerHeight-145,faceY+Math.sin(angle)*(clearance+4)));
        if(Math.hypot(cx-faceX,cy-faceY)<clearance)continue;
        const distance=Math.hypot(cx-x,cy-y);if(distance<best){best=distance;bestX=cx;bestY=cy;}}
      x=bestX;y=bestY;
    }
    cue.style.left=x+'px';cue.style.top=y+'px';cue.dataset.targetIndex=index;cue.dataset.x=target.x;cue.dataset.z=target.z;cue.setAttribute('aria-label',meta.title+' için sıradaki hedefe koş');
    if(cue.dataset.type!==cueType){cue.dataset.type=cueType;$('target-cue-icon').innerHTML=P.svg(meta.icon);}$('target-cue-arrow').style.transform='rotate('+(Math.atan2(rawY-y,rawX-x))+'rad)';
  }
  function passport(){resetInput();modal='passport';$('passport').hidden=false;$('passport-summary').textContent=data.countries.length+' ülkeye gittin, '+data.visited.length+' yer keşfettin. '+data.activities.length+' şimşek rotasını tamamladın.';$('passport-grid').replaceChildren();
    countries.forEach(c=>{const div=document.createElement('button');div.className='passport-stamp'+(stamps(c)===3?' complete':'');div.setAttribute('aria-label',c.name);const b=document.createElement('b');b.textContent=c.id==='us'?'Amerika':c.name;div.append(picture(c),flag(c),b,P.stars(stamps(c)));div.onclick=()=>FLASH_AUDIO.play('choose-'+c.id,{replacePending:true});$('passport-grid').append(div);});FLASH_AUDIO.play('help-passport',{replacePending:true});}
  function closeModal(){if(modal)$(modal).hidden=true;modal=null;resetInput();}
  function soundUI(){const silent=C.query.has('sessiz'),enabled=data.sound&&!silent;$('audio-toggle').textContent=silent?'Sessiz açılış':enabled?'Açık':'Kapalı';$('audio-toggle').setAttribute('aria-pressed',String(enabled));$('audio-toggle').disabled=silent;$('music-toggle').textContent=silent?'Sessiz açılış':data.music?'Açık':'Kapalı';$('music-toggle').setAttribute('aria-pressed',String(data.music&&!silent));$('music-toggle').disabled=silent;}
  function photo(){if(!current)return;renderer.render(scene,camera);const cv=document.createElement('canvas');cv.width=1200;cv.height=800;const g=cv.getContext('2d');g.fillStyle='#fff9eb';g.fillRect(0,0,1200,800);g.drawImage(C.canvas,30,30,1140,642);g.fillStyle='#bf3039';g.font='bold 35px system-ui';g.fillText('FEZA GEZİYOR · '+current.name,40,730);g.fillStyle='#193b49';g.font='18px system-ui';g.fillText(current.city+' · Dünya turumdan bir anı',40,765);const a=document.createElement('a');a.download='feza-'+current.id+'-kartpostal.png';a.href=cv.toDataURL('image/png');a.click();announce('Kartpostalın hazır!');}
  $('start').onclick=()=>{FLASH_AUDIO.init();FLASH_AUDIO.play('intro');showMode('atlas');updateAtlas();};$('depart').onclick=depart;
  $('map-open').onclick=()=>{if(mode==='tour'){closeDiscovery();showMode('atlas');updateAtlas();FLASH_AUDIO.play('help-map',{replacePending:true});}};$('atlas-back').onclick=()=>showMode('tour');
  $('passport-open').onclick=passport;$('passport-close').onclick=closeModal;$('passport-done').onclick=closeModal;
  $('settings-open').onclick=()=>{resetInput();modal='settings';$('settings').hidden=false;};$('settings-close').onclick=closeModal;
  $('audio-toggle').onclick=()=>{data.sound=!data.sound;FLASH_AUDIO.setEnabled(data.sound);if(data.sound)FLASH_AUDIO.init();soundUI();save();};
  $('music-toggle').onclick=()=>{data.music=!data.music;FLASH_AUDIO.setMusicEnabled(data.music);if(data.music)FLASH_AUDIO.init();soundUI();save();};
  $('target-cue').onclick=()=>{if(!cueTarget||!challenge)return;autoPath=planPath(cueTarget,.7);hasDestination=false;FLASH_AUDIO.init();};
  $('quality').onchange=()=>{data.quality=$('quality').value;C.setQuality(data.quality);save();};$('photo').onclick=photo;
  $('discovery-close').onclick=closeDiscovery;
  $('discovery-speak').onclick=()=>{if(discoveryPlace)FLASH_AUDIO.play('place-'+current.id+'-'+discoveryPlace.id,{replacePending:true});};
  $('help').onclick=()=>{FLASH_AUDIO.init();FLASH_AUDIO.play(modal==='passport'?'help-passport':challenge?FLASH_ACTIVITIES.types[challenge.stage.getState().type].voiceKey:discoveryPlace?'place-'+current.id+'-'+discoveryPlace.id:mode==='atlas'?'help-map':mode==='travel'?'help-route':'help-tour',{replacePending:true});};
  function zoom(delta){mapDistance=Math.max(innerWidth<621?12:10.5,Math.min(29,mapDistance+delta));}
  $('zoom-in').onclick=()=>zoom(-2);$('zoom-out').onclick=()=>zoom(2);
  C.canvas.addEventListener('wheel',e=>{if(mode==='atlas'&&!modal){e.preventDefault();zoom(e.deltaY*.01);}},{passive:false});
  function endBoost(e){if(e&&boostPointer!==e.pointerId)return;boostPointer=null;boost=false;$('boost').classList.remove('active');}
  $('boost').addEventListener('pointerdown',e=>{if(mode!=='tour'||modal)return;e.preventDefault();boostPointer=e.pointerId;$('boost').setPointerCapture(e.pointerId);boost=true;$('boost').classList.add('active');});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('boost').addEventListener(type,endBoost));
  C.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  C.canvas.addEventListener('pointerdown',e=>{if(modal||mode==='welcome'||mode==='travel')return;FLASH_AUDIO.init();if(mode==='atlas'){e.preventDefault();C.canvas.setPointerCapture(e.pointerId);mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,moved:false});if(mapPointers.size===2){const a=[...mapPointers.values()];pinchDistance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);a.forEach(p=>p.moved=true);}return;}if(pointer)return;e.preventDefault();autoPath=[];C.canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,dx:0,dy:0,moved:false};
    if(e.pointerType==='touch'){hasDestination=false;$('joystick').hidden=false;$('joystick').style.left=(e.clientX-50)+'px';$('joystick').style.top=(e.clientY-50)+'px';}else if(C.point(e.clientX,e.clientY,destination)){hasDestination=true;}
  });
  C.canvas.addEventListener('pointermove',e=>{if(mode==='atlas'){const p=mapPointers.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;p.moved=p.moved||Math.hypot(p.x-p.ox,p.y-p.oy)>6;if(mapPointers.size>1){const a=[...mapPointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinchDistance>0)zoom(-Math.log(Math.max(1,d)/pinchDistance)*12);pinchDistance=d;}else globe.drag(dx,dy);return;}if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;pointer.moved=pointer.moved||Math.hypot(e.clientX-pointer.originX,e.clientY-pointer.originY)>6;
    if(pointer.type==='touch'){const dx=e.clientX-pointer.originX,dy=e.clientY-pointer.originY,len=Math.hypot(dx,dy),k=len>44?44/len:1;pointer.dx=dx*k/44;pointer.dy=dy*k/44;$('joystick').firstElementChild.style.transform='translate('+dx*k+'px,'+dy*k+'px)';}else if(C.point(e.clientX,e.clientY,destination))hasDestination=true;
  });
  function touchTarget(x,y){
    if(portal){const pos=portal.root.position;for(const height of [1.8,3.9]){tmp.set(pos.x,height,pos.z).project(camera);if(tmp.z<0||tmp.z>1)continue;if(Math.hypot((tmp.x*.5+.5)*innerWidth-x,(-tmp.y*.5+.5)*innerHeight-y)<65){portalArmed=true;portalReadyAt=time;autoPath=planPath(pos,.7);return;}}}
    if(challenge){let nearest=null,distance=58;for(const target of challenge.stage.getState().targets){if(target.collected)continue;tmp.set(target.x,1.15,target.z).project(camera);if(tmp.z<0||tmp.z>1)continue;const d=Math.hypot((tmp.x*.5+.5)*innerWidth-x,(-tmp.y*.5+.5)*innerHeight-y);if(d<distance){distance=d;nearest=target;}}if(nearest){autoPath=planPath(nearest,1);return;}}
    if(!C.point(x,y,destination))return;
    const hits=C.ray.intersectObject(city.root,true);if(hits.length){const hit=hits[0].point,place=current.places.find(p=>Math.hypot(hit.x-p.x,hit.z-p.z)<p.radius);if(place){navPlace=place;lastActivityPlace=null;autoPath=frontPath(place);$('navigation-picture').src=picture(current,place).src;return;}}
    autoPath=planPath(destination,1);if(!autoPath.length&&!collides(destination.x,destination.z,.8))hasDestination=true;
  }
  function releasePointer(e){if(mode==='atlas'){const p=mapPointers.get(e.pointerId);if(p&&!p.moved&&e.type==='pointerup'){C.point(e.clientX,e.clientY,tmp);const c=globe.pick(C.ray);if(c)selectCountry(c);}mapPointers.delete(e.pointerId);if(mapPointers.size<2)pinchDistance=0;return;}if(!pointer||e.pointerId!==pointer.id)return;if(pointer.type==='touch'){hasDestination=false;$('joystick').hidden=true;if(!pointer.moved&&e.type==='pointerup'&&mode==='tour')touchTarget(e.clientX,e.clientY);}$('joystick').firstElementChild.style.transform='';pointer=null;}
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>C.canvas.addEventListener(t,releasePointer));
  addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Escape'){if(modal)closeModal();else if(mode==='tour'){$('map-open').click();}else if(mode==='atlas'&&hadTour)showMode('tour');return;}if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(mode==='tour'&&!modal&&(MOVE_KEYS.includes(e.code)||e.code==='Space')){keys.add(e.code);if(MOVE_KEYS.includes(e.code)){hasDestination=false;autoPath=[];}}});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',resetInput);document.addEventListener('visibilitychange',resetInput);
  addEventListener('resize',()=>{resetInput();if(mode==='welcome'||mode==='atlas'){const pendingDeparture=departAt;showMode(mode);if(mode==='atlas'&&pendingDeparture)departAt=Math.max(time+.05,pendingDeparture);}});
  function updateEffects(dt,moving,isBoost){trail.visible=moving>.1; sparks.visible=isBoost&&!reduced&&moving>.1;
    for(let i=59;i>0;i--){trailPositions[i*3]=trailPositions[(i-1)*3];trailPositions[i*3+1]=trailPositions[(i-1)*3+1];trailPositions[i*3+2]=trailPositions[(i-1)*3+2];}
    const p=hero.root.position;trailPositions[0]=p.x;trailPositions[1]=p.y+.35;trailPositions[2]=p.z;trailGeo.attributes.position.needsUpdate=true;trail.material.opacity=isBoost?.9:.25;
    for(let i=0;i<48;i++){const a=(i*.73+time*8)%6.28,k=(i/48)*1.6; sparksPositions[i*3]=p.x-velocity.x*k*.04+Math.sin(a)*.35;sparksPositions[i*3+1]=p.y+.2+(i%8)*.2;sparksPositions[i*3+2]=p.z-velocity.z*k*.04+Math.cos(a)*.35;}sparksGeo.attributes.position.needsUpdate=true;
  }
  function resetTrail(){for(let i=0;i<60;i++){trailPositions[i*3]=hero.root.position.x;trailPositions[i*3+1]=hero.root.position.y+.35;trailPositions[i*3+2]=hero.root.position.z;}trailGeo.attributes.position.needsUpdate=true;}
  function stepTour(dt){if(!current)return;const locked=modal||C.lost||portalTravelAt;let x=0,z=0;
    if(!locked){if(pointer&&pointer.type==='touch'){x=pointer.dx*.9+pointer.dy*.44;z=pointer.dy*.9-pointer.dx*.44;}else if(MOVE_KEYS.some(k=>keys.has(k))){x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);const a=x;x=x*.9+z*.44;z=z*.9-a*.44;}else if(autoPath.length){const next=autoPath[0];x=next.x-hero.root.position.x;z=next.z-hero.root.position.z;if(Math.hypot(x,z)<.55){autoPath.shift();x=z=0;}}else if(hasDestination){x=destination.x-hero.root.position.x;z=destination.z-hero.root.position.z;if(Math.hypot(x,z)<.4){hasDestination=false;x=z=0;}}}
    const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}const touchSprint=pointer?.type==='touch'&&len>.35,isBoost=boost||keys.has('Space')||touchSprint,speed=boost||keys.has('Space')?28:autoPath.length?16:touchSprint?22:14,k=1-Math.exp(-dt*18);
    velocity.x+=(x*speed-velocity.x)*k;velocity.z+=(z*speed-velocity.z)*k;if(locked)velocity.set(0,0,0);
    const moving=velocity.length();const steps=Math.max(1,Math.ceil(moving*dt/.22));for(let i=0;i<steps;i++)move(velocity.x*dt/steps,velocity.z*dt/steps);
    if(moving>.3){const target=Math.atan2(velocity.x,velocity.z),angle=hero.root.rotation.y,diff=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));hero.root.rotation.y+=diff*(1-Math.exp(-dt*20));}
    hero.root.position.y=hopUntil>time?Math.sin((.48-hopUntil+time)/.48*Math.PI)*.7:0;hero.update(dt,Math.min(1,moving/8),isBoost,time);city.update?.(dt,time);weather?.update(dt,time,hero.root.position);updateEffects(dt,moving,isBoost);updateChallenge(dt);
    const focus=moving<.5&&(discoveryPlace||(innerWidth<621&&lastFocusPlace&&Math.hypot(hero.root.position.x-lastFocusPlace.x,hero.root.position.z-lastFocusPlace.z)<lastFocusPlace.radius+7?lastFocusPlace:null));
    if(focus){tmp.set(hero.root.position.x*.45+focus.x*.55,2.5,hero.root.position.z*.45+focus.z*.55);}else tmp.set(hero.root.position.x+velocity.x*.11,1,hero.root.position.z+velocity.z*.11);
    cameraAim.lerp(tmp,1-Math.exp(-dt*7));cameraPos.set(cameraAim.x+(focus?13:8),focus?21:13,cameraAim.z+(focus?24:16));camera.position.lerp(cameraPos,1-Math.exp(-dt*8));camera.lookAt(cameraAim);C.shadowsAt(hero.root.position.x,hero.root.position.z);
    if(navPlace){guide.position.set(navPlace.x,0,navPlace.z);guideArrow.position.y=3.4+(reduced?0:Math.sin(time*3)*.3);$('navigation').hidden=false;
      const dx=navPlace.x-hero.root.position.x,dz=navPlace.z-hero.root.position.z;$('navigation-arrow').style.transform='rotate('+(Math.atan2(dx*.44+dz*.9,dx*.9-dz*.44))+'rad)';$('navigation-name').textContent=navPlace.name;$('navigation-distance').textContent=Math.round(Math.hypot(dx,dz))+' m';}
    if(lastActivityPlace&&!challenge&&Math.hypot(hero.root.position.x-lastActivityPlace.x,hero.root.position.z-lastActivityPlace.z)>lastActivityPlace.radius+8)lastActivityPlace=null;
    if(!locked&&!autoPath.length){for(const p of current.places){const near=Math.hypot(hero.root.position.x-p.x,hero.root.position.z-p.z)<p.radius;
      if(near&&(navPlace===p||!seen(current,p)||!challenge&&p!==lastActivityPlace&&time>activityCooldown)){discover(p);break;}}}
    if(time-guideUIAt>.1){guideUIAt=time;targetGuide();}
    if(discoveryPlace&&time>=discoveryUntil)closeDiscovery();
    if(portal){portal.update(dt,time);const gap=Math.hypot(hero.root.position.x-portal.root.position.x,hero.root.position.z-portal.root.position.z);
      if(!portalArmed&&time>=portalReadyAt&&gap>3&&current.places.some(p=>seen(current,p)))portalArmed=true;
      if(portalArmed&&time>=portalReadyAt&&!locked&&gap<1.8){portalArmed=false;portalTravelAt=time+.55;resetInput();$('portal-transition').hidden=false;}
      if(portalTravelAt&&time>=portalTravelAt){closeDiscovery();cancelChallenge();navPlace=null;hasSelection=false;showMode('atlas');updateAtlas();FLASH_AUDIO.play('portal-travel',{replacePending:true});return;}}
    if(time-lastUI>.1){lastUI=time;$('speed-number').textContent=Math.round(moving*(isBoost?125:3.6));$('speed-fill').style.width=(moving/28*100)+'%';}
  }
  function stepTravel(dt){if(modal)return;travelTime+=dt;const p=Math.min(1,travelTime/travelDuration);if(spaceArrival){globe.update(dt,time);poseSpaceShuttle(dt,p);if(lastTerrain!=='globe'){$('travel-terrain').innerHTML=P.svg('globe');lastTerrain='globe';}$('travel-progress').style.width=p*100+'%';$('travel-runner').style.left=p*100+'%';if(time-lastTravelUI>.12){lastTravelUI=time;$('travel-distance').textContent='';$('travel-caption').textContent='Pencereden dünyaya bak!';}if(p>=1&&sceneReady){arrive();resetTrail();}return;}if(!travelStage)return;hero.update(dt,1,true,time);travelStage.positionAt(p,hero.root.position);travelStage.positionAt(Math.min(1,p+.005),tmp);velocity.copy(tmp).sub(hero.root.position).multiplyScalar(20);hero.root.rotation.y=Math.atan2(velocity.x,velocity.z);travelStage.update(dt,time,p);
    camera.position.set(hero.root.position.x+10,10,hero.root.position.z+21);camera.lookAt(hero.root.position.x,1,hero.root.position.z-15);C.shadowsAt(hero.root.position.x,hero.root.position.z);updateEffects(dt,28,true);
    const s=travelStage.sample(p),terrain=s.land?'trees':'wave';if(lastTerrain!==terrain){$('travel-terrain').innerHTML=P.svg(terrain);lastTerrain=terrain;if(time-lastTerrainVoice>2.5){FLASH_AUDIO.play(s.land?'travel-land':'travel-water',{replacePending:true});lastTerrainVoice=time;}}
    $('travel-progress').style.width=p*100+'%';$('travel-runner').style.left=p*100+'%';if(time-lastTravelUI>.12){lastTravelUI=time;$('travel-distance').textContent=journeyDistance<1?'':kmFormat.format(Math.round(journeyDistance*p))+' km';$('travel-caption').textContent=s.land?(s.countryName||'Kara')+' · Ağaçlar, tepeler, köyler':'Deniz · Dalgaların üstünde koşuyoruz!';}
    if(p>=1&&sceneReady){arrive();resetTrail();}
  }
  function frame(now){requestAnimationFrame(frame);if(document.hidden||C.lost){lastFrame=now;nextDraw=now;return;}
    // Keep the 60-frame phase without dropping a 60 Hz frame that arrives a
    // little early. Two milliseconds still reject extra 120/180/240 Hz frames.
    if(now+2<nextDraw)return;const interval=1000/60;nextDraw=Math.max(nextDraw+interval,now-interval);const dt=Math.min(.04,(now-lastFrame)/1000||1/60);lastFrame=now;time+=dt;
    if(mode==='welcome'||mode==='atlas'){globe.update(dt,time);if(mode==='welcome'){hero.update(dt,0,false,time);hero.bones.armR.rotation.set(-.12,-.2,-2.2);hero.bones.foreR.rotation.set(.12,0,-.45+Math.sin(time*3.5)*.25);hero.bones.head.rotation.z=Math.sin(time*1.5)*.04;}if(mode==='atlas'){const base=innerWidth<621?22:19;cameraPos.set(globe.root.position.x*(1-mapDistance/base),2,mapDistance);camera.position.lerp(cameraPos,1-Math.exp(-dt*12));camera.lookAt(0,0,0);if(departAt&&time>=departAt)depart();}}else if(mode==='tour')stepTour(dt);else if(mode==='travel')stepTravel(dt);
    if(atlasInviteUntil&&time>=atlasInviteUntil)endCountriesInvitation();
    if(!$('celebration').hidden&&time>celebrateUntil)$('celebration').hidden=true;
    if(!$('toast').hidden&&time>toastUntil)$('toast').hidden=true;if(spaceStars.visible)space.update(dt,time,camera);renderer.render(scene,camera);
  }
  save();soundUI();updateAtlas();showMode('welcome');resetTrail();space.update(0,time,camera);renderer.compile(scene,camera);renderer.render(scene,camera);$('boot').hidden=true;requestAnimationFrame(frame);
})();
