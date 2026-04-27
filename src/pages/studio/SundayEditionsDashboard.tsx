/**
 * SundayEditionsDashboard.tsx
 * Lists all Sunday Editions for the current user. Create, duplicate, delete.
 */
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useShell } from "../../components/studio/StudioShell";
import { useMobile } from "../../hooks/useMobile";
import { Copy, Trash2 } from "lucide-react";
import "./shared.css";

const FONT = "var(--font)";

interface EditionRow {
  id: string;
  name: string;
  status: string;
  impact_score: number;
  created_at: string;
  updated_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "rgba(107,107,107,0.1)", text: "#6B6B6B" },
    ready: { bg: "rgba(237,204,115,0.15)", text: "#B8960A" },
    published: { bg: "rgba(45,140,78,0.1)", text: "#2D8C4E" },
  };
  const c = colors[status] || colors.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const,
      padding: "3px 8px", borderRadius: 4, background: c.bg, color: c.text,
    }}>{status}</span>
  );
}

export default function SundayEditionsDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMobile();
  const { setDashContent, setDashOpen } = useShell();

  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    setDashOpen(false);
    setDashContent(null);
    return () => setDashContent(null);
  }, [setDashContent, setDashOpen]);

  const loadEditions = useCallback(async () => {
    if (!user?.id) { setEditions([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("sunday_editions")
      .select("id, name, status, impact_score, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[Editions] load", error);
      toast("Could not load editions.", "error");
      setEditions([]);
    } else {
      setEditions((data || []) as EditionRow[]);
    }
    setLoading(false);
  }, [user?.id, toast]);

  useEffect(() => { void loadEditions(); }, [loadEditions]);

  const handleCreate = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("sunday_editions")
      .insert({ user_id: user.id, name: "Untitled Edition", status: "draft", content: {}, brand_config: {} })
      .select("id")
      .single();
    if (error || !data) {
      toast(error?.message || "Could not create edition.", "error");
      return;
    }
    toast("Edition created.");
    nav(`/studio/editions/${data.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent, edition: EditionRow) => {
    e.stopPropagation();
    if (!user?.id) return;
    const { data: source } = await supabase
      .from("sunday_editions")
      .select("content, brand_config")
      .eq("id", edition.id)
      .single();
    if (!source) { toast("Could not duplicate.", "error"); return; }
    const { data, error } = await supabase
      .from("sunday_editions")
      .insert({
        user_id: user.id,
        name: `${edition.name} (copy)`,
        status: "draft",
        content: source.content || {},
        brand_config: source.brand_config || {},
      })
      .select("id")
      .single();
    if (error || !data) { toast("Could not duplicate.", "error"); return; }
    toast("Edition duplicated.");
    nav(`/studio/editions/${data.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this edition? This cannot be undone.")) return;
    const { error } = await supabase.from("sunday_editions").delete().eq("id", id);
    if (error) { toast("Could not delete.", "error"); return; }
    toast("Edition deleted.");
    void loadEditions();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: FONT }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "12px 20px 10px", maxWidth: isMobile ? "100%" : 860, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>Editions</div>
            <div style={{ fontSize: 14, color: "var(--fg-3)", marginTop: 2 }}>Sunday Story production packages.</div>
          </div>
          <button
            type="button"
            className="liquid-glass-btn-gold"
            onClick={handleCreate}
            style={{ fontSize: 14, padding: "8px 18px", flexShrink: 0 }}
          >
            <span className="liquid-glass-btn-gold-label">+ New Edition</span>
          </button>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : "24px 24px 32px", maxWidth: isMobile ? "100%" : 860, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ fontSize: 14, color: "var(--fg-3)", padding: "40px 0", textAlign: "center" }}>Loading editions...</div>
        ) : editions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 14, color: "var(--fg-3)", marginBottom: 16 }}>No editions yet. Create your first Sunday Edition.</div>
            <button
              type="button"
              className="liquid-glass-btn-gold"
              onClick={handleCreate}
              style={{ fontSize: 14, padding: "10px 24px" }}
            >
              <span className="liquid-glass-btn-gold-label">+ New Edition</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {editions.map(ed => (
              <div
                key={ed.id}
                className="liquid-glass-card"
                onClick={() => nav(`/studio/editions/${ed.id}`)}
                style={{
                  padding: "14px 18px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.7)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ed.name}</div>
                  <div style={{ fontSize: 14, color: "var(--fg-3)", marginTop: 2 }}>{formatDate(ed.created_at)}</div>
                </div>
                <StatusBadge status={ed.status} />
                <div style={{ fontSize: 14, fontWeight: 600, color: ed.impact_score > 0 ? "var(--gold)" : "var(--fg-3)", minWidth: 32, textAlign: "right" }}>
                  {ed.impact_score > 0 ? ed.impact_score : "-"}
                </div>
                <button
                  type="button"
                  title="Duplicate"
                  onClick={e => void handleDuplicate(e, ed)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)", padding: 4 }}
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={e => void handleDelete(e, ed.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)", padding: 4 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
