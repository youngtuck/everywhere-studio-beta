/**
 * SundayEditionDetail.tsx
 * Sunday Edition detail page with click-to-edit, auto-save, and sticky nav.
 * Brand DNA v2.0 styling scoped via CSS variables on wrapper div.
 * Phase 2: all 12 deliverable cards are editable with debounced auto-save.
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useShell } from "../../components/studio/StudioShell";
import { triggerEditionDownload } from "./editionHtmlTemplate";
import { validateText, summarizeViolations, type Violation } from "../../lib/aarValidation";
import "./shared.css";

// ---- Types ----

interface EditionData {
  id: string;
  name: string;
  status: string;
  impact_score: number;
  content: Record<string, unknown>;
  brand_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type SaveState = "idle" | "saving" | "saved" | "failed";

// ---- Helpers ----

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Deep-get a string from nested content object. */
function g(content: Record<string, unknown>, ...path: string[]): string {
  let obj: unknown = content;
  for (const key of path) {
    if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[key];
    } else return "";
  }
  return typeof obj === "string" ? obj : "";
}

/** Deep-get a string array from nested content object. */
function gArr(content: Record<string, unknown>, ...path: string[]): string[] {
  let obj: unknown = content;
  for (const key of path) {
    if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[key];
    } else return [];
  }
  return Array.isArray(obj) ? obj.filter((v): v is string => typeof v === "string") : [];
}

/** Deep-set a value in a content object (immutable, returns new object). */
function setNested(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return obj;
  if (path.length === 1) return { ...obj, [path[0]]: value };
  const key = path[0];
  const child = (obj[key] && typeof obj[key] === "object" ? obj[key] : {}) as Record<string, unknown>;
  return { ...obj, [key]: setNested(child, path.slice(1), value) };
}

function nextCheckpointState(current: boolean | undefined): boolean | undefined {
  if (current === undefined) return true;
  if (current === true) return false;
  return undefined;
}

const DEBOUNCE_MS = 500;

const CHECKPOINT_LABELS = [
  "Voice DNA Hard Rules", "Verified Claims", "Voice Match", "7-Second Hook",
  "Zero AI Padding", "Publication Grade", "SEO Meta Description", "Cultural Sensitivity",
];

const NAV_ITEMS = [
  { id: "editors-note", label: "Note" }, { id: "article", label: "Article" }, { id: "callout", label: "Callout" },
  { id: "notes", label: "Notes" }, { id: "podcast", label: "Podcast" },
  { id: "hero", label: "Hero" }, { id: "broll", label: "B-Roll" },
  { id: "music", label: "Music" }, { id: "shownotes", label: "Show Notes" },
  { id: "descript", label: "Descript" }, { id: "linkedin", label: "LinkedIn" },
  { id: "seo", label: "SEO" }, { id: "checks", label: "Checks" },
];

// ---- Shared field styles ----

const inputBase: React.CSSProperties = {
  width: "100%", border: "1.5px solid var(--ed-honey)", borderRadius: 4,
  outline: "none", background: "rgba(237,204,115,0.04)", color: "var(--ed-slate)",
  fontFamily: "'Inter', sans-serif", padding: "8px 10px", fontSize: 14, lineHeight: "1.7",
};
const hoverEditable: React.CSSProperties = { cursor: "text", borderRadius: 3, transition: "background 0.12s" };

// ---- Reusable sub-components ----

