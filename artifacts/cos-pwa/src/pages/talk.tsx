import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Mic, MicOff, Loader2, RefreshCw } from "lucide-react";
import {
  useListThreads,
  getListThreadsQueryKey,
  useGetThreadMessages,
  getGetThreadMessagesQueryKey,
  useSubmitCapture,
  useGetCaptureJobStatus,
  getGetCaptureJobStatusQueryKey,
} from "@workspace/api-client-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function MessageBubble({ msg }: { msg: { role: string; content: string; createdAt: string } }) {
  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";

  return (
    <div
      data-testid={`message-${msg.role}`}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[rgba(220,42,42,0.15)] border border-[#DC2A2A]/20 flex items-center justify-center mr-2 mt-1 shrink-0">
          <span className="font-mono text-[9px] text-[#DC2A2A] font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-xl px-4 py-2.5 ${
          isUser
            ? "bg-[#DC2A2A] text-white"
            : isAssistant
            ? "bg-card border border-border text-foreground"
            : "bg-card border border-border/50 text-muted-foreground text-xs italic"
        }`}
      >
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <div
          className={`mt-1 text-[10px] font-mono ${
            isUser ? "text-white/60" : "text-muted-foreground"
          }`}
        >
          {formatTime(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

function JobStatusBanner({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const { data: job } = useGetCaptureJobStatus(jobId, {
    query: {
      queryKey: getGetCaptureJobStatusQueryKey(jobId),
      refetchInterval: (q) => {
        const status = (q.state.data as { status?: string } | undefined)?.status;
        return status === "done" || status === "failed" ? false : 2000;
      },
    },
  });

  useEffect(() => {
    if (job?.status === "done" || job?.status === "failed") {
      onDone();
    }
  }, [job?.status, onDone]);

  if (!job || job.status === "done") return null;

  const isDone = job.status === "failed";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 border-b border-border text-sm font-mono ${
        isDone ? "text-destructive bg-destructive/10" : "text-muted-foreground"
      }`}
    >
      {isDone ? (
        <>
          <span className="text-[#DC2A2A]">Processing failed.</span>
          {job.error && <span className="text-muted-foreground">{job.error}</span>}
        </>
      ) : (
        <>
          <Loader2 size={14} className="animate-spin text-[#DC2A2A]" />
          {job.status === "queued" ? "Queued..." : "AI is processing your message..."}
          {job.transcript && (
            <span className="text-foreground/70 truncate max-w-[260px]">
              &ldquo;{job.transcript}&rdquo;
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default function TalkPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads } = useListThreads({
    query: { queryKey: getListThreadsQueryKey() },
  });
  const thread = threads?.[0];
  const threadId = thread?.id;

  const threadMsgParams = { limit: 100 };
  const { data: messagesData, refetch: refetchMessages } = useGetThreadMessages(
    threadId!,
    threadMsgParams,
    {
      query: {
        enabled: !!threadId,
        queryKey: getGetThreadMessagesQueryKey(threadId!, threadMsgParams),
      },
    },
  );

  const messages = Array.isArray(messagesData) ? messagesData : [];

  const { mutateAsync: submitCapture, isPending: isSubmitting } = useSubmitCapture();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingJobId]);

  const handleSendText = async () => {
    const content = text.trim();
    if (!content || isSubmitting) return;
    setText("");
    try {
      const result = await submitCapture({ data: { text: content } });
      setPendingJobId(result.jobId);
    } catch {
      toast.error("Failed to send message.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleJobDone = () => {
    setPendingJobId(null);
    refetchMessages();
    queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "memo.webm");
        try {
          const result = await submitCapture({
            data: { text: "[Voice memo]" },
          });
          setPendingJobId(result.jobId);
        } catch {
          toast.error("Failed to submit voice memo.");
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const grouped: Record<string, typeof messages> = {};
  for (const msg of messages) {
    const day = formatDate(msg.createdAt);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(msg);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
            &#8212; Talk
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            What&apos;s on your <em className="text-[#DC2A2A]">mind?</em>
          </h1>
        </div>
        <button
          onClick={() => refetchMessages()}
          data-testid="btn-refresh-messages"
          className="w-8 h-8 rounded-[7px] bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Job status banner */}
      {pendingJobId && (
        <JobStatusBanner jobId={pendingJobId} onDone={handleJobDone} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-4">
        {messages.length === 0 && !pendingJobId ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-12 h-12 rounded-full bg-[rgba(220,42,42,0.12)] flex items-center justify-center mb-4">
              <Mic size={22} className="text-[#DC2A2A]" />
            </div>
            <div className="font-display text-xl font-semibold text-foreground mb-2">
              Ready to capture
            </div>
            <div className="text-sm text-muted-foreground max-w-sm">
              Type a thought, task, or idea below. Voice memo support coming soon.
            </div>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([day, msgs]) => (
              <div key={day}>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    {day}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {msgs.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
              </div>
            ))}
            {isSubmitting && (
              <div className="flex justify-center mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Loader2 size={12} className="animate-spin" />
                  Sending...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Compose area */}
      <div className="shrink-0 border-t border-border bg-card px-4 md:px-8 py-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              data-testid="input-message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Capture a thought, task, or note..."
              rows={1}
              className="w-full bg-background border border-border rounded-[10px] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[#DC2A2A]/40 focus:border-[#DC2A2A]/60 transition-colors"
              style={{ minHeight: "44px", maxHeight: "140px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 140)}px`;
              }}
              disabled={isSubmitting || !!pendingJobId}
            />
          </div>

          {/* Voice button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            data-testid="btn-voice-record"
            disabled={isSubmitting || !!pendingJobId}
            className={`w-11 h-11 rounded-[10px] flex items-center justify-center transition-colors shrink-0 ${
              isRecording
                ? "bg-[#DC2A2A] text-white animate-pulse"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            } disabled:opacity-50`}
            title={isRecording ? "Stop recording" : "Record voice memo"}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSendText}
            data-testid="btn-send-message"
            disabled={!text.trim() || isSubmitting || !!pendingJobId}
            className="w-11 h-11 rounded-[10px] bg-[#DC2A2A] hover:bg-[#A8201F] text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}
