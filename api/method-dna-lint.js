import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./_auth.js";
import { dnaDebug } from "./_dnaDebugLog.js";
import { getUserResources } from "./_resources.js";
import { clipDna, DNA_LIMITS, METHOD_DNA_LEXICON_LINE } from "./_dnaContext.js";
import { callWithRetry } from "./_retry.js";

const LINT_MODEL =
  process.env.METHOD_DNA_LINT_MODEL || "claude-3-5-haiku-20241022";

/**
 * @param {string} text
 * @returns {unknown}
 */
function safeJsonParse(text) {
  const cleaned = String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * @param {unknown} parsed
 * @returns {{ draftSnippet: string; genericPhrase: string; methodTerm: string }[]}
 */
function normalizeItems(parsed) {
  const raw = parsed && typeof parsed === "object" && Array.isArray(parsed.items)
    ? parsed.items
    : [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const draftSnippet = String(row.draftSnippet || row.snippet || "").trim().slice(0, 200);
    const genericPhrase = String(row.genericPhrase || row.draftPhrase || row.generic || "").trim().slice(0, 200);
    const methodTerm = String(row.methodTerm || row.likelyIntended || row.expectedTerm || "").trim().slice(0, 200);
    if (!genericPhrase && !draftSnippet) continue;
    out.push({
      draftSnippet: draftSnippet || genericPhrase,
      genericPhrase: genericPhrase || draftSnippet,
      methodTerm,
    });
    if (out.length >= 15) break;
  }
  return out;
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

  const draft = typeof req.body?.draft === "string" ? req.body.draft.trim() : "";
  if (!draft) return res.status(400).json({ error: "draft required" });

  let methodDna = "";
  try {
    const resources = await getUserResources(auth.user.id, { caller: "method-dna-lint" });
    methodDna = (resources.methodDna || "").trim();
    dnaDebug("method-dna-lint.handler", {
      draftLen: draft.length,
      hasMethodAfterFetch: methodDna.length > 0,
    });
  } catch (e) {
    console.error("[method-dna-lint] getUserResources", e);
    return res.status(500).json({ error: "Could not load Method DNA." });
  }

  if (!methodDna) {
    return res.json({ items: [], skipped: true, reason: "no_method_dna" });
  }

  const L = DNA_LIMITS.methodLint;
  const methodBlock = clipDna(methodDna, L.method);
  const draftBlock = draft.length > L.draft ? `${draft.slice(0, L.draft)}\n\n[draft truncated]` : draft;

  const system = `You compare a user draft against their Method DNA (named frameworks, products, coined terms, and proprietary vocabulary).

Task: find cases where the draft uses a generic or plain-language phrase that likely replaces a specific term or name that Method DNA defines or uses as canonical.

Rules:
- Only flag when Method DNA clearly supplies or implies the proper term. If unsure, omit the row.
- Prefer precision over volume. At most 15 rows. Return fewer when appropriate.
- ${METHOD_DNA_LEXICON_LINE}
- Output a single JSON object only, no markdown fences, no commentary. Shape:
{"items":[{"draftSnippet":"short quote from draft","genericPhrase":"the generic wording","methodTerm":"the Method DNA term or name"}]}

If there are no plausible mismatches, return {"items":[]}.`;

  const userContent = `METHOD DNA:\n${methodBlock}\n\n---\n\nDRAFT:\n${draftBlock}`;

  try {
    const client = new Anthropic({ apiKey });
    const resp = await callWithRetry(() =>
      client.messages.create({
        model: LINT_MODEL,
        max_tokens: 900,
        temperature: 0,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    );

    const block = resp.content?.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const parsed = safeJsonParse(text);
    const items = normalizeItems(parsed);

    return res.json({ items, model: LINT_MODEL });
  } catch (err) {
    console.error("[method-dna-lint]", err);
    return res.status(500).json({ error: "Method term check failed. Try again." });
  }
}
