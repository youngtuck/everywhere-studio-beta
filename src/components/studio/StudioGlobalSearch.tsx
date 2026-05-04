import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useShell } from "./StudioShellContext";

const STUDIO_LINKS: { path: string; label: string }[] = [
  { path: "/studio/dashboard", label: "Dashboard" },
  { path: "/studio/work", label: "New Session" },
  { path: "/studio/watch", label: "Watch" },
  { path: "/studio/outputs", label: "Catalog" },
  { path: "/studio/projects", label: "Projects" },
  { path: "/studio/lot", label: "Pipeline" },
  { path: "/studio/resources", label: "Files" },
  { path: "/studio/settings", label: "Preferences" },
];

type OutputHit = {
  id: string;
  title: string;
  output_type: string | null;
  created_at: string;
};

export function StudioGlobalSearch() {
  const { user } = useAuth();
  const { searchOpen, setSearchOpen } = useShell();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hits, setHits] = useState<OutputHit[]>([]);
  const [searching, setSearching] = useState(false);

  const q = query.trim();

  const navFiltered = useMemo(() => {
    if (!q) return STUDIO_LINKS;
    const low = q.toLowerCase();
    return STUDIO_LINKS.filter(l => l.label.toLowerCase().includes(low));
  }, [q]);

  const rows = useMemo(() => {
    if (!q) return navFiltered.map(l => ({ kind: "nav" as const, path: l.path, label: l.label }));
    return [
      ...hits.map(h => ({ kind: "session" as const, id: h.id, label: h.title || "Untitled", sub: h.output_type || "Session" })),
      ...navFiltered.map(l => ({ kind: "nav" as const, path: l.path, label: l.label })),
    ];
  }, [q, hits, navFiltered]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      setHits([]);
      setSelectedIndex(0);
      setSearching(false);
      return;
    }
    setSelectedIndex(0);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen || !user || !q) {
      if (!q) setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearching(true);
      const pattern = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const { data, error } = await supabase
        .from("outputs")
        .select("id, title, output_type, created_at")
        .eq("user_id", user.id)
        .ilike("title", pattern)
        .order("created_at", { ascending: false })
        .limit(25);
      if (cancelled) return;
      if (error) {
        setHits([]);
      } else {
        setHits((data as OutputHit[]) || []);
      }
      setSearching(false);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchOpen, user, q]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [q]);

  const goNav = useCallback(
    (path: string) => {
      setSearchOpen(false);
      setQuery("");
      setSelectedIndex(0);
      if (path !== location.pathname) navigate(path);
    },
    [navigate, location.pathname, setSearchOpen],
  );

  const goSession = useCallback(
    (id: string) => {
      setSearchOpen(false);
      setQuery("");
      setSelectedIndex(0);
      navigate(`/studio/outputs/${id}`);
    },
    [navigate, setSearchOpen],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
        return;
      }
      if (!searchOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setSearchOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, rows.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + rows.length) % Math.max(1, rows.length));
        return;
      }
      if (e.key === "Enter" && rows[selectedIndex]) {
        e.preventDefault();
        const row = rows[selectedIndex];
        if (row.kind === "nav") goNav(row.path);
        else goSession(row.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, rows, selectedIndex, goNav, goSession, setSearchOpen]);

  if (!searchOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Search"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        padding: 24,
      }}
      onClick={() => setSearchOpen(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(20, 30, 48, 0.94)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 16px 64px rgba(0,0,0,0.4)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          .studio-global-search-input::placeholder { color: rgba(255,255,255,0.55); }
        `}</style>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            type="search"
            placeholder="Search sessions by title… or jump to a page"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="studio-global-search-input"
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "var(--font)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
            onKeyDown={e => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") e.preventDefault();
            }}
          />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 8, marginBottom: 0 }}>
            <kbd style={{ opacity: 0.85 }}>⌘K</kbd> toggle · ↑↓ · Enter · Esc
          </p>
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {q && searching && (
            <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
              Searching…
            </div>
          )}
          {!(q && searching) && !q && navFiltered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.68)", fontSize: 14 }}>
              No navigation matches
            </div>
          )}
          {!(q && searching) && q && !searching && hits.length === 0 && navFiltered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.68)", fontSize: 14 }}>
              No results
            </div>
          )}
          {!(q && searching) && rows.map((row, i) => {
            const isSession = row.kind === "session";
            return (
              <button
                key={isSession ? `s-${row.id}` : `n-${row.path}`}
                type="button"
                onClick={() => (isSession ? goSession(row.id) : goNav(row.path))}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  border: "none",
                  background: i === selectedIndex ? "rgba(255,255,255,0.08)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.9)",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 2,
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", minWidth: 72 }}>
                    {isSession ? "Session" : "Go to"}
                  </span>
                  <span style={{ flex: 1 }}>{row.label}</span>
                  {!isSession && location.pathname === row.path && (
                    <span style={{ fontSize: 12, color: "#F5C642" }}>Current</span>
                  )}
                </span>
                {isSession && "sub" in row && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", paddingLeft: 80 }}>{row.sub}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
