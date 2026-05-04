import { useLocation, useNavigate } from "react-router-dom";

const FONT = "var(--font)";

const DNA_TABS = [
  { label: "Voice DNA", path: "/studio/settings/voice" },
  { label: "Brand DNA", path: "/studio/settings/brand" },
  { label: "Composer memory", path: "/studio/settings/memory" },
] as const;

// CO_038C WS10: chevron returns the user to the parent Settings surface so
// these sub-pages read as Settings sub-views rather than standalone routes.
function BackToSettingsChevron() {
  const nav = useNavigate();
  return (
    <button
      type="button"
      onClick={() => nav("/studio/settings")}
      aria-label="Back to Settings"
      title="Back to Settings"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        marginRight: 8,
        borderRadius: 8,
        border: "1px solid var(--glass-border)",
        background: "transparent",
        color: "var(--fg-2)",
        cursor: "pointer",
        fontFamily: FONT,
        transition: "background 0.12s, color 0.12s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(0,0,0,0.04)";
        e.currentTarget.style.color = "var(--fg)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--fg-2)";
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function DnaNav() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <BackToSettingsChevron />
      <div
        role="tablist"
        aria-label="DNA settings"
        style={{
          display: "inline-flex", gap: 4, padding: 5,
          borderRadius: 14, background: "rgba(0,0,0,0.028)", border: "1px solid var(--glass-border)",
        }}
      >
        {DNA_TABS.map(({ label, path }) => {
          const selected = pathname === path;
          return (
            <button
              key={path}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => nav(path)}
              style={{
                fontSize: 11, fontWeight: selected ? 600 : 500, fontFamily: FONT,
                color: selected ? "var(--fg)" : "var(--fg-3)",
                padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                background: selected ? "var(--glass-surface)" : "transparent",
                boxShadow: selected ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
                transition: "background 0.12s, color 0.12s",
              }}
            >{label}</button>
          );
        })}
      </div>
    </div>
  );
}
