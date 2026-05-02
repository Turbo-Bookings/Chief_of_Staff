# Next Session — Resume Prompt

> Copy-paste the block below as the first message of your next Claude Code session. It's the literal handoff.

---

```
We're picking up the takeovers-cos build. Repo: Turbo-Bookings/Chief_of_Staff.
Last session was a marathon — we got Phase 1 functional at the data layer
but auth at the UI layer broke. Don't start any new work until you've read:

  /CLAUDE.md
  /docs/state/CURRENT.md  (especially the "TL;DR for Tomorrow" + "Workspace ↔ GitHub divergence" sections)
  /docs/state/SESSION_LOG.md  (the 2026-05-02 entry)
  /docs/state/DECISIONS.md  (#004 and #005, both 2026-05-02)
  /docs/state/OPEN_QUESTIONS.md  (the two URGENT items at the top)

Then run:
  cd /Users/selmen/Chief_of_Staff
  git fetch origin && git checkout main && git pull
  git log --oneline -5

Today's plan, in order:

1) RECONCILE WORKSPACE ↔ GITHUB (first thing, no exceptions)
   The Replit workspace has edits to App.tsx, app.ts, .replit that are
   NOT in GitHub main. See OPEN_QUESTIONS "URGENT — Reconcile" entry.
   Pull each modified file from Replit (via Chrome MCP / shell or just
   ask Selmen to git push from Replit), commit on a feature branch,
   PR through staging → main.

2) FIX CLERK AUTH (Phase 1 sign-off blocker)
   See OPEN_QUESTIONS "URGENT — Fix Clerk auth-302" entry. Symptoms,
   hypothesis, and three candidate fixes are documented there. Try
   `authorizedParties` config first.

3) VERIFY END-TO-END
   After (2), Selmen refreshes /talk in the browser. Expected:
     - /api/threads/principal returns 200 with the principal_talk
       thread + 11+ messages including the SMS captures from yesterday
     - /api/today/tasks returns the "Do payroll by 5pm tomorrow" task
   If yes → Phase 1 done. Update CURRENT.md.

Production URL: https://chief-of-staff-selmen2.replit.app
Twilio agent number: +17864774367
PRINCIPAL_PHONE: +17862238995 (Selmen's mobile)
Clerk app: TurboBookings (promoted-elephant-87.clerk.accounts.dev) — DEV instance
Twilio creds, Redis URL, Clerk keys: all in /tmp/cos_review/twilio.env on this Mac
                                      (and in Replit Secrets, current values)

When we wrap, update CURRENT.md, append to SESSION_LOG.md, rewrite
NEXT.md so the *next* session resumes cleanly.
```

---

## Why this exists

Sessions don't remember each other. Replit Agent forgets. I (Claude) forget across new sessions unless I read this file. The repo is the only durable memory across both. NEXT.md is the literal "where I left off — start here" note.
