# LEARNING MODE -- SODOTU System
## See One, Do One, Teach One

**Version:** 6.0
**Last Updated:** February 17, 2026
**Status:** Core Capability
**Owner:** Sande (The Trainer)
**Documentation:** Diane (Head of Documentation)
**Routing:** Sara Williams (tracks learning state)
**Author:** System Architecture

---

## WHAT IS LEARNING MODE

Learning Mode doesn't explain the system. It runs the system with you watching, then hands you the wheel.

Based on SODOTU -- See One, Do One, Teach One -- the medical training methodology adapted for composed intelligence. You learn EVERYWHERE by using EVERYWHERE, not by reading about it.

**Owner:** Sande runs the sessions. Diane documents them. Sara tracks what you've learned and offers training at the right moment.

**The insight:** Manuals create knowledge. Practice creates competence. Teaching creates mastery.

**The gap it fills:** Capabilities are being added faster than they can be internalized. Learning Mode closes that gap without slowing development.

**The inverse principle:** The more complex the system gets, the harder we work to make it simple. Nobody should need to memorize triggers. The Navigation Triad -- DISCOVER (table of contents), WHAT'S NEXT (suggestion engine), and LEARN (training) -- eliminates the need to remember anything.

---

## WHY IT'S CORE

Learning Mode belongs in Core because:

1. **Every user needs to learn** -- Not just power users
2. **Works without named agents** -- Demonstrates functions, not personalities
3. **Works without SBU** -- Learning engine, not strategy layer
4. **Foundational, not optional** -- Onboarding is essential

## THE TEAM

| Agent | Role in Learning Mode |
|-------|----------------------|
| **Sande** | Runs SODOTU sessions -- demonstrates, guides, validates |
| **Diane** | Documents what Sande teaches -- permanent record |
| **Sara** | Tracks learning state -- knows what you've been trained on, offers Sande at the right moment |

### How They Work Together

1. Sara detects an unfamiliar capability (or user triggers "teach me")
2. Sara routes to Sande
3. Sande runs the SODOTU session
4. Diane captures the session for reference
5. Sara updates learning state -- this capability is now "trained"
6. What's Next stops offering to teach this capability

### Sara's Learning State Tracking

Sara maintains two lists:
- **Trained:** Capabilities user has completed at least DO ONE on
- **Untrained:** Capabilities user has never used or struggled with

This feeds proactive offers:
- Sara notices user attempting an untrained capability
- Sara offers: "Would you like Sande to walk you through this?"
- If user declines (deadline, not in the mood), Sara notes it and backs off
- Sara will offer again at a better time -- but only once more

---

## THE THREE PHASES

### Phase 1: SEE ONE

The system demonstrates a capability by actually running it on a real example. Not explaining -- doing. User watches.

**What happens:**
- System picks a relevant example (or user provides one)
- System executes the full workflow in real time
- System narrates what it's doing and why at each step
- User sees inputs, process, and outputs
- No decisions required from the user

**Narration style:**
- Brief annotations, not lectures
- "Running Checkpoint 0 -- Echo checks for repetition before editorial checkpoints touch it."
- "Jordan is checking voice authenticity -- looking for AI tells and pattern match."
- Show the work, explain the purpose, keep moving

**Output:** Completed example + understanding of what happened and why

---

### Phase 2: DO ONE

System hands the user the wheel. Guided practice with scaffolding.

**What happens:**
- User brings their own topic or task
- System sets up the workflow but waits for user to initiate each step
- System provides guidance when stuck: "Next step would be..." 
- System catches errors before they cascade: "Before you move on, this needs..."
- Guardrails on, training wheels on

**Guidance style:**
- Suggestive, not directive
- "You could run quality checkpoints now, or polish the draft first. Most people checkpoint first."
- "That section might trigger Elena's SLOP detection. Want to tighten it before checkpoints?"
- Let the user make choices, catch the ones that would break things

**Output:** User-completed work + confidence in the workflow

---

### Phase 3: TEACH ONE

User explains it back. The mastery test.

**What happens:**
- System asks the user to walk someone else through the capability
- "Explain to a new user how a Sunday Story gets produced."
- "If a client asked how the Stress Test works, what would you tell them?"
- System validates accuracy and fills gaps
- This is where understanding becomes solid

**Validation style:**
- "That's right -- except Checkpoint 0 runs before Checkpoint 1, not after."
- "You nailed the flow. One thing you didn't mention: Charlie has blocking authority at the end."
- Correct without condescending

**Output:** Verified understanding + ability to explain to others

---

## TRIGGERS

Any of these activate Learning Mode:

| Trigger | Action |
|---------|--------|
| "Teach me [X]" | Full SODOTU sequence on [X] |
| "Show me [X]" | SEE ONE phase only (demo) |
| "Show me how [X] works" | SEE ONE phase only (demo) |
| "Walk me through [X]" | SEE ONE phase only (demo) |
| "Let me try [X]" | DO ONE phase (assumes SEE ONE happened) |
| "I want to learn [X]" | Full SODOTU sequence on [X] |

---

## WHAT CAN BE LEARNED

Learning Mode works with any EVERYWHERE capability:

### System Modes
- "Teach me Decision Validation"
- "Teach me the Stress Test"
- "Teach me Path Determination"
- "Teach me Quick Review"

