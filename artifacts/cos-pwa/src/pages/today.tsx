import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Loader2, Calendar, CheckSquare, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetTodayBriefing,
  getGetTodayBriefingQueryKey,
  useRegenerateTodayBriefing,
  useListTasks,
  getListTasksQueryKey,
} from "@workspace/api-client-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  const queryClient = useQueryClient();

  const {
    data: briefing,
    isLoading,
    error,
  } = useGetTodayBriefing({
    query: { queryKey: getGetTodayBriefingQueryKey() },
  });

  const { data: tasks } = useListTasks(
    { status: "open" },
    { query: { queryKey: getListTasksQueryKey({ status: "open" }) } },
  );

  const { mutateAsync: regenerate, isPending: isRegenerating } =
    useRegenerateTodayBriefing();

  const handleRegenerate = async () => {
    try {
      await regenerate();
      await queryClient.invalidateQueries({
        queryKey: getGetTodayBriefingQueryKey(),
      });
      toast.success("Briefing regenerated.");
    } catch {
      toast.error("Failed to regenerate briefing.");
    }
  };

  const openTasks = Array.isArray(tasks) ? tasks.length : 0;
  const escalations = briefing?.escalationCount ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
            &#8212; Today
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Your <em className="text-[#DC2A2A]">daily</em> briefing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          data-testid="btn-regenerate-briefing"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-[7px] bg-card border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors disabled:opacity-50"
        >
          {isRegenerating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Regenerate
        </button>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-3 gap-3 mb-6"
        data-testid="briefing-stats"
      >
        {[
          {
            icon: Calendar,
            label: "Date",
            value: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
            color: "text-foreground",
          },
          {
            icon: CheckSquare,
            label: "Open Tasks",
            value: openTasks,
            color: openTasks > 5 ? "text-[#F5A524]" : "text-[#4ADE80]",
          },
          {
            icon: AlertTriangle,
            label: "Escalations",
            value: escalations,
            color: escalations > 0 ? "text-[#DC2A2A]" : "text-[#4ADE80]",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-[10px] px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className="text-muted-foreground" />
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.1em]">
                  {stat.label}
                </span>
              </div>
              <div
                className={`font-display text-2xl font-semibold tracking-tight ${stat.color}`}
                data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}
              >
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Briefing content */}
      <div
        className="bg-card border border-border rounded-[10px] overflow-hidden"
        data-testid="briefing-card"
      >
        {/* Card header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold">
            &#8212; AI Briefing
          </div>
          {briefing?.generatedAt && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              Generated {formatDate(briefing.generatedAt)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
              <Loader2 size={18} className="animate-spin text-[#DC2A2A]" />
              <span className="font-mono text-sm">Loading briefing...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <div className="text-muted-foreground text-sm">
                No briefing available yet.
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                data-testid="btn-generate-first-briefing"
                className="font-mono text-xs text-[#DC2A2A] hover:text-[#A8201F] uppercase tracking-wider transition-colors"
              >
                {isRegenerating ? "Generating..." : "Generate now"}
              </button>
            </div>
          ) : briefing?.markdown ? (
            <div
              className="prose prose-sm prose-invert max-w-none"
              data-testid="briefing-markdown"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {briefing.markdown}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="text-muted-foreground text-sm">
                No briefing for today yet.
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                data-testid="btn-generate-briefing"
                className="font-mono text-xs text-[#DC2A2A] hover:text-[#A8201F] uppercase tracking-wider"
              >
                {isRegenerating ? "Generating..." : "Generate briefing"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
