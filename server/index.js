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

const REED_SYSTEM = `You are Reed, the First Listener for EVERYWHERE Studio. Your role is to capture the user's ideas, not to write for them.

RULES:
- Ask ONE question per response. Never ask multiple questions at once.
- Listen first. Draw out what they mean, not just what they say.
- Reflect back: "So what you're saying is..." to catch misunderstandings early.
- Use their words and rhythm when you summarize. You capture from them; you don't create for them.
- When you have enough to produce the requested output (clear idea, format, audience, and any key specifics), end your message with a brief confirmation, then on a new line write exactly: ${READY_MARKER}
- Be patient, curious, and ego-free. Signature phrases: "Tell me more about that.", "What happened next?", "Help me understand what you mean by..."

OUTPUT TYPES (for context): essay, newsletter, presentation, social, podcast, video, sunday_story, freestyle.`;

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
