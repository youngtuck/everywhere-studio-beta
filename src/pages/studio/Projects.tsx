import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, FileText, BarChart3, X, MoreVertical } from "lucide-react";
import { getScoreColor } from "../../utils/scoreColor";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import LoadingAnimation from "../../components/studio/LoadingAnimation";
import "./shared.css";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_default: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  outputs?: { count: number }[] | null;
};

type ScoreRow = {
  project_id: string | null;
  score: number | null;
  title?: string;
};

const transition = "all 0.15s ease";
const PROJECT_ACCENTS = ["var(--cornflower)", "var(--gold)", "#E8B4A0", "#64748B", "#50c8a0"];

export default function Projects() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("var(--cornflower)");
  const [error, setError] = useState<string | null>(null);

  // Menu / rename / archive state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setScores([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [{ data: projectData, error: projError }, { data: scoreData, error: scoreError }] =
          await Promise.all([
            supabase
              .from("projects")
              .select("*, outputs(count)")
              .eq("user_id", user.id)
              .order("sort_order", { ascending: true }),
            supabase
              .from("outputs")
              .select("project_id, score, title")
              .eq("user_id", user.id)
              .gt("score", 0)
              .order("created_at", { ascending: false }),
          ]);

        if (projError) throw projError;
        if (scoreError) throw scoreError;
        if (cancelled) return;

        setProjects(projectData as ProjectRow[] || []);
        setScores(scoreData as ScoreRow[] || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Could not load projects.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*, outputs(count)")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setProjects((data as ProjectRow[]) || []);
  };

  const averagesByProject = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const row of scores) {
      if (!row.project_id || typeof row.score !== "number") continue;
      const key = row.project_id;
      const entry = map.get(key) || { sum: 0, count: 0 };
      entry.sum += row.score;
      entry.count += 1;
      map.set(key, entry);
    }
    const result = new Map<string, number>();
    for (const [key, { sum, count }] of map.entries()) {
      result.set(key, Math.round(sum / count));
    }
    return result;
  }, [scores]);

  const recentTitlesByProject = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of scores) {
      if (!row.project_id || !row.title) continue;
      const titles = map.get(row.project_id) || [];
      if (titles.length < 3) titles.push(row.title);
      map.set(row.project_id, titles);
    }
    return map;
  }, [scores]);

  const pubReadyByProject = useMemo(() => {
    const map = new Map<string, { ready: number; total: number }>();
    for (const row of scores) {
      if (!row.project_id || typeof row.score !== "number") continue;
      const entry = map.get(row.project_id) || { ready: 0, total: 0 };
      entry.total += 1;
      if (row.score >= 900) entry.ready += 1;
      map.set(row.project_id, entry);
    }
    return map;
  }, [scores]);

  const sortedProjects = useMemo(() => {
    // Filter out archived projects (name prefix "[ARCHIVED]")
    const list = projects.filter((p) => !p.name.startsWith("[ARCHIVED]"));
    list.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (b.is_default && !a.is_default) return 1;
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [projects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setCreateLoading(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("projects").insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDescription.trim(),
      });
      if (insertError) throw insertError;
      setNewName("");
      setNewDescription("");
      setShowCreateModal(false);
      await refreshProjects();
    } catch (e: any) {
      setError(e.message || "Could not create project.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameName.trim()) return;
    setRenameLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({ name: renameName.trim(), updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) throw updateError;
      setRenameId(null);
      setRenameName("");
      await refreshProjects();
    } catch (e: any) {
      setError(e.message || "Could not rename project.");
    } finally {
      setRenameLoading(false);
    }
  };

  const handleArchive = async (project: ProjectRow) => {
    setMenuOpenId(null);
    try {
      // Try setting archived_at first
      const { error: archiveError } = await supabase
        .from("projects")
        .update({ archived_at: new Date().toISOString() } as any)
        .eq("id", project.id);

      if (archiveError) {
        // Fallback: prefix name with [ARCHIVED]
        const { error: fallbackError } = await supabase
          .from("projects")
          .update({ name: `[ARCHIVED] ${project.name}`, updated_at: new Date().toISOString() })
          .eq("id", project.id);
        if (fallbackError) throw fallbackError;
      }

      await refreshProjects();
    } catch (e: any) {
      setError(e.message || "Could not archive project.");
    }
  };

  const renderHeader = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 32,
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-tertiary)",
            marginBottom: 8,
            marginTop: 0,
          }}
        >
          ORGANIZE
        </p>
        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Projects
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--text-secondary)", marginTop: 6, marginBottom: 0 }}>
          Organize your outputs by client, campaign, or initiative.
        </p>
      </div>
      <button
        type="button"
        style={{
          background: "var(--text-primary)",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
          transition,
        }}
        onClick={() => setShowCreateModal(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.88";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        + New Project
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div style={{ padding: "80px 0", textAlign: "center" }}>
      <Folder size={32} style={{ color: "var(--text-tertiary)" }} />
      <h2
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        Create your first project
      </h2>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
        Projects organize your Watch configuration, outputs, and context.
      </p>
      <button
        type="button"
        style={{
          background: "var(--gold-dark)",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
          transition,
        }}
        onClick={() => setShowCreateModal(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--gold-light)";
          e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--gold-dark)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        New Project
      </button>
    </div>
  );

  const renderGrid = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 16,
      }}
      className="projects-grid"
    >
      {sortedProjects.map((p, idx) => {
        const outputsCount = (p.outputs && p.outputs[0]?.count) || 0;
        const avgScore = averagesByProject.get(p.id) ?? 0;
        const sc = getScoreColor(avgScore > 0 ? avgScore : null);
        const isRenaming = renameId === p.id;
        const accentColor = PROJECT_ACCENTS[idx % PROJECT_ACCENTS.length];
        const lastActive = p.updated_at ? new Date(p.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
        const displayDesc = p.is_default ? "All outputs land here unless assigned to a project" : p.description;
        return (
          <div
            key={p.id}
            className="liquid-glass-card"
            style={{
              borderLeft: `3px solid ${accentColor}`,
              padding: "20px 24px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              position: "relative",
            }}
            onClick={() => {
              if (!isRenaming && menuOpenId !== p.id) {
                navigate(`/studio/projects/${p.id}`);
              }
            }}
          >
            {/* Top row: icon + menu */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Folder size={24} style={{ color: "var(--text-tertiary)" }} />
              {!p.is_default && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === p.id ? null : p.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Menu"
                >
                  <MoreVertical size={18} />
                </button>
              )}
            </div>

            {/* Dropdown menu */}
            {menuOpenId === p.id && (
              <div
                className="liquid-glass-menu"
                style={{
                  position: "absolute",
                  top: 48,
                  right: 20,
                  zIndex: 10,
                  padding: "4px 0",
                  minWidth: 140,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: "var(--text-primary)",
                  }}
                  onClick={() => {
                    setRenameName(p.name);
                    setRenameId(p.id);
                    setMenuOpenId(null);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: "#b91c1c",
                  }}
                  onClick={() => handleArchive(p)}
                >
                  Archive
                </button>
              </div>
            )}

            {/* Name - inline rename or display */}
            {isRenaming ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRename(p.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ marginTop: 16, marginBottom: 4, display: "flex", gap: 6 }}
              >
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setRenameId(null);
                      setRenameName("");
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={renameLoading || !renameName.trim()}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--text-primary)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: renameLoading ? "wait" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {renameLoading ? "..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setRenameId(null); setRenameName(""); }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    background: "none",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--text-secondary)",
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginTop: 16,
                  marginBottom: 4,
                }}
              >
                {p.name}
              </h3>
            )}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayDesc}
            </p>
            {outputsCount === 0 ? (
              <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--glass-surface)", borderRadius: 8, textAlign: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  Start a session to create your first output
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate("/studio/work"); }}
                  style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "var(--gold-dark)", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  New Session
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <FileText size={14} style={{ color: "var(--text-tertiary)" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--text-tertiary)" }}>
                    {outputsCount} output{outputsCount !== 1 ? "s" : ""}
                  </span>
                </span>
                {avgScore > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <BarChart3 size={14} style={{ color: sc.text }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: sc.text }}>
                      avg {avgScore}
                    </span>
                  </span>
                )}
              </div>
            )}
            {/* Recent outputs + publication readiness */}
            {(() => {
              const titles = recentTitlesByProject.get(p.id);
              const pub = pubReadyByProject.get(p.id);
              if (!titles?.length && !pub) return null;
              return (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--glass-border)", paddingTop: 10 }}>
                  {pub && pub.total > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: titles?.length ? 6 : 0 }}>
                      {pub.ready}/{pub.total} publication-ready
                    </div>
                  )}
                  {titles && titles.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {titles.map((t, i) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 12 }}>
              {lastActive ? `Last active: ${lastActive}` : "No activity yet"}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: isMobile ? "20px 16px" : "32px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
      onClick={() => { if (menuOpenId) setMenuOpenId(null); }}
    >
      {renderHeader()}
      {error && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <LoadingAnimation variant="sentinel" message="Loading projects..." />
        </div>
      ) : sortedProjects.length === 0 ? (
        renderEmpty()
      ) : (
        renderGrid()
      )}

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 40,
          }}
          onClick={() => { if (!createLoading) setShowCreateModal(false); }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "var(--surface-primary)",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>New project</div>
              <button
                type="button"
                onClick={() => { if (!createLoading) setShowCreateModal(false); }}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: "var(--fg-2)",
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 16 }}>
              Give this project a clear name. You can update its Watch configuration and context later.
            </p>
            {error && (
              <div style={{ marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--fg-2)" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  disabled={createLoading}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    outline: "none",
                    background: "var(--glass-input)",
                    backdropFilter: "var(--glass-blur-light)",
                    WebkitBackdropFilter: "var(--glass-blur-light)",
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--fg-2)" }}>
                  Description <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={createLoading}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--glass-border)",
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    outline: "none",
                    background: "var(--glass-input)",
                    backdropFilter: "var(--glass-blur-light)",
                    WebkitBackdropFilter: "var(--glass-blur-light)",
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--fg-2)" }}>Color</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["var(--cornflower)", "var(--gold)", "#E8B4A0", "#50c8a0", "#A080F5", "#64748B"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: c, border: newColor === c ? "2px solid var(--fg)" : "2px solid transparent",
                        cursor: "pointer", transition: "border-color 0.15s ease",
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={createLoading || !newName.trim()}
                style={{
                  width: "100%",
                  background: "var(--text-primary)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: createLoading ? "wait" : "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {createLoading ? "Creating..." : "Create project"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
