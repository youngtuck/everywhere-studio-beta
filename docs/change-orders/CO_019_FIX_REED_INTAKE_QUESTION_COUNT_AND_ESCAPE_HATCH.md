# CO_019 | FIX: Reed Intake Question Count and Escape Hatch Placement

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested as a new user moving from Watch signal into a Work session. After submitting the pre-filled prompt, Reed asks a follow-up question. The bottom of the screen shows "Question 2 of 5" and "Just write it →" in small text at the far right. Both elements are broken.

---

## FIX 1: Question Count Is Wrong

**What's happening:**
After the user submits their first input, the counter shows "Question 2 of 5."

**Why it's wrong:**
The user never experienced Question 1. The signal submission was counted as a question internally -- but the user felt it as their opening move, not as answering a question. Landing on "Question 2" with no memory of Question 1 makes the counter feel broken before it starts.

**Fix:**
Two options -- Tucker to confirm which is simpler:

**Option A (preferred):** Start the counter at "Question 1 of 4" after the user submits their initial input. The signal submission is not a question. The first question Reed asks is Question 1.

**Option B:** Remove the numeric counter entirely. Replace with a simple progress bar (no numbers) that fills as the session moves through intake toward draft. Less pressure, no confusion about the count.

---

## FIX 2: "Just Write It" Is Invisible

**What's happening:**
"Just write it →" appears as small, subdued text in the far right of the progress bar row -- opposite end of the screen from the input field and from where the user's eye is focused.

**Why it's wrong:**
This is the most important escape hatch in the intake flow. Users who feel trapped by questions will abandon. The exit ramp exists but cannot be found. A partner reviewing the product specifically asked "how long is this going to last?" -- meaning they never saw or trusted the skip option.

**Fix:**
Move "Just write it" to a position adjacent to the input field -- either:
- Directly above the input box as a subdued but readable link: `Skip questions -- just write it`
- Or as a secondary option inside/below the send button area

It must be in the same visual zone as the place the user is already looking. The far right of a progress bar is not that place.

**Also:** Rename the label. "Just write it →" is good instinct but reads slightly dismissive. Suggested alternatives:
- `Skip to draft`
- `Just write it` (keep, but move and make it readable)
- `Write it now`

Any of these work. The location fix matters more than the label.

---

## FIX 3: Reed Should Set the Contract at the Start

**What's happening:**
Reed asks questions without explaining why or how many, and without telling the user they can skip.

**Why it's wrong:**
The user feels like they've entered an unknown-length intake form with no exit. The questions are valuable -- they make the output sharper. But the user doesn't know that, and they don't know how long it lasts.

**Fix:**
Reed's first response after the initial signal submission should include a single orienting line before the first question:

> "A few quick questions will sharpen this. Or say 'write it' anytime and I'll go."

This one line:
- Sets expectation (a few questions, not endless)
- Confirms the output will be better for it
- Gives the user a verbal exit ramp they can use at any point
- Removes the feeling of being trapped

This should appear once, at the top of Reed's first intake response. Not repeated.

---

## WHAT TO TEST

1. Submit a Watch signal into Work -- confirm counter starts at Question 1 (not Question 2)
2. Confirm "Just write it" / "Skip to draft" is visible in the same visual zone as the input field
3. Confirm Reed's first response includes the orienting line before the first question
4. Test with a new user -- they should be able to find the skip option without hunting
5. Confirm saying "write it" mid-intake triggers draft generation immediately

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_019 | April 13, 2026
