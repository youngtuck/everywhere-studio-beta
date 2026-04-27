/**
 * aarValidation.ts
 * AAR (After Action Review) validation routines for Sunday Editions.
 * Detects em dashes, anaphoric triples, staccato fragment clusters,
 * and unverified factual claims. Rules defined in aar-rules.json.
 * Pure functions, no side effects. Runs synchronously.
 */

import rules from "./aar-rules.json";

export interface Violation {
  ruleId: string;
  ruleName: string;
  severity: "block" | "warn";
  message: string;
  offset: number;
  length: number;
  sample: string;
}

// ---- Helpers ----

/** Split text into sentences by terminal punctuation. */
function splitSentences(text: string): Array<{ text: string; offset: number }> {
  const results: Array<{ text: string; offset: number }> = [];
  const re = /[^.!?]*[.!?]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const s = match[0].trim();
    if (s) results.push({ text: s, offset: match.index });
  }
  // Capture trailing text without terminal punctuation
  const lastEnd = results.length > 0 ? results[results.length - 1].offset + results[results.length - 1].text.length : 0;
  const trailing = text.slice(lastEnd).trim();
  if (trailing.length > 3) results.push({ text: trailing, offset: lastEnd });
  return results;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function firstWord(s: string): string {
  const m = s.match(/^[\s"']*(\w+)/);
  return m ? m[1].toLowerCase() : "";
}

function sample(text: string, offset: number, length: number): string {
  return text.slice(offset, offset + length).slice(0, 60);
}

// ---- Rule lookups ----

const ruleMap = new Map(rules.rules.map(r => [r.id, r]));

function rule(id: string) {
  return ruleMap.get(id);
}

// ---- Detection functions ----

function detectEmDashes(text: string): Violation[] {
  const r = rule("em-dash");
  if (!r) return [];
  const violations: Violation[] = [];
  const re = /[\u2014\u2013]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    violations.push({
      ruleId: r.id,
      ruleName: r.name,
      severity: r.severity as "block",
      message: r.description,
      offset: m.index,
      length: 1,
      sample: sample(text, Math.max(0, m.index - 10), 30),
    });
  }
  return violations;
}

function detectAnaphoricTriples(text: string): Violation[] {
  const r = rule("anaphoric-triple");
  if (!r) return [];
  const sentences = splitSentences(text);
  if (sentences.length < 3) return [];
  const violations: Violation[] = [];
  for (let i = 0; i <= sentences.length - 3; i++) {
    const w0 = firstWord(sentences[i].text);
    const w1 = firstWord(sentences[i + 1].text);
    const w2 = firstWord(sentences[i + 2].text);
    if (w0 && w0 === w1 && w1 === w2) {
      const start = sentences[i].offset;
      const end = sentences[i + 2].offset + sentences[i + 2].text.length;
      violations.push({
        ruleId: r.id,
        ruleName: r.name,
        severity: r.severity as "warn",
        message: r.description,
        offset: start,
        length: end - start,
        sample: sample(text, start, end - start),
      });
      i += 2; // skip past this triple to avoid overlapping flags
    }
  }
  return violations;
}

function detectStaccatoClusters(text: string): Violation[] {
  const r = rule("staccato-cluster");
  if (!r) return [];
  const sentences = splitSentences(text);
  if (sentences.length < 2) return [];
  const violations: Violation[] = [];
  let runStart = -1;
  for (let i = 0; i < sentences.length; i++) {
    const wc = wordCount(sentences[i].text);
    if (wc <= 3) {
      if (runStart < 0) runStart = i;
    } else {
      if (runStart >= 0 && i - runStart >= 2) {
        const start = sentences[runStart].offset;
        const end = sentences[i - 1].offset + sentences[i - 1].text.length;
        violations.push({
          ruleId: r.id,
          ruleName: r.name,
          severity: r.severity as "warn",
          message: r.description,
          offset: start,
          length: end - start,
          sample: sample(text, start, end - start),
        });
      }
      runStart = -1;
    }
  }
  // Trailing run
  if (runStart >= 0 && sentences.length - runStart >= 2) {
    const start = sentences[runStart].offset;
    const end = sentences[sentences.length - 1].offset + sentences[sentences.length - 1].text.length;
    violations.push({
      ruleId: r.id,
      ruleName: r.name,
      severity: r.severity as "warn",
      message: r.description,
      offset: start,
      length: end - start,
      sample: sample(text, start, end - start),
    });
  }
  return violations;
}

function detectFabricationFlags(text: string, dismissed: string[]): Violation[] {
  const r = rule("fabrication-flag");
  if (!r) return [];
  const patterns = [
    /\d+%\s+of\s+\w+/gi,
    /\$[\d,.]+\s*(?:billion|million|thousand|B|M|K)/gi,
    /(?:in|since|around|by)\s+\d{4}\b/gi,
    /(?:study|research|experts?|scientists?|data)\s+(?:show|found|suggest|agree|confirm|indicate)/gi,
    /(?:according to)\s+(?:a|the|recent)\s+\w+/gi,
  ];
  const violations: Violation[] = [];
  const dismissedSet = new Set(dismissed);
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const s = sample(text, m.index, m[0].length);
      if (dismissedSet.has(s)) continue;
      violations.push({
        ruleId: r.id,
        ruleName: r.name,
        severity: r.severity as "warn",
        message: r.description,
        offset: m.index,
        length: m[0].length,
        sample: s,
      });
    }
  }
  return violations;
}

// ---- Main export ----

/**
 * Validate a text field against all AAR rules.
 * Pure function: no side effects, returns Violation array.
 * @param text - the field content to validate
 * @param dismissedFabrications - sample strings the user has verified (skip matching fabrication flags)
 */
export function validateText(text: string, dismissedFabrications: string[] = []): Violation[] {
  if (!text || text.length < 3) return [];
  return [
    ...detectEmDashes(text),
    ...detectAnaphoricTriples(text),
    ...detectStaccatoClusters(text),
    ...detectFabricationFlags(text, dismissedFabrications),
  ];
}

/** Count violations by severity across all fields. */
export function summarizeViolations(allViolations: Map<string, Violation[]>): { blocks: number; warns: number } {
  let blocks = 0;
  let warns = 0;
  for (const violations of allViolations.values()) {
    for (const v of violations) {
      if (v.severity === "block") blocks++;
      else warns++;
    }
  }
  return { blocks, warns };
}
