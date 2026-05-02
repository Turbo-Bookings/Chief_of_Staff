# Open Questions

> Things we've deferred, not forgotten. Reviewed at the end of every phase.

Entry format:

```
## <Question>

**Raised:** YYYY-MM-DD
**Phase context:** <which phase surfaced this>
**Owner:** <who decides>
**Decide-by:** <when this becomes blocking>

<a paragraph or two of context>
```

---

## Clerk vs Auth0 for PWA auth?

**Raised:** 2026-05-01 (carried from Doc 01 §10)
**Phase context:** Phase 1 already shipped on Clerk dev keys.
**Owner:** Selmen
**Decide-by:** Before Phase 1 production launch (Selmen needs to flip from Clerk dev keys to Clerk prod keys, OR migrate to Auth0).

Doc 01 §10 had this open. Replit Agent went with Clerk dev keys. Probably the right call — keep Clerk, just upgrade to a prod application + 2FA per Doc 03 §12.2. Confirm and close.

---

## BullMQ + Redis vs n8n for the loop scheduler?

**Raised:** 2026-05-01 (carried from Doc 01 §10)
**Phase context:** Currently BullMQ inline (no Redis). Doc 01 hypothesized "likely both — n8n for high-level loops, BullMQ for tight scheduling."
**Owner:** Selmen
**Decide-by:** Before Phase 4 chase scheduler ships.

The follow-up scheduler (Phase 4) and weekly insights run (Phase 6) need reliable cron. Inline BullMQ is fine for Phase 1 capture but won't survive Phase 4. Need Redis (Upstash recommended) before then. n8n hasn't been wired in yet — confirm whether to add it or do everything in BullMQ.

---

## Calendar integration for the Insights tab?

**Raised:** 2026-05-01 (carried from Doc 01 §10)
**Phase context:** Phase 6.
**Owner:** Selmen
**Decide-by:** During Phase 6 design.

Should the agent automatically book Selmen's weekly Insights review time on his calendar? Tier C is "agent reminds, does not act" for scheduling — so likely no. Confirm and close, or carve out an exception.

---

## Voice output (call-back, voicemail) in a future phase?

**Raised:** 2026-05-01 (carried from Doc 01 §10)
**Phase context:** v2 / post-MVP.
**Owner:** Selmen
**Decide-by:** After Phase 7 ships and the system has 90 days of production use.

Probably no in v1. Revisit after the first quarter of production data on response patterns.

---

## Expose the agent to Brandon and Richard as a shared tool?

**Raised:** 2026-05-01 (carried from Doc 01 §10)
**Phase context:** v2.
**Owner:** Selmen
**Decide-by:** After 90 days of production with Selmen as sole user.

Doc 01 recommended Selmen-only for v1. Hold to that. Revisit if/when there's a clear pull from Brandon or Richard.

---

## Serial integer PKs vs UUIDs?

**Raised:** 2026-05-01
**Phase context:** Schema deviation from Doc 02.
**Owner:** Selmen
**Decide-by:** Before Phase 2 dispatch ships.

See DECISIONS.md #003.
