import { useState, useEffect, useCallback, useMemo } from "react";
import { ReedProfileIcon } from "../../components/studio/ReedProfileIcon";
import { useMobile } from "../../hooks/useMobile";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import { OUTPUT_TYPES } from "../../components/studio/OutputTypePicker";
import "./shared.css";

const FONT = "var(--font)";

interface SystemTemplate {
  name: string;
  base: string;
  description: string;
  format: string;
  sections: string[];
  reedInterview?: string[];
  designSpec?: {
    width: string;
    headerBg: string;
    frameBorder: string;
    frameBg: string;
    stopBar: { bg: string; accent: string };
  };
}

const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    name: "The Edition",
    base: "Newsletter",
    description: "A recurring publication format with editorial identity. Built for Substack, Beehiiv, or ConvertKit. Subject line and preview text included.",
    format: ".html",
    sections: ["Opening", "Body", "Close", "Subject Line", "Preview Text"],
  },
  {
    name: "Sunday Story",
    base: "Essay",
    description: "A weekly personal essay with narrative structure. Sensory opening, reflective middle, purposeful close. Built for weekend reading.",
    format: ".html",
    sections: ["Opening Image", "Body", "Stakes", "Close"],
  },
  {
    name: "Session Brief",
    base: "Business",
    description: "A post-session summary capturing what was discussed, what was decided, and what comes next. Auto-generated from any Work session.",
    format: ".md",
    sections: ["Frame", "Key Decisions", "Open Items", "Next Steps"],
  },
  {
    name: "Executive Brief",
    base: "Business",
    description: "A standalone decision document for a principal. Not a summary of the full report. Works on its own. One to two pages maximum.",
    format: ".pdf / .html",
    sections: ["Decision Required", "Context", "Recommendation", "Risk"],
  },
  {
    name: "Release Brief",
    base: "Business",
    description: "A post-build document that captures what changed, why it matters, and what comes next. Three audiences: partners, developers, and principals. Not a changelog. A positioning document that contains technical detail.",
    format: ".html",
    sections: ["Frame", "Partner: Why It Matters", "Partner: Partner Update", "Developer: What Changed", "Developer: What to Test", "What's Next"],
    reedInterview: [
      "Start with what changed.",
      "Who needs to act on it, and what do they need to do?",
      "What is the one thing they need to know before they open the file?",
    ],
    designSpec: {
      width: "840px",
      headerBg: "#0D1B2A",
      frameBorder: "4px solid #4A90D9",
      frameBg: "rgba(74,144,217,0.06)",
      stopBar: { bg: "#0D1B2A", accent: "#F5C642" },
    },
  },
  {
    name: "Signal Sweep",
    base: "Social",
    description: "A LinkedIn post format built from Watch signals. Surfaces one category insight and frames it as a timely take. Built for the interest graph.",
    format: "Plain text",
    sections: ["Hook", "Signal", "Take", "Close"],
  },
];

type TemplateSettingsPayload = {
  description: string;
  format: string;
  sections: string[];
  reedInterview?: string[];
  designSpec?: SystemTemplate["designSpec"];
  customInstructions: string;
  forkedFromName?: string;
};

interface UserTemplateRow {
  id: string;
  user_id: string;
  output_type: string;
  name: string;
  is_base: boolean | null;
  is_hidden: boolean | null;
  settings: TemplateSettingsPayload | null;
  created_at: string;
  updated_at: string;
}

function baseLabelToOutputTypeId(base: string): string {
  const b = base.trim().toLowerCase();
  if (b === "newsletter") return "newsletter";
  if (b === "essay") return "essay";
  if (b === "social") return "social_media";
  if (b === "business") return "executive_summary";
  return "freestyle";
}

