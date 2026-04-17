# CO_020 | FIX: Reed FOH Behavior, Dead Ask Reed Input, Static Placeholder

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

Tested a full Work session from Watch signal through intake. Three failures identified. One is a broken build (Part 1). Two are behavior and UX spec issues that require both a BOH prompt update and a FOH build change (Parts 2 and 3).

---

## PART 1 — BROKEN BUILD: Ask Reed Panel Input Does Nothing

**What's happening:**
The Ask Reed panel (right side, lower section) has a text input field: "Ask Reed about your current session..." The user types in it and submits. Nothing happens. No response. No acknowledgment. Dead input.

**Why it's broken:**
The input field is not connected to the session context. It accepts text but does not fire.

**Fix:**
Connect the Ask Reed input to the active session. Any message submitted in Ask Reed should:
- Have full context of the current session (signal source, questions answered, where the user is in the intake flow)
- Return a Reed response in the panel
- Not interrupt or replace the main stage conversation

This is a wiring fix. The input exists. It needs to work.

---

## PART 2 — BEHAVIOR SPEC: Reed Must Infer, Not Just Ask

**What's happening:**
Reed in FOH is behaving as a question-gatherer. He asks one clarifying question at a time, waits for the user's answer, then asks another. The user drives. Reed follows.

**Why it's wrong:**
The user we are building for is a CEO or senior thought leader. They are not coming to EVERYWHERE to answer a questionnaire. They are coming because they need a partner who is smarter than the room -- someone who already knows what they're trying to do and is three steps ahead.

Reed in BOH does this. Reed in FOH does not.

**What Reed should do in FOH:**
Reed should always know three things at every moment in a session:
1. Where the user is right now
2. What they are trying to accomplish
3. What the smartest next move is

Reed surfaces all three without being asked.

**Concrete example:**
Current FOH behavior:
> "Who specifically needs to hear this most?"

What Reed should do instead:
> "The real audience here is the CTO who just got handed an AI governance mandate with no budget and no framework. That's who this lands with. Does that match what you're seeing, or is the pressure coming from a different direction?"

Reed brings the answer, then invites the user to confirm, challenge, or redirect. The user should never feel like they are being interviewed. They should feel like they are being understood.

**The Advisors:**
In BOH, the Advisors panel brings strategic perspective from multiple angles. In FOH, that capability is completely invisible. Reed should surface strategic perspective as part of his natural response -- not as a panel the user has to invoke. The user should never need to know the word "Advisors" to get strategic depth.

When a user is working on a piece, Reed should be thinking: What's the strategic angle here? What would a Category Design expert say? What's the market reality? Reed weaves that in, attributed simply as his own take.

**This is a BOH change.** Tucker: this item requires a Reed FOH system prompt update from Mark before you build. Flag this as a prompt dependency. Do not ship the FOH behavior change without the updated Reed prompt.

---

## PART 3 — UX FIX: Input Placeholder Must Reflect Reed's Active Question

**What's happening:**
The main stage input field always shows: "What's on your mind?"

This is the right placeholder for a blank session start. It is the wrong placeholder at every other point in the session.

**Why it's wrong:**
When Reed has just asked a specific question -- "What's the first concrete action they take Monday morning?" -- the input box still says "What's on your mind?" The placeholder is disconnected from the conversation. It makes the interface feel generic at exactly the moment it should feel personal and responsive.

**Fix:**
The input placeholder should be dynamic. It should reflect the last question Reed asked.

**Logic:**
- Session start (no active question): `What's on your mind?` -- correct, keep
- After Reed asks a question: placeholder updates to a shortened version of that question, or a response prompt

**Examples:**
- Reed asks "Who specifically needs to hear this most?" → placeholder becomes: `Who's the audience...`
- Reed asks "What's the first concrete action they take Monday morning?" → placeholder becomes: `What's their first move...`
- Reed says "Ready to make an outline" → placeholder becomes: `Any changes before I build this...`

This is a small build change with a significant impact on how intelligent the product feels. The input box is where the user's eye lives. It should always be in sync with the conversation.

---

## PRIORITY ORDER FOR TUCKER

1. **Part 1** -- Fix the dead Ask Reed input. This is broken and blocks testing.
2. **Part 3** -- Dynamic placeholder. Small build, high impact.
3. **Part 2** -- Reed FOH behavior. Requires updated BOH prompt from Mark first. Do not build until prompt is delivered.

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_020 | April 13, 2026
