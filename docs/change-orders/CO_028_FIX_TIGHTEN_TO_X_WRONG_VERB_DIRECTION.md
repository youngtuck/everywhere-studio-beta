# CO_028 | FIX: "Tighten to X" Uses Wrong Verb When Target Exceeds Current Word Count

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## RELATED CO

See also CO_025 (Inspector buttons context-unaware). This CO addresses the specific labeling and verb direction failure.

---

## WHAT'S HAPPENING

User set target word count to 1200. Draft is 305 words. Inspector shows button: **"Tighten to 1200."**

The system correctly read the updated target (1200) and updated the button label. That part works.

The verb is wrong.

"Tighten" means make shorter. The draft is 305 words. The target is 1200 words. To reach 1200 from 305, you must expand -- not tighten. Clicking "Tighten to 1200" on a 305-word draft would produce an absurd result, make the draft shorter, and take it further from the target.

---

## THE RULE

The button verb must always reflect the actual direction of the required change.

| Condition | Correct button label |
|---|---|
| Current words < target | `Expand to [X] words` |
| Current words > target | `Tighten to [X] words` |
| Current words = target (within 50) | Hide this button entirely -- no adjustment needed |

"Tighten" and "Expand" are directional words. They must always point in the correct direction. The system already knows the current word count and the target. It must use that information to select the correct verb.

---

## ADDITIONAL LABELING ISSUE: "Tighten this" FIRST MOVE

The same problem applies to the First Move button.

"Tighten this" is hardcoded as the First Move label regardless of draft state. When the draft is below target, "Tighten this" is the wrong instruction entirely.

First Move label must also be directionally accurate:
- Draft below target → `Expand this`
- Draft above target → `Tighten this`
- Draft at target, flags present → `Fix the flagged lines`
- Draft at target, no flags → `Check the voice match`

See CO_025 for full First Move logic.

---

## WHAT TO TEST

1. Set target to 1200, draft at 305 words -- confirm button reads "Expand to 1200 words" not "Tighten to 1200"
2. Set target to 400, draft at 600 words -- confirm button reads "Tighten to 400 words"
3. Draft within 50 words of target -- confirm word count adjustment button is hidden
4. Confirm First Move label is directionally accurate in all three states (below target, above target, at target)

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_028 | April 13, 2026
