import Anthropic from "@anthropic-ai/sdk";
import { getUserResources } from "./_resources.js";
import { dnaDebug } from "./_dnaDebugLog.js";
import { clipDna, DNA_LIMITS } from "./_dnaContext.js";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { requireAuth } from "./_auth.js";

function sanitizeEmDashes(text) {
  if (!text) return text;
  let result = text.replace(/\s*\u2014\s*/g, ", ");
  result = result.replace(/\s+\u2013\s+/g, ", ");
  result = result.replace(/, ,/g, ",").replace(/,\./g, ".").replace(/,\s*,/g, ",");
  return result;
}

function sanitizeOutlineObj(obj) {
  if (!obj) return obj;
  if (typeof obj === "string") return sanitizeEmDashes(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeOutlineObj);
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeOutlineObj(v);
    }
    return out;
  }
  return obj;
}

const OUTPUT_TYPE_LABELS = {
  freestyle: "Freestyle",
  essay: "Essay",
  talk: "Talk",
  podcast: "Podcast",
  linkedin_post: "LinkedIn post",
  presentation: "Presentation",
  email: "Email",
  newsletter: "Newsletter",
  case_study: "Case study",
  white_paper: "White paper",
  video_script: "Video script",
  sales_deck: "Sales deck",
  proposal: "Proposal",
  memo: "Memo",
  blog_post: "Blog post",
};

