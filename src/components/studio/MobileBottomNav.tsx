import { useNavigate, useLocation } from "react-router-dom";
import { Eye, PenLine, LayoutDashboard, Package, Settings } from "lucide-react";

const TABS = [
  { path: "/studio/watch", label: "Watch", icon: Eye },
  { path: "/studio/work", label: "Work", icon: PenLine },
  { path: "/studio/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/studio/wrap", label: "Wrap", icon: Package },
  { path: "/studio/settings", label: "Settings", icon: Settings },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const loc = useLocation();

  const isActive = (path: string) => {
    if (path === "/studio/work") return loc.pathname === path || loc.pathname.startsWith("/studio/work/");
    if (path === "/studio/settings") return loc.pathname.startsWith("/studio/settings");
    if (path === "/studio/wrap") return loc.pathname === path || loc.pathname.startsWith("/studio/wrap/");
    if (path === "/studio/dashboard") return loc.pathname === path || loc.pathname === "/studio" || loc.pathname === "/studio/";
    return loc.pathname === path;
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        background: "rgba(13, 27, 42, 0.92)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 12px",
              minWidth: 56,
              minHeight: 44,
              color: active ? "#F5C642" : "rgba(255,255,255,0.72)",
              transition: "color 0.15s ease",
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
