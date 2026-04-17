/**
 * Edit-stage revision routing: light (targeted excerpt) vs full draft regeneration.
 */

/**
 * CO_024: Draft-stage input intent classifier.
 * The typed input at Edit/Draft stage must be routed through Reed as conversation
 * first. Only clear directives trigger an immediate revise. Questions and
 * ambiguous input get a Reed response, no action.
 */
export type DraftInputIntent = "question" | "ambiguous" | "directive";

const QUESTION_OPENERS = [
  "should",
  "what",
  "where",
  "when",
  "why",
  "how",
  "is",
  "are",
  "does",
  "do",
  "can",
  "could",
  "would",
  "will",
  "might",
  "may",
  "who",
  "which",
  "is it",
  "am i",
];

const QUESTION_PHRASES = [
  /\bwhat if\b/,
  /\bwhat about\b/,
  /\bwhat do you think\b/,
  /\bany thoughts\b/,
  /\bthoughts on\b/,
  /\bis it (?:ok|okay|fine|alright)\b/,
  /\bshould (?:i|we)\b/,
  /\bdo you think\b/,
  /\bcan you tell me\b/,
  /\bhow does this\b/,
];

const DIRECTIVE_OPENERS = [
  "tighten",
  "cut",
  "expand",
  "shorten",
  "lengthen",
  "rewrite",
  "revise",
  "fix",
  "remove",
  "delete",
  "change",
  "replace",
  "add",
  "include",
  "drop",
  "trim",
  "polish",
  "simplify",
  "clarify",
  "strengthen",
  "sharpen",
  "soften",
  "reorder",
  "restructure",
  "reorganize",
  "rework",
  "redo",
  "make",
  "turn",
];

const DIRECTIVE_PHRASES = [
  /\bmake (?:it|this|the) (?:shorter|longer|tighter|punchier|simpler|clearer|crisper|bolder)\b/,
  /\bcut (?:the|to|down)\b/,
  /\btighten (?:to|this|the)\b/,
  /\bexpand (?:to|this|the)\b/,
  /\bfix (?:the|this|all|flagged)\b/,
  /\bstart over\b/,
  /\bfrom scratch\b/,
  /\bchange the (?:angle|thesis|hook|opening|closing|argument)\b/,
];

/**
 * Classify a typed input at Draft/Edit stage as a question, ambiguous, or a
 * clear directive. Only "directive" should fire an immediate revise. The other
 * two must be routed to Reed as a conversational message.
 */
export function classifyDraftInputIntent(raw: string): DraftInputIntent {
  const text = (raw || "").trim();
  if (!text) return "ambiguous";

  const lower = text.toLowerCase();

  // 1. Explicit question mark wins.
  if (/\?\s*$/.test(text)) return "question";

  // 2. Question phrases without a trailing "?" still count.
  if (QUESTION_PHRASES.some((re) => re.test(lower))) return "question";

  // 3. Question openers at start of sentence without a trailing "?".
  const firstWord = lower.split(/\s+/)[0] || "";
  const firstTwo = lower.split(/\s+/).slice(0, 2).join(" ");
  if (QUESTION_OPENERS.includes(firstWord) || QUESTION_OPENERS.includes(firstTwo)) {
    return "question";
  }

  // 4. Directive phrases are strong signals.
  if (DIRECTIVE_PHRASES.some((re) => re.test(lower))) return "directive";

  // 5. Directive verb at start of the input.
  if (DIRECTIVE_OPENERS.includes(firstWord)) return "directive";

  // 6. Everything else is ambiguous. Reed must respond, not act.
  return "ambiguous";
}

export type EditRevisionScope = "targeted" | "full";

export type DraftSectionSlice = {
  excerpt: string;
  prefix: string;
  suffix: string;
  label: string;
};

const FULL_PATTERNS: RegExp[] = [
  /\bstart\s+over\b/,
  /\bfrom\s+scratch\b/,
  /\bthrow\s+(it\s+)?out\b/,
  /\bwhole\s+new\s+(piece|draft|article|post|essay|thing)\b/,
  /\b(rewrite|rework|redo)\s+(the\s+)?(entire|whole|full|complete)\s*(draft|piece|thing|article|post|essay)?\b/,
  /\b(entire|whole)\s+(draft|piece|article|post|essay)\b/,
  /\brestructure\s+(the\s+)?(entire|whole|piece|draft)\b/,
  /\breorganize\s+(the\s+)?(entire|whole|piece|draft)\b/,
  /\bcompletely\s+different\s+(piece|draft|angle)\b/,
  /\bchange\s+the\s+(thesis|central\s+argument)\b/,
  /\bchange\s+the\s+angle\b/,
];

const LIGHT_VERBS =
  /\b(tighten|trim|cut|shorten|sharpen|condense|fix|repair|polish|lighten|simplify|smooth|clarify|punch|strengthen|reduce|remove|delete|compress|edit)\b/;

const SCOPED_MARKERS =
  /\b(paragraph|para\.?|opening|closing|hook|hooks?|lede|lead|conclusion|ending|outro|intro|introduction|graf|first|second|third|fourth|fifth|last|beginning)\b/;

