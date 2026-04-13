import { createClient } from "@supabase/supabase-js";
import { clipDna } from "./_dnaContext.js";
import { dnaDebugResourcesLoaded } from "./_dnaDebugLog.js";

/**
 * DNA PRECEDENCE (Voice, Brand, Method, references)
 *
 * Single merge contract for all API routes that call getUserResources(userId):
 *
 * 1) profiles (per user_id, global baseline)
 *    Voice: voice_dna_md, else a text summary built from voice_dna JSON.
 *    Brand: brand_dna_md, else a text summary built from brand_dna JSON.
 *
 * 2) resources (is_active = true), appended after the profile slice for the same kind when applicable.
 *    Profile is canonical baseline. Resource rows are supplements (uploads, Method packs, extra brand
 *    sheets). The model sees profile first, then resources; put fresher or more specific material in
 *    rows with a later updated_at so they sort later in the string.
 *
 *    Row order within resources: project_id NULL first (user-global rows), then non-null project_id
 *    by UUID string order, then updated_at ascending (older first, newer last). When project-scoped
 *    loading is added later, pass an optional projectId filter or reorder without breaking this
 *    "profile first, then sorted resources" rule.
 *
 * 3) Method DNA today is resources-only (profiles have no method field). Same resource row order.
 *
 * composer_memory is separate; see the composer_memory query below.
 *
 * Observability: set EW_DEBUG_DNA=1 for JSON logs (lengths and booleans only) from getUserResources.
 */

/**
 * @param {Array<{ project_id?: string | null, updated_at?: string }>} rows
 * @returns {typeof rows}
 */
function sortResourceRowsByPrecedence(rows) {
  return [...rows].sort((a, b) => {
    const aGlobal = a.project_id == null || a.project_id === "";
    const bGlobal = b.project_id == null || b.project_id === "";
    if (aGlobal !== bGlobal) return aGlobal ? -1 : 1;
    const pid = String(a.project_id || "").localeCompare(String(b.project_id || ""));
    if (pid !== 0) return pid;
    const ta = new Date(a.updated_at || 0).getTime();
    const tb = new Date(b.updated_at || 0).getTime();
    return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
  });
}

export async function getUserResources(userId, meta = {}) {
  const caller = typeof meta.caller === "string" && meta.caller.trim() ? meta.caller.trim() : "getUserResources";
  const empty = { voiceDna: "", brandDna: "", methodDna: "", references: "", composerMemory: "" };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    if (!serviceRoleKey) console.warn("[_resources] SUPABASE_SERVICE_ROLE_KEY not set. Voice/Brand/Method DNA will be empty.");
    if (!supabaseUrl) console.warn("[_resources] SUPABASE_URL not set.");
    dnaDebugResourcesLoaded(caller, empty, { skipped: true, reason: "missing_config_or_userId" });
    return empty;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. profiles: global Voice + Brand baseline (see DNA PRECEDENCE header)
  let voiceDna = "";
  let brandDna = "";
  let profileFound = false;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("voice_dna, voice_dna_md, brand_dna, brand_dna_md")
      .eq("id", userId)
      .single();

    if (profile) {
      profileFound = true;
      // Use voice_dna_md (markdown summary) as the primary voice context.
      // Fall back to a readable summary built from the JSONB object.
      if (profile.voice_dna_md) {
        voiceDna = profile.voice_dna_md;
      } else if (profile.voice_dna) {
        const vd = profile.voice_dna;
        const parts = [];
        if (vd.voice_description) parts.push("Voice: " + vd.voice_description);
        if (vd.value_description) parts.push("Values: " + vd.value_description);
        if (vd.personality_description) parts.push("Personality: " + vd.personality_description);
        if (vd.signature_phrases?.length) parts.push("Signature phrases: " + vd.signature_phrases.join(", "));
        if (vd.prohibited_words?.length) parts.push("Never use: " + vd.prohibited_words.join(", "));
        if (vd.emotional_register) parts.push("Emotional register: " + vd.emotional_register);
        if (vd.contraction_frequency) parts.push("Contractions: " + vd.contraction_frequency);
        if (vd.sentence_length_avg) parts.push("Sentence length: " + vd.sentence_length_avg);
        if (vd.traits) {
          const traitLines = Object.entries(vd.traits)
            .map(([k, v]) => `  ${k.replace(/_/g, " ")}: ${v}/100`)
            .join("\n");
          parts.push("Trait scores:\n" + traitLines);
        }
        voiceDna = parts.join("\n\n");
      }

      // Use brand_dna_md (markdown summary) as the primary brand context.
      if (profile.brand_dna_md) {
        brandDna = profile.brand_dna_md;
      } else if (profile.brand_dna && typeof profile.brand_dna === "object") {
        brandDna = Object.entries(profile.brand_dna)
          .map(([k, v]) => {
            const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            if (Array.isArray(v)) return `${label}: ${v.join(", ")}`;
            if (typeof v === "object" && v !== null) return `${label}: ${JSON.stringify(v)}`;
            return `${label}: ${v}`;
          })
          .join("\n");
      }
    }
  } catch (err) {
    console.error("[_resources] Failed to load profile DNA:", err);
  }

  // 2. resources: supplements + method + references (sorted; appended after profile for voice/brand)
  let methodDna = "";
  let references = "";
  let resourceRowCount = 0;

  try {
    const { data, error } = await supabase
      .from("resources")
      .select("resource_type, title, content, project_id, updated_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    const rows = !error && data && data.length > 0 ? sortResourceRowsByPrecedence(data) : [];
    resourceRowCount = rows.length;
    for (const r of rows) {
      const block = "## " + r.title + "\n" + (r.content || "") + "\n\n";
      switch (r.resource_type) {
        case "voice_dna":
          voiceDna += "\n\n" + block;
          break;
        case "brand_dna":
          brandDna += "\n\n" + block;
          break;
        case "method_dna":
          methodDna += block;
          break;
        case "reference":
          references += block;
          break;
      }
    }
    if (error) console.error("[_resources] resources query:", error.message);
  } catch (err) {
    console.error("[_resources] Failed to load resources:", err);
  }

  let composerMemory = "";
  let composerMemoryRowCount = 0;
  try {
    const { data, error } = await supabase
      .from("composer_memory")
      .select("title, body")
      .eq("user_id", userId)
      .order("sort_priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(20);
    if (!error && Array.isArray(data)) {
      composerMemoryRowCount = data.length;
    }
    if (!error && data?.length) {
      const joined = data
        .map((r) => {
          const t = (r.title || "").trim();
          const b = (r.body || "").trim();
          if (!b) return "";
          return t ? `${t}\n${b}` : b;
        })
        .filter(Boolean)
        .join("\n\n");
      composerMemory = clipDna(joined, 2500);
    } else if (error && !String(error.message || "").includes("does not exist")) {
      console.warn("[_resources] composer_memory:", error.message);
    }
  } catch (err) {
    /* table may not exist until migration 022 is applied */
  }

  const out = {
    voiceDna: voiceDna.trim(),
    brandDna: brandDna.trim(),
    methodDna: methodDna.trim(),
    references: references.trim(),
    composerMemory,
  };
  dnaDebugResourcesLoaded(caller, out, {
    profileFound,
    resourceRowCount,
    composerMemoryRowCount,
  });
  return out;
}
