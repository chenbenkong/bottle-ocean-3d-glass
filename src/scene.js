import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas=document.getElementById("c");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x100e0b);scene.fog=new THREE.FogExp2(0x100e0b,0.012);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.05,300);
camera.position.set(7.5,3.4,9.5);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=0.06;controls.target.set(0,0.1,0);
controls.minDistance=5;controls.maxDistance=22;controls.minPolarAngle=0.12;controls.maxPolarAngle=Math.PI-0.12;
controls.autoRotate=true;controls.autoRotateSpeed=0.35;
canvas.addEventListener("pointerdown",()=>{controls.autoRotate=false;});
const TAU=Math.PI*2,clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp,rand=(a,b)=>a+Math.random()*(b-a);

/* ---------- lights ---------- */
const hemi=new THREE.HemisphereLight(0xbfd4e8,0x4a3520,0.75);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffdcb0,1.5);key.position.set(-6,10,7);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=1;key.shadow.camera.far=40;
key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;scene.add(key);
const fill=new THREE.DirectionalLight(0x86a8d8,0.35);fill.position.set(6,2,-6);scene.add(fill);
const warm=new THREE.PointLight(0xffae5a,0.9,12,2);warm.position.set(2.5,1.6,2);scene.add(warm);

/* ---------- procedural sky dome ---------- */
const skyU={uTop:{value:new THREE.Color(0x27364f)},uMid:{value:new THREE.Color(0xa97a5e)},uBot:{value:new THREE.Color(0x2a2018)},uNight:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(120,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyU,
 vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`varying vec3 vD;uniform vec3 uTop,uMid,uBot;uniform float uNight;void main(){float h=vD.y*0.5+0.5;vec3 c=mix(uBot,uMid,smoothstep(0.0,0.5,h));c=mix(c,uTop,smoothstep(0.45,1.0,h));gl_FragColor=vec4(c,1.0);}`}));
scene.add(sky);
const starGeo=new THREE.BufferGeometry(),sp=[];for(let i=0;i<600;i++){const a=Math.random()*TAU,b=Math.acos(rand(0,1)),r=100;sp.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));}
starGeo.setAttribute("position",new THREE.Float32BufferAttribute(sp,3));
const starMat=new THREE.PointsMaterial({color:0xffffff,size:0.5,transparent:true,opacity:0,depthWrite:false,fog:false});scene.add(new THREE.Points(starGeo,starMat));

/* ---------- bottle rig ---------- */
const rig=new THREE.Group();scene.add(rig);
const inner=new THREE.Group();rig.add(inner);
const voxel=new THREE.BoxGeometry(1,1,1);
const mat=(c,r=0.7,m=0.05)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});

