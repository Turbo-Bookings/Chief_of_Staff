import { Link } from "react-router-dom";
import { ArrowRight, Mic, Brain, Users, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="font-display text-2xl font-bold tracking-tight">
          Take<span className="text-[#DC2A2A]">overs</span>{" "}
          <span className="font-mono text-sm font-normal text-muted-foreground uppercase tracking-widest ml-1">
            CoS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/sign-in"
            data-testid="link-sign-in"
            className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            data-testid="link-sign-up"
            className="font-mono text-sm bg-[#DC2A2A] hover:bg-[#A8201F] text-white px-4 py-2 rounded-[7px] uppercase tracking-wider transition-colors"
          >
            Get Access
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2A2A]" />
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-[0.15em]">
            Personal AI Chief of Staff
          </span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-3xl leading-tight">
          Your command center,{" "}
          <em className="text-[#DC2A2A] not-italic">always on.</em>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          Capture thoughts by voice or text. Get AI-synthesized daily briefings.
          Keep your team in sync. Built for the way you actually work.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/sign-up"
            data-testid="cta-get-started"
            className="flex items-center gap-2 bg-[#DC2A2A] hover:bg-[#A8201F] text-white font-semibold px-6 py-3 rounded-[7px] transition-colors"
          >
            Get Started
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/sign-in"
            data-testid="cta-sign-in"
            className="flex items-center gap-2 bg-card border border-border hover:border-muted-foreground text-foreground font-medium px-6 py-3 rounded-[7px] transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full text-left">
          {[
            {
              icon: Mic,
              title: "Voice Capture",
              desc: "Speak your thoughts and let AI transcribe and extract action items.",
            },
            {
              icon: Brain,
              title: "AI Briefings",
              desc: "Wake up to an AI-synthesized daily rundown of what matters today.",
            },
            {
              icon: Users,
              title: "Team Intelligence",
              desc: "Keep your entire team organized with smart task assignment.",
            },
            {
              icon: Zap,
              title: "Instant Actions",
              desc: "From capture to delegated task in seconds, not minutes.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-card border border-border rounded-[10px] p-5 space-y-3"
              >
                <div className="w-8 h-8 rounded-[7px] bg-[rgba(220,42,42,0.12)] flex items-center justify-center">
                  <Icon size={16} className="text-[#DC2A2A]" />
                </div>
                <div className="font-display font-semibold text-foreground">
                  {f.title}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="px-8 py-6 border-t border-border flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          Takeovers Rentals &copy; 2026
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          CoS v1.0
        </span>
      </footer>
    </div>
  );
}
