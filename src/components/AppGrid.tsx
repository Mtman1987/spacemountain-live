import { motion } from 'motion/react';
import { Sparkles, Activity, AlertCircle, Play } from 'lucide-react';

export interface CommunityTool {
  id: string;
  name: string;
  description: string;
  badge: string;
  miniLabel: string;
  statusText: string;
  statusType: string;
  route: string;
  pointsFlow: number;
}

interface AppGridProps {
  tools: CommunityTool[];
  onTriggerAction: (toolId: string) => void;
  accentColor: string; // Hex color from branding API
  brandColor: string; // Hex color from branding API
  themeMode: 'cyber-noir' | 'cosmic-space';
}

export default function AppGrid({ tools, onTriggerAction, accentColor, brandColor, themeMode }: AppGridProps) {
  // Spring transition definition for high-tech snappy feel
  const springTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 24,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tools.map((tool, index) => {
        // Domain specific border glow color determination
        const isLive = tool.statusType === 'live';
        const isWarn = tool.statusType === 'warn';
        const isPink = tool.statusType === 'pink';

        let badgeBg = 'bg-white/5 border-white/10 text-white';
        let statusBadge = 'bg-zinc-800 text-zinc-300 border-zinc-700';

        if (isLive) {
          badgeBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
          statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        } else if (isWarn) {
          badgeBg = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
          statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        } else if (isPink) {
          badgeBg = 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400';
          statusBadge = 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
        } else {
          // Standard branding-dependent color highlight
          badgeBg = themeMode === 'cyber-noir' 
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            : 'bg-purple-500/10 border-purple-500/30 text-purple-400';
        }

        return (
          <motion.article
            id={`tool-card-${tool.id}`}
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: index * 0.05 }}
            whileHover={{ 
              y: -6, 
              scale: 1.02,
              borderColor: accentColor,
              boxShadow: `0 12px 30px -10px ${accentColor}40`
            }}
            className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex flex-col justify-between transition-colors duration-300"
          >
            {/* Subtle background glow effect */}
            <div 
              className="absolute -right-12 -top-12 w-28 h-28 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"
              style={{ backgroundColor: accentColor }}
            />

            <div>
              {/* Badge/Icon Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider font-mono text-zinc-400">
                  {tool.miniLabel}
                </span>
                <span className={`text-xl px-2.5 py-1.5 rounded-xl border flex items-center justify-center font-mono ${badgeBg}`}>
                  {tool.badge}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-sans font-bold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-300 transition-all duration-300 mb-2">
                {tool.name}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
                {tool.description}
              </p>
            </div>

            {/* Actions and Points flow information */}
            <div className="mt-auto pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-3 text-xs font-mono">
                <span className="text-zinc-500">POINTS FLOW:</span>
                <span className="text-zinc-200 font-bold flex items-center gap-1">
                  <Activity size={12} className="text-cyan-400 animate-pulse" />
                  {tool.pointsFlow.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1 ${statusBadge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : isWarn ? 'bg-amber-500' : 'bg-fuchsia-500'} `} />
                  {tool.statusText}
                </span>
                
                <button
                  id={`btn-trigger-${tool.id}`}
                  onClick={() => onTriggerAction(tool.id)}
                  className="ml-auto flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-zinc-300 hover:text-white"
                  style={{ '--hover-accent': accentColor } as any}
                  title="Generate Points Flow"
                >
                  <Play size={14} className="fill-current" />
                </button>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
