# Method DNA Copyright Approach
## Referencing Methodology Architecture Without Trademarked Names

**Version:** 1.0 (v6.5 system)
**Created:** March 13, 2026
**Owner:** Mark Sylvester / Riley (Build Master)
**Status:** Production Ready
**Classification:** BOH System Specification - Legal and Positioning

---

## THE PROBLEM

Coaches and consultants work inside established methodologies. EOS. Maui Mastermind. Scaling Up. Vistage. YPO. 2Y3X. Each is a registered trademark, brand, or proprietary framework owned by a separate entity.

EVERYWHERE Studio captures a coach's Method DNA - how their professional framework shapes the way they think, write, and advise. But it cannot reference proprietary methodology names in:
- Public-facing content produced by the system
- Marketing materials
- Positioning copy
- Any output that travels beyond the coach-client relationship

Referencing a trademark in a way that implies endorsement, partnership, or association where none exists creates legal exposure. Referencing it in a way that positions EVERYWHERE as a complement to or replacement for the methodology creates business friction with the methodology owner.

This document defines how to do it right.

---

## THE PRINCIPLE: DESCRIBE THE ARCHITECTURE, NOT THE BRAND

Every methodology is a collection of structural elements - a philosophy, a vocabulary, a set of frameworks, a meeting rhythm, an accountability model. None of those structural elements are trademarked. The name is.

EVERYWHERE Studio captures the architecture. It does not need the name to do its job.

**Wrong approach:**
> "This client uses EOS. Apply the EOS Traction framework."

**Right approach:**
> "This client operates inside a structured business operating system with a quarterly rocks model, defined departmental accountability, and a weekly Level 10 meeting rhythm."

The second version works exactly as well for content production purposes. It carries the methodology's thinking without carrying the liability.

---

## THE METHOD DNA SCHEMA

When a coach onboards a methodology, the system extracts it using this schema. No trademarked names appear in the schema output:

### Section 1: Operating Philosophy
*What does this methodology believe about how businesses grow, fail, or transform?*

Capture as: "This methodology holds that [belief/doctrine]."

Example (EOS-derived, unnamed):
> "This methodology holds that organizational dysfunction is almost always a people and process problem, not a strategy problem. Clarity of roles and rhythms outperforms talent alone."

---

### Section 2: Core Vocabulary
*What words does this methodology use that its practitioners recognize immediately?*

Capture as: A glossary of functional terms, mapped to plain-language equivalents.

| Methodology Term | Plain-Language Equivalent | Use in Content |
|---|---|---|
| [Proprietary term] | Quarterly priority | Use plain version in public content |
| [Proprietary term] | Accountability structure | Use plain version in public content |
| [Proprietary term] | Leadership team alignment | Use plain version in public content |

**Rule:** In content produced for the coach's audience, the methodology's own terms are fine - the coach's clients already use them. In any content that travels beyond that relationship (social, articles, marketing), use the plain-language equivalent.

---

### Section 3: Framework Architecture
*What are the primary frameworks this methodology uses to analyze a business, problem, or decision?*

Capture as: Descriptions of the analytical lens, not the framework name.

Example:
> "Primary analysis lens: Are the right people in the right seats? (People-Role Fit). What is the company trying to accomplish in the next 90 days? (Short-Horizon Priority). What single metric predicts health in this business? (Core Performance Indicator)."

---

### Section 4: Engagement Model
*How does this methodology structure the coach-client relationship? Meeting rhythms, milestones, review cadences.*

Capture as: Structural description.

Example:
> "Quarterly offsite for deep review and priority-setting. Weekly leadership team meeting (90 minutes, structured agenda). Annual planning session. Individual coaching calls tied to personal accountability metrics."

---

### Section 5: Success Language
*How does this methodology define and talk about success? What does a win look like?*

Capture as: Outcome vocabulary in plain language.

Example:
> "Success language in this methodology centers on traction - consistent incremental progress against defined priorities, visible to the whole team. Wins are measured in 'rocks moved,' not in inspiration felt."

(Note: "traction" is generic enough to use. "Rocks" in this context is methodology-specific - it would use the plain equivalent in public content.)

---

### Section 6: Prohibited Confusion
*What does this methodology explicitly reject or position against? What thinking does it consider a trap?*

Capture as: The belief that the methodology argues against.

