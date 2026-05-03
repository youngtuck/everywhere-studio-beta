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
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(opt => {
        const active = value === opt.value;
        const dim = opt.disabled;
        return (
          <label
            key={opt.value}
            onClick={() => { if (!dim) onChange(opt.value); }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, padding: "4px 10px", borderRadius: 5,
              border: active ? "1px solid var(--fg)" : "1px solid var(--glass-border)",
              background: active ? "var(--bg)" : "var(--glass-input)",
              color: dim ? "var(--fg-3)" : active ? "var(--fg)" : "var(--fg-3)",
              fontWeight: active ? 600 : 400,
              cursor: dim ? "not-allowed" : "pointer", transition: "all 0.1s",
              opacity: dim ? 0.5 : 1,
            }}
          >
            <input type="radio" name={name} value={opt.value} checked={active} disabled={!!dim} onChange={() => onChange(opt.value)} style={{ display: "none" }} />
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

  // Apply font size preference to document root (CO_032: font-size only, no zoom)
  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
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
        <div style={{ padding: "12px 20px 10px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>Preferences</div>
        </div>
      </header>

      <div style={{ padding: isMobile ? "20px 16px" : "24px 24px 32px", maxWidth: isMobile ? "100%" : 720, margin: "0 auto", width: "100%", overflowY: "auto", flex: 1, minHeight: 0 }}>

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
        <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, padding: "0 0 12px" }}>
          Control how you speak to Reed. Push to talk activates the mic only while you hold the button. Always on keeps the mic open so you can speak naturally without pressing anything.
        </div>
        <PrefRowLast label="Input method">
          <RadioGroup
            name="voice-mode"
            options={[{ value: "ptt", label: "Push to talk" }, { value: "auto", label: "Always on (coming soon)", disabled: true }]}
            value={voiceMode}
            onChange={v => { if (v !== "auto") setVoiceMode(v as "ptt" | "auto"); }}
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
