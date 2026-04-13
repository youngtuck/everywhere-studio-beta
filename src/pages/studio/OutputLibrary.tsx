/**
 * OutputLibrary.tsx — The Catalog
 * Phase 6: fully wired to Supabase outputs table.
 * Selecting a session opens detail in dashboard panel.
 * "Reopen in Work" navigates to WorkSession with session state.
 */
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useShell } from "../../components/studio/StudioShell";
import { useMobile } from "../../hooks/useMobile";
import { timeAgo } from "../../utils/timeAgo";
import "./shared.css";

const FONT = "var(--font)";

interface OutputRow {
  id: string;
  title: string;
  output_type: string;
  score: number;
  created_at: string;
  updated_at?: string;
  content?: string;
  content_state?: string;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}.${String(d.getFullYear()).slice(2)}`;
}

function formatFullDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function outputTypeToLabel(t: string): string {
  const map: Record<string, string> = {
    essay: "Essay", newsletter: "Newsletter", socials: "LinkedIn Post",
    podcast: "Podcast Script", presentation: "Presentation",
    video_script: "Video Script", business: "Business", book: "Book",
    freestyle: "Freestyle", sunday_story: "Sunday Story",
  };
  return map[t] || t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function scoreColor(score: number): string {
  if (score >= 90) return "var(--blue)";
  if (score >= 70) return "var(--gold)";
  return "var(--fg-3)";
}

// ── Session detail dashboard panel ────────────────────────────
function SessionDetailPanel({
  output, onReopen, onOpenInWrap, onDelete, onBack,
}: {
  output: OutputRow;
  onReopen: () => void;
  onOpenInWrap: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const formats = [outputTypeToLabel(output.output_type)];

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--fg-3)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", padding: 0, marginBottom: 12 }}
      >
        <svg style={{ width: 14, height: 14, stroke: "currentColor", strokeWidth: 2, fill: "none" }} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>
      <div className="liquid-glass-card" style={{ padding: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 4 }}>
            {formatFullDate(output.created_at)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", marginBottom: 10, lineHeight: 1.4 }}>{output.title}</div>

          {output.score > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: "var(--fg-3)" }}>Impact Score</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(output.score) }}>{output.score}%</span>
            </div>
          )}

          {formats.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: 8, marginBottom: 4 }}>
              <svg style={{ width: 12, height: 12, stroke: "var(--blue)", strokeWidth: 1.75, fill: "none", flexShrink: 0 }} viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontSize: 10, color: "var(--fg-2)", flex: 1 }}>{f}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => { if (output.content) navigator.clipboard.writeText(output.content).catch(() => {}); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (output.content) navigator.clipboard.writeText(output.content).catch(() => {}); } }}
                style={{ fontSize: 9, color: "var(--blue)", cursor: "pointer", fontWeight: 600, position: "relative", zIndex: 1 }}
              >Copy</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 8 }}>Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button type="button" className="liquid-glass-btn" onClick={onReopen} style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px" }}>
              <span className="liquid-glass-btn-label" style={{ color: "var(--fg-2)", fontWeight: 600 }}>Reopen in Work</span>
            </button>
            <button
              type="button"
              className="liquid-glass-btn-gold"
              onClick={onOpenInWrap}
              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px" }}
            >
              <span className="liquid-glass-btn-gold-label">Send to Wrap</span>
            </button>
            <button type="button" onClick={onDelete} style={{ width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", fontSize: 11, color: "var(--danger)", cursor: "pointer", fontFamily: FONT }}>
              Delete session
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function OutputLibrary() {
  const nav = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setDashContent, setDashOpen, setFeedbackContent } = useShell();

  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setFeedbackContent(null);
  }, [setFeedbackContent]);

  // Load outputs from Supabase
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("outputs")
        .select("id, title, output_type, score, created_at, updated_at, content_state")
        .eq("user_id", user.id)
        .in("content_state", ["vault", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);
      setOutputs((data as OutputRow[]) || []);
      if (data && data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    })();
  }, [user]);

  // Load content for selected output (for copy)
  const [selectedContent, setSelectedContent] = useState<string>("");
  useEffect(() => {
    if (!selectedId || !user) return;
    supabase.from("outputs").select("content").eq("id", selectedId).single().then(
      ({ data }) => { setSelectedContent(data?.content || ""); },
      (err) => console.error("Failed to load output content:", err)
    );
  }, [selectedId, user]);

  const selectedOutput = outputs.find(o => o.id === selectedId) ?? null;

  const handleReopen = useCallback(() => {
    if (!selectedOutput) return;
    // Store session context and navigate to work
    sessionStorage.setItem("ew-reopen-output-id", selectedOutput.id);
    sessionStorage.setItem("ew-reopen-title", selectedOutput.title);
    nav("/studio/work");
  }, [selectedOutput, nav]);

  const handleOpenInWrap = useCallback(() => {
    if (!selectedOutput) return;
    sessionStorage.setItem("ew-wrap-from-catalog-id", selectedOutput.id);
    nav("/studio/wrap");
  }, [selectedOutput, nav]);

  const handleDelete = useCallback(async () => {
    if (!selectedOutput || !user) return;
    const confirmed = window.confirm(`Delete "${selectedOutput.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("outputs").delete().eq("id", selectedOutput.id).eq("user_id", user.id);
      if (error) throw error;
      setOutputs(prev => prev.filter(o => o.id !== selectedOutput.id));
      setSelectedId(null);
      toast("Session deleted.");
    } catch (err) {
      console.error("Failed to delete output:", err);
      toast("Failed to delete session. Please try again.");
    }
  }, [selectedOutput, user, toast]);

  // Dashboard panel
  useLayoutEffect(() => {
    if (selectedOutput) {
      setDashContent(
        <SessionDetailPanel
          output={{ ...selectedOutput, content: selectedContent }}
          onReopen={handleReopen}
          onOpenInWrap={handleOpenInWrap}
          onDelete={handleDelete}
          onBack={() => setSelectedId(null)}
        />
      );
    } else {
      setDashContent(
        <div className="liquid-glass-card" style={{ padding: 16, fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6 }}>
          Select a session to see its files.
        </div>
      );
    }
    return () => setDashContent(null);
  }, [selectedOutput, selectedContent, handleReopen, handleOpenInWrap, handleDelete, setDashContent]);

  useEffect(() => {
    if (selectedOutput) setDashOpen(true);
  }, [selectedOutput, setDashOpen]);

  const filtered = outputs.filter(o =>
    !search || o.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: FONT }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
          padding: "14px 20px 16px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%",
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
              Library
            </div>
            <div style={{ fontSize: "clamp(18px, 2.2vw, 22px)", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>The Catalog</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5, marginTop: 6, maxWidth: 460 }}>
              Saved drafts and exports from Work and Wrap. Select a row for actions below and in the Inspector, or use Send to Wrap for channel versions.
            </div>
          </div>
          <div className="liquid-glass-card" style={{ flexShrink: 0, padding: "10px 14px", borderRadius: 14, textAlign: "center" as const, minWidth: 72 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{outputs.length}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>Sessions</div>
          </div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "16px 14px 20px" : "18px 20px 24px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1, minHeight: 0 }}>
      {/* Search */}
      {outputs.length > 6 && (
        <input
          className="liquid-glass-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions..."
          style={{ width: "100%", marginBottom: 12, fontSize: 12, boxSizing: "border-box" as const }}
        />
      )}

      {loading ? (
        <div className="liquid-glass-card" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: i < 4 ? "1px solid var(--glass-border)" : "none" }}>
              <div style={{ width: 48, height: 10, background: "var(--bg-2)", borderRadius: 3 }} />
              <div style={{ flex: 1, height: 12, background: "var(--bg-2)", borderRadius: 3 }} />
            </div>
          ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass-card" style={{ textAlign: "center" as const, padding: "40px 24px", color: "var(--fg-3)", fontSize: 13 }}>
          {search ? "No sessions match your search." : "No sessions yet. Complete a Work session to see it here."}
        </div>
      ) : (
        <div className="liquid-glass" style={{ borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--glass-border)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>
            Recent
          </div>
          <div style={{ padding: 6 }}>
            {filtered.map((output) => {
              const active = selectedId === output.id;
              return (
                <button
                  key={output.id}
                  type="button"
                  onClick={() => setSelectedId(output.id)}
                  className={active ? "liquid-glass-card" : ""}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%",
                    textAlign: "left" as const,
                    padding: "12px 14px",
                    marginBottom: 4,
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: FONT,
                    border: active ? "1px solid rgba(245,198,66,0.35)" : "1px solid transparent",
                    background: active ? "rgba(245,198,66,0.08)" : "rgba(255,255,255,0.02)",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "var(--fg-3)", flexShrink: 0, fontVariantNumeric: "tabular-nums", width: 52,
                  }}>
                    {formatDateShort(output.created_at)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, color: active ? "var(--fg)" : "var(--fg-2)", fontWeight: active ? 600 : 500, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {output.title || "Untitled"}
                    </span>
                    <span style={{ display: "block", fontSize: 10, color: "var(--fg-3)", marginTop: 2, textTransform: "capitalize" }}>
                      {outputTypeToLabel(output.output_type)}
                    </span>
                  </span>
                  {output.score > 0 && (
                    <span className="liquid-glass-card" style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 8, color: scoreColor(output.score), flexShrink: 0 }}>
                      {output.score}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOutput && (
            <div
              className="liquid-glass-card"
              style={{
                marginTop: 12,
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(245,198,66,0.22)",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 10 }}>
                Actions · {selectedOutput.title || "Untitled"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" className="liquid-glass-btn-gold" onClick={handleOpenInWrap} style={{ padding: "8px 14px" }}>
                  <span className="liquid-glass-btn-gold-label">Send to Wrap</span>
                </button>
                <button type="button" className="liquid-glass-btn" onClick={handleReopen} style={{ padding: "8px 14px" }}>
                  <span className="liquid-glass-btn-label" style={{ color: "var(--fg-2)", fontWeight: 600 }}>Reopen in Work</span>
                </button>
                <button
                  type="button"
                  className="liquid-glass-btn"
                  onClick={() => nav(`/studio/outputs/${selectedOutput.id}`)}
                  style={{ padding: "8px 14px" }}
                >
                  <span className="liquid-glass-btn-label" style={{ color: "var(--fg-2)", fontWeight: 600 }}>Open detail</span>
                </button>
                <button
                  type="button"
                  className="liquid-glass-btn"
                  onClick={() => {
                    const t = selectedContent.trim();
                    if (!t) {
                      toast("Still loading text. Try again in a moment, or use Copy in the Inspector.");
                      return;
                    }
                    void navigator.clipboard.writeText(t).then(() => toast("Master draft copied."));
                  }}
                  style={{ padding: "8px 14px" }}
                >
                  <span className="liquid-glass-btn-label" style={{ color: "var(--fg-2)", fontWeight: 600 }}>Copy master</span>
                </button>
                <button type="button" onClick={handleDelete} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", fontSize: 11, fontWeight: 600, color: "var(--danger)", cursor: "pointer", fontFamily: FONT }}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
