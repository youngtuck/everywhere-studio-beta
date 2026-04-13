import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { voiceDnaContent, linkedInUrl, linkedInContent, userName } = req.body || {};

  let sourceContent = "";

  // If a LinkedIn URL is provided, fetch it
  if (linkedInUrl && linkedInUrl.includes("linkedin.com")) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      const liRes = await fetch(linkedInUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "EVERYWHERE-Studio/1.0" },
      });
      if (liRes.ok) {
        const html = await liRes.text();
        sourceContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
      }
    } catch (e) {
      console.warn("[api/sentinel-seed] LinkedIn fetch failed", e.message);
    }
  }

  if (linkedInContent) {
    sourceContent += "\n\n" + linkedInContent;
  }

  if (voiceDnaContent) {
    sourceContent += "\n\nVoice DNA content:\n" + voiceDnaContent;
  }

  if (!sourceContent.trim()) {
    return res.status(400).json({ error: "Provide voiceDnaContent, linkedInUrl, or linkedInContent" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system: "You analyze professional profiles and voice patterns to identify what topics, industries, people, and trends a person would want to monitor. Return ONLY a JSON object.",
        messages: [{
          role: "user",
          content: `Based on this person's profile and voice, suggest Watch/monitoring topics for their Sentinel intelligence system.\n\n${sourceContent}\n\nReturn this exact JSON:\n{\n  "industries": ["3-5 industries they operate in or care about"],\n  "topics": ["8-12 specific topics they would want to monitor"],\n  "people": ["3-5 specific people or thought leaders they would want to track"],\n  "competitors": ["3-5 companies or individuals competing in their space"],\n  "contentTriggers": ["3-5 types of events that should trigger content creation"]\n}`
        }],
      })
    );

    const text = response.content?.[0]?.type === "text" ? response.content[0].text : "{}";
    const clean = text.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      return res.status(502).json({ error: "Failed to parse suggestions", raw: clean.slice(0, 500) });
    }
  } catch (err) {
    console.error("[api/sentinel-seed]", err);
    return res.status(502).json({ error: "Something went wrong. Please try again." });
  }
}
