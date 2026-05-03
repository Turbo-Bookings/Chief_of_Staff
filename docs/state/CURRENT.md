# Current State

> Single source of truth for "where are we right now." Update at the end of every session. Read first at the start of every session.

**Last updated:** 2026-05-02 (evening — after building a new Replit project from scratch, hit a network-namespace Postgres issue, paused for the day)
**Updated by:** Claude (Claude Code on Mac, with Selmen)

---

## TL;DR for next session

**Phase 1 code is correct.** App.tsx has Bearer-token bridge, api-server has authorizedParties, all GitHub PRs through #17 merged on `main` at commit `8b0e6fb`.

**Production deploy still doesn't work** — but for a different (and final) reason than yesterday. Today we built a brand-new Replit project, escaped yesterday's Clerk-injection loop, fixed 4 build issues, but hit one last platform issue: **the workspace's auto-injected `DATABASE_URL` points at `helium`, which is a Replit dev-only hostname unreachable from Autoscale deploy containers**. The api-server runs but its `/healthz` postgres check fails → Autoscale rolls the deploy.

**Decision waiting:** Provision a public-hostname Postgres (Neon, free) and either:
- **Option A — keep Replit:** put Neon URL in Replit production deployment secrets, push schema, Republish. ~1 hour. Phase 1 ships, but Replit's quirks will likely surface again in Phase 2-7.
- **Option B — migrate to Render:** ~1.5-2 hours. Removes the entire class of Replit-platform pain we've spent two days on. Render deploys from `git push origin main` cleanly, no workspace drift, no auto-injected managed integrations.

Claude's recommendation in the last session was **Option B** for durability; Option A if you absolutely want Phase 1 done today.

## Phase

**Phase 1 — PWA Shell + Capture** (Doc 04). 99% complete. Code-side: done. Deploy-side: blocked on choosing Postgres provider + finishing one of the two options above.

## What works (verified)

