/**
 * WorkSession.tsx, v7.0 Quality Checkpoint Framework
 *
 * Flow:
 *   Intake  -> /api/chat (Reed conversation, READY_TO_GENERATE detection)
 *   Outline -> client-side state built from Reed's readiness summary
 *   Edit    -> /api/generate (draft generation + back-of-house auto-revision)
 *   Review  -> /api/run-pipeline (7 checkpoints + Human Voice Test)
 *   Review  includes export (save to Supabase outputs table + copy/download + send to Wrap)
 */

import {
  useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo,
} from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useShell } from "../../components/studio/StudioShell";
import { useStudioProject } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import { fetchWithRetry } from "../../lib/retry";
import { useMobile } from "../../hooks/useMobile";
import { useHoldToTranscribe } from "../../hooks/useHoldToTranscribe";
import {
  saveSessionLocalMirror,
  loadSession,
  clearSession,
  deleteRemoteWorkSession,
  flushWorkSessionToSupabase,
  fetchWorkSessionRow,
  shouldOfferWorkSessionRestore,
  rowToPersistedSession,
  workProjectKeyFromShellId,
  studioProjectUuidForRow,
  getWorkStageFromPersisted,
  sessionTitleFromPersisted,
  WORK_SESSION_OUTPUT_TYPE_ID_EVENT,
  WORK_SESSION_CLOUD_DEBOUNCE_MS,
  type PersistedSession,
  type WorkSessionDbRow,
} from "../../lib/sessionPersistence";
import {
  mergeStoredAndParsed,
  parseStructuredIntakeFromReedReply,
  structuredIntakeForApiBody,
  type StructuredIntake,
} from "../../lib/reedStructuredIntake";
import { publishWorkSessionMeta } from "../../lib/workSessionMetaBridge";
import {
  classifyEditRevisionScope,
  classifyDraftInputIntent,
  extractDraftSectionForTargetedEdit,
} from "../../lib/editRevisionIntent";

import OutputTypePicker, { OUTPUT_TYPES } from "../../components/studio/OutputTypePicker";
import {
  DEFAULT_PRESENTATION_MINUTES,
  buildWrapConstraintSupplement,
  outputTypeDisplayLabel,
  presentationTargetWords,
  talkTargetWords,
} from "../../lib/wrapFormatRules";
import { ReedProfileIcon } from "../../components/studio/ReedProfileIcon";
import "./shared.css";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const FONT = "var(--font)";
/** Top bar "+ New Session" when already on Work (same-route nav does not remount). */
const EW_NEW_SESSION_REQUEST = "ew-new-session-request";
const PARKED_OUTPUT_CONTENT_MAX_CHARS = 120_000;

/** Health probe before Review wording checks (short, no retries, no global toast). */
const STUDIO_API_HEALTH_TIMEOUT_MS = 4000;
/** Hard cap for method-dna-lint in Review; avoids hanging spinners. */
const METHOD_DNA_LINT_REQUEST_MS = 8000;

type MethodLintInspectorError = "timeout" | "unreachable" | "failed";

async function probeStudioApiReachable(apiBase: string, timeoutMs: number): Promise<boolean> {
  const base = (apiBase || "").replace(/\/$/, "");
  const url = base ? `${base}/api/health` : "/api/health";
  const c = new AbortController();
  const tid = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: c.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(tid);
  }
}

async function fetchWithAuthTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  let authHeaders: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) authHeaders = { Authorization: `Bearer ${session.access_token}` };
  } catch { /* ignore */ }
  const c = new AbortController();
  const tid = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        ...(init.headers && typeof init.headers === "object" && !Array.isArray(init.headers)
          ? (init.headers as Record<string, string>)
          : {}),
        ...authHeaders,
      },
      signal: c.signal,
    });
  } finally {
    clearTimeout(tid);
  }
}

/** Match api/generate.js: oversized excerpts use full revision instead. */
const TARGETED_EDIT_EXCERPT_MAX_CHARS = 12000;

/** Intake → Outline: fade main content only; docked composer stays fixed. */
const IO_INTAKE_FADE_MS = 200;
const IO_OUTLINE_ENTER_MS = 300;
const IO_OUTLINE_ENTER_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Same wrapper as StageIntake active chat so Outline matches Intake. Pinned by flex column (not sticky). */
const INTAKE_DOCKED_COMPOSER_WRAP = {
  display: "flex",
  flexDirection: "column",
  padding: "4px clamp(12px, 4vw, 24px) max(4px, env(safe-area-inset-bottom))",
  background: "var(--bg)",
  borderTop: "1px solid var(--glass-border)",
  flexShrink: 0,
  zIndex: 20,
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  backdropFilter: "blur(14px) saturate(1.2)",
  WebkitBackdropFilter: "blur(14px) saturate(1.2)",
};

/** Build attachment block for Intake messages (shared with composer queue + send). */
async function formatIntakeFileAttachments(fileArr: File[]): Promise<string> {
  const TEXT_EXTS = [".txt", ".md", ".csv", ".json", ".html", ".xml", ".yml", ".yaml"];
  const contents: string[] = [];

  for (const file of fileArr) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    try {
      if (TEXT_EXTS.includes(ext) || file.type.startsWith("text/")) {
        const text = await file.text();
        if (text.trim()) {
          contents.push(`[File: ${file.name}]\n${text.slice(0, 12000)}`);
        }
      } else if (ext === ".pdf") {
        const text = await file.text();
        const readable = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
        if (readable.length > 50) {
          contents.push(`[File: ${file.name}]\n${readable.slice(0, 12000)}`);
        } else {
          contents.push(`[File: ${file.name}] (PDF attached, ${(file.size / 1024).toFixed(0)}KB)`);
        }
      } else if (ext === ".doc" || ext === ".docx") {
        contents.push(`[File: ${file.name}] (Document attached, ${(file.size / 1024).toFixed(0)}KB)`);
      } else {
        contents.push(`[File: ${file.name}] (${file.type || "file"} attached, ${(file.size / 1024).toFixed(0)}KB)`);
      }
    } catch {
      contents.push(`[File: ${file.name}] (Could not read file)`);
    }
  }

  return contents.join("\n\n");
}

type WorkStage = "Intake" | "Outline" | "Edit" | "Review";
const STAGES: WorkStage[] = ["Intake", "Outline", "Edit", "Review"];

type Format =
  | "LinkedIn" | "Newsletter" | "Podcast" | "Sunday Story"
  | "Article" | "Email" | "Thread" | "Video Script"
  | "Case Study" | "One-Pager" | "Presentation" | "Book Chapter";

const DEFAULT_FORMATS: Format[] = [];

/** Map Review tab id to adapt-format API format key. */
function reviewFormatToApiFormat(f: Format): string {
  if (f === "Thread") return "X Thread";
  return f;
}

/** Map Review format tabs to Wrap channel names (must match Wrap WRAP_CHANNEL_FORMATS / adapt-format). */
function workReviewFormatsToWrapChannels(rows: Format[]): string[] {
  const map: Partial<Record<Format, string>> = {
    LinkedIn: "LinkedIn",
    Newsletter: "Newsletter",
    Podcast: "Podcast",
    "Sunday Story": "Sunday Story",
    Email: "Email",
    Thread: "X Thread",
    Article: "Sunday Story",
    "Video Script": "YouTube Description",
    "Case Study": "Executive Brief",
    "One-Pager": "Executive Brief",
    Presentation: "Podcast",
    "Book Chapter": "Newsletter",
  };
  const out = new Set<string>();
  rows.forEach(f => {
    const c = map[f];
    if (c) out.add(c);
  });
  return [...out];
}

/** Map each Review format tab to a Wrap sidebar / adapt-format channel key. Values must match `WRAP_CHANNEL_FORMATS` in Wrap.tsx. */
function reviewFormatToWrapChannelKey(f: Format): string {
  const fromMap = workReviewFormatsToWrapChannels([f]);
  if (fromMap.length > 0) return fromMap[0];
  return reviewFormatToApiFormat(f);
}

/** Per-channel adapted bodies for handoff to Wrap (deliver step). */
function buildWrapSeededContentFromFormatDrafts(
  formats: Format[],
  formatDrafts: Record<string, { content?: string; metadata?: Record<string, string>; status?: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of formats) {
    const fd = formatDrafts[f];
    if (!fd || fd.status !== "done" || !String(fd.content || "").trim()) continue;
    const wrapKey = reviewFormatToWrapChannelKey(f);
    out[wrapKey] = fd.content;
  }
  return out;
}

const FORMAT_TO_OUTPUT_TYPE: Record<Format, string> = {
  LinkedIn: "socials", Newsletter: "newsletter", Podcast: "podcast",
  "Sunday Story": "essay", Article: "essay", Email: "newsletter",
  Thread: "socials", "Video Script": "video_script",
  "Case Study": "business", "One-Pager": "business",
  Presentation: "presentation", "Book Chapter": "book",
};

/** Catalog OUTPUT_TYPES id for APIs: only explicit Outline picker (or restored row); never inferred from Review channels. */
function catalogOutputTypeForApi(outputTypeId: string | null | undefined): string {
  const id = (outputTypeId ?? "").trim();
  return id.length > 0 ? id : "freestyle";
}

function formatsFromPersisted(raw: string[] | undefined): Format[] {
  if (!raw?.length) return [];
  const allowed = new Set<string>(Object.keys(FORMAT_TO_OUTPUT_TYPE));
  return raw.filter((x): x is Format => allowed.has(x));
}

const WORD_TARGETS: Record<string, number> = {
  essay: 2500, talk: 3000, podcast: 1500, video_script: 800, email: 300,
  presentation: 1200, proposal: 1500, one_pager: 400, report: 2000,
  executive_summary: 500, case_study: 1200, sow: 1500,
  meeting: 600, bio: 400, white_paper: 3000, session_brief: 600,
  freestyle: 700,
};

function clampEditWordTarget(n: number): number {
  if (!Number.isFinite(n)) return WORD_TARGETS.freestyle;
  return Math.min(50000, Math.max(50, Math.round(n)));
}

/** Baseline word target for Edit inspector (before user override). */
function baselineEditWordTarget(
  outputTypeId: string | null | undefined,
  talkMin: number,
  presentationMin: number,
): number {
  const id = (outputTypeId ?? "").trim();
  if (!id) return WORD_TARGETS.freestyle;
  if (id === "talk") return talkTargetWords(talkMin);
  if (id === "presentation") return presentationTargetWords(presentationMin);
  return WORD_TARGETS[id] ?? WORD_TARGETS.freestyle;
}

/** Pre-Wrap full-screen picker: Content, Business, Social (maps to OUTPUT_TYPES ids for Catalog / Wrap). */
type PreWrapPickCategory = "Content" | "Business" | "Social";

const PRE_WRAP_PICK_GROUPS: Record<PreWrapPickCategory, { id: string; label: string }[]> = {
  Content: [
    { id: "essay", label: "Essay" },
    { id: "talk", label: "Talk" },
    { id: "podcast", label: "Podcast" },
    { id: "video_script", label: "Video Script" },
    { id: "email", label: "Email" },
  ],
  Business: OUTPUT_TYPES.filter(t => t.category === "Business").map(t => ({ id: t.id, label: t.label })),
  Social: [
    { id: "social_media", label: "Social Media" },
    { id: "newsletter", label: "Newsletter" },
  ],
};

/** All valid wrap format IDs from PRE_WRAP_PICK_GROUPS. */
const VALID_WRAP_IDS = new Set([
  "essay", "talk", "podcast", "video_script", "email",
  "social_media", "newsletter",
  "presentation", "proposal", "one_pager", "report",
  "executive_summary", "case_study", "sow", "meeting", "bio", "white_paper",
]);

/** Heuristic primary output type for Pre-Wrap highlight (not a model call). */
function inferRecommendedWrapOutputId(draft: string, outputType?: string | null): string {
  // CO_029 Failure 4: Prefer the user's chosen output type when it's a valid wrap format
  if (outputType && outputType !== "freestyle" && VALID_WRAP_IDS.has(outputType)) {
    return outputType;
  }
  const t = draft.slice(0, 14000).toLowerCase();
  const head = draft.slice(0, 1200).trim();
  if (/\[(pause|beat)\]/i.test(t)) return "talk";
  if (/\b(slide|deck|presentation|q[1-4])\b/.test(t) || /##\s*slide/i.test(t)) return "presentation";
  if (/\b(podcast|episode|\[open\]|\[hook\])\b/.test(t)) return "podcast";
  if (/\b(newsletter|subject line|preview text|unsubscribe)\b/.test(t)) return "newsletter";
  if (/\b(case study|client success)\b/.test(t)) return "case_study";
  if (/\b(linkedin|twitter thread|x thread)\b/.test(t)) return "social_media";
  if (/\b(proposal|rfp|statement of work|\bsow\b)\b/.test(t)) return "proposal";
  if (/\b(executive summary|exec summary)\b/.test(t)) return "executive_summary";
  if (/\b(video script|b-roll|scene)\b/.test(t)) return "video_script";
  // Email: short piece with letter layout, so longform essays that mention "email" still default to essay.
  if (
    t.length < 2200
    && (/^dear\s+\S+/i.test(head) || /^hi\s+\S+,/i.test(head))
    && /\b(subject\s*line|subject:|^re:|^fwd:)\b/im.test(head)
  ) {
    return "email";
  }
  return "essay";
}

const TEMPLATES = ["Essay", "LinkedIn Post", "Newsletter Issue", "Podcast Script", "Case Study", "One-Pager", "Email"];

/** Parse podcast script into structured sections from [OPEN], [HOOK], [BODY], [CLOSE] markers */
function parsePodcastSections(draft: string): { open: string; hook: string; body: string[]; close: string } {
  const sections: { open: string; hook: string; body: string[]; close: string } = {
    open: "", hook: "", body: [], close: "",
  };
  // Split on section markers
  const markerPattern = /\[(OPEN|HOOK|BODY|CLOSE|SEGMENT BREAK|PAUSE)\]/gi;
  let currentSection = "";
  let lastIndex = 0;
  let match;
  const chunks: Array<{ section: string; text: string }> = [];

  // Find all markers and collect text between them
  while ((match = markerPattern.exec(draft)) !== null) {
    if (currentSection && lastIndex < match.index) {
      const text = draft.slice(lastIndex, match.index).trim();
      if (text) chunks.push({ section: currentSection, text });
    }
    currentSection = match[1].toUpperCase();
    lastIndex = match.index + match[0].length;
  }
  // Remaining text after last marker
  if (currentSection && lastIndex < draft.length) {
    const text = draft.slice(lastIndex).trim();
    if (text) chunks.push({ section: currentSection, text });
  }

  // If no markers found, treat entire text as body
  if (chunks.length === 0) {
    const lines = draft.split("\n").filter(Boolean);
    return { open: lines[0] || "", hook: lines[1] || "", body: lines.slice(2), close: "" };
  }

  for (const chunk of chunks) {
    switch (chunk.section) {
      case "OPEN": sections.open = chunk.text; break;
      case "HOOK": sections.hook = chunk.text; break;
      case "CLOSE": sections.close = chunk.text; break;
      default: sections.body.push(chunk.text); break;
    }
  }
  return sections;
}

/** Strip markdown bold/italic markers from title text */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^#+\s*/, "")
    .trim();
}

/** Render inline markdown (bold, italic, blockquote) as React elements */
function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle blockquote prefix
  const isBlockquote = text.startsWith("> ");
  const content = isBlockquote ? text.slice(2) : text;
  // Handle heading prefixes (strip #)
  const headingMatch = content.match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const headText = headingMatch[2];
    const fontSize = level === 1 ? 18 : level === 2 ? 15 : 14;
    return <span style={{ fontWeight: 700, fontSize, color: "var(--fg)" }}>{headText}</span>;
  }
  // Split on **bold** and *italic* markers
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  const rendered = parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700, color: "var(--fg)" }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
  if (isBlockquote) {
    return <span style={{ borderLeft: "3px solid var(--gold-bright)", paddingLeft: 12, display: "block", fontStyle: "normal", color: "var(--fg-2)" }}>{rendered}</span>;
  }
  return <>{rendered}</>;
}

/** Map legacy checkpoint labels to function labels for old saved outputs */
const AGENT_TO_FUNCTION: Record<string, string> = {
  "Echo": "Deduplication",
  "Priya": "Research Validation",
  "Jordan": "Voice Authenticity",
  "David": "Engagement Optimization",
  "Elena": "SLOP Detection",
  "Natasha": "Editorial Excellence",
  "Marcus + Marshall": "Perspective and Risk",
  "Human Voice Test": "Human Voice Test",
};
function displayGateName(raw: string): string {
  return AGENT_TO_FUNCTION[raw] || raw;
}

const CHECKPOINT_LABELS: Record<string, string> = {
  "checkpoint-0": "Deduplication",
  "checkpoint-1": "Research Validation",
  "checkpoint-2": "Voice Authenticity",
  "checkpoint-3": "Engagement Optimization",
  "checkpoint-4": "SLOP Detection",
  "checkpoint-5": "Editorial Excellence",
  "checkpoint-6": "Perspective & Risk",
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "reed" | "user";
  content: string;
  isChallenge?: boolean;
}

interface OutlineRow {
  label: string;
  content: string;
  indent?: boolean;
}

/** Client guard: false if row bodies match entirely or too many parallel lines match (tab switch would look broken). */
function outlineAnglesDistinctEnough(a: OutlineRow[], b: OutlineRow[]): boolean {
  if (!a?.length || !b?.length) return false;
  const fingerprint = (rows: OutlineRow[]) =>
    rows.map(r => (r.content || "").trim().toLowerCase()).join("\u0001");
  if (fingerprint(a) === fingerprint(b)) return false;
  const n = Math.min(a.length, b.length);
  let identicalLines = 0;
  for (let i = 0; i < n; i++) {
    const ca = (a[i].content || "").trim().toLowerCase();
    const cb = (b[i].content || "").trim().toLowerCase();
    if (ca.length > 0 && ca === cb) identicalLines++;
  }
  if (n > 0 && identicalLines / n >= 0.45) return false;
  return true;
}

interface CheckpointResult {
  gate: string;
  status: "PASS" | "FAIL" | "FLAG";
  score: number;
  feedback: string;
  issues?: string[];
  /** Jordan only, when Method DNA was in the gate prompt; optional for older API responses. */
  methodologyTermFidelity?: string;
}

interface ImpactScore {
  /** Pipeline aggregate; used for internal gates and persistence only, not shown in UI. */
  total: number;
  verdict: "PUBLISH" | "REVISE" | "REJECT";
  topIssue?: string;
  gutCheck?: string;
  breakdown?: Record<string, number>;
}

interface HVTFlaggedLine {
  lineIndex: number;
  original: string;
  issue: string;
  vector: string;
  suggestion: string;
}

interface HVTResult {
  verdict: "PASSES" | "NEEDS_WORK";
  flaggedLines: HVTFlaggedLine[];
  score: number;
  feedback: string;
}

interface PipelineRun {
  status: "PASSED" | "BLOCKED" | "ERROR";
  checkpointResults: CheckpointResult[];
  impactScore: ImpactScore | null;
  humanVoiceTest: HVTResult | null;
  blockedAt?: string;
  finalDraft?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/** Load user's Voice DNA + Brand DNA from Supabase resources table */
function useUserDNA(userId: string | undefined) {
  const [voiceDnaMd, setVoiceDnaMd] = useState("");
  const [brandDnaMd, setBrandDnaMd] = useState("");
  const [methodDnaMd, setMethodDnaMd] = useState("");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      // Try resources table first (preferred, structured DNA)
      const { data } = await supabase
        .from("resources")
        .select("resource_type, content")
        .eq("user_id", userId);

      if (data && data.length > 0) {
        const voice = data.filter(r => r.resource_type === "voice_dna").map(r => r.content || "").join("\n").trim();
        const brand = data.filter(r => r.resource_type === "brand_dna").map(r => r.content || "").join("\n").trim();
        const method = data.filter(r => r.resource_type === "method_dna").map(r => r.content || "").join("\n").trim();
        if (voice) setVoiceDnaMd(voice);
        if (brand) setBrandDnaMd(brand);
        if (method) setMethodDnaMd(method);
        if (voice || brand) return;
      }

      // Fallback: load from profiles table (onboarding data)
      const { data: profile } = await supabase
        .from("profiles")
        .select("voice_dna_md, brand_dna_md, voice_profile")
        .eq("id", userId)
        .single();

      if (profile) {
        if (profile.voice_dna_md) setVoiceDnaMd(profile.voice_dna_md);
        if (profile.brand_dna_md) setBrandDnaMd(profile.brand_dna_md);
        if (!profile.voice_dna_md && profile.voice_profile) {
          const vp = profile.voice_profile as Record<string, any>;
          const vpMd = Object.entries(vp)
            .filter(([, v]) => v && typeof v === "string")
            .map(([k, v]) => `**${k}**: ${v}`)
            .join("\n");
          if (vpMd) setVoiceDnaMd(vpMd);
        }
      }
    })();
  }, [userId]);

  return { voiceDnaMd, brandDnaMd, methodDnaMd };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg style={{ width: 13, height: 13, stroke: "currentColor", strokeWidth: 2.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }} viewBox="0 0 24 24">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg style={{ width: 14, height: 14, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg style={{ width: 15, height: 15, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg style={{ width: 12, height: 12, stroke: "var(--blue)", strokeWidth: 1.75, fill: "none", flexShrink: 0 }} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IaBtn({ title, active, children, onMouseDown, onMouseUp, onMouseLeave, onClick,
  onPointerDown, onPointerUp, onPointerLeave, onPointerCancel,
}: {
  title?: string; active?: boolean; children: React.ReactNode;
  onMouseDown?: () => void; onMouseUp?: () => void;
  onMouseLeave?: () => void; onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      style={{
        width: 36, height: 36, borderRadius: 7,
        border: active ? "1px solid rgba(245,198,66,0.25)" : "1px solid var(--glass-border)",
        background: active ? "rgba(245,198,66,0.1)" : "var(--glass-card)",
        color: active ? "var(--gold)" : "var(--fg-3)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.12s", fontFamily: FONT,
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {children}
    </button>
  );
}

function AdvanceButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div style={{
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "0 clamp(12px, 3vw, 20px) 10px",
      display: "flex",
      justifyContent: "center",
      flexShrink: 0,
    }}
    >
      <button
        type="button"
        className="liquid-glass-btn-gold"
        onClick={onClick}
        disabled={disabled}
        style={{ fontSize: 11, padding: "8px 20px", fontFamily: FONT }}
      >
        <span className="liquid-glass-btn-gold-label">{label}</span>
      </button>
    </div>
  );
}

function LoadingDots({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 12, color: "var(--fg-3)" }}>
      <span style={{ animation: "pulse 1.5s infinite", display: "inline-block" }}>●</span>
      <span style={{ animation: "pulse 1.5s 0.3s infinite", display: "inline-block" }}>●</span>
      <span style={{ animation: "pulse 1.5s 0.6s infinite", display: "inline-block" }}>●</span>
      <span style={{ marginLeft: 6 }}>{label}</span>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT BAR
// ─────────────────────────────────────────────────────────────────────────────

function InputBar({
  placeholder, value, onChange, onSend, disabled,
}: {
  placeholder: string; value: string; onChange: (v: string) => void;
  onSend: () => void; disabled?: boolean;
}) {
  const [micActive, setMicActive] = useState(false);

  return (
    <div style={{
      borderTop: "1px solid var(--glass-border)", padding: "10px 14px",
      display: "flex", flexDirection: "column", gap: 4,
      flexShrink: 0, background: "var(--glass-topbar)",
      backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !disabled) { e.preventDefault(); onSend(); } }}
          placeholder={placeholder}
          readOnly={disabled}
          style={{
            flex: 1, background: "var(--glass-input)", border: "1px solid var(--glass-border)",
            borderRadius: 10, padding: "0 12px", fontSize: 13, color: "var(--fg)",
            fontFamily: FONT, outline: "none", height: 36, transition: "border-color 0.12s",
            opacity: disabled ? 0.5 : 1,
            backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)",
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(245,198,66,0.5)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--glass-border)"; }}
        />
        <IaBtn title="Attach file"><AttachIcon /></IaBtn>
        <IaBtn
          title="Hold to speak" active={micActive}
          onMouseDown={() => setMicActive(true)}
          onMouseUp={() => setMicActive(false)}
          onMouseLeave={() => setMicActive(false)}
        >
          <MicIcon />
        </IaBtn>
        <button
          type="button"
          className="liquid-glass-btn liquid-glass-btn--square"
          onClick={onSend}
          disabled={disabled}
          aria-label="Send"
          title="Send"
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <SendIcon />
        </button>
      </div>
      <div style={{ fontSize: 9, color: "var(--fg-3)", textAlign: "right" as const, paddingRight: 80, letterSpacing: "0.04em" }}>
        Hold to speak · Release to send
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PANEL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function DpLabel({ children, collapsible, open, onToggle, action }: {
  children: React.ReactNode; collapsible?: boolean; open?: boolean;
  onToggle?: () => void; action?: React.ReactNode;
}) {
  return (
    <div
      onClick={collapsible ? onToggle : undefined}
      style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
        color: "var(--fg-3)", marginBottom: 6, display: "flex", justifyContent: "space-between",
        alignItems: "center", cursor: collapsible ? "pointer" : "default", userSelect: "none" as const,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{children}{action}</span>
      {collapsible && (
        <span style={{ fontSize: 16, color: open ? "var(--fg)" : "var(--fg-3)", fontWeight: 600, lineHeight: 1, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>›</span>
      )}
    </div>
  );
}

function DpSection({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}>{children}</div>;
}

// ── Outline dashboard ─────────────────────────────────────────
function OutlineDash({ selectedFormats, outlineRows }: { selectedFormats: Format[]; outlineRows?: Array<{ label: string; content: string; indent?: boolean }> }) {
  // CO_021 Fix 2: Reed's Take heuristic from outline structure
  const reedOutlineTake = (() => {
    if (!outlineRows || outlineRows.length === 0) return null;
    const sections: Array<{ label: string; subCount: number }> = [];
    let currentLabel = "";
    let currentSubs = 0;
    for (const row of outlineRows) {
      if (row.label && !row.indent) {
        if (currentLabel) sections.push({ label: currentLabel, subCount: currentSubs });
        currentLabel = row.label;
        currentSubs = 0;
      } else if (row.indent) {
        currentSubs++;
      }
    }
    if (currentLabel) sections.push({ label: currentLabel, subCount: currentSubs });
    // Exclude Title from assessment
    const assessed = sections.filter(s => s.label !== "Title");
    if (assessed.length === 0) return null;
    const maxSubs = Math.max(...assessed.map(s => s.subCount));
    const minSubs = Math.min(...assessed.map(s => s.subCount));
    if (maxSubs === minSubs) return "Structure looks balanced across sections. Review and adjust before writing.";
    const strongest = assessed.find(s => s.subCount === maxSubs)!;
    const weakest = assessed.find(s => s.subCount === minSubs)!;
    return `The ${strongest.label} section is your strongest. ${weakest.label} could use more development.`;
  })();

  const wordMap: Partial<Record<Format, string>> = {
    LinkedIn: "700 words", Newsletter: "800 words",
    Podcast: "1,200 words", "Sunday Story": "1,500 words",
  };
  return (
    <>
    {reedOutlineTake && (
      <DpSection>
        <DpLabel>Reed's Take</DpLabel>
        <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6 }}>{reedOutlineTake}</div>
      </DpSection>
    )}
    <DpSection>
      <DpLabel>Selected outputs</DpLabel>
      {selectedFormats.length === 0 ? (
        <div style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: 1.5 }}>
          You pick channel formats after Review when you start Wrap.
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {selectedFormats.map(f => (
          <div key={f} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "5px 8px", borderRadius: 5,
            border: "1px solid var(--gold-bright)", background: "rgba(245,198,66,0.05)",
          }}>
            <span style={{ fontSize: 11, color: "var(--fg)", fontWeight: 500 }}>{f}</span>
            <span style={{ fontSize: 10, color: "var(--blue)" }}>{wordMap[f] ?? "~"}</span>
          </div>
        ))}
      </div>
    </DpSection>
    </>
  );
}

// ── Per-format improve cards (Review sidebar) ────────────────
/** Stable key so Method DNA lint runs once per draft body (auto Review + pre-export). */
function draftFingerprintForLint(text: string): string {
  const d = text || "";
  let h = 0;
  for (let i = 0; i < d.length; i++) {
    h = (Math.imul(31, h) + d.charCodeAt(i)) | 0;
  }
  return `${d.length}:${h}`;
}

type MethodTermHit = {
  draftSnippet: string;
  genericPhrase: string;
  methodTerm: string;
};

// ── Draft flag counting ──────────────────────────────────────
const PASSIVE_REGEX = /(was\s+\w+ed\b|were\s+\w+ed\b|has been\s+\w+ed\b|have been\s+\w+ed\b|had been\s+\w+ed\b|is being\s+\w+ed\b|are being\s+\w+ed\b|was being\s+\w+ed\b|never made it anywhere)/i;
const CLICHE_REGEX = /(lost opportunity|game.?changer|at the end of the day|touch base|move the needle|deep dive|circle back|low.?hanging fruit|synergy|leverage|paradigm shift|think outside|best practices|value.?add)/i;

function countDraftFlags(draft: string, dismissedFlags: Set<string>, fixedFlags: Map<string, string>): { must: number; style: number } {
  if (!draft) return { must: 0, style: 0 };
  let must = 0;
  let style = 0;
  const paragraphs = draft.split("\n").filter(Boolean).slice(1);

  paragraphs.forEach((para, i) => {
    const isSubhead = para.length < 60 && !para.endsWith(".");
    if (isSubhead) return;

    if (para.match(/(\d+%\s+of\s+\w+[^.]*)/) && !fixedFlags.has(`must-${i}`) && !dismissedFlags.has(`must-${i}`)) {
      must++;
    }
    if (para.match(PASSIVE_REGEX) && !fixedFlags.has(`style-${i}`) && !dismissedFlags.has(`style-${i}`)) {
      style++;
    }
    if (para.match(CLICHE_REGEX) && !fixedFlags.has(`cliche-${i}`) && !dismissedFlags.has(`cliche-${i}`)) {
      style++;
    }
  });

  return { must, style };
}

// ── CO_020 Part 3: Dynamic intake placeholder ────────────────
const QUESTION_STARTERS = /^(who|what|where|when|why|how|is|are|do|does|should|could|would|can|will|did|has|have|tell|walk|give|help|show)\b/i;

function shortenQuestion(sentence: string): string {
  const limit = QUESTION_STARTERS.test(sentence) ? 40 : 35;
  if (sentence.length <= limit) return sentence.replace(/\?$/, "...");
  const trimmed = sentence.slice(0, limit);
  const lastSpace = trimmed.lastIndexOf(" ");
  const cut = lastSpace > 10 ? trimmed.slice(0, lastSpace) : trimmed;
  return cut.replace(/[.,;:!?\s]+$/, "") + "...";
}

const READINESS_PHRASES = [
  "ready to write", "ready to produce", "i have what i need", "i have enough",
  "let me produce", "shall i produce", "here is what i will produce",
  "here's what i'll produce", "ready to make an outline",
];

// ── Review helpers ────────────────────────────────────────────
function deriveReviewGateStatus(score: number): "Pass" | "Review" | "Fail" {
  if (score >= 70) return "Pass";
  if (score >= 50) return "Review";
  return "Fail";
}

function deriveReviewDisplayGates(
  checkpoints: CheckpointResult[],
  hvt: { verdict: string; score: number } | null,
): Array<{ name: string; status: "Pass" | "Review" | "Fail" }> {
  const find = (gate: string) => checkpoints.find(g => g.gate === gate);
  const slopGate = find("checkpoint-4");
  const voiceGate = find("checkpoint-2");
  const editGate = find("checkpoint-5");
  const engageGate = find("checkpoint-3");
  const dedup = find("checkpoint-0");

  // Humanization: whichever of editorial / engagement scored lower
  const humScore = Math.min(editGate?.score ?? 100, engageGate?.score ?? 100);

  return [
    { name: "SLOP Detection", status: deriveReviewGateStatus(slopGate?.score ?? 0) },
    { name: "Human Voice Test", status: hvt ? (hvt.verdict === "PASSES" ? "Pass" : deriveReviewGateStatus(hvt.score)) : deriveReviewGateStatus(voiceGate?.score ?? 0) },
    { name: "Humanization", status: deriveReviewGateStatus(humScore) },
    { name: "Deduplication", status: deriveReviewGateStatus(dedup?.score ?? 0) },
  ];
}

// ── CO_025: Context-aware Draft Inspector chips ──────────────
interface DraftAction { label: string; instruction: string }

function getDraftInspectorActions(
  wordCount: number,
  targetWords: number,
  flagCounts: { must: number; style: number },
  bgNonPass: Array<{ name: string; status: string }>,
  hookGateStatus: "PASS" | "FAIL" | "FLAG" | null,
): { firstMove: DraftAction | null; chips: DraftAction[] } {
  const hasHardFlags = flagCounts.must > 0 || bgNonPass.length > 0;
  const delta = wordCount - targetWords;

  // Priority 1: hard flags (must-fix heuristic or pipeline non-pass)
  if (hasHardFlags) {
    return {
      firstMove: { label: "Fix the flagged lines", instruction: "Fix the flagged lines. Address must-fix issues while preserving the voice." },
      chips: [{ label: "Fix the flagged lines", instruction: "Fix the flagged lines. Address must-fix issues while preserving the voice." }],
    };
  }

  // Priority 2: significantly below target
  if (delta < -50) {
    return {
      firstMove: { label: `Expand to ${targetWords} words`, instruction: `Expand this to ${targetWords} words. Add a second example and deepen the stakes.` },
      chips: [
        { label: `Expand to ${targetWords} words`, instruction: `Expand this to ${targetWords} words. Add a second example and deepen the stakes.` },
        { label: "Add an example or evidence", instruction: "Add a concrete example or piece of evidence to strengthen the argument." },
      ],
    };
  }

  // Priority 3: significantly above target
  if (delta > 50) {
    const chips: DraftAction[] = [
      { label: `Tighten to ${targetWords} words`, instruction: `Tighten this to ${targetWords}. Cut what doesn't earn its place. Keep the voice.` },
      { label: "Cut 100 words without losing the point", instruction: "Cut 100 words without losing the point" },
    ];
    return { firstMove: chips[0], chips };
  }

  // Priority 4: near target, no hard flags
  const chips: DraftAction[] = [
    { label: "Check the voice match", instruction: "Check the voice match. Does this sound like me? Flag anything that drifts." },
  ];
  if (hookGateStatus !== "PASS") {
    chips.push({ label: "Tighten the hook", instruction: "Tighten the opening hook. Make the first line earn the second." });
  }
  return { firstMove: chips[0], chips };
}

// CO_029 Failure 1: HVT flagged lines with optional collapse
function HvtFlaggedSection({ lines, initialShow }: { lines: HVTFlaggedLine[]; initialShow: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? lines : lines.slice(0, initialShow);
  const remaining = lines.length - initialShow;

  return (
    <DpSection>
      <DpLabel>Voice test flags</DpLabel>
      {visible.map((fl, i) => (
        <div key={i} style={{
          marginBottom: 8, padding: "8px 10px", borderRadius: 6,
          border: "1px solid rgba(74,144,217,0.2)",
          background: "rgba(74,144,217,0.04)",
        }}>
          <div style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.5, marginBottom: 4, fontStyle: "italic" }}>
            "{fl.original}"
          </div>
          <div style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: 1.5 }}>
            {fl.issue}
          </div>
          {fl.suggestion && (
            <div style={{ fontSize: 10, color: "var(--blue, #4A90D9)", lineHeight: 1.5, marginTop: 2 }}>
              Suggestion: {fl.suggestion}
            </div>
          )}
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            fontSize: 10, color: "var(--blue, #4A90D9)", cursor: "pointer",
            background: "none", border: "none", padding: 0, fontFamily: FONT,
          }}
        >
          Show {remaining} more
        </button>
      )}
    </DpSection>
  );
}

