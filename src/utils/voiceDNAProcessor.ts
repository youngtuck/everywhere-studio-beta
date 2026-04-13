const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export interface VoiceDNA {
  voice_fidelity: number;
  voice_layer: number;
  value_layer: number;
  personality_layer: number;
  traits: {
    vocabulary_and_syntax: number;
    tonal_register: number;
    rhythm_and_cadence: number;
    metaphor_patterns: number;
    structural_habits: number;
  };
  voice_description: string;
  value_description: string;
  personality_description: string;
  contraction_frequency: string;
  sentence_length_avg: string;
  signature_phrases: string[];
  prohibited_words: string[];
  emotional_register: string;
  has_dual_mode: boolean;
  content_mode?: Record<string, unknown>;
  operations_mode?: Record<string, unknown>;
  method: "interview" | "upload" | "both";
  interview_responses?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface VoiceDNAResponse {
  voiceDna: VoiceDNA;
  markdown: string;
}

function asNum(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(x => String(x)).filter(Boolean);
}

/** Map API JSON (summary, sentence_length, etc.) onto the app VoiceDNA shape. */
export function normalizeVoiceDnaFromApi(raw: Record<string, unknown>): VoiceDNA {
  const traitsIn = (raw.traits as Record<string, unknown>) || {};
  const now = new Date().toISOString();
  const prohibited = asStrArray(raw.prohibited_words).length
    ? asStrArray(raw.prohibited_words)
    : asStrArray(raw.prohibited_patterns);
  const method = raw.method === "upload" || raw.method === "interview" || raw.method === "both" ? raw.method : "interview";
  return {
    voice_fidelity: asNum(raw.voice_fidelity),
    voice_layer: asNum(raw.voice_layer),
    value_layer: asNum(raw.value_layer),
    personality_layer: asNum(raw.personality_layer),
    traits: {
      vocabulary_and_syntax: asNum(traitsIn.vocabulary_and_syntax),
      tonal_register: asNum(traitsIn.tonal_register),
      rhythm_and_cadence: asNum(traitsIn.rhythm_and_cadence),
      metaphor_patterns: asNum(traitsIn.metaphor_patterns),
      structural_habits: asNum(traitsIn.structural_habits),
    },
    voice_description: asStr(raw.voice_description) || asStr(raw.summary),
    value_description: asStr(raw.value_description) || asStr(raw.values),
    personality_description: asStr(raw.personality_description) || asStr(raw.personality),
    contraction_frequency: asStr(raw.contraction_frequency),
    sentence_length_avg: asStr(raw.sentence_length_avg) || asStr(raw.sentence_length),
    signature_phrases: asStrArray(raw.signature_phrases),
    prohibited_words: prohibited,
    emotional_register: asStr(raw.emotional_register),
    has_dual_mode: Boolean(raw.has_dual_mode),
    content_mode:
      typeof raw.content_mode === "object" && raw.content_mode ? (raw.content_mode as Record<string, unknown>) : undefined,
    operations_mode:
      typeof raw.operations_mode === "object" && raw.operations_mode
        ? (raw.operations_mode as Record<string, unknown>)
        : undefined,
    method,
    interview_responses:
      typeof raw.interview_responses === "object" && raw.interview_responses
        ? (raw.interview_responses as Record<string, string>)
        : undefined,
    created_at: asStr(raw.created_at) || now,
    updated_at: asStr(raw.updated_at) || now,
  };
}

function parseVoiceDnaResponse(data: { voiceDna?: unknown; markdown?: unknown }): VoiceDNAResponse {
  if (!data.voiceDna || typeof data.voiceDna !== "object") {
    throw new Error("Voice DNA response was missing profile data.");
  }
  return {
    voiceDna: normalizeVoiceDnaFromApi(data.voiceDna as Record<string, unknown>),
    markdown: typeof data.markdown === "string" ? data.markdown : "",
  };
}

async function postVoiceDna(body: Record<string, unknown>, accessToken: string): Promise<VoiceDNAResponse> {
  const url = `${API_BASE}/api/voice-dna`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as VoiceDNAResponse & { error?: string };
  if (!res.ok) {
    const errText =
      typeof data?.error === "string" && data.error.trim()
        ? data.error.trim()
        : `Voice DNA request failed (${res.status}).`;
    throw new Error(errText);
  }
  return parseVoiceDnaResponse(data);
}

export async function generateVoiceDNAFromInterview(payload: {
  responses: Record<string, string>;
  userName?: string;
  accessToken: string;
}): Promise<VoiceDNAResponse> {
  return postVoiceDna(
    {
      type: "interview",
      responses: payload.responses,
      userName: payload.userName,
    },
    payload.accessToken
  );
}

/**
 * Plain text plus optional PDFs (base64, no data-URL prefix required).
 * The API sends all material to Claude: text in the prompt, PDFs as document blocks so the model reads layout and wording.
 */
export async function generateVoiceDNAFromWritingSamples(payload: {
  combinedText: string;
  pdfAttachments?: { filename: string; base64: string }[];
  userName?: string;
  accessToken: string;
}): Promise<VoiceDNAResponse> {
  const text = payload.combinedText.trim();
  const pdfs = payload.pdfAttachments?.filter(p => p.base64 && p.base64.length > 100) ?? [];
  if (!text && pdfs.length === 0) {
    throw new Error("No readable writing samples. Add .txt or .md files, or PDFs under the size limit.");
  }
  return postVoiceDna(
    {
      userName: payload.userName,
      text,
      pdfAttachments: pdfs.length ? pdfs : undefined,
    },
    payload.accessToken
  );
}
