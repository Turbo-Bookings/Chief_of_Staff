# Takeovers CoS — Personal AI Chief of Staff

## Overview

pnpm workspace monorepo using TypeScript. Built for Selmen Hassen (CEO, Takeovers Rentals). Phase 1 PWA shell + backend infrastructure complete.

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
- **SMS**: Twilio (TWILIO_AUTH_TOKEN + PRINCIPAL_PHONE env vars; signature validation with graceful skip if token not set)

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

All routes are relative to the `/cos-pwa` base path.

- `/talk` — Voice/text capture (functional: MediaRecorder + useSubmitVoiceCapture + useSubmitCapture)
- `/today` — AI daily briefing + stats (functional: useGetTodayBriefing)
- `/approvals` — Placeholder (Phase 2 feature)
- `/inbox` — Placeholder (Phase 2 feature)
- `/team` — Team card grid (functional: useListTeamMembers, name-hash avatar colors)
- `/projects` — Placeholder (Phase 3 feature)
- `/insights` — Placeholder (Phase 3 feature)

### Frontend PWA Key Files (artifacts/cos-pwa/src)
- `App.tsx` — Clerk + Wouter router, all 7 routes
- `components/AppShell.tsx` — Sidebar + mobile bottom bar (3 sections: Command, Operations, Intelligence)
- `pages/talk.tsx` — Chat thread, text + voice capture (VoiceStatusBanner polls useGetVoiceCaptureStatus)
- `pages/today.tsx` — Daily briefing with stat cards + markdown
- `pages/team.tsx` — Card grid, avatar color from name hash
- `pages/approvals.tsx` — Placeholder
- `pages/inbox.tsx` — Placeholder
- `pages/projects.tsx` — Placeholder
- `pages/insights.tsx` — Placeholder

## API Routes (Phase 1)

### Public endpoints (no auth required)
| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check (postgres + redis status) |
| `/api/healthz` | GET | Health check (alias) |
| `/api/webhooks/twilio/sms-inbound` | POST | Inbound SMS from Selmen → capture pipeline |
| `/api/webhooks/twilio/sms-status` | POST | Twilio delivery status callback |

### Auth-protected endpoints
| Route | Method | Purpose |
|---|---|---|
| `/api/capture` | POST | Text capture → Claude parse |
| `/api/capture/voice` | POST | Voice capture (audioObjectPath) → Whisper + Claude |
| `/api/capture/voice/:id` | GET | Voice job status |
| `/api/capture/:jobId/status` | GET | Capture job status (legacy path) |
| `/api/threads/principal` | GET | Get/create principal_talk thread + messages |
| `/api/threads/:id/messages` | GET | Paginated thread messages |
| `/api/threads` | GET | List all threads |
| `/api/today/brief` | GET | Today's brief (generate if missing) |
| `/api/today/tasks` | GET | Prioritized task list for today |
| `/api/today/recent-captures` | GET | Last 20 captures from Talk thread |
| `/api/briefing/today` | GET | Today's briefing (legacy path) |
| `/api/briefing/today/regenerate` | POST | Force-regenerate briefing |
| `/api/tasks` | GET/POST | Task list + create |
| `/api/tasks/:id` | GET/PATCH/DELETE | Task CRUD (soft delete) |
| `/api/team` | GET | Team member list |
| `/api/team/:id` | GET | Single team member |
| `/api/principal` | GET/PATCH | Principal profile and preferences |
| `/api/settings` | GET/PATCH | Feature flags |
| `/api/storage/uploads/request-url` | POST | Presigned upload URL |
| `/api/storage/objects/:path` | GET | Serve private object |
| `/api/storage/public-objects/:path` | GET | Serve public asset |

## Database Schema (Phase 1)

All tables use serial integer PKs. Soft deletes via `deleted_at` for user-facing tables.

