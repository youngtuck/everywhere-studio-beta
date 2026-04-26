import { useLocation, useNavigate } from "react-router-dom";

const FONT = "var(--font)";

const DNA_TABS = [
  { label: "Voice DNA", path: "/studio/settings/voice" },
  { label: "Brand DNA", path: "/studio/settings/brand" },
  { label: "Composer memory", path: "/studio/settings/memory" },
] as const;

export function DnaNav() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  return (
    <div
      role="tablist"
      aria-label="DNA settings"
      style={{
        display: "inline-flex", gap: 4, padding: 5,
        borderRadius: 14, background: "rgba(0,0,0,0.028)", border: "1px solid var(--glass-border)",
        marginBottom: 20,
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
  );
}
