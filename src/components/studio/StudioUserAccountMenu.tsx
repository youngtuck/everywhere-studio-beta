import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { APP_VERSION } from "../../lib/constants";

const USER_MENU_OVERLAY_Z = 10050;

export type StudioUserAccountMenuVariant = "topbar" | "sidebar";

export function StudioUserAccountMenu({
  variant,
  collapsed = false,
}: {
  variant: StudioUserAccountMenuVariant;
  collapsed?: boolean;
}) {
  const { user, displayName, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<
    | { kind: "topbar"; top: number; right: number }
    | { kind: "sidebar"; left: number; bottom: number }
    | null
  >(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("is_admin").eq("id", user.id).single().then(({ data }) => {
      setIsAdmin(!!data?.is_admin);
    });
  }, [user]);

  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] || "?").toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    nav("/");
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const place = () => {
      const r = el.getBoundingClientRect();
      const menuWidth = 220;
      const margin = 8;
      if (variant === "topbar") {
        setMenuPos({
          kind: "topbar",
          top: r.bottom + 6,
          right: Math.max(margin, window.innerWidth - r.right),
        });
      } else {
        const left = Math.min(r.right + margin, window.innerWidth - menuWidth - margin);
        setMenuPos({
          kind: "sidebar",
          left: Math.max(margin, left),
          bottom: window.innerHeight - r.bottom,
        });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, variant]);

  if (!user) return null;

  const menuItems: { label: string; action: () => void }[] = [
    { label: "Preferences", action: () => { nav("/studio/settings"); setOpen(false); } },
    ...(isAdmin
      ? [{
          label: "Admin Panel",
          action: () => {
            nav("/studio/admin");
            setOpen(false);
          },
        }]
      : []),
  ];

  const menuPortal = open && menuPos && typeof document !== "undefined"
    ? createPortal(
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: USER_MENU_OVERLAY_Z,
              border: "none", padding: 0, margin: 0, cursor: "default",
              background: "transparent",
            }}
          />
          <div
            className="liquid-glass-menu"
            role="menu"
            aria-label="Account menu"
            style={{
              position: "fixed",
              zIndex: USER_MENU_OVERLAY_Z + 1,
              width: 220,
              overflow: "hidden",
              ...(menuPos.kind === "topbar"
                ? { top: menuPos.top, right: menuPos.right }
                : { left: menuPos.left, bottom: menuPos.bottom }),
            }}
          >
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(245,198,66,0.2)",
                  border: "1px solid rgba(245,198,66,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#F5C642", flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>{displayName || "User"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.72)" }}>EVERYWHERE Studio</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.72)" }}>v{APP_VERSION}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 6 }}>
              {menuItems.map(item => (
                <div
                  key={item.label}
                  role="menuitem"
                  onClick={item.action}
                  style={{ padding: "7px 10px", fontSize: 13, color: "rgba(255,255,255,0.88)", cursor: "pointer", borderRadius: 5, transition: "background 0.1s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {item.label}
                </div>
              ))}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
              <div
                role="menuitem"
                onClick={handleSignOut}
                style={{ padding: "7px 10px", fontSize: 13, color: "#ff8a9b", cursor: "pointer", borderRadius: 5, transition: "background 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Logout
              </div>
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  const avatarCircle = (
    <span
      style={{
        width: variant === "sidebar" && !collapsed ? 32 : 28,
        height: variant === "sidebar" && !collapsed ? 32 : 28,
        borderRadius: "50%",
        background: "rgba(200,169,110,0.14)",
        border: "1px solid rgba(200,169,110,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: variant === "sidebar" && !collapsed ? 10 : 9,
        fontWeight: 700,
        color: "var(--gold-dark)",
        flexShrink: 0,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      {initials}
    </span>
  );

  if (variant === "topbar") {
    return (
      <>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            ref={anchorRef}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(200,169,110,0.1)",
              border: "1px solid rgba(200,169,110,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: "var(--gold-dark)",
              cursor: "pointer", flexShrink: 0,
              padding: 0, fontFamily: "inherit",
            }}
          >
            {initials}
          </button>
        </div>
        {menuPortal}
      </>
    );
  }

  /* Sidebar: liquid glass row with name, or compact circle when rail collapsed */
  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? `${displayName || "Account"}` : undefined}
        onClick={() => setOpen(o => !o)}
        className="studio-sidebar-account-shell liquid-glass"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 10,
          padding: collapsed ? "8px 6px" : "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "inherit",
          boxSizing: "border-box",
        }}
      >
        {avatarCircle}
        {!collapsed && (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "left",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName || "Account"}
          </span>
        )}
        {!collapsed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.65 }} aria-hidden>
            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {menuPortal}
    </>
  );
}
