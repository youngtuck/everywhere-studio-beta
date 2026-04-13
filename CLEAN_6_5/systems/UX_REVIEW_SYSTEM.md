# UX Review System
## "Run This Through UX"

**Version:** 6.0
**Last Updated:** February 17, 2026
**Owner:** Christopher Kowalski (UX Review Lead)
**Orchestration:** Sara Williams
**Status:** Production Ready

---

## PURPOSE

Dedicated UX review workflow triggered by a single command. Takes any digital asset -- a Lovable build, page layout, wireframe, user flow, concept, or prototype -- and runs it through five sequential UX checks with defined owners, standards, and blocking checkpoints.

This is a review workflow, not a build workflow. It evaluates what exists and produces a UX Review Report with specific findings and fixes.

---

## TRIGGER PHRASES

Sara routes to UX Review when the Composer says:

| Trigger | Action |
|---------|--------|
| "Run this through UX" | Full UX Review (5 checks) |
| "UX review" | Full UX Review (5 checks) |
| "UX check" | Full UX Review (5 checks) |
| "Quick UX" | Abbreviated review (Checks 1 + 2 only) |

---

## UX REVIEW TEAM

### Always Activated (Every UX Review):

| Agent | Role in Review | What They Evaluate |
|-------|----------------|-------------------|
| **Christopher Kowalski** | UX Review Lead | Strategy alignment, user journey, information architecture |
| **David Stone** | Engagement and Conversion | Hook effectiveness, CTA placement, scroll behavior |
| **Byron Chase** | UI Copy and Humanization | Microcopy, error messages, labels, button text, tone |
| **Martin Rhodes** | Technical UX | Performance, accessibility, responsive behavior, load times |
| **Mira Rhoades** | Visual Presentation | Hierarchy, rhythm, whitespace, format consistency |

### Conditionally Activated:

| Agent | Condition | What They Add |
|-------|-----------|---------------|
| **Jordan Lane** | Asset contains branded copy | Voice DNA consistency in UI text |
| **Dr. Elena Vasquez** | Asset contains AI-generated UI text | SLOP detection in interface language |
| **Kai Morrison** | Asset contains multimedia/video | Visual storytelling integration |

---

## THE FIVE UX CHECKS

Sequential. Each check produces PASS / FAIL / FLAG. A FAIL blocks -- must fix before proceeding. A FLAG is a recommendation, not a blocker.

---

### Check 1: Strategy Alignment (Christopher Kowalski)

**Question:** Does this serve the business objective?

**Evaluates:**
- Clear value proposition visible in first 5 seconds
- User knows what this is and what to do
- Navigation supports the primary conversion goal
- No orphan pages or dead-end flows
- Information architecture matches user mental model

**Standard:** "If a stranger lands here, do they know what this is and what to do within 5 seconds?"

**Blocks if:** No clear value proposition. Confusing navigation. Misaligned with business goal.

---

### Check 2: User Journey (Christopher Kowalski)

**Question:** Can the user get where they need to go without thinking?

**Evaluates:**
- Primary user flow: entry -> action -> confirmation (3 clicks or fewer)
- Secondary flows discoverable but not competing
- Error states handled gracefully
- Back navigation works
- Progress indicators where needed
- Mobile journey tested separately

**Standard:** "The user should never wonder 'what do I do now?' or 'how do I go back?'"

**Blocks if:** Primary flow broken. No error handling. Dead ends. Navigation confusion.

---

### Check 3: Engagement and Conversion (David Stone)

**Question:** Does this stop the scroll and drive action?

**Evaluates:**
- Above-the-fold hook strength
- CTA clarity, placement, and contrast
- Social proof placement and credibility
- Urgency or scarcity elements (if appropriate)
- Scroll depth optimization
- Exit intent handling

**Standard:** "The 7-second hook test applies to web pages too. If they don't know why to stay, they leave."

**Blocks if:** No clear CTA. Weak above-the-fold. No social proof. Conversion path unclear.

---

### Check 4: Copy and Voice (Byron Chase + Jordan Lane conditional)

**Question:** Does the interface text sound human and on-brand?

**Evaluates:**
- Microcopy (button labels, tooltips, error messages)
- Heading hierarchy and clarity
- Body copy readability (grade level, sentence length)
- Tone consistency across pages
- Voice DNA match (Jordan, if branded content)
- SLOP detection in UI text (Elena, if AI-generated)

**Standard:** "Every piece of text a user reads should feel like a person wrote it for them, not like a template generated it."

**Blocks if:** Generic placeholder copy. AI-sounding interface text. Tone inconsistency. Confusing labels.

---

### Check 5: Technical + Visual (Martin Rhodes + Mira Rhoades)

**Question:** Does it work everywhere and look intentional?

