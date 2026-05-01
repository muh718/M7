```react
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, RefreshCw, LogOut, Target, HelpCircle, Star, Zap } from 'lucide-react';
import { QUESTIONS_DATABASE } from './data/questions';
import './App.css';

const GRID_SIZE = 5;
const HEX_RADIUS = 100;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS; 
const HEX_HEIGHT = 2 * HEX_RADIUS;
const VERT_DIST = HEX_HEIGHT * 0.75; 

const VB_WIDTH = (GRID_SIZE * HEX_WIDTH) + (HEX_WIDTH / 2);
const VB_HEIGHT = ((GRID_SIZE - 1) * VERT_DIST) + HEX_HEIGHT;

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");

export default function App() {
  const [view, setView] = useState('START'); 
  const [pNames, setPNames] = useState({ p1: '', p2: '' });
  const [matchRounds, setMatchRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [scores, setScores] = useState({ P1: 0, P2: 0 });
  
  const [grid, setGrid] = useState([]);
  const [turn, setTurn] = useState('P1');
  const [activeQ, setActiveQ] = useState(null);
  const [roundWinner, setRoundWinner] = useState(null);
  const [shuffledPool, setShuffledPool] = useState([]);
  const [usedQs, setUsedQs] = useState(new Set());

  const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

  const handleStartMatch = (rounds) => {
    setMatchRounds(rounds);
    setShuffledPool(shuffle(QUESTIONS_DATABASE));
    generateNewGrid();
    setView('GAME');
  };

  const generateNewGrid = useCallback(() => {
    const newGrid = [];
    const letters = shuffle(ARABIC_LETTERS);
    let idx = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        newGrid.push({ id: `${r}-${c}`, r, c, label: letters[idx % letters.length], owner: null });
        idx++;
      }
    }
    setGrid(newGrid);
    setTurn('P1');
    setRoundWinner(null);
  }, []);

  const roundConfig = useMemo(() => {
    const isP1Vertical = currentRound % 2 !== 0;
    return {
      P1: { dir: isP1Vertical ? 'VERT' : 'HORIZ', color: '#10b981' },
      P2: { dir: isP1Vertical ? 'HORIZ' : 'VERT', color: '#ef4444' },
      bg: { vSide: isP1Vertical ? '#10b981' : '#ef4444', hSide: isP1Vertical ? '#ef4444' : '#10b981' }
    };
  }, [currentRound]);

  const checkWin = (currentGrid, player) => {
    const dir = roundConfig[player].dir;
    const starts = currentGrid.filter(cell => cell.owner === player && (dir === 'VERT' ? cell.r === 0 : cell.c === GRID_SIZE - 1));
    if (starts.length === 0) return false;
    const visited = new Set();
    const queue = [...starts];
    while (queue.length > 0) {
      const curr = queue.shift();
      const key = `${curr.r}-${curr.c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (dir === 'VERT' ? curr.r === GRID_SIZE - 1 : curr.c === 0) return true;
      const parity = curr.r % 2;
      const offsets = parity === 0 ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]] : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
      offsets.forEach(([dr, dc]) => {
        const nb = currentGrid.find(n => n.r === curr.r + dr && n.c === curr.c + dc);
        if (nb && nb.owner === player && !visited.has(`${nb.r}-${nb.c}`)) queue.push(nb);
      });
    }
    return false;
  };

  const handleTileClick = (tile) => {
    if (tile.owner || roundWinner) return;
    const nextQ = shuffledPool.find(q => !usedQs.has(q.q)) || QUESTIONS_DATABASE[0];
    setActiveQ({ tile, q: nextQ.q, opts: shuffle(nextQ.a), ans: nextQ.a[0] });
  };

  const submitAnswer = (opt) => {
    const isCorrect = opt === activeQ.ans;
    const newGrid = [...grid];
    const idx = newGrid.findIndex(t => t.id === activeQ.tile.id);
    if (isCorrect) {
      newGrid[idx].owner = turn;
      setUsedQs(prev => new Set(prev).add(activeQ.q));
      if (checkWin(newGrid, turn)) {
        const nextScores = { ...scores, [turn]: scores[turn] + 1 };
        setScores(nextScores);
        setRoundWinner(turn);
        const majority = Math.floor(matchRounds / 2) + 1;
        setTimeout(() => {
          if (nextScores[turn] >= majority) setView('MATCH_OVER');
          else setView('ROUND_OVER');
        }, 1000);
      }
    }
    setGrid(newGrid);
    setActiveQ(null);
    if (!roundWinner) setTurn(turn === 'P1' ? 'P2' : 'P1');
  };

  const resetAll = () => {
    setScores({ P1: 0, P2: 0 });
    setCurrentRound(1);
    setUsedQs(new Set());
    setPNames({ p1: '', p2: '' });
    setView('START');
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#020617] overflow-hidden">
      {view === 'START' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 animate-in fade-in">
          <h1 className="text-7xl md:text-[10rem] classic-title font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-500 text-center">سباق المسارات</h1>
          <div className="glass-immersive p-8 md:p-14 rounded-[3.5rem] w-full max-w-xl space-y-6 shadow-2xl">
            <input type="text" placeholder="المتسابق الأول" className="input-pro" value={pNames.p1} onChange={e => setPNames({...pNames, p1: e.target.value})} />
            <input type="text" placeholder="المتسابق الثاني" className="input-pro" value={pNames.p2} onChange={e => setPNames({...pNames, p2: e.target.value})} />
            <button onClick={() => setView('ROUND_SELECT')} disabled={!pNames.p1 || !pNames.p2} className="w-full bg-blue-600 py-7 rounded-3xl font-black text-3xl transition-all shadow-xl disabled:opacity-50">استمرار</button>
          </div>
        </div>
      )}

      {view === 'ROUND_SELECT' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 animate-in zoom-in">
          <Trophy size={100} className="text-yellow-500" />
          <h2 className="text-5xl md:text-8xl font-black classic-title text-center px-4">حدد طول المنافسة</h2>
          <div className="grid grid-cols-2 gap-6 w-full max-w-2xl px-4">
             {[1, 3, 5, 7].map(num => (
               <button key={num} onClick={() => handleStartMatch(num)} className="group p-10 bg-slate-900 border-4 border-slate-700 rounded-[3rem] hover:border-blue-500 transition-all">
                  <span className="text-7xl md:text-9xl font-black block mb-2">{num}</span>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">جولات</span>
               </button>
             ))}
          </div>
        </div>
      )}

      {view === 'GAME' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in">
          <header className="p-3 md:p-6 glass-immersive flex justify-between items-center z-50 border-b border-white/5">
            <div className={`p-2 px-5 rounded-2xl border-2 flex flex-col items-center min-w-[90px] md:min-w-[240px] transition-all ${turn === 'P1' ? 'ring-4 ring-emerald-500/40 bg-emerald-500/20' : 'opacity-20 grayscale'}`} style={{ borderColor: '#10b981' }}>
              <div className="text-lg md:text-3xl font-black leading-none">{pNames.p1.split(' ')[0]} • {scores.P1}</div>
            </div>
            <div className="text-center px-4">
               <div className="classic-title text-xl md:text-4xl leading-none font-black">جولة {currentRound} / {matchRounds}</div>
            </div>
            <div className={`p-2 px-5 rounded-2xl border-2 flex flex-col items-center min-w-[90px] md:min-w-[240px] transition-all ${turn === 'P2' ? 'ring-4 ring-rose-500/40 scale-105 bg-rose-500/20' : 'opacity-20 grayscale'}`} style={{ borderColor: '#ef4444' }}>
              <div className="text-lg md:text-3xl font-black leading-none">{pNames.p2.split(' ')[0]} • {scores.P2}</div>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center relative bg-[#010409]">
             <div className="w-full h-full flex items-center justify-center">
                <svg viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`} className="w-full h-full max-w-full max-h-[85vh] overflow-visible">
                    <g className="neon-glow opacity-95">
                        <rect x={0} y={-400} width={VB_WIDTH} height={500} fill={roundConfig.bg.vSide} style={{ color: roundConfig.bg.vSide }} />
                        <rect x={0} y={VB_HEIGHT-100} width={VB_WIDTH} height={500} fill={roundConfig.bg.vSide} style={{ color: roundConfig.bg.vSide }} />
                        <rect x={-400} y={0} width={500} height={VB_HEIGHT} fill={roundConfig.bg.hSide} style={{ color: roundConfig.bg.hSide }} />
                        <rect x={VB_WIDTH-100} y={0} width={500} height={VB_HEIGHT} fill={roundConfig.bg.hSide} style={{ color: roundConfig.bg.hSide }} />
                    </g>
                    <g>
                      {grid.map(c => {
                        const xOff = (c.r % 2 === 0) ? 0 : (HEX_WIDTH / 2);
                        const cx = (c.c * HEX_WIDTH) + xOff + (HEX_WIDTH / 2);
                        const cy = (c.r * VERT_DIST) + (HEX_HEIGHT / 2);
                        const fill = c.owner === 'P1' ? "#10b981" : c.owner === 'P2' ? "#ef4444" : "#1a2233";
                        return (
                          <g key={c.id} className="cursor-pointer active:scale-95 transition-transform" onClick={() => handleTileClick(c)}>
                            <polygon points={Array.from({length: 6}).map((_, i) => `${cx + HEX_RADIUS * Math.cos((Math.PI/180)*(60*i-30))},${cy + HEX_RADIUS * Math.sin((Math.PI/180)*(60*i-30))}`).join(' ')} fill={fill} stroke={c.owner ? "#ffffff" : "#334155"} strokeWidth="6" />
                            {!c.owner && <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="hex-char">{c.label}</text>}
                          </g>
                        );
                      })}
                    </g>
                </svg>
             </div>
          </main>
          <footer className="p-4 glass-immersive border-t border-white/5 flex justify-center z-50">
             <button onClick={resetAll} className="text-rose-400 font-bold px-6 py-2 rounded-full border border-rose-500/20 flex items-center gap-2"><LogOut size={16}/> إنهاء</button>
          </footer>
        </div>
      )}

      {activeQ && (
        <div className="fixed inset-0 bg-black/99 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-3xl">
          <div className="glass-immersive border-4 w-full max-w-6xl rounded-[4rem] md:rounded-[6rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in" style={{ borderColor: turn === 'P1' ? '#10b981' : '#ef4444' }}>
            <div className="bg-white/5 p-8 md:p-14 flex flex-col items-center border-b border-white/10 text-center">
                <div className="text-blue-400 text-sm font-black uppercase tracking-widest mb-2">دور المتسابق: {turn === 'P1' ? pNames.p1 : pNames.p2}</div>
                <div className="text-4xl md:text-8xl font-black classic-title text-white">سؤال التحدي</div>
            </div>
            <div className="p-8 md:p-24 space-y-12 text-center overflow-y-auto max-h-[70vh]">
              <h3 className="text-3xl md:text-[5.5rem] leading-tight font-black text-white drop-shadow-lg">{activeQ.q}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
                {activeQ.opts.map((o, i) => (
                  <button key={i} onClick={() => submitAnswer(o)} className="p-10 md:p-16 bg-slate-800 hover:bg-blue-700 rounded-[3rem] border-2 border-white/10 transition-all text-2xl md:text-6xl font-black text-white active:scale-95 leading-tight shadow-xl">{o}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'ROUND_OVER' && (
        <div className="fixed inset-0 bg-[#020617] z-[200] flex flex-col items-center justify-center p-6 animate-in zoom-in text-center">
          <Zap size={150} className={`mx-auto animate-pulse ${roundWinner === 'P1' ? 'text-emerald-400' : 'text-rose-400'}`} />
          <h2 className="win-text classic-title text-white my-10 leading-none">فاز {roundWinner === 'P1' ? pNames.p1 : pNames.p2}</h2>
          <button onClick={() => { setCurrentRound(prev => prev + 1); generateNewGrid(); setView('GAME'); }} className="btn-action bg-blue-600 text-white shadow-2xl flex items-center gap-6"><RefreshCw size={50} /> الجولة التالية</button>
        </div>
      )}

      {view === 'MATCH_OVER' && (
        <div className="fixed inset-0 bg-[#020617] z-[300] flex flex-col items-center justify-center p-6 animate-in zoom-in text-center">
          <Trophy size={200} className="text-yellow-400 mx-auto animate-bounce mb-8" />
          <h2 className="win-text classic-title text-white">بطل المسابقة!</h2>
          <p className="win-sub text-white/70 py-4">ألف مبروك للفائز</p>
          <p className={`win-text ${scores.P1 > scores.P2 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {scores.P1 > scores.P2 ? pNames.p1 : pNames.p2}
          </p>
          <button onClick={resetAll} className="mt-12 btn-action bg-white text-blue-950 shadow-2xl">بدء مسابقة جديدة</button>
        </div>
      )}
    </div>
  );
}

```