function formatOutputTypeLabel(outputType) {
  const key = String(outputType || "freestyle").toLowerCase().trim();
  if (OUTPUT_TYPE_LABELS[key]) return OUTPUT_TYPE_LABELS[key];
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** User-side lines only (intake subject, purpose, audience live here). */
function buildUserTranscript(messages) {
  if (!Array.isArray(messages)) return "";
  const parts = [];
  for (const m of messages) {
    const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
    const c = typeof m.content === "string" ? m.content.trim() : String(m.content || "").trim();
    if (!c) continue;
    if (role === "user") parts.push(c);
  }
  return parts.join("\n\n");
}

/** Pull "about X to/for Y" style clauses from user text. */
function inferTopicAndAudienceFromTranscript(text) {
  const p = text.replace(/\s+/g, " ").trim();
  if (!p) return { core: "", audience: "" };
  const patterns = [
    /\b(?:giving|give|giving a|I am giving|I'?m giving|we are giving|we're giving)\s+(?:a\s+)?(?:talk|speech|presentation)\s+about\s+(.+?)\s+to\s+([^.!?]+)/i,
    /\b(?:writing|write|I am writing|I'?m writing)\s+(?:a\s+)?(?:an?\s+)?(?:essay|article|piece|post)\s+about\s+(.+?)\s+for\s+([^.!?]+)/i,
    /\bpresentation\s+(?:on|about)\s+(.+?)\s+for\s+([^.!?]+)/i,
    /\bpodcast\s+(?:on|about)\s+(.+?)\s+for\s+([^.!?]+)/i,
    /\babout\s+([^.!?]{6,140}?)\s+to\s+(?:the\s+)?([A-Za-z0-9][^.!?]{3,100})/i,
  ];
  for (const re of patterns) {
    const m = p.match(re);
    if (m) {
      const core = m[1].replace(/[.,;]+$/, "").trim();
      const audience = m[2].replace(/[.,;]+$/, "").trim();
      if (core.length >= 2 && audience.length >= 2) return { core, audience };
    }
  }
  return { core: "", audience: "" };
}

function inferAudienceStandalone(text) {
  const p = text.replace(/\s+/g, " ").trim();
  const m = p.match(/\b(?:for|to)\s+(?:the\s+)?([A-Za-z0-9][^.!?\n]{3,100})(?=\s*[.!?\n]|$)/i);
  if (!m) return "";
  const g = m[1].trim().replace(/[.,;]+$/, "");
  if (/^(write|build|create|draft|outline|help|me|us|you)\b/i.test(g)) return "";
  return g.length >= 4 ? g : "";
}

function inferCoreTopicFallback(text) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "the subject the user stated";
  const about = t.match(/\babout\s+([^.!?]{10,220})/i);
  if (about) {
    const chunk = about[1].trim();
    const cut = chunk.split(/\s+(?:to|for)\s+/i)[0];
    return (cut || chunk).slice(0, 220).trim() || chunk.slice(0, 220).trim();
  }
  const on = t.match(/\b(?:on|regarding)\s+([^.!?]{10,220})/i);
  if (on) return on[1].trim().slice(0, 220);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let best = "";
  for (const line of lines) {
    if (line.length > best.length && line.length <= 320) best = line;
  }
  const pick = (best || t).slice(0, 220).trim();
  return pick || "the subject the user stated";
}

/**
 * Topic lock: reinforce core topic and audience from intake before any structural outline rules.
 */
function buildTopicLockBlock(messages, outputType) {
  const typeLabel = formatOutputTypeLabel(outputType);
  const transcript = buildUserTranscript(messages);
  const { core, audience } = inferTopicAndAudienceFromTranscript(transcript);
  const coreTopic = (core && core.trim()) || inferCoreTopicFallback(transcript);
  const aud =
    (audience && audience.trim()) ||
    inferAudienceStandalone(transcript) ||
    "the audience described in the conversation";
  const topicLine = `This is a ${typeLabel} about ${coreTopic} for ${aud}. Every structural element must directly serve this topic. Do not generalize or drift into adjacent themes.`;
  const voicing = formatStructuralVoicingHint(outputType);
  return `${topicLine}\n\n${voicing}`;
}

function formatStructuralVoicingHint(outputType) {
  const o = String(outputType || "freestyle").toLowerCase();
  if (o === "talk" || o === "presentation") {
    return "STRUCTURE AND VOICE FOR THIS OUTPUT TYPE: Spoken delivery. Hooks and body beats must work when said aloud: short, concrete, rhythmic lines the speaker can deliver to listeners. Avoid essay-style academic framing, dense stacked clauses, and print-only hedging. Stakes land as spoken tension; the close sounds like an ending you would say out loud.";
  }
  if (o === "podcast") {
    return "STRUCTURE AND VOICE FOR THIS OUTPUT TYPE: Spoken audio. Hooks and beats should feel conversational (host to listener). Prefer sayable rhythms over written-only density.";
  }
  if (o === "essay" || o === "freestyle") {
    return "STRUCTURE AND VOICE FOR THIS OUTPUT TYPE: Written longform. Hooks may be analytical; body points can build argument with evidence and transitions suited to reading on the page.";
  }
  if (o === "linkedin_post" || o === "linkedin") {
    return "STRUCTURE AND VOICE FOR THIS OUTPUT TYPE: Short professional social prose. Hooks must earn the stop-scroll moment; body stays tight; stakes and close fit on-platform reading.";
  }
  if (o === "email" || o === "newsletter") {
    return "STRUCTURE AND VOICE FOR THIS OUTPUT TYPE: Inbox or newsletter format. Hook with subject-plus-lead energy; scannable body; close with a clear reader action.";
  }
  return `STRUCTURE AND VOICE FOR THIS OUTPUT TYPE: Match how a ${formatOutputTypeLabel(outputType)} is consumed. Shape Title, Hook, Body, Stakes, and Close for that medium, not a generic template.`;
}

const OUTLINE_SINGLE_ANGLE_RULES = `You are Reed, generating ONE structured outline angle from the conversation you just had with the user. You captured their thesis, audience, goal, hook, and format during intake.

CRITICAL RULES:
- Never use em-dashes. Use commas, periods, colons, or semicolons instead.
- Every outline row must contain specific, opinionated editorial content. Never use generic filler like "Supporting evidence and examples" or "What changes if the reader acts on this." Every line should be a real editorial decision that could only apply to THIS piece.
- Each outline row should be 5 to 20 words. Concise and directional. Not a full sentence, more like a section heading with enough specificity to guide the draft.
- Sub-points (indented rows) should be genuine structural sub-sections, not generic placeholders.

OUTPUT FORMAT: Respond with ONLY valid JSON, no markdown backticks, no preamble. Use this exact structure:

{
  "name": "Short 2-5 word name for this angle's approach",
  "description": "One sentence describing the structural strategy.",
  "rows": [
    {"label": "Title", "content": "The actual title for this angle"},
    {"label": "Hook", "content": "The specific opening approach"},
    {"label": "Body", "content": "The core argument or narrative move"},
    {"label": "", "content": "A specific sub-point that develops the body", "indent": true},
    {"label": "", "content": "Another specific sub-point", "indent": true},
    {"label": "Stakes", "content": "What is at risk, specific to this piece"},
    {"label": "", "content": "A specific sub-point on stakes", "indent": true},
    {"label": "Close", "content": "How this piece lands"}
  ]
}

The rows array should have 7-9 rows. Use the exact label names: "Title", "Hook", "Body", "Stakes", "Close" for labeled rows, and "" for indented sub-point rows. Indented rows must have "indent": true.

EXAMPLES OF GOOD VS BAD OUTLINE ROWS:

BAD (generic): "Supporting evidence and examples."
GOOD (specific): "Why willpower cannot bridge the gap."

BAD (generic): "What changes if the reader acts on this."
GOOD (specific): "Every week without infrastructure, someone else says what you have been thinking."`;

const OUTLINE_ANGLE_B_SYSTEM_APPEND = `

SECOND ANGLE (ANGLE B ONLY): Angle A has already been written. It will appear in the next user message as JSON. You must output ONLY Angle B as JSON with the same keys: "name", "description", "rows".
Angle B must be a genuinely different structural approach, not the same content with different card text. Change the argumentative spine, not only wording.
If your previous attempt matched Angle A too closely, you must rewrite Angle B from scratch with zero overlapping sentences and a different structure.`;

function parseJsonFromModel(raw) {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
  }
  return JSON.parse(cleaned);
}

