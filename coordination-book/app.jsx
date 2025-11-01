/* ===== 유틸 ===== */
const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const range = n => Array.from({length:n},(_,i)=>i);

// ✅ [여기에 아래 코드 추가]
const dataUrlBytes = (dataUrl) => {
  const b64 = dataUrl.split(",")[1] || "";
  return Math.floor(b64.length * 0.75);
};

async function fileToDownscaledJPEG(file, maxW = 1024, quality = 0.8) {
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
  URL.revokeObjectURL(img.src);
  return dataUrl;
}


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

// ===[2. 안전한 localStorage 훅]=====================================
// ===[안정 버전 useLS: 저장 실패 감지 후 자동 재시도]===
function useLS(key, init) {
  const [v, setV] = React.useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : init;
    } catch {
      return init;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {
      console.warn("localStorage save failed:", e);

      // 👉 재시도 한 번 더 (Safari에서 가짜 에러 방지)
      try {
        setTimeout(() => {
          localStorage.setItem(key, JSON.stringify(v));
        }, 200);
      } catch (err2) {
        alert("⚠️ 저장에 실패했습니다. 사진 용량이 너무 클 수 있습니다. 일부 기록을 비워주세요.");
      }
    }
  }, [key, v]);

  return [v, setV];
}



function emptyEntry(){
  return {
    notes:"", photo:null, moods:[],
    palette:null, manualColors:[], matType:"auto", strength:60, swatchSVG:null
  };
}
const emojiOnly = s => s ? s.split(" ")[0] : "";

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
  const d=ctx.getImageData(0,0,S,S).data; let sr=0,sg=0,sb=0,n=0;
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

