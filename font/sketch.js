/* Dreamer-style Custom Vector Font
   ✅ DESIGN 100% 유지
   ✅ GIF.js 제거 (동작 안 되는 문제 해결)
   ✅ S 키 = 5초(150프레임) PNG → ZIP 저장
*/

/* -------------------------------------------
   기존 Dreamer 디자인 코드 그대로 유지
------------------------------------------- */

// ---- 스타일/크기 ----
let stylisticSet = 1;       // 1: Thorny, 2: Pixel
let fontSize = 80;
let noiseAmt = 12, noiseFreq = 0.018;
let gridPix = 4, strokeStep = 1.0;
let seedLocked = false, seedVal = 12345;

let pts = [];
let currentText = "ALL COMETS";

// ---- 캔버스 핸들 ----
let cnv;

/* -------------------------------------------
   ✅ ZIP 프레임 저장 시스템
------------------------------------------- */
const TARGET_FPS = 30;
const RECORD_DURATION = 5000; // 5초
let recording = false;
let savedFrames = 0;
let maxFrames = (RECORD_DURATION / 1000) * TARGET_FPS;
let zip;
let recFlag;

/* -------------------------------------------
   ✅ bitmap glyphs 그대로 유지
------------------------------------------- */
const GLYPHS = {
  "A":[".###.","#...#","#...#","#####","#...#","#...#","#...#"],
  "B":["####.","#...#","#...#","####.","#...#","#...#","####."],
  "C":[".####","#....","#....","#....","#....","#....",".####"],
  "D":["####.","#...#","#...#","#...#","#...#","#...#","####."],
  "E":["#####","#....","#....","####.","#....","#....","#####"],
  "F":["#####","#....","#....","####.","#....","#....","#...."],
  "G":[".####","#....","#....","#.###","#...#","#...#",".###."],
  "H":["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
  "I":["#####","..#..","..#..","..#..","..#..","..#..","#####"],
  "J":["#####","...#.","...#.","...#.","...#.","#..#.",".##.."],
  "K":["#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"],
  "L":["#....","#....","#....","#....","#....","#....","#####"],
  "M":["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"],
  "N":["#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"],
  "O":[".###.","#...#","#...#","#...#","#...#","#...#",".###."],
  "P":["####.","#...#","#...#","####.","#....","#....","#...."],
  "Q":[".###.","#...#","#...#","#...#","#.#.#","#..#.",".##.#"],
  "R":["####.","#...#","#...#","####.","#.#..","#..#.","#...#"],
  "S":[".####","#....","#....",".###.","....#","....#","####."],
  "T":["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
  "U":["#...#","#...#","#...#","#...#","#...#","#...#",".###."],
  "V":["#...#","#...#","#...#","#...#","#...#",".#.#.","..#.."],
  "W":["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"],
  "X":["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  "Y":["#...#", ".#.#.", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "Z":["#####","....#","...#.","..#..",".#...","#....","#####"],
  "0":[".###.","#..##","#.#.#","#.#.#","##..#","#...#",".###."],
  "1":["..#..",".##..","..#..","..#..","..#..","..#..","#####"],
  "2":[".###.","#...#","....#","...#.","..#..",".#...","#####"],
  "3":["#####","....#","...#.","..##.","....#","#...#", ".###."],
  "4":["...#.","..##.",".#.#.","#..#.","#####","...#.","...#."],
  "5":["#####","#....","####.","....#","....#","#...#", ".###."],
  "6":[".###.","#....","####.","#...#","#...#","#...#",".###."],
  "7":["#####","....#","...#.","..#..","..#..","..#..","..#.."],
  "8":[".###.","#...#","#...#",".###.","#...#","#...#",".###."],
  "9":[".###.","#...#","#...#",".####","....#","....#",".###."],
  " ":[ ".....",".....",".....",".....",".....",".....","....." ]
};

/* -------------------------------------------
   bitmap → 외곽선
------------------------------------------- */
function patternToContours(pattern){
  const rows = pattern.length;
  const cols = pattern[0].length;
  const cell = (r,c)=> (r>=0&&r<rows&&c>=0&&c<cols) ? (pattern[r][c]==="#") : false;

  const edges=[];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(!cell(r,c)) continue;
      if(!cell(r-1,c)) edges.push([c,r,c+1,r]);
      if(!cell(r,c+1)) edges.push([c+1,r,c+1,r+1]);
      if(!cell(r+1,c)) edges.push([c+1,r+1,c,r+1]);
      if(!cell(r,c-1)) edges.push([c,r+1,c,r]);
    }
  }

  const key=(x,y)=>`${x},${y}`;
  const adj=new Map();
  function add(a,b){ if(!adj.has(a)) adj.set(a,[]); adj.get(a).push(b); }

  edges.forEach(([x1,y1,x2,y2])=>{
    add(key(x1,y1), key(x2,y2));
    add(key(x2,y2), key(x1,y1));
  });

  const used=new Set();
  const contours=[];

  for(const [x1,y1,x2,y2] of edges){
    const start=key(x1,y1);
    const next=key(x2,y2);
    if(used.has(`${start}->${next}`)) continue;

    const poly=[[x1,y1]];
    let cur=start, prev=null;

    while(true){
      const [cx,cy]=cur.split(",").map(Number);
      const nbrs=(adj.get(cur)||[]).slice().sort((A,B)=>{
        const [ax,ay]=A.split(",").map(Number);
        const [bx,by]=B.split(",").map(Number);
        return Math.atan2(ay-cy,ax-cx)-Math.atan2(by-cy,bx-cx);
      });

      let chosen=null;
      for(const nb of nbrs){
        if(nb===prev) continue;
        const ekey=`${cur}->${nb}`;
        if(used.has(ekey)) continue;
        used.add(ekey);
        used.add(`${nb}->${cur}`);
        chosen=nb;
        break;
      }

      if(!chosen) break;

      const [nx,ny]=chosen.split(",").map(Number);
      poly.push([nx,ny]);
      prev=cur;
      cur=chosen;
      if(cur===start) break;
    }
    if(poly.length>=3) contours.push(poly);
  }
  return contours;
}

/* -------------------------------------------
   외곽선 → 포인트
------------------------------------------- */
function contourToPoints(poly, scale, ox, oy, step=0.35){
  let pts=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    const ax=a[0]*scale+ox, ay=a[1]*scale+oy;
    const bx=b[0]*scale+ox, by=b[1]*scale+oy;
    const dx=bx-ax, dy=by-ay;
    const len=Math.hypot(dx,dy);
    let n=Math.max(2, Math.ceil(len/step));
    for(let t=0;t<n;t++){
      const u=t/(n-1);
      pts.push({x:ax+dx*u, y:ay+dy*u});
    }
  }
  return pts;
}

