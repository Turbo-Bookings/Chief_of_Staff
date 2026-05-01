# Takeovers CoS — Personal AI Chief of Staff

## Overview

pnpm workspace monorepo using TypeScript. Built for Selmen Hassen (CEO, Takeovers Rentals). Phase 1 PWA shell is complete.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec, mode:single, target:generated/api)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (managed, VITE_CLERK_PUBLISHABLE_KEY set)
- **AI**: Replit AI proxy → Anthropic (Claude claude-sonnet-4-6) + OpenAI (Whisper)
- **Queue**: BullMQ inline fallback (no Redis in dev; Upstash for prod)
- **Object Storage**: Replit Object Storage (DEFAULT_OBJECT_STORAGE_BUCKET_ID)

## Artifacts

| Artifact | Dir | Port | Purpose |
|---|---|---|---|
| cos-pwa | `artifacts/cos-pwa` | 23152 → ext:3000 | React Vite PWA (7 tabs) |
| api-server | `artifacts/api-server` | 8080 | Express API |
| mockup-sandbox | `artifacts/mockup-sandbox` | 8081 | Canvas preview |

## Design

- **Fonts**: Fraunces (display), Inter Tight (body), JetBrains Mono (mono)
- **Brand color**: #DC2A2A (red)
- **Desktop**: Dark theme (bg #0E0E0E)
- **Mobile**: Light theme
- **shadcn/ui** with Tailwind v4 (`@tailwindcss/vite`, `optimize: false` for Clerk)

## App Navigation (7 tabs)

- `/app/talk` — Voice/text capture (functional: Whisper + Claude)
- `/app/today` — AI daily briefing (functional: Claude)
- `/app/tasks` — Task list (placeholder)
- `/app/people` — Team intelligence (placeholder)
- `/app/escalate` — Escalate/Twilio (placeholder)
- `/app/report` — Weekly report (placeholder)
- `/app/settings` — Feature flag toggles (functional)

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/capture` | POST | Voice/text capture (audio → Whisper + Claude) |
| `/api/briefing` | GET | Today's AI briefing |
| `/api/tasks` | GET/POST/PATCH | Task management |
| `/api/team` | GET | Team member list |
| `/api/settings` | GET/PATCH | Feature flags |
| `/api/threads/:threadId/messages` | GET | Thread history |
| `/api/twilio/webhook` | POST | Incoming SMS (placeholder) |
| `/api/storage/upload-url` | GET | Presigned upload URL |

## Database (Drizzle ORM)

Tables: `principals`, `team_members`, `tasks`, `threads`, `thread_messages`, `feature_flags`

Seed data: Selmen Hassen principal, 10 team members, `principal_talk` thread, 4 feature flags (all OFF).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — re-seed database

## Important Notes

- **Orval config**: mode:single, target:generated/api — do NOT change to 'tags' mode
- **Clerk layers**: `@layer theme, base, clerk, components, utilities;` MUST precede `@import "tailwindcss"` in index.css
- **PORT env**: Vite reads `PORT` from environment (set by Replit workflow system)
- **BullMQ**: Disabled when no REDIS_URL; capture runs inline (acceptable for Phase 1)
- **GetThreadMessagesParams**: only `limit` and `before` — no `offset` or `source`

See the `pnpm-workspace` skill for workspace structure details.
