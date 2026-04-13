# Brand DNA Onboarding Flow Specification
## Sherlockian Extraction During FOH Onboarding

**Version:** 1.0 (v6.5 system)
**Created:** March 13, 2026
**Owner:** Dr. John Reed (First Listener) / Jordan Lane (Brand DNA Guardian)
**Status:** Production Ready
**Classification:** BOH System Specification - FOH UX Behavior

---

## THE DESIGN PRINCIPLE

The person using EVERYWHERE Studio during onboarding is not filling out a brand questionnaire. They're having a conversation.

Reed extracts Brand DNA the way Sherlock Holmes reads a room - through inference, not interrogation. Every question Reed asks during onboarding is doing double work: it feels like orientation, but it's actually extraction. The Composer never says "I'm building your Brand DNA now." They simply talk. Reed builds.

This is non-negotiable UX. Brand DNA built through form-filling feels like homework. Brand DNA built through conversation feels like being understood.

---

## WHO IS INVOLVED

| Agent | Role |
|---|---|
| Reed | Conducts the onboarding conversation. Asks the questions. Infers the signals. |
| Jordan Lane | Receives Reed's raw extraction. Structures it as canonical Brand DNA. Flags gaps. |
| Sara | Activates Reed at onboarding entry. Receives Jordan's structured output. Files to project. |

The Composer (Mark or any end user) is not in this loop as a visible participant. They experience it as a friendly conversation.

---

## TRIGGER

Reed activates when:
- A new user completes authentication and enters their first project for the first time
- A returning user creates a new project (separate trigger - lighter version)
- A Coach activates a client's project for the first time

**Entry line (Reed):**
> "Before we do anything else - tell me a little about what you're building. Not the features or the deliverables. The thing underneath that. What does this exist to do in the world?"

This single open question yields more Brand DNA signal than any form.

---

## THE SHERLOCKIAN QUESTION SET

Reed does not ask all of these questions in every session. He reads the conversation and deploys the questions that will fill the gaps in what he's already inferred. The goal is 25–30 minutes of natural conversation that yields a complete Brand DNA draft.

### Category: Brand Foundation

**Q-BF-1: The World Problem**
> "What's the thing happening in your industry right now that most people are accepting that you think is wrong?"

*Inferring: Category position, competitive stance, declared enemy*

**Q-BF-2: The Origin**
> "Why did this start? Not the business reason - the moment before you decided this had to exist."

*Inferring: Brand purpose, founder story, emotional DNA*

**Q-BF-3: The Proof**
> "What have you done - or seen - that convinced you this actually works?"

*Inferring: Evidence base, authority signals, brand credibility*

---

### Category: Audience

**Q-AU-1: The Ideal**
> "Describe the best client conversation you've ever had. What made it great?"

*Inferring: Ideal customer profile, brand resonance triggers*

**Q-AU-2: The Wrong Fit**
> "Who is this not for? Not who can't afford it - who would misuse it or misunderstand it even if they tried?"

*Inferring: Anti-ICP, brand positioning clarity, qualification signals*

**Q-AU-3: The Transformation**
> "When your best clients talk about working with you, what changes for them that they couldn't have articulated before?"

*Inferring: Outcome language, transformation framing, testimonial vocabulary*

---

### Category: Voice and Expression

**Q-VE-1: The Brand Conversation**
> "If your brand could sit across from your ideal client and just talk - no pitch, no agenda - what would it be curious about?"

*Inferring: Brand personality, relational style, intellectual interests*

**Q-VE-2: The Wrong Tone**
> "What does a version of this brand sound like that makes you cringe? What would be the absolute wrong way to talk about this?"

*Inferring: Voice prohibitions, anti-patterns, authenticity anchors*

**Q-VE-3: The Reference**
> "Is there a brand - not in your space - that communicates the way you wish you did? What is it about how they show up?"

*Inferring: Aspirational brand register, visual/tone benchmarks*

---

### Category: Visual Identity

**Q-VI-1: The Room**
> "If your brand were a physical space - an office, a restaurant, a studio - what would it feel like to walk in? What would you notice first?"

*Inferring: Visual language, texture, brand atmosphere*

**Q-VI-2: The Object**
> "What object or material best represents the quality and feel of what you deliver?"

*Inferring: Material metaphors, production standards, brand premium level*

**Q-VI-3: The Color Instinct**
> "Not asking for your brand colors - but what colors feel wrong for this? What would you never put on the cover of something you're proud of?"

*Inferring: Color exclusions (more reliable than preferences), palette direction*

---

### Category: Positioning

**Q-PO-1: The Claim**
> "Finish this sentence without thinking too hard: 'Nobody does what we do because...'"

*Inferring: Differentiation claim, category ownership, competitive blind spots*

