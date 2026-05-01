import { useState } from "react";
import { Loader2, User, Phone, Mail, X } from "lucide-react";
import {
  useListTeamMembers,
  getListTeamMembersQueryKey,
  useGetTeamMember,
  getGetTeamMemberQueryKey,
} from "@workspace/api-client-react";

const AVATAR_COLORS = [
  { bg: "bg-[#DC2A2A]", text: "text-white" },
  { bg: "bg-[#4ADE80]", text: "text-[#0E0E0E]" },
  { bg: "bg-[#6BA4FF]", text: "text-[#0E0E0E]" },
  { bg: "bg-[#F5A524]", text: "text-[#0E0E0E]" },
  { bg: "bg-[#A78BFA]", text: "text-[#0E0E0E]" },
];

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

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  const idx = nameToColorIndex(name);
  const color = AVATAR_COLORS[idx];
  const sizeClass = size === "lg" ? "w-16 h-16 text-xl" : "w-[38px] h-[38px] text-sm";

  return (
    <div
      className={`${sizeClass} ${color.bg} ${color.text} rounded-full flex items-center justify-center font-display font-semibold shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

function MemberDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: member, isLoading } = useGetTeamMember(id, {
    query: {
      queryKey: getGetTeamMemberQueryKey(id),
      enabled: !!id,
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold">
            &#8212; Team Member
          </div>
          <button
            onClick={onClose}
            data-testid="btn-close-member-detail"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#DC2A2A]" />
          </div>
        ) : member ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar name={member.name} size="lg" />
              <div>
                <div
                  className="font-display text-xl font-semibold text-foreground"
                  data-testid="member-detail-name"
                >
                  {member.name}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {member.role}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      member.isActive ? "bg-[#4ADE80]" : "bg-muted-foreground"
                    }`}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {(member.phone || member.email) && (
              <div className="space-y-2.5 pt-2 border-t border-border">
                {member.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-foreground font-mono text-xs">{member.phone}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-foreground text-sm">{member.email}</span>
                  </div>
                )}
              </div>
            )}

          </>
        ) : (
          <div className="text-muted-foreground text-sm text-center py-4">
            Member not found.
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: members, isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });

  const memberList = Array.isArray(members) ? members : [];
  const activeCount = memberList.filter((m) => m.isActive).length;

  return (
    <div className="px-6 md:px-8 py-6">
      {/* Header */}
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
          data-testid="team-grid"
        >
          {memberList.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedId(member.id)}
              data-testid={`member-card-${member.id}`}
              className="bg-card border border-border rounded-[10px] p-[18px] text-left hover:border-muted-foreground/30 hover:-translate-y-px transition-all duration-150 group"
            >
              {/* Card head */}
              <div className="flex items-center gap-3 mb-3.5">
                <Avatar name={member.name} />
                <div className="min-w-0">
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
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 pt-2.5 border-t border-border font-mono text-[10px] text-muted-foreground uppercase tracking-[0.06em]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      member.isActive ? "bg-[#4ADE80]" : "bg-muted-foreground"
                    }`}
                  />
                  {member.isActive ? "Active" : "Inactive"}
                </div>
                {member.phone && (
                  <div className="flex items-center gap-1 text-muted-foreground/60">
                    <Phone size={10} />
                    <span>Direct</span>
                  </div>
                )}
              </div>

            </button>
          ))}

          {memberList.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <User size={32} className="mx-auto mb-3 opacity-30" />
              <div className="text-sm">No team members found.</div>
            </div>
          )}
        </div>
      )}

      {selectedId !== null && (
        <MemberDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