/* -------------------------------------------
   글리프 생성
------------------------------------------- */
function buildGlyphPoints(ch, size){
  const pat=GLYPHS[ch] || GLYPHS[" "];
  const contours=patternToContours(pat);

  const cell=size/6;
  const scale=cell;
  const width=(pat[0].length+1)*cell;

  let out=[];
  for(const poly of contours){
    out.push(...contourToPoints(poly, scale, 0,0));
  }
  return {points:out, advance:width};
}

/* -------------------------------------------
   텍스트 레이아웃
------------------------------------------- */
function layoutTextPoints(str,size){
  let x=0, y=0;
  let out=[];
  const lineH=size*1.4;
  const spacing=size*0.16;

  for(const raw of str){
    const ch=raw.toUpperCase();
    if(ch==="\n"){ x=0; y+=lineH; continue; }

    const g=buildGlyphPoints(ch,size);
    for(const p of g.points){
      out.push({x:p.x+x,y:p.y+y});
    }
    x+=g.advance+spacing;
  }
  return out;
}

/* -------------------------------------------
   SETUP
------------------------------------------- */
function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  frameRate(TARGET_FPS);
  pixelDensity(1);

  let input=document.getElementById("textInput");
  input.addEventListener("input", ()=>{
    currentText=input.value();
    resample();
  });

  recFlag=document.getElementById("recFlag");

  // ✅ 전역에서 S 키 받기
  window.addEventListener("keydown", (e)=>{
    if((e.key==="s"||e.key==="S") && !recording){
      startZipRecording();
    }
  });

  resample();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  resample();
}

/* -------------------------------------------
   DRAW
------------------------------------------- */
function draw(){
  if(seedLocked){ randomSeed(seedVal); noiseSeed(seedVal); }
  else { noiseSeed(millis()*0.001); }

  background(255,210,220);
  push(); translate(0,10);
  if(stylisticSet===1) drawThorny(pts);
  else drawPixel(pts);
  pop();

  drawHUD();

  // ✅ ZIP 녹화 중이면 PNG 저장
  if(recording){
    saveFrameToZip();
  }
}

