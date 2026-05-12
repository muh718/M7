import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Users, RefreshCw, Trophy, AlertCircle, XCircle, ChevronLeft, BookOpen, Atom, Globe, History, Brain, Calculator, Trophy as SportIcon } from 'lucide-react';
import { questionsBank } from './questions_data';

const ROWS = 5;
const COLS = 5;

// قائمة المواضيع وتوزيعها على الشبكة
const CATEGORIES = [
  { name: "إسلاميات", icon: <BookOpen size={16} />, color: "bg-emerald-500" },
  { name: "علوم", icon: <Atom size={16} />, color: "bg-blue-500" },
  { name: "جغرافيا", icon: <Globe size={16} />, color: "bg-cyan-500" },
  { name: "تاريخ", icon: <History size={16} />, color: "bg-amber-500" },
  { name: "ألغاز", icon: <Brain size={16} />, color: "bg-purple-500" },
  { name: "رياضيات", icon: <Calculator size={16} />, color: "bg-rose-500" },
  { name: "لغة وأدب", icon: <SportIcon size={16} />, color: "bg-orange-500" }
];

export default function App() {
  const [gameState, setGameState] = useState('LOBBY');
  const [playersCount, setPlayersCount] = useState(1);
  const [playerNames, setPlayerNames] = useState({ p1: '', p2: '' });
  const [grid, setGrid] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [winningPath, setWinningPath] = useState([]);
  const [celebrating, setCelebrating] = useState(false);

  // منطق اختيار الأسئلة (عدم التكرار لمدة 24 ساعة)
  const getQuestionForCategory = useCallback((categoryName) => {
    const KEY = 'radwa_used_questions_v3';
    const used = JSON.parse(localStorage.getItem(KEY) || '[]');
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const validUsed = used.filter(item => now - item.time < ONE_DAY);
    const usedIds = validUsed.map(item => item.id);

    // تصفية الأسئلة المتاحة لهذا التصنيف فقط
    let available = questionsBank.filter(q => q.category === categoryName && !usedIds.includes(q.id));

    if (available.length === 0) {
      // إذا نفدت أسئلة هذا القسم، نعيد استخدامها
      available = questionsBank.filter(q => q.category === categoryName);
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    
    // تحديث التخزين
    const newUsed = [...validUsed, { id: selected.id, time: now }];
    localStorage.setItem(KEY, JSON.stringify(newUsed));

    return selected;
  }, []);

  const initGame = () => {
    // توزيع المواضيع عشوائياً على الخلايا الـ 25
    const newGrid = Array(ROWS * COLS).fill(null).map((_, i) => {
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      return {
        id: i,
        status: 'empty',
        player: null,
        r: Math.floor(i / COLS),
        c: i % COLS,
        category: cat.name,
        catColor: cat.color
      };
    });
    setGrid(newGrid);
    setStats({ correct: 0, total: 0 });
    setCurrentPlayer(1);
    setGameState('PLAYING');
    setWinningPath([]);
  };

  const openCell = (cellId) => {
    if (celebrating || grid[cellId].status !== 'empty') return;
    const category = grid[cellId].category;
    const q = getQuestionForCategory(category);
    setCurrentQuestion(q);
    setActiveCell(cellId);
  };

  // خوارزمية البحث عن الجيران للسداسيات
  const getNeighbors = (index) => {
    const r = Math.floor(index / COLS), c = index % COLS, p = r % 2;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, p === 0 ? -1 : 1], [-1, p === 0 ? -1 : 1]];
    return dirs.map(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      return (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) ? nr * COLS + nc : null;
    }).filter(n => n !== null);
  };

  const checkWinner = (tempGrid, p, vertical) => {
    const starts = tempGrid.filter(cell => (vertical ? cell.r === 0 : cell.c === 0) && 
      (playersCount === 1 && vertical ? cell.status === 'wrong' : (cell.status === 'correct' && cell.player === p))).map(c => c.id);
    if (!starts.length) return null;
    const q = starts.map(id => [id, [id]]), v = new Set(starts);
    while (q.length) {
      const [curr, path] = q.shift();
      if (vertical ? tempGrid[curr].r === ROWS - 1 : tempGrid[curr].c === COLS - 1) return path;
      for (const n of getNeighbors(curr)) {
        if (!v.has(n) && (playersCount === 1 && vertical ? tempGrid[n].status === 'wrong' : (tempGrid[n].status === 'correct' && tempGrid[n].player === p))) {
          v.add(n); q.push([n, [...path, n]]);
        }
      }
    }
    return null;
  };

  const handleAnswer = (isCorrect) => {
    const newGrid = [...grid];
    const cell = { ...newGrid[activeCell] };
    if (isCorrect) {
      cell.status = 'correct'; cell.player = currentPlayer;
      setStats(s => ({ ...s, correct: s.correct + 1, total: s.total + 1 }));
    } else {
      cell.status = playersCount === 1 ? 'wrong' : 'blocked';
      cell.player = playersCount === 1 ? null : 0;
      setStats(s => ({ ...s, total: s.total + 1 }));
    }
    newGrid[activeCell] = cell;
    setGrid(newGrid);
    setActiveCell(null);

    const win = checkWinner(newGrid, 1, false);
    const loss = checkWinner(newGrid, 2, true);

    if (win) { setWinningPath(win); setCelebrating(true); setTimeout(() => setGameState('WON'), 2000); }
    else if (loss) { setWinningPath(loss); setCelebrating(true); setTimeout(() => setGameState('LOST'), 2000); }
    else if (playersCount === 2) setCurrentPlayer(p => p === 1 ? 2 : 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 select-none" dir="rtl">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Tajawal:wght@400;700;900&display=swap'); body { font-family: 'Tajawal', sans-serif; }`}</style>
      
      {gameState === 'LOBBY' && (
        <div className="flex flex-col items-center justify-center min-h-[85vh] animate-in fade-in duration-700">
          <div className="w-full max-w-md bg-slate-900 border-t-8 border-emerald-600 p-10 rounded-[3rem] shadow-2xl text-center">
            <h1 className="text-4xl font-black mb-2">ثانوية رضوى</h1>
            <p className="text-xl text-emerald-500 mb-10" style={{ fontFamily: 'Amiri' }}>أ/ محمد القرني</p>
            <div className="space-y-6">
               <div className="flex gap-4">
                  <button onClick={() => setPlayersCount(1)} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 ${playersCount === 1 ? 'bg-emerald-600 ring-4 ring-emerald-500/20' : 'bg-slate-800'}`}><User /> لاعب واحد</button>
                  <button onClick={() => setPlayersCount(2)} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 ${playersCount === 2 ? 'bg-emerald-600 ring-4 ring-emerald-500/20' : 'bg-slate-800'}`}><Users /> لاعبان</button>
               </div>
               <input type="text" placeholder="اسم المتسابق الأول" className="w-full p-4 bg-slate-800 rounded-2xl outline-none" value={playerNames.p1} onChange={e => setPlayerNames(p => ({ ...p, p1: e.target.value }))} />
               {playersCount === 2 && <input type="text" placeholder="اسم المتسابق الثاني" className="w-full p-4 bg-slate-800 rounded-2xl outline-none" value={playerNames.p2} onChange={e => setPlayerNames(p => ({ ...p, p2: e.target.value }))} />}
               <button disabled={!playerNames.p1 || (playersCount === 2 && !playerNames.p2)} onClick={initGame} className="w-full py-5 bg-emerald-600 rounded-3xl text-xl font-bold active:scale-95 disabled:opacity-30 transition-all">ابدأ سباق المواضيع</button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <header className="text-center mb-6">
            <h2 className="text-2xl font-black opacity-90">ثانوية رضوى</h2>
            <p className="text-emerald-500" style={{ fontFamily: 'Amiri' }}>أ/ محمد القرني</p>
          </header>

          <div className="w-full flex justify-between gap-4 mb-6">
            <div className={`p-4 rounded-2xl flex-1 text-center border-2 ${currentPlayer === 1 ? 'border-emerald-500 bg-emerald-900/30 shadow-lg shadow-emerald-500/20' : 'border-transparent opacity-40'}`}>
               <div className="text-xs font-bold mb-1">المتسابق الأول</div>
               <div className="font-black text-lg">{playerNames.p1}</div>
            </div>
            <div className={`p-4 rounded-2xl flex-1 text-center border-2 ${currentPlayer === 2 ? 'border-red-500 bg-red-900/30 shadow-lg shadow-red-500/20' : 'border-transparent opacity-40'}`}>
               <div className="text-xs font-bold mb-1">{playersCount === 2 ? 'المتسابق الثاني' : 'المسار المعادي'}</div>
               <div className="font-black text-lg">{playersCount === 2 ? playerNames.p2 : 'تحدي الكمبيوتر'}</div>
            </div>
          </div>

          <div className="relative overflow-visible pb-10">
            <svg viewBox="0 0 440 380" className="w-full h-auto drop-shadow-2xl overflow-visible">
              {grid.map(c => {
                const x = c.c * 72 + (c.r % 2 === 1 ? 36 : 0) + 40;
                const y = c.r * 62 + 45;
                const winning = winningPath.includes(c.id);
                let fill = "#1e293b";
                if (c.status === 'correct') fill = c.player === 1 ? "#10b981" : "#ef4444";
                if (c.status === 'wrong') fill = "#ef4444";
                if (c.status === 'blocked') fill = "#000000";

                return (
                  <g key={c.id} transform={`translate(${x},${y})`} onClick={() => openCell(c.id)} className="cursor-pointer group">
                    <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill={fill} stroke={winning ? "#fbbf24" : "#334155"} strokeWidth={winning ? 6 : 2} className="transition-all duration-300" />
                    {c.status === 'empty' && (
                      <foreignObject x="-30" y="-15" width="60" height="30">
                        <div className="flex flex-col items-center justify-center h-full text-[10px] font-black text-slate-400 leading-tight text-center">
                          {c.category}
                        </div>
                      </foreignObject>
                    )}
                    {winning && celebrating && <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#fbbf24" strokeWidth="10" className="animate-ping opacity-30" />}
                  </g>
                );
              })}
            </svg>
          </div>
          
          <div className="mt-4 flex gap-4 overflow-x-auto w-full no-scrollbar pb-4">
             {CATEGORIES.map(cat => (
               <div key={cat.name} className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${cat.color}`}></span>
                  <span className="text-[10px] font-bold">{cat.name}</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeCell !== null && currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 px-6 py-2 rounded-full font-black shadow-xl">
               قسم {currentQuestion.category}
            </div>
            <div className="flex justify-between items-center mb-10 mt-2 border-b border-slate-800 pb-4">
               <span className={`px-4 py-1 rounded-xl text-xs font-bold ${currentPlayer === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>دور: {currentPlayer === 1 ? playerNames.p1 : (playersCount === 2 ? playerNames.p2 : 'المسار')}</span>
               <button onClick={() => setActiveCell(null)} className="text-slate-500 hover:text-white"><XCircle /></button>
            </div>
            <h3 className="text-2xl font-bold mb-12 leading-relaxed text-right">
               {currentQuestion.q.split(/(\$.*?\$)/).map((p, i) => p.startsWith('$') ? <span key={i} dir="ltr" className="text-emerald-400 font-mono bg-black/30 px-2 rounded mx-1">{p.replace(/\$/g,'')}</span> : p)}
            </h3>
            <div className="grid gap-4">
              {currentQuestion.options.map((o, i) => (
                <button key={i} onClick={() => handleAnswer(i === currentQuestion.correct)} className="w-full p-5 text-right bg-slate-800 hover:bg-emerald-600 rounded-2xl transition-all font-bold text-lg flex justify-between items-center group active:scale-95" dir="rtl">
                  <span className="font-black text-xl">{o}</span>
                  <ChevronLeft className="opacity-0 group-hover:opacity-100 transition-all"/>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(gameState === 'WON' || gameState === 'LOST') && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-slate-900 p-12 rounded-[4rem] border-b-[12px] border-emerald-600 shadow-2xl text-center animate-in zoom-in">
            <Trophy size={100} className={`mx-auto mb-6 ${gameState === 'WON' ? 'text-yellow-500 animate-bounce' : 'text-red-500'}`} />
            <h2 className="text-4xl font-black mb-8">{gameState === 'WON' ? 'مبروك الفوز بالمسار!' : 'انتهى التحدي'}</h2>
            <div className="flex gap-4 justify-center mb-10">
               <div className="bg-slate-800 p-4 rounded-3xl w-32">
                  <div className="text-xs text-slate-500 mb-1">الإجابات</div>
                  <div className="text-3xl font-black text-emerald-400">{stats.correct}</div>
               </div>
               <div className="bg-slate-800 p-4 rounded-3xl w-32">
                  <div className="text-xs text-slate-500 mb-1">النسبة</div>
                  <div className="text-3xl font-black text-blue-400">{((stats.correct/(stats.total||1))*100).toFixed(0)}%</div>
               </div>
            </div>
            <button onClick={() => setGameState('LOBBY')} className="w-full py-5 bg-emerald-600 rounded-3xl font-black text-xl active:scale-95 shadow-xl transition-all">العودة للرئيسية</button>
          </div>
        </div>
      )}
    </div>
  );
}
