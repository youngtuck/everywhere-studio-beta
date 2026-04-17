# CO033 — Voice Input Bugs and Missing UX

**Status:** OPEN
**Date Opened:** April 14, 2026
**Project:** EVERYWHERE Studio
**Assigned To:** Tucker Howard

---

## Context

Mark was testing the voice input feature in the FOH app. During testing with the mic active and minimal speech, the transcription field populated with repeated nonsense words and Russian text. The input area also jumped in size as voice state changed. Switching to Always On in Preferences had no apparent effect. The Voice preference section had no description to explain what either option does.

---

## Item 1: Whisper Hallucination on Silence

**Title:** Voice input transcribes gibberish when mic receives silence

**Environment:** FOH app — New Session input, voice input active

**Reproduction Steps:**
1. Open a new session
2. Activate voice input
3. Stay silent or speak quietly
4. Observe input field — it populates with repeated words ("you you you you") and/or foreign text ("Субтитры предоставил DimaTorzok")

**Expected Behavior:**
No transcription output when there is no speech. Input field stays empty.

**Fix:**
Add a silence detection gate before sending audio to Whisper. If audio energy is below a minimum threshold, do not send to Whisper. This is a known Whisper behavior — it hallucinates on silence using training data artifacts. The Russian text is a YouTube subtitle credit embedded in Whisper's training data and is a reliable signal that silence was sent.

---

## Item 2: Voice Input UI Jumps on State Change

**Title:** Input area resizes to accommodate RECORDING / TRANSCRIBING state labels

**Environment:** FOH app — New Session input, voice input active

**Reproduction Steps:**
1. Activate voice input
2. Observe the input area as it moves through idle, recording, and transcribing states
3. Layout shifts to accommodate the state label text

**Expected Behavior:**
Input area holds a fixed height at all times. State label (RECORDING, TRANSCRIBING) swaps in place within the reserved space — no layout reflow.

**Fix:**
Set a fixed min-height on the input container. State labels render within that reserved space. No resize on state change.

---

## Item 3: "Always On" Voice Mode Does Nothing

**Title:** Always On toggle in Voice preferences is non-functional

**Environment:** FOH app — Preferences page, Voice section

**Reproduction Steps:**
1. Navigate to My Studio > Preferences
2. Under Voice > Input method, select "Always on"
3. Return to a session
4. Observe — behavior is identical to Push to talk

**Expected Behavior:**
Always On activates a persistent mic mode — no button press required to begin speaking.

**Fix:**
Confirm whether Always On is built or design-only. If built, identify the wiring failure. If not yet built, mark the button as coming soon or remove it until it is ready.

---

## Item 4: Voice Preference Has No Description

**Title:** Voice input method preference has no explanatory copy

**Environment:** FOH app — Preferences page, Voice section

**Reproduction Steps:**
1. Navigate to My Studio > Preferences
2. Observe the Voice section — "Input method" label with two options, no explanation

**Expected Behavior:**
User understands what they are choosing between before they choose.

**Fix:**
Add a short description below "Input method." Suggested copy:

> Control how you speak to Reed. Push to talk activates the mic only while you hold the button. Always on keeps the mic open so you can speak naturally without pressing anything.

---

*(c) 2026 Mixed Grill, LLC*
*EVERYWHERE Studio™ v7.1*