const LIGHT_TOPIC =
  /\b(grammar|typo|spell|passive|wordy|redundant|repetition|words?|sentences?|lines?|phrasing|tone\s+down|tone\s+up)\b/;

/** Prefer full regeneration when the user is clearly asking for a new piece or global restructure. */
export function classifyEditRevisionScope(instructions: string): EditRevisionScope {
  const s = instructions.toLowerCase();
  if (FULL_PATTERNS.some((re) => re.test(s))) return "full";
  if (/\bnew\s+angle\b/.test(s) && !/\b(paragraph|opening|clos(e|ing)|sentence|hook)\b/.test(s)) return "full";
  if (/\bdifferent\s+take\b/.test(s) && !/\b(paragraph|opening|clos(e|ing)|sentence|hook)\b/.test(s)) {
    return "full";
  }
  if (LIGHT_VERBS.test(s) || SCOPED_MARKERS.test(s) || LIGHT_TOPIC.test(s)) return "targeted";
  if (/\b(rewrite|rework|revise)\s+(the\s+)?(opening|hook|first|last|conclusion|closing|paragraph)\b/.test(s)) {
    return "targeted";
  }
  return "full";
}

function splitTitleBody(draft: string): { title: string; body: string } {
  const idx = draft.indexOf("\n");
  if (idx === -1) return { title: draft.trim(), body: "" };
  return { title: draft.slice(0, idx), body: draft.slice(idx + 1) };
}

function bodyParagraphs(body: string): string[] {
  return body.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
}

const ORDINAL_PARA: Record<string, number> = {
  first: 0,
  second: 1,
  third: 2,
  fourth: 3,
  fifth: 4,
};

/**
 * Pick a single body paragraph span for a targeted API call. Returns null only when the body is empty.
 */
export function extractDraftSectionForTargetedEdit(
  draft: string,
  instructions: string,
): DraftSectionSlice | null {
  const { title, body } = splitTitleBody(draft);
  const paras = bodyParagraphs(body);
  const s = instructions.toLowerCase();

  if (paras.length === 0) {
    const excerpt = body.trim();
    if (!excerpt) return null;
    return {
      excerpt,
      prefix: `${title}\n`,
      suffix: "",
      label: "body",
    };
  }

  const numMatch = s.match(/\b(?:paragraph|para\.?)\s*(\d+)\b/);
  if (numMatch) {
    const idx = Math.max(0, parseInt(numMatch[1], 10) - 1);
    if (idx < paras.length) return sliceAtParagraphIndex(title, paras, idx, `paragraph ${idx + 1}`);
  }

  const ordMatch = s.match(/\b(first|second|third|fourth|fifth)\s+paragraph\b/);
  if (ordMatch) {
    const idx = ORDINAL_PARA[ordMatch[1]] ?? 0;
    if (idx < paras.length) return sliceAtParagraphIndex(title, paras, idx, `${ordMatch[1]} paragraph`);
  }

  if (/\b(last\s+paragraph|final\s+paragraph)\b/.test(s) || (/\blast\b/.test(s) && /\bparagraph\b/.test(s))) {
    const idx = paras.length - 1;
    return sliceAtParagraphIndex(title, paras, idx, "last paragraph");
  }

  if (
    /\b(opening|hook|hooks?|beginning|intro|introduction|lede|lead|first\s+paragraph|first\s+graf)\b/.test(s)
  ) {
    const idx = 0;
    const firstLen = paras[0].split(/\s+/).filter(Boolean).length;
    if (paras.length > 1 && firstLen < 36) {
      return sliceParagraphRange(title, paras, 0, 1, "opening");
    }
    return sliceAtParagraphIndex(title, paras, idx, "opening");
  }

  if (/\b(closing|close|conclusion|ending|outro|last\s+paragraph|final\s+paragraph)\b/.test(s)) {
    const idx = paras.length - 1;
    return sliceAtParagraphIndex(title, paras, idx, "closing");
  }

  if (LIGHT_VERBS.test(s) || LIGHT_TOPIC.test(s) || SCOPED_MARKERS.test(s)) {
    const joined = paras.join("\n\n");
    return {
      excerpt: joined,
      prefix: `${title}\n`,
      suffix: "",
      label: "full body",
    };
  }

  const joined = paras.join("\n\n");
  return {
    excerpt: joined,
    prefix: `${title}\n`,
    suffix: "",
    label: "full body",
  };
}

function sliceAtParagraphIndex(
  title: string,
  paras: string[],
  idx: number,
  label: string,
): DraftSectionSlice {
  return sliceParagraphRange(title, paras, idx, idx, label);
}

function sliceParagraphRange(
  title: string,
  paras: string[],
  startIdx: number,
  endIdxInclusive: number,
  label: string,
): DraftSectionSlice {
  const before = paras.slice(0, startIdx);
  const excerptParts = paras.slice(startIdx, endIdxInclusive + 1);
  const after = paras.slice(endIdxInclusive + 1);
  const excerpt = excerptParts.join("\n\n");
  const prefix =
    before.length > 0 ? `${title}\n${before.join("\n\n")}\n\n` : `${title}\n`;
  const suffix = after.join("\n\n");
  return { excerpt, prefix, suffix, label };
}
