# CO_023 | FIX: Reed Generates Draft Without Establishing Channel or Audience

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested full flow from Watch signal through completed draft. Reed generated a full draft without ever asking where the piece is going, who it is for, or what it is supposed to make the reader do. The draft may be well-written and completely wrong for its purpose. The user has no way to know.

---

## WHAT'S MISSING

At no point in the intake flow did Reed ask:
- What format is this? (LinkedIn post, newsletter, internal memo, blog, email, presentation)
- Who specifically is reading it?
- What do you want them to do or believe after reading it?

These are not optional details. They determine everything:
- Length
- Tone
- Structure
- Level of assumed knowledge
- Call to action
- Opening hook strategy

A LinkedIn post for a CEO audience and an internal memo for a leadership team on the same topic are completely different pieces. Reed generated one without knowing which one was needed.

---

## WHY IT MATTERS

The user cannot evaluate the draft without knowing what it was built for. They may read it and think "this is good" -- but it could be calibrated for entirely the wrong channel. Trust erodes when the user realizes later the piece doesn't fit where they need it to go.

More critically: the user should never have to wonder "what did I just write?" That question should never arise.

---

## THE FIX

### Make channel and audience the first two intake questions. Always.

Before Reed asks anything else -- before angle, before argument, before audience detail -- Reed must establish:

**Question 1: Channel**
> "Where is this going? LinkedIn, newsletter, internal memo, email, something else?"

This is not optional. It is the first question in every Work session. No exceptions.

**Question 2: Audience**
> "Who specifically is reading this -- and what do they already believe about this topic before they start?"

The second half of that question matters. "CEOs" is not enough. "CEOs who just got handed an AI governance mandate and are looking for a framework" is actionable.

---

### These two questions gate the draft.

Reed cannot generate a draft without confirmed answers to both questions.

If the user says "just write it" before answering these two questions, Reed responds:
> "Two quick things first -- where is this going, and who's reading it? That changes the piece significantly."

This is the one exception to the "just write it" skip rule. Channel and audience are not skippable. Everything else in intake is optional. These two are not.

---

### Surface channel and audience confirmation before generating.

When the user clicks "Write Draft," the system should display a one-line confirmation above the generation progress:

> "Writing a [channel] for [audience summary]..."

Example:
> "Writing a LinkedIn post for executives navigating AI compliance..."

This confirms to the user that Reed knows what it is building. It also creates a natural correction point -- if the user sees the wrong channel or audience, they can stop and correct it before the draft generates.

---

## WHAT TO TEST

1. Start a new Work session from a Watch signal
2. Confirm Reed asks channel as the first question
3. Confirm Reed asks audience as the second question
4. Say "just write it" before answering -- confirm Reed holds on channel and audience before proceeding
5. Click "Write Draft" -- confirm confirmation line appears: "Writing a [channel] for [audience]..."
6. Confirm the generated draft is calibrated to the stated channel (length, tone, structure)

---

## DEPENDENCY NOTE

This fix requires coordination with the Reed FOH prompt update (REED_FOH_PROMPT.md). The channel and audience questions must be built into Reed's intake behavior, not just the UI flow. Tucker: confirm with Mark that REED_FOH_PROMPT.md is delivered before building this item.

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_023 | April 13, 2026