/* -------------------------------------------
   Thorny 스타일
------------------------------------------- */
function normalAt(i,arr){
  const N=arr.length;
  const prev=arr[(i-1+N)%N], next=arr[(i+1)%N];
  const tx=next.x-prev.x, ty=next.y-prev.y;
  const len=Math.hypot(tx,ty);
  return {nx:-ty/len, ny:tx/len};
}

function drawThorny(ptsIn){
  noFill(); stroke(20); strokeWeight(2);

  for(let layer=0; layer<3; layer++){
    const jitter=layer*0.6;
    beginShape();
    ptsIn.forEach((p,i)=>{
      const {nx,ny}=normalAt(i,ptsIn);
      const n=noise(p.x*noiseFreq,p.y*noiseFreq,layer*0.1);
      const off=map(n,0,1,-noiseAmt,noiseAmt);
      const spike=(i%13===0)?noiseAmt*1.5:0;

      let x=p.x+(off+spike)*nx + random(-jitter,jitter);
      let y=p.y+(off+spike)*ny + random(-jitter,jitter);
      curveVertex(x,y);
    });
    endShape(CLOSE);
  }

  strokeWeight(1.6);
  for(let i=0;i<ptsIn.length;i+=11){
    const p=ptsIn[i];
    const s=3+noise(i*0.07)*3;
    push(); translate(p.x,p.y);
    rotate(noise(p.x*0.01,p.y*0.01)*TWO_PI);
    quad(-s,0,0,-s,s,0,0,s);
    pop();
  }
}

/* -------------------------------------------
   Pixel 스타일
------------------------------------------- */
function drawPixel(ptsIn){
  noFill(); stroke(10); strokeWeight(2);
  const q=ptsIn.map(p=>({
    x:Math.round(p.x/gridPix)*gridPix,
    y:Math.round(p.y/gridPix)*gridPix
  }));

  for(let t=0;t<5;t++){
    beginShape();
    q.forEach(p=>{
      const jx=(random()-0.5)*strokeStep;
      const jy=(random()-0.5)*strokeStep;
      vertex(p.x+jx, p.y+jy);
    });
    endShape(CLOSE);
  }

  strokeWeight(3.5);
  for(let i=0;i<q.length;i+=20){
    point(q[i].x, q[i].y);
  }
}

/* -------------------------------------------
   HUD
------------------------------------------- */
function drawHUD(){
  noStroke(); fill(20);
  textSize(13);
  textAlign(LEFT,TOP);
  text(
    `Text: "${currentText}" | Size ${fontSize}px | Style ${stylisticSet===1?'Thorny':'Pixel'}\n`+
    `noiseAmt ${noiseAmt} (↑↓) • grid ${gridPix}px (←→) • [ ] size • SPACE seed • S=ZIP`,
    14, height-52
  );
}

/* -------------------------------------------
   resample
------------------------------------------- */
function resample(){
  const raw=layoutTextPoints(currentText,fontSize);
  if(!raw.length){ pts=[]; return; }

  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  raw.forEach(p=>{
    minx=Math.min(minx,p.x);
    miny=Math.min(miny,p.y);
    maxx=Math.max(maxx,p.x);
    maxy=Math.max(maxy,p.y);
  });

  const w=maxx-minx, h=maxy-miny;
  const ox=width/2 - (w/2 + minx);
  const oy=height/2 - (h/2 + miny);

  pts=raw.map(p=>({x:p.x+ox, y:p.y+oy}));
}

/* -------------------------------------------
   ✅ ZIP Frame Recorder
------------------------------------------- */
function startZipRecording(){
  recording=true;
  savedFrames=0;
  zip=new JSZip();
  if(recFlag) recFlag.style.display="block";
  console.log("🎬 ZIP recording start");
}

function saveFrameToZip(){
  let dataURL = cnv.canvas.toDataURL("image/png");
  let base64 = dataURL.split(",")[1];

  zip.file(`frame_${nf(savedFrames,4)}.png`, base64, {base64:true});
  savedFrames++;

  if(savedFrames>=maxFrames){
    recording=false;
    finishZipDownload();
  }
}

function finishZipDownload(){
  console.log("🧮 generating ZIP...");
  zip.generateAsync({type:"blob"}).then(blob=>{
    saveAs(blob,"frames.zip");
    if(recFlag) recFlag.style.display="none";
    console.log("✅ ZIP saved");
  });
}

function saveAs(blob, filename){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(a.href);
    a.remove();
  },1000);
}