/* ===== 스와치 SVG들 (7종: + sequin) ===== */
function swatchPlain(colors,strength){
  const [c1=colors[0]||"#d7d7d7", c2=colors[1]||"#bdbdbd"] = colors;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="plain" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="scale(${1+strength/80})">
      <rect width="12" height="12" fill="${c1}"/>
      <rect width="12" height="6" fill="${c2}" opacity=".25"/>
      <rect width="6" height="12" fill="${c2}" opacity=".25"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#plain)"/>
</svg>`;
}
function swatchTwill(colors,strength){
  const [base=colors[0]||"#6e7ea0", hi=colors[1]||"#a8b6d1"] = colors;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="twill" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45) scale(${1+strength/75})">
      <rect width="16" height="16" fill="${base}"/>
      <rect width="8" height="16" fill="${hi}" opacity=".18"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#twill)"/>
</svg>`;
}
function swatchRib(colors,strength){
  const [b=colors[0]||"#c9c9c9", hi=colors[1]||"#e8e8e8"] = colors;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="rib" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="scale(${1+strength/60})">
      <rect width="10" height="10" fill="${b}"/>
      <rect width="4" height="10" fill="${hi}" opacity=".35"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#rib)"/>
</svg>`;
}
function swatchHerringbone(colors,strength){
  const [a=colors[0]||"#7b7b7b", b=colors[1]||"#9a9a9a"] = colors;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <pattern id="hb" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="scale(${1+strength/80})">
      <path d="M0 24 L12 12 L24 24" stroke="${a}" stroke-width="6" fill="none"/>
      <path d="M0 0 L12 12 L24 0" stroke="${b}" stroke-width="6" fill="none"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="${a}"/>
  <rect width="240" height="240" fill="url(#hb)" opacity=".55"/>
</svg>`;
}
function swatchSatin(colors,strength){
  const [c=colors[0]||"#d2d2d2"]=colors;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="sat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${c}"/>
      <stop offset="50%"  stop-color="#ffffff" stop-opacity="${.35+strength/300}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="url(#sat)"/>
</svg>`;
}
function swatchLeather(colors,strength){
  const [c=colors[0]||"#6c4a3a"]=colors;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="pebble">
      <feTurbulence type="fractalNoise" baseFrequency="${Math.max(0.2, .9-strength/120)}" numOctaves="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${6+strength/4}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <rect width="240" height="240" fill="${c}"/>
  <rect width="240" height="240" fill="${c}" filter="url(#pebble)" opacity=".35"/>
</svg>`;
}

function swatchSequin(colors, strength) {
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


function makeSwatch(type,colors,strength){
  switch(type){
    case "plain": return swatchPlain(colors,strength);
    case "twill": return swatchTwill(colors,strength);
    case "rib": return swatchRib(colors,strength);
    case "herringbone": return swatchHerringbone(colors,strength);
    case "satin": return swatchSatin(colors,strength);
    case "leather": return swatchLeather(colors,strength);
    case "sequin": return swatchSequin(colors,strength);
    default: return swatchPlain(colors,strength);
  }
}

/* ===== 앱 ===== */
function App(){
  const today=new Date();
  const [year,setYear]=React.useState(today.getFullYear());
  const [month,setMonth]=React.useState(today.getMonth()+1);
  const [book,setBook]=useLS('coordination_book_v4',{}); // 새 키
  const [openDay,setOpenDay]=React.useState(null);
  const cells=React.useMemo(()=>monthGrid(year,month),[year,month]);

  const updateDay=(day,fn)=>setBook(prev=>{
    const next={...(prev||{})};
    const cur=prev[day]||emptyEntry();
    next[day]=fn(cur);
    return next;
  });

  // 프린트: 스와치 컬렉션 북
  const printCollection = ()=>{
    const entries = Object.entries(book)
      .filter(([,v])=>v?.swatchSVG)
      .sort(([a],[b])=>a.localeCompare(b));
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Swatch Collection</title>
<style>
  body{font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin:24px; color:#111}
  .grid{display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;}
  @media print {.page-break{page-break-after:always}}
  .card{border:1px solid #e5e5e5; border-radius:12px; overflow:hidden}
  .sw{width:100%; aspect-ratio:1/1}
  .meta{padding:12px}
  .title{font-weight:600; font-size:14px; margin-bottom:6px}
  .line{font-size:12px; color:#555}
  .thumb{width:100%; height:140px; object-fit:cover; border-top:1px solid #eee}
</style>
</head><body>
<h1 style="text-align:center; margin:0 0 16px 0">Fabric Swatch Collection</h1>
<p style="text-align:center; color:#666; margin:0 0 24px 0">${year} · ${month}월</p>
<div class="grid">
${entries.map(([k,v])=>`
  <div class="card">
    <div class="sw">${v.swatchSVG}</div>
    <img src="${v.photo||''}" class="thumb" alt="">
    <div class="meta">
      <div class="title">${k}</div>
      <div class="line">Material: ${v.matType||'-'}</div>
      <div class="line">Colors: ${(v.manualColors&&v.manualColors.length?v.manualColors:v.palette||[]).join(', ')}</div>
      <div class="line">${(v.notes||'').replace(/</g,'&lt;')}</div>
    </div>
  </div>
`).join('')}
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
    const w=window.open("","_blank");
    w.document.open(); w.document.write(html); w.document.close();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 (제목 중앙 정렬, 좌우에 네비/프린트) */}
      <header className="grid grid-cols-3 items-center">
        <div className="justify-self-start">
          <button className="px-3 py-2 rounded-xl bg-white border hover:bg-stone-50"
            onClick={()=>{if(month===1){setYear(y=>y-1); setMonth(12);} else setMonth(m=>m-1);}}>◀</button>
          <button className="ml-2 px-3 py-2 rounded-xl bg-white border hover:bg-stone-50"
            onClick={()=>{if(month===12){setYear(y=>y+1); setMonth(1);} else setMonth(m=>m+1);}}>▶</button>
        </div>
        <div className="justify-self-center">
          <h1 className="text-xl font-semibold">{year} · {month}월</h1>
        </div>
        <div className="justify-self-end">
          <button className="px-3 py-2 rounded-xl bg-white border hover:bg-stone-50"
            onClick={printCollection}>프린트</button>
        </div>
      </header>

      {/* 달력 */}
      <div className="mt-6 grid grid-cols-7 gap-2">
        {["월","화","수","목","금","토","일"].map(d=>
          <div key={d} className="text-center text-sm font-semibold text-stone-600">{d}</div>
        )}

        {cells.map((date,i)=>{
          if(!date) return <div key={i} className="day-cell rounded-2xl bg-white"/>;
          const key=ymd(date);
          const entry=book[key];
          return (
            <div key={i}
              className="day-cell bg-white rounded-2xl p-2 shadow hover:shadow-md flex flex-col cursor-pointer"
              onClick={()=>setOpenDay(key)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-stone-700">{date.getDate()}</span>
                <span className="text-xs">{ entry?.photo ? "📷" : "" }</span>
              </div>
              <div className="thumb overflow-hidden rounded-md bg-white flex items-center justify-center">
                {entry?.photo ? (
                  <img src={entry.photo} alt="thumb" className="w-full h-full object-cover"/>
                ) : null}
              </div>
              <div className="mt-1 flex gap-1 text-base leading-none">
                { entry?.moods?.slice(0,4).map((m,idx)=><span key={idx}>{emojiOnly(m)}</span>) }
              </div>
            </div>
          );
        })}
      </div>

      {openDay && (
        <DetailPanel
          day={openDay}
          entry={book[openDay]||emptyEntry()}
          onClose={()=>setOpenDay(null)}
          onSave={(u)=>{ updateDay(openDay,()=>u); /* 저장 시 흰화면 방지: alert 제거 */ setOpenDay(null); }}
          onDelete={()=>{
            // 삭제 모션: 즉시 삭제 후 패널은 열어둠 → 사용자가 닫기 전에도 반영
            setBook(prev=>{ const n={...(prev||{})}; delete n[openDay]; return n; });
          }}
          onMakeSwatch={(payload)=>{ updateDay(openDay, cur => ({...cur, ...payload})); }}
        />
      )}
    </div>
  );
}

/* ===== 상세 패널 ===== */
function DetailPanel({day,entry,onClose,onSave,onDelete,onMakeSwatch}){
  const [local,setLocal]=React.useState(entry);
  const [matType,setMatType]=React.useState(entry.matType||"auto");
  const [strength,setStrength]=React.useState(entry.strength ?? 60);
  const MOODS=["😀 기쁨","😌 차분","💖 로맨틱","⚡ 집중","✨ 영감","😴 피곤","🌞 맑음","☁️ 흐림","🌧️ 비","😡 화남"];

  const toggleMood=m=>setLocal(prev=>{
    const has=prev.moods.indexOf(m)>=0;
    return {...prev,moods:has?prev.moods.filter(x=>x!==m):[...prev.moods,m]};
  });

  // 사진 업로드 → 자동 팔레트 추출 & (auto면) 자동 소재 인식 + 스와치 생성
  const onPhotoSelected = (file)=>{
    if(!file) return;
    const r=new FileReader();
    r.onload=()=>{
      const dataUrl=r.result;
      setLocal(prev=>({...prev, photo:dataUrl}));
      const img=new Image();
      img.onload=()=>{
        const palette=quantizeColorsFromImg(img,4);
        let colors = (local.manualColors?.length>0 ? local.manualColors : palette);
        if(matType==="auto"){
          const t=guessMaterialFromImg(img);
          const svg=makeSwatch(t, colors, Number(strength));
          setLocal(prev=>({...prev, palette, matType:t, swatchSVG:svg }));
        }else{
          const svg=makeSwatch(matType, colors, Number(strength));
          setLocal(prev=>({...prev, palette, swatchSVG:svg }));
        }
      };
      img.src=dataUrl;
    };
    r.readAsDataURL(file);
  };

  // 수동 색상 (있으면 사진 팔레트보다 우선)
  const addManualColor = ()=>{
    setLocal(prev=>{
      const arr=[...(prev.manualColors||[])];
      if(arr.length>=6) return prev;
      arr.push("#cccccc");
      // 수동색 추가 시 즉시 미리보기 업데이트
      const colors = arr;
      if(colors && (prev.matType||"auto")!=="auto"){
        const svg=makeSwatch(prev.matType, colors, Number(strength));
        return {...prev, manualColors:arr, swatchSVG:svg};
      }
      return {...prev, manualColors:arr};
    });
  };
  const changeManualColor = (idx, val)=>{
    setLocal(prev=>{
      const arr=[...(prev.manualColors||[])];
      arr[idx]=val;
      const type = prev.matType==="auto" ? "plain" : prev.matType; // auto면 임시로 plain에 반영
      const colors = arr.length>0 ? arr : (prev.palette||[]);
      const svg = (type!=="auto" && colors.length) ? makeSwatch(type, colors, Number(strength)) : prev.swatchSVG;
      return {...prev, manualColors:arr, swatchSVG:svg};
    });
  };
  const removeManualColor = (idx)=>{
    setLocal(prev=>{
      const arr=[...(prev.manualColors||[])];
      arr.splice(idx,1);
      const type = prev.matType==="auto" ? "plain" : prev.matType;
      const colors = arr.length>0 ? arr : (prev.palette||[]);
      const svg = (type!=="auto" && colors.length) ? makeSwatch(type, colors, Number(strength)) : prev.swatchSVG;
      return {...prev, manualColors:arr, swatchSVG:svg};
    });
  };
  const clearManualColors = ()=>{
    setLocal(prev=>{
      const colors = prev.palette||[];
      const type = prev.matType==="auto" ? "plain" : prev.matType;
      const svg = (type!=="auto" && colors.length) ? makeSwatch(type, colors, Number(strength)) : null;
      return {...prev, manualColors:[], swatchSVG:svg};
    });
  };

  // 타입/강도 변경 시 미리보기 (수동색>팔레트 우선)
  React.useEffect(()=>{
    const colors = (local.manualColors?.length>0 ? local.manualColors : local.palette);
    if(colors && matType!=="auto"){
      const svg=makeSwatch(matType, colors, Number(strength));
      setLocal(prev=>({...prev, swatchSVG:svg }));
    }
  },[matType,strength]); // eslint-disable-line

  // 스와치 생성 버튼
  const generateSwatch=()=>{
    const colors = (local.manualColors?.length>0 ? local.manualColors : local.palette) || ["#d0d0d0","#a0a0a0","#808080","#e5e5e5"];
    let type=matType;
    if(type==="auto"){
      if(!local.photo){ alert("사진을 먼저 올려줘!"); return; }
      const img=new Image();
      img.onload=()=>{
        type=guessMaterialFromImg(img);
        const svg=makeSwatch(type, colors, Number(strength));
        setMatType(type);
        setLocal(prev=>({...prev, matType:type, swatchSVG:svg }));
      };
      img.src=local.photo;
      return;
    }
    const svg=makeSwatch(type, colors, Number(strength));
    setLocal(prev=>({...prev, swatchSVG:svg }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-xl bg-white p-6 overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-stone-500">{day}</div>
            <h3 className="text-xl font-semibold">기록 편집</h3>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-xl border" onClick={()=>onSave(local)}>저장</button>
            <button className="px-3 py-2 rounded-xl bg-stone-900 text-white" onClick={onClose}>닫기</button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* 메모 */}
          <section>
            <label className="block text-sm font-medium mb-2">메모</label>
            <textarea rows={4}
              className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-stone-300"
              value={local.notes}
              onChange={e=>setLocal({...local, notes:e.target.value})}
              placeholder="예: 벨벳 자켓 + 실크 스커트"/>
          </section>

          {/* 이모지 */}
          <section>
            <h4 className="text-sm font-medium mb-2">이모지</h4>
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
            <h4 className="text-sm font-medium mb-2">오늘의 착장 사진</h4>
            {local.photo ? <img src={local.photo} alt="outfit" className="w-full rounded-xl border object-cover"/> : null}
            <input
  type="file"
  accept="image/*"
  className="mt-3"
 onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    // 1) 업로드 파일을 다운스케일 + JPEG로 변환 (네 코드 유지)
    const jpegData = await fileToDownscaledJPEG(file, 1200, 0.85);

    // 2) 10MB 제한 체크 (네 코드 유지)
    const bytes = dataUrlBytes(jpegData);
    if (bytes > 10 * 1024 * 1024) {
      alert("이미지 용량이 너무 큽니다 (최대 10MB).");
      return;
    }

    // 3) 자동 팔레트 추출 (여기가 추가된 부분)
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const palette = quantizeColorsFromImg(img, 4); // 이미 있는 함수 사용
          // 사진 + 팔레트 동시 저장
          setLocal((prev) => ({ ...prev, photo: jpegData, palette }));
          resolve();
        } catch (err) {
          console.error("팔레트 추출 실패:", err);
          // 팔레트만 빼고 사진만 저장
          setLocal((prev) => ({ ...prev, photo: jpegData }));
          resolve();
        }
      };
      img.onerror = reject;
      img.src = jpegData;
    });

    // (선택) 팝업이 흰화면 원인이 될 수 있으니 굳이 안내문 필요 없으면 생략 권장
    // alert("사진이 등록되었습니다!");

  } catch (err) {
    console.error("이미지 처리 오류:", err);
    alert("이미지를 불러오지 못했습니다. 다른 형식을 시도해보세요.");
  }
}}

/>

          </section>

          {/* 수동 색상 */}
          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">스와치 색상</h4>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-xl border hover:bg-stone-50" onClick={addManualColor}>+ 수동 색상</button>
                <button className="px-3 py-2 rounded-xl border hover:bg-stone-50" onClick={clearManualColors}>수동 색상 지우기</button>
              </div>
            </div>
            {/* 자동 팔레트 미리보기 */}
            <div className="mt-3">
              <div className="text-xs text-stone-500 mb-1">자동 팔레트</div>
              <div className="flex gap-1">
                {(local.palette||[]).map((c,i)=>
                  <span key={i} className="inline-block w-4 h-4 rounded border" style={{background:c}} title={c}/>
                )}
              </div>
            </div>
            {/* 수동 색상 피커 */}
            <div className="mt-3">
              <div className="text-xs text-stone-500 mb-1">수동 색상(있으면 이것이 우선)</div>
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
                  <div className="text-xs text-stone-400">수동 색상이 없으면 사진 팔레트를 사용합니다.</div>
                )}
              </div>
            </div>
          </section>

          {/* 소재 스와치 생성 */}
          <section>
            <div className="flex items-center gap-2">
              <select value={matType} onChange={e=>setMatType(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                <option value="auto">자동</option>
                <option value="plain">평직</option>
                <option value="twill">트윌/데님</option>
                <option value="rib">립 니트</option>
                <option value="herringbone">헤링본</option>
                <option value="satin">새틴/실크</option>
                <option value="leather">레더</option>
                <option value="sequin">스팽글</option>
              </select>
              <input type="range" min="0" max="100" value={strength}
                onChange={e=>setStrength(e.target.value)} className="w-32"/>
              <button className="px-3 py-2 rounded-xl border hover:bg-stone-50"
                onClick={generateSwatch}>스와치 만들기</button>
            </div>

            <div className="mt-3">
              <div className="rounded-xl border overflow-hidden" style={{aspectRatio:"1/1", background:'#fafafa'}}>
                {local.swatchSVG
                  ? <div dangerouslySetInnerHTML={{__html: local.swatchSVG}}/>
                  : <div className="w-full h-full text-stone-400 flex items-center justify-center">사진 또는 색상을 선택해 스와치를 생성하세요</div>}
              </div>
            </div>
          </section>

          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50" onClick={onDelete}>
              이 날짜 기록 삭제
            </button>
          </div>
        </div>
      </div>
      <button className="absolute right-[max(24rem,40%)] top-4 bg-white p-2 rounded-xl shadow" onClick={onClose}>✕</button>
    </div>
  );
}

/* ===== 부트스트랩 ===== */
// ===[3. 에러 바운더리]==============================================
class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <b>렌더 오류</b><br />
            저장 데이터나 이미지 때문에 오류가 났을 수 있어요.
            <div className="mt-3 flex gap-2">
              <button
                className="px-3 py-2 border rounded-lg"
                onClick={() => location.reload()}
              >
                새로고침
              </button>
              <button
                className="px-3 py-2 border rounded-lg"
                onClick={() => {
                  localStorage.removeItem("coordination_book_v3");
                  location.reload();
                }}
              >
                저장데이터 초기화
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ 아래 두 줄이 진짜 중요함
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
