# Next Session — Resume Prompt

> Copy-paste the block below as the first message of your next Claude Code session (or Replit Agent session). It's the literal handoff.

---

```
We're picking up the takeovers-cos build. Repo: Turbo-Bookings/Chief_of_Staff.

Before doing anything else:
1. git pull on the develop branch
2. Read /docs/state/CURRENT.md, /docs/state/SESSION_LOG.md (last entry), and /docs/state/DECISIONS.md
3. Run `git log --oneline -10` to see what shipped most recently

Phase 1 is ~85% done per CURRENT.md. The remaining items are listed there in priority order. Confirm with me which item to pick up.

Authoritative spec: /docs/specs/. Phase docs are 04–10. Build environment rules in /docs/specs/03_*.txt. Schema in /docs/specs/02_*.txt.

When we wrap, update CURRENT.md, append to SESSION_LOG.md, and rewrite NEXT.md so the *next* session resumes cleanly.
```

---

## Why this exists

Sessions don't remember each other. Replit Agent forgets. I (Claude) forget across new sessions unless I read this file. The repo is the only durable memory across both. NEXT.md is the literal "where I left off — start here" note.
