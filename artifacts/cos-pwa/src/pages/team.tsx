import { Loader2, User, Phone } from "lucide-react";
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

function Avatar({ name }: { name: string }) {
  const idx = nameToColorIndex(name);
  const color = AVATAR_COLORS[idx];

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
            <div
              key={member.id}
              data-testid={`member-card-${member.id}`}
              className="bg-card border border-border rounded-[10px] p-[18px]"
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
            </div>
          ))}

          {memberList.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <User size={32} className="mx-auto mb-3 opacity-30" />
              <div className="text-sm">No team members found.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
