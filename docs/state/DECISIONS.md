# Decisions

> Architectural decision log. Append-only. One entry per non-trivial call. The point is to stop relitigating.

Entry format:

```
## NNN — <Title>

**Date:** YYYY-MM-DD
**Status:** proposed | accepted | superseded by NNN | reversed

### Context
What problem are we solving, what alternatives were on the table.

### Decision
What we're doing.

### Consequences
What this commits us to / what we're giving up.
```

---

## 001 — Branch model: main ← staging ← feature/*

**Date:** 2026-05-01
**Status:** accepted (revised same day from initial 4-branch proposal)

### Context
Doc 03 §3 specifies a three-branch model (main / staging / feature). Initial bootstrap added an extra `develop` integration branch, but that pattern only pays off with multiple devs merging parallel features before promoting to staging — not the case here. Reverted to the spec exactly to keep mental overhead low.

### Decision
- `main` — production. Replit prod deployment tracks this. Branch-protected, PRs only.
- `staging` — staging environment. Replit staging deployment tracks this. Branch-protected, PRs only. Feature branches merge here.
- `feature/*` — work in progress, branched off `staging`.

Code flows in one direction: `feature/*` → `staging` → `main`.

### Consequences
- Two Replit deployments needed (staging + prod). Staging not yet wired.
- Branch protection on `main` and `staging` to be set in the GitHub UI.
- The Replit IDE workspace must be checked out on a feature branch when editing — never directly on `main` or `staging`.

---

## 002 — Spec docs live in `/docs/specs/`, kept as authoritative

**Date:** 2026-05-01
**Status:** accepted

### Context
The 13 spec docs (architecture, schema, build env, 7 phases, 3 PDF diagrams, HTML mockup) authored in April 2026 are the source of truth. They were sitting outside the repo in `~/Documents/Chief Of Staff Agent/`, where the Replit Agent and other tools couldn't reach them.

### Decision
Commit the originals (`.docx`, `.pdf`, `.html`) plus plain-text extracts (`.txt`) into `/docs/specs/`. Plain-text extracts are committed so the contents are greppable and readable by tools that don't open Word.

### Consequences
- Anyone working on the repo (Claude, Replit Agent, future devs) can see the spec.
- When a decision in the spec changes, both the `.docx`/`.pdf` and the `.txt` must be updated, plus a DECISIONS.md entry written.
- Increases repo size by ~600 KB. Acceptable.

---

## 004 — Hardcoded Clerk publishable key in App.tsx; removed `publishableKeyFromHost` everywhere

**Date:** 2026-05-02
**Status:** accepted (tactical fix; revisit before custom-domain rollout)

### Context
Phase 1's auto-provisioned Replit Clerk integration wired `App.tsx` and `app.ts` to use `publishableKeyFromHost(window.location.hostname, env.VITE_CLERK_PUBLISHABLE_KEY)`. This Clerk helper derives a `clerk.<host>` satellite-domain frontend API URL (a Clerk multi-tenant pattern). On `*.replit.app` deployments that satellite subdomain has no DNS record, so the browser's request to load Clerk JS hangs with `ERR_CONNECTION_CLOSED`. The same helper on the server returns wrong publishable keys for the auth middleware.

Compounding: the deploy serves `artifacts/cos-pwa/dist/public/` as-is and does not rebuild on Republish. Vite needs `VITE_CLERK_PUBLISHABLE_KEY` at build time, and Replit has at least three different env-injection paths (`.replit` userenv.shared, the Configurations pane, deployment-time secrets) — getting Vite to actually receive a value at build time was unreliable.

### Decision
- `App.tsx`: replace `publishableKeyFromHost(...)` with the literal string `"pk_test_cHJv..."` (the TurboBookings dev publishable key). Publishable keys are public by design — safe to commit.
- `app.ts`: replace `publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY)` with `process.env.CLERK_PUBLISHABLE_KEY!` directly.
- Keep `clerkProxyMiddleware` mounted (it's a no-op without `CLERK_SECRET_KEY` and behaves correctly with one).

### Consequences
- ✅ Eliminates the satellite-subdomain DNS fragility.
- ✅ Removes the Vite build-time env-injection failure mode (the value is a string literal).
- ⚠️ When we move to a custom production domain (`cos.takeoversrentals.com`), we'll need a *production* Clerk app + production publishable key. The literal string in `App.tsx` will need to flip back to env-driven, OR we go satellite-domains-the-right-way with proper DNS.
- ⚠️ The committed `dist/public/` is now a deployment-controlled artifact. It needs to stay in sync with source, which is fragile. Long-term fix: change the deploy config so Replit rebuilds the PWA from source on each Republish — at which point the literal-string-in-App.tsx no longer needs the rebuilt `dist/` to match.

---

## 005 — Defer pre-built `dist/` cleanup to next session

**Date:** 2026-05-02
**Status:** acknowledged debt; tracked in OPEN_QUESTIONS

### Context
Replit's Autoscale deploy serves whatever's in `artifacts/cos-pwa/dist/public/` at deploy time, without running `pnpm build`. This means a) the `dist/` directory is committed to the repo, b) any source change to `cos-pwa/src/` only ships if someone manually rebuilds and re-commits `dist/`, c) every PWA-source PR has a noisy diff in `dist/`.

The Replit Agent during Phase 1 set this up. It works but it's fragile.

### Decision (deferred)
Long-term: change the Replit deploy config (likely an entry in `.replit` `[deployment]` block) to run `pnpm --filter cos-pwa build` during the deploy build step. Then remove `dist/` from the repo and `.gitignore` it.

For now: continue committing `dist/` after rebuilds. Document in OPEN_QUESTIONS to fix in a focused PR.

### Consequences
- Phase 1 unblocked tonight.
- Anyone editing the PWA must remember to rebuild + commit `dist/`. Easy to forget.
- Each PR touching the PWA has a large `dist/` diff in addition to the source diff.

---

## 003 — Open: Serial integer PKs vs UUIDs

**Date:** 2026-05-01
**Status:** proposed (needs decision before Phase 2 ships)

### Context
Doc 02 §"Design Notes — Why UUIDs everywhere" specifies UUIDs so the PWA can generate IDs client-side before insert. Current Drizzle schema uses serial integer PKs. Migrating to UUIDs gets meaningfully harder once Phase 2 dispatch and Phase 4 chase logic are wired.

### Decision
Open. Three options:
1. Migrate to UUIDs now, while only Phase 1 data exists (cheap, but requires re-seed and re-ingest of any test data).
2. Stay on integer PKs and update Doc 02 to match (pragmatic; loses client-side ID generation).
3. Add UUID as a parallel `external_id` column on user-facing entities, keep integer PK internal (compromise).

### Consequences
TBD when decided. Selmen to pick before Phase 2 work begins.
