# Current State

> The single source of truth for "where are we right now." Update at the end of every session. Read first at the start of every session.

**Last updated:** 2026-05-01 (evening — external services configured)
**Updated by:** Claude (Claude Code session with Selmen)

---

## Phase

**Phase 1 — PWA Shell + Capture** (Doc 04). ~95% complete. Publish-ready pending Replit pull + restart.

## What's working end-to-end

- pnpm workspace monorepo scaffolded per Doc 03 §2 (`artifacts/`, `lib/`, `scripts/`).
- Postgres + Drizzle schema with 15 of the 17 spec tables (`sops`, `insights`, `analysis_runs`, email tables intentionally deferred to Phase 3 / Phase 6).
- Express API on port 8080, React + Vite + Clerk + React Router v6 PWA on ext:3000.
- Capture pipeline: text → Claude Sonnet 4.6 parse → structured JSON → DB. Voice → Replit Object Storage → Whisper → Claude → DB. Job-status polling endpoint.
- Daily-briefing endpoint and regenerate endpoint.
- Talk, Today, and Team tabs functional. Approvals / Inbox / Projects / Insights are placeholders (per Phase 1 spec).
- Twilio inbound-SMS webhook route exists at `/api/webhooks/twilio/sms-inbound` plus delivery-status callback.
- Feature flags exist and **default OFF** (matches Doc 03 §6).
- Replit AI proxy → Anthropic + OpenAI (no separate API keys needed).
- **Twilio account configured** — agent number `+17864774367`, inbound SMS webhook pointing at the Replit dev URL, signature validation enforced in production.
- **Upstash Redis provisioned** — `takeovers-cos` free tier in `us-east-1`, `rediss://` URL configured. Unblocks BullMQ + the morning/evening briefing cron.
- **All 5 production secrets set** in Replit: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_AGENT_NUMBER`, `PRINCIPAL_PHONE`, `REDIS_URL`.

## What's blocking calling Phase 1 done

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Twilio Account SID + Auth Token in Replit secrets | Selmen | ✅ Done |
| 2 | Twilio number provisioned and webhook configured | Selmen | ✅ Done (`+17864774367`) |
| 3 | `PRINCIPAL_PHONE` set | Selmen | ✅ Done |
| 4 | Twilio inbound webhook pointed at Replit URL | Both | ✅ Done |
| 5 | `REDIS_URL` set so the briefing cron and BullMQ run out-of-process | Both | ✅ Done |
| 6 | Replit pulls latest `main` and is restarted via Publish so new secrets load | Selmen | ⏳ **Next step** |
| 7 | End-to-end smoke test: SMS from `PRINCIPAL_PHONE` → agent number → message appears in Talk thread | Both | ⏳ Next |
| 8 | Voice memo via PWA → transcribed → parsed → appears in Talk thread | Both | ⏳ Next |
| 9 | Wait for 07:00 ET morning brief, verify it lands in Today tab | Both | ⏳ Next morning |
| 10 | Web push notifications for the briefing (Acceptance #10) | Claude | Deferred — see OPEN_QUESTIONS |
| 11 | Sentry instrumentation (Doc 03 §11.2) | Claude | Deferred — see OPEN_QUESTIONS |
| 12 | Daily Postgres backup script (Doc 03 §8) | Claude | Deferred |
| 13 | Tests | Claude | Deferred — substantial scope |

## Known issues to track

- **A2P 10DLC registration** is not yet completed for the Twilio agent number. Inbound SMS to the agent (from your phone) **works without it**. Outbound SMS to your team (Phase 2) **will be filtered/throttled by US carriers** without 10DLC. Initiate registration before Phase 2 dispatch ships.
- **`replit.md` is partially out of date** — references Wouter (it's React Router v6 since commit 79be5c7), and compresses Phases 2-7 into "Phase 2/3" which conflicts with `/docs/specs/`. Cleanup item.
- **Two parallel briefing endpoints** — `/today/brief` reads from `messages` (system messages); `/briefing/today` reads from the `briefings` table. Both are populated by the same generator so they stay in sync, but the dual paths should be consolidated.
- **Schema deviations from Doc 02** — see DECISIONS.md #003 (UUID vs serial int PKs) and `messages.read_at` / `messages.sender_id` not yet present.

## What's intentionally deferred

- Dispatch to team members (Phase 2)
- Email handling across the 3 Gmail accounts (Phase 3)
- Follow-up scheduler / chase / escalations (Phase 4)
- Projects (Phase 5)
- Insights + learning loop (Phase 6)
- Drive + GitHub integration (Phase 7)

## Environments

| Env | URL | Branch | Status |
|-----|-----|--------|--------|
| Local | `localhost:3000` (PWA) / `:8080` (API) | feature branches | Working |
| Staging | _not yet wired_ | `staging` | Branch exists; no Replit deployment yet |
| Production | `https://68a0cd3c-d50a-4879-a537-a66d5976f65d-00-11gas2gvl3j2a.kirk.replit.dev` | `main` | Active in Replit |

Custom domains (`cos.takeoversrentals.com`, `staging.cos.takeoversrentals.com`) per Doc 03 §9.5 not yet configured.

## Next concrete action

See `NEXT.md` for the literal first prompt to paste at the start of the next session.
