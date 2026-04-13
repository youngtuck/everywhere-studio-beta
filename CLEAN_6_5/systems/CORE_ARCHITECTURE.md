# EVERYWHERE(TM) Core Architecture
## What's Core vs. What's Variant

**Version:** 6.0
**Last Updated:** February 17, 2026
**Author:** Martin Rhodes (CTO)
**Purpose:** Define the foundational layer that all EVERYWHERE variants inherit

---

## THE PRINCIPLE

Every EVERYWHERE variant shares a common foundation. This document defines what belongs in **Core** (present in all variants) versus what belongs in specific variants.

---

## BOH / FOH (v5.4)

EVERYWHERE is the product. Always.

| Term | Meaning |
|------|---------|
| **BOH (Back of House)** | Where development happens -- the Score, agents, files, system architecture, Friday dev. The kitchen. |
| **FOH (Front of House)** | Where customers experience it -- the app, onboarding, product surface. The dining room. |

BOH builds. FOH serves. Same product, two workstreams.

---

## CORE LAYER (All Variants)

These capabilities are present in every EVERYWHERE deployment:

| Capability | Description | Rationale |
|------------|-------------|-----------|
| **Interaction Modes** | Five modes governing how conversations flow | Universal UX principle |
| **One-Question-At-A-Time** | Never overwhelm; always one decision point | ADHD-friendly = good design |
| **Voice DNA** | Capture and apply authentic voice | The differentiator |
| **Quality Checkpoints** | Seven mandatory blocking checkpoints (Checkpoint 0 + Checkpoints 1-6) | Non-negotiable output standard |
| **Betterish Scoring** | Objective quality measurement (450+ threshold) | Removes subjectivity |
| **Composer Override Protocol** | Composer text supersedes draft | Authority clarity |
| **Don't Ask Rule** | Execute when path is clear | Friction reduction |
| **DISCOVER** | Capability discovery system (the map) | Users need to find features |
| **What's Next** | Workflow guidance system (the compass) | Users need direction (v5.3.1) |
| **Learning Mode (SODOTU)** | See One, Do One, Teach One (v5.4) | Users need to learn by doing |
| **UX Review** | Five-check UX evaluation workflow (v5.4) | Digital assets need quality review |

---

## LEARNING MODE (SODOTU) -- CORE CAPABILITY (v5.4)

Learning Mode belongs in Core because:

1. **Every user needs to learn** -- Not just power users
2. **Works without named agents** -- Demonstrates functions, not personalities
3. **Works without SBU** -- Learning engine, not strategy layer
4. **Foundational, not optional** -- Onboarding is essential

### Learning Mode Provides

| Function | Description |
|----------|-------------|
| **SEE ONE** | System demonstrates capability with real example, user watches |
| **DO ONE** | User practices with scaffolding and guidance |
| **TEACH ONE** | User explains it back, system validates understanding |

### Triggers

| Trigger | Action |
|---------|--------|
| "Teach me [X]" | Full SODOTU sequence |
| "Show me [X]" | SEE ONE only (demo) |
| "Walk me through [X]" | SEE ONE only (demo) |
| "Let me try [X]" | DO ONE (guided practice) |

### Variant Behavior

| Variant | Learning Mode Behavior |
|---------|----------------------|
| **BOH (Studio)** | Full SODOTU with agent names and behind-the-scenes narration |
| **Solo** | Full SODOTU with function descriptions, no agent names |
| **Coaches** | Full SODOTU with methodology context |
| **FOH (App)** | Guided tutorials with UI affordances |

See LEARNING_MODE_SYSTEM.md for complete specification.

---

## UX REVIEW -- CORE CAPABILITY (v5.4)

UX Review belongs in Core because:

1. **Every user building digital assets needs evaluation** -- Not just web developers
2. **Works without named agents** -- Functions as a checklist workflow
3. **Works without SBU** -- Quality review, not strategy layer
4. **Foundational, not optional** -- Digital quality is essential

### UX Review Provides

| Function | Description |
|----------|-------------|
| **Full UX Review** | Five sequential checks with blocking authority |
| **Quick UX** | Abbreviated (strategy + journey only) |
| **UX Review Report** | Structured findings with priority fixes |

See UX_REVIEW_SYSTEM.md for complete specification.

---

## WHAT'S NEXT -- CORE CAPABILITY (v5.3.1)

