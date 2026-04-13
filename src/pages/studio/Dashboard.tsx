import { useEffect, useState, useLayoutEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMobile } from "../../hooks/useMobile";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useStudioProject } from "../../context/ProjectContext";
import { timeAgo } from "../../utils/timeAgo";
import { useShell } from "../../components/studio/StudioShell";
import {
  loadSession,
  getWorkStageFromPersisted,
  persistedSessionHasPickup,
  workSessionRowHasMeaningfulWork,
  type PersistedSession,
  type WorkSessionDbRow,
} from "../../lib/sessionPersistence";
import "./shared.css";

// ── Helpers ────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function trunc60(s: string): string {
  const t = s.trim();
  if (t.length <= 60) return t;
  return `${t.slice(0, 57)}...`;
}

function pickupTitleFromRow(row: WorkSessionDbRow): string {
  const st = (row.session_title || "").trim();
  if (st) return trunc60(st);
  const p = row.payload as PersistedSession | null;
  const messages = (Array.isArray(row.messages) && row.messages.length > 0
    ? row.messages
    : p?.messages) as Array<{ role?: string; content?: string }> | undefined;
  const userLine = messages?.find(m => m.role === "user")?.content?.trim();
  return trunc60(userLine || "Untitled session");
}

type WorkSessionPickupRow = WorkSessionDbRow & {
  projects?: { name: string } | null;
};

// ── Types ──────────────────────────────────────────────────────
interface RecentOutput {
  id: string;
  title: string;
  output_type: string;
  score: number;
  created_at: string;
  updated_at?: string;
}

interface BriefingSignal {
  label: string;
  description: string;
}

