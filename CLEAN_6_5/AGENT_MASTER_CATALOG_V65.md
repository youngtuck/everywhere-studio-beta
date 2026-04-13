# Agent Master Catalog v6.5
## Complete Wiring Reference - EVERYWHERE™ Studio

**Version:** 6.5
**Last Updated:** March 12, 2026
**Owner:** Alex Sterling (QA and Testing)
**Primary Recipients:** Tucker Howard (mobile app), Martin Rhodes (web app)
**Status:** Production - Sections 1–13 (LEGO I–II) + Sections 14–20 (LEGO III, this build)

---

## HOW TO USE THIS DOCUMENT

This is the wiring reference. Every agent, every trigger, every integration point, every handoff. Tucker and Martin use this to build the app. Alex uses this to test everything.

This is not user documentation. This is the circuit diagram.

---

## SECTION 14: SYSTEM MODES - COMPLETE SPECIFICATIONS

The eight system modes are Sara's routing logic externalized. Every user request routes through one of these modes. Sara determines which mode applies - the user never picks.

### Mode 1: Content Production

**Zone:** Work
**Lead:** Reed (input) → all agents (production) → Quality Checkpoints → Charlie (verification)
**Triggers:** "Write me a..." · "Create a..." · "Draft a..." · "I need a [output type]"
**Flow:**
1. Reed captures the idea and clarifies scope (one question maximum)
2. Sara assembles the right team based on output type
3. Production runs with Voice DNA + Brand DNA active throughout
4. All seven checkpoints run in sequence (Checkpoints 0-6)
5. Betterish scores - must hit 800 to proceed
6. Charlie verifies completeness
7. Output delivered

**Output:** Publication-ready content in the specified format

---

### Mode 2: Path Determination

**Zone:** Watch
**Lead:** Sara + SBU (full 11-member panel unless specified otherwise)
**Triggers:** "Help me think through..." · "I'm not sure whether to..." · "What should I do about..." · "I'm stuck on..."
**Flow:**
1. Sara identifies this as strategic, not tactical
2. Scout runs pre-engagement research if a person or company is involved
3. SBU convenes - each member offers lens-specific input
4. Victor confirms OPA (Outcome/Purpose/Action) is clear
5. Sara synthesizes - produces one recommendation, not a menu
6. Conviction Check: "Do you believe it yourself?"
7. If yes: path is set, execute. If no: return to SBU.

**Output:** One clear recommended path with rationale. Not a list of options.

---

### Mode 3: Decision Validation

**Zone:** Watch
**Lead:** Sara + SBU + Dana (Cage Match if divided)
**Triggers:** "I'm leaning toward [X]..." · "Stress-test this decision" · "I've decided to [X] - what am I missing?"
**Flow:**
1. Mark presents the decision
2. SBU runs full validation sequence
3. If SBU is united: unified recommendation delivered
4. If SBU is divided: Dana runs Cage Match - strongest argument wins
5. Conviction Check: "Do you believe it yourself?"
6. If yes and GREEN: Communication Cascade activates (Sara → Reed → all stakeholder versions)
7. If yes but YELLOW/RED flags: Mark decides with full information

**Output:** GREEN / YELLOW / RED verdict with specific reasoning. Communication Cascade if GREEN and Mark commits.

---

### Mode 4: The Stress Test

**Zone:** Watch
**Lead:** Josh (category) + Lee (market) + Dana (adversarial)
**Triggers:** "Run the Stress Test on [name/concept]" · "Stress-test this name" · "Is [X] a real category?"
**Flow:**
1. Josh evaluates category legitimacy - is this a new game or a renamed old game?
2. Lea evaluates market reception - will the target audience understand and respond?
3. Dana stress-tests the hardest counter-argument - what's the best case against this?
4. Victor confirms OPA if the name passes all three
5. Verdict: PASS / REVISE / RETIRE

**Output:** Named verdict (PASS / REVISE / RETIRE) with specific reasoning per lens.

---

### Mode 5: Ready

**Zone:** Wrap
**Lead:** Jordan (voice) + David (engagement) + Natasha (editorial) + one SBU voice (context-matched)
**Triggers:** "SBU?" · "Before I send this..." · "Is this ready?" · "Ready check" · "Quick review"
**Flow:**
1. Jordan runs Voice DNA check (>95% match required)
2. David runs 7-second hook test
3. Natasha runs Stranger Test (would someone with no context follow this?)
4. SBU voice matched to audience - Ward if sales, Lea if marketing, Guy if partnership
5. Scout evaluates timing - is this the right moment given recipient context?
6. Verdict: SEND / HOLD / REVISE

