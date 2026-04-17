# CO_017 | FIX: Work Page Nav and Inspector Trigger

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested as a new user entering a fresh Work session. Three fixes required. All are navigation and trigger issues -- not new features.

---

## FIX 1: Wrong Icon for Inspector Trigger

**What's happening:**
A hamburger icon (three horizontal lines) sits in the far right of the stage. Clicking it opens the Inspector panel (Reed's Take / First Move / Ask Reed).

**Why it's wrong:**
A hamburger icon universally means "navigation menu." A new user clicking it expects more nav options -- not an AI advisor panel. This is a discovery failure. The icon is lying about what it does.

**Fix:**
Replace the hamburger with an icon that signals "advisor" or "AI assistant." Options in priority order:
- A chat bubble with a spark or star (signals AI conversation)
- A single person silhouette with a spark (signals advisor)
- Reed's initials in a small pill/avatar (consistent with how Reed appears elsewhere in the panel)

Do not use: hamburger, grid, settings gear, or any icon that implies navigation or configuration.

**Label:** Add a small text label below or beside the icon: `Reed` -- so a new user knows exactly what they're opening.

---

## FIX 2: Inspector Should Not Open Empty

**What's happening:**
When a user opens the Inspector from a fresh Work session with no Watch briefing run, the panel shows:

> "Run a briefing in Watch to get Reed's take on what matters this week."

Then a gold "First Move" button that says: `Who is the audience?`

**Why it's wrong:**
The panel is open but has nothing to offer. The system is admitting it's empty. The gold button asks a Reed intake question -- which is the wrong register entirely for a "First Move." It feels like a form prompt, not an advisor recommendation.

**Fix:**
Two options -- Tucker to confirm which is simpler to implement:

**Option A (preferred):** Do not allow the Inspector to open if there is no Watch briefing data. The icon should be visually dimmed/disabled with a tooltip on hover: `Run Watch first to activate Reed's briefing.`

**Option B:** If the panel must be openable in this state, replace the current empty state content with a single clean message from Reed:

> "I don't have a briefing yet. Head to Watch, run your sources, and I'll have a take ready for you here."

Remove the gold "First Move" button entirely in the empty state. There is no first move if there is no data.

---

## FIX 3: Top Bar Has Three Navigation Systems in One Line

**What's happening:**
The top bar of the Work stage contains:
- Breadcrumb: `My Studio / New session`
- Action button: `+ New Session` (gold, prominent)
- Progress stepper: `Intake > Outline > Draft > Review`

All three are in the same horizontal bar. They are doing three different jobs and fighting for the same space.

Additionally, the progress stepper shows workflow stages (Intake / Outline / Draft / Review) before any workflow has started -- it reads as noise on a blank session.

**Fix:**
- Keep the breadcrumb: `My Studio / New session` -- this is correct orientation
- Move `+ New Session` to a consistent location (top right of the stage, or inline with breadcrumb right-aligned) -- it should not interrupt the breadcrumb line
- Hide the progress stepper (Intake / Outline / Draft / Review) until the user has submitted their first input and a session is actively in progress. On a blank new session, it adds no information and implies a workflow the user has not yet started.

---

## WHAT TO TEST

1. Open a fresh Work session as a new user
2. Confirm hamburger icon is replaced with Reed-labeled advisor icon
3. Confirm Inspector does not open (or shows correct empty state per Option A or B above) when no Watch briefing has been run
4. Confirm gold "Who is the audience?" button is gone from empty Inspector state
5. Confirm top bar shows breadcrumb only on blank session -- no progress stepper until first input submitted
6. Confirm `+ New Session` button is not interrupting the breadcrumb line

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_017 | April 13, 2026
