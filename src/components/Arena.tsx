import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Crosshair, Heart, Skull, Trophy, ShoppingCart, X } from 'lucide-react';

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
  points: number;
}

export default function Arena({ accentColor, points }: ArenaProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [joined, setJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [balance, setBalance] = useState(points);
  const [hitFeedback, setHitFeedback] = useState('');
  const arenaRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 400, y: 300, angle: 0 });
  const mouseRef = useRef({ x: 400, y: 300 });
  const token = localStorage.getItem('spmtToken');

  // Keep balance synced with points from parent
  useEffect(() => { setBalance(points); }, [points]);

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

  // Rocket follows mouse with floaty 0G physics (like main page)
  useEffect(() => {
    if (!joined) return;

    let animId: number;
    const followLoop = () => {
      const pos = posRef.current;
      const mouse = mouseRef.current;

      // Floaty follow — same feel as main page rocket
      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const f = dist < 50 ? 0.02 : dist < 150 ? 0.04 : 0.06;

      pos.x += dx * f;
      pos.y += dy * f;

      // Angle toward mouse
      if (dist > 2) {
        pos.angle = Math.atan2(dx, -dy) * 180 / Math.PI;
      }

      animId = requestAnimationFrame(followLoop);
    };
    followLoop();
    return () => cancelAnimationFrame(animId);
  }, [joined]);

  // Track mouse position relative to arena
  useEffect(() => {
    if (!joined || !arenaRef.current) return;
    const handleMove = (e: MouseEvent) => {
      const rect = arenaRef.current!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const el = arenaRef.current;
    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, [joined]);

  // Sync position to server + fetch other players
  useEffect(() => {
    if (!joined) return;
    const sync = setInterval(async () => {
      const { x, y, angle } = posRef.current;
      await apiCall('/api/arena/update', { method: 'POST', body: JSON.stringify({ x, y, angle }) });
      const res = await apiCall('/api/arena/state');
      if (res.ok) { const d = await res.json(); setPlayers(d.players); }
    }, 150);
    return () => clearInterval(sync);
  }, [joined, apiCall]);

  // Click to shoot — find nearest enemy to click position
  const handleShoot = async (e: React.MouseEvent) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find closest enemy within 60px of click
    let closest: Player | null = null;
    let closestDist = 60;
    for (const p of players) {
      if (p.user_id === myId) continue;
      const d = Math.hypot(p.x - clickX, p.y - clickY);
      if (d < closestDist) { closest = p; closestDist = d; }
    }

    if (!closest) return;

    const res = await apiCall('/api/arena/shoot', { method: 'POST', body: JSON.stringify({ targetId: closest.user_id }) });
    if (res.ok) {
      const data = await res.json();
      setHitFeedback(data.killed ? '💀 KILL!' : `Hit! -${data.damage}HP`);
      setTimeout(() => setHitFeedback(''), 1500);
    }
  };

  // Purchase item — deducts from DSH points
  const handlePurchase = async (itemId: string, cost: number, name: string) => {
    if (balance < cost) { alert('Not enough points!'); return; }
    // TODO: wire to DSH deduction API
    setBalance(prev => prev - cost);
    alert(`${name} purchased! Inventory coming soon.`);
  };

  // Fetch leaderboard
  useEffect(() => {
    fetch('https://spmt.live/api/arena/leaderboard').then(r => r.json()).then(setLeaderboard).catch(() => {});
  }, [joined]);

  const me = players.find(p => p.user_id === myId);
  const level = me ? Math.floor(me.kills / 3) + 1 : 1;

  if (!joined) {
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center gap-6 py-16">
        <div className="text-6xl mb-2">🚀</div>
        <h2 className="text-2xl font-display font-extrabold text-white">ROCKET ARENA</h2>
        <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
          Your rocket follows your cursor in zero-G. Click to shoot nearby enemies.
          Kills level you up. Spend your community points on ammo and power-ups.
        </p>
        <div className="flex flex-col gap-2 text-[10px] text-zinc-500 font-mono">
          <span>Move mouse to fly • Click near enemies to shoot</span>
          <span>Kills = level up • Points from community activity</span>
        </div>
        <button onClick={joinArena} className="px-8 py-3 rounded-xl font-bold text-sm text-black transition-all hover:-translate-y-1" style={{ backgroundColor: accentColor, boxShadow: `0 4px 24px ${accentColor}55` }}>
          {token ? 'ENTER THE ARENA' : 'SIGN IN TO PLAY'}
        </button>
        {leaderboard.length > 0 && (
          <div className="mt-6 w-full max-w-sm">
            <h3 className="text-xs font-mono font-bold text-zinc-400 mb-3 flex items-center gap-2"><Trophy size={14} /> TOP PILOTS</h3>
            <div className="flex flex-col gap-1">
              {leaderboard.slice(0, 5).map((l: any, i: number) => (
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-black/60 border border-white/10">
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-red-400"><Heart size={14} /> {me?.hp || 100}</span>
          <span className="flex items-center gap-1 text-amber-400">LVL {level}</span>
          <span className="flex items-center gap-1 text-emerald-400"><Crosshair size={14} /> {me?.kills || 0}</span>
          <span className="flex items-center gap-1 text-zinc-400"><Skull size={14} /> {me?.deaths || 0}</span>
          <span className="flex items-center gap-1" style={{ color: accentColor }}>{balance.toLocaleString()} pts</span>
        </div>
        <div className="flex items-center gap-2">
          {hitFeedback && <span className="text-xs font-bold text-amber-400 animate-pulse">{hitFeedback}</span>}
          <button onClick={() => setShowShop(!showShop)} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1">
            <ShoppingCart size={12} /> Shop
          </button>
        </div>
      </div>

      {/* Arena Shop */}
      {showShop && (
        <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Arena Shop</span>
            <button onClick={() => setShowShop(false)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono">Balance: <span style={{ color: accentColor }} className="font-bold">{balance.toLocaleString()} points</span> (from community activity)</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'bullets-10', name: '10 Bullets', cost: 500, desc: 'Standard ammo' },
              { id: 'missiles-3', name: '3 Missiles', cost: 1500, desc: 'High damage, slow' },
              { id: 'shield', name: 'Shield (30s)', cost: 2000, desc: 'Temp invulnerability' },
              { id: 'speed-boost', name: 'Speed Boost', cost: 1000, desc: '2x speed 20s' },
            ].map(item => (
              <button
                key={item.id}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col gap-1 text-left transition-all"
                onClick={() => handlePurchase(item.id, item.cost, item.name)}
              >
                <span className="text-xs font-bold text-white">{item.name}</span>
                <span className="text-[9px] text-zinc-500">{item.desc}</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: balance >= item.cost ? accentColor : '#ef4444' }}>{item.cost.toLocaleString()} pts</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Arena battlefield */}
      <div
        ref={arenaRef}
        onClick={handleShoot}
        className="relative w-full h-[600px] rounded-2xl border border-white/10 overflow-hidden cursor-crosshair select-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(10,10,30,1) 0%, rgba(0,0,0,1) 100%)' }}
      >
        {/* Stars */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute w-[2px] h-[2px] bg-white/20 rounded-full" style={{ left: `${(i * 37 + 13) % 100}%`, top: `${(i * 61 + 7) % 100}%` }} />
        ))}

        {/* All players */}
        {players.map(player => {
          const isMe = player.user_id === myId;
          return (
            <div
              key={player.user_id}
              className="absolute transition-all duration-150"
              style={{ left: player.x - 16, top: player.y - 16, transform: `rotate(${player.angle}deg)` }}
            >
              <div className="relative">
                <span className="text-2xl select-none">🚀</span>
                {/* HP bar */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${player.hp}%`, backgroundColor: player.hp > 50 ? '#10b981' : player.hp > 25 ? '#f59e0b' : '#ef4444' }} />
                </div>
                {/* Name */}
                <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold whitespace-nowrap ${isMe ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {player.username}{isMe ? ' (you)' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-zinc-500 font-mono text-center">
        Move mouse to fly • Click near enemies to shoot • {players.length} pilot(s) active
      </p>
    </motion.div>
  );
}
