/**
 * Settings.tsx — Preferences
 * Studio display is light mode only (see ThemeContext).
 */
import { useState, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useShell } from "../../components/studio/StudioShell";
import { useMobile } from "../../hooks/useMobile";
import "./shared.css";

const FONT = "var(--font)";

// Font size zoom levels (relative to base 1.0)
// These intentionally stack on top of the viewport zoom in index.css
const FONT_SIZE_ZOOM: Record<number, number> = {
  1: 0.88,   // Small — 12% smaller than base
  2: 1.00,   // Default — no change
  3: 1.12,   // Large — 12% larger than base
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 32, height: 18,
        background: on ? "var(--blue)" : "var(--line-2)",
        borderRadius: 9, cursor: "pointer",
        position: "relative", flexShrink: 0,
        transition: "background 0.15s",
      }}
    >
      <div style={{
        position: "absolute",
        top: 2, left: on ? 16 : 2,
        width: 14, height: 14, borderRadius: "50%",
        background: "#fff", transition: "left 0.15s",
      }} />
    </div>
  );
}

function RadioGroup({
  name, options, value, onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, padding: "4px 10px", borderRadius: 5,
              border: active ? "1px solid var(--fg)" : "1px solid var(--glass-border)",
              background: active ? "var(--bg)" : "var(--glass-input)",
              color: active ? "var(--fg)" : "var(--fg-3)",
              fontWeight: active ? 600 : 400,
              cursor: "pointer", transition: "all 0.1s",
            }}
          >
            <input type="radio" name={name} value={opt.value} checked={active} onChange={() => onChange(opt.value)} style={{ display: "none" }} />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="liquid-glass-card" style={{ padding: 14, marginBottom: 10 }}>
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const PrefRow = ({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--glass-border)" }}>
    <div>
      <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500 }}>{label}</span>
      {sublabel && <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{sublabel}</div>}
    </div>
    {children}
  </div>
);

const PrefRowLast = ({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
    <div>
      <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500 }}>{label}</span>
      {sublabel && <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{sublabel}</div>}
    </div>
    {children}
  </div>
);

export default function Settings() {
  const nav = useNavigate();
  const isMobile = useMobile();
  const { setDashContent, setDashOpen } = useShell();

  // Font size: read from localStorage so it persists
  const [fontSize, setFontSize] = useState<number>(() => {
    try { const s = localStorage.getItem("ew-font-size"); if (s) return Number(s); } catch {}
    return 2;
  });
  const [flagsInDraft, setFlagsInDraft] = useState(true);
  const [voiceMode, setVoiceMode] = useState<"ptt" | "auto">("ptt");

  const fontLabels = ["Small", "Default", "Large"];

  // Apply font size zoom to document root
  useEffect(() => {
    const zoom = FONT_SIZE_ZOOM[fontSize] ?? 1;
    // Store as CSS var so the viewport zoom in index.css stacks on top
    document.documentElement.style.setProperty("--font-size-zoom", String(zoom));
    // Apply it as a zoom adjustment on #root relative to the viewport breakpoint zoom
    const root = document.getElementById("root");
    if (root) {
      // We store the user preference; the actual zoom is computed in index.css
      // by multiplying viewport zoom × font size zoom. We apply it via data-attr.
      root.setAttribute("data-font-size", String(fontSize));
    }
    try { localStorage.setItem("ew-font-size", String(fontSize)); } catch {}
  }, [fontSize]);

  useLayoutEffect(() => {
    setDashOpen(false);
    setDashContent(null);
    return () => setDashContent(null);
  }, [setDashContent, setDashOpen]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: FONT }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "12px 20px 10px", maxWidth: isMobile ? "100%" : 560, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>Preferences</div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : "24px 24px 32px", maxWidth: isMobile ? "100%" : 560, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1, minHeight: 0 }}>

      {/* Display */}
      <Card title="Display">
        <div style={{ padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500 }}>Font size</span>
            <div style={{ width: "100%" }}>
              <input
                type="range"
                min={1} max={3} step={1}
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--fg)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-3)", marginTop: 4 }}>
                <span>Small</span>
                <span style={{ color: "var(--fg)", fontWeight: 600 }}>{fontLabels[fontSize - 1]}</span>
                <span>Large</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit stage */}
      <Card title="Edit stage">
        <PrefRowLast label="Flags in draft" sublabel="Underline suggestions while editing">
          <Toggle on={flagsInDraft} onToggle={() => setFlagsInDraft(v => !v)} />
        </PrefRowLast>
      </Card>

      {/* Voice */}
      <Card title="Voice">
        <PrefRowLast label="Input method">
          <RadioGroup
            name="voice-mode"
            options={[{ value: "ptt", label: "Push to talk" }, { value: "auto", label: "Always on" }]}
            value={voiceMode}
            onChange={v => setVoiceMode(v as "ptt" | "auto")}
          />
        </PrefRowLast>
      </Card>

      {/* Voice & Brand DNA links */}
      <div className="liquid-glass-card" style={{ marginTop: 8, padding: 16 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>Voice and Brand DNA are configured separately.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="liquid-glass-btn"
            onClick={() => nav("/studio/settings/voice")}
            style={{
              fontSize: 12,
              padding: "8px 16px",
              fontFamily: FONT,
            }}
          >
            <span className="liquid-glass-btn-label" style={{ color: "var(--fg)", fontWeight: 600 }}>
              VoiceDNA
            </span>
          </button>
          <button
            type="button"
            className="liquid-glass-btn"
            onClick={() => nav("/studio/settings/brand")}
            style={{
              fontSize: 12,
              padding: "8px 16px",
              fontFamily: FONT,
            }}
          >
            <span className="liquid-glass-btn-label" style={{ color: "var(--fg)", fontWeight: 600 }}>
              Brand DNA
            </span>
          </button>
          <button
            type="button"
            className="liquid-glass-btn"
            onClick={() => nav("/studio/settings/memory")}
            style={{
              fontSize: 12,
              padding: "8px 16px",
              fontFamily: FONT,
            }}
          >
            <span className="liquid-glass-btn-label" style={{ color: "var(--fg)", fontWeight: 600 }}>
              Composer memory
            </span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