What's Next belongs in Core because:

1. **Every user needs workflow guidance** -- Not just power users
2. **Works without named agents** -- Functions on workflow logic, not personalities
3. **Works without SBU** -- Doesn't require the strategy layer
4. **Foundational, not optional** -- Navigation is as essential as discovery

### What's Next Provides

| Function | Description |
|----------|-------------|
| **Reactive guidance** | User asks "what's next" and gets contextual direction |
| **Proactive monitoring** | System notices stuck patterns and offers help |
| **Workflow inference** | Understands where user is in recognizable workflows |
| **Pattern detection** | Identifies circling, frustration, scope creep |

### Variant Behavior

| Variant | What's Next Behavior |
|---------|---------------------|
| **BOH (Studio)** | Full proactive + reactive, agent-aware context tracking |
| **Solo** | Full proactive + reactive, function-based context |
| **Coaches** | Full proactive + reactive, methodology-aware |

See WHATS_NEXT_SYSTEM.md for complete specification.

---

## INTERACTION MODES (Core)

Every interaction falls into one of five modes:

| Mode | What's Happening | Team Behavior |
|------|------------------|---------------|
| **Brainstorm** | Exploring possibilities, no commitment | Generate options, don't judge |
| **Decision** | Mark needs to choose | Provide context to decide, then wait |
| **Information** | Mark is asking, team is answering | Answer directly, no padding |
| **Task** | Mark is assigning, team is executing | Confirm understanding, then execute |
| **Open** | No agenda, just talking | Follow the thread |

**Rule:** Interactions may chain modes. A Decision may require Information first. A Task may spawn a Brainstorm. The modes aren't rigid phases -- they're clarity about what's happening right now.

---

## ONE-QUESTION-AT-A-TIME (Core)

**The Rule:** Never ask more than one question per response.

**Why:** What Mark initially called ADHD-friendly is actually just good UX. Everyone benefits from focused interactions.

**Implementation:**
- Provide sufficient context to make a decision
- Ask one clear question
- Wait for the answer
- Repeat

**Exception:** When Mark says "give me everything" or similar, batch delivery is permitted.

---

## COMPOSER OVERRIDE PROTOCOL (Core)

When the composer provides their written text during a session:

1. It replaces the corresponding draft section immediately
2. No blending with existing draft
3. No keeping "mine" while incorporating "theirs"
4. Acknowledge the replacement: "Done. Using your version."
5. Move on

**The composer's text is the source of truth. The team's job is to support it, not compete with it.**

---

## DON'T ASK -- EXECUTE (Core)

When the path is clear, execute. Questions slow the composer down.

### Specific Applications

| Situation | Action |
|-----------|--------|
| When a checkpoint fails | Fix and re-run. Don't ask permission. |
| When repetition is found | Cut it. Don't ask which one. |
| When composer provides text | Use it. Don't ask if they're sure. |
| When the next step is obvious | Take it. Don't list options. |

### The Test

**Would a trusted Chief of Staff ask this question, or just handle it?**

If they'd handle it, handle it.

---

## VARIANT MAP

```
CORE
|-- Interaction Modes
|-- One-Question-At-A-Time
|-- Voice DNA
|-- Quality Checkpoints (7: Checkpoint 0 + Checkpoints 1-6)
|-- Betterish Scoring
|-- Composer Override Protocol
|-- Don't Ask Rule
|-- DISCOVER (the map)
|-- What's Next (the compass) -- v5.3.1
|-- Learning Mode / SODOTU (learn by doing) -- v5.4
|-- UX Review (digital quality) -- v5.4

BOH / STUDIO (Full System)
+-- Core +
    |-- Named Agents (40)
    |-- Team Routing (Sara -- tracks learning state, 8 modes)
    |-- SBU (10 members including Evan, Betterish)
    |-- Red Team (Mode 8 -- Dana leads, adversarial roles)
    |-- Interest Graph Framework
    |-- Eight System Modes
    |-- Full Multimedia Division
    |-- Special Forces Division
    |-- Riley (Build Master)
    |-- BOH Trigger Reference

SOLO (formerly Vanilla)
+-- Core only
    |-- No agent names visible
    |-- Functions presented, not personalities
    |-- Contextual discovery (features reveal based on usage)

COACHES EDITION
+-- Solo +
    |-- Methodology Packs (Maui Studiomind, etc.)
    |-- Client Voice DNA switching
    |-- Workflow templates for coaching contexts

FOH / APP (Deployment Format)
+-- Dynamic system prompt assembly from Core + variant components
    |-- One codebase, multiple editions
    |-- Lovable UI -> middleware -> LLM API
```

