import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { setCorsHeaders } from "./_cors.js";

const SYSTEM_PROMPT = `You are a Brand DNA analyst for EVERYWHERE Studio. Given a conversation history (Reed asking questions, user answering), produce a structured Brand DNA profile.

CRITICAL: You must respond with ONLY a raw JSON object. No preamble, no markdown code fences, no explanation, no conversational text. Your entire response must be valid JSON that starts with { and ends with }. If you include ANY text outside the JSON object, the system will break.`;

function buildUserMessage(userName, responses) {
  const lines = [`Conversation from ${userName}:`];
  if (Array.isArray(responses)) {
    responses.forEach((m) => {
      const role = m.role === "assistant" || m.role === "reed" ? "Reed" : "User";
      lines.push(`${role}: ${String(m.content || "").trim()}`);
    });
  } else if (responses && typeof responses === "object") {
    for (const [key, value] of Object.entries(responses)) {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  lines.push(
    "",
    "Generate a Brand DNA profile as this exact JSON structure:",
    "{",
    '  "brandDna": {',
    '    "brand_name": "<string>",',
    '    "category_position": "<string, what category this brand owns>",',
    '    "declared_enemy": "<string, what they are against>",',
    '    "core_promise": "<string, one sentence>",',
    '    "target_person": "<string, specific description>",',
    '    "brand_voice_adjectives": ["<3-5 adjectives>"],',
    '    "never_say": ["<3-5 phrases the brand would never use>"],',
    '    "visual_direction": "<string, brief description>",',
    '    "summary": "<2-3 sentences>"',
    "  },",
    '  "markdown": "<full Brand DNA .md document as a string>"',
    "}"
  );
  return lines.join("\n");
}

/** Strip markdown code fences so JSON.parse can succeed when Claude returns fenced JSON. */
function stripMarkdownFences(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { responses = [], userName = "the user" } = req.body || {};

  // Validate that we have actual conversation content to analyze
  const hasContent = Array.isArray(responses)
    ? responses.length > 0 && responses.some(m => m.content && String(m.content).trim().length > 0)
    : responses && typeof responses === "object" && Object.keys(responses).length > 0;

  if (!hasContent) {
    return res.status(400).json({
      error: "No conversation content provided. Brand DNA requires Reed interview responses.",
      hint: "Send { responses: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }], userName: 'Name' }"
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const userMessage = buildUserMessage(userName, responses);

    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      })
    );

    const block = response.content?.[0];
    let text = block?.type === "text" ? block.text : "";
    const clean = stripMarkdownFences(text);
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      console.error("[api/brand-dna] Failed to parse JSON", err, clean.slice(0, 500));
      return res.status(502).json({ error: "Brand DNA response was not valid JSON", raw: clean.slice(0, 500) });
    }

    const { brandDna, markdown } = parsed;
    return res.status(200).json({ brandDna, markdown });
  } catch (err) {
    console.error("[api/brand-dna]", err);
    return res.status(502).json({ error: "Something went wrong. Please try again." });
  }
}
