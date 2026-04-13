/**
 * Formats Work `structuredIntake` (from Reed readiness) for model system prompts.
 * Payload is produced client-side in WorkSession; see `src/lib/reedStructuredIntake.ts`.
 */

/**
 * @param {unknown} intake
 * @returns {string} suffix to append to system prompt (empty if nothing usable)
 */
export function formatStructuredIntakeForPrompt(intake) {
  if (!intake || typeof intake !== "object") return "";
  const keys = ["thesis", "audience", "goal", "hook", "format"];
  const lines = [];
  for (const key of keys) {
    const v = intake[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`${label}: ${s.slice(0, 2000)}`);
  }
  if (lines.length === 0) return "";
  return `\n\nSTRUCTURED INTAKE (locked with Reed; treat as authoritative brief unless revision notes explicitly override a field):\n${lines.join("\n")}`;
}
