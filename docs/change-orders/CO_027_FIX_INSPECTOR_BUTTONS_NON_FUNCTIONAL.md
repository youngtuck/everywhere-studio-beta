# CO_027 | FIX: Multiple Inspector Editing Buttons Are Non-Functional

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested all Inspector editing buttons at the Draft stage. Multiple buttons are completely non-functional. Clicking them produces no response, no action, no feedback of any kind.

---

## BUTTONS CONFIRMED NON-FUNCTIONAL

- Fix the flagged lines
- Tighten the hook
- Check the voice match

Status of remaining buttons (Tighten to 700, Expand add an example, Cut 100 words) -- unconfirmed. Tucker to audit all Inspector buttons and document which are wired and which are not.

---

## WHY IT MATTERS

A button that does nothing is worse than no button at all. It looks like a broken product. A new user clicks it, nothing happens, and they conclude the platform does not work. Trust is gone before the draft is finished.

These buttons are visible on every draft session. Every user will click them. Every user will experience the same failure.

---

## THE FIX

**Immediate:** Every non-functional button must be either wired or hidden. There is no third option. A button that cannot be clicked to any effect must not be visible.

**Priority order:**
1. Audit all Inspector editing buttons -- document which are wired and which are not
2. Hide all non-functional buttons immediately (do not wait for full implementation)
3. Implement buttons in order of user impact:
   - Check the voice match (high value -- confirms the piece sounds like the user)
   - Tighten the hook (high frequency use)
   - Fix the flagged lines (only relevant when flags exist -- see CO_025)

**Note:** Implementation of these buttons must follow the propose-before-apply flow defined in CO_026. Do not wire these buttons to silent edits. Wire them to Reed's review-and-confirm flow.

---

## WHAT TO TEST

1. Audit every Inspector button -- document wired vs. unwired
2. Confirm no non-functional button is visible to the user
3. For each wired button -- confirm it follows the CO_026 propose-before-apply flow
4. Confirm "Fix the flagged lines" only appears when flags are actually present (CO_025)

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_027 | April 13, 2026
