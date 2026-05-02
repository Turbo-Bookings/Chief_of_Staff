# Specification Documents

The 13 source-of-truth documents for this project. These are authoritative — every architectural decision lives here.

The originals are `.docx` / `.pdf` / `.html`. Plain-text extracts (`.txt`) are committed alongside so the contents are greppable in-repo and readable by tools that don't open Word.

| # | Doc | Purpose |
|---|-----|---------|
| 01 | Master Architecture Spec | Umbrella spec — 4-loop model, PWA structure, channels, authority tiers, tech stack, security, open decisions |
| 02 | Database Schema | Postgres + Drizzle — 17 tables, 21 enums, indexes, design rationale |
| 03 | Build Environment Setup | **Read first.** Three envs, branch model, env vars, shadow team, feature flags, migrations, backups, go-live sequence |
| 04 | Phase 1 — PWA Shell + Capture | Talk + Today, Whisper + Claude Sonnet, capture parse JSON shape |
| 05 | Phase 2 — Dispatch + Team | Owner resolution, tier classification, brief drafting, channel selection |
| 06 | Phase 3 — Email Handling | Gmail OAuth × 3, per-account authority. **Personal account locked Tier B.** |
| 07 | Phase 4 — Chase + Escalation | Follow-up scheduler, working-hours-aware nudges, escalation push to Selmen |
| 08 | Phase 5 — Projects | Multi-step initiative tracking, project detection, risk indicators |
| 09 | Phase 6 — Insights + Learning | Weekly Sonnet pattern run, monthly Opus cross-pattern, SOP generation |
| 10 | Phase 7 — Files + GitHub | Drive read/write in authorized folders, GitHub read-only for code context |
| 11 | System Architecture Diagram (PDF) | Components, integrations, deployment topology |
| 12 | Data Flow Diagram (PDF) | How data moves through the four loops |
| 13 | Decision Tree & Deployment Diagram (PDF) | Agent decision logic + Replit deployment |
| — | `takeovers_cos_mockup_v2.html` | UI mockup of the 7-tab PWA |

## When you change a decision in these docs

1. Update the source `.docx` or `.pdf` (in this folder).
2. Re-export the `.txt` (`textutil -convert txt` on macOS) and commit both.
3. Add an entry to `/docs/state/DECISIONS.md` capturing what changed and why.
