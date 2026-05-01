import { useState } from "react";
import { Loader2, User, Phone, Mail, ChevronRight, X } from "lucide-react";
import {
  useListTeamMembers,
  getListTeamMembersQueryKey,
  useGetTeamMember,
  getGetTeamMemberQueryKey,
} from "@workspace/api-client-react";

function MemberDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: member, isLoading } = useGetTeamMember(id, {
    query: { queryKey: getGetTeamMemberQueryKey(id), enabled: !!id },
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
              <div className="w-14 h-14 rounded-full bg-[rgba(220,42,42,0.12)] border border-[#DC2A2A]/20 flex items-center justify-center shrink-0">
                <span className="font-display text-xl font-bold text-[#DC2A2A]">
                  {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <div>
                <div
                  className="font-display text-lg font-semibold text-foreground"
                  data-testid="member-detail-name"
                >
                  {member.name}
                </div>
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  {member.role}
                </div>
                {!member.isActive && (
                  <span className="font-mono text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-border">
              {member.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-foreground font-mono">{member.phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-foreground">{member.email}</span>
                </div>
              )}
            </div>
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

export default function PeoplePage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: members, isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });

  const memberList = Array.isArray(members) ? members : [];

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; People
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Your <em className="text-[#DC2A2A]">team</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {memberList.length} team members
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2 text-[#DC2A2A]" />
          <span className="font-mono text-sm">Loading team...</span>
        </div>
      ) : (
        <div className="space-y-1.5" data-testid="people-list">
          {memberList.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedId(member.id)}
              data-testid={`member-row-${member.id}`}
              className="w-full bg-card border border-border rounded-[10px] px-4 py-3.5 flex items-center gap-3 text-left hover:border-muted-foreground/30 transition-colors group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[rgba(220,42,42,0.10)] border border-[#DC2A2A]/15 flex items-center justify-center shrink-0">
                <span className="font-display text-sm font-bold text-[#DC2A2A]">
                  {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </span>
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold text-foreground"
                  data-testid={`member-name-${member.id}`}
                >
                  {member.name}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {member.role}
                </div>
              </div>

              {/* Status + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    member.isActive ? "bg-[#4ADE80]" : "bg-muted-foreground"
                  }`}
                />
                <ChevronRight
                  size={14}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </button>
          ))}

          {memberList.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
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
