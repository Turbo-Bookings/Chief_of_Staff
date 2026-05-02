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
