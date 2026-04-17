# CO_029 | FIX: Review Stage Has Multiple UX and Behavior Failures

**Status:** Open
**Date:** April 13, 2026
**Target Build:** Alpha 3.x (next increment)
**Submitted by:** Mark Sylvester
**Prepared for:** Tucker Howard

---

## CONTEXT

User completed Draft stage and clicked "Finish and Review." The Review stage ("Where is this going?") contains nine distinct failures across UX, labeling, behavior, and error handling. Documented in order of severity.

---

## FAILURE 1: Quality Review Says Items Need Fixing But Shows Nothing

**What's happening:**
Page header reads: "Quality review finished. Address any items Reed flagged before you continue."
Below it: "Human Voice Test: review flagged lines if needed."

No flagged items are visible anywhere on the page.

**Why it's broken:**
The user is told to address items. There are no items to see. The instruction is real but the content is missing. The user cannot act on a flag they cannot find.

**Fix:**
If flags exist, they must be visible on this page -- listed explicitly with the flagged line, the reason it was flagged, and the proposed fix. If no flags exist, the message should say: "No flags. You're clear to continue." Not "address any items" when there are none.

---

## FAILURE 2: Font Size Inconsistency on Review Page

**What's happening:**
The page header ("Where is this going?") and the body instructions appear at inconsistent font sizes and weights. The quality review result lines feel visually unanchored.

**Fix:**
Audit the Review page typography for hierarchy consistency. Header, subhead, body, and instruction text should follow the established type scale. This is a visual polish item but it affects credibility at a critical decision point.

---

## FAILURE 3: "Tap to Select" Is Mobile Language on Desktop

**What's happening:**
The Reed recommendation box reads: "REED RECOMMENDS (TAP TO SELECT)"

**Fix:**
On desktop: "Click to select" or simply remove the instruction entirely -- a highlighted selectable card does not need an instruction label. On mobile: "Tap to select" is correct. Tucker to implement responsive copy for this label.

---

## FAILURE 4: "Start a Wrap with [Format]" Label Is Confusing

**What's happening:**
When the user selects a format, the call to action reads: "Start a Wrap with Essay" (or "Start a Wrap with Case Study").

A new user does not know what "Wrap" means. They also see "Case Study" as a suggested format when they did not write a case study -- they wrote an essay about AI governance.

**Two problems:**

**A -- "Wrap" needs one-line explanation on first use:**
> "Wrap formats and delivers your piece for the channel you choose."

One line. Just enough context. Then it can say "Start Wrap with Essay" and the user understands what they're starting.

**B -- Format suggestion must match the piece:**
If the user wrote a 476-word opinion piece on AI governance, Reed should not suggest "Case Study" as a format. Reed recommended "Essay" -- that is correct. Case Study appearing as a selectable option in the same visual tier without context makes the user think they wrote something they didn't.

Reed's recommendation should be visually dominant. Other options should be secondary -- available but not competing.

---

## FAILURE 5: User's Templates Are Not Visible

**What's happening:**
The format grid shows system-defined formats (Essay, Talk, Podcast, Video Script, Email, Presentation, etc.). The user's saved templates do not appear.

**Fix:**
Templates must appear in the format grid. Either as a separate section ("YOUR TEMPLATES") or inline with a "TEMPLATE" badge. Tucker to confirm where templates are stored and wire them into the Review format selection.

---

## FAILURE 6: "Let Reed Fix It" Appears at Review -- Should Have Been Draft

**What's happening:**
Reed's Take in the Inspector shows: "A few things to address: some AI-sounding language, a few lines that drift from your voice, some repeated ideas. Let Reed handle it, or go back and edit."

Button: "Let Reed fix it"

**Why it's wrong:**
This is the Review stage. The user is past the draft. Catching AI-sounding language, voice drift, and repeated ideas is Draft stage work -- specifically what the Quality Checkpoint and Inspector editing buttons are for.

Arriving at Review and being told the draft still has problems makes the Draft stage feel incomplete. It also forces the user to go back when they thought they were moving forward.

**Fix:**
These issues must be caught and surfaced during Draft, not Review. The Review stage should be for format selection and final confirmation -- not for discovering that the draft still needs work.

If issues genuinely remain at Review, the page should not say "Where is this going?" -- it should say "Draft needs attention" and route the user back to Draft with the specific flags visible. Do not let a user reach Review with an unresolved draft.

---

## FAILURE 7: "Check Could Not Finish. Retry." Has No Explanation

**What's happening:**
An error message appears: "Check could not finish. Try again." with a "Retry" button.

No explanation of what failed, why, or what the user should do differently.

**Fix:**
Error messages must tell the user what happened and what to do:
- What failed: "The voice match check didn't complete."
- Why (if known): "This sometimes happens with very short drafts."
- What to do: "Hit Retry -- it usually resolves in one attempt."

A bare "Try again" with no context is a dead end. The user has no information to act on.

---

## FAILURE 8: System Messages Disappear Before User Can Read Them

**What's happening:**
Reed produces a message (what was fixed, what the error was, what was changed). The message disappears. The user cannot reference it again.

**Fix:**
Any message Reed produces in the Inspector panel must persist until the user dismisses it or a new message replaces it. Auto-dismissing system messages destroys information the user needs. Nothing Reed says should vanish on its own.

---

## FAILURE 9: "What Needs Fixing?" Button Opens Reed Chat -- User Expects a List

**What's happening:**
Inspector First Move button reads: "What needs fixing?"

Clicking it sends the question to the Ask Reed chat input. The user expected a list of flagged items. Instead they triggered a conversation.

**Two problems:**

**A -- Label mismatch:** "What needs fixing?" implies the system will show you a list. If it is going to open a chat, the label should reflect that: "Ask Reed what to fix" or simply show the list directly without requiring a button click.

**B -- The answer should already be on the page:** If there are items to fix, they should be visible without the user having to ask. "What needs fixing?" as a button means the system knows but is hiding the information until asked. That is the wrong design. Surface the information. Do not make the user request it.

---

## PRIORITY ORDER FOR TUCKER

1. **Failure 1** -- Flagged items must be visible. Blocking.
2. **Failure 6** -- Draft issues must be caught in Draft, not Review. Workflow fix.
3. **Failure 7** -- Error messages need explanation. Trust issue.
4. **Failure 8** -- System messages must persist. Information loss issue.
5. **Failure 9** -- "What needs fixing?" must show a list, not open chat.
6. **Failure 4** -- Wrap label and format suggestion logic.
7. **Failure 5** -- Templates in format grid.
8. **Failure 3** -- "Tap to select" responsive copy.
9. **Failure 2** -- Typography consistency.

---

## VERSION NOTE

Increment build version on deployment per standard protocol.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™
CO_029 | April 13, 2026
