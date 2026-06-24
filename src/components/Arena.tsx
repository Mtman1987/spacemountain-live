import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Crosshair, Heart, Skull, Trophy, ShoppingCart } from 'lucide-react';

interface Player {
  user_id: string;
  username: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  kills: number;
  deaths: number;
}

interface ArenaProps {
  accentColor: string;
}

export default function Arena({ accentColor }: ArenaProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [joined, setJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [hitFeedback, setHitFeedback] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 400, y: 300, angle: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const token = localStorage.getItem('spmtToken');

  const apiCall = useCallback(async (path: string, opts?: any) => {
    return fetch(`https://spmt.live${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts?.headers || {}) },
      credentials: 'include',
    });
  }, [token]);

  // Join arena
  const joinArena = async () => {
    if (!token) { window.location.href = '/auth/login'; return; }
    const res = await apiCall('/api/arena/join', { method: 'POST' });
    if (res.ok) {
      setJoined(true);
      const me = await apiCall('/api/auth/me');
      if (me.ok) { const d = await me.json(); setMyId(d.user.id); }
    }
  };

  // Game loop - update position and fetch others
  useEffect(() => {
    if (!joined) return;
    const gameLoop = setInterval(async () => {
      const keys = keysRef.current;
      const speed = 4;
      let { x, y, angle } = posRef.current;

      if (keys.has('w') || keys.has('arrowup')) { x += Math.sin(angle * Math.PI / 180) * speed; y -= Math.cos(angle * Math.PI / 180) * speed; }
      if (keys.has('s') || keys.has('arrowdown')) { x -= Math.sin(angle * Math.PI / 180) * speed; y += Math.cos(angle * Math.PI / 180) * speed; }
      if (keys.has('a') || keys.has('arrowleft')) angle -= 4;
      if (keys.has('d') || keys.has('arrowright')) angle += 4;

      x = Math.max(20, Math.min(780, x));
      y = Math.max(20, Math.min(580, y));
      posRef.current = { x, y, angle };

      // Send position
      await apiCall('/api/arena/update', { method: 'POST', body: JSON.stringify({ x, y, angle }) });

      // Fetch all players
      const res = await apiCall('/api/arena/state');
      if (res.ok) { const d = await res.json(); setPlayers(d.players); }
    }, 100);

    return () => clearInterval(gameLoop);
  }, [joined, apiCall]);

  // Keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Shoot on click
  const handleShoot = async (targetId: string) => {
    if (targetId === myId) return;
    const res = await apiCall('/api/arena/shoot', { method: 'POST', body: JSON.stringify({ targetId }) });
    if (res.ok) {
      const data = await res.json();
      setHitFeedback(data.killed ? '💀 KILL!' : `Hit! -${data.damage}HP`);
      setTimeout(() => setHitFeedback(''), 1500);
    }
  };

  // Fetch leaderboard
  useEffect(() => {
    fetch('https://spmt.live/api/arena/leaderboard').then(r => r.json()).then(setLeaderboard).catch(() => {});
  }, [players]);

  const me = players.find(p => p.user_id === myId);

  if (!joined) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center gap-6 py-16"
      >
        <div className="text-6xl mb-2">🚀</div>
        <h2 className="text-2xl font-display font-extrabold text-white">ROCKET ARENA</h2>
        <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
          Fly your rocket, shoot other players, earn XP and level up. 
          Deaths don't cost you — kills earn you glory.
        </p>
        <div className="flex flex-col gap-2 text-[10px] text-zinc-500 font-mono">
          <span>WASD/Arrows to move • Click enemy rockets to shoot</span>
          <span>+25 XP per kill • Buy ammo & power-ups in the shop</span>
        </div>
        <button
          onClick={joinArena}
          className="px-8 py-3 rounded-xl font-bold text-sm text-black transition-all hover:-translate-y-1"
          style={{ backgroundColor: accentColor, boxShadow: `0 4px 24px ${accentColor}55` }}
        >
          {token ? 'ENTER THE ARENA' : 'SIGN IN TO PLAY'}
        </button>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-6 w-full max-w-sm">
            <h3 className="text-xs font-mono font-bold text-zinc-400 mb-3 flex items-center gap-2"><Trophy size={14} /> TOP PILOTS</h3>
            <div className="flex flex-col gap-1">
              {leaderboard.slice(0, 5).map((l, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <span className="font-bold text-white">#{i + 1} {l.username}</span>
                  <span className="font-mono text-zinc-400">{l.kills}K / {l.deaths}D</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-3"
    >
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-black/60 border border-white/10">
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-red-400"><Heart size={14} /> {me?.hp || 100}/100</span>
          <span className="flex items-center gap-1 text-emerald-400"><Crosshair size={14} /> {me?.kills || 0} kills</span>
          <span className="flex items-center gap-1 text-zinc-400"><Skull size={14} /> {me?.deaths || 0} deaths</span>
        </div>
        <div className="flex items-center gap-2">
          {hitFeedback && <span className="text-xs font-bold text-amber-400 animate-pulse">{hitFeedback}</span>}
          <button onClick={() => setShowShop(!showShop)} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1">
            <ShoppingCart size={12} /> Shop
          </button>
        </div>
      </div>

      {/* Arena battlefield */}
      <div
        ref={canvasRef}
        className="relative w-full h-[600px] rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at center, rgba(10,10,30,1) 0%, rgba(0,0,0,1) 100%)' }}
      >
        {/* Stars background */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute w-[2px] h-[2px] bg-white/30 rounded-full" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%` }} />
        ))}

        {/* Render all players */}
        {players.map(player => {
          const isMe = player.user_id === myId;
          return (
            <div
              key={player.user_id}
              className={`absolute transition-all duration-100 ${isMe ? '' : 'cursor-crosshair'}`}
              style={{ left: player.x - 16, top: player.y - 16, transform: `rotate(${player.angle}deg)` }}
              onClick={() => !isMe && handleShoot(player.user_id)}
            >
              <div className="relative">
                <span className="text-2xl">🚀</span>
                {/* HP bar */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${player.hp}%`, backgroundColor: player.hp > 50 ? '#10b981' : player.hp > 25 ? '#f59e0b' : '#ef4444' }} />
                </div>
                {/* Username */}
                <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold whitespace-nowrap ${isMe ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {player.username}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls hint */}
      <p className="text-[9px] text-zinc-500 font-mono text-center">WASD to fly • Click enemy rockets to shoot • {players.length} pilot(s) in arena</p>
    </motion.div>
  );
}
