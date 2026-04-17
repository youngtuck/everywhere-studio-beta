# CO_024 | FIX: Reed Executes Instead of Responding at Draft Stage

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

User read the completed draft and asked a conversational question about citations -- whether the piece should reference its sources. Instead of responding to the question, Reed immediately triggered a generation action (Voice DNA loading, editing sequence). The user never got an answer.

---

## WHAT'S HAPPENING

At the Draft stage, the user types a question or comment into the input field. Reed interprets any input as an edit command and fires an action immediately -- loading Voice DNA, regenerating, editing -- without first responding to what the user actually said.

---

## WHY IT'S BROKEN

The user asked a question. They did not give a command.

"Should this cite where the information came from?" is not an instruction to add citations. It is a question about whether citations belong in this piece. It deserves a response -- Reed's view, a clarifying question, options -- before any action is taken.

When Reed skips the response and goes straight to execution, two things happen:

1. The user never gets the answer they asked for
2. Reed may execute the wrong action entirely -- producing an edited draft the user did not ask for

This breaks the conversational contract. EVERYWHERE Studio is not a command-line tool for the end user. It is a thought partner. Every question deserves a response before any action is taken.

---

## THE FIX

### Reed must respond before acting at the Draft stage.

When the user submits input at the Draft stage, Reed reads the intent before deciding what to do:

**If the input is a question:** Reed answers it. No action fires until the user confirms they want action taken.

**If the input is a clear edit command** ("tighten this," "cut the second paragraph," "make it shorter"): Reed can confirm and act.
> "Cutting to around 500 words and keeping the core argument. One moment."

**If the input is ambiguous** ("what about citations?" / "I'm not sure about the opening"): Reed responds conversationally and asks one clarifying question before acting.

---

### Example: The citations question

**User:** Should this cite where the information came from?

**Wrong (current behavior):** [Immediately triggers Voice DNA loading and editing sequence]

**Right:**
> "This piece references real regulatory developments -- the EU AI Act, NIST Risk Management Framework, California SB-1001. I can handle this a few ways: inline citations for credibility, a sources section at the end, or keep it clean and let the specificity do the work. The last option usually reads better on LinkedIn. What fits where this is going?"

Reed answered the question. Reed gave three options with a recommendation. Reed asked one question to confirm direction. No action fired until the user responds.

---

## THE RULE FOR TUCKER TO BUILD AGAINST

**At the Draft stage: question first, action second.**

If the user input ends in a question mark -- respond, don't act.
If the user input is ambiguous -- respond, don't act.
If the user input is a clear directive -- confirm briefly, then act.

The only inputs that should trigger immediate action are the editing buttons in the Inspector panel (Tighten this, Fix flagged lines, etc.) -- because those are explicit one-click commands, not conversational input.

Anything typed into the text input field at the Draft stage should go through Reed as a conversation first.

---

## WHAT TO TEST

1. At Draft stage, type a question into the input field
2. Confirm Reed responds conversationally -- no generation or editing fires
3. At Draft stage, type a clear edit command ("make this shorter")
4. Confirm Reed confirms briefly and then acts
5. Click an Inspector editing button (Tighten this, etc.)
6. Confirm editing fires immediately -- buttons are explicit commands, not conversation

---

## DEPENDENCY NOTE

This fix requires the Reed FOH prompt update (REED_FOH_PROMPT.md). Reed's behavior at the Draft stage must be defined in the system prompt, not just the UI logic. Tucker: confirm REED_FOH_PROMPT.md is delivered before building this item.

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_024 | April 13, 2026
