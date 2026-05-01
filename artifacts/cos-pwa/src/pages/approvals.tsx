import { CheckCheck } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <div className="px-6 sm:px-8 py-6">
      <div className="mb-8">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; Approvals
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Pending <em className="italic text-[#DC2A2A]">approvals</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve AI-drafted communications
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        data-testid="approvals-placeholder"
      >
        <div className="w-14 h-14 rounded-2xl bg-[rgba(220,42,42,0.08)] border border-[#DC2A2A]/15 flex items-center justify-center mb-5">
          <CheckCheck size={24} className="text-[#DC2A2A]" />
        </div>
        <div className="font-display text-xl font-semibold text-foreground mb-2">
          Nothing pending
        </div>
        <div className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Email and message drafts requiring your sign-off will appear here. Voice-captured communications are queued for your review.
        </div>
      </div>
    </div>
  );
}
