import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "../../utils/timeAgo";
import { getScoreColor } from "../../utils/scoreColor";
import "./shared.css";

type OutputRow = {
  id: string;
  title: string;
  output_type: string;
  score: number;
  updated_at: string;
  published_at: string | null;
};

function typeToLabel(outputType: string): string {
  return outputType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const OUTPUT_TYPE_DOT: Record<string, string> = {
  essay: "var(--work-teal)",
  podcast: "var(--gold-dark)",
  podcast_script: "var(--gold-dark)",
  social: "var(--wrap-violet)",
  newsletter: "var(--watch-blue)",
  sunday_story: "var(--work-teal)",
  freestyle: "var(--text-tertiary)",
  linkedin_post: "var(--watch-blue)",
  twitter_thread: "var(--watch-blue)",
  blog_post: "var(--work-teal)",
  executive_brief: "var(--gold-dark)",
};

export default function Workbench() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.resolve(
      supabase
        .from("outputs")
        .select("id, title, output_type, score, updated_at, published_at")
        .eq("user_id", user.id)
        .is("published_at", null)
        .lt("score", 100)
        .order("updated_at", { ascending: false })
    ).then(({ data, error }) => {
      if (error) console.error(error);
      setOutputs((data as OutputRow[]) ?? []);
    }).finally(() => setLoading(false));
  }, [user]);

  const refresh = () => {
    if (!user) return;
    Promise.resolve(supabase
      .from("outputs")
      .select("id, title, output_type, score, updated_at, published_at")
      .eq("user_id", user.id)
      .is("published_at", null)
      .lt("score", 100)
      .order("updated_at", { ascending: false }))
      .then(
        ({ data, error }) => { if (error) console.error(error); setOutputs((data as OutputRow[]) ?? []); },
        (err) => console.error("Workbench refresh failed:", err)
      );
  };

  const handleMoveToVault = async (id: string) => {
    const { error } = await supabase
      .from("outputs")
      .update({ published_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setOutputs((prev) => prev.filter((o) => o.id !== id));
      setMenuOpenId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("outputs").delete().eq("id", id);
    if (!error) {
      setOutputs((prev) => prev.filter((o) => o.id !== id));
      setDeleteConfirmId(null);
      setMenuOpenId(null);
    }
  };

  if (!user) return null;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: isMobile ? "20px 16px" : "24px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 24,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
          }}
        >
          The Workbench
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
          Work in progress. Started but not shipped.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Loading...</p>
      ) : outputs.length === 0 ? (
        <div
          className="liquid-glass-card"
          style={{
            padding: 24,
            textAlign: "center",
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          Nothing on the workbench. Start a Reed session to create something.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {outputs.map((o) => {
            const scoreStyle = getScoreColor(o.score);
            const dotColor = OUTPUT_TYPE_DOT[o.output_type] ?? "var(--text-tertiary)";
            return (
              <li
                key={o.id}
                className="liquid-glass-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {o.title || "Untitled"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                    {typeToLabel(o.output_type)} · {timeAgo(o.updated_at)}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 400,
                    color: scoreStyle.text,
                  }}
                >
                  {o.score}%
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/studio/outputs/${o.id}`)}
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "var(--gold-dark)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Continue
                  </button>
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === o.id ? null : o.id)}
                      style={{
                        padding: "6px 10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                        fontSize: 14,
                      }}
                      aria-label="Actions"
                    >
                      ⋮
                    </button>
                    {menuOpenId === o.id && (
                      <>
                        <div
                          style={{ position: "fixed", inset: 0, zIndex: 10 }}
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div
                          className="liquid-glass-menu"
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            marginTop: 4,
                            zIndex: 11,
                            minWidth: 160,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => { handleMoveToVault(o.id); setMenuOpenId(null); }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "10px 14px",
                              textAlign: "left",
                              fontSize: 13,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "'Inter', sans-serif",
                              color: "var(--text-primary)",
                            }}
                          >
                            Move to Vault
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(o.id)}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "10px 14px",
                              textAlign: "left",
                              fontSize: 13,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "'Inter', sans-serif",
                              color: "#D64545",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deleteConfirmId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="liquid-glass-card"
            style={{
              padding: 24,
              maxWidth: 360,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 14, color: "var(--text-primary)", margin: "0 0 16px" }}>
              Delete this output? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  background: "transparent",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#D64545",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
