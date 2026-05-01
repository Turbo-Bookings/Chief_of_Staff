import { AlertTriangle, Construction } from "lucide-react";

export default function EscalatePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
      <div className="w-14 h-14 rounded-full bg-[rgba(220,42,42,0.12)] flex items-center justify-center mb-5">
        <AlertTriangle size={24} className="text-[#DC2A2A]" />
      </div>
      <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-2">
        &#8212; Escalate
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-3">
        Escalations
      </h1>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
        Escalation workflows and critical issue tracking are coming in Phase 2.
        Captured mentions will be surfaced here.
      </p>
      <div className="mt-8 flex items-center gap-2 font-mono text-xs text-muted-foreground bg-card border border-border px-4 py-2.5 rounded-full">
        <Construction size={12} />
        Phase 2 &mdash; Coming Soon
      </div>
    </div>
  );
}
