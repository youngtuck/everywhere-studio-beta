# Voice DNA™
## Extraction & Profile System

**Version:** 6.5  
**Last Updated:** March 12, 2026  
**Owner:** Jordan Lane (Voice DNA Guardian)  
**Status:** Production

---

## WHAT THIS FILE IS

This is the master control file for Voice DNA extraction and profile generation. It lives in the EVERYWHERE core system and governs how any user's voice profile gets created, stored, and evolved.

**This file:** System architecture, methodology, quality checkpoints  
**User files:** VOICE_DNA_[NAME].md - one per user, grows over time

---

## THE THREE-LAYER MODEL

Voice DNA captures three distinct layers:

### Layer 1: Voice Markers
**Source:** Writing samples, conversation history, dictation archives  
**Captures:** HOW they communicate

| Marker Type | What We Extract |
|-------------|-----------------|
| Sentence length | Average, modal, range |
| Contraction frequency | Percentage and patterns |
| Signature phrases | Recurring openers, transitions, closers |
| Prohibited language | AI-typical words they never use |
| Punctuation patterns | Em-dashes, ellipses, exclamation points |
| Paragraph rhythm | Length, white space usage |
| **Stop word patterns** | Function word fingerprint (see Layer 1.5 below) |
| **Linguistic variance** | Perplexity baseline - how unpredictable their word choice is |

### Layer 1.5: Subconscious Markers (NEW v6.5)
**Source:** Writing samples (minimum 2,000 words for reliable extraction)  
**Captures:** The deepest fingerprint - patterns the writer never consciously chose

This layer is built on stylometric research showing that function words (articles, pronouns, prepositions) are more reliable identity markers than vocabulary or topic. Writers focus on meaning; subconscious fills in the connective tissue. That connective tissue is unique.

| Marker Type | What We Extract | Why It Matters |
|-------------|-----------------|----------------|
| **Pronoun preference** | I vs. you vs. we dominance; ratio across contexts | Signals authority stance and reader relationship |
| **Article ratio** | "a" vs. "the" preference patterns | Reveals how they introduce vs. reference ideas |
| **Preposition habits** | Which prepositions they default to ("in," "on," "within," "through") | Subconscious spatial/relational framing |
| **Conjunction patterns** | "and" vs. "but" vs. "so" as sentence openers | Shows how they connect logic chains |
| **Sentence-opening words** | Most frequent first words across the corpus | Deeply habitual, rarely varies between writers |
| **Linguistic variance score** | Perplexity baseline - diversity and unpredictability of word choice | Humans are 2x more varied than AI; output must match |

#### Linguistic Variance Standard (v6.5)
Research benchmark: human writing is approximately 2× more linguistically varied than AI output. EVERYWHERE must match the **composer's variance baseline**, not a generic human average.

**Extraction method:**
1. Analyze corpus for vocabulary diversity (type-token ratio)
2. Measure sentence structure variation (not just length - pattern variation)
3. Score predictability of word sequences
4. Establish composer's personal variance range (low/medium/high)
5. Store as variance profile: `{baseline: "medium-high", range: "wide", tolerance: "+/- 15%"}`

**Application:** Byron Chase references the variance profile during humanization. Jordan validates against it at Checkpoint 2. Output that is too *consistent* fails - even if it passes all vocabulary checks.

### Layer 2: Value Markers
**Source:** Stated beliefs, decision patterns, content themes  
**Captures:** WHO they are

| Marker Type | What We Extract |
|-------------|-----------------|
| Core declarations | 3-5 foundational beliefs |
| Decision principles | How they choose |
| Non-negotiables | Lines they won't cross |
| Recurring themes | Topics they return to |
| Worldview architecture | How they see systems |

### Layer 3: Personality Markers
**Source:** Assessment results, behavioral patterns  
**Captures:** HOW they process and relate

| Marker Type | What We Extract |
|-------------|-----------------|
| Communication style | Direct vs. indirect, warm vs. cool |
| Processing mode | Visual, verbal, kinesthetic |
| Authority stance | Peer, expert, guide, coach |
| Energy sources | What topics light them up |
| Context variations | How voice shifts by situation |

