/**
 * Shared Voice / Brand / Method DNA context limits (character budgets).
 * Keeps pipeline, Wrap adapt, and auxiliary routes aligned.
 */

export const DNA_LIMITS = {
  /** Quality checkpoints + HVT user messages (draft is separate) */
  pipeline: { voice: 4500, brand: 2800, method: 4000 },
  /** Wrap channel adaptation system prompt */
  adapt: { voice: 4500, brand: 2800, method: 4000 },
  /** Outline, Writer's Room angles, beat sheet */
  auxiliary: { voice: 3500, brand: 2200, method: 3200 },
  /** Primary generation: soft ceiling only (protect runaway pastes) */
  generate: { voice: 14000, brand: 10000, method: 14000 },
  /** Reed chat system prompt DNA blocks */
  reed: { voice: 10000, brand: 6000, method: 8000, references: 5000 },
  /** Method term lint: draft excerpt plus Method DNA (Haiku, JSON-only output) */
  methodLint: { draft: 14000, method: 3200 },
};

/**
 * Single line prepended with METHOD DNA when it is placed before Voice/Brand (chat, generate, adapt).
 */
export const METHOD_DNA_LEXICON_LINE =
  "METHOD LEXICON (non-negotiable): proprietary framework and product names must appear exactly as written; never genericize or substitute plain-language equivalents.";

/**
 * @param {string} [text]
 * @param {number} maxLen
 * @returns {string}
 */
export function clipDna(text, maxLen) {
  if (!text || !maxLen) return "";
  const t = String(text).trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}\n\n[DNA context truncated for model budget]`;
}

/**
 * Canonical Method DNA block appended to system prompts (generate, adapt-format, revision passes).
 * @param {string} [methodDnaRaw]
 * @param {number} maxChars clipDna budget (use DNA_LIMITS.generate.method or DNA_LIMITS.adapt.method)
 * @returns {string} empty when Method DNA is absent
 */
export function methodDnaSystemAppendix(methodDnaRaw, maxChars) {
  const m = String(methodDnaRaw || "").trim();
  if (!m) return "";
  return `\n\nMETHOD DNA (ACTIVE CONSTRAINT):\n${METHOD_DNA_LEXICON_LINE}\n\nMETHOD DNA:\n${clipDna(m, maxChars)}`;
}
