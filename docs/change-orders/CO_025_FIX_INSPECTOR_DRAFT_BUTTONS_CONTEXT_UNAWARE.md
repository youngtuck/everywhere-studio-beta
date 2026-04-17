# CO_025 | FIX: Inspector Draft Panel Buttons Are Static and Context-Unaware

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

User is at Draft stage. Draft is 476 words. Target is 700 words (default). Draft is 224 words short of target. The Inspector panel displays a set of editing buttons that are hardcoded -- they do not reflect the actual state of the draft.

---

## WHAT'S BROKEN

Every button in the Inspector panel is wrong or irrelevant for this draft in this state.

| Button shown | What's wrong |
|---|---|
| Fix the flagged lines | No flags detected. Button should not be visible. |
| Tighten the hook | May be valid -- but shown with no evidence the hook is weak |
| Tighten to 700 | Draft is 476 words. Tightening moves it further from 700, not toward it. Wrong direction. |
| Expand, add an example | This is actually the right action -- but it is buried as a secondary button, not the First Move |
| Check the voice match | May be valid, but not context-driven |
| Cut 100 words without losing the point | Would take draft from 476 to ~376. Further from target. Wrong direction. |
| **First Move: Tighten this** | Draft is 224 words short. Tightening is the wrong first move. |

The system says "Reed has reviewed your draft." But Reed's recommendations do not reflect what is actually true about this draft. That is a credibility failure. If Reed reviewed it, Reed should know it is short.

---

## THE FIX

### Inspector buttons must be context-aware.

The panel reads the draft state before displaying any buttons. Draft state includes:
- Word count vs. target (over, under, at target)
- Flags (present or absent)
- Voice match status (run or not yet run)

**Rules by state:**

**If word count is below target:**
- Show: `Expand to [target] words`
- Show: `Add an example or evidence`
- Hide: `Tighten to [target]` -- wrong direction
- Hide: `Cut [X] words` -- wrong direction
- First Move: `Expand to reach target`

**If word count is above target:**
- Show: `Tighten to [target] words`
- Show: `Cut [X] words without losing the point`
- Hide: `Expand` -- wrong direction
- First Move: `Tighten to target`

**If word count is at or near target (within 50 words):**
- Hide word count adjustment buttons
- Show: `Check the voice match`
- Show: `Tighten the hook` (if hook quality is flagged or unknown)
- First Move: `Check the voice match`

**If no flags detected:**
- Hide: `Fix the flagged lines` entirely
- Do not show a button for an action that has no target

**If flags are present:**
- Show: `Fix the flagged lines`
- First Move: `Fix the flagged lines` (flags take priority over everything else)

---

### First Move must always be correct.

First Move is Reed's recommendation for the single best next action. It must reflect the actual state of the draft -- never a hardcoded default.

The logic is simple:
1. Flags present? First Move = Fix the flagged lines
2. Word count significantly below target? First Move = Expand to reach target
3. Word count significantly above target? First Move = Tighten to target
4. Word count near target, no flags? First Move = Check the voice match

---

### Reed's Take must reflect what Reed actually found.

"Reed has reviewed your draft" is a trust signal. It only works if the recommendations that follow are accurate. If Reed reviewed a 476-word draft against a 700-word target, Reed's Take should say:

> "Draft is solid but 224 words short of target. The argument is there -- it needs more evidence or a stronger example in the middle section to reach the right length and weight."

Not a generic set of buttons that could apply to any draft in any state.

---

## WHAT TO TEST

1. Draft at 476 words, target 700 -- confirm "Tighten to 700" and "Cut words" buttons are hidden
2. Confirm "Expand to 700" or "Expand, add an example" is the First Move
3. Draft with no flags -- confirm "Fix the flagged lines" button is not visible
4. Draft with flags -- confirm "Fix the flagged lines" is the First Move
5. Draft at or near target, no flags -- confirm First Move is "Check the voice match"
6. Confirm Reed's Take text reflects actual draft state, not a generic message

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_025 | April 13, 2026
