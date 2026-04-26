import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";
import { requireAuth } from "./_auth.js";
import { getUserResources } from "./_resources.js";
import { dnaDebug } from "./_dnaDebugLog.js";
import { clipDna, DNA_LIMITS } from "./_dnaContext.js";
import { setCorsHeaders } from "./_cors.js";

const CHECKPOINT_GATES = [
  { name: "Echo", file: "gate-0-echo.md", label: "Deduplication", displayName: "Deduplication" },
  { name: "Priya", file: "gate-1-priya.md", label: "Research Validation", displayName: "Research Validation" },
  { name: "Jordan", file: "gate-2-jordan.md", label: "Voice Authenticity", displayName: "Voice Authenticity" },
  { name: "David", file: "gate-3-david.md", label: "Engagement", displayName: "Engagement Optimization" },
  { name: "Elena", file: "gate-4-elena.md", label: "SLOP Detection", displayName: "SLOP Detection" },
  { name: "Natasha", file: "gate-5-natasha.md", label: "Editorial", displayName: "Editorial Excellence" },
  { name: "Marcus + Marshall", file: "gate-6-perspective.md", label: "Perspective", displayName: "Perspective and Risk" },
];

const HVT_GATE = { name: "Human Voice Test", file: "gate-7-human-voice.md", label: "AI Detection", displayName: "Human Voice Test" };

// Combined list for backward compat with gateSubset filtering
const GATE_FILES = [...CHECKPOINT_GATES, HVT_GATE];

// Prompt loading with detailed error reporting
function loadPrompt(filename) {
  const paths = [
    path.join(process.cwd(), "src", "lib", "agents", "prompts", filename),
    path.join("/var/task", "src", "lib", "agents", "prompts", filename),
  ];
  if (typeof __dirname !== "undefined") {
    paths.push(path.join(__dirname, "..", "src", "lib", "agents", "prompts", filename));
  }
  for (const p of paths) {
    try {
      const content = fs.readFileSync(p, "utf-8");
      if (content) return content;
    } catch {}
  }
  console.error(`[run-pipeline] PROMPT NOT FOUND: ${filename}. Tried: ${paths.join(", ")}`);
  return null;
}

const promptCache = {};
function getPrompt(filename) {
  if (!promptCache[filename]) {
    promptCache[filename] = loadPrompt(filename);
  }
  return promptCache[filename];
}

function parseGateResponse(text) {
  let status = "PASS";
  let score = 75;
  let feedback = text || "";
  let issues = [];
  /** Optional one-liner from Jordan when Method DNA is present; clients may ignore. */
  let methodologyTermFidelity;

  // Try JSON first
  try {
    const cleaned = (text || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.status) {
        const s = String(parsed.status).toUpperCase();
        status = s === "PASS" ? "PASS" : (s === "FAIL" || s.includes("BLOCK")) ? "FAIL" : "FLAG";
      }
      if (typeof parsed.score === "number") score = Math.round(Math.min(100, Math.max(0, parsed.score)));
      if (parsed.feedback) feedback = String(parsed.feedback).slice(0, 500);
      if (Array.isArray(parsed.issues)) issues = parsed.issues.map(String).slice(0, 10);
      if (parsed.methodologyTermFidelity != null && String(parsed.methodologyTermFidelity).trim()) {
        methodologyTermFidelity = String(parsed.methodologyTermFidelity)
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 320);
      }
      let commentInvitationTest;
      if (parsed.comment_invitation_test && typeof parsed.comment_invitation_test === "object") {
        const citStatus = String(parsed.comment_invitation_test.status || "").toUpperCase();
        commentInvitationTest = {
          status: citStatus === "FLAG" ? "FLAG" : "PASS",
          feedback: String(parsed.comment_invitation_test.feedback || "").slice(0, 500),
        };
      }
      if (status === "FAIL") score = Math.min(score, 50);
      const out = { status, score, feedback, issues };
      if (methodologyTermFidelity) out.methodologyTermFidelity = methodologyTermFidelity;
      if (commentInvitationTest) out.commentInvitationTest = commentInvitationTest;
      return out;
    }
  } catch {}

  // Regex fallback
  const statusMatch = (text || "").match(/STATUS:\s*(PASS|FAIL|FLAG|REVISE|AUTOMATIC BLOCK|BLOCKED|BLOCK|CLEAR)/i)
    || (text || "").match(/CHECKPOINT\s*\d+\s*STATUS:\s*(PASS|FAIL|FLAG|REVISE|AUTOMATIC BLOCK|BLOCKED|CLEAR)/i);
  if (statusMatch) {
    const s = statusMatch[1].toUpperCase();
    status = (s === "PASS" || s === "CLEAR") ? "PASS" : (s === "FAIL" || s.includes("BLOCK")) ? "FAIL" : "FLAG";
  }

  const scoreMatch = (text || "").match(/SCORE:\s*(\d+)/i) || (text || "").match(/(\d+)\/100/);
  if (scoreMatch) score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));

  const lines = (text || "").split("\n").filter(l => l.trim() && !l.startsWith("#") && !l.startsWith("|"));
  feedback = lines.slice(0, 5).join("\n").trim().slice(0, 500);
  if (status === "FAIL") score = Math.min(score, 50);
  return { status, score, feedback, issues };
}

