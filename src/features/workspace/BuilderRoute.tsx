import type { Dispatch, SetStateAction } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Rocket } from 'lucide-react';

export type WorkflowStep = {
  id: string;
  trigger: string;
  condition: string;
  action: string;
  destination: string;
  enabled: boolean;
};

type WorkflowDraft = Omit<WorkflowStep, 'id' | 'enabled'>;

type BuilderRouteProps = {
  draft: WorkflowDraft;
  setDraft: Dispatch<SetStateAction<WorkflowDraft>>;
  steps: WorkflowStep[];
  setSteps: Dispatch<SetStateAction<WorkflowStep[]>>;
  notify: (title: string, message: string) => void;
};

const fields: Array<[string, keyof WorkflowDraft, string[]]> = [
  ['Trigger', 'trigger', ['Shared chat message', 'App event', 'ChatTag event', 'HearMeOut now playing', 'MountainView command', 'Commlink message']],
  ['Filter', 'condition', ['Any connected source', 'Contains keyword', 'Donation or membership', 'Message mentions bot', 'Player tagged', 'Room is live']],
  ['Action', 'action', ['Add to bot context', 'Read aloud with TTS', 'Show overlay widget', 'Send message', 'Run bot command', 'Create notification']],
  ['Destination', 'destination', ['StreamWeaver memory', 'Shared TTS mixer', 'ChatTag Overlay', 'Discord Stream Hub', 'HearMeOut room', 'MountainView AI']],
];

export default function BuilderRoute({ draft, setDraft, steps, setSteps, notify }: BuilderRouteProps) {
  return (
    <motion.div
      key="builder"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-4 dynamic-cosmic-card rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Rocket className="text-orange-400" size={20} />
            Event Flow Builder
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">Build shared-chat and app automations as trigger → filter → action → destination flows</p>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.035] p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {fields.map(([label, field, options]) => (
            <label key={field} className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              {label}
              <select
                value={draft[field]}
                onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-orange-400/50"
              >
                {options.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSteps((current) => [...current, { id: `flow-${Date.now()}`, ...draft, enabled: true }])}
            className="rounded-xl bg-orange-400 px-4 py-2 text-xs font-black text-zinc-950"
          >
            Add flow
          </button>
          <button
            type="button"
            onClick={() => notify('Test event sent', `${draft.trigger} → ${draft.destination}`)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-200"
          >
            Test draft
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <div key={step.id} className={`rounded-2xl border p-4 ${step.enabled ? 'border-orange-400/20 bg-black/30' : 'border-white/5 bg-black/15 opacity-55'}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-orange-400/10 px-2 py-1 font-black text-orange-200">{index + 1}. {step.trigger}</span>
              <ArrowRight size={13} className="text-zinc-600" />
              <span className="rounded-lg bg-white/[0.04] px-2 py-1 font-bold text-zinc-300">{step.condition}</span>
              <ArrowRight size={13} className="text-zinc-600" />
              <span className="rounded-lg bg-cyan-400/10 px-2 py-1 font-bold text-cyan-200">{step.action}</span>
              <ArrowRight size={13} className="text-zinc-600" />
              <span className="rounded-lg bg-fuchsia-400/10 px-2 py-1 font-bold text-fuchsia-200">{step.destination}</span>
              <div className="ml-auto flex gap-3">
                <button type="button" onClick={() => notify('Flow tested', `${step.trigger} → ${step.destination}`)} className="text-[10px] font-bold text-cyan-300">Test</button>
                <button type="button" onClick={() => setSteps((current) => current.map((item) => item.id === step.id ? { ...item, enabled: !item.enabled } : item))} className="text-[10px] font-bold text-amber-300">{step.enabled ? 'Disable' : 'Enable'}</button>
                <button type="button" onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))} className="text-[10px] font-bold text-red-300">Remove</button>
              </div>
            </div>
          </div>
        ))}
        {steps.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">No flows yet. Build one above.</p>}
      </div>
    </motion.div>
  );
}
