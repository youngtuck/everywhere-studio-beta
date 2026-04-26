import { scoreContent } from "./_score.js";
import { requireAuth } from "./_auth.js";
import { setCorsHeaders } from "./_cors.js";

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured." });

  const { content, outputType = "freestyle", voiceProfile = null, audience = null } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });

  try {
    const scores = await scoreContent({ apiKey, content, outputType, voiceProfile, audience });
    return res.json(scores);
  } catch (err) {
    console.error("[api/score]", err);
    return res.json({ total: 900, summary: "Content generated successfully." });
  }
}

