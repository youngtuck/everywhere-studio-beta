import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useShell } from "./StudioShellContext";
import { useState, useRef, useLayoutEffect, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  subscribeWorkSessionMeta,
  getWorkSessionMetaSnapshot,
  getServerWorkSessionMetaSnapshot,
  requestSessionRename,
  subscribeStudioWorkSessionBar,
  getStudioWorkSessionBarSnapshot,
  getServerStudioWorkSessionBarSnapshot,
} from "../../lib/workSessionMetaBridge";
import {
  loadSession,
  workProjectKeyFromShellId,
  workSessionRowHasMeaningfulWork,
  sessionTitleFromWorkSessionRow,
  type WorkSessionDbRow,
} from "../../lib/sessionPersistence";
import type { StudioProject } from "../../context/ProjectContext";
import { createPortal } from "react-dom";
import { useWorkStageFromShell } from "../../hooks/useWorkStageBridge";
import { useStudioProject } from "../../context/ProjectContext";
import { supabase } from "../../lib/supabase";
import { StudioUserAccountMenu } from "./StudioUserAccountMenu";

const PROJECT_MENU_Z = 10120;

// ── Route to breadcrumb config ──────────────────────────────────
type CloudBarPickup = { title: string; projectKey: string; projectName: string };

type CloudWorkRow = WorkSessionDbRow & { projects?: { name: string } | null };

function resolveSessionProjectLabel(
  projects: StudioProject[],
  activeProject: StudioProject | null,
  bar: ReturnType<typeof getStudioWorkSessionBarSnapshot>,
  cloud: CloudBarPickup | null,
): string {
  const k = bar.projectKey ?? cloud?.projectKey ?? null;
  if (k) {
    const match = projects.find(p => workProjectKeyFromShellId(p.id) === k);
    if (match) return match.name;
  }
  const pn = (cloud?.projectName || "").trim();
  if (pn) return pn;
  return activeProject?.name ?? "My Studio";
}

function HomeRouteBreadcrumb({ path, nav }: { path: string; nav: ReturnType<typeof useNavigate> }) {
  const labelMap: Record<string, string> = {
    "/studio/dashboard": "Home",
    "/studio/watch": "Watch",
    "/studio/wrap": "Wrap",
    "/studio/lot": "The Lot",
    "/studio/outputs": "The Catalog",
    "/studio/projects": "Projects",
    "/studio/resources": "Resources",
    "/studio/settings": "Settings",
    "/studio/settings/voice": "Voice DNA",
    "/studio/settings/brand": "Brand DNA",
    "/studio/settings/memory": "Composer memory",
    "/studio/workbench": "Workbench",
  };

  const label = labelMap[path] || "Studio";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span
        onClick={() => nav("/studio/dashboard")}
        style={{ fontSize: 14, color: "var(--fg-3)", cursor: "pointer", transition: "color 0.1s" }}
        onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--fg-2)"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--fg-3)"; }}
      >
        Home
      </span>
      {label !== "Home" && (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--fg-3)", opacity: 0.85 }}>
            <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", padding: "3px 8px", borderRadius: 6, background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.18)" }}>
            {label}
          </span>
        </>
      )}
    </div>
  );
}

function SessionProjectSessionBreadcrumb({ projectLabel, sessionTitle }: { projectLabel: string; sessionTitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--fg)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "min(200px, 28vw)",
        }}
      >
        {projectLabel}
      </span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--fg-3)", opacity: 0.85, flexShrink: 0 }}>
        <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--fg)",
          padding: "3px 8px",
          borderRadius: 6,
          background: "rgba(200,169,110,0.1)",
          border: "1px solid rgba(200,169,110,0.18)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "min(240px, 36vw)",
        }}
      >
        {sessionTitle}
      </span>
    </div>
  );
}

