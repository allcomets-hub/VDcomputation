// ===== 유틸 =====
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const range = (n) => Array.from({length:n}, (_,i)=>i);

function monthGrid(year, month){ // month: 1~12
  const first = new Date(year, month-1, 1);
  const start = (first.getDay() + 6) % 7; // 월=0
  const days = new Date(year, month, 0).getDate();
  const cells = [];
  range(start).forEach(()=>cells.push(null));
  range(days).forEach(i=>cells.push(new Date(year, month-1, i+1)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function useLS(key, init){
  const [v, setV] = React.useState(()=>{
    try { const raw = localStorage.getItem(key); return raw? JSON.parse(raw): init; }
    catch { return init; }
  });
  React.useEffect(()=>{ localStorage.setItem(key, JSON.stringify(v)); }, [key, v]);
  return [v, setV];
}

function emptyEntry(){ return { notes: "", photo: null, moods: [] }; }
function emojiOnly(label){ return label ? label.split(" ")[0] : ""; }

// ===== 앱 =====
function App(){
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth()+1);
  const [book, setBook] = useLS('coordination_simple_clean_v2', {});
  const [openDay, setOpenDay] = React.useState(null);

  const cells = React.useMemo(()=>monthGrid(year, month), [year, month]);

  const updateDay = (day, fn) => {
    setBook(prev=>{
      const base = prev || {};
      const next = {...base};
      const cur = base[day] || emptyEntry();
      next[day] = fn(cur);
      return next;
    });
  };

  // 🔸 데이터 백업 / 복원 기능 추가
  const exportData = () => {
    const blob = new Blob([JSON.stringify(book, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coordination_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setBook(data);
        alert("✅ 불러오기 완료! 페이지를 새로고침해도 유지됩니다.");
      } catch {
        alert("⚠️ 잘못된 파일 형식이에요.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Coordination Book – Simple</h1>
          <p className="text-stone-600">날짜별 OOTD · 이모지 기록</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 🔹 백업 버튼 */}
          <button
            onClick={exportData}
            className="px-3 py-2 rounded-xl bg-stone-800 text-white hover:bg-stone-700"
          >
            💾 백업하기
          </button>

          {/* 🔹 불러오기 버튼 */}
          <label className="px-3 py-2 rounded-xl bg-stone-600 text-white hover:bg-stone-500 cursor-pointer">
            📂 불러오기
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e)=> importData(e.target.files[0])}
            />
          </label>

          {/* 🔹 달력 이동 */}
          <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow">
            <button className="px-3 py-2 rounded-xl hover:bg-stone-100"
              onClick={()=>{ if(month===1){ setYear(y=>y-1); setMonth(12);} else setMonth(m=>m-1); }}>◀</button>
            <div className="px-3 text-sm font-medium">{year} · {month}월</div>
            <button className="px-3 py-2 rounded-xl hover:bg-stone-100"
              onClick={()=>{ if(month===12){ setYear(y=>y+1); setMonth(1);} else setMonth(m=>m+1); }}>▶</button>
          </div>
        </div>
      </header>

      {/* 달력 */}
      <div className="mt-6 grid grid-cols-7 gap-2">
        {["월","화","수","목","금","토","일"].map(d=>(
          <div key={d} className="text-center text-sm font-semibold text-stone-600">{d}</div>
        ))}

        {cells.map((date, i)=>{
          if(!date) return <div key={i} className="h-28 rounded-2xl bg-white"/>;
          const key = ymd(date);
          const entry = book[key];

          return (
            <div key={i}
              className="h-28 rounded-2xl bg-white p-2 shadow hover:shadow-md cursor-pointer flex flex-col"
              onClick={()=> setOpenDay(key)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-stone-700">{date.getDate()}</span>
                <span className="text-xs">{(entry && entry.photo) ? "📷" : ""}</span>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-md bg-white">
                {(entry && entry.photo)
                  ? <img src={entry.photo} alt="thumb" className="h-full w-full object-cover" />
                  : null }
              </div>
              <div className="mt-1 flex gap-1 text-base leading-none">
                {entry && entry.moods && entry.moods.slice(0,4).map((m,idx)=>(
                  <span key={idx}>{emojiOnly(m)}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {openDay && (
        <DetailPanel
          day={openDay}
          entry={(book[openDay] ? book[openDay] : emptyEntry())}
          onClose={()=> setOpenDay(null)}
          onSave={(updated)=>{
            updateDay(openDay, ()=> updated);
            alert("OOTD 기록 완료!");
            setOpenDay(null);
          }}
          onDelete={()=> setBook(prev=>{ const n={...(prev||{})}; delete n[openDay]; return n; })}
        />
      )}
    </div>
  );
}

// ===== 상세 패널 =====
function DetailPanel({ day, entry, onClose, onSave, onDelete }){
  const [local, setLocal] = React.useState(entry);
  React.useEffect(()=>{ setLocal(entry); }, [entry]);

  const toggleMood = (m) => {
    setLocal(prev=>{
      const has = prev.moods.indexOf(m) >= 0;
      return {...prev, moods: has ? prev.moods.filter(x=>x!==m) : [...prev.moods, m]};
    });
  };

  const MOODS = [
    "😀 기쁨", "😌 차분", "💖 로맨틱", "⚡ 집중", "✨ 영감", 
    "😴 피곤", "🌞 맑음", "☁️ 흐림", "🌧️ 비", "😡 화남"
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-xl bg-white p-6 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500">{day}</div>
            <h3 className="text-xl font-semibold">기록 편집</h3>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-xl border hover:bg-stone-50" onClick={()=> onSave(local)}>저장</button>
            <button className="px-3 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800" onClick={onClose}>닫기</button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <label className="block text-sm font-medium mb-2">메모</label>
            <textarea
              className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-stone-300"
              rows={4}
              value={local.notes}
              onChange={(e)=> setLocal(prev=> ({...prev, notes: e.target.value}))}
              placeholder="예: 오늘은 편안한 발표룩!"
            />
          </section>

          <section>
            <h4 className="text-sm font-medium mb-2">이모지</h4>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m=>(
                <button key={m}
                        className={`px-3 py-2 rounded-xl text-sm ${local.moods.indexOf(m)>=0 ? 'bg-stone-900 text-white' : 'border hover:bg-stone-50'}`}
                        onClick={()=> toggleMood(m)}>
                  {m}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-medium mb-2">오늘의 착장 사진</h4>
            {local.photo ? (
              <img src={local.photo} alt="outfit" className="w-full rounded-xl border object-cover" />
            ) : null}
            <input
              type="file"
              accept="image/*"
              className="mt-3"
              onChange={(e)=>{
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = ()=> setLocal(prev=> ({...prev, photo: r.result}));
                r.readAsDataURL(f);
              }}
            />
          </section>

          <div className="flex justify-between">
            <button className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50" onClick={onDelete}>이 날짜 기록 삭제</button>
          </div>
        </div>
      </div>
      <button className="absolute right-[max(24rem,40%)] top-4 bg-white p-2 rounded-xl shadow" onClick={onClose}>✕</button>
    </div>
  );
}
