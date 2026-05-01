import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Mic2,
  CalendarDays,
  CheckCheck,
  Inbox,
  Users,
  FolderKanban,
  BarChart3,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "talk", label: "Talk", href: "/talk", icon: Mic2, section: "Command" },
  { id: "today", label: "Today", href: "/today", icon: CalendarDays, section: "Command" },
  { id: "approvals", label: "Approvals", href: "/approvals", icon: CheckCheck, section: "Operations", badge: "3" },
  { id: "inbox", label: "Inbox", href: "/inbox", icon: Inbox, section: "Operations", badge: "12" },
  { id: "team", label: "Team", href: "/team", icon: Users, section: "Operations" },
  { id: "projects", label: "Projects", href: "/projects", icon: FolderKanban, section: "Intelligence" },
  { id: "insights", label: "Insights", href: "/insights", icon: BarChart3, section: "Intelligence" },
];

const MOBILE_TABS = ["talk", "today", "approvals", "inbox", "team", "projects", "insights"];

interface AppShellProps {
  activeTab: string;
  children: React.ReactNode;
}

export default function AppShell({ activeTab, children }: AppShellProps) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const sections = ["Command", "Operations", "Intelligence"];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-card border-r border-border">
        {/* Logo + user info */}
        <div className="px-5 py-[22px] border-b border-border">
          <div className="font-display text-[22px] font-bold tracking-tight text-foreground">
            Take<span className="text-[#DC2A2A]">overs</span>
          </div>
          <div
            className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
            data-testid="sidebar-greeting"
          >
            Chief of Staff
          </div>
          <div className="text-sm font-semibold text-foreground mt-0.5">
            {user?.firstName || user?.fullName || "Selmen"}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3.5 overflow-y-auto">
          {sections.map((section) => {
            const items = NAV_ITEMS.filter((n) => n.section === section);
            if (!items.length) return null;
            return (
              <div key={section}>
                <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.12em] px-3.5 pt-3.5 pb-2">
                  {section}
                </div>
                {items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      data-testid={`nav-${item.id}`}
                      className={`relative flex items-center gap-2.5 px-3 py-[9px] rounded-[7px] text-[13px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-[-8px] top-2 bottom-2 w-0.5 bg-[#DC2A2A] rounded-full" />
                      )}
                      <Icon
                        size={16}
                        className={`shrink-0 ${isActive ? "opacity-100" : "opacity-70"}`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {"badge" in item && item.badge && (
                        <span className="bg-[#DC2A2A] text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer status */}
        <div className="px-4 py-3.5 border-t border-border">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shrink-0 animate-pulse" />
            Agent online
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            data-testid="btn-sign-out"
            className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-mono"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile only) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
          <div className="font-display text-lg font-bold">
            Take<span className="text-[#DC2A2A]">overs</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden shrink-0 bg-card border-t border-border">
          <nav className="flex items-center justify-around px-1 py-1.5">
            {NAV_ITEMS.filter((item) => MOBILE_TABS.includes(item.id)).map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-testid={`mobile-nav-${item.id}`}
                  className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                    isActive ? "text-[#DC2A2A]" : "text-muted-foreground"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  {"badge" in item && item.badge && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#DC2A2A] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  <span className="text-[8px] font-mono uppercase tracking-wider">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </main>
    </div>
  );
}
