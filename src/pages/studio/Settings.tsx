/**
 * Settings.tsx, Settings surface
 * Studio display is light mode only (see ThemeContext).
 *
 * CO_038C WS11: full IA restructure.
 * Tab order: Account, Preferences, Voice DNA, Brand DNA, Composer memory, Research, Help.
 * Desktop: two-column layout, 200px left rail and 720 content max-width.
 * Mobile: accordion of cards, one expanded at a time.
 *
 * CO_038C WS12: Supabase-backed preference toggles all follow the same pattern.
 * Local state hydrates on mount from profiles. Optimistic updates set local state
 * first and write to Supabase fire-and-forget.
 *
 * Deferred to a future CO: publication_threshold (account threshold), the
 * notifications cluster (email_notifications, browser_push, sentinel_email,
 * weekly_digest), and account deletion (account_deleted_at).
 */
import { useState, useLayoutEffect, useEffect, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useShell } from "../../components/studio/StudioShell";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../hooks/useMobile";
import { supabase } from "../../lib/supabase";
import SettingsResearchPanel from "../../components/studio/SettingsResearchPanel";
import "./shared.css";

const FONT = "var(--font)";

type SectionId =
  | "account"
  | "preferences"
  | "voice-dna"
  | "brand-dna"
  | "composer-memory"
  | "research"
  | "help";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "voice-dna", label: "Voice DNA" },
  { id: "brand-dna", label: "Brand DNA" },
  { id: "composer-memory", label: "Composer memory" },
  { id: "research", label: "Research" },
  { id: "help", label: "Help" },
];

// Curated IANA time zones. Selecting "Other..." reveals a free-text input so
// users in zones outside the curated list can save their own value.
const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
  { value: "America/Toronto", label: "Eastern Time (Toronto)" },
  { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Kolkata", label: "India Standard Time (Kolkata)" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

const TIMEZONE_VALUES = new Set(TIMEZONE_OPTIONS.map(o => o.value));

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
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

const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="liquid-glass-card" style={{ padding: 14, marginBottom: 10 }}>
    {title ? (
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--fg-3)", marginBottom: 10 }}>{title}</div>
    ) : null}
    {children}
  </div>
);

function PrefRow({ label, sublabel, children, last }: {
  label: string;
  sublabel?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: last ? undefined : "1px solid var(--glass-border)" }}>
      <div>
        <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 400 }}>{label}</span>
        {sublabel ? <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{sublabel}</div> : null}
      </div>
      {children}
    </div>
  );
}

function FormField({ label, helper, children, last }: {
  label: string;
  helper?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? undefined : "1px solid var(--glass-border)" }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", fontWeight: 400, marginBottom: 6 }}>{label}</label>
      {children}
      {helper ? <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.4 }}>{helper}</div> : null}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      {description ? (
        <p style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>{description}</p>
      ) : null}
    </div>
  );
}

function DnaLaunchCard({ title, description, route, onLaunch }: {
  title: string;
  description: string;
  route: string;
  onLaunch: (r: string) => void;
}) {
  return (
    <div className="liquid-glass-card" style={{ padding: 24, fontFamily: FONT }}>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--fg)", marginBottom: 8, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--fg-2)", marginBottom: 18, lineHeight: 1.55 }}>{description}</div>
      <button
        type="button"
        className="liquid-glass-btn"
        onClick={() => onLaunch(route)}
        style={{ fontSize: 13, padding: "8px 16px", fontFamily: FONT }}
      >
        <span className="liquid-glass-btn-label" style={{ color: "var(--fg)", fontWeight: 600 }}>Manage {title}</span>
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "var(--glass-input)",
  border: "1px solid var(--glass-border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--fg)",
  fontFamily: FONT,
  outline: "none",
};

