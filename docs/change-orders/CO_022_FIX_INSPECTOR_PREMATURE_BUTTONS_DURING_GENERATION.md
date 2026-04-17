# CO_022 | FIX: Inspector Shows Editing Buttons Before Draft Exists

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

User clicks "Write Draft." The center stage correctly shows a generation progress sequence. The Inspector panel incorrectly shows a full set of editing action buttons during generation -- before any draft content exists.

---

## WHAT'S HAPPENING

While the draft is generating, the Inspector panel displays:

**GENERATING**
Writing in your voice...

Then immediately below, a set of editing buttons:
- Fix the flagged lines
- Tighten the hook
- Tighten to 700
- Expand, add an example
- Check the voice match
- Cut 100 words without losing the point

**First Move button:** `Tighten this`

---

## WHY IT'S BROKEN

Every one of these buttons is an editing action. They require a draft to act on. There is no draft yet.

A new user seeing these buttons during generation will try to click them. When nothing happens -- or when the result is nonsensical -- the product feels broken. At minimum it is confusing. At worst it destroys trust before the draft even appears.

"Tighten this" as the First Move is the clearest symptom. There is nothing to tighten. The draft does not exist.

---

## THE FIX

### During generation (from "Write Draft" click until draft is fully rendered):

**Inspector panel shows one thing only:**

```
REED'S TAKE

Writing in your voice...
```

No buttons. No First Move. No editing actions. Just that line.

Optionally: Reed's Take can mirror the active generation step from the center stage progress indicator. Examples:
- "Loading your voice..."
- "Building the structure..."
- "Writing the first draft..."
- "Refining the language..."
- "Final polish..."

This keeps the Inspector alive and in sync without offering actions that cannot be taken.

---

### After draft is fully rendered:

All editing buttons appear. First Move activates. Inspector shows Reed's take on the completed draft.

This is the correct state for those buttons. They should not be visible one moment before the draft lands.

---

## WHAT TO KEEP -- DO NOT CHANGE

The center stage progress sequence is correct and should not be touched:

- Loading Voice DNA
- Building structure
- Writing first draft
- Refining language
- Final polish

This is transparent, reassuring, and tells the user exactly what is happening. Keep it exactly as is.

---

## WHAT TO TEST

1. Click "Write Draft" -- confirm Inspector shows only "Writing in your voice..." with no buttons
2. Confirm editing buttons are completely absent during generation
3. Confirm "Tighten this" First Move button does not appear until draft is rendered
4. After draft renders -- confirm all editing buttons appear correctly
5. Confirm center stage progress sequence is unchanged

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_022 | April 13, 2026