function parseBetterishResponse(text) {
  const emptyBreakdown = {
    voiceAuthenticity: 0, researchDepth: 0, hookStrength: 0, slopScore: 0,
    editorialQuality: 0, perspective: 0, engagement: 0, platformFit: 0,
    strategicValue: 0, nvcCompliance: 0,
  };

  // Try JSON first
  try {
    const cleaned = (text || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const total = Math.round(parsed.total || parsed.totalScore || 0);
      const verdict = parsed.verdict
        ? String(parsed.verdict).toUpperCase()
        : total >= 75 ? "PUBLISH" : total >= 50 ? "REVISE" : "REJECT";
      return {
        total,
        verdict,
        breakdown: parsed.breakdown || emptyBreakdown,
        topIssue: parsed.topIssue || "",
        gutCheck: parsed.gutCheck || "",
      };
    }
  } catch {}

  // Regex fallback
  let total = 0;
  const totalMatch = (text || "").match(/TOTAL:\s*(\d+)/i) || (text || "").match(/composite.*?(\d{3,4})/i);
  if (totalMatch) total = Math.min(1000, Math.max(0, parseInt(totalMatch[1])));
  const verdict = total >= 900 ? "PUBLISH" : total >= 600 ? "REVISE" : "REJECT";
  return { total, verdict, breakdown: emptyBreakdown, topIssue: "", gutCheck: "" };
}

// HVT feedback parsing helpers
function extractHVTIssue(feedback, flaggedLine) {
  if (!feedback || !flaggedLine) return "Reads as generated rather than written";
  const lower = flaggedLine.toLowerCase();
  if (/alongside that|threaded through|with that in mind|that said|it's worth noting|building on that|stepping back|zooming out|taken together|beyond that|to make this concrete/.test(lower)) {
    return "AI-pattern transition phrase";
  }
  if (/not as .+\. as .+|this isn't about .+\. it's about/.test(lower)) {
    return "Fragment pair construction, a reliable generation tell";
  }
  // Try to extract from feedback: "quoted line | vector | reason | suggestion"
  const escaped = flaggedLine.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = feedback.match(new RegExp(escaped + "[^|]*\\|[^|]*\\|\\s*([^|]+)", "i"));
  return match ? match[1].trim() : "Reads as generated rather than written";
}

