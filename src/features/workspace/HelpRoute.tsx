import { motion } from 'motion/react';
import { HelpCircle } from 'lucide-react';

type HelpRouteProps = {
  onlineApps: number;
  checkedApps: number;
  joinableRooms: number;
};

export default function HelpRoute({ onlineApps, checkedApps, joinableRooms }: HelpRouteProps) {
  return (
    <motion.div
      key="help"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <HelpCircle className="text-zinc-300" size={20} />
            SpaceMountain Help &amp; System Status
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">Detailed ecosystem documentation</p>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <span className="mb-1 block text-xs font-bold text-white">What is SPACEMOUNTAIN.LIVE?</span>
          <p className="text-xs leading-relaxed text-zinc-400">It is a shared account and launch surface for the SpaceMountain app suite, including StreamWeaver, HearMeOut, Discord Stream Hub, ChatTag, MountainView, mail, and forums.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <span className="mb-1 block text-xs font-bold text-white">Where should I start?</span>
          <p className="text-xs leading-relaxed text-zinc-400">Use Apps for launch links and ChatTag status, Rooms to join HearMeOut, Forums to read website posts forwarded from DSH, and Integration Map to see how the apps pass events between each other.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <span className="mb-1 block text-xs font-bold text-white">Live Hub Status</span>
          <div className="mt-2.5 grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 font-mono text-[10px] text-emerald-400">
              <span>ONLINE APPS:</span><span className="font-extrabold">{onlineApps}/{checkedApps}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 font-mono text-[10px] text-emerald-400">
              <span>JOINABLE ROOMS:</span><span className="font-extrabold">{joinableRooms}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
