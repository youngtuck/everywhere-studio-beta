import { useState } from "react";
import { OUTPUT_TYPES_FULL } from "../../lib/constants";
import { useMobile } from "../../hooks/useMobile";
import "./shared.css";

type CategoryKey = "content" | "social" | "business" | "extended";

const FONT = "var(--font)";

function SectionCard({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: "gold" | "blue";
}) {
  const border =
    accent === "gold"
      ? "1px solid rgba(245,198,66,0.22)"
      : accent === "blue"
        ? "1px solid rgba(74,144,217,0.2)"
        : "1px solid var(--glass-border)";
  return (
    <div
      className="liquid-glass-card"
      style={{
        padding: "14px 16px",
        marginBottom: 12,
        border,
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: accent === "gold" ? "#9A7030" : "var(--fg-3)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function OutputLibraryPage({ category }: { category: CategoryKey }) {
  const data = OUTPUT_TYPES_FULL[category];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const isMobile = useMobile();
  const selected = selectedIdx !== null ? data.types[selectedIdx] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", fontFamily: FONT, minHeight: 0 }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "14px 20px 16px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
            Output types
          </div>
          <h1 style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
            {data.label}
          </h1>
          <p style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, marginTop: 8, maxWidth: 560 }}>
            {data.description}
          </p>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          padding: isMobile ? "12px 14px 16px" : "16px 20px 20px",
          gap: isMobile ? 12 : 16,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          minHeight: 0,
        }}
      >
        {/* Type picker */}
        <div
          className="liquid-glass"
          style={{
            width: isMobile ? "100%" : "min(38%, 320px)",
            flexShrink: 0,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: isMobile ? 200 : 0,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--glass-border)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--fg-3)",
            }}
          >
            {data.types.length} formats
          </div>
          <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: 6 }}>
            {data.types.map((t, i) => {
              const isSelected = selectedIdx === i;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedIdx(isSelected ? null : i)}
                  className={isSelected ? "liquid-glass-card" : ""}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left" as const,
                    padding: "10px 12px",
                    marginBottom: 4,
                    cursor: "pointer",
                    borderRadius: 12,
                    border: isSelected ? "1px solid rgba(245,198,66,0.35)" : "1px solid transparent",
                    background: isSelected ? "rgba(245,198,66,0.08)" : "rgba(255,255,255,0.02)",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                    fontFamily: FONT,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: isSelected ? "var(--gold, #F5C642)" : "rgba(255,255,255,0.2)",
                      boxShadow: isSelected ? "0 0 0 3px rgba(245,198,66,0.2)" : "none",
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: isSelected ? 600 : 500, color: "var(--fg)" }}>{t.name}</span>
                    <span style={{ display: "block", fontSize: 10, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.35 }}>
                      {(t.what || "").slice(0, 72)}{(t.what || "").length > 72 ? "…" : ""}
                    </span>
                  </span>
                  <svg style={{ width: 14, height: 14, stroke: "var(--fg-3)", strokeWidth: 1.75, fill: "none", flexShrink: 0 }} viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail showcase */}
        <div className="liquid-glass" style={{ flex: 1, minWidth: 0, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ overflowY: "auto", flex: 1, padding: isMobile ? "16px 14px" : "22px 24px" }}>
            {!selected ? (
              <div className="liquid-glass-card" style={{ padding: "36px 24px", textAlign: "center", borderRadius: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>Choose a format</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55 }}>
                  Select a type on the left to see how Reed works it, what you receive, and where it fits.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 6 }}>
                    Selected type
                  </div>
                  <h2 style={{ fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
                    {selected.name}
                  </h2>
                </div>

                <SectionCard title="What it is">{selected.what}</SectionCard>
                <SectionCard title="How Reed guides you" accent="blue">
                  {selected.reed}
                </SectionCard>
                <SectionCard title="Format">{selected.format}</SectionCard>
                <SectionCard title="Delivery">{selected.delivery}</SectionCard>
                <SectionCard title="Not the right fit if" accent="gold">
                  {selected.notFit}
                </SectionCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