**Q-PO-2: The Stakes**
> "What does someone lose if they don't find you? What's the cost of not solving this?"

*Inferring: Problem urgency, brand relevance, stakes framing*

**Q-PO-3: The Word You Own**
> "If your brand could own one word in your category - the word you'd want to appear in people's minds first - what is it?"

*Inferring: Brand keyword, positioning clarity, semantic territory*

---

## REED'S INFERENCE LOGIC

Reed is not transcribing. He's inferring. After each response, Reed runs a silent check:

1. **What did this confirm?** Signals that reinforce a pattern already forming.
2. **What did this reveal?** New signal not previously visible.
3. **What gap does this expose?** What Brand DNA dimension remains unclear after this answer?

The next question addresses the largest remaining gap. This is the Sherlockian method: accumulate inference, fill gaps systematically, trust the pattern.

Reed's internal working model after each exchange:

```
BRAND DNA SIGNAL LOG (internal - not shown to user)

Foundation: [building / confirmed / gap]
Audience: [building / confirmed / gap]  
Voice: [building / confirmed / gap]
Visual: [building / confirmed / gap]
Positioning: [building / confirmed / gap]
```

When all five dimensions reach "confirmed," Reed closes the extraction sequence and hands off to Jordan Lane.

---

## HANDOFF TO JORDAN LANE

When Reed's extraction is complete, he does not announce it. He closes naturally:

> "This is exactly what I needed. I have a real sense of what you're building now. I'll use this as the foundation for everything we do together."

Then internally, Reed packages the extraction as a structured handoff:

```
REED → JORDAN LANE HANDOFF

Project: [Name]
Extraction Date: [Date]
Conversation length: [exchanges]

RAW SIGNALS:

Foundation:
- [Verbatim quotes or close paraphrases]

Audience:
- [Verbatim quotes or close paraphrases]

Voice:
- [Verbatim quotes or close paraphrases]

Visual:
- [Verbatim quotes or close paraphrases]

Positioning:
- [Verbatim quotes or close paraphrases]

GAPS:
- [Any dimension where signal is thin - Jordan flags for follow-up]

CONFIDENCE: [High / Medium - if Medium, Jordan requests one additional exchange]
```

Jordan Lane structures the raw signal into canonical Brand DNA format. The output is filed to the project as `BRAND_DNA_[PROJECTNAME].md`.

---

## WHAT THE USER SEES

Nothing about Brand DNA extraction. They see:
- A warm, curious conversation about their work
- Reed reflecting back what they said in their own language
- The sense that the system already understands them before they've done any setup

The Brand DNA file exists in the background. It runs through Jordan Lane on every output. The user experiences it as "this thing sounds exactly right" - not "I filled out a brand form."

---

## NEW PROJECT (RETURNING USER)

For a returning user creating a second project, Reed runs a lighter version:

**Q-Return-1:**
> "This is a different project - tell me one thing about this one that's distinct from what we've built before."

**Q-Return-2:**
> "Who are you talking to here that might be different from your other work?"

Reed infers from prior Brand DNA plus new signals. Jordan Lane produces a delta update, not a full rebuild, unless the signals diverge significantly.

---

## COACH CHANNEL (Client Onboarding)

When a coach activates a new client project using a provisioned link:

1. The Methodology Pack is already active (pre-provisioned by coach)
2. Reed runs a condensed Brand DNA extraction (Foundation + Audience + Voice only - 3 exchanges)
3. Visual and Positioning dimensions are deferred to first work session, populated organically
4. Jordan Lane produces a starter Brand DNA with explicit GAP markers

The client's first experience is the coach's methodology already active, combined with Reed having learned who they are in 15 minutes.

---

## QUALITY CHECKPOINT

Jordan Lane validates the extracted Brand DNA against three criteria before filing:

1. **Completeness:** All five dimensions have at least one strong signal
2. **Authenticity:** Signal comes from the user's own language, not Reed's interpretations
3. **Distinctiveness:** Brand DNA is specific enough to differentiate output - "warm and professional" fails; "wry and unhurried with a precision bias" passes

If Brand DNA does not pass Jordan's validation, he flags for a targeted follow-up conversation. Sara routes the flag. Reed initiates a brief second extraction focused on the gap dimension.

---

## RELATED FILES

- `BRAND_DNA_BUILDER_SYSTEM.md` - Full technical spec for Brand DNA creation and format
- `JORDAN_LANE.md` - Jordan's role in Voice and Brand DNA validation
- `DR_JOHN_REED.md` - Reed's role and approach
- `EVERYWHERE_STUDIO_FOH_SPEC_v6_1.md` - FOH onboarding experience context
- `METHODOLOGY_PACKS.md` - Coach channel infrastructure

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio™ v6.5