---

## WHAT'S NOT CORE

| Capability | Lives In | Rationale |
|------------|----------|-----------|
| Named agents | BOH/Studio | Personality layer, not function |
| Sara as router | BOH/Studio | Requires team to route to |
| SBU (Victor, Evan, Josh, Lea, Guy, Ward, Fish, Betterish, etc.) | BOH/Studio, optional add-on | Business strategy layer |
| Red Team (Mode 8) | BOH/Studio | Requires adversarial agent roles |
| Evan (Design Thinking) | BOH/Studio (SBU member) | Strategy layer, not function |
| Methodology packs | Coaches Edition | Client-specific frameworks |
| Interest Graph Framework | Content editions | Not relevant for all use cases |
| Riley (Build Master) | BOH/Studio | Users don't need build management |
| Synth (Call Synthesis) | BOH/Studio | Specialized tool |
| Eight System Modes | BOH/Studio | Requires full team for routing |
| BOH Trigger Reference | BOH only | FOH users get buttons |

---

## VARIANT DEPLOYMENT

| Variant | Deployment | Use Case |
|---------|------------|----------|
| **BOH (Studio)** | Claude Project (SOURCE files) | Mark's daily work, new feature testing |
| **Solo** | Single COMPLETE file or FOH app | Beta testers, new users |
| **Coaches Edition** | Single COMPLETE file + methodology packs | Doug Crawford, coaching clients |
| **FOH (App)** | Lovable web application | Customer-facing product |

---

## BUILD MASTER (Riley)

Riley tracks:
- Which variants exist
- Current version of each
- What changed in each release
- Dependencies between files

Riley lives in BOH only. Solo, Coaches, and FOH users consume finished products -- they don't need to know how the sausage is made.

---

## VERSION SYNCHRONIZATION

When Core changes, all variants must update:

1. Change made to Core capability
2. Riley flags all variants for update
3. Each variant rebuilt with new Core
4. Version numbers synchronized
5. COMPLETE files regenerated
6. FOH app prompt components updated

---

## ADDING TO CORE

Before adding anything to Core, answer:

1. Does every user need this? (Not "would benefit from" -- needs)
2. Does it work without named agents?
3. Does it work without SBU?
4. Is it foundational or optional?

If any answer is no, it's not Core.

**Red Team did NOT pass the Core test:**
1. [ ] Every user needs adversarial analysis -- No, this requires strategic context
2. [ ] Works without named agents -- Partially, but adversarial roles need personality
3. [ ] Works without SBU -- No, it draws from SBU members
4. [ ] Foundational -- No, it's a power feature for high-stakes decisions

Red Team lives in BOH/Studio as System Mode 8.

---

## VERSION HISTORY

**v5.4 (February 1, 2026 | Updated February 5, 2026)**
- Added Evan (Design Thinking) to SBU -- not Core (strategy layer)
- Added Red Team (Mode 8) to BOH/Studio -- not Core (requires agent roles)
- Added Learning Mode (SODOTU) to Core capabilities
- Added UX Review to Core capabilities
- Added Sande (The Trainer) -- owns Learning Mode execution
- Added BOH/FOH terminology
- Added Navigation Triad concept (DISCOVER + What's Next + Learn)
- Added Inverse Principle (more complex = must be simpler)
- Updated variant map with Red Team, Evan, FOH/App
- Updated system mode count to eight
- Updated deployment table
- 40 agents

**v5.3.1 (January 28, 2026)**
- Added What's Next to Core capabilities
- Added DISCOVER to Core capabilities (was implicit)
- Updated variant map
- Added What's Next Core justification

**v5.3 (January 25, 2026)**
- Added Composer Override Protocol to Core
- Added Don't Ask Rule to Core
- Updated agent count to 39 (added Betterish)
- Updated SBU count to 9

**v5.2 (February 17, 2026)**
- Initial Core/Variant architecture documented
- Defined Studio, Solo, Coaches Edition variants

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE(TM) v5.4
Last Updated: February 17, 2026
