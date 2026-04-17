# CO034 — Preferences Scroll, Brand DNA Page, and Opening Copy

**Status:** OPEN
**Date Opened:** April 14, 2026
**Project:** EVERYWHERE Studio
**Assigned To:** Tucker Howard

---

## Context

Mark was navigating the Preferences page and the Brand DNA section of the FOH app. The Preferences page cuts off before the bottom — content below the Voice section is not reachable. Clicking Brand DNA from Preferences opens a dark page that does not match the current light mode, loads scrolled past the top, and cannot be scrolled to the bottom — trapping the input field and the extracted brand profile content off-screen. The progress bar on Brand DNA appears complete despite no work having been done. The opening copy does not read as a product onboarding moment.

---

## Item 1: Preferences Page Does Not Scroll to Bottom

**Title:** Preferences page content is cut off — cannot reach bottom

**Environment:** FOH app — My Studio > Preferences

**Reproduction Steps:**
1. Navigate to My Studio > Preferences
2. Scroll down
3. Page stops before bottom content is visible

**Expected Behavior:**
Full Preferences page is scrollable. All sections reachable.

**Fix:**
Remove any overflow:hidden or fixed-height constraint on the Preferences container. Ensure the page scrolls naturally to its full content height.

---

## Item 2: No Navigation Between DNA Settings

**Title:** No way to move between Voice DNA, Brand DNA, and Composer memory from within the page

**Environment:** FOH app — Preferences page, DNA section

**Reproduction Steps:**
1. Navigate to My Studio > Preferences
2. Click VoiceDNA — opens Voice DNA page
3. No visible navigation to Brand DNA or Composer memory from that page

**Expected Behavior:**
DNA settings are navigable as a group. Tab or nav control lets user move between Voice DNA, Brand DNA, and Composer memory without leaving and returning to Preferences.

**Fix:**
Add a sub-navigation bar at the top of the DNA pages — three tabs: Voice DNA, Brand DNA, Composer memory. Active state highlights current tab.

---

## Item 3: Brand DNA Page Renders in Dark Mode Regardless of User Mode

**Title:** Brand DNA page is dark even when app is in light mode

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Confirm app is in light mode
2. Navigate to Brand DNA
3. Page renders with dark background

**Expected Behavior:**
Brand DNA page matches the active theme. Light mode = light page.

**Fix:**
Brand DNA page is not inheriting the active theme. Audit the page component — it may have a hardcoded dark background. Replace with theme-aware background variable.

---

## Item 4: Brand DNA Page Loads Scrolled Past the Top

**Title:** Brand DNA page entry point is mid-page — top content is above the viewport

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Navigate to Brand DNA
2. Page loads with content already scrolled down
3. Must scroll up to find the beginning

**Expected Behavior:**
Page always loads at the top.

**Fix:**
On route entry, scroll to top (window.scrollTo(0,0) or equivalent). This should be a global route behavior, not page-specific.

---

## Item 5: Brand DNA Page Cannot Be Scrolled to Bottom

**Title:** Brand DNA page content is clipped — input field and lower content unreachable

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Navigate to Brand DNA
2. Attempt to scroll to the bottom
3. Page stops before the input field and full extracted content are visible

**Expected Behavior:**
Entire Brand DNA page is scrollable. Input field and all extracted profile content are reachable.

**Fix:**
Same root cause as Item 1 — overflow constraint or fixed height on the page container. Remove it. The extracted brand profile content is there and Mark wants to read it.

---

## Item 6: Brand DNA Progress Bar Shows Complete on Empty Profile

**Title:** Progress bar appears fully complete before any Brand DNA work has been done

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Navigate to Brand DNA
2. Observe progress bar — shows as complete or near-complete
3. No Brand DNA interview or setup has been completed

**Expected Behavior:**
Progress bar reflects actual completion state. Empty profile = empty or minimal bar.

**Fix:**
Progress bar is rendering a non-zero placeholder value instead of actual profile completion data. Wire it to real completion state. If no data exists, bar starts at zero.

---

## Item 7: Brand DNA Input Field Exists But Is Trapped Off-Screen

**Title:** "Tell Reed what you're building" input field is present but unreachable due to scroll bug

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Navigate to Brand DNA
2. Attempt to scroll to bottom
3. Input field placeholder "Tell Reed what you're building..." is visible only partially at the very bottom edge — not usable

**Expected Behavior:**
Input field is fully visible and interactive as part of the normal page flow.

**Fix:**
Resolved by fixing Item 5 (scroll constraint). Confirm input is fully visible and functional once scroll is unblocked.

---

## Item 8: Brand DNA Opening Copy Doesn't Work as Product UX

**Title:** Brand DNA onboarding prompt reads as abstract — not grounded as a product interaction

**Environment:** FOH app — Brand DNA page

**Current copy:**
"Before we do anything else, tell me a little about what you are building. Not the features or the deliverables. The thing underneath that. What does this exist to do in the world?"

**Problem:**
Copy made sense in a session context. On a settings/setup page it reads like a therapy prompt. Users don't know what kind of answer is expected, what Reed will do with it, or why it matters here.

**Expected Behavior:**
Opening copy orients the user: what this is, what Reed needs, what happens next.

**Suggested replacement:**
> Reed uses your brand context to write in your voice and stay aligned with your positioning. Start by describing what you do and who it's for — a sentence or two is enough to get started.

**Fix:**
Replace current copy with revised version above, or equivalent that grounds the interaction as purposeful setup rather than open-ended reflection.

---

## Item 9: Back Button Fires Wrong Dialog — References VoiceDNA from Brand DNA

**Title:** Leaving Brand DNA via Back triggers a "cancel VoiceDNA" warning

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Navigate to Brand DNA
2. Click the Back button
3. System fires a dialog warning that going back will cancel the VoiceDNA process

**Expected Behavior:**
If a warning is needed, it references Brand DNA — not VoiceDNA. Ideally, a Back button from a settings/setup page does not require a destructive-action warning at all unless there is unsaved input.

**Fix:**
Two things: (1) The dialog is wired to the wrong context — swap VoiceDNA reference for Brand DNA. (2) Audit whether a warning dialog is appropriate here. If no data has been entered, Back should navigate silently.

---

## Item 10: Back Button Present on Brand DNA — Navigation Model Needs Review

**Title:** Brand DNA uses a Back button rather than integrated navigation

**Environment:** FOH app — Brand DNA page

**Reproduction Steps:**
1. Navigate to Brand DNA from Preferences
2. Only exit is a Back arrow in the top left

**Expected Behavior:**
Consistent with Item 2 (sub-navigation between DNA settings) — once the DNA tab nav is in place, the standalone Back button becomes redundant and can be removed or demoted.

**Fix:**
Resolve after Item 2 is built. Once DNA pages have tab navigation, Back button should either be removed or reserved only for exiting the DNA section entirely back to Preferences.

---

*(c) 2026 Mixed Grill, LLC*
*EVERYWHERE Studio™ v7.1*
