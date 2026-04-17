# CO_026 | FIX: Inspector Editing Buttons Apply Changes Silently Without Preview

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

User clicked "Tighten this" in the Inspector panel. The draft changed silently. No indication of what was removed. No confirmation requested. No before/after shown. User clicked it repeatedly because there was no feedback that anything had happened. Draft went from 476 words to 305 words -- 395 words below target -- without the user understanding what was removed or approving any of it.

---

## WHAT'S HAPPENING

Every Inspector editing button (Tighten this, Fix the flagged lines, Tighten the hook, Tighten to 700, Expand add an example, Check the voice match, Cut 100 words) applies changes to the draft immediately and silently when clicked.

No preview. No explanation. No confirmation. The draft just changes.

---

## WHY IT'S BROKEN

**The user loses control of their own work.**

A thought partner does not silently rewrite your draft. A thought partner shows you what they would change and why, then asks if you agree.

The current behavior treats the draft like a disposable document that the system owns. The user owns the draft. Reed advises. The user decides.

**Silent edits create compounding damage.**
Because there is no feedback on what changed, the user cannot tell if the button fired. They click again. And again. Each click silently removes more content. By the time the user realizes what happened, the draft has been gutted and there is no clear path to recovery. This is exactly what happened in testing -- 476 words became 305 words across multiple silent clicks.

---

## THE FIX

### Every Inspector editing button must show Reed's proposed change before applying it.

**The flow for every editing button:**

1. User clicks button (e.g., "Tighten this")
2. Reed responds in the Inspector panel -- does not touch the draft yet
3. Reed shows:
   - What he proposes to change (specific lines or sections, not a vague summary)
   - Why (one sentence)
   - The word count impact (e.g., "This takes you from 476 to approximately 420 words")
4. Two buttons appear: `Apply` and `Skip`
5. User clicks Apply → change is made to draft
6. User clicks Skip → draft is unchanged, Reed acknowledges and moves on

**Example:**

User clicks "Tighten this"

Reed responds in Inspector:
> "The second paragraph is doing double duty -- it makes the same point as the first but less sharply. I'd cut it entirely. Takes you from 476 to around 430 words and the argument actually tightens.
>
> [Apply] [Skip]"

The draft does not change until the user clicks Apply.

---

### The draft must be visually stable during this flow.

When Reed is showing a proposed change, the draft in the center stage should either:
- Highlight the affected section (preferred) so the user can see exactly what Reed is proposing to remove or change
- Or remain unchanged with a clear visual indicator that a proposed edit is pending

Do not grey out the draft or make it non-readable during this flow. The user needs to be able to read the affected section while Reed is describing the change.

---

### Version control: every applied change creates a version.

When the user clicks Apply, the current draft is saved as the previous version before the change is applied. "Version 1," "Version 2" tabs at the top of the stage should reflect this. Confirm the existing version tab system is wired to this -- each applied edit should increment the version so the user can return to any prior state.

---

### Button state during proposed edit flow.

When Reed has a proposed change pending (waiting for Apply or Skip), all other Inspector editing buttons should be disabled. One proposed edit at a time. The user resolves the current proposal before a new one can be initiated.

---

## WHAT TO TEST

1. Click "Tighten this" -- confirm draft does NOT change immediately
2. Confirm Reed response appears in Inspector with specific proposed change, reason, and word count impact
3. Confirm Apply and Skip buttons appear
4. Click Apply -- confirm draft updates and new version is created
5. Click Skip -- confirm draft is unchanged
6. Click "Tighten this" multiple times rapidly -- confirm only one proposal is active; subsequent clicks ignored until current proposal resolved
7. Confirm affected section is highlighted in draft during proposal review

---

## DEPENDENCY NOTE

This fix requires the Reed FOH prompt update (REED_FOH_PROMPT.md). Reed's proposed change responses must be built into Reed's behavior, not just the UI logic. Tucker: confirm REED_FOH_PROMPT.md is delivered before building this item.

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_026 | April 13, 2026
