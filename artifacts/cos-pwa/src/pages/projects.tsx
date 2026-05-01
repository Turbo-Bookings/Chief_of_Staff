import { FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="px-6 md:px-8 py-6">
      <div className="mb-8">
        <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.12em] font-semibold mb-0.5">
          &#8212; Projects
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Active <em className="italic text-[#DC2A2A]">projects</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track milestones, blockers, and progress across all initiatives
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        data-testid="projects-placeholder"
      >
        <div className="w-14 h-14 rounded-2xl bg-[rgba(167,139,250,0.08)] border border-[#A78BFA]/15 flex items-center justify-center mb-5">
          <FolderKanban size={24} className="text-[#A78BFA]" />
        </div>
        <div className="font-display text-xl font-semibold text-foreground mb-2">
          Projects Coming Soon
        </div>
        <div className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Voice-captured project notes will be organized here with milestones, owners, and AI-generated status updates.
        </div>
        <div className="mt-6 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em] px-3 py-1.5 bg-card border border-border rounded-full">
          Phase 3 Feature
        </div>
      </div>
    </div>
  );
}
