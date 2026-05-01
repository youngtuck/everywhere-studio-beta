import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fetchWithRetry } from "../../lib/retry";
import { ArrowLeft, Globe, FileText, Pencil, Clipboard, Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useMobile } from "../../hooks/useMobile";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { ImpactScore, GateResult } from "../../lib/agents/types";
import { CheckpointResultsPanel } from "../../components/pipeline/CheckpointResultsPanel";
import { ImpactScoreCard } from "../../components/pipeline/ImpactScoreCard";
import { PipelineBlockedAlert } from "../../components/pipeline/PipelineBlockedAlert";
import { safeMarkdownToHtml, escapeHtml } from "../../lib/markdown";
import "./shared.css";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

interface Output {
  id: string;
  title: string;
  content: string;
  output_type: string;
  score: number;
  created_at: string;
  project_id?: string | null;
  gates?: {
    strategy?: number;
    voice?: number;
    accuracy?: number;
    ai_tells?: number;
    audience?: number;
    platform?: number;
    impact?: number;
    total?: number;
    summary?: string;
    [key: string]: unknown;
  } | null;
}

interface PipelineRunRow {
  status: "PASSED" | "BLOCKED" | "ERROR";
  gate_results: GateResult[];
  betterish_score: ImpactScore | null;
  blocked_at: string | null;
}

function getHeadingsFromMarkdown(content: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const lineRe = /^##\s+(.+)$/gm;
  let m;
  while ((m = lineRe.exec(content)) !== null) {
    const text = m[1].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (id) headings.push({ id, text });
  }
  return headings;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const font = "'Inter', sans-serif";

const toolbarBtn = (active = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  border: "1px solid var(--glass-border)",
  borderRadius: 8,
  background: active ? "var(--gold)" : "var(--glass-card)",
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  color: active ? "var(--fg)" : "var(--fg-2)",
  cursor: "pointer",
  transition: "all 0.15s ease",
  fontFamily: font,
  whiteSpace: "nowrap" as const,
});

const iconSz = { width: 15, height: 15, flexShrink: 0 } as const;

// ─────────────────────────────────────────────────────────────────────────────