function systemTemplateToSettings(t: SystemTemplate): TemplateSettingsPayload {
  return {
    description: t.description,
    format: t.format,
    sections: [...t.sections],
    reedInterview: t.reedInterview ? [...t.reedInterview] : undefined,
    designSpec: t.designSpec ? { ...t.designSpec, stopBar: { ...t.designSpec.stopBar } } : undefined,
    customInstructions: "",
    forkedFromName: t.name,
  };
}

function parseSettings(raw: unknown): TemplateSettingsPayload {
  if (!raw || typeof raw !== "object") {
    return {
      description: "",
      format: "",
      sections: [],
      customInstructions: "",
    };
  }
  const o = raw as Record<string, unknown>;
  const sections = Array.isArray(o.sections) ? o.sections.filter((x): x is string => typeof x === "string") : [];
  const reedInterview = Array.isArray(o.reedInterview)
    ? o.reedInterview.filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    description: typeof o.description === "string" ? o.description : "",
    format: typeof o.format === "string" ? o.format : "",
    sections,
    reedInterview,
    designSpec: o.designSpec && typeof o.designSpec === "object" ? o.designSpec as TemplateSettingsPayload["designSpec"] : undefined,
    customInstructions: typeof o.customInstructions === "string" ? o.customInstructions : "",
    forkedFromName: typeof o.forkedFromName === "string" ? o.forkedFromName : undefined,
  };
}

