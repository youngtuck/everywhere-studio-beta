import Anthropic from "@anthropic-ai/sdk";
import { getUserResources } from "../_resources.js";
import { clipDna, DNA_LIMITS } from "../_dnaContext.js";
import { callWithRetry } from "../_retry.js";
import { CLAUDE_MODEL } from "../_config.js";

const SYSTEM_PROMPT = `You are the Writer's Room structuring a piece for EVERYWHERE Studio. Your job: take the selected angle(s) and the Composer's conversation, and produce a detailed section-by-section outline (beat sheet).

Think of this as the whiteboard where the room maps out every section. Each section should have a clear purpose, specific beats to hit, and serve the overall thesis.

CRITICAL RULES:
- Never use em-dashes. Use commas, periods, colons, or semicolons.
- Return ONLY valid JSON. No preamble, no markdown fences, no commentary.
- The outline should be detailed enough that a writer could produce the draft from it alone.
- Include an opening hook that earns the read in 7 seconds.
- Include a strong close that leaves the reader with something to do or think about.

SECTION COUNT BY FORMAT (do not over-generate sections):
- LinkedIn post / Social post: 3-4 sections
- Newsletter: 4-5 sections
- Sunday Story / Essay / Long-form essay: 5-7 sections
- Podcast script: 4-6 sections
- Freestyle: 3-5 sections
- Book chapter: 6-8 sections
Match the section count to the format. A LinkedIn post with 7 sections is wrong. A long essay with 3 sections is too thin.

Return this exact JSON structure:
{
  "thesis": "One sentence: the core argument or message of this piece",
  "estimatedLength": 1200,
  "outline": [
    {
      "id": "section-1",
      "section": "Section heading",
      "beats": ["Key point 1", "Key point 2", "Key point 3"],
      "purpose": "What this section accomplishes for the reader"
    }
  ]
}`;

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { conversationSummary, selectedAngles = [], userNotes = "", outputType = "essay", voiceDnaMd, brandDnaMd, methodDnaMd, userId } = req.body || {};
  if (!conversationSummary) return res.status(400).json({ error: "conversationSummary is required" });

  let resources = { voiceDna: "", brandDna: "", methodDna: "", references: "" };
  if (userId) {
    try { resources = await getUserResources(userId, { caller: "writers-room.structure" }); } catch (e) {
      console.error("[structure] Failed to load resources:", e);
    }
  }

  const A = DNA_LIMITS.auxiliary;
  const voiceBlock = clipDna(((resources.voiceDna || "") + "\n" + (voiceDnaMd || "")).trim(), A.voice);
  const brandBlock = clipDna(((resources.brandDna || "") + "\n" + (brandDnaMd || "")).trim(), A.brand);
  const methodBlock = clipDna(((resources.methodDna || "") + "\n" + (methodDnaMd || "")).trim(), A.method);

  let systemPrompt = SYSTEM_PROMPT;
  if (voiceBlock) {
    systemPrompt += `\n\nVOICE DNA:\n${voiceBlock}`;
  }
  if (brandBlock) {
    systemPrompt += `\n\nBRAND DNA:\n${brandBlock}`;
  }
  if (methodBlock) {
    systemPrompt += `\n\nMETHOD DNA (use these frameworks and terminology exactly):\n${methodBlock}`;
  }

  const anglesText = selectedAngles.length > 0
    ? `\n\nSelected angles:\n${selectedAngles.map((a, i) => `${i + 1}. ${typeof a === "string" ? a : JSON.stringify(a)}`).join("\n")}`
    : "";

  const notesText = userNotes.trim() ? `\n\nComposer's notes: ${userNotes.trim()}` : "";

  try {
    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Output type: ${outputType}\n\nConversation:\n${conversationSummary.slice(0, 4000)}${anglesText}${notesText}\n\nProduce the beat sheet. Return ONLY valid JSON.`,
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

    return res.json({ thesis: "", estimatedLength: 0, outline: [] });
  } catch (err) {
    console.error("[structure]", err);
    return res.status(err.status === 401 ? 401 : 502).json({ error: "Something went wrong. Please try again." });
  }
}
