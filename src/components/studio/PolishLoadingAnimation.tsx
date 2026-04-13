import { useState, useEffect } from "react";

interface PolishPhase {
  name: string;
  title: string;
  desc: string;
}

const POLISH_PHASES: PolishPhase[] = [
  { name: "SLOP Detection", title: "SLOP Detection", desc: "Scanning for AI fingerprints and filler..." },
  { name: "Voice Authenticity", title: "Voice Authenticity", desc: "Matching your voice DNA..." },
  { name: "Perspective & Risk", title: "Perspective + Impact", desc: "Checking perspective and sensitivity..." },
  { name: "Forecast", title: "Final Gut Check", desc: "Would you click on this? Would you share it?" },
];

const CSS = `
@keyframes polishSpin {
  to { transform: rotate(360deg); }
}
@keyframes polishCheck {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
`;

interface PolishLoadingAnimationProps {
  /** Index of the currently running polish phase (0-3). -1 means not started. */
  currentIndex?: number;
  /** Completed results: map of phase name to score */
  completedScores?: Record<string, number>;
}

export default function PolishLoadingAnimation({ currentIndex = 0, completedScores = {} }: PolishLoadingAnimationProps) {
  const [simIndex, setSimIndex] = useState(0);

  // If no real progress tracking, simulate progression
  useEffect(() => {
    if (Object.keys(completedScores).length > 0) return; // Real data, don't simulate
    const interval = setInterval(() => {
      setSimIndex(i => Math.min(i + 1, POLISH_PHASES.length));
    }, 8000);
    return () => clearInterval(interval);
  }, [completedScores]);

  const activeIndex = Object.keys(completedScores).length > 0 ? currentIndex : simIndex;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <style>{CSS}</style>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 8 }}>
        {POLISH_PHASES.map((phase, i) => {
          const completed = phase.name in completedScores || i < activeIndex;
          const running = i === activeIndex && !completed;
          const pending = i > activeIndex;
          const score = completedScores[phase.name];

          return (
            <div
              key={phase.name}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 8,
                border: "1px solid var(--line)",
                background: running ? "rgba(200,150,26,0.04)" : "var(--surface)",
                opacity: pending ? 0.4 : 1,
                transition: "all 0.4s ease",
              }}
            >
              {/* Status circle */}
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                border: completed ? "none" : running ? "2px solid var(--gold)" : "2px solid var(--line)",
                background: completed ? "#50c8a0" : "transparent",
                animation: running ? "polishSpin 1s linear infinite" : completed ? "polishCheck 0.3s ease" : "none",
              }}>
                {completed && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>&#10003;</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{phase.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{phase.title}</div>
              </div>
              {/* Score */}
              {score !== undefined && (
                <span style={{ fontSize: 14, fontWeight: 700, color: score >= 80 ? "#50c8a0" : score >= 60 ? "var(--gold)" : "#E53935" }}>
                  {score}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "'Afacad Flux', sans-serif", textAlign: "center", fontStyle: "normal" }}>
        {POLISH_PHASES[Math.min(activeIndex, POLISH_PHASES.length - 1)]?.desc || "Finishing up..."}
      </div>
    </div>
  );
}