---

## DUAL-MODE DETECTION

Most people have two voices: public-facing and operational. The system detects and captures both.

### Content Mode (Public)
**When:** Podcasts, articles, newsletters, books, social posts, video scripts  
**Characteristics:**
- Longer sentences (12-18 words average)
- High contraction frequency (85%+)
- Story-driven, warm, inviting
- Proper transitions between ideas
- Every line earns its place

### Operations Mode (Internal)
**When:** Tasks, briefs, emails to team, quick decisions, working sessions  
**Characteristics:**
- Variable sentence length (3-30 words)
- Lower contraction frequency (20-40%)
- Efficient, assumes shared context
- Minimal transitions
- Outcome-dominant

### Mode Detection Logic

```
IF output_type IN [podcast, article, newsletter, book, social_post, video_script]:
    LOAD: Content_Mode_Profile

ELIF output_type IN [brief, prompt, task, email_to_team, system_instruction]:
    LOAD: Operations_Mode_Profile

ELIF audience == "external":
    LOAD: Content_Mode_Profile

ELIF audience == "internal":
    LOAD: Operations_Mode_Profile

ELSE:
    DEFAULT: Operations_Mode_Profile
    CONFIRM: "Using operational voice. Switch to content mode? [y/n]"
```

---

## SOURCE TYPES

Voice DNA accepts four source types:

### 1. Writing Samples
- Substack posts (via URL scrape)
- Uploaded documents (.md, .txt, .pdf)
- Pasted text
- Platform URLs (LinkedIn, Medium, blog)

### 2. Interview
- Conversational Q&A through the app
- Round 1: Communication patterns
- Round 2: Decision and values
- Exploration: Deep-dive questions

### 3. Voice History
- Dictation archives (Wispr Flow, Otter, etc.)
- Paste field for raw transcription
- Captures operational voice patterns

### 4. Manual Additions
- User can paste anything into their profile
- System re-analyzes combined corpus
- Profile grows over time

---

## EXTRACTION PIPELINE

### Stage 1: Ingest
- Collect all sources
- Normalize text (strip formatting artifacts)
- Tag source type (written, spoken, interview)

### Stage 2: Analyze
- Layer 1: Linguistic pattern extraction
- **Layer 1.5: Subconscious marker extraction** (stop words, pronoun ratios, variance baseline)
- Layer 2: Value/belief identification
- Layer 3: Personality marker detection
- Dual-mode separation (content vs operations)

### Stage 3: Synthesize
- Merge patterns across sources
- Resolve conflicts (recent > old, spoken > written for operations mode)
- Generate profile markdown

### Stage 4: Validate
- Authenticity check (would they say this?)
- Prohibited language scan
- Completeness check (all sections populated)

### Stage 5: Deliver
- Generate VOICE_DNA_[NAME].md
- Store in user record
- Enable Return & Enhance

---

## OUTPUT FORMAT

Every user profile follows this structure:

