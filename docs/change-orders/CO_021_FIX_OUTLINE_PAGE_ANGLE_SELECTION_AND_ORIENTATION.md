# CO_021 | FIX: Outline Page Angle Selection, Inspector Register, User Orientation

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested the Outline stage after completing intake. The outline content itself is strong. The presentation around it fails the user on four counts.

---

## FIX 1: Angle Cards Give No Basis for Choosing

**What's happening:**
Two angle cards appear at the top of the Outline stage:
- "Signal Through Noise" -- "Cuts through AI news overload to reveal regulatory signals that will impact operations in 2026."
- "Governance Gap Crisis" -- "Exposes the dangerous disconnect between rapid AI adoption and absent governance structures."

One is marked SELECTED. The user does not know when or how they selected it.

**Why it's broken:**
The descriptions are thin. A new user cannot tell from these two lines how the angles differ in terms of structure, audience impact, or strategic positioning. They don't know what they're choosing -- a tone? A completely different piece? A different conclusion?

And "SELECTED ✓" appeared without the user making a deliberate choice. The system auto-selected. The user didn't experience a decision.

**Fix:**

Two parts:

**A -- Make the selection explicit.** If the system auto-selects an angle, Reed should say so and why:
> "I went with Signal Through Noise -- it fits the operational urgency angle you built in intake. The other option repositions the piece around governance failure, which is a harder sell but a sharper provocation. Want to see that version instead?"

**B -- Make the choice meaningful, not mysterious.** Each angle card should include one line that tells the user what changes if they pick it:
- "Signal Through Noise" → `Positions you as the guide. Practical, operational tone.`
- "Governance Gap Crisis" → `Positions you as the provocateur. Higher risk, higher reward.`

One line. That's enough. The user can decide.

---

## FIX 2: Inspector "Does the Structure Hold?" Is the Wrong Register

**What's happening:**
The Inspector panel shows:
- Reed's Take: "SELECTED OUTPUTS -- You pick channel formats after Review when you start Wrap."
- First Move button: `Does the structure hold?`

**Why it's wrong:**
Reed is asking the user to evaluate their own outline. That is the opposite of a thought partner. Reed built the outline. Reed should have a view on whether it holds.

**Fix:**
Replace "Does the structure hold?" with Reed's actual assessment. One declarative sentence, then one optional redirect.

Example:
> "Structure is solid. Stakes section is the strongest -- that's where the reader decides to act. If you want to punch it up before drafting, that's the place. Otherwise, ready to write."

If the structure has a weakness, Reed should name it:
> "The Close lands soft. 'Change management starts with knowing what you're governing' is true but doesn't move anyone. Want me to sharpen it before we draft?"

Reed has a view. Reed states it. The user can agree, push back, or proceed.

---

## FIX 3: No Clear Primary Action on the Page

**What's happening:**
The user arrives at the Outline stage and sees: two angle cards, a full outline, an Inspector panel, a "Write Draft →" button, and a bottom input field that says "Ask Reed to restructure, or click a section label to compare angles..."

There is no clear hierarchy of what to do first.

**Why it's wrong:**
The user does not know: Should I pick the other angle? Should I review the outline? Should I edit sections? Should I just hit Write Draft? The page presents all options as equal.

**Fix:**
Reed should orient the user with one line at the top of the outline -- above the angle cards, before any content:

> "Here's your outline. I've selected the stronger angle. Review the structure, make any changes, then hit Write Draft."

Three sentences. The user knows what Reed did, what to look at, and what to do next. Every other option on the page becomes secondary to that path.

---

## FIX 4: Ask Reed Dead Input -- Confirmed Again

**What's happening:**
The user typed "how do i ask the advisors or can you advise me" in the Ask Reed input. No response. The question is visible in the panel. Nothing happened.

**Why it matters here specifically:**
This is the outline stage. The user is looking at a structure they didn't write and trying to evaluate it. They want strategic input. They asked for it directly. They got silence.

This is the exact moment the product should prove its value -- and it went dark.

This is already in CO_020 Part 1 as a broken build. Flagging here as a second confirmation. Priority escalated. This must be fixed before any further alpha testing with external users.

---

## PRIORITY ORDER FOR TUCKER

1. **Fix 4** -- Dead Ask Reed input. Already in CO_020, now confirmed critical. Fix first.
2. **Fix 3** -- Reed orientation line at top of outline. One line of copy, one placement change. High impact, low build cost.
3. **Fix 1** -- Angle card selection logic and copy. Medium build.
4. **Fix 2** -- Inspector register change. Requires updated Reed prompt from Mark (see CO_020 Part 2 dependency).

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_021 | April 13, 2026
