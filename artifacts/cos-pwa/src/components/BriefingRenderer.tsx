import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const SECTION_ICONS: Record<string, string> = {
  "on your plate": "▸",
  "overdue": "⚠",
  "captured overnight": "○",
  "agent notes": "✦",
};

function sectionIcon(heading: string): string {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "▸";
}

function isGreeting(text: string): boolean {
  const l = text.toLowerCase();
  return l.startsWith("good morning") || l.startsWith("good evening") || l.startsWith("good afternoon");
}

const components: Components = {
  h1: ({ children }) => {
    const text = String(children);
    if (isGreeting(text)) {
      return (
        <div className="mb-5 pb-4 border-b border-border">
          <div className="font-mono text-[9px] text-[#DC2A2A] uppercase tracking-[0.16em] mb-1">
            AI Chief of Staff
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground leading-snug">
            {text}
          </h2>
        </div>
      );
    }
    return (
      <h2 className="font-display text-xl font-bold text-foreground mt-5 mb-2">
        {children}
      </h2>
    );
  },

  h2: ({ children }) => {
    const text = String(children);
    const icon = sectionIcon(text);
    return (
      <div className="mt-5 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[#DC2A2A] text-xs font-mono">{icon}</span>
          <span className="font-mono text-[10px] text-[#DC2A2A] uppercase tracking-[0.14em] font-semibold">
            {text}
          </span>
          <span className="flex-1 h-px bg-[#DC2A2A]/20" />
        </div>
      </div>
    );
  },

  h3: ({ children }) => (
    <div className="font-semibold text-foreground text-sm mt-3 mb-1">{children}</div>
  ),

  p: ({ children }) => (
    <p className="text-sm text-foreground/80 leading-relaxed mb-2">{children}</p>
  ),

  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-3 ml-0">{children}</ul>
  ),

  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm text-foreground/80">
      <span className="mt-[5px] w-1 h-1 rounded-full bg-[#DC2A2A] shrink-0" />
      <span>{children}</span>
    </li>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),

  em: ({ children }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),

  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#DC2A2A]/40 pl-3 my-2 text-muted-foreground italic text-sm">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="border-border my-4" />,

  code: ({ children }) => (
    <code className="font-mono text-[11px] bg-accent px-1 rounded text-foreground">
      {children}
    </code>
  ),
};

interface BriefingRendererProps {
  markdown: string;
}

export default function BriefingRenderer({ markdown }: BriefingRendererProps) {
  return (
    <div className="briefing-content" data-testid="briefing-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
