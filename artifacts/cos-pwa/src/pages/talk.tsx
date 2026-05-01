import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Mic, MicOff, Loader2, RefreshCw } from "lucide-react";
import {
  useListThreads,
  getListThreadsQueryKey,
  useGetThreadMessages,
  getGetThreadMessagesQueryKey,
  useSubmitCapture,
  useSubmitVoiceCapture,
  useGetCaptureJobStatus,
  getGetCaptureJobStatusQueryKey,
  useGetVoiceCaptureStatus,
  getGetVoiceCaptureStatusQueryKey,
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

  return (
    <div
      data-testid={`message-${msg.role}`}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
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
  const { mutateAsync: submitVoiceCapture, isPending: isSubmittingVoice } = useSubmitVoiceCapture();

  const isPending = isSubmitting || isSubmittingVoice || !!pendingJobId || !!pendingVoiceId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingJobId, pendingVoiceId]);

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
    refetchMessages();
    queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
  }, [refetchMessages, queryClient]);

  const handleVoiceDone = useCallback(() => {
    setPendingVoiceId(null);
    refetchMessages();
    queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
  }, [refetchMessages, queryClient]);

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

  const grouped: Record<string, typeof messages> = {};
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
          onClick={() => refetchMessages()}
          data-testid="btn-refresh-messages"
          className="w-8 h-8 rounded-[7px] bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
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
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 flex flex-col gap-[18px]">
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
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
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
