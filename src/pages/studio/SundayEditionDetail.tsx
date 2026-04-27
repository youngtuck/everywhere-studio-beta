/**
 * SundayEditionDetail.tsx
 * Read-mode view of a Sunday Edition with all 12 deliverable cards.
 * Brand DNA v2.0 styling scoped to this page via CSS variables on wrapper.
 * Phase 1: read-only. Phase 2 adds click-to-edit.
 */
import { useState, useEffect, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useShell } from "../../components/studio/StudioShell";
import "./shared.css";

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "rgba(107,107,107,0.12)", text: "#6B6B6B" },
    ready: { bg: "rgba(237,204,115,0.18)", text: "#B8960A" },
    published: { bg: "rgba(45,140,78,0.12)", text: "#2D8C4E" },
  };
  const c = colors[status] || colors.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const,
      padding: "3px 10px", borderRadius: 3, background: c.bg, color: c.text,
    }}>{status}</span>
  );
}

/** Reads a nested string from the content jsonb. */
function c(content: Record<string, unknown>, ...path: string[]): string {
  let obj: unknown = content;
  for (const key of path) {
    if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[key];
    } else {
      return "";
    }
  }
  return typeof obj === "string" ? obj : "";
}

/** Reads a nested array of strings from the content jsonb. */
function cArr(content: Record<string, unknown>, ...path: string[]): string[] {
  let obj: unknown = content;
  for (const key of path) {
    if (obj && typeof obj === "object" && key in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[key];
    } else {
      return [];
    }
  }
  return Array.isArray(obj) ? obj.filter((v): v is string => typeof v === "string") : [];
}

function Placeholder({ text }: { text: string }) {
  return <span style={{ fontStyle: "italic", color: "var(--ed-slate)", opacity: 0.4 }}>{text}</span>;
}

function Card({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--ed-card)", borderRadius: 4, marginBottom: 24,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(43,52,65,0.08)",
      borderTop: "3px solid var(--ed-honey)",
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

function NoteCard({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      background: "var(--ed-card)", border: "1px solid rgba(43,52,65,0.08)",
      borderRadius: 4, padding: "12px 14px", minHeight: 80,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ed-slate)" }}>
        {text || <Placeholder text="Add note..." />}
      </div>
    </div>
  );
}

function ImagePromptCard({ label, prompt, url }: { label: string; prompt: string; url?: string }) {
  return (
    <div style={{
      background: "var(--ed-card)", border: "1px solid rgba(43,52,65,0.08)",
      borderRadius: 4, padding: "12px 14px", minHeight: 80,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-cornflower)", marginBottom: 6 }}>{label}</div>
      {url && <img src={url} alt={label} style={{ width: "100%", borderRadius: 3, marginBottom: 8, maxHeight: 160, objectFit: "cover" }} />}
      <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ed-slate)" }}>
        {prompt || <Placeholder text="Add image prompt..." />}
      </div>
    </div>
  );
}

function CheckpointBadge({ label, status }: { label: string; status: string }) {
  const bg = status === "pass" ? "rgba(45,140,78,0.1)" : status === "fail" ? "rgba(192,57,43,0.1)" : "rgba(107,107,107,0.06)";
  const color = status === "pass" ? "#2D8C4E" : status === "fail" ? "#C0392B" : "#6B6B6B";
  const text = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "PENDING";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 14px", borderRadius: 4, background: bg, marginBottom: 6,
    }}>
      <span style={{ fontSize: 14, color: "var(--ed-slate)" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color }}>{text}</span>
    </div>
  );
}

const CHECKPOINT_LABELS = [
  "Voice DNA Hard Rules",
  "Verified Claims",
  "Voice Match",
  "7-Second Hook",
  "Zero AI Padding",
  "Publication Grade",
  "SEO Meta Description",
  "Cultural Sensitivity",
];

