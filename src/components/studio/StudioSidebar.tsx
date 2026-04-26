import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { APP_VERSION } from "../../lib/constants";
import { StudioUserAccountMenu } from "./StudioUserAccountMenu";
import Logo from "../Logo";

type NavItemDef = {
  path: string;
  label: string;
  desc: string;
  icon: ReactNode;
};

type NavGroupDef = {
  group: string;
  collapsible?: boolean;
  items: NavItemDef[];
};

// ── Nav structure matching wireframe ───────────────────────────
const NAV: NavGroupDef[] = [
  {
    group: "Studio",
    items: [
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
    ],
  },
  {
    group: "Library",
    items: [
      {
        path: "/studio/outputs",
        label: "Catalog",
        desc: "Every piece you have published or exported lives here.",
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
    ],
  },
  {
    group: "Outputs",
    collapsible: true,
    items: [
      { path: "/studio/outputs/content", label: "Content", desc: "Essays, podcasts, video scripts, emails.", icon: <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
      { path: "/studio/outputs/business", label: "Business", desc: "Presentations, proposals, case studies, SOWs.", icon: <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg> },
      { path: "/studio/outputs/social", label: "Social", desc: "Social media content across platforms.", icon: <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg> },
      { path: "/studio/outputs/extended", label: "Extended", desc: "Books, websites, newsletters, social media projects.", icon: <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
      { path: "/studio/outputs/templates", label: "Templates", desc: "System and custom output templates.", icon: <svg style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 1.75, fill: "none" }} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg> },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onMobileClose?: () => void;
}

const STORAGE_OUTPUTS_OPEN = "ew-sidebar-outputs-open";

export default function StudioSidebar({ collapsed = false, onToggleCollapsed, onMobileClose }: SidebarProps) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_OUTPUTS_OPEN);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch { /* ignore */ }
    return true;
  });

  const toggleOutputsOpen = useCallback(() => {
    setOutputsOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_OUTPUTS_OPEN, next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  useEffect(() => {
    if (loc.pathname.startsWith("/studio/outputs")) {
      setOutputsOpen(true);
    }
  }, [loc.pathname]);

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
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.55)" }}>
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
        {NAV.map((group, gi) => {
          // On mobile, skip items already in bottom nav
          const items = onMobileClose
            ? group.items.filter(i => !["/studio/dashboard", "/studio/watch", "/studio/work", "/studio/wrap", "/studio/settings"].includes(i.path))
            : group.items;
          if (items.length === 0) return null;

          const isOutputsCollapsible = Boolean(group.collapsible && group.group === "Outputs");
          const showOutputNavItems = !isOutputsCollapsible || collapsed || outputsOpen;

          return (
            <div key={group.group}>
              {!collapsed && !isOutputsCollapsible && (
                <div className="studio-sidebar-group-label">
                  {group.group}
                </div>
              )}
              {!collapsed && isOutputsCollapsible && (
                <button
                  type="button"
                  className="studio-sidebar-outputs-toggle"
                  onClick={toggleOutputsOpen}
                  aria-expanded={outputsOpen}
                >
                  <span>Outputs</span>
                  <svg className={`studio-sidebar-outputs-chevron ${outputsOpen ? "is-open" : ""}`} viewBox="0 0 24 24" aria-hidden>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              {collapsed && gi > 0 && (
                <div className="studio-sidebar-group-rule" />
              )}

              {showOutputNavItems && items.map(({ path, label, icon, desc }) => {
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
            </div>
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

      {user && (
        <div
          style={{
            flexShrink: 0,
            padding: collapsed ? "6px 6px 4px" : "8px 8px 6px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <StudioUserAccountMenu variant="sidebar" collapsed={collapsed} />
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
          fontWeight: active ? 600 : 500,
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


