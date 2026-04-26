import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { callWithRetry } from "../_retry.js";
import { CLAUDE_MODEL } from "../_config.js";
import { setCorsHeaders } from "../_cors.js";

const SBU_AGENTS = [
  { name: "Josh", lens: "Category Designer", question: "Is this a different game or competing on someone else's terms?", file: "josh.md" },
  { name: "Guy", lens: "Business Development", question: "Is there a natural next step for the reader?", file: "guy.md" },
  { name: "Ward", lens: "Sales", question: "Does this attract right-fit and repel wrong-fit?", file: "ward.md" },
  { name: "Scott", lens: "Market Realist", question: "Does the market actually want this?", file: "scott.md" },
  { name: "Dana", lens: "Red Team Lead", question: "What is the best argument against this piece?", file: "dana.md" },
  { name: "Betterish", lens: "Gut Check", question: "Would you click on this? Would you share it?", file: null },
];

function loadAgentPrompt(filename) {
  if (!filename) return null;
  const paths = [
    path.join(process.cwd(), "CLEAN_6_5", filename.replace(".md", "").toUpperCase() + ".md"),
    path.join(process.cwd(), "src", "lib", "agents", "prompts", filename),
  ];
  if (typeof __dirname !== "undefined") {
    paths.push(path.join(__dirname, "..", "CLEAN_6_5", filename.replace(".md", "").toUpperCase() + ".md"));
    paths.push(path.join(__dirname, "..", "src", "lib", "agents", "prompts", filename));
  }
  for (const p of paths) {
    try {
      const content = fs.readFileSync(p, "utf-8");
      if (content) return content;
    } catch {}
  }
  return null;
}

const SARA_SYNTHESIS_PROMPT = `You are Sara, Chief of Staff for EVERYWHERE Studio. You have just received feedback from 6 SBU members who stress-tested a piece of content. Your job: synthesize their feedback into exactly 3 actionable items the Composer should address before publishing.

RULES:
- Never use em-dashes. Use commas, periods, colons, or semicolons.
- Return ONLY valid JSON.
- Each action item must be specific and implementable, not vague advice.
- Prioritize by impact: what would make the biggest difference?

Return this JSON:
{
  "summary": "2-3 sentence synthesis of what the room found",
  "actionItems": ["Specific action 1", "Specific action 2", "Specific action 3"]
}`;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { draft, outputType = "essay", voiceDnaMd, brandDnaMd, userId } = req.body || {};
  if (!draft) return res.status(400).json({ error: "draft is required" });

  const startTime = Date.now();
  const results = [];

  try {
    const client = new Anthropic({ apiKey });

    // Run all 6 SBU agents in parallel
    async function runAgent(agent) {
      const agentPrompt = loadAgentPrompt(agent.file);
      const systemPrompt = agentPrompt
        ? `${agentPrompt}\n\nYou are evaluating a ${outputType} draft. Your lens: ${agent.question}\n\nReturn ONLY valid JSON:\n{ "verdict": "pass" or "flag", "feedback": "2-3 sentences", "suggestion": "specific suggestion if flagged, empty string if pass" }`
        : `You are ${agent.name}, ${agent.lens} for EVERYWHERE Studio. Your lens: ${agent.question}\n\nNever use em-dashes. Return ONLY valid JSON:\n{ "verdict": "pass" or "flag", "feedback": "2-3 sentences", "suggestion": "specific suggestion if flagged, empty string if pass" }`;

      try {
        const response = await callWithRetry(() =>
          client.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: `Evaluate this ${outputType} draft through your lens.\n\n${draft.slice(0, 4000)}` }],
          }),
          1
        );
        const text = response.content?.[0]?.type === "text" ? response.content[0].text : "{}";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        try {
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              agent: agent.name,
              lens: agent.lens,
              verdict: parsed.verdict === "pass" ? "pass" : "flag",
              feedback: String(parsed.feedback || "").slice(0, 300),
              suggestion: String(parsed.suggestion || "").slice(0, 300),
            };
          }
        } catch {}
        return { agent: agent.name, lens: agent.lens, verdict: "pass", feedback: text.slice(0, 300), suggestion: "" };
      } catch (err) {
        console.error(`[stress-test] ${agent.name} failed:`, err.message);
        return { agent: agent.name, lens: agent.lens, verdict: "flag", feedback: "This specialist couldn't complete their review. You can re-run the pipeline to try again.", suggestion: "" };
      }
    }

    // Run SBU agents in staggered pairs to avoid rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const pairs = [[0,1],[2,3],[4,5]]; // Josh+Guy, Ward+Scott, Dana+Betterish
    for (const [a, b] of pairs) {
      const agents = [SBU_AGENTS[a], SBU_AGENTS[b]].filter(Boolean);
      console.log(`[stress-test] Pair: ${agents.map(a => a.name).join(" + ")}`);
      const settled = await Promise.allSettled(agents.map(a => runAgent(a)));
      for (const s of settled) {
        results.push(s.status === "fulfilled" ? s.value : { agent: "Unknown", lens: "", verdict: "flag", feedback: "This specialist couldn't complete their review due to high demand.", suggestion: "" });
      }
      if (b < SBU_AGENTS.length - 1) await delay(3000);
    }

    // Sara synthesis
    let synthesis = { summary: "", actionItems: [] };
    if (Date.now() - startTime < 50000) {
      try {
        console.log("[stress-test] Running Sara synthesis");
        const feedbackSummary = results.map(r => `${r.agent} (${r.lens}): ${r.verdict.toUpperCase()}. ${r.feedback}${r.suggestion ? ` Suggestion: ${r.suggestion}` : ""}`).join("\n");
        const saraResponse = await callWithRetry(() =>
          client.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: SARA_SYNTHESIS_PROMPT,
            messages: [{ role: "user", content: `SBU feedback on this ${outputType}:\n\n${feedbackSummary}\n\nSynthesize into exactly 3 action items. Return ONLY valid JSON.` }],
          }),
          1
        );
        const saraText = saraResponse.content?.[0]?.type === "text" ? saraResponse.content[0].text : "{}";
        const saraCleaned = saraText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        try {
          const jsonMatch = saraCleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) synthesis = JSON.parse(jsonMatch[0]);
        } catch {}
      } catch (err) {
        console.error("[stress-test] Sara synthesis failed:", err.message);
      }
    }

    console.log(`[stress-test] Done in ${Date.now() - startTime}ms`);
    return res.json({ results, synthesis });

  } catch (err) {
    console.error("[stress-test] Fatal:", err.message);
    return res.status(200).json({ results, synthesis: { summary: "Stress test encountered an error.", actionItems: [] } });
  }
}
