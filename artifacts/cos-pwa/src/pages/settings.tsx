import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";

const FLAG_LABELS: Record<string, { label: string; desc: string }> = {
  shadowTeamEnabled: {
    label: "Shadow Team",
    desc: "Enables AI-generated shadow team insights and recommendations.",
  },
  twilioEnabled: {
    label: "Twilio SMS",
    desc: "Enables SMS capture and notifications via Twilio.",
  },
  autoBriefingEnabled: {
    label: "Auto Briefing",
    desc: "Automatically generate your daily briefing each morning.",
  },
  voiceMemoEnabled: {
    label: "Voice Memo",
    desc: "Enables voice memo capture via microphone.",
  },
};

function Toggle({
  checked,
  onChange,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      data-testid={testId}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC2A2A]/40 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-[#DC2A2A]" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const { mutateAsync: updateSettings, isPending: isSaving } = useUpdateSettings();

  const [flags, setFlags] = useState<Record<string, boolean>>({
    shadowTeamEnabled: false,
    twilioEnabled: false,
    autoBriefingEnabled: false,
    voiceMemoEnabled: false,
  });

  useEffect(() => {
    if (settings?.flags) {
      setFlags({ ...(settings.flags as Record<string, boolean>) });
    }
  }, [settings]);

  const handleToggle = async (key: string, value: boolean) => {
    const next = { ...flags, [key]: value };
    setFlags(next);
    try {
      await updateSettings({ data: { flags: next } });
      await queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast.success(`${FLAG_LABELS[key]?.label ?? key} ${value ? "enabled" : "disabled"}.`);
    } catch {
      setFlags(flags);
      toast.error("Failed to save setting.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; Settings
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          System <em className="text-[#DC2A2A]">settings</em>
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-[#DC2A2A]" />
          <span className="font-mono text-sm">Loading settings...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Principal info */}
          <div className="bg-card border border-border rounded-[10px] px-5 py-4">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-2">
              Principal
            </div>
            <div
              className="font-display text-xl font-semibold text-foreground"
              data-testid="settings-principal-name"
            >
              {settings?.principalName ?? "—"}
            </div>
            {settings?.principalPhone && (
              <div className="font-mono text-xs text-muted-foreground mt-1">
                {settings.principalPhone}
              </div>
            )}
          </div>

          {/* Feature flags */}
          <div className="bg-card border border-border rounded-[10px] overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
                  Feature Flags
                </span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {Object.entries(FLAG_LABELS).map(([key, { label, desc }]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-5 py-4"
                  data-testid={`setting-row-${key}`}
                >
                  <div className="flex-1 mr-4">
                    <div className="text-sm font-semibold text-foreground">
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {desc}
                    </div>
                  </div>
                  <Toggle
                    checked={flags[key] ?? false}
                    onChange={(v) => handleToggle(key, v)}
                    disabled={isSaving}
                    testId={`toggle-${key}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Status info */}
          <div className="bg-card border border-border rounded-[10px] px-5 py-4">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-3">
              System Status
            </div>
            <div className="space-y-2">
              {[
                { label: "API Server", status: "Online", color: "text-[#4ADE80]" },
                { label: "Database", status: "Connected", color: "text-[#4ADE80]" },
                { label: "BullMQ Queue", status: "Inline mode", color: "text-[#F5A524]" },
                { label: "AI Proxy", status: "Ready", color: "text-[#4ADE80]" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className={`font-mono text-xs ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