function extractHVTVector(feedback, flaggedLine) {
  if (!feedback || !flaggedLine) return "Construction";
  const lower = flaggedLine.toLowerCase();
  if (/alongside that|threaded through|with that in mind|that said|it's worth noting|building on that|stepping back|zooming out|taken together|beyond that|to make this concrete/.test(lower)) return "Transitions";
  if (/not as .+\. as .+|this isn't about .+\. it's about/.test(lower)) return "Fragment Pairs";
  const vectors = ["Rhythm", "Transitions", "Structure", "Register", "Construction", "Contractions", "Fragment Pairs", "Close"];
  const escaped = flaggedLine.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = feedback.match(new RegExp(escaped + "[^|]*\\|\\s*([^|]+)", "i"));
  if (match) {
    const found = vectors.find(v => match[1].toLowerCase().includes(v.toLowerCase()));
    if (found) return found;
  }
  return "Construction";
}

function extractHVTSuggestion(feedback, flaggedLine) {
  if (!feedback || !flaggedLine) return "";
  const escaped = flaggedLine.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = feedback.match(new RegExp(escaped + "[^|]*\\|[^|]*\\|[^|]*\\|\\s*(.+?)(?:\\n|$)", "i"));
  return match ? match[1].trim() : "";
}

export const config = { maxDuration: 180 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { draft, outputType, voiceDnaMd, brandDnaMd, methodDnaMd, userId, outputId, gateSubset, hvtOnly } = req.body || {};
  if (!draft) return res.status(400).json({ error: "draft is required" });

  // hvtOnly: rerun just the Human Voice Test (for HVT retry from Review stage)
  // gateSubset: run specific gates only (for Layer 2 runs)
  const gatesToRun = hvtOnly
    ? [HVT_GATE]
    : gateSubset && Array.isArray(gateSubset)
      ? GATE_FILES.filter(g => gateSubset.includes(g.name))
      : GATE_FILES;

  const gateResults = [];
  let betterishScore = { total: 0, verdict: "REJECT", breakdown: { voiceAuthenticity: 0, researchDepth: 0, hookStrength: 0, slopScore: 0, editorialQuality: 0, perspective: 0, engagement: 0, platformFit: 0, strategicValue: 0, nvcCompliance: 0 }, topIssue: "", gutCheck: "" };
  let currentDraft = draft;
  let blockedAt = null;
  const startTime = Date.now();

  try {
    const client = new Anthropic({ apiKey });

    const L = DNA_LIMITS.pipeline;
    let voiceForGates = (voiceDnaMd || "").trim();
    let brandForGates = (brandDnaMd || "").trim();
    let methodForGates = (methodDnaMd || "").trim();
    if (userId) {
      try {
        const res = await getUserResources(userId, { caller: "run-pipeline" });
        if (!voiceForGates) voiceForGates = (res.voiceDna || "").trim();
        if (!brandForGates) brandForGates = (res.brandDna || "").trim();
        if (!methodForGates) methodForGates = (res.methodDna || "").trim();
      } catch (e) {
        console.error("[run-pipeline] getUserResources:", e);
      }
    }
    voiceForGates = clipDna(voiceForGates, L.voice);
    brandForGates = clipDna(brandForGates, L.brand);
    methodForGates = clipDna(methodForGates, L.method);

    dnaDebug("run-pipeline.handler", {
      hasUserId: !!userId,
      hvtOnly: !!hvtOnly,
      gateSubsetSize: Array.isArray(gateSubset) ? gateSubset.length : 0,
      voiceForGatesLen: voiceForGates.length,
      brandForGatesLen: brandForGates.length,
      methodForGatesLen: methodForGates.length,
      voiceFromBody: !!(voiceDnaMd || "").trim(),
      brandFromBody: !!(brandDnaMd || "").trim(),
      methodFromBody: !!(methodDnaMd || "").trim(),
    });

    console.log(`[run-pipeline] Starting for output ${outputId}`);

    // runGate is defined HERE inside the handler so it has closure access
    // to client, model, currentDraft, outputType, voice/brand/method for gates
    async function runGate(gate, index) {
      const prompt = getPrompt(gate.file);
      if (!prompt) {
        return {
          gate: gate.displayName || gate.label, internalName: gate.name,
          status: "FLAG",
          score: 0,
          feedback: `Prompt file ${gate.file} could not be loaded from the serverless filesystem.`,
          issues: ["PROMPT_NOT_LOADED"],
        };
      }

      const userMessage = [
        "Evaluate this draft. Return ONLY valid JSON matching this structure:",
        '{ "status": "PASS" or "FAIL", "score": 0-100, "feedback": "specific issues or why it passed", "issues": ["list", "of", "problems"] }',
        "",
        "Do not include any text outside the JSON object.",
        "",
        `OUTPUT TYPE: ${outputType || "essay"}`,
        voiceForGates ? `VOICE DNA:\n${voiceForGates}` : "No Voice DNA available. Evaluate voice based on the content's internal consistency alone. Do not penalize for lack of Voice DNA match.",
        brandForGates ? `BRAND DNA:\n${brandForGates}` : "",
        methodForGates ? `METHOD DNA (score methodology fidelity; proprietary terms must not be genericized):\n${methodForGates}` : "",
        `\nCONTENT TO EVALUATE:\n\n${currentDraft}`,
      ].filter(Boolean).join("\n\n");

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`[run-pipeline] Gate ${index}: ${gate.name} - calling API (attempt ${attempt + 1})`);
          const response = await callWithRetry(() =>
            client.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 4096,
              system: prompt,
              messages: [{ role: "user", content: userMessage }],
            }),
            1
          );
          const text = response.content[0]?.type === "text" ? response.content[0].text : "";
          console.log(`[run-pipeline] Gate ${index}: ${gate.name} - got response (${text.length} chars)`);
          const parsed = parseGateResponse(text);
          return { ...parsed, gate: gate.displayName || gate.label, internalName: gate.name };
        } catch (err) {
          const isRateLimit = err.status === 429 || (err.message || "").includes("rate_limit");
          if (isRateLimit && attempt === 0) {
            console.log(`[run-pipeline] Gate ${index}: ${gate.name} - 429 rate limit, waiting 8s before retry`);
            await new Promise(resolve => setTimeout(resolve, 8000));
            continue;
          }
          console.error(`[run-pipeline] Gate ${index} (${gate.name}) API ERROR:`, err.message, err.status || "");
          return {
            gate: gate.displayName || gate.label, internalName: gate.name,
            status: "FLAG",
            score: 0,
            feedback: isRateLimit
              ? "This specialist couldn't complete their review due to high demand. You can re-run the pipeline in a moment."
              : "This specialist couldn't complete their review. You can re-run the pipeline to try again.",
            issues: ["API_ERROR"],
          };
        }
      }
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Run gates in parallel with 800ms stagger to avoid rate limits
    const gatePromises = gatesToRun.map((gate, i) =>
      delay(i * 800).then(() => {
        if (Date.now() - startTime > 155000) {
          return { gate: gate.displayName || gate.label, internalName: gate.name, status: "FLAG", score: 0, feedback: "Skipped: time budget exceeded.", issues: ["TIME_BUDGET"] };
        }
        return runGate(gate, i);
      })
    );
    const gateSettled = await Promise.allSettled(gatePromises);

    for (let i = 0; i < gateSettled.length; i++) {
      const result = gateSettled[i];
      if (result.status === "fulfilled") {
        gateResults.push(result.value);
        if (result.value.status === "FAIL" && !blockedAt) blockedAt = result.value.gate;
      } else {
        gateResults.push({
          gate: gatesToRun[i].displayName || gatesToRun[i].label,
          internalName: gatesToRun[i].name,
          status: "FLAG",
          score: 0,
          feedback: "This specialist could not complete their review. Try again.",
          issues: ["PARALLEL_ERROR"],
        });
      }
    }

    // Betterish scorer
    const elapsed2 = Date.now() - startTime;
    if (elapsed2 < 155000) {
      const betterishPrompt = getPrompt("betterish.md");
      if (betterishPrompt) {
        try {
          console.log("[run-pipeline] Running Betterish scorer");
          const response = await callWithRetry(() =>
            client.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 4096,
              system: betterishPrompt,
              messages: [{
                role: "user",
                content: [
                  `Score this ${outputType || "essay"} on a 0-100 scale.

CALIBRATION (use these as anchors):
- 90-100: Exceptional. Could be published in a major outlet tomorrow.
- 80-89: Strong. Publication-ready with minor polish.
- 75-79: Good. Meets the bar for professional publication.
- 65-74: Decent but needs revision. One or two issues holding it back.
- 50-64: Below standard. Multiple issues.
- Below 50: Not ready.

Most content written by a competent professional with a clear point, good structure, and authentic voice should score 75-85. Do not penalize for being concise. Do not penalize for conversational tone if the platform is LinkedIn or social. Score based on: does this accomplish what it set out to do, for the audience it targets, on the platform it will appear?`,
                  "Return ONLY valid JSON:",
                  '{ "total": <0-100>, "verdict": "PUBLISH"/"REVISE"/"REJECT", "breakdown": { "voiceAuthenticity": <0-100>, "researchDepth": <0-100>, "hookStrength": <0-100>, "slopScore": <0-100>, "editorialQuality": <0-100>, "perspective": <0-100>, "engagement": <0-100>, "platformFit": <0-100>, "strategicValue": <0-100>, "nvcCompliance": <0-100> }, "topIssue": "biggest issue", "gutCheck": "one sentence" }',
                  "",
                  "Do not include any text outside the JSON object.",
                  "",
                  `CONTENT TO SCORE:\n\n${currentDraft}`,
                ].join("\n"),
              }],
            }),
            1
          );
          const text = response.content[0]?.type === "text" ? response.content[0].text : "";
          console.log(`[run-pipeline] Betterish response (${text.length} chars)`);
          betterishScore = parseBetterishResponse(text);
        } catch (err) {
          console.error("[run-pipeline] Betterish scorer failed:", err.message);
        }
      } else {
        console.error("[run-pipeline] betterish.md prompt not found");
      }
    } else {
      console.log("[run-pipeline] Skipping Betterish scorer (time budget)");
    }

    const durationMs = Date.now() - startTime;

    // Separate HVT result from checkpoint results
    const hvtGateResult = gateResults.find(g => g.gate === "Human Voice Test" || g.internalName === "Human Voice Test");
    const checkpointResults = gateResults.filter(g => g.gate !== "Human Voice Test" && g.internalName !== "Human Voice Test");

    // Build structured HVT result
    const humanVoiceTest = hvtGateResult ? {
      verdict: hvtGateResult.status === "PASS" ? "PASSES" : "NEEDS_WORK",
      score: hvtGateResult.score,
      feedback: hvtGateResult.feedback,
      flaggedLines: (hvtGateResult.issues || []).map((line, i) => ({
        lineIndex: i,
        original: line,
        issue: extractHVTIssue(hvtGateResult.feedback, line),
        vector: extractHVTVector(hvtGateResult.feedback, line),
        suggestion: extractHVTSuggestion(hvtGateResult.feedback, line),
      })),
    } : null;

    // Normalize Impact Score to 0-100 scale
    const rawTotal = betterishScore.total || 0;
    const normalizedTotal = Math.round(Math.min(100, Math.max(0, rawTotal)));
    const impactScore = {
      total: normalizedTotal,
      verdict: normalizedTotal >= 75 ? "PUBLISH" : normalizedTotal >= 50 ? "REVISE" : "REJECT",
      breakdown: betterishScore.breakdown || {},
      topIssue: betterishScore.topIssue || "",
      gutCheck: betterishScore.gutCheck || "",
    };

    const anyCheckpointFailed = checkpointResults.some(g => g.status === "FAIL");
    const hvtFailed = humanVoiceTest && humanVoiceTest.verdict !== "PASSES";
    const status = anyCheckpointFailed || hvtFailed ? "BLOCKED" : "PASSED";
    console.log(`[run-pipeline] Done. Status: ${status}, Impact: ${impactScore.total}, HVT: ${humanVoiceTest?.verdict || "N/A"}, Duration: ${durationMs}ms`);

    // If hvtOnly, return just the HVT result
    if (hvtOnly) {
      return res.status(200).json({
        humanVoiceTest,
        totalDurationMs: durationMs,
      });
    }

    return res.status(200).json({
      status,
      checkpointResults,
      impactScore,
      humanVoiceTest,
      finalDraft: currentDraft,
      blockedAt,
      totalDurationMs: durationMs,
      // Legacy fields for backward compat
      gateResults,
      betterishScore,
    });

  } catch (fatalErr) {
    console.error("[run-pipeline] FATAL:", fatalErr.message, fatalErr.stack);
    return res.status(200).json({
      status: "BLOCKED",
      checkpointResults: gateResults.filter(g => g.gate !== "Human Voice Test" && g.internalName !== "Human Voice Test"),
      impactScore: { total: 0, verdict: "REJECT", breakdown: {}, topIssue: fatalErr.message, gutCheck: "" },
      humanVoiceTest: null,
      finalDraft: currentDraft || draft,
      blockedAt: blockedAt || `Fatal: ${fatalErr.message}`,
      totalDurationMs: Date.now() - startTime,
      // Legacy fields for backward compat
      gateResults,
      betterishScore,
    });
  }
}
