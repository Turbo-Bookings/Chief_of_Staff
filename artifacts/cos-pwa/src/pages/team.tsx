import { Loader2, User, Phone, Mail, MessageSquare, Zap } from "lucide-react";
import {
  useListTeamMembers,
  getListTeamMembersQueryKey,
} from "@workspace/api-client-react";

const AVATAR_COLORS = [
  { bg: "bg-[#DC2A2A]", text: "text-white" },
  { bg: "bg-[#4ADE80]", text: "text-[#0E0E0E]" },
  { bg: "bg-[#6BA4FF]", text: "text-[#0E0E0E]" },
  { bg: "bg-[#F5A524]", text: "text-[#0E0E0E]" },
  { bg: "bg-[#A78BFA]", text: "text-[#0E0E0E]" },
];

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20",
  whatsapp: "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20",
  email: "bg-[#6BA4FF]/10 text-[#6BA4FF] border-[#6BA4FF]/20",
  slack: "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20",
  phone: "bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/20",
  call: "bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/20",
  default: "bg-muted text-muted-foreground border-border",
};

function channelColorClass(channel?: string | null): string {
  if (!channel) return CHANNEL_COLORS.default;
  return CHANNEL_COLORS[channel.toLowerCase()] ?? CHANNEL_COLORS.default;
}

function nameToColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const idx = nameToColorIndex(name);
  const color = AVATAR_COLORS[idx];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-[38px] h-[38px] rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      className={`w-[38px] h-[38px] ${color.bg} ${color.text} rounded-full flex items-center justify-center font-display font-semibold text-sm shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

export default function TeamPage() {
  const { data: members, isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });

  const memberList = Array.isArray(members) ? members : [];
  const activeCount = memberList.filter((m) => m.isActive).length;

  return (
    <div className="px-6 sm:px-8 py-6">
      <div className="mb-6">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; Team
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Your <em className="italic text-[#DC2A2A]">people</em>
        </h1>
        {!isLoading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} active · {memberList.length} total
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-[#DC2A2A]" />
          <span className="font-mono text-sm">Loading team...</span>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
          data-testid="team-grid"
        >
          {memberList.map((member) => {
            const preferredChannel: string | null = null;
            const communicationStyle: string | null = null;
            const roleSummary: string | null = null;

            return (
              <div
                key={member.id}
                data-testid={`member-card-${member.id}`}
                className="bg-card border border-border rounded-[10px] p-[18px] flex flex-col gap-0"
              >
                {/* Avatar + name/role */}
                <div className="flex items-center gap-3 mb-3.5">
                  <Avatar name={member.name} url={member.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm font-semibold text-foreground truncate"
                      data-testid={`member-name-${member.id}`}
                    >
                      {member.name}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
                      {member.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        member.isActive ? "bg-[#4ADE80] animate-pulse" : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                </div>

                {/* Role summary */}
                <div className="mb-3 min-h-[36px]">
                  {roleSummary ? (
                    <p
                      className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2"
                      data-testid={`member-summary-${member.id}`}
                    >
                      {roleSummary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/40 italic">
                      No role summary yet
                    </p>
                  )}
                </div>

                {/* Contact + preferred channel */}
                <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-border">
                  {/* Preferred channel badge */}
                  {preferredChannel ? (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider font-semibold ${channelColorClass(preferredChannel)}`}
                      data-testid={`member-channel-${member.id}`}
                    >
                      <MessageSquare size={8} />
                      {preferredChannel}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider text-muted-foreground/40 border-border bg-transparent"
                      data-testid={`member-channel-${member.id}`}
                    >
                      <MessageSquare size={8} />
                      Channel TBD
                    </span>
                  )}

                  {/* Communication style badge */}
                  {communicationStyle ? (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono tracking-wide text-muted-foreground border-border bg-muted/30"
                      data-testid={`member-style-${member.id}`}
                    >
                      <Zap size={8} />
                      {communicationStyle}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono tracking-wide text-muted-foreground/40 border-border bg-transparent"
                      data-testid={`member-style-${member.id}`}
                    >
                      <Zap size={8} />
                      Style TBD
                    </span>
                  )}

                  {/* Contact icons */}
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="ml-auto text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      title={member.email}
                    >
                      <Mail size={12} />
                    </a>
                  )}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      title={member.phone}
                    >
                      <Phone size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {memberList.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <User size={32} className="mx-auto mb-3 opacity-30" />
              <div className="text-sm">No team members found.</div>
              <div className="text-[11px] text-muted-foreground/60 mt-1">
                Add team members via the API to see them here.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
