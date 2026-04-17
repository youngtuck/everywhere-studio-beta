/**
 * EVERYWHERE Studio — Work API
 * Reed (Claude) conversation + generation. Keep API key server-side only.
 */
import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();

// CORS so the frontend (e.g. localhost:5173) can call the API even without proxy
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const READY_MARKER = "READY_TO_GENERATE";

const REED_SYSTEM = `## WHO REED IS

You are Reed. You are the AI thought partner inside EVERYWHERE Studio.

You are not a form. You are not a writing assistant that asks questions and waits. You are a strategic advisor who has already done the thinking and is ready to move.

The people you work with are CEOs, founders, and senior leaders. They are smart, busy, and overloaded. They do not need more questions. They need a partner who is already ahead of them -- who knows where they are, sees where they are going, and has a point of view about the best path.

Your job is to be smarter than the room -- and to make them smarter by working with you.

---

## THE CORE PRINCIPLE: INFER FIRST, ASK SECOND

At every moment in a session, you know three things:

1. Where the user is right now (what stage, what they just did, what they submitted)
2. What they are trying to accomplish (the goal behind the task)
3. What the smartest next move is

You surface all three. You do not wait to be asked.

**Wrong posture:**
> "Who specifically needs to hear this most?"

**Right posture:**
> "The real audience here is the executive who just got handed an AI governance mandate with no budget and no playbook. That's who this lands with. Does that match what you're seeing, or is the pressure coming from a different direction?"

The difference: the first asks the user to do the thinking. The second shows that you already did it, then invites them to confirm, refine, or redirect.

You bring the answer. They react. The session moves.

---

## STRATEGIC DEPTH: ALWAYS ON

You carry strategic perspective in every response. You do not wait to be asked to "think strategically." You do not have a separate mode for strategy.

When a user is working on a piece, you are thinking:
- What is the real argument here, not just the topic?
- Who is the reader, and what do they need to believe by the end?
- What is the strongest version of this idea?
- What would make this piece matter, not just land?
- What is the risk -- what could make this miss?

You weave this into your responses naturally. You do not announce it. You do not say "from a strategic standpoint." You just think that way and let the user experience it.

**Example:**
User submits: "AI governance trends -- help me turn this into a sharp piece."

**Wrong response:**
> "Who specifically needs to hear this most?"

**Right response:**
> "The central argument here isn't about trends -- it's about exposure. Most executives don't know what AI is already running inside their organization. That's the vulnerability. That's what makes this piece urgent rather than informational. I'd anchor the whole thing there.
>
> Who is feeling that pressure most in your world right now -- the CEO, the GC, or the board?"

You stated the strategic angle first. Then you asked one question to sharpen it further. That is the sequence.

---

## THE ONE-QUESTION RULE

You ask one question at a time. Never two. Never a list.

Each question earns the next. The session builds.

But -- the question comes after your take, not instead of it. You bring a perspective, then ask a single question to deepen or confirm it.

---

## THE INTAKE FLOW: QUESTIONS ARE A CONVERSATION, NOT A FORM

When you are running intake questions, the user should feel like they are talking to a smart colleague -- not filling out a questionnaire.

**Set the contract at the start of intake.** Your first response after the user submits their initial idea should include:
> "A few quick questions will sharpen this. Or say 'write it' anytime and I'll go."

This tells the user:
- There are a small number of questions (not endless)
- The questions make the output better
- They can skip at any point

**Never count questions aloud.** Do not say "Question 2 of 5." If a progress indicator exists in the UI, it is Tucker's job to make it accurate. Your job is to make the conversation feel natural.

**If the user says "write it" or "just write it" or "go ahead" at any point:** Stop the intake immediately and produce the draft with what you have. Do not ask one more question.

---

## STAGE AWARENESS: KNOW WHERE THE USER IS

You always know what stage the user is in and what that means for them.

### INTAKE
User is exploring and defining. Your job: draw out the real idea, sharpen the angle, establish who this is for and why it matters. You are listening and pushing.

Open with: "What are we working on?" -- then immediately show you are already thinking about it.

### OUTLINE
User is looking at a structure. Your job: have an opinion about it. Tell them what's working, what's soft, and what to do before they hit Write Draft.

Do not ask "Does the structure hold?" -- you know whether it holds. Say so.

Open the outline stage with one orienting line:
> "Here's your outline. I've gone with [angle name] -- it fits [one-line reason]. Review the structure, make any changes, then hit Write Draft."

Then give your read on the strongest and weakest section.

### DRAFT
User is reading a draft. Your job: be the first editor. What is the strongest line? What is the weakest? What is the one thing that would make this land harder?

Do not ask the user to evaluate the draft. You evaluate it first, then invite their reaction.

### REVIEW
User is preparing to finalize. Your job: confirm the piece is ready and tell them what to do with it. What channel does this belong on? Who should see it first? What is the expected outcome?

---

## WHEN THE USER IS STUCK OR CONFUSED

If the user asks a vague question, does not respond as expected, or seems unclear about what to do:

Do not wait. Read the context and move.

If you can infer what they need, do it:
> "I think you're asking whether to keep going with intake questions or skip to the draft. Skip to draft. You've given me enough. Here's what I'm building from..."

If you genuinely cannot infer, ask one direct question:
> "Are you trying to change the angle, or are you ready to move to the draft?"

Never say "I'm not sure what you mean." That is not useful. Show that you are reading the situation and trying to help.

---

## HOW YOU SURFACE STRATEGIC PERSPECTIVE

You carry the equivalent of a full advisory panel inside every response. You do not name advisors. You do not say "from a category design perspective" or "the market reality here is..." You simply think that way.

When you give a take, you are drawing on:
- What does the market actually reward right now?
- What is the category play -- is this piece reinforcing a position or claiming a new one?
- What does the reader believe before they read this, and what do they need to believe by the end?
- What would a skeptic say, and is the piece ready for that?
- Is this built to travel -- will it convert, not just inform?

You do not announce any of this. You just bring it.

---

## WHAT YOU NEVER DO

- Never ask two questions at once
- Never say "great question" or "that's interesting" or any sycophantic opener
- Never produce a response that just restates what the user said back to them
- Never open a response with "I" as the first word
- Never use em dashes
- Never say "from a strategic standpoint" or "strategically speaking" -- just be strategic
- Never make the user feel like they are being processed by a system
- Never go quiet -- if the Ask Reed input receives a message, respond

---

## THE ASK REED PANEL

The Ask Reed panel is always available. Any message submitted there must receive a response.

The panel has full context of the active session. You know what stage the user is in, what they submitted, what questions have been answered, and where they are in the flow.

Treat Ask Reed as a direct line. The user is stepping outside the structured flow to talk to you directly. That is a signal they need something the main flow is not giving them. Respond with your full capability.

---

## YOUR VOICE

Short sentences. Direct. No hedging.

You sound like the smartest advisor in the room who also happens to be completely on the user's side. You challenge ideas when they are soft. You confirm when something is strong. You move things forward.

You are not a tool. You are a partner.

---

(c) 2026 Mixed Grill, LLC
EVERYWHERE Studio v7.2
REED_FOH_PROMPT.md | April 13, 2026`;

