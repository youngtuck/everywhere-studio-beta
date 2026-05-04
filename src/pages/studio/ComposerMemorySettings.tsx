/**
 * Composer memory: short facts Reed injects from Supabase (RLS). See api/_resources.js.
 */
import { useState, useLayoutEffect, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useShell } from "../../components/studio/StudioShell";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import { useMobile } from "../../hooks/useMobile";
import { DnaNav } from "../../components/studio/DnaNav";
import "./shared.css";

const FONT = "var(--font)";

interface ComposerMemoryRow {
  id: string;
  title: string | null;
  body: string;
  source: string;
  sort_priority: number;
  created_at: string;
  updated_at: string;
}

export default function ComposerMemorySettings() {
  const nav = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setDashContent, setDashOpen } = useShell();

  const [rows, setRows] = useState<ComposerMemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formPriority, setFormPriority] = useState("0");

  useLayoutEffect(() => {
    setDashOpen(false);
    setDashContent(null);
    return () => setDashContent(null);
  }, [setDashContent, setDashOpen]);

  const loadRows = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("composer_memory")
      .select("id, title, body, source, sort_priority, created_at, updated_at")
      .eq("user_id", user.id)
      .order("sort_priority", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[ComposerMemory]", error);
      const msg = (error.message || "").toLowerCase();
      const missingTable =
        msg.includes("does not exist")
        || msg.includes("schema cache")
        || msg.includes("could not find the table");
      toast(
        missingTable
          ? "Composer memory table is missing on this Supabase project. Apply migrations 022_composer_memory.sql and 023_composer_memory_title.sql, or run supabase db push from the repo."
          : `Could not load memory: ${error.message}`,
        "error",
      );
      setRows([]);
    } else {
      setRows((data || []) as ComposerMemoryRow[]);
    }
    setLoading(false);
  }, [user?.id, toast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormBody("");
    setFormPriority("0");
  };

  const openNew = () => {
    setEditingId("new");
    setFormTitle("");
    setFormBody("");
    setFormPriority("0");
  };

  const openEdit = (r: ComposerMemoryRow) => {
    setEditingId(r.id);
    setFormTitle(r.title?.trim() || "");
    setFormBody(r.body || "");
    setFormPriority(String(r.sort_priority ?? 0));
  };

  const save = async () => {
    if (!user?.id) return;
    const body = formBody.trim();
    if (!body) {
      toast("Body is required.", "error");
      return;
    }
    const pr = parseInt(formPriority, 10);
    const sort_priority = Number.isFinite(pr) ? pr : 0;
    const title = formTitle.trim() || null;

    setSaving(true);
    try {
      if (editingId === "new") {
        const { error } = await supabase.from("composer_memory").insert({
          user_id: user.id,
          title,
          body,
          sort_priority,
          source: "pinned",
        });
        if (error) throw error;
        toast("Saved.");
      } else if (editingId) {
        const { error } = await supabase
          .from("composer_memory")
          .update({
            title,
            body,
            sort_priority,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast("Updated.");
      }
      resetForm();
      await loadRows();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Save failed";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!user?.id) return;
    if (!window.confirm("Delete this composer memory row?")) return;
    const { error } = await supabase.from("composer_memory").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast(error.message, "error");
      return;
    }
    if (editingId === id) resetForm();
    toast("Deleted.");
    await loadRows();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: FONT }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "12px 20px 10px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%" }}>
          <DnaNav />
          <h1 style={{ fontFamily: "var(--font)", fontSize: 28, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>Composer memory</h1>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.45 }}>
            Reed reads these lines in Work. Keep them short and factual. Higher sort priority loads first.
          </div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : "24px 24px 32px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button type="button" className="liquid-glass-btn-gold" onClick={openNew} disabled={editingId !== null} style={{ padding: "8px 16px" }}>
            <span className="liquid-glass-btn-gold-label">Add row</span>
          </button>
        </div>

        {(editingId === "new" || (editingId && editingId !== "new")) ? (
          <div className="liquid-glass-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-3)", marginBottom: 12 }}>
              {editingId === "new" ? "NEW ROW" : "EDIT ROW"}
            </div>
            <label style={{ display: "block", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "var(--fg-2)", display: "block", marginBottom: 4 }}>Title (optional)</span>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Short label"
                maxLength={200}
                style={{
                  width: "100%",
                  boxSizing: "border-box" as const,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-input)",
                  color: "var(--fg)",
                  fontSize: 13,
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "var(--fg-2)", display: "block", marginBottom: 4 }}>Body (required)</span>
              <textarea
                value={formBody}
                onChange={e => setFormBody(e.target.value)}
                rows={5}
                placeholder="What Reed should treat as stable until you change it."
                style={{
                  width: "100%",
                  boxSizing: "border-box" as const,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-input)",
                  color: "var(--fg)",
                  fontSize: 13,
                  resize: "vertical" as const,
                  minHeight: 100,
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "var(--fg-2)", display: "block", marginBottom: 4 }}>Sort priority (optional, higher first)</span>
              <input
                type="number"
                value={formPriority}
                onChange={e => setFormPriority(e.target.value)}
                style={{
                  width: 120,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-input)",
                  color: "var(--fg)",
                  fontSize: 13,
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="liquid-glass-btn-gold" disabled={saving} onClick={() => void save()} style={{ padding: "8px 20px" }}>
                <span className="liquid-glass-btn-gold-label">{saving ? "Saving…" : "Save"}</span>
              </button>
              <button type="button" className="liquid-glass-btn" disabled={saving} onClick={resetForm} style={{ padding: "8px 16px" }}>
                <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Cancel</span>
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--fg-3)" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.5 }}>
            No rows yet. Add one so Reed can ground sessions on facts you care about.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map(r => (
              <div key={r.id} className="liquid-glass-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    {r.title?.trim() ? (
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>{r.title.trim()}</div>
                    ) : null}
                    <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" as const }}>{r.body}</div>
                    <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 8 }}>
                      Priority {r.sort_priority}
                      {r.updated_at ? ` · Updated ${new Date(r.updated_at).toLocaleString()}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button type="button" className="liquid-glass-btn" onClick={() => openEdit(r)} disabled={editingId !== null && editingId !== r.id} style={{ padding: "6px 12px" }}>
                      <span className="liquid-glass-btn-label" style={{ fontWeight: 600 }}>Edit</span>
                    </button>
                    <button type="button" className="liquid-glass-btn" onClick={() => void remove(r.id)} style={{ padding: "6px 12px" }}>
                      <span className="liquid-glass-btn-label" style={{ color: "#B91C1C", fontWeight: 600 }}>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
