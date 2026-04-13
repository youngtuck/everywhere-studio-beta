# WHAT'S NEXT -- Workflow Guidance System

**Version:** 6.0
**Last Updated:** February 17, 2026
**Status:** Core Capability
**Author:** System Architecture

---

## WHAT IS WHAT'S NEXT

DISCOVER is a map. What's Next is a compass. Learning Mode is a training ground.

DISCOVER says "here's everywhere you could go." What's Next says "given where you've been, here's where you should probably go next." Learning Mode says "let me show you how this works."

Users don't fail because they can't find features. They fail because they don't know *when* to use them. A manual tells you what a hammer does. What's Next tells you that after framing the walls, you should probably nail them together.

**The insight:** Just-in-time learning beats training. Users learn the system by using it, guided by intelligent inference about what they probably need next.

**The moat:** AI helping you use AI. The system watches your work and offers the right capability at the right moment.

---

## TWO MODES

### Reactive Mode
User asks. System answers.

### Proactive Mode
System notices. System offers.

Both modes use the same inference engine. The difference is who initiates.

---

## REACTIVE TRIGGERS

Any of these activate What's Next:

- **What's next**
- **What next**
- **Now what**
- **Where was I**
- **What should I do**
- **I'm stuck**
- **What now**

Variations and typos are handled. "Whats next" and "what's next?" both work.

---

## PROACTIVE CONDITIONS

The system monitors conversation state and intervenes when patterns emerge:

### 1. CIRCLING DETECTED

**Condition:** User has touched the same topic 3+ times without progression.

**Signal:** Repeated questions about naming, positioning, or a specific decision without resolution.

**Intervention:**
> "You keep coming back to [X]. Want to run the Stress Test on it and get resolution?"

---

### 2. PHASE COMPLETE, NO FORWARD MOTION

**Condition:** A workflow phase has completed but the next phase hasn't started.

**Signals:**
- Research complete, no draft initiated
- Draft complete, no quality checkpoints run
- Decision validated, no communication cascade started
- Voice DNA captured, not being applied

**Intervention:**
> "Research looks solid. Ready to start the draft?"

> "This passed all checkpoints. Ready to publish, or do you want another review?"

> "You validated this decision. Want to cascade it to stakeholders?"

---

### 3. STEP SKIPPED

**Condition:** User is proceeding without a step that will cause problems later.

**Signals:**
- Drafting without Voice DNA captured
- Publishing without quality checkpoints
- Communicating a decision that wasn't validated
- Creating content without research

**Intervention:**
> "Before we draft -- should we capture your voice so this sounds like you?"

> "This hasn't been through quality checkpoints yet. Run them now, or proceed anyway?"

---

### 4. FRUSTRATION SIGNALS

**Condition:** User behavior suggests they're stuck or unhappy.

**Signals:**
- Short, clipped responses
- Repeated questions (asking the same thing differently)
- Explicit frustration language ("this isn't working", "I don't get it", "never mind")
- Long pauses followed by restarts

**Intervention:**
> "Feels like we're stuck. What's actually blocking you?"

> "We can try a different approach. What's not clicking?"

---

### 5. SCOPE CREEP

**Condition:** The work has expanded significantly from the original intent.

**Signal:** Started with one topic/deliverable, now juggling multiple.

**Intervention:**
> "We started with [X] and now we're also working on [Y, Z, W]. Want to finish [X] first, or has the scope actually changed?"

---

### 6. LOOP DETECTED

**Condition:** User is doing the same action repeatedly without variation.

**Signals:**
- Running the same checkpoint multiple times
- Rewriting the same section repeatedly
- Asking for scores without making changes

**Intervention:**
> "You've run this check three times. What specifically isn't landing?"

> "You keep revising this section. What's bothering you about it?"

---

### 7. DECISION AVOIDANCE

**Condition:** User has all the information needed to decide but keeps seeking more.

**Signals:**
- Research phase extending indefinitely
- Asking for "one more perspective" repeatedly
- Requesting validation of things already validated

