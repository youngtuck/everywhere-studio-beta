# TIER 2 CHANGE ORDERS — INSTALL SUMMARY

**Date applied:** April 16, 2026
**Installer:** Tucker Dane Howard (contractor, lead designer)
**Target app version at start:** Beta 1.07 / 1.0.7
**Target app version after Tier 2:** Beta 1.10 / 1.0.10
**Reed FOH version in effect:** v7.2

Tier 2 covered five change orders plus one constants patch. Each CO lives on its own branch, carries one atomic commit, and bumps version by 0.01. Branches stack cumulatively on the prior CO so the diffs accumulate top to bottom but the commits stay scoped.

---

## CO_023: Channel + Audience Gate Before Reed Generates

**Branch:** `co-023-intake-channel-audience`
**Commit:** `6dffa17`
**Version bump:** 1.07 → 1.08 (app), 1.0.7 → 1.0.8 (package)

Reed refuses to advance past Intake until the user has set both a channel (LinkedIn, newsletter, email, memo, etc.) and an audience. The Inspector and the Work session share one structured-intake parser so the two surfaces cannot disagree about whether intake is ready.

Files touched:
- src/pages/studio/WorkSession.tsx
- src/components/studio/StudioShell.tsx
- src/lib/constants.ts (APP_VERSION)
- package.json

Verify:
1. Open a new Work session, type a topic without mentioning channel. Reed asks about channel.
2. Answer channel; Reed asks about audience. Answer audience; Intake unlocks the advance.
3. Try to advance from Intake with channel missing. Gate holds.

---

## CO_024: Question vs Directive Handling at Draft Stage

**Branch:** `co-024-draft-input-routing`
**Commit:** `bc2aabf`
**Version bump:** 1.08 → 1.09 (app), 1.0.8 → 1.0.9 (package)

Draft-stage composer input is now classified by intent. Questions go to Reed as chat. Directives trigger revision. Ambiguous input routes to a quick disambiguation prompt. Prevents the old pattern where "tighten this" was answered with chat instead of a revised draft.

Files touched:
- src/pages/studio/WorkSession.tsx (classifier + handler split)
- api/chat.js (REED_SYSTEM guidance aligned)
- src/lib/agents/prompts/reed-foh.md

Verify:
1. At Draft stage, type "what do you think of this hook?" → Reed responds in chat.
2. Type "rewrite the intro, shorter and punchier" → revision runs, new draft appears.
3. Type "this" → disambiguator asks whether to chat or revise.

---

## CO_026: Inspector Chips Propose Before Applying

**Branch:** `co-026-inspector-propose-before-apply`
**Commit:** `21b358d`
**Version bump:** 1.09 → 1.10 draft, reset later. (Superseded by CO_031 / CO_029 sequence; see branch log.)

Inspector quick-action chips no longer auto-apply edits. The chip sends a proposal request. Reed returns a preview card with the proposed rewrite. The user taps Apply to accept or Skip to dismiss. No silent draft mutations.

Files touched:
- src/pages/studio/WorkSession.tsx (pendingChipProposal state, ProposedEditCard)
- src/components/studio/ActionChips.tsx (disabled prop wiring)

Verify:
1. In Edit stage, click a chip like "Tighten this opening."
2. Inspector shows a proposal card with the rewrite; Apply and Skip buttons render.
3. Apply inserts the revision; Skip clears the proposal. No change without explicit Apply.

---

## CO_031: Reed Sidebar Syncs to Active Work Session + Freestyle Redefinition

**Branch:** `co-031-reed-sidebar-session-state`
**Commit:** `1f7709b`
**Version bump:** 1.08 → 1.09 (app), 1.0.8 → 1.0.9 (package)

Reed's floating sidebar (FloatingReedPanel) now reads the live Work session context via a new bridge (workSessionContextBridge + useWorkSessionContext hook). Reed's Take and First Move chip advance based on real progress: channel chosen, audience chosen, draft generated, review cleared.

Freestyle re-defined as Thought Partner Mode. Output is optional. Reed follows the user's lead. Full redefinition lives in CLEAN_6_5/systems/FREESTYLE_PATCH.md and is reflected in OUTPUT_TYPES.

Files touched:
- src/lib/workSessionContextBridge.ts (new)
- src/hooks/useWorkSessionContext.ts (new)
- src/pages/studio/WorkSession.tsx (publish snapshot on state changes)
- src/components/studio/StudioShell.tsx (consume snapshot, stage-aware Take + First Move)
- src/lib/constants.ts (APP_VERSION, OUTPUT_TYPES Freestyle entry)
- CLEAN_6_5/systems/FREESTYLE_PATCH.md (new)

