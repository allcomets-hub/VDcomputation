/*  Custom Vector Font Engine (no .otf/.ttf needed)
    - Bitmap-like 5x7 master glyphs → marching squares → clean vector outlines
    - Real-time typing, size & style toggles
    Controls:
      1 / 2 : Stylistic set (Thorny / Pixel)
      [ / ] : Font size -/+
      ↑ / ↓ : Thorny noise amount
      ← / → : Pixel grid size
      SPACE : lock/unlock random seed
*/

let stylisticSet = 1;   // 1: Thorny, 2: Pixel
let fontSize = 160;
let noiseAmt = 12, noiseFreq = 0.018;  // SS01
let gridPix = 4, strokeStep = 1.0;     // SS02
let seedLocked = false, seedVal = 12345;

let pts = [];               // all points for current string
let currentText = "DREAMER TM 2025";

// 5x7 bitmap master ('.' empty, '#' filled). Uppercase + digits.
const GLYPHS = {
  "A":[
    ".###.",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  "B":[
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#...#",
    "#...#",
    "####.",
  ],
  "C":[
    ".####",
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    ".####",
  ],
  "D":[
    "####.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "####.",
  ],
  "E":[
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#####",
  ],
  "F":[
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  "G":[
    ".####",
    "#....",
    "#....",
    "#.###",
    "#...#",
    "#...#",
    ".###.",
  ],
  "H":[
    "#...#",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  "I":[
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "#####",
  ],
  "J":[
    "#####",
    "...#.",
    "...#.",
    "...#.",
    "...#.",
    "#..#.",
    ".##..",
  ],
  "K":[
    "#...#",
    "#..#.",
    "#.#..",
    "##...",
    "#.#..",
    "#..#.",
    "#...#",
  ],
  "L":[
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#####",
  ],
  "M":[
    "#...#",
    "##.##",
    "#.#.#",
    "#.#.#",
    "#...#",
    "#...#",
    "#...#",
  ],
  "N":[
    "#...#",
    "##..#",
    "#.#.#",
    "#..##",
    "#...#",
    "#...#",
    "#...#",
  ],
  "O":[
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  "P":[
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  "Q":[
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#..#.",
    ".##.#",
  ],
  "R":[
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#.#..",
    "#..#.",
    "#...#",
  ],
  "S":[
    ".####",
    "#....",
    "#....",
    ".###.",
    "....#",
    "....#",
    "####.",
  ],
  "T":[
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  "U":[
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  "V":[
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".#.#.",
    "..#..",
  ],
  "W":[
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#.#.#",
    "##.##",
    "#...#",
  ],
  "X":[
    "#...#",
    ".#.#.",
    "..#..",
    "..#..",
    "..#..",
    ".#.#.",
    "#...#",
  ],
  "Y":[
    "#...#",
    ".#.#.",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  "Z":[
    "#####",
    "....#",
    "...#.",
    "..#..",
    ".#...",
    "#....",
    "#####",
  ],
  "0":[
    ".###.",
    "#..##",
    "#.#.#",
    "#.#.#",
    "##..#",
    "#...#",
    ".###.",
  ],
  "1":[
    "..#..",
    ".##..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "#####",
  ],
  "2":[
    ".###.",
    "#...#",
    "....#",
    "...#.",
    "..#..",
    ".#...",
    "#####",
  ],
  "3":[
    "#####",
    "....#",
    "...#.",
    "..##.",
    "....#",
    "#...#",
    ".###.",
  ],
  "4":[
    "...#.",
    "..##.",
    ".#.#.",
    "#..#.",
    "#####",
    "...#.",
    "...#.",
  ],
  "5":[
    "#####",
    "#....",
    "####.",
    "....#",
    "....#",
    "#...#",
    ".###.",
  ],
  "6":[
    ".###.",
    "#....",
    "####.",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  "7":[
    "#####",
    "....#",
    "...#.",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  "8":[
    ".###.",
    "#...#",
    "#...#",
    ".###.",
    "#...#",
    "#...#",
    ".###.",
  ],
  "9":[
    ".###.",
    "#...#",
    "#...#",
    ".####",
    "....#",
    "....#",
    ".###.",
  ],
  " ":[
    ".....",".....",".....",".....",".....",".....","....."
  ]
};

// convert 5x7 pattern to polygon contours via edge-graph
function patternToContours(pattern){
  const rows = pattern.length, cols = pattern[0].length;
  const cell = (r,c)=> (r>=0&&r<rows&&c>=0&&c<cols) ? (pattern[r][c]==="#") : false;
  const edges = []; // each edge: [x1,y1,x2,y2] in grid coords

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(!cell(r,c)) continue;

      // 4 neighbors: top,left,right,bottom. If neighbor is empty, add that edge.
      if(!cell(r-1,c)) edges.push([c, r, c+1, r]);       // top
      if(!cell(r,c+1)) edges.push([c+1, r, c+1, r+1]);   // right
      if(!cell(r+1,c)) edges.push([c+1, r+1, c, r+1]);   // bottom
      if(!cell(r,c-1)) edges.push([c, r+1, c, r]);       // left
    }
  }

  // Build adjacency map
  const key = (x,y)=>`${x},${y}`;
  const adj = new Map();
  function addAdj(a,b){
    if(!adj.has(a)) adj.set(a,[]);
    adj.get(a).push(b);
  }
  edges.forEach(([x1,y1,x2,y2])=>{
    const a=key(x1,y1), b=key(x2,y2);
    addAdj(a,b); addAdj(b,a);
  });

  // Trace closed loops
  const used = new Set();
  const contours = [];

  for(const [x1,y1,x2,y2] of edges){
    const start = key(x1,y1), next = key(x2,y2);
    const edgeKey = `${start}->${next}`;
    if(used.has(edgeKey)) continue;

    // walk
    const poly = [[x1,y1]];
    let cur = start, prev = null;

    while(true){
      const nbrs = (adj.get(cur)||[]).slice();
      // deterministic turn-left-ish: sort by angle relative to prev
      const [cx,cy] = cur.split(",").map(Number);
      nbrs.sort((A,B)=>{
        const [ax,ay]=A.split(",").map(Number);
        const [bx,by]=B.split(",").map(Number);
        const va = Math.atan2(ay-cy, ax-cx);
        const vb = Math.atan2(by-cy, bx-cx);
        return va - vb;
      });

      // choose neighbor not equal to prev and edge unused
      let chosen = null;
      for(const nb of nbrs){
        if(nb===prev) continue;
        const ek=`${cur}->${nb}`;
        if(used.has(ek)) continue;
        chosen = nb;
        used.add(ek);
        used.add(`${nb}->${cur}`);
        break;
      }
      if(!chosen) break;

      const [nx,ny] = chosen.split(",").map(Number);
      poly.push([nx,ny]);

      prev = cur; cur = chosen;
      if(cur===start) break;
    }

    if(poly.length>=3) contours.push(poly);
  }

  return contours;
}

// resample contour polyline to dense points
function contourToPoints(poly, scale, ox, oy, step=0.35){
  const pts=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    const ax=a[0]*scale+ox, ay=a[1]*scale+oy;
    const bx=b[0]*scale+ox, by=b[1]*scale+oy;
    const dx=bx-ax, dy=by-ay;
    const len=Math.hypot(dx,dy);
    const n=max(2, Math.ceil(len/step));
    for(let t=0;t<n;t++){
      const u=t/(n-1);
      pts.push({x:ax+dx*u, y:ay+dy*u});
    }
  }
  return pts;
}

function buildGlyphPoints(ch, size){
  const pat = GLYPHS[ch] || GLYPHS[" "];
  const contours = patternToContours(pat);
  // scale so that one column width ~= size/5 (5 cols in master)
  const cell = size/6;  // a bit of side bearing
  const scale = cell;
  const width = (pat[0].length+1)*cell; // advance
  const height = (pat.length+1)*cell;

  // baseline align (0,0 at top-left); we'll place later
  const ptsLocal=[];
  const ox=0, oy=0;
  for(const poly of contours){
    const p = contourToPoints(poly, scale, ox, oy, 0.35);
    ptsLocal.push(...p);
  }
  return { points: ptsLocal, advance: width, box:{w:width,h:height} };
}

function layoutTextPoints(str, size){
  let x=0, y=0;
  const out=[];
  const lineH = size*1.4;
  const spacing = size*0.16;

  for(const chRaw of str){
    const ch = chRaw.toUpperCase(); // master is uppercase
    if(ch === "\n"){ x=0; y+=lineH; continue; }
    const g = buildGlyphPoints(ch, size);
    // center baseline later; here accumulate with spacing
    for(const p of g.points){
      out.push({x:p.x + x, y:p.y + y});
    }
    x += g.advance + spacing;
  }
  return out;
}

/* ---------- p5 lifecycle ---------- */
function setup(){
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  const el = document.getElementById('textInput');
  el.addEventListener('input', ()=>{
    currentText = el.value || "";
    resample();
  });

  resample();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  resample();
}

function keyPressed(){
  if (key === '1') stylisticSet = 1;
  if (key === '2') stylisticSet = 2;
  if (key === '[') { fontSize = max(30, fontSize-8); resample(); }
  if (key === ']') { fontSize += 8; resample(); }
  if (keyCode === UP_ARROW)   noiseAmt += 1;
  if (keyCode === DOWN_ARROW) noiseAmt = max(0, noiseAmt-1);
  if (keyCode === LEFT_ARROW) gridPix = max(2, gridPix-1);
  if (keyCode === RIGHT_ARROW) gridPix += 1;
  if (key === ' ') seedLocked = !seedLocked;
}

function resample(){
  // center the whole string
  const tmp = layoutTextPoints(currentText, fontSize);
  if(tmp.length===0){ pts=[]; return; }

  // bounds
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  for(const p of tmp){
    if(p.x<minx)minx=p.x; if(p.y<miny)miny=p.y;
    if(p.x>maxx)maxx=p.x; if(p.y>maxy)maxy=p.y;
  }
  const w=maxx-minx, h=maxy-miny;

  const ox = width/2 - (w/2 + minx);
  const oy = height/2 - (h/2 + miny);

  pts = tmp.map(p=>({x:p.x+ox, y:p.y+oy}));
}

function draw(){
  if(seedLocked){ randomSeed(seedVal); noiseSeed(seedVal); }
  else noiseSeed(millis()*0.001);

  background(255,210,220);

  push();
  translate(0, 10);
  if(stylisticSet===1) drawThorny(pts);
  else                 drawPixel(pts);
  pop();

  drawHUD();
}

/* ---------- style: Thorny / Stitch ---------- */
function normalAt(i, arr){
  const N=arr.length;
  const prev=arr[(i-1+N)%N], next=arr[(i+1)%N];
  const tx=next.x - prev.x, ty=next.y - prev.y;
  const len=max(1e-6, Math.hypot(tx,ty));
  return { nx:-ty/len, ny:tx/len };
}

function drawThorny(ptsIn){
  if(!ptsIn.length) return;
  noFill(); stroke(20); strokeWeight(2);

  const layers = 3;
  for(let k=0;k<layers;k++){
    const jitter = k*0.6;
    beginShape();
    for(let i=0;i<ptsIn.length;i++){
      const p=ptsIn[i];
      const {nx,ny}=normalAt(i, ptsIn);
      const n=noise(p.x*noiseFreq, p.y*noiseFreq, k*0.13);
      const off=map(n,0,1,-noiseAmt,noiseAmt);
      const spike=(i%13===0)? noiseAmt*1.5 : 0;

      const x=p.x + (off+spike)*nx + random(-jitter, jitter);
      const y=p.y + (off+spike)*ny + random(-jitter, jitter);
      curveVertex(x,y);
    }
    endShape(CLOSE);
  }

  // small stitch diamonds
  strokeWeight(1.3);
  for(let i=0;i<ptsIn.length;i+=11){
    const p=ptsIn[i];
    const s=3 + noise(i*0.07)*3;
    push();
    translate(p.x, p.y);
    rotate(noise(p.x*0.01, p.y*0.01)*TWO_PI);
    quad(-s,0, 0,-s, s,0, 0,s);
    pop();
  }
}

/* ---------- style: Pixel / Jaggy ---------- */
function drawPixel(ptsIn){
  if(!ptsIn.length) return;
  noFill(); stroke(10); strokeWeight(2);

  // snap to pixel grid
  const q = ptsIn.map(p=>({
    x: Math.round(p.x/gridPix)*gridPix,
    y: Math.round(p.y/gridPix)*gridPix
  }));

  for(let t=0;t<5;t++){
    beginShape();
    for(let i=0;i<q.length;i++){
      const p=q[i];
      const jx=(random()-0.5)*strokeStep;
      const jy=(random()-0.5)*strokeStep;
      vertex(p.x + jx, p.y + jy);
    }
    endShape(CLOSE);
  }

  strokeWeight(3.5);
  for(let i=0;i<q.length;i+=20) point(q[i].x, q[i].y);
}

/* ---------- HUD ---------- */
function drawHUD(){
  noStroke(); fill(20);
  textSize(13); textAlign(LEFT, TOP);
  text(
    `Text: "${currentText || "(empty)"}"  |  Size ${fontSize}px  |  Set ${stylisticSet===1?"Thorny":"Pixel"}\n`+
    `SS01 noiseAmt ${noiseAmt} (↑/↓) • SS02 grid ${gridPix}px (←/→) • [ / ] size • SPACE seed`,
    14, height-52
  );
}