import Anthropic from "@anthropic-ai/sdk";
import { getUserResources } from "./_resources.js";
import { clipDna, DNA_LIMITS, methodDnaSystemAppendix } from "./_dnaContext.js";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { requireAuth } from "./_auth.js";
import { formatStructuredIntakeForPrompt } from "./_structuredIntakePrompt.js";

function sanitizeContent(text) {
  if (!text) return text;
  let result = text.replace(/\s*\u2014\s*/g, ", ");
  result = result.replace(/\s+\u2013\s+/g, ", ");
  result = result.replace(/, ,/g, ",").replace(/,\./g, ".").replace(/,\s*,/g, ",");
  return result;
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured." });

  const {
    draft = "",
    instruction = "",
    conversationSummary = "",
    outputType = "freestyle",
    structuredIntake = null,
  } = req.body;

  const rawTalkMins = req.body?.talkDurationMinutes;
  const talkDurationMinutes =
    typeof rawTalkMins === "number" && Number.isFinite(rawTalkMins)
      ? Math.min(180, Math.max(3, Math.round(rawTalkMins)))
      : null;

  const userId = req.body?.userId;

  if (!draft.trim() || !instruction.trim()) {
    return res.status(400).json({ error: "Both draft and instruction are required." });
  }

  let resources = { voiceDna: "", brandDna: "", methodDna: "", references: "", composerMemory: "" };
  if (userId) {
    try {
      resources = await getUserResources(userId, { caller: "propose-revision" });
    } catch (e) {
      console.error("[api/propose-revision] Failed to load resources", e);
    }
  }

  const G = DNA_LIMITS.generate;
    const client = new Anthropic({ apiKey });

    // ── Step 1: Generate the revision (same logic as generate.js revision mode) ──

    let revisionSystem = `You are a surgical editor. You are revising an existing draft.

ABSOLUTE RULES:
1. PRESERVE THE AUTHOR'S VOICE. Do not change the tone, style, or personality. If the original is personal and reflective, the revision must be personal and reflective. If it's casual, keep it casual.
2. DO NOT ADD NEW CONCEPTS, FRAMEWORKS, PRODUCTS, OR BRAND NAMES that don't exist in the original. If a framework name doesn't appear in the original, don't add it.
3. DO NOT EXPAND. If the original is 800 words, the revision should be approximately 800 words. Revision means fixing, not growing.
4. DO NOT SHIFT THE REGISTER. If the original is a personal essay, don't turn it into a white paper. If it's a story, don't turn it into a pitch deck.
5. ONLY FIX WHAT WAS FLAGGED. Read the revision notes carefully. Fix those specific issues. Leave everything else untouched.
6. If the revision notes say "fix repetition," CUT the redundant sections. Don't rephrase them.
7. If the revision notes say "source claims," either add a credible source or soften the claim to "some research suggests" or remove it. Do NOT invent sources.
8. NEVER add consulting language, sales copy, or strategic frameworks unless they existed in the original.
9. PRESERVE ALL FORMATTING. If the original uses markdown headings (##), bold (**text**), or other formatting, the revision must maintain identical formatting. Do not strip headings, subheads, or structural markers, unless the piece is a spoken talk script (outputType talk): then keep plain paragraphs and inline [pause] or [beat] markers only, never add ## headings.

YOUR JOB: Make the minimum changes necessary to address the specific feedback. A good revision is one where a reader can barely tell what changed, but the flagged issues are gone.

CRITICAL FORMATTING RULE: Never use em-dashes (the long dash character) anywhere in your output. Use commas, periods, colons, or semicolons instead.
WORD BAN: Never use the word "vibes" or "vibe." Use atmosphere, energy, tone, character, or feel instead.

Output ONLY the complete revised draft. No commentary, no explanation.`;

    revisionSystem += formatStructuredIntakeForPrompt(structuredIntake);

    if (resources.methodDna?.trim()) {
      revisionSystem += methodDnaSystemAppendix(resources.methodDna, G.method);
    }
    if (resources.voiceDna) {
      revisionSystem += "\n\nVOICE DNA - The revision MUST match this voice:\n" + clipDna(resources.voiceDna, G.voice);
    }
    if (resources.brandDna) {
      revisionSystem += "\n\nBRAND DNA:\n" + clipDna(resources.brandDna, G.brand);
    }

    if (outputType === "talk") {
      const m = talkDurationMinutes ?? 15;
      revisionSystem += `\n\nSPOKEN TALK SCRIPT: keep short paragraphs, inline [pause] and [beat] markers, no ## headings, no footnotes. If length must shift, stay near ${m * 300} words for about ${m} minutes spoken unless revision notes say otherwise.`;
    }

    const revisionResponse = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: revisionSystem,
        messages: [{
          role: "user",
          content: `ORIGINAL DRAFT:\n${draft.slice(0, 8000)}\n\nREVISION NOTES:\n${instruction}`,
        }],
      })
    );

    const proposedText = sanitizeContent(
      revisionResponse.content?.[0]?.type === "text" ? revisionResponse.content[0].text : ""
    );

    if (!proposedText) {
      return res.status(500).json({ error: "Empty revision result." });
    }

    const wordCountBefore = countWords(draft);
    const wordCountAfter = countWords(proposedText);

    // ── Step 2: Generate Reed's narration of the proposed change ──

    const narrationResponse = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        system: `You are Reed, a direct strategic advisor inside a writing studio. Describe what you changed in this revision and why, in 2-3 sentences. Be specific: name the section, paragraph, or lines you changed. Do not hedge. Do not use sycophantic openers. Never use em-dashes. Never start a response with "I". Write like a sharp colleague, not a tool.`,
        messages: [{
          role: "user",
          content: `EDIT INSTRUCTION: ${instruction}\n\nORIGINAL (${wordCountBefore} words, first 2000 chars):\n${draft.slice(0, 2000)}\n\nREVISED (${wordCountAfter} words, first 2000 chars):\n${proposedText.slice(0, 2000)}\n\nDescribe what you changed and why in 2-3 sentences. Include the word count shift naturally.`,
        }],
      })
    );

    const reason = sanitizeContent(
      narrationResponse.content?.[0]?.type === "text" ? narrationResponse.content[0].text : ""
    ) || "Proposed revision ready for your review.";

    return res.json({
      proposedText,
      reason,
      wordCountBefore,
      wordCountAfter,
    });

  } catch (err) {
    console.error("[api/propose-revision] Error:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Failed to generate proposal. Please try again.",
      });
    }
  }
}
