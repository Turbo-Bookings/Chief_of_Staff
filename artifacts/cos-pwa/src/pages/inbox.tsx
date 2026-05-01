import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="px-6 sm:px-8 py-6">
      <div className="mb-8">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; Inbox
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Your <em className="italic text-[#DC2A2A]">inbox</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-triaged emails and messages across all accounts
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        data-testid="inbox-placeholder"
      >
        <div className="w-14 h-14 rounded-2xl bg-[rgba(107,164,255,0.08)] border border-[#6BA4FF]/15 flex items-center justify-center mb-5">
          <Inbox size={24} className="text-[#6BA4FF]" />
        </div>
        <div className="font-display text-xl font-semibold text-foreground mb-2">
          Email integration coming in Phase 3
        </div>
        <div className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Connect your email accounts and the AI will triage, prioritize, and draft responses on your behalf.
        </div>
      </div>
    </div>
  );
}
