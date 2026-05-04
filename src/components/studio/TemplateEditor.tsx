/**
 * TemplateEditor: Shows editable template settings for the selected output type.
 *
 * Base templates are locked (can only be hidden).
 * Custom templates can be created from base.
 * Human Voice Test is LOCKED ON in every template, always.
 */

import { useState } from "react";
import { ReedProfileIcon } from "./ReedProfileIcon";

const FONT = "var(--font)";

export interface TemplateSettings {
  wordCountRange: [number, number];
  formatType: string;
  deliverables: string[];
  options: {
    cta: boolean;
    pullQuotes: boolean;
  };
  qualitySettings: {
    checkpointToggles: Record<string, boolean>;
    impactThreshold: number;
    humanVoiceTest: true; // Always true, locked
  };
  voiceDnaSource: string;
  brandDnaApplied: boolean;
}

export interface Template {
  id: string;
  outputType: string;
  name: string;
  isBase: boolean;
  isHidden: boolean;
  settings: TemplateSettings;
}

const DEFAULT_SETTINGS: TemplateSettings = {
  wordCountRange: [500, 2000],
  formatType: "standard",
  deliverables: ["Draft"],
  options: { cta: false, pullQuotes: false },
  qualitySettings: {
    checkpointToggles: {
      "Deduplication": true,
      "Research Validation": true,
      "Voice Authenticity": true,
      "Engagement Optimization": true,
      "SLOP Detection": true,
      "Editorial Excellence": true,
      "Perspective & Risk": true,
    },
    impactThreshold: 75,
    humanVoiceTest: true,
  },
  voiceDnaSource: "",
  brandDnaApplied: true,
};

interface TemplateEditorProps {
  template: Template;
  onSave: (updated: Template) => void;
  onSaveAsCustom: (name: string, settings: TemplateSettings) => void;
}

function LockIcon() {
  return (
    <svg style={{ width: 10, height: 10, stroke: "var(--fg-3)", strokeWidth: 2, fill: "none" }} viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function TemplateEditor({ selected, onSelect, compact }: { selected?: string | null; onSelect?: (id: string) => void; compact?: boolean }) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [reedInput, setReedInput] = useState("");

  const systemTemplates = [
    { id: "the-edition", name: "The Edition", desc: "Full publication package from one draft" },
    { id: "sunday-story", name: "Sunday Story", desc: "Weekly narrative essay" },
    { id: "session-brief", name: "Session Brief", desc: "Decision-ready executive summary" },
  ];

  const userTemplates: Array<{ id: string; name: string; desc: string }> = [];

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: FONT }}>
      {/* Left column: Template list */}
      <div style={{ width: "44%", borderRight: "1px solid var(--glass-border)", overflowY: "auto", padding: "16px 14px" }}>
        {/* SYSTEM section */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>System</span>
          <span style={{ fontSize: 9, color: "var(--fg-3)", padding: "1px 6px", borderRadius: 3, background: "var(--line)" }}>Read only</span>
        </div>
        {systemTemplates.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTemplate(t.id)}
            style={{
              padding: "10px 12px", borderRadius: 6, marginBottom: 4,
              background: activeTemplate === t.id ? "rgba(245,198,66,0.08)" : "transparent",
              border: activeTemplate === t.id ? "1px solid rgba(245,198,66,0.3)" : "1px solid transparent",
              cursor: "pointer", transition: "all 0.12s",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{t.name}</div>
            <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{t.desc}</div>
          </div>
        ))}

        {/* YOURS section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)" }}>Yours</span>
          <span style={{ fontSize: 10, color: "var(--blue, #4A90D9)", cursor: "pointer" }}>+ New</span>
        </div>
        {userTemplates.length === 0 ? (
          <div style={{ fontSize: 10, color: "var(--fg-3)", padding: "4px 2px 8px", lineHeight: 1.4 }}>
            No custom templates yet.
          </div>
        ) : (
          userTemplates.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveTemplate(t.id)}
              style={{
                padding: "10px 12px", borderRadius: 6, marginBottom: 4,
                background: activeTemplate === t.id ? "rgba(245,198,66,0.08)" : "transparent",
                border: activeTemplate === t.id ? "1px solid rgba(245,198,66,0.3)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{t.name}</div>
              <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{t.desc}</div>
            </div>
          ))
        )}
      </div>

      {/* Right column: Reed conversation */}
      <div style={{ width: "56%", display: "flex", flexDirection: "column", padding: "16px 14px" }}>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "center",
              flexShrink: 0, width: 24, paddingTop: 1,
            }}>
              <ReedProfileIcon size={18} title="Reed" />
            </div>
            <div style={{
              background: "rgba(74,144,217,0.07)", border: "1px solid rgba(74,144,217,0.15)",
              borderRadius: "0 8px 8px 8px", padding: "8px 10px",
              fontSize: 11, color: "var(--fg-2)", lineHeight: 1.6, maxWidth: "85%",
            }}>
              What are we building? I can start from an existing output type, modify one of your current templates, or work from scratch.
            </div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--glass-card)", border: "1px solid var(--glass-border)",
          borderRadius: 8, padding: "8px 10px", flexShrink: 0,
        }}>
          <input
            value={reedInput}
            onChange={e => setReedInput(e.target.value)}
            placeholder="Describe your template..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 12, color: "var(--fg)", fontFamily: FONT,
            }}
          />
          <button style={{
            width: 28, height: 28, borderRadius: 6,
            background: reedInput.trim() ? "var(--fg)" : "var(--line)",
            border: "none", cursor: reedInput.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            <svg style={{ width: 11, height: 11, stroke: "#fff", strokeWidth: 2.5, fill: "none" }} viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_SETTINGS };