**Output:** SEND / HOLD / REVISE with specific reasoning. If REVISE: exactly what to change.

---

### Mode 6: Does This Work?

**Zone:** Wrap
**Lead:** Asset type determines the lead (see routing table below)
**Triggers:** "Run this through UX" · "Does this work?" · "Review this [asset]" · "Quick UX"
**Flow:** Five sequential checks with blocking authority. Each check: PASS / FAIL / FLAG.

**Asset type → Lead routing:**

| Asset Type | Mode 6 Lead |
|------------|-------------|
| Website, landing page, Lovable build, digital interface | Christopher Kowalski |
| Podcast episode | Felix Rossi |
| Video script | Kai Morrison |
| Essay, long-form content | Natasha Boyko (+ Byron) |
| Presentation | [retired] |
| Email | Mira Rhoades |

**Five checks (digital assets - Christopher leads):**
1. Strategy Alignment - Christopher: Does this serve the business objective?
2. User Journey - Christopher: Can someone navigate without thinking?
3. Engagement + Conversion - David Stone: Hook working? CTA clear?
4. Copy + Voice - Byron (+ Jordan conditional): Sounds human? Sounds like the Composer?
5. Technical + Visual - Martin Rhodes + Mira Rhoades: Responsive? Accessible? Clear hierarchy?

**Quick UX:** Checks 1 + 2 only. Fast turnaround for lightweight review.

**Output:** Check-by-check PASS / FAIL / FLAG with priority fixes listed.

---

### Mode 7: Learning Mode (SODOTU)

**Zone:** Any
**Lead:** Sande (The Trainer)
**Triggers:** "Teach me [X]" · "Show me [X]" · "Walk me through [X]" · "Let me try [X]" · Sara offers proactively when unfamiliar capability detected
**Flow:**
1. SEE ONE - Sande demonstrates on real example, narrates as she works
2. DO ONE - User practices with Sande's guidance (training wheels on)
3. TEACH ONE - User explains it back; Sande validates understanding
4. Diane captures what was taught, what phase reached, patterns to watch
5. Sara updates capability familiarity tracking

**TEACH ONE is the graduation requirement.** Claiming to understand is not enough. Explaining it back is.

**Output:** User achieves competence in the specified capability. Sande never uses the word "SODOTU" with users.

---

### Mode 8: Red Team

**Zone:** Watch
**Lead:** Dana (always)
**Triggers:** "Red team this" · "Run a premortem on [X]" · "How does this fail?" · "Play devil's advocate"
**Sub-modes:**

| Sub-mode | Trigger | Duration | Output |
|----------|---------|----------|--------|
| Quick Red Team | "Play devil's advocate" | 10–15 min | Top 3 counter-arguments |
| Standard Red Team | "Red team this" | 30–45 min | Full adversarial analysis |
| Premortem | "Run a premortem on [X]" | 20–30 min | Assume failure, explain why |
| Full Red Team | "Full red team on [X]" | 2–4 hrs | Multi-vector analysis with SBU inputs |

**Flow (Standard):**
1. Dana takes the adversarial position
2. SBU members contribute failure scenarios from their lens
3. Dana synthesizes the strongest case against
4. Victor identifies what would have to change to make it viable
5. Dana delivers verdict: BUILD / PIVOT / KILL with full reasoning

**Output:** The strongest honest case against the idea/decision, with specific counter-arguments and path-to-viable if relevant.

---

## SECTION 15: QUALITY CHECKPOINT PROTOCOLS

### Checkpoint 0 - Echo: Deduplication

**Fires:** Before any checkpoint sequence begins
**Standard:** Zero redundant content
**Action on fail:** Returns to content team for consolidation - no permission asked, no question asked, just fix and rerun
**Escalation:** If same content passes Echo twice in the same session, Echo flags to Natasha

---

### Checkpoint 1 - Priya Kumar: Research Accuracy

