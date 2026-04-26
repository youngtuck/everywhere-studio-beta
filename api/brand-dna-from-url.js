import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { setCorsHeaders } from "./_cors.js";

const SYSTEM_PROMPT = `You are a Brand DNA analyst for EVERYWHERE Studio. Given the text content of a website, produce a comprehensive Brand DNA profile.

Analyze: positioning, category, tagline, target audience, brand promise, tone of voice, color palette (if inferable), typography feel, content patterns, signature phrases, values, and what the brand explicitly avoids.

CRITICAL: Respond with ONLY a raw JSON object. No preamble, no markdown fences, no explanation. Start with { and end with }. The JSON must be parseable by JSON.parse().

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
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { url } = req.body || {};
  if (!url || !url.startsWith("http")) {
    return res.status(400).json({ error: "Valid URL required (must start with http or https)" });
  }

  try {
    // Fetch the website content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const siteRes = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "EVERYWHERE-Studio-BrandDNA/1.0" },
    });
    clearTimeout(timeoutId);

    if (!siteRes.ok) {
      return res.status(502).json({ error: `Failed to fetch ${url}: ${siteRes.status}` });
    }

    const html = await siteRes.text();
    // Strip HTML tags, scripts, styles to get text content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000); // Limit to ~12k chars for Claude context

    if (textContent.length < 100) {
      return res.status(400).json({ error: "Could not extract enough text content from that URL. Try a different page." });
    }

    // Send to Claude for analysis
    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Analyze this website and produce a Brand DNA profile:\n\nURL: ${url}\n\nExtracted text content:\n"""\n${textContent}\n"""`
        }],
      })
    );

    const block = response.content?.[0];
    let text = block?.type === "text" ? block.text : "";
    text = stripMarkdownFences(text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("[api/brand-dna-from-url] JSON parse failed", err, text?.slice(0, 500));
      return res.status(502).json({ error: "Brand DNA response was not valid JSON", raw: text?.slice(0, 500) });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[api/brand-dna-from-url]", err);
    const message = err.name === "AbortError" ? "Timed out fetching the website. Try again." : "Something went wrong. Please try again.";
    return res.status(502).json({ error: message });
  }
}
