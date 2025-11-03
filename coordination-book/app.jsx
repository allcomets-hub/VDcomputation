/* =========================================================
   Coordination Book (Local-Only)
   - Firebase/Storage 완전 제거
   - 사진/팔레트/스와치/이모지/메모
   - JSON 백업/불러오기
   - 프린트(스와치 북)
   - HEIC 변환 X, "양털" 타입 없음
   - 저장 후 스와치 고정(lock) 옵션 적용
   - SVG id 충돌 방지 (저장·미리보기·프린트 모두)
   ========================================================= */

/* ===== 공용 유틸 ===== */
const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const range = n => Array.from({length:n},(_,i)=>i);
const formatDateDMY = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

const dataUrlBytes = (dataUrl) => {
  const b64 = (dataUrl||'').split(",")[1] || "";
  return Math.floor(b64.length * 0.75);
};

/* ===== Tiny toast ===== */
(function setupToast() {
  if (document.getElementById("toast-root")) return;

  const root = document.createElement("div");
  root.id = "toast-root";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0 auto auto 0",
    left: 0,
    right: 0,
    top: "14px",
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 9999
  });
  document.body.appendChild(root);

  window.toast = function toast(message, { variant = "ok", duration = 1400 } = {}) {
    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, {
      pointerEvents: "auto",
      background: variant === "error" ? "#b91c1c" : variant === "info" ? "#334155" : "#111827",
      color: "white",
      padding: "10px 14px",
      borderRadius: "12px",
      boxShadow: "0 6px 20px rgba(0,0,0,.18)",
      fontSize: "14px",
      fontWeight: 500,
      letterSpacing: ".2px",
      transform: "translateY(-8px)",
      opacity: "0",
      transition: "all .18s ease",
      maxWidth: "80vw",
      whiteSpace: "pre-wrap"
    });
    root.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = "translateY(0)";
      el.style.opacity = "1";
    });
    setTimeout(() => {
      el.style.transform = "translateY(-8px)";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 200);
    }, duration);
  };
})();

/* ===== 안전한 localStorage 훅 ===== */
const LS_KEY = "coordination_book_v5";
function useLocalBook() {
  const [book, setBook] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(book));
    } catch (e) {
      console.warn("localStorage save failed:", e);
      // Safari 가끔 오류나는 케이스 재시도
      setTimeout(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(book)); }
        catch (err2) {
          alert("Failed to save. Please reduce image size or delete some records.");
        }
      }, 200);
    }
  }, [book]);

  const saveDay = React.useCallback((dayKey, data) => {
    setBook(prev => ({ ...prev, [dayKey]: data }));
  }, []);
  const deleteDay = React.useCallback((dayKey) => {
    setBook(prev => {
      const n = { ...prev };
      delete n[dayKey];
      return n;
    });
  }, []);
  const clearAll = React.useCallback(() => setBook({}), []);

  return [book, { saveDay, deleteDay, clearAll }];
}

/* ===== 달력 ===== */
function monthGrid(year,month){
  const first=new Date(year,month-1,1);
  const start=(first.getDay()+6)%7; // 월요일 시작
  const days=new Date(year,month,0).getDate();
  const cells=[];
  range(start).forEach(()=>cells.push(null));
  range(days).forEach(i=>cells.push(new Date(year,month-1,i+1)));
  while(cells.length%7!==0) cells.push(null);
  return cells;
}