Example:
> "This methodology argues against: chasing revenue without operational clarity, adding headcount before defining roles, and mistaking activity for progress."

---

## THE TWO-TIER CONTENT MODEL

Method DNA operates differently depending on content destination:

### Tier 1: Internal Content (Coach + Client)
- Methodology terms: fully usable
- Framework names: fully usable
- No restrictions - this is a closed relationship
- Reed uses the methodology's vocabulary directly

**Example prompt behavior:**
> Coach runs a session. Client uploads meeting notes that reference "L10 meetings" and "rocks." Reed uses those terms naturally in content produced for that client.

---

### Tier 2: External Content (Public-Facing)
- Methodology brand names: prohibited
- Specific trademarked terms: replaced with plain equivalents
- Generic methodology vocabulary: usable if widely understood

**Example prompt behavior:**
> Coach asks for a LinkedIn article about their approach to leadership team alignment. Reed writes about "weekly structured team meetings" and "quarterly priority-setting" - not about the methodology by name.

**Jordan Lane role:** At Checkpoint 2, Jordan checks all public-facing content for methodology brand names. Any trademarked term that appears in external content is flagged as a Checkpoint 2 failure. Sara routes back to Reed for substitution.

---

## EXISTING METHODOLOGY PACKS - SAFE LANGUAGE MAP

The following methodology packs have been built. This table captures the safe-language substitution pattern for the most common terms:

### Maui Mastermind / Scale at Speed (2Y3X)

| Methodology Term | Safe Alternative |
|---|---|
| Maui Mastermind | Peer advisory and structured growth methodology |
| 2Y3X | Accelerated growth framework; doubling revenue target model |
| Owner Independence | Business runs without the founder |
| Business Value Builder | Systematic business equity growth |
| 3 Archetypes | Lifestyle, Institutional, Strategic Sale orientation |

### EOS / Traction

| Methodology Term | Safe Alternative |
|---|---|
| EOS | Business operating system |
| Traction | Consistent execution against priorities |
| Rocks | Quarterly priorities or 90-day commitments |
| Level 10 Meeting | Weekly leadership team meeting |
| Visionary / Integrator | CEO / COO functional split |
| Scorecard | Weekly performance dashboard |
| GWC (Get it, Want it, Capacity) | Role-fit evaluation criteria |

### Scaling Up

| Methodology Term | Safe Alternative |
|---|---|
| Scaling Up | Structured growth methodology |
| Rockefeller Habits | Management rhythms and habits |
| One-Page Strategic Plan | Condensed strategy document |
| 4 Decisions | People, Strategy, Execution, Cash priorities |

---

## WHAT JORDAN LANE CHECKS AT GATE 2

For any public-facing content produced for a coach client:

1. **Scan for methodology brand names** - EOS, Maui Mastermind, Scaling Up, Vistage, YPO, 2Y3X, Traction, and any methodology-specific product names
2. **Scan for highly specific trademarked terms** - Rocks, Level 10, GWC, Rockefeller Habits, Owner Independence Score, and similar
3. **Substitute with Tier 2 alternatives** - Flag to Reed with specific replacement instruction
4. **Re-check after substitution** - Checkpoint 2 does not pass until all instances are resolved

**Exception:** If the coach's client explicitly authorizes their methodology name to appear in public content (and that authorization is documented), Jordan Lane passes with a note. Documentation lives in the project file. This is rare - most methodology owners have content policies that restrict this.

---

## POSITIONING NOTE

Method DNA does not position EVERYWHERE Studio as endorsed by, affiliated with, or superior to any methodology. The system amplifies what a coach already builds inside their methodology. The relationship is additive - always.

If a methodology owner were to read any content produced by EVERYWHERE Studio for one of their coaches:
- They would find their framework's thinking accurately represented
- They would not find their trademarks misused
- They would not find EVERYWHERE positioned as a replacement
- They could reasonably conclude: this makes our coaches more effective

That's the test. Write everything so a methodology owner would be comfortable seeing it in the wild.

---

## RELATED FILES

- `METHODOLOGY_PACKS.md` - Channel partner infrastructure and pack creation
- `JORDAN_LANE.md` - Checkpoint 2 voice and brand validation
- `EVERYWHERE_STUDIO_FOH_SPEC_v6_1.md` - FOH feature context for coach channel

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™ v6.5