**Martin evaluates:**
- Responsive behavior (mobile, tablet, desktop)
- Load time (target: under 3 seconds)
- Accessibility (WCAG 2.1 AA minimum)
- Cross-browser compatibility
- Interactive elements functional
- Performance on slow connections

**Mira evaluates:**
- Visual hierarchy (eye tracking flow)
- Whitespace rhythm and breathing room
- Typography consistency and readability
- Color contrast and brand adherence
- Image quality and relevance
- Format consistency across sections

**Standard:** "If you can't tell what's important, the hierarchy fails."

**Blocks if:** Broken mobile layout. Accessibility violations. No visual hierarchy. Performance red.

---

## UX REVIEW SEQUENCE

```
TRIGGER: "Run this through UX"
        |
        v
Sara assigns Christopher as UX Review Lead
        |
        v
Check 1: Strategy Alignment (Christopher)
-> PASS / FAIL / FLAG
        |
        v
Check 2: User Journey (Christopher)
-> PASS / FAIL / FLAG
        |
        v
Check 3: Engagement and Conversion (David)
-> PASS / FAIL / FLAG
        |
        v
Check 4: Copy and Voice (Byron + Jordan conditional)
-> PASS / FAIL / FLAG
        |
        v
Check 5: Technical + Visual (Martin + Mira)
-> PASS / FAIL / FLAG
        |
        v
Christopher compiles UX REVIEW REPORT
        |
        v
DELIVERY
```

---

## QUICK UX (ABBREVIATED)

When the Composer says "Quick UX" -- runs Checks 1 + 2 only (Christopher).

Output: Strategy and Journey check. No full report. Fast turnaround.

```
TRIGGER: "Quick UX"
        |
        v
Check 1: Strategy Alignment (Christopher)
        |
        v
Check 2: User Journey (Christopher)
        |
        v
Summary: PASS / FAIL + top 3 findings
```

---

## UX REVIEW REPORT FORMAT

Every full UX Review produces this output:

```
UX REVIEW REPORT
Asset: [what was reviewed]
Date: [date]
Lead: Christopher Kowalski

CHECK 1: STRATEGY ALIGNMENT -- [PASS / FAIL / FLAG]
[Findings -- specific, actionable]

CHECK 2: USER JOURNEY -- [PASS / FAIL / FLAG]
[Findings -- specific, actionable]

CHECK 3: ENGAGEMENT AND CONVERSION -- [PASS / FAIL / FLAG]
[Findings -- specific, actionable]

CHECK 4: COPY AND VOICE -- [PASS / FAIL / FLAG]
[Findings -- specific, actionable]

CHECK 5: TECHNICAL + VISUAL -- [PASS / FAIL / FLAG]
[Findings -- specific, actionable]

OVERALL: [PASS / CONDITIONAL PASS / FAIL]

PRIORITY FIXES (if any):
1. [Highest impact fix]
2. [Second priority]
3. [Third priority]

RECOMMENDATIONS (non-blocking):
- [Enhancement suggestions]
```

---

## FAILURE PROTOCOLS

### Single Check Failure
1. Christopher identifies the specific issue
2. Reports to Sara with fix recommendation
3. Fix applied by appropriate team member
4. Failed check re-reviewed only
5. Must pass before report finalizes

### Multiple Check Failure (3+)
1. Christopher escalates to Sara
2. Sara convenes relevant team members for comprehensive revision brief
3. Asset may need structural rework, not just polish
4. Full re-review required after fixes

### Persistent Failure (fails same check twice)
1. Escalate to Composer for strategic decision
2. Options: significant rework, accept with documented exception, or pivot approach

---

## WHAT UX REVIEW IS NOT

| It's Not | It Is |
|----------|-------|
| A build workflow | A review/audit workflow |
| A replacement for Website Project System | A quality check that runs alongside or after builds |
| A design service | An evaluation of design decisions |
| A code review | A user experience evaluation |

Use WEBSITE_PROJECT_SYSTEM to build. Use UX_REVIEW_SYSTEM to evaluate.

---

## INTEGRATION WITH EXISTING WORKFLOWS

### During Website Projects
UX Review runs after Phase 3 (Design and User Experience) of the Website Project System as a validation step before Phase 4 (Web Copy).

### During Lovable Builds
Run "UX review" on any Lovable build at any milestone. Recommended checkpoints: after initial prototype, after major feature additions, before launch.

### Standalone
Run on any digital asset at any time -- competitor sites, client sites, mockups, concepts.

---

## VERSION HISTORY

### v5.4 -- February 1, 2026
- Promoted from v5.3.2 into v5.4 release
- Initial creation (January 31, 2026)
- Five-check sequential workflow
- Quick UX abbreviated option
- Full UX Review Report format
- Integration with Website Project System and Lovable builds

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE(TM) v5.4
Last Updated: February 17, 2026