**Standard:** 100% verified claims. Minimum 2 independent sources per claim. Minimum 8 sources for long-form content.
**Process:**
1. Priya identifies every factual claim in the draft
2. Each claim traced to minimum 2 independent sources
3. Unverified claims flagged with [VERIFY] tag
4. Draft cannot proceed with any unresolved [VERIFY] tags
**Action on fail:** Specific claims returned for verification. Not the whole draft - just the failing claims.
**AI hallucination protocol:** If Priya detects a claim that appears to be AI-generated without source, full stop - flag to Natasha immediately.

---

### Checkpoint 2 - Jordan Lane: Voice Authenticity + Platform Nativity

**Standard:** >95% Voice DNA match across all three layers (Voice, Values, Personality). Zero AI tells. Platform Nativity confirmed for assigned channel.
**Process:**
1. Jordan runs Voice DNA comparison across all three layers
2. AI tells list checked (weekly updated by Elena at Checkpoint 4 - Jordan cross-references)
3. Platform Nativity check against Interest Graph Standard Filter 5
4. Score calculated as percentage match
**Action on fail:**
- Voice miss (<95%): Return to Byron Chase for humanization, then back to Checkpoint 2
- AI tells detected: Return to Elena for SLOP removal, then back to Checkpoint 2
- Platform Nativity fail: Return to Dmitri for platform reformatting, then back to Checkpoint 2

---

### Checkpoint 3 - David Stone: Engagement Optimization

**Standard:** 7-second hook test passed. Clear stakes from line one. Reader knows why this matters before sentence 3.
**Process:**
1. David reads the first 7 seconds of content (approximately the hook)
2. Evaluates: Can someone explain why this matters after 7 seconds?
3. Stakes check: Is what's at risk made clear within the first paragraph?
4. Momentum check: Does each section earn the next?
**Action on fail:** Return to content team with specific line-level feedback on what the hook is missing and why the stakes aren't landing.

---

### Checkpoint 4 - Dr. Elena Vasquez: SLOP Detection

**Standard:** Zero SLOP. Zero AI fingerprints. Vocabulary limited to the AI Tells List (updated weekly by Elena).
**Process:**
1. Elena runs SLOP detection against current AI Tells List
2. Padding identification: every sentence that could be removed without loss
3. Corporate language audit: words that signal committee-writing, not individual thinking
4. Weekly update: Elena adds new AI tells to the list from current AI output patterns
**Action on fail:** Return to Byron for removal with specific flagged language highlighted.
**AI Tells List:** Maintained by Elena, shared with Jordan (Checkpoint 2). Any tells Jordan flags that aren't on the list get added to Elena's queue.

---

### Checkpoint 5 - Natasha Boyko: Editorial Excellence

**Standard:** Publication-grade. Stranger Test passed.
**Stranger Test:** Would someone with zero context about the Composer, the topic, and EVERYWHERE follow this piece to a conclusion that changes something about how they think?
**Process:**
1. Natasha reads as a stranger - all prior context suspended
2. Evaluates: Is the argument complete?
3. Evaluates: Does the evidence support the claim?
4. Evaluates: Is there anything a skilled editor would cut?
5. Evaluates: Does the ending earn the beginning?
**Action on fail:** Natasha returns with specific editorial notes. Natasha does not rewrite - she marks. Content team rewrites to the marks.

---

### Checkpoint 6 - Dr. Marcus Webb + Marshall: Perspective and NVC

**Standard:** Zero cultural missteps. Zero NVC violations. Blindspot analysis complete.
**Process:**
1. Marcus evaluates from multiple cultural and experiential perspectives
2. Marshall applies NVC (Nonviolent Communication) lens - any language that could be read as blame, judgment, or demand?
3. Together: What is this piece assuming that may not be universal?
4. Blindspot report: What isn't being said that should be? What's being said that assumes a shared worldview that doesn't exist?
**Action on fail:** Specific revision guidance from both Marcus and Marshall. If only one fails, only that revision is required.

---

## SECTION 16: OUTPUT SYSTEMS - COMPLETE SPECIFICATIONS

### The 14 Output Types

**Outbound (13):**