export default function SundayEditionDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setDashContent, setDashOpen } = useShell();

  const [edition, setEdition] = useState<EditionData | null>(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    setDashOpen(false);
    setDashContent(null);
    return () => setDashContent(null);
  }, [setDashContent, setDashOpen]);

  useEffect(() => {
    if (!id || !user?.id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sunday_editions")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast("Edition not found.", "error");
        nav("/studio/editions");
        return;
      }
      setEdition(data as EditionData);
      setLoading(false);
    })();
  }, [id, user?.id, nav, toast]);

  if (loading || !edition) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const ct = (edition.content || {}) as Record<string, unknown>;
  const checkpoints = (ct.checkpoints && typeof ct.checkpoints === "object" ? ct.checkpoints : {}) as Record<string, boolean>;

  // B-roll images array
  const broll: Array<{ label: string; prompt: string; generatedUrl?: string }> = (() => {
    const raw = ct.brollImages;
    if (!Array.isArray(raw)) return [];
    return raw.map((item: unknown, i: number) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return { label: String(o.label || `IMAGE ${i + 1}`), prompt: String(o.prompt || ""), generatedUrl: o.generatedUrl ? String(o.generatedUrl) : undefined };
      }
      return { label: `IMAGE ${i + 1}`, prompt: "", generatedUrl: undefined };
    });
  })();

  return (
    <div
      style={{
        "--ed-parchment": "#F4EDDD",
        "--ed-slate": "#2B3441",
        "--ed-honey": "#EDCC73",
        "--ed-ink": "#1A1A1A",
        "--ed-cornflower": "#7DA2D2",
        "--ed-card": "#FFFFFF",
      } as React.CSSProperties}
    >
      {/* Honey accent stripe */}
      <div style={{ height: 4, background: "var(--ed-honey)" }} />

      <div style={{
        maxWidth: 860, margin: "0 auto", padding: "28px 20px 48px",
        fontFamily: "'Inter', sans-serif", background: "var(--ed-parchment)", minHeight: "100vh",
      }}>
        {/* Back link */}
        <button
          type="button"
          onClick={() => nav("/studio/editions")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--ed-cornflower)", padding: 0, marginBottom: 20, fontFamily: "inherit" }}
        >
          &larr; All Editions
        </button>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ed-ink)", letterSpacing: "-0.02em", margin: "0 0 6px", lineHeight: 1.2 }}>
            {edition.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: "var(--ed-slate)" }}>{formatDate(edition.created_at)}</span>
            <StatusBadge status={edition.status} />
            <span style={{ fontSize: 14, fontWeight: 600, color: edition.impact_score > 0 ? "var(--ed-honey)" : "var(--ed-slate)", opacity: edition.impact_score > 0 ? 1 : 0.4, marginLeft: "auto" }}>
              {edition.impact_score > 0 ? `${edition.impact_score} / 1000` : "-"}
            </span>
          </div>
        </div>

        {/* Deliverable 1: Substack Article */}
        <Card number="01" title="Substack Article">
          {c(ct, "article", "title") ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ed-ink)", marginBottom: 4 }}>{c(ct, "article", "title")}</div>
              {c(ct, "article", "subtitle") && <div style={{ fontSize: 14, color: "var(--ed-slate)", opacity: 0.7, marginBottom: 16 }}>{c(ct, "article", "subtitle")}</div>}
              <div style={{ whiteSpace: "pre-wrap" }}>{c(ct, "article", "body")}</div>
            </>
          ) : <Placeholder text="Add your article..." />}
        </Card>

        {/* Deliverable 1b: Callout Block */}
        <Card number="01b" title="Callout Block">
          {c(ct, "callout", "primary") ? (
            <>
              <blockquote style={{ borderLeft: "3px solid var(--ed-honey)", paddingLeft: 16, margin: "0 0 12px", fontStyle: "italic", fontSize: 16, lineHeight: 1.7 }}>
                {c(ct, "callout", "primary")}
              </blockquote>
              {c(ct, "callout", "alternate") && (
                <div style={{ fontSize: 14, color: "var(--ed-slate)", opacity: 0.6 }}>Alternate: {c(ct, "callout", "alternate")}</div>
              )}
            </>
          ) : <Placeholder text="Add a callout quote..." />}
        </Card>

        {/* Deliverable 2: Substack Notes */}
        <Card number="02" title="Substack Notes">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <NoteCard label="Launch" text={c(ct, "notes", "launch")} />
            <NoteCard label="Standalone #1" text={c(ct, "notes", "standalone1")} />
            <NoteCard label="Standalone #2" text={c(ct, "notes", "standalone2")} />
            <NoteCard label="Standalone #3" text={c(ct, "notes", "standalone3")} />
            <NoteCard label="Standalone #4" text={c(ct, "notes", "standalone4")} />
            <NoteCard label="Follow-up" text={c(ct, "notes", "followup")} />
          </div>
        </Card>

        {/* Deliverable 3: Podcast Script */}
        <Card number="03" title="Podcast Script">
          {c(ct, "podcast", "script") ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{c(ct, "podcast", "script")}</div>
          ) : <Placeholder text="Add your podcast script..." />}
        </Card>

        {/* Deliverable 4: Hero Image */}
        <Card number="04" title="Hero Image">
          <ImagePromptCard label="Hero 16:9" prompt={c(ct, "heroImage", "prompt")} url={c(ct, "heroImage", "generatedUrl") || undefined} />
        </Card>

        {/* Deliverable 5: B-Roll Images */}
        <Card number="05" title="B-Roll Companion Images">
          {broll.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {broll.map((img, i) => (
                <ImagePromptCard key={i} label={img.label} prompt={img.prompt} url={img.generatedUrl} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <ImagePromptCard key={n} label={`IMAGE ${n}`} prompt="" />
              ))}
            </div>
          )}
        </Card>

        {/* Deliverable 6: Music */}
        <Card number="06" title="Music Brief + Track">
          {c(ct, "music", "brief") ? (
            <>
              {c(ct, "music", "vibe") && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 8 }}>
                  {c(ct, "music", "vibe")}
                </div>
              )}
              <div style={{ whiteSpace: "pre-wrap", marginBottom: 12 }}>{c(ct, "music", "brief")}</div>
              {c(ct, "music", "trackUrl") && (
                <a href={c(ct, "music", "trackUrl")} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "var(--ed-cornflower)", textDecoration: "underline" }}>
                  Listen on Suno
                </a>
              )}
            </>
          ) : <Placeholder text="Add music brief..." />}
        </Card>

        {/* Deliverable 7: Show Notes */}
        <Card number="07" title="Show Notes">
          {c(ct, "showNotes", "description") ? (
            <>
              <div style={{ marginBottom: 12 }}>{c(ct, "showNotes", "description")}</div>
              {cArr(ct, "showNotes", "bullets").length > 0 && (
                <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
                  {cArr(ct, "showNotes", "bullets").map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
                </ul>
              )}
              {cArr(ct, "showNotes", "links").length > 0 && (
                <div>
                  {cArr(ct, "showNotes", "links").map((link, i) => (
                    <div key={i}><a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "var(--ed-cornflower)", textDecoration: "underline" }}>{link}</a></div>
                  ))}
                </div>
              )}
            </>
          ) : <Placeholder text="Add show notes..." />}
        </Card>

        {/* Deliverable 8: Descript Video Script */}
        <Card number="08" title="Descript Video Script">
          {c(ct, "descript", "script") ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{c(ct, "descript", "script")}</div>
          ) : <Placeholder text="Add Descript script..." />}
        </Card>

        {/* Deliverable 9+10: LinkedIn */}
        <Card number="09" title="LinkedIn Native Post + First Comment">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 6 }}>Post Body</div>
            {c(ct, "linkedin", "postBody") ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{c(ct, "linkedin", "postBody")}</div>
            ) : <Placeholder text="Add LinkedIn post..." />}
          </div>
          <div style={{ borderTop: "1px solid rgba(43,52,65,0.08)", paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 6 }}>First Comment</div>
            {c(ct, "linkedin", "firstComment") ? (
              <div>{c(ct, "linkedin", "firstComment")}</div>
            ) : <Placeholder text="Add first comment..." />}
          </div>
        </Card>

        {/* Deliverable 11: SEO */}
        <Card number="11" title="SEO">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 8 }}>Hashtags</div>
            {cArr(ct, "seo", "hashtags").length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cArr(ct, "seo", "hashtags").map((tag, i) => (
                  <span key={i} style={{
                    fontSize: 14, padding: "3px 10px", borderRadius: 4,
                    background: "rgba(43,52,65,0.06)", color: "var(--ed-slate)",
                  }}>{tag}</span>
                ))}
              </div>
            ) : <Placeholder text="Add hashtags..." />}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ed-honey)", marginBottom: 6 }}>Meta Description</div>
            {c(ct, "seo", "metaDescription") ? (
              <div>
                <div>{c(ct, "seo", "metaDescription")}</div>
                <div style={{ fontSize: 14, color: "var(--ed-slate)", opacity: 0.5, marginTop: 4 }}>
                  {c(ct, "seo", "metaDescription").length} / 160 characters
                </div>
              </div>
            ) : <Placeholder text="Add meta description..." />}
          </div>
        </Card>

        {/* Deliverable 12: Checkpoints */}
        <Card number="12" title="Checkpoints">
          {CHECKPOINT_LABELS.map((label, i) => {
            const key = label.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const status = checkpoints[key] === true ? "pass" : checkpoints[key] === false ? "fail" : "pending";
            return <CheckpointBadge key={i} label={label} status={status} />;
          })}
        </Card>
      </div>
    </div>
  );
}