// glass with true fresnel rim + specular, transmission-ish via low alpha
const glassU={uTint:{value:new THREE.Color(0xbfe4dc)},uTime:{value:0}};
const glassMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:glassU,
 vertexShader:`varying vec3 vN,vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`varying vec3 vN,vW;uniform vec3 uTint;uniform float uTime;
 void main(){vec3 V=normalize(cameraPosition-vW);vec3 N=normalize(vN);float f=pow(1.0-abs(dot(N,V)),2.6);
 vec3 L=normalize(vec3(0.4,0.9,0.5));float sp=pow(max(dot(reflect(-V,N),L),0.0),72.0);
 float band=0.5+0.5*sin(vW.y*3.0+uTime*0.2);vec3 col=uTint*(0.10+f*0.95)+vec3(1.0)*sp*1.1+vec3(0.08,0.18,0.16)*band*0.2;
 float a=0.055+f*0.5+sp*0.45;gl_FragColor=vec4(col,clamp(a,0.0,0.85));}`});
// bottle lies along X: lathe around Y then rotate Z
function bottleProfile(){const p=[[0,-3.4],[0.85,-3.4],[1.55,-3.15],[1.95,-2.6],[2.05,-1.6],[2.05,1.5],[1.9,2.2],[1.3,2.75],[0.72,3.05],[0.62,3.7],[0.62,4.15],[0.8,4.2]];return p.map(([r,y])=>new THREE.Vector2(r,y));}
const bottle=new THREE.Mesh(new THREE.LatheGeometry(bottleProfile(),64),glassMat);
bottle.rotation.z=-Math.PI/2;bottle.position.set(0,0.15,0);rig.add(bottle);
// cork, wax, rope, tag at the neck (+X)
const neckX=4.35,nY=0.15;
const cork=new THREE.Mesh(new THREE.CylinderGeometry(0.58,0.64,0.75,20),mat(0xb98a4e,0.95));cork.rotation.z=Math.PI/2;cork.position.set(neckX,nY,0);rig.add(cork);
const wax=new THREE.Mesh(new THREE.CylinderGeometry(0.66,0.56,0.5,20),mat(0xa8322b,0.6));wax.rotation.z=Math.PI/2;wax.position.set(neckX+0.35,nY,0);rig.add(wax);
const ropeMat=mat(0x8a6b3e,1);
for(let i=0;i<2;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(0.7,0.05,8,32),ropeMat);r.rotation.y=Math.PI/2;r.position.set(3.95-i*0.22,nY,0);rig.add(r);}
const tag=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.5,0.04),mat(0xe8d9b0,0.9));tag.position.set(4.5,nY-1.05,0.2);tag.rotation.z=-0.1;rig.add(tag);
const str=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.7,6),ropeMat);str.position.set(4.4,nY-0.55,0.15);str.rotation.z=0.16;rig.add(str);
/* ---------- Gerstner wave ocean (GPU vertex displacement) ---------- */
const waveU={uTime:{value:0},uStorm:{value:0}};
const waveVert="uniform float uTime,uStorm;varying float vH;varying vec3 vN2;varying vec2 vP;\nvec3 gerstner(vec2 p,vec2 dir,float A,float L,float sp,float t,out vec3 norm){\n float k=6.28318/L,c=sqrt(9.8/k),f=k*(dot(dir,p)-c*sp*t);\n float a=A*(1.0+uStorm*1.6),q=0.72;\n norm=vec3(-dir.x*k*a*cos(f),0.0,-dir.y*k*a*cos(f));\n return vec3(q*a*dir.x*cos(f),a*sin(f),q*a*dir.y*cos(f));}\nvoid main(){vec3 pos=position;vec2 p=pos.xz;vec3 n=vec3(0.0,1.0,0.0),tn;\n vec3 g1=gerstner(p,normalize(vec2(1.0,0.35)),0.11,3.4,1.0,uTime,tn);n+=tn;pos+=g1;\n vec3 g2=gerstner(p,normalize(vec2(-0.5,1.0)),0.07,2.1,1.2,uTime,tn);n+=tn;pos+=g2;\n vec3 g3=gerstner(p,normalize(vec2(0.8,-0.7)),0.045,1.2,1.6,uTime,tn);n+=tn;pos+=g3;\n vec3 g4=gerstner(p,normalize(vec2(-0.3,-1.0)),0.03,0.7,2.0,uTime,tn);n+=tn;pos+=g4;\n vH=pos.y;vP=p;vN2=normalize(n);gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);}";
const waveFrag="precision highp float;varying float vH;varying vec3 vN2;varying vec2 vP;uniform float uStorm;\nvoid main(){vec3 N=normalize(vN2);vec3 V=normalize(cameraPosition-vec3(vP.x,vH,vP.y));\n float fres=pow(1.0-max(dot(N,V),0.0),3.0);\n vec3 deep=vec3(0.012,0.16,0.22),shallow=vec3(0.06,0.42,0.44);\n vec3 col=mix(deep,shallow,clamp(vH*2.0+0.45,0.0,1.0));\n col=mix(col,vec3(0.16,0.55,0.6),fres*0.55);\n float foam=smoothstep(0.085+uStorm*0.02,0.16+uStorm*0.04,vH);\n foam*=0.6+0.4*sin(vP.x*14.0+vP.y*11.0);\n col=mix(col,vec3(0.92,0.97,0.97),clamp(foam,0.0,1.0));\n gl_FragColor=vec4(col,0.90);}";
const waveMat=new THREE.ShaderMaterial({uniforms:waveU,vertexShader:waveVert,fragmentShader:waveFrag,transparent:true,side:THREE.DoubleSide});
const waterGeo=new THREE.PlaneGeometry(5.0,3.3,140,96);waterGeo.rotateX(-Math.PI/2);
const water=new THREE.Mesh(waterGeo,waveMat);water.position.set(-0.25,0.25,0);water.renderOrder=2;inner.add(water);
for(let k=0;k<9;k++){const t=k/8,col=new THREE.Color(0x03202f).lerp(new THREE.Color(0x1c7d80),1-t);
 const dm=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.3,depthWrite:false,side:THREE.DoubleSide});
 const disc=new THREE.Mesh(new THREE.CircleGeometry(2.3-k*0.05,40),dm);disc.rotation.x=-Math.PI/2;disc.position.set(-0.25,0.1-(k+0.5)*0.17,0);inner.add(disc);}
const brass=mat(0xc9a24a,0.32,0.85);
const chest=new THREE.Group();chest.position.set(-1.45,-1.35,0.3);chest.rotation.y=0.4;inner.add(chest);
chest.add(new THREE.Mesh(new THREE.BoxGeometry(0.8,0.45,0.55),mat(0x6b3f20,0.8)));
const lid=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.8,12,1,false,0,Math.PI),mat(0x7a4a26,0.8));lid.rotation.z=Math.PI/2;lid.position.y=0.22;chest.add(lid);
const gold=new THREE.PointLight(0xffc24a,2.2,3.2,2);gold.position.y=0.35;chest.add(gold);
for(let i=0;i<8;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.02,10),brass);c.position.set(rand(-0.25,0.25),0.38+rand(0,0.1),rand(-0.18,0.18));chest.add(c);}
const anchor=new THREE.Group();anchor.position.set(1.3,-1.25,-0.5);anchor.rotation.set(0.3,0.2,0.25);inner.add(anchor);
anchor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,1.0,8),mat(0x303038,0.5,0.6)));
const aring=new THREE.Mesh(new THREE.TorusGeometry(0.14,0.04,8,16),mat(0x3a3a40,0.5,0.6));aring.position.y=0.55;anchor.add(aring);
const across=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.08,0.08),mat(0x303038,0.5,0.6));across.position.y=0.3;anchor.add(across);
for(const s of[-1,1]){const a=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.045,6,12,Math.PI/2),mat(0x303038,0.5,0.6));a.position.set(s*0.35,-0.3,0);a.rotation.z=s>0?Math.PI:Math.PI/2;anchor.add(a);}
const jar=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.02,0),new THREE.Vector2(0.18,0.1),new THREE.Vector2(0.28,0.4),new THREE.Vector2(0.2,0.7),new THREE.Vector2(0.14,0.85)],16),mat(0xa9693f,0.85));jar.position.set(0.5,-1.2,0.8);jar.rotation.z=0.5;inner.add(jar);
function coral(x,z,color){const g=new THREE.Group();g.position.set(x,-1.3,z);const list=[];for(let i=0;i<7;i++)list.push([rand(-0.2,0.2),rand(0,0.4),rand(-0.2,0.2),0.11,0.18,0.11]);
 const im=new THREE.InstancedMesh(voxel,mat(color,0.7),list.length);const d=new THREE.Object3D();list.forEach((v,i)=>{d.position.set(v[0],v[1],v[2]);d.scale.set(v[3],v[4],v[5]);d.updateMatrix();im.setMatrixAt(i,d.matrix);});im.instanceMatrix.needsUpdate=true;inner.add(im);}
coral(-0.9,0.2,0xe06a7a);coral(0.9,0.6,0xd98bbf);coral(-0.4,-0.9,0xe0705a);
const bubG=new THREE.BufferGeometry(),bp=[];for(let i=0;i<80;i++)bp.push(rand(-2,1.7),rand(-1.4,0.1),rand(-1.2,1.2));bubG.setAttribute("position",new THREE.Float32BufferAttribute(bp,3));
const bubbles=new THREE.Points(bubG,new THREE.PointsMaterial({color:0xcfeef0,size:0.05,transparent:true,opacity:0.55,depthWrite:false}));inner.add(bubbles);
/* ---------- voxel helpers ---------- */
function vox(g,c,x,y,z,sx,sy,sz,r=0.85,m=0.02){const o=new THREE.Mesh(voxel,mat(c,r,m));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;g.add(o);return o;}
function inst(g,c,list,r=0.85,m=0.02){const im=new THREE.InstancedMesh(voxel,mat(c,r,m),list.length);const d=new THREE.Object3D();list.forEach((v,i)=>{d.position.set(v[0],v[1],v[2]);d.scale.set(v[3]||1,v[4]||1,v[5]||1);d.updateMatrix();im.setMatrixAt(i,d.matrix);});im.instanceMatrix.needsUpdate=true;im.castShadow=true;g.add(im);return im;}

/* ---------- coral island ---------- */
const island=new THREE.Group();island.position.set(-0.55,0.22,-0.35);island.scale.setScalar(0.62);inner.add(island);
(function(){const layers=[[1.15,0.1,0.05],[1.0,0.12,0.16],[0.82,0.12,0.28],[0.6,0.12,0.4],[0.4,0.1,0.5]];
 for(const L of layers){const list=[],rad=L[0],hh=L[1],yy=L[2];for(let a=0;a<18;a++){const an=a/18*TAU;list.push([Math.cos(an)*rad+rand(-.05,.05),yy,Math.sin(an)*rad+rand(-.05,.05),0.24,hh,0.24]);}inst(island,0xd9c48a,list,0.95);}})();
function palm2(x,z){const g=new THREE.Group();g.position.set(x,0.55,z);island.add(g);vox(g,0x8a5a32,0,0.42,0,0.12,0.85,0.12);const lv=[];for(let i=0;i<6;i++){const a=i/6*TAU;lv.push([Math.cos(a)*0.32,0.9,Math.sin(a)*0.32,0.34,0.08,0.14]);}inst(g,0x4f9e5a,lv,0.8);}
palm2(-0.7,0.45);palm2(0.7,-0.5);palm2(0.1,0.75);
// lighthouse red/white with rotating beam
const lh=new THREE.Group();lh.position.set(0.25,0.6,-0.25);island.add(lh);
for(let i=0;i<5;i++)vox(lh,i%2?0xe8e4dc:0xc0392f,0,i*0.22,0,0.32,0.22,0.32);
vox(lh,0x2a2a30,0,1.18,0,0.4,0.12,0.4);
const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.2,0.26),new THREE.MeshBasicMaterial({color:0xffe9a0}));lamp.position.y=1.32;lh.add(lamp);
const beam=new THREE.Mesh(new THREE.ConeGeometry(0.3,1.3,16,1,true),new THREE.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:0.12,side:THREE.DoubleSide,depthWrite:false}));beam.rotation.z=Math.PI/2;beam.position.set(0.65,1.32,0);lh.add(beam);
const beacon=new THREE.PointLight(0xffe3a0,1.2,5,2);beacon.position.y=1.32;lh.add(beacon);
// warm-window hut
const hut=new THREE.Group();hut.position.set(-0.55,0.55,0.55);island.add(hut);vox(hut,0xb98a5e,0,0.25,0,0.7,0.5,0.6);vox(hut,0x7a3b2e,0,0.6,0,0.9,0.18,0.8);
vox(hut,0xffd27a,0.36,0.28,0,0.03,0.2,0.22,0.5);
const hutGlow=new THREE.PointLight(0xffb45a,1,3.5,2);hutGlow.position.set(0.5,0.3,0);hut.add(hutGlow);
// dock + little boat
const dock=new THREE.Group();dock.position.set(1.25,0.1,0.35);island.add(dock);for(let i=0;i<5;i++)vox(dock,0x8a5e38,i*0.22-0.2,0,0,0.2,0.06,0.5);
const boat=new THREE.Group();boat.position.set(2.1,0.06,0.35);island.add(boat);vox(boat,0x8a4a2e,0,0,0,0.6,0.12,0.28);
// treasure pile
for(let i=0;i<6;i++)vox(island,0xe8c34a,rand(0.4,0.7),0.62+rand(0,0.1),rand(-0.6,-0.3),0.1,0.08,0.1,0.4,0.7);

/* ---------- three-masted ship ---------- */
const ship=new THREE.Group();ship.scale.setScalar(0.92);inner.add(ship);
const hullG=new THREE.Group();ship.add(hullG);
vox(hullG,0x6b3a22,0,-0.05,0,1.9,0.42,0.62,0.8);vox(hullG,0x4a2718,0,-0.22,0,1.5,0.2,0.5);
vox(hullG,0x8a5230,0,0.18,0,1.7,0.12,0.56);vox(hullG,0xd8c8a0,0,0.28,0,1.2,0.1,0.5);
function mast(x,hh){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.04,hh,8),mat(0x5a3a20));m.position.set(x,hh/2+0.3,0);hullG.add(m);}
mast(-0.55,1.5);mast(0.05,2.0);mast(0.6,1.35);
const sailMat=new THREE.MeshStandardMaterial({color:0xf0e6cf,side:THREE.DoubleSide,roughness:0.9});
const redMat=new THREE.MeshStandardMaterial({color:0xb23b32,side:THREE.DoubleSide,roughness:0.9});
function sail(x,y,w,hh,mt){const g=new THREE.PlaneGeometry(w,hh,6,4),pa=g.attributes.position;
 for(let i=0;i<pa.count;i++){const px=pa.getX(i),py=pa.getY(i);pa.setZ(i,Math.cos(px*2.2)*0.14*(1-Math.abs(py)/(hh/2)*0.4));}g.computeVertexNormals();
 const m=new THREE.Mesh(g,mt);m.position.set(x,y,0);hullG.add(m);}
sail(-0.55,1.15,0.75,0.7,sailMat);sail(-0.55,1.75,0.55,0.45,sailMat);sail(0.05,1.5,1.05,0.85,redMat);sail(0.05,2.25,0.8,0.55,sailMat);sail(0.6,1.0,0.6,0.6,sailMat);
const lineMat=new THREE.LineBasicMaterial({color:0x3a2a1a,transparent:true,opacity:0.7});
function rope(x1,y1,x2,y2){hullG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1,y1,0),new THREE.Vector3(x2,y2,0)]),lineMat));}
rope(-0.55,1.8,-1,0.3);rope(-0.55,1.8,0.9,0.3);rope(0.05,2.3,-1,0.3);rope(0.05,2.3,1.2,0.3);rope(0.6,1.65,1.2,0.3);rope(-0.55,1.8,0.05,2.3);rope(0.05,2.3,0.6,1.65);

/* ---------- gulls, clouds, whale, fish, buoy ---------- */
const gulls=[];for(let i=0;i<5;i++){const g=new THREE.Group();vox(g,0xf2f0e8,0,0,0,0.14,0.07,0.26);
 const wl=vox(g,0xe8e6df,-0.2,0.02,0,0.28,0.03,0.1),wr=vox(g,0xe8e6df,0.2,0.02,0,0.28,0.03,0.1);
 g.userData={a:rand(0,TAU),r:rand(0.8,1.4),y:rand(0.8,1.4),sp:rand(0.4,0.8),wl,wr};inner.add(g);gulls.push(g);}
function cloud(x,y,z,s){const g=new THREE.Group();g.position.set(x,y,z),list=[];for(let i=0;i<7;i++)list.push([rand(-.5,.5)*s,rand(0,.15)*s,rand(-.25,.25)*s,rand(.3,.6)*s,rand(.18,.3)*s,rand(.2,.4)*s]);
 const im=inst(g,0xf2efe6,list,1);im.material.transparent=true;im.material.opacity=0.55;inner.add(g);return g;}
const clouds=[cloud(-1.2,1.7,-0.6,0.6),cloud(1.0,1.8,0.2,0.5)];
const whale=new THREE.Group();inner.add(whale);vox(whale,0x3f5a72,0,0,0,1.0,0.4,0.48);vox(whale,0x355066,-0.65,0.05,0,0.45,0.28,0.32);whale.visible=false;
const fishG=new THREE.BufferGeometry(),fp=[];for(let i=0;i<35;i++)fp.push(rand(-1.9,1.4),rand(-1.1,-0.3),rand(-1,1));fishG.setAttribute("position",new THREE.Float32BufferAttribute(fp,3));
const fish=new THREE.Points(fishG,new THREE.PointsMaterial({color:0xa8d8d0,size:0.055,transparent:true,opacity:0.8}));inner.add(fish);
const buoy=new THREE.Group();inner.add(buoy);vox(buoy,0xd8453a,0,0.1,0,0.16,0.22,0.16);vox(buoy,0xe8e2cf,0,0.22,0,0.1,0.08,0.1);
const crab=new THREE.Group();crab.position.set(1.6,0.14,0.2);island.add(crab);vox(crab,0xd0603a,0,0.06,0,0.18,0.1,0.14);

/* ---------- desk and props (outside bottle) ---------- */
const wood=mat(0x4a2f1e,0.85);
const table=new THREE.Mesh(new THREE.BoxGeometry(40,0.7,26),mat(0x6b4428,0.8));table.position.y=-3.6;table.receiveShadow=true;scene.add(table);
for(let dx of[-1.7,1.7]){const b=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,3.2),wood);b.position.set(dx,-2.85,0);b.rotation.z=dx>0?-0.18:0.18;b.castShadow=true;scene.add(b);}
const rail=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.35,3),wood);rail.position.y=-3.05;scene.add(rail);
const book=new THREE.Group();book.position.set(-6,-3.02,2);book.rotation.y=0.3;scene.add(book);
const bc=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.28,1.9),mat(0x5c2f28,0.9));bc.castShadow=true;book.add(bc);
const pg=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.2,1.72),mat(0xe4d7b6,1));pg.position.y=0.06;book.add(pg);
const scope=new THREE.Group();scope.position.set(6.4,-2.55,1.4);scope.rotation.set(0,-0.5,-0.22);scene.add(scope);
const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.36,3,18),brass);tube.rotation.z=Math.PI/2;scope.add(tube);
const tube2=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.28,1.2,18),brass);tube2.rotation.z=Math.PI/2;tube2.position.x=1.9;scope.add(tube2);
for(let i=0;i<3;i++){const a=i/3*TAU,l=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,1.7,6),wood);l.position.set(Math.cos(a)*0.35,-1,Math.sin(a)*0.35);l.rotation.z=Math.cos(a)*0.25;l.rotation.x=-Math.sin(a)*0.25;scope.add(l);}
/* ---------- wave sampler (sync with shader) ---------- */
function waveH(x,z,t,st){const A=0.11*(1+st*1.6);
 const g=(dx,dz,L,sp)=>A*Math.sin((x*dx+z*dz)*6.28318/L-Math.sqrt(9.8*6.28318/L)*sp*t);
 return g(0.944,0.330,3.4,1.0)+g(-0.447,0.894,2.1,1.2)*0.64+g(0.752,-0.659,1.2,1.6)*0.41+g(-0.287,-0.958,0.7,2.0)*0.27;}

/* ---------- time / storm state ---------- */
let tod=0.48,storm=0,stormT=0,tGlobal=0,tShip=0.9,wp=0;
const fpsEl=document.getElementById("fps"),sTime=document.getElementById("sTime"),sSea=document.getElementById("sSea");
const pal={dawn:[0x3a5075,0xd59a72,0x4a352b],noon:[0x3f7fc4,0x9fc6e8,0x6a7a6a],dusk:[0x27364f,0xa97a5e,0x2a2018],night:[0x0a1230,0x1c2a4a,0x0a0d18]};
function lerpC(a,b,t){return new THREE.Color(a).lerp(new THREE.Color(b),t);}
function palette(t){const ks=["dawn","noon","dusk","night"],f=((t%1)+1)%1*4,i=Math.floor(f),k=f-i,A=pal[ks[i%4]],B=pal[ks[(i+1)%4]];
 return{top:lerpC(A[0],B[0],k),mid:lerpC(A[1],B[1],k),bot:lerpC(A[2],B[2],k),night:clamp(Math.abs(t-0.75)<0.16?(1-Math.abs(t-0.75)/0.16):0,0,1)};}
function timeName(t){const q=Math.floor((((t%1)+1)%1)*4);return["黎明","正午","黄昏","子夜"][q];}
function applyPalette(){const p=palette(tod);skyU.uTop.value.copy(p.top);skyU.uMid.value.copy(p.mid);skyU.uBot.value.copy(p.bot);
 hemi.intensity=0.75-p.night*0.25;key.intensity=1.5-p.night*0.9;starMat.opacity=p.night*0.95;
 warm.intensity=0.5+p.night*1.6;beacon.intensity=0.7+p.night*2.5;hutGlow.intensity=0.5+p.night*2;gold.intensity=1.0+p.night*1.5;
 renderer.toneMappingExposure=1.18-p.night*0.15;}

/* ---------- animate ---------- */
let last=performance.now(),fa=0,fn=0;
function animate(now){requestAnimationFrame(animate);
 const dt=Math.min((now-last)/1000,0.05);last=now;tGlobal+=dt;storm+=(stormT-storm)*Math.min(1,dt*3);
 waveU.uTime.value=tGlobal;waveU.uStorm.value=storm;glassU.uTime.value=tGlobal;applyPalette();
 // bottle shakes in storm, inner water stays level (inner is child of rig but counter-rotated)
 rig.rotation.z=storm*Math.sin(tGlobal*11)*0.03;rig.rotation.x=storm*Math.sin(tGlobal*8)*0.02;
 inner.rotation.z=-rig.rotation.z;inner.rotation.x=-rig.rotation.x;
 // lighthouse beam
 beam.rotation.y=tGlobal*1.4;lamp.material.color.setHSL(0.12,0.9,0.55+0.2*Math.abs(Math.sin(tGlobal*1.4)));
 // gulls
 for(const g of gulls){const u=g.userData,a=u.a+tGlobal*u.sp;
  g.position.set(Math.cos(a)*u.r,u.y+Math.sin(a*3)*0.1,Math.sin(a)*u.r*0.5-0.2);g.rotation.y=-a+Math.PI/2;
  const flap=Math.sin(tGlobal*7+u.a)*0.35;u.wl.rotation.z=flap;u.wr.rotation.z=-flap;}
 clouds.forEach((c,i)=>{c.position.x+=dt*0.015*(1+i*0.2);if(c.position.x>1.6)c.position.x=-1.6;});
 fish.rotation.y=tGlobal*0.2;
 // whale breach
 wp=(tGlobal%24)/24;if(wp>0.55&&wp<0.78){const q=(wp-0.55)/0.23,arc=Math.sin(q*Math.PI);
  whale.visible=true;whale.position.set(-1+q*2,-1.1+arc*1.7,0.1);whale.rotation.z=(q-0.5)*1.5;}else whale.visible=false;
 // buoy + ship orbit with buoyancy
 buoy.position.set(-1.7,0.25+waveH(-1.7,0.4,tGlobal,storm),0.4);buoy.rotation.z=Math.sin(tGlobal*1.6)*0.12;
 tShip+=dt*(0.13+storm*0.06);
 const or=1.35,sx=Math.cos(tShip)*or,sz=Math.sin(tShip)*or*0.55+0.35;
 const hF=waveH(sx+0.5,sz,tGlobal,storm),hB=waveH(sx-0.5,sz,tGlobal,storm),hL=waveH(sx,sz-0.3,tGlobal,storm),hR=waveH(sx,sz+0.3,tGlobal,storm);
 ship.position.set(sx,(hF+hB+hL+hR)/4+0.1,sz);
 ship.rotation.z=Math.atan2(hB-hF,1)*0.8+storm*Math.sin(tGlobal*5)*0.04;
 ship.rotation.x=Math.atan2(hR-hL,0.6)*0.6;ship.rotation.y=-tShip+Math.PI/2;
 // bubbles
 const ba=bubbles.geometry.attributes.position;for(let i=0;i<ba.count;i++){let y=ba.getY(i)+dt*(0.22+storm*0.25);if(y>0.12)y=-1.4;ba.setY(i,y);}ba.needsUpdate=true;
 // slow day/night drift
 tod=(tod+dt*0.004)%1;
 controls.update();renderer.render(scene,camera);
 fa+=dt;fn++;if(fa>0.5){fpsEl.textContent=Math.round(fn/fa);fa=0;fn=0;}
 sTime.textContent=timeName(tod);sSea.textContent=storm>0.5?"风暴":storm>0.15?"涌浪":"微澜";
}

/* ---------- UI ---------- */
const bStorm=document.getElementById("bStorm"),bNight=document.getElementById("bNight"),bReset=document.getElementById("bReset");
bStorm.onclick=()=>{stormT=stormT>0.5?0:1;bStorm.classList.toggle("on",stormT>0.5);};
bNight.onclick=()=>{tod=Math.abs(tod-0.75)<0.1?0.48:0.75;bNight.classList.toggle("on",Math.abs(tod-0.75)<0.1);};
bReset.onclick=()=>{camera.position.set(7.5,3.4,9.5);controls.target.set(0,0.1,0);controls.autoRotate=true;stormT=0;tod=0.48;bStorm.classList.remove("on");bNight.classList.remove("on");};
addEventListener("keydown",e=>{if(e.code==="Space"&&!e.repeat){e.preventDefault();stormT=1;bStorm.classList.add("on");}});
addEventListener("keyup",e=>{if(e.code==="Space"){e.preventDefault();stormT=0;bStorm.classList.remove("on");}});
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

applyPalette();
document.getElementById("load").classList.add("hide");
requestAnimationFrame(animate);