type Selection =
  | { kind: "system"; index: number }
  | { kind: "user"; id: string };

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(12,26,41,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: FONT,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="liquid-glass"
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(90vh, 640px)",
          overflowY: "auto",
          borderRadius: 16,
          padding: "22px 22px 18px",
          boxSizing: "border-box" as const,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMobile();

  const [userRows, setUserRows] = useState<UserTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>({ kind: "system", index: 0 });
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState<null | "new" | "fork-notice" | "fork-form" | "rename">(null);
  const [forkSystemIndex, setForkSystemIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formOutputType, setFormOutputType] = useState("freestyle");
  const [formCustomInstructions, setFormCustomInstructions] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSectionsText, setFormSectionsText] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const outputTypeOptions = useMemo(
    () => OUTPUT_TYPES.map(t => ({ id: t.id, label: t.label })),
    [],
  );

  const loadUserTemplates = useCallback(async () => {
    if (!user?.id) {
      setUserRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("id, user_id, output_type, name, is_base, is_hidden, settings, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[Templates] load", error);
      toast("Could not load your templates.", "error");
      setUserRows([]);
    } else {
      setUserRows((data || []) as UserTemplateRow[]);
    }
    setLoading(false);
  }, [user?.id, toast]);

  useEffect(() => {
    void loadUserTemplates();
  }, [loadUserTemplates]);

  const selectedSystem = selection?.kind === "system" ? SYSTEM_TEMPLATES[selection.index] : null;
  const selectedUser = useMemo(() => {
    if (selection?.kind !== "user") return null;
    return userRows.find(r => r.id === selection.id) || null;
  }, [selection, userRows]);

  const openNewModal = () => {
    setFormName("");
    setFormOutputType("freestyle");
    setFormCustomInstructions("");
    setFormDescription("");
    setFormSectionsText("");
    setModal("new");
  };

  const openForkNotice = (systemIndex: number) => {
    setForkSystemIndex(systemIndex);
    setModal("fork-notice");
  };

  const proceedForkForm = () => {
    if (forkSystemIndex == null) return;
    const sys = SYSTEM_TEMPLATES[forkSystemIndex];
    setFormName(`My ${sys.name}`);
    setFormOutputType(baseLabelToOutputTypeId(sys.base));
    setFormCustomInstructions("");
    setFormDescription(sys.description);
    setFormSectionsText(sys.sections.join("\n"));
    setModal("fork-form");
  };

  const insertTemplate = async (payload: {
    name: string;
    output_type: string;
    settings: TemplateSettingsPayload;
  }) => {
    if (!user?.id) {
      toast("Sign in to save templates.", "error");
      return null;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("templates")
      .insert({
        user_id: user.id,
        name: payload.name.trim().slice(0, 200),
        output_type: payload.output_type,
        is_base: false,
        is_hidden: false,
        settings: payload.settings as unknown as Record<string, unknown>,
      })
      .select("id, user_id, output_type, name, is_base, is_hidden, settings, created_at, updated_at")
      .single();
    setSaving(false);
    if (error || !data) {
      console.error("[Templates] insert", error);
      toast(error?.message || "Could not save template.", "error");
      return null;
    }
    toast("Template saved.");
    await loadUserTemplates();
    return data as UserTemplateRow;
  };

  const handleSaveNew = async () => {
    const name = formName.trim();
    if (!name) {
      toast("Enter a template name.", "error");
      return;
    }
    const sections = formSectionsText.split("\n").map(s => s.trim()).filter(Boolean);
    const row = await insertTemplate({
      name,
      output_type: formOutputType,
      settings: {
        description: formDescription.trim(),
        format: "",
        sections,
        customInstructions: formCustomInstructions.trim(),
      },
    });
    setModal(null);
    setForkSystemIndex(null);
    if (row?.id) setSelection({ kind: "user", id: row.id });
  };

  const handleSaveFork = async () => {
    if (forkSystemIndex == null) return;
    const sys = SYSTEM_TEMPLATES[forkSystemIndex];
    const name = formName.trim();
    if (!name) {
      toast("Enter a template name.", "error");
      return;
    }
    const baseSettings = systemTemplateToSettings(sys);
    const sections = formSectionsText.split("\n").map(s => s.trim()).filter(Boolean);
    baseSettings.description = formDescription.trim() || baseSettings.description;
    baseSettings.sections = sections.length > 0 ? sections : baseSettings.sections;
    baseSettings.customInstructions = formCustomInstructions.trim();
    const row = await insertTemplate({
      name,
      output_type: formOutputType,
      settings: baseSettings,
    });
    setModal(null);
    setForkSystemIndex(null);
    if (row?.id) setSelection({ kind: "user", id: row.id });
  };

  const handleSaveUserEdits = async () => {
    if (!selectedUser || !user?.id) return;
    const name = formName.trim();
    if (!name) {
      toast("Enter a template name.", "error");
      return;
    }
    const sections = formSectionsText.split("\n").map(s => s.trim()).filter(Boolean);
    const prev = parseSettings(selectedUser.settings);
    const settings: TemplateSettingsPayload = {
      ...prev,
      description: formDescription.trim(),
      format: prev.format,
      sections: sections.length > 0 ? sections : prev.sections,
      customInstructions: formCustomInstructions.trim(),
    };
    setSaving(true);
    const { error } = await supabase
      .from("templates")
      .update({
        name: name.slice(0, 200),
        output_type: formOutputType,
        settings: settings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedUser.id)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      console.error("[Templates] update", error);
      toast(error.message || "Could not update template.", "error");
      return;
    }
    toast("Template updated.");
    await loadUserTemplates();
  };

  const handleDeleteUser = async (id: string) => {
    if (!user?.id) return;
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    setSaving(true);
    const { error } = await supabase.from("templates").delete().eq("id", id).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      console.error("[Templates] delete", error);
      toast(error.message || "Could not delete template.", "error");
      return;
    }
    toast("Template deleted.");
    await loadUserTemplates();
    if (selection?.kind === "user" && selection.id === id) {
      setSelection({ kind: "system", index: 0 });
    }
  };

  const openRenameModal = (row: UserTemplateRow) => {
    setRenameId(row.id);
    setRenameValue(row.name);
    setModal("rename");
  };

  const handleRenameSubmit = async () => {
    if (!renameId || !user?.id) return;
    const name = renameValue.trim().slice(0, 200);
    if (!name) {
      toast("Enter a name.", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("templates")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", renameId)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast(error.message || "Could not rename.", "error");
      return;
    }
    toast("Renamed.");
    setModal(null);
    setRenameId(null);
    await loadUserTemplates();
  };

  useEffect(() => {
    if (selectedUser) {
      const s = parseSettings(selectedUser.settings);
      setFormName(selectedUser.name);
      setFormOutputType(selectedUser.output_type || "freestyle");
      setFormDescription(s.description);
      setFormCustomInstructions(s.customInstructions);
      setFormSectionsText(s.sections.join("\n"));
    }
  }, [selectedUser?.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden", fontFamily: FONT, minHeight: 0 }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "14px 20px 16px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
            Wrap layer
          </div>
          <h1 style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
            Templates
          </h1>
          <p style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, marginTop: 8, maxWidth: 520 }}>
            System templates ship with Studio. My Templates are saved to your account, renameable, and deletable.
          </p>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
          gap: isMobile ? 12 : 16,
          padding: isMobile ? "12px 14px 16px" : "16px 20px 20px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          minHeight: 0,
        }}
      >
        <div
          className="liquid-glass"
          style={{
            width: isMobile ? "100%" : "min(38%, 320px)",
            flexShrink: 0,
            borderRadius: 16,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: isMobile ? 180 : 0,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>System</span>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: 6, minHeight: 0 }}>
            {SYSTEM_TEMPLATES.map((t, i) => {
              const on = selection?.kind === "system" && selection.index === i;
              return (
                <div key={`sys-${t.name}`} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={() => { setSelection({ kind: "system", index: i }); }}
                    className={on ? "liquid-glass-card" : ""}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left" as const,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: on ? "1px solid rgba(245,198,66,0.35)" : "1px solid transparent",
                      background: on ? "rgba(245,198,66,0.08)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      fontFamily: FONT,
                      transition: "background 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: on ? 600 : 400, color: "var(--fg)" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 3, lineHeight: 1.35 }}>Based on {t.base} · {t.format}</div>
                  </button>
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 4px 2px" }}>
                    <button
                      type="button"
                      className="liquid-glass-btn"
                      onClick={() => { setSelection({ kind: "system", index: i }); openForkNotice(i); }}
                      style={{ padding: "3px 8px", fontSize: 9, fontWeight: 600 }}
                    >
                      <span className="liquid-glass-btn-label" style={{ color: "var(--blue, #4A90D9)" }}>Edit</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: "var(--glass-border)", margin: "4px 10px" }} />

          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>My Templates</span>
            <button type="button" className="liquid-glass-btn-gold" onClick={openNewModal} style={{ padding: "5px 12px", fontSize: 10, fontWeight: 600 }}>
              <span className="liquid-glass-btn-gold-label">+ New Template</span>
            </button>
          </div>
          <div style={{ overflowY: "auto", maxHeight: isMobile ? 200 : 260, minHeight: 0, padding: "0 6px 8px" }}>
            {loading ? (
              <div className="liquid-glass-card" style={{ margin: "0 6px", padding: "12px 14px", fontSize: 11, color: "var(--fg-3)", borderRadius: 12 }}>Loading…</div>
            ) : userRows.length === 0 ? (
              <div className="liquid-glass-card" style={{ margin: "0 6px", padding: "12px 14px", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.45, borderRadius: 12 }}>
                No custom templates yet. Use + New Template or Edit on a system template to create one.
              </div>
            ) : (
              userRows.map(row => {
                const on = selection?.kind === "user" && selection.id === row.id;
                return (
                  <div key={row.id} style={{ marginBottom: 4 }}>
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: "user", id: row.id })}
                      className={on ? "liquid-glass-card" : ""}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left" as const,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: on ? "1px solid rgba(245,198,66,0.35)" : "1px solid transparent",
                        background: on ? "rgba(245,198,66,0.08)" : "transparent",
                        cursor: "pointer",
                        fontFamily: FONT,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: on ? 600 : 400, color: "var(--fg)" }}>{row.name}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 1 }}>
                        {row.output_type.replace(/_/g, " ")}{parseSettings(row.settings).forkedFromName ? " · From system" : ""}
                      </div>
                    </button>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, padding: "2px 4px 4px" }}>
                      <button type="button" className="liquid-glass-btn" onClick={() => openRenameModal(row)} style={{ padding: "2px 8px", fontSize: 9 }}>
                        <span className="liquid-glass-btn-label">Rename</span>
                      </button>
                      <button type="button" className="liquid-glass-btn" onClick={() => void handleDeleteUser(row.id)} style={{ padding: "2px 8px", fontSize: 9 }}>
                        <span className="liquid-glass-btn-label" style={{ color: "#B91C1C" }}>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="liquid-glass" style={{ flex: 1, minWidth: 0, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px" : "22px 24px", minHeight: 0 }}>
            {selectedSystem && (
              <>
                <div style={{ marginBottom: 18, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 600, color: "var(--fg)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{selectedSystem.name}</h2>
                    <span className="liquid-glass-card" style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                      color: "var(--fg-3)", padding: "4px 10px", borderRadius: 8, display: "inline-block",
                    }}>System template</span>
                  </div>
                  <button type="button" className="liquid-glass-btn-gold" onClick={() => openForkNotice(selection.index)} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 600 }}>
                    <span className="liquid-glass-btn-gold-label">Create my version</span>
                  </button>
                </div>

                <div className="liquid-glass-card" style={{ padding: "14px 16px", marginBottom: 14, borderRadius: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.65 }}>{selectedSystem.description}</div>
                </div>

                <div className="liquid-glass-card" style={{ padding: "14px 16px", marginBottom: 14, borderRadius: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 10 }}>Sections</div>
                  {selectedSystem.sections.map((sec, i) => (
                    <div
                      key={sec}
                      style={{
                        padding: "8px 0",
                        borderBottom: i < selectedSystem.sections.length - 1 ? "1px solid var(--glass-border)" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--gold, #F5C642)", minWidth: 20 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 400, color: "var(--fg)" }}>{sec}</span>
                    </div>
                  ))}
                </div>

                {selectedSystem.reedInterview && (
                  <div className="liquid-glass-card" style={{ padding: "14px 16px", marginBottom: 14, borderRadius: 14, border: "1px solid rgba(74,144,217,0.18)" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--blue, #4A90D9)", marginBottom: 10 }}>Reed interview</div>
                    {selectedSystem.reedInterview.map((q, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55, padding: "6px 0 6px 12px", borderLeft: "2px solid rgba(74,144,217,0.35)", marginBottom: 6 }}>{q}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <div className="liquid-glass-card" style={{ padding: "12px 14px", borderRadius: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 4 }}>Format</div>
                    <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{selectedSystem.format}</div>
                  </div>
                  <div className="liquid-glass-card" style={{ padding: "12px 14px", borderRadius: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 4 }}>Base output type</div>
                    <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{selectedSystem.base}</div>
                  </div>
                </div>
              </>
            )}

            {selectedUser && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 600, color: "var(--fg)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{selectedUser.name}</h2>
                  <span className="liquid-glass-card" style={{
                    fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                    color: "var(--fg-3)", padding: "4px 10px", borderRadius: 8, display: "inline-block",
                  }}>My template</span>
                  {parseSettings(selectedUser.settings).forkedFromName && (
                    <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 10, lineHeight: 1.5 }}>
                      Forked from system template: {parseSettings(selectedUser.settings).forkedFromName}
                    </p>
                  )}
                </div>

                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Name</label>
                <input className="liquid-glass-input" value={formName} onChange={e => setFormName(e.target.value)} style={{ width: "100%", marginBottom: 14, fontSize: 13, padding: "10px 12px", borderRadius: 10 }} />

                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Output type</label>
                <select
                  className="liquid-glass-input"
                  value={formOutputType}
                  onChange={e => setFormOutputType(e.target.value)}
                  style={{ width: "100%", marginBottom: 14, fontSize: 13, padding: "10px 12px", borderRadius: 10, fontFamily: FONT }}
                >
                  {outputTypeOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>

                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Description</label>
                <textarea
                  className="liquid-glass-input"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={4}
                  style={{ width: "100%", marginBottom: 14, fontSize: 13, padding: "10px 12px", borderRadius: 10, resize: "vertical" as const, fontFamily: FONT }}
                />

                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Sections (one per line)</label>
                <textarea
                  className="liquid-glass-input"
                  value={formSectionsText}
                  onChange={e => setFormSectionsText(e.target.value)}
                  rows={6}
                  style={{ width: "100%", marginBottom: 14, fontSize: 13, padding: "10px 12px", borderRadius: 10, resize: "vertical" as const, fontFamily: FONT }}
                />

                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Custom instructions</label>
                <textarea
                  className="liquid-glass-input"
                  value={formCustomInstructions}
                  onChange={e => setFormCustomInstructions(e.target.value)}
                  rows={5}
                  placeholder="Optional. Tone, audience, guardrails, or how Wrap should treat this template."
                  style={{ width: "100%", marginBottom: 16, fontSize: 13, padding: "10px 12px", borderRadius: 10, resize: "vertical" as const, fontFamily: FONT }}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button type="button" className="liquid-glass-btn-gold" disabled={saving} onClick={() => void handleSaveUserEdits()} style={{ padding: "10px 18px", fontSize: 12 }}>
                    <span className="liquid-glass-btn-gold-label">{saving ? "Saving…" : "Save changes"}</span>
                  </button>
                  <button type="button" className="liquid-glass-btn" disabled={saving} onClick={() => openRenameModal(selectedUser)} style={{ padding: "10px 14px", fontSize: 12 }}>
                    <span className="liquid-glass-btn-label">Rename</span>
                  </button>
                  <button type="button" className="liquid-glass-btn" disabled={saving} onClick={() => void handleDeleteUser(selectedUser.id)} style={{ padding: "10px 14px", fontSize: 12 }}>
                    <span className="liquid-glass-btn-label" style={{ color: "#B91C1C" }}>Delete</span>
                  </button>
                </div>
              </>
            )}

            {!selectedSystem && !selectedUser && (
              <div className="liquid-glass-card" style={{ padding: "20px 18px", borderRadius: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", justifyContent: "center",
                    flexShrink: 0, width: 36, paddingTop: 2,
                  }}>
                    <ReedProfileIcon size={24} title="Reed" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>Reed</div>
                    <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, margin: 0 }}>
                      Select a system template or one of your saved templates. Use + New Template to start from scratch.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!selectedSystem && !selectedUser && (
            <div className="liquid-glass" style={{ padding: "10px 14px", borderRadius: 0, borderTop: "1px solid var(--glass-border)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  placeholder="Reply to Reed…"
                  className="liquid-glass-input"
                  style={{ flex: 1, fontSize: 13, height: 38, borderRadius: 10 }}
                />
                <button type="button" className="liquid-glass-btn-gold" style={{ width: 38, height: 38, borderRadius: 10, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Send">
                  <svg style={{ width: 14, height: 14, stroke: "currentColor", strokeWidth: 2.2, fill: "none" }} viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal === "fork-notice" && forkSystemIndex != null && (
        <ModalBackdrop onClose={() => { setModal(null); setForkSystemIndex(null); }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)", margin: "0 0 12px" }}>System template</h2>
          <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6, margin: "0 0 18px" }}>
            This is a system template. You are creating your own version based on it. Your copy is fully editable and saved under My Templates.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="liquid-glass-btn" onClick={() => { setModal(null); setForkSystemIndex(null); }}>
              <span className="liquid-glass-btn-label">Cancel</span>
            </button>
            <button type="button" className="liquid-glass-btn-gold" onClick={proceedForkForm}>
              <span className="liquid-glass-btn-gold-label">Continue</span>
            </button>
          </div>
        </ModalBackdrop>
      )}

      {modal === "fork-form" && forkSystemIndex != null && (
        <ModalBackdrop onClose={() => { setModal(null); setForkSystemIndex(null); }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)", margin: "0 0 12px" }}>Save your template</h2>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Name</label>
          <input className="liquid-glass-input" value={formName} onChange={e => setFormName(e.target.value)} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10 }} />
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Output type</label>
          <select className="liquid-glass-input" value={formOutputType} onChange={e => setFormOutputType(e.target.value)} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }}>
            {outputTypeOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Description</label>
          <textarea className="liquid-glass-input" value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }} />
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Sections (one per line)</label>
          <textarea className="liquid-glass-input" value={formSectionsText} onChange={e => setFormSectionsText(e.target.value)} rows={5} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }} />
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Custom instructions</label>
          <textarea className="liquid-glass-input" value={formCustomInstructions} onChange={e => setFormCustomInstructions(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 16, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="liquid-glass-btn" onClick={() => { setModal(null); setForkSystemIndex(null); }}>Cancel</button>
            <button type="button" className="liquid-glass-btn-gold" disabled={saving} onClick={() => void handleSaveFork()}>
              <span className="liquid-glass-btn-gold-label">{saving ? "Saving…" : "Save template"}</span>
            </button>
          </div>
        </ModalBackdrop>
      )}

      {modal === "new" && (
        <ModalBackdrop onClose={() => setModal(null)}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)", margin: "0 0 12px" }}>New template</h2>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Name</label>
          <input className="liquid-glass-input" value={formName} onChange={e => setFormName(e.target.value)} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10 }} />
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Output type</label>
          <select className="liquid-glass-input" value={formOutputType} onChange={e => setFormOutputType(e.target.value)} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }}>
            {outputTypeOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Description</label>
          <textarea className="liquid-glass-input" value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="What this template is for." style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }} />
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Sections (one per line, optional)</label>
          <textarea className="liquid-glass-input" value={formSectionsText} onChange={e => setFormSectionsText(e.target.value)} rows={4} placeholder={"Hook\nBody\nClose"} style={{ width: "100%", marginBottom: 12, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }} />
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--fg-3)", marginBottom: 4 }}>Custom instructions</label>
          <textarea className="liquid-glass-input" value={formCustomInstructions} onChange={e => setFormCustomInstructions(e.target.value)} rows={4} placeholder="How Reed and Wrap should use this template." style={{ width: "100%", marginBottom: 16, fontSize: 13, padding: "8px 10px", borderRadius: 10, fontFamily: FONT }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="liquid-glass-btn" onClick={() => setModal(null)}>Cancel</button>
            <button type="button" className="liquid-glass-btn-gold" disabled={saving} onClick={() => void handleSaveNew()}>
              <span className="liquid-glass-btn-gold-label">{saving ? "Saving…" : "Create template"}</span>
            </button>
          </div>
        </ModalBackdrop>
      )}

      {modal === "rename" && renameId && (
        <ModalBackdrop onClose={() => { setModal(null); setRenameId(null); }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)", margin: "0 0 12px" }}>Rename template</h2>
          <input className="liquid-glass-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} style={{ width: "100%", marginBottom: 16, fontSize: 13, padding: "10px 12px", borderRadius: 10 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="liquid-glass-btn" onClick={() => { setModal(null); setRenameId(null); }}>Cancel</button>
            <button type="button" className="liquid-glass-btn-gold" disabled={saving} onClick={() => void handleRenameSubmit()}>
              <span className="liquid-glass-btn-gold-label">{saving ? "Saving…" : "Save"}</span>
            </button>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}
