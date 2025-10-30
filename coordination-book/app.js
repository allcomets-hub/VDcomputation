// ===== 색 도우미 =====
function rgbToHex(r,g,b){return "#"+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,"0")).join("");}
function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];}
function satOf(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mx===0?0:(mx-mn)/mx;}
function lumOf(r,g,b){return 0.2126*r+0.7152*g+0.0722*b;}
function shade(hex,amt=0.12){const [r,g,b]=hexToRgb(hex);return rgbToHex(r*(1-amt),g*(1-amt),b*(1-amt));}
function lighten(hex,amt=0.25){const [r,g,b]=hexToRgb(hex);return rgbToHex(r+(255-r)*amt,g+(255-g)*amt,b+(255-b)*amt);}

// ===== 상/하 색 추출 (배경/저채도 제외) =====
async function extractTopBottomColors(dataURL, strength=65){
  const img = await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=dataURL;});
  const size=160, c=document.createElement("canvas"); c.width=size; c.height=size;
  const g=c.getContext("2d",{willReadFrequently:true}); g.drawImage(img,0,0,size,size);
  const {data}=g.getImageData(0,0,size,size);

  const cx0=Math.floor(size*0.18), cx1=Math.floor(size*0.82);
  const cy0=Math.floor(size*0.12), cyMid=Math.floor(size*0.50), cy1=Math.floor(size*0.88);

  function avgBorder(){
    let sr=0,sg=0,sb=0,n=0;
    for(let x=0;x<size;x++){ // 위/아래
      let i1=(0*size+x)*4, i2=((size-1)*size+x)*4;
      sr+=data[i1]; sg+=data[i1+1]; sb+=data[i1+2]; n++;
      sr+=data[i2]; sg+=data[i2+1]; sb+=data[i2+2]; n++;
    }
    for(let y=0;y<size;y++){ // 좌/우
      let i1=(y*size+0)*4, i2=(y*size+(size-1))*4;
      sr+=data[i1]; sg+=data[i1+1]; sb+=data[i1+2]; n++;
      sr+=data[i2]; sg+=data[i2+1]; sb+=data[i2+2]; n++;
    }
    return [sr/n,sg/n,sb/n];
  }
  const [br,bg,bB]=avgBorder();

  const bgDist=40+(strength*0.4);
  const minSat=0.10+(strength*0.004);
  const maxLum=250;

  function buildHist(yStart,yEnd){
    const bins=new Map();
    for(let y=yStart;y<yEnd;y++){
      for(let x=cx0;x<cx1;x++){
        const i=(y*size+x)*4;
        const r=data[i], g_=data[i+1], b=data[i+2], a=data[i+3];
        if(a<8) continue;
        const dist=Math.hypot(r-br,g_-bg,b-bB), sat=satOf(r,g_,b), lum=lumOf(r,g_,b);
        if(dist<bgDist || sat<minSat || lum>maxLum) continue;
        const R=r>>4,G=g_>>4,B=b>>4, key=(R<<8)|(G<<4)|B;
        bins.set(key,(bins.get(key)||0)+1);
      }
    }
    return bins;
  }

  const topBins=buildHist(cy0,cyMid), botBins=buildHist(cyMid,cy1);

  function pick(bins, fallback="#cccccc"){
    if(bins.size===0) return fallback;
    const arr=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    const scored=arr.map(([k,cnt])=>{
      const R=((k>>8)&0xF)*17, G=((k>>4)&0xF)*17, B=(k&0xF)*17;
      const s=satOf(R,G,B), l=lumOf(R,G,B);
      const score=(1+s)*(0.5+Math.exp(-Math.abs(l-140)/38))*(1+Math.log(1+cnt));
      return {hex:rgbToHex(R,G,B), score};
    }).sort((a,b)=>b.score-a.score);
    return scored[0].hex;
  }

  const top=pick(topBins,"#d7d7d7");
  const bottom=pick(botBins,"#bdbdbd");

  let accent="#999999";
  if(botBins.size>1){
    const k=[...botBins.entries()].sort((a,b)=>b[1]-a[1])[1][0];
    const R=((k>>8)&0xF)*17, G=((k>>4)&0xF)*17, B=(k&0xF)*17;
    accent=rgbToHex(R,G,B);
  }
  return {top:top, bottom:bottom, accent:accent};
}

