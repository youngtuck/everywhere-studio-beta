/**
 * Structured intake fields Reed locks before generation (Thesis, Audience, Goal, Hook, Format).
 * Parsed from Reed readiness messages (see api/chat.js READY_TO_GENERATE checklist format).
 * WorkSession persists this on PersistedSession and sends it to /api/generate and /api/adapt-format.
 */

const INTAKE_KEYS = ["thesis", "audience", "goal", "hook", "format"] as const;
export type StructuredIntakeKey = (typeof INTAKE_KEYS)[number];

export interface StructuredIntake {
  thesis: string;
  audience: string;
  goal: string;
  hook: string;
  format: string;
  /** Epoch ms when parsed (optional) */
  lockedAt?: number;
}

/**
 * Parse Reed's checklist from a single assistant message (may include text before/after labels).
 * Supports continuation lines under each label until the next label or READY_TO_GENERATE.
 */
export function parseStructuredIntakeFromReedReply(text: string): StructuredIntake | null {
  if (!text || !String(text).trim()) return null;
  const normalized = String(text).replace(/\r\n/g, "\n");
  const thesisIdx = normalized.search(/^\s*Thesis:\s*/im);
  const window = thesisIdx >= 0 ? normalized.slice(thesisIdx) : normalized;

  const lines = window.split("\n");
  let current: StructuredIntakeKey | null = null;
  const acc: Record<StructuredIntakeKey, string[]> = {
    thesis: [],
    audience: [],
    goal: [],
    hook: [],
    format: [],
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (/^READY_TO_GENERATE\s*$/i.test(trimmed)) break;

    const header = trimmed.match(/^(Thesis|Audience|Goal|Hook|Format):\s*(.*)$/i);
    if (header) {
      const key = header[1].toLowerCase() as StructuredIntakeKey;
      if (INTAKE_KEYS.includes(key)) {
        current = key;
        const rest = (header[2] || "").trim();
        acc[key] = rest ? [rest] : [];
      }
      continue;
    }
    if (current && trimmed) {
      acc[current].push(trimmed);
    }
  }

  const out: StructuredIntake = {
    thesis: acc.thesis.join(" ").trim(),
    audience: acc.audience.join(" ").trim(),
    goal: acc.goal.join(" ").trim(),
    hook: acc.hook.join(" ").trim(),
    format: acc.format.join(" ").trim(),
    lockedAt: Date.now(),
  };

  const hasAny = INTAKE_KEYS.some(k => out[k].length > 0);
  if (!hasAny) return null;
  return out;
}

export function structuredIntakeForApiBody(intake: StructuredIntake | null): StructuredIntake | undefined {
  if (!intake) return undefined;
  const hasAny = INTAKE_KEYS.some(k => intake[k].trim().length > 0);
  if (!hasAny) return undefined;
  const { lockedAt: _lockedAt, ...rest } = intake;
  return rest as StructuredIntake;
}

function intakeHasAnyField(i: StructuredIntake): boolean {
  return INTAKE_KEYS.some(k => i[k].trim().length > 0);
}

/**
 * CO_023 gate: channel (format) and audience are non-skippable before draft generation.
 * Both fields must carry real content from the conversation.
 */
export function hasChannelAndAudience(intake: StructuredIntake | null | undefined): boolean {
  if (!intake) return false;
  const format = (intake.format || "").trim();
  const audience = (intake.audience || "").trim();
  return format.length > 0 && audience.length > 0;
}

/** Prefer persisted intake; otherwise parse last Reed assistant message (for older session saves). */
export function mergeStoredAndParsed(
  stored: StructuredIntake | null | undefined,
  lastReedAssistantContent: string | undefined,
): StructuredIntake | null {
  if (stored && intakeHasAnyField(stored)) return stored;
  const parsed = lastReedAssistantContent
    ? parseStructuredIntakeFromReedReply(lastReedAssistantContent)
    : null;
  return parsed;
}