function buildReedSystem(outputType) {
  return `${REED_SYSTEM}

Current output type for this session: ${outputType || "freestyle"}. Ask questions that clarify the idea, the audience, and any specifics needed to create it.`;
}

// Retry transient failures (network, rate limit, 5xx) so the Work section rarely shows errors
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1200;

function isRetryable(err) {
  const status = err?.status ?? err?.httpStatus;
  if (status === 429) return true; // rate limit
  if (status >= 500 && status <= 599) return true; // server error
  if (err?.message?.includes("ECONNRESET") || err?.message?.includes("ETIMEDOUT")) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Health check so the frontend can verify the backend is reachable
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "EVERYWHERE Studio API" });
});

app.post("/api/chat", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY not set. Add it to .env — see SETUP.md." });
  }
  const { messages = [], outputType = "freestyle" } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required with at least one message." });
  }

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const system = buildReedSystem(outputType);

    // Build messages for Claude: user/assistant alternating
    const claudeMessages = messages.map((m) => ({
      role: m.role === "reed" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : m.content,
    }));

    const response = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system,
        messages: claudeMessages,
      })
    );

    const block = response.content?.[0];
    const text = block?.type === "text" ? block.text : "";
    const readyToGenerate = text.includes(READY_MARKER);
    const reply = text.replace(READY_MARKER, "").replace(/\n+$/, "").trim();

    res.json({ reply, readyToGenerate });
  } catch (err) {
    console.error("[/api/chat]", err);
    const status = err.status === 401 ? 401 : 502;
    const message = err.message || "Something went wrong on our end.";
    res.status(status).json({
      error: status === 401 ? "Invalid API key. Check your .env and SETUP.md." : message,
      retryable: isRetryable(err),
    });
  }
});

app.post("/api/generate", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY not set. Add it to .env — see SETUP.md." });
  }
  const { context = "", outputType = "freestyle", conversationSummary } = req.body;

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const system = `You are producing a single piece of content for EVERYWHERE Studio. Use the captured context and conversation to write in the user's voice. Output only the final content, no meta-commentary. Format appropriately for the type: ${outputType}.`;

    const userContent = conversationSummary
      ? `Conversation summary:\n${conversationSummary}\n\nProduce the ${outputType} now.`
      : `Context:\n${context}\n\nProduce the ${outputType} now.`;

    const response = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: userContent }],
      })
    );

    const block = response.content?.[0];
    const content = block?.type === "text" ? block.text : "";

    // Placeholder Betterish score (real scoring would call a separate step or model)
    const score = 800 + Math.floor(Math.random() * 150);

    res.json({ content, score });
  } catch (err) {
    console.error("[/api/generate]", err);
    const status = err.status === 401 ? 401 : 502;
    const message = err.message || "Something went wrong on our end.";
    res.status(status).json({
      error: status === 401 ? "Invalid API key. Check your .env and SETUP.md." : message,
      retryable: isRetryable(err),
    });
  }
});

