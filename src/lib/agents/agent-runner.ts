import { supabase } from "../supabase";
import { PIPELINE_CONFIG } from "./config";
import type { GateResult, PipelineContext } from "./types";
import { PROMPTS } from "./prompts/index";

function loadPrompt(filename: string): string {
  const prompt = PROMPTS[filename];
  if (!prompt) {
    throw new Error(`Prompt file not found: ${filename}. Available: ${Object.keys(PROMPTS).join(", ")}`);
  }
  return prompt;
}

function buildUserMessage(
  draft: string,
  context: PipelineContext,
  mode: "evaluate" | "fix" = "evaluate",
  previousFeedback?: string
): string {
  if (mode === "fix") {
    return [
      "Fix the issues identified below. Return the corrected draft.",
      "",
      "ISSUES TO FIX:",
      previousFeedback ?? "",
      "",
      "CURRENT DRAFT:",
      draft,
    ].join("\n");
  }

  const parts: string[] = [
    "Evaluate this draft. Return ONLY valid JSON matching this structure:",
    "{",
    '  "status": "PASS" or "FAIL",',
    "  \"score\": 0-100,",
    '  "feedback": "specific issues found, or why it passed",',
    '  "revisedDraft": "corrected version if FAIL, omit if PASS",',
    '  "issues": ["list", "of", "specific", "problems"]',
    "}",
    "",
    "Do not include any text outside the JSON object.",
  ];

  if (context.voiceDnaMd) {
    parts.push("", "USER VOICE DNA:", context.voiceDnaMd);
  }

  if (context.brandDnaMd) {
    parts.push("", "BRAND DNA:", context.brandDnaMd);
  }

  if (context.methodDnaMd) {
    parts.push("", "METHOD DNA:", context.methodDnaMd);
  }

  if (context.previousOutputTitles?.length) {
    parts.push(
      "",
      "PREVIOUS OUTPUT TITLES (for dedup check):",
      context.previousOutputTitles.join("\n")
    );
  }

  if (context.targetPlatform) {
    parts.push("", `TARGET PLATFORM: ${context.targetPlatform}`);
  }

  parts.push("", `OUTPUT TYPE: ${context.outputType}`, "", "DRAFT TO EVALUATE:", draft);

  return parts.join("\n");
}

function parseResponse(responseText: string, gateName: string): GateResult {
  const timestamp = new Date().toISOString();

  try {
    const cleaned = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        gate: gateName,
        status: parsed.status === "PASS" ? "PASS" : parsed.status === "FAIL" ? "FAIL" : "FLAG",
        score: typeof parsed.score === "number" ? parsed.score : 0,
        feedback: parsed.feedback || "",
        revisedDraft: parsed.revisedDraft || undefined,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        timestamp,
      };
    }
  } catch {
    // fall through to FLAG
  }

  return {
    gate: gateName,
    status: "FLAG",
    score: 50,
    feedback: responseText.slice(0, 2000),
    issues: [],
    timestamp,
  };
}

export async function runAgent(
  promptFilename: string,
  gateName: string,
  draft: string,
  context: PipelineContext,
  mode: "evaluate" | "fix" = "evaluate",
  previousFeedback?: string
): Promise<GateResult> {
  const systemPrompt = await loadPrompt(promptFilename);
  const userMessage = buildUserMessage(draft, context, mode, previousFeedback);

  const { data, error } = await supabase.functions.invoke("claude-agent", {
    body: {
      model: PIPELINE_CONFIG.model,
      maxTokens: PIPELINE_CONFIG.maxTokensPerGate,
      systemPrompt,
      userMessage,
    },
  });

  if (error || !data?.text) {
    return {
      gate: gateName,
      status: "FLAG",
      score: 0,
      feedback: `Request failed: ${error?.message || "No response"}`,
      issues: ["SYSTEM_ERROR"],
      timestamp: new Date().toISOString(),
    };
  }

  return parseResponse(data.text as string, gateName);
}