- All Phase 1 code in `main` at `8b0e6fb`:
  - PWA `App.tsx` includes `ClerkApiAuthBridge` that attaches Clerk JWT as `Authorization: Bearer <token>` on every API call.
  - api-server `app.ts` has `authorizedParties: [API_BASE_URL]` in clerkMiddleware.
  - Hardcoded TurboBookings publishable key in App.tsx.
  - vite configs default `PORT`/`BASE_PATH` so build doesn't crash without dev env.
  - `.replit` is back to clean multi-artifact orchestration (PR #17 reverted PR #15's overrides).
- Bearer-token approach was live-verified earlier today on the OLD project — `/api/threads/principal` returned **200** with header set, **302** without. So the auth path is sound; we just need a deploy that reaches healthy state.
- Twilio webhook capture pipeline ran end-to-end yesterday — task "Do payroll by 5pm tomorrow" was created in DB.
- `pnpm install && pnpm -r build` passes cleanly from a fresh checkout (verified by Replit Shell-Claude in the new project today). Both api-server's `dist/index.mjs` and cos-pwa's `dist/public/index.html` build successfully.

## New Replit project state

- URL: `https://replit.com/@selmen2/ChiefofStaff` (note: hyphen-less compared to old `Chief-Of-Staff`)
- Future deploy URL: `https://chiefof-staff-selmen2.replit.app`
- 11 secrets added to workspace Secrets pane:
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_AGENT_NUMBER` (`+17864774367`), `PRINCIPAL_PHONE` (`+17862238995`)
  - `REDIS_URL` (Upstash takeovers-cos — value rechecked from Upstash console; the version we copied from old project's printenv was missing one `A` character)
  - `CLERK_PUBLISHABLE_KEY` (`pk_test_cHJv...JA`), `CLERK_SECRET_KEY` (`sk_test_JpGn...P8`)
  - `AI_INTEGRATIONS_ANTHROPIC_API_KEY` / `_BASE_URL` and `_OPENAI_API_KEY` / `_BASE_URL` (Replit AI proxy at `localhost:1106`)
- **Replit Auth managed integration is dormant** — confirmed by checking workspace env (no `pk_live_*` or `sk_live_*` auto-injected). This is the key thing that's better than the old project.
- Workspace Postgres auto-provisioned at `helium` from `modules = ["postgresql-16"]`. **This is the unfixable-on-its-own piece — see "What's broken" below.**

## What's broken

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | **Production deploy can't reach Postgres** | **Blocker** | Workspace `DATABASE_URL` points at `helium` host, which only exists in workspace network namespace. Autoscale deploy container DNS-fails on `helium`. `/healthz` postgres check returns `error` → 503 → Autoscale rolls deploy. Fix: provision Neon or use Replit's own "Database" tool option that gives a public-hostname URL. Then put it in production deployment secrets (NOT workspace Secrets — keep workspace pointing at helium for fast dev). |

That's the only outstanding blocker. Everything else is solved.

## Today's PRs merged to main

| # | Branch | What it did |
|---|---|---|
| 14 | chore/state-handoff-after-replit-debug | Captured yesterday's auth-302 debugging |
| 15 | fix/replit-deploy-build-config | Added `run`/`build` to `.replit` — turned out to be wrong, see #17 |
| 16 | fix/vite-config-env-defaults | Defaulted PORT/BASE_PATH in cos-pwa + mockup-sandbox vite configs so build works without dev env (proper fix for the original issue PR #15 was trying to address) |
| 17 | fix/restore-multiartifact-deploy | Reverted PR #15's `run`/`build` lines because they overrode the multi-artifact router orchestration. Replit's `router = "application"` model uses three `.replit-artifact/artifact.toml` files (api-server serves /api, cos-pwa serves /, mockup-sandbox dev-only). PR #15's top-level run= silently disabled this, so cos-pwa never started. |

`main` is at `8b0e6fb` after PR #17.

## Production deploy secrets (Replit)

When we resume on Option A, we need to reach **Publishing → Adjust settings → Production app secrets** in the new Replit project and:
- Add `DATABASE_URL` = `<the Neon URL we'll provision>`
- Add anything else missing — but the workspace Secrets values (Twilio, Clerk, Redis, AI) appear to propagate to deployment in this Replit setup.

## Sensitive values currently in conversation transcript (rotate after Phase 1 sign-off)

- Twilio Auth Token
- Upstash Redis token
- Clerk Secret Key (`sk_test_*`)

(Same list as before — nothing new added today.)

## Resume protocol for next session

1. `cd /Users/selmen/Chief_of_Staff && git fetch && git pull`
2. Read this CURRENT.md
3. Read the latest SESSION_LOG.md entry (2026-05-02 evening)
4. Decide: Option A (finish on Replit, ~1h) or Option B (migrate to Render, ~2h). Claude's recommendation was Option B.
5. Either way, **first concrete step is "provision Neon Postgres"** (https://neon.tech, free, 5 min). The connection string will be `postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require`.
6. From there:
   - **Option A**: Put Neon URL in Publishing → Adjust settings → Production app secrets in `https://replit.com/@selmen2/ChiefofStaff`. Then `DATABASE_URL="<neon>" pnpm --filter @workspace/db run push` from workspace shell. Republish.
   - **Option B**: Sign up Render, connect GitHub repo, set env vars, deploy. Update Twilio webhook to new URL.

## Environments

| Env | URL | Branch | Status |
|-----|-----|--------|--------|
| Local | `localhost:3000` (PWA) / `:8080` (API) | feature/* | Working |
| New Replit project (workspace dev) | n/a | n/a | Working — workspace Postgres `helium` reachable |
| New Replit deploy | `https://chiefof-staff-selmen2.replit.app` (will be) | `main` | **Not live yet** — last deploy attempt rolled back due to Postgres healthz failure |
| Old Replit deploy | `https://chief-of-staff-selmen2.replit.app` | `main` | Still up but auth broken from yesterday's loop. Don't use. |
