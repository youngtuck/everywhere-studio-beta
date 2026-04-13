import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { requireAuth } from "./_auth.js";

const SYSTEM_PROMPT = `You are a Voice DNA analyst for EVERYWHERE Studio. Given interview responses and/or authentic writing samples (plain text and/or PDF documents from the same author),
produce a structured Voice DNA profile. Respond with ONLY a raw JSON object.
No preamble. No markdown code fences. No explanation. Pure JSON only.
The JSON must be parseable by JSON.parse() with no preprocessing.`;

function appendVoiceDnaJsonSchema(lines) {
  lines.push(
    "",
    "Generate a Voice DNA profile as this exact JSON structure:",
    "{",
    '  "voiceDna": {',
    '    "voice_fidelity": <number 0-100>,',
    '    "voice_layer": <number 0-100>,',
    '    "value_layer": <number 0-100>,',
    '    "personality_layer": <number 0-100>,',
    '    "traits": {',
    '      "vocabulary_and_syntax": <0-100>,',
    '      "tonal_register": <0-100>,',
    '      "rhythm_and_cadence": <0-100>,',
    '      "metaphor_patterns": <0-100>,',
    '      "structural_habits": <0-100>',
    "    },",
    '    "summary": "<2-3 sentence description>",',
    '    "signature_phrases": ["<3-5 phrases>"],',
    '    "prohibited_patterns": ["<3-5 AI patterns this person never uses>"],',
    '    "contraction_frequency": "<low | medium | high>",',
    '    "sentence_length": "<short | medium | long | varied>",',
    '    "mode": "single"',
    "  },",
    '  "markdown": "<full Voice DNA .md document as a string>"',
    "}"
  );
}

function buildUserMessage(userName, responses, textSamples) {
  const lines = [];

  if (responses && typeof responses === "object" && !Array.isArray(responses) && Object.keys(responses).length > 0) {
    lines.push(`Interview responses from ${userName}:`);
    for (const [key, value] of Object.entries(responses)) {
      lines.push(`${key}: ${String(value)}`);
    }
  } else if (Array.isArray(responses) && responses.length > 0) {
    lines.push(`Conversation with ${userName}:`);
    responses.forEach((m) => {
      const role = m.role === "assistant" || m.role === "reed" ? "Reed" : userName;
      if (m.content && String(m.content).trim()) {
        lines.push(`${role}: ${String(m.content).trim()}`);
      }
    });
  } else if (textSamples && typeof textSamples === "string" && textSamples.trim()) {
    lines.push(`Writing samples from ${userName}:`);
    lines.push(textSamples.trim());
  } else if (typeof responses === "string" && responses.trim()) {
    lines.push(`Writing samples from ${userName}:`);
    lines.push(responses.trim());
  }

  if (lines.length === 0) {
    return null;
  }

  appendVoiceDnaJsonSchema(lines);
  return lines.join("\n");
}

/** Build multimodal user content: instruction text + one document block per PDF. */
function buildWritingSamplesWithPdfContent(userName, plainText, pdfAttachments) {
  const valid = (pdfAttachments || []).filter(
    (p) => p && typeof p.base64 === "string" && p.base64.length > 200
  );
  if (valid.length === 0) {
    return null;
  }

  const lines = [];
  if (plainText && plainText.trim()) {
    lines.push(`Plain text writing samples from ${userName}:`, "", plainText.trim(), "");
  }
  lines.push(
    `The same author attached ${valid.length} PDF file(s) after this text block.`,
    "Read every page. Combine what you see in the PDFs with any plain text above.",
    "Infer vocabulary, rhythm, cadence, sentence shape, stance, and recurring phrases from the combined material.",
    ""
  );
  appendVoiceDnaJsonSchema(lines);

  const content = [{ type: "text", text: lines.join("\n") }];
  for (const p of valid) {
    let data = String(p.base64);
    if (data.includes(",")) data = data.split(",").pop() || "";
    data = data.replace(/\s/g, "");
    if (data.length < 200) continue;
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    });
  }
  if (content.length < 2) {
    return null;
  }
  return content;
}

function stripMarkdownFences(text) {
  if (!text || typeof text !== "string") return text;
  let out = text.trim();
  const codeBlockRe = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = out.match(codeBlockRe);
  if (m) out = m[1].trim();
  return out;
}

function tryParseJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
    return { parsed, error: null };
  } catch (err) {
    return { parsed: null, error: err };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const body = req.body || {};
  const { responses, userName = "the user", textSamples, text: textInput, pdfAttachments } = body;
  const plainText = String(textSamples || textInput || "").trim();

  try {
    const client = new Anthropic({ apiKey });

    const pdfList = Array.isArray(pdfAttachments) ? pdfAttachments : [];
    const multimodalContent = buildWritingSamplesWithPdfContent(userName, plainText, pdfList);

    let userMessage;
    if (multimodalContent) {
      userMessage = { role: "user", content: multimodalContent };
    } else {
      const textOnly = buildUserMessage(userName, responses, plainText || null);
      if (!textOnly) {
        return res.status(400).json({
          error: "No voice content provided. Upload text files, add writing samples, or send interview responses.",
          hint: "Send { text: '...' } with plain text, optional { pdfAttachments: [{ filename, base64 }] }, or { responses: { question: answer } }.",
        });
      }
      userMessage = { role: "user", content: textOnly };
    }

    const response = await callWithRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [userMessage],
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
      console.error("[api/voice-dna] Failed to parse JSON", error, text.slice(0, 500));
      return res
        .status(502)
        .json({ error: "Voice DNA response was not valid JSON", raw: text.slice(0, 500) });
    }

    const { voiceDna, markdown } = parsed;
    return res.status(200).json({ voiceDna, markdown });
  } catch (err) {
    console.error("[api/voice-dna]", err);
    const msg = err?.message || String(err);
    if (msg.includes("document") || msg.includes("pdf") || msg.includes("PDF")) {
      return res.status(502).json({
        error:
          "One or more PDFs could not be read by the model. Try exporting the PDF to plain text (.txt) and upload that instead.",
      });
    }
    return res.status(502).json({ error: "Something went wrong. Please try again." });
  }
}