Verify:
1. Open Work session, do not enter channel. Floating panel's First Move says "Pick the channel."
2. Enter channel, then audience. First Move advances to "Move to the outline" once intake is ready.
3. Let Reed write the draft. First Move advances to Edit-appropriate chip.
4. In OUTPUT_TYPES, confirm Freestyle label reads "Thought Partner Mode" and the shortDesc references thinking out loud.

---

## CO_029: Review Stage UX Failures

**Branch:** `co-029-review-stage-ux-failures`
**Commit:** `e893a69`
**Version bump:** 1.09 → 1.10 (app), 1.0.9 → 1.0.10 (package)

Nine prioritized Review-stage UX failures, fixed across the Pre-Wrap gate, Inspector panel, and shell-level chip routing.

- **F1 — Flagged items on page.** PreWrapOutputGate now renders a Flagged items card when any gate status is non-Pass. Each row names the gate and proposes a plain-language fix. No chat round-trip required.
- **F6 — Header branches on flags.** h1 reads "Draft needs attention" when flagged; eyebrow eyebrow changes color. Return to Draft button routes back via the shell stage bridge.
- **F2 — Typography hierarchy.** Eyebrow above the h1, h1 bumps to clamp(24–30px), status lede at 15px / fg-2, meta line at 13px / fg-3. Spacing tightens the lead and opens a clean break before the recommendation.
- **F3 — Tap vs Click.** "Tap to adjust" now responsive. Uses the useMobile hook; reads Click on desktop and Tap on touch.
- **F4B — Reed recommendation is dominant.** Pre-Wrap's Reed recommendation card now carries a gold gradient border, a 28px format name, an attribution eyebrow, and a primary "Use X" button. The Catalog grids below read as alternates, not peers.
- **F5 — Templates in format grid.** A "Your templates" row renders above the Catalog categories. Empty state explains that saving templates happens after using the same format twice.
- **F7 — Check Could Not Finish explained.** Method-lint inspector errors now show what failed, why it might have happened, and what to do, across all three error branches (timeout, unreachable, generic).
- **F8 — System messages persist.** New "system" message type in the Reed thread. A window event `ew-reed-system-message` accepts text and tone. Wired to pipeline errors, park-in-Pipeline outcomes, and Review Fix results. Persists after the transient toast disappears.
- **F9 — What needs fixing? shows list, not chat.** REED_STAGE_CHIPS Review[0] now carries `action: "show_flagged_items"`. The shell detects the action and dispatches `ew-focus-flagged-items` instead of prefilling chat. PreWrapOutputGate listens, scrolls the flagged card into view, and pulses its border.

Files touched:
- src/components/studio/StudioShell.tsx
- src/components/studio/StudioShellContext.tsx
- src/lib/constants.ts
- src/pages/studio/WorkSession.tsx
- package.json

Verify:
1. Run a draft with known issues. At Review, click Start Wrap. Pre-Wrap gate shows "Draft needs attention", flagged items list, Return to Draft button.
2. From Reed sidebar with the flagged list visible, click "What needs fixing?". Flagged card scrolls into view and pulses gold.
3. Trigger a pipeline failure. Toast appears; afterward, Inspector thread contains a persistent SYSTEM notice.
4. Run a Review Fix. "Draft updated" toast fires; Inspector keeps a SYSTEM notice after the toast fades.
5. Force a method-lint error (offline). Inspector shows the three-part explanation with a Retry button.
6. On a phone viewport, word-target helper text reads "Tap to adjust". On desktop, reads "Click to adjust".
7. Pre-Wrap gate with a recommended format: the gold card dominates the page and carries a primary "Use X" button.

---

## Branch Stacking Note

Sandbox restrictions prevent `git checkout main` from clearing working-tree paths. Each CO branch was created with `git update-ref refs/heads/co-XXX <prior-co-tip>` and `git symbolic-ref HEAD refs/heads/co-XXX`. Result: diffs are cumulative (CO_029 includes CO_031's diff, which includes CO_026's, etc.), but commits remain atomic and fully scoped to their CO. When rebasing to main, cherry-pick commits in order: CO_023 → CO_024 → CO_026 → CO_031 → CO_029.

## Post-Install Checks

- [ ] `npm run dev` starts without runtime errors
- [ ] `npm run build` completes
- [ ] Manual verify each CO via the steps above
- [ ] CLAUDE.md canonical numbers (40, 12, 7) untouched in constants
- [ ] No em-dashes introduced in any committed file

---

*(c) 2026 Mixed Grill, LLC*
EVERYWHERE Studio, Tier 2 Install
