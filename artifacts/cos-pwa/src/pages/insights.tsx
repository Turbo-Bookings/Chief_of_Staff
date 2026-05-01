import { BarChart3 } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="px-6 sm:px-8 py-6">
      <div className="mb-8">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; Insights
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Business <em className="italic text-[#DC2A2A]">intelligence</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Patterns, trends, and actionable intelligence from your operations
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        data-testid="insights-placeholder"
      >
        <div className="w-14 h-14 rounded-2xl bg-[rgba(74,222,128,0.08)] border border-[#4ADE80]/15 flex items-center justify-center mb-5">
          <BarChart3 size={24} className="text-[#4ADE80]" />
        </div>
        <div className="font-display text-xl font-semibold text-foreground mb-2">
          Insights coming soon
        </div>
        <div className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          As you capture and act, the AI surfaces patterns — team performance trends,
          recurring bottlenecks, and property-level business intelligence.
        </div>
        <div className="mt-6 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em] px-3 py-1.5 bg-card border border-border rounded-full">
          Phase 3 feature — coming soon
        </div>
      </div>
    </div>
  );
}
