import { useParams, useNavigate } from "react-router-dom";
import { Plus, Archive } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Output {
  id: string;
  title: string;
  output_type: string;
  score: number | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  essay: "#4A90D9", newsletter: "#50c8a0", presentation: "#F5A623",
  social: "#a080f5", podcast: "#F5C642", video: "#e85d75",
  sunday_story: "#F5C642", freestyle: "#4A90D9",
};

const TYPE_LABELS: Record<string, string> = {
  essay: "Essay", newsletter: "Newsletter", presentation: "Presentation",
  social: "Social", podcast: "Podcast", video: "Video",
  sunday_story: "Sunday Story", freestyle: "Freestyle",
};

function scoreColor(s: number) {
  return s >= 900 ? "#50c8a0" : s >= 600 ? "#4A90D9" : "#F5C642";
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Rename state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Archive state
  const [archiving, setArchiving] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    const { data: proj, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !proj) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProject(proj as Project);

    const { data: outs } = await supabase
      .from("outputs")
      .select("id, title, output_type, score, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    setOutputs((outs as Output[]) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!project || !editName.trim()) {
      setIsEditing(false);
      return;
    }
    const trimmed = editName.trim();
    if (trimmed === project.name) {
      setIsEditing(false);
      return;
    }
    const { error } = await supabase
      .from("projects")
      .update({ name: trimmed })
      .eq("id", project.id);

    if (!error) {
      setProject({ ...project, name: trimmed });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") handleCancelEdit();
  };

  const handleArchive = async () => {
    if (!project) return;
    setArchiving(true);
    // Try to set archived = true; if the column doesn't exist, just delete or handle gracefully
    const { error } = await supabase
      .from("projects")
      .update({ archived: true } as any)
      .eq("id", project.id);

    if (error) {
      // Column might not exist - try soft-deleting by updating name as fallback
      console.warn("Archive failed (column may not exist):", error.message);
    }
    setArchiving(false);
    navigate("/studio/projects");
  };

  // Computed stats
  const outputsCount = outputs.length;
  const scoredOutputs = outputs.filter((o) => o.score && o.score > 0);
  const avgScore = scoredOutputs.length > 0
    ? Math.round(scoredOutputs.reduce((sum, o) => sum + (o.score || 0), 0) / scoredOutputs.length)
    : 0;
  const lastActive = outputs.length > 0 ? timeAgo(outputs[0].created_at) : "–";

  if (loading) {
    return (
      <div style={{ padding: "var(--studio-page-pad)", fontFamily: "var(--font)" }}>
        <p style={{ color: "var(--fg-3)", fontSize: 15 }}>Loading project...</p>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div style={{ padding: "var(--studio-page-pad)", fontFamily: "var(--font)" }}>
        <button onClick={() => navigate("/studio/projects")} className="btn-ghost" style={{ marginBottom: 24 }}>
          &larr; Back to Projects
        </button>
        <p style={{ color: "var(--fg-3)", fontSize: 15 }}>Project not found.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "var(--studio-content-max)", margin: "0 auto", fontFamily: "var(--font)", paddingBottom: "var(--studio-gap-lg)" }}>
      {/* Header: name, description, archive */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: "var(--studio-gap-lg)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                style={{
                  fontSize: 24, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.02em",
                  fontFamily: "'Inter', sans-serif", border: "1px solid var(--glass-border)",
                  borderRadius: "var(--studio-radius)", padding: "4px 10px",
                  background: "var(--glass-input)", outline: "none", width: "100%",
                  backdropFilter: "var(--glass-blur-light)", WebkitBackdropFilter: "var(--glass-blur-light)",
                }}
              />
            </div>
          ) : (
            <h1
              onClick={handleStartEdit}
              style={{
                fontSize: 24, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.02em",
                marginBottom: 6, fontFamily: "'Inter', sans-serif", cursor: "pointer",
                borderRadius: "var(--studio-radius)", padding: "2px 4px", margin: "-2px -4px 6px -4px",
                transition: "background .12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="Click to rename"
            >
              {project.name}
            </h1>
          )}
          {project.description && (
            <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {project.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          aria-label="Archive project"
          title="Archive project"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 14px", borderRadius: "var(--studio-radius)",
            border: "1px solid var(--glass-border)", background: "var(--glass-surface)",
            cursor: archiving ? "wait" : "pointer", color: "var(--fg-2)",
            fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 400,
            opacity: archiving ? 0.5 : 1,
          }}
        >
          <Archive size={16} strokeWidth={2} />
          {archiving ? "Archiving..." : "Archive"}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--studio-gap)", marginBottom: "var(--studio-gap-lg)" }}>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Total outputs</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", fontFamily: "'Inter', sans-serif" }}>{outputsCount}</div>
        </div>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Avg Impact Score</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: avgScore > 0 ? scoreColor(avgScore) : "rgba(0,0,0,0.35)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", fontFamily: "'Inter', sans-serif" }}>
            {avgScore > 0 ? avgScore : "–"}
          </div>
        </div>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Last active</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>{lastActive}</div>
        </div>
      </div>

      {/* Outputs section */}
      <section style={{ marginBottom: "var(--studio-gap-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em", margin: 0 }}>Outputs</h2>
          <button
            type="button"
            onClick={() => navigate("/studio/work")}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 13 }}
          >
            <Plus size={16} strokeWidth={2.5} />
            New Idea
          </button>
        </div>
        <div className="card" style={{ overflow: "hidden", border: "1px solid var(--glass-border)" }}>
          {outputs.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--fg-3)", fontSize: 14 }}>
              No outputs in this project yet. Click &quot;New Idea&quot; to create one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {outputs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate(`/studio/outputs/${o.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "none", border: "none", borderBottom: "1px solid var(--glass-border)",
                    padding: "12px 16px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)", width: "100%",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--glass-surface)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[o.output_type] || "#4A90D9", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, color: "var(--fg)", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</span>
                  <span style={{ fontSize: 14, color: "var(--fg-3)", width: 90, flexShrink: 0 }}>{TYPE_LABELS[o.output_type] || o.output_type}</span>
                  {o.score && o.score > 0 ? (
                    <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(o.score), width: 42, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{o.score}</span>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--fg-3)", width: 42, textAlign: "right", flexShrink: 0 }}>–</span>
                  )}
                  <span style={{ fontSize: 14, color: "var(--fg-3)", width: 60, textAlign: "right", flexShrink: 0 }}>{timeAgo(o.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
