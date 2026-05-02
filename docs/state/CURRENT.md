# Current State

> The single source of truth for "where are we right now." Update at the end of every session. Read first at the start of every session.

**Last updated:** 2026-05-02 (after a marathon evening session — Phase 1 functional at the data layer, Clerk auth broken at the UI layer)
**Updated by:** Claude (Claude Code session with Selmen)

---

## TL;DR for Tomorrow

**Phase 1 is functional end-to-end at the data layer**: SMS → Twilio webhook → production server → Whisper/Claude parse → DB write → task creation. Verified by checking runtime logs and DB.

**Phase 1 is BROKEN at the visualization layer**: every authenticated `/api/*` request returns HTTP 302 instead of data. The PWA's Talk + Today tabs show empty even though the data is in the DB. Root cause is Clerk dev-mode session model (JWT-in-URL via `__clerk_db_jwt`) doesn't match the cookie-based auth our `app.ts` expects.

**Workspace ≠ GitHub**: a lot of fixes were applied directly in the Replit workspace and never synced to GitHub. Reconciling that is the FIRST task tomorrow before doing any new work.

---

## Phase

**Phase 1 — PWA Shell + Capture** (Doc 04). ~95% complete; auth-layer fix needed before sign-off.

## What works (verified via runtime logs and DB queries tonight)

- Production deployment running at `https://chief-of-staff-selmen2.replit.app`
- Health endpoint: `postgres: ok`, `redis: ok`, `object_storage: ok` (`ai_proxy` falsely reports `not_configured` — health check has wrong env var name; runtime AI calls work)
- Twilio webhook → SMS captured. Verified: messageId=18 from `+17862238995` at 01:02:01 UTC, body 58 chars, capture pipeline ran end-to-end and created task "Do payroll by 5pm tomorrow"
- Postgres + Drizzle schema, BullMQ + Upstash Redis, Replit Object Storage all operational
- Daily-briefing endpoints exist (cron schedule registered when REDIS_URL present)
- PWA loads, Clerk loads, sign-in flow works (you signed in tonight with `sel@takeoversrentals.com` via Google)
- The 7-tab navigation is wired and rendering

## What's broken

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | **Authenticated `/api/*` calls return HTTP 302 instead of data** | **High — Phase 1 blocker for UI verification** | Clerk dev keys use JWT-in-URL (`__clerk_db_jwt` query param + localStorage), our API uses cookie-based auth. Mismatch → no session detected → `requireAuth()` redirects → empty UI |
| 2 | `principal.clerk_user_id` stays `NULL` after sign-in | High — depends on #1 | The auth-claim happens inside the auth middleware, so until #1 is fixed, no Clerk user can claim the principal record |
| 3 | Health check reports `ai_proxy: not_configured` despite working | Low — cosmetic | `routes/health.ts` checks `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` but actual code uses `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_ANTHROPIC_API_KEY` |
| 4 | Outbound SMS to user's phone blocked by carrier | Medium — Phase 2 blocker | A2P 10DLC registration not done. Inbound works fine; outbound to `+1786…` gets `30034` |

## What was done tonight (chronological highlights)

