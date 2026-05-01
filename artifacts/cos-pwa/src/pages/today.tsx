import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Loader2, CheckSquare, AlertTriangle, Check, Trash2, Mic, ChevronDown, ChevronUp, Pencil, X, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetTodayBriefing,
  getGetTodayBriefingQueryKey,
  useRegenerateTodayBriefing,
  useGetTodayTasks,
  getGetTodayTasksQueryKey,
  useGetTodayRecentCaptures,
  getGetTodayRecentCapturesQueryKey,
  useUpdateTask,
  useDeleteTask,
} from "@workspace/api-client-react";
import type { Task, Briefing } from "@workspace/api-client-react";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  critical: 0,
  high: 1,
  normal: 2,
  medium: 2,
  low: 3,
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-[#DC2A2A]",
  critical: "text-[#DC2A2A]",
  high: "text-[#F5A524]",
  medium: "text-foreground",
  normal: "text-foreground",
  low: "text-muted-foreground",
};

const PRIORITY_OPTIONS = ["urgent", "high", "normal", "low"] as const;

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aPri = PRIORITY_ORDER[a.priority ?? "normal"] ?? 2;
    const bPri = PRIORITY_ORDER[b.priority ?? "normal"] ?? 2;
    if (aPri !== bPri) return aPri - bPri;
    if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toDateInputValue(isoOrNull?: string | null): string {
  if (!isoOrNull) return "";
  return isoOrNull.slice(0, 10);
}

