# Post-Action Audit
## Automated Learning After Every Completed Piece

**Version:** 6.0
**Created:** February 17, 2026
**Owner:** Mark Sylvester, Composer
**Division:** Systems
**Status:** Production Ready
**Classification:** BOH System Specification

---

## THE PRINCIPLE

After any coordinated action: what went well, what went wrong, what needs work.

The military calls it an After Action Review. EVERYWHERE Studio runs one automatically after every completed piece of work. No agent required. No meeting scheduled. It just happens " and what it learns goes straight into the system.

---

## WHAT IT CAPTURES

After every piece ships through WRAP, the Post-Action Audit runs and records:

**Process data:**
- Idea to first draft: time elapsed
- Draft to shipped: time elapsed, number of revision cycles
- Which quality checkpoints flagged (and on which pass)
- Which checkpoint required the most rework
- Any Composer Override invoked (and why)

**Quality data:**
- Checkpoints scores at ship (all six checkpoints)
- Voice DNA match percentage at ship
- Betterish score at ship

**Pattern data:**
- Output type (Sunday Story, podcast, LinkedIn post, etc.)
- Day and time shipped
- Whether it shipped on schedule or late
- If late: which stage caused the delay

---

## WHAT IT DOES WITH THAT DATA

### Feeds the Learning Engine (immediate)
Every audit result writes to Supabase. The Learning Engine reads it. Patterns accumulate. The system adjusts.

Over time:
- Reed learns which structures produce cleaner first drafts
- Elena's AI Tells detection tightens based on what keeps flagging
- Task Master learns realistic time estimates per output type
- Voice DNA model sharpens based on revision patterns

### Feeds the Weekly Digest (every 7 days)
Sara receives a brief weekly digest " not a report, a signal. One paragraph. What patterns emerged this week that the system noticed.

Examples of what surfaces:
- "The hook (Checkpoint 3) flagged on 4 of 5 pieces this week. David has a note."
- "Average time from draft to ship increased 40% this week. Three revision cycles vs. typical 1.8."
- "Voice DNA match running at 91% " slightly below the 95% threshold. Jordan flagged two phrases consistently."

Mark can see this digest too. Dashboard surfacing, not email.

### Feeds the Impact Report (on demand)
Layer 3 of the Impact System (voice consistency) draws entirely from Post-Action Audit data.

---

## WHAT IT DOES NOT DO

- Does not interrupt work in progress
- Does not generate reports no one asked for
- Does not require any human action to run
- Does not surface every audit to Mark " only notable patterns in the weekly digest

The audit is infrastructure. It runs. It learns. It improves the system. It doesn't create work.

---

## SCOTT HOLLOWAY'S METHODOLOGY

The Post-Action Audit is built on Scott Holloway's Special Forces AAR framework, automated and continuous. The four questions that structure every audit:

1. What was the objective?
2. What actually happened?
3. Why was there a difference?
4. What do we do differently next time?

In automated form:
1. **Objective** " what output type, what quality standard, what schedule
2. **Result** " what shipped, checkpoint scores, time elapsed
3. **Delta** " where did actual differ from intended (late? checkpoint failures? multiple revision cycles?)
4. **Learning** " pattern identified, fed to Learning Engine

The methodology is Scott's. The execution is the system's.

---

## RELATIONSHIP TO OTHER SYSTEMS

**WRAP** " triggers Post-Action Audit when content ships
**Quality Checkpoints** " provides checkpoint score data
**Voice DNA** " provides match percentage data
**Learning Engine** " primary consumer of audit data
**Impact System** " uses Layer 3 (voice consistency) data from audits
**Task Master** " time estimate accuracy improves from audit patterns
**Sara Williams** " receives weekly digest

---

## V6 BUILD NOTES

**P1 MVP:**
1. Trigger: fires automatically when WRAP marks a piece as shipped
2. Data capture: checkpoint scores, revision count, time elapsed, output type
3. Supabase storage: structured record per piece
4. Weekly digest: Sara view in dashboard (Mark can toggle on)

**P2 " Pattern detection:**
Learning Engine reads audit history, surfaces notable patterns, adjusts system behavior.

---

(c) 2026 Mixed Grill, LLC
EVERYWHEREâ„¢ Studio
One idea. Everywhere.
