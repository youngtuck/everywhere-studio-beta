import { useState } from "react";

const STORAGE_KEY = "studio_onboarding_complete";
const VOICE_SAMPLE_KEY = "studio_voice_sample";
const WATCH_TOPIC_KEY = "studio_watch_topic";

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export default function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [voiceSample, setVoiceSample] = useState("");
  const [watchTopic, setWatchTopic] = useState("");

  const handleAnalyzeVoice = () => {
    if (voiceSample.trim()) localStorage.setItem(VOICE_SAMPLE_KEY, voiceSample.trim());
    setStep(3);
  };

  const handleStartStudio = () => {
    if (watchTopic.trim()) localStorage.setItem(WATCH_TOPIC_KEY, watchTopic.trim());
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 9998,
          backdropFilter: "blur(4px)",
        }}
        aria-hidden
      />
      {/* Centered modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--glass-surface)",
          borderRadius: "var(--studio-radius-lg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          backdropFilter: "var(--glass-blur-light)",
          WebkitBackdropFilter: "var(--glass-blur-light)",
          zIndex: 9999,
          fontFamily: "var(--font)",
          padding: "28px 32px",
        }}
      >
        {/* Progress: 3 steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  background: step >= s ? "var(--fg)" : "var(--bg-3)",
                  color: step >= s ? "var(--bg)" : "var(--fg-3)",
                  border: step === s ? "2px solid var(--fg)" : "none",
                }}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  style={{
                    width: 32,
                    height: 2,
                    marginLeft: 4,
                    marginRight: 4,
                    background: step > s ? "var(--fg)" : "var(--bg-3)",
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div>
            <h2 id="onboarding-title" style={{ fontSize: 22, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: 10 }}>
              Let&apos;s set up your studio
            </h2>
            <p style={{ fontSize: 14, color: "var(--fg-3)", lineHeight: 1.6, marginBottom: 28 }}>
              Three quick steps. Your studio will be thinking for you before you leave.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600 }}
              onClick={() => setStep(2)}
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Your Voice */}
        {step === 2 && (
          <div>
            <h2 id="onboarding-title" style={{ fontSize: 22, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: 10 }}>
              Tell Reed how you write
            </h2>
            <textarea
              value={voiceSample}
              onChange={(e) => setVoiceSample(e.target.value)}
              placeholder="Paste a few paragraphs you've written: a post, an email, anything. Reed will do the rest."
              rows={6}
              className="input-field"
              style={{
                width: "100%",
                marginBottom: 20,
                resize: "vertical",
                minHeight: 120,
                fontFamily: "var(--font)",
              }}
            />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600 }}
              onClick={handleAnalyzeVoice}
            >
              Analyze My Voice
            </button>
          </div>
        )}

        {/* Step 3: Your Watch */}
        {step === 3 && (
          <div>
            <h2 id="onboarding-title" style={{ fontSize: 22, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: 10 }}>
              What should Sentinel monitor?
            </h2>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--fg-2)", fontWeight: 400 }}>
              What industry or topic are you known for?
            </label>
            <input
              type="text"
              value={watchTopic}
              onChange={(e) => setWatchTopic(e.target.value)}
              placeholder="e.g. Leadership, AI, Marketing"
              className="input-field"
              style={{ width: "100%", marginBottom: 24, fontFamily: "var(--font)" }}
            />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600 }}
              onClick={handleStartStudio}
            >
              Start My Studio
            </button>
          </div>
        )}
      </div>
    </>
  );
}
