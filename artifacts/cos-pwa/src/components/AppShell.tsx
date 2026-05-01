import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Mic2,
  CalendarDays,
  CheckSquare,
  Users,
  AlertTriangle,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "talk", label: "Talk", href: "/talk", icon: Mic2, section: "Command" },
  { id: "today", label: "Today", href: "/today", icon: CalendarDays, section: "Command" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: CheckSquare, section: "Operations" },
  { id: "people", label: "People", href: "/people", icon: Users, section: "Operations" },
  { id: "escalate", label: "Escalate", href: "/escalate", icon: AlertTriangle, section: "Reports" },
  { id: "report", label: "Report", href: "/report", icon: FileText, section: "Reports" },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings, section: "System" },
];

interface AppShellProps {
  activeTab: string;
  children: React.ReactNode;
}

export default function AppShell({ activeTab, children }: AppShellProps) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const sections = ["Command", "Operations", "Reports", "System"];

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
        <nav className="flex-1 px-2 py-3.5 overflow-y-auto scrollbar-thin">
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
                      {item.label}
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
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-dot shrink-0" />
            System Online
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
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden shrink-0 bg-card border-t border-border">
          <nav className="flex items-center justify-around px-1 py-1.5">
            {NAV_ITEMS.slice(0, 6).map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-testid={`mobile-nav-${item.id}`}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                    isActive ? "text-[#DC2A2A]" : "text-muted-foreground"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[9px] font-mono uppercase tracking-wider">
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              data-testid="mobile-nav-settings"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                activeTab === "settings" ? "text-[#DC2A2A]" : "text-muted-foreground"
              }`}
            >
              <Settings size={20} strokeWidth={activeTab === "settings" ? 2 : 1.5} />
              <span className="text-[9px] font-mono uppercase tracking-wider">Set</span>
            </Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
