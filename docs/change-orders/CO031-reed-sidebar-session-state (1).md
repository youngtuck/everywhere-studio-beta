# Change Order CO_031 — Reed Sidebar Session State
**Status:** OPEN
**Opened:** April 14, 2026
**Project:** EVERYWHERE Studio FOH (Vercel)
**Assigned To:** Tucker Howard

---

## Context

I completed a 5-question intake session in Work (Building Statement). After finishing all inputs, I opened the Reed sidebar panel. The panel rendered in a default/static state with no awareness of the active session — showing Watch context and a First Move prompt that had already been completed.

---

## Items

### Item 1 — Reed's Take Showing Wrong Context
**Browser:** Chrome
**Reproduction:** Complete a Work session intake. Open Reed sidebar. "Reed's Take" section displays Watch context ("Run a briefing in Watch to get Reed's take on what matters this week.") instead of Work session context.
**Expected:** Reed's Take reflects the active session and current stage.
**Fix:** Reed sidebar must read active session context and render accordingly.

---

### Item 2 — First Move Button Not Syncing with Session Progress
**Browser:** Chrome
**Reproduction:** Complete all 5 intake questions. Open Reed sidebar. First Move button still shows "Who is the audience?" — a question already answered.
**Expected:** First Move reflects where the user actually is in the session — not a static default.
**Fix:** First Move state must sync with session progress. At 5 of 5 questions answered, First Move should advance to the next logical action.

---

### Item 3 — Freestyle: Redefine as Thought Partner Mode
**File:** OUTPUT_TYPES.md — FREESTYLE section
**Reason:** Current definition assumes a deliverable. Freestyle is being used as an open thinking session with Reed. The app forces an outline and output on sessions that don't need one. Freestyle must become a conversation-first mode where output is optional.

**Replace current FREESTYLE section with:**

**WHAT IT IS**
Open conversation with Reed. No format required. No deliverable assumed. You think out loud — Reed thinks with you.

**HOW REED GUIDES YOU**
Reed follows your lead. He asks questions, pushes back on weak premises, and reflects what he's hearing. He does not propose a structure or move toward production unless you ask. At a natural stopping point he asks one question: "Do you want to capture any of this?"

**FORMAT**
Whatever you need. If something worth keeping emerges, Reed helps you shape it. If nothing needs to be saved, the session is complete.

**DELIVERY**
On request only. No automatic outline. No forced next step. If you want an output, Reed will ask what form it should take — then produce it.

**NOT THE RIGHT FIT IF**
You already know what you're building. Pick the output type.

---

*(c) 2026 Mixed Grill, LLC*