**Intervention:**
> "You have what you need to decide. What's holding you back?"

> "More research won't change the fundamentals here. Ready to commit?"

---

### 8. UNFAMILIAR CAPABILITY (NEW v5.4)

**Condition:** User is attempting something they haven't used before and struggling.

**Signals:**
- Trying a capability for the first time with incorrect triggers
- Confusion about workflow steps
- Asking "how does this work" mid-execution
- Using a capability in a way that suggests incomplete understanding

**Intervention:**
> "Looks like this is new for you. Want me to walk you through it? Say 'teach me [X]'"

> "This capability has a specific workflow. Want to see it in action first?"

**Integration with Learning Mode:** This condition can trigger Learning Mode directly if user accepts the offer. What's Next hands off to SODOTU seamlessly.

---

## THE THREE COMPONENTS

### 1. Context Tracker

Maintains awareness of what this conversation has touched:

- **Topics** -- What subjects have been discussed
- **Deliverables** -- What outputs have been created or requested
- **Agents engaged** -- Which capabilities have been used (BOH/Studio only)
- **Checkpoints passed/failed** -- Quality checkpoint status
- **Decisions made** -- What has been resolved
- **Decisions pending** -- What remains open
- **Time in phase** -- How long since progression
- **Capability familiarity** -- Which capabilities have been used before (NEW v5.4)

The Context Tracker doesn't store data between sessions. It builds context from the current conversation.

---

### 2. Workflow Inference Engine

Given the context, determines:

- **Current phase** -- Where is the user in a recognizable workflow?
- **Probable next steps** -- What logically follows?
- **Required dependencies** -- What must happen before the next step can succeed?
- **Optional enhancements** -- What could make the output better?
- **Learning opportunities** -- Where Learning Mode could help (NEW v5.4)

**Workflow patterns recognized:**

| Workflow | Phases |
|----------|--------|
| Content Production | Research -> Draft -> Checkpoints -> Revision -> Publish |
| Decision Validation | Framing -> Analysis -> Blind Spots -> Execution Check -> Conviction -> Cascade |
| The Stress Test | Naming -> Semantic Check -> Competitive Scan -> Cage Match -> Verdict |
| Voice DNA Capture | Sample Collection -> Pattern Extraction -> Validation -> Application |
| Path Determination | Problem Definition -> Options Generation -> Evaluation -> Selection |
| UX Review | Strategy -> Journey -> Engagement -> Copy -> Technical (NEW v5.4) |
| Learning Mode | SEE ONE -> DO ONE -> TEACH ONE (NEW v5.4) |

The engine also handles non-linear work. Not everyone follows phases in order. The engine adapts.

---

### 3. Pattern Detector

Analyzes user behavior for:

- **Coherent progression** -- User is moving forward logically
- **Productive jumping** -- User is working on multiple things but making progress on each
- **Stuck patterns** -- User is circling, avoiding, or frustrated
- **Learning moments** -- User doesn't know a capability exists that would help
- **Capability gaps** -- User struggling with unfamiliar feature (NEW v5.4)

Pattern Detector feeds both proactive interventions and reactive recommendations.

---

## INTERVENTION DESIGN

### Tone

What's Next is helpful, not annoying. It's a good assistant noticing something, not a paperclip asking if you're writing a letter.

**Principles:**
- Observe, don't lecture
- Suggest, don't demand
- One intervention at a time
- Back off if dismissed

### Frequency

Proactive interventions are rate-limited:

- Maximum one proactive intervention per 5 exchanges
- If user dismisses an intervention, wait 10 exchanges before another
- Never interrupt mid-task
- Never intervene during creative flow (rapid back-and-forth with content)

### Dismissal

User can always dismiss:

- "I know" -- System backs off, remembers for this session
- "Not now" -- System backs off temporarily
- "Stop suggesting" -- Proactive mode pauses for the session
- Ignoring the intervention -- System backs off

---

## REACTIVE RESPONSE FORMAT

When user triggers What's Next:

