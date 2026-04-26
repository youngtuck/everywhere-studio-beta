import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { requireAuth } from "./_auth.js";
import { setCorsHeaders } from "./_cors.js";

const SYSTEM_PROMPT = `You are a Brand DNA analyst for EVERYWHERE Studio. You receive an existing Brand DNA JSON object (usually from a website crawl) plus optional user notes and optional plain text extracted from extra files (voice guidelines, decks, reports).

Your job: merge the new material into a single improved profile. Preserve accurate facts from the original brandDna when they still hold. Add specificity from notes and files. Resolve conflicts by trusting explicit user notes over inferred site copy.

CRITICAL: Respond with ONLY a raw JSON object. No preamble. No markdown fences. No explanation. Start with { and end with }. The JSON must be parseable by JSON.parse().

Use this exact structure:
{
  "brandDna": {
    "brand_name": "string",
    "category_position": "string",
    "tagline": "string or null",
    "target_audience": "string",
    "brand_promise": "string",
    "the_enemy": "string (what the brand is against)",
    "tone_of_voice": "string (2-3 sentence description)",
    "voice_adjectives": ["3-5 adjectives"],
    "signature_phrases": ["3-5 phrases the brand uses repeatedly"],
    "never_say": ["3-5 phrases the brand would never use"],
    "content_patterns": "string (how they structure headlines, body copy, CTAs)",
    "values": ["3-5 core values"],
    "visual_direction": "string (color feel, typography feel, photography style)",
    "proof_anchors": ["key credibility stats or claims"],
    "summary": "3-4 sentence brand overview"
  },
  "markdown": "full Brand DNA document as a markdown string, suitable for storing as a resource"
}`;

function stripMarkdownFences(text) {
  if (!text || typeof text !== "string") return text;
  let out = text.trim();
  const m = out.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  if (m) out = m[1].trim();
  return out;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { brandDna, markdown = "", supplementaryNotes = "", supplementaryFileTexts = [] } = req.body || {};
  if (!brandDna || typeof brandDna !== "object") {
    return res.status(400).json({ error: "brandDna object required" });
  }

  const notes = String(supplementaryNotes || "").trim();
  const files = Array.isArray(supplementaryFileTexts) ? supplementaryFileTexts : [];
  const fileBlocks = files
    .filter((f) => f && typeof f.text === "string" && f.text.trim())
    .map((f) => `### File: ${f.name || "attachment"}\n${String(f.text).trim().slice(0, 24_000)}`)
    .join("\n\n");

  if (!notes && !fileBlocks) {
    return res.status(400).json({ error: "Add notes or at least one text document to blend into Brand DNA." });
  }

  const userParts = [
    "Current Brand DNA JSON:",
    JSON.stringify({ brandDna, markdown }),
    "",
    notes ? `User notes to merge:\n${notes}` : "",
    fileBlocks ? `Extracted file text:\n${fileBlocks}` : "",
    "",
    "Return updated brandDna and markdown only, as JSON.",
  ];

  try {
    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts.filter(Boolean).join("\n") }],
      })
    );

    const block = response.content?.[0];
    let text = block?.type === "text" ? block.text : "";
    text = stripMarkdownFences(text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("[api/brand-dna-enrich] JSON parse failed", err, text?.slice(0, 400));
      return res.status(502).json({ error: "Brand DNA enrich response was not valid JSON", raw: text?.slice(0, 400) });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[api/brand-dna-enrich]", err);
    return res.status(502).json({ error: "Something went wrong. Please try again." });
  }
}
