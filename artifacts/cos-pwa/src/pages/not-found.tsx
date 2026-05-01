import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
      <div className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.15em] mb-4">
        &#8212; 404
      </div>
      <h1 className="font-display text-5xl font-bold tracking-tight text-foreground mb-4">
        Not <em className="text-[#DC2A2A]">found</em>
      </h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        This page doesn&apos;t exist in the command center.
      </p>
      <Link
        to="/"
        data-testid="link-go-home"
        className="flex items-center gap-2 bg-card border border-border hover:border-muted-foreground text-foreground font-medium px-5 py-2.5 rounded-[7px] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>
    </div>
  );
}