function useStudioTopBarCenterBreadcrumbs(): {
  center: ReactNode;
  showReturnPill: boolean;
  onReturnToSession: () => void;
} {
  const loc = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const { projects, activeProject, setActiveProjectId } = useStudioProject();
  const [cloudBarPickup, setCloudBarPickup] = useState<CloudBarPickup | null>(null);

  const bar = useSyncExternalStore(
    subscribeStudioWorkSessionBar,
    getStudioWorkSessionBarSnapshot,
    getServerStudioWorkSessionBarSnapshot,
  );

  const path = loc.pathname;
  const onWork = path.startsWith("/studio/work");
  const hasContext = bar.hasWorkSessionContext || cloudBarPickup != null;

  useEffect(() => {
    if (!user?.id || onWork || loadSession()) {
      setCloudBarPickup(null);
      return;
    }
    let cancelled = false;
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
        const rows = (data || []) as CloudWorkRow[];
        const filtered = rows
          .filter(r => workSessionRowHasMeaningfulWork(r as WorkSessionDbRow))
          .slice(0, 1);
        const row = filtered[0];
        if (cancelled) return;
        if (!row) {
          setCloudBarPickup(null);
          return;
        }
        const pk = row.project_key || "default";
        const projectName = (row.projects?.name || "").trim();
        setCloudBarPickup({
          title: sessionTitleFromWorkSessionRow(row as WorkSessionDbRow),
          projectKey: pk,
          projectName,
        });
      } catch {
        if (!cancelled) setCloudBarPickup(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, onWork, bar.hasLocalMirror]);

  const projectLabel = resolveSessionProjectLabel(projects, activeProject, bar, cloudBarPickup);
  const sessionTitleForDisplay = cloudBarPickup?.title ?? bar.title;

  const onReturnToSession = () => {
    const pk = bar.projectKey ?? cloudBarPickup?.projectKey ?? "default";
    if (pk !== "default") setActiveProjectId(pk);
    else setActiveProjectId("default");
    if (loadSession()) {
      nav("/studio/work");
    } else {
      nav(`/studio/work?resume=work_session&projectKey=${encodeURIComponent(pk)}`);
    }
  };

  if (onWork) {
    return {
      center: <WorkBreadcrumb />,
      showReturnPill: false,
      onReturnToSession,
    };
  }

  // CO_030: Session breadcrumb scoped to Work routes only.
  // Non-Work pages show page-level breadcrumb, not the session title.
  return {
    center: <HomeRouteBreadcrumb path={path} nav={nav} />,
    showReturnPill: false,
    onReturnToSession,
  };
}

// ── Work Pipeline Breadcrumb ────────────────────────────────────
const WORK_STAGES = ["Intake", "Outline", "Edit", "Review"] as const;
type WorkStage = typeof WORK_STAGES[number];

/** Display-only: internal stage id stays `"Edit"`. */
function workStagePillLabel(s: WorkStage): string {
  return s === "Edit" ? "Draft" : s;
}

function WorkBreadcrumb() {
  const stageRaw = useWorkStageFromShell();
  const { intakeProgress } = useShell();
  const stage: WorkStage = WORK_STAGES.includes(stageRaw as WorkStage)
    ? (stageRaw as WorkStage)
    : "Review";

  // CO_017 Fix 3: Hide stepper on fresh Intake until first message
  if (stage === "Intake" && intakeProgress.questionCount === 0) return null;

  const stages = WORK_STAGES;
  const activeIdx = stages.indexOf(stage);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {stages.map((s, i) => {
        const isDone = i < activeIdx;
        const isActive = i === activeIdx;
        const canClick = i <= activeIdx;

        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--fg-3)", opacity: 0.8, margin: "0 1px" }}>
                <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span
              onClick={() => {
                if (canClick) {
                  window.__ewSetWorkStage?.(s);
                }
              }}
              className={isActive ? "liquid-glass-pill" : ""}
              style={{
                fontSize: 14,
                padding: "4px 10px",
                cursor: canClick ? "pointer" : "default",
                transition: "color 0.15s ease, opacity 0.15s ease",
                opacity: isActive || isDone ? 1 : 0.78,
              }}
              onMouseEnter={e => {
                const label = e.currentTarget.querySelector(".work-stage-pill-label");
                if (!isActive && label) (label as HTMLElement).style.color = "var(--fg-2)";
              }}
              onMouseLeave={e => {
                const label = e.currentTarget.querySelector(".work-stage-pill-label");
                if (!isActive && label) (label as HTMLElement).style.color = "var(--fg-3)";
              }}
            >
              <span
                className="work-stage-pill-label"
                style={{
                  position: "relative",
                  zIndex: 3,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--fg)" : "var(--fg-3)",
                }}
              >
                {workStagePillLabel(s)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Project dropdown (Supabase, matches StudioSidebar query) ──
function ProjectSwitcher({ appearance = "context" }: { appearance?: "default" | "context" }) {
  const { user } = useAuth();
  const { projects, activeProject, activeProjectId, setActiveProjectId, refreshProjects, loading } = useStudioProject();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameErr, setRenameErr] = useState<string | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const place = () => {
      const r = el.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(240, r.width),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewName("");
      setCreateErr(null);
      setEditingId(null);
      setEditName("");
      setRenameErr(null);
    }
  }, [open]);

  const displayName = activeProject?.name ?? (loading ? "Loading…" : "Project");

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setCreateBusy(true);
    setCreateErr(null);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: newName.trim(),
          description: "",
        })
        .select("id")
        .single();
      if (error) throw error;
      await refreshProjects();
      if (data?.id) setActiveProjectId(data.id);
      setNewName("");
      setCreating(false);
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create project.";
      setCreateErr(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  const canRenameProject = (id: string) => id !== "default" && !!user;

  const onRenameSubmit = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!user || !editName.trim()) return;
    setRenameBusy(true);
    setRenameErr(null);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ name: editName.trim(), updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProjects();
      setEditingId(null);
      setEditName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not rename project.";
      setRenameErr(msg);
    } finally {
      setRenameBusy(false);
    }
  };

  const menuPortal = open && menuPos && typeof document !== "undefined"
    ? createPortal(
        <>
          <button
            type="button"
            aria-label="Close project menu"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: PROJECT_MENU_Z - 1,
              border: "none", padding: 0, margin: 0, cursor: "default",
              background: "transparent",
            }}
          />
          <div
            className="liquid-glass-menu"
            role="menu"
            aria-label="Projects"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: PROJECT_MENU_Z,
              overflow: "hidden",
              maxHeight: "min(360px, calc(100vh - 80px))",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              {projects.map(p => (
                editingId === p.id ? (
                  <form
                    key={p.id}
                    onSubmit={e => void onRenameSubmit(e, p.id)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      padding: "8px 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  >
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                      placeholder="Project name"
                      aria-label="Project name"
                      onKeyDown={e => {
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditName("");
                          setRenameErr(null);
                        }
                      }}
                      style={{
                        width: "100%", boxSizing: "border-box", marginBottom: 6,
                        padding: "7px 9px", borderRadius: 8, fontSize: 12, fontFamily: "inherit",
                        border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)",
                        color: "rgba(255,255,255,0.92)", outline: "none",
                      }}
                    />
                    {renameErr && (
                      <div style={{ fontSize: 10, color: "#f87171", marginBottom: 6 }}>{renameErr}</div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="submit"
                        disabled={renameBusy || !editName.trim()}
                        style={{
                          flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                          border: "none", cursor: renameBusy || !editName.trim() ? "default" : "pointer",
                          background: "rgba(245,198,66,0.28)", color: "rgba(255,255,255,0.95)",
                          opacity: renameBusy || !editName.trim() ? 0.5 : 1, fontFamily: "inherit",
                        }}
                      >
                        {renameBusy ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditName(""); setRenameErr(null); }}
                        style={{
                          padding: "6px 8px", borderRadius: 8, fontSize: 14,
                          border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
                          color: "rgba(255,255,255,0.75)", cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    key={p.id}
                    style={{
                      display: "flex", alignItems: "stretch",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: p.id === activeProjectId ? "rgba(245,198,66,0.08)" : "transparent",
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setActiveProjectId(p.id); setOpen(false); }}
                      style={{
                        flex: 1, minWidth: 0, textAlign: "left" as const,
                        padding: "9px 8px 9px 12px", fontSize: 12, cursor: "pointer",
                        color: p.id === activeProjectId ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.82)",
                        fontWeight: p.id === activeProjectId ? 600 : 400,
                        background: "transparent",
                        border: "none", fontFamily: "inherit",
                        transition: "background 0.12s",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                      onMouseEnter={e => {
                        if (p.id !== activeProjectId) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {p.name}
                      </span>
                      {p.is_default && (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.62)", flexShrink: 0 }}>default</span>
                      )}
                    </button>
                    {canRenameProject(p.id) && (
                      <button
                        type="button"
                        title="Rename project"
                        aria-label={`Rename ${p.name}`}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingId(p.id);
                          setEditName(p.name);
                          setRenameErr(null);
                        }}
                        style={{
                          flexShrink: 0, width: 36, padding: 0,
                          border: "none", borderLeft: "1px solid rgba(255,255,255,0.08)",
                          background: "transparent", cursor: "pointer", color: "rgba(255,255,255,0.55)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              {!creating ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setCreating(true); setCreateErr(null); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left" as const,
                    padding: "10px 12px", fontSize: 12, fontWeight: 600,
                    color: "#F5C642", cursor: "pointer", background: "rgba(245,198,66,0.06)",
                    border: "none", fontFamily: "inherit",
                  }}
                >
                  + New Project
                </button>
              ) : (
                <form onSubmit={onCreate} style={{ padding: 10 }} onClick={e => e.stopPropagation()}>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Project name"
                    autoFocus
                    style={{
                      width: "100%", boxSizing: "border-box", marginBottom: 8,
                      padding: "8px 10px", borderRadius: 8, fontSize: 12, fontFamily: "inherit",
                      border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)",
                      color: "rgba(255,255,255,0.92)", outline: "none",
                    }}
                  />
                  {createErr && (
                    <div style={{ fontSize: 14, color: "#f87171", marginBottom: 8 }}>{createErr}</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      disabled={createBusy || !newName.trim()}
                      style={{
                        flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                        border: "none", cursor: createBusy || !newName.trim() ? "default" : "pointer",
                        background: "rgba(245,198,66,0.25)", color: "rgba(255,255,255,0.95)",
                        opacity: createBusy || !newName.trim() ? 0.5 : 1,
                      }}
                    >
                      {createBusy ? "Creating…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreating(false); setNewName(""); setCreateErr(null); }}
                      style={{
                        padding: "7px 10px", borderRadius: 8, fontSize: 14,
                        border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
                        color: "rgba(255,255,255,0.75)", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  const isContext = appearance === "context";
  const triggerStyle = isContext
    ? {
        display: "flex" as const,
        alignItems: "center" as const,
        gap: 4,
        maxWidth: 200,
        minWidth: 0,
        flexShrink: 1,
        padding: "2px 4px",
        borderRadius: 4,
        border: "none",
        background: "transparent",
        cursor: "pointer" as const,
        fontFamily: "inherit" as const,
      }
    : {
        display: "flex" as const,
        alignItems: "center" as const,
        gap: 6,
        maxWidth: 200,
        padding: "5px 10px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.45)",
        cursor: "pointer" as const,
        fontFamily: "inherit" as const,
      };
  const labelStyle = isContext
    ? {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--fg-2)",
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis" as const,
        flex: 1,
        minWidth: 0,
      }
    : {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--fg)",
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis" as const,
        flex: 1,
        minWidth: 0,
      };
  const chevronColor = "var(--fg-3)";

  return (
    <div style={{ position: "relative", flexShrink: isContext ? 1 : 0, minWidth: 0 }}>
      <button
        type="button"
        ref={anchorRef}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={triggerStyle}
      >
        <span style={labelStyle}>
          {displayName}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: chevronColor, flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {menuPortal}
    </div>
  );
}

/** "/" between project and session on Work when a session is active. */
function WorkSessionPathDivider() {
  const loc = useLocation();
  const meta = useSyncExternalStore(
    subscribeWorkSessionMeta,
    getWorkSessionMetaSnapshot,
    getServerWorkSessionMetaSnapshot,
  );
  if (!loc.pathname.startsWith("/studio/work") || !meta.active) return null;
  return (
    <span
      aria-hidden
      style={{
        fontSize: 12,
        color: "var(--fg-3)",
        flexShrink: 0,
        userSelect: "none",
        lineHeight: 1,
        padding: "0 2px",
      }}
    >
      /
    </span>
  );
}

function WorkSessionTitleChip() {
  const loc = useLocation();
  const onWork = loc.pathname.startsWith("/studio/work");
  const meta = useSyncExternalStore(
    subscribeWorkSessionMeta,
    getWorkSessionMetaSnapshot,
    getServerWorkSessionMetaSnapshot,
  );
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const skipBlurCommit = useRef(false);

  if (!onWork || !meta.active) return null;

  if (editing) {
    return (
      <input
        autoFocus
        value={draftName}
        onChange={e => setDraftName(e.target.value)}
        maxLength={200}
        aria-label="Session name"
        placeholder="Name this session"
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            requestSessionRename(draftName.trim());
            setEditing(false);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            skipBlurCommit.current = true;
            setEditing(false);
          }
        }}
        onBlur={() => {
          if (skipBlurCommit.current) {
            skipBlurCommit.current = false;
            return;
          }
          requestSessionRename(draftName.trim());
          setEditing(false);
        }}
        style={{
          width: 200,
          maxWidth: "min(280px, 36vw)",
          boxSizing: "border-box",
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "inherit",
          border: "1px solid var(--glass-border)",
          background: "rgba(0,0,0,0.03)",
          color: "var(--fg)",
          outline: "none",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraftName(meta.title);
        setEditing(true);
      }}
      title="Click to name this session (search and sync use this title)"
      style={{
        maxWidth: "min(280px, 36vw)",
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid var(--glass-border)",
        background: "rgba(0,0,0,0.03)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left" as const,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <span style={{
        display: "block",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--fg)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {meta.title}
      </span>
    </button>
  );
}

function SearchIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Search (⌘K)"
      aria-label="Open search"
      style={{
        background: "transparent", border: "none",
        color: "var(--fg-3)", cursor: "pointer", padding: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8, transition: "color 0.12s, background 0.12s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "var(--fg)";
        e.currentTarget.style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = "var(--fg-3)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    </button>
  );
}

// ── Main TopBar ─────────────────────────────────────────────────
export default function StudioTopBar() {
  const { setDiscoverOpen, setSearchOpen } = useShell();
  const { center, showReturnPill, onReturnToSession } = useStudioTopBarCenterBreadcrumbs();

  return (
    <div className="liquid-glass" style={{
      height: 50,
      borderRadius: 0,
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: 12,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, minWidth: 0 }}>
        <ProjectSwitcher />
        <WorkSessionPathDivider />
        <WorkSessionTitleChip />
      </div>

      {showReturnPill && (
        <button
          type="button"
          onClick={onReturnToSession}
          style={{
            flexShrink: 0,
            fontSize: 14,
            lineHeight: 1.2,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 999,
            border: "1px solid rgba(200, 169, 110, 0.55)",
            background: "rgba(200, 169, 110, 0.08)",
            color: "var(--fg)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.12s, border-color 0.12s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(200, 169, 110, 0.14)";
            e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.75)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(200, 169, 110, 0.08)";
            e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.55)";
          }}
        >
          Return to session
        </button>
      )}

      {/* Breadcrumbs */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", minWidth: 0 }}>
        {center}
      </div>

      {/* Right: system actions. CO_038A removed the "+ New Session"
          button and its trailing Divider; New Session now lives in the
          left sidebar above Watch (StudioSidebar.tsx, NewSessionButton). */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <SearchIconButton onClick={() => setSearchOpen(true)} />

        <button
          onClick={() => setDiscoverOpen(true)}
          style={{
            background: "transparent", border: "none",
            color: "var(--fg-3)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", padding: "4px", lineHeight: 1,
            fontFamily: "var(--font)", transition: "color 0.12s",
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--fg)"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--fg-3)"; }}
          title="Discover"
        >
          ?
        </button>

        <StudioUserAccountMenu variant="topbar" />
      </div>
    </div>
  );
}