// ── Dashboard right-panel content ─────────────────────────────
function HomeDashContent({
  sessions,
  formatsExported,
  signalsTracked,
  inProgressTitle,
  inProgressStage,
  inProgressFlags,
  onGoToWatch,
}: {
  sessions: number;
  formatsExported: number;
  signalsTracked: number;
  inProgressTitle: string | null;
  inProgressStage: string;
  inProgressFlags: number;
  onGoToWatch: () => void;
}) {
  const S = { label: {
    fontFamily: "var(--studio-mono-font)",
    fontSize: "var(--studio-label-size)",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--fg-3)",
    marginBottom: 6,
  } };
  const row = (label: string, value: string | number) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <span style={{ color: "var(--fg-2)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--fg)" }}>{value}</span>
    </div>
  );

  return (
    <>
      {/* This week */}
      <div style={{ marginBottom: 14 }}>
        <div style={S.label}>This week</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {row("Sessions", sessions)}
          {row("Formats exported", formatsExported)}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}>
            <span style={{ color: "var(--fg-2)" }}>Signals tracked</span>
            <span style={{ fontWeight: 600, color: "var(--fg)" }}>{signalsTracked}</span>
          </div>
        </div>
      </div>

      {/* In progress */}
      {inProgressTitle && (
        <div style={{ marginBottom: 14 }}>
          <div style={S.label}>In progress</div>
          <div style={{ fontSize: 11, color: "var(--fg-2)", padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.06)", lineHeight: 1.4 }}>
            {inProgressTitle}
            <br />
            <span style={{ fontSize: 10, color: "#F5C642", fontWeight: 600 }}>
              {inProgressStage}{inProgressFlags > 0 ? ` · ${inProgressFlags} flag${inProgressFlags > 1 ? "s" : ""}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Today's briefing */}
      <div style={{ marginBottom: 14 }}>
        <div style={S.label}>Today's briefing</div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: 1.7, fontStyle: "normal" }}>
          Run a briefing in Watch to see today's signals here.
        </div>
        <button
          onClick={onGoToWatch}
          style={{
            marginTop: 6, fontSize: 10, color: "#6BA8E8",
            fontWeight: 600, cursor: "pointer", background: "none",
            border: "none", padding: 0, fontFamily: "var(--font)",
          }}
        >
          Full briefing in Watch
        </button>
      </div>
    </>
  );
}

// ── StepHint helper ───────────────────────────────────────────
function StepHint({ number, text, active }: { number: number; text: string; active?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      opacity: active ? 1 : 0.72,
      transition: "opacity 0.3s",
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700,
        background: active ? "var(--fg)" : "var(--glass-card)",
        color: active ? "var(--bg)" : "var(--fg-3)",
        border: active ? "none" : "1px solid var(--glass-border)",
        backdropFilter: active ? "none" : "var(--glass-blur-light)",
        WebkitBackdropFilter: active ? "none" : "var(--glass-blur-light)",
      }}>
        {number}
      </div>
      <p style={{
        fontSize: 13, color: active ? "var(--fg-2)" : "var(--fg-3)",
        lineHeight: 1.5, margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate();
  const isMobile = useMobile();
  const { user, displayName } = useAuth();
  const { setActiveProjectId } = useStudioProject();
  const { setDashContent } = useShell();

  const [outputs, setOutputs] = useState<RecentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [workPickupRows, setWorkPickupRows] = useState<WorkSessionPickupRow[]>([]);
  const [workPickupsLoading, setWorkPickupsLoading] = useState(true);

  // Pull recent outputs
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("outputs")
          .select("id, title, output_type, score, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setOutputs((data as RecentOutput[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setWorkPickupRows([]);
      setWorkPickupsLoading(false);
      return;
    }
    let cancelled = false;
    setWorkPickupsLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("work_sessions")
          .select(`
            id,
            session_title,
            stage,
            work_stage,
            updated_at,
            project_key,
            project_id,
            messages,
            outline_rows,
            draft,
            payload,
            projects ( name )
          `)
          .eq("user_id", user.id)
          .neq("stage", "complete")
          .order("updated_at", { ascending: false })
          .limit(12);
        if (error) throw error;
        const rows = (data || []) as WorkSessionPickupRow[];
        const filtered = rows
          .filter(r => workSessionRowHasMeaningfulWork(r as WorkSessionDbRow))
          .slice(0, 3);
        if (!cancelled) setWorkPickupRows(filtered);
      } catch {
        if (!cancelled) setWorkPickupRows([]);
      } finally {
        if (!cancelled) setWorkPickupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const localFallbackSession = useMemo(() => {
    if (workPickupsLoading) return null;
    if (workPickupRows.length > 0) return null;
    const p = loadSession();
    if (!p || !persistedSessionHasPickup(p)) return null;
    return p;
  }, [workPickupsLoading, workPickupRows.length]);

  const goToWorkSessionRow = (row: WorkSessionPickupRow) => {
    const pk = row.project_key || "default";
    if (pk !== "default") setActiveProjectId(pk);
    else setActiveProjectId("default");
    nav(`/studio/work?resume=work_session&projectKey=${encodeURIComponent(pk)}`);
  };

  // Inject dashboard panel content
  useLayoutEffect(() => {
    const inProgress = outputs.find(o => !o.score || o.score < 75);

    setDashContent(
      <HomeDashContent
        sessions={outputs.length}
        formatsExported={outputs.filter(o => o.score >= 75).length}
        signalsTracked={0}
        inProgressTitle={inProgress?.title ?? null}
        inProgressStage="In progress"
        inProgressFlags={0}
        onGoToWatch={() => nav("/studio/watch")}
      />
    );

    return () => setDashContent(null);
  }, [outputs, setDashContent, nav]);

  const firstName = displayName ? displayName.split(" ")[0] : "there";

  const pipelineIdea = outputs[1] ?? null;
  const inProgress = outputs.find(o => !o.score || o.score < 75);

  const pickupSectionVisible =
    workPickupsLoading
    || workPickupRows.length > 0
    || localFallbackSession != null
    || outputs.length > 0
    || loading;

  // ── Briefing signals — live from Watch only, no static fallback
  const signals: BriefingSignal[] = [];

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding: isMobile ? "24px 20px" : "32px 28px 48px",
      width: "100%",
      maxWidth: 520,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      {/* Greeting */}
      <div style={{
        fontFamily: "var(--studio-display-font)",
        fontSize: "var(--studio-display-size)",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: "var(--fg)",
        marginBottom: 4,
        textAlign: "center",
        width: "100%",
      }}>
        {getGreeting()}, {firstName}.
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 28, textAlign: "center", width: "100%" }}>
        {getDateLabel()}
      </div>

      {/* Start something new */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            nav("/studio/work");
          }
        }}
        className="liquid-glass-card dashboard-home-card"
        onClick={() => nav("/studio/work")}
        style={{
          padding: "24px 28px",
          marginBottom: 24,
          cursor: "pointer",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          background: "rgba(245, 198, 66, 0.12)",
          border: "1px solid rgba(245, 198, 66, 0.28)",
        }}>
          <svg style={{ width: 20, height: 20, stroke: "var(--gold-bright)", strokeWidth: 2.5, fill: "none" }} viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>Start something new</div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, maxWidth: 320 }}>
          Drop an idea, a transcript, or just start talking.
        </div>
      </div>

      {/* Pick up where you left off (work_sessions, up to 3; sessionStorage fallback) */}
      {pickupSectionVisible && (
        <div style={{
          fontFamily: "var(--studio-mono-font)",
          fontSize: "var(--studio-label-size)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "var(--fg-3)",
          marginBottom: 14,
          textAlign: "center",
          width: "100%",
        }}>
          Or pick up where you left off
        </div>
      )}

      {pickupSectionVisible && workPickupsLoading && user?.id && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", marginBottom: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="liquid-glass-card dashboard-home-card" style={{ padding: "20px 22px", width: "100%" }}>
              <div style={{ height: 13, width: "55%", background: "var(--bg-2)", borderRadius: 3, margin: "0 auto 10px" }} />
              <div style={{ height: 11, width: "75%", background: "var(--bg-2)", borderRadius: 3, margin: "0 auto" }} />
            </div>
          ))}
        </div>
      )}

      {pickupSectionVisible && !workPickupsLoading && workPickupRows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", marginBottom: 12 }}>
          {workPickupRows.map(row => {
            const stageLabel = (row.stage || row.work_stage || "Intake").trim() || "Intake";
            const projectName = row.projects?.name?.trim()
              || (row.project_key === "default" ? "My Studio" : "Project");
            const updated = row.updated_at;
            return (
              <HomeCard
                key={row.id}
                accentColor="var(--gold-bright)"
                label="Work"
                labelColor="var(--fg-3)"
                title={pickupTitleFromRow(row as WorkSessionDbRow)}
                meta={`${stageLabel} · ${projectName} · ${timeAgo(updated)}`}
                cta="Resume"
                onCta={() => goToWorkSessionRow(row)}
              />
            );
          })}
        </div>
      )}

      {pickupSectionVisible && !workPickupsLoading && workPickupRows.length === 0 && localFallbackSession && (
        <div style={{ marginBottom: 12, width: "100%" }}>
          <HomeCard
            accentColor="var(--gold-bright)"
            label="Work"
            labelColor="var(--fg-3)"
            title={trunc60(
              (localFallbackSession.sessionTitle || "").trim()
                || localFallbackSession.messages?.find(m => m.role === "user")?.content?.trim()
                || "Saved on this device",
            )}
            meta={`${getWorkStageFromPersisted(localFallbackSession)} · This browser · ${timeAgo(new Date(localFallbackSession.timestamp).toISOString())}`}
            cta="Resume"
            onCta={() => nav("/studio/work?resume=local")}
          />
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>

          {/* Briefing card — only shown when signals exist */}
          {signals.length > 0 ? (
            <HomeCard
              accentColor="var(--fg)"
              label="Watch"
              labelColor="var(--fg-3)"
              title={signals[0].label}
              meta={signals[0].description}
              cta="Go to Watch"
              onCta={() => nav("/studio/watch")}
            />
          ) : (
            <HomeCard
              accentColor="var(--fg)"
              label="Watch"
              labelColor="var(--fg-3)"
              title="Run a briefing to see today's signals"
              meta="Watch scans your landscape and surfaces what matters."
              cta="Go to Watch"
              onCta={() => nav("/studio/watch")}
            />
          )}

          {/* Pipeline idea */}
          {pipelineIdea && (
            <HomeCard
              accentColor="var(--blue)"
              title={pipelineIdea.title}
              meta="Parked in Pipeline. High resonance this week."
              cta="Start this"
              onCta={() => nav("/studio/work")}
            />
          )}

          {/* If no outputs at all, show a first-time card */}
          {outputs.length === 0 && (
            <HomeCard
              accentColor="var(--blue)"
              title="Your first session is waiting"
              meta="Everything you need is ready. Just start talking to Reed."
              cta="Get started"
              onCta={() => nav("/studio/work")}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Home Card ──────────────────────────────────────────────────
function HomeCard({
  accentColor,
  label,
  labelColor,
  title,
  meta,
  cta,
  onCta,
}: {
  accentColor: string;
  label?: string;
  labelColor?: string;
  title: string;
  meta: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCta();
        }
      }}
      className="liquid-glass-card dashboard-home-card"
      onClick={onCta}
      style={{
        padding: "22px 24px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 40,
          height: 3,
          borderRadius: 2,
          background: accentColor,
          marginBottom: 14,
          opacity: 0.95,
        }}
      />
      {label && (
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: labelColor || "var(--fg-3)",
          marginBottom: 8,
        }}>
          {label}
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginBottom: 8, lineHeight: 1.35, maxWidth: 380 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 18, maxWidth: 380 }}>
        {meta}
      </div>
      <div
        className="liquid-glass-btn liquid-glass-btn--sm"
        style={{ pointerEvents: "none" }}
        aria-hidden
      >
        <span className="liquid-glass-btn-label">{cta}</span>
      </div>
    </div>
  );
}
