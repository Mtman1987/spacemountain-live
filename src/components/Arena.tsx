import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Crosshair,
  Heart,
  Skull,
  Trophy,
  ShoppingCart,
  X,
  Package,
  Bot,
  Target,
  Coins,
  Zap,
  RotateCcw,
} from 'lucide-react';

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
  username?: string;
  displayName?: string;
  onSpendPoints?: (amount: number) => Promise<boolean>;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  kind: 'bullet' | 'missile' | 'test';
}

interface Drone {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  enabled: boolean;
}

type Inventory = {
  bullets: number;
  missiles: number;
  shields: number;
  speedBoosts: number;
  testShots: number;
};

const rocketImage = '/assets/model-rocket.png';

const defaultInventory: Inventory = {
  bullets: 12,
  missiles: 0,
  shields: 0,
  speedBoosts: 0,
  testShots: 999,
};

const inventoryStorageKey = 'spmtArenaInventory';
const statsStorageKey = 'spmtArenaStats';

function loadInventory(): Inventory {
  try {
    const saved = localStorage.getItem(inventoryStorageKey);
    return saved ? { ...defaultInventory, ...JSON.parse(saved) } : defaultInventory;
  } catch {
    return defaultInventory;
  }
}

function loadLocalStats() {
  try {
    const saved = localStorage.getItem(statsStorageKey);
    return saved ? { kills: 0, deaths: 0, ...JSON.parse(saved) } : { kills: 0, deaths: 0 };
  } catch {
    return { kills: 0, deaths: 0 };
  }
}

