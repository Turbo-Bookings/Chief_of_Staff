import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Mic, MicOff, Loader2, RefreshCw, Check, Pencil, X } from "lucide-react";
import {
  useGetPrincipalThread,
  getGetPrincipalThreadQueryKey,
  useSubmitCapture,
  useSubmitVoiceCapture,
  useGetCaptureJobStatus,
  getGetCaptureJobStatusQueryKey,
  useGetVoiceCaptureStatus,
  getGetVoiceCaptureStatusQueryKey,
  useCreateTask,
} from "@workspace/api-client-react";
import type { Message } from "@workspace/api-client-react";

const SCROLL_KEY = "talk-scroll-pos";

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

function RecordingWaveform() {
  return (
    <div className="flex items-center gap-[3px]" aria-label="Recording">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-[#DC2A2A]"
          style={{
            height: `${8 + (i % 3) * 6}px`,
            animation: `waveBar 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes waveBar { from { transform: scaleY(0.4); } to { transform: scaleY(1.4); } }`}</style>
    </div>
  );
}

const PARSE_TYPE_COLOR: Record<string, string> = {
  task: "text-[#4ADE80] bg-[#4ADE80]/10 border-[#4ADE80]/20",
  reminder: "text-[#6BA4FF] bg-[#6BA4FF]/10 border-[#6BA4FF]/20",
  decision: "text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/20",
  context: "text-muted-foreground bg-accent border-border",
  project: "text-[#F5A524] bg-[#F5A524]/10 border-[#F5A524]/20",
  draft_request: "text-[#DC2A2A] bg-[#DC2A2A]/10 border-[#DC2A2A]/20",
  question: "text-[#F5A524] bg-[#F5A524]/10 border-[#F5A524]/20",
};

const PRIORITY_OPTS = ["urgent", "high", "normal", "low"] as const;

function ClaudeParseCard({ parse }: { parse: Record<string, unknown> }) {
  const type = parse["type"] as string | undefined;
  const rawTitle = parse["title"] as string | undefined;
  const rawPriority = (parse["proposedPriority"] ?? parse["proposed_priority"]) as string | undefined;
  const rawDue = (parse["proposedDue"] ?? parse["proposed_due"]) as string | undefined;
  const tags = (parse["tags"] as string[] | undefined) ?? [];

  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(rawTitle ?? "");
  const [editPriority, setEditPriority] = useState(rawPriority ?? "normal");
  const [editDue, setEditDue] = useState(rawDue ? rawDue.slice(0, 10) : "");

  const { mutateAsync: createTask, isPending: isSaving } = useCreateTask();

  if (!rawTitle) return null;

  const typeClass = type ? (PARSE_TYPE_COLOR[type] ?? PARSE_TYPE_COLOR["context"]) : PARSE_TYPE_COLOR["context"];

  const handleConfirm = () => setConfirmed(true);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { toast.error("Title required."); return; }
    try {
      await createTask({
        data: {
          title: editTitle.trim(),
          priority: editPriority as "urgent" | "high" | "normal" | "low",
          dueAt: editDue ? new Date(editDue).toISOString() : undefined,
        },
      });
      setEditing(false);
      setConfirmed(true);
      toast.success("Task saved with corrections.");
    } catch {
      toast.error("Failed to save task.");
    }
  };

  return (
    <div className="mt-2 ml-0 bg-card border border-border rounded-[8px] px-3 py-2.5 max-w-[80%]">
      <div className="flex items-center gap-2 mb-1.5">
        {type && (
          <span className={`font-mono text-[8px] uppercase tracking-[0.12em] font-bold px-1.5 py-0.5 rounded border ${typeClass}`}>
            {type.replace(/_/g, " ")}
          </span>
        )}
        <span className={`font-mono text-[8px] uppercase tracking-wider ${confirmed ? "text-[#4ADE80]" : "text-muted-foreground"}`}>
          {confirmed ? "✓ Confirmed" : "Captured"}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditing(false); }}
            className="w-full text-[12.5px] font-medium bg-background border border-border rounded-[5px] px-2 py-1.5 text-foreground focus:outline-none focus:border-[#DC2A2A]/50"
            placeholder="Task title"
          />
          <div className="flex gap-2">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="flex-1 font-mono text-[9px] bg-background border border-border rounded-[5px] px-1.5 py-1.5 text-foreground focus:outline-none"
            >
              {PRIORITY_OPTS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <input
              type="date"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              className="flex-1 font-mono text-[9px] bg-background border border-border rounded-[5px] px-1.5 py-1.5 text-foreground focus:outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={8} /> Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-[#DC2A2A] text-white hover:bg-[#A8201F] transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={8} className="animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-[13px] font-medium text-foreground leading-snug">{rawTitle}</div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {rawPriority && (
              <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-wider">{rawPriority}</span>
            )}
            {rawDue && (
              <span className="font-mono text-[8px] text-muted-foreground">
                Due {new Date(rawDue).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            )}
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-mono text-[8px] bg-accent px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                {tag}
              </span>
            ))}
          </div>
          {!confirmed && (
            <div className="flex gap-2 mt-2 pt-2 border-t border-border">
              <button
                onClick={handleConfirm}
                data-testid="parse-card-confirm"
                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20 hover:bg-[#4ADE80]/20 transition-colors"
              >
                <Check size={8} strokeWidth={3} /> Confirm
              </button>
              <button
                onClick={() => setEditing(true)}
                data-testid="parse-card-edit"
                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded bg-accent text-muted-foreground border border-border hover:text-foreground transition-colors"
              >
                <Pencil size={8} /> Edit
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VoiceMessageRow({ msg }: { msg: Message }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const hasAudio = !!msg.audioObjectPath;
  const transcript = msg.content || undefined;
  const audioSrc = msg.audioObjectPath
    ? `${window.location.origin}/api/storage/objects/${msg.audioObjectPath}`
    : undefined;

  return (
    <div className="flex items-start gap-2 max-w-[80%] ml-auto">
      <div className="rounded-[10px] px-3.5 py-2.5 bg-[#DC2A2A] text-white rounded-br-[2px] space-y-1.5">
        <div className="flex items-center gap-2">
          {hasAudio ? (
            <button
              onClick={togglePlay}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors"
              title={playing ? "Pause" : "Play voice memo"}
            >
              {playing ? (
                <span className="w-2 h-2 bg-white rounded-sm" />
              ) : (
                <span
                  className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white ml-0.5"
                />
              )}
            </button>
          ) : (
            <Mic size={14} className="text-white/80 shrink-0" />
          )}
          <span className="text-[13px] font-medium">
            {playing ? "Playing…" : "Voice memo"}
          </span>
        </div>
        {transcript && (
          <p className="text-[12px] text-white/80 italic leading-snug">
            &ldquo;{transcript}&rdquo;
          </p>
        )}
        {hasAudio && audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onEnded={() => setPlaying(false)}
            preload="none"
          />
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isVoice = msg.contentType === "voice";

  const parsedCard = msg.claudeParse ? (
    <ClaudeParseCard parse={msg.claudeParse as Record<string, unknown>} />
  ) : null;

  if (isUser && isVoice) {
    return (
      <div data-testid={`message-${msg.role}`} className="flex flex-col items-end gap-1">
        <VoiceMessageRow msg={msg} />
        <div className="font-mono text-[9px] text-muted-foreground">
          {formatTime(msg.createdAt)}
        </div>
        {parsedCard}
      </div>
    );
  }

  return (
    <div
      data-testid={`message-${msg.role}`}
      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
    >
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-[rgba(220,42,42,0.15)] border border-[#DC2A2A]/20 flex items-center justify-center mr-2 mt-1 shrink-0">
            <span className="font-mono text-[9px] text-[#DC2A2A] font-bold">AI</span>
          </div>
        )}
        <div className="max-w-[80%]">
          <div
            className={`rounded-[10px] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-[#DC2A2A] text-white rounded-br-[2px]"
                : "bg-accent border border-border text-foreground rounded-bl-[2px]"
            }`}
          >
            {msg.content}
          </div>
          <div
            className={`mt-1 font-mono text-[9px] text-muted-foreground ${
              isUser ? "text-right" : "text-left"
            }`}
          >
            {formatTime(msg.createdAt)}
          </div>
        </div>
      </div>
      {parsedCard}
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

  return (
    <div
      className={`flex items-center gap-2 px-5 py-2.5 border-b border-border font-mono text-[11px] ${
        job.status === "failed" ? "text-[#DC2A2A] bg-[rgba(220,42,42,0.06)]" : "text-muted-foreground"
      }`}
    >
      {job.status === "failed" ? (
        <span>Processing failed.</span>
      ) : (
        <>
          <Loader2 size={12} className="animate-spin text-[#DC2A2A]" />
          {job.status === "queued" ? "Queued..." : "AI is processing..."}
        </>
      )}
    </div>
  );
}

function VoiceStatusBanner({ voiceId, onDone }: { voiceId: number; onDone: () => void }) {
  const { data: voice } = useGetVoiceCaptureStatus(voiceId, {
    query: {
      queryKey: getGetVoiceCaptureStatusQueryKey(voiceId),
      refetchInterval: (q) => {
        const status = (q.state.data as { status?: string } | undefined)?.status;
        return status === "done" ? false : 2000;
      },
    },
  });

  useEffect(() => {
    if (voice?.status === "done") {
      onDone();
    }
  }, [voice?.status, onDone]);

  if (!voice || voice.status === "done") return null;

  return (
    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border font-mono text-[11px] text-muted-foreground">
      <Loader2 size={12} className="animate-spin text-[#DC2A2A]" />
      {voice.status === "transcribing" ? "Transcribing voice..." : "Parsing..."}
      {voice.transcript && (
        <span className="text-foreground/70 truncate max-w-[200px]">&ldquo;{voice.transcript}&rdquo;</span>
      )}
    </div>
  );
}

export default function TalkPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingVoiceId, setPendingVoiceId] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data: threadData,
    refetch: refetchThread,
    isLoading: isThreadLoading,
  } = useGetPrincipalThread({
    query: { queryKey: getGetPrincipalThreadQueryKey() },
  });

  const messages: Message[] = threadData?.messages ?? [];

  const { mutateAsync: submitCapture, isPending: isSubmitting } = useSubmitCapture();
  const { mutateAsync: submitVoiceCapture, isPending: isSubmittingVoice } = useSubmitVoiceCapture();

  const isPending = isSubmitting || isSubmittingVoice || !!pendingJobId || !!pendingVoiceId;

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    if (pendingJobId || pendingVoiceId) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [pendingJobId, pendingVoiceId]);

  const saveScrollPos = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      try {
        localStorage.setItem(SCROLL_KEY, String(el.scrollTop));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || messages.length === 0) return;
    try {
      const saved = localStorage.getItem(SCROLL_KEY);
      if (saved !== null) {
        const pos = parseInt(saved, 10);
        if (!isNaN(pos)) el.scrollTop = pos;
      } else {
        bottomRef.current?.scrollIntoView();
      }
    } catch {}
  }, [messages.length > 0]);

  const handlePullToRefresh = useCallback(() => {
    refetchThread();
  }, [refetchThread]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 60 && el.scrollTop === 0) {
        handlePullToRefresh();
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("scroll", saveScrollPos, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("scroll", saveScrollPos);
    };
  }, [handlePullToRefresh, saveScrollPos]);

  const handleSendText = async () => {
    const content = text.trim();
    if (!content || isPending) return;
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

  const handleJobDone = useCallback(() => {
    setPendingJobId(null);
    queryClient.invalidateQueries({ queryKey: getGetPrincipalThreadQueryKey() });
  }, [queryClient]);

  const handleVoiceDone = useCallback(() => {
    setPendingVoiceId(null);
    queryClient.invalidateQueries({ queryKey: getGetPrincipalThreadQueryKey() });
  }, [queryClient]);

  const startRecording = async () => {
    if (isPending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        try {
          const result = await submitVoiceCapture({ data: { audio: blob } });
          setPendingVoiceId(result.messageId);
        } catch {
          toast.error("Failed to submit voice memo.");
        }
      };
      mr.start(100);
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

  const grouped: Record<string, Message[]> = {};
  for (const msg of messages) {
    const day = formatDate(msg.createdAt);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(msg);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div>
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
            &#8212; Talk
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            What&apos;s on your <em className="italic text-[#DC2A2A]">mind?</em>
          </h1>
        </div>
        <button
          onClick={() => refetchThread()}
          data-testid="btn-refresh-messages"
          className="w-8 h-8 rounded-[7px] bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          {isThreadLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      {/* Status banners */}
      {pendingJobId && (
        <JobStatusBanner jobId={pendingJobId} onDone={handleJobDone} />
      )}
      {pendingVoiceId && (
        <VoiceStatusBanner voiceId={pendingVoiceId} onDone={handleVoiceDone} />
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-5 flex flex-col gap-[18px]"
        data-testid="messages-container"
      >
        {messages.length === 0 && !isPending ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[rgba(220,42,42,0.12)] flex items-center justify-center mb-4">
              <Mic size={22} className="text-[#DC2A2A]" />
            </div>
            <div className="font-display text-xl font-semibold text-foreground mb-2">
              Ready to capture
            </div>
            <div className="text-sm text-muted-foreground max-w-sm">
              Type a thought, task, or idea below — or tap the mic to record a voice memo.
            </div>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([day, msgs]) => (
              <div key={day} className="flex flex-col gap-[18px]">
                <div className="flex items-center gap-3 my-1">
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
            {(isSubmitting || isSubmittingVoice) && (
              <div className="flex justify-center">
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
      <div className="shrink-0 border-t border-border bg-card px-4 md:px-6 py-4">
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 justify-center">
            <RecordingWaveform />
            <span className="font-mono text-[11px] text-[#DC2A2A]">Recording… release to send</span>
          </div>
        )}
        <div className="flex items-center gap-3 bg-accent border border-border rounded-[30px] px-4 py-1.5 max-w-4xl mx-auto">
          <textarea
            data-testid="input-message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Capture a thought, task, or note..."
            rows={1}
            className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none py-2"
            style={{ minHeight: "36px", maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
            disabled={isPending}
          />

          {/* Voice button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            data-testid="btn-voice-record"
            disabled={isSubmitting || isSubmittingVoice || !!pendingJobId || !!pendingVoiceId}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isRecording
                ? "bg-[#DC2A2A] text-white scale-110 ring-2 ring-[#DC2A2A]/30"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            } disabled:opacity-40`}
            title={isRecording ? "Release to send" : "Hold to record"}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSendText}
            data-testid="btn-send-message"
            disabled={!text.trim() || isPending}
            className="w-9 h-9 rounded-full bg-[#DC2A2A] hover:bg-[#A8201F] text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            Enter to send · Hold mic to record
          </span>
        </div>
      </div>
    </div>
  );
}
