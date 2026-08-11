import { Activity, ArrowRight, Bell, Boxes, MessageSquare, Radio, Rocket, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { CommunityTool, DashboardStats, UserProfile } from '../../types';
import type { ThemePreset } from '../../lib/theme-presets';

type HomeRouteProps = {
  identity: UserProfile | null;
  tools: CommunityTool[];
  stats: DashboardStats;
  unreadCount: number;
  activeEmbedCount: number;
  theme: ThemePreset;
  onNavigate: (tab: string) => void;
  onLaunchTool: (tool: CommunityTool) => void;
};

const APP_LOGOS: Record<string, string> = {
  'chat-tag': '/assets/app-chat-tag.png',
  'discord-hub': '/assets/app-discord-hub.png',
  streamweaver: '/assets/app-streamweaver.png',
  hearmeout: '/assets/app-hearmeout.png',
};

export default function HomeRoute({
  identity,
  tools,
  stats,
  unreadCount,
  activeEmbedCount,
  theme,
  onNavigate,
  onLaunchTool,
}: HomeRouteProps) {
  const featuredTools = tools.filter((tool) => ['streamweaver', 'chat-tag', 'discord-hub', 'hearmeout'].includes(tool.id));
  const displayName = identity?.displayName?.split(' ')[0] || 'Captain';

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex flex-col gap-5"
    >
      <section className="relative overflow-hidden rounded-[var(--theme-radius)] border border-[color:var(--theme-surface-border)] bg-black/45 px-5 py-8 shadow-2xl backdrop-blur-xl md:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,var(--theme-glow-color-quarter),transparent_34%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
          <div>
            <img
              src="/assets/space-logo-main.png"
              alt="SpaceMountain.live"
              className="mb-5 h-16 w-auto max-w-[80vw] object-contain drop-shadow-[0_0_24px_var(--theme-glow-color-alpha)] md:h-20"
            />
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--theme-surface-border)] bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200">
              <Sparkles size={13} style={{ color: theme.secondaryHex }} />
              {identity ? `${theme.name} workspace` : 'The universe online'}
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
              {identity ? `Welcome back, ${displayName}.` : 'One command bridge for every creator tool.'}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
              {identity
                ? 'Launch an app, check Commlink, or continue your docked workspace without digging through system panels.'
                : 'SpaceMountain connects SPMT identity, creator apps, messages, overlays, and automation in one repeatable workspace.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('apps')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-950 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${theme.secondaryHex}, ${theme.glowHex})` }}
              >
                <Rocket size={16} /> Open Shipyard
              </button>
              <button
                type="button"
                onClick={() => onNavigate('inbox')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
              >
                <MessageSquare size={16} /> Open Commlink
              </button>
              {!identity && (
                <a href="/auth/login" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-bold text-zinc-200 no-underline">
                  Sign in with SPMT <ArrowRight size={15} />
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Apps online', value: `${stats.onlineApps}/${Math.max(stats.checkedApps, stats.onlineApps)}`, icon: Activity },
              { label: 'Unread', value: unreadCount.toLocaleString(), icon: Bell },
              { label: 'Docked', value: activeEmbedCount.toLocaleString(), icon: Boxes },
              { label: 'Theme', value: theme.shortName, icon: Radio },
            ].map(({ label, value, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => onNavigate(label === 'Unread' ? 'inbox' : label === 'Docked' ? 'crew' : label === 'Theme' ? 'settings' : 'bridge')}
                className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-4 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--theme-glow-color-half)] hover:bg-black/50"
              >
                <Icon size={17} style={{ color: theme.secondaryHex }} />
                <span className="mt-4 block text-2xl font-black text-white">{value}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[var(--theme-radius)] border border-[color:var(--theme-surface-border)] bg-[color:var(--theme-surface-bg)] p-5 backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.secondaryHex }}>Your app suite</p>
            <h2 className="mt-1 text-xl font-black text-white">Launch the tools you use most</h2>
          </div>
          <button type="button" onClick={() => onNavigate('apps')} className="inline-flex items-center gap-1 text-xs font-black text-zinc-300 hover:text-white">
            View all apps <ArrowRight size={14} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {featuredTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onLaunchTool(tool)}
              className="group rounded-2xl border border-white/10 bg-black/30 p-4 text-left transition hover:-translate-y-1 hover:border-[color:var(--theme-glow-color-half)]"
            >
              <div className="flex h-16 items-center justify-center rounded-xl border border-[color:var(--theme-surface-border)] bg-black/25" style={{ boxShadow: `inset 0 0 24px ${theme.glowHex}12` }}>
                {APP_LOGOS[tool.id] ? (
                  <img src={APP_LOGOS[tool.id]} alt="" className="h-14 w-14 object-contain transition group-hover:scale-105" />
                ) : (
                  <Rocket size={26} style={{ color: theme.secondaryHex }} />
                )}
              </div>
              <span className="mt-3 block truncate text-sm font-black text-white">{tool.name}</span>
              <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wide text-zinc-500">{tool.statusText}</span>
            </button>
          ))}
          {featuredTools.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
              Your app registry will appear here after the workspace loads.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ['Shipyard', 'Install, update, launch, and dock ecosystem apps.', 'apps'],
          ['Community', 'Creator spotlight, forums, and live rooms.', 'forums'],
          ['Workspace', 'Manage overlays and the three persistent embed slots.', 'crew'],
        ].map(([title, body, target]) => (
          <button key={title} type="button" onClick={() => onNavigate(target)} className="rounded-2xl border border-white/10 bg-black/35 p-5 text-left transition hover:border-[color:var(--theme-glow-color-half)] hover:bg-black/50">
            <span className="text-sm font-black text-white">{title}</span>
            <span className="mt-2 block text-xs leading-5 text-zinc-400">{body}</span>
          </button>
        ))}
      </section>
    </motion.div>
  );
}