/* ===== 색/팔레트 & 소재 추정 ===== */
const $work = (()=>{ // 숨김 캔버스 1개 재사용
  let c=null;
  return ()=>{
    if(!c){ c=document.createElement('canvas'); c.width=240; c.height=240; }
    return c;
  };
})();
const hexOf=({r,g,b})=>"#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const dist=(a,b)=>Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b);
const avg=list=>{
  const s=list.reduce((p,c)=>({r:p.r+c.r,g:p.g+c.g,b:p.b+c.b}),{r:0,g:0,b:0});
  const n=list.length||1; return {r:s.r/n,g:s.g/n,b:s.b/n};
};
function quantizeColorsFromImg(img,n=4){
  const c=$work(),ctx=c.getContext('2d',{willReadFrequently:true});
  const S=220;c.width=S;c.height=S;ctx.drawImage(img,0,0,S,S);
  const d=ctx.getImageData(0,0,S,S).data, pts=[];
  for(let i=0;i<d.length;i+=16){ if(d[i+3]<8) continue; pts.push({r:d[i],g:d[i+1],b:d[i+2]}); }
  const by=[...pts].sort((a,b)=>(a.r+a.g+a.b)-(b.r+b.g+b.b));
  const centers=[]; for(let i=0;i<n;i++) centers.push({...by[Math.floor(by.length*(i+0.5)/n)]});
  for(let it=0;it<10;it++){
    const buckets=Array.from({length:n},()=>[]);
    for(const p of pts){ let bi=0,best=1e9; for(let k=0;k<n;k++){const dd=dist(p,centers[k]); if(dd<best){best=dd;bi=k;}} buckets[bi].push(p); }
    for(let k=0;k<n;k++){ if(buckets[k].length) centers[k]=avg(buckets[k]); }
  }
  return centers.map(hexOf);
}
function channelVarianceOf(img){
  const c=$work(),ctx=c.getContext('2d',{willReadFrequently:true});
  const S=160;c.width=S;c.height=S;ctx.drawImage(img,0,0,S,S);
  const d=ctx.getImageData(0,0,S, S).data; let sr=0,sg=0,sb=0,n=0;
  for(let i=0;i<d.length;i+=4){sr+=d[i];sg+=d[i+1];sb+=d[i+2];n++;}
  const mr=sr/n,mg=sg/n,mb=sb/n; let v=0;
  for(let i=0;i<d.length;i+=4){ v+=(d[i]-mr)**2+(d[i+1]-mg)**2+(d[i+2]-mb)**2; }
  return v/n;
}
function guessMaterialFromImg(img){
  const c=$work(),ctx=c.getContext('2d',{willReadFrequently:true});
  const S=160;c.width=S;c.height=S;ctx.drawImage(img,0,0,S,S);
  const d=ctx.getImageData(0,0,S,S).data;
  let sx=0,sy=0,edges=0,n=0;
  const L=(x,y)=>{const i=(y*S+x)*4;return 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];};
  for(let y=1;y<S-1;y++){
    for(let x=1;x<S-1;x++){
      const Gx=(L(x+1,y-1)+2*L(x+1,y)+L(x+1,y+1))-(L(x-1,y-1)+2*L(x-1,y)+L(x-1,y+1));
      const Gy=(L(x-1,y+1)+2*L(x,y+1)+L(x+1,y+1))-(L(x-1,y-1)+2*L(x,y-1)+L(x+1,y-1));
      const m=Math.hypot(Gx,Gy);
      if(m>60){edges++;sx+=Gx;sy+=Gy;}
      n++;
    }
  }
  const edgeRatio=edges/n;
  const deg=Math.abs(Math.atan2(sy,sx)*180/Math.PI);
  if(edgeRatio<0.02) return "satin";
  if(edgeRatio>0.10){
    if(deg>30 && deg<60) return "twill";
    if(deg<15 || deg>75) return "rib";
    return "herringbone";
  }
  const rough=channelVarianceOf(img);
  return rough>1600 ? "leather" : "plain";
}