// Voice DNA generation from interview responses or uploads
app.post("/api/voice-dna", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY not set. Add it to .env — see SETUP.md." });
  }
  const { type, responses = {}, fileUrls = [] } = req.body || {};

  if (type !== "interview" && type !== "upload") {
    return res.status(400).json({ error: "type must be 'interview' or 'upload'." });
  }

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const system = `You are building a Voice DNA profile for EVERYWHERE Studio.

You receive either:
- A set of interview Q&A responses about how the user communicates, or
- Text content from writing samples.

Your job:
- Infer the user's Voice DNA according to this TypeScript interface:

interface VoiceDNA {
  voice_fidelity: number;
  voice_layer: number;
  value_layer: number;
  personality_layer: number;
  traits: {
    vocabulary_and_syntax: number;
    tonal_register: number;
    rhythm_and_cadence: number;
    metaphor_patterns: number;
    structural_habits: number;
  };
  voice_description: string;
  value_description: string;
  personality_description: string;
  contraction_frequency: string;
  sentence_length_avg: string;
  signature_phrases: string[];
  prohibited_words: string[];
  emotional_register: string;
  has_dual_mode: boolean;
  content_mode?: object;
  operations_mode?: object;
  method: "interview" | "upload" | "both";
  interview_responses?: Record<string,string>;
  created_at: string;
  updated_at: string;
}

You must return a JSON object with two top-level keys:
- "voiceDna": VoiceDNA
- "markdown": string (a human-readable Voice DNA document)

Do not include any other keys.`;

    const userContent =
      type === "interview"
        ? `Interview responses as JSON:\n${JSON.stringify(responses, null, 2)}\n\nBuild the Voice DNA.`
        : `Writing sample references (file names or URLs):\n${JSON.stringify(fileUrls, null, 2)}\n\nInfer Voice DNA based on how this person writes.`;

    const response = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: userContent }],
      })
    );

    const block = response.content?.[0];
    const text = block?.type === "text" ? block.text : "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("[/api/voice-dna] Failed to parse JSON", err, text.slice(0, 200));
      return res.status(502).json({ error: "Voice DNA response was not valid JSON.", retryable: false });
    }

    res.json(parsed);
  } catch (err) {
    console.error("[/api/voice-dna]", err);
    const status = err.status === 401 ? 401 : 502;
    const message = err.message || "Something went wrong on our end.";
    res.status(status).json({
      error: status === 401 ? "Invalid API key. Check your .env and SETUP.md." : message,
      retryable: isRetryable(err),
    });
  }
});

// Brand DNA generation
app.post("/api/brand-dna", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY not set. Add it to .env — see SETUP.md." });
  }
  const { input } = req.body || {};

  if (!input || typeof input !== "object") {
    return res.status(400).json({ error: "input object is required." });
  }

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const system = `You are building a Brand DNA profile for EVERYWHERE Studio.

You receive structured input about the company and how it speaks.

Your job:
- Produce a BrandDNA JSON object and a companion markdown document.

interface BrandDNA {
  company_name: string;
  industry: string;
  target_audience: string;
  brand_voice_description: string;
  tone_attributes: string[];
  language_guidelines: string;
  primary_colors: string[];
  secondary_colors: string[];
  font_families: string[];
  logo_description: string;
  tagline: string;
  value_proposition: string;
  key_messages: string[];
  prohibited_language: string[];
  brand_guide_url?: string;
  logo_urls: string[];
  style_guide_url?: string;
  additional_docs: { name: string; url: string; type: string }[];
  created_at: string;
  updated_at: string;
}

Return JSON with:
- "brandDna": BrandDNA
- "markdown": string

No other keys.`;

    const userContent = `Raw structured input:\n${JSON.stringify(input, null, 2)}\n\nBuild the BrandDNA object and markdown.`;

    const response = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: userContent }],
      })
    );

    const block = response.content?.[0];
    const text = block?.type === "text" ? block.text : "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("[/api/brand-dna] Failed to parse JSON", err, text.slice(0, 200));
      return res.status(502).json({ error: "Brand DNA response was not valid JSON.", retryable: false });
    }

    res.json(parsed);
  } catch (err) {
    console.error("[/api/brand-dna]", err);
    const status = err.status === 401 ? 401 : 502;
    const message = err.message || "Something went wrong on our end.";
    res.status(status).json({
      error: status === 401 ? "Invalid API key. Check your .env and SETUP.md." : message,
      retryable: isRetryable(err),
    });
  }
});

// 404 for unknown /api routes (so frontend gets JSON, not HTML)
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Not found. Use POST /api/chat or POST /api/generate. Is the backend running? Run: npm run server",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EVERYWHERE Studio API running at http://localhost:${PORT}`);
});
