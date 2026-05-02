# Current State

> Single source of truth for "where are we right now." Update at the end of every session. Read first at the start of every session.

**Last updated:** 2026-05-02 (afternoon — after marathon Clerk auth debug)
**Updated by:** Claude (Claude Code on Mac, with Selmen)

---

## TL;DR

**Phase 1 is functional at the data layer.** SMS capture works (verified — task "Do payroll by 5pm tomorrow" is in production DB). Code on GitHub `main` (commit `716f4bf`) is correct: PWA `App.tsx` has `ClerkApiAuthBridge` wiring Bearer tokens, api-server `app.ts` has `authorizedParties`, all GitHub PRs merged.

**Phase 1 is BROKEN at the auth-verification layer due to a Replit platform behavior.** The "Replit Auth" managed integration re-injects its own `pk_live_*` / `sk_live_*` (from a Replit-owned Clerk app `tender-hippo-62`, instance `ins_3D6yK87...`) into the production deployment on every Republish, overwriting the TurboBookings keys (instance `ins_3D9TSR...`) we set manually. Result: server can't verify JWTs the frontend signs → 302 redirect with `jwk-kid-mismatch`.

We've verified everything else works. The Bearer token IS sent, App.tsx has the bridge, the new bundle deploys correctly. **The blocker is purely the Replit-managed Clerk-app override loop.**

Selmen is at the gym deciding between:
- **A — New Replit project from GitHub** (~1.5h): clone repo into fresh project, decline auto-Auth integration on setup. If Replit doesn't auto-spawn the integration, all our keys stick and we ship Phase 1.
- **B — Migrate to Render** (~3-4h): durable answer if Replit insists on re-spawning the integration. GitHub-connected, no managed-integration weirdness.

## Phase

**Phase 1 — PWA Shell + Capture** (Doc 04). ~98% complete. Only the Clerk-key-injection loop blocks sign-off.

## What works (verified)

- Production DB has principal_talk thread + 11+ messages including the SMS captures
- Twilio webhook → SMS capture pipeline ran end-to-end (messageId=18, task "Do payroll by 5pm tomorrow" created)
- PWA loads, Clerk JS loads, sign-in via Google works
- PWA's `customFetch` attaches `Authorization: Bearer <token>` (verified in DevTools network — header is present on `/api/threads/principal`)
- New PWA bundle deploys correctly when workspace is force-synced (`index-B2Ir7c9B.js`, contains the `ClerkApiAuthBridge` code)
- `/api/threads/principal` returns 200 when JWT is verified by the correct Clerk instance (verified via in-browser fetch test)

## What's broken — the loop we couldn't escape on Replit

- Replit's "Replit Auth" managed integration owns a Clerk app it auto-provisioned for this project (`tender-hippo-62`, instance `ins_3D6yK87IE4ElHrkNwkItiwRnl94`)
- It exposes that app's `pk_live_*` and `sk_live_*` as production deployment env vars
- **Every Republish re-injects those values**, overwriting any manual edits to `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` in the production secrets pane
- We confirmed this happens by: setting them to TurboBookings values → Publishing → them reverting to Replit-managed values within minutes

## What was tried and why it didn't stick

| Attempt | Result |
|---|---|
| Set production secrets to TurboBookings values, Publish | Worked briefly, then reverted on next Republish |
| `git reset --hard origin/main` in workspace + Republish | New PWA bundle deployed correctly (B2Ir7c9B), but server secrets re-injected back to Replit-managed |
| Click "Delete Clerk app" in Replit Auth Configure tab | Click landed but no confirmation surfaced; unclear if it took effect; even if it did, history suggests Replit re-spawns the integration |

## Key facts a fresh-project setup needs

- Repo: `Turbo-Bookings/Chief_of_Staff`, branch `main` at `716f4bf` (after merging PR #13)
- Hardcoded Clerk publishable key in `App.tsx`: `pk_test_cHJvbW90ZWQtZWxlcGhhbnQtODcuY2xlcmsuYWNjb3VudHMuZGV2JA` (TurboBookings, dev — public, safe to commit)
- TurboBookings Clerk app id: `app_3D9TSOc7uIoneXKqpXooJU3JMRJ`, instance `ins_3D9TSRuyZ5a7di30NqyhPwSGKD3`, frontend API `https://promoted-elephant-87.clerk.accounts.dev`
- Production DB rows we don't want to lose: `principal` row (clerk_user_id `user_3D9cJIzib5nhFiIGVAgvOAGhbiL`), `messages` thread + 11+ messages including SMS captures, the "Do payroll by 5pm tomorrow" task

## Secrets that need transferring to a new project (~12)

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_AGENT_NUMBER` (`+17864774367`)
- `PRINCIPAL_PHONE` (`+17862238995`)
- `REDIS_URL` (Upstash `takeovers-cos`, us-east-1)
- `DATABASE_URL` + Postgres `PG*` vars (or move DB to Neon/Supabase)
- `CLERK_PUBLISHABLE_KEY` = `pk_test_cHJvbW90ZWQtZWxlcGhhbnQtODcuY2xlcmsuYWNjb3VudHMuZGV2JA`
- `CLERK_SECRET_KEY` = `sk_test_JpGnVSRegdDEW95Ur1ILDMW63sPvCoYrcF90N0LsP8` (TurboBookings — rotate after sign-off per OPEN_QUESTIONS)
- `VITE_CLERK_PUBLISHABLE_KEY` = same pk_test value as above (or skip — App.tsx has it hardcoded)
- `API_BASE_URL` = the new project's deployment URL once known
- `AI_INTEGRATIONS_*` for Anthropic/OpenAI (Replit AI proxy endpoints)
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`

## Critical setup gates for new Replit project

1. **When importing the GitHub repo, decline any "Auth" integration prompt.** If Replit asks "Set up authentication?" → say no.
2. **After import, open Tools → Integrations and verify "Replit Auth" is NOT under "Replit managed."** If it is, delete it before doing anything else.
3. **Then transfer secrets, point Twilio webhook at new URL, hit Republish, smoke-test SMS.**

If at any point Replit auto-spawns the Auth integration anyway, that's the signal to migrate to Render instead.

## Environments

| Env | URL | Branch | Status |
|-----|-----|--------|--------|
| Local | `localhost:3000` (PWA) / `:8080` (API) | feature/* | Working |
| Staging | _not yet wired_ | `staging` | Branch exists; no deployment |
| Production (current Replit) | `https://chief-of-staff-selmen2.replit.app` | `main` | Functional at data layer; auth blocked at verification |

## Next concrete actions (when Selmen returns)

1. Decide: new Replit project (Option A) vs. Render migration (Option B).
2. If A: create new Replit project from `Turbo-Bookings/Chief_of_Staff` repo. Decline Auth integration on import. Transfer the ~12 secrets above. Point Twilio webhook at new URL. Republish.
3. If B: write `render.yaml`, push as a branch, connect Render to the repo, transfer secrets there.
4. Verify `/api/threads/principal` returns 200 with the principal_talk thread.
5. Update `docs/state/` and declare Phase 1 sign-off.

## Sensitive values currently in conversation transcript (rotate after Phase 1 sign-off)

- `TWILIO_AUTH_TOKEN`
- Upstash Redis token
- `CLERK_SECRET_KEY` (sk_test_*)
