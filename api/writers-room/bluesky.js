import Anthropic from "@anthropic-ai/sdk";
import { getUserResources } from "../_resources.js";
import { clipDna, DNA_LIMITS } from "../_dnaContext.js";
import { callWithRetry } from "../_retry.js";
import { CLAUDE_MODEL } from "../_config.js";
import { setCorsHeaders } from "../_cors.js";

const SYSTEM_PROMPT = `You are the Writer's Room for EVERYWHERE Studio. Sara (Chief of Staff) is composing, and Josh (Category Designer) is leading the creative direction.

Your job: take the raw conversation between Reed and the Composer and generate exactly 2 genuinely different creative angles for this piece. Each angle should represent a fundamentally different approach, not variations on the same theme.

Think like a real writer's room. One angle might be provocative and contrarian. Another might be deeply personal. Another might lead with data. Another might use narrative structure. They should make the Composer say "I hadn't thought of it that way."

CRITICAL RULES:
- Never use em-dashes. Use commas, periods, colons, or semicolons.
- Return ONLY valid JSON. No preamble, no markdown fences, no commentary.
- Each angle must have a genuinely different thesis and structure.
- Hooks must pass the 7-second test: would someone stop scrolling?

Return this exact JSON structure:
{
  "angles": [
    {
      "id": "angle-1",
      "title": "5-8 word punchy name",
      "description": "2-3 sentences explaining this approach",
      "hook": "The exact opening line or image this angle would use",
      "approach": "How the piece would be structured with this angle"
    }
  ]
}`;

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { conversationSummary, outputType = "essay", voiceDnaMd, brandDnaMd, methodDnaMd, userId } = req.body || {};
  if (!conversationSummary) return res.status(400).json({ error: "conversationSummary is required" });

  let resources = { voiceDna: "", brandDna: "", methodDna: "", references: "" };
  if (userId) {
    try { resources = await getUserResources(userId, { caller: "writers-room.bluesky" }); } catch (e) {
      console.error("[bluesky] Failed to load resources:", e);
    }
  }

  const A = DNA_LIMITS.auxiliary;
  const voiceBlock = clipDna(((resources.voiceDna || "") + "\n" + (voiceDnaMd || "")).trim(), A.voice);
  const brandBlock = clipDna(((resources.brandDna || "") + "\n" + (brandDnaMd || "")).trim(), A.brand);
  const methodBlock = clipDna(((resources.methodDna || "") + "\n" + (methodDnaMd || "")).trim(), A.method);

  let systemPrompt = SYSTEM_PROMPT;
  if (voiceBlock) {
    systemPrompt += `\n\nVOICE DNA (write hooks that sound like this person):\n${voiceBlock}`;
  }
  if (brandBlock) {
    systemPrompt += `\n\nBRAND DNA:\n${brandBlock}`;
  }
  if (methodBlock) {
    systemPrompt += `\n\nMETHOD DNA (use proprietary terms exactly):\n${methodBlock}`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Output type: ${outputType}\n\nConversation between Reed and the Composer:\n\n${conversationSummary.slice(0, 6000)}\n\nGenerate exactly 2 creative angles for this piece. Return ONLY valid JSON.`,
        }],
      })
    );

    const text = response.content?.[0]?.type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json(parsed);
      }
    } catch {}

    return res.json({ angles: [] });
  } catch (err) {
    console.error("[bluesky]", err);
    return res.status(err.status === 401 ? 401 : 502).json({ error: "Something went wrong. Please try again." });
  }
}
