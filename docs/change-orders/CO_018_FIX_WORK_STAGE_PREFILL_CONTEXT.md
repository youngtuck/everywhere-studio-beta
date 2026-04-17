# CO_018 | FIX: Work Stage Pre-Fill Has No Context for New User

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested as a new user selecting a Watch signal and landing on the Work stage. The system pre-fills the input box with the signal content and a suggested prompt. The behavior is correct. The presentation is broken.

---

## WHAT'S HAPPENING

When a user clicks "Use this" on a Watch signal, the Work stage opens with the input box pre-filled:

> From my Watch briefing:
>
> 4 Trends in AI Governance for 2026
>
> Identifies critical governance trends including shadow AI regulation, technical audit expectations, and emerging compliance requirements that organizations must prepare for
>
> Help me turn this into a sharp piece.

No explanation. No instruction. No indication that Reed did this or why.

---

## WHY IT'S BROKEN

**The pre-fill is silent.** The content just appears. A new user does not know:
- That Reed pulled this from their Watch briefing
- That the text in the box is ready to send
- That pressing the send button is the correct next action

**The suggested prompt reads like a placeholder.** "Help me turn this into a sharp piece." looks like example text the user is supposed to replace -- not a ready-to-fire instruction. A new user will hesitate, edit, second-guess, or abandon.

The system did something smart. It never told the user.

---

## THE FIX

Add a single line from Reed above the pre-filled input box. Not inside the box -- above it, as a Reed attribution line.

**Format:** Small, subdued text. Reed's name or avatar, then the message. Same visual treatment as Reed's responses elsewhere in the UI.

**Content:**
> Reed: I pulled your top signal from Watch. Ready to build -- just hit send.

This one line does four things:
1. Tells the user Reed did this (not a glitch, not a placeholder)
2. Confirms the content came from Watch (connects the two stages)
3. Tells the user the prompt is ready (not placeholder text to replace)
4. Gives a clear next action (hit send)

---

## WHAT NOT TO DO

- Do not add a tooltip -- it requires hover and discovery
- Do not change the pre-fill content -- it is correct
- Do not add a button or extra step -- the path is already right, it just needs one line of context
- Do not use generic system language ("Your Watch signal has been loaded") -- this should sound like Reed, not a status message

---

## WHAT TO TEST

1. Click "Use this" on any Watch signal
2. Confirm Reed attribution line appears above the input box
3. Confirm line reads naturally and is visually distinct from the input content
4. Confirm new user can read the line and immediately understand: Reed did this, it came from Watch, hit send
5. Test with a user who has never seen the product -- they should not pause or hesitate at this screen

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_018 | April 13, 2026