function EditableText({ value, placeholder, fieldPath, multiline, large, onUpdate }: {
  value: string; placeholder: string; fieldPath: string; multiline?: boolean; large?: boolean;
  onUpdate: (path: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = () => { onUpdate(fieldPath, draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); cancel(); } }}
          rows={large ? 12 : 4}
          style={{ ...inputBase, resize: "vertical" as const, minHeight: large ? 200 : 80 }}
        />
      );
    }
    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        style={inputBase}
      />
    );
  }

  return (
    <div
      onClick={() => { setDraft(value); setEditing(true); }}
      style={{ ...hoverEditable, padding: "4px 6px", margin: "-4px -6px" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(237,204,115,0.06)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      {value ? <span style={{ whiteSpace: multiline ? "pre-wrap" : undefined }}>{value}</span> : <span style={{ fontStyle: "italic", color: "var(--ed-slate)", opacity: 0.4 }}>{placeholder}</span>}
    </div>
  );
}

function Card({ id: cardId, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <div id={cardId} style={{
      background: "var(--ed-card)", borderRadius: 4, marginBottom: 24,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(43,52,65,0.08)",
      borderTop: "3px solid var(--ed-honey)", scrollMarginTop: 120,
    }}>
      <div style={{
        background: "var(--ed-slate)", color: "#F4EDDD", padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, opacity: 0.6 }}>{number}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: "24px 24px", fontSize: 14, lineHeight: 1.7, color: "var(--ed-slate)" }}>
        {children}
      </div>
    </div>
  );
}

function CheckpointBadge({ label, status, onClick }: { label: string; status: string; onClick: () => void }) {
  const bg = status === "pass" ? "rgba(45,140,78,0.1)" : status === "fail" ? "rgba(192,57,43,0.1)" : "rgba(107,107,107,0.06)";
  const color = status === "pass" ? "#2D8C4E" : status === "fail" ? "#C0392B" : "#6B6B6B";
  const text = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "PENDING";
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", borderRadius: 4, background: bg, marginBottom: 6, cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontSize: 14, color: "var(--ed-slate)" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color }}>{text}</span>
    </div>
  );
}

function HashtagEditor({ tags, onUpdate }: { tags: string[]; onUpdate: (tags: string[]) => void }) {
  const [input, setInput] = useState("");
  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    const normalized = tag.startsWith("#") ? tag : `#${tag}`;
    if (tags.includes(normalized) || tags.length >= 14) return;
    onUpdate([...tags, normalized]);
    setInput("");
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {tags.map((tag, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, padding: "3px 10px",
            borderRadius: 4, background: "rgba(43,52,65,0.06)", color: "var(--ed-slate)",
          }}>
            {tag}
            <button type="button" onClick={() => onUpdate(tags.filter((_, j) => j !== i))} style={{
              background: "none", border: "none", cursor: "pointer", color: "var(--ed-slate)", opacity: 0.4,
              fontSize: 14, padding: 0, lineHeight: 1,
            }}>&times;</button>
          </span>
        ))}
      </div>
      {tags.length < 14 && (
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); } }}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder="Add hashtag..."
          style={{ ...inputBase, width: 180 }}
        />
      )}
    </div>
  );
}

