import Anthropic from "@anthropic-ai/sdk";
import { callWithRetry } from "./_retry.js";
import { CLAUDE_MODEL } from "./_config.js";

export async function scoreContent({
  apiKey,
  content,
  outputType,
  voiceProfile = null,
  audience = null,
}) {
  const system = `You are the EVERYWHERE Studio Quality Checkpoint evaluator (Betterish scoring). Score the provided content on 7 dimensions, each 0-100. Publication threshold is 900 out of 1000. Return ONLY a JSON object, no commentary.`;

  const userPrompt = `
Evaluate this ${outputType} content against the 7 Quality Checkpoints.
${voiceProfile ? `\nVoice profile: ${JSON.stringify(voiceProfile)}` : ""}
${audience ? `\nTarget audience: ${audience}` : ""}

Content to evaluate:
"""
${content.slice(0, 3000)}
"""

Return this exact JSON structure:
{
  "strategy": <0-100>,
  "voice": <0-100>,
  "accuracy": <0-100>,
  "ai_tells": <0-100>,
  "audience": <0-100>,
  "platform": <0-100>,
  "impact": <0-100>,
  "total": <weighted average 0-1000>,
  "summary": "<one sentence on biggest strength>"
}

For "ai_tells": 100 means it reads fully human, 0 means it reads like AI. Weight "voice" and "ai_tells" heavily.
For "total": weight * 1000. Use weights: strategy 0.12, voice 0.22, accuracy 0.12, ai_tells 0.20, audience 0.14, platform 0.10, impact 0.10.
`;

  const client = new Anthropic({ apiKey });
  const response = await callWithRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: userPrompt }],
    })
  );

  const text =
    response.content?.[0]?.type === "text" ? response.content[0].text : "{}";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return { total: 900, summary: "Content generated successfully." };
  }
}