// ============================================================================
// Main
// ============================================================================
export default function Settings() {
  const nav = useNavigate();
  const isMobile = useMobile();
  const { setDashContent, setDashOpen } = useShell();
  const { user, refreshProfile } = useAuth();

  const [activeSection, setActiveSection] = useState<SectionId>("account");

  // Account fields
  const [timezone, setTimezone] = useState("");
  const [tzCustomMode, setTzCustomMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [title, setTitle] = useState("");

  // Preferences
  const [fontSize, setFontSize] = useState<number>(() => {
    try { const s = localStorage.getItem("ew-font-size"); if (s) return Number(s); } catch {}
    return 2;
  });
  const [flagsInDraft, setFlagsInDraft] = useState(true);
  const [voiceMode, setVoiceMode] = useState<"ptt" | "auto">("ptt");
  const [voiceDnaActive, setVoiceDnaActive] = useState(true);
  const [showAgentNames, setShowAgentNames] = useState(false);
  const [oneQuestionMode, setOneQuestionMode] = useState(true);
  const [proactiveSuggestions, setProactiveSuggestions] = useState(true);

  const fontLabels = ["Small", "Default", "Large"];

  // Hydrate profile fields on mount.
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("timezone, full_name, avatar_url, title, flags_in_draft, voice_dna_active, show_agent_names, one_question_mode, proactive_suggestions")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (typeof data.timezone === "string") {
          setTimezone(data.timezone);
          setTzCustomMode(!!data.timezone && !TIMEZONE_VALUES.has(data.timezone));
        }
        if (typeof data.full_name === "string") setFullName(data.full_name);
        if (typeof data.avatar_url === "string") setAvatarUrl(data.avatar_url);
        if (typeof data.title === "string") setTitle(data.title);
        if (typeof data.flags_in_draft === "boolean") setFlagsInDraft(data.flags_in_draft);
        if (typeof data.voice_dna_active === "boolean") setVoiceDnaActive(data.voice_dna_active);
        if (typeof data.show_agent_names === "boolean") setShowAgentNames(data.show_agent_names);
        if (typeof data.one_question_mode === "boolean") setOneQuestionMode(data.one_question_mode);
        if (typeof data.proactive_suggestions === "boolean") setProactiveSuggestions(data.proactive_suggestions);
      });
  }, [user?.id]);

  // Generic optimistic field write. Caller updates local state before calling.
  const updateProfileField = (field: string, value: string | boolean) => {
    if (!user?.id) return;
    supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
  };

  // Account write helpers (text fields, save on blur).
  const saveTimezone = (v: string) => {
    updateProfileField("timezone", v);
    void refreshProfile();
  };
  const saveFullName = (v: string) => { updateProfileField("full_name", v); void refreshProfile(); };
  const saveAvatarUrl = (v: string) => updateProfileField("avatar_url", v);
  const saveTitle = (v: string) => updateProfileField("title", v);

  // Preferences toggle helpers (write immediately on click).
  const toggleFlagsInDraft = (next: boolean) => { setFlagsInDraft(next); updateProfileField("flags_in_draft", next); };
  const toggleVoiceDnaActive = (next: boolean) => { setVoiceDnaActive(next); updateProfileField("voice_dna_active", next); };
  const toggleShowAgentNames = (next: boolean) => { setShowAgentNames(next); updateProfileField("show_agent_names", next); };
  const toggleOneQuestionMode = (next: boolean) => { setOneQuestionMode(next); updateProfileField("one_question_mode", next); };
  const toggleProactiveSuggestions = (next: boolean) => { setProactiveSuggestions(next); updateProfileField("proactive_suggestions", next); };

  // Apply font size preference to document root (CO_032: font-size only, no zoom).
  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      root.setAttribute("data-font-size", String(fontSize));
    }
    try { localStorage.setItem("ew-font-size", String(fontSize)); } catch {}
  }, [fontSize]);

  // Hide Reed Inspector body content while on Settings (top-level only; do not
  // duplicate inside section components or effects re-run on each tab switch).
  useLayoutEffect(() => {
    setDashOpen(false);
    setDashContent(null);
    return () => setDashContent(null);
  }, [setDashContent, setDashOpen]);

  // ── Section bodies ────────────────────────────────────────────────────────
  const renderAccount = () => {
    const selectValue = tzCustomMode ? "OTHER" : (timezone || "");
    return (
      <>
        <SectionHeader title="Account" description="Profile information used across the studio." />
        <Card>
          <FormField label="Time zone">
            <select
              value={selectValue}
              onChange={e => {
                if (e.target.value === "OTHER") {
                  setTzCustomMode(true);
                  return;
                }
                setTzCustomMode(false);
                setTimezone(e.target.value);
                saveTimezone(e.target.value);
              }}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
            >
              <option value="" disabled>Choose a time zone...</option>
              {TIMEZONE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value="OTHER">Other...</option>
            </select>
            {tzCustomMode ? (
              <input
                type="text"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                onBlur={() => saveTimezone(timezone)}
                placeholder="e.g. Europe/Stockholm"
                style={{ ...inputStyle, marginTop: 8 }}
              />
            ) : null}
          </FormField>

          <FormField label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onBlur={() => saveFullName(fullName)}
              placeholder="Your name"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Avatar URL" helper="Paste a URL to your avatar image.">
            <input
              type="text"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              onBlur={() => saveAvatarUrl(avatarUrl)}
              placeholder="https://..."
              style={inputStyle}
            />
          </FormField>

          <FormField label="Role or title" last>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => saveTitle(title)}
              placeholder="Senior Brand Designer"
              style={inputStyle}
            />
          </FormField>
        </Card>
        {/* TODO(future): publication_threshold (account-level publication threshold), account deletion via account_deleted_at. */}
      </>
    );
  };

  const renderPreferences = () => (
    <>
      <SectionHeader title="Preferences" description="How the studio looks, listens, and surfaces flags." />
      <Card title="Display">
        <div style={{ padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 400 }}>Font size</span>
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

      <Card title="Edit stage">
        <PrefRow label="Flag highlights in draft" sublabel="Show flag highlights in your draft" last>
          <Toggle on={flagsInDraft} onToggle={() => toggleFlagsInDraft(!flagsInDraft)} />
        </PrefRow>
      </Card>

      <Card title="Voice">
        <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, padding: "0 0 12px" }}>
          Control how you speak to Reed. Push to talk activates the mic only while you hold the button. Always on keeps the mic open so you can speak naturally without pressing anything.
        </div>
        <PrefRow label="Input method" last>
          <RadioGroup
            name="voice-mode"
            options={[{ value: "ptt", label: "Push to talk" }, { value: "auto", label: "Always on (coming soon)", disabled: true }]}
            value={voiceMode}
            onChange={v => { if (v !== "auto") setVoiceMode(v as "ptt" | "auto"); }}
          />
        </PrefRow>
      </Card>

      <Card title="Reed">
        <PrefRow label="Use Voice DNA in drafts" sublabel="Apply your voice signature when generating content.">
          <Toggle on={voiceDnaActive} onToggle={() => toggleVoiceDnaActive(!voiceDnaActive)} />
        </PrefRow>
        <PrefRow label="Show agent names" sublabel="Display Reed instead of generic system labels.">
          <Toggle on={showAgentNames} onToggle={() => toggleShowAgentNames(!showAgentNames)} />
        </PrefRow>
        <PrefRow label="One question at a time" sublabel="Reed asks one question per turn instead of batching.">
          <Toggle on={oneQuestionMode} onToggle={() => toggleOneQuestionMode(!oneQuestionMode)} />
        </PrefRow>
        <PrefRow label="Proactive suggestions" sublabel="Reed surfaces ideas without being asked." last>
          <Toggle on={proactiveSuggestions} onToggle={() => toggleProactiveSuggestions(!proactiveSuggestions)} />
        </PrefRow>
      </Card>
      {/* TODO(future): notifications cluster, email_notifications, browser_push, sentinel_email, weekly_digest. */}
    </>
  );

  const renderVoiceDna = () => (
    <DnaLaunchCard
      title="Voice DNA"
      description="Reed's model of how you write: rhythm, vocabulary, structural habits, and the phrases that read as you."
      route="/studio/settings/voice"
      onLaunch={r => nav(r)}
    />
  );

  const renderBrandDna = () => (
    <DnaLaunchCard
      title="Brand DNA"
      description="The voice and positioning rails Reed stays between when producing content for this project."
      route="/studio/settings/brand"
      onLaunch={r => nav(r)}
    />
  );

  const renderComposerMemory = () => (
    <DnaLaunchCard
      title="Composer memory"
      description="Short, factual lines Reed keeps in mind across sessions. Stable context, not session detail."
      route="/studio/settings/memory"
      onLaunch={r => nav(r)}
    />
  );

  const renderResearch = () => (
    <>
      <SectionHeader title="Research" description="Find outlets and people to track. Promote any result into your Watch sources." />
      <SettingsResearchPanel />
    </>
  );

  const renderHelp = () => (
    <>
      <SectionHeader title="Help" description="Documentation and support." />
      <div className="liquid-glass-card" style={{ padding: 18, marginBottom: 10, fontFamily: FONT }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Documentation</div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5, marginBottom: 12 }}>
          How the studio's stages, checkpoints, and Voice DNA work in practice.
        </div>
        {/* TODO(CO_038D): replace placeholder docs URL once the canonical docs path is provided. */}
        <a
          href="https://ideasout.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="liquid-glass-btn"
          style={{ display: "inline-flex", fontSize: 12, padding: "8px 16px", fontFamily: FONT, textDecoration: "none" }}
        >
          <span className="liquid-glass-btn-label" style={{ color: "var(--fg)", fontWeight: 600 }}>View docs</span>
        </a>
      </div>
      <div className="liquid-glass-card" style={{ padding: 18, fontFamily: FONT }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Contact support</div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5, marginBottom: 12 }}>
          Email the alpha support address. We read every message.
        </div>
        <a
          href="mailto:beta@ideasout.com"
          className="liquid-glass-btn"
          style={{ display: "inline-flex", fontSize: 12, padding: "8px 16px", fontFamily: FONT, textDecoration: "none" }}
        >
          <span className="liquid-glass-btn-label" style={{ color: "var(--fg)", fontWeight: 600 }}>Email support</span>
        </a>
      </div>
    </>
  );

  const renderSection = (id: SectionId): ReactNode => {
    switch (id) {
      case "account": return renderAccount();
      case "preferences": return renderPreferences();
      case "voice-dna": return renderVoiceDna();
      case "brand-dna": return renderBrandDna();
      case "composer-memory": return renderComposerMemory();
      case "research": return renderResearch();
      case "help": return renderHelp();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: FONT }}>
      <header className="liquid-glass" style={{ flexShrink: 0, borderRadius: 0, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{ padding: "12px 20px 10px", maxWidth: isMobile ? "100%" : 940, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>Settings</div>
        </div>
      </header>

      {isMobile ? (
        <div style={{ padding: 16, overflowY: "auto", flex: 1, minHeight: 0 }}>
          {SECTIONS.map(s => {
            const expanded = activeSection === s.id;
            return (
              <div key={s.id} className="liquid-glass-card" style={{ marginBottom: 8, padding: 0, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  aria-expanded={expanded}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "14px 16px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontFamily: FONT, fontSize: 14, fontWeight: 600, color: "var(--fg)",
                    textAlign: "left" as const,
                  }}
                >
                  <span>{s.label}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--fg-3)" }}
                  >
                    <polyline points="9 6 15 12 9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {expanded ? (
                  <div style={{ padding: "0 16px 16px" }}>
                    {renderSection(s.id)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0, maxWidth: 940, margin: "0 auto", width: "100%" }}>
          <nav
            aria-label="Settings sections"
            style={{
              flexShrink: 0, width: 200,
              padding: "20px 12px 20px 20px",
              borderRight: "1px solid var(--glass-border)",
              overflowY: "auto", minHeight: 0,
            }}
          >
            {SECTIONS.map(s => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left" as const,
                    padding: "8px 12px",
                    marginBottom: 4,
                    borderRadius: 8,
                    border: "1px solid transparent",
                    background: active ? "var(--glass-surface)" : "transparent",
                    color: active ? "var(--fg)" : "var(--fg-2)",
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "24px 24px 32px",
              maxWidth: 720,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {renderSection(activeSection)}
          </div>
        </div>
      )}
    </div>
  );
}