export default function Arena({ accentColor, points, username, displayName, onSpendPoints }: ArenaProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [myId, setMyId] = useState<string>('local-pilot');
  const [joined, setJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [showInventory, setShowInventory] = useState(true);
  const [balance, setBalance] = useState(points);
  const [inventory, setInventory] = useState<Inventory>(() => loadInventory());
  const [localStats, setLocalStats] = useState(() => loadLocalStats());
  const [selectedWeapon, setSelectedWeapon] = useState<'bullet' | 'missile' | 'test'>('bullet');
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [, setFrameTick] = useState(0);
  const [hitFeedback, setHitFeedback] = useState('');
  const [spendStatus, setSpendStatus] = useState('Purchases update arena inventory immediately. DSH spend is attempted when a spend hook is available.');
  const [practiceDroneEnabled, setPracticeDroneEnabled] = useState(true);
  const [dummyEnabled, setDummyEnabled] = useState(true);
  const [practiceDrone, setPracticeDrone] = useState<Drone>({
    id: 'practice-drone',
    name: 'Practice Drone',
    x: 520,
    y: 220,
    hp: 60,
    maxHp: 60,
    enabled: true,
  });
  const [targetDummy, setTargetDummy] = useState<Drone>({
    id: 'target-dummy',
    name: 'Target Dummy',
    x: 250,
    y: 390,
    hp: 40,
    maxHp: 40,
    enabled: true,
  });

  const arenaRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 400, y: 300, angle: 0 });
  const mouseRef = useRef({ x: 400, y: 300 });
  const token = localStorage.getItem('spmtToken');
  const pilotName = displayName || username || 'Guest Captain';

  const visibleKills = Math.max(localStats.kills, ...players.map((p) => p.kills || 0), 0);
  const visibleDeaths = Math.max(localStats.deaths, ...players.map((p) => p.deaths || 0), 0);
  const level = visibleKills;

  const weaponStatus = useMemo(() => {
    if (selectedWeapon === 'bullet') return `${inventory.bullets} bullets`;
    if (selectedWeapon === 'missile') return `${inventory.missiles} missiles`;
    return 'test shots unlimited';
  }, [inventory.bullets, inventory.missiles, selectedWeapon]);

  useEffect(() => { setBalance(points); }, [points]);

  useEffect(() => {
    localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(statsStorageKey, JSON.stringify(localStats));
  }, [localStats]);

  const apiCall = useCallback(async (path: string, opts?: any) => {
    return fetch(`https://spmt.live${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
      credentials: 'include',
    });
  }, [token]);

  const joinArena = async () => {
    setJoined(true);
    if (!token) {
      setMyId('local-pilot');
      setSpendStatus('Practice mode active. Sign in to sync multiplayer state and DSH balance.');
      return;
    }

    try {
      const res = await apiCall('/api/arena/join', { method: 'POST' });
      if (res.ok) {
        const me = await apiCall('/api/auth/me');
        if (me.ok) {
          const d = await me.json();
          setMyId(d.user.id);
        }
      }
    } catch {
      setSpendStatus('Arena API was unreachable, so practice mode is active locally.');
    }
  };

  useEffect(() => {
    if (!joined) return;
    let animId: number;
    const followLoop = () => {
      const pos = posRef.current;
      const mouse = mouseRef.current;
      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const f = dist < 50 ? 0.025 : dist < 150 ? 0.045 : 0.065;

      pos.x += dx * f;
      pos.y += dy * f;

      if (dist > 2) {
        pos.angle = Math.atan2(dx, -dy) * 180 / Math.PI;
      }

      setFrameTick((tick) => (tick + 1) % 1000);
      animId = requestAnimationFrame(followLoop);
    };
    followLoop();
    return () => cancelAnimationFrame(animId);
  }, [joined]);

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

  useEffect(() => {
    if (!joined || !token) return;
    const sync = setInterval(async () => {
      const { x, y, angle } = posRef.current;
      try {
        await apiCall('/api/arena/update', { method: 'POST', body: JSON.stringify({ x, y, angle }) });
        const res = await apiCall('/api/arena/state');
        if (res.ok) {
          const d = await res.json();
          setPlayers(Array.isArray(d.players) ? d.players : []);
        }
      } catch {
        // Keep local practice mode running if the arena API is offline.
      }
    }, 250);
    return () => clearInterval(sync);
  }, [joined, token, apiCall]);

  useEffect(() => {
    if (!joined || !practiceDroneEnabled) return;
    const loop = setInterval(() => {
      setPracticeDrone((prev) => {
        if (!prev.enabled) return prev;
        const t = Date.now() / 850;
        return {
          ...prev,
          x: 520 + Math.sin(t) * 130,
          y: 225 + Math.cos(t * 0.7) * 55,
        };
      });
    }, 50);
    return () => clearInterval(loop);
  }, [joined, practiceDroneEnabled]);

  const spendAmmo = (weapon: 'bullet' | 'missile' | 'test') => {
    if (weapon === 'test') return true;
    if (weapon === 'bullet' && inventory.bullets > 0) {
      setInventory((prev) => ({ ...prev, bullets: prev.bullets - 1 }));
      return true;
    }
    if (weapon === 'missile' && inventory.missiles > 0) {
      setInventory((prev) => ({ ...prev, missiles: prev.missiles - 1 }));
      return true;
    }
    setHitFeedback(`No ${weapon === 'bullet' ? 'bullets' : 'missiles'} in inventory`);
    setTimeout(() => setHitFeedback(''), 1400);
    return false;
  };

  const addProjectile = (x: number, y: number, targetX: number, targetY: number, kind: 'bullet' | 'missile' | 'test') => {
    const id = Date.now() + Math.random();
    setProjectiles((prev) => [...prev, { id, x, y, targetX, targetY, kind }]);
    setTimeout(() => setProjectiles((prev) => prev.filter((p) => p.id !== id)), 420);
  };

  const registerKill = (label: string) => {
    setLocalStats((prev) => ({ ...prev, kills: prev.kills + 1 }));
    setHitFeedback(`${label} destroyed. +1 level`);
    setTimeout(() => setHitFeedback(''), 1700);
  };

  const damageDrone = (drone: Drone, setter: React.Dispatch<React.SetStateAction<Drone>>, damage: number, label: string) => {
    const nextHp = Math.max(0, drone.hp - damage);
    if (nextHp <= 0) {
      registerKill(label);
      setter((prev) => ({ ...prev, hp: prev.maxHp, x: prev.x === 250 ? 280 : 520, y: prev.y === 390 ? 390 : 225 }));
    } else {
      setter((prev) => ({ ...prev, hp: nextHp }));
      setHitFeedback(`${label} hit for ${damage}`);
      setTimeout(() => setHitFeedback(''), 1100);
    }
  };

  const handleShoot = async (e: React.MouseEvent) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const { x, y } = posRef.current;
    const damage = selectedWeapon === 'missile' ? 40 : selectedWeapon === 'test' ? 10 : 20;

    if (!spendAmmo(selectedWeapon)) return;
    addProjectile(x, y, clickX, clickY, selectedWeapon);

    const activeLocalTargets = [
      ...(practiceDroneEnabled && practiceDrone.enabled ? [{ drone: practiceDrone, setter: setPracticeDrone, label: practiceDrone.name }] : []),
      ...(dummyEnabled && targetDummy.enabled ? [{ drone: targetDummy, setter: setTargetDummy, label: targetDummy.name }] : []),
    ];

    for (const target of activeLocalTargets) {
      if (Math.hypot(target.drone.x - clickX, target.drone.y - clickY) < 54) {
        damageDrone(target.drone, target.setter, damage, target.label);
        return;
      }
    }

    let closest: Player | null = null;
    let closestDist = 58;
    for (const p of players) {
      if (p.user_id === myId) continue;
      const d = Math.hypot(p.x - clickX, p.y - clickY);
      if (d < closestDist) { closest = p; closestDist = d; }
    }

    if (!closest) {
      setHitFeedback('Shot fired. No target hit.');
      setTimeout(() => setHitFeedback(''), 900);
      return;
    }

    try {
      const res = await apiCall('/api/arena/shoot', { method: 'POST', body: JSON.stringify({ targetId: closest.user_id }) });
      if (res.ok) {
        const data = await res.json();
        if (data.killed) setLocalStats((prev) => ({ ...prev, kills: prev.kills + 1 }));
        setHitFeedback(data.killed ? 'Kill confirmed. +1 level' : `Hit for ${data.damage}`);
        setTimeout(() => setHitFeedback(''), 1500);
      }
    } catch {
      setHitFeedback('Shot shown locally. Arena API did not confirm hit.');
      setTimeout(() => setHitFeedback(''), 1500);
    }
  };

  const handlePurchase = async (itemId: keyof Inventory, count: number, cost: number, name: string) => {
    if (balance < cost) {
      setSpendStatus('Not enough points for that item.');
      return;
    }

    let charged = false;
    if (onSpendPoints) {
      charged = await onSpendPoints(cost);
      if (!charged) {
        setSpendStatus('DSH spend failed or balance was too low. Inventory was not changed.');
        return;
      }
    }

    setBalance((prev) => Math.max(0, prev - cost));
    setInventory((prev) => ({ ...prev, [itemId]: prev[itemId] + count }));
    setSpendStatus(charged
      ? `${name} purchased and DSH spend confirmed.`
      : `${name} added to local practice inventory.`);
  };

  const resetPractice = () => {
    setPracticeDrone((prev) => ({ ...prev, hp: prev.maxHp, enabled: true }));
    setTargetDummy((prev) => ({ ...prev, hp: prev.maxHp, enabled: true }));
    setLocalStats({ kills: 0, deaths: 0 });
    setInventory(defaultInventory);
    setHitFeedback('Practice arena reset.');
    setTimeout(() => setHitFeedback(''), 1200);
  };

  useEffect(() => {
    fetch('https://spmt.live/api/arena/leaderboard').then(r => r.json()).then(setLeaderboard).catch(() => {});
  }, [joined]);

  const localPlayer: Player = {
    user_id: myId,
    username: pilotName,
    x: posRef.current.x,
    y: posRef.current.y,
    angle: posRef.current.angle,
    hp: 100,
    kills: localStats.kills,
    deaths: localStats.deaths,
  };

  const renderDrone = (drone: Drone, enabled: boolean, tone: string) => enabled && drone.enabled ? (
    <div
      key={drone.id}
      className="absolute transition-transform duration-75"
      style={{ left: drone.x - 18, top: drone.y - 18 }}
    >
      <div className="relative w-9 h-9 rounded-full border flex items-center justify-center bg-black/70" style={{ borderColor: tone, boxShadow: `0 0 16px ${tone}44` }}>
        <Bot size={18} style={{ color: tone }} />
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold whitespace-nowrap text-zinc-300">{drone.name}</span>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(drone.hp / drone.maxHp) * 100}%`, backgroundColor: tone }} />
        </div>
      </div>
    </div>
  ) : null;

  if (!joined) {
    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center gap-6 py-16">
        <img src={rocketImage} alt="SpaceMountain arena rocket" className="w-24 h-24 object-contain drop-shadow-[0_0_22px_rgba(255,255,255,0.25)]" />
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white">ROCKET ARENA</h2>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed mt-2">
            Practice mode works immediately: fly the same rocket from the main app, buy ammo into inventory, shoot test targets, and earn one level per kill.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-zinc-400 font-mono">
          <span className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">Move mouse to fly</span>
          <span className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">Click to shoot</span>
          <span className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">Inventory is visible</span>
          <span className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">1 kill = 1 level</span>
        </div>
        <button onClick={joinArena} className="px-8 py-3 rounded-xl font-bold text-sm text-black transition-all hover:-translate-y-1" style={{ backgroundColor: accentColor, boxShadow: `0 4px 24px ${accentColor}55` }}>
          {token ? 'ENTER THE ARENA' : 'START PRACTICE MODE'}
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/60 border border-white/10">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-red-400"><Heart size={14} /> 100</span>
          <span className="flex items-center gap-1 text-amber-400">LVL {level}</span>
          <span className="flex items-center gap-1 text-emerald-400"><Crosshair size={14} /> {visibleKills} kills</span>
          <span className="flex items-center gap-1 text-zinc-400"><Skull size={14} /> {visibleDeaths} deaths</span>
          <span className="flex items-center gap-1" style={{ color: accentColor }}><Coins size={14} /> {balance.toLocaleString()} XP</span>
          <span className="flex items-center gap-1 text-cyan-300"><Zap size={14} /> {weaponStatus}</span>
        </div>
        <div className="flex items-center gap-2">
          {hitFeedback && <span className="text-xs font-bold text-amber-400 animate-pulse">{hitFeedback}</span>}
          <button onClick={() => setShowInventory(!showInventory)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1">
            <Package size={12} /> Inventory
          </button>
          <button onClick={() => setShowShop(!showShop)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1">
            <ShoppingCart size={12} /> Shop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3">
        <div className="flex flex-col gap-3">
          {showInventory && (
            <div className="rounded-2xl border border-white/10 bg-black/55 backdrop-blur-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Inventory</span>
                <span className="text-[10px] text-zinc-500 font-mono">{pilotName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  ['Bullets', inventory.bullets, 'bullet'],
                  ['Missiles', inventory.missiles, 'missile'],
                  ['Shields', inventory.shields, 'shield'],
                  ['Boosts', inventory.speedBoosts, 'boost'],
                ].map(([label, value, key]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => (key === 'bullet' || key === 'missile') && setSelectedWeapon(key as 'bullet' | 'missile')}
                    className={`rounded-xl border p-3 text-left ${selectedWeapon === key ? 'border-amber-400/50 bg-amber-500/10' : 'border-white/5 bg-white/[0.02]'}`}
                  >
                    <span className="text-[10px] text-zinc-500 font-mono">{label}</span>
                    <span className="block text-lg font-bold text-white">{value}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedWeapon('test')} className={`w-full mt-2 rounded-xl border p-3 text-left ${selectedWeapon === 'test' ? 'border-cyan-400/50 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
                <span className="text-[10px] text-zinc-500 font-mono">Test shots</span>
                <span className="block text-xs font-bold text-cyan-300">Unlimited no-cost practice fire</span>
              </button>
            </div>
          )}

          {showShop && (
            <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Arena Shop</span>
                <button onClick={() => setShowShop(false)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">Balance: <span style={{ color: accentColor }} className="font-bold">{balance.toLocaleString()} XP</span></p>
              {[
                { id: 'bullets' as keyof Inventory, count: 10, name: '10 Bullets', cost: 50, desc: 'Standard ammo' },
                { id: 'missiles' as keyof Inventory, count: 3, name: '3 Missiles', cost: 150, desc: 'High damage' },
                { id: 'shields' as keyof Inventory, count: 1, name: '1 Shield', cost: 200, desc: 'Inventory item' },
                { id: 'speedBoosts' as keyof Inventory, count: 1, name: '1 Speed Boost', cost: 100, desc: 'Inventory item' },
              ].map(item => (
                <button
                  key={item.name}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex flex-col gap-1 text-left transition-all"
                  onClick={() => handlePurchase(item.id, item.count, item.cost, item.name)}
                >
                  <span className="text-xs font-bold text-white">{item.name}</span>
                  <span className="text-[9px] text-zinc-500">{item.desc}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: balance >= item.cost ? accentColor : '#ef4444' }}>{item.cost.toLocaleString()} XP</span>
                </button>
              ))}
              <span className="text-[10px] text-zinc-500 leading-relaxed">{spendStatus}</span>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
            <span className="text-sm font-bold text-white">Practice Controls</span>
            <div className="flex flex-col gap-2 mt-3">
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Practice drone
                <input type="checkbox" checked={practiceDroneEnabled} onChange={(e) => setPracticeDroneEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-300">
                Target dummy
                <input type="checkbox" checked={dummyEnabled} onChange={(e) => setDummyEnabled(e.target.checked)} />
              </label>
              <button onClick={resetPractice} className="mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1">
                <RotateCcw size={12} /> Reset Practice
              </button>
            </div>
          </div>
        </div>

        <div
          ref={arenaRef}
          onClick={handleShoot}
          className="relative w-full h-[620px] rounded-2xl border border-white/10 overflow-hidden cursor-crosshair select-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(10,10,30,1) 0%, rgba(0,0,0,1) 100%)' }}
        >
          {Array.from({ length: 70 }).map((_, i) => (
            <div key={i} className="absolute w-[2px] h-[2px] bg-white/20 rounded-full" style={{ left: `${(i * 37 + 13) % 100}%`, top: `${(i * 61 + 7) % 100}%` }} />
          ))}

          {projectiles.map((projectile) => (
            <motion.div
              key={projectile.id}
              initial={{ x: projectile.x, y: projectile.y, opacity: 1, scale: projectile.kind === 'missile' ? 1.6 : 1 }}
              animate={{ x: projectile.targetX, y: projectile.targetY, opacity: 0.1, scale: projectile.kind === 'missile' ? 2.3 : 1.2 }}
              transition={{ duration: 0.36, ease: 'easeOut' }}
              className={`absolute w-2 h-2 rounded-full pointer-events-none ${projectile.kind === 'missile' ? 'bg-orange-400' : projectile.kind === 'test' ? 'bg-cyan-300' : 'bg-amber-300'}`}
              style={{ boxShadow: `0 0 12px ${projectile.kind === 'test' ? '#67e8f9' : '#f59e0b'}` }}
            />
          ))}

          {renderDrone(practiceDrone, practiceDroneEnabled, '#f59e0b')}
          {renderDrone(targetDummy, dummyEnabled, '#22c55e')}

          {[localPlayer, ...players.filter((player) => player.user_id !== myId)].map(player => {
            const isMe = player.user_id === myId;
            const x = isMe ? posRef.current.x : player.x;
            const y = isMe ? posRef.current.y : player.y;
            const angle = isMe ? posRef.current.angle : player.angle;
            return (
              <div
                key={player.user_id}
                className="absolute transition-all duration-75"
                style={{ left: x - 24, top: y - 24 }}
              >
                <div className="relative w-12 h-12">
                  <img
                    src={rocketImage}
                    alt={`${player.username} rocket`}
                    className="w-12 h-12 object-contain select-none"
                    style={{ transform: `rotate(${angle}deg)`, filter: `drop-shadow(0 0 10px ${isMe ? accentColor : '#ffffff55'})` }}
                    draggable={false}
                  />
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${player.hp}%`, backgroundColor: player.hp > 50 ? '#10b981' : player.hp > 25 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className={`absolute top-12 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold whitespace-nowrap ${isMe ? 'text-amber-300' : 'text-zinc-400'}`}>
                    {player.username}{isMe ? ' (you)' : ''}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="absolute left-4 bottom-4 rounded-2xl border border-white/10 bg-black/55 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white"><Target size={14} /> Selected: {selectedWeapon}</div>
            <p className="text-[10px] text-zinc-500 mt-1">Click a drone, dummy, or enemy to fire.</p>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-zinc-500 font-mono text-center">
        Move mouse to fly • Click targets to shoot • Practice works without another player online • 1 kill = 1 level
      </p>
    </motion.div>
  );
}
