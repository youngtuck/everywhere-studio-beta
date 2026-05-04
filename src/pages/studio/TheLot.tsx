/**
 * TheLot.tsx — The Pipeline
 * Wired to Supabase outputs (content_state = 'lot' parked, 'in_progress' drafts),
 * work_sessions (active Work sync), sessionStorage (local-only), plus Watch signals.
 */
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useShell } from "../../components/studio/StudioShell";
import { useMobile } from "../../hooks/useMobile";
import { timeAgo } from "../../utils/timeAgo";
import {
  loadSession,
  clearSession,
  getWorkStageFromPersisted,
  type PersistedSession,
} from "../../lib/sessionPersistence";
import { publishWorkSessionMeta } from "../../lib/workSessionMetaBridge";
import "./shared.css";

const FONT = "var(--font)";

type ItemType = "signal" | "idea" | "progress";
type SignalStrength = "getting-stronger" | "steady" | "quieting";
type ProgressKind = "work_session" | "output" | "local";

interface PipelineItem {
  id: string;
  type: ItemType;
  title: string;
  meta: string;
  strength?: SignalStrength;
  strengthLabel?: string;
  subtitle: string;
  detail: string;
  action: string;
  outputId?: string;
  progressKind?: ProgressKind;
  /** When progressKind is work_session, row key for Supabase work_sessions.project_key */
  workSessionProjectKey?: string;
  /** ISO time from Supabase (or local mirror timestamp) for In Progress list display and tiers */
  progressUpdatedAt?: string;
  /** Stage label for the In Progress row badge (tier 1–2 only in the list UI) */
  progressStageBadge?: string;
}

const STATIC_SIGNALS: PipelineItem[] = [];

const TWO_H_MS = 2 * 60 * 60 * 1000;
const SEVEN_D_MS = 7 * 24 * 60 * 60 * 1000;

function formatInProgressListTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function progressRecencyTier(iso: string | undefined): 1 | 2 | 3 {
  if (!iso) return 3;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 3;
  const ageMs = Date.now() - t;
  if (ageMs <= TWO_H_MS) return 1;
  if (ageMs <= SEVEN_D_MS) return 2;
  return 3;
}

/** Match Work pipeline labels (Edit shows as Draft in the list). */
function stageBadgeLabel(stage: string): string {
  const s = (stage || "").trim();
  if (!s) return "Work";
  if (s === "Edit") return "Draft";
  return s;
}

function strengthColor(s?: SignalStrength): string {
  if (s === "getting-stronger") return "var(--blue)";
  if (s === "steady") return "var(--line-2)";
  return "var(--line)";
}

