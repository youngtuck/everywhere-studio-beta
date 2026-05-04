import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { APP_VERSION } from "../../lib/constants";
import Logo from "../Logo";

type NavItemDef = {
  path: string;
  label: string;
  desc: string;
  icon: ReactNode;
};

// CO_038A: single flat list of top-level studio items. The collapsible
// Outputs group is gone; Catalog became Library and now lives at the
// same level as Watch / Work / Wrap. New Session is rendered separately
// above this list (NewSessionButton).
const NAV_ITEMS: NavItemDef[] = [
  {
    path: "/studio/watch",
    label: "Watch",
    desc: "Your daily intelligence briefing. Signals, competitors, opportunities.",
    icon: (
      <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    path: "/studio/work",
    label: "Work",
    desc: "Talk to Reed, build outlines, write drafts, run checkpoints.",
    icon: (
      <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    path: "/studio/wrap",
    label: "Wrap",
    desc: "Turn drafts into formatted deliverables for every channel.",
    icon: (
      <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    path: "/studio/outputs",
    label: "Library",
    desc: "Every output type you can produce, organized by category.",
    icon: (
      <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    path: "/studio/lot",
    label: "Pipeline",
    desc: "Ideas parked for later. Resurfaces when timing is right.",
    icon: (
      <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    path: "/studio/resources",
    label: "Files",
    desc: "Uploaded reference docs, brand assets, research materials.",
    icon: (
      <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onMobileClose?: () => void;
}

export default function StudioSidebar({ collapsed = false, onToggleCollapsed, onMobileClose }: SidebarProps) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_admin").eq("id", user.id).single().then(({ data }) => {
      setIsAdmin(!!data?.is_admin);
    });
  }, [user]);

  const isActive = (p: string) => {
    if (p === "/studio/work") return loc.pathname === p || loc.pathname.startsWith("/studio/work/");
    if (p === "/studio/settings") return loc.pathname.startsWith("/studio/settings");
    if (p === "/studio/wrap") return loc.pathname === p || loc.pathname.startsWith("/studio/wrap/");
    if (p === "/studio/outputs") return loc.pathname.startsWith("/studio/outputs");
    return loc.pathname === p || loc.pathname.startsWith(p + "/");
  };

  const goNav = useCallback((path: string) => {
    nav(path);
    onMobileClose?.();
  }, [nav, onMobileClose]);

  // CO_038A: replicates the topbar "+ New Session" button branching.
  // On Work, dispatch the park-session event the WorkSession listener
  // consumes. Elsewhere, set the new-session sessionStorage flag and
  // navigate to Work.
  const handleNewSession = useCallback(() => {
    if (loc.pathname === "/studio/work") {
      window.dispatchEvent(new CustomEvent("ew-new-session-request"));
    } else {
      sessionStorage.setItem("ew-new-session", "1");
      nav("/studio/work");
    }
    onMobileClose?.();
  }, [loc.pathname, nav, onMobileClose]);

  // On mobile, the bottom nav owns Watch / Work / Wrap / Settings / Dashboard.
  // The slide-over sidebar shows the rest (Library, Pipeline, Files).
  const visibleItems = onMobileClose
    ? NAV_ITEMS.filter(i => !["/studio/dashboard", "/studio/watch", "/studio/work", "/studio/wrap", "/studio/settings"].includes(i.path))
    : NAV_ITEMS;

  return (
    <aside
      className={`studio-sidebar-rail ${collapsed ? "studio-sidebar-rail--collapsed" : ""}`}
      style={{ width: collapsed ? 52 : 220 }}
    >
      <div className="studio-sidebar-glass">
        <div className="studio-sidebar-glass-inner">
          {/* Rail top: wordmark + collapse / mobile close */}
          <div className="studio-sidebar-header">
            {!collapsed && !onMobileClose && (
              <>
                <Logo size="sm" variant="dark" onClick={() => nav("/studio/dashboard")} />
                <div style={{ flex: 1, minWidth: 0 }} />
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  title="Collapse sidebar"
                  className="studio-sidebar-icon-btn"
                >
                  <svg style={{ width: 13, height: 13, stroke: "currentColor", strokeWidth: 2, fill: "none" }} viewBox="0 0 24 24">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              </>
            )}

            {collapsed && !onMobileClose && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                title="Expand sidebar"
                className="studio-sidebar-icon-btn"
                style={{ width: "100%", height: 36, borderRadius: 12 }}
              >
                <svg style={{ width: 14, height: 14, stroke: "currentColor", strokeWidth: 2, fill: "none" }} viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {onMobileClose && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.55)" }}>
                  Navigation
                </span>
              </div>
            )}
            {onMobileClose && (
              <button type="button" onClick={onMobileClose} className="studio-sidebar-icon-btn" aria-label="Close menu">
                <span style={{ fontSize: 15, lineHeight: 1, fontWeight: 300 }}>×</span>
              </button>
            )}
          </div>

          <nav className="studio-sidebar-nav">
            {/* New Session is the first item, above Watch. Replaces the
                old topbar "+ New Session" button. */}
            <NewSessionButton collapsed={collapsed} onClick={handleNewSession} />

            {visibleItems.map(({ path, label, icon, desc }) => {
              const active = isActive(path);
              return (
                <NavItem
                  key={path}
                  label={label}
                  desc={desc}
                  icon={icon}
                  active={active}
                  collapsed={collapsed}
                  onClick={() => goNav(path)}
                />
              );
            })}

            {/* Admin */}
            {isAdmin && (
              <>
                {!collapsed && (
                  <div className="studio-sidebar-group-label">
                    Admin
                  </div>
                )}
                {collapsed && <div className="studio-sidebar-group-rule" />}
                <NavItem
                  label="Admin Panel"
                  active={loc.pathname === "/studio/admin"}
                  collapsed={collapsed}
                  onClick={() => { nav("/studio/admin"); onMobileClose?.(); }}
                  icon={
                    <svg style={{ width: 16, height: 16, stroke: "var(--gold)", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                />
              </>
            )}
          </nav>

          {/* CO_038A: Gear icon. Pinned to the bottom of the rail via
              margin-top: auto in the wrapper (see studio-liquid-glass.css).
              Click navigates to /studio/settings (full route, not a drawer,
              confirmed in CO_038B workstream 13). The Settings consolidation
              (Voice DNA, Brand DNA, Composer memory, Research) lands in
              CO_038C. */}
          {user && (
            <div className="studio-sidebar-gear-wrap">
              <button
                type="button"
                onClick={() => { nav("/studio/settings"); onMobileClose?.(); }}
                className="studio-sidebar-icon-btn studio-sidebar-gear"
                aria-label="Settings"
                title="Settings"
              >
                <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          )}

          {!collapsed && (
            <div className="studio-sidebar-footer">
              v{APP_VERSION}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── New Session button ──────────────────────────────────────────
function NewSessionButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className="studio-sidebar-nav-row studio-sidebar-new-session"
      style={{
        justifyContent: collapsed ? "center" : "flex-start",
        textAlign: collapsed ? "center" as const : "left",
      }}
      aria-label="New Session"
    >
      <div style={{
        width: 20, height: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        color: "var(--gold-bright, #F5C642)",
      }}>
        <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 2, fill: "none" }} viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>

      {!collapsed && (
        <span style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.92)",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          flex: 1,
        }}>
          New Session
        </span>
      )}

      {showTooltip && collapsed && (
        <div
          className="studio-sidebar-tooltip"
          style={{
            position: "absolute",
            left: 52,
            top: "50%",
            transform: "translateY(-50%)",
            padding: "8px 11px",
            fontSize: 14,
            color: "rgba(255,255,255,0.92)",
            whiteSpace: "nowrap",
            zIndex: 200,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 600 }}>New Session</div>
        </div>
      )}
    </button>
  );
}

// ── Nav Item ────────────────────────────────────────────────────
function NavItem({
  label,
  desc,
  icon,
  active,
  collapsed,
  onClick,
}: {
  label: string;
  desc?: string;
  icon: ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`studio-sidebar-nav-row ${active ? "is-active" : ""}`}
      style={{
        justifyContent: collapsed ? "center" : "flex-start",
        textAlign: collapsed ? "center" as const : "left",
      }}
    >
      {/* Icon */}
      <div style={{
        width: 20, height: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        opacity: active ? 1 : 0.88,
        color: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.78)",
        transition: "opacity 0.1s",
      }}>
        {icon}
      </div>

      {/* Label */}
      {!collapsed && (
        <span style={{
          fontSize: 14,
          color: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.78)",
          fontWeight: active ? 600 : 400,
          whiteSpace: "nowrap",
          overflow: "hidden",
          flex: 1,
          transition: "color 0.1s",
        }}>
          {label}
        </span>
      )}

      {/* Super tooltip: shows on hover for both expanded and collapsed modes */}
      {showTooltip && desc && (
        <div
          className="studio-sidebar-tooltip"
          style={{
            position: "absolute",
            left: collapsed ? 52 : 220,
            top: "50%",
            transform: "translateY(-50%)",
            padding: "8px 11px",
            fontSize: 14,
            color: "rgba(255,255,255,0.92)",
            whiteSpace: "normal",
            width: 188,
            lineHeight: 1.45,
            zIndex: 200,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
          <div style={{ opacity: 0.9, fontSize: 10 }}>{desc}</div>
        </div>
      )}
    </button>
  );
}