function TaskCard({ task, onRefetch }: { task: Task; onRefetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<string>(task.priority ?? "normal");
  const [editDue, setEditDue] = useState(toDateInputValue(task.dueAt ?? task.dueDate));

  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutateAsync: deleteTask, isPending: isDeleting } = useDeleteTask();

  const handleComplete = async () => {
    try {
      await updateTask({ id: task.id, data: { status: "complete" } });
      onRefetch();
    } catch {
      toast.error("Failed to update task.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ id: task.id });
      onRefetch();
    } catch {
      toast.error("Failed to delete task.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { toast.error("Title cannot be empty."); return; }
    try {
      await updateTask({
        id: task.id,
        data: {
          title: editTitle.trim(),
          priority: editPriority as Task["priority"],
          dueAt: editDue ? new Date(editDue).toISOString() : null,
        },
      });
      setEditing(false);
      onRefetch();
    } catch {
      toast.error("Failed to save changes.");
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority ?? "normal");
    setEditDue(toDateInputValue(task.dueAt ?? task.dueDate));
    setEditing(false);
  };

  const isDone = task.status === "complete" || task.status === "done" || task.status === "cancelled";
  const priorityColor = task.priority ? (PRIORITY_COLOR[task.priority] ?? "text-foreground") : "text-foreground";

  if (editing) {
    return (
      <div
        data-testid={`task-card-${task.id}`}
        className="bg-card border border-[#DC2A2A]/30 rounded-[9px] px-4 py-3 space-y-3"
      >
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") handleCancelEdit(); }}
          className="w-full text-[13.5px] font-medium bg-background border border-border rounded-[6px] px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#DC2A2A]/50"
          placeholder="Task title"
          data-testid={`task-edit-title-${task.id}`}
        />
        <div className="flex gap-2">
          <select
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value)}
            className="flex-1 font-mono text-[10px] bg-background border border-border rounded-[6px] px-2 py-1.5 text-foreground focus:outline-none focus:border-[#DC2A2A]/50"
            data-testid={`task-edit-priority-${task.id}`}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <input
            type="date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
            className="flex-1 font-mono text-[10px] bg-background border border-border rounded-[6px] px-2 py-1.5 text-foreground focus:outline-none focus:border-[#DC2A2A]/50"
            data-testid={`task-edit-due-${task.id}`}
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-[5px] border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={9} /> Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={isUpdating}
            data-testid={`task-save-${task.id}`}
            className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-[5px] bg-[#DC2A2A] text-white hover:bg-[#A8201F] transition-colors disabled:opacity-50"
          >
            {isUpdating ? <Loader2 size={9} className="animate-spin" /> : <Save size={9} />}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`task-card-${task.id}`}
      className={`bg-card border rounded-[9px] transition-all ${isDone ? "opacity-50 border-border" : "border-border hover:border-muted-foreground/25"}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={handleComplete}
          disabled={isUpdating || isDone}
          data-testid={`task-complete-${task.id}`}
          className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
            isDone
              ? "bg-[#4ADE80]/20 border-[#4ADE80]/40"
              : "border-muted-foreground/40 hover:border-[#4ADE80] hover:bg-[#4ADE80]/10"
          }`}
          title="Mark complete"
        >
          {(isDone || isUpdating) && <Check size={10} className="text-[#4ADE80]" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`text-[13.5px] font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.priority && (
              <span className={`font-mono text-[9px] uppercase tracking-[0.1em] ${priorityColor}`}>
                {task.priority}
              </span>
            )}
            {(task.dueAt || task.dueDate) && (
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.06em]">
                Due {formatDateShort((task.dueAt ?? task.dueDate)!)}
              </span>
            )}
            {task.assigneeName && (
              <span className="font-mono text-[9px] text-muted-foreground">
                @{task.assigneeName}
              </span>
            )}
            {task.tags && task.tags.length > 0 && task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="font-mono text-[8px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
          {expanded && task.description && (
            <div className="mt-2 text-[12px] text-muted-foreground leading-relaxed border-t border-border pt-2">
              {task.description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {task.description && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          {!isDone && (
            <button
              onClick={() => setEditing(true)}
              data-testid={`task-edit-${task.id}`}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Edit task"
            >
              <Pencil size={11} />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            data-testid={`task-delete-${task.id}`}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-[#DC2A2A] transition-colors"
            title="Delete task"
          >
            {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const queryClient = useQueryClient();

  const {
    data: briefing,
    isLoading: isBriefingLoading,
    error: briefingError,
  } = useGetTodayBriefing({
    query: { queryKey: getGetTodayBriefingQueryKey() },
  });

  const {
    data: rawTasks,
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useGetTodayTasks(undefined, {
    query: { queryKey: getGetTodayTasksQueryKey() },
  });

  const {
    data: recentCaptures,
    isLoading: isCapturesLoading,
  } = useGetTodayRecentCaptures({ limit: 20 }, {
    query: { queryKey: getGetTodayRecentCapturesQueryKey({ limit: 20 }) },
  });

  const { mutateAsync: regenerate, isPending: isRegenerating } = useRegenerateTodayBriefing();

  const handleRegenerate = async () => {
    try {
      await regenerate();
      await queryClient.invalidateQueries({ queryKey: getGetTodayBriefingQueryKey() });
      toast.success("Briefing regenerated.");
    } catch {
      toast.error("Failed to regenerate briefing.");
    }
  };

  const taskList = sortTasks(Array.isArray(rawTasks) ? rawTasks : []);
  const openTasks = taskList.filter((t) => t.status !== "complete" && t.status !== "done" && t.status !== "cancelled");
  const briefingData = briefing as Briefing | undefined;
  const escalations = briefingData?.escalationCount ?? 0;
  const captureList = Array.isArray(recentCaptures) ? recentCaptures : [];
  const userCaptures = captureList.filter((m) => m.role === "user");

  return (
    <div className="px-6 md:px-8 py-6 max-w-6xl mx-auto">
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
            {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          data-testid="btn-regenerate-briefing"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-[7px] bg-card border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors disabled:opacity-50"
        >
          {isRegenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Regenerate
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6" data-testid="briefing-stats">
        {[
          {
            icon: CheckSquare,
            label: "Open Tasks",
            value: isTasksLoading ? "—" : openTasks.length,
            color: openTasks.length > 5 ? "text-[#F5A524]" : "text-[#4ADE80]",
            testId: "stat-open-tasks",
          },
          {
            icon: AlertTriangle,
            label: "Escalations",
            value: escalations,
            color: escalations > 0 ? "text-[#DC2A2A]" : "text-[#4ADE80]",
            testId: "stat-escalations",
          },
          {
            icon: Mic,
            label: "Captures Today",
            value: isCapturesLoading ? "—" : userCaptures.length,
            color: "text-foreground",
            testId: "stat-captures-today",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-[10px] px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className="text-muted-foreground" />
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.1em]">
                  {stat.label}
                </span>
              </div>
              <div className={`font-display text-2xl font-semibold tracking-tight ${stat.color}`} data-testid={stat.testId}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-column desktop layout — briefing LEFT, tasks+captures RIGHT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left column: AI Briefing */}
        <div>
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-3">
            &#8212; AI Briefing
          </div>
          <div
            className="bg-card border border-border rounded-[10px] overflow-hidden"
            data-testid="briefing-card"
          >
            {briefingData?.generatedAt && (
              <div className="px-5 py-2.5 border-b border-border bg-background/50">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                  Generated {formatDateShort(briefingData.generatedAt)}
                </span>
              </div>
            )}
            <div className="px-5 py-4">
              {isBriefingLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                  <Loader2 size={18} className="animate-spin text-[#DC2A2A]" />
                  <span className="font-mono text-sm">Loading briefing...</span>
                </div>
              ) : briefingError ? (
                <div className="py-8 text-center space-y-3">
                  <div className="text-muted-foreground text-sm">No briefing available yet.</div>
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    data-testid="btn-generate-first-briefing"
                    className="font-mono text-xs text-[#DC2A2A] hover:text-[#A8201F] uppercase tracking-wider transition-colors"
                  >
                    {isRegenerating ? "Generating..." : "Generate now"}
                  </button>
                </div>
              ) : briefingData?.markdown ? (
                <div className="prose prose-sm prose-invert max-w-none" data-testid="briefing-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {briefingData.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <div className="text-muted-foreground text-sm">No briefing for today yet.</div>
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

        {/* Right column: task list + recent captures */}
        <div className="flex flex-col gap-5 min-h-0">
          {/* Task list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold">
                &#8212; Tasks
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                {openTasks.length} open · sorted by priority
              </span>
            </div>

            {isTasksLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 size={16} className="animate-spin mr-2 text-[#DC2A2A]" />
                <span className="font-mono text-xs">Loading tasks...</span>
              </div>
            ) : taskList.length === 0 ? (
              <div className="bg-card border border-border rounded-[10px] px-5 py-8 text-center">
                <CheckSquare size={22} className="mx-auto mb-2 text-[#4ADE80]" />
                <div className="text-sm font-medium text-foreground">All clear</div>
                <div className="text-xs text-muted-foreground mt-1">No tasks yet — capture thoughts in Talk.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2" data-testid="task-list">
                {taskList.map((task) => (
                  <TaskCard key={task.id} task={task} onRefetch={() => refetchTasks()} />
                ))}
              </div>
            )}
          </div>

          {/* Recent captures — scrollable stream */}
          <div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em] mb-3">
              &#8212; Recent captures
            </div>
            {isCapturesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 size={12} className="animate-spin text-[#DC2A2A]" />
                <span className="font-mono text-xs">Loading...</span>
              </div>
            ) : userCaptures.length === 0 ? (
              <div className="bg-card border border-border rounded-[8px] px-4 py-4 text-center">
                <div className="text-xs text-muted-foreground">No captures yet today.</div>
              </div>
            ) : (
              <div
                className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1"
                data-testid="recent-captures"
                style={{ scrollbarWidth: "thin" }}
              >
                {userCaptures.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-card border border-border rounded-[8px] px-3.5 py-2.5"
                  >
                    <div className="text-[12.5px] text-foreground leading-snug line-clamp-2">
                      {msg.content}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground mt-1">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