1. Audited Phase 1 build vs Doc 04. ~85% complete.
2. Drove Chrome to Twilio, Upstash, Replit. Captured creds, provisioned `takeovers-cos` Redis (us-east-1, free tier), pasted 5 secrets into Replit (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_AGENT_NUMBER` `+17864774367`, `PRINCIPAL_PHONE` `+17862238995`, `REDIS_URL`).
3. First Republish picked up secrets — health endpoint flipped to all OK including Redis.
4. Sent first test SMS → Twilio webhook returned 403 because `req.protocol` reports `http` behind Replit's proxy → signature mismatch. Added `API_BASE_URL=https://chief-of-staff-selmen2.replit.app` secret. Republished. Webhook signature validation now passes.
5. Sent second SMS → webhook returned 200 ✅, agent generated TwiML reply ✅, but **Twilio carrier rejected the outbound reply with `30034` (A2P 10DLC unregistered)** — *inbound captured fine, outbound just couldn't deliver the confirmation*.
6. Tried to view captured data in the PWA → black screen. Console showed `Failed to load Clerk JS` from `clerk.chief-of-staff-selmen2.replit.app/npm/...` (`ERR_CONNECTION_CLOSED`).
7. **Discovered Phase 1 was built using Replit's auto-provisioned "Clerk Auth" managed integration** (Replit created a Clerk app `tender-hippo-62` without any user signup, hardcoded the publishable key into `.replit` userenv.shared, set up `publishableKeyFromHost(window.location.hostname, key)` in both `App.tsx` and `app.ts` to derive a `clerk.<replit-host>.replit.app` satellite domain that was never DNS-configured).
8. User signed up to Clerk with their Google identity → created new app `TurboBookings` with key `pk_test_cHJv...` (decodes to `promoted-elephant-87.clerk.accounts.dev`).
9. Swapped CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY (Configuration) to TurboBookings values via the Replit Secrets pane. Reset `principal.clerk_user_id = NULL` via psql so the new Clerk user could claim it.
10. Replit Agent edited `App.tsx` to remove `publishableKeyFromHost`. **It claimed to also edit `app.ts` but did NOT.** This came back to bite us.
11. Republish kept producing the same PWA bundle (`index-DW5AJhTr.js`) because **the PWA is built ahead of time and committed to `artifacts/cos-pwa/dist/public/`; deploys serve `dist/` as-is and never rebuild from source**.
12. Manually rebuilt the PWA in the workspace shell with `VITE_CLERK_PUBLISHABLE_KEY` set inline → produced `index-D1vXJveU.js` with the new key baked in. Republished. Black screen finally replaced by the working landing page.
13. Sent a third test SMS → production webhook ran, capture pipeline created the task in DB. ✅
14. User signed in to PWA → Talk and Today tabs rendered EMPTY. Network tab shows every `/api/*` request returns `302 → location: /`.
15. Found that `app.ts` (server) STILL had `publishableKeyFromHost`. Sed-edited it directly in the workspace to use `process.env.CLERK_PUBLISHABLE_KEY!` directly. Republished. Compiled api-server bundle confirmed contains the new code.
16. **Auth still 302**. Realized Clerk dev keys use JWT-in-URL pattern (`__clerk_db_jwt` query param) which the API server's cookie-based auth can't read. This is the proper next-day fix.

## Workspace ↔ GitHub divergence (CRITICAL FOR TOMORROW)

**The Replit workspace has the following changes that are NOT in GitHub `main`:**

1. `artifacts/cos-pwa/src/App.tsx` — `publishableKeyFromHost` call replaced with hardcoded `pk_test_cHJvbW90ZWQtZWxlcGhhbnQtODcuY2xlcmsuYWNjb3VudHMuZGV2JA` literal
2. `artifacts/api-server/src/app.ts` — `publishableKeyFromHost(...)` replaced with `process.env.CLERK_PUBLISHABLE_KEY!` directly
3. `.replit` line 37 — `VITE_CLERK_PUBLISHABLE_KEY` updated to the new TurboBookings key
4. `artifacts/cos-pwa/dist/public/` — fresh build with `index-D1vXJveU.js` containing the new key
5. `artifacts/api-server/dist/` — fresh build of the api-server (compiled bundle dated `May 2 01:59`)

GitHub main is at commit `6190c53` (the merged docs PR). It does NOT have any of the above. **Sync this BEFORE any new code work tomorrow** so the source of truth doesn't drift.

Approach: pull the workspace files into the local clone, commit on a feature branch, PR through `staging` → `main`. The `dist/` should NOT be re-committed (tomorrow's CI/build pipeline should handle that — see Decisions below).

## Environments

| Env | URL | Branch | Status |
|-----|-----|--------|--------|
| Local | `localhost:3000` (PWA) / `:8080` (API) | feature branches | Working |
| Staging | _not yet wired_ | `staging` | Branch exists; no Replit deployment yet |
| Production | `https://chief-of-staff-selmen2.replit.app` | `main` (with workspace drift, see above) | Functional at data layer; auth broken at UI layer |

## Sensitive values that exist in the conversation transcript (rotate after Phase 1 sign-off)

- `TWILIO_AUTH_TOKEN` — Twilio Console → Account → API keys & tokens → "Request a new auth token"
- Upstash Redis token — Upstash → DB → Reset Credentials
- The Clerk publishable key is now hardcoded in `App.tsx` (it's a public dev key — *publishable* keys are designed to be public, this is fine; secret key is what matters and is still in env)
- `CLERK_SECRET_KEY` (sk_test_*) — Clerk → API keys → rotate

## Next concrete actions

See `NEXT.md` for the literal first prompt for tomorrow's session.

The first three things to do tomorrow, in order:

1. **Reconcile workspace ↔ GitHub.** Pull the workspace's modified files into the local clone, commit on a feature branch, PR through staging → main. Specifically the App.tsx + app.ts + .replit edits. Do not commit `dist/` — handle that via DECISIONS.md #004.
2. **Fix Clerk auth properly.** The cookie-vs-JWT issue. Likely fixes: (a) configure `clerkMiddleware` with explicit `authorizedParties: [PRODUCTION_URL]`, (b) ensure the PWA's Clerk SDK is using the proper session token format, (c) potentially enable cookie sync via Clerk's setup (not just localStorage). Reference: `https://clerk.com/docs/references/nextjs/clerk-middleware`. Verify by hitting `/api/threads/principal` from the signed-in browser and getting a 200.
3. **Once auth works, claim the principal.** First auth'd request will trigger the principalAuthMiddleware claim path. Verify `clerk_user_id` is set in DB.

After those three: the SMS task you sent ("Do payroll by 5pm tomorrow") will appear in your Today tab and you can declare Phase 1 sign-off complete.