function ViolationBadge({ violations: vs, fieldPath, onDismiss }: {
  violations: Violation[]; fieldPath: string; onDismiss: (fp: string, sample: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (vs.length === 0) return null;
  const blocks = vs.filter(v => v.severity === "block").length;
  const warns = vs.length - blocks;
  const color = blocks > 0 ? "#C0392B" : "#B8960A";
  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" onClick={() => setExpanded(!expanded)} style={{
        background: "none", border: "none", cursor: "pointer", fontSize: 14,
        color, fontWeight: 600, padding: 0, fontFamily: "inherit",
      }}>
        {blocks > 0 ? `${blocks} block${blocks > 1 ? "s" : ""}` : ""}{blocks > 0 && warns > 0 ? ", " : ""}{warns > 0 ? `${warns} warning${warns > 1 ? "s" : ""}` : ""}
        {expanded ? " -" : " +"}
      </button>
      {expanded && (
        <div style={{ marginTop: 6 }}>
          {vs.map((v, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0",
              borderBottom: "1px solid rgba(43,52,65,0.06)", fontSize: 14,
            }}>
              <span style={{ color: v.severity === "block" ? "#C0392B" : "#B8960A", fontWeight: 700, flexShrink: 0, fontSize: 10, marginTop: 2 }}>
                {v.severity === "block" ? "BLOCK" : "WARN"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--ed-ink)", marginBottom: 2 }}>{v.ruleName}</div>
                <div style={{ color: "var(--ed-slate)", opacity: 0.7, fontSize: 14 }}>"{v.sample}"</div>
                <div style={{ color: "var(--ed-slate)", opacity: 0.5, fontSize: 14, marginTop: 2 }}>{v.message}</div>
                {v.ruleId === "fabrication-flag" && (
                  <button type="button" onClick={() => onDismiss(fieldPath, v.sample)} style={{
                    background: "none", border: "1px solid var(--ed-honey)", borderRadius: 3,
                    padding: "2px 8px", fontSize: 10, color: "var(--ed-slate)", cursor: "pointer",
                    marginTop: 4, fontFamily: "inherit",
                  }}>Verified</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationSummary({ violations: allViolations }: { violations: Map<string, Violation[]> }) {
  const { blocks, warns } = summarizeViolations(allViolations);
  if (blocks === 0 && warns === 0) {
    return <span style={{ fontSize: 14, color: "#2D8C4E", opacity: 0.7 }}>All clear</span>;
  }
  return (
    <span style={{ fontSize: 14, fontWeight: 600 }}>
      {blocks > 0 && <span style={{ color: "#C0392B" }}>{blocks} block{blocks > 1 ? "s" : ""}</span>}
      {blocks > 0 && warns > 0 && <span style={{ color: "var(--ed-slate)", opacity: 0.4 }}>, </span>}
      {warns > 0 && <span style={{ color: "#B8960A" }}>{warns} warning{warns > 1 ? "s" : ""}</span>}
    </span>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const dot = state === "saving" ? "#EDCC73" : state === "saved" ? "#2D8C4E" : "#C0392B";
  const label = state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Save failed";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, color: "var(--ed-slate)", opacity: 0.7 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0, animation: state === "saving" ? "pulse 1s infinite" : undefined }} />
      {label}
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </span>
  );
}

// ---- Main component ----

export default function SundayEditionDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setDashContent, setDashOpen } = useShell();

  const [edition, setEdition] = useState<EditionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeNav, setActiveNav] = useState("article");
  const [violations, setViolations] = useState<Map<string, Violation[]>>(new Map());

  const debounceRef = useRef<number>(0);
  const contentRef = useRef<Record<string, unknown>>({});
  const nameRef = useRef("");
  const statusRef = useRef("draft");
  const savedTimerRef = useRef<number>(0);

  useLayoutEffect(() => {
    setDashOpen(false);
    setDashContent(null);
    return () => setDashContent(null);
  }, [setDashContent, setDashOpen]);

  // Load edition
  useEffect(() => {
    if (!id || !user?.id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sunday_editions").select("*").eq("id", id).single();
      if (error || !data) { toast("Edition not found.", "error"); nav("/studio/editions"); return; }
      const ed = data as EditionData;
      setEdition(ed);
      contentRef.current = ed.content || {};
      nameRef.current = ed.name;
      statusRef.current = ed.status;
      setLoading(false);
    })();
  }, [id, user?.id, nav, toast]);

  // Cleanup debounce on unmount
  useEffect(() => () => { window.clearTimeout(debounceRef.current); window.clearTimeout(savedTimerRef.current); }, []);

  // Scroll-spy
  useEffect(() => {
    const sections = NAV_ITEMS.map(n => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { setActiveNav(e.target.id); break; }
      }
    }, { rootMargin: "-120px 0px -60% 0px", threshold: 0 });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [loading]);

  // Debounced save
  const persistEdition = useCallback(async () => {
    if (!edition) return;
    setSaveState("saving");
    const { error } = await supabase
      .from("sunday_editions")
      .update({ content: contentRef.current, name: nameRef.current, status: statusRef.current, updated_at: new Date().toISOString() })
      .eq("id", edition.id);
    if (error) { setSaveState("failed"); return; }
    setSaveState("saved");
    window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSaveState("idle"), 2000);
  }, [edition]);

  // Validated prose fields
  const VALIDATED_FIELDS = [
    "editorsNote", "article.title", "article.subtitle", "article.body",
    "callout.primary", "callout.alternate",
    "notes.launch", "notes.standalone1", "notes.standalone2", "notes.standalone3", "notes.standalone4", "notes.followup",
    "podcast.script", "showNotes.description", "descript.script",
    "linkedin.postBody", "linkedin.firstComment",
  ];

  const runAllValidation = useCallback(() => {
    const ct = contentRef.current;
    const next = new Map<string, Violation[]>();
    const dismissed = (ct.dismissedFabrications && typeof ct.dismissedFabrications === "object" ? ct.dismissedFabrications : {}) as Record<string, string[]>;
    for (const fp of VALIDATED_FIELDS) {
      const path = fp.split(".");
      let val: unknown = ct;
      for (const k of path) { val = val && typeof val === "object" ? (val as Record<string, unknown>)[k] : undefined; }
      if (typeof val === "string" && val.length > 0) {
        const fieldDismissed = dismissed[fp] || [];
        const v = validateText(val, fieldDismissed);
        if (v.length > 0) next.set(fp, v);
      }
    }
    setViolations(next);
  }, []);

  const scheduleSave = useCallback(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      runAllValidation();
      void persistEdition();
    }, DEBOUNCE_MS);
  }, [persistEdition, runAllValidation]);

  // Content field update
  const updateField = useCallback((fieldPath: string, value: string) => {
    const path = fieldPath.split(".");
    contentRef.current = setNested(contentRef.current, path, value);
    setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
    scheduleSave();
  }, [scheduleSave]);

  // Array field update (for show notes bullets/links stored as line-per-item text)
  const updateArrayField = useCallback((fieldPath: string, text: string) => {
    const path = fieldPath.split(".");
    const arr = text.split("\n").map(s => s.trim()).filter(Boolean);
    contentRef.current = setNested(contentRef.current, path, arr);
    setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
    scheduleSave();
  }, [scheduleSave]);

  // Hashtag update
  const updateHashtags = useCallback((tags: string[]) => {
    contentRef.current = setNested(contentRef.current, ["seo", "hashtags"], tags);
    setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
    scheduleSave();
  }, [scheduleSave]);

  // Checkpoint toggle
  const toggleCheckpoint = useCallback((key: string) => {
    const checks = (contentRef.current.checkpoints && typeof contentRef.current.checkpoints === "object"
      ? { ...(contentRef.current.checkpoints as Record<string, boolean | undefined>) } : {}) as Record<string, boolean | undefined>;
    checks[key] = nextCheckpointState(checks[key]);
    if (checks[key] === undefined) delete checks[key];
    contentRef.current = { ...contentRef.current, checkpoints: checks };
    setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
    scheduleSave();
  }, [scheduleSave]);

  // Name update
  const updateName = useCallback((name: string) => {
    const n = name.trim() || "Untitled Edition";
    nameRef.current = n;
    setEdition(prev => prev ? { ...prev, name: n } : prev);
    scheduleSave();
  }, [scheduleSave]);

  // Status update
  const updateStatus = useCallback((status: string) => {
    // Block-publish intercept
    if (status === "published") {
      runAllValidation();
      const summary = summarizeViolations(violations);
      if (summary.blocks > 0) {
        const override = window.confirm(
          `${summary.blocks} blocking violation${summary.blocks > 1 ? "s" : ""} detected (em dashes). Override and publish anyway?`
        );
        if (!override) return;
        // Log override
        const log = Array.isArray(contentRef.current.override_log) ? [...(contentRef.current.override_log as unknown[])] : [];
        for (const [, vs] of violations) {
          for (const v of vs) {
            if (v.severity === "block") {
              log.push({ rule_id: v.ruleId, count: 1, timestamp: new Date().toISOString(), sample: v.sample });
            }
          }
        }
        contentRef.current = { ...contentRef.current, override_log: log };
      }
    }
    statusRef.current = status;
    setEdition(prev => prev ? { ...prev, status } : prev);
    scheduleSave();
  }, [scheduleSave, runAllValidation, violations]);

  // Dismiss a fabrication flag for a specific field
  const dismissFabrication = useCallback((fieldPath: string, sampleText: string) => {
    const dismissed = (contentRef.current.dismissedFabrications && typeof contentRef.current.dismissedFabrications === "object"
      ? { ...(contentRef.current.dismissedFabrications as Record<string, string[]>) } : {}) as Record<string, string[]>;
    const arr = dismissed[fieldPath] ? [...dismissed[fieldPath]] : [];
    if (!arr.includes(sampleText)) arr.push(sampleText);
    dismissed[fieldPath] = arr;
    contentRef.current = { ...contentRef.current, dismissedFabrications: dismissed };
    setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
    runAllValidation();
    scheduleSave();
  }, [runAllValidation, scheduleSave]);

  // B-roll field update
  const updateBrollField = useCallback((index: number, field: string, value: string) => {
    const raw = Array.isArray(contentRef.current.brollImages) ? [...(contentRef.current.brollImages as unknown[])] : [];
    while (raw.length < 5) raw.push({ label: `IMAGE ${raw.length + 1}`, prompt: "", generatedUrl: "" });
    const item = (raw[index] && typeof raw[index] === "object" ? { ...(raw[index] as Record<string, unknown>) } : { label: `IMAGE ${index + 1}`, prompt: "", generatedUrl: "" });
    item[field] = value;
    raw[index] = item;
    contentRef.current = { ...contentRef.current, brollImages: raw };
    setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
    scheduleSave();
  }, [scheduleSave]);

  // Image upload (base64, 2MB cap)
  const handleImageUpload = useCallback((fieldPath: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast("Image must be under 2MB.", "error"); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const path = fieldPath.split(".");
        contentRef.current = setNested(contentRef.current, path, base64);
        setEdition(prev => prev ? { ...prev, content: contentRef.current } : prev);
        scheduleSave();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [toast, scheduleSave]);

  const handleBrollImageUpload = useCallback((index: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast("Image must be under 2MB.", "error"); return; }
      const reader = new FileReader();
      reader.onload = () => {
        updateBrollField(index, "base64", reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [toast, updateBrollField]);

  // ---- Render ----

  if (loading || !edition) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const ct = (edition.content || {}) as Record<string, unknown>;
  const checkpoints = (ct.checkpoints && typeof ct.checkpoints === "object" ? ct.checkpoints : {}) as Record<string, boolean | undefined>;
  const hashtags = gArr(ct, "seo", "hashtags");
  const metaDesc = g(ct, "seo", "metaDescription");
  const metaLen = metaDesc.length;
  const metaOk = metaLen >= 50 && metaLen <= 160;

  const broll: Array<{ label: string; prompt: string; generatedUrl: string }> = (() => {
    const raw = ct.brollImages;
    if (!Array.isArray(raw)) return Array.from({ length: 5 }, (_, i) => ({ label: `IMAGE ${i + 1}`, prompt: "", generatedUrl: "" }));
    const mapped = raw.map((item: unknown, i: number) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return { label: String(o.label || `IMAGE ${i + 1}`), prompt: String(o.prompt || ""), generatedUrl: String(o.generatedUrl || "") };
      }
      return { label: `IMAGE ${i + 1}`, prompt: "", generatedUrl: "" };
    });
    while (mapped.length < 5) mapped.push({ label: `IMAGE ${mapped.length + 1}`, prompt: "", generatedUrl: "" });
    return mapped;
  })();

  return (
    <div style={{ "--ed-parchment": "#F4EDDD", "--ed-slate": "#2B3441", "--ed-honey": "#EDCC73", "--ed-ink": "#1A1A1A", "--ed-cornflower": "#7DA2D2", "--ed-card": "#FFFFFF" } as React.CSSProperties}>
      <div style={{ height: 4, background: "var(--ed-honey)" }} />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 48px", fontFamily: "'Inter', sans-serif", background: "var(--ed-parchment)" }}>
        {/* Back */}
        <button type="button" onClick={() => nav("/studio/editions")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--ed-cornflower)", padding: 0, marginBottom: 20, fontFamily: "inherit" }}>
          &larr; All Editions
        </button>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <EditableText value={edition.name} placeholder="Untitled Edition" fieldPath="__name__" multiline={false} onUpdate={(_, val) => updateName(val)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: "var(--ed-slate)" }}>{formatDate(edition.created_at)}</span>
          <select
            value={edition.status}
            onChange={e => updateStatus(e.target.value)}
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(43,52,65,0.15)", background: "transparent", color: "var(--ed-slate)", cursor: "pointer", fontFamily: "inherit" }}
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
          </select>
          <span style={{ fontSize: 14, fontWeight: 600, color: edition.impact_score > 0 ? "var(--ed-honey)" : "var(--ed-slate)", opacity: edition.impact_score > 0 ? 1 : 0.4, marginLeft: "auto" }}>
            {edition.impact_score > 0 ? `${edition.impact_score} / 1000` : "-"}
          </span>
          <SaveIndicator state={saveState} />
          <button
            type="button"
            onClick={() => { triggerEditionDownload(edition); toast("Edition downloaded."); }}
            style={{
              background: "var(--ed-ink)", color: "var(--ed-honey)", border: "none",
              padding: "6px 14px", borderRadius: 3, cursor: "pointer", fontSize: 10,
              fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const,
              fontFamily: "inherit",
            }}
          >Download</button>
          <ValidationSummary violations={violations} />
        </div>

        {/* Sticky nav */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50, background: "var(--ed-slate)",
          display: "flex", gap: 0, overflowX: "auto", borderRadius: 4, marginBottom: 24,
          scrollbarWidth: "none" as const,
        }}>
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => document.getElementById(n.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{
                background: "none", border: "none", cursor: "pointer", flexShrink: 0,
                padding: "10px 10px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase" as const, fontFamily: "inherit", whiteSpace: "nowrap",
                color: activeNav === n.id ? "#F4EDDD" : "rgba(244,237,221,0.5)",
                borderBottom: activeNav === n.id ? "2px solid var(--ed-honey)" : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >{n.label}</button>
          ))}
        </div>

        {/* Editor's Note */}
        <Card id="editors-note" number="00" title="Editor's Note">
          <EditableText value={g(ct, "editorsNote")} placeholder="Add editor's note..." fieldPath="editorsNote" multiline large onUpdate={updateField} />
          {violations.has("editorsNote") && <ViolationBadge violations={violations.get("editorsNote")!} fieldPath="editorsNote" onDismiss={dismissFabrication} />}
        </Card>

        {/* 01: Substack Article */}
        <Card id="article" number="01" title="Substack Article">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Title</div>
            <EditableText value={g(ct, "article", "title")} placeholder="Add title..." fieldPath="article.title" onUpdate={updateField} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Subtitle</div>
            <EditableText value={g(ct, "article", "subtitle")} placeholder="Add subtitle..." fieldPath="article.subtitle" onUpdate={updateField} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Body</div>
            <EditableText value={g(ct, "article", "body")} placeholder="Add your article..." fieldPath="article.body" multiline large onUpdate={updateField} />
            {violations.has("article.body") && <ViolationBadge violations={violations.get("article.body")!} fieldPath="article.body" onDismiss={dismissFabrication} />}
          </div>
        </Card>

        {/* 01b: Callout Block */}
        <Card id="callout" number="01b" title="Callout Block">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Primary</div>
            <EditableText value={g(ct, "callout", "primary")} placeholder="Add primary quote..." fieldPath="callout.primary" multiline onUpdate={updateField} />
            {violations.has("callout.primary") && <ViolationBadge violations={violations.get("callout.primary")!} fieldPath="callout.primary" onDismiss={dismissFabrication} />}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Alternate</div>
            <EditableText value={g(ct, "callout", "alternate")} placeholder="Add alternate..." fieldPath="callout.alternate" multiline onUpdate={updateField} />
          </div>
        </Card>

        {/* 02: Substack Notes */}
        <Card id="notes" number="02" title="Substack Notes">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(["launch", "standalone1", "standalone2", "standalone3", "standalone4", "followup"] as const).map((key, i) => {
              const labels = ["Launch", "Standalone #1", "Standalone #2", "Standalone #3", "Standalone #4", "Follow-up"];
              return (
                <div key={key} style={{ background: "var(--ed-card)", border: "1px solid rgba(43,52,65,0.08)", borderRadius: 4, padding: "12px 14px", minHeight: 80 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 6 }}>{labels[i]}</div>
                  <EditableText value={g(ct, "notes", key)} placeholder="Add note..." fieldPath={`notes.${key}`} multiline onUpdate={updateField} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* 03: Podcast Script */}
        <Card id="podcast" number="03" title="Podcast Script">
          <EditableText value={g(ct, "podcast", "script")} placeholder="Add your podcast script..." fieldPath="podcast.script" multiline large onUpdate={updateField} />
          {violations.has("podcast.script") && <ViolationBadge violations={violations.get("podcast.script")!} fieldPath="podcast.script" onDismiss={dismissFabrication} />}
        </Card>

        {/* 04: Hero Image */}
        <Card id="hero" number="04" title="Hero Image">
          {(g(ct, "heroImage", "base64") || g(ct, "heroImage", "generatedUrl")) && (
            <img src={g(ct, "heroImage", "base64") || g(ct, "heroImage", "generatedUrl")} alt="Hero" style={{ width: "100%", borderRadius: 4, marginBottom: 12, maxHeight: 300, objectFit: "cover" }} />
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => handleImageUpload("heroImage.base64")} style={{ ...inputBase, width: "auto", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Upload image</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-cornflower)", marginBottom: 4 }}>Prompt</div>
            <EditableText value={g(ct, "heroImage", "prompt")} placeholder="Add image prompt..." fieldPath="heroImage.prompt" multiline onUpdate={updateField} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-cornflower)", marginBottom: 4 }}>Image URL (fallback)</div>
            <EditableText value={g(ct, "heroImage", "generatedUrl")} placeholder="Paste image URL..." fieldPath="heroImage.generatedUrl" onUpdate={updateField} />
          </div>
        </Card>

        {/* 05: B-Roll Images */}
        <Card id="broll" number="05" title="B-Roll Companion Images">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {broll.map((img, i) => (
              <div key={i} style={{ background: "var(--ed-card)", border: "1px solid rgba(43,52,65,0.08)", borderRadius: 4, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-cornflower)", marginBottom: 6 }}>{img.label}</div>
                {(img.generatedUrl || (ct.brollImages && Array.isArray(ct.brollImages) && (ct.brollImages[i] as Record<string, unknown>)?.base64)) && (
                  <img src={String((ct.brollImages && Array.isArray(ct.brollImages) && (ct.brollImages[i] as Record<string, unknown>)?.base64) || img.generatedUrl)} alt={img.label} style={{ width: "100%", borderRadius: 3, marginBottom: 6, maxHeight: 120, objectFit: "cover" }} />
                )}
                <button type="button" onClick={() => handleBrollImageUpload(i)} style={{ background: "none", border: "1px solid var(--ed-honey)", borderRadius: 3, padding: "3px 8px", fontSize: 10, color: "var(--ed-slate)", cursor: "pointer", marginBottom: 6, fontFamily: "inherit" }}>Upload</button>
                <EditableText value={img.prompt} placeholder="Add prompt..." fieldPath={`brollImages.${i}.prompt`} multiline onUpdate={(_, val) => updateBrollField(i, "prompt", val)} />
                <div style={{ marginTop: 6 }}>
                  <EditableText value={img.generatedUrl} placeholder="Paste URL..." fieldPath={`brollImages.${i}.generatedUrl`} onUpdate={(_, val) => updateBrollField(i, "generatedUrl", val)} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 06: Music */}
        <Card id="music" number="06" title="Music Brief + Track">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Vibe</div>
            <EditableText value={g(ct, "music", "vibe")} placeholder="Add vibe..." fieldPath="music.vibe" onUpdate={updateField} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Suno Prompt</div>
            <EditableText value={g(ct, "music", "brief")} placeholder="Add Suno prompt..." fieldPath="music.brief" multiline onUpdate={updateField} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Track URL</div>
            <EditableText value={g(ct, "music", "trackUrl")} placeholder="Paste track URL..." fieldPath="music.trackUrl" onUpdate={updateField} />
            {g(ct, "music", "trackUrl") && (
              <a href={g(ct, "music", "trackUrl")} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "var(--ed-cornflower)", textDecoration: "underline", display: "inline-block", marginTop: 4 }}>Listen on Suno</a>
            )}
          </div>
        </Card>

        {/* 07: Show Notes */}
        <Card id="shownotes" number="07" title="Show Notes">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Description</div>
            <EditableText value={g(ct, "showNotes", "description")} placeholder="Add description..." fieldPath="showNotes.description" multiline onUpdate={updateField} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Bullets (one per line)</div>
            <EditableText value={gArr(ct, "showNotes", "bullets").join("\n")} placeholder="One bullet per line..." fieldPath="showNotes.bullets" multiline onUpdate={(path, val) => updateArrayField(path, val)} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Links (one per line)</div>
            <EditableText value={gArr(ct, "showNotes", "links").join("\n")} placeholder="One link per line..." fieldPath="showNotes.links" multiline onUpdate={(path, val) => updateArrayField(path, val)} />
          </div>
        </Card>

        {/* 08: Descript Video Script */}
        <Card id="descript" number="08" title="Descript Video Script">
          <EditableText value={g(ct, "descript", "script")} placeholder="Add Descript script..." fieldPath="descript.script" multiline large onUpdate={updateField} />
          {violations.has("descript.script") && <ViolationBadge violations={violations.get("descript.script")!} fieldPath="descript.script" onDismiss={dismissFabrication} />}
        </Card>

        {/* 09+10: LinkedIn */}
        <Card id="linkedin" number="09" title="LinkedIn Native Post + First Comment">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Post Body</div>
            <EditableText value={g(ct, "linkedin", "postBody")} placeholder="Add LinkedIn post..." fieldPath="linkedin.postBody" multiline large onUpdate={updateField} />
            {violations.has("linkedin.postBody") && <ViolationBadge violations={violations.get("linkedin.postBody")!} fieldPath="linkedin.postBody" onDismiss={dismissFabrication} />}
          </div>
          <div style={{ borderTop: "1px solid rgba(43,52,65,0.08)", paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>First Comment</div>
            <EditableText value={g(ct, "linkedin", "firstComment")} placeholder="Add first comment..." fieldPath="linkedin.firstComment" multiline onUpdate={updateField} />
          </div>
        </Card>

        {/* 11: SEO */}
        <Card id="seo" number="11" title="SEO">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 8 }}>Hashtags</div>
            <HashtagEditor tags={hashtags} onUpdate={updateHashtags} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 4 }}>Meta Description</div>
            <EditableText value={metaDesc} placeholder="Add meta description..." fieldPath="seo.metaDescription" multiline onUpdate={updateField} />
            {metaDesc && (
              <div style={{ fontSize: 14, color: metaOk ? "#2D8C4E" : "var(--ed-honey)", opacity: 0.7, marginTop: 4 }}>
                {metaLen} / 160 characters {metaOk ? "" : metaLen < 50 ? "(under 50)" : "(over 160)"}
              </div>
            )}
          </div>
        </Card>

        {/* 12: Checkpoints */}
        <Card id="checks" number="12" title="Checkpoints">
          {CHECKPOINT_LABELS.map((label, i) => {
            const key = label.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const status = checkpoints[key] === true ? "pass" : checkpoints[key] === false ? "fail" : "pending";
            return <CheckpointBadge key={i} label={label} status={status} onClick={() => toggleCheckpoint(key)} />;
          })}
        </Card>
      </div>
    </div>
  );
}
