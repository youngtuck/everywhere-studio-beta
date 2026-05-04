import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to the Studio",
    body: "You are about to work inside a Reed-led studio. Reed listens first. Then the Room shapes your idea. Then drafting, review, and polish run until the work is publication-ready.\n\nEvery word is yours. Every claim is verified. Nothing ships until the blocking quality checkpoints clear.",
  },
  {
    title: "Reed, Your First Listener",
    body: "Reed reads. Deeply, across your industry, your competitors, your audience's conversations. He distills what matters into signal you can act on. He does not just surface information. He challenges it. He asks better questions than most people do.\n\nTake your time with Reed. The better he understands your thinking, the stronger the Room performs.",
  },
  {
    title: "The Room",
    body: "After Reed, your idea goes to the Writer's Room. The Room explores angles, builds a structure, writes a first draft, and then stress-tests it from every direction: Can you sell this? Does the logic hold? Would a stranger get it?\n\nYou're in control at every step. Edit the outline. Revise the draft. Accept or reject suggestions.",
  },
  {
    title: "Quality Checkpoints",
    body: "Before anything ships, the quality pipeline runs in sequence:\n\nDeduplication catches repetition. Research validates every fact. Voice Authenticity matches your voice. Engagement tests the hook. SLOP Detection catches AI fingerprints. Editorial Excellence enforces publication standards. Perspective checks blind spots and sensitivity.\n\nThe Impact Score (1-100) is your final quality measure. 75+ means it is ready to publish.",
  },
];

const PHASE_LABELS = ["Reed", "Room", "Draft", "Edit", "Review", "Done"];

export default function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const dismiss = () => {
    localStorage.setItem("everywhere_onboarding_seen", "true");
    onClose();
  };

  const current = STEPS[step];

  return (
    <>
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          zIndex: 9998,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%", maxWidth: 600, maxHeight: "85vh",
          overflow: "auto",
          background: "var(--glass-card)",
          borderRadius: 16,
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          backdropFilter: "var(--glass-blur-light)",
          WebkitBackdropFilter: "var(--glass-blur-light)",
          zIndex: 9999,
          fontFamily: "'Inter', sans-serif",
          padding: 40,
        }}
      >
        {/* Skip tour */}
        <button
          onClick={dismiss}
          style={{
            position: "absolute", top: 16, right: 20,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: "var(--text-tertiary)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Skip tour
        </button>

        {/* Content */}
        <div key={step} style={{ animation: "onboardFade 0.2s ease" }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            {current.title}
          </h2>
          {current.body.split("\n\n").map((para, i) => (
            <p key={i} style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: "var(--text-secondary)", margin: "0 0 12px" }}>
              {para}
            </p>
          ))}

          {/* Phase diagram on step 1 */}
          {step === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, justifyContent: "center" }}>
              {PHASE_LABELS.map((label, i) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>{label}</span>
                  {i < PHASE_LABELS.length - 1 && <span style={{ width: 16, height: 1, background: "var(--glass-border)" }} />}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32 }}>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i === step ? "var(--gold)" : "var(--glass-border)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {step === STEPS.length - 1 ? (
              <>
                <button
                  onClick={dismiss}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-tertiary)", fontFamily: "'Inter', sans-serif" }}
                >
                  Don't show this again
                </button>
                <button
                  onClick={dismiss}
                  style={{
                    padding: "12px 24px", borderRadius: 8, border: "none",
                    background: "var(--gold)", color: "#fff",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Got it, let's go
                </button>
              </>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                style={{
                  padding: "12px 24px", borderRadius: 8, border: "none",
                  background: "var(--gold)", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Next
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes onboardFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </>
  );
}
