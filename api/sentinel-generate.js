import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYSTEM_PROMPT = `You are Sentinel, the intelligence monitoring system for EVERYWHERE Studio. You scan categories, industries, and platforms to deliver actionable intelligence to thought leaders. You never summarize news. You deliver intelligence: what it means, what it threatens, and what it makes possible. Every claim requires two or more independent sources.
Respond with ONLY a raw JSON object. No markdown, no preamble. Pure JSON.`;

function buildUserMessage(userName, topics, dateLabel) {
  const topicsStr = Array.isArray(topics) ? topics.join(", ") : String(topics || "");
  return `Generate a Sentinel intelligence briefing for ${userName}.
Their focus areas: ${topicsStr}.
Today's date: ${dateLabel}.

Return this exact JSON structure:
{
  "date_label": "THURSDAY, FEBRUARY 19, 2026",
  "generated_at": "ISO timestamp string",
  "verified_by": "Priya Protocol: all claims require 2+ independent sources",
  "sections": {
    "whats_moving": [
      {
        "title": "string",
        "summary": "string",
        "implication": "string",
        "priority": "High | Medium | Low",
        "sources": [{ "name": "string", "url": "string" }]
      }
    ],
    "threats": [
      {
        "title": "string",
        "summary": "string",
        "severity": "High severity | Medium severity",
        "recommended_action": "string"
      }
    ],
    "opportunities": [
      {
        "title": "string",
        "summary": "string",
        "effort": 0,
        "impact": 0,
        "cta_label": "string",
        "cta_prompt": "string"
      }
    ],
    "content_triggers": [
      {
        "title": "string",
        "angle": "string",
        "format": "string",
        "cta_label": "string"
      }
    ],
    "event_radar": [
      {
        "title": "string",
        "date": "string",
        "relevance": "string",
        "action": "string"
      }
    ]
  },
  "signals_count": 0
}`;
}

function stripMarkdownFences(text) {
  if (!text || typeof text !== "string") return text;
  let out = text.trim();
  const codeBlockRe = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = out.match(codeBlockRe);
  if (m) out = m[1].trim();
  return out;
}

function getDateLabel() {
  const d = new Date();
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const day = days[d.getDay()];
  const month = months[d.getMonth()];
  const date = d.getDate();
  const year = d.getFullYear();
  return `${day}, ${month} ${String(date).padStart(2, "0")}, ${year}`;
}

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { userId, userName: rawUserName, topics: rawTopics } = body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const userName = typeof rawUserName === "string" ? rawUserName.trim().slice(0, 200) : "there";
  const topics = Array.isArray(rawTopics) ? rawTopics.map(t => String(t).trim().slice(0, 100)).filter(Boolean) : [];

  const dateLabel = getDateLabel();

  try {
    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(userName ?? "User", topics ?? [], dateLabel) }],
      })
    );

    const block = response.content?.[0];
    let text = block?.type === "text" ? block.text : "";
    text = stripMarkdownFences(text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("[api/sentinel-generate] JSON parse failed", err?.message, text?.slice(0, 500));
      return res.status(502).json({ error: "Sentinel response was not valid JSON", raw: text?.slice(0, 1000) ?? "" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[api/sentinel-generate] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error: insertError } = await supabase.from("sentinel_briefings").insert({
      user_id: userId,
      generated_at: new Date().toISOString(),
      date_label: parsed.date_label ?? dateLabel,
      briefing: parsed,
      signals_count: typeof parsed.signals_count === "number" ? parsed.signals_count : 0,
    });

    if (insertError) {
      console.error("[api/sentinel-generate] Supabase insert error", insertError);
      return res.status(500).json({ error: insertError.message || "Failed to save briefing" });
    }

    // Insert in-app notification
    const signalCount = typeof parsed.signals_count === "number" ? parsed.signals_count : 0;
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "briefing_ready",
      title: "Your intelligence briefing is ready",
      body: signalCount > 0 ? `${signalCount} signals detected in your category.` : "Fresh insights for your category.",
      read: false,
      link: "/studio/watch",
    }).then(({ error: notifErr }) => {
      if (notifErr) console.error("[api/sentinel-generate] Notification insert error", notifErr);
    });

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[api/sentinel-generate]", err);
    const status = err.status === 401 ? 401 : 502;
    return res.status(status).json({ error: "Something went wrong. Please try again." });
  }
}