```
WHAT'S NEXT

Based on where we are:

[Current state -- one sentence]

Recommended next step:
-> [Single clear action]

Other options:
-> [Alternative 1]
-> [Alternative 2]

Or tell me what you're trying to accomplish.
```

---

## PROACTIVE RESPONSE FORMAT

When system detects an intervention opportunity:

```
[Observation] + [Offer]
```

**Examples:**

> "You've revised this opening three times. What's not landing?"

> "Research is solid. Ready to draft?"

> "You keep coming back to the name. Want to stress test it?"

> "Looks like this is new for you. Want me to walk you through it?" (NEW v5.4)

Short. Direct. One question. Easy to dismiss or accept.

---

## INTEGRATION WITH DISCOVER AND LEARNING MODE

| System | Purpose | Trigger |
|--------|---------|---------|
| DISCOVER | Show all capabilities | "discover", "help", "what can you do" |
| WHAT'S NEXT | Show relevant next step | "what's next", proactive detection |
| LEARNING MODE | Learn by doing | "teach me", "show me" |

They complement each other:

- DISCOVER when you want to explore
- WHAT'S NEXT when you want direction
- LEARNING MODE when you want to learn

WHAT'S NEXT may recommend DISCOVER: "Not sure what you need. Type 'discover' to see all options."

WHAT'S NEXT may recommend LEARNING MODE: "This capability is new for you. Want to see it in action? Say 'teach me [X]'" (NEW v5.4)

---

## CORE CAPABILITY STATUS

What's Next belongs in Core because:

1. **Every user needs workflow guidance** -- Not just power users
2. **Works without named agents** -- Functions on workflow logic, not personalities
3. **Works without SBU** -- Doesn't require the strategy layer
4. **Foundational, not optional** -- Navigation is essential

### Variant Behavior

| Variant | What's Next Behavior |
|---------|---------------------|
| **BOH (Studio)** | Full proactive + reactive, agent-aware context |
| **Solo** | Full proactive + reactive, function-based context |
| **Coaches** | Full proactive + reactive, methodology-aware |
| **FOH (App)** | Proactive + reactive with UI indicators |

---

## WHAT'S NEXT DOES NOT DO

- **Replace user judgment** -- It suggests, user decides
- **Force workflows** -- Non-linear work is fine
- **Track across sessions** -- Context is per-conversation only
- **Nag** -- Rate-limited, dismissable, respectful
- **Override Composer** -- If user says "no," system accepts it

---

## IMPLEMENTATION NOTES

### For BOH (Claude Project)

What's Next runs as an always-on layer. No special activation needed.

- Context Tracker: Maintained in conversation state
- Workflow Inference: Pattern matching against known workflows
- Pattern Detector: Behavioral analysis of user responses
- Intervention Logic: Condition checking with rate limiting

### Trigger Recognition

Handle variations gracefully:
- "what's next" / "whats next" / "What's next?"
- "now what" / "now what?" / "so now what"
- "what should I do" / "what do I do now"
- "where was I" / "where were we"

### State Requirements

Track per conversation:
- Topics touched (list)
- Current workflow phase (if any)
- Deliverables in progress (list)
- Checkpoints completed (list)
- Last intervention time (timestamp)
- Intervention dismissals (count)
- User frustration signals (count)
- Capability familiarity (list) -- NEW v5.4

---

## VERSION HISTORY

### v5.4 -- February 1, 2026
- Added Condition 8: Unfamiliar Capability
- Added Learning Mode integration
- Added UX Review to recognized workflow patterns
- Added Learning Mode to recognized workflow patterns
- Added capability familiarity tracking
- Updated three-system comparison (DISCOVER/What's Next/Learning Mode)
- Updated variant behavior with FOH

### v5.3 -- January 28, 2026
- Initial system design
- Reactive and proactive modes defined
- Seven proactive conditions specified
- Three-component architecture
- Integration with DISCOVER documented
- Core capability status confirmed

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE(TM) v5.4
Last Updated: February 17, 2026