```markdown
# Voice DNA™ Profile

## [NAME]

Generated: [DATE]
Version: [N]
Sources: [LIST]

---

## HOW TO USE THIS

Paste this entire document into Claude, ChatGPT, or any AI 
as a system prompt or project file. It will write in your voice.

---

## YOUR VOICE

### When You Speak
[Spoken patterns from interview/dictation]

### When You Write
[Written patterns from samples]

### Signature Phrases
[Recurring expressions]

### Words to Avoid
[Prohibited language]

### Subconscious Fingerprint
**Pronoun dominance:** [I / you / we - with ratio]  
**Article preference:** [a-dominant / the-dominant / balanced]  
**Sentence openers:** [Top 5 most frequent first words]  
**Conjunction style:** [How they chain logic - and/but/so patterns]  
**Variance profile:** [Low / Medium / High - with tolerance range]

---

## YOUR TOPICS

### What You're Known For
[Territory/expertise]

### Recurring Themes
[Core ideas they return to]

### Where You Draw From
[Metaphor domains]

---

## YOUR STYLE

**Structure:** [Build-up / Punchline / Layered]
**Evidence:** [Stories / Data / Both]
**Reader Relationship:** [Peer / Teacher / Guide]
**Density:** [Sparse / Dense]
**Tone:** [Provocative / Warm / Direct]

---

## DUAL-MODE PROFILES

### Content Mode
[Public-facing voice characteristics]

### Operations Mode
[Internal/working voice characteristics]

---

## CORE ATTRIBUTES

[5-7 defining characteristics with examples]

---

## TRAINING INSTRUCTIONS

### DO:
[Positive patterns to follow]

### DON'T:
[Anti-patterns to avoid]

---

## CALIBRATION TEST

[Example of correct vs incorrect AI response]

---

## VERSION HISTORY

| Version | Date | Sources Added |
|---------|------|---------------|
| 1 | [DATE] | Initial extraction |
| 2 | [DATE] | Added [SOURCE] |

---

## ABOUT THIS PROFILE

This Voice DNA was created through Voice Collaboration™ - 
a combination of conversational interview, writing sample analysis,
and voice history extraction.

Want the full orchestra? EVERYWHERE™ is 40+ AI agents that 
write, research, and publish in your voice across every format.

---

*Voice DNA™ by EVERYWHERE™*
*© 2026 Mixed Grill, LLC*
```

---

## QUALITY GATES

### Checkpoint 1: Source Quality
- Minimum 1,000 words of written content OR completed interview
- Content is actually by the user (not AI-generated)
- Recent enough to reflect current voice (prefer < 2 years)

### Checkpoint 2: Extraction Completeness
- All three layers populated (including Layer 1.5)
- Both modes detected (or confirmed single-mode user)
- Signature phrases identified
- Prohibited language catalogued
- **Subconscious fingerprint extracted** (pronoun ratio, article preference, variance baseline)
- **Variance profile established** (required for Byron Chase calibration)

### Checkpoint 3: Authenticity
- Sample outputs pass "would they say this?" test
- No AI-typical language in profile
- Voice markers match across sources

### Checkpoint 4: Usability
- Profile works as system prompt
- Calibration test shows clear correct/incorrect
- Training instructions are actionable

---

## RETURN & ENHANCE

Users can return and add sources without starting over.

### How It Works
1. User enters email → system checks for existing profile
2. If found: "Welcome back. Add to your Voice DNA or start fresh?"
3. Add: New submission links to previous, carries forward all data
4. System re-analyzes combined corpus
5. New version generated, version number increments

### What Gets Preserved
- All previous interview answers
- All previous writing sample analysis
- All previous voice history analysis
- Version chain (links to previous_version_id)

### What Gets Updated
- Combined analysis across all sources
- Recency weighting (newer sources weighted higher)
- Version number and timestamp

---

## USER FILE GROWTH

User profiles are living documents:

```
Version 1: Initial extraction (interview only)
Version 2: Added Substack posts
Version 3: Added Wispr archive
Version 4: Added recent newsletter samples
```

Each version addition appends to VERSION HISTORY and refines the profile.

---

## INTEGRATION WITH EVERYWHERE

Voice DNA profiles are consumed by:

- **All agents:** Use voice profile for output generation
- **Jordan Lane:** Validates voice consistency across outputs
- **Byron Chase:** Humanization editing references profile
- **Quality Checkpoints:** Check output against profile markers

### Loading a Profile

```
LOAD: VOICE_DNA_[CLIENT_NAME].md
APPLY: All output uses client voice
VALIDATE: Jordan checks every deliverable
```

---

## FILES IN THIS SYSTEM

| File | Purpose | Location |
|------|---------|----------|
| VOICE_DNA.md | This file - master control | EVERYWHERE Core |
| VOICE_DNA_[NAME].md | User profiles | Per-user, grows over time |

### Retired Files
- VOICE_DNA_SYSTEM.md → absorbed here
- VOICE_DNA_2_0_ENHANCEMENT.md → absorbed here

---

© 2026 Mixed Grill, LLC  
EVERYWHERE™ v6.5  
Last Updated: March 12, 2026