/* ===== 스와치 SVG들 (양털 없음) — idSeed로 고유화 ===== */
function swatchPlain(colors,strength,idSeed="x"){
  const [c1=colors[0]||"#d7d7d7", c2=colors[1]||"#bdbdbd"] = colors;
  const sid = (name) => `${name}-${idSeed}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="${sid("plain")}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="scale(${1+strength/80})">
      <rect width="12" height="12" fill="${c1}"/>
      <rect width="12" height="6" fill="${c2}" opacity=".25"/>
      <rect width="6" height="12" fill="${c2}" opacity=".25"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#${sid("plain")})"/>
</svg>`;
}
function swatchTwill(colors,strength,idSeed="x"){
  const [base=colors[0]||"#6e7ea0", hi=colors[1]||"#a8b6d1"] = colors;
  const sid = (name) => `${name}-${idSeed}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="${sid("twill")}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45) scale(${1+strength/75})">
      <rect width="16" height="16" fill="${base}"/>
      <rect width="8" height="16" fill="${hi}" opacity=".18"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#${sid("twill")})"/>
</svg>`;
}
function swatchRib(colors,strength,idSeed="x"){
  const [b=colors[0]||"#c9c9c9", hi=colors[1]||"#e8e8e8"] = colors;
  const sid = (name) => `${name}-${idSeed}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="${sid("rib")}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="scale(${1+strength/60})">
      <rect width="10" height="10" fill="${b}"/>
      <rect width="4" height="10" fill="${hi}" opacity=".35"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#${sid("rib")})"/>
</svg>`;
}
function swatchHerringbone(colors,strength,idSeed="x"){
  const [a=colors[0]||"#7b7b7b", b=colors[1]||"#9a9a9a"] = colors;
  const sid = (name) => `${name}-${idSeed}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="${sid("hb")}" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="scale(${1+strength/80})">
      <path d="M0 24 L12 12 L24 24" stroke="${a}" stroke-width="6" fill="none"/>
      <path d="M0 0 L12 12 L24 0" stroke="${b}" stroke-width="6" fill="none"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="${a}"/>
  <rect width="240" height="240" fill="url(#${sid("hb")})" opacity=".55"/>
</svg>`;
}
function swatchSatin(colors,strength,idSeed="x"){
  const [c=colors[0]||"#d2d2d2"]=colors;
  const sid = (name) => `${name}-${idSeed}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="${sid("sat")}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${c}"/>
      <stop offset="50%"  stop-color="#ffffff" stop-opacity="${.35+strength/300}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="url(#${sid("sat")})"/>
</svg>`;
}
function swatchLeather(colors,strength,idSeed="x"){
  const [c=colors[0]||"#6c4a3a"]=colors;
  const sid = (name) => `${name}-${idSeed}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="${sid("pebble")}">
      <feTurbulence type="fractalNoise" baseFrequency="${Math.max(0.2, .9-strength/120)}" numOctaves="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${6+strength/4}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <rect width="240" height="240" fill="${c}"/>
  <rect width="240" height="240" fill="${c}" filter="url(#${sid("pebble")})" opacity=".35"/>
</svg>`;
}
function swatchSequin(colors, strength) {
  // sequin은 filter/pattern id 사용 안 해서 충돌 없음
  const [bg = colors[0] || "#2a2a2a", shine = colors[1] || "#f8f4dc", sparkle = colors[2] || "#ffffff"] = colors;
  const count = 80 + Math.round(strength * 1.2);
  const circles = Array.from({ length: count }).map((_, i) => {
    const x = (Math.random() * 240).toFixed(1);
    const y = (Math.random() * 240).toFixed(1);
    const r = (2 + Math.random() * 3).toFixed(1);
    const op = (0.2 + Math.random() * 0.6).toFixed(2);
    const col = i % 3 === 0 ? sparkle : shine;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/>`;
  }).join("");
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="${bg}"/>
  ${circles}
</svg>`;
}
function makeSwatch(type,colors,strength,idSeed="x"){
  switch(type){
    case "plain": return swatchPlain(colors,strength,idSeed);
    case "twill": return swatchTwill(colors,strength,idSeed);
    case "rib": return swatchRib(colors,strength,idSeed);
    case "herringbone": return swatchHerringbone(colors,strength,idSeed);
    case "satin": return swatchSatin(colors,strength,idSeed);
    case "leather": return swatchLeather(colors,strength,idSeed);
    case "sequin": return swatchSequin(colors,strength);
    default: return swatchPlain(colors,strength,idSeed);
  }
}

/* ===== 기본 엔트리 ===== */
function emptyEntry(){
  return {
    notes:"", photo:null, moods:[],
    palette:null, manualColors:[],
    matType:"auto", strength:60,
    swatchSVG:null,
    swatchLocked:false // 저장 후 스와치가 마음대로 바뀌지 않도록 잠금
  };
}
const emojiOnly = s => s ? s.split(" ")[0] : "";

/* ===== 이미지 다운스케일 → JPEG dataURL ===== */
async function fileToDownscaledJPEG(file, maxW = 1200, quality = 0.85) {
  const img = await new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, maxW / Math.max(w, h));
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  const c = document.createElement("canvas");
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, outW, outH);

  const dataUrl = c.toDataURL("image/jpeg", quality);
  setTimeout(() => URL.revokeObjectURL(img.src), 1000);
  return dataUrl;
}

