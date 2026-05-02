# Current State

> The single source of truth for "where are we right now." Update at the end of every session. Read first at the start of every session.

**Last updated:** 2026-05-01
**Updated by:** Claude (Claude Code session with Selmen)

---

## Phase

**Phase 1 — PWA Shell + Capture** (Doc 04). ~85% complete.

## What's working end-to-end

- pnpm workspace monorepo scaffolded per Doc 03 §2 (`artifacts/`, `lib/`, `scripts/`).
- Postgres + Drizzle schema with 15 of the 17 spec tables (`sops`, `insights`, `analysis_runs`, email tables intentionally deferred to Phase 3 / Phase 6).
- Express API on port 8080, React + Vite + Clerk + Wouter PWA on ext:3000.
- Capture pipeline: text → Claude Sonnet 4.6 parse → structured JSON → DB. Voice → Replit Object Storage → Whisper → Claude → DB. Job-status polling endpoint.
- Daily-briefing endpoint and regenerate endpoint.
- Talk, Today, and Team tabs functional. Approvals / Inbox / Projects / Insights are placeholders (per Phase 1 spec).
- Twilio inbound-SMS webhook route exists at `/api/webhooks/twilio/sms-inbound` plus delivery-status callback.
- Feature flags exist and **default OFF** (matches Doc 03 §6).
- Replit AI proxy → Anthropic + OpenAI (no separate API keys needed).

## What's blocking calling Phase 1 done

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Twilio Account SID + Auth Token in Replit secrets | Selmen | Pending |
| 2 | Twilio number provisioned and entered into DB as the agent's number | Selmen | Pending |
| 3 | `PRINCIPAL_PHONE` env var set to Selmen's mobile (E.164) | Selmen | Pending |
| 4 | Twilio inbound webhook pointed at `https://<replit-domain>/api/webhooks/twilio/sms-inbound` | Selmen | Pending |
| 5 | Morning + evening brief on a real cron at 07:00 / 18:00 America/New_York (using `schedules` table) | Claude | Not started |
| 6 | End-to-end smoke test: voice memo on phone → SMS to agent number → appears in Talk + Today | Both | Not started |
| 7 | Optional: `REDIS_URL` (Upstash) so BullMQ runs out-of-process before Phase 2 | Selmen | Optional |

## What's intentionally deferred

- Dispatch to team members (Phase 2)
- Email handling across the 3 Gmail accounts (Phase 3)
- Follow-up scheduler / chase / escalations (Phase 4)
- Projects (Phase 5)
- Insights + learning loop (Phase 6)
- Drive + GitHub integration (Phase 7)

## Known deviations from the spec (need a DECISIONS.md entry)

- **PKs are serial integers, not UUIDs.** Doc 02 specified UUIDs for client-side ID generation. Switch is non-trivial post-Phase-2 — decide now whether to migrate or document the deviation.
- **Phase numbering in `replit.md`** is compressed ("Phase 2 = Approvals + Inbox"). The 7-phase numbering in `/docs/specs/` is authoritative; `replit.md` should be updated to match or noted as a Replit-specific shorthand.

## Environments

| Env | URL | Branch | Status |
|-----|-----|--------|--------|
| Local | `localhost:3000` (PWA) / `:8080` (API) | feature branches | Working |
| Staging | _not yet wired_ | `staging` | Branch created, no Replit deployment yet |
| Production | _Replit dev URL for now_ | `main` | Active in Replit |

Custom domains (`cos.takeoversrentals.com`, `staging.cos.takeoversrentals.com`) per Doc 03 §9.5 not yet configured.

## Next concrete action

See `NEXT.md` for the literal first prompt to paste at the start of the next session.