// ── Review dashboard ──────────────────────────────────────────
function ReviewDash({
  pipelineRun, running, onExportAll, allExported, onRepairPipeline, fixingGate, rerunning,
  hasMethodDna,
  methodTermHits,
  methodLintLoading,
  methodLintInspectorError,
  methodLintLastCompletedFp,
  draftLintFp,
  onRetryMethodLint,
  reedActionMessage,
  onDismissReedAction,
}: {
  pipelineRun: PipelineRun | null; running: boolean;
  onExportAll: () => void; allExported: boolean;
  onRepairPipeline: () => void;
  fixingGate: string | null;
  rerunning: boolean;
  hasMethodDna: boolean;
  methodTermHits: MethodTermHit[];
  methodLintLoading: boolean;
  methodLintInspectorError: MethodLintInspectorError | null;
  methodLintLastCompletedFp: string | null;
  draftLintFp: string;
  onRetryMethodLint: () => void;
  reedActionMessage: string | null;
  onDismissReedAction: () => void;
}) {
  /** Internal publish readiness from pipeline; never rendered as a number. */
  const publishAggregateOk = pipelineRun?.impactScore != null && pipelineRun.impactScore.total >= 75;

  const displayGates = pipelineRun
    ? deriveReviewDisplayGates(pipelineRun.checkpointResults, pipelineRun.humanVoiceTest)
    : [];
  const nonPassGates = displayGates.filter(g => g.status !== "Pass");
  const allPass = nonPassGates.length === 0;

  // Reed's natural language assessment (includes silent method-DNA wording pass when it finds something)
  const reedMessage = (() => {
    if (!pipelineRun) return "";
    const methodWordingNote =
      !methodLintLoading &&
      methodLintLastCompletedFp === draftLintFp &&
      methodTermHits.length > 0
        ? " Reed noticed some wording that could be more specific to your method. Want to fix it?"
        : "";

    if (allPass && publishAggregateOk) {
      return `This is ready to publish. The writing is clean and the voice matches.${methodWordingNote}`;
    }

    const issueDescriptions = nonPassGates.map(g => {
      const name = (g.name || "").toLowerCase();
      if (name.includes("dedup")) return "some repeated ideas";
      if (name.includes("research") || name.includes("validation")) return "an unverified claim";
      if (name.includes("voice")) return "a few lines that drift from your voice";
      if (name.includes("engagement") || name.includes("hook")) return "the opening could hit harder";
      if (name.includes("slop")) return "some AI-sounding language";
      if (name.includes("editorial")) return "a section that needs tightening";
      if (name.includes("perspective") || name.includes("risk")) return "a perspective gap";
      if (name.includes("human voice")) return "a few lines that read as generated";
      return g.name.toLowerCase();
    });

    let core = "";
    if (issueDescriptions.length === 1) {
      core = `Almost there. Reed found ${issueDescriptions[0]}. One fix and this is ready.`;
    } else if (issueDescriptions.length <= 3) {
      core = `A few things to address: ${issueDescriptions.join(", ")}. Let Reed handle it, or go back and edit.`;
    } else {
      core = `${issueDescriptions.length} items need work. Let Reed fix them automatically for the fastest path to publish.`;
    }
    return core + methodWordingNote;
  })();

  return (
    <>
      {/* Running state */}
      {running && (
        <DpSection>
          <DpLabel>Reed is reviewing your draft...</DpLabel>
          <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: "var(--glass-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: "var(--gold-bright)", width: "60%", animation: "pulse-width 2s ease-in-out infinite" }} />
          </div>
        </DpSection>
      )}

      {/* Fixing/rerunning state */}
      {(fixingGate || rerunning) && !running && (
        <div style={{ fontSize: 11, color: "var(--gold-bright)", marginBottom: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ animation: "pulse-dot 1.5s infinite" }}>&#9679;</span>
          Reed is improving the draft...
        </div>
      )}

      {/* Results */}
      {pipelineRun && !running && (
        <>
          {/* Reed's assessment in plain language */}
          {reedMessage && (
            <div style={{
              border: "1px solid rgba(74,144,217,0.25)", borderRadius: 8,
              padding: "10px 12px", background: "rgba(74,144,217,0.04)",
              marginBottom: 12,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#4A90D9", marginBottom: 6 }}>Reed</div>
              <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6 }}>{reedMessage}</div>
            </div>
          )}

          {/* CO_029 Failure 8: Persistent Reed action message */}
          {reedActionMessage && (
            <div style={{
              position: "relative",
              border: "1px solid rgba(74,144,217,0.25)", borderRadius: 8,
              padding: "8px 28px 8px 10px", background: "rgba(74,144,217,0.04)",
              marginBottom: 12,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#4A90D9", marginBottom: 4 }}>Reed</div>
              <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.5 }}>{reedActionMessage}</div>
              <button
                type="button"
                onClick={onDismissReedAction}
                aria-label="Dismiss"
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 18, height: 18, borderRadius: 4,
                  border: "none", background: "transparent",
                  color: "var(--fg-3)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontFamily: FONT, padding: 0,
                }}
              >&times;</button>
            </div>
          )}

          {/* CO_029 Failure 1: Flagged checkpoint items */}
          {nonPassGates.length > 0 && (
            <DpSection>
              <DpLabel>Flagged items</DpLabel>
              {nonPassGates.map((g, i) => {
                // Map display gate name back to checkpoint feedback
                const gateNameLower = (g.name || "").toLowerCase();
                const sourceCheckpoint = pipelineRun.checkpointResults.find(cp => {
                  if (gateNameLower.includes("slop")) return cp.gate === "checkpoint-4";
                  if (gateNameLower.includes("dedup")) return cp.gate === "checkpoint-0";
                  if (gateNameLower.includes("human")) return cp.gate === "checkpoint-2";
                  if (gateNameLower.includes("humanization")) return cp.gate === "checkpoint-5" || cp.gate === "checkpoint-3";
                  return false;
                });
                return (
                  <div key={i} style={{
                    marginBottom: 8, padding: "8px 10px", borderRadius: 6,
                    border: `1px solid ${g.status === "Fail" ? "rgba(185,28,28,0.25)" : "rgba(245,198,66,0.3)"}`,
                    background: g.status === "Fail" ? "rgba(185,28,28,0.04)" : "rgba(245,198,66,0.04)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: g.status === "Fail" ? "#b91c1c" : "var(--gold-bright)",
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)" }}>{g.name}</span>
                      <span style={{ fontSize: 9, color: "var(--fg-3)", marginLeft: "auto" }}>{g.status}</span>
                    </div>
                    {sourceCheckpoint?.feedback && (
                      <div style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.5, marginBottom: sourceCheckpoint.issues?.length ? 4 : 0 }}>
                        {sourceCheckpoint.feedback}
                      </div>
                    )}
                    {sourceCheckpoint?.issues && sourceCheckpoint.issues.length > 0 && (
                      <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 10, color: "var(--fg-3)", lineHeight: 1.5 }}>
                        {sourceCheckpoint.issues.map((issue, j) => <li key={j}>{issue}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </DpSection>
          )}

          {/* CO_029 Failure 1: HVT flagged lines */}
          {pipelineRun.humanVoiceTest && pipelineRun.humanVoiceTest.flaggedLines.length > 0 && (() => {
            const lines = pipelineRun.humanVoiceTest.flaggedLines;
            const INITIAL_SHOW = 3;
            const needsCollapse = lines.length > 5;
            return (
              <HvtFlaggedSection lines={lines} initialShow={needsCollapse ? INITIAL_SHOW : lines.length} />
            );
          })()}

          {/* Primary action buttons */}
          {!publishAggregateOk && (
            <button
              type="button"
              className="liquid-glass-btn-gold"
              onClick={onRepairPipeline}
              disabled={!!fixingGate || rerunning}
              style={{ width: "100%", marginBottom: 8, fontSize: 11, fontFamily: FONT }}
            >
              <span className="liquid-glass-btn-gold-label">Let Reed fix it</span>
            </button>
          )}

          {!publishAggregateOk && (
            <button
              onClick={() => {
                window.__ewSetWorkStage?.("Edit");
              }}
              style={{
                width: "100%", padding: 10, borderRadius: 6, marginBottom: 8,
                background: "var(--glass-card)", border: "1px solid var(--glass-border)",
                fontSize: 11, fontWeight: 600, color: "var(--fg-2)",
                cursor: "pointer", fontFamily: FONT,
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              }}
            >
              Go back to Draft
            </button>
          )}

          {hasMethodDna && (methodLintLoading || methodLintInspectorError != null) && (
            <div style={{ marginBottom: 12 }}>
              {methodLintLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-2)", lineHeight: 1.45 }}>
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0, width: 12, height: 12, borderRadius: "50%",
                      border: "2px solid var(--glass-border)", borderTopColor: "var(--gold-bright)",
                      animation: "ew-method-lint-spin 0.7s linear infinite",
                    }}
                  />
                  Checking...
                </div>
              ) : methodLintInspectorError === "timeout" ? (
                <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.5 }}>
                  <div style={{ marginBottom: 8 }}>The method terminology check timed out. This can happen with longer drafts. Hit Retry, it usually resolves in one attempt.</div>
                  <button
                    type="button"
                    className="liquid-glass-btn"
                    onClick={onRetryMethodLint}
                    style={{ padding: "6px 12px", fontSize: 10, fontFamily: FONT }}
                  >
                    <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Retry</span>
                  </button>
                </div>
              ) : methodLintInspectorError === "unreachable" ? (
                <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.5 }}>
                  <div style={{ marginBottom: 8 }}>
                    The studio API is not reachable from this browser. Check your connection or VPN, then try again.
                  </div>
                  <button
                    type="button"
                    className="liquid-glass-btn"
                    onClick={onRetryMethodLint}
                    style={{ padding: "6px 12px", fontSize: 10, fontFamily: FONT }}
                  >
                    <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Retry</span>
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.5 }}>
                  <div style={{ marginBottom: 8 }}>The method terminology check did not complete. Hit Retry, it usually resolves in one attempt.</div>
                  <button
                    type="button"
                    className="liquid-glass-btn"
                    onClick={onRetryMethodLint}
                    style={{ padding: "6px 12px", fontSize: 10, fontFamily: FONT }}
                  >
                    <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Retry</span>
                  </button>
                </div>
              )}
              <style>{`@keyframes ew-method-lint-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          <button
            onClick={onExportAll}
            disabled={allExported}
            style={{
              width: "100%", padding: 10, borderRadius: 6,
              background: allExported ? "rgba(74,144,217,0.12)" : (publishAggregateOk ? "var(--gold)" : "var(--surface)"),
              border: publishAggregateOk ? "none" : "1px solid var(--glass-border)",
              fontSize: 12, fontWeight: 700,
              color: allExported ? "var(--blue)" : (publishAggregateOk ? "var(--fg)" : "var(--fg)"),
              cursor: allExported ? "default" : "pointer",
              fontFamily: FONT, transition: "all 0.2s",
            }}
          >
            {allExported ? "Exported" : (publishAggregateOk ? "Export all" : "Export anyway")}
          </button>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE: INTAKE
// ─────────────────────────────────────────────────────────────────────────────

type IntakeDockedComposerProps = {
  value: string;
  onChange: (v: string) => void;
  pendingFiles: File[];
  onAddPendingFiles: (files: FileList) => void;
  onRemovePendingFile: (index: number) => void;
  onSend: () => void;
};

function StageIntake({
  messages, onSend, sending, isReady, onAdvance, userInitials, firstName,
  serializeSessionFiles, onCommitAttachedFiles, onNewSession,
  composerSeed, onConsumeComposerSeed,
  dockedComposer, intakePlaceholder,
}: {
  messages: ChatMessage[]; onSend: (text: string) => void | Promise<void>;
  sending: boolean; isReady: boolean; onAdvance: () => void; userInitials?: string; firstName?: string;
  serializeSessionFiles: (files: File[]) => Promise<string>;
  onCommitAttachedFiles?: (files: File[]) => void;
  onNewSession?: () => void;
  composerSeed?: string | null;
  onConsumeComposerSeed?: () => void;
  /** When set (active intake with docked shell), the parent renders ChatInputBar; this instance omits it. */
  dockedComposer?: IntakeDockedComposerProps | null;
  intakePlaceholder?: string;
}) {
  const [internalInput, setInternalInput] = useState("");
  const [internalPendingFiles, setInternalPendingFiles] = useState<File[]>([]);
  const useDockedComposer = Boolean(dockedComposer);
  const input = useDockedComposer ? dockedComposer!.value : internalInput;
  const setInput = useDockedComposer ? dockedComposer!.onChange : setInternalInput;
  const pendingFiles = useDockedComposer ? dockedComposer!.pendingFiles : internalPendingFiles;
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  const reedQuestionCount = messages.filter(m => m.role === "reed" && m.content.trim().endsWith("?")).length;
  const totalQuestions = 4;
  const progress = Math.min(reedQuestionCount / totalQuestions, 1);
  /** Prominent outline CTA: API ready, or full question arc in the UI. */
  const showProminentOutlineCta = isReady || reedQuestionCount >= totalQuestions;
  /** Early-only skip link: hide after 2 questions (past halfway of 4). */
  const showJustWriteEscape = reedQuestionCount < 2 && !showProminentOutlineCta;

  // Welcome state: show centered greeting until user sends first message
  const hasUserMessage = messages.some(m => m.role === "user");

  // Only scroll when a new message is added, not on every render
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== prevMsgCount.current || sending) {
      prevMsgCount.current = messages.length;
      requestAnimationFrame(() => {
        const scroller = messagesScrollRef.current;
        if (scroller) {
          scroller.scrollTop = scroller.scrollHeight;
        } else {
          bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      });
    }
  }, [messages.length, sending]);

  // Scroll fade indicators for discoverability
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollFades = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) { setCanScrollUp(false); setCanScrollDown(false); return; }
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }, []);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollFades());
    ro.observe(el);
    updateScrollFades();
    return () => ro.disconnect();
  }, [updateScrollFades]);

  // Update fades when messages change
  useEffect(() => {
    requestAnimationFrame(updateScrollFades);
  }, [messages.length, updateScrollFades]);

  // Re-focus input after Reed finishes responding
  const prevSending = useRef(sending);
  useEffect(() => {
    if (prevSending.current && !sending) {
      setTimeout(() => {
        const textarea = document.querySelector('.reed-input') as HTMLTextAreaElement;
        if (textarea && !textarea.disabled) {
          textarea.focus();
        }
      }, 100);
    }
    prevSending.current = sending;
  }, [sending]);

  // CO_018: Track whether the input was seeded from a Watch signal
  const [seededFromWatch, setSeededFromWatch] = useState(false);

  useEffect(() => {
    if (composerSeed == null || composerSeed === "") return;
    setInput(composerSeed);
    setSeededFromWatch(true);
    onConsumeComposerSeed?.();
  }, [composerSeed, setInput, onConsumeComposerSeed]);

  const handleAddPendingFiles = useCallback((files: FileList) => {
    if (useDockedComposer) dockedComposer!.onAddPendingFiles(files);
    else setInternalPendingFiles(prev => [...prev, ...Array.from(files)]);
  }, [useDockedComposer, dockedComposer]);

  const handleRemovePendingFile = useCallback((idx: number) => {
    if (useDockedComposer) dockedComposer!.onRemovePendingFile(idx);
    else setInternalPendingFiles(prev => prev.filter((_, i) => i !== idx));
  }, [useDockedComposer, dockedComposer]);

  const handleSend = () => {
    if (sending) return;
    if (useDockedComposer) {
      dockedComposer!.onSend();
      return;
    }
    void (async () => {
      const trimmed = input.trim();
      if (!trimmed && pendingFiles.length === 0) return;

      const parts: string[] = [];
      if (trimmed) parts.push(trimmed);

      const filesSnapshot = [...pendingFiles];
      if (filesSnapshot.length > 0) {
        const fileBlock = await serializeSessionFiles(filesSnapshot);
        if (fileBlock) {
          parts.push(`I've attached the following for this session:\n\n${fileBlock}`);
        }
      }

      if (parts.length === 0) return;
      if (filesSnapshot.length > 0) {
        onCommitAttachedFiles?.(filesSnapshot);
      }
      setInternalInput("");
      setInternalPendingFiles([]);
      await onSend(parts.join("\n\n"));
    })();
  };

  // Welcome state: centered greeting + input, like Claude's empty chat
  if (!hasUserMessage && !sending) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%",
        overflow: "hidden", background: "transparent", alignItems: "center", justifyContent: "center",
      }}>
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            minWidth: 0, padding: "0 clamp(12px, 4vw, 24px)",
            width: "100%", maxWidth: "clamp(400px, 60vw, 780px)",
          }}
        >
          {/* Greeting */}
          <div style={{
            fontSize: 26, fontWeight: 600, color: "var(--fg)",
            marginBottom: 16, fontFamily: FONT,
            textAlign: "center" as const,
            lineHeight: 1.25,
          }}>
            {firstName ? `Hey ${firstName}, what are we working on?` : "What are we working on?"}
          </div>

          {/* CO_018: Reed attribution for Watch signal pre-fill */}
          {seededFromWatch && input.trim() && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 14, fontFamily: FONT,
            }}>
              <ReedProfileIcon size={18} title="Reed" />
              <span style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
                I pulled your top signal from Watch. Ready to build. Hit send.
              </span>
            </div>
          )}

          {/* Centered input bar */}
          <div style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}>
            <ChatInputBar
              placeholder={intakePlaceholder || "What's on your mind?"}
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={sending}
              autoFocus
              pendingFiles={pendingFiles}
              onAddPendingFiles={handleAddPendingFiles}
              onRemovePendingFile={handleRemovePendingFile}
            />
          </div>

        </div>
      </div>
    );
  }

  // Active chat state: message list scrolls; composer pinned in column (parent also pins when docked).
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
      width: "100%",
    }}
    >
      <div style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
        alignItems: "stretch",
      }}
      >
      <div
        className="work-stage-content-column"
        style={{
          display: "flex",
          flexDirection: "column",
          alignSelf: "stretch",
          position: "relative",
        }}
      >
        {/* Scroll fade indicators */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 40, zIndex: 1,
          background: "linear-gradient(to bottom, var(--bg), transparent)",
          pointerEvents: "none",
          opacity: canScrollUp ? 1 : 0,
          transition: "opacity 150ms",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 40, zIndex: 1,
          background: "linear-gradient(to top, var(--bg), transparent)",
          pointerEvents: "none",
          opacity: canScrollDown ? 1 : 0,
          transition: "opacity 150ms",
        }} />
        {/* Messages: block-level overflow container; inner flex wrapper handles bottom-pinning */}
        <div
          ref={messagesScrollRef}
          className="work-intake-messages-scroll"
          onScroll={updateScrollFades}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: messages.length <= 8 ? "flex-end" : "flex-start",
            minHeight: "100%",
            padding: "20px clamp(12px, 4vw, 24px)",
          }}>
          <div style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 10 : 14,
            paddingTop: "40px",
          }}>
            {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.content} userInitials={userInitials} isChallenge={m.isChallenge} />)}
            {sending && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingTop: 4 }}>
                <ReedAvatar />
                <LoadingDots label="" />
              </div>
            )}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>
          </div>
        </div>

        {/* Clear next step: outline (replaces small duplicate when arc is complete or API says ready) */}
        {showProminentOutlineCta && (
          <div style={{
            padding: "14px clamp(12px, 4vw, 24px) 12px",
            background: "rgba(245,198,66,0.06)",
            borderTop: "1px solid rgba(245,198,66,0.22)",
            flexShrink: 0,
          }}>
            <div style={{
              maxWidth: 420,
              margin: "0 auto",
              textAlign: "center" as const,
            }}>
              {reedQuestionCount < totalQuestions ? (
                <p style={{
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--fg-2)",
                  margin: "0 0 12px",
                  fontFamily: FONT,
                }}>
                  Reed has enough to work with. You can keep the conversation going below, or continue to outline whenever you want.
                </p>
              ) : null}
              <button
                type="button"
                className="liquid-glass-btn-gold"
                onClick={onAdvance}
                style={{
                  width: "100%",
                  maxWidth: 300,
                  padding: "12px 20px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: FONT,
                  letterSpacing: "0.02em",
                }}
              >
                <span className="liquid-glass-btn-gold-label">Ready to make an outline</span>
              </button>
            </div>
          </div>
        )}

        {/* Intake progress bar (only when composer is NOT docked; docked shell renders its own) */}
        {!useDockedComposer && (
          <div style={{
            padding: "8px clamp(12px, 4vw, 24px) 8px",
            background: "transparent",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            flexShrink: 0,
          }}>
            <div style={{ width: "100%", height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${Math.round(progress * 100)}%`,
                background: "var(--gold-bright, #F5C642)", borderRadius: 2,
                transition: "width 0.3s ease",
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 500, letterSpacing: "0.04em" }}>
                {reedQuestionCount >= totalQuestions
                  ? `${totalQuestions} of ${totalQuestions} questions answered`
                  : `Question ${Math.min(reedQuestionCount, totalQuestions)} of ${totalQuestions}`}
              </span>
            </div>
          </div>
        )}

        {!useDockedComposer ? (
          <div style={{ ...INTAKE_DOCKED_COMPOSER_WRAP }}>
            {showJustWriteEscape && (
              <button
                type="button"
                onClick={onAdvance}
                style={{
                  fontSize: 10, color: "var(--fg-3)", background: "none",
                  border: "none", cursor: "pointer", padding: "2px 0", fontFamily: FONT,
                  marginBottom: 6, textAlign: "left" as const, display: "block",
                }}
              >
                Just write it →
              </button>
            )}
            <ChatInputBar
              placeholder={intakePlaceholder || "What's on your mind?"}
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={sending}
              autoFocus
              pendingFiles={pendingFiles}
              onAddPendingFiles={handleAddPendingFiles}
              onRemovePendingFile={handleRemovePendingFile}
            />
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}

function ReedAvatar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 2,
        width: 32,
      }}
    >
      <ReedProfileIcon size={26} title="Reed" />
    </div>
  );
}

/** Parse Reed text: render **bold** as <strong>, strip raw **, detect questions vs statements, detect search indicators */
function ReedTextRenderer({ text }: { text: string }) {
  // Detect search/research lines
  const isSearchLine = (line: string) =>
    /^(searching|looking up|researching|checking|scanning|analyzing|pulling data)/i.test(line.trim());

  // Detect if a line ends with a question mark (Reed is asking the user)
  const isQuestion = (line: string) => /\?\s*$/.test(line.trim());

  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, li) => {
        if (!line.trim()) return <br key={li} />;

        // Search/research indicator
        if (isSearchLine(line)) {
          return (
            <div key={li} style={{
              fontSize: 15, lineHeight: 1.65, color: "var(--blue)", fontStyle: "normal",
              padding: "3px 0", display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg style={{ width: 12, height: 12, stroke: "var(--blue)", strokeWidth: 2, fill: "none", flexShrink: 0 }} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {line}
            </div>
          );
        }

        // Parse markdown bold: **text** becomes <strong>text</strong>
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, pi) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={pi} style={{ fontWeight: 600, color: "var(--fg)" }}>{part.slice(2, -2)}</strong>;
          }
          return <span key={pi}>{part}</span>;
        });

        // If Reed is asking a question, render bold
        if (isQuestion(line)) {
          return (
            <div key={li} style={{ fontWeight: 600, color: "var(--fg)" }}>
              {rendered}
            </div>
          );
        }

        return <div key={li}>{rendered}</div>;
      })}
    </>
  );
}

function ChatBubble({ role, text, userInitials, isChallenge }: { role: "reed" | "user"; text: string; userInitials?: string; isChallenge?: boolean }) {
  const isReed = role === "reed";
  return (
    <div style={{
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      padding: "6px 0",
      justifyContent: isReed ? "flex-start" : "flex-end",
    }}>
      {isReed ? (
        <>
          <ReedAvatar />
          <div className="liquid-glass-card reed-bubble-wrap">
            {isChallenge && (
              <div style={{
                display: "inline-block",
                fontSize: 11, fontWeight: 500,
                color: "#fff", background: "var(--blue, #4A90D9)",
                borderRadius: 99, padding: "2px 10px",
                marginBottom: 6, fontFamily: FONT,
              }}>
                Reed is pushing back
              </div>
            )}
            <ReedTextRenderer text={text} />
          </div>
        </>
      ) : (
        <>
          <div className="liquid-glass-card user-bubble-wrap">
            <p>{text}</p>
          </div>
          <div className="user-chat-avatar-glass">
            <span className="user-chat-avatar-initials">{userInitials || "U"}</span>
          </div>
        </>
      )}
    </div>
  );
}

function ChatPendingFileThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
      background: "rgba(74,144,217,0.1)", border: "1px solid rgba(74,144,217,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg style={{ width: 14, height: 14, stroke: "var(--blue, #4A90D9)", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  );
}

function ChatPendingAttachments({
  files, onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;
  return (
    <div
      className="chat-pending-attachments"
      style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        padding: "4px 2px 8px", width: "100%",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {files.map((file, i) => (
        <div
          key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 6px 4px 4px",
            borderRadius: 10,
            background: "rgba(74,144,217,0.06)",
            border: "1px solid rgba(74,144,217,0.15)",
            maxWidth: "100%",
          }}
        >
          <ChatPendingFileThumb file={file} />
          <span style={{
            fontSize: 11, color: "var(--fg-2)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1, minWidth: 0,
          }} title={file.name}>{file.name}</span>
          <button
            type="button"
            title="Remove attachment"
            onClick={() => onRemove(i)}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: "none", background: "rgba(0,0,0,0.06)", color: "var(--fg-3)",
              cursor: "pointer", fontSize: 14, lineHeight: 1, fontFamily: FONT,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// Clean, centered input bar for the chat interface
function ChatInputBar({
  placeholder, value, onChange, onSend, disabled, autoFocus,
  pendingFiles, onAddPendingFiles, onRemovePendingFile,
}: {
  placeholder: string; value: string; onChange: (v: string) => void;
  onSend: () => void; disabled?: boolean; autoFocus?: boolean;
  pendingFiles: File[];
  onAddPendingFiles: (files: FileList) => void;
  onRemovePendingFile: (index: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const { toast } = useToast();

  const appendTranscript = useCallback((t: string) => {
    const cleaned = t.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      toast("No speech detected. Try again or check the microphone.", "info");
      return;
    }
    const v = valueRef.current;
    const spacer = v.length > 0 && !/\s$/.test(v) ? " " : "";
    onChange(v + spacer + cleaned);
  }, [onChange, toast]);

  const { recording, transcribing, micHandlers } = useHoldToTranscribe(appendTranscript);

  const adjustComposerHeight = useCallback(() => {
    const t = textareaRef.current;
    if (!t) return;
    const maxPx = Math.min(Math.round(window.innerHeight * 0.72), 800);
    t.style.maxHeight = `${maxPx}px`;
    t.style.height = "auto";
    const scroll = t.scrollHeight;
    const next = Math.min(scroll, maxPx);
    t.style.height = `${Math.max(44, next)}px`;
    t.style.overflowY = scroll > maxPx ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    adjustComposerHeight();
  }, [value, adjustComposerHeight]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddPendingFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSend = Boolean(value.trim() || pendingFiles.length > 0);

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      width: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" as const,
    }}>
      {/* CO_033: Fixed-height container prevents UI jump on state change */}
      <div
        role="status"
        aria-live="polite"
        style={{
          height: 18, flexShrink: 0,
          fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const,
          color: transcribing ? "var(--fg-3)" : "#C24141",
          padding: "4px 2px 0",
          visibility: (recording || transcribing) ? "visible" : "hidden",
          opacity: (recording || transcribing) ? 1 : 0,
          transition: "opacity 150ms",
        }}
      >
        {transcribing ? "Transcribing" : recording ? "Recording" : "\u00A0"}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.gif,.webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div
        className="liquid-glass liquid-glass-chat-composer work-intake-composer"
        style={{
          display: "flex", flexDirection: "column",
          borderRadius: 16,
          padding: pendingFiles.length > 0 ? "8px min(12px, 3vw) 10px min(14px, 3.5vw)" : "8px min(12px, 3vw) 8px min(16px, 4vw)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        onFocus={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 20px rgba(255,255,255,0.06)";
        }}
        onBlur={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "";
          (e.currentTarget as HTMLElement).style.boxShadow = "";
        }}
      >
        <ChatPendingAttachments files={pendingFiles} onRemove={onRemovePendingFile} />
        <div className="work-chat-input-row">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={1}
            className="reed-input"
            style={{
              flex: "1 1 0%",
              resize: "none",
              background: "transparent", border: "none", outline: "none",
              color: "var(--fg)", fontFamily: FONT,
              maxHeight: "min(72vh, 800px)",
              overflowY: "hidden",
              minHeight: 40,
              padding: "6px 4px 6px 0",
            }}
            onInput={adjustComposerHeight}
          />
          <IaBtn title="Attach file" onClick={handleFileClick}><AttachIcon /></IaBtn>
          <IaBtn
            title="Hold to speak, release to insert text"
            active={recording || transcribing}
            onClick={e => e.preventDefault()}
            {...micHandlers}
          >
            <MicIcon />
          </IaBtn>
          <button
            type="button"
            onClick={onSend}
            disabled={disabled || !canSend}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: canSend && !disabled ? "rgba(13,27,42,0.85)" : "rgba(0,0,0,0.08)",
              border: canSend && !disabled ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
              cursor: canSend && !disabled ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, border-color 0.15s",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <svg style={{
              width: 13, height: 13,
              stroke: canSend && !disabled ? "#fff" : "var(--fg-3)",
              strokeWidth: 2.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round",
            }} viewBox="0 0 24 24"
            >
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE: OUTLINE
// ─────────────────────────────────────────────────────────────────────────────

/** Legacy single-line + mic strip when Outline is not using the shared docked ChatInputBar. */
function OutlineStageComposer() {
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const { toast } = useToast();

  const appendOutlineTranscript = useCallback((t: string) => {
    const cleaned = t.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      toast("No speech detected. Try again or check the microphone.", "info");
      return;
    }
    const v = inputRef.current;
    const spacer = v.length > 0 && !/\s$/.test(v) ? " " : "";
    setInput(v + spacer + cleaned);
  }, [toast]);

  const {
    recording: outlineRecording,
    transcribing: outlineTranscribing,
    micHandlers: outlineMicHandlers,
  } = useHoldToTranscribe(appendOutlineTranscript);

  return (
    <div style={{
      borderTop: "1px solid var(--glass-border)",
      flexShrink: 0, background: "var(--glass-topbar)",
      backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)",
      width: "100%", minWidth: 0, boxSizing: "border-box" as const,
    }}>
      <div
        className="work-stage-content-column"
        style={{
          padding: "8px clamp(10px, 3vw, 14px) max(10px, env(safe-area-inset-bottom))",
          display: "flex", flexDirection: "column", gap: 4,
        }}
      >
        {(outlineRecording || outlineTranscribing) && (
          <div
            role="status"
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const,
              color: outlineTranscribing ? "var(--fg-3)" : "#C24141",
              paddingLeft: 2,
            }}
          >
            {outlineTranscribing ? "Transcribing" : "Recording"}
          </div>
        )}
        <div className="work-chat-input-row">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Reed to restructure, or click a section label to compare angles..."
            style={{
              flex: "1 1 0%", minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box" as const,
              background: "var(--glass-input)", border: "1px solid var(--glass-border)", borderRadius: 10,
              padding: "0 12px", fontSize: 12, color: "var(--fg)", fontFamily: FONT, outline: "none", height: 36,
              backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(245,198,66,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--glass-border)"; }}
          />
          <IaBtn
            title="Hold to speak, release to insert text"
            active={outlineRecording || outlineTranscribing}
            onClick={e => e.preventDefault()}
            {...outlineMicHandlers}
          >
            <MicIcon />
          </IaBtn>
        </div>
      </div>
    </div>
  );
}

function StageOutline({
  outlineRows, onUpdateRow, onAdvance, building, angles, currentAngle, onSelectAngle,
  omitBottomComposer = false,
}: {
  outlineRows: OutlineRow[]; onUpdateRow: (i: number, v: string) => void;
  onAdvance: () => void; building: boolean;
  angles?: { a: OutlineRow[]; b: OutlineRow[]; aMeta?: { name: string; description: string }; bMeta?: { name: string; description: string } } | null;
  currentAngle?: "a" | "b";
  onSelectAngle?: (angle: "a" | "b") => void;
  omitBottomComposer?: boolean;
}) {
  const activeAngle = currentAngle || "a";

  const lensA = {
    title: angles?.aMeta?.name || (angles?.a.find(r => r.label === "Title")?.content) || outlineRows.find(r => r.label === "Title")?.content || "Angle A",
    desc: angles?.aMeta?.description || "Thesis-led structure. Strong opening statement, analytical flow.",
  };
  const lensB = {
    title: angles?.bMeta?.name || (angles?.b.find(r => r.label === "Title")?.content) || "Alternative angle",
    desc: angles?.bMeta?.description || "Hook-led structure. Emotional opening, narrative build, reflective close.",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
      alignItems: "center",
    }}>
      <div
        className="work-stage-content-column"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 20,
        }}
        >
          {building ? (
            <LoadingDots label="Building outline from your conversation..." />
          ) : (
            <>
              {/* CO_021 Fix 3: Orientation line with Reed avatar */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                margin: "0 0 10px",
                maxWidth: 560,
              }}>
                <ReedProfileIcon size={18} title="Reed" />
                <p style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: "var(--fg-3)",
                  margin: 0,
                  lineHeight: 1.45,
                }}>
                  Here's your outline. I've selected the stronger angle. Review the structure, make any changes, then hit Write Draft.
                </p>
              </div>

              {/* CO_021 Fix 1A: Auto-selection narration */}
              {angles && (
                <p style={{
                  fontSize: 11,
                  color: "var(--fg-3)",
                  margin: "0 0 12px",
                  lineHeight: 1.45,
                  maxWidth: 560,
                  fontFamily: FONT,
                }}>
                  {activeAngle === "a"
                    ? `I went with ${lensA.title}. ${lensA.desc}`
                    : `Switched to ${lensB.title}. ${lensB.desc}`}
                </p>
              )}

              {/* Lens cards: two angles side by side */}
              <div className="lens-row">
              <div
                className={`lens-card${activeAngle === "a" ? " selected" : ""}`}
                onClick={() => onSelectAngle?.("a")}
              >
                <div className="lens-title-row">
                  <div className="lens-title">{lensA.title}</div>
                </div>
                <div className="lens-desc">{lensA.desc}</div>
                {activeAngle === "a" && <div className="lens-selected-badge">SELECTED &#10003;</div>}
              </div>
              <div
                className={`lens-card${activeAngle === "b" ? " selected" : ""}`}
                onClick={() => onSelectAngle?.("b")}
              >
                <div className="lens-title-row">
                  <div className="lens-title">{lensB.title}</div>
                </div>
                <div className="lens-desc">{lensB.desc}</div>
                {activeAngle === "b" && <div className="lens-selected-badge">SELECTED &#10003;</div>}
              </div>
            </div>

            <div style={{ background: "var(--glass-card)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: 14, minHeight: 200, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
              {outlineRows.map((row, i) => (
                <OutlineRowComponent
                  key={`${activeAngle}-row-${i}`}
                  rowIndex={i}
                  label={row.label}
                  content={row.content}
                  indent={row.indent}
                  onChange={v => onUpdateRow(i, v)}
                  angles={angles}
                />
              ))}
            </div>
            </>
          )}
        </div>

        {!building && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px clamp(12px, 4vw, 24px) 8px", flexShrink: 0 }}>
            <button
              type="button"
              className="liquid-glass-btn-gold"
              onClick={onAdvance}
              style={{ fontSize: 12, padding: "8px 22px", fontFamily: FONT }}
            >
              <span className="liquid-glass-btn-gold-label">Write Draft →</span>
            </button>
          </div>
        )}
      </div>

      {!omitBottomComposer ? <OutlineStageComposer /> : null}
    </div>
  );
}

/** Outline row: labeled sections open an angle comparison popover; body is always editable. */
function OutlineRowComponent({
  rowIndex, label, content, indent, onChange, angles,
}: {
  rowIndex: number;
  label: string;
  content: string;
  indent?: boolean;
  onChange: (v: string) => void;
  angles?: { a: OutlineRow[]; b: OutlineRow[]; aMeta?: { name: string; description: string }; bMeta?: { name: string; description: string } } | null;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const hasLabel = Boolean(label?.trim());

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const cur = el.textContent ?? "";
    if (cur !== content) el.textContent = content;
  }, [content]);

  useEffect(() => {
    if (!popOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      setPopOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popOpen]);

  useEffect(() => {
    if (!popOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popOpen]);

  const focusEditorEnd = useCallback(() => {
    setPopOpen(false);
    const el = contentRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  const applyLine = useCallback((text: string) => {
    onChange(text);
    setPopOpen(false);
    queueMicrotask(() => {
      const el = contentRef.current;
      if (!el) return;
      el.textContent = text;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, [onChange]);

  const onLabelClick = () => {
    if (!hasLabel) return;
    if (!angles || rowIndex >= angles.a.length || rowIndex >= angles.b.length) {
      contentRef.current?.focus();
      return;
    }
    setPopOpen(o => !o);
  };

  const aLine = angles?.a[rowIndex];
  const bLine = angles?.b[rowIndex];
  const aText = aLine?.content ?? "";
  const bText = bLine?.content ?? "";
  const nameA = angles?.aMeta?.name?.trim() || "Angle A";
  const nameB = angles?.bMeta?.name?.trim() || "Angle B";
  const canCompare = Boolean(angles && hasLabel && rowIndex < angles.a.length && rowIndex < angles.b.length);
  const linesDiffer = aText.trim() !== bText.trim();

  return (
    <div className="os-row">
      <div ref={anchorRef} className="os-label-anchor">
        {hasLabel ? (
          <div className="os-label-with-hint">
            <button
              type="button"
              className="os-label-btn"
              onClick={onLabelClick}
              title={canCompare ? "Compare both angles for this line" : "Focus the line on the right to edit"}
            >
              {label}
            </button>
            <span className="os-label-edit-icon" aria-hidden>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </span>
          </div>
        ) : null}
        {popOpen && canCompare ? (
          <div className="os-outline-pop" role="dialog" aria-label={`${label} angle options`}>
            <div className="os-outline-pop-h">{label}</div>
            {linesDiffer ? (
              <>
                <button type="button" className="os-outline-opt" onClick={() => applyLine(aText)}>
                  <span className="os-outline-opt-k">{nameA}</span>
                  {aText}
                </button>
                <button type="button" className="os-outline-opt" onClick={() => applyLine(bText)}>
                  <span className="os-outline-opt-k">{nameB}</span>
                  {bText}
                </button>
              </>
            ) : (
              <p className="os-outline-same">Both angles use the same wording for this line.</p>
            )}
            <button type="button" className="os-outline-done" onClick={focusEditorEnd}>
              Continue on the right
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={contentRef}
        className={`os-content${indent ? " os-indent" : ""}`}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={e => onChange((e.target as HTMLDivElement).textContent || "")}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE: EDIT
// ─────────────────────────────────────────────────────────────────────────────

const DIRECTIVE_CONFIRMATIONS = [
  "On it.",
  "Got it. One moment.",
  "Working on that now.",
  "On it. One sec.",
  "Got it.",
];

function StageEdit({
  draft, generating, generatingLabel, applyingSuggestion, proposalLoading, onDraftChange, onAdvance, onRevise,
  onConverse, converseLoading, converseReply,
  hasDraftFlags, onAdvanceForced,
  versions, activeVersionIdx, onVersionSelect, onGenerateVersion, canGenerateMore,
}: {
  draft: string; generating: boolean; generatingLabel: string;
  applyingSuggestion?: boolean;
  proposalLoading?: boolean;
  onDraftChange: (v: string) => void; onAdvance: () => void;
  onRevise: (instructions: string, opts?: { fromChip?: boolean }) => void;
  onConverse: (text: string) => void;
  converseLoading?: boolean;
  converseReply: string | null;
  hasDraftFlags?: boolean;
  onAdvanceForced?: () => void;
  versions: Array<{ content: string; label: string }>;
  activeVersionIdx: number;
  onVersionSelect: (idx: number) => void;
  onGenerateVersion: () => void;
  canGenerateMore: boolean;
}) {
  const [input, setInput] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  // CO_029 Failure 6: Draft flags warning before advancing to Review
  const [showFlagsWarning, setShowFlagsWarning] = useState(false);
  // CO_024: Reed response bubble state
  const [reedResponse, setReedResponse] = useState<string | null>(null);

  // Sync conversation replies from parent into local response bubble
  useEffect(() => {
    if (converseReply) setReedResponse(converseReply);
  }, [converseReply]);

  useLayoutEffect(() => {
    const t = titleRef.current;
    if (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }
  }, [draft]);

  // CO_024: Classify input intent before routing
  const handleSubmit = () => {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");

    const intent = classifyDraftInputIntent(text);
    if (intent === "directive") {
      const confirmation = DIRECTIVE_CONFIRMATIONS[Math.floor(Math.random() * DIRECTIVE_CONFIRMATIONS.length)];
      setReedResponse(confirmation);
      onRevise(text);
    } else {
      // question or ambiguous → conversation
      onConverse(text);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", alignItems: "center" }}>
      <div
        className="work-stage-content-column"
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}
      >
        <div
          className="edit-area"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: "20px clamp(16px, 3vw, 28px) 8px",
          }}
        >
          {/* Version tabs */}
          {versions.length > 0 && !generating && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            flexShrink: 0,
            marginBottom: 14, paddingBottom: 12,
            borderBottom: "1px solid var(--glass-border)",
          }}>
            {versions.map((v, i) => (
              <button
                key={i}
                onClick={() => onVersionSelect(i)}
                style={{
                  padding: "4px 12px", borderRadius: 6,
                  fontSize: 11, fontWeight: activeVersionIdx === i ? 600 : 400,
                  color: activeVersionIdx === i ? "var(--fg)" : "var(--fg-3)",
                  background: activeVersionIdx === i ? "var(--surface)" : "transparent",
                  border: activeVersionIdx === i ? "1px solid var(--glass-border)" : "1px solid transparent",
                  cursor: "pointer", fontFamily: FONT,
                  transition: "all 0.15s ease",
                }}
              >
                {v.label}
              </button>
            ))}
            {canGenerateMore && (
              <button
                onClick={onGenerateVersion}
                disabled={generating}
                style={{
                  padding: "4px 12px", borderRadius: 6,
                  fontSize: 11, fontWeight: 500,
                  color: "var(--fg-3)",
                  background: "transparent",
                  border: "1px dashed var(--glass-border)",
                  cursor: generating ? "not-allowed" : "pointer",
                  fontFamily: FONT,
                  opacity: generating ? 0.5 : 1,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { if (!generating) { e.currentTarget.style.borderColor = "var(--gold-bright)"; e.currentTarget.style.color = "var(--fg)"; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.color = "var(--fg-3)"; }}
              >
                + New version
              </button>
            )}
          </div>
        )}
        {generating ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <GenerationProgress />
          </div>
        ) : (
          <div
            className="draft-body"
            style={{
              position: "relative",
              flex: 1,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {(applyingSuggestion || proposalLoading) && (
              <div style={{
                flexShrink: 0,
                padding: "8px 12px",
                background: "rgba(245,198,66,0.08)",
                borderBottom: "1px solid rgba(245,198,66,0.2)",
                fontSize: 11,
                color: "var(--gold-bright)",
                fontWeight: 500,
              }}
              >
                {proposalLoading ? "Reed is preparing a proposed change..." : "Applying suggestion..."}
              </div>
            )}
            {(() => {
              const lines = draft.split("\n");
              const rawTitle = lines[0] || "";
              const title = rawTitle.replace(/^\*+|\*+$/g, "").replace(/^#+\s*/, "").trim();
              const body = lines.slice(1).join("\n");
              return (
                <>
                  <textarea
                    ref={titleRef}
                    rows={1}
                    value={title}
                    onChange={(e) => onDraftChange(e.target.value + "\n" + body)}
                    onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
                    style={{
                      width: "100%",
                      flexShrink: 0,
                      fontFamily: "var(--font)",
                      fontSize: "clamp(22px, 3vw, 32px)",
                      fontWeight: 700,
                      color: "var(--fg)",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      padding: 0,
                      marginBottom: 14,
                      lineHeight: 1.2,
                      resize: "none",
                      overflow: "hidden",
                      minHeight: "1.2em",
                    }}
                  />
                  <textarea
                    className="work-edit-draft-textarea"
                    value={body}
                    onChange={(e) => onDraftChange(title + "\n" + e.target.value)}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      width: "100%",
                      boxSizing: "border-box",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      resize: "none",
                      fontFamily: "var(--font)",
                      fontSize: 15,
                      lineHeight: 1.7,
                      color: "var(--fg)",
                      padding: 0,
                      overflowY: "auto",
                    }}
                    spellCheck
                  />
                </>
              );
            })()}
          </div>
        )}
        </div>

        {/* CO_029 Failure 6: Warn before advancing when draft has flags */}
        {!generating && draft && !showFlagsWarning && (
          <AdvanceButton
            label="Finish and Review &#8594;"
            onClick={() => {
              if (hasDraftFlags) {
                setShowFlagsWarning(true);
              } else {
                onAdvance();
              }
            }}
          />
        )}
        {showFlagsWarning && (
          <div style={{
            width: "100%", boxSizing: "border-box" as const,
            padding: "10px clamp(12px, 3vw, 20px) 10px",
            flexShrink: 0,
          }}>
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              border: "1px solid rgba(245,198,66,0.3)",
              background: "rgba(245,198,66,0.06)",
              marginBottom: 8,
            }}>
              <div style={{ fontSize: 11, color: "var(--fg)", fontWeight: 600, marginBottom: 4 }}>
                Draft has flagged items
              </div>
              <div style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.5 }}>
                Reed found issues during review. You can address them now or continue to Review.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                type="button"
                className="liquid-glass-btn-gold"
                onClick={() => setShowFlagsWarning(false)}
                style={{ padding: "8px 16px", fontSize: 11, fontFamily: FONT }}
              >
                <span className="liquid-glass-btn-gold-label">Address flags</span>
              </button>
              <button
                type="button"
                className="liquid-glass-btn"
                onClick={() => { setShowFlagsWarning(false); (onAdvanceForced || onAdvance)(); }}
                style={{ padding: "8px 16px", fontSize: 11, fontFamily: FONT }}
              >
                <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Review as-is</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CO_024: Reed response bubble */}
      {(reedResponse || converseLoading) && (
        <div style={{
          flexShrink: 0,
          padding: "8px clamp(10px, 3vw, 14px)",
          borderTop: "1px solid var(--glass-border)",
        }}>
          <div className="work-stage-content-column" style={{ position: "relative" }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              background: "rgba(74,144,217,0.06)",
              border: "1px solid rgba(74,144,217,0.2)",
              borderRadius: 8,
              padding: "8px 28px 8px 10px",
            }}>
              <div style={{
                fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6, fontFamily: FONT,
                fontStyle: converseLoading ? "italic" : "normal",
              }}>
                {converseLoading ? "Reed is thinking..." : reedResponse}
              </div>
            </div>
            {!converseLoading && (
              <button
                type="button"
                onClick={() => setReedResponse(null)}
                aria-label="Dismiss"
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 20, height: 20, borderRadius: 4,
                  border: "none", background: "transparent",
                  color: "var(--fg-3)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontFamily: FONT, padding: 0,
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{
        borderTop: "1px solid var(--glass-border)",
        flexShrink: 0,
        background: "var(--bg)",
        backdropFilter: "blur(14px) saturate(1.2)",
        WebkitBackdropFilter: "blur(14px) saturate(1.2)",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box" as const,
        zIndex: 12,
      }}>
        <div className="work-stage-content-column" style={{ padding: "10px clamp(10px, 3vw, 14px)", display: "flex", alignItems: "center", gap: 6 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Ask Reed anything, or give an edit instruction..."
            readOnly={generating}
            style={{ flex: 1, background: "var(--glass-input)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "0 12px", fontSize: 12, color: "var(--fg)", fontFamily: FONT, outline: "none", height: 36, opacity: generating ? 0.5 : 1, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}
            onFocus={e => { e.target.style.borderColor = "rgba(245,198,66,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--glass-border)"; }}
          />
          <IaBtn title="Hold to speak"><MicIcon /></IaBtn>
          <button
            type="button"
            className="liquid-glass-btn liquid-glass-btn--square"
            onClick={handleSubmit}
            disabled={generating}
            aria-label="Send to Reed"
            title="Send to Reed"
            style={{
              cursor: generating ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: generating ? 0.45 : 1,
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review progress (format adaptation + quality pipeline) ───────────────────
// ── Generation progress (Edit stage) ─────────────────────────────────────────
function GenerationProgress() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - startRef.current), 400);
    return () => clearInterval(interval);
  }, []);

  const PHASES = [
    { at: 0, label: "Loading Voice DNA", sub: "Matching your communication patterns" },
    { at: 3000, label: "Building structure", sub: "Organizing ideas from your conversation" },
    { at: 8000, label: "Writing first draft", sub: "Generating content in your voice" },
    { at: 15000, label: "Refining language", sub: "Checking tone and word choice" },
    { at: 22000, label: "Final polish", sub: "Cleaning up formatting" },
  ];

  const currentPhase = [...PHASES].reverse().find(p => elapsed >= p.at) || PHASES[0];
  const phaseIdx = PHASES.indexOf(currentPhase);
  const progress = Math.min(elapsed / 30000, 0.95);
  const eased = 1 - Math.pow(1 - progress, 2.5);

  return (
    <div style={{ padding: "40px clamp(16px, 3vw, 28px)", width: "100%", boxSizing: "border-box" as const }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>{currentPhase.label}</div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 20 }}>{currentPhase.sub}</div>
      <div style={{ width: "100%", height: 3, borderRadius: 2, background: "var(--glass-border)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: "100%", borderRadius: 2, background: "var(--gold-bright)", width: `${Math.round(eased * 100)}%`, transition: "width 0.4s ease-out" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PHASES.map((phase, i) => {
          const isDone = i < phaseIdx;
          const isActive = i === phaseIdx;
          return (
            <div key={phase.label} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0.35 : isActive ? 1 : 0.2, transition: "all 0.4s ease" }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: isDone ? "none" : isActive ? "2px solid var(--gold-bright)" : "1px solid var(--glass-border)",
                background: isDone ? "var(--gold-bright)" : "transparent",
                transition: "all 0.3s ease",
              }}>
                {isDone && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {isActive && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold-bright)", animation: "pulse-dot 1s ease-in-out infinite" }} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? "var(--fg)" : "var(--fg-3)" }}>{phase.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Review progress (format adaptation + quality pipeline) ───────────────────
function ReviewProgress({
  formatDrafts, selectedFormats, awaitingChannelPreviews,
}: {
  formatDrafts: Record<string, { content: string; metadata: Record<string, string>; status: string }>;
  selectedFormats: string[];
  /** When false, we are not waiting on parallel adapt-format jobs. */
  awaitingChannelPreviews: boolean;
}) {
  const formatStatuses = selectedFormats.map(f => ({
    name: f,
    status: formatDrafts[f]?.status || "pending",
  }));
  const allFormatsComplete =
    !awaitingChannelPreviews
    || (formatStatuses.length > 0 && formatStatuses.every(f => f.status === "done" || f.status === "error"));

  return (
    <div
      className="liquid-glass-card"
      style={{
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        boxSizing: "border-box" as const,
        padding: "clamp(28px, 5vw, 40px) clamp(22px, 4vw, 36px)",
        textAlign: "center" as const,
        borderRadius: 16,
      }}
    >
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--fg-3)",
        textTransform: "uppercase" as const, marginBottom: 22, fontFamily: FONT,
      }}>
        Review in progress
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", margin: "0 auto",
        border: "3px solid var(--glass-border)",
        borderTopColor: "var(--gold-bright)",
        animation: "work-review-spin 0.9s linear infinite",
        flexShrink: 0,
      }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)", marginTop: 24, lineHeight: 1.3, fontFamily: FONT }}>
        Reed is reviewing your draft
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 10, lineHeight: 1.5, fontFamily: FONT }}>
        Checking voice, clarity, and originality
      </div>
      <div style={{
        marginTop: 26,
        paddingTop: 22,
        borderTop: "1px solid var(--glass-border)",
        fontSize: 11,
        color: "var(--fg-3)",
        lineHeight: 1.55,
        fontFamily: FONT,
      }}>
        {!awaitingChannelPreviews
          ? "When quality checks finish, you can review results and choose where this goes next."
          : allFormatsComplete
            ? "Channel previews are ready. When quality checks finish, you can move on to export."
            : "Channel previews for Wrap are building in parallel. You will choose Catalog formats after this step."}
      </div>
      <style>{`@keyframes work-review-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Format-aware review preview ──────────────────────────────────────────────
function ReviewFormatPreview({
  format, draft, hvtFlaggedLines, onApplySuggestion, onDirectReplace, highlightedParas,
}: {
  format: string;
  draft: string;
  hvtFlaggedLines: Array<{ lineIndex: number; original: string; issue: string; vector: string; suggestion: string }>;
  onApplySuggestion?: (instruction: string) => void;
  onDirectReplace?: (original: string, replacement: string) => void;
  highlightedParas?: number[];
}) {
  const paragraphs = draft.split("\n").filter(Boolean);
  const title = cleanTitle(paragraphs[0] || "Draft");
  const body = paragraphs.slice(1);
  const [hoveredFlag, setHoveredFlag] = useState<number | null>(null);

  const renderPara = (p: string, i: number) => {
    const flagged = hvtFlaggedLines.find(f => p.includes(f.original) || f.original.includes(p.slice(0, 40)));
    const isHighlighted = highlightedParas?.includes(i + 1);

    // If no flag, render normally
    if (!flagged) {
      return (
        <div key={i} style={{ marginTop: i > 0 ? 12 : 0 }}>
          <p className={isHighlighted ? "para-highlight" : undefined}>
            {renderInlineMarkdown(p)}
          </p>
        </div>
      );
    }

    // Render flagged paragraphs as normal text (no visual flags)
    return (
      <div key={i} style={{ marginTop: i > 0 ? 12 : 0 }}>
        <p className={isHighlighted ? "para-highlight" : undefined}>
          {renderInlineMarkdown(p)}
        </p>
      </div>
    );
  };

  if (format === "Podcast" || format === "Podcast Script") {
    const podcast = parsePodcastSections(draft);
    return (
      <div className="draft-body">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 16 }}>Podcast Script Preview</div>
        {podcast.open && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--fg-3)", width: 48, flexShrink: 0, paddingTop: 3 }}>OPEN</span>
            <div style={{ flex: 1 }}><p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.7 }}>{renderInlineMarkdown(podcast.open)}</p></div>
          </div>
        )}
        {podcast.hook && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--gold-bright)", width: 48, flexShrink: 0, paddingTop: 3 }}>HOOK</span>
            <div style={{ flex: 1 }}><p style={{ fontSize: 14, color: "var(--fg)", fontWeight: 600, lineHeight: 1.7 }}>{renderInlineMarkdown(podcast.hook)}</p></div>
          </div>
        )}
        {podcast.body.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--fg-3)", width: 48, flexShrink: 0, paddingTop: 3 }}>BODY</span>
            <div style={{ flex: 1 }}>{renderPara(p, i)}</div>
          </div>
        ))}
        {podcast.close && (
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, color: "var(--fg-3)", width: 48, flexShrink: 0, paddingTop: 3 }}>CLOSE</span>
            <div style={{ flex: 1 }}><p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.7 }}>{renderInlineMarkdown(podcast.close)}</p></div>
          </div>
        )}
      </div>
    );
  }

  if (format === "Sunday Story") {
    return (
      <div className="draft-body">
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 20 }}>
          Sunday, {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
        <div className="draft-title-text" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>{title}</div>
        {body.map((p, i) => renderPara(p, i))}
      </div>
    );
  }

  if (format === "Newsletter" || format === "Newsletter Issue") {
    return (
      <div className="draft-body">
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 16 }}>Newsletter Preview</div>
        <div className="draft-title-text" style={{ fontSize: 18, marginBottom: 12 }}>{title}</div>
        <div style={{ width: 28, height: 3, background: "var(--gold-bright)", marginBottom: 16, borderRadius: 2 }} />
        {body.map((p, i) => renderPara(p, i))}
      </div>
    );
  }

  // Default: LinkedIn / generic
  return (
    <div className="draft-body">
      <div className="draft-title-text">{title}</div>
      {body.map((p, i) => renderPara(p, i))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE: REVIEW
// ─────────────────────────────────────────────────────────────────────────────

function PreWrapCornerCheck() {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "rgba(245,198,66,0.95)",
        border: "2px solid var(--gold-bright, #F5C642)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <svg width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ display: "block" }}>
        <path
          d="M1 4.5L4 7.5L10 1"
          stroke="var(--bg)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PreWrapOutputGate({
  pipelineRun,
  recommendedId,
  selectedIds,
  allowSecondFormat,
  onEnableSecondFormat,
  onDisableSecondFormat,
  onPickFormat,
  onStartWrap,
  presentationMinutes,
  onPresentationMinutesChange,
  talkDuration,
  onTalkDurationChange,
  userTemplates,
}: {
  pipelineRun: PipelineRun | null;
  recommendedId: string;
  selectedIds: string[];
  allowSecondFormat: boolean;
  onEnableSecondFormat: () => void;
  onDisableSecondFormat: () => void;
  onPickFormat: (id: string) => void;
  onStartWrap: () => void;
  presentationMinutes: number;
  onPresentationMinutesChange: (n: number) => void;
  talkDuration: number;
  onTalkDurationChange: (n: number) => void;
  userTemplates: Array<{ id: string; name: string; outputType: string }>;
}) {
  const isMobile = useMobile();

  // CO_029 Failure 4: First-use Wrap explanation
  const [showWrapExplainer] = useState(() => {
    try { return !localStorage.getItem("ew-wrap-explained"); } catch { return false; }
  });
  useEffect(() => {
    if (showWrapExplainer) {
      try { localStorage.setItem("ew-wrap-explained", "1"); } catch { /* noop */ }
    }
  }, [showWrapExplainer]);

  // CO_029 Failure 1: Conditional header based on flag state
  const hvtHasFlags = pipelineRun?.humanVoiceTest && pipelineRun.humanVoiceTest.flaggedLines.length > 0;
  const reviewStatusLine = !pipelineRun
    ? "When you are ready, continue below."
    : (pipelineRun.status === "PASSED" && !hvtHasFlags)
      ? "No flags. You're clear to continue."
      : pipelineRun.status === "PASSED"
        ? "Checks passed."
        : "Quality review finished. Address any items Reed flagged before you continue.";
  const hvtLine = !pipelineRun
    ? ""
    : pipelineRun.humanVoiceTest?.verdict === "PASSES"
      ? "Human Voice Test passed."
      : "Human Voice Test: review flagged lines if needed.";

  const recLabel = OUTPUT_TYPES.find(t => t.id === recommendedId)?.label || recommendedId;
  const wrapReady =
    (!allowSecondFormat && selectedIds.length === 1)
    || (allowSecondFormat && selectedIds.length === 2);
  // CO_029 Failure 5: Resolve label for both system formats and template picks
  const resolvePickLabel = (id: string): string => {
    if (id.startsWith("tmpl:")) {
      const tmpl = userTemplates.find(t => t.id === id.slice(5));
      return tmpl?.name || id;
    }
    return OUTPUT_TYPES.find(t => t.id === id)?.label || id;
  };
  const startLabel = (() => {
    if (allowSecondFormat && selectedIds.length === 1) return "Pick second format";
    if (!wrapReady) return "Start Wrap";
    if (selectedIds.length === 1) return `Start Wrap with ${resolvePickLabel(selectedIds[0])}`;
    return `Start Wrap with ${resolvePickLabel(selectedIds[0])} and ${resolvePickLabel(selectedIds[1])}`;
  })();

  const categories: { key: PreWrapPickCategory; title: string; items: { id: string; label: string }[] }[] = [
    { key: "Content", title: "Content", items: PRE_WRAP_PICK_GROUPS.Content },
    { key: "Business", title: "Business", items: PRE_WRAP_PICK_GROUPS.Business },
    { key: "Social", title: "Social", items: PRE_WRAP_PICK_GROUPS.Social },
  ];

  const baseCard: CSSProperties = {
    textAlign: "left" as const,
    padding: "12px 14px",
    borderRadius: 10,
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--fg)",
    cursor: "pointer",
    position: "relative" as const,
    border: "1px solid var(--glass-border)",
    background: "var(--glass-card)",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
    minHeight: 52,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    gap: 4,
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto",
      background: "linear-gradient(180deg, var(--surface) 0%, rgba(248,250,252,0.98) 100%)",
      WebkitOverflowScrolling: "touch" as const,
    }}>
      <div
        className="work-stage-content-column"
        style={{
          padding: "28px clamp(16px, 4vw, 32px) 40px",
          boxSizing: "border-box" as const,
        }}
      >
        <h1 style={{
          fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "var(--fg)",
          margin: "0 0 8px", fontFamily: FONT, letterSpacing: "-0.02em",
        }}>
          Where is this going?
        </h1>
        <p style={{ fontSize: 12, color: "var(--fg-2)", margin: "0 0 10px", lineHeight: 1.5, fontFamily: FONT }}>
          {reviewStatusLine}
        </p>
        {hvtLine ? (
          <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "0 0 14px", lineHeight: 1.5, fontFamily: FONT }}>
            {hvtLine}
          </p>
        ) : null}
        {showWrapExplainer && (
          <p style={{ fontSize: 12, color: "var(--gold)", margin: "0 0 14px", lineHeight: 1.5, fontFamily: FONT, fontWeight: 500 }}>
            Wrap formats and delivers your piece for the channel you choose.
          </p>
        )}
        <p style={{ fontSize: 12, color: "var(--fg-3)", margin: "0 0 22px", lineHeight: 1.5, fontFamily: FONT }}>
          Select exactly one Catalog format to start Wrap, or turn on Add another format and pick two.
        </p>

        <button
          type="button"
          onClick={() => onPickFormat(recommendedId)}
          style={{
            width: "100%",
            marginBottom: 28,
            padding: "14px 16px",
            borderRadius: 12,
            border: "2px dashed rgba(245,198,66,0.55)",
            background: "rgba(245,198,66,0.06)",
            fontFamily: FONT,
            textAlign: "left" as const,
            cursor: "pointer",
            boxSizing: "border-box" as const,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#9A7030", marginBottom: 6, textTransform: "uppercase" as const }}>
            {isMobile ? "Reed recommends (tap to select)" : "Reed recommends"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>{recLabel}</div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, lineHeight: 1.45 }}>
            Suggestion only. Your pick in the grids below uses the gold selected style.
          </div>
        </button>

        {categories.map(({ key, title, items }) => (
          <div key={key} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--fg-3)",
              marginBottom: 10, textTransform: "uppercase" as const, fontFamily: FONT,
            }}>
              {title}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
            }}>
              {items.map(item => {
                const isRec = item.id === recommendedId;
                const isSel = selectedIds.includes(item.id);
                const suggestOnly = isRec && !isSel;
                // CO_029 Failure 4: Non-recommended, non-selected items are visually secondary
                const isSecondary = !isRec && !isSel;
                const selectedStyle: CSSProperties = isSel
                  ? {
                    border: "2px solid var(--gold-bright, #F5C642)",
                    background: "rgba(245,198,66,0.18)",
                    boxShadow: "0 4px 18px rgba(245,198,66,0.15)",
                  }
                  : suggestOnly
                    ? {
                      border: "2px dashed rgba(245,198,66,0.5)",
                      background: "rgba(245,198,66,0.07)",
                    }
                    : {};
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => onPickFormat(item.id)}
                    style={{ ...baseCard, ...selectedStyle, ...(isSecondary ? { opacity: 0.7 } : {}) }}
                  >
                    {isSel ? <PreWrapCornerCheck /> : null}
                    <span style={{ paddingRight: isSel ? 24 : 0 }}>{item.label}</span>
                    {suggestOnly ? (
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#9A7030", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                        Suggested
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* CO_029 Failure 5: User templates section */}
        {userTemplates.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--fg-3)",
              marginBottom: 10, textTransform: "uppercase" as const, fontFamily: FONT,
            }}>
              Your Templates
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
            }}>
              {userTemplates.map(tmpl => {
                const tmplPickId = `tmpl:${tmpl.id}`;
                const isSel = selectedIds.includes(tmplPickId);
                const isSecondary = !isSel;
                const selectedStyle: CSSProperties = isSel
                  ? {
                    border: "2px solid var(--gold-bright, #F5C642)",
                    background: "rgba(245,198,66,0.18)",
                    boxShadow: "0 4px 18px rgba(245,198,66,0.15)",
                  }
                  : {};
                return (
                  <button
                    key={tmplPickId}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => onPickFormat(tmplPickId)}
                    style={{ ...baseCard, ...selectedStyle, ...(isSecondary ? { opacity: 0.7 } : {}) }}
                  >
                    {isSel ? <PreWrapCornerCheck /> : null}
                    <span style={{ paddingRight: isSel ? 24 : 0 }}>{tmpl.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                      Template
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" as const }}>
          <button
            type="button"
            onClick={onEnableSecondFormat}
            disabled={allowSecondFormat}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: FONT,
              border: allowSecondFormat ? "1px solid var(--glass-border)" : "1px dashed var(--gold-bright, #F5C642)",
              background: allowSecondFormat ? "var(--glass-card)" : "rgba(245,198,66,0.08)",
              color: allowSecondFormat ? "var(--fg-3)" : "var(--fg)",
              cursor: allowSecondFormat ? "default" : "pointer",
            }}
          >
            {allowSecondFormat ? "Second format slot on" : "Add another format"}
          </button>
          {allowSecondFormat ? (
            <button
              type="button"
              onClick={onDisableSecondFormat}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: FONT,
                border: "1px solid var(--glass-border)",
                background: "transparent",
                color: "var(--fg-2)",
                cursor: "pointer",
              }}
            >
              Single format only
            </button>
          ) : null}
        </div>

        {selectedIds.includes("presentation") && (
          <div style={{
            marginBottom: 24,
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-card)",
            fontFamily: FONT,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              Presentation length
            </div>
            <label style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
              <span>Duration (minutes)</span>
              <input
                type="number"
                min={3}
                max={180}
                step={1}
                value={presentationMinutes}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) onPresentationMinutesChange(Math.min(180, Math.max(3, v)));
                }}
                style={{
                  width: 72,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  fontSize: 13,
                  fontFamily: FONT,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                Target ≈ {presentationMinutes * 300} words in Wrap
              </span>
            </label>
          </div>
        )}

        {selectedIds.includes("talk") && (
          <div style={{
            marginBottom: 24,
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-card)",
            fontFamily: FONT,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              Talk length
            </div>
            <label style={{ fontSize: 12, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
              <span>Duration (minutes)</span>
              <input
                type="number"
                min={3}
                max={180}
                step={1}
                value={talkDuration}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) onTalkDurationChange(Math.min(180, Math.max(3, v)));
                }}
                style={{
                  width: 72,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  fontSize: 13,
                  fontFamily: FONT,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                Target ≈ {talkDuration * 300} words in Wrap
              </span>
            </label>
          </div>
        )}

        <div style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: 8,
        }}>
          <button
            type="button"
            className="liquid-glass-btn-gold liquid-glass-btn-gold--lg"
            disabled={!wrapReady}
            aria-describedby={!wrapReady ? "prewrap-start-hint" : undefined}
            onClick={onStartWrap}
            style={{
              minWidth: 240,
              fontFamily: FONT,
              opacity: wrapReady ? 1 : 0.45,
              cursor: wrapReady ? "pointer" : "not-allowed",
              filter: wrapReady ? "none" : "grayscale(0.35)",
            }}
          >
            <span className="liquid-glass-btn-gold-label">{startLabel}</span>
          </button>
          {!wrapReady && (
            <p
              id="prewrap-start-hint"
              style={{
                margin: 0,
                fontSize: 11,
                color: "var(--fg-3)",
                fontFamily: FONT,
                textAlign: "center" as const,
                maxWidth: 360,
                lineHeight: 1.45,
              }}
            >
              {allowSecondFormat && selectedIds.length === 1
                ? "Pick a second Catalog format, or turn off the second slot above."
                : allowSecondFormat && selectedIds.length === 0
                  ? "Select two formats when the second slot is on, or turn it off to pick one."
                  : "Select exactly one Catalog format to continue."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StageReview({
  draft, pipelineRun, running, activeTab, tabs,
  onTabClick, onAdvance, onGoBack, onFix, onDirectReplace, formatDrafts,
  showChannelPicker,
}: {
  draft: string; pipelineRun: PipelineRun | null; running: boolean;
  activeTab: Format | null;
  tabs: Format[];
  onTabClick: (t: Format) => void;
  onAdvance: () => void; onGoBack: (instructions: string) => void;
  onFix: (instruction: string) => Promise<void>;
  onDirectReplace: (original: string, replacement: string) => void;
  formatDrafts: Record<string, { content: string; metadata: Record<string, string>; status: string }>;
  /** Only when the user picked multiple channels in session; hides default 4-way preview chrome. */
  showChannelPicker: boolean;
}) {
  /** Internal readiness from pipeline aggregate; not shown to the user. */
  const publishAggregateOk = (pipelineRun?.impactScore?.total ?? 0) >= 75;
  const hvtPasses = pipelineRun?.humanVoiceTest?.verdict === "PASSES";
  const canApprove = publishAggregateOk && hvtPasses;
  const hvtFlaggedLines = pipelineRun?.humanVoiceTest?.flaggedLines || [];
  const [input, setInput] = useState("");
  const [hvtFixing, setHvtFixing] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* HVT suggestion fixing indicator */}
      {hvtFixing && (
        <div style={{
          padding: "8px 20px", background: "rgba(245,198,66,0.08)",
          borderBottom: "1px solid rgba(245,198,66,0.2)",
          fontSize: 11, color: "var(--gold-bright)", fontWeight: 500, flexShrink: 0,
        }}>
          Applying suggestion...
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
        {/* Draft preview: when pipeline + adaptation are running, center the status card in the stage */}
        <div
          className="work-stage-content-column"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: running ? "clamp(20px, 5vh, 48px) clamp(16px, 3vw, 28px)" : "24px clamp(16px, 3vw, 28px)",
            width: "100%",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "stretch",
            ...(running ? { justifyContent: "center" as const } : {}),
          }}
        >
          {showChannelPicker && tabs.length > 1 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const,
              marginBottom: 16, paddingBottom: 12,
              borderBottom: "1px solid var(--glass-border)",
            }}>
              <label htmlFor="review-channel-preview" style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--fg-3)",
                textTransform: "uppercase" as const, flexShrink: 0, fontFamily: FONT,
              }}>
                Preview
              </label>
              <select
                id="review-channel-preview"
                value={activeTab ?? tabs[0] ?? ""}
                onChange={e => onTabClick(e.target.value as Format)}
                className="liquid-glass-input"
                style={{
                  flex: "1 1 160px",
                  maxWidth: 280,
                  minWidth: 0,
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "var(--fg)",
                  cursor: "pointer",
                }}
              >
                {tabs.map(tab => {
                  const fd = formatDrafts[tab];
                  const done = fd?.status === "done" || fd?.status === "error";
                  const label = done ? `${tab} (ready)` : tab;
                  return (
                    <option key={tab} value={tab}>{label}</option>
                  );
                })}
              </select>
              <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: FONT, flex: "1 1 100%", minWidth: 0 }}>
                Reed adapts your draft for each channel you selected. This is a preview, not a second workflow step.
              </span>
            </div>
          )}
          {running ? (
            <ReviewProgress
              formatDrafts={formatDrafts}
              selectedFormats={tabs}
              awaitingChannelPreviews={tabs.length > 0}
            />
          ) : (
            <>
              {(() => {
              if (!activeTab || tabs.length === 0) {
                return (
                  <ReviewFormatPreview
                    format="Sunday Story"
                    draft={draft}
                    hvtFlaggedLines={hvtFlaggedLines}
                    onApplySuggestion={async (suggestion) => {
                      setHvtFixing(true);
                      try { await onFix(suggestion); } finally { setHvtFixing(false); }
                    }}
                    onDirectReplace={onDirectReplace}
                  />
                );
              }
              const fd = formatDrafts[activeTab];
              const isAdapting = fd?.status === "generating" || fd?.status === "pending";
              const adaptedContent = fd?.status === "done" ? fd.content : draft;
              const metadata = fd?.metadata || {};

              if (isAdapting) {
                return (
                  <div style={{ padding: "20px 0" }}>
                    <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>Adapting for {activeTab}...</div>
                    <div style={{ width: "100%", height: 3, borderRadius: 2, background: "var(--glass-border)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: "var(--gold-bright)", width: "60%", animation: "pulse-width 2s ease-in-out infinite" }} />
                    </div>
                  </div>
                );
              }

              return (
                <>
                  {metadata.subject && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--glass-card)", borderRadius: 8, border: "1px solid var(--glass-border)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>Subject line</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{metadata.subject}</div>
                      {metadata.preview && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginTop: 8, marginBottom: 4 }}>Preview text</div>
                          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{metadata.preview}</div>
                        </>
                      )}
                    </div>
                  )}
                  {metadata.episodeTitle && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--glass-card)", borderRadius: 8, border: "1px solid var(--glass-border)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>Episode title</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{metadata.episodeTitle}</div>
                    </div>
                  )}
                  {metadata.subtitle && (
                    <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>{metadata.subtitle}</div>
                  )}
                  <ReviewFormatPreview
                    format={activeTab}
                    draft={adaptedContent}
                    hvtFlaggedLines={hvtFlaggedLines}
                    onApplySuggestion={async (suggestion) => {
                      setHvtFixing(true);
                      try { await onFix(suggestion); } finally { setHvtFixing(false); }
                    }}
                    onDirectReplace={onDirectReplace}
                  />
                  {fd?.status === "error" && (
                    <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 8 }}>Format adaptation unavailable. Showing original draft.</div>
                  )}
                </>
              );
              })()}
            </>
          )}
        </div>

        {!running && pipelineRun && (
          <div className="work-stage-content-column" style={{ padding: "12px clamp(16px, 3vw, 28px) 0", fontSize: 11, color: "var(--fg-3)", width: "100%", flexShrink: 0 }}>
            {canApprove ? "Ready to export." : "Reed will tell you what needs attention."}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--glass-border)", flexShrink: 0, background: "var(--glass-topbar)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", width: "100%", minWidth: 0, boxSizing: "border-box" as const }}>
        <div className="work-stage-content-column" style={{ padding: "10px clamp(10px, 3vw, 14px)", display: "flex", alignItems: "center", gap: 6 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Send back to Draft, tell Reed what to change..."
            style={{ flex: 1, background: "var(--glass-input)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "0 12px", fontSize: 12, color: "var(--fg)", fontFamily: FONT, outline: "none", height: 36, backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)" }}
            onFocus={e => { e.target.style.borderColor = "rgba(245,198,66,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--glass-border)"; }}
          />
          <IaBtn title="Hold to speak"><MicIcon /></IaBtn>
          <button
            type="button"
            className="liquid-glass-btn liquid-glass-btn--square"
            title="Send back to Draft"
            aria-label="Send back to Draft"
            onClick={() => { if (input.trim()) { onGoBack(input.trim()); setInput(""); } }}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CHIPS
// ─────────────────────────────────────────────────────────────────────────────

function ActionChips({ chips, onChipClick }: { chips: string[]; onChipClick: (text: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
      {chips.map(chip => (
        <div
          key={chip}
          onClick={() => onChipClick(chip)}
          style={{
            fontSize: 10, color: "var(--blue, #4A90D9)",
            padding: "4px 10px", borderRadius: 99,
            border: "1px solid rgba(74,144,217,0.3)",
            background: "rgba(74,144,217,0.04)",
            cursor: "pointer", transition: "all 0.12s",
            fontFamily: FONT,
          }}
        >
          {chip}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function readResumeQuery(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("resume");
  } catch {
    return null;
  }
}

export default function WorkSession() {
  const { setFeedbackContent, setReedPrefill, setReedThread, reedChipRequest, setReedChipRequest, setProposalPending, setIntakeProgress, setIntakeAdvance, setDraftChips } = useShell();
  const prefillReed = useCallback((text: string) => {
    setReedPrefill(text);
  }, [setReedPrefill]);
  const { user, displayName, loading: authLoading } = useAuth();
  const { activeProjectId: shellProjectId } = useStudioProject();
  const { toast } = useToast();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { voiceDnaMd, brandDnaMd, methodDnaMd } = useUserDNA(user?.id);

  // ── Restore persisted session on mount ────────────────────────
  const restored = useRef(false);
  const persisted = !restored.current && !readResumeQuery() ? loadSession() : null;

  // ── Stage state ──────────────────────────────────────────────
  const [stage, setStage] = useState<WorkStage>(() =>
    persisted ? getWorkStageFromPersisted(persisted) : "Intake",
  );

  // ── Intake ───────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (persisted?.messages && persisted.messages.length > 0) {
      return persisted.messages.map(m => ({
        role: m.role === "assistant" ? "reed" as const : "user" as const,
        content: m.content,
      }));
    }
    return [{ role: "reed", content: "Good to see you. What are you working on?" }];
  });
  const [intakeSending, setIntakeSending] = useState(false);
  /** One-shot text for the Intake composer when arriving from Watch "Use this" (draft only, not sent). */
  const [intakeComposerSeed, setIntakeComposerSeed] = useState<string | null>(null);
  const [intakeReady, setIntakeReady] = useState(persisted?.isReady ?? false);
  const [readySummary, setReadySummary] = useState("");
  const [structuredIntake, setStructuredIntake] = useState<StructuredIntake | null>(() => {
    const lastAssist = [...(persisted?.messages || [])].reverse().find(m => m.role === "assistant");
    return mergeStoredAndParsed(persisted?.structuredIntake ?? null, lastAssist?.content);
  });

  const structuredIntakePayload = useMemo(
    () => structuredIntakeForApiBody(structuredIntake),
    [structuredIntake],
  );

  /** After five Reed questions ending in "?", treat intake as ready so outline CTA is never stuck behind API-only flags. */
  useEffect(() => {
    if (stage !== "Intake") return;
    const rq = messages.filter(m => m.role === "reed" && m.content.trim().endsWith("?")).length;
    if (rq >= 4 && !intakeReady) setIntakeReady(true);
  }, [messages, stage, intakeReady]);

  // CO_031: Sync intake progress to shell context for sidebar
  const intakeReedQCountForShell = messages.filter(m => m.role === "reed" && m.content.trim().endsWith("?")).length;
  useEffect(() => {
    setIntakeProgress({ questionCount: intakeReedQCountForShell, ready: intakeReady });
  }, [intakeReedQCountForShell, intakeReady, setIntakeProgress]);

  // ── Output type (CO-003) ─────────────────────────────────────
  const [outputType, setOutputType] = useState<string | null>(() => persisted?.outputTypeId ?? null);
  /** Minutes for Talk output; Wrap and draft targets use minutes × 300 words. */
  const [talkDuration, setTalkDuration] = useState<number>(() => {
    const t = persisted?.talkDuration;
    if (typeof t === "number" && Number.isFinite(t)) return Math.min(180, Math.max(3, Math.round(t)));
    return DEFAULT_PRESENTATION_MINUTES;
  });
  /** After user confirms length in the Talk modal, Write draft may run. Reset when they pick Talk again in the catalog picker. */
  const [talkLengthGatePassed, setTalkLengthGatePassed] = useState(() => persisted?.outputTypeId !== "talk");
  const [talkLengthModalOpen, setTalkLengthModalOpen] = useState(false);
  const [talkLengthDraftInput, setTalkLengthDraftInput] = useState(() => {
    const t = persisted?.talkDuration;
    if (typeof t === "number" && Number.isFinite(t)) return String(Math.min(180, Math.max(3, Math.round(t))));
    return String(DEFAULT_PRESENTATION_MINUTES);
  });
  /** Edit inspector: null = follow Catalog output type defaults for word target. */
  const [editWordTargetOverride, setEditWordTargetOverride] = useState<number | null>(() => {
    const v = persisted?.editDraftWordTarget;
    if (typeof v === "number" && Number.isFinite(v)) return clampEditWordTarget(v);
    return null;
  });
  const [editWordTargetEditorOpen, setEditWordTargetEditorOpen] = useState(false);
  const [editWordTargetDraftInput, setEditWordTargetDraftInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  /** User-set thread name in the top bar. Null means follow auto title from outline or intake. */
  const [sessionNameOverride, setSessionNameOverride] = useState<string | null>(
    () => persisted?.sessionNameOverride ?? null,
  );

  useEffect(() => {
    if (!shellProjectId || shellProjectId === "default") {
      setProjectId(null);
      return;
    }
    setProjectId(shellProjectId);
  }, [shellProjectId]);

  const workSessionProjectKey = useMemo(
    () => workProjectKeyFromShellId(shellProjectId),
    [shellProjectId],
  );
  const workSessionProjectUuid = useMemo(
    () => studioProjectUuidForRow(shellProjectId),
    [shellProjectId],
  );

  // ── Formats + templates ───────────────────────────────────────
  const [selectedFormats, setSelectedFormats] = useState<Format[]>(() => {
    const f = formatsFromPersisted(persisted?.selectedFormats);
    return f.length > 0 ? f : DEFAULT_FORMATS;
  });
  const [selectedTemplate, setSelectedTemplate] = useState("Weekly Insight");
  const [sessionFiles, setSessionFiles] = useState<string[]>([]);

  // ── Outline ──────────────────────────────────────────────────
  const [outlineRows, setOutlineRows] = useState<OutlineRow[]>(() =>
    (persisted?.outlineRows || []).map(r => ({ label: r.label, content: r.content, indent: r.indent })),
  );
  const [outlineAngles, setOutlineAngles] = useState<{ a: OutlineRow[]; b: OutlineRow[]; aMeta?: { name: string; description: string }; bMeta?: { name: string; description: string } } | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<"a" | "b">("a");
  const [buildingOutline, setBuildingOutline] = useState(false);
  const outlineBuildLockRef = useRef(false);
  /** Shared docked composer (Intake active + Outline) so the bar does not jump on stage change. */
  const [intakeBarInput, setIntakeBarInput] = useState("");
  const [intakeBarPendingFiles, setIntakeBarPendingFiles] = useState<File[]>([]);
  const [outlineBarInput, setOutlineBarInput] = useState("");
  const [outlineBarPendingFiles, setOutlineBarPendingFiles] = useState<File[]>([]);
  /** 0 idle, 1 intake main fading out, 2 outline main (enter animation until cleared). */
  const [ioTransitionStep, setIoTransitionStep] = useState(0);
  const [intakeMainFadeOut, setIntakeMainFadeOut] = useState(false);
  const [outlineEnterActive, setOutlineEnterActive] = useState(false);

  // ── Edit ─────────────────────────────────────────────────────
  const [draft, setDraft] = useState(persisted?.generatedContent || "");
  const [draftVersions, setDraftVersions] = useState<Array<{ content: string; label: string }>>([]);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState("Writing in your voice...");
  const [applyingSuggestion, setApplyingSuggestion] = useState(false);
  const [dismissedFlags, setDismissedFlags] = useState<Set<string>>(new Set());
  const [fixedFlags, setFixedFlags] = useState<Map<string, string>>(new Map());

  // ── CO_029 Failure 8: Persistent Reed action message in Inspector ──
  const [reedActionMessage, setReedActionMessage] = useState<string | null>(null);

  // ── CO_026: Propose-before-apply state ──────────────────────
  const [pendingProposal, setPendingProposal] = useState<{
    instruction: string;
    proposedDraft: string;
    reason: string;
    wordCountBefore: number;
    wordCountAfter: number;
    originalDraft: string;
  } | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

  // Sync proposal state to shell context so ReedPanel can disable chips
  useEffect(() => {
    setProposalPending(pendingProposal !== null || proposalLoading);
  }, [pendingProposal, proposalLoading, setProposalPending]);

  // ── Review ───────────────────────────────────────────────────
  const [pipelineRun, setPipelineRun] = useState<PipelineRun | null>(null);
  const [formatDrafts, setFormatDrafts] = useState<Record<string, { content: string; metadata: Record<string, string>; status: "pending" | "generating" | "done" | "error" }>>({});
  const [fixingGate, setFixingGate] = useState<string | null>(null);
  const [rerunningPipeline, setRerunningPipeline] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState<Format | null>(null);
  useEffect(() => {
    setActiveReviewTab(prev => {
      if (selectedFormats.length === 0) return null;
      if (prev && selectedFormats.includes(prev)) return prev;
      return selectedFormats[0];
    });
  }, [selectedFormats]);
  const [hvtAttempts, setHvtAttempts] = useState(0);
  const [hvtRunning, setHvtRunning] = useState(false);
  const [draftRepairing, setDraftRepairing] = useState(false);
  const [draftRepairAttempts, setDraftRepairAttempts] = useState(0);
  /** Chosen OUTPUT_TYPES ids on the Pre-Wrap full screen (user toggles only; no auto-selection). */
  const [preWrapPickIds, setPreWrapPickIds] = useState<string[]>([]);
  /** When true, Start Wrap requires two Catalog picks; when false, exactly one. */
  const [preWrapAllowSecond, setPreWrapAllowSecond] = useState(false);

  // CO_029 Failure 5: User templates for Review format grid
  const [userTemplates, setUserTemplates] = useState<Array<{ id: string; name: string; outputType: string }>>([]);
  useEffect(() => {
    if (stage !== "Review" || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("templates")
          .select("id, name, output_type")
          .eq("user_id", user.id)
          .eq("is_hidden", false)
          .order("updated_at", { ascending: false });
        if (!cancelled && data) {
          setUserTemplates(data.map(r => ({ id: r.id, name: r.name, outputType: r.output_type })));
        }
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [stage, user?.id]);
  /** Talk length for presentation output type (Wrap target words = minutes × 300). */
  const [preWrapPresentationMins, setPreWrapPresentationMins] = useState<number>(DEFAULT_PRESENTATION_MINUTES);

  // ── Background pipeline (Redesign 2: run quality check during generation) ──
  const [backgroundPipelineRun, setBackgroundPipelineRun] = useState<PipelineRun | null>(null);
  const [backgroundPipelineRunning, setBackgroundPipelineRunning] = useState(false);
  const [draftChangedSinceBackground, setDraftChangedSinceBackground] = useState(false);
  const backgroundDraftRef = useRef<string>("");
  // ── Export ────────────────────────────────────────────────────
  const [exportedTabs, setExportedTabs] = useState<Record<string, boolean>>({});
  const [outputId, setOutputId] = useState<string | null>(persisted?.generatedOutputId || null);
  const [allExported, setAllExported] = useState(false);
  const [methodTermHits, setMethodTermHits] = useState<MethodTermHit[]>([]);
  const [methodLintLoading, setMethodLintLoading] = useState(false);
  const [methodLintInspectorError, setMethodLintInspectorError] = useState<MethodLintInspectorError | null>(null);
  const [methodLintLastCompletedFp, setMethodLintLastCompletedFp] = useState<string | null>(null);
  const methodLintSuccessDraftKeyRef = useRef<string | null>(null);
  const methodLintCoalesceRef = useRef<{ key: string; promise: Promise<boolean> } | null>(null);

  const draftLintFp = useMemo(() => draftFingerprintForLint(draft || ""), [draft]);

  const [restorePromptRow, setRestorePromptRow] = useState<WorkSessionDbRow | null>(null);
  const [restoreResolved, setRestoreResolved] = useState(false);
  const [newSessionParkConfirmOpen, setNewSessionParkConfirmOpen] = useState(false);
  const [newSessionParkBusy, setNewSessionParkBusy] = useState(false);

  // Mark restored so we don't re-read persisted on re-renders
  useEffect(() => { restored.current = true; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setRestoreResolved(true);
      return;
    }
    if (readResumeQuery()) {
      setRestoreResolved(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await fetchWorkSessionRow(user.id, workSessionProjectKey);
      if (cancelled) return;
      const local = loadSession();
      if (row && shouldOfferWorkSessionRestore(row, local)) {
        setRestorePromptRow(row);
      } else {
        setRestoreResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, workSessionProjectKey]);

  const firstUserSnippet = useMemo(
    () => messages.find(m => m.role === "user")?.content?.trim().slice(0, 60) || "",
    [messages],
  );
  const derivedSessionTitle = useMemo(() => {
    const fromOutline = outlineRows[0]?.content?.trim() || "";
    return (fromOutline || firstUserSnippet || "").slice(0, 200);
  }, [outlineRows, firstUserSnippet]);
  const resolvedSessionTitle = (sessionNameOverride?.trim() || derivedSessionTitle || "New session").slice(0, 200);

  useLayoutEffect(() => {
    publishWorkSessionMeta({ title: resolvedSessionTitle, active: true });
    return () => {
      const p = loadSession();
      const title =
        (resolvedSessionTitle || "").trim() ||
        (p ? sessionTitleFromPersisted(p) : "") ||
        "";
      publishWorkSessionMeta({
        title: title.slice(0, 200),
        active: p != null,
      });
    };
  }, [resolvedSessionTitle]);

  useEffect(() => {
    const onRename = (e: Event) => {
      const ce = e as CustomEvent<{ name?: string }>;
      const raw = typeof ce.detail?.name === "string" ? ce.detail.name.trim() : "";
      setSessionNameOverride(raw.length > 0 ? raw.slice(0, 200) : null);
    };
    window.addEventListener("ew-session-rename-request", onRename);
    return () => window.removeEventListener("ew-session-rename-request", onRename);
  }, []);

  useEffect(() => {
    const onNewSessionRequest = () => setNewSessionParkConfirmOpen(true);
    window.addEventListener(EW_NEW_SESSION_REQUEST, onNewSessionRequest);
    return () => window.removeEventListener(EW_NEW_SESSION_REQUEST, onNewSessionRequest);
  }, []);

  useEffect(() => {
    const onOutputTypeId = (e: Event) => {
      const ce = e as CustomEvent<{ outputTypeId?: string }>;
      const id = ce.detail?.outputTypeId;
      if (typeof id !== "string" || !id.trim()) return;
      setOutputType(id);
      if (id === "talk") setTalkLengthGatePassed(false);
      else setTalkLengthGatePassed(true);
    };
    window.addEventListener(WORK_SESSION_OUTPUT_TYPE_ID_EVENT, onOutputTypeId);
    return () => window.removeEventListener(WORK_SESSION_OUTPUT_TYPE_ID_EVENT, onOutputTypeId);
  }, []);

  const workSessionFlushRef = useRef<PersistedSession | null>(null);

  // ── Mirror + debounced Supabase sync (2s) on tracked field changes ─────────
  useEffect(() => {
    if (authLoading) return;
    if (!restoreResolved) return;
    if (!restored.current) return;

    const snap: PersistedSession = {
      messages: messages.map((m, i) => ({
        id: String(i),
        role: m.role === "reed" ? "assistant" : "user",
        content: m.content,
        ts: Date.now(),
      })),
      input: "",
      outputType: catalogOutputTypeForApi(outputType),
      outputTypeId: outputType,
      sessionTitle: resolvedSessionTitle,
      sessionNameOverride,
      phase: draft ? "complete" : "input",
      generatedContent: draft,
      generatedScore: 0,
      generatedOutputId: outputId || "",
      generatedGates: null,
      isReady: intakeReady,
      timestamp: Date.now(),
      workStage: stage,
      outlineRows: outlineRows.map(r => ({ label: r.label, content: r.content, indent: r.indent })),
      selectedFormats,
      structuredIntake,
      talkDuration,
      editDraftWordTarget: editWordTargetOverride,
      projectKey: workSessionProjectKey,
    };

    const hasContent =
      messages.length > 1 || !!draft.trim() || Boolean(sessionNameOverride?.trim());
    if (!user?.id) {
      if (!hasContent) return;
      saveSessionLocalMirror(snap);
      return;
    }

    saveSessionLocalMirror(snap);
    workSessionFlushRef.current = snap;
    const t = window.setTimeout(() => {
      const payload = workSessionFlushRef.current;
      if (payload && user.id) {
        void flushWorkSessionToSupabase(user.id, workSessionProjectKey, workSessionProjectUuid, payload);
      }
    }, WORK_SESSION_CLOUD_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    authLoading,
    restoreResolved,
    messages,
    draft,
    intakeReady,
    outputId,
    stage,
    outlineRows,
    selectedFormats,
    outputType,
    talkDuration,
    user?.id,
    resolvedSessionTitle,
    sessionNameOverride,
    structuredIntake,
    workSessionProjectKey,
    workSessionProjectUuid,
    editWordTargetOverride,
  ]);

  // ── Stage navigation ──────────────────────────────────────────
  const goToStage = useCallback((s: WorkStage) => {
    setStage(s);
    // CO_029 Failure 8: Clear persistent Reed message on stage transition
    setReedActionMessage(null);
    setDraftRepairAttempts(0);
  }, []);

  useLayoutEffect(() => {
    if (ioTransitionStep !== 1) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIntakeMainFadeOut(true));
    });
    return () => cancelAnimationFrame(id);
  }, [ioTransitionStep]);

  useEffect(() => {
    if (stage !== "Outline" || ioTransitionStep !== 2) return;
    if (buildingOutline) return;
    setOutlineEnterActive(false);
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setOutlineEnterActive(true);
      });
    });
    const t = window.setTimeout(() => {
      if (!cancelled) setIoTransitionStep(0);
    }, IO_OUTLINE_ENTER_MS + 60);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [stage, buildingOutline, ioTransitionStep]);

  const handleCatalogOutputTypeChange = useCallback((id: string) => {
    setOutputType(id);
    if (id === "talk") {
      setTalkLengthGatePassed(false);
    } else {
      setTalkLengthGatePassed(true);
    }
  }, []);

  const hydrateFromPersisted = useCallback((p: PersistedSession) => {
    setStage(getWorkStageFromPersisted(p));
    setMessages(
      p.messages?.length
        ? p.messages.map(m => ({
            role: m.role === "assistant" ? "reed" as const : "user" as const,
            content: m.content,
          }))
        : [{ role: "reed", content: "Good to see you. What are you working on?" }],
    );
    setIntakeReady(p.isReady ?? false);
    const lastAssistHydrate = [...(p.messages || [])].reverse().find(m => m.role === "assistant");
    setStructuredIntake(mergeStoredAndParsed(p.structuredIntake ?? null, lastAssistHydrate?.content));
    setDraft(p.generatedContent || "");
    setOutputId(p.generatedOutputId ? p.generatedOutputId : null);
    setOutputType(p.outputTypeId ?? null);
    const td = p.talkDuration;
    if (typeof td === "number" && Number.isFinite(td)) {
      const clamped = Math.min(180, Math.max(3, Math.round(td)));
      setTalkDuration(clamped);
      setTalkLengthDraftInput(String(clamped));
    } else {
      setTalkDuration(DEFAULT_PRESENTATION_MINUTES);
      setTalkLengthDraftInput(String(DEFAULT_PRESENTATION_MINUTES));
    }
    setTalkLengthGatePassed(p.outputTypeId !== "talk");
    setTalkLengthModalOpen(false);
    const ewt = p.editDraftWordTarget;
    if (typeof ewt === "number" && Number.isFinite(ewt)) setEditWordTargetOverride(clampEditWordTarget(ewt));
    else setEditWordTargetOverride(null);
    setEditWordTargetEditorOpen(false);
    setEditWordTargetDraftInput("");
    setOutlineRows((p.outlineRows || []).map(r => ({ label: r.label, content: r.content, indent: r.indent })));
    setSessionNameOverride(p.sessionNameOverride ?? null);
    const f = formatsFromPersisted(p.selectedFormats);
    const nextFormats = f.length > 0 ? f : DEFAULT_FORMATS;
    setSelectedFormats(nextFormats);
    setPipelineRun(null);
    setPipelineRunning(false);
    setBackgroundPipelineRun(null);
    setBackgroundPipelineRunning(false);
    setDraftChangedSinceBackground(false);
    backgroundDraftRef.current = "";
    setFormatDrafts({});
    setAllExported(false);
    setExportedTabs({});
    setPreWrapPickIds([]);
    setPreWrapAllowSecond(false);
    setGenerating(false);
    setFixingGate(null);
    setRerunningPipeline(false);
  }, []);

  const stripResumeParams = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("resume");
        next.delete("outputId");
        next.delete("title");
        next.delete("projectKey");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  // ── Resume from Pipeline (TheLot) or explicit URL ────────────
  const resumeParam = searchParams.get("resume");
  const resumeOutputId = searchParams.get("outputId");
  const resumeTitle = searchParams.get("title");
  useEffect(() => {
    if (!resumeParam) return;

    const run = async () => {
      if (resumeParam === "local") {
        const p = loadSession();
        if (p) hydrateFromPersisted(p);
        stripResumeParams();
        return;
      }

      if (!user?.id) {
        stripResumeParams();
        return;
      }

      if (resumeParam === "work_session") {
        const pk = searchParams.get("projectKey") || workProjectKeyFromShellId(shellProjectId);
        const row = await fetchWorkSessionRow(user.id, pk);
        if (row) {
          hydrateFromPersisted(rowToPersistedSession(row));
        }
        stripResumeParams();
        return;
      }

      if (resumeParam === "output") {
        const oid = resumeOutputId;
        if (!oid) {
          stripResumeParams();
          return;
        }
        const titleHint = resumeTitle;
        const { data } = await supabase
          .from("outputs")
          .select("id, title, content, output_type")
          .eq("id", oid)
          .eq("user_id", user.id)
          .single();
        if (!data?.content) {
          stripResumeParams();
          return;
        }
        stripResumeParams();
        let decodedHint = "";
        try {
          decodedHint = titleHint ? decodeURIComponent(titleHint) : "";
        } catch {
          decodedHint = titleHint || "";
        }
        const title = decodedHint || data.title || "Untitled";
        setMessages([
          { role: "reed", content: "What's on your mind?" },
          { role: "user", content: `I want to continue working on: ${title}` },
          { role: "reed", content: "Picking up where we left off. I've loaded your draft. Jump to Draft to continue, or tell me what you'd like to change." },
        ]);
        setDraft(data.content);
        setOutputId(data.id);
        setOutputType(data.output_type || null);
        goToStage("Edit");
        setPipelineRun(null);
        setFormatDrafts({});
      }
    };

    void run();
  }, [resumeParam, resumeOutputId, resumeTitle, user?.id, searchParams, shellProjectId, hydrateFromPersisted, stripResumeParams, goToStage]);

  // ── Reopen from Catalog or Pipeline ──────────────────────────
  // When a user hits "Reopen in Work" from OutputLibrary or TheLot,
  // sessionStorage has the output ID and title. Load the draft and
  // drop into Edit stage so they can continue from where they left off.
  useEffect(() => {
    const reopenId = sessionStorage.getItem("ew-reopen-output-id");
    const reopenTitle = sessionStorage.getItem("ew-reopen-title");
    if (!reopenId || !user) return;

    // Clear immediately so navigating away and back doesn't retrigger
    sessionStorage.removeItem("ew-reopen-output-id");
    sessionStorage.removeItem("ew-reopen-title");

    (async () => {
      const { data } = await supabase
        .from("outputs")
        .select("id, title, content, output_type")
        .eq("id", reopenId)
        .eq("user_id", user.id)
        .single();

      if (!data) return;

      // Clear stale multi-channel picks from an older session so Review does not show the four-format grid.
      setSelectedFormats(DEFAULT_FORMATS);

      if (data.output_type) {
        setOutputType(data.output_type);
      }

      // Seed the conversation with the title as context
      if (reopenTitle) {
        setMessages([
          { role: "reed", content: "What's on your mind?" },
          { role: "user", content: `I want to continue working on: ${reopenTitle}` },
          { role: "reed", content: `Picking up where we left off. I've loaded your draft. Jump to Draft to continue, or tell me what you'd like to change.` },
        ]);
      }

      // Load the draft and jump to Edit
      if (data.content) {
        setDraft(data.content);
        setOutputId(data.id);
        goToStage("Edit");
      }
    })();
  }, [user, goToStage]);

  // Expose to StudioTopBar breadcrumb and Reed panel (useWorkStageFromShell subscribes)
  useEffect(() => {
    window.__ewWorkStage = stage;
    window.__ewSetWorkStage = goToStage;
    window.dispatchEvent(new CustomEvent("ew-work-stage"));
    return () => {
      delete window.__ewWorkStage;
      delete window.__ewSetWorkStage;
      window.dispatchEvent(new CustomEvent("ew-work-stage"));
    };
  }, [stage, goToStage]);

  // Expose session context for Ask Reed panel (CO_020)
  useEffect(() => {
    window.__ewAskReedContext = {
      conversationSummary: messages
        .filter(m => m.role === "user" || m.role === "reed")
        .map(m => `${m.role === "reed" ? "Reed" : "User"}: ${m.content}`)
        .join("\n\n"),
      stage,
      draft: draft || "",
      outputType: catalogOutputTypeForApi(outputType),
      voiceDnaMd,
      userId: user?.id,
      userName: displayName || undefined,
    };
    return () => { delete window.__ewAskReedContext; };
  }, [messages, stage, draft, outputType, voiceDnaMd, user?.id, displayName]);

  // ── Build conversation summary for API calls ──────────────────
  const buildConvSummary = useCallback(() =>
    messages
      .filter(m => m.role === "user" || m.role === "reed")
      .map(m => `${m.role === "reed" ? "Reed" : "User"}: ${m.content}`)
      .join("\n\n")
  , [messages]);

  // ── INTAKE: Send message to Reed ────────────────────────────
  const handleIntakeSend = useCallback(async (text: string) => {
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setIntakeSending(true);

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role === "reed" ? "assistant" : "user", content: m.content })),
          outputType: catalogOutputTypeForApi(outputType),
          voiceDnaMd,
          userId: user?.id,
          userName: displayName || undefined,
          systemMode: "CONTENT_PRODUCTION",
        }),
      }, { timeout: 60000 });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      // Sanitize: strip em-dashes, en-dashes, replace with commas or colons
      const reply = (data.reply ?? "").replace(/\u2014/g, ",").replace(/\u2013/g, ",");

      setMessages(prev => [...prev, { role: "reed", content: reply, isChallenge: data.isChallenge }]);

      const parsedIntake = parseStructuredIntakeFromReedReply(reply);
      if (parsedIntake) setStructuredIntake(parsedIntake);

      if (data.readyToGenerate) {
        setIntakeReady(true);
        setReadySummary(reply);
      } else if (!intakeReady) {
        // Client-side fallback: detect readiness from conversation state
        const userMsgs = newMessages.filter(m => m.role === "user");
        const latestUserMsg = text.toLowerCase();
        const intentSignals = [
          "produce", "write it", "go ahead", "let's go", "build it", "generate",
          "ready", "do it", "make it", "ship it", "just write", "start writing",
          "that's it", "that's all", "nothing else", "good to go", "sounds good",
          "yes", "yeah", "yep", "let's do this", "proceed",
        ];
        const userWantsToGenerate = intentSignals.some(signal => latestUserMsg.includes(signal));

        const reedLower = reply.toLowerCase();
        const reedSignalsReady =
          reedLower.includes("anything you want to add") ||
          reedLower.includes("ready to produce") ||
          reedLower.includes("ready to write") ||
          reedLower.includes("i have what i need") ||
          reedLower.includes("i have enough") ||
          reedLower.includes("let me produce") ||
          reedLower.includes("shall i produce") ||
          reedLower.includes("here is what i will produce") ||
          reedLower.includes("here's what i'll produce");

        // CO_023: Channel + audience must be answered before skip is allowed.
        // Heuristic: user's first message is the topic, messages 2 and 3 are
        // answers to channel and audience. Require 3+ user messages.
        const hasChannelAndAudience = userMsgs.length >= 3;

        if (userWantsToGenerate && !hasChannelAndAudience) {
          // Block skip: inject Reed's redirect message
          setMessages(prev => [...prev, {
            role: "reed",
            content: "Two quick things first, where is this going, and who's reading it? That changes the piece significantly.",
          }]);
        } else if ((userWantsToGenerate && hasChannelAndAudience) || reedSignalsReady || userMsgs.length >= 5) {
          setIntakeReady(true);
          setReadySummary(reply);
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "reed", content: "Something went wrong. Please try again." }]);
      console.error("[WorkSession][intake]", err);
    } finally {
      setIntakeSending(false);
    }
  }, [messages, voiceDnaMd, user?.id, outputType, intakeReady]);

  const handleIntakeBarSend = useCallback(() => {
    if (intakeSending) return;
    void (async () => {
      const trimmed = intakeBarInput.trim();
      if (!trimmed && intakeBarPendingFiles.length === 0) return;
      const parts: string[] = [];
      if (trimmed) parts.push(trimmed);
      const filesSnapshot = [...intakeBarPendingFiles];
      if (filesSnapshot.length > 0) {
        const fileBlock = await formatIntakeFileAttachments(filesSnapshot);
        if (fileBlock) {
          parts.push(`I've attached the following for this session:\n\n${fileBlock}`);
        }
      }
      if (parts.length === 0) return;
      if (filesSnapshot.length > 0) {
        setSessionFiles(prev => [...prev, ...filesSnapshot.map(f => f.name)]);
      }
      setIntakeBarInput("");
      setIntakeBarPendingFiles([]);
      await handleIntakeSend(parts.join("\n\n"));
    })();
  }, [intakeSending, intakeBarInput, intakeBarPendingFiles, handleIntakeSend]);

  const handleOutlineBarSend = useCallback(() => {}, []);

  // ── INTAKE → OUTLINE: Build outline from conversation ─────────
  const handleBuildOutline = useCallback(() => {
    if (outlineBuildLockRef.current) return;
    outlineBuildLockRef.current = true;
    setIntakeMainFadeOut(false);
    setIoTransitionStep(1);
    setBuildingOutline(true);

    const buildPromise = (async () => {
      try {
        const ot = catalogOutputTypeForApi(outputType);

        const mapRows = (rows: Array<{ label: string; content: string; indent?: boolean }>): OutlineRow[] =>
          rows.map(r => ({ label: r.label || "", content: r.content || "", ...(r.indent ? { indent: true } : {}) }));

        let angleA: OutlineRow[] = [];
        let angleB: OutlineRow[] = [];
        let aMeta = { name: "Angle A", description: "" };
        let bMeta = { name: "Angle B", description: "" };
        let distinct = false;

        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await fetchWithRetry(`${API_BASE}/api/outline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: messages.map(m => ({ role: m.role, content: m.content })),
              userId: user?.id,
              outputType: ot,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Outline API returned ${res.status}`);
          }

          const data = await res.json() as {
            angleA: { name: string; description: string; rows: Array<{ label: string; content: string; indent?: boolean }> };
            angleB: { name: string; description: string; rows: Array<{ label: string; content: string; indent?: boolean }> };
          };

          angleA = mapRows(data.angleA.rows);
          angleB = mapRows(data.angleB.rows);
          aMeta = { name: data.angleA.name || "Angle A", description: data.angleA.description || "" };
          bMeta = { name: data.angleB.name || "Angle B", description: data.angleB.description || "" };

          if (outlineAnglesDistinctEnough(angleA, angleB)) {
            distinct = true;
            break;
          }
          console.warn("[handleBuildOutline] outlineAngles A/B not distinct enough; re-requesting outline from API.", { attempt });
        }

        if (!distinct) {
          console.warn("[handleBuildOutline] outlineAngles still not distinct after re-request; applying last response.");
        }

        setOutlineAngles({
          a: angleA,
          b: angleB,
          aMeta,
          bMeta,
        });
        setSelectedAngle("a");
        setOutlineRows(angleA);
      } catch (err: unknown) {
        console.error("[handleBuildOutline]", err);
        toast?.("Outline generation failed. Using fallback.", "error");

        const userMsgs = messages.filter(m => m.role === "user").map(m => m.content);
        const firstMsg = userMsgs.find(m => m.length > 20) || userMsgs[0] || "Untitled piece";
        const fallbackTitle = firstMsg.length > 80 ? firstMsg.slice(0, 77) + "..." : firstMsg;

        const fallback: OutlineRow[] = [
          { label: "Title", content: fallbackTitle },
          { label: "Hook", content: "Opening that earns the read" },
          { label: "Body", content: "Core argument" },
          { label: "Stakes", content: "Why this matters now" },
          { label: "Close", content: "Landing" },
        ];
        setOutlineAngles({
          a: fallback,
          b: fallback,
          aMeta: { name: "Draft Outline", description: "Fallback outline. Edit freely." },
          bMeta: { name: "Draft Outline", description: "Fallback outline. Edit freely." },
        });
        setSelectedAngle("a");
        setOutlineRows(fallback);
      } finally {
        setBuildingOutline(false);
      }
    })();

    void (async () => {
      try {
        await new Promise<void>(resolve => { window.setTimeout(resolve, IO_INTAKE_FADE_MS); });
        goToStage("Outline");
        setIntakeMainFadeOut(false);
        setOutlineEnterActive(false);
        setIoTransitionStep(2);
        await buildPromise;
      } finally {
        outlineBuildLockRef.current = false;
      }
    })();
  }, [messages, goToStage, outputType, user?.id, toast]);

  // CO_031: Expose handleBuildOutline to sidebar via shell context
  useEffect(() => {
    setIntakeAdvance(() => handleBuildOutline);
    return () => setIntakeAdvance(null);
  }, [handleBuildOutline, setIntakeAdvance]);

  // ── BACKGROUND: Silent quality check after draft generation (Redesign 2) ──
  const handleBackgroundQualityCheck = useCallback(async (generatedDraft: string) => {
    if (!user || !generatedDraft) return;
    setBackgroundPipelineRunning(true);
    setBackgroundPipelineRun(null);
    backgroundDraftRef.current = generatedDraft;

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: generatedDraft,
          outputType: catalogOutputTypeForApi(outputType),
          voiceDnaMd,
          brandDnaMd,
          methodDnaMd,
          userId: user.id,
        }),
      }, { timeout: 175000 });

      if (!res.ok) throw new Error(`Background pipeline error ${res.status}`);
      const result = await res.json();

      const bgResult: PipelineRun = {
        status: result.status,
        checkpointResults: result.checkpointResults || [],
        impactScore: result.impactScore || null,
        humanVoiceTest: result.humanVoiceTest || null,
        blockedAt: result.blockedAt,
        finalDraft: result.finalDraft,
      };

      // If gates fail and the pipeline aggregate is below the internal bar, auto-revise in the background
      const aggregateTotal = result.impactScore?.total ?? 0;
      const failingGates = (result.checkpointResults || []).filter((g: CheckpointResult) => g.status !== "PASS");

      if (aggregateTotal < 75 && failingGates.length > 0 && backgroundDraftRef.current === generatedDraft) {
        const issues = failingGates
          .map((g: CheckpointResult) => `[${displayGateName(g.gate)}]: ${g.feedback}`)
          .join("\n");

        try {
          const bgOt = catalogOutputTypeForApi(outputType);
          const revRes = await fetchWithRetry(`${API_BASE}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationSummary: "",
              outputType: bgOt,
              originalDraft: result.finalDraft || generatedDraft,
              revisionNotes: `Fix these quality checkpoint issues while preserving the voice and argument:\n\n${issues}`,
              userId: user.id,
              maxTokens: 4096,
              ...(bgOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
              ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
            }),
          }, { timeout: 90000 });

          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData.content && revData.content !== generatedDraft) {
              if (!draftChangedSinceBackground && backgroundDraftRef.current === generatedDraft) {
                setDraft(revData.content);
                backgroundDraftRef.current = revData.content;
                setDismissedFlags(new Set());
                setFixedFlags(new Map());
                setDraftVersions(prev => {
                  const updated = [...prev];
                  if (updated[0]) updated[0] = { ...updated[0], content: revData.content };
                  return updated;
                });
              }

              const reRes = await fetchWithRetry(`${API_BASE}/api/run-pipeline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  draft: revData.content,
                  outputType: catalogOutputTypeForApi(outputType),
                  voiceDnaMd,
                  brandDnaMd,
                  methodDnaMd,
                  userId: user.id,
                }),
              }, { timeout: 175000 });

              if (reRes.ok) {
                const reResult = await reRes.json();
                setBackgroundPipelineRun({
                  status: reResult.status,
                  checkpointResults: reResult.checkpointResults || [],
                  impactScore: reResult.impactScore || null,
                  humanVoiceTest: reResult.humanVoiceTest || null,
                  blockedAt: reResult.blockedAt,
                  finalDraft: reResult.finalDraft || revData.content,
                });
                return;
              }
            }
          }
        } catch (revErr) {
          console.warn("[Background auto-revise] Failed, using initial results:", revErr);
        }
      }

      setBackgroundPipelineRun(bgResult);
    } catch (err) {
      console.warn("[Background pipeline] Failed:", err);
    } finally {
      setBackgroundPipelineRunning(false);
    }
  }, [user, outputType, talkDuration, voiceDnaMd, brandDnaMd, methodDnaMd, draftChangedSinceBackground, structuredIntakePayload]);

  // Track when user edits draft after background check started
  const handleDraftChangeWithTracking = useCallback((newDraft: string) => {
    setDraft(newDraft);
    if (backgroundDraftRef.current && newDraft !== backgroundDraftRef.current) {
      setDraftChangedSinceBackground(true);
    }
    // CO_026: Auto-dismiss pending proposal when user manually edits draft
    if (pendingProposal) {
      setPendingProposal(null);
    }
    // Reset repair attempt counter on manual edit
    if (draftRepairAttempts > 0) {
      setDraftRepairAttempts(0);
    }
  }, [pendingProposal, draftRepairAttempts]);

  // ── OUTLINE → EDIT: Generate draft ───────────────────────────
  const runGenerateDraftFromOutline = useCallback(async () => {
    goToStage("Edit");
    setIoTransitionStep(0);
    setIntakeMainFadeOut(false);
    setOutlineEnterActive(false);
    setGenerating(true);

    // CO_023: Confirmation line showing channel + audience before generation
    const channel = structuredIntake?.format
      || outputTypeDisplayLabel(catalogOutputTypeForApi(outputType))
      || "content piece";
    const rawAudience = structuredIntake?.audience || "";
    const audienceSummary = rawAudience.length > 80 ? rawAudience.slice(0, 77) + "..." : rawAudience;
    setGeneratingLabel(
      audienceSummary
        ? `Writing a ${channel} for ${audienceSummary}...`
        : `Writing a ${channel}...`
    );
    setDraft("");

    const convSummary = buildConvSummary();
    const outlineForAPI = outlineRows.map((row, i) => ({
      section: row.label || `Section ${i + 1}`,
      beats: [row.content].filter(Boolean),
      purpose: "",
    }));
    const resolvedOt =
      catalogOutputTypeForApi(outputType);

    try {
      setGeneratingLabel("Writing in your voice...");
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: convSummary,
          outputType: resolvedOt,
          outline: outlineForAPI,
          thesis: outlineRows[0]?.content || "",
          userId: user?.id,
          maxTokens: 4096,
          ...(resolvedOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: 90000 });

      if (!res.ok) throw new Error(`Generate error ${res.status}`);
      const data = await res.json();

      setDraft(data.content || "");
      setDismissedFlags(new Set());
      setFixedFlags(new Map());
      setDraftVersions([{ content: data.content || "", label: "Version 1" }]);
      setActiveVersionIdx(0);
      setGeneratingLabel("Done.");
      setDraftChangedSinceBackground(false);

      // Run quality gates in background (Redesign 2)
      if (data.content) {
        handleBackgroundQualityCheck(data.content);
      }

      // Save draft to Supabase immediately (fire and forget, don't block UI)
      if (user && data.content) {
        const title = outlineRows[0]?.content || messages.find(m => m.role === "user")?.content?.slice(0, 80) || "Untitled";
        const outputTypeId = resolvedOt;
        supabase.from("outputs").insert({
          user_id: user.id,
          title: title.slice(0, 200),
          content: data.content,
          output_type: outputTypeId,
          content_state: "in_progress",
          score: 0,
        }).select("id").single().then(({ data: savedOutput, error }) => {
          if (error) console.error("[Draft save] Error:", error.message, error.details, error.hint);
          if (savedOutput?.id) {
            setOutputId(savedOutput.id);
          }
        });
      }
    } catch (err: any) {
      toast("Draft generation failed. Please try again.", "error");
      setDraft("Could not generate draft. Please go back to Outline and try again.");
      console.error("[WorkSession][generate]", err);
    } finally {
      setGenerating(false);
    }
  }, [buildConvSummary, outlineRows, user?.id, toast, goToStage, handleBackgroundQualityCheck, outputType, talkDuration, structuredIntakePayload, structuredIntake]);

  const handleGenerateDraft = useCallback(() => {
    if (outputType === "talk" && !talkLengthGatePassed) {
      setTalkLengthDraftInput(String(talkDuration));
      setTalkLengthModalOpen(true);
      return;
    }
    void runGenerateDraftFromOutline();
  }, [outputType, talkLengthGatePassed, talkDuration, runGenerateDraftFromOutline]);

  const confirmTalkLengthAndGenerate = useCallback(() => {
    const v = parseInt(talkLengthDraftInput, 10);
    if (!Number.isFinite(v) || v < 3 || v > 180) {
      toast("Enter a duration between 3 and 180 minutes.", "error");
      return;
    }
    const clamped = Math.min(180, Math.max(3, v));
    setTalkDuration(clamped);
    setTalkLengthDraftInput(String(clamped));
    setTalkLengthGatePassed(true);
    setTalkLengthModalOpen(false);
    void runGenerateDraftFromOutline();
  }, [talkLengthDraftInput, toast, runGenerateDraftFromOutline]);

  // ── EDIT: Revise draft ────────────────────────────────────────
  const handleRevise = useCallback(async (instructions: string, opts?: { fromChip?: boolean }) => {
    if (!draft) return;
    const fromChip = opts?.fromChip === true;
    if (fromChip) {
      setApplyingSuggestion(true);
    } else {
      setGenerating(true);
      setGeneratingLabel("Revising...");
    }

    const resolvedOt =
      catalogOutputTypeForApi(outputType);

    const revisionScope = classifyEditRevisionScope(instructions);
    const sectionSlice =
      revisionScope === "targeted" ? extractDraftSectionForTargetedEdit(draft, instructions) : null;
    const useTargeted =
      revisionScope === "targeted" &&
      !!sectionSlice &&
      sectionSlice.excerpt.trim().length > 0 &&
      sectionSlice.excerpt.length <= TARGETED_EDIT_EXCERPT_MAX_CHARS;

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: buildConvSummary(),
          outputType: resolvedOt,
          revisionNotes: instructions,
          revisionScope: useTargeted ? "targeted" : "full",
          ...(useTargeted && sectionSlice
            ? { sectionExcerpt: sectionSlice.excerpt }
            : { originalDraft: draft }),
          userId: user?.id,
          maxTokens: useTargeted ? 2048 : 4096,
          ...(resolvedOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload && !useTargeted ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: useTargeted ? 45000 : 90000 });

      if (!res.ok) throw new Error(`Revision error ${res.status}`);
      const data = await res.json();
      let revised: string;
      if (data.targeted && typeof data.revisedExcerpt === "string" && sectionSlice && useTargeted) {
        const rep = data.revisedExcerpt.trim();
        revised = rep
          ? `${sectionSlice.prefix}${rep}${sectionSlice.suffix ? `\n\n${sectionSlice.suffix}` : ""}`
          : draft;
      } else {
        revised = data.content || draft;
      }
      setDraft(revised);
      setDismissedFlags(new Set());
      setFixedFlags(new Map());
      setDraftVersions(prev => {
        const updated = [...prev];
        if (updated[activeVersionIdx]) {
          updated[activeVersionIdx] = { ...updated[activeVersionIdx], content: revised };
        }
        return updated;
      });
    } catch (err: any) {
      toast("Revision failed. Your draft is unchanged.", "error");
      console.error("[WorkSession][revise]", err);
    } finally {
      if (fromChip) setApplyingSuggestion(false);
      else setGenerating(false);
    }
  }, [draft, buildConvSummary, outputType, talkDuration, user?.id, activeVersionIdx, toast, structuredIntakePayload]);

  // ── CO_026: Propose-before-apply handlers ───────────────────
  const handleProposeRevision = useCallback(async (instruction: string, label?: string) => {
    if (!draft || pendingProposal || proposalLoading) return;

    const snapshotDraft = draft; // capture BEFORE the API call
    setProposalLoading(true);

    const resolvedOt = catalogOutputTypeForApi(outputType);

    // Same targeted revision classification as handleRevise
    const revisionScope = classifyEditRevisionScope(instruction);
    const sectionSlice =
      revisionScope === "targeted" ? extractDraftSectionForTargetedEdit(snapshotDraft, instruction) : null;
    const useTargeted =
      revisionScope === "targeted" &&
      !!sectionSlice &&
      sectionSlice.excerpt.trim().length > 0 &&
      sectionSlice.excerpt.length <= TARGETED_EDIT_EXCERPT_MAX_CHARS;

    try {
      // Reuse /api/generate (same call as handleRevise)
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: buildConvSummary(),
          outputType: resolvedOt,
          revisionNotes: instruction,
          revisionScope: useTargeted ? "targeted" : "full",
          ...(useTargeted && sectionSlice
            ? { sectionExcerpt: sectionSlice.excerpt }
            : { originalDraft: snapshotDraft }),
          userId: user?.id,
          maxTokens: useTargeted ? 2048 : 4096,
          ...(resolvedOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload && !useTargeted ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: useTargeted ? 45000 : 90000 });

      if (!res.ok) throw new Error(`Proposal error ${res.status}`);
      const data = await res.json();

      // Same response reassembly as handleRevise
      let revised: string;
      if (data.targeted && typeof data.revisedExcerpt === "string" && sectionSlice && useTargeted) {
        const rep = data.revisedExcerpt.trim();
        revised = rep
          ? `${sectionSlice.prefix}${rep}${sectionSlice.suffix ? `\n\n${sectionSlice.suffix}` : ""}`
          : snapshotDraft;
      } else {
        revised = data.content || snapshotDraft;
      }

      // Local word counts and proposal reason
      const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;
      const wordCountBefore = countWords(snapshotDraft);
      const wordCountAfter = countWords(revised);
      const displayLabel = label || instruction;
      const delta = wordCountAfter - wordCountBefore;
      let reason: string;
      if (delta < -50) {
        reason = `${displayLabel}. Cut from ${wordCountBefore} to ${wordCountAfter} words.`;
      } else if (delta > 50) {
        reason = `${displayLabel}. Expanded from ${wordCountBefore} to ${wordCountAfter} words.`;
      } else {
        reason = `${displayLabel}. Word count stayed close to target (${wordCountBefore} → ${wordCountAfter}).`;
      }

      setPendingProposal({
        instruction,
        proposedDraft: revised,
        reason,
        wordCountBefore,
        wordCountAfter,
        originalDraft: snapshotDraft,
      });
    } catch (err: any) {
      toast("Failed to generate proposal. Your draft is unchanged.", "error");
      console.error("[WorkSession][propose]", err);
    } finally {
      setProposalLoading(false);
    }
  }, [draft, pendingProposal, proposalLoading, buildConvSummary, outputType, talkDuration, user?.id, toast, structuredIntakePayload]);

  const handleApplyProposal = useCallback(() => {
    if (!pendingProposal) return;

    const { proposedDraft } = pendingProposal;

    setDraft(proposedDraft);
    setDismissedFlags(new Set());
    setFixedFlags(new Map());

    // Push new version (preserve pre-change state in existing versions)
    const newVersions = [...draftVersions, { content: proposedDraft, label: `Version ${draftVersions.length + 1}` }];
    // FIFO: cap at 10 versions
    while (newVersions.length > 10) newVersions.shift();
    setDraftVersions(newVersions);
    setActiveVersionIdx(newVersions.length - 1);

    setPendingProposal(null);
  }, [pendingProposal, draftVersions]);

  const handleSkipProposal = useCallback(() => {
    setPendingProposal(null);
  }, []);

  // ── CO_029 Failure 6: Draft-stage repair handler ────────────
  const handleDraftRepair = useCallback(async () => {
    if (!draft || !user || !backgroundPipelineRun || draftRepairing || draftRepairAttempts >= 3) return;

    const issues = backgroundPipelineRun.checkpointResults
      .filter(g => g.status !== "PASS")
      .map(g => `[${displayGateName(g.gate)}]: ${g.feedback}`)
      .join("\n");
    if (!issues) return;

    setDraftRepairing(true);
    try {
      const repairOt = catalogOutputTypeForApi(outputType);
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: buildConvSummary(),
          outputType: repairOt,
          originalDraft: draft,
          revisionNotes: `Fix these quality checkpoint issues while preserving the voice and argument:\n\n${issues}`,
          userId: user.id,
          maxTokens: 4096,
          ...(repairOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: 90000 });

      if (!res.ok) throw new Error(`Draft repair error ${res.status}`);
      const data = await res.json();
      const newDraft = data.content;

      if (!newDraft || newDraft.trim() === draft.trim()) {
        toast("No changes detected. Try editing manually.", "info");
        return;
      }

      setDraft(newDraft);
      setDismissedFlags(new Set());
      setFixedFlags(new Map());
      setDraftVersions(prev => {
        const updated = [...prev, { content: newDraft, label: `Version ${prev.length + 1}` }];
        while (updated.length > 10) updated.shift();
        return updated;
      });
      setActiveVersionIdx(prev => Math.min(prev + 1, 9));

      const nextAttempt = draftRepairAttempts + 1;
      setDraftRepairAttempts(nextAttempt);
      setReedActionMessage(nextAttempt >= 3 ? "I've tried three times. Your turn." : "Reed revised the draft. Re-checking quality...");

      // Re-run background pipeline on the new draft
      void handleBackgroundQualityCheck(newDraft);
    } catch (err: any) {
      toast("The repair did not complete. Your draft is unchanged. Try again or edit manually.", "error");
      console.error("[WorkSession][draftRepair]", err);
    } finally {
      setDraftRepairing(false);
    }
  }, [draft, user, backgroundPipelineRun, draftRepairing, draftRepairAttempts, buildConvSummary, outputType, talkDuration, structuredIntakePayload, toast, handleBackgroundQualityCheck]);

  // ── CO_024: Draft-stage conversation handler ────────────────
  const [draftConverseLoading, setDraftConverseLoading] = useState(false);
  const [draftConverseReply, setDraftConverseReply] = useState<string | null>(null);

  const handleDraftConverse = useCallback(async (text: string) => {
    setDraftConverseLoading(true);
    setDraftConverseReply(null);

    const ctx = window.__ewAskReedContext;
    const sessionSummary = ctx
      ? `[DRAFT STAGE — main input, not side panel]\n\nCurrent stage: ${ctx.stage}\nOutput type: ${ctx.outputType}${ctx.draft ? `\nDraft word count: ${ctx.draft.split(/\s+/).length}` : ""}\n\nMain session conversation so far:\n${ctx.conversationSummary}${ctx.draft ? `\n\n---\nCurrent draft (first 2000 chars):\n${ctx.draft.slice(0, 2000)}` : ""}`
      : "[DRAFT STAGE — main input]\n\nNo active session context available.";

    const chatMessages = [
      { role: "user", content: sessionSummary },
      { role: "assistant", content: "Understood. I have full context of the active session and the current draft. What do you need?" },
      { role: "user", content: text },
    ];

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          outputType: catalogOutputTypeForApi(outputType),
          voiceDnaMd,
          userId: user?.id,
          userName: displayName || undefined,
          systemMode: "CONTENT_PRODUCTION",
        }),
      }, { timeout: 30000 });

      if (!res.ok) throw new Error(`Chat error ${res.status}`);
      const data = await res.json();
      const reply = (data.reply ?? "").replace(/\u2014/g, ",").replace(/\u2013/g, ",");
      setDraftConverseReply(reply || "No response received.");
    } catch {
      setDraftConverseReply("Reed couldn't respond. Try again.");
    } finally {
      setDraftConverseLoading(false);
    }
  }, [outputType, voiceDnaMd, user?.id, displayName]);

  const lastAppliedChipRequestIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (stage !== "Edit") return;
    if (!reedChipRequest?.text || typeof reedChipRequest.id !== "number") return;
    if (lastAppliedChipRequestIdRef.current === reedChipRequest.id) return;
    if (generating || applyingSuggestion || pendingProposal || proposalLoading) return;
    lastAppliedChipRequestIdRef.current = reedChipRequest.id;
    // CO_026: Route sidebar Edit chips through propose-before-apply
    void handleProposeRevision(reedChipRequest.text, reedChipRequest.label);
    setReedChipRequest(null);
  }, [stage, reedChipRequest, handleProposeRevision, setReedChipRequest, generating, applyingSuggestion, pendingProposal, proposalLoading]);

  // ── EDIT → REVIEW: Run pipeline ──────────────────────────────
  // ── EDIT: Generate another draft version ─────────────────────
  const handleGenerateVersion = useCallback(async () => {
    if (!draft || generating) return;
    setGenerating(true);
    setGeneratingLabel("Generating another version...");

    try {
      const versionNum = draftVersions.length + 1;
      const variationInstruction = versionNum === 2
        ? "Write a distinctly different version of this content. Change the opening hook, restructure the argument flow, and try a different closing. Same core message, different execution."
        : "Write a third variation. Try a bolder, more unexpected angle. Change the structure significantly. Take a creative risk with the opening.";

      const resolvedOt =
        catalogOutputTypeForApi(outputType);
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: buildConvSummary(),
          outputType: resolvedOt,
          originalDraft: draft,
          revisionNotes: variationInstruction,
          userId: user?.id,
          maxTokens: 4096,
          ...(resolvedOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: 90000 });

      if (!res.ok) throw new Error(`Version error ${res.status}`);
      const data = await res.json();
      const newContent = data.content || "";

      if (newContent) {
        const newVersions = [...draftVersions, { content: newContent, label: `Version ${versionNum}` }];
        setDraftVersions(newVersions);
        setActiveVersionIdx(newVersions.length - 1);
        setDraft(newContent);
      }
    } catch (err: any) {
      toast("Failed to generate another version.", "error");
      console.error("[WorkSession][version]", err);
    } finally {
      setGenerating(false);
    }
  }, [draft, generating, draftVersions, buildConvSummary, outputType, talkDuration, user?.id, toast, structuredIntakePayload]);

  // ── EDIT → REVIEW: Run pipeline ──────────────────────────────
  // ── Format adaptation (parallel with pipeline) ──────────────
  const handleFormatAdaptation = useCallback(async () => {
    if (!draft || !user) return;
    if (selectedFormats.length === 0) {
      setFormatDrafts({});
      return;
    }
    const formatsToAdapt = selectedFormats;
    const initial: Record<string, { content: string; metadata: Record<string, string>; status: "pending" | "generating" | "done" | "error" }> = {};
    formatsToAdapt.forEach(f => { initial[f] = { content: "", metadata: {}, status: "pending" }; });
    setFormatDrafts(initial);

    const promises = formatsToAdapt.map(async (format) => {
      setFormatDrafts(prev => ({ ...prev, [format]: { ...prev[format], status: "generating" } }));
      try {
        const apiFormat = reviewFormatToApiFormat(format);
        const sourceOt =
          catalogOutputTypeForApi(outputType);
        const presMins = outputType === "presentation" ? preWrapPresentationMins : null;
        const talkMins = outputType === "talk" ? talkDuration : null;
        const wrapConstraintSupplement = buildWrapConstraintSupplement(sourceOt, apiFormat, presMins, talkMins);
        const res = await fetchWithRetry(`${API_BASE}/api/adapt-format`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft,
            format: apiFormat,
            voiceDnaMd,
            brandDnaMd,
            userId: user.id,
            wrapConstraintSupplement,
            ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
          }),
        }, { timeout: 60000 });
        if (!res.ok) throw new Error(`Adapt error ${res.status}`);
        const data = await res.json();
        const adapted = typeof data.content === "string" && data.content.trim().length > 0 ? data.content : draft;
        setFormatDrafts(prev => ({ ...prev, [format]: { content: adapted, metadata: data.metadata || {}, status: "done" } }));
      } catch (err) {
        console.error(`[adapt-format] ${format} failed:`, err);
        setFormatDrafts(prev => ({ ...prev, [format]: { content: draft, metadata: {}, status: "error" } }));
      }
    });
    await Promise.allSettled(promises);
  }, [draft, user, selectedFormats, voiceDnaMd, brandDnaMd, outputType, preWrapPresentationMins, talkDuration, structuredIntakePayload]);

  const ensureMethodDnaLint = useCallback(async (draftText: string): Promise<boolean> => {
    const trimmed = draftText.trim();
    if (!trimmed || !user?.id || !methodDnaMd.trim()) return true;

    const fp = draftFingerprintForLint(trimmed);
    if (methodLintSuccessDraftKeyRef.current === fp) return true;

    const coalesced = methodLintCoalesceRef.current;
    if (coalesced?.key === fp) return coalesced.promise;

    const lintUrl = `${API_BASE}/api/method-dna-lint`;

    const promise = (async (): Promise<boolean> => {
      setMethodLintLoading(true);
      setMethodLintInspectorError(null);
      try {
        const healthy = await probeStudioApiReachable(API_BASE, STUDIO_API_HEALTH_TIMEOUT_MS);
        if (!healthy) {
          setMethodLintInspectorError("unreachable");
          return false;
        }

        const res = await fetchWithAuthTimeout(
          lintUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draft: trimmed }),
          },
          METHOD_DNA_LINT_REQUEST_MS,
        );

        if (!res.ok) {
          setMethodLintInspectorError("failed");
          return false;
        }

        let data: { skipped?: boolean; items?: unknown[] };
        try {
          data = await res.json() as { skipped?: boolean; items?: unknown[] };
        } catch {
          setMethodLintInspectorError("failed");
          return false;
        }

        if (data?.skipped) {
          setMethodTermHits([]);
          methodLintSuccessDraftKeyRef.current = fp;
          setMethodLintLastCompletedFp(fp);
          return true;
        }
        const raw = Array.isArray(data?.items) ? data.items : [];
        const hits: MethodTermHit[] = [];
        for (const row of raw) {
          if (!row || typeof row !== "object") continue;
          const r = row as Record<string, unknown>;
          const draftSnippet = String(r.draftSnippet || r.snippet || "").trim().slice(0, 200);
          const genericPhrase = String(r.genericPhrase || r.draftPhrase || r.generic || "").trim().slice(0, 200);
          const methodTerm = String(r.methodTerm || r.likelyIntended || r.expectedTerm || "").trim().slice(0, 200);
          if (!draftSnippet && !genericPhrase) continue;
          hits.push({
            draftSnippet: draftSnippet || genericPhrase,
            genericPhrase: genericPhrase || draftSnippet,
            methodTerm,
          });
        }
        setMethodTermHits(hits);
        methodLintSuccessDraftKeyRef.current = fp;
        setMethodLintLastCompletedFp(fp);
        return true;
      } catch (e) {
        const aborted =
          (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError")
          || (e instanceof Error && e.name === "AbortError");
        if (aborted) {
          setMethodLintInspectorError("timeout");
        } else {
          console.error("[WorkSession][method-dna-lint]", e);
          setMethodLintInspectorError("failed");
        }
        return false;
      } finally {
        setMethodLintLoading(false);
        if (methodLintCoalesceRef.current?.key === fp) {
          methodLintCoalesceRef.current = null;
        }
      }
    })();

    methodLintCoalesceRef.current = { key: fp, promise };
    return promise;
  }, [user?.id, methodDnaMd]);

  const handleRetryMethodLint = useCallback(() => {
    methodLintSuccessDraftKeyRef.current = null;
    setMethodLintInspectorError(null);
    void ensureMethodDnaLint(draft);
  }, [draft, ensureMethodDnaLint]);

  const prevDraftLintFpRef = useRef<string | null>(null);
  useEffect(() => {
    if (!methodDnaMd.trim()) {
      setMethodTermHits([]);
      setMethodLintLastCompletedFp(null);
      setMethodLintInspectorError(null);
      methodLintSuccessDraftKeyRef.current = null;
      prevDraftLintFpRef.current = null;
      return;
    }
    if (prevDraftLintFpRef.current === null) {
      prevDraftLintFpRef.current = draftLintFp;
      return;
    }
    if (prevDraftLintFpRef.current !== draftLintFp) {
      prevDraftLintFpRef.current = draftLintFp;
      setMethodTermHits([]);
      setMethodLintLastCompletedFp(null);
      setMethodLintInspectorError(null);
      methodLintSuccessDraftKeyRef.current = null;
    }
  }, [draftLintFp, methodDnaMd]);

  useEffect(() => {
    if (stage !== "Review" || !pipelineRun || !methodDnaMd.trim() || !(draft || "").trim() || pipelineRunning) return;
    const fp = draftFingerprintForLint(draft);
    if (methodLintSuccessDraftKeyRef.current === fp) return;
    let cancelled = false;
    void (async () => {
      await ensureMethodDnaLint(draft);
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [stage, draft, methodDnaMd, pipelineRunning, pipelineRun, ensureMethodDnaLint]);

  // ── EDIT -> REVIEW: Run pipeline ──────────────────────────────
  const handleRunPipeline = useCallback(async () => {
    setPreWrapPickIds([]);
    setPreWrapAllowSecond(false);
    goToStage("Review");
    if (!draft || !user) return;

    // Start format adaptation in parallel
    handleFormatAdaptation();

    // If background pipeline already completed and user has not edited the draft, use cached results
    if (backgroundPipelineRun && !draftChangedSinceBackground) {
      setPipelineRun(backgroundPipelineRun);
      setHvtAttempts(1);

      // Use the background pipeline's final draft if it differs
      if (backgroundPipelineRun.finalDraft && backgroundPipelineRun.finalDraft !== draft) {
        setDraft(backgroundPipelineRun.finalDraft);
      }

      // Save to Supabase
      const title = outlineRows[0]?.content || messages.find(m => m.role === "user")?.content?.slice(0, 80) || "Untitled";
      const score = backgroundPipelineRun.impactScore?.total ?? 0;
      const outputTypeId = catalogOutputTypeForApi(outputType);

      if (outputId) {
        await supabase.from("outputs").update({
          content: backgroundPipelineRun.finalDraft || draft,
          score: Math.round(score),
          gates: backgroundPipelineRun.checkpointResults || null,
          content_state: score >= 60 ? "vault" : "in_progress",
        }).eq("id", outputId);
      } else {
        const { data: savedOutput } = await supabase.from("outputs").insert({
          user_id: user.id,
          title: title.slice(0, 200),
          content: backgroundPipelineRun.finalDraft || draft,
          output_type: outputTypeId,
          project_id: projectId || undefined,
          score: Math.round(score),
          gates: backgroundPipelineRun.checkpointResults || null,
          content_state: score >= 60 ? "vault" : "in_progress",
        }).select("id").single();
        if (savedOutput?.id) setOutputId(savedOutput.id);
      }
      return;
    }

    // If background pipeline is still running, wait briefly then fall through to full pipeline
    setPipelineRunning(true);
    setPipelineRun(null);

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          outputType: catalogOutputTypeForApi(outputType),
          voiceDnaMd,
          brandDnaMd,
          methodDnaMd,
          userId: user.id,
          outputId: outputId || undefined,
        }),
      }, { timeout: 175000 });

      if (!res.ok) throw new Error(`Pipeline error ${res.status}`);
      const result = await res.json();

      setPipelineRun({
        status: result.status,
        checkpointResults: result.checkpointResults || [],
        impactScore: result.impactScore || null,
        humanVoiceTest: result.humanVoiceTest || null,
        blockedAt: result.blockedAt,
        finalDraft: result.finalDraft,
      });
      setHvtAttempts(1);

      // Use the pipeline's final draft if it differs
      if (result.finalDraft && result.finalDraft !== draft) {
        setDraft(result.finalDraft);
      }

      // Save/update in Supabase
      if (user) {
        const title = outlineRows[0]?.content || messages.find(m => m.role === "user")?.content?.slice(0, 80) || "Untitled";
        const score = result.impactScore?.total ?? 0;
        const outputTypeId = catalogOutputTypeForApi(outputType);

        if (outputId) {
          // Update existing record with pipeline results
          await supabase.from("outputs").update({
            content: result.finalDraft || draft,
            score: Math.round(score),
            gates: result.checkpointResults || null,
            content_state: score >= 60 ? "vault" : "in_progress",
          }).eq("id", outputId);
        } else {
          // Create new record
          const { data: savedOutput } = await supabase.from("outputs").insert({
            user_id: user.id,
            title: title.slice(0, 200),
            content: result.finalDraft || draft,
            output_type: outputTypeId,
            project_id: projectId || undefined,
            score: Math.round(score),
            gates: result.checkpointResults || null,
            content_state: score >= 60 ? "vault" : "in_progress",
          }).select("id").single();

          if (savedOutput?.id) {
            setOutputId(savedOutput.id);
          }
        }
      }

      // Pipeline complete - no toast, results show in Review stage silently
    } catch (err: any) {
      toast("The quality review could not finish. Try again.", "error");
      console.error("[WorkSession][pipeline]", err);
    } finally {
      setPipelineRunning(false);
    }
  }, [draft, user, voiceDnaMd, brandDnaMd, methodDnaMd, outputId, outlineRows, messages, toast, goToStage, handleFormatAdaptation, outputType, projectId, backgroundPipelineRun, draftChangedSinceBackground]);

  // ── REVIEW: Export all (save to Catalog first, then hand off to Wrap) ──
  const handleExportAll = useCallback(async (forcedOutputType?: string | string[]) => {
    const resolvedTypeIds = (() => {
      if (forcedOutputType === undefined) {
        return [outputType ?? "freestyle"];
      }
      const raw = Array.isArray(forcedOutputType) ? forcedOutputType : [forcedOutputType];
      const uniq = [...new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0))];
      return uniq.length > 0 ? uniq : [outputType ?? "freestyle"];
    })();
    const primaryTypeId = resolvedTypeIds[0];

    if (forcedOutputType !== undefined) {
      setOutputType(primaryTypeId);
    }

    const formats: Format[] = selectedFormats;
    const exported: Record<string, boolean> = {};
    formats.forEach(f => { exported[f] = true; });

    let resolvedOutputId = outputId;
    let catalogOk = true;

    if (user?.id && methodDnaMd.trim() && draft.trim()) {
      await ensureMethodDnaLint(draft);
    }

    if (user && draft.trim()) {
      catalogOk = false;
      try {
        const title = outlineRows[0]?.content || messages.find(m => m.role === "user")?.content?.slice(0, 80) || "Untitled";
        const rawScore = Number(pipelineRun?.impactScore?.total ?? 0);
        const scoreVal = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
        const gatesVal = pipelineRun?.checkpointResults ?? null;

        if (outputId) {
          const first = primaryTypeId;
          const { error: upErr } = await supabase.from("outputs").update({
            content: draft,
            content_state: "vault",
            output_type: first,
            score: scoreVal,
            gates: gatesVal,
            project_id: projectId || undefined,
          }).eq("id", outputId).eq("user_id", user.id);
          if (upErr) throw upErr;
          resolvedOutputId = outputId;

          for (let i = 1; i < resolvedTypeIds.length; i++) {
            const tid = resolvedTypeIds[i];
            const { error: insErr } = await supabase.from("outputs").insert({
              user_id: user.id,
              title: title.slice(0, 200),
              content: draft,
              output_type: tid,
              content_state: "vault",
              score: scoreVal,
              gates: gatesVal,
              project_id: projectId || undefined,
            }).select("id");
            if (insErr) throw insErr;
          }
        } else {
          for (let i = 0; i < resolvedTypeIds.length; i++) {
            const tid = resolvedTypeIds[i];
            const { data: rows, error: insErr } = await supabase.from("outputs").insert({
              user_id: user.id,
              title: title.slice(0, 200),
              content: draft,
              output_type: tid,
              content_state: "vault",
              score: scoreVal,
              gates: gatesVal,
              project_id: projectId || undefined,
            }).select("id");
            if (insErr) throw insErr;
            const newId = rows?.[0]?.id as string | undefined;
            if (newId && i === 0) {
              resolvedOutputId = newId;
              setOutputId(newId);
            }
          }
        }
        void deleteRemoteWorkSession(user.id, workSessionProjectKey);
        clearSession();
        publishWorkSessionMeta({ title: "", active: false });
        catalogOk = true;
      } catch (e) {
        console.error("[Export] Supabase save failed:", e);
        const msg =
          e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message.trim()
            : "";
        toast(
          msg
            ? `Could not save to Catalog: ${msg}`
            : "Could not save to Catalog. Check your connection and sign-in. The Wrap screen loads only after this save succeeds.",
          "error",
        );
      }
    }

    if (!catalogOk) return;

    setExportedTabs(exported);
    setAllExported(true);

    try {
      sessionStorage.setItem("ew-wrap-draft", draft || "");
      sessionStorage.setItem("ew-wrap-title", outlineRows[0]?.content || messages.find(m => m.role === "user")?.content?.slice(0, 80) || "Untitled");
      sessionStorage.setItem("ew-wrap-output-type", primaryTypeId);
      if (resolvedTypeIds.length > 1) {
        sessionStorage.setItem("ew-wrap-output-type-ids", JSON.stringify(resolvedTypeIds));
      } else {
        sessionStorage.removeItem("ew-wrap-output-type-ids");
      }
      if (resolvedOutputId) {
        sessionStorage.setItem("ew-wrap-output-id", resolvedOutputId);
      } else {
        sessionStorage.removeItem("ew-wrap-output-id");
      }
      if (resolvedTypeIds.includes("presentation")) {
        sessionStorage.setItem("ew-wrap-presentation-minutes", String(preWrapPresentationMins));
      } else {
        sessionStorage.removeItem("ew-wrap-presentation-minutes");
      }
      if (resolvedTypeIds.includes("talk")) {
        sessionStorage.setItem("ew-wrap-talk-duration", String(talkDuration));
      } else {
        sessionStorage.removeItem("ew-wrap-talk-duration");
      }
      const adaptedContent: Record<string, unknown> = {};
      if (Object.keys(adaptedContent).length > 0) {
        sessionStorage.setItem("ew-wrap-formats", JSON.stringify(adaptedContent));
      } else {
        sessionStorage.removeItem("ew-wrap-formats");
      }
      const wrapChannelPicks = resolvedTypeIds
        .map(id => {
          const match = OUTPUT_TYPES.find(ot => ot.id === id);
          return match?.label ?? id;
        })
        .filter(Boolean);
      if (wrapChannelPicks.length > 0) {
        sessionStorage.setItem("ew-wrap-channel-picks", JSON.stringify(wrapChannelPicks));
      } else {
        sessionStorage.removeItem("ew-wrap-channel-picks");
      }
    } catch (e) {
      console.warn("[Export] sessionStorage write failed:", e);
    }

    nav("/studio/wrap");
  }, [selectedFormats, outputId, nav, draft, user, outlineRows, outputType, pipelineRun, messages, formatDrafts, toast, preWrapPresentationMins, talkDuration, projectId, methodDnaMd, ensureMethodDnaLint, workSessionProjectKey]);

  const handlePreWrapPickFormat = useCallback((id: string) => {
    setPreWrapPickIds(prev => {
      if (!preWrapAllowSecond) {
        if (prev.length === 1 && prev[0] === id) return [];
        return [id];
      }
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length === 0) return [id];
      if (prev.length === 1) return [...prev, id];
      return [prev[0], id];
    });
  }, [preWrapAllowSecond]);

  const handlePreWrapEnableSecond = useCallback(() => {
    setPreWrapAllowSecond(true);
  }, []);

  const handlePreWrapDisableSecond = useCallback(() => {
    setPreWrapAllowSecond(false);
    setPreWrapPickIds(prev => (prev.length > 1 ? [prev[0]] : prev));
  }, []);

  const handleStartWrapFromGate = useCallback(() => {
    const ok =
      (!preWrapAllowSecond && preWrapPickIds.length === 1)
      || (preWrapAllowSecond && preWrapPickIds.length === 2);
    if (!ok) return;
    // CO_029 Failure 5: Resolve template IDs to output_type for downstream
    const resolved = preWrapPickIds.map(id => {
      if (id.startsWith("tmpl:")) {
        const tmplId = id.slice(5);
        const tmpl = userTemplates.find(t => t.id === tmplId);
        return tmpl?.outputType || "freestyle";
      }
      return id;
    });
    void handleExportAll(resolved);
  }, [preWrapAllowSecond, preWrapPickIds, handleExportAll, userTemplates]);

  const reviewChannelTabs = useMemo((): Format[] => selectedFormats, [selectedFormats]);

  const reviewFormatAdaptationComplete = useMemo(
    () =>
      reviewChannelTabs.length === 0
      || reviewChannelTabs.every(t => {
        const fd = formatDrafts[t];
        return fd && (fd.status === "done" || fd.status === "error");
      }),
    [reviewChannelTabs, formatDrafts],
  );

  const showPreWrapOutputGate =
    stage === "Review"
    && !!pipelineRun
    && !pipelineRunning
    && reviewFormatAdaptationComplete
    && !allExported;

  const recommendedWrapOutputId = useMemo(
    () => inferRecommendedWrapOutputId(draft || "", catalogOutputTypeForApi(outputType)),
    [draft, outputType],
  );

  useEffect(() => {
    if (!preWrapPickIds.includes("presentation")) {
      setPreWrapPresentationMins(DEFAULT_PRESENTATION_MINUTES);
    }
  }, [preWrapPickIds]);

  // ── REVIEW: Rerun Human Voice Test only ───────────────────────
  const handleRerunHVT = useCallback(async () => {
    if (!draft || !user || hvtAttempts >= 3) return;
    setHvtRunning(true);

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          outputType: catalogOutputTypeForApi(outputType),
          voiceDnaMd,
          userId: user.id,
          hvtOnly: true,
        }),
      }, { timeout: 60000 });

      if (!res.ok) throw new Error(`HVT rerun error ${res.status}`);
      const result = await res.json();
      const newAttempt = hvtAttempts + 1;
      setHvtAttempts(newAttempt);

      if (result.humanVoiceTest) {
        setPipelineRun(prev => prev ? {
          ...prev,
          humanVoiceTest: result.humanVoiceTest,
          status: prev.impactScore && prev.impactScore.total >= 75 && result.humanVoiceTest.verdict === "PASSES"
            ? "PASSED" : prev.status,
        } : prev);
      }
    } catch (err: any) {
      toast("The Human Voice Test did not complete. Hit Retry, it usually resolves in one attempt.", "error");
      console.error("[WorkSession][hvt-rerun]", err);
    } finally {
      setHvtRunning(false);
    }
  }, [draft, user, hvtAttempts, outputType, voiceDnaMd, toast]);

  // ── REVIEW → EDIT: Send back ──────────────────────────────────
  // ── NEW SESSION: Reset everything ────────────────────────────
  const handleNewSession = useCallback((opts?: { skipRemoteDelete?: boolean }) => {
    clearSession();
    publishWorkSessionMeta({ title: "", active: false });
    if (user?.id && !opts?.skipRemoteDelete) void deleteRemoteWorkSession(user.id, workSessionProjectKey);
    setIntakeComposerSeed(null);
    setMessages([{ role: "reed", content: "Good to see you. What are you working on?" }]);
    setStage("Intake");
    setIntakeBarInput("");
    setIntakeBarPendingFiles([]);
    setOutlineBarInput("");
    setOutlineBarPendingFiles([]);
    setIoTransitionStep(0);
    setIntakeMainFadeOut(false);
    setOutlineEnterActive(false);
    outlineBuildLockRef.current = false;
    setIntakeSending(false);
    setIntakeReady(false);
    setReadySummary("");
    setStructuredIntake(null);
    setOutputType(null);
    setSelectedFormats(DEFAULT_FORMATS);
    setSessionFiles([]);
    setOutlineRows([]);
    setDraft("");
    setGenerating(false);
    setPipelineRun(null);
    setPipelineRunning(false);
    setBackgroundPipelineRun(null);
    setBackgroundPipelineRunning(false);
    setDraftChangedSinceBackground(false);
    backgroundDraftRef.current = "";
    setHvtAttempts(0);
    setHvtRunning(false);
    setAllExported(false);
    setExportedTabs({});
    setMethodTermHits([]);
    setMethodLintLastCompletedFp(null);
    setMethodLintLoading(false);
    setMethodLintInspectorError(null);
    methodLintSuccessDraftKeyRef.current = null;
    methodLintCoalesceRef.current = null;
    prevDraftLintFpRef.current = null;
    setOutputId(null);
    setProjectId(null);
    setDraftVersions([]);
    setActiveVersionIdx(0);
    setPendingProposal(null);
    setProposalLoading(false);
    setDraftConverseLoading(false);
    setDraftConverseReply(null);
    setReedActionMessage(null);
    setDraftRepairAttempts(0);
    setFormatDrafts({});
    setOutlineAngles(null);
    setSelectedAngle("a");
    setPreWrapPickIds([]);
    setPreWrapAllowSecond(false);
    setPreWrapPresentationMins(DEFAULT_PRESENTATION_MINUTES);
    setTalkDuration(DEFAULT_PRESENTATION_MINUTES);
    setTalkLengthDraftInput(String(DEFAULT_PRESENTATION_MINUTES));
    setTalkLengthGatePassed(true);
    setTalkLengthModalOpen(false);
    setSessionNameOverride(null);
    setEditWordTargetOverride(null);
    setEditWordTargetEditorOpen(false);
    setEditWordTargetDraftInput("");
  }, [user?.id, workSessionProjectKey]);

  const handleNewSessionConfirmNo = useCallback(() => {
    setNewSessionParkConfirmOpen(false);
    setNewSessionParkBusy(false);
    handleNewSession();
  }, [handleNewSession]);

  const handleNewSessionConfirmYes = useCallback(async () => {
    if (!user?.id) {
      toast("Sign in to park this in the Pipeline.", "info");
      setNewSessionParkConfirmOpen(false);
      handleNewSession();
      return;
    }
    setNewSessionParkBusy(true);
    try {
      const title = (
        outlineRows[0]?.content?.trim()
        || messages.find(m => m.role === "user")?.content?.slice(0, 80)
        || resolvedSessionTitle
        || "Parked session"
      ).slice(0, 200);
      let content = draft.trim();
      if (!content) {
        const parts = messages
          .filter(m => m.role === "user" || m.role === "reed")
          .map(m => `**${m.role === "reed" ? "Reed" : "You"}**:\n${m.content}`);
        content = parts.join("\n\n").trim();
      }
      if (!content) {
        toast("Nothing to park yet. Starting a new session.", "info");
        setNewSessionParkConfirmOpen(false);
        setNewSessionParkBusy(false);
        handleNewSession();
        return;
      }
      if (content.length > PARKED_OUTPUT_CONTENT_MAX_CHARS) {
        content = content.slice(0, PARKED_OUTPUT_CONTENT_MAX_CHARS);
      }
      const outputTypeId = catalogOutputTypeForApi(outputType) || "freestyle";
      const { error } = await supabase.from("outputs").insert({
        user_id: user.id,
        title,
        content,
        output_type: outputTypeId,
        project_id: projectId ?? undefined,
        score: 0,
        gates: null,
        content_state: "lot",
      });
      if (error) throw error;
      toast("Parked in the Pipeline.", "success");
    } catch (err) {
      console.error("[WorkSession][park-new-session]", err);
      toast("Could not park in the Pipeline. Try again.", "error");
      setNewSessionParkBusy(false);
      return;
    }
    setNewSessionParkBusy(false);
    setNewSessionParkConfirmOpen(false);
    handleNewSession();
  }, [
    user?.id,
    toast,
    outlineRows,
    messages,
    resolvedSessionTitle,
    draft,
    outputType,
    projectId,
    handleNewSession,
  ]);

  const handleCloudRestoreAccept = useCallback(() => {
    if (!restorePromptRow) return;
    const p = rowToPersistedSession(restorePromptRow);
    hydrateFromPersisted(p);
    saveSessionLocalMirror(p);
    setRestorePromptRow(null);
    setRestoreResolved(true);
  }, [restorePromptRow, hydrateFromPersisted]);

  const handleCloudRestoreDecline = useCallback(async () => {
    if (user?.id) await deleteRemoteWorkSession(user.id, workSessionProjectKey);
    handleNewSession({ skipRemoteDelete: true });
    setRestorePromptRow(null);
    setRestoreResolved(true);
  }, [user?.id, workSessionProjectKey, handleNewSession]);

  const clearIntakeComposerSeed = useCallback(() => setIntakeComposerSeed(null), []);

  // ── New Session (top bar) + Watch "Use this" / TheLot signal (once, before paint) ──
  useLayoutEffect(() => {
    const wantsNew = sessionStorage.getItem("ew-new-session") === "1";
    const signalText = sessionStorage.getItem("ew-signal-text");
    const signalDetail = sessionStorage.getItem("ew-signal-detail") ?? "";
    const draftOnly = sessionStorage.getItem("ew-signal-draft-only") === "1";

    if (wantsNew) {
      sessionStorage.removeItem("ew-new-session");
      setNewSessionParkConfirmOpen(true);
    }

    if (!signalText) return;

    if (draftOnly) {
      sessionStorage.removeItem("ew-signal-draft-only");
      sessionStorage.removeItem("ew-signal-text");
      sessionStorage.removeItem("ew-signal-detail");
      const trimmed = signalDetail.trim();
      const prompt = trimmed
        ? `From my Watch briefing:\n\n${signalText}\n\n${trimmed}\n\nHelp me turn this into a sharp piece.`
        : `From my Watch briefing:\n\n${signalText}\n\nHelp me turn this into a sharp piece.`;
      setIntakeComposerSeed(prompt);
      return;
    }

    sessionStorage.removeItem("ew-signal-text");
    sessionStorage.removeItem("ew-signal-detail");
    const detail = signalDetail ? ` ${signalDetail}` : "";
    setMessages([
      { role: "reed", content: "Good to see you. What are you working on?" },
      { role: "user", content: `I want to write about this: ${signalText}.${detail}` },
      { role: "reed", content: "Good signal. Let me shape this into something worth publishing.\n\nTell me more about what you want to say." },
    ]);
  }, []);

  const handleGoBackToEdit = useCallback((instructions: string) => {
    // Clear stale Review data
    setPipelineRun(null);
    setFormatDrafts({});
    setAllExported(false);
    setExportedTabs({});
    setFixingGate(null);
    setRerunningPipeline(false);
    setDismissedFlags(new Set());
    setFixedFlags(new Map());
    setPreWrapPickIds([]);
    setPreWrapAllowSecond(false);

    goToStage("Edit");
    handleRevise(instructions);
  }, [goToStage, handleRevise]);

  // ── REVIEW: Fix a specific improvement card ─────────────────────
  const handleReviewFix = useCallback(async (instruction: string) => {
    if (!draft) throw new Error("No draft to fix");

    const fixOt =
      catalogOutputTypeForApi(outputType);

    try {
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: buildConvSummary(),
          outputType: fixOt,
          originalDraft: draft,
          revisionNotes: `Apply this specific improvement to the draft. Keep everything else the same. Only change what is necessary to address this note: ${instruction}`,
          userId: user?.id,
          maxTokens: 4096,
          ...(fixOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: 90000 });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`Fix error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      if (data.content && data.content !== draft) {
        setDraft(data.content);

        if (activeReviewTab) {
          setFormatDrafts(prev => ({
            ...prev,
            [activeReviewTab]: {
              content: data.content,
              metadata: prev[activeReviewTab]?.metadata || {},
              status: "done" as const,
            },
          }));

          try {
            const apiFormat = reviewFormatToApiFormat(activeReviewTab);
            const sourceOt = catalogOutputTypeForApi(outputType);
            const presMins = outputType === "presentation" ? preWrapPresentationMins : null;
            const talkMins = outputType === "talk" ? talkDuration : null;
            const wrapConstraintSupplement = buildWrapConstraintSupplement(sourceOt, apiFormat, presMins, talkMins);
            const adaptRes = await fetchWithRetry(`${API_BASE}/api/adapt-format`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                draft: data.content,
                format: apiFormat,
                voiceDnaMd,
                brandDnaMd,
                userId: user?.id,
                wrapConstraintSupplement,
                ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
              }),
            }, { timeout: 60000 });
            if (adaptRes.ok) {
              const adaptData = await adaptRes.json();
              const adapted =
                typeof adaptData.content === "string" && adaptData.content.trim().length > 0
                  ? adaptData.content
                  : data.content;
              setFormatDrafts(prev => ({
                ...prev,
                [activeReviewTab]: { content: adapted, metadata: adaptData.metadata || {}, status: "done" as const },
              }));
            }
          } catch { /* Non-critical: format re-adaptation failed, raw draft already shown */ }
        }

        setReedActionMessage("Draft updated.");
      } else {
        setReedActionMessage("No changes detected.");
      }
    } catch (err: any) {
      console.error("[handleReviewFix]", err);
      toast("Reed could not apply the fix. Try again or go back to Draft to edit manually.", "error");
      throw err;
    }
  }, [draft, buildConvSummary, outputType, user?.id, voiceDnaMd, brandDnaMd, activeReviewTab, toast, preWrapPresentationMins, talkDuration, structuredIntakePayload]);

  // ── REVIEW: Instant text replacement (Grammarly-style accept) ──
  const handleDirectReplace = useCallback((original: string, replacement: string) => {
    if (!draft || !original || !replacement) return;

    // Strategy 1: Direct string replacement on the entire draft
    let newDraft = draft;

    if (draft.includes(original)) {
      newDraft = draft.replace(original, replacement);
    } else if (draft.includes(original.trim())) {
      newDraft = draft.replace(original.trim(), replacement);
    } else {
      // Fallback: find the closest matching line
      const lines = draft.split("\n");
      const newLines = lines.map(line => {
        if (line.trim() === original.trim() || (original.length > 20 && line.includes(original.slice(0, 30)))) {
          return replacement;
        }
        return line;
      });
      newDraft = newLines.join("\n");
    }

    if (newDraft !== draft) {
      setDraft(newDraft);

      if (activeReviewTab) {
        setFormatDrafts(prev => ({
          ...prev,
          [activeReviewTab]: {
            content: newDraft,
            metadata: prev[activeReviewTab]?.metadata || {},
            status: "done" as const,
          },
        }));
      }
      setReedActionMessage("Fix applied.");
    } else {
      toast("Could not apply fix. Try using Ask Reed instead.", "info");
    }
  }, [draft, activeReviewTab, toast]);

  // ── REVIEW: Fix a specific checkpoint gate ─────────────────────
  // ── REVIEW: Re-run pipeline (all 7 gates) ──
  const handleRerunPipeline = useCallback(async () => {
    if (!draft || !user) return;
    setRerunningPipeline(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          outputType: catalogOutputTypeForApi(outputType),
          voiceDnaMd,
          brandDnaMd,
          methodDnaMd,
          userId: user.id,
        }),
      }, { timeout: 180000 });

      if (!res.ok) throw new Error(`Pipeline re-run error ${res.status}`);
      const result = await res.json();

      setPipelineRun(prev => {
        const newResults = (result.checkpointResults || []) as CheckpointResult[];
        return {
          status: result.status || prev?.status || "BLOCKED",
          checkpointResults: newResults.length > 0 ? newResults : (prev?.checkpointResults || []),
          impactScore: result.impactScore || prev?.impactScore || null,
          humanVoiceTest: result.humanVoiceTest || prev?.humanVoiceTest || null,
          blockedAt: result.blockedAt || null,
          finalDraft: result.finalDraft || prev?.finalDraft,
        } as PipelineRun;
      });

      setReedActionMessage("Quality pipeline refreshed.");
    } catch (err: any) {
      console.error("[handleRerunPipeline]", err);
      toast("The quality review could not refresh. Try again.", "error");
    } finally {
      setRerunningPipeline(false);
    }
  }, [draft, user, outputType, voiceDnaMd, brandDnaMd, methodDnaMd, toast]);

  // ── REVIEW: Let Reed fix failing gates and refresh the pipeline ──
  const handleRepairPipeline = useCallback(async () => {
    if (!draft || !user || !pipelineRun) return;
    setFixingGate("quality-repair");

    try {
      // Collect feedback from all non-passing gates
      const issues = pipelineRun.checkpointResults
        .filter(g => g.status !== "PASS")
        .map(g => `[${displayGateName(g.gate)}]: ${g.feedback}`)
        .join("\n");

      if (!issues) {
        // All gates pass, just re-run pipeline for a fresh pass
        await handleRerunPipeline();
        return;
      }

      // Revise the draft
      const repairOt =
        catalogOutputTypeForApi(outputType);
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationSummary: buildConvSummary(),
          outputType: repairOt,
          originalDraft: draft,
          revisionNotes: `Fix these quality checkpoint issues while preserving the voice and argument:\n\n${issues}`,
          userId: user.id,
          maxTokens: 4096,
          ...(repairOt === "talk" ? { talkDurationMinutes: talkDuration } : {}),
          ...(structuredIntakePayload ? { structuredIntake: structuredIntakePayload } : {}),
        }),
      }, { timeout: 90000 });

      if (!res.ok) throw new Error(`Fix error ${res.status}`);
      const data = await res.json();
      const newDraft = data.content;

      if (!newDraft || newDraft.trim() === draft.trim()) {
        toast("No changes detected. Try a different approach.");
        return;
      }

      setDraft(newDraft);
      if (activeReviewTab) {
        setFormatDrafts(prev => ({
          ...prev,
          [activeReviewTab]: {
            content: newDraft,
            metadata: prev[activeReviewTab]?.metadata || {},
            status: "done" as const,
          },
        }));
      }

      setFixingGate(null);

      // Count changes
      const oldWords = draft.split(/\s+/).length;
      const newWords = newDraft.split(/\s+/).length;
      const oldParagraphs = draft.split("\n").filter(Boolean).length;
      const newParagraphs = newDraft.split("\n").filter(Boolean).length;

      const changes: string[] = [];
      if (Math.abs(newWords - oldWords) > 10) {
        changes.push(newWords > oldWords ? `added ${newWords - oldWords} words` : `cut ${oldWords - newWords} words`);
      }
      if (oldParagraphs !== newParagraphs) {
        changes.push(`${newParagraphs} paragraphs (was ${oldParagraphs})`);
      }

      const failingGateNames = pipelineRun.checkpointResults
        .filter(g => g.status !== "PASS")
        .map(g => displayGateName(g.gate).toLowerCase());

      setReedActionMessage(
        changes.length > 0
          ? `Reed revised the draft: ${changes.join(", ")}. Addressed: ${failingGateNames.join(", ")}. Running checks again...`
          : `Reed revised the draft to address ${failingGateNames.join(", ")}. Running checks again...`
      );

      // Only re-run the gates that failed, not all 7
      const failedGateNames = pipelineRun?.checkpointResults
        ?.filter(g => g.status === "FAIL" || g.status === "FLAG")
        ?.map(g => g.gate)
        ?.filter(Boolean) || [];

      if (failedGateNames.length > 0) {
        const reRes = await fetchWithRetry(`${API_BASE}/api/run-pipeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: newDraft,
            outputType: catalogOutputTypeForApi(outputType),
            voiceDnaMd,
            brandDnaMd,
            methodDnaMd,
            userId: user.id,
            gateSubset: failedGateNames,
          }),
        }, { timeout: 60000 });

        if (!reRes.ok) throw new Error(`Pipeline re-run error ${reRes.status}`);
        const reResult = await reRes.json();

        setPipelineRun(prev => {
          // Merge: keep passing gates from previous run, update failed gates with new results
          const prevResults = prev?.checkpointResults || [];
          const newResults = (reResult.checkpointResults || []) as CheckpointResult[];
          const merged = prevResults.map(pg => {
            const updated = newResults.find(ng => ng.gate === pg.gate);
            return updated || pg;
          });
          // Add any new results not in previous
          for (const nr of newResults) {
            if (!merged.find(m => m.gate === nr.gate)) {
              merged.push(nr);
            }
          }
          return {
            status: reResult.status || prev?.status || "BLOCKED",
            checkpointResults: merged,
            impactScore: reResult.impactScore || prev?.impactScore || null,
            humanVoiceTest: reResult.humanVoiceTest || prev?.humanVoiceTest || null,
            blockedAt: reResult.blockedAt || null,
            finalDraft: reResult.finalDraft || prev?.finalDraft,
          } as PipelineRun;
        });

        setReedActionMessage("Quality pipeline refreshed.");

        // Update Supabase if we have an output
        if (outputId) {
          const newAggregate = reResult.impactScore?.total ?? pipelineRun?.impactScore?.total ?? 0;
          await supabase.from("outputs").update({
            content: newDraft,
            score: Math.round(newAggregate),
          }).eq("id", outputId);
        }
      } else {
        await handleRerunPipeline();
      }
    } catch (err: any) {
      console.error("[handleRepairPipeline]", err);
      toast("The repair did not complete. Try again or go back to Draft to edit manually.", "error");
    } finally {
      setFixingGate(null);
    }
  }, [draft, user, pipelineRun, buildConvSummary, outputType, talkDuration, toast, activeReviewTab, handleRerunPipeline, voiceDnaMd, brandDnaMd, methodDnaMd, outputId, structuredIntakePayload]);

  const commitEditWordTargetDraft = useCallback(() => {
    const raw = editWordTargetDraftInput.replace(/,/g, "").trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || raw === "") {
      toast("Enter a whole number between 50 and 50000.", "error");
      return;
    }
    setEditWordTargetOverride(clampEditWordTarget(n));
    setEditWordTargetEditorOpen(false);
  }, [editWordTargetDraftInput, toast]);

  // ── CO_025: Memoized draft actions + Reed's Take (single source for Inspector + sidebar) ──
  const memoWordCount = useMemo(() => (draft || "").split(/\s+/).filter(Boolean).length, [draft]);
  const memoTargetWords = useMemo(() => {
    const baseline = baselineEditWordTarget(outputType, talkDuration, preWrapPresentationMins);
    return editWordTargetOverride != null ? editWordTargetOverride : baseline;
  }, [outputType, talkDuration, preWrapPresentationMins, editWordTargetOverride]);
  const memoFlagCounts = useMemo(() => countDraftFlags(draft, dismissedFlags, fixedFlags), [draft, dismissedFlags, fixedFlags]);

  const memoDraftActions = useMemo(() => {
    if (stage !== "Edit" || !draft?.trim()) return null;
    const bgNonPass = backgroundPipelineRun
      ? deriveReviewDisplayGates(backgroundPipelineRun.checkpointResults, backgroundPipelineRun.humanVoiceTest).filter(g => g.status !== "Pass")
      : [];
    const hookGate = backgroundPipelineRun?.checkpointResults.find(cp => cp.gate === "checkpoint-3");
    return getDraftInspectorActions(memoWordCount, memoTargetWords, memoFlagCounts, bgNonPass, hookGate?.status ?? null);
  }, [stage, draft, memoWordCount, memoTargetWords, memoFlagCounts, backgroundPipelineRun]);

  const memoReedTakeText = useMemo(() => {
    if (stage !== "Edit" || !draft?.trim()) return "";
    if (backgroundPipelineRunning) return "Reed is reviewing in the background. Edit freely.";
    const bgNonPass = backgroundPipelineRun
      ? deriveReviewDisplayGates(backgroundPipelineRun.checkpointResults, backgroundPipelineRun.humanVoiceTest).filter(g => g.status !== "Pass")
      : [];
    const hasHardFlags = memoFlagCounts.must > 0 || bgNonPass.length > 0;
    const delta = memoWordCount - memoTargetWords;
    if (hasHardFlags && bgNonPass.length > 0) return `Draft has ${bgNonPass.length} checkpoint flag${bgNonPass.length > 1 ? "s" : ""} to address.`;
    if (hasHardFlags) { const t = memoFlagCounts.must + memoFlagCounts.style; return `Draft has ${t} style flag${t > 1 ? "s" : ""} to address.`; }
    if (delta < -50) return `Draft is ${memoWordCount} words, ${memoTargetWords - memoWordCount} short of target.`;
    if (delta > 50) return `Draft is ${memoWordCount} words, ${memoWordCount - memoTargetWords} over target.`;
    return "Draft is at length and clean. Check the voice match before you finish.";
  }, [stage, draft, memoWordCount, memoTargetWords, memoFlagCounts, backgroundPipelineRun, backgroundPipelineRunning]);

  // Sync derived chips to sidebar via ShellContext (useLayoutEffect = before paint, no visible gap)
  useLayoutEffect(() => {
    if (memoDraftActions) {
      setDraftChips(memoDraftActions.chips.map(c => ({ label: c.label, prefill: c.instruction })));
    } else if (stage !== "Edit") {
      setDraftChips([]);
    }
  }, [memoDraftActions, stage, setDraftChips]);

  // ── Inject dashboard panel ────────────────────────────────────
  useLayoutEffect(() => {
    const dashNode = (() => {
      switch (stage) {
        case "Intake": {
          // CO_031: Session-aware intake feedback instead of static fallback
          const iqCount = messages.filter(m => m.role === "reed" && m.content.trim().endsWith("?")).length;
          let intakeTakeText: string;
          if (intakeReady || iqCount >= 5) {
            intakeTakeText = "Reed has what he needs. Click 'Ready to make an outline' below to continue.";
          } else if (iqCount === 0) {
            intakeTakeText = "Reed is getting to know your idea. Answer a few questions to sharpen the brief.";
          } else {
            intakeTakeText = `Intake in progress. ${iqCount} of ~5 questions answered.`;
          }
          return (
            <DpSection>
              <DpLabel>Reed's Take</DpLabel>
              <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6 }}>{intakeTakeText}</div>
            </DpSection>
          );
        }
        case "Outline":
          return <OutlineDash selectedFormats={selectedFormats} outlineRows={outlineRows} />;
        case "Edit": {
          const wordCount = memoWordCount;
          const targetWords = memoTargetWords;
          const flagCounts = memoFlagCounts;
          const draftActions = memoDraftActions;
          const reedTakeText = memoReedTakeText;
          const hasCatalogOutputType = outputType != null && String(outputType).trim().length > 0;
          const typeLabel = hasCatalogOutputType
            ? outputTypeDisplayLabel(catalogOutputTypeForApi(outputType))
            : "";
          const hasDraftText = (draft || "").trim().length > 0;

          return (
            <>
              {generating && (
                <DpSection>
                  <DpLabel>Reed's Take</DpLabel>
                  <div style={{ fontSize: 11, color: "var(--gold-bright)", lineHeight: 1.6, fontWeight: 500 }}>{generatingLabel}</div>
                </DpSection>
              )}

              {/* CO_025: Reed's Take diagnosis */}
              {!generating && hasDraftText && reedTakeText && (
                <DpSection>
                  <DpLabel>Reed's Take</DpLabel>
                  <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6 }}>{reedTakeText}</div>
                </DpSection>
              )}

              {!generating && hasDraftText && (
                <>
                  {/* Word length lives in Feedback (right), not beside the main-stage CTA */}
                  <DpSection>
                    <DpLabel>Draft length</DpLabel>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                      {wordCount} words
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditWordTargetEditorOpen(prev => {
                          if (!prev) {
                            setEditWordTargetDraftInput(String(targetWords));
                            return true;
                          }
                          return false;
                        });
                      }}
                      style={{
                        width: "100%", textAlign: "left" as const, marginBottom: editWordTargetEditorOpen ? 8 : 3,
                        padding: 0, border: "none", background: "none", cursor: "pointer",
                        fontFamily: FONT,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                        Target: {targetWords} words{hasCatalogOutputType ? "" : " (default)"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: 1.45 }}>
                        {hasCatalogOutputType
                          ? `Set for ${typeLabel}. Tap to adjust.`
                          : "Tap to adjust."}
                      </div>
                    </button>
                    {editWordTargetEditorOpen ? (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input
                          type="number"
                          min={50}
                          max={50000}
                          step={1}
                          className="liquid-glass-input"
                          value={editWordTargetDraftInput}
                          onChange={e => setEditWordTargetDraftInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEditWordTargetDraft();
                            }
                          }}
                          aria-label="Target word count"
                          style={{ width: 100, fontSize: 12, padding: "6px 8px" }}
                        />
                        <button
                          type="button"
                          className="liquid-glass-btn-gold"
                          onClick={commitEditWordTargetDraft}
                          style={{ padding: "6px 12px", fontSize: 10 }}
                        >
                          <span className="liquid-glass-btn-gold-label">Apply</span>
                        </button>
                        <button
                          type="button"
                          className="liquid-glass-btn"
                          onClick={() => setEditWordTargetEditorOpen(false)}
                          style={{ padding: "6px 12px", fontSize: 10 }}
                        >
                          <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Cancel</span>
                        </button>
                      </div>
                    ) : null}
                    <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: "var(--gold)" }}>
                        {wordCount > targetWords ? `+${wordCount - targetWords}` : wordCount < targetWords ? `-${targetWords - wordCount}` : "on target"}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--glass-border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${Math.min(100, (wordCount / Math.max(1, targetWords)) * 100)}%`,
                        background: wordCount > targetWords * 1.2 ? "rgba(245,198,66,0.5)" : "var(--blue, #4A90D9)",
                      }} />
                    </div>
                  </DpSection>

                  <DpSection>
                    <DpLabel>Flags</DpLabel>
                    {(flagCounts.must > 0 || flagCounts.style > 0) ? (
                      <div style={{ display: "flex", gap: 5 }}>
                        {flagCounts.must > 0 && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
                            borderRadius: 4, background: "rgba(245,198,66,0.1)", border: "1px solid rgba(245,198,66,0.35)",
                            fontSize: 10, color: "#9A7030",
                          }}>{flagCounts.must} must fix</div>
                        )}
                        {flagCounts.style > 0 && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
                            borderRadius: 4, background: "rgba(74,144,217,0.08)", border: "1px solid rgba(74,144,217,0.2)",
                            fontSize: 10, color: "var(--blue, #4A90D9)",
                          }}>{flagCounts.style} style</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: "var(--fg-3)" }}>No flags detected</div>
                    )}
                  </DpSection>

                  {backgroundPipelineRun && (() => {
                    const bgNonPass = deriveReviewDisplayGates(
                      backgroundPipelineRun.checkpointResults,
                      backgroundPipelineRun.humanVoiceTest,
                    ).filter(g => g.status !== "Pass");

                    if (bgNonPass.length === 0) {
                      return (
                        <DpSection>
                          <div style={{ fontSize: 10, color: "#22C55E", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>&#10003;</span>
                            <span>Reed has reviewed your draft. No issues found.</span>
                          </div>
                        </DpSection>
                      );
                    }

                    // CO_029 Failure 6: Surface draft-quality flags at Draft stage
                    return (
                      <DpSection>
                        <DpLabel>Draft flags</DpLabel>
                        {bgNonPass.map((g, i) => {
                          const gLower = (g.name || "").toLowerCase();
                          const src = backgroundPipelineRun.checkpointResults.find(cp => {
                            if (gLower.includes("slop")) return cp.gate === "checkpoint-4";
                            if (gLower.includes("dedup")) return cp.gate === "checkpoint-0";
                            if (gLower.includes("human")) return cp.gate === "checkpoint-2";
                            if (gLower.includes("humanization")) return cp.gate === "checkpoint-5" || cp.gate === "checkpoint-3";
                            return false;
                          });
                          const summary = src?.feedback
                            ? src.feedback.length > 120 ? src.feedback.slice(0, 117) + "..." : src.feedback
                            : "";
                          return (
                            <div key={i} style={{
                              marginBottom: 6, padding: "6px 8px", borderRadius: 5,
                              border: `1px solid ${g.status === "Fail" ? "rgba(185,28,28,0.25)" : "rgba(245,198,66,0.3)"}`,
                              background: g.status === "Fail" ? "rgba(185,28,28,0.04)" : "rgba(245,198,66,0.04)",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{
                                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                  background: g.status === "Fail" ? "#b91c1c" : "var(--gold-bright)",
                                }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--fg)" }}>{g.name}</span>
                              </div>
                              {summary && (
                                <div style={{ fontSize: 9, color: "var(--fg-3)", lineHeight: 1.45, marginTop: 3 }}>{summary}</div>
                              )}
                            </div>
                          );
                        })}
                        {draftRepairAttempts >= 3 ? (
                          <>
                            <div style={{
                              marginTop: 6, padding: "8px 10px", borderRadius: 6,
                              border: "1px solid rgba(74,144,217,0.2)",
                              background: "rgba(74,144,217,0.04)",
                              fontSize: 10, color: "var(--fg-2)", lineHeight: 1.5,
                            }}>
                              Reed addressed these three times. Some issues still remain. Edit the draft directly, or continue to Review.
                            </div>
                            <button
                              type="button"
                              className="liquid-glass-btn-gold"
                              onClick={handleRunPipeline}
                              style={{ width: "100%", marginTop: 6, padding: "6px 12px", fontSize: 10, fontFamily: FONT }}
                            >
                              <span className="liquid-glass-btn-gold-label">Continue to Review</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="liquid-glass-btn-gold"
                            onClick={handleDraftRepair}
                            disabled={draftRepairing}
                            style={{
                              width: "100%", marginTop: 4, padding: "6px 12px",
                              fontSize: 10, fontFamily: FONT,
                              opacity: draftRepairing ? 0.6 : 1,
                              cursor: draftRepairing ? "not-allowed" : "pointer",
                            }}
                          >
                            <span className="liquid-glass-btn-gold-label">
                              {draftRepairing ? "Reed is working on it..." : draftRepairAttempts === 0 ? "Let Reed address these" : draftRepairAttempts === 1 ? "Have Reed try again" : "One more attempt"}
                            </span>
                          </button>
                        )}
                      </DpSection>
                    );
                  })()}
                  {backgroundPipelineRunning && (
                    <DpSection>
                      <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ animation: "pulse 1.5s infinite" }}>&#9679;</span>
                        <span>Reed is reviewing your draft...</span>
                      </div>
                    </DpSection>
                  )}
                  {/* CO_029 Failure 8: Persistent Reed action message */}
                  {reedActionMessage && (
                    <DpSection>
                      <div style={{
                        position: "relative",
                        border: "1px solid rgba(74,144,217,0.25)", borderRadius: 8,
                        padding: "8px 28px 8px 10px", background: "rgba(74,144,217,0.04)",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#4A90D9", marginBottom: 4 }}>Reed</div>
                        <div style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.5 }}>{reedActionMessage}</div>
                        <button
                          type="button"
                          onClick={() => setReedActionMessage(null)}
                          aria-label="Dismiss"
                          style={{
                            position: "absolute", top: 4, right: 4,
                            width: 18, height: 18, borderRadius: 4,
                            border: "none", background: "transparent",
                            color: "var(--fg-3)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontFamily: FONT, padding: 0,
                          }}
                        >&times;</button>
                      </div>
                    </DpSection>
                  )}

                  {/* ACTION CHIPS — CO_026: propose-before-apply flow */}

                  {/* CO_026: Proposal loading state */}
                  {proposalLoading && (
                    <DpSection>
                      <div style={{ fontSize: 10, color: "var(--gold-bright)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ animation: "pulse 1.5s infinite" }}>&#9679;</span>
                        <span>Reed is preparing a proposed change...</span>
                      </div>
                    </DpSection>
                  )}

                  {/* CO_026: Pending proposal card */}
                  {pendingProposal && !proposalLoading && (
                    <DpSection>
                      <DpLabel>Proposed change</DpLabel>
                      <div style={{
                        background: "rgba(74,144,217,0.06)",
                        border: "1px solid rgba(74,144,217,0.2)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 8,
                      }}>
                        <div style={{
                          fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6,
                          marginBottom: 8,
                        }}>
                          {pendingProposal.reason}
                        </div>
                        <div style={{
                          fontSize: 10, color: "var(--fg-3)", fontWeight: 500,
                        }}>
                          {pendingProposal.wordCountBefore} → {pendingProposal.wordCountAfter} words
                          {pendingProposal.wordCountAfter !== pendingProposal.wordCountBefore && (
                            <span style={{ color: "var(--gold)", marginLeft: 6 }}>
                              ({pendingProposal.wordCountAfter > pendingProposal.wordCountBefore ? "+" : ""}
                              {pendingProposal.wordCountAfter - pendingProposal.wordCountBefore})
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="liquid-glass-btn-gold"
                          onClick={handleApplyProposal}
                          style={{ padding: "6px 16px", fontSize: 11 }}
                        >
                          <span className="liquid-glass-btn-gold-label">Apply</span>
                        </button>
                        <button
                          type="button"
                          className="liquid-glass-btn"
                          onClick={handleSkipProposal}
                          style={{ padding: "6px 16px", fontSize: 11 }}
                        >
                          <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Skip</span>
                        </button>
                      </div>
                    </DpSection>
                  )}

                  {/* CO_025: Context-aware action chips */}
                  {!pendingProposal && !proposalLoading && draftActions && draftActions.chips.length > 0 && (
                    <ActionChips
                      chips={draftActions.chips.map(c => c.label)}
                      onChipClick={(chipLabel) => {
                        if (pendingProposal || proposalLoading || !draftActions) return;
                        const action = draftActions.chips.find(c => c.label === chipLabel);
                        if (action && stage === "Edit") {
                          void handleProposeRevision(action.instruction, action.label);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </>
          );
        }
        case "Review": {
          return (
            <ReviewDash
              pipelineRun={pipelineRun}
              running={pipelineRunning}
              onExportAll={handleExportAll}
              allExported={allExported}
              onRepairPipeline={handleRepairPipeline}
              fixingGate={fixingGate}
              rerunning={rerunningPipeline}
              hasMethodDna={methodDnaMd.trim().length > 0}
              methodTermHits={methodTermHits}
              methodLintLoading={methodLintLoading}
              methodLintInspectorError={methodLintInspectorError}
              methodLintLastCompletedFp={methodLintLastCompletedFp}
              draftLintFp={draftLintFp}
              onRetryMethodLint={handleRetryMethodLint}
              reedActionMessage={reedActionMessage}
              onDismissReedAction={() => setReedActionMessage(null)}
            />
          );
        }
        default:
          return null;
      }
    })();

    setFeedbackContent(dashNode);
    return () => setFeedbackContent(null);
  }, [
    stage, selectedFormats, selectedTemplate, draft, generating, generatingLabel, messages, intakeReady, outlineRows,
    pipelineRun, pipelineRunning, allExported, outputId,
    hvtAttempts, handleRerunHVT, hvtRunning, outputType, talkDuration, preWrapPresentationMins,
    handleRepairPipeline, fixingGate, handleRerunPipeline, rerunningPipeline,
    prefillReed, handleRevise, handleProposeRevision, handleApplyProposal, handleSkipProposal, handleDraftRepair, draftRepairing, draftRepairAttempts, reedActionMessage, handleRunPipeline, memoDraftActions, memoReedTakeText,
    pendingProposal, proposalLoading,
    activeReviewTab, handleReviewFix, handleExportAll,
    dismissedFlags, fixedFlags, backgroundPipelineRun, backgroundPipelineRunning,
    formatDrafts,
    methodDnaMd, methodTermHits, methodLintLoading, methodLintInspectorError,
    methodLintLastCompletedFp, draftLintFp, handleRetryMethodLint,
    editWordTargetOverride, editWordTargetEditorOpen, editWordTargetDraftInput, commitEditWordTargetDraft,
  ]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const hasUserMessage = messages.some(m => m.role === "user");
  const intakeReedQCount = messages.filter(m => m.role === "reed" && m.content.trim().endsWith("?")).length;
  const intakeTotalQ = 4;
  const intakeProgressValue = Math.min(intakeReedQCount / intakeTotalQ, 1);
  const intakeShowJustWrite = intakeReedQCount < 2 && !(intakeReady || intakeReedQCount >= intakeTotalQ);

  // CO_020 Part 3: Dynamic intake placeholder
  const intakePlaceholder = useMemo(() => {
    if (intakeReady) return "Any changes before I build the outline...";
    const reedMsgs = messages.filter(m => m.role === "reed");
    const lastReed = reedMsgs[reedMsgs.length - 1]?.content?.trim();
    if (!lastReed) return "What's on your mind?";
    const lower = lastReed.toLowerCase();
    if (READINESS_PHRASES.some(p => lower.includes(p))) return "Any changes before I build the outline...";
    const sentences = lastReed.split(/(?<=[.!?])\s+/);
    const lastQuestion = [...sentences].reverse().find(s => s.trim().endsWith("?"));
    if (lastQuestion) return shortenQuestion(lastQuestion.trim());
    return "What's on your mind?";
  }, [messages, intakeReady]);

  const dockIntakeOutlineShell = (stage === "Intake" && hasUserMessage) || stage === "Outline";
  const showOutlineBridgeLoading = stage === "Outline" && buildingOutline && ioTransitionStep === 2;
  const showOutlineMain = stage === "Outline" && !(buildingOutline && ioTransitionStep === 2);
  const outlineMotionOuter = {
    ...(ioTransitionStep === 2
      ? {
          position: "absolute" as const,
          inset: 0,
          minHeight: 0,
          opacity: outlineEnterActive ? 1 : 0,
          transform: outlineEnterActive ? "translateY(0)" : "translateY(8px)",
          transition: `opacity ${IO_OUTLINE_ENTER_MS}ms ${IO_OUTLINE_ENTER_EASE}, transform ${IO_OUTLINE_ENTER_MS}ms ${IO_OUTLINE_ENTER_EASE}`,
        }
      : {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column" as const,
          overflow: "hidden" as const,
          opacity: 1,
          transform: "none" as const,
        }),
  };
  const intakeMainFadeWrap = (() => {
    const base = {
      display: "flex" as const,
      flexDirection: "column" as const,
      opacity: intakeMainFadeOut ? 0 : 1,
      transition: (ioTransitionStep === 1 ? `opacity ${IO_INTAKE_FADE_MS}ms ease` : "none") as const,
    };
    if (stage === "Intake" && ioTransitionStep === 1) {
      return { ...base, position: "absolute" as const, inset: 0, flex: 1, minHeight: 0 };
    }
    return { ...base, position: "relative" as const, width: "100%", flex: 1, minHeight: 0 };
  })();

  const intakeDocked = {
    value: intakeBarInput,
    onChange: setIntakeBarInput,
    pendingFiles: intakeBarPendingFiles,
    onAddPendingFiles: (files: FileList) => {
      setIntakeBarPendingFiles(prev => [...prev, ...Array.from(files)]);
    },
    onRemovePendingFile: (idx: number) => {
      setIntakeBarPendingFiles(prev => prev.filter((_, i) => i !== idx));
    },
    onSend: handleIntakeBarSend,
  };

  return (
    <div style={{
      position: "relative",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT,
      flex: 1,
      minHeight: 0,
      height: "100%",
      overflow: "hidden",
    }}>
      {restorePromptRow ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ew-cloud-restore-title"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(12, 26, 41, 0.55)",
            boxSizing: "border-box",
          }}
        >
          <div
            className="liquid-glass-card"
            style={{
              width: "min(400px, 100%)",
              padding: "20px 20px 16px",
              borderRadius: 14,
              boxShadow: "0 20px 48px rgba(0,0,0,0.22)",
            }}
          >
            <h2 id="ew-cloud-restore-title" style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--fg)" }}>
              Continue saved session?
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55 }}>
              We found in-progress Work for this project from{" "}
              {new Date(restorePromptRow.updated_at).toLocaleString()}. Restore it, or start fresh and discard the cloud copy.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" as const }}>
              <button
                type="button"
                onClick={() => void handleCloudRestoreDecline()}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "transparent",
                  color: "var(--fg-2)",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={handleCloudRestoreAccept}
                className="liquid-glass-btn-gold"
                style={{ padding: "8px 18px", fontSize: 12, fontFamily: FONT }}
              >
                <span className="liquid-glass-btn-gold-label">Restore session</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {newSessionParkConfirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ew-new-session-park-title"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(12, 26, 41, 0.55)",
            boxSizing: "border-box",
          }}
        >
          <div
            className="liquid-glass-card"
            style={{
              width: "min(420px, 100%)",
              padding: "20px 20px 16px",
              borderRadius: 14,
              boxShadow: "0 20px 48px rgba(0,0,0,0.22)",
            }}
          >
            <h2 id="ew-new-session-park-title" style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--fg)" }}>
              New session
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55 }}>
              Would you like to send &ldquo;{resolvedSessionTitle}&rdquo; to the Pipeline and park it for later? Choose Yes to save a copy you can reopen from the Pipeline, or No to start fresh without parking.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" as const }}>
              <button
                type="button"
                disabled={newSessionParkBusy}
                onClick={handleNewSessionConfirmNo}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "transparent",
                  color: "var(--fg-2)",
                  cursor: newSessionParkBusy ? "default" : "pointer",
                  fontFamily: FONT,
                  opacity: newSessionParkBusy ? 0.55 : 1,
                }}
              >
                No
              </button>
              <button
                type="button"
                disabled={newSessionParkBusy}
                onClick={() => void handleNewSessionConfirmYes()}
                className="liquid-glass-btn-gold"
                style={{ padding: "8px 18px", fontSize: 12, fontFamily: FONT, opacity: newSessionParkBusy ? 0.7 : 1 }}
              >
                <span className="liquid-glass-btn-gold-label">{newSessionParkBusy ? "Saving..." : "Yes"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flex: 1,
        minHeight: 0,
      }}>
      {stage === "Intake" && !hasUserMessage && (
        <StageIntake
          messages={messages}
          onSend={handleIntakeSend}
          sending={intakeSending}
          isReady={intakeReady}
          onAdvance={handleBuildOutline}
          userInitials={displayName ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2) : "U"}
          firstName={displayName ? displayName.split(" ")[0] : undefined}
          serializeSessionFiles={formatIntakeFileAttachments}
          onCommitAttachedFiles={files => {
            setSessionFiles(prev => [...prev, ...files.map(f => f.name)]);
          }}
          onNewSession={handleNewSession}
          composerSeed={intakeComposerSeed}
          onConsumeComposerSeed={clearIntakeComposerSeed}
          intakePlaceholder={intakePlaceholder}
        />
      )}
      {dockIntakeOutlineShell && (
        <div style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flex: 1,
          minHeight: 0,
        }}
        >
          <div style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          >
            {stage === "Intake" && (
              <div style={intakeMainFadeWrap}>
                <StageIntake
                  messages={messages}
                  onSend={handleIntakeSend}
                  sending={intakeSending}
                  isReady={intakeReady}
                  onAdvance={handleBuildOutline}
                  userInitials={displayName ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2) : "U"}
                  firstName={displayName ? displayName.split(" ")[0] : undefined}
                  serializeSessionFiles={formatIntakeFileAttachments}
                  onCommitAttachedFiles={files => {
                    setSessionFiles(prev => [...prev, ...files.map(f => f.name)]);
                  }}
                  onNewSession={handleNewSession}
                  composerSeed={intakeComposerSeed}
                  onConsumeComposerSeed={clearIntakeComposerSeed}
                  dockedComposer={intakeDocked}
                  intakePlaceholder={intakePlaceholder}
                />
              </div>
            )}
            {showOutlineBridgeLoading && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                minHeight: 0,
                pointerEvents: "none",
              }}
              >
                <LoadingDots label="Building outline from your conversation..." />
              </div>
            )}
            {showOutlineMain && (
              <div style={outlineMotionOuter}>
                <StageOutline
                  outlineRows={outlineRows}
                  onUpdateRow={(i, v) => setOutlineRows(rows => rows.map((r, idx) => idx === i ? { ...r, content: v } : r))}
                  onAdvance={handleGenerateDraft}
                  building={buildingOutline}
                  angles={outlineAngles}
                  currentAngle={selectedAngle}
                  onSelectAngle={(angle) => {
                    setSelectedAngle(angle);
                    if (outlineAngles) {
                      setOutlineRows(angle === "a" ? [...outlineAngles.a] : [...outlineAngles.b]);
                    }
                  }}
                  omitBottomComposer
                />
              </div>
            )}
          </div>
          <div style={INTAKE_DOCKED_COMPOSER_WRAP}>
            {stage === "Intake" && (
              <div style={{ width: "100%", maxWidth: "clamp(400px, 60vw, 780px)", margin: "0 auto" }}>
                {/* Progress bar: same width as composer, directly above it */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ width: "100%", height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${Math.round(intakeProgressValue * 100)}%`,
                      background: "var(--gold-bright, #F5C642)", borderRadius: 2,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 500, letterSpacing: "0.04em" }}>
                      {intakeReedQCount >= intakeTotalQ
                        ? `${intakeTotalQ} of ${intakeTotalQ} questions answered`
                        : `Question ${Math.min(intakeReedQCount, intakeTotalQ)} of ${intakeTotalQ}`}
                    </span>
                  </div>
                </div>
                {intakeShowJustWrite && (
                  <button
                    type="button"
                    onClick={handleBuildOutline}
                    style={{
                      fontSize: 10, color: "var(--fg-3)", background: "none",
                      border: "none", cursor: "pointer", padding: "2px 0", fontFamily: FONT,
                      marginBottom: 6, textAlign: "left" as const, display: "block",
                    }}
                  >
                    Just write it →
                  </button>
                )}
                <ChatInputBar
                  placeholder={intakePlaceholder}
                  value={intakeBarInput}
                  onChange={setIntakeBarInput}
                  onSend={handleIntakeBarSend}
                  disabled={intakeSending}
                  autoFocus
                  pendingFiles={intakeBarPendingFiles}
                  onAddPendingFiles={files => {
                    setIntakeBarPendingFiles(prev => [...prev, ...Array.from(files)]);
                  }}
                  onRemovePendingFile={idx => {
                    setIntakeBarPendingFiles(prev => prev.filter((_, i) => i !== idx));
                  }}
                />
              </div>
            )}
            {stage === "Outline" && (
              <div style={{ width: "100%", maxWidth: "clamp(400px, 60vw, 780px)", margin: "0 auto" }}>
                <ChatInputBar
                  placeholder="Ask Reed to restructure, or click a section label to compare angles..."
                  value={outlineBarInput}
                  onChange={setOutlineBarInput}
                  onSend={handleOutlineBarSend}
                  disabled={false}
                  autoFocus={false}
                  pendingFiles={outlineBarPendingFiles}
                  onAddPendingFiles={files => {
                    setOutlineBarPendingFiles(prev => [...prev, ...Array.from(files)]);
                  }}
                  onRemovePendingFile={idx => {
                    setOutlineBarPendingFiles(prev => prev.filter((_, i) => i !== idx));
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {stage === "Outline" && talkLengthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="talk-length-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(12,26,41,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: FONT,
          }}
        >
          <div style={{
            width: "min(400px, 100%)",
            borderRadius: 14,
            padding: "22px 22px 18px",
            background: "var(--surface, #fff)",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
          }}
          >
            <h2
              id="talk-length-modal-title"
              style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--fg)" }}
            >
              Talk length
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
              How many minutes should this talk run? Wrap will target about {300} words per minute.
            </p>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 8 }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              min={3}
              max={180}
              step={1}
              value={talkLengthDraftInput}
              onChange={e => setTalkLengthDraftInput(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 120,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--glass-border)",
                fontSize: 15,
                marginBottom: 18,
                fontFamily: FONT,
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="liquid-glass-btn"
                onClick={() => setTalkLengthModalOpen(false)}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                <span className="liquid-glass-btn-label">Cancel</span>
              </button>
              <button
                type="button"
                className="liquid-glass-btn-gold"
                onClick={confirmTalkLengthAndGenerate}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                <span className="liquid-glass-btn-gold-label">Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {stage === "Edit" && (
        <StageEdit
          draft={draft}
          generating={generating}
          generatingLabel={generatingLabel}
          applyingSuggestion={applyingSuggestion}
          proposalLoading={proposalLoading}
          onDraftChange={handleDraftChangeWithTracking}
          onAdvance={handleRunPipeline}
          onRevise={handleRevise}
          onConverse={handleDraftConverse}
          converseLoading={draftConverseLoading}
          converseReply={draftConverseReply}
          hasDraftFlags={
            !!(backgroundPipelineRun && !draftChangedSinceBackground &&
              deriveReviewDisplayGates(backgroundPipelineRun.checkpointResults, backgroundPipelineRun.humanVoiceTest)
                .some(g => g.status !== "Pass"))
          }
          onAdvanceForced={handleRunPipeline}
          versions={draftVersions}
          activeVersionIdx={activeVersionIdx}
          onVersionSelect={(idx) => {
            setActiveVersionIdx(idx);
            setDraft(draftVersions[idx].content);
          }}
          onGenerateVersion={handleGenerateVersion}
          canGenerateMore={draftVersions.length < 10 && !generating}
        />
      )}
      {stage === "Review" && (
        showPreWrapOutputGate ? (
          <PreWrapOutputGate
            pipelineRun={pipelineRun}
            recommendedId={recommendedWrapOutputId}
            selectedIds={preWrapPickIds}
            allowSecondFormat={preWrapAllowSecond}
            onEnableSecondFormat={handlePreWrapEnableSecond}
            onDisableSecondFormat={handlePreWrapDisableSecond}
            onPickFormat={handlePreWrapPickFormat}
            onStartWrap={handleStartWrapFromGate}
            presentationMinutes={preWrapPresentationMins}
            onPresentationMinutesChange={setPreWrapPresentationMins}
            talkDuration={talkDuration}
            onTalkDurationChange={setTalkDuration}
            userTemplates={userTemplates}
          />
        ) : (
          <StageReview
            draft={draft}
            pipelineRun={pipelineRun}
            running={pipelineRunning}
            activeTab={activeReviewTab}
            tabs={reviewChannelTabs}
            onTabClick={(t) => setActiveReviewTab(t)}
            onAdvance={() => handleExportAll()}
            onGoBack={handleGoBackToEdit}
            onFix={handleReviewFix}
            onDirectReplace={handleDirectReplace}
            formatDrafts={formatDrafts}
            showChannelPicker={selectedFormats.length > 1}
          />
        )
      )}
      </div>
    </div>
  );
}