| # | Type | Base Format | Template Layer |
|---|------|-------------|---------------|
| 1 | Essay | Long-form written article | Sunday Story, Through Another Lens |
| 2 | Podcast | Dual output: article + audio script | Get Current |
| 3 | Book Chapter | Long-form structured narrative | N/A |
| 4 | Website Content | Page copy, section by section | N/A |
| 5 | Video Script | Visual + spoken, structured for editing | N/A |
| 6 | Email Newsletter | Subject + preview + body | N/A |
| 7 | Social Media | Platform-native, multi-format | N/A |
| 8 | Presentation | Narrative structure, slide by slide | N/A |
| 9 | Thought Leadership | Opinion, position, POV | N/A |
| 10 | Strategy Sessions | Pre-session brief, session guide, debrief | N/A |
| 11 | Proposals + Pitches | Structured persuasion documents | N/A |
| 12 | Business | Internal docs, reports, memos | N/A |
| 13 | Freestyle | Anything that doesn't fit the above | N/A |

**Inbound (1):**

| # | Type | Description |
|---|------|-------------|
| 14 | Read. React. Reply. | Three moves in sequence for anything that arrives requiring a response. Read: understand what was actually said. React: determine the right response strategy. Reply: produce the reply in the Composer's voice. |

### Template Logic

Templates layer on top of base types. The template inherits all rules from the base type and adds specific structural requirements.

Sunday Story = Essay base + Sunday Story template rules
Get Current = Podcast base + Get Current template rules

Define a template once and every rule fires automatically from that point forward.

---

## SECTION 17: OUTPUT FORMAT DELIVERY STANDARDS

### UNFOLD Format (Standard Reporting)

Used for: all recaps, updates, session reports, Friday fixes, and deliverables to Mark, beta testers, and clients.

UNFOLD 2.0: React JSX accordion format
UNFOLD 3.0: Enhanced version with additional depth options

See UNFOLD_2_0.md and UNFOLD_3_0.md for complete specifications.

### Betterish Scoring

Every output receives a Betterish score before shipping.

**Scale:** 0–1,000 across four dimensions
**Publication threshold:** 800
**Below 800:** Does not ship, regardless of deadline

**The four dimensions:**
1. Voice Authenticity - does it sound like the Composer?
2. Strategic Clarity - does it do the job it's supposed to do?
3. Engagement Quality - does it earn the read/listen/watch?
4. Publication Readiness - is it complete, formatted, and error-free?

Each dimension: 0–250 points. 800 total required.

### Betterish Score Scale Reference

| Score | Label | Status |
|-------|-------|--------|
| 900–1,000 | Signature Work | Ship immediately |
| 800–899 | Publication Ready | Ship with confidence |
| 700–799 | Strong Draft | One revision needed |
| 600–699 | Working Draft | Multiple revisions needed |
| Below 600 | Starting Point | Significant rework required |

---

## SECTION 18: NAVIGATION SYSTEMS

### Discover

**What it is:** The map. Visual, explorable, organized by zone and output type.
**Trigger:** "Discover" · "What can you do?" · "Show me everything" · "What's available?"
**Display:** Organized by Watch / Work / Wrap. Shows all output types, all modes, all major capabilities.
**Design principle:** Visual, not textual. Show-don't-tell. Explorable.
**FOH implementation:** Clickable interface with zone tabs. Not a text list.

---

### What's Next

**What it is:** The compass. Reactive + proactive workflow guidance.
**Reactive trigger:** "What's next?" · "What should I do?" · "Where do I go from here?"
**Proactive monitoring:** Sara monitors eight stuck-pattern conditions and offers guidance without being asked.

**Eight proactive conditions:**
1. User in same mode for 3+ exchanges without progress
2. Content approaching Checkpoint 6 without having been through Checkpoint 0
3. Decision pending with no action taken after SBU recommendation
4. Output ready but no delivery format requested
5. Friday approaching with no plan review
6. New output type triggered without Discover having been run
7. Betterish score below 800 with no revision started
8. Unfamiliar capability detected (Sara offers Sande)

---

### Task Master Dashboard

**What it is:** The production operating system. Rolling two-day plan, category tracking, ICS delivery.
**Trigger:** "/taskmaster" · "Show me the dashboard" · "Where am I?"
**See:** TASK_MASTER_SYSTEM.md for complete specification.

---

## SECTION 19: AUTOMATED SYSTEMS

### Post-Action Audit

**What it is:** Automated AAR (After Action Review) that fires after every completed piece.
**Status:** P1 Martin build - not yet implemented. Spec is current. Build is pending.
**Owner when built:** Automated - no human trigger required.

**What it captures:**
- Which agents fired
- Which checkpoints passed/failed and how many iterations
- Total session time vs. Tempo's estimate
- Betterish score trajectory (first draft → final)
- Delivery format and platform
- Any Mark overrides (with mandatory documentation)

