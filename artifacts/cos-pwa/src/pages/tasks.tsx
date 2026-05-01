import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, ChevronDown } from "lucide-react";
import {
  useListTasks,
  getListTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListTeamMembers,
  getListTeamMembersQueryKey,
} from "@workspace/api-client-react";

type TaskStatus = "open" | "in_progress" | "done" | "blocked";
type TaskPriority = "low" | "medium" | "high" | "critical";

const STATUS_TABS: { id: TaskStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
  { id: "blocked", label: "Blocked" },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-[#4ADE80]",
  medium: "text-[#F5A524]",
  high: "text-[#DC2A2A]",
  critical: "text-[#DC2A2A]",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-[rgba(107,164,255,0.12)] text-[#6BA4FF] border-[#6BA4FF]/20",
  in_progress: "bg-[rgba(245,165,36,0.14)] text-[#F5A524] border-[#F5A524]/20",
  done: "bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[#4ADE80]/20",
  blocked: "bg-[rgba(220,42,42,0.12)] text-[#DC2A2A] border-[#DC2A2A]/20",
};

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TaskStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newAssigneeId, setNewAssigneeId] = useState<number | "">("");

  const params = activeTab === "all" ? {} : { status: activeTab };
  const { data: tasks, isLoading } = useListTasks(params, {
    query: { queryKey: getListTasksQueryKey(params) },
  });
  const { data: teamMembers } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });

  const { mutateAsync: createTask, isPending: isCreating } = useCreateTask();
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();

  const taskList = Array.isArray(tasks) ? tasks : [];
  const members = Array.isArray(teamMembers) ? teamMembers : [];

  const invalidateTasks = () => {
    STATUS_TABS.forEach(({ id }) => {
      const p = id === "all" ? {} : { status: id };
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(p) });
    });
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createTask({
        data: {
          title: newTitle.trim(),
          priority: newPriority,
          assigneeId: newAssigneeId === "" ? undefined : (newAssigneeId as number),
        },
      });
      setNewTitle("");
      setNewPriority("medium");
      setNewAssigneeId("");
      setShowCreate(false);
      invalidateTasks();
      toast.success("Task created.");
    } catch {
      toast.error("Failed to create task.");
    }
  };

  const handleStatusChange = async (id: number, status: TaskStatus) => {
    try {
      await updateTask({ id, data: { status } });
      invalidateTasks();
    } catch {
      toast.error("Failed to update task.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTask({ id });
      invalidateTasks();
      toast.success("Task deleted.");
    } catch {
      toast.error("Failed to delete task.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
            &#8212; Tasks
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Task <em className="text-[#DC2A2A]">queue</em>
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          data-testid="btn-new-task"
          className="flex items-center gap-2 bg-[#DC2A2A] hover:bg-[#A8201F] text-white font-mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-[7px] transition-colors"
        >
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* Create task form */}
      {showCreate && (
        <div
          className="bg-card border border-border rounded-[10px] p-4 mb-4 space-y-3"
          data-testid="create-task-form"
        >
          <input
            data-testid="input-task-title"
            type="text"
            placeholder="Task title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#DC2A2A]/40 focus:border-[#DC2A2A]/60 transition-colors"
          />
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <select
                data-testid="select-task-priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full appearance-none bg-background border border-border rounded-[7px] px-3 py-2 text-sm text-foreground focus:outline-none pr-8 cursor-pointer"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
                <option value="critical">Critical</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select
                data-testid="select-task-assignee"
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value ? Number(e.target.value) : "")}
                className="w-full appearance-none bg-background border border-border rounded-[7px] px-3 py-2 text-sm text-foreground focus:outline-none pr-8 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || isCreating}
              data-testid="btn-create-task-submit"
              className="flex items-center gap-2 bg-[#DC2A2A] hover:bg-[#A8201F] text-white text-sm font-medium px-4 py-2 rounded-[7px] transition-colors disabled:opacity-50"
            >
              {isCreating && <Loader2 size={14} className="animate-spin" />}
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              data-testid="btn-cancel-create-task"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              activeTab === tab.id
                ? "bg-[#DC2A2A] text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-[#DC2A2A]" />
          <span className="font-mono text-sm">Loading tasks...</span>
        </div>
      ) : taskList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="font-display text-lg font-semibold mb-1">No tasks</div>
          <div className="text-sm">
            {activeTab === "all" ? "Create your first task." : `No ${activeTab} tasks.`}
          </div>
        </div>
      ) : (
        <div className="space-y-2" data-testid="task-list">
          {taskList.map((task) => (
            <div
              key={task.id}
              data-testid={`task-row-${task.id}`}
              className="bg-card border border-border rounded-[10px] px-4 py-3.5 flex items-start gap-3 group hover:border-muted-foreground/30 transition-colors"
            >
              {/* Status select */}
              <div className="relative shrink-0 mt-0.5">
                <select
                  value={task.status}
                  onChange={(e) =>
                    handleStatusChange(task.id, e.target.value as TaskStatus)
                  }
                  data-testid={`select-status-${task.id}`}
                  className="appearance-none bg-transparent border-0 text-[10px] font-mono cursor-pointer focus:outline-none opacity-0 absolute inset-0 w-full"
                >
                  {(["open", "in_progress", "done", "blocked"] as TaskStatus[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
                <StatusBadge status={task.status as TaskStatus} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${
                    task.status === "done"
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                  data-testid={`task-title-${task.id}`}
                >
                  {task.title}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {task.priority && (
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider ${PRIORITY_COLORS[task.priority as TaskPriority]}`}
                    >
                      {task.priority}
                    </span>
                  )}
                  {task.assigneeName && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {task.assigneeName}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(task.id)}
                data-testid={`btn-delete-task-${task.id}`}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-[#DC2A2A] transition-all shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