function validateSingleAngle(obj) {
  return (
    obj &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    Array.isArray(obj.rows) &&
    obj.rows.length >= 5
  );
}

/** True if outlines are effectively duplicated (same row texts or most lines identical). */
function outlineRowsTooSimilar(rowsA, rowsB) {
  if (!Array.isArray(rowsA) || !Array.isArray(rowsB) || rowsA.length === 0 || rowsB.length === 0) {
    return true;
  }
  const norm = (r) => (r.content || "").trim().toLowerCase();
  const sigA = rowsA.map(norm).join("\u0001");
  const sigB = rowsB.map(norm).join("\u0001");
  if (sigA === sigB) return true;
  const n = Math.min(rowsA.length, rowsB.length);
  let identical = 0;
  for (let i = 0; i < n; i++) {
    const a = norm(rowsA[i]);
    const b = norm(rowsB[i]);
    if (a.length > 0 && a === b) identical++;
  }
  return n > 0 && identical / n >= 0.35;
}

function normalizeAngle(raw) {
  const o = sanitizeOutlineObj(raw);
  return {
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Angle",
    description: typeof o.description === "string" ? o.description.trim() : "",
    rows: Array.isArray(o.rows) ? o.rows : [],
  };
}

async function createOutlineMessage(client, systemPrompt, messages, maxTokens = 4096) {
  return callWithRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured." });

  const { messages = [], userId, outputType = "freestyle" } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required with at least one message." });
  }

  try {
    const resources = await getUserResources(userId, { caller: "outline" });
    dnaDebug("outline.handler", {
      hasUserId: !!userId,
      messageCount: messages.length,
    });
    const A = DNA_LIMITS.auxiliary;

    const typeLabel = formatOutputTypeLabel(outputType);
    const topicLockBlock = buildTopicLockBlock(messages, outputType);

    let systemBase = `${topicLockBlock}\n\n`;
    if (resources.voiceDna) {
      systemBase += `## Voice DNA (write in this voice)\n${clipDna(resources.voiceDna, A.voice)}\n\n`;
    }
    if (resources.brandDna) {
      systemBase += `## Brand DNA\n${clipDna(resources.brandDna, A.brand)}\n\n`;
    }
    if (resources.methodDna) {
      systemBase += `## Method DNA (use proprietary terms exactly)\n${clipDna(resources.methodDna, A.method)}\n\n`;
    }
    systemBase += OUTLINE_SINGLE_ANGLE_RULES;
    systemBase += `\n\nOutput format: ${typeLabel} (technical id: ${outputType}). Every outline row must obey the topic lock at the top of this system prompt and match this delivery format.`;

    const claudeBase = messages.map((m) => ({
      role: m.role === "reed" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : String(m.content),
    }));

    const client = new Anthropic({ apiKey });

    // ── Call 1: Angle A only ─────────────────────────────────────
    const messagesA = [
      ...claudeBase,
      {
        role: "user",
        content:
          "From our conversation, generate the first structural approach as Angle A. Return ONLY valid JSON with keys \"name\", \"description\", and \"rows\" as specified in your instructions.",
      },
    ];

    const resA = await createOutlineMessage(client, systemBase, messagesA);
    const rawA = resA.content?.[0]?.text || "";
    let parsedA;
    try {
      parsedA = parseJsonFromModel(rawA);
    } catch (e) {
      console.error("[api/outline] Angle A JSON parse failed. Raw:", rawA.slice(0, 500));
      return res.status(502).json({ error: "Failed to parse Angle A outline from Claude." });
    }
    if (!validateSingleAngle(parsedA)) {
      console.error("[api/outline] Invalid Angle A structure:", JSON.stringify(parsedA).slice(0, 500));
      return res.status(502).json({ error: "Invalid Angle A outline structure from Claude." });
    }
    const angleA = normalizeAngle(parsedA);

    // ── Call 2: Angle B only (explicit contrast to A); retry if too similar ──
    const systemB = systemBase + OUTLINE_ANGLE_B_SYSTEM_APPEND;
    const aMetaName = angleA.name || "Angle A";
    const aMetaDesc = angleA.description || "";
    const angleAPayload = JSON.stringify({
      name: angleA.name,
      description: angleA.description,
      rows: angleA.rows,
    });

    let angleB = null;
    const maxBAttempts = 3;
    for (let attempt = 0; attempt < maxBAttempts; attempt++) {
      const strictNote =
        attempt === 0
          ? ""
          : attempt === 1
            ? "\n\nYour last Angle B was too close to Angle A. Regenerate Angle B from scratch: new Title, Hook, every Body line, Stakes, Close. Zero reused sentences from Angle A."
            : "\n\nStill too similar. Use a different rhetorical lens entirely (for example, if Angle A is thesis-first, make Angle B story-first or contrarian-first). Every row must be new text.";

      const userBContent = `Generate two genuinely different structural approaches to this idea. Angle A: ${aMetaName} — ${aMetaDesc}. Angle B: you will invent a new name, description, and rows in your JSON response. The Title, Hook, Body structure, Stakes framing, and Close must be meaningfully different between the two. Do not reuse the same sentences or structure across both angles.

Angle A is already fixed. Here is its full JSON (reference only; do not copy its wording into Angle B):
${angleAPayload}

Now output ONLY Angle B as JSON with keys "name", "description", "rows". Angle B must differ in every row from Angle A.${strictNote}`;

      const messagesB = [...claudeBase, { role: "user", content: userBContent }];

      const resB = await createOutlineMessage(client, systemB, messagesB);
      const rawB = resB.content?.[0]?.text || "";
      let parsedB;
      try {
        parsedB = parseJsonFromModel(rawB);
      } catch (e) {
        console.error("[api/outline] Angle B JSON parse failed. Raw:", rawB.slice(0, 500));
        return res.status(502).json({ error: "Failed to parse Angle B outline from Claude." });
      }
      if (!validateSingleAngle(parsedB)) {
        console.error("[api/outline] Invalid Angle B structure:", JSON.stringify(parsedB).slice(0, 500));
        return res.status(502).json({ error: "Invalid Angle B outline structure from Claude." });
      }
      const candidateB = normalizeAngle(parsedB);

      if (outlineRowsTooSimilar(angleA.rows, candidateB.rows)) {
        console.warn("[api/outline] Angle B too similar to Angle A; retrying B generation", {
          attempt: attempt + 1,
          aName: angleA.name,
          bName: candidateB.name,
        });
        continue;
      }
      angleB = candidateB;
      break;
    }

    if (!angleB) {
      console.error("[api/outline] Angle B remained too similar after retries");
      return res.status(502).json({
        error: "Could not produce a distinct second outline angle. Please try again.",
      });
    }

    return res.json({
      angleA: {
        name: angleA.name || "Angle A",
        description: angleA.description || "",
        rows: angleA.rows,
      },
      angleB: {
        name: angleB.name || "Angle B",
        description: angleB.description || "",
        rows: angleB.rows,
      },
    });
  } catch (err) {
    console.error("[api/outline]", err);
    const status = err.status === 401 ? 401 : 502;
    return res.status(status).json({ error: "Outline generation failed. Please try again." });
  }
}
