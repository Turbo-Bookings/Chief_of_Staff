# Project primer for Claude

> Read this fully before doing anything in this repo. Then read `/docs/state/CURRENT.md`.

## What this is

`takeovers-cos` (repo: `Turbo-Bookings/Chief_of_Staff`) — a personal AI Chief of Staff agent for Selmen Hassen, CEO of Takeovers Rentals. Closes four operational loops:

1. **Capture** — voice / text / SMS into a structured DB. Nothing is lost.
2. **Dispatch** — tasks reach the right person, in their style, on the right channel.
3. **Chase** — nudges and escalations so nothing falls through the cracks.
4. **Briefing** — morning + evening brief without being asked.

Plus a fifth **Learning** loop that runs weekly (Sonnet) and monthly (Opus) to detect patterns and propose SOPs.

It is **not** a general assistant. It has standing authority over delegation, follow-up, and team comms — bounded by a three-tier authority model (A autonomous / B drafts to Approvals / C Selmen-only).

## Where the spec lives

`/docs/specs/` — 13 documents. **Authoritative.** When in doubt, build to the spec, not to vibes.

- `01_*.txt` — Master Architecture Spec (umbrella)
- `02_*.txt` — Database Schema (17 tables, 21 enums)
- `03_*.txt` — Build Environment Setup (**read first** for any infra/devops change)
- `04_*` through `10_*` — Phase 1 through Phase 7 build docs (in order)
- `11_*.pdf` / `12_*.pdf` / `13_*.pdf` — Architecture / Data Flow / Decision Tree diagrams
- `takeovers_cos_mockup_v2.html` — UI mockup of the 7-tab PWA

## Where the live state lives

`/docs/state/`:

- `CURRENT.md` — where we are right now. **Read at session start.**
- `NEXT.md` — literal first-prompt for the next session.
- `SESSION_LOG.md` — append-only history.
- `DECISIONS.md` — architectural decision records.
- `OPEN_QUESTIONS.md` — deferred items, reviewed at end of each phase.

## Stack (current)

- **Monorepo**: pnpm workspaces. `artifacts/` for runnable services, `lib/` for shared packages, `scripts/` for one-shots.
- **Frontend**: React 19 + Vite + Wouter + Clerk + Tailwind v4 + shadcn/ui (PWA, 7 tabs).
- **Backend**: Express 5, Node 24, TypeScript 5.9.
- **DB**: Postgres 16 + Drizzle ORM. Schema in `lib/db/src/schema/`.
- **API codegen**: Orval from OpenAPI (`mode: single`, `target: generated/api` — do **not** change).
- **AI**: Replit AI proxy → Anthropic (Claude Sonnet 4.6) + OpenAI (Whisper). No separate API keys.
- **Queue**: BullMQ; inline fallback when no Redis (acceptable for Phase 1 only).
- **SMS**: Twilio. Inbound webhook at `/api/webhooks/twilio/sms-inbound`.
- **Object storage**: Replit Object Storage (`DEFAULT_OBJECT_STORAGE_BUCKET_ID`).
- **Hosting**: Replit, two deployments off this repo (staging + prod).

## Branch model

`main` (prod) ← `staging` ← `develop` ← `feature/*`. PRs only, no direct push to `main` or `staging`. See `/docs/state/DECISIONS.md` #001.

## House rules

- **Build to the spec.** If you're tempted to deviate, write a `DECISIONS.md` entry first.
- **Feature flags default OFF.** Doc 03 §6. Every Tier-A capability sits behind a flag.
- **The `soselman@gmail.com` account is locked Tier B forever.** Server-side enforced. See Doc 06.
- **Three environments matter.** Never test against production team contacts. Use the shadow team (Doc 03 §5) in staging.
- **Soft delete user-facing rows.** `deleted_at` column, filter at query time. See Doc 02.
- **End every session by updating `/docs/state/`.** CURRENT.md, append SESSION_LOG.md, rewrite NEXT.md. The repo IS the memory.

## Common commands

```bash
pnpm install                                  # at repo root
pnpm run typecheck                            # full typecheck
pnpm run build                                # typecheck + build all packages
pnpm --filter @workspace/db run push          # push DB schema (dev only)
pnpm --filter @workspace/scripts run seed     # re-seed DB
pnpm --filter @workspace/api-spec run codegen # regen API hooks from OpenAPI
cd lib/db && npx tsc --build                  # rebuild DB declaration files
```

## Resume protocol (every new session, every tool)

1. `git pull` on the branch in `CURRENT.md`.
2. Read `/docs/state/CURRENT.md`, last `SESSION_LOG.md` entry, and `DECISIONS.md`.
3. `git log --oneline -10` to confirm what shipped recently.
4. Pick up the top item under "What's blocking…" or whatever NEXT.md points at.