**Weekly digest:** Sara receives PAA summary every Friday AM. Feeds into Scott's Friday Recap workflow.

**Learning Engine integration:** PAA data feeds into Tempo's time estimation improvement. Over time, estimates become more accurate.

---

### Discover (Automated)

**What it is:** The visual navigation map. Always on, always current.
**What it shows:** All capabilities, organized by zone. Updates automatically when new capabilities are added.
**Update protocol:** Every new capability addition triggers a Discover update. Riley enforces. If Discover doesn't show it, it isn't fully deployed.

---

## SECTION 20: INTEGRATION POINTS AND HANDOFFS

### Tucker Howard - Mobile App Integration

Tucker is building the companion mobile app. The app uses the same engine as the web app with a different interface - "same engine, different steering wheel."

**Key handoffs Tucker needs:**
- All 8 mode triggers and their complete routing logic (see Section 14)
- All 14 output types and their template layers (see Section 16)
- Betterish scoring display format (Section 17)
- Navigation Triad implementation - Discover as clickable map, What's Next as push notification, Learning Mode as guided tutorial (Section 18)
- Live room / control room metaphor: user sees live room (FOH), system runs control room (BOH)

**Mobile-specific considerations:**
- Mode 7 (Learning Mode) surfaces as guided tutorial with progress indicators
- Discover surfaces as a swipeable zone-based map (Watch / Work / Wrap)
- Mode 5 (Ready) surfaces as a pre-send checklist before sharing from mobile

---

### Martin Rhodes - Web App Integration (Lovable)

Martin is building the web app in Lovable.

**Key integration points:**
- All mode routing logic must be implemented at the middleware layer - not prompts, orchestration
- AEO (Answer Engine Optimization) is a mandatory step in all Lovable builds - see AEO_LOVABLE_PROMPT.md
- Supabase backend for user profiles, Voice DNA storage, Brand DNA storage
- Edge Functions for API integrations with ElevenLabs, Gemini
- MR_CLEAN.md is the code hygiene prompt - run after every major build session

**Build sequence Martin follows:**
1. AEO prompt first - always
2. Core capability build
3. Voice DNA integration
4. Quality Checkpoint wiring
5. Betterish scoring display
6. Navigation Triad implementation
7. MR_CLEAN run
8. Alex Sterling QA

---

### Alex Sterling - QA Protocol

Alex validates every new capability before it deploys. No exceptions.

**QA sequence:**
1. Review spec (this document)
2. Test trigger - does it fire correctly?
3. Test output - does it match spec?
4. Test edge cases - does it fail gracefully?
5. Test integration - does it conflict with existing capabilities?
6. Sign off: PASS or FAIL - no partial passes

**A partial PASS is a FAIL.**

---

### Sara Williams - Routing Logic Summary

Sara routes every user request to the correct mode. Sara never asks what mode the user wants. Sara determines it from context.

**Routing decision tree:**
- Is the user asking to make something? → Mode 1
- Is the user stuck at a fork? → Mode 2
- Does the user have a decision they need tested? → Mode 3
- Is the user testing a name or concept? → Mode 4
- Is the user about to send something? → Mode 5
- Is the user reviewing a completed asset? → Mode 6
- Does the user want to learn something? → Mode 7
- Does the user want to pressure-test something adversarially? → Mode 8

When ambiguous, Sara asks one clarifying question. Not two. One.

---

## CATALOG COMPLETION STATUS

| Section | Content | Status |
|---------|---------|--------|
| 1–8 | Agent profiles 1.1–8.3 | Complete (LEGO I–II) |
| 8.4 | Tempo | Complete (LEGO II) |
| 9–13 | Supplementary systems | Complete (LEGO I–II) |
| 14 | System Modes - complete specs | Complete (this build) |
| 15 | Quality Checkpoint protocols | Complete (this build) |
| 16 | Output Systems | Complete (this build) |
| 17 | Output Format Delivery Standards | Complete (this build) |
| 18 | Navigation Systems | Complete (this build) |
| 19 | Automated Systems | Complete (this build) |
| 20 | Integration Points and Handoffs | Complete (this build) |

---

© 2026 Mixed Grill, LLC
EVERYWHERE™ Studio v6.5
Agent Master Catalog - Alex Sterling, QA and Testing
March 12, 2026