export default function OutputDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [output, setOutput] = useState<Output | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pipelineRun, setPipelineRun] = useState<PipelineRunRow | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reformatting, setReformatting] = useState(false);
  const [reformatType, setReformatType] = useState<string | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRescore, setShowRescore] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Pipeline
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(true);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Project assignment
  const [userProjects, setUserProjects] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("projects").select("id, name").eq("user_id", user.id).then(({ data }) => {
      if (data) setUserProjects(data);
    });
  }, [user]);

  const moveToProject = async (projectId: string) => {
    if (!output) return;
    await supabase.from("outputs").update({ project_id: projectId }).eq("id", output.id);
    setOutput({ ...output, project_id: projectId });
    toast(`Moved to ${userProjects.find(p => p.id === projectId)?.name || "project"}`);
  };

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || id === "new") { setLoading(false); setNotFound(true); return; }
    supabase
      .from("outputs").select("*").eq("id", id).single()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setOutput(data);
        const { data: runs } = await supabase
          .from("pipeline_runs")
          .select("status, gate_results, betterish_score, blocked_at")
          .eq("output_id", id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (runs && runs.length > 0) setPipelineRun(runs[0] as PipelineRunRow);
        setLoading(false);
      });
  }, [id]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const copyText = useCallback(async () => {
    if (!output) return;
    const plain = output.content
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/`(.+?)`/g, "$1");
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const startEditing = () => {
    setEditContent(output!.content);
    setEditing(true);
    setHasUnsavedChanges(false);
    setTimeout(() => editRef.current?.focus(), 100);
  };

  const cancelEditing = () => { setEditing(false); setEditContent(""); setHasUnsavedChanges(false); };

  const saveEdits = async () => {
    if (!output || !editContent.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("outputs").update({ content: editContent.trim() }).eq("id", output.id);
    setSaving(false);
    if (!error) {
      setOutput({ ...output, content: editContent.trim() });
      setEditing(false);
      setHasUnsavedChanges(false);
      setShowRescore(true);
      toast("Content updated");
    } else {
      toast("Save failed. Try again.", "error");
    }
  };

  const saveTitle = async () => {
    if (!output || !titleDraft.trim()) return;
    const { error } = await supabase.from("outputs").update({ title: titleDraft.trim() }).eq("id", output.id);
    if (!error) {
      setOutput({ ...output, title: titleDraft.trim() });
      toast("Title updated");
    }
    setEditingTitle(false);
  };

  const handleRescore = async () => {
    if (!output || !user) return;
    setRescoring(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationSummary: output.content, outputType: output.output_type, userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const newScore = data.score ?? output.score;
        await supabase.from("outputs").update({ score: newScore, gates: data.gates ?? null }).eq("id", output.id);
        setOutput({ ...output, score: newScore, gates: data.gates ?? output.gates });
        setShowRescore(false);
        toast(`Score updated: ${newScore}`);
      }
    } catch {}
    setRescoring(false);
  };

  const handleRunPipeline = async () => {
    if (!output || !user || pipelineRunning) return;
    setPipelineRunning(true);
    setQualityOpen(true);
    try {
      // Load voice/brand DNA
      const { data: resources } = await supabase
        .from("resources")
        .select("resource_type, content")
        .eq("user_id", user.id);
      const voiceDnaMd = (resources || []).filter(r => r.resource_type === "voice_dna").map(r => r.content || "").join("\n");
      const brandDnaMd = (resources || []).filter(r => r.resource_type === "brand_dna").map(r => r.content || "").join("\n");
      const methodDnaMd = (resources || []).filter(r => r.resource_type === "method_dna").map(r => r.content || "").join("\n");

      const res = await fetchWithRetry(
        `${API_BASE}/api/run-pipeline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: output.content,
            outputType: output.output_type,
            voiceDnaMd,
            brandDnaMd,
            methodDnaMd,
            userId: user.id,
            outputId: output.id,
          }),
        },
        { timeout: 180000 },
      );
      if (!res.ok) throw new Error("Pipeline API failed");
      const result = await res.json();

      const run: PipelineRunRow = {
        status: result.status,
        gate_results: result.gateResults || [],
        betterish_score: result.impactScore || null,
        blocked_at: result.blockedAt || null,
      };
      setPipelineRun(run);

      // Update output score
      const finalScore = result.impactScore?.total ?? output.score;
      await supabase.from("outputs").update({ score: finalScore, content_state: result.status === "PASSED" ? "vault" : output.score >= 900 ? "vault" : "in_progress" }).eq("id", output.id);
      setOutput({ ...output, score: finalScore });

      // Save pipeline run
      await supabase.from("pipeline_runs").insert({
        output_id: output.id,
        user_id: user.id,
        status: result.status,
        gate_results: result.gateResults,
        betterish_score: result.impactScore,
        betterish_total: result.impactScore?.total ?? null,
        blocked_at: result.blockedAt || null,
      });

      toast(result.status === "PASSED" ? "All 7 checkpoints passed" : "Pipeline complete. Review results below.");
    } catch (err: any) {
      console.error("[Pipeline] Error:", err);
      const msg = err?.message || "Unknown error";
      if (msg.includes("timed out") || msg.includes("abort")) {
        toast("Pipeline timed out. Your content may be too long. Try again or shorten the draft.", "error");
      } else {
        toast("Pipeline encountered an error. Try again.", "error");
      }
    } finally {
      setPipelineRunning(false);
    }
  };

  const handleDeleteOutput = async () => {
    if (!output || !user) return;
    await supabase.from("pipeline_runs").delete().eq("output_id", output.id);
    await supabase.from("outputs").delete().eq("id", output.id).eq("user_id", user.id);
    toast("Output deleted");
    navigate("/studio/outputs");
  };

  // ── Wrap helpers (web page, Google Doc, Word Doc) ─────────────────────────

  const wrapAsWebPage = useCallback(() => {
    if (!output) return;
    let contentHtml = safeMarkdownToHtml(output.content);
    const headings = getHeadingsFromMarkdown(output.content);
    const titleEscaped = escapeHtml(output.title);
    headings.forEach(({ id, text }) => {
      const escapedText = escapeHtml(text);
      contentHtml = contentHtml.replace(
        new RegExp(`<h2>${escapedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h2>`, "i"),
        `<h2 id="${id}">${escapedText}</h2>`
      );
    });
    const navHtml = headings.length > 0
      ? `<nav style="position:sticky;top:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(0,0,0,0.06);padding:12px 0;margin-bottom:24px;z-index:10;"><div style="max-width:720px;margin:0 auto;padding:0 24px;"><div style="display:flex;flex-wrap:wrap;gap:8px;font-size:13px;font-family:'Inter', sans-serif;">${headings.map(h => `<a href="#${h.id}" style="color:rgba(0,0,0,0.6);text-decoration:none;">${escapeHtml(h.text)}</a>`).join("")}</div></div></nav>`
      : "";
    const authorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
    const dateStr = new Date(output.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const htmlString = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titleEscaped}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{font-family:'Inter',-apple-system,sans-serif;background:var(--fg);color:#F0F0EE;line-height:1.7;margin:0;padding:0}.header{padding:32px 24px 0;max-width:720px;margin:0 auto}.wordmark{font-size:12px;letter-spacing:-1px;text-transform:uppercase;margin-bottom:40px;display:inline-flex;align-items:baseline}.wordmark .ew{color:var(--cornflower);font-weight:700}.wordmark .st{color:var(--gold);font-weight:300}.wordmark .tm{color:var(--gold);font-size:6px;vertical-align:top;margin-left:2px}h1{font-size:32px;font-weight:700;margin:0 0 12px;letter-spacing:-0.02em;color:#fff}.meta{font-size:14px;color:rgba(240,240,238,0.4);margin-bottom:32px}.content-wrap{max-width:720px;margin:0 auto;padding:0 24px 48px}.content{font-size:16px;line-height:1.7;color:rgba(240,240,238,0.85)}.content h2{font-size:22px;font-weight:600;margin:36px 0 16px;color:#fff}.content h3{font-size:18px;font-weight:600;margin:28px 0 12px;color:#fff}.content p{margin:0 0 18px}.footer{max-width:720px;margin:0 auto;padding:32px 24px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:rgba(240,240,238,0.3)}@media(max-width:640px){h1{font-size:24px}.content{font-size:15px}}</style></head><body><div class="header"><div class="wordmark"><span class="ew">Ideas</span><span class="st">Out<span class="tm">TM</span></span></div><h1>${titleEscaped}</h1><div class="meta">${authorName ? escapeHtml(String(authorName)) + " &middot; " : ""}${dateStr}</div></div>${navHtml}<div class="content-wrap"><div class="content">${contentHtml}</div></div><div class="footer">Made with IdeasOut</div></body></html>`;
    setPreviewHtml(htmlString);
  }, [output, user]);

  const wrapAsGoogleDoc = useCallback(async () => {
    if (!output) return;
    const html = `<h1>${escapeHtml(output.title)}</h1>${safeMarkdownToHtml(output.content)}`;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([output.content], { type: "text/plain" }) })]);
      toast("Rich text copied. Open Google Docs and paste.");
    } catch {
      await navigator.clipboard.writeText(output.content);
      toast("Content copied. Open Google Docs and paste.");
    }
  }, [output, toast]);

  const wrapAsWordDoc = useCallback(() => {
    if (!output) return;
    const contentHtml = safeMarkdownToHtml(output.content);
    const titleEscaped = escapeHtml(output.title);
    const authorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "IdeasOut";
    const dateStr = new Date(output.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.6;max-width:6.5in;margin:1in}h1{font-size:18pt;margin-bottom:6pt}h2{font-size:14pt;margin-top:18pt;margin-bottom:8pt}h3{font-size:12pt;margin-top:14pt;margin-bottom:6pt}p{margin-bottom:8pt}.meta{font-size:10pt;color:#666;margin-bottom:18pt}.footer{margin-top:36pt;padding-top:12pt;border-top:1px solid #ddd;font-size:9pt;color:#999}</style></head><body><h1>${titleEscaped}</h1><div class="meta">${escapeHtml(String(authorName))} &middot; ${dateStr}</div>${contentHtml}<div class="footer">Created with IdeasOut</div></body></html>`;
    const blob = new Blob([htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${output.title.replace(/[^\w\s-]/g, "")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Word document downloaded");
  }, [output, user, toast]);

  const handleReformat = useCallback(async (selectedType: string) => {
    if (!output || reformatting) return;
    setReformatting(true);
    setReformatType(selectedType);
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationSummary: output.content, outputType: selectedType, userId: user?.id }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const { error: saveError, data: saved } = await supabase
        .from("outputs")
        .insert({ title: data.title || `${output.title} (${selectedType})`, content: data.content || data.text || "", output_type: selectedType.toLowerCase().replace(/\s+/g, "_"), score: data.score ?? 0, user_id: user?.id, gates: data.gates ?? null })
        .select("id").single();
      if (saveError || !saved) throw new Error("Failed to save output");
      toast(`${selectedType} created!`);
      navigate(`/studio/output/${saved.id}`);
    } catch { toast("Something went wrong. Please try again.", "error"); }
    finally { setReformatting(false); setReformatType(null); }
  }, [output, reformatting, user, toast, navigate]);

  // ── Loading / Not Found ───────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--gold, #C8961A)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ padding: 48, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ fontSize: 18, color: "var(--fg-2)", marginBottom: 16 }}>
        This output may not have been saved yet.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button className="btn-ghost" onClick={() => navigate("/studio/outputs")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "transparent", fontSize: 14, cursor: "pointer", color: "var(--fg-2)", fontFamily: "'Inter', sans-serif" }}>Back to The Vault</button>
        <button className="btn-ghost" onClick={() => navigate("/studio/work")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "transparent", fontSize: 14, cursor: "pointer", color: "var(--fg-2)", fontFamily: "'Inter', sans-serif" }}>Back to Work</button>
      </div>
    </div>
  );

  const scoreColor = output!.score >= 900 ? "#50c8a0" : output!.score >= 700 ? "var(--cornflower)" : "#C8961A";
  const gates = output!.gates && typeof output!.gates === "object" ? output!.gates : null;
  const gateEntries = gates
    ? [
        { key: "strategy", label: "Strategy", value: gates.strategy as number | undefined },
        { key: "voice", label: "Voice", value: gates.voice as number | undefined },
        { key: "accuracy", label: "Accuracy", value: gates.accuracy as number | undefined },
        { key: "ai_tells", label: "AI Tells", value: gates.ai_tells as number | undefined },
        { key: "audience", label: "Audience", value: gates.audience as number | undefined },
        { key: "platform", label: "Platform", value: gates.platform as number | undefined },
        { key: "impact", label: "Impact", value: gates.impact as number | undefined },
      ].filter((g) => typeof g.value === "number")
    : [];
  const gateBarColor = (v: number) => v >= 80 ? "#50c8a0" : v >= 60 ? "var(--cornflower)" : "#E53935";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: font }}>

      {/* ── TOP BAR (sticky) ──────────────────────────────────────── */}
      <div
        className="liquid-glass"
        style={{
          position: "sticky", top: 0, zIndex: 50,
          borderRadius: 0,
          borderLeft: "none", borderRight: "none", borderTop: "none",
          padding: isMobile ? "0 16px" : "0 32px", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        {/* Left: Back + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <button
            onClick={() => navigate("/studio/outputs")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-3)", display: "flex", alignItems: "center", padding: 4, flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
          </button>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", fontFamily: font, border: "none", borderBottom: "2px solid var(--gold)", outline: "none", background: "transparent", padding: "2px 0", width: "100%", maxWidth: 400 }}
            />
          ) : (
            <h1
              onClick={() => { setTitleDraft(output!.title); setEditingTitle(true); }}
              style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", margin: 0, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}
              title="Click to edit title"
            >
              {output!.title}
            </h1>
          )}
        </div>

        {/* Center: Output type badge */}
        {!isMobile && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
            color: "var(--fg-3)", background: "var(--glass-surface)", padding: "4px 12px", borderRadius: 4, flexShrink: 0,
          }}>
            {output!.output_type.replace(/_/g, " ")}
          </span>
        )}

        {/* Right: Copy + Edit + Revise */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={copyText}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              background: copied ? "#50c8a0" : "var(--fg)", color: "var(--bg)",
              border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font,
              transition: "all 0.2s ease", minWidth: 90, justifyContent: "center",
            }}
          >
            {copied ? <><Check size={14} /> Copied</> : <><Clipboard size={14} /> Copy</>}
          </button>
          {!editing ? (
            <>
              <button onClick={startEditing} style={toolbarBtn()}>
                <Pencil style={iconSz} /> Edit
              </button>
              {!isMobile && (
                <button
                  onClick={() => navigate("/studio/work", { state: { reviseOutputId: output!.id, reviseContent: output!.content, reviseTitle: output!.title, reviseType: output!.output_type, reviseScore: output!.score, reviseGates: output!.gates || null, revisePipelineRun: pipelineRun || null } })}
                  style={{ ...toolbarBtn(true), border: "none" }}
                >
                  Revise with Reed
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={cancelEditing} style={toolbarBtn()}>Cancel</button>
              <button
                onClick={saveEdits}
                disabled={saving || !hasUnsavedChanges}
                style={{ ...toolbarBtn(hasUnsavedChanges), border: hasUnsavedChanges ? "none" : "1px solid var(--glass-border)", opacity: hasUnsavedChanges ? 1 : 0.5 }}
              >
                {saving ? "Saving..." : "Save edits"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── TOOLBAR (sticky below top bar) ────────────────────────── */}
      <div
        className="liquid-glass"
        style={{
          position: "sticky", top: 60, zIndex: 40,
          borderRadius: 0,
          borderLeft: "none", borderRight: "none", borderTop: "none",
          padding: isMobile ? "10px 16px" : "10px 32px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button onClick={copyText} style={toolbarBtn()}>
            {copied ? <><Check style={iconSz} /> Copied</> : <><Clipboard style={iconSz} /> Copy Text</>}
          </button>
          <button onClick={wrapAsWebPage} style={toolbarBtn()}><Globe style={iconSz} /> Web Page</button>
          <button onClick={wrapAsGoogleDoc} style={toolbarBtn()}><FileText style={iconSz} /> Google Doc</button>
          <button onClick={wrapAsWordDoc} style={toolbarBtn()}><FileText style={iconSz} /> Word Doc</button>
          <button onClick={() => navigate(`/studio/wrap/visual/${output!.id}`)} style={toolbarBtn()}><Pencil style={iconSz} /> Visual</button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("ew-wrap-from-catalog-id", output!.id);
              navigate("/studio/wrap");
            }}
            style={toolbarBtn()}
          >
            Channel Wrap
          </button>
          <button
            onClick={handleRunPipeline}
            disabled={pipelineRunning}
            style={{
              ...toolbarBtn(!pipelineRun),
              border: pipelineRun ? "1px solid var(--glass-border)" : "none",
              marginLeft: "auto",
            }}
          >
            {pipelineRunning ? "Running..." : pipelineRun ? "Re-run Pipeline" : "Run Quality Pipeline"}
          </button>
        </div>
      </div>

      {/* ── META ROW ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "16px 16px 0" : "20px 32px 0" }}>
        <div className="liquid-glass-card" style={{ padding: "14px 18px", borderRadius: 14, display: "flex", alignItems: "center", gap: 16, fontSize: 14, color: "var(--fg-2)", flexWrap: "wrap" }}>
          <span style={{ textTransform: "capitalize" }}>{output!.output_type.replace(/_/g, " ")}</span>
          <span>{new Date(output!.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          <span style={{ fontWeight: 700, color: scoreColor }}>Score: {Math.round(output!.score / 10)}%</span>
          {userProjects.length > 1 && (
            <select
              value={output!.project_id || ""}
              onChange={(e) => moveToProject(e.target.value)}
              style={{ fontSize: 12, fontFamily: font, color: "var(--fg-2)", background: "transparent", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", outline: "none" }}
            >
              <option value="">Unassigned</option>
              {userProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── CONTENT AREA ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "20px 16px" : "28px 32px" }}>
        {editing ? (
          <>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 8 }}>
              Editing raw text. Markdown formatting (** for bold, ## for headings) will render when you save and exit edit mode.
            </div>
            {hasUnsavedChanges && (
              <div style={{ fontSize: 12, color: "var(--gold)", fontStyle: "normal", marginBottom: 8 }}>Unsaved changes</div>
            )}
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => { setEditContent(e.target.value); setHasUnsavedChanges(true); }}
              style={{
                width: "100%", minHeight: 500,
                padding: isMobile ? "20px 16px" : "32px 36px",
                fontFamily: font, fontSize: 16, lineHeight: 1.75,
                color: "var(--fg)", background: "var(--glass-input)",
                border: "1px solid var(--cornflower)", borderRadius: 8,
                resize: "vertical", outline: "none", whiteSpace: "pre-wrap", wordBreak: "break-word" as const,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 8, fontSize: 12, color: "var(--fg-3)" }}>
              <span>{editContent.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>{editContent.length} characters</span>
            </div>
          </>
        ) : (
          <div className="liquid-glass-card" style={{
            padding: isMobile ? "24px 16px" : "36px 40px",
          }}>
            <div
              className="md-content"
              style={{ fontFamily: font, fontSize: isMobile ? 15 : 16, lineHeight: 1.75, color: "var(--text-primary)" }}
              dangerouslySetInnerHTML={{ __html: safeMarkdownToHtml(output!.content) }}
            />
          </div>
        )}

        {/* Re-score prompt after editing */}
        {showRescore && !editing && (
          <div style={{
            marginTop: 16, padding: "12px 16px",
            background: "rgba(74,144,217,0.06)", borderLeft: "3px solid var(--cornflower)", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
          }}>
            <span style={{ fontSize: 13, color: "var(--fg-2)" }}>Content edited. Re-score to update your Impact Score.</span>
            <button
              onClick={handleRescore} disabled={rescoring}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "var(--cornflower)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: rescoring ? "default" : "pointer", fontFamily: font }}
            >
              {rescoring ? "Scoring..." : "Re-score"}
            </button>
          </div>
        )}
      </div>

      {/* ── QUALITY PANEL (collapsible) ───────────────────────────── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "0 16px 32px" : "0 32px 40px" }}>
        <button
          onClick={() => setQualityOpen(!qualityOpen)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
            background: "none", border: "none", borderTop: "1px solid var(--glass-border)",
            padding: "16px 0", cursor: "pointer", fontFamily: font,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", letterSpacing: "0.04em" }}>Quality Pipeline</span>
          {qualityOpen ? <ChevronUp size={16} color="var(--fg-3)" /> : <ChevronDown size={16} color="var(--fg-3)" />}
        </button>

        {qualityOpen && (
          <div className="liquid-glass-card" style={{ padding: "16px 18px", borderRadius: 14, marginTop: 8 }}>
            {/* Pipeline hasn't been run */}
            {!pipelineRun && !pipelineRunning && (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <p style={{ fontSize: 14, color: "var(--fg-2)", maxWidth: 480, marginInline: "auto" }}>
                  {`Reed will run the full quality pipeline on your content: voice authenticity, research accuracy, engagement, and more. Use the "Run Quality Pipeline" button in the toolbar above to start.`}
                </p>
              </div>
            )}

            {/* Pipeline running */}
            {pipelineRunning && (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fg-2)", fontSize: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                Running quality checkpoints...
              </div>
            )}

            {/* Pipeline results */}
            {pipelineRun && !pipelineRunning && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <ImpactScoreCard score={pipelineRun.betterish_score} />
                <CheckpointResultsPanel results={pipelineRun.gate_results} blockedAt={pipelineRun.blocked_at || undefined} />
                {pipelineRun.status === "BLOCKED" && (
                  <PipelineBlockedAlert
                    blockedAt={pipelineRun.blocked_at || undefined}
                    feedback={pipelineRun.gate_results.find(g => g.status === "FAIL")?.feedback || pipelineRun.gate_results[pipelineRun.gate_results.length - 1]?.feedback}
                  />
                )}
              </div>
            )}

            {/* Gate score bars (from initial Impact Score scoring) */}
            {gateEntries.length > 0 && !pipelineRun && (
              <div style={{ marginTop: 16 }}>
                {gates?.summary && <p style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 14 }}>{gates.summary}</p>}
                <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 11, color: "var(--fg-3)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#50c8a0" }} /> 80+ Strong</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--cornflower)" }} /> 60-79 Developing</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#E53935" }} /> Below 60</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {gateEntries.map(({ key, label, value }) => {
                    const v = value as number;
                    const cl = gateBarColor(v);
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 90, fontSize: 12, color: "var(--fg-3)" }}>{label}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--bg-3)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, v))}%`, background: cl, borderRadius: 3, transition: "width 0.4s ease" }} />
                        </div>
                        <span style={{ width: 40, textAlign: "right" as const, fontSize: 12, fontVariantNumeric: "tabular-nums", color: cl }}>{v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Web Preview (inline) ──────────────────────────────────── */}
      {previewHtml && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "0 16px 32px" : "0 32px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Web Preview</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  const blob = new Blob([previewHtml!], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${output!.title.replace(/[^\w\s-]/g, "")}.html`; a.click();
                  URL.revokeObjectURL(url);
                  toast("HTML file downloaded");
                }}
                style={{ background: "none", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: "var(--fg-3)", fontFamily: font }}
              >
                Download HTML
              </button>
              <button onClick={() => setPreviewHtml(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-tertiary)" }}>Close</button>
            </div>
          </div>
          <iframe
            srcDoc={previewHtml}
            title="Output preview"
            className="liquid-glass-card"
            style={{ width: "100%", height: 600, border: "none", borderRadius: 14, background: "var(--glass-card)" }}
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* ── Delete (bottom of page, subtle) ──────────────────────── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 32px 48px", textAlign: "center" }}>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--fg-3)", fontFamily: font, padding: "8px 16px", transition: "color 0.15s", opacity: 0.6 }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--fg-3)"; e.currentTarget.style.opacity = "0.6"; }}
        >
          Delete this output
        </button>
      </div>

      {/* ── Delete confirmation modal ─────────────────────────────── */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="liquid-glass-card" style={{ padding: 24, maxWidth: 400, width: "100%" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>Delete this output?</p>
            <p style={{ fontSize: 14, color: "var(--fg-2)", marginBottom: 20 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="liquid-glass-btn" onClick={() => setShowDeleteConfirm(false)} style={{ padding: "10px 18px", fontSize: 14, fontFamily: font }}>Cancel</button>
              <button onClick={handleDeleteOutput} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: font }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