/* ===== App ===== */
function App(){
  const today=new Date();
  const [year,setYear]=React.useState(today.getFullYear());
  const [month,setMonth]=React.useState(today.getMonth()+1);
  const [book, api] = useLocalBook(); // 로컬 전용

  const [openDay,setOpenDay]=React.useState(null);
  const cells = React.useMemo(()=>monthGrid(year, month),[year, month]);

  // JSON 백업
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(book, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href:url, download:'coordination_book.json' });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    window.toast?.("Downloaded the backup JSON.");
  };
  // JSON 불러오기
  const importJSON = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error("Invalid JSON");
      // 매우 큰 dataURL이 많은 경우 경고
      let totalBytes = 0;
      Object.values(data).forEach(v => { if (v?.photo?.startsWith("data:")) totalBytes += dataUrlBytes(v.photo); });
      if (totalBytes > 3_500_000) { // 대략 3.5MB 이상
        alert("There are too many photos or they are too large. Some of them may not be saved.");
      }
      // 통으로 갈아끼우기
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      window.toast?.("JSON loaded. Refresh the page.", {variant:"info", duration:1800});
      setTimeout(()=>location.reload(), 600);
    } catch(e) {
      console.error(e);
      alert("Failed to load JSON.");
    }
  };

  // (과거 SVG 안전 출력용) id 치환
  function dedupeSvgIds(svg, key){
    if(!svg) return svg;
    const suf = String(key).replaceAll(/[^0-9A-Za-z]/g,'');
    return svg
      .replaceAll('id="plain"',        `id="plain-${suf}"`)
      .replaceAll('url(#plain)',       `url(#plain-${suf})`)
      .replaceAll('id="twill"',        `id="twill-${suf}"`)
      .replaceAll('url(#twill)',       `url(#twill-${suf})`)
      .replaceAll('id="rib"',          `id="rib-${suf}"`)
      .replaceAll('url(#rib)',         `url(#rib-${suf})`)
      .replaceAll('id="hb"',           `id="hb-${suf}"`)
      .replaceAll('url(#hb)',          `url(#hb-${suf})`)
      .replaceAll('id="sat"',          `id="sat-${suf}"`)
      .replaceAll('url(#sat)',         `url(#sat-${suf})`)
      .replaceAll('id="pebble"',       `id="pebble-${suf}"`)
      .replaceAll('url(#pebble)',      `url(#pebble-${suf})`);
  }

  // 스와치 북 프린트
  const printCollection = () => {
    const entries = Object.entries(book || {})
      .filter(([, v]) => v?.swatchSVG)
      .sort(([a], [b]) => a.localeCompare(b));

    const formatDMY = (value) => {
      const [y, m, d] = String(value).split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric"
      });
    };
    const dataObj = Object.fromEntries(
      entries.map(([k, v]) => ([
        k,
        {
          date: k,
          dateText: formatDMY(k),
          matType: v.matType || "-",
          colors: (v.manualColors?.length ? v.manualColors : (v.palette || [])),
          photo: v.photo || "",
          swatchSVG: v.swatchSVG || "",
          moods: (v.moods || []).map(m => m.split(" ")[0]),
          note: (v.notes || "")
        }
      ]))
    );

    const monthName = new Date(year, month - 1).toLocaleDateString("en-GB", { month: "long" });

    const items = entries.map(([k, v]) => {
      const fixedSVG = dedupeSvgIds(v.swatchSVG || "", k);
      const photo = v.photo ? `<img src="${v.photo}" class="photo" alt="photo"/>` : "";
      return `
        <div class="card" data-key="${k}">
          <div class="sw-wrap">
            <div class="sw">${fixedSVG}</div>
            <div class="date-on-swatch">${formatDMY(k)}</div>
          </div>
          ${photo}
        </div>
      `;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
     <meta name="viewport" content="width=device-width, initial-scale=1"/>
     <title>Swatch Collection</title>
     <style>
      :root{ --paper:#f7f3ee; --ink:#1b1b1b; --line:#e5e4e2;
        --font:"Apple SD Gothic Neo",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans KR",
        "Hiragino Kaku Gothic ProN","Malgun Gothic","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol",sans-serif; }
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:var(--paper);color:var(--ink);font-family:var(--font)}
      .wrap{max-width:1024px;margin:32px auto;padding:24px}
      .header{text-align:center;margin-bottom:20px;border-bottom:1px solid var(--line);padding-bottom:8px}
      .title-main{font-size:28px;font-weight:600}
      .subtle{color:#666;font-size:12px}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,7cm);gap:0.8cm;justify-content:center;align-items:start;margin-top:1cm}
      .card{width:7cm;height:12cm;background:#fff;border:0.05cm solid var(--line);border-radius:0.4cm;overflow:hidden;
            box-shadow:0 0.05cm 0.15cm rgba(0,0,0,.04);display:flex;flex-direction:column;cursor:pointer}
      .sw-wrap{position:relative;width:100%;height:7cm;overflow:hidden;background:#000}
      .sw{position:absolute;inset:0;width:100%;height:100%}
      .sw svg{width:100%;height:100%;display:block}
      .date-on-swatch{position:absolute;left:50%;top:0.45cm;transform:translateX(-50%);
        color:#fff;font-weight:700;font-size:0.46cm;text-shadow:0 1px 2px rgba(0,0,0,.45),0 0 12px rgba(0,0,0,.35)}
      .photo{width:100%;height:5cm;display:block;object-fit:cover;object-position:center;background:#eee}
      @page{ size:A3 portrait; margin:1.5cm; }
      @media print {
        html, body { width: 297mm; height: 420mm; transform: scale(1); transform-origin: top left; }
      }
     </style>
    </head><body>
      <div class="wrap">
        <div class="header">
          <div class="title-main">Fabric Swatch Collection</div>
          <div class="subtle">${monthName} · ${year}</div>
          <button id="printBtn" style="margin-top:8px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer">Print</button>
        </div>
        <div class="grid">${items || "<div class='subtle'>No swatches yet.</div>"}</div>
      </div>
      <script>
        document.getElementById('printBtn').addEventListener('click', function(){ window.print(); });
      </script>
    </body></html>`;

    const w = window.open("", "_blank");
    w.document.open(); w.document.write(html); w.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen bg-[#f7f3ee] text-[#1b1b1b] px-10 py-12 font-sans">
      {/* 헤더 */}
      <header className="flex items-end justify-between pb-4 mb-10 border-b border-stone-300/60">
        <h1 className="text-4xl sm:text-5xl leading-none tracking-tight font-semibold">
          {new Date(year, month-1).toLocaleDateString("en-GB",{ month:"long" })} <span className="font-semibold">{year}</span>
        </h1>
        <div className="flex gap-2 items-center">
          <button
            className="px-4 py-2 rounded-full border border-stone-400/80 text-[12px] tracking-wide hover:bg-[#1b1b1b] hover:text-white transition"
            onClick={()=>{ if(month===1){ setYear(y=>y-1); setMonth(12);} else setMonth(m=>m-1); }}
          >Prev</button>
          <button
            className="px-4 py-2 rounded-full border border-stone-400/80 text-[12px] tracking-wide hover:bg-[#1b1b1b] hover:text-white transition"
            onClick={()=>{ if(month===12){ setYear(y=>y+1); setMonth(1);} else setMonth(m=>m+1); }}
          >Next</button>

          <button
            className="ml-2 px-4 py-2 rounded-full border border-stone-400/80 text-[12px] tracking-wide hover:bg-[#1b1b1b] hover:text-white transition"
            onClick={printCollection}
          >View Swatch Book</button>

          {/* JSON 백업/불러오기 */}
          <button
            className="ml-2 px-4 py-2 rounded-full border border-stone-400/80 text-[12px] tracking-wide hover:bg-[#1b1b1b] hover:text-white transition"
            onClick={exportJSON}
          >Backup JSON</button>

          <label className="px-4 py-2 rounded-full border border-stone-400/80 text-[12px] tracking-wide hover:bg-[#1b1b1b] hover:text-white transition cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={e=>{
              const f = e.target.files?.[0]; if (f) importJSON(f);
              e.target.value = "";
            }}/>
          </label>

          <button
            className="px-4 py-2 rounded-full border border-red-200 text-red-700 text-[12px] tracking-wide hover:bg-red-50 transition"
            onClick={()=>{
              if (confirm("Would you like to reset all records? This action is irreversible.")) {
                api.clearAll();
                window.toast?.("All record deleted.", {variant:"info"});
              }
            }}
          >Clear All</button>
        </div>
      </header>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[11px] tracking-wide text-stone-500 mb-2 font-medium">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-3">
        {cells.map((date,i)=>{
          if(!date) return <div key={i} className="aspect-square bg-transparent" />;
          const key = ymd(date);
          const entry = (book || {})[key];
          const isToday = ymd(new Date())===key;

          return (
            <div
              key={i}
              onClick={()=>setOpenDay(key)}
              className={[
                "relative group aspect-square rounded-[22px] overflow-hidden cursor-pointer",
                "bg-white border border-stone-200/70 shadow-[0_1px_0_rgba(0,0,0,0.04)]",
                "hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-200"
              ].join(" ")}
            >
              <div className="absolute top-2 right-3 text-[11px] tracking-wide font-semibold text-stone-500">
                {date.getDate()}
              </div>

              {entry?.photo ? (
                <img
                  src={entry.photo}
                  alt=""
                  className="w-full h-full object-cover brightness-[0.96] group-hover:brightness-100 transition-all duration-200"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-stone-300 text-[12px] italic">
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1b1b1b]/70 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="text-white text-[12px] leading-tight font-light">
                    {entry?.moods?.slice(0,2).map((m,i)=><div key={i}>{emojiOnly(m)}</div>)}
                  </div>
                  <div className="flex gap-1">
                    {entry?.swatchSVG ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/90"></span> : null}
                    {entry?.photo ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/50"></span> : null}
                  </div>
                </div>
              </div>

              {isToday && (
                <div className="absolute inset-0 rounded-[22px] ring-2 ring-stone-900/35 pointer-events-none"></div>
              )}
            </div>
          );
        })}
      </div>

      {openDay && (
        <DetailPanel
          day={openDay}
          entry={book[openDay] || emptyEntry()}
          onClose={() => setOpenDay(null)}
          onSave={(localData) => {
            // 저장 시 스와치 잠금 옵션 유지
            api.saveDay(openDay, { ...localData });
            window.toast?.("Saved successfully!", {variant:"ok"});
          }}
          onDelete={() => {
            api.deleteDay(openDay);
            window.toast?.("Record deleted.", {variant:"info"});
            setOpenDay(null);
          }}
        />
      )}
    </div>
  );
}

/* ===== 상세 패널 ===== */
function DetailPanel({day,entry,onClose,onSave,onDelete}){
  const [local,setLocal]=React.useState(entry);
  const [matType,setMatType]=React.useState(entry.matType||"auto");
  const [strength,setStrength]=React.useState(entry.strength ?? 60);

  // 저장 후 스와치가 바뀌지 않게 잠금
  const [swatchLocked, setSwatchLocked] = React.useState(!!entry.swatchLocked);

  const MOODS=["😊 happiness","😌 cozy","💖 romantic","⚡ concentration","✨ inspiration","😴 tired","😡 anger", "😭 sad", "😔 loneliness", "🌞 sunny","☁️ cloudy","🌧️ rainy", "☃️ snowy"];

  const toggleMood=m=>setLocal(prev=>{
    const has=prev.moods?.includes(m);
    return {...prev,moods:has?prev.moods.filter(x=>x!==m):[...prev.moods||[],m]};
  });

  // 사진 업로드 → 팔레트 추출 (로컬 dataURL 저장)
  const onPhotoSelected = (rawFile) => {
    if (!rawFile) return;
    (async ()=>{
      try {
        const jpegData = await fileToDownscaledJPEG(rawFile, 700, 0.5);
        if (dataUrlBytes(jpegData) > 800_000) {
          alert("The photo size is large and may cause storage issues. Please use a smaller photo.");
        }

        const img = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => rej(new Error("Image load failed"));
          im.src = jpegData;
        });
        const palette = quantizeColorsFromImg(img, 4);

        // auto면 미리보기만(잠금이 아닐 때만) 생성
        let next = { ...local, photo: jpegData, palette };
        if (!swatchLocked && matType === "auto") {
          const t = guessMaterialFromImg(img);
          const colors = (next.manualColors?.length ? next.manualColors : palette) || palette;
          const svg = makeSwatch(t, colors, Number(strength), day);
          next = { ...next, matType: t, swatchSVG: svg };
          setMatType(t); // auto → 추정값으로 고정
        }
        setLocal(next);
        window.toast?.("The picture is reflected", {variant:"ok"});
      } catch (err) {
        console.error(err);
        alert("Image processing failure");
      }
    })();
  };

  // 수동 색상
  const addManualColor = ()=>{
    setLocal(prev=>{
      const arr=[...(prev.manualColors||[])];
      if(arr.length>=6) return prev;
      arr.push("#cccccc");
      // 잠금이 아니고 type 고정된 경우, 미리보기 갱신
      if(!swatchLocked && (matType!=="auto")){
        const svg=makeSwatch(matType, arr, Number(strength), day);
        return {...prev, manualColors:arr, swatchSVG:svg};
      }
      return {...prev, manualColors:arr};
    });
  };
  const changeManualColor = (idx, val)=>{
    setLocal(prev=>{
      const arr=[...(prev.manualColors||[])];
      arr[idx]=val;
      if(!swatchLocked && (matType!=="auto")){
        const colors = arr.length>0 ? arr : (prev.palette||[]);
        const svg = colors.length ? makeSwatch(matType, colors, Number(strength), day) : prev.swatchSVG;
        return {...prev, manualColors:arr, swatchSVG:svg};
      }
      return {...prev, manualColors:arr};
    });
  };
  const removeManualColor = (idx)=>{
    setLocal(prev=>{
      const arr=[...(prev.manualColors||[])];
      arr.splice(idx,1);
      if(!swatchLocked && (matType!=="auto")){
        const colors = arr.length>0 ? arr : (prev.palette||[]);
        const svg = colors.length ? makeSwatch(matType, colors, Number(strength), day) : prev.swatchSVG;
        return {...prev, manualColors:arr, swatchSVG:svg};
      }
      return {...prev, manualColors:arr};
    });
  };
  const clearManualColors = ()=>{
    setLocal(prev=>{
      const colors = prev.palette||[];
      if(!swatchLocked && (matType!=="auto")){
        const svg = colors.length ? makeSwatch(matType, colors, Number(strength), day) : null;
        return {...prev, manualColors:[], swatchSVG:svg};
      }
      return {...prev, manualColors:[]};
    });
  };

  // 타입/강도 변경 시: 잠금이 아닐 때만 즉시 미리보기
  React.useEffect(()=>{
    if (swatchLocked) return;
    const colors = (local.manualColors?.length>0 ? local.manualColors : local.palette);
    if(colors && matType!=="auto"){
      const svg=makeSwatch(matType, colors, Number(strength), day);
      setLocal(prev=>({...prev, swatchSVG:svg }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[matType,strength]);

  // 스와치 생성 버튼 (이때 잠금 켬)
  const generateSwatch=()=>{
    const colors = (local.manualColors?.length>0 ? local.manualColors : local.palette) || ["#d0d0d0","#a0a0a0","#808080","#e5e5e5"];
    let type=matType;
    if(type==="auto"){
      if(!local.photo){ alert("Upload a photo"); return; }
      const img=new Image();
      img.onload=()=>{
        type=guessMaterialFromImg(img);
        const svg=makeSwatch(type, colors, Number(strength), day);
        setMatType(type);
        setLocal(prev=>({...prev, matType:type, swatchSVG:svg }));
        setSwatchLocked(true);
        window.toast?.("Created and fixed a swatch.", {variant:"ok"});
      };
      img.src=local.photo;
      return;
    }
    const svg=makeSwatch(type, colors, Number(strength), day);
    setLocal(prev=>({...prev, swatchSVG:svg }));
    setSwatchLocked(true);
    window.toast?.("Created and fixed a swatch.", {variant:"ok"});
  };

  // 잠금 해제
  const unlockSwatch = ()=>{
    setSwatchLocked(false);
    window.toast?.("The swatch has been unlocked. It can be changed again if you edit it.", {variant:"info"});
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-xl bg-white p-6 overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-stone-500">{formatDateDMY(day)}</div>
            <h3 className="text-xl font-semibold">Today's record</h3>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-xl border"
              onClick={()=>onSave({ ...local, matType, strength, swatchLocked })}
            >Save</button>
            <button className="px-3 py-2 rounded-xl bg-stone-900 text-white" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* 메모 */}
          <section>
            <label className="block text-sm font-medium mb-2">Note</label>
            <textarea rows={4}
              className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-stone-300"
              value={local.notes||""}
              onChange={e=>setLocal({...local, notes:e.target.value})}
              placeholder="ex: It’s date day! I wanna look pretty today!"/>
          </section>

          {/* 이모지 */}
          <section>
            <h4 className="text-sm font-medium mb-2">Emoji</h4>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m=>(
                <button key={m}
                  className={`px-3 py-2 rounded-xl text-sm ${local.moods?.includes(m)?'bg-stone-900 text-white':'border hover:bg-stone-50'}`}
                  onClick={()=>toggleMood(m)}>{m}</button>
              ))}
            </div>
          </section>

          {/* 사진 */}
          <section>
            <h4 className="text-sm font-medium mb-2">OOTD</h4>
            {local.photo ? (
              <img src={local.photo} alt="outfit" className="w-full rounded-xl border object-cover" />
            ) : null}
            <label className="inline-flex items-center gap-2 mt-3 px-4 py-2 border rounded-xl cursor-pointer hover:bg-stone-50">
              <span>{local.photo ? "Upload Again" : "Choose File"}</span>
              <span className="text-sm text-stone-500">{local.photo ? "File selected" : "No file chosen"}</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={e=>{ const f=e.target.files?.[0]; if(f) onPhotoSelected(f); e.target.value=""; }}
              />
            </label>
            <div className="text-xs text-stone-500 mt-1">* Except for HEIC. Change the iPhone camera settings to JPEG.</div>
          </section>

          {/* 스와치 */}
          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Swatch</h4>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-xl border hover:bg-stone-50" onClick={addManualColor}>+ manual color</button>
                <button className="px-3 py-2 rounded-xl border hover:bg-stone-50" onClick={clearManualColors}>reset manual color</button>
              </div>
            </div>

            {/* 자동 팔레트 미리보기 */}
            <div className="mt-3">
              <div className="text-xs text-stone-500 mb-1">automatic color extraction palette</div>
              <div className="flex gap-1">
                {(local.palette||[]).map((c,i)=>
                  <span key={i} className="inline-block w-4 h-4 rounded border" style={{background:c}} title={c}/>
                )}
              </div>
            </div>

            {/* 수동 색상 피커 */}
            <div className="mt-3">
              <div className="text-xs text-stone-500 mb-1">color picker (takes priority if set)</div>
              <div className="flex flex-wrap gap-2">
                {(local.manualColors||[]).map((c,i)=>(
                  <div key={i} className="flex items-center gap-1">
                    <label style={{width:28,height:28,borderRadius:8,border:'1px solid rgba(0,0,0,.1)',overflow:'hidden'}}>
                      <input type="color" value={c}
                        onChange={e=>changeManualColor(i,e.target.value)}
                        style={{appearance:'none',border:'none',padding:0,width:28,height:28,background:'none'}}/>
                    </label>
                    <button className="px-2 py-1 text-xs border rounded-lg hover:bg-stone-50" onClick={()=>removeManualColor(i)}>삭제</button>
                  </div>
                ))}
                {(!local.manualColors || local.manualColors.length===0) && (
                  <div className="text-xs text-stone-400">If no manual color is selected, the photo-based palette will be applied.</div>
                )}
              </div>
            </div>
          </section>

          {/* 소재 스와치 생성 */}
          <section>
            <div className="flex items-center gap-2">
              <select value={matType} onChange={e=>setMatType(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                <option value="auto">auto</option>
                <option value="plain">plain</option>
                <option value="twill">twill/denim</option>
                <option value="rib">rib knit</option>
                <option value="herringbone">herringbone</option>
                <option value="satin">satin/silk</option>
                <option value="leather">leather</option>
                <option value="sequin">sequin</option>
              </select>
              <input type="range" min="0" max="100" value={strength}
                onChange={e=>setStrength(e.target.value)} className="w-32"/>
              <button className="px-3 py-2 rounded-xl border hover:bg-stone-50" onClick={generateSwatch}>
                create a swatch
              </button>

              {swatchLocked ? (
                <button className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800"
                        onClick={unlockSwatch}>unlock</button>
              ) : (
                <span className="text-xs text-stone-500"></span>
              )}
            </div>

            <div className="mt-3">
              <div className="rounded-xl border overflow-hidden" style={{aspectRatio:"1/1", background:'#fafafa'}}>
                {local.swatchSVG
                  ? <div dangerouslySetInnerHTML={{__html: local.swatchSVG}}/>
                  : <div className="w-full h-full text-stone-400 flex items-center justify-center">Select a photo or color to create a swatch.</div>}
              </div>
            </div>
          </section>

          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50" onClick={onDelete}>
              Reset record
            </button>
          </div>
        </div>
      </div>

      <button className="absolute right-[max(24rem,40%)] top-4 bg-white p-2 rounded-xl shadow" onClick={onClose}>✕</button>
    </div>
  );
}

/* ===== 에러 바운더리 및 부트스트랩 ===== */
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { error: null }; }
  static getDerivedStateFromError(err){ return { error: err }; }
  render(){
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <b>Render error</b><br />
            An error may have occurred due to saved data or images.
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-2 border rounded-lg" onClick={()=>location.reload()}>
                Refresh
              </button>
              <button
                className="px-3 py-2 border rounded-lg"
                onClick={() => { localStorage.removeItem("coordination_book_v5"); location.reload(); }}>
                Clear local data
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);