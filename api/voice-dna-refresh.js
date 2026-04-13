/**
 * VOICE DNA REFRESH JOB (stub + design)
 *
 * Goal: re-run Voice DNA analysis from recent writing (last N work artifacts) so the
 * composer profile can evolve without repeating the full interview. This file documents
 * the job and exposes a guarded no-op endpoint. No Vercel cron is wired here; schedule
 * later with the same Bearer-secret pattern as api/sentinel-cron.js if desired.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TRIGGERS (choose one or both in product)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1) Post-session (event-driven)
 *    After export / Wrap completion or when the user explicitly taps "Refresh Voice DNA"
 *    in Settings, the client (authenticated) or a small server hook could POST here with
 *    the user scope already implied by JWT, plus optional body { sessionEnded: true }.
 *    Throttle per user (e.g. at most once per 24h) to control cost.
 *
 * 2) Weekly batch (cron)
 *    Vercel Cron: add a schedule in vercel.json that GET or POST this route with header
 *    Authorization: Bearer ${EW_VOICE_DNA_REFRESH_SECRET}. Iterate eligible user_ids
 *    with the Supabase service role (same service-role discipline as sentinel-cron).
 *    Keep batch size small (e.g. 20 users per run) to stay within serverless time limits.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DATA SOURCES FOR "LAST N SESSIONS" (full implementation)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Today the durable multi-artifact history per user lives mainly in public.outputs
 * (content, title, conversation_summary, updated_at). Query last N rows per user_id
 * ordered by updated_at DESC where length(content) > 0. Concatenate bounded excerpts
 * (e.g. first 2k chars per row) into textSamples or a synthetic Reed transcript for
 * api/voice-dna.js which already accepts { responses: [...] }, { text }, or interview objects.
 *
 * public.work_sessions holds one row per user (session mirror); payload JSONB may contain
 * Reed messages until the next save overwrites it. Useful as a supplement for "current
 * week" voice but not a substitute for N completed sessions. Prefer outputs for breadth.
 *
 * Future: optional session_archive or export of finalized Reed threads if product needs
 * immutable per-session blobs without relying on outputs alone.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PIPELINE (full implementation, not executed in this stub)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1) AuthZ: cron uses EW_VOICE_DNA_REFRESH_SECRET. User-initiated refresh uses requireAuth
 *    and ignores the cron secret (two entry paths in one handler or split routes).
 * 2) Load sources per user; apply EW_VOICE_DNA_REFRESH_MAX_OUTPUTS and
 *    EW_VOICE_DNA_REFRESH_MAX_CHARS; strip HTML; dedupe paragraphs; never log raw text.
 * 3) Call the same analyst prompt as api/voice-dna.js (prefer importing a shared builder
 *    or delegating to an internal function, not duplicating the SYSTEM_PROMPT string).
 * 4) Persistence + safety (see below).
 * 5) Emit metrics: usersProcessed, skippedReason, tokensUsed (counts only in logs).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENVIRONMENT VARIABLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * EW_VOICE_DNA_REFRESH_SECRET (required for cron or operator-triggered stub check)
 *   Shared secret sent as Authorization: Bearer <value>. Do not commit. Rotate with cron.
 *
 * EW_VOICE_DNA_REFRESH_MAX_OUTPUTS (optional, suggested default 8)
 *   Max outputs rows to read per user per run.
 *
 * EW_VOICE_DNA_REFRESH_MAX_CHARS (optional, suggested default 24000)
 *   Total character budget for concatenated samples before calling Claude.
 *
 * EW_VOICE_DNA_REFRESH_REQUIRE_HUMAN_REVIEW (optional, default "1" when implemented)
 *   When "1", write candidate Voice DNA only to a staging surface (new profile columns such
 *   as voice_dna_md_pending + voice_dna_pending JSONB, or a resources row with a dedicated
 *   type) and surface "Review suggested Voice DNA" in Studio. Do not overwrite profiles
 *   voice_dna_md / voice_dna until the user confirms.
 *
 *   When "0", still log an audit event; overwriting production Voice DNA without review is
 *   discouraged even then; treat as break-glass admin only.
 *
 * Reuse existing: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_MODEL
 * (via api/voice-dna.js or shared module).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFETY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * - Human review flag (EW_VOICE_DNA_REFRESH_REQUIRE_HUMAN_REVIEW) defaults on in docs;
 *   production should keep staging + explicit user approval.
 * - Service role reads user content: log only lengths, counts, booleans (see api/_dnaDebugLog.js
 *   pattern); never log draft body or PII.
 * - Per-user rate limits and global daily token caps to prevent runaway cron cost.
 * - Idempotent runs: same candidate should not spam notifications if unchanged (hash compare).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function cronAuthorized(req) {
  const secret = process.env.EW_VOICE_DNA_REFRESH_SECRET;
  if (!secret) return { ok: false, reason: "missing_secret" };
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token !== secret) return { ok: false, reason: "bad_token" };
  return { ok: true };
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = cronAuthorized(req);
  if (auth.reason === "missing_secret") {
    return res.status(503).json({
      stub: true,
      error: "EW_VOICE_DNA_REFRESH_SECRET is not set. Configure it before calling this route in production.",
    });
  }
  if (!auth.ok) {
    return res.status(401).json({ stub: true, error: "Unauthorized" });
  }

  const humanReviewDefault = process.env.EW_VOICE_DNA_REFRESH_REQUIRE_HUMAN_REVIEW !== "0";

  return res.status(200).json({
    stub: true,
    message: "Voice DNA refresh is not implemented yet. This response confirms the secret and documents the job.",
    design: {
      triggers: ["post_session_optional", "weekly_cron_optional_vercel"],
      primarySourceTable: "outputs",
      secondarySourceTable: "work_sessions",
      analysisEndpoint: "/api/voice-dna",
      humanReviewRecommended: humanReviewDefault,
    },
    envVars: {
      requiredForCron: ["EW_VOICE_DNA_REFRESH_SECRET"],
      optional: [
        "EW_VOICE_DNA_REFRESH_MAX_OUTPUTS",
        "EW_VOICE_DNA_REFRESH_MAX_CHARS",
        "EW_VOICE_DNA_REFRESH_REQUIRE_HUMAN_REVIEW",
      ],
    },
    nextImplementationSteps: [
      "Add staging columns or resources type for pending Voice DNA when REQUIRE_HUMAN_REVIEW=1.",
      "Query outputs for last N per user; build textSamples under max chars.",
      "Reuse voice-dna analyst prompt; persist to staging; notify user in Studio.",
      "Optional: add vercel.json cron pointing at this route with Bearer secret.",
    ],
  });
}