### Core Identity
- **`principal`** — Single-row Selmen profile (fullName, primaryEmail `sel@takeoversrentals.com`, primaryPhone, briefingMorningTime `07:00`, briefingEveningTime `18:00`, timezone, killSwitch, preferences jsonb)
- **`team_members`** — 10 seeded team members (name, role, phone, email, preferredCommsChannel, commsStyle, active)

### Communication
- **`threads`** — Conversation threads (threadType: principal_talk|team_member|system_internal, channel: sms|email|pwa, status: active|archived)
- **`messages`** — All messages (role, content, direction: inbound|outbound, senderType: principal|agent|team_member|external, contentType: text|voice|image|file|system, contentUrl, transcriptionConfidence, claudeParse jsonb, audioObjectPath)

### Tasks & Projects
- **`tasks`** — Tasks (title, description, status: captured|dispatched|acknowledged|in_progress|blocked|complete|cancelled|open|done, priority: urgent|high|normal|low|medium|critical, ownerId, assigneeId, dueAt, proposedDueAt, authorityTier: A|B|C, tags jsonb, projectId, sourceJobId, soft delete)
- **`projects`** — Projects (name, description, status: planning|active|paused|complete|cancelled, targetCompletion, leadId, riskLevel, milestones jsonb, soft delete)

### Follow-up & Escalation
- **`followups`** — Chase scheduler (taskId, scheduledFor, nudgeLevel 1-3, status: pending|sent|satisfied|cancelled|escalated, channel)
- **`escalations`** — Escalation records (taskId, followupId, reason, recommendedAction, status: open|resolved|dismissed)

### System
- **`briefings`** — Daily briefs (date, markdown, generatedAt, openTasksCount, escalationCount)
- **`capture_jobs`** — Background capture queue (jobId, status, audioObjectPath, rawText, transcript, parsedEntities jsonb, errorMessage)
- **`feature_flags`** — Boolean feature flags (shadowTeamEnabled, twilioEnabled, autoBriefingEnabled, voiceMemoEnabled — all OFF by default)
- **`agent_actions_log`** — Audit trail (action, entityType, entityId, payload jsonb, source)
- **`schedules`** — Scheduled tasks/briefings (scheduleType: cron|one_time|recurring, cronExpression, nextRunAt, taskTemplate jsonb)

## Capture Pipeline (Claude Prompt Format)

Claude parses every capture into JSON:
```json
{
  "type": "task|reminder|decision|context|question|draft_request|project",
  "title": "short summary, max 100 chars",
  "description": "full structured description",
  "proposed_owner_hint": null | "team member name if mentioned",
  "proposed_priority": "urgent|high|normal|low",
  "proposed_due": null | "ISO timestamp",
  "tags": ["array", "of", "tags"],
  "requires_clarification": false,
  "clarification_question": null | "question"
}
```

Phase 1 does NOT dispatch to team members (that's Phase 2). `proposed_owner_hint` is captured but not acted on.

## Principal Seed Data

- **Name**: Selmen Hassen
- **Email**: `sel@takeoversrentals.com` (must match Clerk account email exactly for principal binding)
- **Briefing times**: 07:00 (morning), 18:00 (evening)
- **Timezone**: America/New_York

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — re-seed database
- `cd lib/db && npx tsc --build` — rebuild DB declaration files after schema changes

## Important Notes

- **Orval config**: mode:single, target:generated/api — do NOT change to 'tags' mode
- **Clerk layers**: `@layer theme, base, clerk, components, utilities;` MUST precede `@import "tailwindcss"` in index.css
- **PORT env**: Vite reads `PORT` from environment (set by Replit workflow system)
- **BullMQ**: Disabled when no REDIS_URL; capture runs inline (acceptable for Phase 1)
- **DB types**: After updating schema files, run `cd lib/db && npx tsc --build` before typechecking api-server (project references need fresh .d.ts)
- **Principal thread**: Always looked up by `threadType = 'principal_talk'`, never by title
- **Task default status**: New tasks created by capture get `status: 'captured'` (not 'open')

See the `pnpm-workspace` skill for workspace structure details.
