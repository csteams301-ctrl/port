/* FARISWORLD — walkable 3D portfolio */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const locations = {
    home: { title: 'Welcome to FarisWorld', kicker: 'HOME / SPAWN POINT', zone: 'HOME DISTRICT', pos: [0, 0, 7], body: `<p>Hey, I'm <b>Faris Moideen C</b> — a computer science student, web developer, and creative builder from Kerala, India.</p><p>This portfolio is a little world you can explore. Walk around, find each landmark, and press <b>E</b> to open its story.</p>`, actions: [{label:'Meet the player', target:'about'}] },
    about: { title: 'A little about me', kicker: 'PLAYER PROFILE / ABOUT', zone: 'ABOUT GARDEN', pos: [-10, 0, 0], body: `<p>I'm a B.Sc. Computer Science student who enjoys turning ideas into useful digital experiences.</p><ul><li>Based in Kerala, India</li><li>Interested in web development, AI, and interactive experiences</li><li>Always learning, building, and experimenting</li></ul><p>My goal is to build things that are useful, clear, and fun to use.</p>`, actions: [{label:'See my projects', target:'projects'}] },
    projects: { title: "Worlds I've built", kicker: 'BUILD ZONE / PROJECTS', zone: 'BUILD DISTRICT', pos: [10, 0, -3], body: `<div class="project-mini"><b>KOBE International</b><p>Premium industrial tools catalogue with product browsing and WhatsApp enquiries.</p><span>HTML · CSS · JavaScript · Firebase</span></div><div class="project-mini"><b>NaatuKrishi AI</b><p>Agriculture assistant concept for soil identification and farm planning.</p><span>AI · JavaScript · API</span></div><div class="project-mini"><b>World Cup Prediction Hub</b><p>A football score prediction platform for college students.</p><span>HTML · CSS · JavaScript</span></div><div class="project-mini"><b>Mananthavady Random Chat</b><p>A responsive real-time chat experiment with video and messaging.</p><span>WebRTC · Socket.IO</span></div>`, actions: [{label:'Open Random Chat', url:'https://ranchatmnvdy.pages.dev/'}, {label:'Back to home', target:'home', secondary:true}] },
    skills: { title: 'My builder inventory', kicker: 'INVENTORY / SKILLS', zone: 'CRAFTING WORKSHOP', pos: [-1, 0, -12], body: `<p>Tools and abilities I use to turn ideas into working projects.</p><ul><li><b>Frontend:</b> HTML, CSS, JavaScript, responsive UI</li><li><b>Backend & data:</b> Firebase, Firestore, API basics</li><li><b>Development:</b> Git, debugging, iteration</li><li><b>Exploration:</b> Three.js, WebRTC, AI integrations</li></ul><p>Skills improve with every build — this inventory is always growing.</p>`, actions: [{label:'Explore projects', target:'projects'}] },
    contact: { title: 'Open a portal', kicker: 'CONTACT / QUEST AVAILABLE', zone: 'PORTAL PLAZA', pos: [1, 0, 13], body: `<p>Have a project, an idea, or a collaboration in mind? I'd be happy to hear about it.</p><p>Replace the placeholder email with your real address in <code>script.js</code> before publishing.</p><p><b>Email:</b> yourmail@example.com</p>`, actions: [{label:'Send an email', url:'mailto:yourmail@example.com'}, {label:'Return to home', target:'home', secondary:true}] }
  };

  let scene, camera, renderer, clock, player, playerGroup, worldRoot;
  let yaw = 0, pitch = -0.22, dragging = false, lastX = 0, lastY = 0;
  let panelOpen = false, activeLocation = 'home', nearLocation = null;
  const keys = new Set();
  const mobileHeld = new Set();
  const landmarks = {};
  const colliders = [];

  function mat(color, extra={}) { return new THREE.MeshStandardMaterial({color, roughness:1, ...extra}); }
  const M = {
    grass: mat(0x6ca64a), grassLight: mat(0x87bc57), dirt: mat(0x805433), stone: mat(0x89918a), wood: mat(0x80542f), woodLight: mat(0xa77545), leaf: mat(0x34773b), leafLight: mat(0x4e9444), roof: mat(0x713e2d), cream: mat(0xe9e4cc), glass: mat(0x81cde1,{metalness:.1,roughness:.3}), gold: mat(0xe2b94d), dark: mat(0x26372a), water: mat(0x3c9ed1,{transparent:true,opacity:.82}), portal: mat(0x9b6bce,{emissive:0x48236a,emissiveIntensity:.65}), red: mat(0xc75c43)
  };
  function box(parent, x,y,z, sx,sy,sz, material, cast=true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), material);
    mesh.position.set(x,y,z); mesh.castShadow=cast; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function labelSprite(text, color='#f4f6ed') {
    const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=128;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='rgba(20,36,26,.88)'; ctx.fillRect(0,0,512,128); ctx.strokeStyle='#c9f28a'; ctx.lineWidth=5; ctx.strokeRect(4,4,504,120);
    ctx.fillStyle=color; ctx.font='bold 30px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text.toUpperCase(),256,64);
    const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false})); sprite.scale.set(5.4,1.35,1); return sprite;
  }
  function tree(x,z,size=1) {
    box(worldRoot,x,.7*size,z,.7*size,1.4*size,.7*size,M.wood);
    box(worldRoot,x,1.7*size,z,.9*size,.9*size,.9*size,M.leaf);
    box(worldRoot,x-.45*size,1.45*size,z,.8*size,.8*size,.8*size,M.leafLight);
    box(worldRoot,x+.4*size,2*size,z,.8*size,.8*size,.8*size,M.leaf);
    box(worldRoot,x,2.35*size,z,.7*size,.7*size,.7*size,M.leafLight);
  }
  function pathBetween(x1,z1,x2,z2,width=2) {
    const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz), angle=Math.atan2(dx,dz);
    const p=box(worldRoot,(x1+x2)/2,.035,(z1+z2)/2,width,.07,len, M.dirt,false); p.rotation.y=angle;
    for(let i=0;i<len;i+=1.8){const t=i/len;box(worldRoot,x1+dx*t,.08,z1+dz*t,width*.7,.03,.45,M.woodLight,false);}
  }
  function makeSign(id,title,x,z,color=0x385e35) {
    const g=new THREE.Group(); g.position.set(x,0,z); worldRoot.add(g);
    box(g,0,1.2,0,.22,2.4,.22,M.wood);
    box(g,0,2.2,0,3.5,1.05,.22,mat(color));
    const sprite=labelSprite(title); sprite.position.set(0,2.22,.14); g.add(sprite);
    landmarks[id]={id,position:new THREE.Vector3(x,0,z),object:g,title};
  }
  function makeHouse() {
    const g=new THREE.Group(); g.position.set(0,0,1); worldRoot.add(g);
    // cottage base and walls
    box(g,0,.45,0,5.2,.9,4.4,M.woodLight);
    box(g,0,1.65,0,5,1.6,4.2,M.cream);
    box(g,0,2.7,0,5.7,.55,4.8,M.roof);
    for(let x=-2.2;x<=2.2;x+=.55) box(g,x,2.95,0,.35,.22,5,M.roof);
    box(g,0,1.05,-2.12,1,.95,.12,M.wood);
    box(g,-1.5,1.7,-2.15,.85,.7,.12,M.glass); box(g,1.5,1.7,-2.15,.85,.7,.12,M.glass);
    box(g,0,.15,2.5,1.5,.3,1.3,M.stone);
    const sign=labelSprite('HOME / SPAWN'); sign.position.set(0,4,0); sign.scale.set(4.8,1.2,1); g.add(sign);
    landmarks.home={id:'home',position:new THREE.Vector3(0,0,7),object:g,title:'Home'};
  }
  function makeAboutGarden(){
    const g=new THREE.Group();g.position.set(-10,0,0);worldRoot.add(g);
    box(g,0,.15,0,5,.3,5,M.grassLight,false);
    box(g,0,1.25,0,1.1,2.5,1.1,M.stone); box(g,0,2.7,0,2.5,.5,2.5,M.gold);
    box(g,0,3.4,0,1.7,.9,1.7,M.cream); box(g,0,3.95,0,.6,.25,.6,M.gold);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;tree(Math.round(-10+Math.cos(a)*3.4),Math.round(Math.sin(a)*3.4),.7);}
    const s=labelSprite('ABOUT / PLAYER');s.position.set(0,5,0);g.add(s);
    landmarks.about={id:'about',position:new THREE.Vector3(-10,0,0),object:g,title:'About'};
  }
  function makeProjectDistrict(){
    const g=new THREE.Group();g.position.set(10,0,-3);worldRoot.add(g);
    const colors=[M.gold,M.leafLight,M.glass,M.portal];
    for(let i=0;i<4;i++){
      const x=(i%2)*2.8-1.4,z=Math.floor(i/2)*2.7-1.35;
      box(g,x,.75,z,2.1,1.5,1.8,colors[i]);box(g,x,1.65,z,2.35,.25,2.05,M.dark);
      box(g,x,.85,z-.95,1.3,.7,.12,M.cream);
    }
    const s=labelSprite('PROJECTS / BUILDS');s.position.set(0,3.2,0);s.scale.set(6,1.5,1);g.add(s);
    landmarks.projects={id:'projects',position:new THREE.Vector3(10,0,-3),object:g,title:'Projects'};
  }
  function makeWorkshop(){
    const g=new THREE.Group();g.position.set(-1,0,-12);worldRoot.add(g);
    box(g,0,.5,0,5,.9,4,M.wood);box(g,0,1.7,0,4.8,1.6,3.8,M.stone);box(g,0,2.7,0,5.3,.5,4.3,M.dark);
    box(g,-1,1.3,-2,1,.8,.15,M.gold);box(g,1,1.3,-2,1,.8,.15,M.glass);
    box(g,0,.95,2.15,1.1,1.1,.2,M.woodLight);box(g,0,1.2,2.28,.25,.4,.08,M.gold);
    const s=labelSprite('SKILLS / CRAFT');s.position.set(0,3.7,0);s.scale.set(5.2,1.3,1);g.add(s);
    landmarks.skills={id:'skills',position:new THREE.Vector3(-1,0,-12),object:g,title:'Skills'};
  }
  function makePortal(){
    const g=new THREE.Group();g.position.set(1,0,13);worldRoot.add(g);
    box(g,0,1.7,0,3.4,3.6,.5,M.dark);box(g,0,1.7,.3,2.5,2.8,.12,M.portal);
    for(let i=0;i<4;i++){box(g,-1.55+i*1.03,1.7,.45,.12,2.95,.12,M.gold);}
    box(g,0,.15,0,4.4,.3,1.5,M.stone);
    const s=labelSprite('CONTACT / PORTAL');s.position.set(0,4.1,0);s.scale.set(5.7,1.4,1);g.add(s);
    landmarks.contact={id:'contact',position:new THREE.Vector3(1,0,13),object:g,title:'Contact'};
  }
  function makePlayer(){
    playerGroup=new THREE.Group();scene.add(playerGroup);
    // blocky friendly avatar
    box(playerGroup,0,1.45,0,.72,.78,.55,mat(0x34749a));
    box(playerGroup,0,2.12,0,.62,.62,.6,mat(0xc99067));
    box(playerGroup,0,2.46,0,.65,.18,.64,mat(0x38281f));
    box(playerGroup,-.16,2.16,-.31,.1,.08,.04,M.cream);box(playerGroup,.16,2.16,-.31,.1,.08,.04,M.cream);
    box(playerGroup,-.47,1.45,0,.2,.72,.22,mat(0xc99067));box(playerGroup,.47,1.45,0,.2,.72,.22,mat(0xc99067));
    box(playerGroup,-.2,.52,0,.24,.55,.25,mat(0x374238));box(playerGroup,.2,.52,0,.24,.55,.25,mat(0x374238));
    playerGroup.position.set(0,0,7); player=playerGroup;
  }
  function buildWorld(){
    scene=new THREE.Scene();scene.background=new THREE.Color(0x9ac8df);scene.fog=new THREE.Fog(0x9ac8df,35,75);
    camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);camera.position.set(0,5,14);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;$('#world').appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe5f4ff,0x56694b,2.2));const sun=new THREE.DirectionalLight(0xfff0d1,2.7);sun.position.set(-12,22,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
    worldRoot=new THREE.Group();scene.add(worldRoot);
    // island ground and grass grid
    box(worldRoot,0,-.8,0,48,1.5,48,M.dirt,false);
    for(let x=-23;x<=23;x+=1){for(let z=-23;z<=23;z+=1){box(worldRoot,x,-.02,z,1,.12,1,((x+z)%7===0)?M.grassLight:M.grass,false);}}
    // pathways to every zone
    pathBetween(0,7,-10,0,2.2);pathBetween(0,7,10,-3,2.2);pathBetween(0,7,-1,-12,2.2);pathBetween(0,7,1,13,2.2);
    makeHouse();makeAboutGarden();makeProjectDistrict();makeWorkshop();makePortal();
    // perimeter trees, rocks, pond and small flowers
    for(let i=-20;i<=20;i+=4){tree(i,-19,.9);tree(i,19,.85);tree(-20,i,.9);tree(20,i,.9);}
    for(let i=0;i<16;i++){const x=-16+Math.random()*32,z=-16+Math.random()*32;if(Math.hypot(x,z)>8)box(worldRoot,x,.18,z,.35,.35,.35,M.gold,false);}
    box(worldRoot,15,.03,8,4,.1,3,M.water,false);for(let i=0;i<4;i++)box(worldRoot,13+i, .12,8,.7,.18,.7,M.stone,false);
    makePlayer();clock=new THREE.Clock();
  }
  function showLocation(id){
    const data=locations[id];if(!data)return;
    activeLocation=id;nearLocation=id;$('#panelKicker').textContent=data.kicker;$('#panelTitle').textContent=data.title;$('#panelBody').innerHTML=data.body;
    const actions=$('#panelActions');actions.innerHTML='';
    (data.actions||[]).forEach(a=>{const el=document.createElement(a.url?'a':'button');el.textContent=a.label;if(a.url){el.href=a.url;el.target='_blank';el.rel='noopener noreferrer';}else el.addEventListener('click',()=>teleport(a.target,true));if(a.secondary)el.className='secondary-action';actions.appendChild(el);});
    $('#infoPanel').classList.add('open');panelOpen=true;$('#zoneName').textContent=data.zone;
    $$('.location-link').forEach(b=>b.classList.toggle('active',b.dataset.location===id));
    if(id==='home')$('#heroCopy').classList.remove('dimmed');else $('#heroCopy').classList.add('dimmed');
  }
  function closePanel(){panelOpen=false;$('#infoPanel').classList.remove('open');}
  function teleport(id,openPanel=false){const data=locations[id];if(!data||!player)return;player.position.set(data.pos[0],0,data.pos[2]+(id==='home'?0:3));yaw=Math.atan2(data.pos[0]-player.position.x,data.pos[2]-player.position.z);closePanel();activeLocation=id;$('#zoneName').textContent=data.zone;$$('.location-link').forEach(b=>b.classList.toggle('active',b.dataset.location===id));$('#heroCopy').classList.toggle('dimmed',id!=='home');if(openPanel)showLocation(id);}
  function interact(){if(nearLocation)showLocation(nearLocation);}
  function movementVector(){let x=0,z=0;const has=(...names)=>names.some(n=>keys.has(n)||mobileHeld.has(n));if(has('w','arrowup','forward'))z-=1;if(has('s','arrowdown','back'))z+=1;if(has('a','arrowleft','left'))x-=1;if(has('d','arrowright','right'))x+=1;const len=Math.hypot(x,z)||1;return{x:x/len,z:z/len};}
  function updatePlayer(dt){if(panelOpen||$('#helpModal').classList.contains('showing'))return;const v=movementVector();if(v.x||v.z){const speed=6;const sin=Math.sin(yaw),cos=Math.cos(yaw);const dx=(v.x*cos+v.z*sin)*speed*dt;const dz=(v.z*cos-v.x*sin)*speed*dt;const nx=THREE.MathUtils.clamp(player.position.x+dx,-21,21),nz=THREE.MathUtils.clamp(player.position.z+dz,-21,21);player.position.x=nx;player.position.z=nz;player.rotation.y=Math.atan2(dx,dz);}
    let nearest=null,dist=999;Object.values(landmarks).forEach(l=>{const d=Math.hypot(player.position.x-l.position.x,player.position.z-l.position.z);if(d<dist){dist=d;nearest=l.id;}});nearLocation=dist<4.2?nearest:null;$('#interactionPrompt').classList.toggle('hidden',!nearLocation||panelOpen);if(nearLocation&&!panelOpen){$('#interactionPrompt').innerHTML='<span class="keycap">E</span><span>Explore '+locations[nearLocation].title+'</span>';}
    $('#coords').textContent=`X ${Math.round(player.position.x)} · Z ${Math.round(player.position.z)}`;
  }
  function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);updatePlayer(dt);if(player){const target=new THREE.Vector3(player.position.x+Math.sin(yaw)*8,player.position.y+5.2,player.position.z+Math.cos(yaw)*8);camera.position.lerp(target,1-Math.pow(.001,dt));const look=new THREE.Vector3(player.position.x,1.2,player.position.z);camera.lookAt(look);}renderer.render(scene,camera);}
  function setup(){
    $('#startButton').addEventListener('click',()=>{teleport('home',false);closePanel();$('#heroCopy').classList.add('dimmed');});$('#brandHome').addEventListener('click',e=>{e.preventDefault();teleport('home',true);});
    $$('.location-link').forEach(b=>b.addEventListener('click',()=>teleport(b.dataset.location,true)));
    $('#closePanel').addEventListener('click',closePanel);$('#helpButton').addEventListener('click',()=>$('#helpModal').classList.remove('hidden'));$('#closeHelp').addEventListener('click',()=>$('#helpModal').classList.add('hidden'));$('#resumeButton').addEventListener('click',()=>$('#helpModal').classList.add('hidden'));
    window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='e')interact();if(k>='1'&&k<='5')teleport(['home','about','projects','skills','contact'][Number(k)-1],true);if(k==='escape'){closePanel();$('#helpModal').classList.add('hidden');}});
    window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
    const canvasParent=$('#world');canvasParent.addEventListener('pointerdown',e=>{if(e.target.tagName==='CANVAS'){dragging=true;lastX=e.clientX;lastY=e.clientY;canvasParent.setPointerCapture?.(e.pointerId);}});window.addEventListener('pointerup',()=>dragging=false);window.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.002,-.8,.2);});
    // Direction pad supports touch and mouse.
    $$('[data-move]').forEach(btn=>{const dir=btn.dataset.move;const start=e=>{e.preventDefault();mobileHeld.add(dir);};const end=()=>mobileHeld.delete(dir);btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',end);btn.addEventListener('pointerleave',end);btn.addEventListener('pointercancel',end);});
    window.addEventListener('resize',()=>{if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
  }
  function init(){if(!window.THREE){$('#loading').innerHTML='<p>Could not load Three.js</p><small>Check your internet connection and refresh.</small>';return;}buildWorld();setup();$('#zoneName').textContent=locations.home.zone;$$('.location-link').forEach(b=>b.classList.toggle('active',b.dataset.location==='home'));animate();setTimeout(()=>$('#loading').classList.add('done'),650);}
  window.addEventListener('load',init);
})();
