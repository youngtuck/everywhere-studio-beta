import { requireAuth } from "./_auth.js";
import { setCorsHeaders } from "./_cors.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(503).json({ error: "Transcription is not configured (OPENAI_API_KEY)." });
  }

  const { audioBase64, mimeType } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  let buffer;
  try {
    buffer = Buffer.from(audioBase64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 audio" });
  }

  if (buffer.length < 32) {
    return res.status(400).json({ error: "Audio too short" });
  }

  if (buffer.length > 4 * 1024 * 1024) {
    return res.status(413).json({ error: "Audio too large" });
  }

  const type = typeof mimeType === "string" && mimeType.startsWith("audio/") ? mimeType : "audio/webm";
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new Blob([buffer], { type }), "clip.webm");

  const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });

  if (!upstream.ok) {
    const errBody = await upstream.text();
    return res.status(502).json({ error: "Transcription service error", detail: errBody.slice(0, 200) });
  }

  const ct = (upstream.headers.get("content-type") || "").toLowerCase();
  let text = "";
  if (ct.includes("application/json")) {
    const j = await upstream.json();
    text = typeof j.text === "string" ? j.text.trim() : "";
  } else {
    text = (await upstream.text()).trim();
  }

  return res.status(200).json({ text });
}
