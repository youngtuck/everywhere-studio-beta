import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { setCorsHeaders } from "./_cors.js";

const SYSTEM_PROMPT = `You are a Brand DNA analyst for EVERYWHERE Studio. You are given uploaded brand assets (documents, images described as text, etc.). Extract and synthesize a structured Brand DNA profile from these materials. If the assets are incomplete, infer where reasonable and note gaps. Respond with ONLY a raw JSON object. No preamble. No markdown code fences. No explanation. Pure JSON only. The JSON must be parseable by JSON.parse() with no preprocessing.

Output this exact structure:
{
  "brandDna": {
    "brand_name": "<string>",
    "category_position": "<string, what category this brand owns>",
    "declared_enemy": "<string, what they are against>",
    "core_promise": "<string, one sentence>",
    "target_person": "<string, specific description>",
    "brand_voice_adjectives": ["<3-5 adjectives>"],
    "never_say": ["<3-5 phrases the brand would never use>"],
    "visual_direction": "<string, brief description>",
    "summary": "<2-3 sentences>"
  },
  "markdown": "<full Brand DNA .md document as a string, with headers and sections>"
}`;

function stripMarkdownFences(text) {
  if (!text || typeof text !== "string") return text;
  let out = text.trim();
  const codeBlockRe = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = out.match(codeBlockRe);
  if (m) out = m[1].trim();
  return out;
}

function tryParseJson(text) {
  try {
    return { parsed: JSON.parse(text), error: null };
  } catch (err) {
    return { parsed: null, error: err };
  }
}

/** Decode base64 to UTF-8 string; binary/unsupported types return a placeholder. */
function decodeFileContent(contentBase64, mimeType) {
  if (!contentBase64) return "";
  try {
    const buf = Buffer.from(contentBase64, "base64");
    const isText = !mimeType || /^text\/|application\/json|application\/javascript/.test(mimeType) || mimeType === "application/pdf";
    if (buf.length > 500000) return `[Large file: ${(buf.length / 1024).toFixed(0)} KB - content truncated for context]`;
    if (/^image\//.test(mimeType)) return `[Image: ${mimeType}]`;
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { files = [] } = req.body || {};
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "files array required" });
  }

  const contextParts = files.map((f) => {
    const content = decodeFileContent(f.contentBase64, f.mimeType);
    return `--- ${f.name} ---\n${content.slice(0, 80000)}\n`;
  });
  const userMessage = `Extract and synthesize a Brand DNA profile from these uploaded brand assets:\n\n${contextParts.join("\n")}`;

  try {
    const client = new Anthropic({ apiKey });
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

    let { parsed, error } = tryParseJson(text);
    if (error) {
      text = stripMarkdownFences(text);
      const retry = tryParseJson(text);
      parsed = retry.parsed;
      error = retry.error;
    }
    if (error || !parsed) {
      console.error("[api/brand-assets] Failed to parse JSON", error, text.slice(0, 500));
      return res.status(502).json({ error: "Brand DNA response was not valid JSON", raw: text.slice(0, 500) });
    }

    const { brandDna, markdown } = parsed;
    return res.status(200).json({ brandDna, markdown });
  } catch (err) {
    console.error("[api/brand-assets]", err);
    return res.status(502).json({ error: "Something went wrong. Please try again." });
  }
}
