import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  briefing_ready: "\u{1F4CA}",
  output_published: "\u2705",
  score_improved: "\u2B50",
  nudge_stale: "\u{1F4A1}",
  system: "\u2139\uFE0F",
};

// Suppressed notification types per Mark's directive
const SUPPRESSED_TYPES = new Set(["briefing_ready", "nudge_stale", "system", "pipeline_complete", "score_improved", "output_published", "checkpoint_passed"]);

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Filter out suppressed types for display
  const visibleNotifications = notifications.filter(n => !SUPPRESSED_TYPES.has(n.type));
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("id, type, title, body, read, created_at, link")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
        setLoaded(true);
      });
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  if (!loaded) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 5,
          borderRadius: 8,
          color: "var(--fg-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg-3)"; }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--cornflower)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            background: "var(--glass-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: 12,
            boxShadow: "var(--glass-shadow)",
            backdropFilter: "var(--glass-blur-light)",
            WebkitBackdropFilter: "var(--glass-blur-light)",
            zIndex: 100,
            fontFamily: "'Afacad Flux', sans-serif",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--glass-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "var(--cornflower)",
                  cursor: "pointer",
                  fontFamily: "'Afacad Flux', sans-serif",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {visibleNotifications.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No notifications yet
            </div>
          ) : (
            visibleNotifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: 10,
                  padding: "10px 16px",
                  background: n.read ? "transparent" : "rgba(74,144,217,0.04)",
                  border: "none",
                  borderBottom: "1px solid var(--glass-border)",
                  cursor: n.link ? "pointer" : "default",
                  textAlign: "left",
                  fontFamily: "'Afacad Flux', sans-serif",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "transparent" : "rgba(74,144,217,0.04)"; }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                  {TYPE_ICONS[n.type] || TYPE_ICONS.system}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: "var(--fg)", lineHeight: 1.4 }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.read && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cornflower)", flexShrink: 0, marginTop: 6 }} />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
