function App() {
  const KEY = 'coordination_simple_clean_v2';
  const [book, setBook] = React.useState({});
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1);
  const [openDay, setOpenDay] = React.useState(null);

  // ✅ data.json 또는 seed-data 자동 불러오기
  React.useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved && saved !== '{}') {
      setBook(JSON.parse(saved));
      return;
    }

    // 1️⃣ data.json 불러보기
    fetch('./data.json', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setBook(data);
        localStorage.setItem(KEY, JSON.stringify(data));
      })
      .catch(() => {
        // 2️⃣ 실패 시 index.html 안의 seed 사용
        const el = document.getElementById('seed-data');
        if (el && el.textContent.trim()) {
          const seed = JSON.parse(el.textContent);
          setBook(seed);
          localStorage.setItem(KEY, JSON.stringify(seed));
        }
      });
  }, []);

  /* ========== 달력 ========== */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const range = (n) => Array.from({length:n}, (_,i)=>i);
  function monthGrid(year, month){
    const first = new Date(year, month-1, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(year, month, 0).getDate();
    const cells = [];
    range(start).forEach(()=>cells.push(null));
    range(days).forEach(i=>cells.push(new Date(year, month-1, i+1)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  const cells = React.useMemo(()=>monthGrid(year, month), [year, month]);
  const emojiOnly = (l)=> l? l.split(" ")[0] : "";

  function emptyEntry(){ return { notes:"", photo:null, moods:[] }; }
  function updateDay(day, fn){
    setBook(prev=>{
      const next={...(prev||{})};
      next[day]=fn(prev[day]||emptyEntry());
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Coordination Book</h1>
        <div className="flex items-center gap-2">
          <button onClick={()=> setMonth(m=> m===1 ? 12 : m-1)} className="px-3 py-2 rounded-xl border">◀</button>
          <span>{year} · {month}월</span>
          <button onClick={()=> setMonth(m=> m===12 ? 1 : m+1)} className="px-3 py-2 rounded-xl border">▶</button>
        </div>
      </header>

     <div className="mt-6 grid grid-cols-7 gap-2">
  {["월","화","수","목","금","토","일"].map(d=>(
    <div key={d} className="text-center text-sm font-semibold text-stone-600">{d}</div>
  ))}

  {cells.map((date, i)=>{
    if(!date) return <div key={i} className="day-cell rounded-2xl bg-white"/>;

    const key = ymd(date);
    const entry = book[key];

    return (
      <div
        key={i}
        className="day-cell rounded-2xl bg-white p-2 shadow hover:shadow-md cursor-pointer flex flex-col"
        onClick={()=> setOpenDay(key)}
      >
        {/* 상단: 날짜/카메라 아이콘 */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-stone-700">{date.getDate()}</span>
          <span className="text-xs">{ entry?.photo ? "📷" : "" }</span>
        </div>

        {/* 가운데: 썸네일 (없으면 빈 화면 유지) */}
        <div className="thumb flex items-center justify-center overflow-hidden rounded-md bg-white">
          { entry?.photo
            ? <img src={entry.photo} alt="thumb" className="w-full h-full object-cover block" />
            : null }
        </div>

        {/* 하단: 이모지 */}
        <div className="mt-1 flex gap-1 text-base leading-none">
          { entry?.moods?.slice(0,4).map((m,idx)=> (
            <span key={idx}>{(m||"").split(" ")[0]}</span>
          ))}
        </div>
      </div>
    );
  })}
</div>


      {openDay && (
        <div className="fixed inset-0 bg-black/30 flex justify-end">
          <div className="bg-white w-full max-w-md p-6 overflow-y-auto">
            <h2 className="font-semibold mb-2">{openDay}</h2>
            <textarea
              className="w-full border rounded-xl p-2 mb-2"
              rows={3}
              value={book[openDay]?.notes || ""}
              onChange={(e)=> updateDay(openDay, (cur)=>({...cur, notes:e.target.value}))}
            />
            <input type="file" accept="image/*" onChange={(e)=>{
              const f=e.target.files?.[0]; if(!f) return;
              const r=new FileReader();
              r.onload=()=> updateDay(openDay, (cur)=>({...cur, photo:r.result}));
              r.readAsDataURL(f);
            }}/>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-2 border rounded-xl" onClick={()=> setOpenDay(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