function PipelineDetailPanel({
  item, onActivate, onRemove, onSendToWrap,
}: {
  item: PipelineItem;
  onActivate: () => void;
  onRemove: () => void;
  onSendToWrap?: () => void;
}) {
  const isSignal = item.type === "signal";
  const isProgress = item.type === "progress";
  const kindLabel = isSignal ? "Signal" : isProgress ? "In progress" : "Parked idea";
  return (
    <div className="liquid-glass-card" style={{ padding: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 4 }}>
          {kindLabel}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 4, lineHeight: 1.4 }}>{item.title}</div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginBottom: 12 }}>{item.subtitle}</div>
        <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6 }}>{item.detail}</div>
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 8 }}>Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            onClick={onActivate}
            style={{
              width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 8, border: "none",
              background: isSignal ? "var(--blue)" : "var(--fg)", fontSize: 11, color: "#fff", cursor: "pointer", fontFamily: FONT, fontWeight: 600,
            }}
          >
            {item.action}
          </button>
          {!isProgress && item.outputId && onSendToWrap && (
            <button type="button" className="liquid-glass-btn-gold" onClick={onSendToWrap} style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px" }}>
              <span className="liquid-glass-btn-gold-label">Send to Wrap</span>
            </button>
          )}
          {!isProgress && (
            <button type="button" className="liquid-glass-btn" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 12px" }}>
              <span className="liquid-glass-btn-label" style={{ color: "var(--fg-2)", fontWeight: 400 }}>Edit note</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            style={{ width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", fontSize: 11, color: "var(--danger)", cursor: "pointer", fontFamily: FONT }}
          >
            {isProgress ? (item.progressKind === "output" ? "Delete draft" : "Clear session") : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InProgressSessionRow({
  item,
  isLast,
  onOpen,
}: {
  item: PipelineItem;
  isLast: boolean;
  onOpen: () => void;
}) {
  const iso = item.progressUpdatedAt;
  const tier = progressRecencyTier(iso);
  const timeStr = formatInProgressListTime(iso);
  const showBadge = tier !== 3 && Boolean(item.progressStageBadge);

  const titleStyle =
    tier === 1
      ? { fontSize: 14, fontWeight: 600 as const, color: "var(--fg)", opacity: 1, lineHeight: 1.35 }
      : tier === 2
        ? { fontSize: 13, fontWeight: 400 as const, color: "var(--fg)", opacity: 0.85, lineHeight: 1.35 }
        : { fontSize: 12, fontWeight: 400 as const, color: "var(--fg-3)", lineHeight: 1.35 };

  const tsStyle =
    tier === 1
      ? { fontSize: 11, color: "var(--gold-bright)", opacity: 0.7 }
      : tier === 2
        ? { fontSize: 11, color: "var(--fg-3)" }
        : { fontSize: 11, color: "var(--fg-3)", opacity: 0.5 };

  const badgeStyle =
    tier === 1
      ? {
        fontSize: 10,
        fontWeight: 600 as const,
        borderRadius: 4,
        padding: "2px 7px",
        background: "rgba(245,198,66,0.12)",
        color: "var(--gold-bright)",
        flexShrink: 0,
      }
      : {
        fontSize: 10,
        fontWeight: 600 as const,
        borderRadius: 4,
        padding: "2px 7px",
        background: "rgba(255,255,255,0.06)",
        color: "var(--fg-2)",
        flexShrink: 0,
      };

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        textAlign: "left",
        padding: "12px 16px",
        border: "none",
        borderBottom: isLast ? "none" : "1px solid var(--glass-border)",
        borderLeft: tier === 1 ? "2px solid var(--gold-bright)" : "2px solid transparent",
        background: "transparent",
        cursor: "pointer",
        fontFamily: FONT,
        boxSizing: "border-box",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
        <div style={{ ...titleStyle, flex: 1, minWidth: 0 }}>{item.title}</div>
        {showBadge && item.progressStageBadge ? (
          <span style={badgeStyle}>{item.progressStageBadge}</span>
        ) : null}
      </div>
      <div style={tsStyle}>{timeStr}</div>
    </button>
  );
}

export default function TheLot() {
  const nav = useNavigate();
  const isMobile = useMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setDashContent } = useShell();

  const [inProgressItems, setInProgressItems] = useState<PipelineItem[]>([]);
  const [parkedIdeas, setParkedIdeas] = useState<PipelineItem[]>([]);
  const [signals, setSignals] = useState<PipelineItem[]>(STATIC_SIGNALS);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const progressList: PipelineItem[] = [];

      if (!user) {
        const local = loadSession();
        const p = local as PersistedSession | null;
        const localHas = Boolean(
          p && ((Array.isArray(p.messages) && p.messages.length > 1) || !!(p.generatedContent || "").trim()),
        );
        if (localHas && p) {
          const stage = getWorkStageFromPersisted(p);
          const updatedIso = new Date(p.timestamp).toISOString();
          const title = (p.sessionTitle || "").trim()
            || p.messages?.find(m => m.role === "user")?.content?.slice(0, 60)
            || "Work on this device";
          progressList.push({
            id: "progress:local",
            type: "progress",
            title: title.slice(0, 60),
            meta: formatInProgressListTime(updatedIso),
            subtitle: "This browser · not synced",
            detail: "Open Work to continue this session on this device.",
            action: "Continue",
            progressKind: "local",
            progressUpdatedAt: updatedIso,
            progressStageBadge: stageBadgeLabel(stage),
          });
        }
        setInProgressItems(progressList);
        setParkedIdeas([]);
        setLoading(false);
        return;
      }

      const [wsRes, outRes, parkedRes] = await Promise.all([
        supabase
          .from("work_sessions")
          .select("session_title, work_stage, stage, updated_at, payload, project_key")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("outputs")
          .select("id, title, output_type, created_at, updated_at, content_state")
          .eq("user_id", user.id)
          .eq("content_state", "in_progress")
          .order("updated_at", { ascending: false })
          .limit(15),
        supabase
          .from("outputs")
          .select("id, title, output_type, created_at, score")
          .eq("user_id", user.id)
          .eq("content_state", "lot")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const ws = wsRes.data;
      const payload = ws?.payload as PersistedSession | undefined;
      const hasWsContent = Boolean(
        ws && (
          (Array.isArray(payload?.messages) && payload.messages.length > 1)
          || !!(payload?.generatedContent || "").trim()
        ),
      );
      let linkedOutputId: string | undefined;
      if (hasWsContent && payload?.generatedOutputId) {
        linkedOutputId = String(payload.generatedOutputId).trim() || undefined;
      }

      if (hasWsContent && ws) {
        const stage = ((ws as { stage?: string }).stage || ws.work_stage || "Intake") as string;
        const updatedAt = String((ws as { updated_at?: string }).updated_at || "");
        const title = (ws.session_title || "").trim() || "Work in progress";
        const pk = String((ws as { project_key?: string }).project_key || "default");
        progressList.push({
          id: `progress:ws:${user.id}:${pk}`,
          type: "progress",
          title: title.slice(0, 60),
          meta: formatInProgressListTime(updatedAt),
          subtitle: "Synced session",
          detail: "Continue in Work at the stage you left off.",
          action: "Continue",
          progressKind: "work_session",
          workSessionProjectKey: pk,
          progressUpdatedAt: updatedAt || undefined,
          progressStageBadge: stageBadgeLabel(stage),
        });
      }

      const local = loadSession();
      const lp = local as PersistedSession | null;
      const localHas = Boolean(
        lp && ((Array.isArray(lp.messages) && lp.messages.length > 1) || !!(lp.generatedContent || "").trim()),
      );
      if (localHas && lp && !hasWsContent) {
        const stage = getWorkStageFromPersisted(lp);
        const updatedIso = new Date(lp.timestamp).toISOString();
        const title = (lp.sessionTitle || "").trim()
          || lp.messages?.find(m => m.role === "user")?.content?.slice(0, 60)
          || "This device";
        progressList.push({
          id: "progress:local",
          type: "progress",
          title: title.slice(0, 60),
          meta: formatInProgressListTime(updatedIso),
          subtitle: "This browser · not synced to cloud yet",
          detail: "Open Work to continue. Sign in to sync across devices.",
          action: "Continue",
          progressKind: "local",
          progressUpdatedAt: updatedIso,
          progressStageBadge: stageBadgeLabel(stage),
        });
      }

      const outputs = outRes.data || [];
      for (const r of outputs) {
        if (linkedOutputId && r.id === linkedOutputId) continue;
        const when = (r.updated_at || r.created_at) as string;
        progressList.push({
          id: `progress:out:${r.id}`,
          type: "progress",
          title: (r.title || "Untitled").slice(0, 60),
          meta: formatInProgressListTime(when),
          subtitle: "Catalog draft · in progress",
          detail: `${r.title || "Untitled"}. Output type: ${(r.output_type || "").replace(/_/g, " ")}.`,
          action: "Continue",
          outputId: r.id,
          progressKind: "output",
          progressUpdatedAt: when,
          progressStageBadge: "Draft",
        });
      }

      setInProgressItems(progressList);

      const parkedData = parkedRes.data;
      if (parkedData && parkedData.length > 0) {
        setParkedIdeas(parkedData.map(r => ({
          id: r.id,
          type: "idea" as ItemType,
          title: r.title || "Untitled",
          meta: `Parked ${timeAgo(r.created_at)}`,
          subtitle: "Parked · In progress",
          detail: `${r.title}. Output type: ${r.output_type?.replace(/_/g, " ")}. Parked ${timeAgo(r.created_at)}.`,
          action: "Activate",
          outputId: r.id,
        })));
      } else {
        setParkedIdeas([]);
      }

      setLoading(false);
    })();
  }, [user]);

  const allItems = [...signals, ...inProgressItems, ...parkedIdeas];
  const selectedItem = allItems.find(i => i.id === selectedId) ?? null;

  const openProgressItem = useCallback((item: PipelineItem) => {
    if (item.type !== "progress") return;
    const k = item.progressKind;
    if (k === "work_session") {
      const pk = item.workSessionProjectKey || "default";
      nav(`/studio/work?resume=work_session&projectKey=${encodeURIComponent(pk)}`);
      return;
    }
    if (k === "local") {
      nav("/studio/work?resume=local");
      return;
    }
    if (k === "output" && item.outputId) {
      const t = encodeURIComponent(item.title);
      nav(`/studio/work?resume=output&outputId=${item.outputId}&title=${t}`);
    }
  }, [nav]);

  const handleActivate = useCallback(() => {
    if (!selectedItem) return;

    if (selectedItem.type === "progress") {
      openProgressItem(selectedItem);
      return;
    }

    if (selectedItem.type === "signal") {
      sessionStorage.setItem("ew-signal-text", selectedItem.title);
      sessionStorage.setItem("ew-signal-detail", selectedItem.detail);
    } else if (selectedItem.outputId) {
      sessionStorage.setItem("ew-reopen-output-id", selectedItem.outputId);
      sessionStorage.setItem("ew-reopen-title", selectedItem.title);
    } else {
      sessionStorage.setItem("ew-signal-text", selectedItem.title);
      sessionStorage.setItem("ew-signal-detail", selectedItem.detail);
    }

    nav("/studio/work");
  }, [selectedItem, openProgressItem, nav]);

  const handleRemove = useCallback(async () => {
    if (!selectedItem) return;

    if (selectedItem.type === "progress") {
      const k = selectedItem.progressKind;
      if (k === "output" && selectedItem.outputId && user) {
        await supabase.from("outputs").delete().eq("id", selectedItem.outputId).eq("user_id", user.id);
        setInProgressItems(prev => prev.filter(i => i.id !== selectedItem.id));
      } else if (k === "work_session" && user) {
        const pk = selectedItem.workSessionProjectKey || "default";
        await supabase.from("work_sessions").delete().eq("user_id", user.id).eq("project_key", pk);
        clearSession();
        publishWorkSessionMeta({ title: "", active: false });
        setInProgressItems(prev => prev.filter(i => i.id !== selectedItem.id));
      } else if (k === "local") {
        clearSession();
        publishWorkSessionMeta({ title: "", active: false });
        setInProgressItems(prev => prev.filter(i => i.id !== selectedItem.id));
      }
      setSelectedId(null);
      toast("Removed from Pipeline.");
      return;
    }

    if (selectedItem.type === "idea" && selectedItem.outputId && user) {
      await supabase.from("outputs").delete().eq("id", selectedItem.outputId).eq("user_id", user.id);
      setParkedIdeas(prev => prev.filter(i => i.id !== selectedItem.id));
    } else if (selectedItem.type === "signal") {
      setSignals(prev => prev.filter(s => s.id !== selectedItem.id));
    }
    setSelectedId(null);
    toast("Removed from Pipeline.");
  }, [selectedItem, user, toast]);

  useLayoutEffect(() => {
    if (selectedItem) {
      setDashContent(
        <PipelineDetailPanel
          item={selectedItem}
          onActivate={handleActivate}
          onRemove={handleRemove}
          onSendToWrap={selectedItem.outputId && selectedItem.type === "idea" ? () => {
            sessionStorage.setItem("ew-wrap-output-id", selectedItem.outputId!);
            sessionStorage.setItem("ew-wrap-title", selectedItem.title);
            nav("/studio/wrap");
          } : undefined}
        />,
      );
    } else {
      setDashContent(
        <div className="liquid-glass-card" style={{ padding: 16, fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6 }}>
          Select a signal or idea to see details.
        </div>,
      );
    }
    return () => setDashContent(null);
  }, [selectedItem, handleActivate, handleRemove, setDashContent, nav]);

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="liquid-glass-card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const PipelineRow = ({ item }: { item: PipelineItem }) => {
    const active = selectedId === item.id;
    return (
      <div
        onClick={() => setSelectedId(item.id)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 4px", borderBottom: "1px solid var(--glass-border)",
          cursor: "pointer", borderRadius: 5,
          background: active ? "rgba(245,198,66,0.06)" : "transparent",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--glass-surface)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? "rgba(245,198,66,0.06)" : "transparent"; }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: active ? "var(--fg)" : "var(--fg-2)", fontWeight: 400, marginBottom: 2 }}>{item.title}</div>
          <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{item.meta}</div>
        </div>
        {item.strengthLabel && (
          <div style={{ fontSize: 9, fontWeight: 600, color: strengthColor(item.strength), whiteSpace: "nowrap" as const }}>{item.strengthLabel}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: FONT }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "12px 20px 10px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>The Pipeline</div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : 20, maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1, minHeight: 0 }}>

      <Card title="Watched signals">
        {signals.length === 0 ? (
          <div style={{ padding: "16px 4px", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6 }}>
            No signals yet. Run a Watch briefing and use "Note it" on signals you want to track here.
          </div>
        ) : (
          signals.map(item => <PipelineRow key={item.id} item={item} />)
        )}
      </Card>

      <Card title="In progress">
        {loading ? (
          <div style={{ padding: "8px 0", fontSize: 11, color: "var(--fg-3)" }}>Loading...</div>
        ) : inProgressItems.length === 0 ? (
          <div style={{ padding: "16px 4px", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6 }}>
            Nothing in progress. Start a session in Work and it will appear here while you have messages or a draft and have not finished Wrap.
          </div>
        ) : (
          <div style={{ marginLeft: -14, marginRight: -14 }}>
            {inProgressItems.map((item, i) => (
              <InProgressSessionRow
                key={item.id}
                item={item}
                isLast={i === inProgressItems.length - 1}
                onOpen={() => openProgressItem(item)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Parked ideas">
        {loading ? (
          <div style={{ padding: "8px 0", fontSize: 11, color: "var(--fg-3)" }}>Loading...</div>
        ) : parkedIdeas.length === 0 ? (
          <div style={{ padding: "16px 4px", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.6 }}>
            No parked ideas yet. When you start a Work session, you can park ideas here to return to later.
          </div>
        ) : (
          parkedIdeas.map(item => <PipelineRow key={item.id} item={item} />)
        )}
      </Card>
      </div>
    </div>
  );
}