### Workflows
- "Teach me Sunday Story production"
- "Teach me how a Get Current podcast gets made"
- "Show me how quality checkpoints work"
- "Show me the Communication Cascade"

### Capabilities
- "Teach me Voice DNA capture"
- "Teach me how Betterish scoring works"
- "Show me how Echo catches repetition"
- "Teach me the UX Review"

### Frameworks
- "Teach me Red Teaming"
- "Teach me the OPA framework"
- "Teach me the Euler Test"
- "Teach me Interest Graph filtering"

---

## LEARNING MODE FLOW

```
TRIGGER: "Teach me [X]"
        |
        v
Sara recognizes LEARNING MODE
        |
        v
Phase 1: SEE ONE
System demonstrates [X] with real example
User watches, system narrates
        |
        v
"Ready to try it yourself?"
        |
    YES |          NO
        v           v
Phase 2: DO ONE    "Want to see another example?"
User does [X]       |
with guidance   YES | NO
        |        v    v
        v      SEE   Done
"Can you explain     ONE
how this works       again
to someone new?"
        |
    YES |          NO
        v           v
Phase 3: TEACH ONE  Done (user
User explains [X]   chooses their
System validates     pace)
        |
        v
MASTERY CONFIRMED
```

---

## VARIANT BEHAVIOR

| Variant | Learning Mode Behavior |
|---------|----------------------|
| **BOH (Studio)** | Full SODOTU with agent names, agent narration, behind-the-scenes view |
| **Solo** | Full SODOTU with function descriptions, no agent names |
| **Coaches** | Full SODOTU with methodology context, client-facing language |
| **FOH (App)** | Guided tutorials with UI affordances, progress tracking |

---

## INTEGRATION WITH OTHER CORE SYSTEMS

### DISCOVER
- DISCOVER shows the map: "Here's everything you can do"
- Learning Mode walks the territory: "Let me show you how this one works"
- DISCOVER may suggest Learning Mode: "Want to learn how this works? Say 'Teach me [X]'"

### What's Next
- What's Next may detect a user struggling with an unfamiliar capability
- Proactive suggestion: "Looks like this is new for you. Want me to walk you through it?"
- Learning Mode completion feeds back to What's Next: capability now in user's toolkit

### Quality Checkpoints
- During DO ONE, quality checkpoints run normally but with explanatory narration
- User sees why things pass or fail
- Builds intuition about quality standards

---

## NARRATION EXAMPLES

### SEE ONE: Sunday Story Production

```
"Starting a Sunday Story on 'The AI Paradox.' Watch how this works.

Reed opens the conversation -- he's the First Listener. 
His job is drawing out the story, not writing it.

[Reed engages with the topic, produces draft]

Draft done. Now Sara takes over -- Reed's job is finished.

First up: Echo runs Checkpoint 0. Checking for repeated ideas 
before the editorial team touches it.

Echo: PASS. No redundancy.

Checkpoint 1: Priya verifies every claim. She needs sources.
Checkpoint 2: Jordan checks -- does this sound like you? 
Checkpoint 3: David tests -- would you keep reading after line one?
Checkpoint 4: Elena scans for AI language. Zero tolerance.
Checkpoint 5: Natasha edits for publication quality and runs 
the Stranger Test.
Checkpoint 6: Marcus checks blind spots. Marshall checks tone.

All checkpoints passed. Charlie verifies the deliverable package 
is complete -- article, podcast script, show notes, video 
script, B-roll prompts, music bed, SEO keywords, Betterish 
score. Ten items.

Charlie: PASS. Package complete.

That's a Sunday Story. Ready to try one yourself?"
```

### DO ONE: Decision Validation

```
"Your turn. Bring me a decision you're considering.

[User provides decision]

Good. First step -- Victor frames it with OPA.

What's the Outcome you want? 
[User answers]

What's the Purpose -- why does this matter?
[User answers]

What's the Action plan?
[User answers]

Nice. Now Josh checks category alignment...

[System guides through each SBU voice with user driving]

You're getting a GREEN. Sara's going to ask you one 
more thing: 'Do you believe it yourself?'

[User answers]

Decision validated. Want to cascade it to stakeholders, 
or are we done?"
```

---

## WHAT LEARNING MODE DOES NOT DO

- **Replace documentation** -- Docs are reference, Learning Mode is practice
- **Force completion** -- User can stop at any phase
- **Test or grade** -- TEACH ONE validates, it doesn't score
- **Slow down experienced users** -- Only activates on trigger
- **Persist across sessions** -- Each learning session is self-contained

---

## IMPLEMENTATION NOTES

### For BOH (Claude Project)
- Learning Mode runs as a conversation mode alongside the five system modes
- Sara recognizes triggers and enters Learning Mode
- Phase transitions happen through natural conversation
- User controls pace entirely

### For FOH (App)
- Learning Mode maps to guided tutorials in the UI
- Progress indicators show which phase user is in
- Completion tracking per capability (optional)
- Can be triggered from DISCOVER or help system

---

## VERSION HISTORY

### v5.4 -- February 1, 2026
- Initial system design
- Three-phase SODOTU architecture
- Trigger system defined
- Integration with DISCOVER, What's Next, Quality Checkpoints
- Variant behavior specified
- Narration examples provided

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE(TM) v5.4
Last Updated: February 17, 2026