// ===== 아바타 SVG =====
function makeCuteAvatarSVG({top="#ffd5dc", bottom="#8fb1ff", accent="#444"}){
  const skin="#F2D4BE", hair="#3A2A1B";
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="100%" height="100%">',
    '<defs>',
      `<linearGradient id="gTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${shade(top,0.12)}"/></linearGradient>`,
      `<linearGradient id="gBot" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bottom}"/><stop offset="100%" stop-color="${shade(bottom,0.12)}"/></linearGradient>`,
    '</defs>',
    '<rect width="300" height="400" fill="#fff"/>',
    `<g><path d="M120,260 C110,320 90,360 90,360 L210,360 C210,360 190,320 180,260 Z" fill="url(#gBot)"/>`,
      `<rect x="120" y="360" width="20" height="16" rx="4" fill="${accent}"/>`,
      `<rect x="160" y="360" width="20" height="16" rx="4" fill="${accent}"/></g>`,
    `<g><path d="M100,185 C90,190 85,205 85,220 C85,245 115,250 150,250 C185,250 215,245 215,220 C215,205 210,190 200,185 C190,180 175,178 150,178 C125,178 110,180 100,185 Z" fill="url(#gTop)"/>`,
      `<path d="M145,178 L155,178 L150,190 Z" fill="${lighten(accent,0.5)}" opacity=".8"/>`,
      `<circle cx="150" cy="205" r="2.7" fill="${accent}" opacity=".6"/>`,
      `<circle cx="150" cy="218" r="2.7" fill="${accent}" opacity=".6"/>`,
      `<circle cx="150" cy="231" r="2.7" fill="${accent}" opacity=".6"/></g>`,
    `<g fill="${skin}"><path d="M90,210 C78,220 78,240 88,250 C98,260 112,255 115,242 C118,229 102,200 90,210 Z"/>`,
      `<path d="M210,210 C222,220 222,240 212,250 C202,260 188,255 185,242 C182,229 198,200 210,210 Z"/></g>`,
    `<rect x="140" y="165" width="20" height="18" rx="6" fill="${skin}"/>`,
    `<g><circle cx="150" cy="140" r="36" fill="${skin}"/>`,
      `<ellipse cx="138" cy="140" rx="4.2" ry="5" fill="#222"/>`,
      `<ellipse cx="162" cy="140" rx="4.2" ry="5" fill="#222"/>`,
      `<circle cx="130" cy="150" r="6" fill="#ffb4c6" opacity="0.4"/>`,
      `<circle cx="170" cy="150" r="6" fill="#ffb4c6" opacity="0.4"/>`,
      `<path d="M138,158 Q150,166 162,158" fill="none" stroke="#c04" stroke-width="2" stroke-linecap="round"/></g>`,
    `<g fill="${hair}"><path d="M110,137 C110,104 125,90 150,90 C175,90 190,104 190,137 C190,150 178,170 165,170 L135,170 C122,170 110,150 110,137 Z"/>`,
      `<path d="M120,120 C132,110 140,110 150,118 C160,110 168,110 180,120 L180,130 C168,122 160,124 150,130 C140,124 132,122 120,130 Z" opacity="0.95"/></g>`,
    '</svg>'
  ].join('');
}

// ===== 프린트 =====
function openPrint({svg, colors}){
  const chips = [
    '<div style="margin:8px 0 14px 0;font:12px/1.4 system-ui">',
    `<span class="chip" style="background:${colors.top}"></span>Top`,
    `<span class="chip" style="background:${colors.bottom};margin-left:12px"></span>Bottom`,
    `<span class="chip" style="background:${colors.accent};margin-left:12px"></span>Accent`,
    '</div>'
  ].join('');

  const html = [
    '<!doctype html><html><head><meta charset="utf-8"/>',
    '<style>@page{margin:16mm}body{font-family:system-ui;margin:0}.wrap{max-width:680px;margin:10mm auto}.box{width:100%;aspect-ratio:3/4;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.box svg{width:100%;height:100%;display:block}.noprint{margin-top:14px}@media print{.noprint{display:none}}.chip{width:14px;height:14px;border-radius:3px;display:inline-block;margin-right:6px;border:1px solid rgba(0,0,0,.08)}</style></head>',
    '<body><div class="wrap"><h2>OOTD Avatar</h2>', chips,
    '<div class="box">', svg, '</div>',
    '<div class="noprint"><button onclick="window.print()">인쇄</button></div>',
    '</div></body></html>'
  ].join('');

  const w = window.open('', '_blank');
  w.document.open(); w.document.write(html); w.document.close();
}

// ===== DOM 바인딩 =====
const $file = document.getElementById('file');
const $thumb = document.getElementById('thumb');
const $avatar = document.getElementById('avatar');
const $chips = document.getElementById('chips');
const $strength = document.getElementById('strength');
const $printBtn = document.getElementById('printBtn');

let lastSVG=null, lastColors=null, lastDataURL=null;

$file.addEventListener('change', async (e)=>{
  const f=e.target.files && e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=async ()=>{
    lastDataURL=r.result;

    // 썸네일
    $thumb.innerHTML='';
    const img=new Image(); img.src=lastDataURL; img.className="w-full h-full object-cover";
    $thumb.appendChild(img);

    // 색 추출 → 아바타 생성
    const colors=await extractTopBottomColors(lastDataURL, Number($strength.value));
    lastColors=colors;

    // 칩 표시
    $chips.innerHTML=[
      '<div class="text-sm">',
      `<span class="chip" style="background:${colors.top}"></span><b>Top</b> ${colors.top}`,
      `<span class="chip" style="background:${colors.bottom};margin-left:10px"></span><b>Bottom</b> ${colors.bottom}`,
      `<span class="chip" style="background:${colors.accent};margin-left:10px"></span><b>Accent</b> ${colors.accent}`,
      '</div>'
    ].join('');

    // 아바타
    const svg=makeCuteAvatarSVG(colors);
    lastSVG=svg; $avatar.innerHTML=svg;
    $avatar.classList.remove('text-stone-400');
    $printBtn.disabled=false;
  };
  r.readAsDataURL(f);
});

$strength.addEventListener('input', async ()=>{
  if(!lastDataURL) return;
  const colors=await extractTopBottomColors(lastDataURL, Number($strength.value));
  lastColors=colors;
  const svg=makeCuteAvatarSVG(colors);
  lastSVG=svg; $avatar.innerHTML=svg;
  $chips.innerHTML=[
    '<div class="text-sm">',
    `<span class="chip" style="background:${colors.top}"></span><b>Top</b> ${colors.top}`,
    `<span class="chip" style="background:${colors.bottom};margin-left:10px"></span><b>Bottom</b> ${colors.bottom}`,
    `<span class="chip" style="background:${colors.accent};margin-left:10px"></span><b>Accent</b> ${colors.accent}`,
    '</div>'
  ].join('');
});

$printBtn.addEventListener('click', ()=>{
  if(lastSVG && lastColors) openPrint({svg:lastSVG, colors:lastColors});
});
