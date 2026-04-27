import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const STEPS = [
  {
    id: "role",
    title: "What do you do?",
    subtitle: "Help Reed understand your world.",
    type: "text",
    placeholder: "Executive coach, consultant, keynote speaker...",
    field: "role",
  },
  {
    id: "audience",
    title: "Who do you write for?",
    subtitle: "Describe your audience in your own words.",
    type: "text",
    placeholder: "CEOs navigating uncertainty, mid-career leaders, startup founders...",
    field: "audience",
  },
  {
    id: "tone",
    title: "How would your best clients describe your communication style?",
    subtitle: "3-5 words or a sentence, whatever feels right.",
    type: "text",
    placeholder: "Direct but warm. Story-driven. No corporate speak...",
    field: "tone",
  },
  {
    id: "sample",
    title: "Paste something you've written that sounds like you.",
    subtitle: "A LinkedIn post, email, anything. This is your voice fingerprint.",
    type: "textarea",
    placeholder: "Paste your writing sample here...",
    field: "writing_sample",
  },
] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const value = answers[current.field] || "";

  const next = async () => {
    if (!value.trim() || saving) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    setSaving(true);
    const voiceProfile = {
      role: answers.role,
      audience: answers.audience,
      tone: answers.tone,
      writing_sample: answers.writing_sample,
      captured_at: new Date().toISOString(),
    };

    await supabase
      .from("profiles")
      .update({ voice_profile: voiceProfile, onboarding_complete: true })
      .eq("id", user!.id);

    setSaving(false);
    navigate("/studio/dashboard");
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{
      minHeight: "100vh",
      // Force a dark, high-contrast canvas for onboarding regardless of global theme.
      // This keeps light text and buttons readable even when the app theme is light.
      background: "#07090f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      fontFamily: "var(--font, 'Inter', sans-serif)",
    }}>
      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 48 }}>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#C8961A", borderRadius: 1, transition: "width 0.4s cubic-bezier(.16,1,.3,1)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          <span>Voice DNA Setup</span>
          <span>{step + 1} of {STEPS.length}</span>
        </div>
      </div>

      {/* Step content */}
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", color: "#C8961A", textTransform: "uppercase", marginBottom: 12, fontWeight: 700, opacity: 0.8 }}>
          Voice DNA
        </div>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: "#E8E8E6", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 8 }}>
          {current.title}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(232,232,230,0.45)", marginBottom: 32, lineHeight: 1.6 }}>
          {current.subtitle}
        </p>

        {current.type === "textarea" ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setAnswers((a) => ({ ...a, [current.field]: e.target.value }))}
            placeholder={current.placeholder}
            rows={8}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "16px 20px",
              fontSize: 14,
              lineHeight: 1.7,
              color: "#E8E8E6",
              fontFamily: "var(--font, 'Inter', sans-serif)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,150,26,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setAnswers((a) => ({ ...a, [current.field]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && next()}
            placeholder={current.placeholder}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "16px 20px",
              fontSize: 16,
              color: "#E8E8E6",
              fontFamily: "var(--font, 'Inter', sans-serif)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(200,150,26,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          />
        )}

        <button
          onClick={next}
          disabled={!value.trim() || saving}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "14px",
            background: value.trim() ? "#E8E8E6" : "rgba(255,255,255,0.06)",
            color: value.trim() ? "#07090f" : "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font, 'Inter', sans-serif)",
            cursor: value.trim() ? "pointer" : "default",
            transition: "all 0.2s",
          }}
        >
          {saving ? "Saving..." : isLast ? "Build My Voice DNA" : "Continue"}
        </button>
      </div>
    </div>
  );
}

